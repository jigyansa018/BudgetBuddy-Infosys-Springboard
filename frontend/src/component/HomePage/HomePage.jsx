import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../../pages/Logo";
import "./HomePage.css";

const API_URL = import.meta.env.VITE_API_URL;

async function apiRequest(endpoint, token) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error("Unauthorized");
    const errorText = await response.text();
    throw new Error(errorText || `Request failed: ${response.status}`);
  }
  return response.json();
}

function asArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function getAmount(item) { return Number(item?.amount ?? item?.total ?? item?.value ?? 0); }
function getItemDate(item) { return item?.expense_date ?? item?.date ?? item?.created_at ?? null; }

function getStartOfWeek() {
  const now = new Date();
  const day = now.getDay();
  const difference = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + difference);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function calculateWeeklyExpenses(expenses) {
  const startOfWeek = getStartOfWeek();
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => ({ day, amount: 0 }));
  expenses.forEach(expense => {
    const dateValue = getItemDate(expense);
    if (!dateValue) return;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return;
    const difference = Math.floor((date.getTime() - startOfWeek.getTime()) / (1000 * 60 * 60 * 24));
    if (difference >= 0 && difference <= 6) days[difference].amount += getAmount(expense);
  });
  return days;
}

function useCountUp(target, active, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) { setValue(0); return; }
    let start = null;
    let frame;
    const step = timestamp => {
      if (start === null) start = timestamp;
      const progress = Math.min(1, (timestamp - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(Number(target || 0) * eased));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => { if (frame) cancelAnimationFrame(frame); };
  }, [active, target, duration]);
  return value;
}

function HomePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dashboard, setDashboard] = useState({ balance: 0, income: 0, spent: 0, saved: 0 });
  const [goal, setGoal] = useState({ label: "No savings goal", target: 0, saved: 0, percentage: 0 });
  const [weeklyExpenses, setWeeklyExpenses] = useState(
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => ({ day, amount: 0 }))
  );

  const balanceDisplay = useCountUp(dashboard.balance, revealed, 1000);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboard = useCallback(async (showLoading = false) => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    try {
      if (showLoading) setLoading(true);
      setError("");
      const userData = await apiRequest("/auth/me", token);
      setUser(userData);

      const summary = await apiRequest("/analytics/summary", token);
      setDashboard({
        balance: Number(summary?.remaining_balance ?? 0),
        income: Number(summary?.total_income ?? 0),
        spent: Number(summary?.total_expenses ?? 0),
        saved: Number(summary?.total_saved ?? 0),
      });

      const savingsData = await apiRequest("/analytics/savings-progress", token);
      const savingsList = asArray(savingsData);
      if (savingsList.length > 0) {
        const firstGoal = savingsList[0];
        const target = Number(firstGoal?.target_amount ?? firstGoal?.target ?? 0);
        const saved = Number(firstGoal?.current_amount ?? firstGoal?.saved_amount ?? 0);
        const percentage = Number(firstGoal?.progress_percentage) || (target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0);
        setGoal({ label: firstGoal?.name || firstGoal?.goal_name || "Savings goal", target, saved, percentage: Math.min(100, percentage) });
      } else {
        setGoal({ label: "No savings goal", target: 0, saved: 0, percentage: 0 });
      }

      const expenseData = await apiRequest("/expenses", token);
      setWeeklyExpenses(calculateWeeklyExpenses(asArray(expenseData)));
      requestAnimationFrame(() => setRevealed(true));
    } catch (err) {
      console.error("Dashboard loading error:", err);
      if (err.message === "Unauthorized") { localStorage.removeItem("token"); navigate("/login"); return; }
      setError("Unable to load latest financial data.");
    } finally { setLoading(false); }
  }, [navigate]);

  useEffect(() => { loadDashboard(true); }, [loadDashboard]);
  useEffect(() => {
    const interval = setInterval(() => loadDashboard(false), 30000);
    return () => clearInterval(interval);
  }, [loadDashboard]);
  useEffect(() => {
    const handleVisibilityChange = () => { if (document.visibilityState === "visible") loadDashboard(false); };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [loadDashboard]);

  const logout = () => { localStorage.removeItem("token"); navigate("/login"); };
  const rupee = number => `₹${Number(number || 0).toLocaleString("en-IN")}`;
  const maxWeek = Math.max(...weeklyExpenses.map(day => day.amount), 1);
  const formattedDate = currentDate.toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" });

  if (loading && !user) return <div className="home-loading"><p>opening the ledger…</p></div>;

  return (
    <div className="home-page">
      <div className="home-accent"><div className="home-accent-green" /><div className="home-accent-lime" /></div>
      <header className="home-header">
        <button onClick={() => navigate("/")} className="home-logo-button" aria-label="Go to home"><Logo size={30} tone="dark" /></button>
        <div className="home-header-right">
          {error && <span className="home-error">{error}</span>}
          <button onClick={logout} className="home-signout">Sign out</button>
        </div>
      </header>

      <main className="home-main">
        <section className={`home-hero ${revealed ? "home-visible" : "home-hidden"}`}>
          <p className="home-date">{formattedDate}</p>
          <h1 className="home-title">Good to see you, {user?.full_name?.split(" ")[0] || "there"}</h1>
          <div className="home-balance-card">
            <p className="home-balance-label">current balance</p>
            <p className="home-balance-value">{rupee(balanceDisplay)}</p>
          </div>
        </section>

        <section className="home-ledger">
          <LedgerRow label="Income this month" value={dashboard.income} tone="green" revealed={revealed} delay={0} />
          <LedgerRow label="Spent this month" value={dashboard.spent} tone="brick" revealed={revealed} delay={90} />
          <LedgerRow label="Total saved" value={dashboard.saved} tone="gold" revealed={revealed} delay={180} />
        </section>

        <div className="home-data-grid">
          <div className="home-week-section">
            <h2 className="home-section-title">This week's spending</h2>
            <div className="home-week-chart">
              {weeklyExpenses.map((day, index) => {
                const ratio = day.amount / maxWeek;
                const barColor = ratio > 0.75 ? "home-bar-brick" : ratio > 0.4 ? "home-bar-gold" : "home-bar-green";
                return (
                  <div key={day.day} className="home-day-column">
                    <div className={`home-bar ${barColor}`} style={{ height: revealed ? `${Math.max(day.amount > 0 ? 6 : 0, ratio * 100)}%` : "0%", transitionDelay: `${300 + index * 70}ms` }} title={rupee(day.amount)} />
                    <span className="home-day-label">{day.day}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="home-goal-section">
            <h2 className="home-section-title">Savings goal</h2>
            <div className="home-goal-card">
              <p className="home-goal-name">{goal.label}</p>
              {goal.target > 0 ? (
                <>
                  <p className="home-goal-amount">{rupee(goal.saved)} of {rupee(goal.target)}</p>
                  <div className="home-goal-track"><div className="home-goal-progress" style={{ width: revealed ? `${goal.percentage}%` : "0%" }} /></div>
                  <p className="home-goal-percent">{goal.percentage}% there</p>
                </>
              ) : <p className="home-no-goal">Create a savings goal to start tracking your progress.</p>}
            </div>
          </div>
        </div>

        <section className="home-actions">
          <ActionRow title="Log an expense" description="Record where your money went today" tone="brick" revealed={revealed} delay={550} onClick={() => navigate("/expense")} />
          <ActionRow title="Set a savings goal" description="Give a target a name and a deadline" tone="gold" revealed={revealed} delay={630} onClick={() => navigate("/savings")} />
          <ActionRow title="View reports" description="See spending trends over time" tone="green" revealed={revealed} delay={710} onClick={() => navigate("/invoices")} />
        </section>
      </main>
    </div>
  );
}

function LedgerRow({ label, value, tone, revealed, delay = 0 }) {
  const toneMap = { green: { text: "home-value-green", dot: "home-dot-green" }, brick: { text: "home-value-brick", dot: "home-dot-brick" }, gold: { text: "home-value-gold", dot: "home-dot-gold" } };
  const sign = tone === "brick" ? "−" : "+";
  return (
    <div className={`home-ledger-row ${revealed ? "home-row-visible" : "home-row-hidden"}`} style={{ transitionDelay: `${delay}ms` }}>
      <span className="home-ledger-label"><span className={`home-ledger-dot ${toneMap[tone].dot}`} />{label}</span>
      <span className={`home-ledger-value ${toneMap[tone].text}`}>{sign}₹{Number(value || 0).toLocaleString("en-IN")}</span>
    </div>
  );
}

function ActionRow({ title, description, tone, revealed, delay = 0, onClick }) {
  const toneMap = { green: "home-action-green", brick: "home-action-brick", gold: "home-action-gold" };
  return (
    <button type="button" onClick={onClick} className={`home-action-row ${revealed ? "home-row-visible" : "home-row-hidden"}`} style={{ transitionDelay: `${delay}ms` }}>
      <span className={`home-action-dot ${toneMap[tone]}`} />
      <span className="home-action-content"><span className="home-action-title">{title}</span><span className="home-action-description">{description}</span></span>
      <span className="home-action-arrow">›</span>
    </button>
  );
}

export default HomePage;
