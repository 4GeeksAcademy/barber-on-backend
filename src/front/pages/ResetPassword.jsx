import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { resetPassword } from "../../services/api"; // ajustá path

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function ResetPassword() {
  const q = useQuery();
  const navigate = useNavigate();

  const [token, setToken] = useState(q.get("token") || "");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (newPass.length < 6) return setMsg("Password must be at least 6 characters.");
    if (newPass !== confirm) return setMsg("Passwords do not match.");

    setLoading(true);
    try {
      const res = await resetPassword({ token, new_password: newPass });
      setMsg(res?.msg || "Password updated successfully.");
      setTimeout(() => navigate("/login"), 900);
    } catch (err) {
      setMsg(err?.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Reset password</h1>
        <p className="muted">Paste token + choose a new password.</p>

        <form onSubmit={onSubmit} className="auth-form">
          <label>Token</label>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="paste token"
            required
          />

          <label>New password</label>
          <input
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            type="password"
            required
          />

          <label>Confirm password</label>
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            type="password"
            required
          />

          <button disabled={loading} type="submit" className="btn-primary">
            {loading ? "Saving..." : "Update password"}
          </button>
        </form>

        {msg ? <div className="notice">{msg}</div> : null}

        <div style={{ marginTop: 14 }}>
          <Link to="/login">← Back to login</Link>
        </div>
      </div>
    </div>
  );
}