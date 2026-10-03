import { useState } from "react";
import "./Income.css";

const API_URL = import.meta.env.VITE_API_URL;

function Income() {
  const [form, setForm] = useState({
    source: "Pocket Money",
    amount: "",
    income_date: "",
    description: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("Please login first.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/income`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          source: form.source,
          amount: Number(form.amount),
          income_date: form.income_date,
          description: form.description || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          Array.isArray(data.detail)
            ? data.detail.map((item) => item.msg).join(", ")
            : data.detail || "Income creation failed"
        );
        return;
      }

      setMessage(`Income created successfully. ID: ${data.id}`);

      setForm({
        source: "Pocket Money",
        amount: "",
        income_date: "",
        description: "",
      });
    } catch (error) {
      console.error(error);
      setMessage("Cannot connect to backend.");
    }
  };

  return (
    <div className="income-page">
      <div className="income-container">
        <div className="income-card">
          <h1 className="income-title">Add Income</h1>

          <p className="income-subtitle">
            Track your income with BudgetBuddy
          </p>

          <form className="income-form" onSubmit={handleSubmit}>
            <label htmlFor="source">Income Source</label>

            <select
              id="source"
              name="source"
              value={form.source}
              onChange={handleChange}
            >
              <option value="Pocket Money">Pocket Money</option>
              <option value="Scholarship">Scholarship</option>
              <option value="Freelance Income">
                Freelance Income
              </option>
            </select>

            <label htmlFor="amount">Amount</label>

            <input
              id="amount"
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Enter income amount"
              value={form.amount}
              onChange={handleChange}
              required
            />

            <label htmlFor="income_date">Date</label>

            <input
              id="income_date"
              name="income_date"
              type="date"
              value={form.income_date}
              onChange={handleChange}
              required
            />

            <label htmlFor="description">Description</label>

            <textarea
              id="description"
              name="description"
              placeholder="Enter description (optional)"
              value={form.description}
              onChange={handleChange}
            />

            <button
              type="submit"
              className="income-submit"
            >
              Add Income
            </button>

            {message && (
              <p className="income-message">
                {message}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default Income;