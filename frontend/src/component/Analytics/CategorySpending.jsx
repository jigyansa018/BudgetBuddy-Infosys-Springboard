import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import "./CategorySpending.css";

const PIE_COLORS = [
  "#315c3d",
  "#5e8f53",
  "#8eb45e",
  "#b7d875",
  "#d6e99b",
  "#719b8b",
  "#a7c4b4",
  "#d1ddd5",
];

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: 0,
    }
  )}`;
}

function CustomTooltip({
  active,
  payload,
}) {
  if (
    !active ||
    !payload ||
    payload.length === 0
  ) {
    return null;
  }

  const item = payload[0]?.payload;

  if (!item) {
    return null;
  }

  return (
    <div className="cs-tooltip">
      <strong>
        {item.name}
      </strong>

      <span>
        {formatCurrency(item.amount)}
      </span>

      <small>
        {item.percentage}%
      </small>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="cs-state">
      <div className="cs-spinner" />
      <span>
        Loading spending data...
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="cs-state">
      <div className="cs-empty-icon">
        ◌
      </div>

      <strong>
        No spending data yet
      </strong>

      <span>
        Add an expense to see category
        spending.
      </span>
    </div>
  );
}

export default function CategorySpending({
  data,
  loading,
}) {
  const chartData = Array.isArray(data)
    ? data
    : [];

  const total = chartData.reduce(
    (sum, item) =>
      sum + Number(item.amount || 0),
    0
  );

  return (
    <section className="cs-card">
      <div className="cs-header">
        <div>
          <span className="cs-kicker">
            SPENDING
          </span>

          <h2>
            Category-wise Spending
          </h2>

          <p>
            See where your expenses are
            going.
          </p>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : chartData.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="cs-chart-area">
            <div className="cs-donut">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="58%"
                    outerRadius="78%"
                    paddingAngle={2}
                    stroke="none"
                  >
                    {chartData.map(
                      (item, index) => (
                        <Cell
                          key={`${item.name}-${index}`}
                          fill={
                            PIE_COLORS[
                              index %
                                PIE_COLORS.length
                            ]
                          }
                        />
                      )
                    )}
                  </Pie>

                  <Tooltip
                    content={
                      <CustomTooltip />
                    }
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="cs-center">
                <span>
                  Total
                </span>

                <strong>
                  {formatCurrency(total)}
                </strong>
              </div>
            </div>
          </div>

          <div className="cs-list">
            {chartData.map(
              (item, index) => (
                <div
                  className="cs-item"
                  key={`${item.name}-${index}`}
                >
                  <div className="cs-item-left">
                    <span
                      className="cs-dot"
                      style={{
                        background:
                          PIE_COLORS[
                            index %
                              PIE_COLORS.length
                          ],
                      }}
                    />

                    <span className="cs-name">
                      {item.name}
                    </span>
                  </div>

                  <div className="cs-item-right">
                    <strong>
                      {formatCurrency(
                        item.amount
                      )}
                    </strong>

                    <span>
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              )
            )}
          </div>
        </>
      )}
    </section>
  );
}