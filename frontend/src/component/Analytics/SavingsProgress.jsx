import "./SavingsProgress.css";

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: 0,
    }
  )}`;
}

function LoadingState() {
  return (
    <div className="sp-state">
      <div className="sp-spinner" />

      <span>
        Loading savings goals...
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="sp-state">
      <div className="sp-empty-icon">
        ◎
      </div>

      <strong>
        No savings goals yet
      </strong>

      <span>
        Create a savings goal to track
        your progress here.
      </span>
    </div>
  );
}

function GoalCard({ goal }) {
  const progress = Math.max(
    0,
    Math.min(
      Number(goal?.progress) || 0,
      100
    )
  );

  const current =
    Number(goal?.current) || 0;

  const target =
    Number(goal?.target) || 0;

  const remaining = Math.max(
    target - current,
    0
  );

  const completed =
    progress >= 100 ||
    goal?.status === "completed";

  return (
    <article className="sp-goal">
      <div className="sp-goal-header">
        <div className="sp-goal-title-area">
          <div className="sp-goal-icon">
            {completed ? "✓" : "₹"}
          </div>

          <div>
            <h3>
              {goal?.name ||
                "Savings Goal"}
            </h3>

            {goal?.description && (
              <p>
                {goal.description}
              </p>
            )}
          </div>
        </div>

        <span
          className={`sp-status ${
            completed
              ? "sp-status-complete"
              : "sp-status-active"
          }`}
        >
          {completed
            ? "Completed"
            : `${progress}%`}
        </span>
      </div>

      <div className="sp-progress-wrapper">
        <div className="sp-progress-track">
          <div
            className="sp-progress-fill"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>

        <span className="sp-progress-value">
          {progress}%
        </span>
      </div>

      <div className="sp-amount-row">
        <div>
          <span className="sp-amount-label">
            Saved
          </span>

          <strong>
            {formatCurrency(current)}
          </strong>
        </div>

        <div className="sp-amount-right">
          <span className="sp-amount-label">
            Target
          </span>

          <strong>
            {formatCurrency(target)}
          </strong>
        </div>
      </div>

      {!completed &&
        remaining > 0 && (
          <div className="sp-remaining">
            <span>
              Remaining
            </span>

            <strong>
              {formatCurrency(
                remaining
              )}
            </strong>
          </div>
        )}
    </article>
  );
}

export default function SavingsProgress({
  data,
  loading,
}) {
  const goals = Array.isArray(data)
    ? data
    : [];

  return (
    <section className="sp-section">
      <div className="sp-header">
        <div>
          <span className="sp-kicker">
            SAVINGS
          </span>

          <h2>
            Savings Progress
          </h2>

          <p>
            Track your progress toward
            your financial goals.
          </p>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : goals.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="sp-grid">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
            />
          ))}
        </div>
      )}
    </section>
  );
}