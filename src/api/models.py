from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import UniqueConstraint, CheckConstraint
import enum

db = SQLAlchemy()


class BookingStatus(enum.Enum):
    pending = "pending"
    accepted = "accepted"
    completed = "completed"
    canceled = "canceled"


def iso_safe(dt):
    """
    Si dt es datetime -> dt.isoformat()
    Si dt es string/None -> devolver tal cual
    """
    if dt is None:
        return None
    return dt.isoformat() if hasattr(dt, "isoformat") else dt


class User(db.Model):
    __tablename__ = "user"

    id = db.Column(db.Integer, primary_key=True)

    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)

    full_name = db.Column(db.String(120), nullable=True)
    phone = db.Column(db.String(40), nullable=True)

    # roles: "client" o "barber"
    role = db.Column(db.String(20), nullable=False, default="client", index=True)

    created_at = db.Column(db.DateTime, server_default=db.func.now(), nullable=False)

    barber_profile = db.relationship(
        "BarberProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )

    bookings_as_client = db.relationship(
        "Booking",
        back_populates="client",
        foreign_keys="Booking.client_id",
        cascade="all, delete-orphan"
    )
    bookings_as_barber = db.relationship(
        "Booking",
        back_populates="barber",
        foreign_keys="Booking.barber_id",
        cascade="all, delete-orphan"
    )

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
            "role": self.role,
            "created_at": iso_safe(self.created_at)
        }


class BarberProfile(db.Model):
    __tablename__ = "barber_profile"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), unique=True, nullable=False, index=True)

    bio = db.Column(db.Text, nullable=True)

    base_price_cents = db.Column(db.Integer, nullable=True)
    rating = db.Column(db.Float, nullable=True)

    borough = db.Column(db.String(50), nullable=True)
    neighborhood = db.Column(db.String(80), nullable=True)

    created_at = db.Column(db.DateTime, server_default=db.func.now(), nullable=False)

    user = db.relationship("User", back_populates="barber_profile")

    __table_args__ = (
        CheckConstraint("base_price_cents IS NULL OR base_price_cents >= 0", name="ck_barber_base_price_nonneg"),
    )

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "bio": self.bio,
            "base_price_cents": self.base_price_cents,
            "rating": self.rating,
            "borough": self.borough,
            "neighborhood": self.neighborhood,
            "created_at": iso_safe(self.created_at)
        }


class Booking(db.Model):
    __tablename__ = "booking"

    id = db.Column(db.Integer, primary_key=True)

    client_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    barber_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)

    # DateTime real
    scheduled_at = db.Column(db.DateTime, nullable=False, index=True)

    address = db.Column(db.String(255), nullable=False)
    notes = db.Column(db.Text, nullable=True)

    status = db.Column(db.Enum(BookingStatus), nullable=False, default=BookingStatus.pending, index=True)

    created_at = db.Column(db.DateTime, server_default=db.func.now(), nullable=False)

    # OJO: esta columna TIENE que existir en DB (migración)
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now(), nullable=False)

    client = db.relationship("User", back_populates="bookings_as_client", foreign_keys=[client_id])
    barber = db.relationship("User", back_populates="bookings_as_barber", foreign_keys=[barber_id])

    __table_args__ = (
        UniqueConstraint("barber_id", "scheduled_at", name="uq_booking_barber_time"),
    )

    def serialize(self):
        return {
            "id": self.id,
            "client_id": self.client_id,
            "barber_id": self.barber_id,
            "scheduled_at": iso_safe(self.scheduled_at),
            "address": self.address,
            "notes": self.notes,
            "status": self.status.value if self.status else None,
            "created_at": iso_safe(self.created_at),
            "updated_at": iso_safe(self.updated_at),
        }