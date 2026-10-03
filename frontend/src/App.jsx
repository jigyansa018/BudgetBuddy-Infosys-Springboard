import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useNavigate,
} from "react-router-dom";

import WelcomePage from "./pages/WelcomePage";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Layout from "./pages/Layout/Layout";

import OAuthCallback from "./pages/OAuthCallback";
import Notification from "./component/Notification/Notification";
import Expense from "./component/Expense/Expense";
import Income from "./component/Income/Income";
import Budget from "./component/Budget/Budget";
import Savings from "./component/Savings/Savings";
import Analytics from "./component/Analytics/Analytics";
import Invoices from "./component/Invoices/Invoices";
import HomePage from "./component/HomePage/HomePage";

/* =========================================================
   AUTHENTICATION GUARD
   ========================================================= */

function RequireAuth() {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  console.log("RequireAuth: token exists =", !!token);

  if (!token) {
    console.log(
      "RequireAuth: NO TOKEN -> redirecting to /login"
    );

    return <Navigate to="/login" replace />;
  }

  const handleSignOut = () => {
    localStorage.removeItem("token");

    navigate("/login", {
      replace: true,
    });
  };

  return (
    <Layout onSignOut={handleSignOut}>
      <Outlet />
    </Layout>
  );
}

/* =========================================================
   APP
   ========================================================= */

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ================= PUBLIC ROUTES ================= */}

        <Route
          path="/oauth/callback"
          element={<OAuthCallback />}
        />

        <Route
          path="/"
          element={<WelcomePage />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        {/* ================= PROTECTED ROUTES ================= */}

        <Route element={<RequireAuth />}>

          <Route
            path="/homepage"
            element={<HomePage />}
          />

          <Route
            path="/notifications"
            element={<Notification />}
          />

          <Route
            path="/budget"
            element={<Budget />}
          />

          <Route
            path="/savings"
            element={<Savings />}
          />

          <Route
            path="/income"
            element={<Income />}
          />

          <Route
            path="/expense"
            element={<Expense />}
          />

          <Route
            path="/analytics"
            element={<Analytics />}
          />

          <Route
            path="/invoices"
            element={<Invoices />}
          />

        </Route>

        {/* ================= FALLBACK ================= */}

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;