
import { useState } from "react";

const API_URL = (import.meta.env.VITE_API_URL || "")
                .trim()
                .replace(/\/+$/, "");

export default function Register() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!API_URL) {
      setError("API URL is not configured. Please check VITE_API_URL.");
      return;
    }

    setLoading(true);

    try {
      const response = await
       fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          typeof data.detail === "string"
            ? data.detail
            : Array.isArray(data.detail)
              ? data.detail.map((item) => item.msg).join(", ")
              : data.message || `Registration failed (${response.status}).`;

        throw new Error(message);
      }

      setSuccess(data.message || "Registration successful! You can now log in.");
      setForm({
        full_name: "",
        email: "",
        password: "",
      });
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Could not connect to the server. Check the backend URL, CORS settings, and Render deployment."
          : err.message || "Something went wrong during registration."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (!API_URL) {
      setError("API URL is not configured.");
      return;
    }

    window.location.href = `${API_URL}/auth/google/login`;
  };

  const handleGithubLogin = () => {
    if (!API_URL) {
      setError("API URL is not configured.");
      return;
    }

    window.location.href = `${API_URL}/auth/github/login`;
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Create Your BudgetBuddy Account</h2>
        <p>Register to start managing your budget and expenses.</p>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="success-message" role="status">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="full_name">Full Name</label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              placeholder="Enter your full name"
              value={form.full_name}
              onChange={handleChange}
              autoComplete="name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="register-email">Email</label>
            <input
              id="register-email"
              name="email"
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="register-password">Password</label>
            <input
              id="register-password"
              name="password"
              type="password"
              placeholder="Create a password"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Creating Account..." : "Register"}
          </button>
        </form>

        <div className="social-login">
          <button type="button" onClick={handleGoogleLogin}>
            Continue with Google
          </button>

          <button type="button" onClick={handleGithubLogin}>
            Continue with GitHub
          </button>
        </div>

        <p>
          Already have an account?{" "}
          <a href="/login">Log in</a>
        </p>
      </div>
    </div>
  );
}