
import { useState } from "react";

const API_URL = (import.meta.env.VITE_API_URL || "")
                .trim()
                .replace(/\/+$/, "");

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!API_URL) {
      setError("API URL is not configured. Please check VITE_API_URL.");
      return;
    }

    setLoading(true);

    try {
      const body = new URLSearchParams();
      body.append("username", email);
      body.append("password", password);

      const response = await 
      fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: body.toString(),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          typeof data.detail === "string"
            ? data.detail
            : Array.isArray(data.detail)
              ? data.detail.map((item) => item.msg).join(", ")
              : data.message || `Login failed (${response.status}).`;

        throw new Error(message);
      }

      // Support common FastAPI token response formats.
      const token = data.access_token || data.token;

      if (token) {
        localStorage.setItem("access_token", token);
      }

      // Save user information only if the backend returns it.
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      // If your backend returns a different response format,
      // adjust this section to match it.
      window.location.href = "/dashboard";
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Could not connect to the server. Check the backend URL, CORS settings, and Render deployment."
          : err.message || "Something went wrong during login."
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
        <h2>Welcome Back to BudgetBuddy</h2>
        <p>Log in to manage your budget and expenses.</p>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Logging In..." : "Login"}
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
          Don't have an account?{" "}
          <a href="/register">Register</a>
        </p>
      </div>
    </div>
  );
}