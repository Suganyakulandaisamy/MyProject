import { useState } from "react";
import { apiRequest, storeUser } from "../api";

export default function LoginPage() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await apiRequest("/login", {
        method: "POST",
        body: JSON.stringify(form)
      });
      storeUser(user);
      if (user.role === "Admin") {
        window.location.href = "/admin-dashboard";
      } else if (user.role === "Faculty") {
        window.location.href = "/faculty-dashboard";
      } else {
        window.location.href = "/student-dashboard";
      }
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-panel">
        <div>
          <p className="eyebrow">AAQAP</p>
          <h1>Sign in</h1>
          <p className="subtle">
            Track teaching quality, gather feedback, and generate institutional reports.
          </p>
        </div>
        <form className="card" onSubmit={handleSubmit}>
          <label>
            Username
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="Enter your username"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="primary" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
          <button
            className="ghost"
            type="button"
            onClick={() => (window.location.href = "/register")}
          >
            Create Account
          </button>
        </form>
      </div>
      <div className="login-art">
        <div className="orb" />
        <div className="grid" />
        <div className="quote">
          <p>Quality assurance starts with consistent teaching signals.</p>
          <span>AAQAP Insight</span>
        </div>
      </div>
    </div>
  );
}
