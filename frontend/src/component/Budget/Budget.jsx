import { useEffect, useMemo, useState } from "react";
import "./Budget.css";

const API_URL = "http://127.0.0.1:8000";

const CATEGORIES = [
  "Food",
  "Travel",
  "Shopping",
  "Education",
  "Entertainment",
  "Miscellaneous",
];

const CATEGORY_COLOR = {
  Food: "#C0392B",
  Travel: "#2563EB",
  Shopping: "#7C3AED",
  Education: "#16A34A",
  Entertainment: "#D97706",
  Miscellaneous: "#6B7280",
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function authHeaders() {
  const token = localStorage.getItem("token");

  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
}

/*
  Important:
  Avoid new Date("YYYY-MM-DD") because JavaScript treats
  date-only strings as UTC. This can cause month/day shifts
  in India timezone.
*/
function parseLocalDate(value) {
  if (!value) return null;

  const [year, month, day] = String(value)
    .slice(0, 10)
    .split("-")
    .map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function statusFor(spent, limit, hasBudget) {
  if (!hasBudget) {
    return {
      pct: 0,
      tone: "none",
      label: "No budget set",
    };
  }

  const pct = limit > 0 ? (spent / limit) * 100 : 0;

  if (pct > 100) {
    return {
      pct: Math.min(pct, 100),
      tone: "over",
      label: "Over budget",
    };
  }

  if (pct >= 85) {
    return {
      pct,
      tone: "warn",
      label: "Near limit",
    };
  }

  return {
    pct,
    tone: "ok",
    label: "On track",
  };
}

export default function Budget() {
  const now = new Date();

  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);

  const [formCategory, setFormCategory] = useState("");
  const [formAmount, setFormAmount] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const [monthIndex, setMonthIndex] = useState(0);

  // --------------------------------------------------
  // LOAD DATA
  // --------------------------------------------------

  const loadData = async () => {
    setLoading(true);
    setLoadError("");

    try {
      const [budgetsResponse, expensesResponse] = await Promise.all([
        fetch(`${API_URL}/budgets`, {
          headers: authHeaders(),
        }),

        fetch(`${API_URL}/expenses`, {
          headers: authHeaders(),
        }),
      ]);

      if (!budgetsResponse.ok || !expensesResponse.ok) {
        throw new Error("Failed to load budget data");
      }

      const budgetsData = await budgetsResponse.json();
      const expensesData = await expensesResponse.json();

      setBudgets(
        Array.isArray(budgetsData)
          ? budgetsData
          : budgetsData.items || []
      );

      setExpenses(
        Array.isArray(expensesData)
          ? expensesData
          : expensesData.items || []
      );
    } catch (error) {
      console.error(error);
      setLoadError(
        "Couldn't load budgets from the server. Please make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --------------------------------------------------
  // CURRENT MONTH EXPENSES
  // --------------------------------------------------

  const currentMonthExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const date = parseLocalDate(expense.expense_date);

      if (!date) return false;

      return (
        date.getMonth() + 1 === currentMonth &&
        date.getFullYear() === currentYear
      );
    });
  }, [expenses, currentMonth, currentYear]);

  // --------------------------------------------------
  // CATEGORY DATA
  // --------------------------------------------------

  const categoryData = useMemo(() => {
    return CATEGORIES.map((name) => {
      const budget =
        budgets.find(
          (item) =>
            item.category === name &&
            Number(item.month) === currentMonth &&
            Number(item.year) === currentYear
        ) || null;

      const spent = currentMonthExpenses
        .filter((expense) => expense.category === name)
        .reduce(
          (sum, expense) => sum + Number(expense.amount || 0),
          0
        );

      const limit = budget
        ? Number(budget.planned_amount || 0)
        : 0;

      return {
        name,
        budget,
        budgetId: budget?.id ?? null,
        spent,
        limit,
        hasBudget: Boolean(budget),
      };
    });
  }, [
    budgets,
    currentMonthExpenses,
    currentMonth,
    currentYear,
  ]);

  // --------------------------------------------------
  // SUMMARY
  // --------------------------------------------------

  const totalBudgeted = useMemo(() => {
    return categoryData.reduce(
      (sum, category) =>
        sum + (category.hasBudget ? category.limit : 0),
      0
    );
  }, [categoryData]);

  const totalSpent = useMemo(() => {
    return currentMonthExpenses.reduce(
      (sum, expense) =>
        sum + Number(expense.amount || 0),
      0
    );
  }, [currentMonthExpenses]);

  const budgetRemaining = totalBudgeted - totalSpent;

  const budgetedCategoryCount = categoryData.filter(
    (category) => category.hasBudget
  ).length;

  const unbudgetedCategories = categoryData
    .filter((category) => !category.hasBudget)
    .map((category) => category.name);

  const overallUsage =
    totalBudgeted > 0
      ? (totalSpent / totalBudgeted) * 100
      : 0;

  // --------------------------------------------------
  // WEEKLY SPENDING
  // --------------------------------------------------

  const weeklyData = useMemo(() => {
    const weeks = [1, 2, 3, 4, 5].map((week) => ({
      label: `Week ${week}`,
      total: 0,
    }));

    currentMonthExpenses.forEach((expense) => {
      const date = parseLocalDate(expense.expense_date);

      if (!date) return;

      const weekOfMonth = Math.min(
        5,
        Math.ceil(date.getDate() / 7)
      );

      weeks[weekOfMonth - 1].total += Number(
        expense.amount || 0
      );
    });

    const lastDay = new Date(
      currentYear,
      currentMonth,
      0
    ).getDate();

    const weeksInMonth = Math.ceil(lastDay / 7);

    return weeks.slice(0, weeksInMonth);
  }, [
    currentMonthExpenses,
    currentMonth,
    currentYear,
  ]);

  const maxWeek = Math.max(
    1,
    ...weeklyData.map((week) => week.total)
  );

  // --------------------------------------------------
  // MONTHLY HISTORY
  // --------------------------------------------------

  const monthlyHistory = useMemo(() => {
    const map = new Map();

    const ensureMonth = (year, month) => {
      const key = `${year}-${month}`;

      if (!map.has(key)) {
        map.set(key, {
          year,
          month,
          byCategory: Object.fromEntries(
            CATEGORIES.map((category) => [category, 0])
          ),
        });
      }

      return map.get(key);
    };

    ensureMonth(currentYear, currentMonth);

    expenses.forEach((expense) => {
      const date = parseLocalDate(expense.expense_date);

      if (!date) return;

      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      const entry = ensureMonth(year, month);

      if (
        entry.byCategory[expense.category] !== undefined
      ) {
        entry.byCategory[expense.category] += Number(
          expense.amount || 0
        );
      }
    });

    return Array.from(map.values()).sort(
      (a, b) =>
        b.year - a.year ||
        b.month - a.month
    );
  }, [
    expenses,
    currentMonth,
    currentYear,
  ]);

  const shownMonth =
    monthlyHistory[monthIndex] ||
    monthlyHistory[0];

  const shownMonthTotal = shownMonth
    ? Object.values(shownMonth.byCategory).reduce(
        (sum, value) => sum + value,
        0
      )
    : 0;

  // --------------------------------------------------
  // FORM
  // --------------------------------------------------

  const closeForm = () => {
    setFormOpen(false);
    setEditingBudget(null);
    setFormCategory("");
    setFormAmount("");
    setFormError("");
    setFormSuccess("");
  };

  const openCreateForm = (presetCategory = "") => {
    const defaultCategory =
      presetCategory ||
      unbudgetedCategories[0] ||
      CATEGORIES[0];

    setEditingBudget(null);
    setFormCategory(defaultCategory);
    setFormAmount("");
    setFormError("");
    setFormSuccess("");
    setFormOpen(true);
  };

  const openEditForm = (category) => {
    if (!category.budget) return;

    setEditingBudget(category.budget);
    setFormCategory(category.name);
    setFormAmount(
      String(category.budget.planned_amount)
    );
    setFormError("");
    setFormSuccess("");
    setFormOpen(true);
  };

  // --------------------------------------------------
  // CREATE / UPDATE
  // --------------------------------------------------

  const handleSubmitBudget = async (event) => {
    event.preventDefault();

    setFormError("");
    setFormSuccess("");

    const amount = Number(formAmount);

    if (!formCategory) {
      setFormError("Please select a category.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError(
        "Budget amount must be greater than ₹0."
      );
      return;
    }

    setSubmitting(true);

    try {
      const isEditing = Boolean(editingBudget);

      const url = isEditing
        ? `${API_URL}/budgets/${editingBudget.id}`
        : `${API_URL}/budgets`;

      const method = isEditing ? "PUT" : "POST";

      const body = isEditing
        ? {
            planned_amount: amount,
          }
        : {
            category: formCategory,
            month: currentMonth,
            year: currentYear,
            planned_amount: amount,
          };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(body),
      });

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        setFormError(
          data.detail ||
            (isEditing
              ? "Couldn't update that budget."
              : "Couldn't create that budget.")
        );

        return;
      }

      setFormSuccess(
        isEditing
          ? "Budget updated successfully."
          : "Budget created successfully."
      );

      await loadData();

      setTimeout(() => {
        closeForm();
      }, 500);
    } catch (error) {
      console.error(error);

      setFormError(
        "Cannot connect to the backend. Please check that FastAPI is running."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="bud-page">
        <div className="bud-loading">
          <div className="bud-spinner"></div>
          <p>Loading your budget...</p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="bud-page">
      <div className="bud-container">

        {/* HEADER */}
        <div className="bud-header">
          <div>
            <div className="bud-eyebrow">
              PERSONAL FINANCE
            </div>

            <h1>Budget</h1>

            <p>
              Set limits by category and track where
              you stand.
            </p>
          </div>

          <div className="bud-header-actions">
            <div className="bud-month-pill">
              {MONTH_NAMES[currentMonth - 1]}{" "}
              {currentYear}
            </div>

            <button
              className="bud-add-btn"
              onClick={() => openCreateForm()}
              disabled={
                unbudgetedCategories.length === 0
              }
            >
              <span>+</span>
              New budget
            </button>
          </div>
        </div>

        {/* ERROR */}
        {loadError && (
          <div className="bud-alert bud-alert-error">
            {loadError}
            <button onClick={loadData}>
              Retry
            </button>
          </div>
        )}


        {/* SUMMARY CARDS */}
        <div className="bud-summary-grid">

          <div className="bud-summary-card">
            <div className="bud-summary-label">
              TOTAL BUDGETED
            </div>

            <div className="bud-summary-value">
              ₹{totalBudgeted.toLocaleString("en-IN")}
            </div>

            <div className="bud-summary-note">
              Planned spending limit
            </div>
          </div>

          <div className="bud-summary-card">
            <div className="bud-summary-label">
              SPENT THIS MONTH
            </div>

            <div className="bud-summary-value">
              ₹{totalSpent.toLocaleString("en-IN")}
            </div>

            <div className="bud-summary-note">
              Actual expenses
            </div>
          </div>

          <div
            className={`bud-summary-card ${
              budgetRemaining < 0
                ? "bud-summary-danger"
                : ""
            }`}
          >
            <div className="bud-summary-label">
              BUDGET REMAINING
            </div>

            <div className="bud-summary-value">
              ₹
              {Math.abs(
                budgetRemaining
              ).toLocaleString("en-IN")}
            </div>

            <div className="bud-summary-note">
              {budgetRemaining < 0
                ? "Over planned budget"
                : "Available within budget"}
            </div>
          </div>

          <div className="bud-summary-card">
            <div className="bud-summary-label">
              BUDGET COVERAGE
            </div>

            <div className="bud-summary-value">
              {budgetedCategoryCount}/{CATEGORIES.length}
            </div>

            <div className="bud-summary-note">
              Categories planned
            </div>
          </div>
        </div>

        {/* OVERALL USAGE */}
        <section className="bud-section">
          <div className="bud-section-heading">
            <div>
              <h2>Overall budget usage</h2>

              <p>
                {overallUsage.toFixed(0)}% of your planned
                budget has been used.
              </p>
            </div>

            <strong>
              {overallUsage.toFixed(0)}%
            </strong>
          </div>

          <div className="bud-overall-track">
            <div
              className={`bud-overall-fill ${
                overallUsage > 100
                  ? "is-over"
                  : overallUsage >= 85
                  ? "is-warning"
                  : ""
              }`}
              style={{
                width: `${Math.min(
                  overallUsage,
                  100
                )}%`,
              }}
            ></div>
          </div>
        </section>

        {/* CATEGORY BUDGETS */}
        <section className="bud-section">
          <div className="bud-section-heading">
            <div>
              <h2>Category budgets</h2>

              <p>
                Monitor each spending category for{" "}
                {MONTH_NAMES[currentMonth - 1]}.
              </p>
            </div>
          </div>

          <div className="bud-category-grid">

            {categoryData.map((category) => {
              const status = statusFor(
                category.spent,
                category.limit,
                category.hasBudget
              );

              return (
                <div
                  className={`bud-category-card ${status.tone}`}
                  key={category.name}
                >
                  <div className="bud-category-top">

                    <div className="bud-category-title">
                      <span
                        className="bud-category-dot"
                        style={{
                          background:
                            CATEGORY_COLOR[
                              category.name
                            ],
                        }}
                      ></span>

                      <h3>{category.name}</h3>
                    </div>

                    <span
                      className={`bud-status ${status.tone}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div className="bud-category-numbers">

                    <div>
                      <span>Spent</span>
                      <strong>
                        ₹
                        {category.spent.toLocaleString(
                          "en-IN"
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Limit</span>
                      <strong>
                        {category.hasBudget
                          ? `₹${category.limit.toLocaleString(
                              "en-IN"
                            )}`
                          : "—"}
                      </strong>
                    </div>
                  </div>

                  <div className="bud-progress">
                    <div
                      className={`bud-progress-fill ${status.tone}`}
                      style={{
                        width: `${status.pct}%`,
                      }}
                    ></div>
                  </div>

                  <div className="bud-category-bottom">

                    <span>
                      {category.hasBudget
                        ? `${Math.round(
                            status.pct
                          )}% used`
                        : "No budget set"}
                    </span>

                    <button
                      className="bud-edit-btn"
                      onClick={() =>
                        category.hasBudget
                          ? openEditForm(category)
                          : openCreateForm(
                              category.name
                            )
                      }
                    >
                      {category.hasBudget
                        ? "Edit budget"
                        : "Set budget"}
                    </button>
                  </div>
                </div>
              );
            })}

          </div>
        </section>

        {/* WEEKLY SPENDING */}
        <section className="bud-section">
          <div className="bud-section-heading">
            <div>
              <h2>Weekly spending</h2>

              <p>
                Your actual expenses grouped by week.
              </p>
            </div>
          </div>

          <div className="bud-week-chart">

            {weeklyData.map((week) => {
              const height =
                week.total === 0
                  ? 4
                  : Math.max(
                      8,
                      (week.total / maxWeek) * 100
                    );

              return (
                <div
                  className="bud-week-column"
                  key={week.label}
                >
                  <div className="bud-week-value">
                    ₹
                    {week.total.toLocaleString(
                      "en-IN"
                    )}
                  </div>

                  <div className="bud-week-bar-area">
                    <div
                      className="bud-week-bar"
                      style={{
                        height: `${height}%`,
                      }}
                    ></div>
                  </div>

                  <span>{week.label}</span>
                </div>
              );
            })}

          </div>
        </section>

        {/* MONTHLY HISTORY */}
        <section className="bud-section">
          <div className="bud-section-heading">
            <div>
              <h2>Monthly expense history</h2>

              <p>
                Review how your expenses were distributed
                across categories.
              </p>
            </div>

            <div className="bud-history-controls">
              <button
                onClick={() =>
                  setMonthIndex((index) =>
                    Math.min(
                      index + 1,
                      monthlyHistory.length - 1
                    )
                  )
                }
                disabled={
                  monthIndex >=
                  monthlyHistory.length - 1
                }
              >
                ← Older
              </button>

              <button
                onClick={() =>
                  setMonthIndex((index) =>
                    Math.max(index - 1, 0)
                  )
                }
                disabled={monthIndex === 0}
              >
                Newer →
              </button>
            </div>
          </div>

          {shownMonth && (
            <div className="bud-history-card">

              <div className="bud-history-header">
                <div>
                  <h3>
                    {MONTH_NAMES[
                      shownMonth.month - 1
                    ]}{" "}
                    {shownMonth.year}
                  </h3>

                  <p>
                    Total expenses
                  </p>
                </div>

                <strong>
                  ₹
                  {shownMonthTotal.toLocaleString(
                    "en-IN"
                  )}
                </strong>
              </div>

              <div className="bud-history-list">

                {CATEGORIES.map((category) => {
                  const amount =
                    shownMonth.byCategory[
                      category
                    ] || 0;

                  const percentage =
                    shownMonthTotal > 0
                      ? (amount /
                          shownMonthTotal) *
                        100
                      : 0;

                  return (
                    <div
                      className="bud-history-row"
                      key={category}
                    >
                      <div className="bud-history-name">
                        <span
                          className="bud-category-dot"
                          style={{
                            background:
                              CATEGORY_COLOR[
                                category
                              ],
                          }}
                        ></span>

                        <span>{category}</span>
                      </div>

                      <div className="bud-history-bar">
                        <div
                          style={{
                            width: `${percentage}%`,
                            background:
                              CATEGORY_COLOR[
                                category
                              ],
                          }}
                        ></div>
                      </div>

                      <strong>
                        ₹
                        {amount.toLocaleString(
                          "en-IN"
                        )}
                      </strong>
                    </div>
                  );
                })}

              </div>
            </div>
          )}
        </section>

        {/* FORM MODAL */}
        {formOpen && (
          <div
            className="bud-modal-backdrop"
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget
              ) {
                closeForm();
              }
            }}
          >
            <div className="bud-modal">

              <div className="bud-modal-header">
                <div>
                  <span className="bud-modal-eyebrow">
                    {editingBudget
                      ? "UPDATE BUDGET"
                      : "NEW BUDGET"}
                  </span>

                  <h2>
                    {editingBudget
                      ? "Edit budget"
                      : "Create budget"}
                  </h2>
                </div>

                <button
                  className="bud-modal-close"
                  onClick={closeForm}
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={handleSubmitBudget}
              >

                <label>
                  Category
                </label>

                <select
                  value={formCategory}
                  onChange={(event) =>
                    setFormCategory(
                      event.target.value
                    )
                  }
                  disabled={Boolean(
                    editingBudget
                  )}
                >
                  {CATEGORIES.map((category) => (
                    <option
                      key={category}
                      value={category}
                      disabled={
                        !editingBudget &&
                        !unbudgetedCategories.includes(
                          category
                        )
                      }
                    >
                      {category}
                    </option>
                  ))}
                </select>

                {editingBudget && (
                  <p className="bud-field-note">
                    Category cannot be changed while
                    editing this budget.
                  </p>
                )}

                <label>
                  Monthly budget amount
                </label>

                <div className="bud-input-wrapper">
                  <span>₹</span>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formAmount}
                    onChange={(event) =>
                      setFormAmount(
                        event.target.value
                      )
                    }
                    placeholder="2500"
                    required
                  />
                </div>

                <p className="bud-field-note">
                  This budget applies to{" "}
                  {MONTH_NAMES[currentMonth - 1]}{" "}
                  {currentYear}.
                </p>

                {formError && (
                  <div className="bud-form-error">
                    {formError}
                  </div>
                )}

                {formSuccess && (
                  <div className="bud-form-success">
                    {formSuccess}
                  </div>
                )}

                <div className="bud-modal-actions">

                  <button
                    type="button"
                    className="bud-cancel-btn"
                    onClick={closeForm}
                    disabled={submitting}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="bud-save-btn"
                    disabled={submitting}
                  >
                    {submitting
                      ? "Saving..."
                      : editingBudget
                      ? "Update budget"
                      : "Create budget"}
                  </button>

                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}