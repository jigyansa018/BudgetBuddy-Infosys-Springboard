import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import "./IncomeExpenseChart.css";

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
  label,
}) {
  if (
    !active ||
    !payload ||
    payload.length === 0
  ) {
    return null;
  }

  return (
    <div className="iec-tooltip">
      <div className="iec-tooltip-title">
        {label}
      </div>

      {payload.map((item) => (
        <div
          key={item.dataKey}
          className="iec-tooltip-row"
        >
          <span>
            {item.name}
          </span>

          <strong>
            {formatCurrency(item.value)}
          </strong>
        </div>
      ))}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="iec-state">
      <div className="iec-spinner" />
      <span>
        Loading monthly trends...
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="iec-state">
      <div className="iec-empty-icon">
        ◌
      </div>

      <strong>
        No monthly data yet
      </strong>

      <span>
        Add income or expenses to see
        your monthly trends.
      </span>
    </div>
  );
}

export default function IncomeExpenseChart({
  data,
  loading,
}) {
  const chartData = Array.isArray(data)
    ? data
    : [];

  return (
    <section className="iec-card">
      <div className="iec-header">
        <div>
          <span className="iec-kicker">
            TREND
          </span>

          <h2>
            Income & Expense Summary
          </h2>

          <p>
            Monthly income compared with
            recorded expenses.
          </p>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : chartData.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="iec-chart">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={chartData}
              margin={{
                top: 10,
                right: 8,
                left: 0,
                bottom: 0,
              }}
              barGap={6}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e7ece8"
              />

              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "#718078",
                  fontSize: 12,
                }}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "#718078",
                  fontSize: 11,
                }}
                tickFormatter={(value) =>
                  `₹${Number(value).toLocaleString(
                    "en-IN"
                  )}`
                }
                width={65}
              />

              <Tooltip
                content={
                  <CustomTooltip />
                }
              />

              <Legend
                verticalAlign="bottom"
                height={35}
                iconType="circle"
              />

              <Bar
                dataKey="income"
                name="Income"
                fill="#4b9b60"
                radius={[
                  5,
                  5,
                  0,
                  0,
                ]}
                maxBarSize={34}
              />

              <Bar
                dataKey="expense"
                name="Expenses"
                fill="#e27575"
                radius={[
                  5,
                  5,
                  0,
                  0,
                ]}
                maxBarSize={34}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}