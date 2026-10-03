import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import "./Sidebar.css";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/homepage", icon: IconDashboard },
  { label: "Budgets", to: "/budget", icon: IconBudgets },
  { label: "Savings", to: "/savings", icon: IconSavings },
  { label: "Income", to: "/income", icon: IconIncome },
  { label: "Expenses", to: "/expense", icon: IconExpenses },
  { label: "Analytics", to: "/analytics", icon: IconAnalytics },
  { label: "Invoices", to: "/invoices", icon: IconInvoices },
  {
    label: "Notifications",
    to: "/notifications",
    icon: IconNotifications,
  },
];

const API_URL = "http://127.0.0.1:8000";

export default function Sidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) {
  const [hasUnreadNotifications, setHasUnreadNotifications] =
    useState(false);

  // =========================================================
  // AUTOMATIC NOTIFICATION + FINANCIAL ALERT CHECKING
  // =========================================================

  useEffect(() => {
    let isMounted = true;

    const checkFinancialAlerts = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        if (isMounted) {
          setHasUnreadNotifications(false);
        }
        return;
      }

      try {
        // -----------------------------------------------------
        // STEP 1:
        // Ask backend to check financial alerts
        // -----------------------------------------------------

        const alertResponse = await fetch(
          `${API_URL}/notifications/check-alerts`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!alertResponse.ok) {
          console.error(
            "Financial alert check failed:",
            alertResponse.status
          );
        }

        // -----------------------------------------------------
        // STEP 2:
        // Get latest notifications
        // -----------------------------------------------------

        const notificationResponse = await fetch(
          `${API_URL}/notifications`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!notificationResponse.ok) {
          return;
        }

        const data = await notificationResponse.json();

        const notifications = Array.isArray(data)
          ? data
          : Array.isArray(data?.notifications)
          ? data.notifications
          : Array.isArray(data?.items)
          ? data.items
          : [];

        // -----------------------------------------------------
        // STEP 3:
        // Check for unread notifications
        // -----------------------------------------------------

        const unread = notifications.some(
          (notification) =>
            notification.is_read === false
        );

        if (isMounted) {
          setHasUnreadNotifications(unread);
        }
      } catch (error) {
        console.error(
          "Unable to check financial notifications:",
          error
        );
      }
    };

    // ---------------------------------------------------------
    // Check immediately when Sidebar loads
    // ---------------------------------------------------------

    checkFinancialAlerts();

    // ---------------------------------------------------------
    // Check automatically every 5 seconds
    // ---------------------------------------------------------

    const interval = setInterval(() => {
      checkFinancialAlerts();
    }, 5000);

    // ---------------------------------------------------------
    // Allow other components to request a notification refresh
    // ---------------------------------------------------------

    const handleNotificationUpdate = () => {
      checkFinancialAlerts();
    };

    window.addEventListener(
      "notification-updated",
      handleNotificationUpdate
    );

    // ---------------------------------------------------------
    // Cleanup
    // ---------------------------------------------------------

    return () => {
      isMounted = false;

      clearInterval(interval);

      window.removeEventListener(
        "notification-updated",
        handleNotificationUpdate
      );
    };
  }, []);

  // =========================================================
  // SIDEBAR
  // =========================================================

  return (
    <>
      {/* =====================================================
          Mobile backdrop
          ===================================================== */}

      <div
        className={`bb-backdrop ${
          isMobileOpen ? "is-visible" : ""
        }`}
        onClick={onCloseMobile}
      />

      {/* =====================================================
          Sidebar
          ===================================================== */}

      <aside
        className={`bb-sidebar ${
          isCollapsed ? "is-collapsed" : ""
        } ${
          isMobileOpen ? "is-open" : ""
        }`}
      >
        {/* ===================================================
            Collapse button
            =================================================== */}

        <button
          type="button"
          className="bb-collapse-btn"
          onClick={onToggleCollapse}
          aria-label={
            isCollapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
        >
          <ChevronLeft />
        </button>

        {/* ===================================================
            Header
            =================================================== */}

        <div className="bb-sidebar-header">
          <div className="bb-logo">
            <div className="bb-logo-mark">
              B
            </div>

            <div className="bb-logo-text">
              <span>BudgetBuddy</span>
            </div>
          </div>
        </div>

        {/* ===================================================
            Navigation
            =================================================== */}

        <nav className="bb-nav">
          <div className="bb-nav-label">
            MENU
          </div>

          {NAV_ITEMS.map(
            ({ label, to, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `bb-nav-item ${
                    isActive ? "is-active" : ""
                  }`
                }
              >
                {/* Icon */}

                <span className="bb-nav-icon">
                  <Icon />
                </span>

                {/* Text */}

                <span className="bb-nav-text">
                  {label}

                  {/* Unread notification dot */}

                  {label === "Notifications" &&
                    hasUnreadNotifications && (
                      <span
                        className="notification-dot"
                        aria-label="Unread notifications"
                      />
                    )}
                </span>
              </NavLink>
            )
          )}
        </nav>
      </aside>
    </>
  );
}

// =========================================================
// CHEVRON ICON
// =========================================================

function ChevronLeft() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// =========================================================
// DASHBOARD ICON
// =========================================================

function IconDashboard() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
    >
      <rect
        x="3"
        y="3"
        width="8"
        height="8"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <rect
        x="13"
        y="3"
        width="8"
        height="5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <rect
        x="13"
        y="10"
        width="8"
        height="11"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <rect
        x="3"
        y="13"
        width="8"
        height="8"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

// =========================================================
// BUDGETS ICON
// =========================================================

function IconBudgets() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="M3 9h18"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="M8 14h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

// =========================================================
// SAVINGS ICON
// =========================================================

function IconSavings() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M4 12c0-4.4 3.6-8 8-8 3 0 5.6 1.6 7 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-1a8 8 0 01-1.5 2.6V19a1 1 0 01-1 1h-2a1 1 0 01-1-1v-1H9v1a1 1 0 01-1 1H6a1 1 0 01-1-1v-2.3C3.8 15.7 4 14.9 4 12z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      <circle
        cx="15"
        cy="11"
        r="1"
        fill="currentColor"
      />
    </svg>
  );
}

// =========================================================
// INCOME ICON
// =========================================================

function IconIncome() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M12 19V5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <path
        d="M6 11l6-6 6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// =========================================================
// EXPENSES ICON
// =========================================================

function IconExpenses() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M12 5v14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <path
        d="M6 13l6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// =========================================================
// ANALYTICS ICON
// =========================================================

function IconAnalytics() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M4 19V9M11 19V4M18 19v-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

// =========================================================
// INVOICES ICON
// =========================================================

function IconInvoices() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M7 3h8l4 4v14a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />

      <path
        d="M9 12h6M9 16h6M9 8h3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

// =========================================================
// NOTIFICATIONS ICON
// =========================================================

function IconNotifications() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M18 9a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M10 21h4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}