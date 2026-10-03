import "./FinancialSummary.css";

function formatCurrency(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "₹0";
  }

  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

function SummaryCard({
  title,
  value,
  description,
  icon,
  type,
  loading,
}) {
  return (
    <div className={`fs-card fs-${type}`}>
      <div className="fs-card-top">
        <div className="fs-icon">
          {icon}
        </div>

        <span className="fs-label">
          {title}
        </span>
      </div>

      <div className="fs-value">
        {loading
          ? "Loading..."
          : formatCurrency(value)}
      </div>

      <div className="fs-description">
        {description}
      </div>
    </div>
  );
}

export default function FinancialSummary({
  summary,
  loading,
}) {
  const safeSummary = {
    total_income:
      Number(
        summary?.total_income
      ) || 0,

    total_expenses:
      Number(
        summary?.total_expenses
      ) || 0,

    remaining_balance:
      Number(
        summary?.remaining_balance
      ) || 0,

    total_saved:
      Number(
        summary?.total_saved
      ) || 0,
  };

  return (
    <section className="fs-section">
      <div className="fs-section-heading">
        <div>
          <span className="fs-section-kicker">
            OVERVIEW
          </span>

          <h2>
            Financial Summary
          </h2>
        </div>
      </div>

      <div className="fs-grid">
        <SummaryCard
          title="Total Income"
          value={
            safeSummary.total_income
          }
          description="All recorded income"
          icon="↑"
          type="income"
          loading={loading}
        />

        <SummaryCard
          title="Total Expenses"
          value={
            safeSummary.total_expenses
          }
          description="All recorded spending"
          icon="↓"
          type="expense"
          loading={loading}
        />

        <SummaryCard
          title="Remaining Balance"
          value={
            safeSummary.remaining_balance
          }
          description="Income minus expenses"
          icon="₹"
          type="balance"
          loading={loading}
        />

        <SummaryCard
          title="Total Saved"
          value={
            safeSummary.total_saved
          }
          description="Current savings amount"
          icon="✓"
          type="saved"
          loading={loading}
        />
      </div>
    </section>
  );
}