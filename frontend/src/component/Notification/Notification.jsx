import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

function authHeaders() {
  const token = localStorage.getItem("token");

  return {
    Authorization: `Bearer ${token}`,
  };
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getNotificationIcon(type) {
  switch (type) {
    case "budget":
      return "💰";
    case "savings":
      return "🎯";
    case "milestone":
      return "🏆";
    case "report":
      return "📊";
    case "warning":
      return "⚠️";
    default:
      return "🔔";
  }
}

export default function Notification() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  // =========================================================
  // LOAD NOTIFICATIONS
  // =========================================================

  const loadNotifications = async () => {
    setLoading(true);
    setError("");

    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please login again.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/notifications`, {
        headers: authHeaders(),
      });

      const data = await response.json().catch(() => []);

      if (!response.ok) {
        throw new Error(
          data.detail || `Request failed (${response.status})`
        );
      }

      const list = Array.isArray(data)
        ? data
        : data.notifications || data.items || [];

      setNotifications(list);
    } catch (err) {
      console.error("Failed to load notifications:", err);

      setError(
        err.message || "Unable to load notifications."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadNotifications();
  }, []);

  // =========================================================
  // MARK AS READ
  // =========================================================

  const handleMarkAsRead = async (notificationId) => {
    setBusyId(notificationId);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/notifications/${notificationId}/read`,
        {
          method: "PUT",
          headers: {
            ...authHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_read: true,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || `Request failed (${response.status})`
        );
      }

      // Update the notification immediately
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );

      // Tell Sidebar to refresh its unread indicator
      window.dispatchEvent(
        new Event("notification-updated")
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);

      setError(
        err.message || "Unable to mark notification as read."
      );
    } finally {
      setBusyId(null);
    }
  };

  // =========================================================
  // DELETE NOTIFICATION
  // =========================================================

  const handleDelete = async (notificationId) => {
    setBusyId(notificationId);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/notifications/${notificationId}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || `Request failed (${response.status})`
        );
      }

      // Remove immediately from UI
      setNotifications((current) =>
        current.filter(
          (notification) =>
            notification.id !== notificationId
        )
      );

      // Tell Sidebar to refresh unread indicator
      window.dispatchEvent(
        new Event("notification-updated")
      );
    } catch (err) {
      console.error("Failed to delete notification:", err);

      setError(
        err.message || "Unable to delete notification."
      );
    } finally {
      setBusyId(null);
    }
  };

  // =========================================================
  // MARK ALL AS READ
  // =========================================================

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter(
      (notification) => notification.is_read === false
    );

    for (const notification of unreadNotifications) {
      await handleMarkAsRead(notification.id);
    }
  };

  // =========================================================
  // COUNTS
  // =========================================================

  const unreadCount = notifications.filter(
    (notification) => notification.is_read === false
  ).length;

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Notifications</h1>
            <p style={styles.subtitle}>
              Stay updated with your financial activity.
            </p>
          </div>
        </div>

        <div style={styles.message}>
          Loading notifications...
        </div>
      </div>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div style={styles.page}>
      {/* HEADER */}

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Notifications</h1>

          <p style={styles.subtitle}>
            Stay updated with your financial activity.
          </p>
        </div>

        <div style={styles.headerActions}>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              style={styles.secondaryButton}
            >
              Mark all as read
            </button>
          )}

          <button
            type="button"
            onClick={loadNotifications}
            style={styles.primaryButton}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div style={styles.errorBox}>
          {error}
        </div>
      )}

      {/* SUMMARY */}

      <div style={styles.summary}>
        <div>
          <strong>{notifications.length}</strong>
          <span>Total notifications</span>
        </div>

        <div>
          <strong>{unreadCount}</strong>
          <span>Unread</span>
        </div>
      </div>

      {/* EMPTY */}

      {notifications.length === 0 && !error && (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>🔔</div>

          <h2 style={styles.emptyTitle}>
            No notifications
          </h2>

          <p style={styles.emptyText}>
            You're all caught up!
          </p>
        </div>
      )}

      {/* NOTIFICATION LIST */}

      <div style={styles.list}>
        {notifications.map((notification) => {
          const isUnread =
            notification.is_read === false;

          const isBusy =
            busyId === notification.id;

          return (
            <div
              key={notification.id}
              style={{
                ...styles.card,
                ...(isUnread
                  ? styles.unreadCard
                  : styles.readCard),
              }}
            >
              {/* ICON */}

              <div
                style={{
                  ...styles.icon,
                  ...(isUnread
                    ? styles.unreadIcon
                    : {}),
                }}
              >
                {getNotificationIcon(
                  notification.type
                )}
              </div>

              {/* CONTENT */}

              <div style={styles.content}>
                <div style={styles.cardHeader}>
                  <div style={styles.titleRow}>
                    {isUnread && (
                      <span
                        style={styles.unreadDot}
                        aria-label="Unread"
                      />
                    )}

                    <h3 style={styles.cardTitle}>
                      {notification.title}
                    </h3>
                  </div>

                  <span style={styles.date}>
                    {formatDate(
                      notification.created_at
                    )}
                  </span>
                </div>

                <p style={styles.messageText}>
                  {notification.message}
                </p>

                {notification.type && (
                  <span style={styles.typeBadge}>
                    {notification.type}
                  </span>
                )}

                {/* ACTIONS */}

                <div style={styles.actions}>
                  {isUnread && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        handleMarkAsRead(
                          notification.id
                        )
                      }
                      style={styles.readButton}
                    >
                      {isBusy
                        ? "Updating..."
                        : "Mark as read"}
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() =>
                      handleDelete(
                        notification.id
                      )
                    }
                    style={styles.deleteButton}
                  >
                    {isBusy
                      ? "Please wait..."
                      : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// =========================================================
// STYLES
// =========================================================

const styles = {
  page: {
    padding: "32px",
    maxWidth: "1100px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "28px",
  },

  title: {
    margin: 0,
    fontSize: "34px",
    fontWeight: 700,
    color: "#101828",
  },

  subtitle: {
    marginTop: "8px",
    marginBottom: 0,
    color: "#667085",
    fontSize: "15px",
  },

  headerActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  primaryButton: {
    border: "none",
    background: "#101828",
    color: "#ffffff",
    padding: "11px 17px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: 600,
  },

  secondaryButton: {
    border: "1px solid #d0d5dd",
    background: "#ffffff",
    color: "#101828",
    padding: "10px 15px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: 600,
  },

  summary: {
    display: "flex",
    gap: "16px",
    marginBottom: "22px",
  },

  summaryBox: {
    background: "#ffffff",
  },

  message: {
    background: "#ffffff",
    borderRadius: "12px",
    padding: "30px",
    color: "#667085",
  },

  errorBox: {
    background: "#fef3f2",
    border: "1px solid #fecdca",
    color: "#b42318",
    padding: "13px 16px",
    borderRadius: "9px",
    marginBottom: "20px",
  },

  empty: {
    background: "#ffffff",
    borderRadius: "14px",
    padding: "60px 20px",
    textAlign: "center",
  },

  emptyIcon: {
    fontSize: "38px",
    marginBottom: "12px",
  },

  emptyTitle: {
    margin: 0,
    color: "#101828",
  },

  emptyText: {
    color: "#667085",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },

  card: {
    display: "flex",
    gap: "16px",
    background: "#ffffff",
    borderRadius: "14px",
    padding: "20px",
    border: "1px solid #eaecf0",
  },

  unreadCard: {
    borderLeft: "4px solid #ef4444",
  },

  readCard: {
    opacity: 0.88,
  },

  icon: {
    width: "44px",
    height: "44px",
    minWidth: "44px",
    borderRadius: "50%",
    background: "#f2f4f7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "21px",
  },

  unreadIcon: {
    background: "#fff1f0",
  },

  content: {
    flex: 1,
    minWidth: 0,
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "15px",
  },

  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  unreadDot: {
    width: "8px",
    height: "8px",
    minWidth: "8px",
    borderRadius: "50%",
    background: "#ef4444",
  },

  cardTitle: {
    margin: 0,
    fontSize: "17px",
    color: "#101828",
  },

  date: {
    color: "#98a2b3",
    fontSize: "12px",
    whiteSpace: "nowrap",
  },

  messageText: {
    color: "#475467",
    lineHeight: 1.55,
    margin: "9px 0",
  },

  typeBadge: {
    display: "inline-block",
    background: "#f2f4f7",
    color: "#475467",
    padding: "4px 9px",
    borderRadius: "999px",
    fontSize: "11px",
    textTransform: "capitalize",
  },

  actions: {
    display: "flex",
    gap: "9px",
    marginTop: "14px",
  },

  readButton: {
    border: "1px solid #d0d5dd",
    background: "#ffffff",
    color: "#344054",
    padding: "7px 11px",
    borderRadius: "7px",
    cursor: "pointer",
  },

  deleteButton: {
    border: "1px solid #fecdca",
    background: "#ffffff",
    color: "#d92d20",
    padding: "7px 11px",
    borderRadius: "7px",
    cursor: "pointer",
  },
};