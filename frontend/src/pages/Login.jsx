import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Logo from "./Logo";

import googleIcon from "../assets/google.png";
import githubIcon from "../assets/github.png";

const API_URL = import.meta.env.VITE_API_URL;

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // =========================================================
  // GOOGLE OAUTH LOGIN
  // =========================================================

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/google/login`;
  };

  // =========================================================
  // GITHUB OAUTH LOGIN
  // =========================================================

  const handleGithubLogin = () => {
    window.location.href = `${API_URL}/auth/github/login`;
  };

  // =========================================================
  // NORMAL EMAIL + PASSWORD LOGIN
  // =========================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const body = new URLSearchParams();

      body.append("username", email);
      body.append("password", password);

      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",

        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },

        body,
      });

      const data = await response.json();

      // -------------------------------------------------------
      // LOGIN ERROR
      // -------------------------------------------------------

      if (!response.ok) {
        setMessage(data.detail || "Login failed");
        setLoading(false);
        return;
      }

      // -------------------------------------------------------
      // SAVE JWT
      // -------------------------------------------------------

      localStorage.setItem("token", data.access_token);

      // -------------------------------------------------------
      // GO TO HOMEPAGE
      // -------------------------------------------------------

      navigate("/homepage");

    } catch (error) {
      console.error("Login error:", error);

      setMessage("Cannot connect to backend");

      setLoading(false);
    }
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="bb-page">

      <style>{css}</style>

      {/* =====================================================
          LEFT BRAND / LEDGER PANEL
          ===================================================== */}

      <div className="bb-brand-panel bb-anim bb-fade-left">

        <Logo
          size={34}
          tone="light"
        />

        <div className="bb-brand-copy">

          <h1 className="bb-headline">
            Every rupee, ruled and recorded.
          </h1>

          <p className="bb-subcopy">
            The pocket-money ledger built for students —
            track spending, hit savings goals, and see
            exactly where it all went.
          </p>

        </div>

        <LedgerGrowthMark />

      </div>


      {/* =====================================================
          RIGHT LOGIN PANEL
          ===================================================== */}

      <div className="bb-form-panel">

        <form
          onSubmit={handleSubmit}
          className="bb-form bb-anim bb-fade-up"
        >

          {/* =================================================
              MOBILE LOGO
              ================================================= */}

          <div className="bb-logo-mobile">

            <Logo
              size={30}
              tone="dark"
            />

          </div>


          {/* =================================================
              HEADING
              ================================================= */}

          <h2 className="bb-welcome">
            Welcome back
          </h2>

          <p className="bb-tagline">
            Sign in to open your ledger.
          </p>


          {/* =================================================
              EMAIL + PASSWORD
              ================================================= */}

          <div className="bb-fields">

            {/* EMAIL */}

            <div className="bb-anim bb-fade-up bb-delay-1">

              <Field
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="email"
              />

            </div>


            {/* PASSWORD */}

            <div className="bb-anim bb-fade-up bb-delay-2">

              <Field
                id="password"
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
              />

            </div>

          </div>


          {/* =================================================
              FORGOT PASSWORD
              ================================================= */}

          <div className="bb-forgot-wrapper">

            <Link
              to="/forgot-password"
              className="bb-forgot-link"
            >
              Forgot Password?
            </Link>

          </div>


          {/* =================================================
              ERROR MESSAGE
              ================================================= */}

          {message && (
            <p
              className="bb-error"
              role="alert"
            >
              {message}
            </p>
          )}


          {/* =================================================
              NORMAL SIGN IN BUTTON
              ================================================= */}

          <button
            type="submit"
            disabled={loading}
            className="bb-btn-primary bb-anim bb-fade-up bb-delay-3"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>


          {/* =================================================
              OR DIVIDER
              ================================================= */}

          <div className="bb-divider">

            <span></span>

            <p>OR</p>

            <span></span>

          </div>


          {/* =================================================
              SOCIAL LOGIN BUTTONS
              ================================================= */}

          <div className="bb-social-buttons">

            {/* -------------------------------------------------
                GOOGLE
                ------------------------------------------------- */}

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="bb-social-btn"
            >

              <span className="bb-social-icon">

                <img
                  src={googleIcon}
                  alt="Google"
                  className="bb-social-image"
                />

              </span>

              <span>
                Continue with Google
              </span>

            </button>


            {/* -------------------------------------------------
                GITHUB
                ------------------------------------------------- */}

            <button
              type="button"
              onClick={handleGithubLogin}
              className="bb-social-btn"
            >

              <span className="bb-social-icon">

                <img
                  src={githubIcon}
                  alt="GitHub"
                  className="bb-social-image"
                />

              </span>

              <span>
                Continue with GitHub
              </span>

            </button>

          </div>


          {/* =================================================
              REGISTER
              ================================================= */}

          <button
            type="button"
            onClick={() => navigate("/register")}
            className="bb-btn-link bb-anim bb-fade-up bb-delay-3"
          >
            New here? Create an account
          </button>

        </form>

      </div>

    </div>
  );
}


/* =========================================================
   FIELD COMPONENT
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
    <div>

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
   LEDGER GROWTH GRAPH
   ========================================================= */

function LedgerGrowthMark() {

  const pathLength = 520;

  return (

    <svg
      viewBox="0 0 320 120"
      className="bb-mark"
      aria-hidden="true"
    >

      {/* Grid lines */}

      {[0, 30, 60, 90].map((y) => (

        <line
          key={y}
          x1="0"
          y1={y}
          x2="320"
          y2={y}
          stroke="#C6F135"
          strokeOpacity="0.18"
        />

      ))}


      {/* Growth line */}

      <polyline
        points="
          0,95
          45,80
          90,88
          135,55
          180,60
          225,30
          270,38
          320,10
        "
        fill="none"
        stroke="#C6F135"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="bb-draw-line"
        style={{
          strokeDasharray: pathLength,
          strokeDashoffset: pathLength,
        }}
      />


      {/* Graph points */}

      {[
        [0, 95],
        [45, 80],
        [90, 88],
        [135, 55],
        [180, 60],
        [225, 30],
        [270, 38],
        [320, 10],
      ].map(([cx, cy], i) => (

        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r="4"
          fill="#C6F135"
          className="bb-dot"
          style={{
            animationDelay: `${1 + i * 0.09}s`,
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

  /* =======================================================
     MAIN PAGE
     ======================================================= */

  .bb-page {
    min-height: 100vh;

    display: grid;

    grid-template-columns: 1fr;

    background-color: #F6F8F2;

    color: #0E241B;

    font-family: 'Inter', system-ui, sans-serif;
  }


  @media (min-width: 1024px) {

    .bb-page {
      grid-template-columns: 1fr 1fr;
    }

  }


  /* =======================================================
     BRAND PANEL
     ======================================================= */

  .bb-brand-panel {

    display: none;

    flex-direction: column;

    justify-content: space-between;

    overflow: hidden;

    background-color: #0F3D2E;

    color: #F6F8F2;

    padding: 44px;
  }


  @media (min-width: 1024px) {

    .bb-brand-panel {
      display: flex;
    }

  }


  /* =======================================================
     MOBILE LOGO
     ======================================================= */

  .bb-logo-mobile {
    display: block;
  }


  @media (min-width: 1024px) {

    .bb-logo-mobile {
      display: none;
    }

  }


  /* =======================================================
     BRAND TEXT
     ======================================================= */

  .bb-brand-copy {
    max-width: 360px;
  }


  .bb-headline {

    font-family: 'Fraunces', serif;

    font-size: 38px;

    font-weight: 600;

    line-height: 1.2;

    margin: 0;
  }


  .bb-subcopy {

    margin-top: 16px;

    color: #CFE6B8;

    line-height: 1.6;
  }


  /* =======================================================
     GRAPH
     ======================================================= */

  .bb-mark {

    height: 96px;

    width: 100%;

    max-width: 360px;

    opacity: 0.95;
  }


  /* =======================================================
     FORM PANEL
     ======================================================= */

  .bb-form-panel {

    display: flex;

    align-items: center;

    justify-content: center;

    padding: 64px 24px;
  }


  .bb-form {

    width: 100%;

    max-width: 380px;
  }


  /* =======================================================
     WELCOME TEXT
     ======================================================= */

  .bb-welcome {

    font-family: 'Fraunces', serif;

    font-size: 28px;

    font-weight: 600;

    margin-top: 24px;

    margin-bottom: 4px;
  }


  .bb-tagline {

    color: #4B6B52;

    font-size: 14px;

    margin: 0;
  }


  /* =======================================================
     INPUT FIELDS
     ======================================================= */

  .bb-fields {

    display: flex;

    flex-direction: column;

    gap: 22px;

    margin-top: 32px;
  }


  .bb-label {

    font-family: 'IBM Plex Mono', monospace;

    font-size: 12px;

    color: #4B6B52;
  }


  .bb-input {

    margin-top: 6px;

    width: 100%;

    border: none;

    border-bottom: 1px solid #BFE18A;

    background: transparent;

    padding: 10px 0;

    font-size: 16px;

    color: #0E241B;

    outline: none;

    transition: border-color 0.2s ease;
  }


  .bb-input:focus {

    border-bottom-color: #0F3D2E;
  }


  /* =======================================================
     FORGOT PASSWORD
     ======================================================= */

  .bb-forgot-wrapper {

    margin-top: 10px;

    text-align: right;
  }


  .bb-forgot-link {

    color: #17543E;

    font-size: 13px;

    text-decoration: underline;

    text-decoration-color: #BFE18A;

    text-underline-offset: 4px;

    cursor: pointer;
  }


  .bb-forgot-link:hover {

    color: #0F3D2E;
  }


  /* =======================================================
     ERROR
     ======================================================= */

  .bb-error {

    margin-top: 18px;

    font-family: 'IBM Plex Mono', monospace;

    font-size: 14px;

    color: #B3261E;
  }


  /* =======================================================
     PRIMARY BUTTON
     ======================================================= */

  .bb-btn-primary {

    display: block;

    width: 100%;

    margin-top: 30px;

    padding: 13px 0;

    border-radius: 8px;

    border: none;

    background-color: #C6F135;

    color: #0F3D2E;

    font-weight: 700;

    font-size: 16px;

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


  /* =======================================================
     OR DIVIDER
     ======================================================= */

  .bb-divider {

    display: flex;

    align-items: center;

    gap: 12px;

    margin: 24px 0 18px;
  }


  .bb-divider span {

    flex: 1;

    height: 1px;

    background-color: #D5E4C8;
  }


  .bb-divider p {

    margin: 0;

    color: #777;

    font-family: 'IBM Plex Mono', monospace;

    font-size: 11px;
  }


  /* =======================================================
     SOCIAL BUTTONS
     ======================================================= */

  .bb-social-buttons {

    display: flex;

    flex-direction: column;

    gap: 10px;
  }


  .bb-social-btn {

    width: 100%;

    min-height: 46px;

    display: flex;

    align-items: center;

    justify-content: center;

    gap: 10px;

    padding: 12px;

    border: 1px solid #C8D9BD;

    border-radius: 8px;

    background-color: #FFFFFF;

    color: #17372B;

    font-size: 14px;

    font-weight: 600;

    cursor: pointer;

    transition:
      background-color 0.2s ease,
      border-color 0.2s ease,
      transform 0.15s ease;
  }


  .bb-social-btn:hover {

    background-color: #F1F6EC;

    border-color: #9FBD8D;

    transform: translateY(-1px);
  }


  /* =======================================================
     SOCIAL ICON CONTAINER
     ======================================================= */

  .bb-social-icon {

    width: 22px;

    height: 22px;

    display: inline-flex;

    align-items: center;

    justify-content: center;

    flex-shrink: 0;
  }


  /* =======================================================
     SOCIAL IMAGE
     ======================================================= */

  .bb-social-image {

    width: 20px;

    height: 20px;

    object-fit: contain;

    display: block;
  }


  /* =======================================================
     REGISTER LINK
     ======================================================= */

  .bb-btn-link {

    display: block;

    width: 100%;

    margin-top: 20px;

    background: none;

    border: none;

    color: #17543E;

    font-size: 14px;

    text-decoration: underline;

    text-decoration-color: #BFE18A;

    text-underline-offset: 4px;

    cursor: pointer;

    transition: color 0.2s ease;
  }


  .bb-btn-link:hover {

    color: #0F3D2E;
  }


  /* =======================================================
     ANIMATIONS
     ======================================================= */

  @keyframes bbFadeUp {

    from {

      opacity: 0;

      transform: translateY(14px);
    }

    to {

      opacity: 1;

      transform: translateY(0);
    }

  }


  @keyframes bbFadeLeft {

    from {

      opacity: 0;

      transform: translateX(-14px);
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


  @keyframes bbDotPop {

    from {

      opacity: 0;

      transform: scale(0);
    }

    to {

      opacity: 1;

      transform: scale(1);
    }

  }


  .bb-anim {

    animation-duration: 0.7s;

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


  .bb-delay-1 {

    animation-delay: 0.15s;
  }


  .bb-delay-2 {

    animation-delay: 0.28s;
  }


  .bb-delay-3 {

    animation-delay: 0.42s;
  }


  .bb-draw-line {

    animation:
      bbDrawLine
      1.1s
      cubic-bezier(0.16, 1, 0.3, 1)
      0.3s
      forwards;
  }


  .bb-dot {

    opacity: 0;

    transform-origin: center;

    animation:
      bbDotPop
      0.35s
      ease-out
      forwards;
  }

`;

export default Login;