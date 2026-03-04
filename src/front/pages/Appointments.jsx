import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyBookings } from "../../services/api.js";

export default function Appointments() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      setHasToken(!!token);

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await getMyBookings(token);
        setBookings(data?.results || []);
      } catch (e) {
        setError(e?.message || "Failed to load bookings");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div style={{ padding: 12 }}>
      <h2 style={{ margin: 8 }}>Appointments</h2>

      {/* Botón para crear nueva cita */}
      {hasToken && (
        <button
          style={{
            margin: 8,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.08)",
            cursor: "pointer",
            fontWeight: 800
          }}
          onClick={() => navigate("/services-map")}
        >
          Book near me
        </button>
      )}

      {!hasToken && (
        <div className="bo-card" style={{ margin: 8, padding: 12 }}>
          <p style={{ margin: 0, opacity: 0.85 }}>
            You need to log in to see your bookings.
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
            onClick={() => navigate("/login")}
          >
            Go to Login
          </button>
        </div>
      )}

      {loading && <p style={{ padding: 8 }}>Loading...</p>}

      {!loading && error && (
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

      {!loading && hasToken && bookings.length === 0 && !error && (
        <p style={{ padding: 8 }}>No bookings yet.</p>
      )}

      {!loading &&
        bookings.map((b) => (
          <div key={b.id} className="bo-card" style={{ margin: 8, padding: 12 }}>
            <p style={{ margin: 0 }}>
              <strong>Date:</strong> {b.scheduled_at}
            </p>

            <p style={{ margin: 0 }}>
              <strong>Address:</strong> {b.address}
            </p>

            <p style={{ margin: 0 }}>
              <strong>Status:</strong> {b.status}
            </p>
          </div>
        ))}
    </div>
  );
}