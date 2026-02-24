import { useEffect, useMemo, useState } from "react";
import { MapPin, ClipboardList, Timer, CheckCircle2, Send } from "lucide-react";

const BASE_PRICE = 40;
const COMMISSION_RATE = 0.05;

function formatDateTime(dt) {
  // dt: Date
  return dt.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function minutesUntil(date) {
  const diffMs = date.getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / 60000));
}

export default function Activity() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookings, setBookings] = useState([]);

  const commission = useMemo(() => +(BASE_PRICE * COMMISSION_RATE).toFixed(2), []);
  const total = useMemo(() => +(BASE_PRICE + commission).toFixed(2), [commission]);

  async function fetchBookings() {
    try {
      setError("");
      const token = localStorage.getItem("token");
      if (!token) {
        setBookings([]);
        setLoading(false);
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bookings/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.msg || "Error cargando bookings");
      }

      setBookings(data?.results || []);
    } catch (e) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBookings();
    const id = setInterval(fetchBookings, 10000); // "real time" básico (polling)
    return () => clearInterval(id);
  }, []);

  // elegimos la booking activa más reciente
  const activeBooking = useMemo(() => {
    const list = [...bookings];
    list.sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));
    return list.find((b) => b.status === "pending" || b.status === "accepted") || null;
  }, [bookings]);

  // countdown que se actualiza cada segundo
  const [nowTick, setNowTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNowTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const countdownMinutes = useMemo(() => {
    if (!activeBooking) return null;
    const scheduled = new Date(activeBooking.scheduled_at);
    return minutesUntil(scheduled);
  }, [activeBooking, nowTick]);

  return (
    <div className="bo-app">
      <div className="bo-shell">
        <main className="bo-main bo-activity">
          <header className="bo-activityHeader">
            <h1 className="bo-activityTitle">Actividad</h1>
          </header>

          {/* Próximo */}
          <section className="bo-block">
            <h2 className="bo-h2">Próximo</h2>

            {loading ? (
              <div className="bo-nextCard">
                <div className="bo-nextText">
                  <div className="bo-nextTitle">Cargando…</div>
                  <div className="bo-nextSub">Buscando tus citas</div>
                </div>
                <div className="bo-nextIconWrap" aria-hidden="true">
                  <ClipboardList size={26} />
                </div>
              </div>
            ) : error ? (
              <div className="bo-nextCard" style={{ borderColor: "rgba(255,80,80,.35)" }}>
                <div className="bo-nextText">
                  <div className="bo-nextTitle">Error</div>
                  <div className="bo-nextSub">{error}</div>
                </div>
              </div>
            ) : activeBooking ? (
              <div className="bo-nextCard" style={{ gap: 14 }}>
                <div className="bo-nextText" style={{ flex: 1 }}>
                  <div className="bo-nextTitle">
                    {activeBooking.status === "pending" ? "Cita pendiente" : "Cita aceptada"}
                  </div>

                  <div className="bo-nextSub" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ opacity: 0.9 }}>
                      {formatDateTime(new Date(activeBooking.scheduled_at))}
                    </span>

                    <span style={{ display: "inline-flex", gap: 6, alignItems: "center", opacity: 0.9 }}>
                      <Timer size={16} />
                      {countdownMinutes} min
                    </span>
                  </div>

                  <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                    <div style={{ opacity: 0.9 }}>
                      Precio: <b>${BASE_PRICE}</b> + comisión <b>{COMMISSION_RATE * 100}%</b> (${commission}) →{" "}
                      <b>${total}</b>
                    </div>

                    <div style={{ opacity: 0.85, display: "flex", gap: 8, alignItems: "center" }}>
                      {activeBooking.status === "pending" ? (
                        <>
                          <Send size={16} />
                          Orden enviada a la barbería (esperando confirmación)
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} />
                          La barbería aceptó tu solicitud
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bo-nextIconWrap" aria-hidden="true">
                  {activeBooking.status === "pending" ? <Send size={26} /> : <CheckCircle2 size={26} />}
                </div>
              </div>
            ) : (
              <div className="bo-nextCard">
                <div className="bo-nextText">
                  <div className="bo-nextTitle">No hay citas próximas</div>
                  <div className="bo-nextSub">Reservá un turno desde “Servicios” o un Barber</div>
                </div>

                <div className="bo-nextIconWrap" aria-hidden="true">
                  <ClipboardList size={26} />
                </div>
              </div>
            )}
          </section>

          {/* (Opcional) lista rápida de historial */}
          {!loading && bookings.length > 0 ? (
            <section className="bo-block">
              <h2 className="bo-h2">Historial</h2>

              <div style={{ display: "grid", gap: 10 }}>
                {bookings.slice(0, 5).map((b) => (
                  <div key={b.id} className="bo-card" style={{ padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 800 }}>
                          {b.status.toUpperCase()} • {formatDateTime(new Date(b.scheduled_at))}
                        </div>
                        <div style={{ opacity: 0.85, marginTop: 4 }}>{b.address}</div>
                      </div>
                      <div style={{ opacity: 0.9 }}>
                        <MapPin size={18} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}