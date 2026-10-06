import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// Read the API URL from Vercel environment variables.
// Removes any trailing "/" so we never create "//auth/login".
const API_URL = (import.meta.env.VITE_API_URL || "")
  .trim()
  .replace(/\/+$/, "");

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    // Make sure the API URL exists.
    if (!API_URL) {
      setError(
        "API URL is not configured. Please check VITE_API_URL in Vercel."
      );
      return;
    }

    setLoading(true);

    try {
      // FastAPI OAuth2PasswordRequestForm expects
      // application/x-www-form-urlencoded data.
      const body = new URLSearchParams();

      body.append("username", email);
      body.append("password", password);

      // Login API request
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",

        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },

        body: body.toString(),
      });

      // Try to read JSON response
      const data = await response.json().catch(() => ({}));

      // Handle failed response
      if (!response.ok) {
        const message =
          typeof data.detail === "string"
            ? data.detail
            : Array.isArray(data.detail)
            ? data.detail.map((item) => item.msg).join(", ")
            : data.message || `Login failed (${response.status}).`;

        throw new Error(message);
      }

      // FastAPI normally returns access_token.
      // token is included as a fallback in case your backend uses that name.
      const token = data.access_token || data.token;

      if (!token) {
        throw new Error(
          "The server responded successfully but did not return an access token."
        );
      }

      // Save token.
      // App.jsx / RequireAuth checks for token.
      localStorage.setItem("token", token);

      // Also keep access_token for compatibility with any existing code.
      localStorage.setItem("access_token", token);

      // Save user information if the backend returns it.
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      // Login successful.
      // /dashboard is a valid protected route in App.jsx.
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Login error:", err);

      if (err.message === "Failed to fetch") {
        setError(
          "Cannot connect to the backend. Please check the API URL, CORS settings, and Render deployment."
        );
      } else {
        setError(
          err.message || "Something went wrong during login."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Google / GitHub login
  const handleSocialLogin = (provider) => {
    if (!API_URL) {
      setError(
        "API URL is not configured. Please check VITE_API_URL in Vercel."
      );
      return;
    }

    window.location.assign(`${API_URL}/auth/${provider}/login`);
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
          {/* Email */}
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

          {/* Password */}
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

          {/* Login button */}
          <button type="submit" disabled={loading}>
            {loading ? "Logging In..." : "Login"}
          </button>
        </form>

        {/* Social login */}
        <div className="social-login">
          <button
            type="button"
            onClick={() => handleSocialLogin("google")}
          >
            Continue with Google
          </button>

          <button
            type="button"
            onClick={() => handleSocialLogin("github")}
          >
            Continue with GitHub
          </button>
        </div>

        {/* Register */}
        <p>
          Don't have an account?{" "}
          <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}