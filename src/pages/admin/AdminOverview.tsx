import React, { useEffect, useState, useMemo } from "react";
import { api } from "../../api/client";
import Spinner from "../../components/Spinner";
import ErrorBanner from "../../components/ErrorBanner";
import { TodayAttendanceReport, TodayPendingItem, AdminStatsOut, LatePostingsReport } from "../../types";

interface AdminOverviewProps {
  onNavigateTab?: (tab: string) => void;
}

export default function AdminOverview({ onNavigateTab }: AdminOverviewProps) {
  const [todayReport, setTodayReport] = useState<TodayAttendanceReport | null>(null);
  const [stats, setStats] = useState<AdminStatsOut | null>(null);
  const [lateReport, setLateReport] = useState<LatePostingsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [pendingFirst, setPendingFirst] = useState(true);
  const [expandedSectionIds, setExpandedSectionIds] = useState<Set<number>>(new Set());
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  async function loadData(isManual = false) {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const [todayRes, statsRes, lateRes] = await Promise.all([
        api.get<TodayAttendanceReport>("/admin/reports/today"),
        api.get<AdminStatsOut>("/admin/reports/stats"),
        api.get<LatePostingsReport>("/admin/reports/late-postings").catch(() => null),
      ]);
      setTodayReport(todayRes.data);
      setStats(statsRes.data);
      if (lateRes?.data) setLateReport(lateRes.data);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to load department today metrics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Initial load + 60s auto-refresh interval
  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData(true);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  function toggleExpandSection(sectionId: number) {
    setExpandedSectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  // Format header date: e.g. "TODAY — 21 SEP"
  const formattedTodayHeader = useMemo(() => {
    const d = todayReport?.date ? new Date(todayReport.date) : new Date();
    const day = d.getDate();
    const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    return `TODAY — ${day} ${month}`;
  }, [todayReport?.date]);

  // Sections sorted with pending-first toggle
  const sortedSections = useMemo(() => {
    if (!todayReport?.sections) return [];
    const list = [...todayReport.sections];
    if (pendingFirst) {
      list.sort((a, b) => {
        if (b.pending !== a.pending) return b.pending - a.pending;
        return a.display_name.localeCompare(b.display_name);
      });
    } else {
      list.sort((a, b) => a.display_name.localeCompare(b.display_name));
    }
    return list;
  }, [todayReport?.sections, pendingFirst]);

  // Group pending items by section_id for quick access in expanded rows
  const pendingBySection = useMemo(() => {
    const map = new Map<number, TodayPendingItem[]>();
    if (!todayReport?.pending_items) return map;
    for (const item of todayReport.pending_items) {
      const existing = map.get(item.section_id) || [];
      existing.push(item);
      map.set(item.section_id, existing);
    }
    return map;
  }, [todayReport?.pending_items]);

  return (
    <div>
      {/* Top Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-heading" style={{ margin: 0 }}>Department Overview</h1>
          <p className="page-subheading" style={{ margin: "4px 0 0" }}>
            {stats?.department_name || "Department Overview"} · Auto-refreshes every 60s
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "0.78rem", color: "var(--ink-muted)" }}>
            Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            type="button"
            className="btn secondary"
            onClick={() => loadData(true)}
            disabled={loading || refreshing}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.82rem", padding: "6px 12px" }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: "18px",
                animation: refreshing ? "spin 1s linear infinite" : "none",
              }}
            >
              refresh
            </span>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={() => loadData()} />}

      {/* TODAY'S ATTENDANCE HERO CARD */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, var(--surface) 0%, var(--surface-container-low) 100%)",
          border: "1px solid var(--border)",
          boxShadow: "var(--card-shadow)",
          padding: 24,
          marginBottom: 24,
          borderRadius: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 26, color: "var(--primary)" }}>
              today
            </span>
            <span style={{ fontSize: "1.15rem", fontWeight: 800, fontFamily: "var(--font-display)", letterSpacing: "0.04em", color: "var(--on-surface)" }}>
              {formattedTodayHeader}
            </span>
          </div>

          {todayReport && todayReport.late_count > 0 && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                backgroundColor: "rgba(217, 119, 6, 0.12)",
                color: "#b45309",
                borderRadius: 999,
                fontSize: "0.8rem",
                fontWeight: 700,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>schedule</span>
              {todayReport.late_count} late {todayReport.late_count === 1 ? "posting" : "postings"}
            </div>
          )}
        </div>

        {/* 4 KPI Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
          {/* Scheduled */}
          <div style={{ backgroundColor: "var(--surface-container-lowest)", padding: 16, borderRadius: 12, border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--ink-muted)", display: "flex", alignItems: "center", gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--secondary)" }}>event</span>
              Scheduled
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 800, margin: "6px 0 2px", fontFamily: "var(--font-display)", color: "var(--ink)" }}>
              {todayReport ? todayReport.total_scheduled : "-"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)" }}>Periods on timetable</div>
          </div>

          {/* Posted */}
          <div style={{ backgroundColor: "var(--surface-container-lowest)", padding: 16, borderRadius: 12, border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--present)", display: "flex", alignItems: "center", gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--present)" }}>check_circle</span>
              Posted ✓
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 800, margin: "6px 0 2px", fontFamily: "var(--font-display)", color: "var(--present)" }}>
              {todayReport ? todayReport.posted : "-"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)" }}>
              {todayReport && todayReport.total_scheduled > 0
                ? `${Math.round((todayReport.posted / todayReport.total_scheduled) * 100)}% conducted`
                : "Conducted classes"}
            </div>
          </div>

          {/* Pending */}
          <div style={{ backgroundColor: "var(--surface-container-lowest)", padding: 16, borderRadius: 12, border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: todayReport && todayReport.pending > 0 ? "#b45309" : "var(--ink-muted)", display: "flex", alignItems: "center", gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: todayReport && todayReport.pending > 0 ? "#b45309" : "var(--ink-muted)" }}>
                warning
              </span>
              Pending ⚠
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 800, margin: "6px 0 2px", fontFamily: "var(--font-display)", color: todayReport && todayReport.pending > 0 ? "#b45309" : "var(--ink)" }}>
              {todayReport ? todayReport.pending : "-"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)" }}>
              {todayReport && todayReport.pending === 0 ? "All classes posted 🎉" : "Awaiting attendance"}
            </div>
          </div>

          {/* Late Today */}
          <div style={{ backgroundColor: "var(--surface-container-lowest)", padding: 16, borderRadius: 12, border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: todayReport && todayReport.late_count > 0 ? "#d97706" : "var(--ink-muted)", display: "flex", alignItems: "center", gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: todayReport && todayReport.late_count > 0 ? "#d97706" : "var(--ink-muted)" }}>
                schedule
              </span>
              Late Today
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 800, margin: "6px 0 2px", fontFamily: "var(--font-display)", color: todayReport && todayReport.late_count > 0 ? "#d97706" : "var(--ink)" }}>
              {todayReport ? todayReport.late_count : "-"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)" }}>
              {todayReport && todayReport.late_count > 0 ? "Past grace window" : "All posted on time"}
            </div>
          </div>

          {/* Attendance % */}
          <div style={{ backgroundColor: "var(--surface-container-lowest)", padding: 16, borderRadius: 12, border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--primary)", display: "flex", alignItems: "center", gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--primary)" }}>trending_up</span>
              Attendance %
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 800, margin: "6px 0 2px", fontFamily: "var(--font-display)", color: "var(--primary)" }}>
              {todayReport ? `${todayReport.attendance_percentage}%` : "-"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)" }}>Present student ratio</div>
          </div>
        </div>
      </div>

      {/* TODAY BY SECTION TABLE */}
      <div className="card" style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.1rem", color: "var(--on-surface)", display: "flex", alignItems: "center", gap: 8 }}>
              <span className="material-symbols-outlined" style={{ color: "var(--secondary)" }}>table_chart</span>
              Today's Attendance by Section
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--ink-muted)" }}>
              Click any section row to inspect pending periods and assigned faculty
            </p>
          </div>

          {/* Pending first toggle */}
          <button
            type="button"
            className="btn secondary"
            onClick={() => setPendingFirst(!pendingFirst)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.82rem",
              padding: "6px 12px",
              backgroundColor: pendingFirst ? "var(--primary-fixed)" : "transparent",
              color: pendingFirst ? "var(--primary)" : "var(--ink-soft)",
              borderColor: pendingFirst ? "var(--primary)" : "var(--border)",
              fontWeight: pendingFirst ? 700 : 500,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              {pendingFirst ? "check" : "sort"}
            </span>
            Sort Pending First
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <Spinner label="Loading today's section attendance…" />
          </div>
        ) : sortedSections.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--ink-muted)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.5, marginBottom: 8 }}>event_busy</span>
            <div>No sections scheduled for today (e.g. Sunday or holiday).</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--ink-muted)", fontSize: "0.78rem", textTransform: "uppercase" }}>
                  <th style={{ padding: "10px 12px" }}>Section</th>
                  <th style={{ padding: "10px 12px" }}>Posted</th>
                  <th style={{ padding: "10px 12px" }}>Pending</th>
                  <th style={{ padding: "10px 12px" }}>Attendance %</th>
                  <th style={{ padding: "10px 12px", textAlign: "right" }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {sortedSections.map((sec) => {
                  const isExpanded = expandedSectionIds.has(sec.section_id);
                  const secPendingItems = pendingBySection.get(sec.section_id) || [];
                  const isComplete = sec.pending === 0 && sec.scheduled > 0;

                  return (
                    <React.Fragment key={sec.section_id}>
                      <tr
                        onClick={() => toggleExpandSection(sec.section_id)}
                        style={{
                          borderBottom: isExpanded ? "none" : "1px solid var(--border-subtle)",
                          cursor: "pointer",
                          backgroundColor: isExpanded ? "var(--surface-container-low)" : "transparent",
                          transition: "background-color 0.15s ease",
                        }}
                      >
                        <td style={{ padding: "12px", fontWeight: 700, color: "var(--on-surface)" }}>
                          {sec.display_name}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <span style={{ fontWeight: 600 }}>{sec.posted}</span>
                          <span style={{ color: "var(--ink-muted)" }}> / {sec.scheduled}</span>
                        </td>
                        <td style={{ padding: "12px" }}>
                          {sec.pending > 0 ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "2px 8px",
                                borderRadius: 999,
                                backgroundColor: "rgba(217, 119, 6, 0.12)",
                                color: "#b45309",
                                fontWeight: 700,
                                fontSize: "0.82rem",
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>warning</span>
                              {sec.pending} pending
                            </span>
                          ) : isComplete ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "2px 8px",
                                borderRadius: 999,
                                backgroundColor: "var(--present-bg)",
                                color: "var(--present)",
                                fontWeight: 700,
                                fontSize: "0.82rem",
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span>
                              ✓ All posted
                            </span>
                          ) : (
                            <span style={{ color: "var(--ink-muted)", fontSize: "0.82rem" }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontWeight: 700, minWidth: 42 }}>{sec.attendance_percentage}%</span>
                            <div className="progress-container" style={{ width: 80, height: 6, margin: 0 }}>
                              <div className="progress-track" style={{ height: 6 }}>
                                <div
                                  className="progress-fill"
                                  style={{
                                    width: `${Math.min(100, sec.attendance_percentage)}%`,
                                    height: 6,
                                    backgroundColor: sec.attendance_percentage >= 75 ? "var(--present)" : "var(--absent)",
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px", textAlign: "right" }}>
                          <span className="material-symbols-outlined" style={{ color: "var(--ink-muted)", transition: "transform 0.2s ease", transform: isExpanded ? "rotate(180deg)" : "none" }}>
                            expand_more
                          </span>
                        </td>
                      </tr>

                      {/* Expandable row showing pending periods */}
                      {isExpanded && (
                        <tr style={{ backgroundColor: "var(--surface-container-low)", borderBottom: "1px solid var(--border)" }}>
                          <td colSpan={5} style={{ padding: "0 16px 16px 16px" }}>
                            <div style={{ backgroundColor: "var(--paper-raised)", borderRadius: 10, padding: 14, border: "1px solid var(--border-subtle)" }}>
                              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--ink-soft)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                                Pending Periods for {sec.display_name}
                              </div>

                              {secPendingItems.length === 0 ? (
                                <div style={{ color: "var(--present)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6 }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
                                  All scheduled timetable periods for this section are posted!
                                </div>
                              ) : (
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                                  {secPendingItems.map((item, pIdx) => (
                                    <div
                                      key={pIdx}
                                      style={{
                                        border: "1px solid var(--border-subtle)",
                                        borderRadius: 8,
                                        padding: 10,
                                        backgroundColor: "var(--surface)",
                                      }}
                                    >
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                        <span style={{ fontWeight: 800, color: "var(--primary)", fontSize: "0.88rem" }}>
                                          Period {item.period_number}
                                        </span>
                                        {item.minutes_overdue > 0 ? (
                                          <span
                                            style={{
                                              fontSize: "0.72rem",
                                              padding: "2px 6px",
                                              borderRadius: 4,
                                              backgroundColor: "rgba(217, 119, 6, 0.15)",
                                              color: "#b45309",
                                              fontWeight: 700,
                                            }}
                                          >
                                            {item.minutes_overdue}m overdue
                                          </span>
                                        ) : (
                                          <span style={{ fontSize: "0.72rem", color: "var(--ink-muted)" }}>
                                            Starts {item.scheduled_start.slice(11, 16)}
                                          </span>
                                        )}
                                      </div>
                                      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--on-surface)", marginBottom: 2 }}>
                                        {item.subject}
                                      </div>
                                      <div style={{ fontSize: "0.78rem", color: "var(--ink-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>person</span>
                                        {item.owner_faculty}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* LATE ATTENDANCE MONITORING PANEL */}
      <div className="card" style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.1rem", color: "var(--on-surface)", display: "flex", alignItems: "center", gap: 8 }}>
              <span className="material-symbols-outlined" style={{ color: "#d97706" }}>schedule</span>
              Late Attendance Monitoring (Past 30 Days)
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--ink-muted)" }}>
              {lateReport ? `${lateReport.total_late_postings} total late sessions identified beyond grace window` : "Loading late posting statistics..."}
            </p>
          </div>

          <button
            type="button"
            className="btn secondary"
            onClick={() => onNavigateTab && onNavigateTab("audit_logs")}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.82rem", padding: "6px 12px" }}
          >
            <span>View in Audit Logs</span>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
          </button>
        </div>

        {lateReport && lateReport.top_faculty.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            {lateReport.top_faculty.map((f, idx) => (
              <div
                key={f.faculty_id}
                style={{
                  padding: "14px 16px",
                  borderRadius: 10,
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border-subtle)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        backgroundColor: idx === 0 ? "#fef3c7" : "var(--surface-container-high)",
                        color: idx === 0 ? "#b45309" : "var(--ink-muted)",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {idx + 1}
                    </span>
                    <strong style={{ fontSize: "0.92rem", color: "var(--ink)" }}>{f.faculty_name}</strong>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--ink-muted)" }}>
                    {f.department ? `${f.department} · ` : ""}avg delay ~{Math.round(f.avg_late_minutes)}m
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 9px",
                      borderRadius: 9999,
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      backgroundColor: "#fef3c7",
                      color: "#b45309",
                      border: "1px solid #fde68a",
                    }}
                  >
                    {f.late_count} {f.late_count === 1 ? "time" : "times"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: "24px 16px",
              textAlign: "center",
              backgroundColor: "var(--surface)",
              borderRadius: 8,
              border: "1px dashed var(--border)",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 32, color: "var(--present)", marginBottom: 4 }}>
              verified
            </span>
            <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: "0.92rem" }}>
              Zero late submissions in the last 30 days
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--ink-muted)", marginTop: 2 }}>
              All faculty members have submitted class attendance within the allowed grace window.
            </div>
          </div>
        )}
      </div>

      {/* QUICK MANAGEMENT SHORTCUTS */}
      <h3 style={{ fontSize: "0.82rem", color: "var(--on-surface-variant)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>
        Quick Management
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div
          className="card"
          style={{ marginBottom: 0, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
          onClick={() => onNavigateTab && onNavigateTab("faculty")}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--primary-fixed)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-outlined">groups</span>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Faculty Management</div>
              <div style={{ fontSize: "0.8rem", color: "var(--on-surface-variant)", marginTop: 2 }}>{stats ? `${stats.active_faculty} active staff` : "Staff directory"}</div>
            </div>
          </div>
          <span className="material-symbols-outlined" style={{ color: "var(--ink-muted)" }}>chevron_right</span>
        </div>

        <div
          className="card"
          style={{ marginBottom: 0, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
          onClick={() => onNavigateTab && onNavigateTab("subjects")}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--primary-fixed)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-outlined">menu_book</span>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Subjects &amp; Allocations</div>
              <div style={{ fontSize: "0.8rem", color: "var(--on-surface-variant)", marginTop: 2 }}>Subject allocations</div>
            </div>
          </div>
          <span className="material-symbols-outlined" style={{ color: "var(--ink-muted)" }}>chevron_right</span>
        </div>

        <div
          className="card"
          style={{ marginBottom: 0, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
          onClick={() => onNavigateTab && onNavigateTab("students")}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--primary-fixed)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-outlined">school</span>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Student Master List</div>
              <div style={{ fontSize: "0.8rem", color: "var(--on-surface-variant)", marginTop: 2 }}>{stats ? `${stats.total_students} enrolled` : "Student rosters"}</div>
            </div>
          </div>
          <span className="material-symbols-outlined" style={{ color: "var(--ink-muted)" }}>chevron_right</span>
        </div>

        <div
          className="card"
          style={{ marginBottom: 0, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
          onClick={() => onNavigateTab && onNavigateTab("timetable")}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--primary-fixed)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-outlined">calendar_month</span>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Sections &amp; Timetable</div>
              <div style={{ fontSize: "0.8rem", color: "var(--on-surface-variant)", marginTop: 2 }}>Daily bell schedules</div>
            </div>
          </div>
          <span className="material-symbols-outlined" style={{ color: "var(--ink-muted)" }}>chevron_right</span>
        </div>
      </div>
    </div>
  );
}
