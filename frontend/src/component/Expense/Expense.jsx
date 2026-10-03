import { useState } from "react";
import "./Expense.css";

const API_URL = "http://127.0.0.1:8000";

function Expense() {
  const [form, setForm] = useState({
    category: "Food",
    title: "",
    amount: "",
    expense_date: "",
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
      const response = await fetch(`${API_URL}/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category: form.category,
          title: form.title,
          amount: Number(form.amount),
          expense_date: form.expense_date,
          description: form.description || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          Array.isArray(data.detail)
            ? data.detail.map((item) => item.msg).join(", ")
            : data.detail || "Expense creation failed"
        );
        return;
      }

      setMessage(`Expense created successfully. ID: ${data.id}`);

      setForm({
        category: "Food",
        title: "",
        amount: "",
        expense_date: "",
        description: "",
      });
    } catch (error) {
      console.error(error);
      setMessage("Cannot connect to backend.");
    }
  };

  return (
    <div className="expense-page">
      <div className="expense-container">
        <div className="expense-card">
          <h1 className="expense-title">Add Expense</h1>

          <p className="expense-subtitle">
            Track your spending with BudgetBuddy
          </p>

          <form className="expense-form" onSubmit={handleSubmit}>
            <label htmlFor="category">Category</label>

            <select
              id="category"
              name="category"
              value={form.category}
              onChange={handleChange}
            >
              <option value="Food">Food</option>
              <option value="Travel">Travel</option>
              <option value="Shopping">Shopping</option>
              <option value="Education">Education</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Miscellaneous">Miscellaneous</option>
            </select>

            <label htmlFor="title">Title</label>

            <input
              id="title"
              name="title"
              type="text"
              placeholder="Enter expense title"
              value={form.title}
              onChange={handleChange}
              required
            />

            <label htmlFor="amount">Amount</label>

            <input
              id="amount"
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Enter amount"
              value={form.amount}
              onChange={handleChange}
              required
            />

            <label htmlFor="expense_date">Date</label>

            <input
              id="expense_date"
              name="expense_date"
              type="date"
              value={form.expense_date}
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
              className="expense-submit"
            >
              Add Expense
            </button>

            {message && (
              <p className="expense-message">
                {message}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default Expense;