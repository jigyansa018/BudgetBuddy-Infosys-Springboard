import { useCallback, useEffect, useMemo, useState } from "react";

import "./Invoices.css";

const API_URL = import.meta.env.VITE_API_URL;

const FILTERS = ["all", "paid", "pending", "overdue"];

const INITIAL_FORM = {
  client_name: "",
  description: "",
  invoice_date: new Date().toISOString().split("T")[0],
  amount: "",
  status: "Pending",
};

// =========================================================
// Helpers
// =========================================================

function getToken() {
  return localStorage.getItem("token");
}

function authHeaders(json = false) {
  const token = getToken();

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  if (json) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// =========================================================
// Component
// =========================================================

export default function Invoices() {
  // -------------------------------------------------------
  // Filter
  // -------------------------------------------------------

  const [filter, setFilter] = useState("all");

  // -------------------------------------------------------
  // Invoice data
  // -------------------------------------------------------

  const [invoices, setInvoices] = useState([]);

  // -------------------------------------------------------
  // Loading
  // -------------------------------------------------------

  const [loading, setLoading] = useState(true);

  // -------------------------------------------------------
  // Invoice loading error
  // -------------------------------------------------------

  const [error, setError] = useState("");

  // -------------------------------------------------------
  // Export error
  // -------------------------------------------------------

  const [exportError, setExportError] = useState("");

  // -------------------------------------------------------
  // Create invoice modal
  // -------------------------------------------------------

  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState(INITIAL_FORM);

  const [saving, setSaving] = useState(false);

  const [formError, setFormError] = useState("");

  // -------------------------------------------------------
  // Export state
  // -------------------------------------------------------

  const [exporting, setExporting] = useState("");

  // =======================================================
  // Fetch invoices
  // =======================================================

  const fetchInvoices = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError("");

      const token = getToken();

      if (!token) {
        setError("You are not logged in.");

        setInvoices([]);

        return;
      }

      const response = await fetch(`${API_URL}/invoices`, {
        method: "GET",
        headers: authHeaders(),
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error("Your session has expired. Please login again.");
      }

      if (!response.ok) {
        let message = `Failed to fetch invoices (${response.status})`;

        try {
          const errorData = await response.json();

          if (errorData?.detail) {
            message = errorData.detail;
          }
        } catch {
          // Keep default message
        }

        throw new Error(message);
      }

      const data = await response.json();

      const invoiceArray = Array.isArray(data) ? data : data?.items || [];

      const formattedInvoices = invoiceArray.map((invoice) => ({
        id: invoice.id,

        invoiceNumber: invoice.invoice_number || `INV-${invoice.id}`,

        to: invoice.client_name || "Unknown client",

        description: invoice.description || "",

        date: invoice.invoice_date,

        amount: Number(invoice.amount || 0),

        status: String(invoice.status || "Pending").toLowerCase(),
      }));

      setInvoices(formattedInvoices);
    } catch (err) {
      console.error("Invoice fetch error:", err);

      setError(err.message || "Unable to load invoices.");
    } finally {
      setLoading(false);
    }
  }, []);

  // =======================================================
  // Initial load
  // =======================================================

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // =======================================================
  // Auto refresh every 30 seconds
  // =======================================================

  useEffect(() => {
    const interval = setInterval(() => {
      fetchInvoices(false);
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchInvoices]);

  // =======================================================
  // Refresh when returning to browser tab
  // =======================================================

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchInvoices(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchInvoices]);

  // =======================================================
  // Filter invoices
  // =======================================================

  const rows = useMemo(() => {
    if (filter === "all") {
      return invoices;
    }

    return invoices.filter((invoice) => invoice.status === filter);
  }, [filter, invoices]);

  // =======================================================
  // Statistics
  // =======================================================

  const totalAmount = useMemo(() => {
    return invoices.reduce(
      (sum, invoice) => sum + Number(invoice.amount || 0),
      0,
    );
  }, [invoices]);

  const paidAmount = useMemo(() => {
    return invoices
      .filter((invoice) => invoice.status === "paid")
      .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  }, [invoices]);

  const pendingAmount = useMemo(() => {
    return invoices
      .filter((invoice) => invoice.status === "pending")
      .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  }, [invoices]);

  const overdueAmount = useMemo(() => {
    return invoices
      .filter((invoice) => invoice.status === "overdue")
      .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  }, [invoices]);

  // =======================================================
  // Form changes
  // =======================================================

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =======================================================
  // Open create modal
  // =======================================================

  const openCreateModal = () => {
    setForm({
      ...INITIAL_FORM,
      invoice_date: new Date().toISOString().split("T")[0],
    });

    setFormError("");

    setShowModal(true);
  };

  // =======================================================
  // Close modal
  // =======================================================

  const closeCreateModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);

    setFormError("");
  };

  // =======================================================
  // Create invoice
  // =======================================================

  const handleCreateInvoice = async (event) => {
    event.preventDefault();

    setFormError("");

    const amount = Number(form.amount);

    if (!form.client_name.trim()) {
      setFormError("Client name is required.");

      return;
    }

    if (!form.invoice_date) {
      setFormError("Invoice date is required.");

      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Amount must be greater than 0.");

      return;
    }

    const token = getToken();

    if (!token) {
      setFormError("You are not logged in.");

      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`${API_URL}/invoices`, {
        method: "POST",

        headers: authHeaders(true),

        body: JSON.stringify({
          client_name: form.client_name.trim(),

          description: form.description.trim() || null,

          invoice_date: form.invoice_date,

          amount: amount,

          status: form.status,
        }),
      });

      if (!response.ok) {
        let message = "Unable to create invoice.";

        try {
          const errorData = await response.json();

          if (errorData?.detail) {
            message = errorData.detail;
          }
        } catch {
          // Keep default
        }

        throw new Error(message);
      }

      await fetchInvoices(false);

      setShowModal(false);

      setForm({
        ...INITIAL_FORM,
        invoice_date: new Date().toISOString().split("T")[0],
      });
    } catch (err) {
      console.error("Create invoice error:", err);

      setFormError(err.message || "Unable to create invoice.");
    } finally {
      setSaving(false);
    }
  };

  // =======================================================
  // Download monthly PDF / Excel
  // =======================================================

  const downloadExport = async (format) => {
    try {
      setExporting(format);

      setExportError("");

      const token = getToken();

      if (!token) {
        setExportError("You are not logged in.");

        return;
      }

      // Current month and year
      const now = new Date();

      const month = now.getMonth() + 1;

      const year = now.getFullYear();

      //
      // /reports/monthly/pdf       ✅
      // /reports/monthly/excel     ✅

      const endpoint =
        format === "pdf"
          ? `/reports/monthly/pdf?month=${month}&year=${year}`
          : `/reports/monthly/excel?month=${month}&year=${year}`;

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "GET",
        headers: authHeaders(),
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error("Your session has expired. Please login again.");
      }

      if (!response.ok) {
        let message = `Unable to generate ${format.toUpperCase()} report.`;

        try {
          const errorData = await response.json();

          if (errorData?.detail) {
            message = errorData.detail;
          }
        } catch {
          // Keep default message
        }

        throw new Error(message);
      }

      const blob = await response.blob();

      const contentDisposition = response.headers.get("Content-Disposition");

      let filename =
        format === "pdf"
          ? `BudgetBuddy_Monthly_Report_${year}_${month}.pdf`
          : `BudgetBuddy_Monthly_Report_${year}_${month}.xlsx`;

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/i);

        if (match?.[1]) {
          filename = match[1];
        }
      }

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;

      link.download = filename;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Invoice export error:", err);

      // IMPORTANT:
      // Don't put export errors into
      // the invoice-table error.
      setExportError(
        err.message || `Unable to generate ${format.toUpperCase()} report.`,
      );
    } finally {
      setExporting("");
    }
  };

  // =======================================================
  // Render
  // =======================================================

  return (
    <div className="inv-page">
      {/* =================================================
          Header
          ================================================= */}

      <div className="inv-header">
        <div>
          <h1 className="inv-title">Invoices</h1>

          <p className="inv-subtitle">
            Money owed to you and money you're waiting on.
          </p>
        </div>

        <div className="inv-header-actions">
          {/* PDF */}

          <button
            type="button"
            className="inv-export-btn inv-export-pdf"
            onClick={() => downloadExport("pdf")}
            disabled={exporting !== ""}
          >
            {exporting === "pdf" ? "Generating..." : "↓ PDF"}
          </button>

          {/* Excel */}

          <button
            type="button"
            className="inv-export-btn inv-export-excel"
            onClick={() => downloadExport("excel")}
            disabled={exporting !== ""}
          >
            {exporting === "excel" ? "Generating..." : "↓ Excel"}
          </button>

          {/* Refresh */}

          <button
            type="button"
            className="inv-refresh-btn"
            onClick={() => fetchInvoices(true)}
            disabled={loading}
            title="Refresh invoices"
          >
            {loading ? "..." : "↻"}
          </button>

          {/* New invoice */}

          <button
            type="button"
            className="inv-add-btn"
            onClick={openCreateModal}
          >
            + New invoice
          </button>
        </div>
      </div>

      {/* =================================================
          Invoice API error
          ================================================= */}

      {error && (
        <div className="inv-error">
          <span>{error}</span>

          <button type="button" onClick={() => fetchInvoices(true)}>
            Retry
          </button>
        </div>
      )}

      {/* =================================================
          Export error
          ================================================= */}

      {exportError && (
        <div className="inv-export-error">
          <span>{exportError}</span>

          <button type="button" onClick={() => setExportError("")}>
            ×
          </button>
        </div>
      )}

      {/* =================================================
          Summary
          ================================================= */}

      <div className="inv-summary">
        <div className="inv-summary-card">
          <span>Total invoices</span>

          <strong>{invoices.length}</strong>
        </div>

        <div className="inv-summary-card">
          <span>Total amount</span>

          <strong>₹{formatMoney(totalAmount)}</strong>
        </div>

        <div className="inv-summary-card inv-summary-paid">
          <span>Paid</span>

          <strong>₹{formatMoney(paidAmount)}</strong>
        </div>

        <div className="inv-summary-card inv-summary-pending">
          <span>Pending</span>

          <strong>₹{formatMoney(pendingAmount)}</strong>
        </div>
      </div>

      {/* =================================================
          Optional overdue information
          ================================================= */}

      {overdueAmount > 0 && (
        <div className="inv-overdue-info">
          <span>⚠ Overdue amount</span>

          <strong>₹{formatMoney(overdueAmount)}</strong>
        </div>
      )}

      {/* =================================================
          Filters
          ================================================= */}

      <div className="inv-filters">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`inv-filter ${filter === f ? "is-active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* =================================================
          Table
          ================================================= */}

      <div className="inv-table">
        {/* Header */}

        <div className="inv-row inv-row-head">
          <span>Invoice</span>

          <span>Billed to</span>

          <span>Date</span>

          <span className="inv-amount-col">Amount</span>

          <span>Status</span>
        </div>

        {/* Loading */}

        {loading && (
          <div className="inv-empty">
            <div className="inv-loading-spinner" />

            <span>Loading invoices...</span>
          </div>
        )}

        {/* API Error */}

        {!loading && error && (
          <div className="inv-empty">
            <strong>Unable to display invoices.</strong>

            <span>Check your backend connection and try again.</span>
          </div>
        )}

        {/* Real invoice rows */}

        {!loading &&
          !error &&
          rows.map((inv) => (
            <div className="inv-row" key={inv.id}>
              <div className="inv-invoice-cell">
                <span className="inv-id">{inv.invoiceNumber}</span>

                {inv.description && (
                  <span className="inv-description">{inv.description}</span>
                )}
              </div>

              <span className="inv-to">{inv.to}</span>

              <span className="inv-date">{formatDate(inv.date)}</span>

              <span className="inv-amount-col inv-amount">
                ₹{formatMoney(inv.amount)}
              </span>

              <span>
                <span className={`inv-badge inv-badge-${inv.status}`}>
                  {inv.status}
                </span>
              </span>
            </div>
          ))}

        {/* Empty */}

        {!loading && !error && rows.length === 0 && (
          <div className="inv-empty">
            <div className="inv-empty-icon">🧾</div>

            <strong>No invoices found</strong>

            <span>Create your first invoice to start tracking it.</span>
          </div>
        )}
      </div>

      {/* =================================================
          Create Invoice Modal
          ================================================= */}

      {showModal && (
        <div
          className="inv-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCreateModal();
            }
          }}
        >
          <div className="inv-modal">
            {/* Modal header */}

            <div className="inv-modal-header">
              <div>
                <h2>Create new invoice</h2>

                <p>Add an invoice to your real BudgetBuddy records.</p>
              </div>

              <button
                type="button"
                className="inv-modal-close"
                onClick={closeCreateModal}
                disabled={saving}
              >
                ×
              </button>
            </div>

            {/* Form */}

            <form className="inv-form" onSubmit={handleCreateInvoice}>
              {/* Client */}

              <label>
                Client name
                <input
                  type="text"
                  name="client_name"
                  value={form.client_name}
                  onChange={handleFormChange}
                  placeholder="e.g. ABC Client"
                  maxLength={150}
                  required
                />
              </label>

              {/* Description */}

              <label>
                Description
                <input
                  type="text"
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  placeholder="Optional invoice description"
                  maxLength={255}
                />
              </label>

              {/* Date + Amount */}

              <div className="inv-form-grid">
                <label>
                  Invoice date
                  <input
                    type="date"
                    name="invoice_date"
                    value={form.invoice_date}
                    onChange={handleFormChange}
                    required
                  />
                </label>

                <label>
                  Amount
                  <input
                    type="number"
                    name="amount"
                    value={form.amount}
                    onChange={handleFormChange}
                    placeholder="0"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </label>
              </div>

              {/* Status */}

              <label>
                Status
                <select
                  name="status"
                  value={form.status}
                  onChange={handleFormChange}
                >
                  <option value="Pending">Pending</option>

                  <option value="Paid">Paid</option>

                  <option value="Overdue">Overdue</option>
                </select>
              </label>

              {/* Form error */}

              {formError && <div className="inv-form-error">{formError}</div>}

              {/* Actions */}

              <div className="inv-modal-actions">
                <button
                  type="button"
                  className="inv-cancel-btn"
                  onClick={closeCreateModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="inv-submit-btn"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Create invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
