import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createBooking } from "../../services/api.js";

export default function AppointmentNew() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const barber = state?.barber || null;

  const [scheduledAt, setScheduledAt] = useState("");
  const [address, setAddress] = useState(barber?.address || "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const hasToken = useMemo(() => !!localStorage.getItem("token"), []);

  function goLogin() {
    navigate("/login");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const token = localStorage.getItem("token");

    if (!token) {
      goLogin();
      return;
    }

    if (!barber) {
      setError("No barber selected. Go back and choose one on the map.");
      return;
    }

    if (!scheduledAt) {
      setError("Please choose a date and time.");
      return;
    }

    if (!address || address.trim().length < 6) {
      setError("Please enter a valid address.");
      return;
    }

    setLoading(true);

    try {
      const numericBarberId = Number(barber?.id);
      const hasRealBarberId =
        Number.isInteger(numericBarberId) && numericBarberId > 0;

      const payload = {
        scheduled_at: new Date(scheduledAt).toISOString(),
        address: address.trim(),
        notes: notes.trim() || null,
      };

      if (hasRealBarberId) {
        payload.barber_id = numericBarberId;
      } else {
        payload.external_place = {
          place_id:
            barber?.place_id ||
            barber?.placeId ||
            barber?.external_id ||
            barber?.id ||
            `map-place-${Date.now()}`,
          name: barber?.name || barber?.shop_name || "Map barber",
          address: barber?.address || address.trim(),
          lat: barber?.lat ?? barber?.latitude ?? null,
          lng: barber?.lng ?? barber?.longitude ?? null,
          rating: barber?.rating ?? null,
          open_now: barber?.open_now ?? null,
          photo_ref: barber?.photo_ref ?? null,
        };
      }

      await createBooking(payload, token);

      setSuccess("✅ Booking created successfully. Redirecting...");
      setTimeout(() => {
        navigate("/activity");
      }, 900);
    } catch (e2) {
      const msg = e2?.message || "Failed to create booking";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 12 }}>
      <h2 style={{ margin: 8 }}>New Appointment</h2>

      {!hasToken && (
        <div className="bo-card" style={{ margin: 8, padding: 12 }}>
          <p style={{ margin: 0, opacity: 0.85 }}>
            You need to log in to book an appointment.
          </p>
          <button
            style={{
              marginTop: 10,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.08)",
              cursor: "pointer",
              fontWeight: 800,
            }}
            onClick={goLogin}
          >
            Go to Login
          </button>
        </div>
      )}

      {barber && (
        <div className="bo-card" style={{ margin: 8, padding: 12 }}>
          <p style={{ margin: 0, fontWeight: 900 }}>
            {barber.name || "Barber shop"}
          </p>
          <p style={{ margin: 0, opacity: 0.85 }}>
            {barber.address || "Nearby location"}
          </p>
          <p style={{ margin: 0, opacity: 0.85 }}>
            ⭐ {barber.rating ?? "—"}
          </p>
        </div>
      )}

      {error && (
        <div
          className="bo-card"
          style={{
            margin: 8,
            padding: 12,
            border: "1px solid rgba(255, 80, 80, 0.25)",
            background: "rgba(255, 80, 80, 0.10)",
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="bo-card"
          style={{
            margin: 8,
            padding: 12,
            border: "1px solid rgba(80, 255, 160, 0.25)",
            background: "rgba(80, 255, 160, 0.10)",
          }}
        >
          {success}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bo-card"
        style={{ margin: 8, padding: 12 }}
      >
        <label style={{ display: "block", marginBottom: 6, opacity: 0.9 }}>
          Date & time
        </label>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            marginBottom: 12,
          }}
        />

        <label style={{ display: "block", marginBottom: 6, opacity: 0.9 }}>
          Address
        </label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Service address"
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            marginBottom: 12,
          }}
        />

        <label style={{ display: "block", marginBottom: 6, opacity: 0.9 }}>
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            marginBottom: 12,
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid #c6a75e",
            background: "#c6a75e",
            color: "#000",
            fontWeight: 900,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Creating booking..." : "Confirm Booking"}
        </button>
      </form>
    </div>
  );
}