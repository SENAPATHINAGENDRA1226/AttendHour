import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { SidebarLayout } from "../../components/SidebarLayout";
import Spinner from "../../components/Spinner";
import ErrorBanner from "../../components/ErrorBanner";
import { MonthlyReportRow, Section, Subject } from "../../types";

export default function FacultyRecords() {
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [month, setMonth] = useState("2026-08");

  const [report, setReport] = useState<MonthlyReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOptions() {
      try {
        const secRes = await api.get<Section[]>("/faculty/options/sections");
        setSections(secRes.data);
        if (secRes.data.length > 0) {
          setSelectedSection(secRes.data[0].id);
        }

        const subRes = await api.get<Subject[]>("/faculty/options/subjects");
        setSubjects(subRes.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load options.");
      }
    }
    loadOptions();
  }, []);

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

  // Generate 31 days columns
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <SidebarLayout>
      {/* Filter Row */}
      <div className="card">
        <div className="form-grid">
          <div>
            <label htmlFor="sec-filter">Section</label>
            <select
              id="sec-filter"
              value={selectedSection || ""}
              onChange={(e) => setSelectedSection(Number(e.target.value))}
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.display_name}</option>
              ))}
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
            <label htmlFor="sub-filter">Subject</label>
            <select
              id="sub-filter"
              value={selectedSubject || ""}
              onChange={(e) => setSelectedSubject(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">All my subjects</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Legend Row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <span className="status-badge posted">P Present</span>
        <span className="status-badge conflict">A Absent</span>
        <span className="status-badge" style={{ background: "var(--flag-bg)", color: "var(--flag)" }}>H Holiday</span>
        <span className="status-badge pending">- Faculty absent</span>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchReport} />}

      {/* Attendance Matrix Grid */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center" }}>
            <Spinner label="Loading attendance records matrix…" />
          </div>
        ) : report.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: "var(--ink-soft)" }}>
            No student records found for the selected criteria.
          </div>
        ) : (
          <div className="matrix-container">
            <table className="matrix-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left", minWidth: 100 }}>Roll</th>
                  {days.map((d) => (
                    <th key={d}>{d}</th>
                  ))}
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {report.map((row, idx) => {
                  const rollDisp = String(idx + 1).padStart(2, "0") + " " + row.roll_no.slice(-3);
                  return (
                    <tr key={row.student_id}>
                      <td style={{ textAlign: "left", fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                        {rollDisp}
                      </td>
                      {days.map((dayNum) => {
                        const dayStr = String(dayNum).padStart(2, "0");
                        const dateKey = `${month}-${dayStr}-P1`;
                        const val = row.day_wise[dateKey] || (row.day_wise[`${month}-${dayStr}`] ?? "-");

                        let cellClass = "cell-dash";
                        let displayChar = "-";

                        if (val === "1" || val === "P" || val === "2") {
                          cellClass = "cell-P";
                          displayChar = "P";
                        } else if (val === "A" || val === "0") {
                          cellClass = "cell-A";
                          displayChar = "A";
                        } else if (val === "H") {
                          cellClass = "cell-H";
                          displayChar = "H";
                        }

                        return (
                          <td key={dayNum} className={cellClass}>
                            {displayChar}
                          </td>
                        );
                      })}
                      <td style={{ fontWeight: 700, color: row.percentage >= 75 ? "var(--present)" : "var(--absent)" }}>
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
