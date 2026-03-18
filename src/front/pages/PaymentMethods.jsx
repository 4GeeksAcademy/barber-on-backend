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
    <div className="bo-page bo-paymentPage">
      <section className="bo-panel bo-paymentOuter">
        <div className="bo-panelTitle">Payment methods</div>

        <div className="bo-paymentCenter">
          <div className="bo-paymentCard">
            <div className="bo-paymentSectionTitle">Add card (demo)</div>

            <div className="bo-paymentField">
              <div className="bo-paymentLabel">Brand</div>
              <div className="bo-paymentBrands">
                {BRANDS.map((b) => {
                  const active = b === brand;
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBrand(b)}
                      className={`bo-paymentBrand ${active ? "is-active" : ""}`}
                    >
                      {b}
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={onAdd} className="bo-paymentForm">
              <label className="bo-paymentField">
                <span className="bo-paymentLabel">Last 4 digits</span>
                <input
                  value={last4}
                  onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="4242"
                  required
                  className="bo-paymentInput"
                />
              </label>

              <div className="bo-paymentGrid">
                <label className="bo-paymentField">
                  <span className="bo-paymentLabel">Exp month</span>
                  <input
                    value={expMonth}
                    onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    placeholder="12"
                    required
                    className="bo-paymentInput"
                  />
                </label>

                <label className="bo-paymentField">
                  <span className="bo-paymentLabel">Exp year</span>
                  <input
                    value={expYear}
                    onChange={(e) => setExpYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="2027"
                    required
                    className="bo-paymentInput"
                  />
                </label>
              </div>

              <button type="submit" className="bo-paymentSubmit">
                Add payment method
              </button>
            </form>

            {msg ? <div className="bo-paymentMsg">{msg}</div> : null}

            <div className="bo-paymentSaved">
              <div className="bo-paymentSectionTitle">Saved methods</div>

              {loading ? (
                <div className="bo-paymentEmpty">Loading…</div>
              ) : items.length === 0 ? (
                <div className="bo-paymentEmpty">No payment methods yet.</div>
              ) : (
                <div className="bo-paymentSavedList">
                  {items.map((m) => (
                    <div key={m.id} className="bo-paymentSavedItem">
                      <div className="bo-paymentSavedInfo">
                        <div className="bo-paymentSavedName">
                          {m.brand} •••• {m.last4}{" "}
                          {m.is_default ? (
                            <span className="bo-paymentDefault">✓ Default</span>
                          ) : null}
                        </div>
                        <div className="bo-paymentSavedSub">
                          Expires {String(m.exp_month).padStart(2, "0")}/{m.exp_year}
                        </div>
                      </div>

                      <div className="bo-paymentSavedActions">
                        {!m.is_default && (
                          <button
                            onClick={() => onMakeDefault(m.id)}
                            type="button"
                            className="bo-paymentBtn"
                          >
                            Set default
                          </button>
                        )}

                        <button
                          onClick={() => onDelete(m.id)}
                          type="button"
                          className="bo-paymentBtn bo-paymentBtnDanger"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bo-paymentHint">
              Demo only: no real card data is stored.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}