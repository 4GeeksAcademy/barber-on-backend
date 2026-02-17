from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import UniqueConstraint
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = "user"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    full_name = db.Column(db.String(120), nullable=True)
    phone = db.Column(db.String(40), nullable=True)

    # roles: "client" o "barber"
    role = db.Column(db.String(20), nullable=False, default="client")

    created_at = db.Column(db.DateTime, server_default=db.func.now())

    # Barber profile (si role == barber)
    barber_profile = db.relationship("BarberProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")

    # Bookings donde el user es cliente o barbero
    bookings_as_client = db.relationship("Booking", back_populates="client", foreign_keys="Booking.client_id")
    bookings_as_barber = db.relationship("Booking", back_populates="barber", foreign_keys="Booking.barber_id")

    def set_password(self, raw_password: str):
        self.password_hash = generate_password_hash(raw_password)

    def check_password(self, raw_password: str) -> bool:
        return check_password_hash(self.password_hash, raw_password)

    def serialize(self):
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "phone": self.phone,
            "role": self.role
        }


class BarberProfile(db.Model):
    __tablename__ = "barber_profile"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), unique=True, nullable=False)

    bio = db.Column(db.Text, nullable=True)
    base_price = db.Column(db.Integer, nullable=True)  # en centavos o dólares, como elijas
    rating = db.Column(db.Float, nullable=True)

    # zona aproximada (más adelante hacemos geo)
    borough = db.Column(db.String(50), nullable=True)   # Manhattan/Queens/Brooklyn...
    neighborhood = db.Column(db.String(80), nullable=True)

    user = db.relationship("User", back_populates="barber_profile")

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "bio": self.bio,
            "base_price": self.base_price,
            "rating": self.rating,
            "borough": self.borough,
            "neighborhood": self.neighborhood
        }


class Booking(db.Model):
    __tablename__ = "booking"

    id = db.Column(db.Integer, primary_key=True)

    client_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    barber_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

    # Para MVP: fecha y hora como string ISO (luego lo pasamos a DateTime)
    scheduled_at = db.Column(db.String(40), nullable=False)

    # Dirección del cliente (luego pasamos a lat/lng)
    address = db.Column(db.String(255), nullable=False)
    notes = db.Column(db.Text, nullable=True)

    status = db.Column(db.String(20), nullable=False, default="pending")  # pending/accepted/completed/canceled
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    client = db.relationship("User", back_populates="bookings_as_client", foreign_keys=[client_id])
    barber = db.relationship("User", back_populates="bookings_as_barber", foreign_keys=[barber_id])

    def serialize(self):
        return {
            "id": self.id,
            "client_id": self.client_id,
            "barber_id": self.barber_id,
            "scheduled_at": self.scheduled_at,
            "address": self.address,
            "notes": self.notes,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
