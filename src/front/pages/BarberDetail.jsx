import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { createBooking } from "../../services/api.js";

/**
 * BarberDetail.jsx (PRO MVP)
 * - Premium booking modal
 * - ✅ TODAY real-time slots (no tomorrow)
 * - ✅ Countdown
 * - ✅ Home / In-shop
 * - ✅ Sends scheduled_at as ISO (UTC Z)
 * - ✅ Clear 409 slot-taken message
 * - ✅ Slots refresh while modal is open
 *
 * IMPORTANT FIX:
 * - Keep selected slot as LOCAL timestamp (ms) to avoid day-shifts/confusion,
 *   and only convert to ISO at send-time.
 */

export default function BarberDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const barberId = useMemo(() => Number(id), [id]);

  // Mock shop address
  const barberShopAddress = useMemo(() => {
    if (barberId === 1) return "428 West St, Astoria, NY";
    if (barberId === 2) return "833 38th Ave, Astoria, NY";
    return "Astoria, NY";
  }, [barberId]);

  const [open, setOpen] = useState(false);

  // Form state
  const [serviceMode, setServiceMode] = useState("home"); // "home" | "shop"
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  // Time selection (LOCAL ms)
  const [selectedSlotMs, setSelectedSlotMs] = useState(null);

  // UX state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Countdown
  const [countdown, setCountdown] = useState("00:00");

  // Refresh slots tick while modal open (every 30s)
  const [slotTick, setSlotTick] = useState(0);

  // -------------------------
  // Helpers
  // -------------------------
  const pad = (n) => String(n).padStart(2, "0");

  function roundUpToMinutes(date, stepMinutes) {
    const d = new Date(date);
    d.setSeconds(0, 0);
    const ms = stepMinutes * 60 * 1000;
    return new Date(Math.ceil(d.getTime() / ms) * ms);
  }

  /**
   * Build slots ONLY for "today" in user's LOCAL TIME
   */
  function buildTodaySlots({ stepMinutes = 30, maxSlots = 18, endHour = 21 }) {
    const now = new Date();

    // start: next rounded slot, plus small buffer
    const bufferMs = 2 * 60 * 1000;
    const start = roundUpToMinutes(new Date(now.getTime() + bufferMs), stepMinutes);

    // end: today at endHour:00
    const end = new Date(now);
    end.setHours(endHour, 0, 0, 0);

    const slots = [];
    let cursor = start;

    while (cursor <= end && slots.length < maxSlots) {
      // Keep ONLY today (local)
      const sameDay =
        cursor.getFullYear() === now.getFullYear() &&
        cursor.getMonth() === now.getMonth() &&
        cursor.getDate() === now.getDate();

      if (sameDay) slots.push(new Date(cursor));
      cursor = new Date(cursor.getTime() + stepMinutes * 60 * 1000);
    }

    return slots;
  }

  function formatTimeOnly(dt) {
    return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function formatTodayLabel(dt) {
    const d = dt.toLocaleDateString([], { weekday: "short", month: "short", day: "2-digit" });
    return `Today • ${d}`;
  }

  function formatCountdown(ms) {
    if (ms <= 0) return "00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${pad(minutes)}:${pad(seconds)}`;
  }

  const requestStatusCopy = useMemo(() => {
    if (serviceMode === "shop") return "Request sent to the barber (in-shop). Waiting for confirmation.";
    return "Request sent to the barber (home service). Waiting for confirmation.";
  }, [serviceMode]);

  // ✅ Slots regenerate while modal open
  const slots = useMemo(() => {
    return buildTodaySlots({ stepMinutes: 30, maxSlots: 18, endHour: 21 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, slotTick]);

  // Tick for slots refresh
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setSlotTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, [open]);

  const selectedSlotDate = useMemo(() => {
    return selectedSlotMs ? new Date(selectedSlotMs) : null;
  }, [selectedSlotMs]);

  const resetForm = () => {
    setError("");
    setSuccess("");
    setNotes("");
    setServiceMode("home");
    setAddress("");
    setSelectedSlotMs(null);
  };

  const openModal = () => {
    resetForm();
    setOpen(true);
  };

  // When modal opens, set default slot to first available today
  useEffect(() => {
    if (!open) return;

    // If no selection -> pick first
    if (selectedSlotMs == null && slots.length > 0) {
      setSelectedSlotMs(slots[0].getTime());
      return;
    }

    // If selection is now in the past -> move to first
    if (selectedSlotMs != null && selectedSlotMs < Date.now() && slots.length > 0) {
      setSelectedSlotMs(slots[0].getTime());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, slots.length]);

  const onChangeMode = (mode) => {
    setServiceMode(mode);
    if (mode === "shop") setAddress(barberShopAddress);
    else setAddress("");
  };

  const validate = (finalAddress) => {
    if (!barberId || Number.isNaN(barberId)) return "Invalid barber.";
    if (selectedSlotMs == null) return "Pick a time slot for today.";
    if (!finalAddress || finalAddress.trim().length < 6) return "Enter a valid address.";
    return "";
  };

  // Countdown updater
  useEffect(() => {
    if (!open) return;

    const tick = () => {
      if (selectedSlotMs == null) {
        setCountdown("00:00");
        return;
      }
      const diff = selectedSlotMs - Date.now();
      setCountdown(formatCountdown(diff));
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [open, selectedSlotMs]);

  const onConfirm = async () => {
    setError("");
    setSuccess("");

    const finalAddress = serviceMode === "shop" ? barberShopAddress : address;

    const msg = validate(finalAddress);
    if (msg) {
      setError(msg);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("You must be logged in to book.");
      navigate("/login");
      return;
    }

    // Convert LOCAL selection -> ISO Z for backend
    const scheduled_at = new Date(selectedSlotMs).toISOString();

    // extra safety: block if already passed
    if (new Date(scheduled_at).getTime() < Date.now()) {
      setError("That slot is already in the past. Pick a new time.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        barber_id: barberId,
        scheduled_at,
        address: finalAddress.trim(),
        notes: notes.trim() || null,
      };

      await createBooking(payload, token);

      setSuccess("✅ Booking created. Redirecting to Activity...");
      setTimeout(() => {
        setOpen(false);
        navigate("/activity");
      }, 900);
    } catch (err) {
      console.error("❌ createBooking error:", err);

      if (err?.message === "TOKEN_EXPIRED") {
        setError("Your session expired. Please log in again.");
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }

      const msgRaw = String(err?.message || "");
      const low = msgRaw.toLowerCase();

      // ✅ 409 slot taken
      if (low.includes("already booked") || low.includes("time slot") || low.includes("409") || low.includes("taken")) {
        setError("That time is already taken. Please pick another slot.");
        return;
      }

      if (low.includes("failed to fetch")) {
        setError(
          "CORS / backend connection issue (Failed to fetch).\n" +
            "Fix Flask CORS for your Codespaces domain (*.app.github.dev) and restart backend."
        );
        return;
      }

      setError(msgRaw || "Error creating booking");
    } finally {
      setLoading(false);
    }
  };

  // Debug ISO
  const debugISO = useMemo(() => {
    if (selectedSlotMs == null) return "-";
    return new Date(selectedSlotMs).toISOString();
  }, [selectedSlotMs]);

  return (
    <div className="bo-app">
      <div className="bo-shell">
        <main className="bo-main" style={{ padding: 12 }}>
          <h2 style={{ margin: "8px 0" }}>Barber Detail</h2>

          {/* CTA */}
          <div
            className="bo-card"
            style={{
              marginTop: 12,
              padding: 14,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, opacity: 0.8 }}>Ready to book?</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>Confirm your appointment</div>
                <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>Shop: {barberShopAddress}</div>
              </div>

              <button
                onClick={openModal}
                style={{
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.08)",
                  cursor: "pointer",
                  fontWeight: 800,
                  color: "inherit",
                }}
              >
                Book now
              </button>
            </div>
          </div>

          {/* MODAL */}
          {open && (
            <div
              role="dialog"
              aria-modal="true"
              onClick={() => !loading && setOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.58)",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                padding: 12,
                zIndex: 50,
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "100%",
                  maxWidth: 520,
                  borderRadius: 22,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(12,12,14,0.96)",
                  padding: 14,
                  boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
                }}
              >
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>BarberOn</div>
                    <div style={{ fontSize: 18, fontWeight: 900 }}>Confirm booking</div>
                  </div>

                  <button
                    disabled={loading}
                    onClick={() => setOpen(false)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "transparent",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontSize: 18,
                      color: "inherit",
                    }}
                    title="Close"
                  >
                    ✕
                  </button>
                </div>

                {/* TIME block */}
                <div
                  style={{
                    marginTop: 12,
                    borderRadius: 18,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.03)",
                    padding: 12,
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.75 }}>Time (today)</div>

                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 900 }}>Pick a time</div>
                      <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>
                        {selectedSlotDate
                          ? `${formatTodayLabel(selectedSlotDate)} • ${formatTimeOnly(selectedSlotDate)}`
                          : "Select a slot"}
                      </div>
                    </div>

                    <div
                      style={{
                        minWidth: 92,
                        textAlign: "center",
                        padding: "10px 12px",
                        borderRadius: 16,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(0,0,0,0.22)",
                        fontWeight: 900,
                        letterSpacing: 0.5,
                        fontSize: 18,
                      }}
                      title="Time remaining"
                    >
                      {countdown}
                    </div>
                  </div>

                  {/* Slots grid */}
                  <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {slots.length === 0 ? (
                      <div style={{ fontSize: 12, opacity: 0.7 }}>No available slots for today. Try again later.</div>
                    ) : (
                      slots.map((s) => {
                        const ms = s.getTime();
                        const active = ms === selectedSlotMs;
                        return (
                          <button
                            key={ms}
                            type="button"
                            disabled={loading}
                            onClick={() => setSelectedSlotMs(ms)}
                            style={{
                              padding: "10px 12px",
                              borderRadius: 14,
                              border: "1px solid rgba(255,255,255,0.12)",
                              background: active ? "rgba(255,255,255,0.12)" : "transparent",
                              cursor: loading ? "not-allowed" : "pointer",
                              fontWeight: 900,
                              fontSize: 13,
                              color: "inherit",
                            }}
                          >
                            {formatTimeOnly(s)}
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div style={{ fontSize: 12, opacity: 0.65, marginTop: 10 }}>{requestStatusCopy}</div>
                </div>

                {/* SERVICE MODE */}
                <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Where do you want the service?</div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => onChangeMode("home")}
                      style={{
                        padding: "12px 12px",
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: serviceMode === "home" ? "rgba(255,255,255,0.12)" : "transparent",
                        cursor: loading ? "not-allowed" : "pointer",
                        fontWeight: 900,
                        color: "inherit",
                      }}
                    >
                      Home service
                    </button>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => onChangeMode("shop")}
                      style={{
                        padding: "12px 12px",
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: serviceMode === "shop" ? "rgba(255,255,255,0.12)" : "transparent",
                        cursor: loading ? "not-allowed" : "pointer",
                        fontWeight: 900,
                        color: "inherit",
                      }}
                    >
                      In-shop
                    </button>
                  </div>

                  <div style={{ fontSize: 12, opacity: 0.65 }}>
                    {serviceMode === "shop" ? `Shop address will be used: ${barberShopAddress}` : "Enter your address for home service."}
                  </div>
                </div>

                {/* ADDRESS */}
                <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Address {serviceMode === "shop" ? "(shop)" : "(home)"}</div>
                  <input
                    value={serviceMode === "shop" ? barberShopAddress : address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={serviceMode === "shop" ? barberShopAddress : "Ex: 31-00 30th Ave, Astoria, NY"}
                    disabled={serviceMode === "shop"}
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.06)",
                      color: "inherit",
                      opacity: serviceMode === "shop" ? 0.9 : 1,
                      outline: "none",
                    }}
                  />
                </div>

                {/* NOTES */}
                <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Notes (optional)</div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: low fade + beard"
                    rows={3}
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.06)",
                      color: "inherit",
                      resize: "none",
                      outline: "none",
                    }}
                  />
                </div>

                {/* ERROR / SUCCESS */}
                {error && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: 10,
                      borderRadius: 14,
                      background: "rgba(255, 80, 80, 0.12)",
                      border: "1px solid rgba(255, 80, 80, 0.25)",
                      fontSize: 13,
                      whiteSpace: "pre-line",
                    }}
                  >
                    {error}
                  </div>
                )}

                {success && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: 10,
                      borderRadius: 14,
                      background: "rgba(80, 255, 160, 0.12)",
                      border: "1px solid rgba(80, 255, 160, 0.25)",
                      fontSize: 13,
                    }}
                  >
                    {success}
                  </div>
                )}

                {/* ACTIONS */}
                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button
                    disabled={loading}
                    onClick={() => setOpen(false)}
                    style={{
                      padding: "12px 12px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "transparent",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontWeight: 900,
                      color: "inherit",
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    disabled={loading || slots.length === 0}
                    onClick={onConfirm}
                    style={{
                      padding: "12px 12px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(255,255,255,0.10)",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontWeight: 950,
                      color: "inherit",
                      opacity: slots.length === 0 ? 0.6 : 1,
                    }}
                  >
                    {loading ? "Booking..." : "Confirm"}
                  </button>
                </div>

                <div style={{ fontSize: 12, opacity: 0.65, marginTop: 8 }}>
                  Tip: the slot is blocked if it&apos;s already taken (409).
                </div>

                {/* Debug */}
                <div style={{ fontSize: 11, opacity: 0.35, marginTop: 8 }}>scheduled_at (ISO): {debugISO}</div>
              </div>
            </div>
          )}
        </main>

        <BottomNav />
      </div>
    </div>
  );
}