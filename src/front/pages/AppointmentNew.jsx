import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
// import { createBooking } from "../../services/api.js"; // la creamos después si no existe

export default function AppointmentNew() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const barber = state?.barber;

  const [scheduledAt, setScheduledAt] = useState("");
  const [address, setAddress] = useState(barber?.address || "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const hasToken = useMemo(() => !!localStorage.getItem("token"), []);

  function goLogin() {
    navigate("/login");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!hasToken) {
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

    try {
      const payload = {
        barber_id: barber.id || barber.place_id || barber.placeId,
        scheduled_at: scheduledAt,
        address: address || barber.address || "",
        notes
      };

      // ✅ cuando tengas el endpoint listo, reemplazamos por:
      // await createBooking(localStorage.getItem("token"), payload);

      console.log("BOOKING PAYLOAD:", payload);

      // Por ahora navegamos a la lista (simulación)
      navigate("/appointments");
    } catch (e2) {
      setError(e2?.message || "Failed to create booking");
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
              fontWeight: 800
            }}
            onClick={goLogin}
          >
            Go to Login
          </button>
        </div>
      )}

      {barber && (
        <div className="bo-card" style={{ margin: 8, padding: 12 }}>
          <p style={{ margin: 0, fontWeight: 900 }}>{barber.name || "Barber shop"}</p>
          <p style={{ margin: 0, opacity: 0.85 }}>{barber.address || "Nearby location"}</p>
          <p style={{ margin: 0, opacity: 0.85 }}>⭐ {barber.rating ?? "—"}</p>
        </div>
      )}

      {error && (
        <div
          className="bo-card"
          style={{
            margin: 8,
            padding: 12,
            border: "1px solid rgba(255, 80, 80, 0.25)",
            background: "rgba(255, 80, 80, 0.10)"
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bo-card" style={{ margin: 8, padding: 12 }}>
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
            marginBottom: 12
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
            marginBottom: 12
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
            marginBottom: 12
          }}
        />

        <button
          type="submit"
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid #c6a75e",
            background: "#c6a75e",
            color: "#000",
            fontWeight: 900,
            cursor: "pointer"
          }}
        >
          Confirm Booking
        </button>
      </form>
    </div>
  );
}