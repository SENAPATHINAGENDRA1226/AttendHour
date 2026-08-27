import { useEffect, useState } from "react";
import { api } from "../../api/client";
import Spinner from "../../components/Spinner";
import ErrorBanner from "../../components/ErrorBanner";
import { SectionSummaryOut, AdminStatsOut } from "../../types";

interface AdminOverviewProps {
  onNavigateTab?: (tab: string) => void;
}

export default function AdminOverview({ onNavigateTab }: AdminOverviewProps) {
  const [data, setData] = useState<SectionSummaryOut[]>([]);
  const [stats, setStats] = useState<AdminStatsOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [summaryRes, statsRes] = await Promise.all([
        api.get<SectionSummaryOut[]>("/admin/reports/section-summary"),
        api.get<AdminStatsOut>("/admin/reports/stats"),
      ]);
      setData(summaryRes.data);
      setStats(statsRes.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to load department overview statistics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <h1 className="page-heading">Department Overview</h1>
      <p className="page-subheading">{todayFormatted} · {stats?.department_name || "Department Overview"}</p>

      {error && <ErrorBanner message={error} onRetry={load} />}

      {/* 4 Metric Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ color: "var(--on-surface-variant)", fontSize: "0.82rem", fontWeight: 600, display: "flex", gap: 8, alignItems: "center" }}>
            <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>groups</span> Total Faculty
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, margin: "8px 0 4px", fontFamily: "var(--font-display)", color: "var(--on-surface)" }}>
            {stats ? stats.total_faculty : "-"}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--ink-muted)" }}>
            {stats ? `${stats.active_faculty} active, ${stats.inactive_faculty} inactive` : "Loading staff..."}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ color: "var(--on-surface-variant)", fontSize: "0.82rem", fontWeight: 600, display: "flex", gap: 8, alignItems: "center" }}>
            <span className="material-symbols-outlined" style={{ color: "var(--secondary)" }}>view_agenda</span> Total Sections
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, margin: "8px 0 4px", fontFamily: "var(--font-display)", color: "var(--on-surface)" }}>
            {stats ? stats.total_sections : data.length}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--ink-muted)" }}>Active department sections</div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ color: "var(--on-surface-variant)", fontSize: "0.82rem", fontWeight: 600, display: "flex", gap: 8, alignItems: "center" }}>
            <span className="material-symbols-outlined" style={{ color: "var(--secondary-container)" }}>school</span> Total Students
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, margin: "8px 0 4px", fontFamily: "var(--font-display)", color: "var(--on-surface)" }}>
            {stats ? stats.total_students : "-"}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--ink-muted)" }}>Enrolled in master list</div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ color: "var(--on-surface-variant)", fontSize: "0.82rem", fontWeight: 600, display: "flex", gap: 8, alignItems: "center" }}>
            <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>trending_up</span> Today's Attendance
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, margin: "8px 0 4px", color: "var(--primary)", fontFamily: "var(--font-display)" }}>
            {stats ? `${stats.today_attendance_percentage}%` : "-"}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--ink-muted)" }}>
            {stats ? `${stats.today_posted_periods} of ${stats.today_total_periods} periods posted` : "Loading attendance..."}
          </div>
        </div>
      </div>

      {/* MANAGE Cards Grid */}
      <h3 style={{ fontSize: "0.82rem", color: "var(--on-surface-variant)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>
        Quick Management
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 32 }}>
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
              <div style={{ fontSize: "0.8rem", color: "var(--on-surface-variant)", marginTop: 2 }}>Add, edit or deactivate staff</div>
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
              <div style={{ fontSize: "0.8rem", color: "var(--on-surface-variant)", marginTop: 2 }}>Year-wise subjects &amp; faculty</div>
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
              <div style={{ fontSize: "0.8rem", color: "var(--on-surface-variant)", marginTop: 2 }}>Upload Excel/CSV roster</div>
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
              <div style={{ fontSize: "0.8rem", color: "var(--on-surface-variant)", marginTop: 2 }}>Sections and period schedule</div>
            </div>
          </div>
          <span className="material-symbols-outlined" style={{ color: "var(--ink-muted)" }}>chevron_right</span>
        </div>
      </div>

      {/* TODAY BY SECTION List */}
      <h3 style={{ fontSize: "0.82rem", color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>
        TODAY BY SECTION
      </h3>
      <div className="card">
        {loading ? (
          <div style={{ padding: 20, textAlign: "center" }}><Spinner label="Loading section statistics…" /></div>
        ) : data.length === 0 ? (
          <div style={{ color: "var(--ink-soft)", textAlign: "center" }}>No section summaries available.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {data.map((sec) => (
              <div key={sec.section_id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{sec.section_name}</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--ink-muted)" }}>{sec.total_students} students · Theory + Lab</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--ink)" }}>
                    {sec.average_attendance_percentage}%
                  </div>
                </div>

                <div className="progress-container">
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.min(100, sec.average_attendance_percentage)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

