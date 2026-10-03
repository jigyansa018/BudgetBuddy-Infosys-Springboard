import { useCallback, useEffect, useState } from "react";
import "./Analytics.css";

import FinancialSummary from "./FinancialSummary";
import IncomeExpenseChart from "./IncomeExpenseChart";
import CategorySpending from "./CategorySpending";
import SavingsProgress from "./SavingsProgress";

const API_URL = import.meta.env.VITE_API_URL;

/* ============================================================
   API HELPERS
   ============================================================ */

function getAuthHeaders() {
  const token = localStorage.getItem("token");

  return {
    Authorization: `Bearer ${token || ""}`,
    "Content-Type": "application/json",
  };
}

function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function getArray(data, keys = []) {
  if (Array.isArray(data)) {
    return data;
  }

  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  return [];
}

/* ============================================================
   LAST 6 MONTHS
   ============================================================ */

function getLastSixMonths() {
  const months = [];
  const now = new Date();

  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(
      now.getFullYear(),
      now.getMonth() - i,
      1
    );

    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    months.push({
      key: `${year}-${month}`,

      label: date.toLocaleDateString("en-IN", {
        month: "short",
      }),

      fullLabel: date.toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      }),

      income: 0,
      expense: 0,
      balance: 0,
    });
  }

  return months;
}

/* ============================================================
   MONTH KEY
   ============================================================ */

function getMonthKey(item) {
  const monthValue = item?.month;

  if (typeof monthValue === "string") {
    const match = monthValue.match(
      /^(\d{4})-(\d{1,2})/
    );

    if (match) {
      return `${match[1]}-${String(
        match[2]
      ).padStart(2, "0")}`;
    }
  }

  if (
    item?.year !== undefined &&
    item?.month !== undefined
  ) {
    const year = Number(item.year);
    const month = Number(item.month);

    if (
      Number.isFinite(year) &&
      Number.isFinite(month) &&
      month >= 1 &&
      month <= 12
    ) {
      return `${year}-${String(month).padStart(
        2,
        "0"
      )}`;
    }
  }

  return "";
}

/* ============================================================
   SAVINGS NORMALIZATION
   ============================================================ */

function normalizeSavings(data) {
  const rawSavings = getArray(data, [
    "goals",
    "savings",
    "savings_progress",
    "data",
  ]);

  return rawSavings.map((item, index) => {
    const target = toNumber(
      item?.target_amount ??
        item?.target ??
        item?.goal_amount ??
        0
    );

    const current = toNumber(
      item?.current_amount ??
        item?.current ??
        item?.saved_amount ??
        item?.amount_saved ??
        0
    );

    let progress = toNumber(
      item?.progress_percentage ??
        item?.progress_percent ??
        item?.percentage ??
        item?.progress ??
        0
    );

    if (
      progress === 0 &&
      target > 0
    ) {
      progress = (current / target) * 100;
    }

    progress = Math.max(
      0,
      Math.min(Math.round(progress), 100)
    );

    return {
      id:
        item?.id ??
        `savings-${index}`,

      name:
        item?.name ??
        item?.goal_name ??
        item?.title ??
        `Savings Goal ${index + 1}`,

      target,

      current,

      progress,

      status:
        item?.status ??
        (progress >= 100
          ? "completed"
          : "active"),

      target_date:
        item?.target_date ??
        item?.deadline ??
        null,

      description:
        item?.description ?? "",
    };
  });
}

/* ============================================================
   ANALYTICS PAGE
   ============================================================ */

export default function Analytics() {
  const [summary, setSummary] = useState({
    total_income: 0,
    total_expenses: 0,
    remaining_balance: 0,
    total_saved: 0,
  });

  const [monthlyData, setMonthlyData] = useState([]);

  const [categoryData, setCategoryData] = useState([]);

  const [savingsData, setSavingsData] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  /* ==========================================================
     LOAD ANALYTICS
     ========================================================== */

  const loadAnalytics = useCallback(
    async (showLoading = true) => {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("You are not logged in.");
        setLoading(false);
        return;
      }

      try {
        if (showLoading) {
          setLoading(true);
        }

        setError("");

        const [
          summaryResponse,
          categoryResponse,
          monthlyResponse,
          savingsResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/analytics/summary`,
            {
              method: "GET",
              headers: getAuthHeaders(),
            }
          ),

          fetch(
            `${API_URL}/analytics/expenses-by-category`,
            {
              method: "GET",
              headers: getAuthHeaders(),
            }
          ),

          fetch(
            `${API_URL}/analytics/monthly-trends`,
            {
              method: "GET",
              headers: getAuthHeaders(),
            }
          ),

          fetch(
            `${API_URL}/analytics/savings-progress`,
            {
              method: "GET",
              headers: getAuthHeaders(),
            }
          ),
        ]);

        /* ------------------------------------------------------
           AUTH ERROR
           ------------------------------------------------------ */

        const responses = [
          summaryResponse,
          categoryResponse,
          monthlyResponse,
          savingsResponse,
        ];

        if (
          responses.some(
            (response) => response.status === 401
          )
        ) {
          throw new Error(
            "Your session has expired. Please login again."
          );
        }

        /* ------------------------------------------------------
           API ERRORS
           ------------------------------------------------------ */

        if (!summaryResponse.ok) {
          throw new Error(
            "Unable to load financial summary."
          );
        }

        if (!categoryResponse.ok) {
          throw new Error(
            "Unable to load category spending."
          );
        }

        if (!monthlyResponse.ok) {
          throw new Error(
            "Unable to load monthly trends."
          );
        }

        if (!savingsResponse.ok) {
          throw new Error(
            "Unable to load savings progress."
          );
        }

        /* ------------------------------------------------------
           PARSE JSON
           ------------------------------------------------------ */

        const summaryData =
          await summaryResponse.json();

        const categoryResponseData =
          await categoryResponse.json();

        const monthlyResponseData =
          await monthlyResponse.json();

        const savingsResponseData =
          await savingsResponse.json();

        /* ======================================================
           1. FINANCIAL SUMMARY
           ====================================================== */

        const totalIncome = toNumber(
          summaryData?.total_income ??
            summaryData?.income ??
            0
        );

        const totalExpenses = toNumber(
          summaryData?.total_expenses ??
            summaryData?.expenses ??
            0
        );

        const remainingBalance = toNumber(
          summaryData?.remaining_balance ??
            summaryData?.balance ??
            totalIncome - totalExpenses
        );

        const totalSaved = toNumber(
          summaryData?.total_saved ??
            summaryData?.saved ??
            0
        );

        setSummary({
          total_income: totalIncome,
          total_expenses: totalExpenses,
          remaining_balance:
            remainingBalance,
          total_saved: totalSaved,
        });

        /* ======================================================
           2. CATEGORY SPENDING
           ====================================================== */

        const categories = getArray(
          categoryResponseData,
          [
            "data",
            "categories",
            "expenses_by_category",
            "expense_by_category",
          ]
        );

        const mappedCategories =
          categories
            .map((item) => {
              const name =
                item?.category ??
                item?.name ??
                item?.category_name ??
                "Other";

              const amount = toNumber(
                item?.amount ??
                  item?.total ??
                  item?.expenses ??
                  item?.spent_amount ??
                  item?.total_amount ??
                  0
              );

              return {
                name,
                amount,
              };
            })
            .filter(
              (item) => item.amount > 0
            );

        const categoryTotal =
          mappedCategories.reduce(
            (sum, item) =>
              sum + item.amount,
            0
          );

        const finalCategories =
          mappedCategories.map(
            (item) => ({
              ...item,

              percentage:
                categoryTotal > 0
                  ? Math.round(
                      (item.amount /
                        categoryTotal) *
                        100
                    )
                  : 0,
            })
          );

        setCategoryData(
          finalCategories
        );

        /* ======================================================
           3. MONTHLY TRENDS
           ====================================================== */

        const backendMonths =
          getArray(
            monthlyResponseData,
            [
              "data",
              "trends",
              "monthly_data",
            ]
          );

        const sixMonths =
          getLastSixMonths();

        backendMonths.forEach(
          (item) => {
            const key =
              getMonthKey(item);

            if (!key) {
              return;
            }

            const month =
              sixMonths.find(
                (entry) =>
                  entry.key === key
              );

            if (!month) {
              return;
            }

            month.income = toNumber(
              item?.income ??
                item?.total_income ??
                0
            );

            month.expense =
              toNumber(
                item?.expenses ??
                  item?.expense ??
                  item?.total_expenses ??
                  0
              );

            month.balance =
              toNumber(
                item?.balance ??
                  month.income -
                    month.expense
              );
          }
        );

        setMonthlyData(
          sixMonths
        );

        /* ======================================================
           4. SAVINGS
           ====================================================== */

        const normalizedSavings =
          normalizeSavings(
            savingsResponseData
          );

        setSavingsData(
          normalizedSavings
        );
      } catch (err) {
        console.error(
          "Analytics error:",
          err
        );

        setError(
          err?.message ||
            "Unable to load analytics."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /* ==========================================================
     INITIAL LOAD
     ========================================================== */

  useEffect(() => {
    loadAnalytics(true);
  }, [loadAnalytics]);

  /* ==========================================================
     AUTO REFRESH
     ========================================================== */

  useEffect(() => {
    const intervalId =
      window.setInterval(() => {
        loadAnalytics(false);
      }, 30000);

    return () => {
      window.clearInterval(
        intervalId
      );
    };
  }, [loadAnalytics]);

  /* ==========================================================
     REFRESH WHEN TAB BECOMES VISIBLE
     ========================================================== */

  useEffect(() => {
    const handleVisibility =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          loadAnalytics(false);
        }
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, [loadAnalytics]);

  /* ==========================================================
     UI
     ========================================================== */

  return (
    <div className="an-page">
      {/* HEADER */}

      <header className="an-header">
        <div>
          <div className="an-eyebrow">
            FINANCIAL INSIGHTS
          </div>

          <h1 className="an-title">
            Analytics Dashboard
          </h1>

          <p className="an-subtitle">
            Understand your income,
            spending and savings at a
            glance.
          </p>
        </div>

        <button
          type="button"
          className="an-refresh-btn"
          onClick={() =>
            loadAnalytics(true)
          }
          disabled={loading}
        >
          <span className="an-refresh-icon">
            ↻
          </span>

          {loading
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </header>

      {/* ERROR */}

      {error && (
        <div className="an-error">
          <div className="an-error-content">
            <div className="an-error-title">
              Analytics could not be loaded
            </div>

            <div className="an-error-message">
              {error}
            </div>
          </div>

          <button
            type="button"
            className="an-retry-btn"
            onClick={() =>
              loadAnalytics(true)
            }
          >
            Retry
          </button>
        </div>
      )}

      {/* SUMMARY */}

      <FinancialSummary
        summary={summary}
        loading={loading}
      />

      {/* CHARTS */}

      <section className="an-dashboard-grid">
        <IncomeExpenseChart
          data={monthlyData}
          loading={loading}
        />

        <CategorySpending
          data={categoryData}
          loading={loading}
        />
      </section>

      {/* SAVINGS */}

      <SavingsProgress
        data={savingsData}
        loading={loading}
      />
    </div>
  );
}