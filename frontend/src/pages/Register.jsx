import { useState } from "react";
import { Link } from "react-router-dom";

// Read API URL from Vercel environment variables.
// Remove trailing "/" so we never create //auth/register.
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
      setError(
        "API URL is not configured. Please check VITE_API_URL."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
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
            : data.message ||
              `Registration failed (${response.status}).`;

        throw new Error(message);
      }

      setSuccess(
        data.message ||
          "Registration successful! You can now log in."
      );

      setForm({
        full_name: "",
        email: "",
        password: "",
      });
    } catch (err) {
      console.error("Registration error:", err);

      setError(
        err.message === "Failed to fetch"
          ? "Could not connect to the server. Check the backend URL, CORS settings, and Render deployment."
          : err.message ||
              "Something went wrong during registration."
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

        {/* Registration section */}
        <div className="auth-right">
          <div className="auth-card">
            <h2>Create your account</h2>

            <p className="auth-subtitle">
              Register to start managing your budget and expenses.
            </p>

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

              <button
                className="primary-button"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Creating Account..."
                  : "Create Account"}
              </button>
            </form>

            <div className="or-divider">OR</div>

            <div className="social-login">
              <button
                className="social-button"
                type="button"
                onClick={handleGoogleLogin}
              >
                Continue with Google
              </button>

              <button
                className="social-button"
                type="button"
                onClick={handleGithubLogin}
              >
                Continue with GitHub
              </button>
            </div>

            <p className="auth-footer">
              Already have an account?{" "}
              <Link to="/login">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}