from flask import jsonify, request, Blueprint
from api.models import db, User, Booking, BookingStatus
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import datetime, timezone
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash

api = Blueprint("api", __name__)


def _parse_iso_datetime(value: str):
    """
    Accepts:
      - '2026-02-25T14:30'
      - '2026-02-25T14:30:00'
      - '2026-02-25T14:30:00Z'
      - '2026-02-25T14:30:00+00:00'
    Returns a naive datetime (UTC if tz-aware input).
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


def setup_routes():
    """
    IMPORTANT:
    All routes must be defined inside this function because app.py calls setup_routes()
    before registering the blueprint.
    """

    # -------------------------------------------------------
    # ✅ CORS PREFLIGHT FIX (OPTIONS must return headers)
    # -------------------------------------------------------
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

    # -------------------------------------------------------
    # AUTH
    # -------------------------------------------------------
    @api.route("/auth/login", methods=["POST"])
    def login():
        body = request.get_json() or {}
        email = (body.get("email") or "").strip().lower()
        password = body.get("password") or ""

        if not email or not password:
            return jsonify({"msg": "Email and password are required"}), 400

        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"msg": "Invalid credentials"}), 401

        # Assumes your User model has password_hash field
        if not getattr(user, "password_hash", None):
            return jsonify({"msg": "User password not set"}), 500

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

        exists = User.query.filter_by(email=email).first()
        if exists:
            return jsonify({"msg": "Email already exists"}), 409

        user = User(
            email=email,
            password_hash=generate_password_hash(password),
            role=role
        )

        db.session.add(user)
        db.session.commit()

        token = create_access_token(identity=str(user.id))
        return jsonify({"access_token": token, "user": user.serialize()}), 201

    # -------------------------------------------------------
    # BOOKINGS
    # -------------------------------------------------------
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

        try:
            booking = Booking(
                client_id=client.id,
                barber_id=barber.id,
                scheduled_at=scheduled_at,
                address=address.strip(),
                notes=(notes.strip() if isinstance(notes, str) and notes.strip() else None),
                status=BookingStatus.pending
            )

            db.session.add(booking)
            db.session.commit()

            return jsonify({"booking": booking.serialize()}), 201

        except IntegrityError:
            db.session.rollback()
            return jsonify({"msg": "This time slot is already booked"}), 409

        except Exception as e:
            db.session.rollback()
            print("❌ create_booking 500 ERROR:", str(e))
            return jsonify({"msg": "Server error creating booking", "error": str(e)}), 500

    @api.route("/bookings/me", methods=["GET"])
    @jwt_required()
    def my_bookings():
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({"msg": "User not found"}), 404

        if user.role == "client":
            bookings = (
                Booking.query
                .filter_by(client_id=user.id)
                .order_by(Booking.scheduled_at.desc())
                .all()
            )
        else:
            bookings = (
                Booking.query
                .filter_by(barber_id=user.id)
                .order_by(Booking.scheduled_at.desc())
                .all()
            )

        return jsonify({"results": [b.serialize() for b in bookings]}), 200

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

        return jsonify({"booking": booking.serialize()}), 200