import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const base = import.meta.env.VITE_BACKEND_URL;
      if (!base) throw new Error("Missing VITE_BACKEND_URL");

      const resp = await fetch(base + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        throw new Error(data?.msg || "Login failed");
      }

      localStorage.setItem("token", data.access_token);
      navigate("/home");
    } catch (err) {
      const msg = String(err?.message || "Failed to login");
      if (msg.toLowerCase().includes("failed to fetch")) {
        setError(
          "Failed to fetch. Check VITE_BACKEND_URL, backend port (3001), and that the backend port is Public."
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bo-app">
      <div className="bo-shell">
        <main className="bo-main" style={{ padding: 16 }}>
          <div
            style={{
              maxWidth: 520,
              margin: "0 auto",
              padding: 16,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, opacity: 0.75 }}>BarberOn</div>
              <h1 style={{ margin: "6px 0 0", fontSize: 34 }}>Login</h1>
              <div style={{ marginTop: 6, opacity: 0.8 }}>
                Sign in to book appointments and manage your account.
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Email</span>
                <input
                  className="bo-input"
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
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
                <span style={{ fontSize: 12, opacity: 0.8 }}>Password</span>
                <input
                  className="bo-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.06)",
                    color: "inherit",
                  }}
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 6,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.10)",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontWeight: 900,
                }}
              >
                {loading ? "Logging in..." : "Login"}
              </button>

              {/* ✅ FORGOT PASSWORD LINK */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -2 }}>
                <Link
                  to="/forgot-password"
                  style={{
                    fontSize: 12,
                    opacity: 0.8,
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  Forgot password?
                </Link>
              </div>

              {/* LIGHT REGISTER BUTTON */}
              <Link
                to="/register"
                style={{
                  marginTop: 4,
                  display: "inline-flex",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.28)",
                  background: "rgba(255,255,255,0.18)",
                  color: "inherit",
                  textDecoration: "none",
                  fontWeight: 900,
                }}
              >
                Create account
              </Link>

              {error && (
                <div
                  style={{
                    marginTop: 6,
                    padding: 10,
                    borderRadius: 12,
                    background: "rgba(255, 80, 80, 0.12)",
                    border: "1px solid rgba(255, 80, 80, 0.25)",
                    fontSize: 13,
                  }}
                >
                  {error}
                </div>
              )}
            </form>

            <div style={{ marginTop: 14, fontSize: 12, opacity: 0.65 }}>
              Tip: If you see “Failed to fetch”, check VITE_BACKEND_URL and that backend port 3001 is Public.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}