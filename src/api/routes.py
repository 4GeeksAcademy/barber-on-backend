from flask import jsonify, request, Blueprint
from api.models import db, User, Booking, BookingStatus, PaymentMethod
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import datetime, timezone, timedelta
from werkzeug.security import check_password_hash, generate_password_hash
import secrets

# ✅ Added for Places API proxy (nearby barbers)
import os
import requests

api = Blueprint("api", __name__)


def _parse_iso_datetime(value: str):
    """
    Accepts:
      - '2026-02-25T14:30'
      - '2026-02-25T14:30:00'
      - '2026-02-25T14:30:00Z'
      - '2026-02-25T14:30:00+00:00'
      - '2026-02-25T14:30:00-05:00'
    Returns a naive datetime in UTC (if tz-aware input).
    """
    if not value or not isinstance(value, str):
        return None
    try:
        if value.endswith("Z"):
            value = value.replace("Z", "+00:00")
        dt = datetime.fromisoformat(value)
        if dt.tzinfo is not None:
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt
    except Exception:
        return None


def _to_iso_z(dt):
    """
    Convert datetime to ISO-8601 string with Z (UTC).
    DB stores scheduled_at as UTC naive datetime, so naive == UTC.
    """
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")


def _serialize_booking_with_z(booking: Booking):
    """
    Keep Booking.serialize(), but enforce scheduled_at with Z to avoid frontend timezone bugs.
    """
    data = booking.serialize()
    data["scheduled_at"] = _to_iso_z(booking.scheduled_at)

    try:
        if isinstance(getattr(booking, "created_at", None), datetime):
            data["created_at"] = _to_iso_z(booking.created_at)
        if isinstance(getattr(booking, "updated_at", None), datetime):
            data["updated_at"] = _to_iso_z(booking.updated_at)
    except Exception:
        pass

    return data


def setup_routes():
    # -------------------------------------------------
    # ✅ GLOBAL CORS PRE-FLIGHT (NO JWT, ALWAYS 200)
    # -------------------------------------------------
    @api.route("/<path:path>", methods=["OPTIONS"])
    def options_handler(path):
        origin = request.headers.get("Origin", "*")
        resp = jsonify({"ok": True})
        resp.status_code = 200
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Vary"] = "Origin"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        return resp

    # --------------------
    # ✅ ME (SESSION)
    # --------------------
    @api.route("/me", methods=["GET"])
    @jwt_required()
    def me():
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({"msg": "User not found"}), 404
        return jsonify({"user": user.serialize()}), 200

    # -------------------------------------------------
    # ✅ FREE FALLBACK: OpenStreetMap Overpass (no billing)
    # -------------------------------------------------
    def _overpass_barbers(lat, lng, radius_m=2000):
        query = f"""
        [out:json];
        (
          node["shop"="barber"](around:{radius_m},{lat},{lng});
          node["shop"="hairdresser"](around:{radius_m},{lat},{lng});
          way["shop"="barber"](around:{radius_m},{lat},{lng});
          way["shop"="hairdresser"](around:{radius_m},{lat},{lng});
          relation["shop"="barber"](around:{radius_m},{lat},{lng});
          relation["shop"="hairdresser"](around:{radius_m},{lat},{lng});
        );
        out center 25;
        """
        r = requests.post(
            "https://overpass-api.de/api/interpreter",
            data=query.encode("utf-8"),
            timeout=20
        )
        data = r.json()

        results = []
        for el in data.get("elements", []):
            tags = el.get("tags") or {}
            name = tags.get("name") or "Barbershop"

            street = tags.get("addr:street") or ""
            housenumber = tags.get("addr:housenumber") or ""
            city = tags.get("addr:city") or ""
            address = " ".join([housenumber, street]).strip()
            if city:
                address = f"{address}, {city}" if address else city

            el_lat = el.get("lat") or (el.get("center") or {}).get("lat")
            el_lng = el.get("lon") or (el.get("center") or {}).get("lon")

            results.append({
                "place_id": f"osm:{el.get('type')}:{el.get('id')}",
                "name": name,
                "rating": None,
                "address": address,
                "open_now": None,
                "lat": el_lat,
                "lng": el_lng,
                "photo_ref": None,
            })

        return results

    # --------------------
    # ✅ PLACES (NEARBY BARBERS) - PROXY (Google -> fallback to Overpass)
    # --------------------
    @api.route("/places/nearby", methods=["GET"])
    def places_nearby():
        """
        GET /api/places/nearby?lat=..&lng=..&radius=2000
        Uses Google Places Nearby Search (backend proxy).
        If Google returns status != OK (REQUEST_DENIED, etc), fallback to Overpass.
        """
        lat = request.args.get("lat")
        lng = request.args.get("lng")
        radius = request.args.get("radius", "2000")

        if not lat or not lng:
            return jsonify({"msg": "lat and lng are required"}), 400

        try:
            radius_int = int(radius)
        except Exception:
            radius_int = 2000

        # Keep radius in a safe range for demos
        radius_int = max(500, min(radius_int, 5000))

        # Try Google first (if key exists)
        key = os.getenv("GOOGLE_PLACES_API_KEY")

        if key:
            url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
            params = {
                "location": f"{lat},{lng}",
                "radius": radius_int,
                "keyword": "barber",
                "type": "hair_care",
                "key": key,
            }

            try:
                r = requests.get(url, params=params, timeout=10)
                data = r.json()
            except Exception:
                data = {"status": "FAILED", "error_message": "Failed to reach Places API"}

            status = data.get("status")
            if status == "OK":
                results = []
                for p in data.get("results", []):
                    geom = (p.get("geometry") or {}).get("location", {}) or {}
                    opening = p.get("opening_hours") or {}
                    photos = p.get("photos") or []

                    results.append({
                        "place_id": p.get("place_id"),
                        "name": p.get("name"),
                        "rating": p.get("rating"),
                        "address": p.get("vicinity"),
                        "open_now": opening.get("open_now"),
                        "lat": geom.get("lat"),
                        "lng": geom.get("lng"),
                        "photo_ref": (photos[0].get("photo_reference") if photos else None),
                    })

                return jsonify({
                    "results": results,
                    "raw_status": status,
                    "raw_error_message": data.get("error_message"),
                    "raw_next_page_token": data.get("next_page_token"),
                    "source": "google",
                }), 200

            # Google failed or denied -> fallback
            fallback = _overpass_barbers(lat, lng, radius_int)
            return jsonify({
                "results": fallback,
                "raw_status": status,
                "raw_error_message": data.get("error_message"),
                "raw_next_page_token": data.get("next_page_token"),
                "source": "overpass_fallback",
            }), 200

        # No Google key -> fallback only
        fallback = _overpass_barbers(lat, lng, radius_int)
        return jsonify({
            "results": fallback,
            "raw_status": "NO_GOOGLE_KEY",
            "raw_error_message": "Missing GOOGLE_PLACES_API_KEY on backend. Using Overpass fallback.",
            "raw_next_page_token": None,
            "source": "overpass_fallback",
        }), 200

    # --------------------
    # ✅ PLACES PHOTO (OPTIONAL PROXY) - only works if Google key works
    # --------------------
    @api.route("/places/photo", methods=["GET"])
    def places_photo():
        """
        GET /api/places/photo?ref=PHOTO_REFERENCE&maxwidth=800
        Proxies Google Place Photos so your frontend doesn't expose API key.
        """
        photo_ref = request.args.get("ref")
        maxwidth = request.args.get("maxwidth", "800")

        if not photo_ref:
            return jsonify({"msg": "ref is required"}), 400

        key = os.getenv("GOOGLE_PLACES_API_KEY")
        if not key:
            return jsonify({"msg": "Missing GOOGLE_PLACES_API_KEY on backend"}), 500

        try:
            mw = int(maxwidth)
        except Exception:
            mw = 800
        mw = max(200, min(mw, 1600))

        url = "https://maps.googleapis.com/maps/api/place/photo"
        params = {"photo_reference": photo_ref, "maxwidth": mw, "key": key}

        try:
            resp = requests.get(url, params=params, timeout=10, allow_redirects=True)
        except Exception:
            return jsonify({"msg": "Failed to fetch photo"}), 502

        headers = {}
        ct = resp.headers.get("Content-Type")
        if ct:
            headers["Content-Type"] = ct

        return (resp.content, resp.status_code, headers)

    # --------------------
    # AUTH
    # --------------------
    @api.route("/auth/login", methods=["POST"])
    def login():
        body = request.get_json() or {}
        email = (body.get("email") or "").strip().lower()
        password = body.get("password") or ""

        if not email or not password:
            return jsonify({"msg": "Email and password are required"}), 400

        user = User.query.filter_by(email=email).first()
        if not user or not getattr(user, "password_hash", None):
            return jsonify({"msg": "Invalid credentials"}), 401

        if not check_password_hash(user.password_hash, password):
            return jsonify({"msg": "Invalid credentials"}), 401

        token = create_access_token(identity=str(user.id))
        return jsonify({"access_token": token, "user": user.serialize()}), 200

    @api.route("/auth/register", methods=["POST"])
    def register():
        body = request.get_json() or {}
        email = (body.get("email") or "").strip().lower()
        password = body.get("password") or ""
        role = (body.get("role") or "client").strip().lower()

        if role not in ["client", "barber"]:
            return jsonify({"msg": "Role must be client or barber"}), 400

        if not email or not password:
            return jsonify({"msg": "Email and password are required"}), 400

        if len(password) < 6:
            return jsonify({"msg": "Password must be at least 6 characters"}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({"msg": "Email already exists"}), 409

        user = User(email=email, password_hash=generate_password_hash(password), role=role)
        db.session.add(user)
        db.session.commit()

        token = create_access_token(identity=str(user.id))
        return jsonify({"access_token": token, "user": user.serialize()}), 201

    # --------------------
    # ✅ FORGOT / RESET PASSWORD (MVP)
    # --------------------
    @api.route("/auth/forgot-password", methods=["POST"])
    def forgot_password():
        data = request.get_json() or {}
        email = (data.get("email") or "").strip().lower()

        generic_msg = "If that email exists, a reset token has been generated."

        if not email:
            return jsonify({"msg": generic_msg}), 200

        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"msg": generic_msg}), 200

        token = secrets.token_urlsafe(32)
        user.reset_token = token

        expires_at_utc = datetime.now(timezone.utc) + timedelta(minutes=30)
        user.reset_token_expires_at = expires_at_utc.replace(tzinfo=None)

        db.session.commit()

        return jsonify({
            "msg": generic_msg,
            "demo_reset_token": token,
            "expires_in_minutes": 30
        }), 200

    @api.route("/auth/reset-password", methods=["POST"])
    def reset_password():
        data = request.get_json() or {}
        token = (data.get("token") or "").strip()
        new_password = data.get("new_password") or ""

        if not token or not new_password or len(new_password) < 6:
            return jsonify({"msg": "Token and a valid new_password (min 6 chars) are required."}), 400

        user = User.query.filter_by(reset_token=token).first()
        if not user:
            return jsonify({"msg": "Invalid or expired token."}), 400

        expires_at = user.reset_token_expires_at
        if not expires_at:
            return jsonify({"msg": "Invalid or expired token."}), 400

        now_utc_naive = datetime.now(timezone.utc).replace(tzinfo=None)
        if expires_at < now_utc_naive:
            return jsonify({"msg": "Invalid or expired token."}), 400

        user.password_hash = generate_password_hash(new_password)

        user.reset_token = None
        user.reset_token_expires_at = None

        db.session.commit()
        return jsonify({"msg": "Password updated successfully."}), 200

    # --------------------
    # ✅ PAYMENT METHODS (CLIENT) - DEMO
    # --------------------
    @api.route("/payment-methods", methods=["GET"])
    @jwt_required()
    def get_payment_methods():
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({"msg": "User not found"}), 404

        methods = (
            PaymentMethod.query
            .filter_by(user_id=user.id)
            .order_by(PaymentMethod.is_default.desc(), PaymentMethod.created_at.desc())
            .all()
        )
        return jsonify({"results": [m.serialize() for m in methods]}), 200

    @api.route("/payment-methods", methods=["POST"])
    @jwt_required()
    def add_payment_method():
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({"msg": "User not found"}), 404

        body = request.get_json() or {}
        brand = (body.get("brand") or "").strip()
        last4 = (body.get("last4") or "").strip()
        exp_month = body.get("exp_month")
        exp_year = body.get("exp_year")
        make_default = bool(body.get("is_default", False))

        if not brand or not last4 or exp_month is None or exp_year is None:
            return jsonify({"msg": "brand, last4, exp_month, exp_year are required"}), 400

        if len(last4) != 4 or not last4.isdigit():
            return jsonify({"msg": "last4 must be exactly 4 digits"}), 400

        try:
            exp_month = int(exp_month)
            exp_year = int(exp_year)
        except Exception:
            return jsonify({"msg": "exp_month and exp_year must be numbers"}), 400

        if exp_month < 1 or exp_month > 12:
            return jsonify({"msg": "exp_month must be 1-12"}), 400

        existing_count = PaymentMethod.query.filter_by(user_id=user.id).count()
        if existing_count == 0:
            make_default = True

        if make_default:
            PaymentMethod.query.filter_by(user_id=user.id, is_default=True).update({"is_default": False})

        pm = PaymentMethod(
            user_id=user.id,
            brand=brand,
            last4=last4,
            exp_month=exp_month,
            exp_year=exp_year,
            is_default=make_default,
        )
        db.session.add(pm)
        db.session.commit()

        return jsonify({"payment_method": pm.serialize()}), 201

    @api.route("/payment-methods/<int:pm_id>/default", methods=["PATCH"])
    @jwt_required()
    def set_default_payment_method(pm_id):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({"msg": "User not found"}), 404

        pm = PaymentMethod.query.get(pm_id)
        if not pm or pm.user_id != user.id:
            return jsonify({"msg": "Payment method not found"}), 404

        PaymentMethod.query.filter_by(user_id=user.id, is_default=True).update({"is_default": False})
        pm.is_default = True
        db.session.commit()

        methods = (
            PaymentMethod.query
            .filter_by(user_id=user.id)
            .order_by(PaymentMethod.is_default.desc(), PaymentMethod.created_at.desc())
            .all()
        )
        return jsonify({"results": [m.serialize() for m in methods]}), 200

    @api.route("/payment-methods/<int:pm_id>", methods=["DELETE"])
    @jwt_required()
    def delete_payment_method(pm_id):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({"msg": "User not found"}), 404

        pm = PaymentMethod.query.get(pm_id)
        if not pm or pm.user_id != user.id:
            return jsonify({"msg": "Payment method not found"}), 404

        was_default = pm.is_default
        db.session.delete(pm)
        db.session.commit()

        if was_default:
            next_pm = (
                PaymentMethod.query
                .filter_by(user_id=user.id)
                .order_by(PaymentMethod.created_at.desc())
                .first()
            )
            if next_pm:
                next_pm.is_default = True
                db.session.commit()

        methods = (
            PaymentMethod.query
            .filter_by(user_id=user.id)
            .order_by(PaymentMethod.is_default.desc(), PaymentMethod.created_at.desc())
            .all()
        )
        return jsonify({"results": [m.serialize() for m in methods]}), 200

    # --------------------
    # BOOKINGS
    # --------------------
    @api.route("/bookings", methods=["POST"])
    @jwt_required()
    def create_booking():
        user_id = int(get_jwt_identity())
        client = User.query.get(user_id)
        if not client:
            return jsonify({"msg": "User not found"}), 404
        if client.role != "client":
            return jsonify({"msg": "Only clients can create bookings"}), 403

        body = request.get_json() or {}
        barber_id = body.get("barber_id")
        scheduled_at_raw = body.get("scheduled_at")
        address = body.get("address")
        notes = body.get("notes")

        if not barber_id or not scheduled_at_raw or not address:
            return jsonify({"msg": "barber_id, scheduled_at and address are required"}), 400

        barber = User.query.get(barber_id)
        if not barber or barber.role != "barber":
            return jsonify({"msg": "Barber not found"}), 404

        scheduled_at = _parse_iso_datetime(scheduled_at_raw)
        if not scheduled_at:
            return jsonify({"msg": "scheduled_at must be an ISO datetime string"}), 400

        now = datetime.utcnow()
        if scheduled_at < now:
            return jsonify({"msg": "scheduled_at cannot be in the past"}), 400

        conflict = (
            Booking.query
            .filter(
                Booking.barber_id == barber.id,
                Booking.scheduled_at == scheduled_at,
                Booking.status.in_([BookingStatus.pending, BookingStatus.accepted])
            )
            .first()
        )
        if conflict:
            return jsonify({"msg": "This time slot is already booked"}), 409

        booking = Booking(
            client_id=client.id,
            barber_id=barber.id,
            scheduled_at=scheduled_at,
            address=address.strip(),
            notes=(notes.strip() if isinstance(notes, str) and notes.strip() else None),
            status=BookingStatus.pending,
        )
        db.session.add(booking)
        db.session.commit()

        return jsonify({"booking": _serialize_booking_with_z(booking)}), 201

    @api.route("/bookings/me", methods=["GET"])
    @jwt_required()
    def my_bookings():
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({"msg": "User not found"}), 404

        if user.role == "client":
            bookings = Booking.query.filter_by(client_id=user.id).order_by(Booking.scheduled_at.desc()).all()
        else:
            bookings = Booking.query.filter_by(barber_id=user.id).order_by(Booking.scheduled_at.desc()).all()

        return jsonify({"results": [_serialize_booking_with_z(b) for b in bookings]}), 200

    @api.route("/bookings/<int:booking_id>/cancel", methods=["PATCH"])
    @jwt_required()
    def cancel_booking(booking_id):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({"msg": "User not found"}), 404

        booking = Booking.query.get(booking_id)
        if not booking:
            return jsonify({"msg": "Booking not found"}), 404

        if user.role != "client" or booking.client_id != user.id:
            return jsonify({"msg": "Not allowed"}), 403

        current = booking.status.value if booking.status else "pending"
        if current in ["canceled", "completed"]:
            return jsonify({"msg": f"Booking is already {current}"}), 400

        booking.status = BookingStatus.canceled
        db.session.commit()
        return jsonify({"booking": _serialize_booking_with_z(booking)}), 200

    @api.route("/bookings/<int:booking_id>/status", methods=["PATCH"])
    @jwt_required()
    def update_booking_status(booking_id):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({"msg": "User not found"}), 404

        booking = Booking.query.get(booking_id)
        if not booking:
            return jsonify({"msg": "Booking not found"}), 404

        body = request.get_json() or {}
        new_status = body.get("status")

        if new_status not in ["accepted", "canceled", "completed"]:
            return jsonify({"msg": "status must be accepted, canceled or completed"}), 400

        is_barber_owner = (user.role == "barber" and booking.barber_id == user.id)
        is_client_owner = (user.role == "client" and booking.client_id == user.id)

        if not is_barber_owner and not is_client_owner:
            return jsonify({"msg": "Not allowed"}), 403

        if is_client_owner and new_status != "canceled":
            return jsonify({"msg": "Clients can only cancel"}), 403

        current = booking.status.value if booking.status else "pending"
        if current in ["canceled", "completed"]:
            return jsonify({"msg": f"Booking is already {current}"}), 400

        if is_barber_owner and new_status == "completed" and current != "accepted":
            return jsonify({"msg": "Booking must be accepted before completing"}), 400

        booking.status = BookingStatus(new_status)
        db.session.commit()
        return jsonify({"booking": _serialize_booking_with_z(booking)}), 200