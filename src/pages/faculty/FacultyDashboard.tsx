import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { TodayClass, RecentSessionSummary } from "../../types";
import Spinner from "../../components/Spinner";
import ErrorBanner from "../../components/ErrorBanner";
import { SidebarLayout } from "../../components/SidebarLayout";
import { useAuth } from "../../context/AuthContext";

function todayISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateFriendly(dateStr: string) {
  try {
    const parts = dateStr.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function FacultyDashboard() {
  const { auth } = useAuth();
  const [date, setDate] = useState(todayISO());
  const [classes, setClasses] = useState<TodayClass[]>([]);
  const [recentSessions, setRecentSessions] = useState<RecentSessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const firstName = auth?.fullName ? auth.fullName.split(" ")[0] : auth?.username || "Faculty";

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [resClasses, resProfile] = await Promise.allSettled([
        api.get<TodayClass[]>("/faculty/today", { params: { for_date: date } }),
        api.get<{ recent_sessions: RecentSessionSummary[] }>("/faculty/profile"),
      ]);

      if (resClasses.status === "fulfilled") {
        setClasses(resClasses.value.data);
      } else {
        setError("Failed to load class schedule for the selected date.");
      }

      if (resProfile.status === "fulfilled" && resProfile.value.data?.recent_sessions) {
        setRecentSessions(resProfile.value.data.recent_sessions.slice(0, 5));
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to load class schedule.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [date]);

  function goMark(cls: TodayClass) {
    const defaultPeriods = cls.scheduled_periods && cls.scheduled_periods.length > 0
      ? cls.scheduled_periods.join(",")
      : cls.periods_posted && cls.periods_posted.length > 0
      ? cls.periods_posted.join(",")
      : "1";

    const params = new URLSearchParams({
      section_id: String(cls.section_id),
      section_name: cls.section_name,
      subject_id: String(cls.subject_id),
      subject_name: cls.subject_name,
      date: date,
      periods: defaultPeriods,
    });
    navigate(`/faculty/mark?${params.toString()}`);
  }

  const isToday = date === todayISO();
  const postedCount = classes.reduce((sum, c) => sum + (c.periods_posted?.length || 0), 0);
  const totalScheduledCount = classes.reduce((sum, c) => sum + ((c.scheduled_periods && c.scheduled_periods.length > 0) ? c.scheduled_periods.length : 1), 0);

  return (
    <SidebarLayout>
      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-heading" style={{ margin: 0 }}>Welcome, {firstName} 👋</h1>
          <p className="page-subheading" style={{ margin: "4px 0 0" }}>
            Avanthi Institute of Engineering and Technology · Faculty Attendance Portal
          </p>
        </div>

        <button
          className="btn secondary"
          onClick={load}
          disabled={loading}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: "0.85rem" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>sync</span>
          Refresh Schedule
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ margin: 0, padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: "0.82rem", color: "var(--ink-soft)", fontWeight: 600 }}>SCHEDULE DATE</span>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--primary)" }}>event</span>
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--ink-dark)" }}>
            {formatDateFriendly(date)}
          </div>
          <div style={{ fontSize: "0.76rem", color: isToday ? "#16a34a" : "var(--ink-soft)", fontWeight: 600, marginTop: 4 }}>
            {isToday ? "● Today's Classes" : "Historical Attendance Date"}
          </div>
        </div>

        <div className="card" style={{ margin: 0, padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: "0.82rem", color: "var(--ink-soft)", fontWeight: 600 }}>CLASSES TODAY</span>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#2563eb" }}>groups</span>
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--ink-dark)" }}>
            {classes.length} <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--ink-soft)" }}>allocated class{classes.length === 1 ? "" : "es"}</span>
          </div>
          <div style={{ fontSize: "0.76rem", color: "var(--ink-soft)", marginTop: 4 }}>
            According to your weekly timetable
          </div>
        </div>

        <div className="card" style={{ margin: 0, padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: "0.82rem", color: "var(--ink-soft)", fontWeight: 600 }}>ATTENDANCE STATUS</span>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: postedCount > 0 ? "#16a34a" : "var(--ink-soft)" }}>
              {postedCount > 0 ? "check_circle" : "pending_actions"}
            </span>
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: postedCount >= totalScheduledCount && totalScheduledCount > 0 ? "#16a34a" : postedCount > 0 ? "#ca8a04" : "var(--ink-dark)" }}>
            {postedCount} / {totalScheduledCount} <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--ink-soft)" }}>periods marked</span>
          </div>
          <div style={{ fontSize: "0.76rem", color: postedCount >= totalScheduledCount && totalScheduledCount > 0 ? "#16a34a" : "var(--ink-soft)", marginTop: 4 }}>
            {postedCount >= totalScheduledCount && totalScheduledCount > 0 ? "All scheduled classes completed" : `${totalScheduledCount - postedCount} period(s) remaining`}
          </div>
        </div>
      </div>

      {/* Date selector with quick buttons */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 260 }}>
            <label htmlFor="attendance-date" style={{ margin: 0, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--primary)" }}>calendar_today</span>
              Select Date:
            </label>
            <input
              id="attendance-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ maxWidth: "220px" }}
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className={`btn ${date === todayISO() ? "" : "secondary"}`}
              style={{ padding: "6px 14px", fontSize: "0.82rem" }}
              onClick={() => setDate(todayISO())}
            >
              Today
            </button>
            <button
              type="button"
              className={`btn ${date === yesterdayISO() ? "" : "secondary"}`}
              style={{ padding: "6px 14px", fontSize: "0.82rem" }}
              onClick={() => setDate(yesterdayISO())}
            >
              Yesterday
            </button>
          </div>
        </div>
      </div>

      {/* Class List */}
      <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 22, color: "var(--primary)" }}>checklist</span>
        Scheduled Classes for {formatDateFriendly(date)}
      </h2>

      {loading ? (
        <div style={{ padding: "50px 0", textAlign: "center" }}>
          <Spinner label="Loading your timetable schedule…" />
        </div>
      ) : classes.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 20px", color: "var(--ink-soft)" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 44, color: "var(--ink-muted)", marginBottom: 12 }}>event_busy</span>
          <div style={{ fontWeight: 600, fontSize: "1.05rem", color: "var(--ink-dark)" }}>No Classes Scheduled Today</div>
          <p style={{ margin: "6px 0 0", fontSize: "0.88rem" }}>
            You do not have any teaching classes scheduled on this day according to your timetable.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 28 }}>
          {classes.map((cls) => {
            const postedPeriods = cls.periods_posted || [];
            const schedPeriods = cls.scheduled_periods || [];
            const isCompleted = schedPeriods.length > 0 && schedPeriods.every(p => postedPeriods.includes(p));
            const hasPartial = postedPeriods.length > 0;

            return (
              <div key={`${cls.section_id}-${cls.subject_id}`} className="class-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div className="class-card-header">
                    <div className="class-title">{cls.section_name}</div>
                    <div>
                      {isCompleted ? (
                        <span className="status-badge posted">✓ Completed</span>
                      ) : hasPartial ? (
                        <span className="status-badge pending">Partial ({postedPeriods.length}/{schedPeriods.length || 1})</span>
                      ) : (
                        <span className="status-badge pending">Pending</span>
                      )}
                    </div>
                  </div>

                  <div className="class-subject" style={{ marginBottom: 12 }}>
                    <strong>{cls.subject_name}</strong> <span style={{ opacity: 0.75 }}>({cls.subject_code})</span>
                  </div>

                  {schedPeriods.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)", fontWeight: 600, marginBottom: 4 }}>
                        TIMETABLE SLOTS:
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {schedPeriods.map((p) => {
                          const isPst = postedPeriods.includes(p);
                          return (
                            <span
                              key={p}
                              className="period-pill"
                              style={{
                                margin: 0,
                                background: isPst ? "#16a34a" : "var(--primary)",
                                color: "#fff",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              Period {p} {isPst ? "✓" : ""}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  className={`btn large ${isCompleted ? "secondary" : ""}`}
                  onClick={() => goMark(cls)}
                  style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    {isCompleted ? "edit_note" : "fact_check"}
                  </span>
                  {isCompleted ? "Review / Edit Attendance" : "Take Attendance"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Attendance Activity */}
      {recentSessions.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: "1.05rem", display: "flex", alignItems: "center", gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--primary)" }}>history</span>
              Recent Attendance History
            </h3>
            <button
              className="btn secondary"
              style={{ padding: "4px 10px", fontSize: "0.8rem" }}
              onClick={() => navigate("/faculty/profile")}
            >
              View Full History →
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", fontSize: "0.86rem" }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Period</th>
                  <th>Section</th>
                  <th>Subject</th>
                  <th>Attendance</th>
                  <th>Rate</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.date}</td>
                    <td><span className="period-pill" style={{ margin: 0 }}>P{s.period_number}</span></td>
                    <td>{s.section_name}</td>
                    <td>{s.subject_name}</td>
                    <td>
                      {s.status === "held" ? (
                        <span><strong style={{ color: "#16a34a" }}>{s.present_count}</strong> / {s.total_students} Present</span>
                      ) : (
                        <span className="status-badge pending">{s.status}</span>
                      )}
                    </td>
                    <td>
                      {s.status === "held" ? (
                        <span style={{ fontWeight: 700, color: s.percentage >= 75 ? "#16a34a" : s.percentage >= 65 ? "#ca8a04" : "#dc2626" }}>
                          {s.percentage}%
                        </span>
                      ) : "—"}
                    </td>
                    <td>
                      <button
                        className="btn secondary"
                        style={{ padding: "3px 8px", fontSize: "0.76rem" }}
                        onClick={() => {
                          const p = new URLSearchParams({
                            section_id: String(s.section_id),
                            section_name: s.section_name,
                            subject_id: String(s.subject_id),
                            subject_name: s.subject_name,
                            date: s.date,
                            periods: String(s.period_number),
                          });
                          navigate(`/faculty/mark?${p.toString()}`);
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}


