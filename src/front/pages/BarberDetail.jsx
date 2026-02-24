import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { createBooking } from "../../services/api.js";

/**
 * BarberDetail.jsx (PRO MVP)
 * - Booking confirmation modal (premium UI)
 * - Relative time presets ✅
 * - Countdown ✅
 * - Home service / In-shop ✅
 * - Sends scheduled_at as real ISO (UTC Z) ✅ (fixes timezone "past" issues)
 * - Handles TOKEN_EXPIRED ✅
 * - Better CORS / backend error messages ✅
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

  const presets = useMemo(
    () => [
      { label: "In 30 min", minutes: 30 },
      { label: "In 1 hour", minutes: 60 },
      { label: "In 2 hours", minutes: 120 },
      { label: "In 3 hours", minutes: 180 },
      { label: "In 4 hours", minutes: 240 },
    ],
    []
  );

  // Form state
  const [selectedMinutes, setSelectedMinutes] = useState(60);
  const [scheduledAtLocal, setScheduledAtLocal] = useState(""); // "YYYY-MM-DDTHH:mm" (local display)
  const [serviceMode, setServiceMode] = useState("home"); // "home" | "shop"
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  // UX state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Countdown
  const [countdown, setCountdown] = useState("00:00");

  // Helpers
  const pad = (n) => String(n).padStart(2, "0");

  const toDateTimeLocalString = (dateObj) => {
    const yyyy = dateObj.getFullYear();
    const mm = pad(dateObj.getMonth() + 1);
    const dd = pad(dateObj.getDate());
    const hh = pad(dateObj.getHours());
    const mi = pad(dateObj.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  };

  const fromDateTimeLocalToDate = (value) => {
    // "YYYY-MM-DDTHH:mm" -> Date(local)
    if (!value || !value.includes("T")) return null;
    const [d, t] = value.split("T");
    const [yyyy, mm, dd] = d.split("-").map(Number);
    const [hh, mi] = t.split(":").map(Number);
    return new Date(yyyy, mm - 1, dd, hh, mi, 0, 0);
  };

  const formatCountdown = (ms) => {
    if (ms <= 0) return "00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const computeLocalFromPreset = (minutes) => {
    const now = new Date();
    const bufferMs = 2 * 60 * 1000; // ✅ safety buffer
    const target = new Date(now.getTime() + minutes * 60 * 1000 + bufferMs);
    return toDateTimeLocalString(target);
  };

  // ✅ THIS is the important fix:
  // Convert local "YYYY-MM-DDTHH:mm" to ISO "....Z"
  const localToISOZ = (localValue) => {
    const d = fromDateTimeLocalToDate(localValue);
    if (!d) return "";
    return d.toISOString(); // ✅ includes Z (UTC)
  };

  const resetForm = () => {
    setError("");
    setSuccess("");
    setNotes("");
    setServiceMode("home");
    setAddress("");
    setSelectedMinutes(60);
    setScheduledAtLocal(computeLocalFromPreset(60));
  };

  const openModal = () => {
    resetForm();
    setOpen(true);
  };

  const onPickPreset = (minutes) => {
    setSelectedMinutes(minutes);
    setScheduledAtLocal(computeLocalFromPreset(minutes));
  };

  const onChangeMode = (mode) => {
    setServiceMode(mode);
    if (mode === "shop") setAddress(barberShopAddress);
    else setAddress("");
  };

  const validate = (finalAddress) => {
    if (!barberId || Number.isNaN(barberId)) return "Invalid barber.";
    if (!scheduledAtLocal) return "Pick a time.";
    if (!finalAddress || finalAddress.trim().length < 6) return "Enter a valid address.";
    return "";
  };

  // Countdown updater
  useEffect(() => {
    if (!open) return;

    const tick = () => {
      const d = fromDateTimeLocalToDate(scheduledAtLocal);
      if (!d) {
        setCountdown("00:00");
        return;
      }
      const diff = d.getTime() - Date.now();
      setCountdown(formatCountdown(diff));
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [open, scheduledAtLocal]);

  // Init default time
  useEffect(() => {
    setScheduledAtLocal(computeLocalFromPreset(60));
  }, []);

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

    const scheduled_at = localToISOZ(scheduledAtLocal);
    if (!scheduled_at) {
      setError("Invalid time value.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        barber_id: barberId,
        scheduled_at, // ✅ ISO with Z
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

      const msgLower = String(err?.message || "").toLowerCase();

      // If CORS blocks the response, the browser often throws "Failed to fetch"
      if (msgLower.includes("failed to fetch")) {
        setError(
          "CORS / backend connection issue (Failed to fetch).\n" +
            "Fix Flask CORS for your Codespaces domain (*.app.github.dev) and restart backend."
        );
        return;
      }

      setError(err?.message || "Error creating booking");
    } finally {
      setLoading(false);
    }
  };

  // Derived for debug (optional)
  const scheduledISO = useMemo(() => localToISOZ(scheduledAtLocal), [scheduledAtLocal]);

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
                  <div style={{ fontSize: 12, opacity: 0.75 }}>Time</div>

                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 900 }}>Confirm booking</div>
                      <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>
                        {presets.find((p) => p.minutes === selectedMinutes)?.label || "Selected time"}
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

                  <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {presets.map((p) => {
                      const active = p.minutes === selectedMinutes;
                      return (
                        <button
                          key={p.minutes}
                          type="button"
                          disabled={loading}
                          onClick={() => onPickPreset(p.minutes)}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 14,
                            border: "1px solid rgba(255,255,255,0.12)",
                            background: active ? "rgba(255,255,255,0.12)" : "transparent",
                            cursor: loading ? "not-allowed" : "pointer",
                            fontWeight: 800,
                            fontSize: 13,
                            color: "inherit",
                          }}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
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
                    {serviceMode === "shop"
                      ? `Shop address will be used: ${barberShopAddress}`
                      : "Enter your address for home service."}
                  </div>
                </div>

                {/* ADDRESS */}
                <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    Address {serviceMode === "shop" ? "(shop)" : "(home)"}
                  </div>
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
                    disabled={loading}
                    onClick={onConfirm}
                    style={{
                      padding: "12px 12px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(255,255,255,0.10)",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontWeight: 950,
                      color: "inherit",
                    }}
                  >
                    {loading ? "Booking..." : "Confirm"}
                  </button>
                </div>

                <div style={{ fontSize: 12, opacity: 0.65, marginTop: 8 }}>
                  Tip: the slot is blocked if it&apos;s already taken (409).
                </div>

                {/* Debug */}
                <div style={{ fontSize: 11, opacity: 0.35, marginTop: 8 }}>
                  scheduled_at (ISO): {scheduledISO || "-"}
                </div>
              </div>
            </div>
          )}
        </main>

        <BottomNav />
      </div>
    </div>
  );
}