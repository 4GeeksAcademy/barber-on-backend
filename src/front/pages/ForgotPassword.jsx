import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../../services/api"; // ajustá si tu path es diferente

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [demoToken, setDemoToken] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    setDemoToken("");

    try {
      const res = await forgotPassword(email);
      setMsg(res?.msg || "If that email exists, a reset token has been generated.");
      if (res?.demo_reset_token) setDemoToken(res.demo_reset_token);
    } catch (err) {
      setMsg(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Forgot password</h1>
        <p className="muted">Enter your email to generate a reset token (demo).</p>

        <form onSubmit={onSubmit} className="auth-form">
          <label>Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            type="email"
            required
          />

          <button disabled={loading} type="submit" className="btn-primary">
            {loading ? "Generating..." : "Generate token"}
          </button>
        </form>

        {msg ? <div className="notice">{msg}</div> : null}

        {demoToken ? (
          <div className="notice">
            <div className="muted" style={{ marginBottom: 8 }}>Demo reset token:</div>
            <code style={{ wordBreak: "break-all" }}>{demoToken}</code>
            <div style={{ marginTop: 12 }}>
              <Link to={`/reset-password?token=${encodeURIComponent(demoToken)}`}>
                Go to reset password →
              </Link>
            </div>
          </div>
        ) : null}

        <div style={{ marginTop: 14 }}>
          <Link to="/login">← Back to login</Link>
        </div>
      </div>
    </div>
  );
}