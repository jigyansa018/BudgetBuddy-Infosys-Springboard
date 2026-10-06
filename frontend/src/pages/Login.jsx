import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// Read API URL from Vercel environment variables.
// Remove trailing "/" so we never create //auth/login.
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

      const response = await fetch(`${API_URL}/auth/login`, {
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

      const token = data.access_token || data.token;

      if (!token) {
        throw new Error(
          "The server responded successfully but did not return an access token."
        );
      }

      // Save authentication token.
      localStorage.setItem("token", token);
      localStorage.setItem("access_token", token);

      // Save user information if returned by backend.
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      // Login successful.
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
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        .auth-container {
          min-height: 100vh;
          width: 100%;
          display: flex;
          background: #f7f8f2;
          font-family: Arial, Helvetica, sans-serif;
        }

        .auth-left {
          width: 44%;
          min-height: 100vh;
          background: #073f2f;
          color: white;
          padding: 48px 52px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
        }

        .brand {
          font-size: 24px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.5px;
        }

        .brand span {
          color: #c7f31a;
        }

        .auth-left-content {
          max-width: 520px;
          margin-top: auto;
          margin-bottom: 80px;
        }

        .auth-left-content h1 {
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(42px, 4.5vw, 68px);
          line-height: 1.05;
          margin: 0 0 24px;
          color: #ffffff;
          letter-spacing: -2px;
        }

        .auth-left-content p {
          color: #d4e7c2;
          font-size: 17px;
          line-height: 1.7;
          max-width: 470px;
          margin: 0;
        }

        .chart {
          position: absolute;
          left: 52px;
          right: 52px;
          bottom: 55px;
          height: 100px;
          opacity: 0.9;
        }

        .chart-line {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 1px;
          background: rgba(199, 243, 26, 0.2);
          box-shadow:
            0 -25px 0 rgba(199, 243, 26, 0.18),
            0 -50px 0 rgba(199, 243, 26, 0.18);
        }

        .chart svg {
          width: 100%;
          height: 100%;
        }

        .auth-right {
          flex: 1;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 30px;
        }

        .auth-card {
          width: 100%;
          max-width: 480px;
        }

        .auth-card h2 {
          margin: 0 0 10px;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 38px;
          line-height: 1.2;
          color: #102f26;
          letter-spacing: -1px;
        }

        .auth-subtitle {
          margin: 0 0 38px;
          color: #5c776b;
          font-size: 16px;
          line-height: 1.5;
        }

        .error-message {
          background: #fff0ee;
          color: #c0392b;
          border: 1px solid #f2c3bd;
          border-radius: 8px;
          padding: 12px 14px;
          margin-bottom: 20px;
          font-size: 14px;
          line-height: 1.4;
        }

        .success-message {
          background: #effbe8;
          color: #28733b;
          border: 1px solid #bfe2b6;
          border-radius: 8px;
          padding: 12px 14px;
          margin-bottom: 20px;
          font-size: 14px;
          line-height: 1.4;
        }

        .form-group {
          margin-bottom: 24px;
        }

        .form-group label {
          display: block;
          margin-bottom: 9px;
          color: #416458;
          font-size: 14px;
          font-weight: 500;
        }

        .form-group input {
          width: 100%;
          height: 52px;
          border: none;
          border-bottom: 1px solid #c8d6b7;
          background: #f0f4fa;
          padding: 0 14px;
          font-size: 16px;
          color: #19382f;
          outline: none;
          transition: border-color 0.2s ease,
                      box-shadow 0.2s ease,
                      background 0.2s ease;
        }

        .form-group input:focus {
          border-bottom: 2px solid #b9ed19;
          background: #ffffff;
          box-shadow: 0 2px 0 rgba(185, 237, 25, 0.08);
        }

        .form-group input::placeholder {
          color: #8c9c96;
        }

        .forgot-password {
          display: flex;
          justify-content: flex-end;
          margin-top: -10px;
          margin-bottom: 28px;
        }

        .forgot-password a {
          color: #416f5d;
          font-size: 14px;
          text-decoration: none;
        }

        .forgot-password a:hover {
          text-decoration: underline;
        }

        .primary-button {
          width: 100%;
          height: 56px;
          border: none;
          border-radius: 9px;
          background: #c5f51c;
          color: #102f26;
          font-size: 17px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.15s ease,
                      box-shadow 0.15s ease,
                      background 0.15s ease;
        }

        .primary-button:hover:not(:disabled) {
          background: #b9ed12;
          transform: translateY(-1px);
          box-shadow: 0 7px 18px rgba(68, 95, 23, 0.15);
        }

        .primary-button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .or-divider {
          display: flex;
          align-items: center;
          gap: 14px;
          margin: 30px 0 20px;
          color: #8a9993;
          font-size: 13px;
        }

        .or-divider::before,
        .or-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: #d8dfd5;
        }

        .social-login {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .social-button {
          width: 100%;
          height: 54px;
          border: 1px solid #cddbc7;
          border-radius: 9px;
          background: #ffffff;
          color: #19382f;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease,
                      border-color 0.2s ease,
                      transform 0.15s ease;
        }

        .social-button:hover {
          background: #f7faf5;
          border-color: #a9c39f;
          transform: translateY(-1px);
        }

        .auth-footer {
          text-align: center;
          margin-top: 26px;
          color: #687d74;
          font-size: 14px;
        }

        .auth-footer a {
          color: #3f755f;
          font-weight: 600;
          text-decoration: none;
        }

        .auth-footer a:hover {
          text-decoration: underline;
        }

        @media (max-width: 850px) {
          .auth-left {
            display: none;
          }

          .auth-right {
            min-height: 100vh;
            padding: 30px 22px;
          }

          .auth-card {
            max-width: 500px;
          }

          .auth-card h2 {
            font-size: 34px;
          }
        }

        @media (max-width: 480px) {
          .auth-right {
            padding: 28px 18px;
          }

          .auth-card h2 {
            font-size: 30px;
          }

          .auth-subtitle {
            margin-bottom: 30px;
          }
        }
      `}</style>

      <div className="auth-container">
        {/* Left branding panel */}
        <div className="auth-left">
          <div className="brand">
            <span>₿</span> BudgetBuddy
          </div>

          <div className="auth-left-content">
            <h1>
              Every rupee, ruled
              <br />
              and recorded.
            </h1>

            <p>
              The pocket-money ledger built for students —
              track spending, hit savings goals, and see exactly
              where it all went.
            </p>
          </div>

          <div className="chart">
            <div className="chart-line"></div>

            <svg
              viewBox="0 0 500 110"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <polyline
                points="0,95 55,78 115,87 175,48 235,54 300,25 360,37 425,5"
                fill="none"
                stroke="#c5f51c"
                strokeWidth="3"
              />

              <circle cx="0" cy="95" r="4" fill="#c5f51c" />
              <circle cx="55" cy="78" r="4" fill="#c5f51c" />
              <circle cx="115" cy="87" r="4" fill="#c5f51c" />
              <circle cx="175" cy="48" r="4" fill="#c5f51c" />
              <circle cx="235" cy="54" r="4" fill="#c5f51c" />
              <circle cx="300" cy="25" r="4" fill="#c5f51c" />
              <circle cx="360" cy="37" r="4" fill="#c5f51c" />
              <circle cx="425" cy="5" r="4" fill="#c5f51c" />
            </svg>
          </div>
        </div>

        {/* Login section */}
        <div className="auth-right">
          <div className="auth-card">
            <h2>Welcome back</h2>

            <p className="auth-subtitle">
              Sign in to open your ledger.
            </p>

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

              <div className="forgot-password">
                <Link to="/forgot-password">
                  Forgot Password?
                </Link>
              </div>

              <button
                className="primary-button"
                type="submit"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="or-divider">OR</div>

            <div className="social-login">
              <button
                className="social-button"
                type="button"
                onClick={() => handleSocialLogin("google")}
              >
                Continue with Google
              </button>

              <button
                className="social-button"
                type="button"
                onClick={() => handleSocialLogin("github")}
              >
                Continue with GitHub
              </button>
            </div>

            <p className="auth-footer">
              New here?{" "}
              <Link to="/register">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}