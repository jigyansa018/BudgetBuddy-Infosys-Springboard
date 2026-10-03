import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export default function OAuthCallback() {
  const [message, setMessage] = useState(
    "Completing sign in..."
  );

  useEffect(() => {
    const completeOAuth = async () => {
      console.log("=================================");
      console.log("OAUTH CALLBACK");
      console.log("=================================");

      console.log(
        "OAuth callback URL:",
        window.location.href
      );

      console.log(
        "OAuth search:",
        window.location.search
      );

      console.log(
        "OAuth hash:",
        window.location.hash
      );

      try {
        /* ================================================
           READ TOKEN FROM QUERY STRING

           Example:
           /oauth/callback?token=abc123
           ================================================= */

        const queryParams = new URLSearchParams(
          window.location.search
        );

        /* ================================================
           READ TOKEN FROM HASH

           Example:
           /oauth/callback#token=abc123
           ================================================= */

        const hashParams = new URLSearchParams(
          window.location.hash.replace(/^#/, "")
        );

        /* ================================================
           SUPPORT BOTH
           ================================================= */

        const token =
          queryParams.get("token") ||
          hashParams.get("token");

        const error =
          queryParams.get("error") ||
          hashParams.get("error");

        console.log(
          "OAuth token received:",
          !!token
        );

        console.log(
          "OAuth error:",
          error
        );

        /* ================================================
           ERROR
           ================================================= */

        if (error) {
          console.error(
            "OAuth error:",
            error
          );

          setMessage(
            `Login failed: ${error}`
          );

          return;
        }

        /* ================================================
           TOKEN NOT FOUND
           ================================================= */

        if (!token) {
          console.error(
            "NO TOKEN FOUND"
          );

          console.error(
            "Query:",
            window.location.search
          );

          console.error(
            "Hash:",
            window.location.hash
          );

          setMessage(
            "Login failed: no authentication token received."
          );

          return;
        }

        /* ================================================
           SAVE TOKEN
           ================================================= */

        localStorage.setItem(
          "token",
          token
        );

        console.log(
          "JWT saved to localStorage."
        );

        console.log(
          "Stored token exists:",
          !!localStorage.getItem("token")
        );

        /* ================================================
           VERIFY TOKEN
           ================================================= */

        setMessage(
          "Verifying your account..."
        );

        const response = await fetch(
          `${API_URL}/auth/me`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        console.log(
          "/auth/me status:",
          response.status
        );

        /* ================================================
           INVALID TOKEN
           ================================================= */

        if (!response.ok) {
          let errorData = null;

          try {
            errorData = await response.json();
          } catch {
            // Ignore JSON parsing errors
          }

          console.error(
            "/auth/me error:",
            errorData
          );

          localStorage.removeItem("token");

          setMessage(
            "Authentication token is invalid."
          );

          return;
        }

        /* ================================================
           USER
           ================================================= */

        const user = await response.json();

        console.log(
          "Authenticated user:",
          user
        );

        /* ================================================
           REMOVE TOKEN FROM URL
           ================================================= */

        window.history.replaceState(
          {},
          document.title,
          "/oauth/callback"
        );

        /* ================================================
           GO TO DASHBOARD
           ================================================= */

        setMessage(
          `Welcome ${
            user.full_name || "to BudgetBuddy"
          }!`
        );

        console.log(
          "Redirecting to /homepage..."
        );

        window.location.replace(
          "/homepage"
        );

      } catch (error) {
        console.error(
          "OAuth callback error:",
          error
        );

        localStorage.removeItem("token");

        setMessage(
          "Unable to complete sign in."
        );
      }
    };

    completeOAuth();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        fontFamily: "Arial, sans-serif",
        padding: "20px",
        textAlign: "center",
      }}
    >
      <h2>{message}</h2>

      <p>
        Please wait while BudgetBuddy completes
        your sign in...
      </p>
    </div>
  );
}