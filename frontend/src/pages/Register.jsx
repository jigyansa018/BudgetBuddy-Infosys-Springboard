import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "./Logo";

import googleIcon from "../assets/google.png";
import githubIcon from "../assets/github.png";

const API_URL = "http://127.0.0.1:8000";

function Register() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // =========================================================
  // GOOGLE OAUTH
  // =========================================================

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/google/login`;
  };

  // =========================================================
  // GITHUB OAUTH
  // =========================================================

  const handleGithubLogin = () => {
    window.location.href = `${API_URL}/auth/github/login`;
  };

  // =========================================================
  // REGISTER
  // =========================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setSuccess(false);

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.detail || "Registration failed");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setMessage("Account created. Taking you to sign in…");

      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (error) {
      console.error(error);
      setMessage("Cannot connect to backend");
      setLoading(false);
    }
  };

  return (
    <div className="bb-page">
      <style>{css}</style>

      {/* =====================================================
          LEFT BRAND PANEL
      ====================================================== */}

      <div className="bb-brand-panel bb-anim bb-fade-left">

        <Logo size={32} tone="light" />

        <div className="bb-brand-content">
          <div className="bb-brand-copy">

            <h1 className="bb-headline">
              Open your first
              <br />
              ledger entry.
            </h1>

            <p className="bb-subcopy">
              One account to track pocket money, cut down on guesswork,
              and build a habit that actually sticks.
            </p>

          </div>
        </div>

        <GoalMark />

      </div>

      {/* =====================================================
          RIGHT FORM PANEL
      ====================================================== */}

      <div className="bb-form-panel">

        <form
          onSubmit={handleSubmit}
          className="bb-form bb-anim bb-fade-up"
        >

          {/* Mobile Logo */}

          <div className="bb-logo-mobile">
            <Logo size={28} tone="dark" />
          </div>

          <h2 className="bb-welcome">
            Create your account
          </h2>

          <p className="bb-tagline">
            Takes less than a minute.
          </p>


          {/* =================================================
              FORM FIELDS
          ================================================== */}

          <div className="bb-fields">

            <Field
              id="full_name"
              label="Full name"
              type="text"
              value={form.full_name}
              onChange={(value) =>
                setForm({
                  ...form,
                  full_name: value,
                })
              }
              autoComplete="name"
            />

            <Field
              id="email"
              label="Email"
              type="email"
              value={form.email}
              onChange={(value) =>
                setForm({
                  ...form,
                  email: value,
                })
              }
              autoComplete="email"
            />

            <Field
              id="password"
              label="Password"
              type="password"
              value={form.password}
              onChange={(value) =>
                setForm({
                  ...form,
                  password: value,
                })
              }
              autoComplete="new-password"
            />

          </div>


          {/* =================================================
              MESSAGE
          ================================================== */}

          {message && (
            <p
              className={success ? "bb-success" : "bb-error"}
              role="alert"
            >
              {message}
            </p>
          )}


          {/* =================================================
              CREATE ACCOUNT
          ================================================== */}

          <button
            type="submit"
            disabled={loading}
            className="bb-btn-primary"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>


          {/* =================================================
              OR
          ================================================== */}

          <div className="bb-divider">

            <span></span>

            <span className="bb-divider-text">
              OR
            </span>

            <span></span>

          </div>


          {/* =================================================
              GOOGLE
          ================================================== */}

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="bb-oauth-btn"
          >

            <img
              src={googleIcon}
              alt="Google"
              className="bb-oauth-icon"
            />

            <span>
              Continue with Google
            </span>

          </button>


          {/* =================================================
              GITHUB
          ================================================== */}

          <button
            type="button"
            onClick={handleGithubLogin}
            className="bb-oauth-btn"
          >

            <img
              src={githubIcon}
              alt="GitHub"
              className="bb-oauth-icon"
            />

            <span>
              Continue with GitHub
            </span>

          </button>


          {/* =================================================
              LOGIN
          ================================================== */}

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="bb-btn-link"
          >
            Already have an account? Sign in
          </button>

        </form>

      </div>

    </div>
  );
}


/* =========================================================
   FIELD
========================================================= */

function Field({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
}) {
  return (
    <div className="bb-field">

      <label
        htmlFor={id}
        className="bb-label"
      >
        {label}
      </label>

      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        required
        placeholder={label}
        className="bb-input"
      />

    </div>
  );
}


/* =========================================================
   LEFT SIDE GRAPHIC
========================================================= */

function GoalMark() {

  const bars = [
    { x: 20, h: 34 },
    { x: 70, h: 48 },
    { x: 120, h: 42 },
    { x: 170, h: 62 },
    { x: 220, h: 76 },
    { x: 270, h: 84 },
  ];

  const lineLength = 320;

  return (
    <svg
      viewBox="0 0 320 120"
      className="bb-mark"
      aria-hidden="true"
    >

      <line
        x1="0"
        y1="18"
        x2="320"
        y2="18"
        stroke="#C6F135"
        strokeDasharray="4 6"
        strokeWidth="1.5"
        className="bb-draw-line"
        style={{
          strokeDasharray: lineLength,
          strokeDashoffset: lineLength,
        }}
      />

      {bars.map((bar, i) => (
        <rect
          key={bar.x}
          x={bar.x}
          y={110 - bar.h}
          width="20"
          height={bar.h}
          rx="2"
          fill={
            i === bars.length - 1
              ? "#C6F135"
              : "#EFFFCF"
          }
          fillOpacity={
            i === bars.length - 1
              ? 1
              : 0.18
          }
          className="bb-bar"
          style={{
            transformOrigin: `${bar.x + 10}px 110px`,
            animationDelay: `${0.8 + i * 0.08}s`,
          }}
        />
      ))}

    </svg>
  );
}


/* =========================================================
   CSS
========================================================= */

const css = `

/* =========================================================
   PAGE
========================================================= */

.bb-page {
  width: 100%;
  height: 100vh;
  min-height: 100vh;

  display: grid;
  grid-template-columns: 1fr;

  background-color: #F6F8F2;
  color: #0E241B;

  font-family: 'Inter', system-ui, sans-serif;

  overflow: hidden;
}


/* =========================================================
   DESKTOP
========================================================= */

@media (min-width: 1024px) {

  .bb-page {
    grid-template-columns: 1fr 1fr;
  }

}


/* =========================================================
   LEFT PANEL
========================================================= */

.bb-brand-panel {
  display: none;

  flex-direction: column;
  justify-content: space-between;

  height: 100vh;

  overflow: hidden;

  background-color: #0F3D2E;

  color: #F6F8F2;

  padding: 24px 40px 20px;
}


@media (min-width: 1024px) {

  .bb-brand-panel {
    display: flex;
  }

}


/* =========================================================
   LEFT CONTENT
========================================================= */

.bb-brand-content {
  display: flex;
  align-items: center;

  flex: 1;
}


.bb-brand-copy {
  max-width: 420px;
}


.bb-headline {
  font-family: 'Fraunces', serif;

  font-size: 42px;

  font-weight: 600;

  line-height: 1.12;

  margin: 0;
}


.bb-subcopy {
  max-width: 410px;

  margin-top: 17px;

  color: #CFE6B8;

  font-size: 15px;

  line-height: 1.6;
}


/* =========================================================
   GRAPHIC
========================================================= */

.bb-mark {
  width: 330px;

  height: 78px;

  opacity: 0.95;

  overflow: visible;
}


/* =========================================================
   MOBILE LOGO
========================================================= */

.bb-logo-mobile {
  display: block;

  margin-bottom: 4px;
}


@media (min-width: 1024px) {

  .bb-logo-mobile {
    display: none;
  }

}


/* =========================================================
   RIGHT PANEL
========================================================= */

.bb-form-panel {

  height: 100vh;

  display: flex;

  align-items: center;

  justify-content: center;

  padding: 22px 30px;

  overflow: hidden;
}


/* =========================================================
   FORM
========================================================= */

.bb-form {

  width: 100%;

  max-width: 430px;

  max-height: 100%;

  display: flex;

  flex-direction: column;
}


/* =========================================================
   HEADING
========================================================= */

.bb-welcome {

  font-family: 'Fraunces', serif;

  font-size: 34px;

  font-weight: 600;

  line-height: 1.15;

  margin: 0 0 5px;
}


.bb-tagline {

  color: #4B6B52;

  font-size: 14px;

  margin: 0;
}


/* =========================================================
   FIELDS
========================================================= */

.bb-fields {

  display: flex;

  flex-direction: column;

  gap: 14px;

  margin-top: 24px;
}


.bb-field {
  width: 100%;
}


.bb-label {

  display: block;

  font-family: 'IBM Plex Mono', monospace;

  font-size: 12px;

  color: #4B6B52;

  margin-bottom: 3px;
}


.bb-input {

  box-sizing: border-box;

  width: 100%;

  border: none;

  border-bottom: 1px solid #BFE18A;

  background: transparent;

  padding: 7px 0;

  font-size: 15px;

  color: #0E241B;

  outline: none;

  transition: border-color 0.2s ease;
}


.bb-input::placeholder {

  color: #89968F;

  opacity: 1;
}


.bb-input:focus {

  border-bottom-color: #0F3D2E;

}


/* =========================================================
   ERROR
========================================================= */

.bb-error {

  margin: 10px 0 0;

  font-family: 'IBM Plex Mono', monospace;

  font-size: 12px;

  color: #B3261E;
}


.bb-success {

  margin: 10px 0 0;

  font-family: 'IBM Plex Mono', monospace;

  font-size: 12px;

  color: #0F3D2E;
}


/* =========================================================
   CREATE ACCOUNT
========================================================= */

.bb-btn-primary {

  display: block;

  width: 100%;

  margin-top: 18px;

  padding: 11px 0;

  border-radius: 7px;

  border: none;

  background-color: #C6F135;

  color: #0F3D2E;

  font-weight: 700;

  font-size: 15px;

  cursor: pointer;

  transition:
    background-color 0.2s ease,
    transform 0.15s ease;
}


.bb-btn-primary:hover {

  background-color: #B3DA25;

  transform: translateY(-1px);
}


.bb-btn-primary:disabled {

  opacity: 0.6;

  cursor: not-allowed;

  transform: none;
}


/* =========================================================
   DIVIDER
========================================================= */

.bb-divider {

  display: flex;

  align-items: center;

  width: 100%;

  gap: 12px;

  margin: 17px 0 13px;
}


.bb-divider span:first-child,
.bb-divider span:last-child {

  flex: 1;

  height: 1px;

  background-color: #D5DEC9;
}


.bb-divider-text {

  color: #7A827D;

  font-size: 11px;

  font-family: 'IBM Plex Mono', monospace;
}


/* =========================================================
   GOOGLE / GITHUB
========================================================= */

.bb-oauth-btn {

  box-sizing: border-box;

  width: 100%;

  height: 47px;

  display: flex;

  align-items: center;

  justify-content: center;

  gap: 11px;

  margin-bottom: 9px;

  padding: 0 16px;

  border: 1px solid #C8D8BE;

  border-radius: 8px;

  background-color: #FFFFFF;

  color: #173B2E;

  font-size: 14px;

  font-weight: 600;

  cursor: pointer;

  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    transform 0.15s ease;
}


.bb-oauth-btn:hover {

  background-color: #FAFCF8;

  border-color: #9FBC8E;

  transform: translateY(-1px);
}


.bb-oauth-btn:active {

  transform: translateY(0);
}


/* =========================================================
   ICON
========================================================= */

.bb-oauth-icon {

  width: 21px;

  height: 21px;

  object-fit: contain;

  display: block;
}


/* =========================================================
   LOGIN LINK
========================================================= */

.bb-btn-link {

  display: block;

  width: 100%;

  margin-top: 5px;

  background: none;

  border: none;

  color: #17543E;

  font-size: 13px;

  text-decoration: underline;

  text-decoration-color: #BFE18A;

  text-underline-offset: 3px;

  cursor: pointer;

  transition: color 0.2s ease;
}


.bb-btn-link:hover {

  color: #0F3D2E;

}


/* =========================================================
   ANIMATIONS
========================================================= */

@keyframes bbFadeUp {

  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }

}


@keyframes bbFadeLeft {

  from {
    opacity: 0;
    transform: translateX(-12px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }

}


@keyframes bbDrawLine {

  to {
    stroke-dashoffset: 0;
  }

}


@keyframes bbBarGrow {

  from {
    transform: scaleY(0);
    opacity: 0;
  }

  to {
    transform: scaleY(1);
    opacity: 1;
  }

}


.bb-anim {

  animation-duration: 0.6s;

  animation-timing-function:
    cubic-bezier(0.16, 1, 0.3, 1);

  animation-fill-mode: both;
}


.bb-fade-up {

  animation-name: bbFadeUp;
}


.bb-fade-left {

  animation-name: bbFadeLeft;
}


.bb-draw-line {

  animation:
    bbDrawLine
    0.7s
    cubic-bezier(0.16, 1, 0.3, 1)
    0.15s
    forwards;
}


.bb-bar {

  animation:
    bbBarGrow
    0.45s
    cubic-bezier(0.16, 1, 0.3, 1)
    both;
}


/* =========================================================
   MOBILE
========================================================= */

@media (max-width: 1023px) {

  .bb-page {

    height: auto;

    min-height: 100vh;

    overflow-y: auto;
  }


  .bb-form-panel {

    height: auto;

    min-height: 100vh;

    padding: 28px 22px;
  }


  .bb-form {

    max-width: 400px;
  }


  .bb-welcome {

    font-size: 30px;
  }

}


/* =========================================================
   SMALL MOBILE
========================================================= */

@media (max-width: 500px) {

  .bb-form-panel {

    padding: 24px 18px;
  }


  .bb-welcome {

    font-size: 28px;
  }


  .bb-fields {

    gap: 13px;

    margin-top: 21px;
  }


  .bb-oauth-btn {

    height: 45px;

    font-size: 13px;
  }


  .bb-oauth-icon {

    width: 20px;

    height: 20px;
  }

}

`;

export default Register;