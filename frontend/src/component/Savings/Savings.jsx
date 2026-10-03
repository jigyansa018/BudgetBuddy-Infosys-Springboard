import { useCallback, useEffect, useState } from "react";
import "./Savings.css";

const API_URL = import.meta.env.VITE_API_URL;
const SAVINGS_ENDPOINT = `${API_URL}/savings`;

const goalUrl = (id) => `${SAVINGS_ENDPOINT}/${id}`;
const contributeUrl = (id) => `${SAVINGS_ENDPOINT}/${id}/contribute`;

/* =========================================================
   Authentication
   ========================================================= */

function authHeaders() {
  const token = localStorage.getItem("token");

  return {
    Authorization: `Bearer ${token}`,
  };
}

function jsonHeaders() {
  return {
    "Content-Type": "application/json",
    ...authHeaders(),
  };
}

/* =========================================================
   Convert backend savings object into frontend object
   ========================================================= */

function mapGoal(raw) {
  const target = Number(raw?.target_amount ?? raw?.target ?? 0);

  const saved = Number(
    raw?.current_amount ?? raw?.saved_amount ?? raw?.saved ?? 0
  );

  return {
    id: raw?.id,

    name: raw?.name ?? raw?.title ?? "Untitled goal",

    saved,

    target,

    due: raw?.target_date ?? raw?.due_date ?? null,

    description: raw?.description ?? "",

    status: String(raw?.status ?? "active").toLowerCase(),
  };
}

/* =========================================================
   Date formatting
   ========================================================= */

function formatDue(due) {
  if (!due) return null;

  const date = new Date(due);

  if (Number.isNaN(date.getTime())) {
    return due;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* =========================================================
   Currency formatter
   ========================================================= */

function formatRupees(amount) {
  return Number(amount || 0).toLocaleString("en-IN");
}

/* =========================================================
   Savings Page
   ========================================================= */

export default function Savings() {
  /* -------------------------------------------------------
     Goals
     ------------------------------------------------------- */

  const [goals, setGoals] = useState([]);

  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState("");

  /* -------------------------------------------------------
     New goal form
     ------------------------------------------------------- */

  const [formOpen, setFormOpen] = useState(false);

  const [formName, setFormName] = useState("");

  const [formTarget, setFormTarget] = useState("");

  const [formDate, setFormDate] = useState("");

  const [formDescription, setFormDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [formError, setFormError] = useState("");

  /* -------------------------------------------------------
     Active goal panel
     ------------------------------------------------------- */

  const [activePanel, setActivePanel] = useState(null);

  /*
    {
      id,
      mode: "add" | "edit" | "delete"
    }
  */

  /* -------------------------------------------------------
     Add savings
     ------------------------------------------------------- */

  const [panelAmount, setPanelAmount] = useState("");

  /* -------------------------------------------------------
     Edit goal
     ------------------------------------------------------- */

  const [panelName, setPanelName] = useState("");

  const [panelTarget, setPanelTarget] = useState("");

  const [panelDate, setPanelDate] = useState("");

  const [panelDescription, setPanelDescription] = useState("");

  /* -------------------------------------------------------
     Panel state
     ------------------------------------------------------- */

  const [panelBusy, setPanelBusy] = useState(false);

  const [panelError, setPanelError] = useState("");

  /* =======================================================
     LOAD REAL SAVINGS FROM BACKEND
     ======================================================= */

  const loadGoals = useCallback(async (showLoading = true) => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoadError("You are not logged in.");
      setLoading(false);
      return;
    }

    try {
      if (showLoading) {
        setLoading(true);
      }

      setLoadError("");

      const response = await fetch(SAVINGS_ENDPOINT, {
        method: "GET",
        headers: authHeaders(),
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error("Your session has expired. Please login again.");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        throw new Error(
          errorData.detail || `Request failed (${response.status})`
        );
      }

      const data = await response.json();

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : [];

      const mappedGoals = list.map(mapGoal);

      setGoals(mappedGoals);
    } catch (error) {
      console.error("Savings loading error:", error);

      setLoadError(
        error.message || "Couldn't load your savings goals."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /* =======================================================
     INITIAL LOAD
     ======================================================= */

  useEffect(() => {
    loadGoals(true);
  }, [loadGoals]);

  /* =======================================================
     AUTO REFRESH EVERY 30 SECONDS
     ======================================================= */

  useEffect(() => {
    const interval = setInterval(() => {
      loadGoals(false);
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [loadGoals]);

  /* =======================================================
     REFRESH WHEN USER RETURNS TO TAB
     ======================================================= */

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadGoals(false);
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [loadGoals]);

  /* =======================================================
     TOTAL SAVINGS
     ======================================================= */

  const totalSaved = goals.reduce(
    (sum, goal) => sum + Number(goal.saved || 0),
    0
  );

  const totalTarget = goals.reduce(
    (sum, goal) => sum + Number(goal.target || 0),
    0
  );

  const overallPercentage =
    totalTarget > 0
      ? Math.min((totalSaved / totalTarget) * 100, 100)
      : 0;

  /* =======================================================
     CREATE NEW GOAL
     ======================================================= */

  const handleCreateGoal = async (event) => {
    event.preventDefault();

    setSubmitting(true);
    setFormError("");

    try {
      const target = Number(formTarget);

      if (!formName.trim()) {
        setFormError("Please enter a goal name.");
        return;
      }

      if (!Number.isFinite(target) || target <= 0) {
        setFormError("Target amount must be greater than ₹0.");
        return;
      }

      const body = {
        name: formName.trim(),
        target_amount: target,
        current_amount: 0,
        target_date: formDate || null,
        description: formDescription.trim() || null,
      };

      const response = await fetch(SAVINGS_ENDPOINT, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setFormError(
          data.detail || "Couldn't create that goal."
        );
        return;
      }

      setFormOpen(false);

      setFormName("");
      setFormTarget("");
      setFormDate("");
      setFormDescription("");
      setFormError("");

      await loadGoals(false);
    } catch (error) {
      console.error("Create goal error:", error);

      setFormError("Cannot connect to backend.");
    } finally {
      setSubmitting(false);
    }
  };

  /* =======================================================
     OPEN PANEL
     ======================================================= */

  const openPanel = (id, mode, goal) => {
    setActivePanel({
      id,
      mode,
    });

    setPanelError("");
    setPanelAmount("");

    setPanelName(goal?.name ?? "");

    setPanelTarget(
      goal ? String(goal.target) : ""
    );

    setPanelDate(goal?.due ?? "");

    setPanelDescription(
      goal?.description ?? ""
    );
  };

  /* =======================================================
     CLOSE PANEL
     ======================================================= */

  const closePanel = () => {
    setActivePanel(null);

    setPanelAmount("");

    setPanelError("");

    setPanelBusy(false);
  };

  /* =======================================================
     ADD REAL SAVINGS
     ======================================================= */

  const handleContribute = async (event, id) => {
    event.preventDefault();

    setPanelBusy(true);
    setPanelError("");

    try {
      const amount = Number(panelAmount);

      if (!Number.isFinite(amount) || amount <= 0) {
        setPanelError(
          "Please enter a valid amount greater than ₹0."
        );
        return;
      }

      const response = await fetch(
        contributeUrl(id),
        {
          method: "POST",
          headers: jsonHeaders(),
          body: JSON.stringify({
            amount,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setPanelError(
          data.detail || "Couldn't add that amount."
        );
        return;
      }

      /*
        Backend is the source of truth.
        Reload the goal after contribution.
      */

      closePanel();

      await loadGoals(false);
    } catch (error) {
      console.error("Contribution error:", error);

      setPanelError("Cannot connect to backend.");
    } finally {
      setPanelBusy(false);
    }
  };

  /* =======================================================
     EDIT GOAL
     ======================================================= */

  const handleEdit = async (event, id) => {
    event.preventDefault();

    setPanelBusy(true);
    setPanelError("");

    try {
      const target = Number(panelTarget);

      if (!panelName.trim()) {
        setPanelError("Please enter a goal name.");
        return;
      }

      if (!Number.isFinite(target) || target <= 0) {
        setPanelError(
          "Target amount must be greater than ₹0."
        );
        return;
      }

      const response = await fetch(
        goalUrl(id),
        {
          method: "PUT",
          headers: jsonHeaders(),
          body: JSON.stringify({
            name: panelName.trim(),
            target_amount: target,
            target_date: panelDate || null,
            description:
              panelDescription.trim() || null,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setPanelError(
          data.detail || "Couldn't save those changes."
        );
        return;
      }

      closePanel();

      await loadGoals(false);
    } catch (error) {
      console.error("Edit goal error:", error);

      setPanelError("Cannot connect to backend.");
    } finally {
      setPanelBusy(false);
    }
  };

  /* =======================================================
     DELETE GOAL
     ======================================================= */

  const handleDelete = async (id) => {
    setPanelBusy(true);
    setPanelError("");

    try {
      const response = await fetch(
        goalUrl(id),
        {
          method: "DELETE",
          headers: authHeaders(),
        }
      );

      if (!response.ok && response.status !== 204) {
        const data = await response
          .json()
          .catch(() => ({}));

        setPanelError(
          data.detail || "Couldn't delete that goal."
        );

        return;
      }

      closePanel();

      await loadGoals(false);
    } catch (error) {
      console.error("Delete goal error:", error);

      setPanelError("Cannot connect to backend.");
    } finally {
      setPanelBusy(false);
    }
  };

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="sav-page">

      {/* ===================================================
          HEADER
          =================================================== */}

      <div className="sav-header">

        <div>
          <h1 className="sav-title">
            Savings
          </h1>

          <p className="sav-subtitle">
            Goals you're putting money toward.
          </p>
        </div>

        <button
          type="button"
          className="sav-add-btn"
          onClick={() => {
            setFormOpen((value) => !value);
            setFormError("");
          }}
        >
          {formOpen ? "Cancel" : "+ New goal"}
        </button>

      </div>

      {/* ===================================================
          BACKEND ERROR
          =================================================== */}

      {loadError && (
        <div className="sav-banner">

          <span>{loadError}</span>

          <button
            type="button"
            className="sav-retry"
            onClick={() => loadGoals(true)}
          >
            Retry
          </button>

        </div>
      )}

      {/* ===================================================
          CREATE GOAL FORM
          =================================================== */}

      {formOpen && (
        <form
          className="sav-form"
          onSubmit={handleCreateGoal}
        >

          <div className="sav-form-row">

            <div>
              <label
                className="sav-form-label"
                htmlFor="goal-name"
              >
                Name
              </label>

              <input
                id="goal-name"
                className="sav-form-input"
                type="text"
                placeholder="e.g. New Laptop"
                required
                value={formName}
                onChange={(event) =>
                  setFormName(event.target.value)
                }
              />
            </div>

            <div>
              <label
                className="sav-form-label"
                htmlFor="goal-target"
              >
                Target (₹)
              </label>

              <input
                id="goal-target"
                className="sav-form-input"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="50000"
                required
                value={formTarget}
                onChange={(event) =>
                  setFormTarget(event.target.value)
                }
              />
            </div>

          </div>

          <div className="sav-form-row">

            <div>
              <label
                className="sav-form-label"
                htmlFor="goal-date"
              >
                Target date
              </label>

              <input
                id="goal-date"
                className="sav-form-input"
                type="date"
                value={formDate}
                onChange={(event) =>
                  setFormDate(event.target.value)
                }
              />
            </div>

            <div>
              <label
                className="sav-form-label"
                htmlFor="goal-description"
              >
                Description
              </label>

              <input
                id="goal-description"
                className="sav-form-input"
                type="text"
                placeholder="What are you saving for?"
                value={formDescription}
                onChange={(event) =>
                  setFormDescription(event.target.value)
                }
              />
            </div>

          </div>

          {formError && (
            <p className="sav-error">
              {formError}
            </p>
          )}

          <button
            type="submit"
            className="sav-add-btn"
            disabled={submitting}
          >
            {submitting
              ? "Creating…"
              : "Create goal"}
          </button>

        </form>
      )}

      {/* ===================================================
          OVERALL SAVINGS
          =================================================== */}

      <div className="sav-overview">

        <span className="sav-overview-label">
          saved across all goals
        </span>

        <div className="sav-overview-value">

          ₹{formatRupees(totalSaved)}

          <span className="sav-overview-target">
            {" "}
            / ₹{formatRupees(totalTarget)}
          </span>

        </div>

        {totalTarget > 0 && (
          <div className="sav-overall-track">

            <div
              className="sav-overall-progress"
              style={{
                width: `${overallPercentage}%`,
              }}
            />

          </div>
        )}

        {totalTarget > 0 && (
          <p className="sav-overall-percent">
            {Math.round(overallPercentage)}%
            {" "}
            of your total savings target
          </p>
        )}

      </div>

      {/* ===================================================
          LOADING
          =================================================== */}

      {loading ? (

        <div className="sav-grid">

          {[0, 1, 2].map((index) => (
            <div
              className="sav-card sav-skeleton"
              key={index}
            >
              <div className="sav-skel-line sav-skel-w60" />

              <div className="sav-skel-ring" />
            </div>
          ))}

        </div>

      ) : goals.length === 0 ? (

        /* =================================================
           EMPTY STATE
           ================================================= */

        <div className="sav-empty">

          <div className="sav-empty-icon">
            🎯
          </div>

          <p className="sav-subtitle">
            No savings goals yet — create your first one above.
          </p>

        </div>

      ) : (

        /* =================================================
           REAL SAVINGS GOALS
           ================================================= */

        <div className="sav-grid">

          {goals.map((goal) => {

            const percentage =
              goal.target > 0
                ? Math.min(
                    (goal.saved / goal.target) * 100,
                    100
                  )
                : 0;

            const due = formatDue(goal.due);

            const panel =
              activePanel?.id === goal.id
                ? activePanel.mode
                : null;

            /*
              IMPORTANT:

              Check the REAL backend status.

              Also consider 100% completed so the
              frontend does not miss the completed
              state if the backend returns the amount
              before the status refresh.
            */

            const isCompleted =
              goal.status === "completed" ||
              percentage >= 100;

            return (

              <div
                className={`sav-card ${
                  isCompleted
                    ? "sav-card-completed"
                    : ""
                }`}
                key={goal.id}
              >

                {/* ---------------------------------------
                    Goal header
                    --------------------------------------- */}

                <div className="sav-card-top">

                  <span className="sav-card-name">
                    {goal.name}
                  </span>

                  {due && (
                    <span className="sav-card-due">
                      by {due}
                    </span>
                  )}

                </div>

                {/* ---------------------------------------
                    COMPLETED STATUS
                    --------------------------------------- */}

                {isCompleted && (
                  <div className="sav-completed">
                    ✅ Goal Completed
                  </div>
                )}

                {/* ---------------------------------------
                    Progress
                    --------------------------------------- */}

                <div className="sav-ring-row">

                  <div
                    className="sav-ring"
                    style={{
                      "--sav-pct": `${percentage}`,
                    }}
                  >
                    <span className="sav-ring-pct">
                      {Math.round(percentage)}%
                    </span>
                  </div>

                  <div className="sav-amounts">

                    <div className="sav-saved">
                      ₹{formatRupees(goal.saved)}
                    </div>

                    <div className="sav-target">
                      of ₹{formatRupees(goal.target)} goal
                    </div>

                  </div>

                </div>

                {/* ---------------------------------------
                    Description
                    --------------------------------------- */}

                {goal.description && (
                  <p className="sav-description">
                    {goal.description}
                  </p>
                )}

                {/* ---------------------------------------
                    Actions
                    --------------------------------------- */}

                <div className="sav-actions">

                  {!isCompleted && (
                    <button
                      type="button"
                      className="sav-action"
                      onClick={() =>
                        openPanel(
                          goal.id,
                          "add",
                          goal
                        )
                      }
                    >
                      Add
                    </button>
                  )}

                  <button
                    type="button"
                    className="sav-action"
                    onClick={() =>
                      openPanel(
                        goal.id,
                        "edit",
                        goal
                      )
                    }
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="sav-action sav-action-danger"
                    onClick={() =>
                      openPanel(
                        goal.id,
                        "delete",
                        goal
                      )
                    }
                  >
                    Delete
                  </button>

                </div>

                {/* =================================================
                    ADD MONEY
                    ================================================= */}

                {panel === "add" && (
                  <form
                    className="sav-inline-panel"
                    onSubmit={(event) =>
                      handleContribute(
                        event,
                        goal.id
                      )
                    }
                  >

                    <p className="sav-panel-title">
                      Add real savings
                    </p>

                    <p className="sav-panel-current">
                      Currently saved:
                      {" "}
                      ₹{formatRupees(goal.saved)}
                    </p>

                    <input
                      className="sav-form-input"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Amount to add (₹)"
                      required
                      autoFocus
                      value={panelAmount}
                      onChange={(event) =>
                        setPanelAmount(
                          event.target.value
                        )
                      }
                    />

                    <div className="sav-inline-actions">

                      <button
                        type="submit"
                        className="sav-add-btn sav-btn-sm"
                        disabled={panelBusy}
                      >
                        {panelBusy
                          ? "Adding…"
                          : "Add"}
                      </button>

                      <button
                        type="button"
                        className="sav-cancel-btn"
                        onClick={closePanel}
                      >
                        Cancel
                      </button>

                    </div>

                    {panelError && (
                      <p className="sav-error">
                        {panelError}
                      </p>
                    )}

                  </form>
                )}

                {/* =================================================
                    EDIT
                    ================================================= */}

                {panel === "edit" && (
                  <form
                    className="sav-inline-panel"
                    onSubmit={(event) =>
                      handleEdit(
                        event,
                        goal.id
                      )
                    }
                  >

                    <p className="sav-panel-title">
                      Edit savings goal
                    </p>

                    <input
                      className="sav-form-input"
                      type="text"
                      placeholder="Goal name"
                      required
                      autoFocus
                      value={panelName}
                      onChange={(event) =>
                        setPanelName(
                          event.target.value
                        )
                      }
                    />

                    <input
                      className="sav-form-input"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Target (₹)"
                      required
                      value={panelTarget}
                      onChange={(event) =>
                        setPanelTarget(
                          event.target.value
                        )
                      }
                    />

                    <input
                      className="sav-form-input"
                      type="date"
                      value={panelDate}
                      onChange={(event) =>
                        setPanelDate(
                          event.target.value
                        )
                      }
                    />

                    <input
                      className="sav-form-input"
                      type="text"
                      placeholder="Description"
                      value={panelDescription}
                      onChange={(event) =>
                        setPanelDescription(
                          event.target.value
                        )
                      }
                    />

                    <div className="sav-inline-actions">

                      <button
                        type="submit"
                        className="sav-add-btn sav-btn-sm"
                        disabled={panelBusy}
                      >
                        {panelBusy
                          ? "Saving…"
                          : "Save"}
                      </button>

                      <button
                        type="button"
                        className="sav-cancel-btn"
                        onClick={closePanel}
                      >
                        Cancel
                      </button>

                    </div>

                    {panelError && (
                      <p className="sav-error">
                        {panelError}
                      </p>
                    )}

                  </form>
                )}

                {/* =================================================
                    DELETE CONFIRMATION
                    ================================================= */}

                {panel === "delete" && (
                  <div className="sav-inline-panel sav-confirm-delete">

                    <p className="sav-confirm-text">
                      Delete "{goal.name}"?
                      This can't be undone.
                    </p>

                    <div className="sav-inline-actions">

                      <button
                        type="button"
                        className="sav-action-danger sav-btn-sm sav-confirm-btn"
                        onClick={() =>
                          handleDelete(goal.id)
                        }
                        disabled={panelBusy}
                      >
                        {panelBusy
                          ? "Deleting…"
                          : "Yes, delete"}
                      </button>

                      <button
                        type="button"
                        className="sav-cancel-btn"
                        onClick={closePanel}
                      >
                        Cancel
                      </button>

                    </div>

                    {panelError && (
                      <p className="sav-error">
                        {panelError}
                      </p>
                    )}

                  </div>
                )}

              </div>
            );
          })}

        </div>
      )}

    </div>
  );
}