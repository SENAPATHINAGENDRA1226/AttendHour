import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { ScheduledClassForCoverOut } from "../../types";
import { SidebarLayout } from "../../components/SidebarLayout";
import { useAuth } from "../../context/AuthContext";
import Spinner from "../../components/Spinner";
import ErrorBanner from "../../components/ErrorBanner";

function todayISO() {
  const d = new Date();
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

const YEAR_COLORS: Record<number, { color: string; bg: string }> = {
  1: { color: "#0369a1", bg: "#e0f2fe" },
  2: { color: "#3730a3", bg: "#e0e7ff" },
  3: { color: "#5b21b6", bg: "#ede9fe" },
  4: { color: "#86198f", bg: "#fae8ff" },
};

export default function CoverForColleague() {
  const { operator } = useAuth();
  const [date, setDate] = useState(todayISO());
  const [search, setSearch] = useState("");
  const [classes, setClasses] = useState<ScheduledClassForCoverOut[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function loadClasses() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<ScheduledClassForCoverOut[]>("/faculty-shared/all-classes-today", {
        params: { date, search: search || undefined },
      });
      setClasses(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to load scheduled classes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClasses();
  }, [date, search]);

  function handleMark(cls: ScheduledClassForCoverOut) {
    const params = new URLSearchParams({
      section_id: String(cls.section_id),
      section_name: cls.section_name,
      subject_id: String(cls.subject_id),
      subject_name: cls.subject_name,
      date: date,
      periods: String(cls.period_number),
      owner_id: String(cls.faculty_id),
      owner_name: cls.faculty_name,
    });
    navigate(`/faculty/mark?${params.toString()}`);
  }

  // Determine which years exist in the data
  const availableYears = useMemo(() => {
    const years = new Set(classes.map((c) => c.year).filter((y) => y > 0));
    return Array.from(years).sort((a, b) => a - b);
  }, [classes]);

  // Default to 0 (All Years) if current selectedYear is not valid
  useEffect(() => {
    if (availableYears.length > 0) {
      if (selectedYear === null) {
        setSelectedYear(0); // All Years by default so faculty with both years see all periods
      } else if (selectedYear !== 0 && !availableYears.includes(selectedYear)) {
        setSelectedYear(0);
      }
    }
  }, [availableYears, selectedYear]);

  const activeYear = selectedYear ?? 0;

  // Filter classes by active year (0 = All Years)
  const filteredClasses = useMemo(() => {
    if (activeYear === 0) return classes;
    return classes.filter((c) => c.year === activeYear);
  }, [classes, activeYear]);

  // Group filtered classes by period number
  const periodGroups = useMemo(() => {
    const groups: Map<number, ScheduledClassForCoverOut[]> = new Map();
    for (const cls of filteredClasses) {
      if (!groups.has(cls.period_number)) {
        groups.set(cls.period_number, []);
      }
      groups.get(cls.period_number)!.push(cls);
    }
    // Sort periods
    return Array.from(groups.entries()).sort(([a], [b]) => a - b);
  }, [filteredClasses]);

  const postedCount = filteredClasses.filter((c) => c.is_posted).length;
  const totalCount = filteredClasses.length;

  const displayYears = availableYears.length > 0 ? availableYears : [2, 3];

  return (
    <SidebarLayout>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Post for Another Faculty</h1>
          <p style={{ margin: "4px 0 0", color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
            Today's timetable schedule organized by period. Mark attendance for any class.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="btn secondary" onClick={() => navigate("/faculty")}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, marginRight: 6 }}>arrow_back</span>
            Back to My Classes
          </button>
        </div>
      </div>

      {operator && (
        <div
          style={{
            padding: "10px 16px",
            background: "var(--color-surface-raised, #f0fdf4)",
            border: "1px solid var(--color-success-border, #bbf7d0)",
            borderRadius: 8,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="material-symbols-outlined" style={{ color: "var(--color-success, #15803d)" }}>
              account_circle
            </span>
            <span style={{ fontSize: "0.9rem", color: "var(--color-text)" }}>
              Operating as: <strong>{operator.name}</strong>
            </span>
          </div>
          <button
            className="btn small secondary"
            onClick={() => navigate("/faculty/select")}
            style={{ fontSize: "0.8rem", padding: "4px 10px" }}
          >
            Switch Operator
          </button>
        </div>
      )}

      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

      {/* Controls Card */}
      <div
        className="card"
        style={{
          padding: 16,
          marginBottom: 20,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label htmlFor="cover-date" style={{ fontWeight: 600, fontSize: "0.9rem" }}>
              Date:
            </label>
            <input
              id="cover-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ padding: "6px 10px" }}
            />
          </div>

          <div style={{ flex: 1, minWidth: 260 }}>
            <input
              type="text"
              placeholder="Search by faculty name, subject, or section…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", padding: "7px 12px" }}
            />
          </div>

          <button className="btn secondary" onClick={loadClasses} disabled={loading} style={{ padding: "7px 14px", display: "flex", alignItems: "center", gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>sync</span>
            Refresh
          </button>
        </div>

        {/* Year Tabs */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", borderTop: "1px solid var(--color-border)", paddingTop: 16 }}>
          <button
            type="button"
            onClick={() => setSelectedYear(0)}
            style={{
              borderRadius: 20,
              padding: "6px 18px",
              fontWeight: activeYear === 0 ? 700 : 600,
              fontSize: "0.85rem",
              cursor: "pointer",
              border: activeYear === 0 ? "2px solid var(--primary)" : "1px solid var(--border)",
              backgroundColor: activeYear === 0 ? "var(--primary)" : "var(--color-surface-raised, #f8fafc)",
              color: activeYear === 0 ? "#ffffff" : "var(--ink-dark)",
              transition: "all 0.15s ease",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
              apps
            </span>
            All Years
          </button>
          {displayYears.map((y) => {
            const yc = YEAR_COLORS[y] || { color: "var(--primary)", bg: "var(--primary-light)" };
            const isSelected = activeYear === y;
            return (
              <button
                key={y}
                type="button"
                onClick={() => setSelectedYear(y)}
                style={{
                  borderRadius: 20,
                  padding: "6px 18px",
                  fontWeight: isSelected ? 700 : 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  border: isSelected ? `2px solid ${yc.color}` : "1px solid var(--border)",
                  backgroundColor: isSelected ? yc.color : yc.bg,
                  color: isSelected ? "#ffffff" : yc.color,
                  transition: "all 0.15s ease",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                  calendar_month
                </span>
                {y}{y === 1 ? "st" : y === 2 ? "nd" : y === 3 ? "rd" : "th"} Year
              </button>
            );
          })}
        </div>
      </div>

      {/* Date & Stats Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--primary)" }}>event</span>
          <span style={{ fontWeight: 700, fontSize: "1rem" }}>{formatDateFriendly(date)}</span>
          {activeYear === 0 ? (
            <span
              style={{
                marginLeft: 8,
                backgroundColor: "var(--primary-light, #e0e7ff)",
                color: "var(--primary, #3730a3)",
                padding: "3px 10px",
                borderRadius: 12,
                fontWeight: 700,
                fontSize: "0.82rem",
                border: "1px solid var(--primary)30",
              }}
            >
              All Years
            </span>
          ) : (
            (() => {
              const yc = YEAR_COLORS[activeYear] || { color: "var(--primary)", bg: "var(--primary-light)" };
              return (
                <span
                  style={{
                    marginLeft: 8,
                    backgroundColor: yc.bg,
                    color: yc.color,
                    padding: "3px 10px",
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    border: `1px solid ${yc.color}30`,
                  }}
                >
                  {activeYear}{activeYear === 1 ? "st" : activeYear === 2 ? "nd" : activeYear === 3 ? "rd" : "th"} Year
                </span>
              );
            })()
          )}
        </div>
        <div style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
          <span style={{ fontWeight: 700, color: postedCount === totalCount && totalCount > 0 ? "#16a34a" : "var(--ink-dark)" }}>
            {postedCount}/{totalCount}
          </span>{" "}
          periods posted
        </div>
      </div>

      {/* Period-wise Schedule */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Spinner inline label="Loading today's timetable schedule…" />
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.5, marginBottom: 8 }}>
            event_busy
          </span>
          <p style={{ margin: 0, fontWeight: 500 }}>
            {`No classes scheduled for ${activeYear}${activeYear === 1 ? "st" : activeYear === 2 ? "nd" : activeYear === 3 ? "rd" : "th"} year on this day.`}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {periodGroups.map(([periodNum, periodClasses]) => (
            <div key={periodNum}>
              {/* Period Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    background: "linear-gradient(135deg, var(--primary) 0%, #6366f1 100%)",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: "0.9rem",
                    padding: "6px 16px",
                    borderRadius: 20,
                    letterSpacing: "0.02em",
                    minWidth: 90,
                    textAlign: "center",
                  }}
                >
                  Period {periodNum}
                </div>
                <div style={{ flex: 1, height: 1, background: "var(--color-border, #e2e8f0)" }} />
                <span style={{ fontSize: "0.78rem", color: "var(--ink-soft)", fontWeight: 600 }}>
                  {periodClasses.filter((c) => c.is_posted).length}/{periodClasses.length} posted
                </span>
              </div>

              {/* Class Cards for this Period */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12, marginLeft: 4 }}>
                {periodClasses.map((cls) => {
                  const isMyClass = operator?.id === cls.faculty_id;
                  return (
                    <div
                      key={`${cls.timetable_entry_id}-${cls.period_number}`}
                      className="card"
                      style={{
                        margin: 0,
                        padding: "14px 18px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        borderLeft: cls.is_posted
                          ? "4px solid #16a34a"
                          : "4px solid var(--primary, #3b82f6)",
                        transition: "box-shadow 0.2s, transform 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
                        (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.boxShadow = "";
                        (e.currentTarget as HTMLElement).style.transform = "";
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--ink-dark)" }}>
                            {cls.section_name}
                          </span>
                          {cls.is_posted ? (
                            <span
                              style={{
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                background: "#dcfce7",
                                color: "#166534",
                                padding: "2px 8px",
                                borderRadius: 10,
                              }}
                            >
                              ✓ Posted
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                background: "#fef9c3",
                                color: "#854d0e",
                                padding: "2px 8px",
                                borderRadius: 10,
                              }}
                            >
                              Pending
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "0.88rem", color: "var(--ink-dark)", fontWeight: 600 }}>
                          {cls.subject_name}{" "}
                          <span style={{ opacity: 0.6, fontWeight: 400 }}>({cls.subject_code})</span>
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>person</span>
                          {cls.faculty_name}
                          {isMyClass && (
                            <span style={{ color: "var(--color-primary)", fontWeight: 700, fontSize: "0.72rem" }}> (You)</span>
                          )}
                        </div>
                      </div>
                      <button
                        className={`btn small ${cls.is_posted ? "secondary" : ""}`}
                        onClick={() => handleMark(cls)}
                        style={{ padding: "8px 14px", fontSize: "0.82rem", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                          {cls.is_posted ? "edit_note" : "fact_check"}
                        </span>
                        {cls.is_posted ? "Edit" : "Take Attendance"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </SidebarLayout>
  );
}
