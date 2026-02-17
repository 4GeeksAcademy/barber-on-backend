from flask import jsonify, request, Blueprint
from api.models import db, User, BarberProfile, Booking
from api.utils import APIException

from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity
)

api = Blueprint('api', __name__)


def setup_routes():

    # -----------------------------
    # HEALTH
    # -----------------------------
    @api.route("/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok"}), 200
    
    
    
    @api.route("/hello", methods=["GET"])
    def hello():
        return jsonify({"message": "Hello from backend!"}), 200


    # -----------------------------
    # AUTH
    # -----------------------------
    @api.route("/auth/register", methods=["POST"])
    def register():
        body = request.get_json() or {}
        email = body.get("email")
        password = body.get("password")
        role = body.get("role", "client")
        full_name = body.get("full_name")
        phone = body.get("phone")

        if not email or not password:
            return jsonify({"msg": "email and password required"}), 400

        if role not in ["client", "barber"]:
            return jsonify({"msg": "role must be client or barber"}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({"msg": "email already exists"}), 409

        user = User(email=email, role=role, full_name=full_name, phone=phone)
        user.set_password(password)

        db.session.add(user)
        db.session.commit()

        # Si es barber, creamos su profile vacío
        if role == "barber":
            profile = BarberProfile(user_id=user.id)
            db.session.add(profile)
            db.session.commit()

        return jsonify({"user": user.serialize()}), 201

    @api.route("/auth/login", methods=["POST"])
    def login():
        body = request.get_json() or {}
        email = body.get("email")
        password = body.get("password")

        if not email or not password:
            return jsonify({"msg": "email and password required"}), 400

        user = User.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            return jsonify({"msg": "invalid credentials"}), 401

        token = create_access_token(identity=str(user.id))

        return jsonify({
            "token": token,
            "user": user.serialize()
        }), 200

    @api.route("/private", methods=["GET"])
    @jwt_required()
    def private():
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        return jsonify({
            "msg": "You are logged in",
            "user": user.serialize() if user else None
        }), 200

    # -----------------------------
    # ME (usuario logueado)
    # -----------------------------
    @api.route("/me", methods=["GET"])
    @jwt_required()
    def me():
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({"msg": "user not found"}), 404

        prof = user.barber_profile.serialize() if user.role == "barber" and user.barber_profile else None
        return jsonify({"user": {**user.serialize(), "profile": prof}}), 200

    # -----------------------------
    # BARBERS
    # -----------------------------
    @api.route("/barbers", methods=["GET"])
    def list_barbers():
        barbers = User.query.filter_by(role="barber").all()
        data = []

        for b in barbers:
            prof = b.barber_profile.serialize() if b.barber_profile else None
            data.append({**b.serialize(), "profile": prof})

        return jsonify({"results": data}), 200

    @api.route("/barbers/<int:user_id>", methods=["GET"])
    def get_barber(user_id):
        barber = User.query.filter_by(id=user_id, role="barber").first()

        if not barber:
            return jsonify({"msg": "barber not found"}), 404

        prof = barber.barber_profile.serialize() if barber.barber_profile else None
        return jsonify({"barber": {**barber.serialize(), "profile": prof}}), 200

    # -----------------------------
    # BOOKINGS
    # -----------------------------
    @api.route("/bookings", methods=["POST"])
    @jwt_required()
    def create_booking():
        user_id = int(get_jwt_identity())
        client = User.query.get(user_id)

        if not client:
            return jsonify({"msg": "user not found"}), 404

        if client.role != "client":
            return jsonify({"msg": "only clients can create bookings"}), 403

        body = request.get_json() or {}
        barber_id = body.get("barber_id")
        scheduled_at = body.get("scheduled_at")
        address = body.get("address")
        notes = body.get("notes")

        if not barber_id or not scheduled_at or not address:
            return jsonify({"msg": "barber_id, scheduled_at and address are required"}), 400

        barber = User.query.get(barber_id)

        if not barber or barber.role != "barber":
            return jsonify({"msg": "barber not found"}), 404

        booking = Booking(
            client_id=client.id,
            barber_id=barber.id,
            scheduled_at=scheduled_at,
            address=address,
            notes=notes
        )

        db.session.add(booking)
        db.session.commit()

        return jsonify({"booking": booking.serialize()}), 201

    @api.route("/bookings/me", methods=["GET"])
    @jwt_required()
    def my_bookings():
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({"msg": "user not found"}), 404

        if user.role == "client":
            bookings = Booking.query.filter_by(client_id=user.id).order_by(Booking.id.desc()).all()
        else:
            bookings = Booking.query.filter_by(barber_id=user.id).order_by(Booking.id.desc()).all()

        return jsonify({"results": [b.serialize() for b in bookings]}), 200
