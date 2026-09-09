import React, { useEffect, useState, useCallback } from "react";
import { api } from "../../api/client";
import { AdminAuditLogEntry, AdminAuditLogsResponse, Faculty, Section } from "../../types";
import Spinner from "../../components/Spinner";
import ErrorBanner from "../../components/ErrorBanner";

export default function AdminAuditLogs() {
  // Filters state
  const defaultDateFrom = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  };
  const defaultDateTo = () => new Date().toISOString().slice(0, 10);

  const [dateFrom, setDateFrom] = useState(defaultDateFrom());
  const [dateTo, setDateTo] = useState(defaultDateTo());
  const [facultyFilterType, setFacultyFilterType] = useState<"acting" | "class">("acting");
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [sectionFilter, setSectionFilter] = useState<string>("");

  // Pagination state
  const [limit, setLimit] = useState<number>(50);
  const [offset, setOffset] = useState<number>(0);

  // Data state
  const [logs, setLogs] = useState<AdminAuditLogEntry[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Dropdown reference data
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [sectionList, setSectionList] = useState<Section[]>([]);
  const [downloading, setDownloading] = useState<boolean>(false);

  // Load dropdown options
  useEffect(() => {
    async function loadMeta() {
      try {
        const [facRes, secRes] = await Promise.all([
          api.get<Faculty[]>("/admin/faculty"),
          api.get<Section[]>("/admin/sections"),
        ]);
        setFacultyList(facRes.data);
        setSectionList(secRes.data);
      } catch {
        // Soft fail for metadata
      }
    }
    loadMeta();
  }, []);

  // Fetch logs
  const fetchAuditLogs = useCallback(
    async (newOffset = offset) => {
      setLoading(true);
      setError("");
      try {
        const params: Record<string, any> = {
          limit,
          offset: newOffset,
        };
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        if (actionFilter) params.action = actionFilter;
        if (sectionFilter) params.section_id = Number(sectionFilter);

        if (selectedFacultyId) {
          if (facultyFilterType === "acting") {
            params.acting_faculty_id = Number(selectedFacultyId);
          } else {
            params.class_faculty_id = Number(selectedFacultyId);
          }
        }

        const res = await api.get<AdminAuditLogsResponse>("/admin/audit-logs", { params });
        setLogs(res.data.items || []);
        setTotal(res.data.total || 0);
        setOffset(newOffset);
      } catch (err: any) {
        setError(err?.response?.data?.detail || err?.message || "Failed to load audit logs.");
      } finally {
        setLoading(false);
      }
    },
    [dateFrom, dateTo, actionFilter, sectionFilter, selectedFacultyId, facultyFilterType, limit, offset]
  );

  useEffect(() => {
    fetchAuditLogs(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAuditLogs(0);
  };

  const handleResetFilters = () => {
    setDateFrom(defaultDateFrom());
    setDateTo(defaultDateTo());
    setFacultyFilterType("acting");
    setSelectedFacultyId("");
    setActionFilter("");
    setSectionFilter("");
    setOffset(0);

    // Call fetch with clean defaults immediately
    (async () => {
      setLoading(true);
      setError("");
      try {
        const params = {
          limit,
          offset: 0,
          date_from: defaultDateFrom(),
          date_to: defaultDateTo(),
        };
        const res = await api.get<AdminAuditLogsResponse>("/admin/audit-logs", { params });
        setLogs(res.data.items || []);
        setTotal(res.data.total || 0);
        setOffset(0);
      } catch (err: any) {
        setError(err?.response?.data?.detail || err?.message || "Failed to reset audit logs.");
      } finally {
        setLoading(false);
      }
    })();
  };

  // CSV download
  const handleDownloadCSV = async () => {
    setDownloading(true);
    setError("");
    try {
      const params: Record<string, any> = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (actionFilter) params.action = actionFilter;
      if (sectionFilter) params.section_id = Number(sectionFilter);

      if (selectedFacultyId) {
        if (facultyFilterType === "acting") {
          params.acting_faculty_id = Number(selectedFacultyId);
        } else {
          params.class_faculty_id = Number(selectedFacultyId);
        }
      }

      const response = await api.get("/admin/audit-logs/download", {
        params,
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
      const filename = `attendance_audit_logs_${dateFrom || "all"}_to_${dateTo || "now"}.csv`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to download audit logs CSV.");
    } finally {
      setDownloading(false);
    }
  };

  // Action badge formatting
  const renderActionBadge = (action: string) => {
    switch (action) {
      case "attendance_posted":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 9px",
              borderRadius: "9999px",
              fontSize: "0.78rem",
              fontWeight: 600,
              backgroundColor: "#dcfce7",
              color: "#15803d",
              border: "1px solid #bbf7d0",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
              check_circle
            </span>
            Posted
          </span>
        );
      case "attendance_edited":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 9px",
              borderRadius: "9999px",
              fontSize: "0.78rem",
              fontWeight: 600,
              backgroundColor: "#dbeafe",
              color: "#1d4ed8",
              border: "1px solid #bfdbfe",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
              edit
            </span>
            Edited
          </span>
        );
      case "attendance_overridden":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 9px",
              borderRadius: "9999px",
              fontSize: "0.78rem",
              fontWeight: 600,
              backgroundColor: "#fef3c7",
              color: "#b45309",
              border: "1px solid #fde68a",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
              admin_panel_settings
            </span>
            Overridden
          </span>
        );
      case "session_marked_faculty_leave":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 9px",
              borderRadius: "9999px",
              fontSize: "0.78rem",
              fontWeight: 600,
              backgroundColor: "#fee2e2",
              color: "#b91c1c",
              border: "1px solid #fecaca",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
              person_off
            </span>
            Faculty Leave
          </span>
        );
      case "session_marked_holiday":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 9px",
              borderRadius: "9999px",
              fontSize: "0.78rem",
              fontWeight: 600,
              backgroundColor: "#f1f5f9",
              color: "#475569",
              border: "1px solid #e2e8f0",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
              event_busy
            </span>
            Holiday
          </span>
        );
      default:
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 9px",
              borderRadius: "9999px",
              fontSize: "0.78rem",
              fontWeight: 600,
              backgroundColor: "#f3f4f6",
              color: "#374151",
              border: "1px solid #e5e7eb",
            }}
          >
            {action.replace(/_/g, " ")}
          </span>
        );
    }
  };

  // Format timestamp helper
  const formatDateTime = (ts: string) => {
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return d.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return ts;
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="admin-audit-logs" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h1 className="page-heading" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: "28px", color: "var(--primary)" }}>
              receipt_long
            </span>
            Admin Audit Logs
          </h1>
          <p className="page-subheading" style={{ margin: "4px 0 0 0" }}>
            Immutable chronological trail of attendance posts, edits, administrative overrides, and faculty substitutions.
          </p>
        </div>

        <button
          type="button"
          className="btn"
          onClick={handleDownloadCSV}
          disabled={downloading || loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            backgroundColor: "var(--primary)",
            color: "#fff",
            fontWeight: 600,
            padding: "8px 16px",
            borderRadius: "6px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          }}
          aria-label="Download Audit Logs CSV"
        >
          {downloading ? (
            <Spinner inline label="Exporting CSV..." />
          ) : (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                download
              </span>
              Download CSV
            </>
          )}
        </button>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

      {/* Filter Bar Card */}
      <div
        className="card"
        style={{
          padding: 18,
          borderRadius: 10,
          boxShadow: "var(--card-shadow)",
          backgroundColor: "#ffffff",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <form onSubmit={handleApplyFilters}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
              alignItems: "end",
            }}
          >
            {/* Date From */}
            <div>
              <label
                htmlFor="audit-date-from"
                style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 4, color: "var(--ink)" }}
              >
                Date From
              </label>
              <input
                id="audit-date-from"
                type="date"
                className="input-field"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)" }}
              />
            </div>

            {/* Date To */}
            <div>
              <label
                htmlFor="audit-date-to"
                style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 4, color: "var(--ink)" }}
              >
                Date To
              </label>
              <input
                id="audit-date-to"
                type="date"
                className="input-field"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)" }}
              />
            </div>

            {/* Faculty Filter Toggle & Select */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <label
                  htmlFor="audit-faculty-select"
                  style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--ink)" }}
                >
                  Faculty Filter
                </label>
                <div style={{ display: "inline-flex", gap: 4, fontSize: "0.75rem" }}>
                  <button
                    type="button"
                    onClick={() => setFacultyFilterType("acting")}
                    style={{
                      border: "none",
                      background: facultyFilterType === "acting" ? "var(--primary-light)" : "transparent",
                      color: facultyFilterType === "acting" ? "var(--primary)" : "var(--ink-muted)",
                      fontWeight: facultyFilterType === "acting" ? 700 : 500,
                      cursor: "pointer",
                      padding: "1px 6px",
                      borderRadius: 4,
                    }}
                  >
                    Acting
                  </button>
                  <span style={{ color: "var(--border)" }}>|</span>
                  <button
                    type="button"
                    onClick={() => setFacultyFilterType("class")}
                    style={{
                      border: "none",
                      background: facultyFilterType === "class" ? "var(--primary-light)" : "transparent",
                      color: facultyFilterType === "class" ? "var(--primary)" : "var(--ink-muted)",
                      fontWeight: facultyFilterType === "class" ? 700 : 500,
                      cursor: "pointer",
                      padding: "1px 6px",
                      borderRadius: 4,
                    }}
                  >
                    Class Owner
                  </button>
                </div>
              </div>
              <select
                id="audit-faculty-select"
                className="input-field"
                value={selectedFacultyId}
                onChange={(e) => setSelectedFacultyId(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)" }}
              >
                <option value="">
                  All Faculty ({facultyFilterType === "acting" ? "Acting" : "Owner"})
                </option>
                {facultyList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.full_name} ({f.username})
                  </option>
                ))}
              </select>
            </div>

            {/* Action Filter */}
            <div>
              <label
                htmlFor="audit-action-select"
                style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 4, color: "var(--ink)" }}
              >
                Action Type
              </label>
              <select
                id="audit-action-select"
                className="input-field"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)" }}
              >
                <option value="">All Actions</option>
                <option value="attendance_posted">attendance_posted (Posted)</option>
                <option value="attendance_edited">attendance_edited (Edited)</option>
                <option value="attendance_overridden">attendance_overridden (Admin Override)</option>
                <option value="session_marked_holiday">session_marked_holiday (Holiday)</option>
                <option value="session_marked_faculty_leave">session_marked_faculty_leave (Faculty Leave)</option>
              </select>
            </div>

            {/* Section Filter */}
            <div>
              <label
                htmlFor="audit-section-select"
                style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 4, color: "var(--ink)" }}
              >
                Section
              </label>
              <select
                id="audit-section-select"
                className="input-field"
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)" }}
              >
                <option value="">All Sections</option>
                {sectionList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.display_name} ({s.academic_year})
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                type="submit"
                className="btn"
                disabled={loading}
                style={{
                  flex: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "9px 14px",
                  borderRadius: 6,
                  fontWeight: 600,
                  backgroundColor: "var(--primary)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  filter_alt
                </span>
                Apply
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={handleResetFilters}
                disabled={loading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  padding: "9px 14px",
                  borderRadius: 6,
                  fontWeight: 600,
                  backgroundColor: "var(--surface-container-high)",
                  color: "var(--ink)",
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                }}
                title="Reset to default 30 days"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  refresh
                </span>
                Reset
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Main Table Card */}
      <div
        className="card"
        style={{
          padding: 0,
          borderRadius: 10,
          overflow: "hidden",
          boxShadow: "var(--card-shadow)",
          backgroundColor: "#ffffff",
          border: "1px solid var(--border-subtle)",
        }}
      >
        {/* Table summary bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 20px",
            borderBottom: "1px solid var(--border-subtle)",
            backgroundColor: "var(--surface)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--ink)" }}>
              Audit Events
            </span>
            <span
              style={{
                fontSize: "0.78rem",
                padding: "2px 8px",
                borderRadius: "9999px",
                backgroundColor: "var(--primary-light)",
                color: "var(--primary)",
                fontWeight: 600,
              }}
            >
              {total} total records
            </span>
          </div>

          {/* Page size selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", color: "var(--ink-soft)" }}>
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              style={{
                padding: "4px 8px",
                borderRadius: 4,
                border: "1px solid var(--border)",
                fontSize: "0.85rem",
              }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Content State */}
        {loading ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <Spinner label="Loading audit logs..." />
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--ink-muted)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "44px", color: "var(--outline)" }}>
              receipt_long
            </span>
            <h3 style={{ margin: "12px 0 4px 0", color: "var(--ink)" }}>No audit events found</h3>
            <p style={{ margin: 0, fontSize: "0.9rem" }}>
              No attendance activity matched the selected criteria in this period.
            </p>
          </div>
        ) : (
          <div className="table-responsive" style={{ overflowX: "auto" }}>
            <table
              className="data-table"
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
                fontSize: "0.88rem",
              }}
              aria-label="Attendance Audit Log Table"
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "var(--surface-container-low)",
                    borderBottom: "2px solid var(--border-subtle)",
                    color: "var(--ink)",
                    fontWeight: 700,
                  }}
                >
                  <th style={{ padding: "12px 16px", minWidth: 160 }}>Timestamp</th>
                  <th style={{ padding: "12px 16px", minWidth: 140 }}>Login Account</th>
                  <th style={{ padding: "12px 16px", minWidth: 170 }}>Acting Faculty</th>
                  <th style={{ padding: "12px 16px", minWidth: 160 }}>Class Owner</th>
                  <th style={{ padding: "12px 16px", minWidth: 130 }}>Action</th>
                  <th style={{ padding: "12px 16px", minWidth: 220 }}>Class Details</th>
                  <th style={{ padding: "12px 16px", minWidth: 110, textAlign: "center" }}>Substitution?</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row, idx) => {
                  return (
                    <tr
                      key={`${row.session_date}-${row.period_number}-${row.timestamp}-${idx}`}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        backgroundColor: row.is_substitution ? "#fcfaff" : idx % 2 === 0 ? "#ffffff" : "var(--surface)",
                        borderLeft: row.is_substitution ? "4px solid #6366f1" : "4px solid transparent",
                        transition: "background-color 0.15s ease",
                      }}
                    >
                      {/* Timestamp */}
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                        <div style={{ fontWeight: 600, color: "var(--ink)" }}>
                          {formatDateTime(row.timestamp)}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)" }}>
                          Session: {row.session_date}
                        </div>
                      </td>

                      {/* Login Account */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: "16px", color: "var(--secondary)" }}
                          >
                            account_circle
                          </span>
                          <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                            {row.login_username}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)", marginLeft: 22 }}>
                          User ID: #{row.login_user_id}
                        </div>
                      </td>

                      {/* Acting Faculty */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 600, color: "var(--ink)" }}>
                          {row.acting_faculty_name || (
                            <span style={{ fontStyle: "italic", color: "var(--ink-muted)" }}>
                              {row.acting_faculty_id ? `Faculty #${row.acting_faculty_id}` : "System / Admin"}
                            </span>
                          )}
                        </div>
                        {row.is_substitution && (
                          <div style={{ marginTop: 3 }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 2,
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                backgroundColor: "#ede9fe",
                                color: "#6d28d9",
                                padding: "2px 6px",
                                borderRadius: 4,
                                border: "1px solid #ddd6fe",
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: "12px" }}>
                                swap_horiz
                              </span>
                              Covering Colleague
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Class Owner */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 500, color: "var(--ink)" }}>
                          {row.class_faculty_name || (
                            <span style={{ fontStyle: "italic", color: "var(--ink-muted)" }}>
                              {row.class_faculty_id ? `Faculty #${row.class_faculty_id}` : "Unassigned"}
                            </span>
                          )}
                        </div>
                        {row.class_faculty_id && (
                          <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)" }}>
                            Owner ID: #{row.class_faculty_id}
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td style={{ padding: "12px 16px" }}>
                        {renderActionBadge(row.action)}
                      </td>

                      {/* Class Details */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 600, color: "var(--ink)" }}>
                          {row.subject_name || "General Session"}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)", marginTop: 2 }}>
                          <span>{row.section_name}</span>
                          <span style={{ margin: "0 6px", color: "var(--border)" }}>•</span>
                          <span
                            style={{
                              backgroundColor: "var(--surface-container-high)",
                              padding: "1px 5px",
                              borderRadius: 4,
                              fontWeight: 600,
                            }}
                          >
                            Period {row.period_number}
                          </span>
                        </div>
                      </td>

                      {/* Substitution? */}
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        {row.is_substitution ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 2,
                              padding: "3px 8px",
                              borderRadius: 9999,
                              fontSize: "0.76rem",
                              fontWeight: 700,
                              backgroundColor: "#e0e7ff",
                              color: "#4338ca",
                              border: "1px solid #c7d2fe",
                            }}
                            title={`Acting (${row.acting_faculty_name || row.acting_faculty_id}) ≠ Class Owner (${row.class_faculty_name || row.class_faculty_id})`}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                              done
                            </span>
                            Yes
                          </span>
                        ) : (
                          <span style={{ color: "var(--ink-muted)", fontSize: "0.85rem" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 20px",
            borderTop: "1px solid var(--border-subtle)",
            backgroundColor: "var(--surface)",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
            Showing {total === 0 ? 0 : offset + 1} to {Math.min(offset + limit, total)} of {total} events
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
              Page {currentPage} of {totalPages}
            </span>

            <div style={{ display: "inline-flex", gap: 6 }}>
              <button
                type="button"
                className="btn secondary"
                onClick={() => fetchAuditLogs(Math.max(0, offset - limit))}
                disabled={offset === 0 || loading}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  cursor: offset === 0 || loading ? "not-allowed" : "pointer",
                  opacity: offset === 0 || loading ? 0.6 : 1,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: "0.85rem",
                }}
                aria-label="Previous Page"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                  chevron_left
                </span>
                Prev
              </button>

              <button
                type="button"
                className="btn secondary"
                onClick={() => fetchAuditLogs(offset + limit)}
                disabled={offset + limit >= total || loading}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  cursor: offset + limit >= total || loading ? "not-allowed" : "pointer",
                  opacity: offset + limit >= total || loading ? 0.6 : 1,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: "0.85rem",
                }}
                aria-label="Next Page"
              >
                Next
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                  chevron_right
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
