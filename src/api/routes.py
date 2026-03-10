from flask import jsonify, request, Blueprint
from api.models import db, User, Booking, BookingStatus, PaymentMethod, Conversation, Message
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import datetime, timezone, timedelta
from werkzeug.security import check_password_hash, generate_password_hash
from math import radians, sin, cos, sqrt, atan2
import secrets
import os
import requests
import re

api = Blueprint("api", __name__)


def _parse_iso_datetime(value: str):
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
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")


def _serialize_booking_with_z(booking: Booking):
    data = booking.serialize()
    data["scheduled_at"] = _to_iso_z(booking.scheduled_at)

    if isinstance(getattr(booking, "created_at", None), datetime):
        data["created_at"] = _to_iso_z(booking.created_at)
    if isinstance(getattr(booking, "updated_at", None), datetime):
        data["updated_at"] = _to_iso_z(booking.updated_at)

    return data


def _serialize_message_with_z(message: Message):
    data = message.serialize()
    if isinstance(getattr(message, "created_at", None), datetime):
        data["created_at"] = _to_iso_z(message.created_at)
    if isinstance(getattr(message, "read_at", None), datetime):
        data["read_at"] = _to_iso_z(message.read_at)
    return data


def _get_other_user_from_conversation(conversation: Conversation, user_id: int):
    if conversation.client_id == user_id:
        return conversation.barber
    return conversation.client


def _haversine_meters(lat1, lng1, lat2, lng2):
    R = 6371000
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)

    a = (
        sin(dlat / 2) ** 2
        + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
    )
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c


def _safe_slug(value: str):
    value = (value or "").strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")
    return value or "barber"


def _ensure_demo_barber_from_place(place: dict):
    """
    Create or reuse a demo BarberOn barber user for an external map place.
    This avoids schema changes and keeps booking working with a real internal user id.
    """
    place_id = (
        place.get("place_id")
        or place.get("external_id")
        or place.get("id")
        or place.get("osm_id")
    )
    name = (place.get("name") or "Map Barber").strip()
    address = (place.get("address") or "Astoria, NY").strip() or "Astoria, NY"

    if not place_id:
        raise ValueError("Missing external place id")

    slug = _safe_slug(str(place_id))
    email = f"mapbarber-{slug}@barberon.demo"

    existing = User.query.filter_by(email=email).first()
    if existing:
        return existing

    # Create a reusable internal barber user for this external place
    demo_user = User(
        email=email,
        password_hash=generate_password_hash(secrets.token_urlsafe(24)),
        role="barber",
        full_name=name,
        phone=None,
    )
    db.session.add(demo_user)
    db.session.commit()
    return demo_user


def setup_routes():
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

    @api.route("/me", methods=["GET"])
    @jwt_required()
    def me():
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({"msg": "User not found"}), 404
        return jsonify({"user": user.serialize()}), 200

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

        try:
            r = requests.post(
                "https://overpass-api.de/api/interpreter",
                data=query.encode("utf-8"),
                timeout=25
            )
            r.raise_for_status()
            data = r.json()
        except Exception:
            return []

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

    @api.route("/places/nearby", methods=["GET"])
    def places_nearby():
        lat = request.args.get("lat")
        lng = request.args.get("lng")
        radius = request.args.get("radius", "2000")

        if not lat or not lng:
            return jsonify({"msg": "lat and lng are required"}), 400

        try:
            radius_int = int(radius)
        except Exception:
            radius_int = 2000

        radius_int = max(500, min(radius_int, 5000))
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

            fallback = _overpass_barbers(lat, lng, radius_int)
            return jsonify({
                "results": fallback,
                "raw_status": status,
                "raw_error_message": data.get("error_message"),
                "raw_next_page_token": data.get("next_page_token"),
                "source": "overpass_fallback",
            }), 200

        fallback = _overpass_barbers(lat, lng, radius_int)
        return jsonify({
            "results": fallback,
            "raw_status": "NO_GOOGLE_KEY",
            "raw_error_message": "Missing GOOGLE_PLACES_API_KEY on backend. Using Overpass fallback.",
            "raw_next_page_token": None,
            "source": "overpass_fallback",
        }), 200

    @api.route("/nearby-barbers", methods=["GET"])
    def nearby_barbers():
        lat = request.args.get("lat", type=float)
        lng = request.args.get("lng", type=float)
        radius = request.args.get("radius", default=2000, type=float)

        if lat is None or lng is None:
            return jsonify({"msg": "lat and lng are required"}), 400

        try:
            radius = float(radius)
        except Exception:
            radius = 2000

        radius = max(500, min(radius, 5000))

        barbers = User.query.filter_by(role="barber").all()
        results = []

        for barber in barbers:
            barber_lat = getattr(barber, "latitude", None)
            barber_lng = getattr(barber, "longitude", None)

            if barber_lat is None:
                barber_lat = getattr(barber, "lat", None)
            if barber_lng is None:
                barber_lng = getattr(barber, "lng", None)

            if barber_lat is None or barber_lng is None:
                continue

            try:
                barber_lat = float(barber_lat)
                barber_lng = float(barber_lng)
            except Exception:
                continue

            distance_m = _haversine_meters(lat, lng, barber_lat, barber_lng)

            if distance_m <= radius:
                name = (
                    getattr(barber, "shop_name", None)
                    or getattr(barber, "business_name", None)
                    or getattr(barber, "full_name", None)
                    or "Barber"
                )

                address = (
                    getattr(barber, "address", None)
                    or getattr(barber, "shop_address", None)
                    or "No address"
                )

                results.append({
                    "id": barber.id,
                    "name": name,
                    "address": address,
                    "latitude": barber_lat,
                    "longitude": barber_lng,
                    "distance_m": round(distance_m, 1),
                })

        results.sort(key=lambda x: x["distance_m"])

        return jsonify({
            "results": results,
            "source": "barberon_db"
        }), 200

    @api.route("/barbers/resolve-place", methods=["POST"])
    @jwt_required()
    def resolve_place_barber():
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({"msg": "User not found"}), 404

        body = request.get_json() or {}
        place = body.get("place") or {}

        if not isinstance(place, dict):
            return jsonify({"msg": "place must be an object"}), 400

        place_id = place.get("place_id") or place.get("external_id") or place.get("id")
        if not place_id:
            return jsonify({"msg": "place_id is required"}), 400

        try:
            barber_user = _ensure_demo_barber_from_place(place)
        except Exception as e:
            return jsonify({"msg": f"Could not resolve place barber: {str(e)}"}), 400

        return jsonify({
            "barber": barber_user.serialize(),
            "demo_mode": True,
            "resolved_from_place": True
        }), 200

    @api.route("/places/photo", methods=["GET"])
    def places_photo():
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
        full_name = (body.get("full_name") or "").strip() or None
        phone = (body.get("phone") or "").strip() or None

        if role not in ["client", "barber"]:
            return jsonify({"msg": "Role must be client or barber"}), 400

        if not email or not password:
            return jsonify({"msg": "Email and password are required"}), 400

        if len(password) < 6:
            return jsonify({"msg": "Password must be at least 6 characters"}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({"msg": "Email already exists"}), 409

        user = User(
            email=email,
            password_hash=generate_password_hash(password),
            role=role,
            full_name=full_name,
            phone=phone,
        )
        db.session.add(user)
        db.session.commit()

        token = create_access_token(identity=str(user.id))
        return jsonify({"access_token": token, "user": user.serialize()}), 201

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
        external_place = body.get("external_place") or {}
        scheduled_at_raw = body.get("scheduled_at")
        address = body.get("address")
        notes = body.get("notes")

        if not scheduled_at_raw or not address:
            return jsonify({"msg": "scheduled_at and address are required"}), 400

        scheduled_at = _parse_iso_datetime(scheduled_at_raw)
        if not scheduled_at:
            return jsonify({"msg": "scheduled_at must be an ISO datetime string"}), 400

        now = datetime.utcnow()
        if scheduled_at < now:
            return jsonify({"msg": "scheduled_at cannot be in the past"}), 400

        barber = None
        demo_mode = False

        if barber_id:
            try:
                barber_id = int(barber_id)
            except Exception:
                return jsonify({"msg": "barber_id must be a number"}), 400

            barber = User.query.get(barber_id)
            if not barber or barber.role != "barber":
                barber = None

        if barber is None:
            if isinstance(external_place, dict) and (
                external_place.get("place_id")
                or external_place.get("external_id")
                or external_place.get("id")
            ):
                try:
                    barber = _ensure_demo_barber_from_place(external_place)
                    demo_mode = True
                except Exception as e:
                    return jsonify({"msg": f"Could not resolve external place barber: {str(e)}"}), 400
            else:
                return jsonify({"msg": "barber_id or external_place is required"}), 400

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

        return jsonify({
            "booking": _serialize_booking_with_z(booking),
            "demo_mode": demo_mode,
            "barber": barber.serialize()
        }), 201

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

    @api.route("/conversations", methods=["GET"])
    @jwt_required()
    def get_conversations():
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({"msg": "User not found"}), 404

        conversations = (
            Conversation.query
            .filter((Conversation.client_id == user.id) | (Conversation.barber_id == user.id))
            .order_by(Conversation.updated_at.desc(), Conversation.id.desc())
            .all()
        )

        results = []
        for convo in conversations:
            other_user = _get_other_user_from_conversation(convo, user.id)

            last_message = (
                Message.query
                .filter_by(conversation_id=convo.id)
                .order_by(Message.created_at.desc(), Message.id.desc())
                .first()
            )

            unread_count = (
                Message.query
                .filter(
                    Message.conversation_id == convo.id,
                    Message.sender_id != user.id,
                    Message.read_at.is_(None)
                )
                .count()
            )

            results.append({
                "conversation": convo.serialize(),
                "other_user": other_user.serialize() if other_user else None,
                "last_message": _serialize_message_with_z(last_message) if last_message else None,
                "unread_count": unread_count,
            })

        return jsonify({"results": results}), 200

    @api.route("/conversations", methods=["POST"])
    @jwt_required()
    def create_or_get_conversation():
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({"msg": "User not found"}), 404

        body = request.get_json() or {}
        target_user_id = body.get("user_id") or body.get("barber_id") or body.get("client_id")

        if not target_user_id:
            return jsonify({"msg": "user_id is required"}), 400

        try:
            target_user_id = int(target_user_id)
        except Exception:
            return jsonify({"msg": "user_id must be a number"}), 400

        if target_user_id == user.id:
            return jsonify({"msg": "You cannot create a conversation with yourself"}), 400

        target_user = User.query.get(target_user_id)
        if not target_user:
            return jsonify({"msg": "Target user not found"}), 404

        if user.role == target_user.role:
            return jsonify({"msg": "Conversation must be between client and barber"}), 400

        if user.role == "client":
            client_id = user.id
            barber_id = target_user.id
        else:
            client_id = target_user.id
            barber_id = user.id

        conversation = Conversation.query.filter_by(
            client_id=client_id,
            barber_id=barber_id
        ).first()

        if not conversation:
            conversation = Conversation(client_id=client_id, barber_id=barber_id)
            db.session.add(conversation)
            db.session.commit()

        other_user = _get_other_user_from_conversation(conversation, user.id)

        return jsonify({
            "conversation": conversation.serialize(),
            "other_user": other_user.serialize() if other_user else None
        }), 200

    @api.route("/conversations/<int:conversation_id>/messages", methods=["GET"])
    @jwt_required()
    def get_conversation_messages(conversation_id):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({"msg": "User not found"}), 404

        conversation = Conversation.query.get(conversation_id)
        if not conversation:
            return jsonify({"msg": "Conversation not found"}), 404

        if user.id not in [conversation.client_id, conversation.barber_id]:
            return jsonify({"msg": "Not allowed"}), 403

        unread_messages = (
            Message.query
            .filter(
                Message.conversation_id == conversation.id,
                Message.sender_id != user.id,
                Message.read_at.is_(None)
            )
            .all()
        )

        now_utc_naive = datetime.now(timezone.utc).replace(tzinfo=None)
        for msg in unread_messages:
            msg.read_at = now_utc_naive

        if unread_messages:
            db.session.commit()

        messages = (
            Message.query
            .filter_by(conversation_id=conversation.id)
            .order_by(Message.created_at.asc(), Message.id.asc())
            .all()
        )

        other_user = _get_other_user_from_conversation(conversation, user.id)

        return jsonify({
            "conversation": conversation.serialize(),
            "other_user": other_user.serialize() if other_user else None,
            "results": [_serialize_message_with_z(m) for m in messages]
        }), 200

    @api.route("/conversations/<int:conversation_id>/messages", methods=["POST"])
    @jwt_required()
    def send_conversation_message(conversation_id):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({"msg": "User not found"}), 404

        conversation = Conversation.query.get(conversation_id)
        if not conversation:
            return jsonify({"msg": "Conversation not found"}), 404

        if user.id not in [conversation.client_id, conversation.barber_id]:
            return jsonify({"msg": "Not allowed"}), 403

        body = request.get_json() or {}
        text = (body.get("text") or "").strip()

        if not text:
            return jsonify({"msg": "text is required"}), 400

        message = Message(
            conversation_id=conversation.id,
            sender_id=user.id,
            text=text
        )

        conversation.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)

        db.session.add(message)
        db.session.commit()

        return jsonify({"message": _serialize_message_with_z(message)}), 201