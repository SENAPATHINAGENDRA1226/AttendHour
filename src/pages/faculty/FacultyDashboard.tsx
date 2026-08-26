import { useEffect, useMemo, useState } from "react";
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

  const groupedClasses = useMemo(() => {
    const map = new Map<string, {
      section_id: number;
      section_name: string;
      subject_id: number;
      subject_name: string;
      periods: number[];
      isPending: boolean;
      outboxCount: number;
      timetable_entry_id: number;
    }>();

    classes.forEach((cls) => {
      const key = `${cls.section_id}-${cls.subject_id}`;
      const existing = map.get(key);
      const outCount = outboxItems.filter(
        (o) => o.payload?.section_id === cls.section_id && o.payload?.date === date && o.payload?.period_numbers?.includes(cls.period_number)
      ).length;

      if (!existing) {
        map.set(key, {
          section_id: cls.section_id,
          section_name: cls.section_name,
          subject_id: cls.subject_id,
          subject_name: cls.subject_name,
          periods: [cls.period_number],
          isPending: cls.session_status !== "held",
          outboxCount: outCount,
          timetable_entry_id: cls.timetable_entry_id,
        });
      } else {
        if (!existing.periods.includes(cls.period_number)) {
          existing.periods.push(cls.period_number);
          existing.periods.sort((a, b) => a - b);
        }
        if (cls.session_status !== "held") existing.isPending = true;
        existing.outboxCount += outCount;
      }
    });

    return Array.from(map.values());
  }, [classes, outboxItems, date]);

  function goMarkGroup(group: { section_id: number; section_name: string; subject_id: number; subject_name: string; periods: number[] }) {
    const params = new URLSearchParams({
      section_id: String(group.section_id),
      section_name: group.section_name,
      subject_id: String(group.subject_id),
      subject_name: group.subject_name,
      date: date,
      periods: group.periods.join(","),
    });
    navigate(`/faculty/mark?${params.toString()}`);
  }

  function getPeriodTime(periodNumber: number): string {
    const times: Record<number, string> = {
      1: "09:00 - 09:50",
      2: "09:50 - 10:40",
      3: "10:40 - 11:30",
      4: "11:30 - 12:20",
      5: "01:10 - 02:00",
      6: "02:00 - 02:50",
      7: "02:50 - 03:40",
    };
    return times[periodNumber] || "10:40 - 11:30";
  }

  return (
    <SidebarLayout>
      <h1 className="page-heading">Good morning, {firstName}</h1>
      <p className="page-subheading">Your classes for the selected date, straight from the department timetable.</p>

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
      ) : groupedClasses.length === 0 ? (
        <div className="card" style={{ textAlign: "center", color: "var(--ink-soft)" }}>
          No classes scheduled for {date}.
        </div>
      ) : (
        groupedClasses.map((grp) => {
          const isMultiple = grp.periods.length > 1;
          const periodLabel = isMultiple
            ? `Period ${grp.periods.join(" & ")} (Double Period)`
            : `Period ${grp.periods[0]}`;

          const periodTimeLabel = isMultiple
            ? `${getPeriodTime(grp.periods[0]).split(" - ")[0]} - ${getPeriodTime(grp.periods[grp.periods.length - 1]).split(" - ")[1]}`
            : getPeriodTime(grp.periods[0]);

          return (
            <div key={`${grp.section_id}-${grp.subject_id}`} className="class-card">
              <div className="class-card-header">
                <div className="class-title">{grp.section_name}</div>
                <div>
                  {grp.outboxCount > 0 ? (
                    <span className="status-badge pending">Pending Sync ({grp.outboxCount})</span>
                  ) : grp.isPending ? (
                    <span className="status-badge pending">Pending</span>
                  ) : (
                    <span className="status-badge posted">✓ Posted</span>
                  )}
                </div>
              </div>

              <div className="class-subject">{grp.subject_name}</div>

              <div className="period-pill">
                <span>{periodLabel}</span>
                <span>🕒 {periodTimeLabel}</span>
              </div>

              {grp.isPending ? (
                <button className="btn large" onClick={() => goMarkGroup(grp)}>
                  Take Attendance
                </button>
              ) : (
                <div>
                  <button className="btn secondary large" onClick={() => goMarkGroup(grp)}>
                    View / Edit Attendance
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </SidebarLayout>
  );
}
