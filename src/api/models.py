from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import CheckConstraint, UniqueConstraint
import enum

db = SQLAlchemy()


class BookingStatus(enum.Enum):
    pending = "pending"
    accepted = "accepted"
    completed = "completed"
    canceled = "canceled"


def iso_safe(dt):
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

    role = db.Column(db.String(20), nullable=False, default="client", index=True)

    created_at = db.Column(db.DateTime, server_default=db.func.now(), nullable=False)

    reset_token = db.Column(db.String(255), nullable=True)
    reset_token_expires_at = db.Column(db.DateTime, nullable=True)

    barber_profile = db.relationship(
        "BarberProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    bookings_as_client = db.relationship(
        "Booking",
        back_populates="client",
        foreign_keys="Booking.client_id",
        cascade="all, delete-orphan",
    )

    bookings_as_barber = db.relationship(
        "Booking",
        back_populates="barber",
        foreign_keys="Booking.barber_id",
        cascade="all, delete-orphan",
    )

    conversations_as_client = db.relationship(
        "Conversation",
        back_populates="client",
        foreign_keys="Conversation.client_id",
        cascade="all, delete-orphan",
    )

    conversations_as_barber = db.relationship(
        "Conversation",
        back_populates="barber",
        foreign_keys="Conversation.barber_id",
        cascade="all, delete-orphan",
    )

    sent_messages = db.relationship(
        "Message",
        back_populates="sender",
        foreign_keys="Message.sender_id",
        cascade="all, delete-orphan",
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
            "created_at": iso_safe(self.created_at),
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
            "created_at": iso_safe(self.created_at),
        }


class Booking(db.Model):
    __tablename__ = "booking"

    id = db.Column(db.Integer, primary_key=True)

    client_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    barber_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)

    scheduled_at = db.Column(db.DateTime, nullable=False, index=True)

    address = db.Column(db.String(255), nullable=False)
    notes = db.Column(db.Text, nullable=True)

    status = db.Column(db.Enum(BookingStatus), nullable=False, default=BookingStatus.pending, index=True)

    created_at = db.Column(db.DateTime, server_default=db.func.now(), nullable=False)
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now(), nullable=False)

    client = db.relationship("User", back_populates="bookings_as_client", foreign_keys=[client_id])
    barber = db.relationship("User", back_populates="bookings_as_barber", foreign_keys=[barber_id])

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


class Conversation(db.Model):
    __tablename__ = "conversation"

    id = db.Column(db.Integer, primary_key=True)

    client_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    barber_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)

    created_at = db.Column(db.DateTime, server_default=db.func.now(), nullable=False)
    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now(),
        nullable=False,
        index=True,
    )

    client = db.relationship("User", back_populates="conversations_as_client", foreign_keys=[client_id])
    barber = db.relationship("User", back_populates="conversations_as_barber", foreign_keys=[barber_id])

    messages = db.relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at.asc()",
    )

    __table_args__ = (
        UniqueConstraint("client_id", "barber_id", name="uq_conversation_client_barber"),
    )

    def serialize(self):
        return {
            "id": self.id,
            "client_id": self.client_id,
            "barber_id": self.barber_id,
            "created_at": iso_safe(self.created_at),
            "updated_at": iso_safe(self.updated_at),
        }


class Message(db.Model):
    __tablename__ = "message"

    id = db.Column(db.Integer, primary_key=True)

    conversation_id = db.Column(db.Integer, db.ForeignKey("conversation.id"), nullable=False, index=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)

    text = db.Column(db.Text, nullable=False)

    created_at = db.Column(db.DateTime, server_default=db.func.now(), nullable=False, index=True)
    read_at = db.Column(db.DateTime, nullable=True)

    conversation = db.relationship("Conversation", back_populates="messages")
    sender = db.relationship("User", back_populates="sent_messages", foreign_keys=[sender_id])

    def serialize(self):
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "sender_id": self.sender_id,
            "text": self.text,
            "created_at": iso_safe(self.created_at),
            "read_at": iso_safe(self.read_at),
        }


class PaymentMethod(db.Model):
    __tablename__ = "payment_method"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)

    brand = db.Column(db.String(30), nullable=False)
    last4 = db.Column(db.String(4), nullable=False)
    exp_month = db.Column(db.Integer, nullable=False)
    exp_year = db.Column(db.Integer, nullable=False)
    is_default = db.Column(db.Boolean, nullable=False, default=False, index=True)

    created_at = db.Column(db.DateTime, server_default=db.func.now(), nullable=False)

    user = db.relationship(
        "User",
        backref=db.backref("payment_methods", lazy=True, cascade="all, delete-orphan"),
    )

    __table_args__ = (
        CheckConstraint("length(last4) = 4", name="ck_pm_last4_len4"),
        CheckConstraint("exp_month >= 1 AND exp_month <= 12", name="ck_pm_exp_month_range"),
        CheckConstraint("exp_year >= 2020", name="ck_pm_exp_year_min"),
    )

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "brand": self.brand,
            "last4": self.last4,
            "exp_month": self.exp_month,
            "exp_year": self.exp_year,
            "is_default": self.is_default,
            "created_at": iso_safe(self.created_at),
        }