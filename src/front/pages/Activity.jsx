import { useEffect, useMemo, useState } from "react";
import { MapPin, ClipboardList, Timer, CheckCircle2, Send, XCircle } from "lucide-react";
import { getMyBookings, cancelBooking } from "../../services/api";

const BASE_PRICE = 40;
const COMMISSION_RATE = 0.05;

function isSameLocalDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function whenLabelFromISO(isoString) {
  const dt = new Date(isoString); // ISO Z -> Date en local
  const now = new Date();
  const time = dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  if (isSameLocalDay(dt, now)) return `Today, ${time}`;
  if (isSameLocalDay(dt, tomorrow)) return `Tomorrow, ${time}`;

  const date = dt.toLocaleDateString([], { weekday: "short", month: "short", day: "2-digit" });
  return `${date}, ${time}`;
}

function minutesUntil(date) {
  const diffMs = date.getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / 60000));
}

export default function Activity() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
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

      const data = await getMyBookings(token);
      setBookings(data?.results || []);
    } catch (e) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBookings();
    const id = setInterval(fetchBookings, 10000);
    return () => clearInterval(id);
  }, []);

  const activeBooking = useMemo(() => {
    const list = [...bookings];
    list.sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));
    return list.find((b) => b.status === "pending" || b.status === "accepted") || null;
  }, [bookings]);

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

  async function onCancelActive() {
    if (!activeBooking) return;
    const ok = confirm("Cancel this booking request?");
    if (!ok) return;

    try {
      setBusy(true);
      setError("");
      const token = localStorage.getItem("token");
      if (!token) throw new Error("You are not logged in");

      await cancelBooking(activeBooking.id, token);
      await fetchBookings();
    } catch (e) {
      setError(e.message || "Error canceling booking");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bo-app">
      <div className="bo-shell">
        <main className="bo-main bo-activity">
          <header className="bo-activityHeader">
            <h1 className="bo-activityTitle">Activity</h1>
          </header>

          <section className="bo-block">
            <h2 className="bo-h2">Next</h2>

            {loading ? (
              <div className="bo-nextCard">
                <div className="bo-nextText">
                  <div className="bo-nextTitle">Loading…</div>
                  <div className="bo-nextSub">Fetching your bookings</div>
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
                    {activeBooking.status === "pending" ? "Booking request" : "Accepted booking"}
                  </div>

                  <div className="bo-nextSub" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ opacity: 0.9 }}>{whenLabelFromISO(activeBooking.scheduled_at)}</span>

                    <span style={{ display: "inline-flex", gap: 6, alignItems: "center", opacity: 0.9 }}>
                      <Timer size={16} />
                      {countdownMinutes} min
                    </span>
                  </div>

                  <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                    <div style={{ opacity: 0.9 }}>
                      Price: <b>${BASE_PRICE}</b> + service fee <b>{COMMISSION_RATE * 100}%</b> (${commission}) →{" "}
                      <b>${total}</b>
                    </div>

                    <div style={{ opacity: 0.85, display: "flex", gap: 8, alignItems: "center" }}>
                      {activeBooking.status === "pending" ? (
                        <>
                          <Send size={16} />
                          Request sent to the barber (waiting for confirmation)
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} />
                          The barber accepted your request
                        </>
                      )}
                    </div>

                    <button
                      className="bo-btn bo-btnGhost"
                      onClick={onCancelActive}
                      disabled={busy}
                      style={{ display: "inline-flex", gap: 8, alignItems: "center", justifyContent: "center" }}
                    >
                      <XCircle size={18} />
                      {busy ? "Canceling..." : "Cancel booking"}
                    </button>
                  </div>
                </div>

                <div className="bo-nextIconWrap" aria-hidden="true">
                  {activeBooking.status === "pending" ? <Send size={26} /> : <CheckCircle2 size={26} />}
                </div>
              </div>
            ) : (
              <div className="bo-nextCard">
                <div className="bo-nextText">
                  <div className="bo-nextTitle">No upcoming bookings</div>
                  <div className="bo-nextSub">Book a slot from “Services” or a Barber profile</div>
                </div>

                <div className="bo-nextIconWrap" aria-hidden="true">
                  <ClipboardList size={26} />
                </div>
              </div>
            )}
          </section>

          {!loading && bookings.length > 0 ? (
            <section className="bo-block">
              <h2 className="bo-h2">History</h2>

              <div style={{ display: "grid", gap: 10 }}>
                {bookings.slice(0, 8).map((b) => (
                  <div key={b.id} className="bo-card" style={{ padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 800 }}>
                          {String(b.status || "").toUpperCase()} • {whenLabelFromISO(b.scheduled_at)}
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