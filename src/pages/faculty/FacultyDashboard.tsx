import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { TodayClass } from "../../types";
import Spinner from "../../components/Spinner";
import ErrorBanner from "../../components/ErrorBanner";
import { SidebarLayout } from "../../components/SidebarLayout";
import { useAuth } from "../../context/AuthContext";
import { getOutboxItems, OutboxItem } from "../../api/outbox";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function FacultyDashboard() {
  const { auth } = useAuth();
  const [date, setDate] = useState(todayISO());
  const [classes, setClasses] = useState<TodayClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [outboxItems, setOutboxItems] = useState<OutboxItem[]>([]);
  const navigate = useNavigate();

  const firstName = auth?.fullName ? (auth.fullName.split(" ")[1] || auth.fullName.split(" ")[0]) : (auth?.username || "Faculty");

  async function loadOutbox() {
    const items = await getOutboxItems();
    setOutboxItems(items);
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<TodayClass[]>("/faculty/today", { params: { for_date: date } });
      setClasses(res.data);
      await loadOutbox();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to load class schedule.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [date]);

  useEffect(() => {
    const handleOutboxChange = () => { loadOutbox(); };
    window.addEventListener("outbox-changed", handleOutboxChange);
    return () => window.removeEventListener("outbox-changed", handleOutboxChange);
  }, []);

  function goMark(cls: TodayClass) {
    const params = new URLSearchParams({
      section_id: String(cls.section_id),
      section_name: cls.section_name,
      subject_id: String(cls.subject_id),
      subject_name: cls.subject_name,
      date: date,
    });
    navigate(`/faculty/mark?${params.toString()}`);
  }

  return (
    <SidebarLayout>
      <h1 className="page-heading">Good morning, {firstName}</h1>
      <p className="page-subheading">Your allocated classes. Select a date and take attendance.</p>

      {error && <ErrorBanner message={error} onRetry={load} />}

      {/* Date selector card */}
      <div className="card">
        <label htmlFor="attendance-date">📅 Attendance date</label>
        <input
          id="attendance-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ maxWidth: "400px" }}
        />
      </div>

      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center" }}>
          <Spinner label="Loading schedule…" />
        </div>
      ) : classes.length === 0 ? (
        <div className="card" style={{ textAlign: "center", color: "var(--ink-soft)" }}>
          No classes allocated to you. Contact admin to set up your allocations.
        </div>
      ) : (
        classes.map((cls) => {
          const outCount = outboxItems.filter(
            (o) => o.payload?.section_id === cls.section_id && o.payload?.subject_id === cls.subject_id && o.payload?.date === date
          ).length;

          const postedCount = cls.periods_posted.length;
          const hasPosted = postedCount > 0;

          return (
            <div key={`${cls.section_id}-${cls.subject_id}`} className="class-card">
              <div className="class-card-header">
                <div className="class-title">{cls.section_name}</div>
                <div>
                  {outCount > 0 ? (
                    <span className="status-badge pending">Pending Sync ({outCount})</span>
                  ) : hasPosted ? (
                    <span className="status-badge posted">✓ {postedCount} period{postedCount > 1 ? "s" : ""} posted</span>
                  ) : (
                    <span className="status-badge pending">No attendance yet</span>
                  )}
                </div>
              </div>

              <div className="class-subject">{cls.subject_name} ({cls.subject_code})</div>

              {hasPosted && (
                <div className="period-pill">
                  <span>Posted periods: {cls.periods_posted.join(", ")}</span>
                </div>
              )}

              <button className="btn large" onClick={() => goMark(cls)}>
                {hasPosted ? "View / Edit Attendance" : "Take Attendance"}
              </button>
            </div>
          );
        })
      )}
    </SidebarLayout>
  );
}
