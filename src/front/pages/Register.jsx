import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "client",
  });

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const resp = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.msg || "Registration failed");
      }

      // Guardamos token
      localStorage.setItem("token", data.access_token);

      // Redirigir al home
      navigate("/home");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bo-auth">
      <h1>Create Account</h1>

      <form onSubmit={handleSubmit} className="bo-auth-form">
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
        />

        <select name="role" value={form.role} onChange={handleChange}>
          <option value="client">Client</option>
          <option value="barber">Barber</option>
        </select>

        <button
          type="submit"
          className="bo-btn-light"
          disabled={loading}
        >
          {loading ? "Creating..." : "Create Account"}
        </button>

        {error && <div className="bo-error">{error}</div>}
      </form>
    </div>
  );
}