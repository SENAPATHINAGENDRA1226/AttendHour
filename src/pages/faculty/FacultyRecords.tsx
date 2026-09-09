import { useEffect, useState, useMemo } from "react";
import { api } from "../../api/client";
import { SidebarLayout } from "../../components/SidebarLayout";
import Spinner from "../../components/Spinner";
import ErrorBanner from "../../components/ErrorBanner";
import { MonthlyReportRow, Section, Subject } from "../../types";
import { useAuth } from "../../context/AuthContext";

function currentMonthISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

const YEAR_OPTIONS = [
  { value: "all", label: "All Years", color: "var(--primary)", bg: "var(--primary-light)" },
  { value: "1", label: "1st Year", color: "#0369a1", bg: "#e0f2fe" },
  { value: "2", label: "2nd Year", color: "#3730a3", bg: "#e0e7ff" },
  { value: "3", label: "3rd Year", color: "#5b21b6", bg: "#ede9fe" },
  { value: "4", label: "4th Year", color: "#86198f", bg: "#fae8ff" },
];

export default function FacultyRecords() {
  const { auth, operator } = useAuth();
  const isSharedFaculty = auth?.role === "shared_faculty";

  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>("all");
  
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [month, setMonth] = useState(currentMonthISO());

  const [report, setReport] = useState<MonthlyReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSections() {
      try {
        const secRes = await api.get<Section[]>("/faculty/options/sections");
        setSections(secRes.data);
        if (secRes.data.length > 0) {
          setSelectedSection(secRes.data[0].id);
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load sections.");
      }
    }
    loadSections();
  }, [operator?.id]);

  // Load subjects dynamically whenever selected section changes
  useEffect(() => {
    async function loadSubjectsForSection() {
      try {
        const params = selectedSection ? { section_id: selectedSection } : {};
        const subRes = await api.get<Subject[]>("/faculty/options/subjects", { params });
        setSubjects(subRes.data);
      } catch {
        // ignore
      }
    }
    loadSubjectsForSection();
  }, [selectedSection]);

  // Filter sections by academic year
  const filteredSections = useMemo(() => {
    if (selectedYearFilter === "all") return sections;
    return sections.filter((s) => String(s.year) === selectedYearFilter);
  }, [sections, selectedYearFilter]);

  // Auto-select first section in filtered list when year filter changes
  useEffect(() => {
    if (filteredSections.length > 0) {
      if (!selectedSection || !filteredSections.some((s) => s.id === selectedSection)) {
        setSelectedSection(filteredSections[0].id);
      }
    }
  }, [filteredSections, selectedSection]);

  async function fetchReport() {
    if (!selectedSection) return;
    setLoading(true);
    setError("");
    try {
      const [yearStr, monthStr] = month.split("-");
      const params: any = {
        section_id: selectedSection,
        year: Number(yearStr),
        month: Number(monthStr),
      };
      if (selectedSubject) params.subject_id = selectedSubject;

      const res = await api.get<MonthlyReportRow[]>("/faculty/report/monthly", { params });
      setReport(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Could not fetch attendance matrix report.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedSection) fetchReport();
  }, [selectedSection, selectedSubject, month]);

  // Generate days for the selected month
  const daysInMonth = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return Array.from({ length: lastDay }, (_, i) => i + 1);
  }, [month]);

  // Summary Metrics
  const totalHeldSessions = report.length > 0 ? report[0].total_held : 0;
  const overallAvg = report.length > 0
    ? (report.reduce((acc, r) => acc + r.percentage, 0) / report.length).toFixed(1)
    : "0.0";

  return (
    <SidebarLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-heading" style={{ margin: 0 }}>Attendance Records</h1>
          <p className="page-subheading" style={{ margin: "4px 0 0" }}>
            Monthly student attendance register and performance overview.
          </p>
        </div>
        <button
          className="btn secondary"
          onClick={fetchReport}
          disabled={loading || !selectedSection}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: "0.85rem" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>sync</span>
          Refresh
        </button>
      </div>

      {/* Summary Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
        <div className="card" style={{ margin: 0, padding: 16 }}>
          <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)", fontWeight: 600 }}>CLASSES HELD</div>
          <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--ink-dark)", marginTop: 2 }}>
            {totalHeldSessions} <span style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--ink-soft)" }}>sessions</span>
          </div>
        </div>
        <div className="card" style={{ margin: 0, padding: 16 }}>
          <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)", fontWeight: 600 }}>CLASS AVERAGE</div>
          <div style={{ fontSize: "1.35rem", fontWeight: 800, color: Number(overallAvg) >= 75 ? "#16a34a" : Number(overallAvg) >= 65 ? "#ca8a04" : "#dc2626", marginTop: 2 }}>
            {overallAvg}%
          </div>
        </div>
        <div className="card" style={{ margin: 0, padding: 16 }}>
          <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)", fontWeight: 600 }}>STUDENTS ENROLLED</div>
          <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--ink-dark)", marginTop: 2 }}>
            {report.length} <span style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--ink-soft)" }}>students</span>
          </div>
        </div>
      </div>

      {/* Year Filter Tabs */}
      <div className="card" style={{ marginBottom: 16, padding: "14px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--ink-dark)", display: "flex", alignItems: "center", gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--primary)" }}>school</span>
            Academic Year Filter:
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {YEAR_OPTIONS.map((y) => {
              const isSelected = selectedYearFilter === y.value;
              return (
                <button
                  key={y.value}
                  type="button"
                  onClick={() => setSelectedYearFilter(y.value)}
                  style={{
                    borderRadius: 20,
                    padding: "6px 16px",
                    fontWeight: isSelected ? 700 : 600,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    border: isSelected ? `2px solid ${y.color}` : "1px solid var(--border)",
                    backgroundColor: isSelected ? y.color : y.bg,
                    color: isSelected ? "#ffffff" : y.color,
                    transition: "all 0.15s ease",
                  }}
                >
                  {y.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-grid">
          <div>
            <label htmlFor="sec-filter">Section ({filteredSections.length} available)</label>
            <select
              id="sec-filter"
              value={selectedSection || ""}
              onChange={(e) => setSelectedSection(Number(e.target.value))}
            >
              {filteredSections.length === 0 ? (
                <option value="">No sections found for this year</option>
              ) : (
                filteredSections.map((s) => (
                  <option key={s.id} value={s.id}>{s.display_name}</option>
                ))
              )}
            </select>
          </div>
          <div>
            <label htmlFor="month-filter">Month</label>
            <input
              id="month-filter"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="sub-filter">Subject (Subject-wise Register)</label>
            <select
              id="sub-filter"
              value={selectedSubject || ""}
              onChange={(e) => setSelectedSubject(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">All Subjects in Section</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Legend Row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap", fontSize: "0.85rem" }}>
        <span className="status-badge posted" style={{ padding: "4px 10px" }}>P · Present</span>
        <span className="status-badge conflict" style={{ padding: "4px 10px" }}>A · Absent</span>
        <span className="status-badge" style={{ background: "#fee2e2", color: "#dc2626", padding: "4px 10px" }}>H · Holiday</span>
        <span className="status-badge pending" style={{ padding: "4px 10px" }}>- · No Class</span>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchReport} />}

      {/* Attendance Matrix Grid */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: "50px 0", textAlign: "center" }}>
            <Spinner label="Loading attendance matrix…" />
          </div>
        ) : report.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--ink-soft)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 36, color: "var(--ink-muted)", marginBottom: 8 }}>event_busy</span>
            <div>No attendance sessions recorded for this section &amp; month yet.</div>
          </div>
        ) : (
          <div className="matrix-container" style={{ overflowX: "auto" }}>
            <table className="matrix-table" style={{ width: "100%", fontSize: "0.82rem" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", minWidth: 80, position: "sticky", left: 0, background: "var(--surface)", zIndex: 2 }}>Roll</th>
                  <th style={{ textAlign: "left", minWidth: 150 }}>Student Name</th>
                  {daysInMonth.map((d) => (
                    <th key={d} style={{ width: 28, textAlign: "center" }}>{d}</th>
                  ))}
                  <th style={{ textAlign: "center", minWidth: 60 }}>Held</th>
                  <th style={{ textAlign: "center", minWidth: 60 }}>Pres</th>
                  <th style={{ textAlign: "center", minWidth: 65 }}>%</th>
                </tr>
              </thead>
              <tbody>
                {report.map((row, idx) => {
                  return (
                    <tr key={row.student_id}>
                      <td style={{ textAlign: "left", fontWeight: 700, fontFamily: "var(--font-mono)", position: "sticky", left: 0, background: "var(--surface)", zIndex: 1 }}>
                        {row.roll_no}
                      </td>
                      <td style={{ textAlign: "left", fontWeight: 500, whiteSpace: "nowrap" }}>
                        {row.name}
                      </td>
                      {daysInMonth.map((dayNum) => {
                        const dayStr = String(dayNum).padStart(2, "0");
                        const datePrefix = `${month}-${dayStr}`;

                        // Find matching entries in day_wise
                        const matchingKeys = Object.keys(row.day_wise).filter(k => k.startsWith(datePrefix));

                        let cellClass = "cell-dash";
                        let displayChar = "-";

                        if (matchingKeys.length > 0) {
                          const values = matchingKeys.map(k => row.day_wise[k]);
                          if (values.some(v => v !== "A" && v !== "H" && v !== "-")) {
                            cellClass = "cell-P";
                            displayChar = "P";
                          } else if (values.includes("A")) {
                            cellClass = "cell-A";
                            displayChar = "A";
                          } else if (values.includes("H")) {
                            cellClass = "cell-H";
                            displayChar = "H";
                          }
                        }

                        return (
                          <td key={dayNum} className={cellClass} style={{ textAlign: "center" }}>
                            {displayChar}
                          </td>
                        );
                      })}
                      <td style={{ textAlign: "center", fontWeight: 600 }}>{row.total_held}</td>
                      <td style={{ textAlign: "center", fontWeight: 700, color: "#16a34a" }}>{row.total_present}</td>
                      <td style={{ textAlign: "center", fontWeight: 800, color: row.percentage >= 75 ? "#16a34a" : row.percentage >= 65 ? "#ca8a04" : "#dc2626" }}>
                        {row.percentage}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

