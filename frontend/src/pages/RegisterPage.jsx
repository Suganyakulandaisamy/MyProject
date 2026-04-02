import { useState } from "react";
import { apiRequest } from "../api";

export default function RegisterPage() {
  const [form, setForm] = useState({ username: "", password: "", role: "Student" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await apiRequest("/register", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setSuccess("Account created. Redirecting to login...");
      setTimeout(() => {
        window.location.href = "/";
      }, 1200);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-shell">
      <form className="card" onSubmit={handleSubmit}>
        <div className="form-header">
          <h2>Create Account</h2>
          <p className="subtle">Register to access the AAQAP portal.</p>
        </div>
        <label>
          Username
          <input name="username" value={form.username} onChange={handleChange} required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Role
          <select name="role" value={form.role} onChange={handleChange} required>
            <option value="Admin">Admin</option>
            <option value="Faculty">Faculty</option>
            <option value="Student">Student</option>
          </select>
        </label>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
        <div className="actions">
          <button className="primary" type="submit" disabled={loading}>
            {loading ? "Creating..." : "Register"}
          </button>
          <button className="ghost" type="button" onClick={() => (window.location.href = "/")}
          >
            Back to Login
          </button>
        </div>
      </form>
    </div>
  );
}
