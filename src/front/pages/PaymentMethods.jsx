import { useEffect, useState } from "react";
import {
  addPaymentMethod,
  deletePaymentMethod,
  getPaymentMethods,
  setDefaultPaymentMethod,
} from "../../services/api";

const BRANDS = ["Visa", "Mastercard", "Amex", "Discover"];

export default function PaymentMethods() {
  const token = localStorage.getItem("token");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [brand, setBrand] = useState("Visa");
  const [last4, setLast4] = useState("");
  const [expMonth, setExpMonth] = useState("12");
  const [expYear, setExpYear] = useState(String(new Date().getFullYear() + 1));

  async function refresh() {
    setLoading(true);
    setMsg("");
    try {
      const data = await getPaymentMethods(token);
      setItems(data?.results || []);
    } catch (e) {
      setMsg(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line
  }, []);

  async function onAdd(e) {
    e.preventDefault();
    setMsg("");

    try {
      await addPaymentMethod(
        {
          brand,
          last4,
          exp_month: Number(expMonth),
          exp_year: Number(expYear),
          is_default: items.length === 0,
        },
        token
      );

      setLast4("");
      await refresh();
    } catch (e) {
      setMsg(e?.message || "Failed to add");
    }
  }

  async function onMakeDefault(id) {
    setMsg("");
    try {
      const res = await setDefaultPaymentMethod(id, token);
      setItems(res?.results || []);
    } catch (e) {
      setMsg(e?.message || "Failed");
    }
  }

  async function onDelete(id) {
    setMsg("");
    try {
      const res = await deletePaymentMethod(id, token);
      setItems(res?.results || []);
    } catch (e) {
      setMsg(e?.message || "Failed");
    }
  }

  return (
    <div className="bo-page">
      <section className="bo-panel">
        <div className="bo-panelTitle">Payment methods</div>

        <div className="bo-panelBody" style={{ display: "grid", gap: 12 }}>
          {/* Add card */}
          <div
            style={{
              padding: 12,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
              Add card (demo)
            </div>

            {/* BRAND CHIPS (NO SELECT) */}
            <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Brand</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {BRANDS.map((b) => {
                  const active = b === brand;
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBrand(b)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 999,
                        border: `1px solid ${
                          active ? "rgba(255,255,255,0.26)" : "rgba(255,255,255,0.12)"
                        }`,
                        background: active
                          ? "rgba(255,255,255,0.14)"
                          : "rgba(255,255,255,0.06)",
                        color: "inherit",
                        cursor: "pointer",
                        fontWeight: 900,
                        fontSize: 13,
                      }}
                    >
                      {b}
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={onAdd} style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Last 4 digits</span>
                <input
                  value={last4}
                  onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="4242"
                  required
                  className="bo-input"
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.06)",
                    color: "inherit",
                  }}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, opacity: 0.8 }}>Exp month</span>
                  <input
                    value={expMonth}
                    onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    placeholder="12"
                    required
                    className="bo-input"
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.06)",
                      color: "inherit",
                    }}
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, opacity: 0.8 }}>Exp year</span>
                  <input
                    value={expYear}
                    onChange={(e) => setExpYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="2027"
                    required
                    className="bo-input"
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.06)",
                      color: "inherit",
                    }}
                  />
                </label>
              </div>

              <button
                type="submit"
                style={{
                  marginTop: 4,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.10)",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                Add payment method
              </button>
            </form>

            {msg ? (
              <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>{msg}</div>
            ) : null}
          </div>

          {/* Saved methods */}
          <div
            style={{
              padding: 12,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
              Saved methods
            </div>

            {loading ? (
              <div style={{ opacity: 0.7 }}>Loading…</div>
            ) : items.length === 0 ? (
              <div style={{ opacity: 0.7 }}>No payment methods yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {items.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(0,0,0,0.18)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 900 }}>
                        {m.brand} •••• {m.last4} {m.is_default ? "✓ Default" : ""}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        Expires {String(m.exp_month).padStart(2, "0")}/{m.exp_year}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      {!m.is_default && (
                        <button
                          onClick={() => onMakeDefault(m.id)}
                          type="button"
                          style={{
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.14)",
                            background: "rgba(255,255,255,0.10)",
                            cursor: "pointer",
                            fontWeight: 800,
                          }}
                        >
                          Set default
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(m.id)}
                        type="button"
                        style={{
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: "1px solid rgba(255,80,80,0.30)",
                          background: "rgba(255,80,80,0.12)",
                          cursor: "pointer",
                          fontWeight: 800,
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ fontSize: 12, opacity: 0.6 }}>
            Demo only: no real card data is stored.
          </div>
        </div>
      </section>
    </div>
  );
}