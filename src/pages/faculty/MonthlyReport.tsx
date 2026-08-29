import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { Section, Subject, MonthlyReportRow } from "../../types";
import Spinner from "../../components/Spinner";
import ErrorBanner from "../../components/ErrorBanner";
import CollegeAttendanceReport from "../admin/CollegeAttendanceReport";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function MonthlyReport() {
  const [reportType, setReportType] = useState<"college_pdf" | "monthly_register">("college_pdf");
  const now = new Date();
  const [sections, setSections] = useState<Section[]>([]);
  const [loadingSections, setLoadingSections] = useState(true);
  const [sectionsError, setSectionsError] = useState("");

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [subjectsError, setSubjectsError] = useState("");

  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));

  const [rows, setRows] = useState<MonthlyReportRow[]>([]);
  const [dayKeys, setDayKeys] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [reportError, setReportError] = useState("");


  async function fetchSections() {
    setLoadingSections(true);
    setSectionsError("");
    try {
      const r = await api.get<Section[]>("/faculty/options/sections");
      setSections(r.data);
    } catch (err: any) {
      setSectionsError(err?.response?.data?.detail || err?.message || "Failed to load sections.");
    } finally {
      setLoadingSections(false);
    }
  }

  useEffect(() => {
    fetchSections();
  }, []);

  async function fetchSubjects(secId: string) {
    if (!secId) { setSubjects([]); return; }
    setLoadingSubjects(true);
    setSubjectsError("");
    try {
      const r = await api.get<Subject[]>("/faculty/options/subjects", { params: { section_id: secId } });
      setSubjects(r.data);
    } catch (err: any) {
      setSubjectsError(err?.response?.data?.detail || err?.message || "Failed to load subjects.");
    } finally {
      setLoadingSubjects(false);
    }
  }

  useEffect(() => {
    setSubjectId("");
    fetchSubjects(sectionId);
  }, [sectionId]);

  async function loadReport(e?: React.FormEvent) {
    e?.preventDefault();
    if (!sectionId || !subjectId) return;
    setLoading(true);
    setReportError("");
    try {
      const res = await api.get<MonthlyReportRow[]>("/faculty/report/monthly", {
        params: { section_id: sectionId, subject_id: subjectId, year, month },
      });
      setRows(res.data);
      const keys = new Set<string>();
      res.data.forEach((r) => Object.keys(r.day_wise).forEach((k) => keys.add(k)));
      setDayKeys(Array.from(keys).sort());
    } catch (err: any) {
      setReportError(err?.response?.data?.detail || err?.message || "Failed to load monthly report.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
        <div>
          <h1 className="page-heading" style={{ margin: 0 }}>Attendance Reports</h1>
          <p className="page-subheading" style={{ margin: "4px 0 0 0" }}>
            Official college attendance sheets, subject breakdowns, and student performance.
          </p>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: "inline-flex", background: "#e2e8f0", padding: 3, borderRadius: 6 }}>
          <button
            type="button"
            className="btn"
            style={{
              padding: "6px 14px",
              fontSize: "0.8125rem",
              background: reportType === "college_pdf" ? "#0f172a" : "transparent",
              color: reportType === "college_pdf" ? "#ffffff" : "#475569",
              border: "none",
              boxShadow: reportType === "college_pdf" ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
            }}
            onClick={() => setReportType("college_pdf")}
          >
            📋 Official College Attendance Sheet (PDF Style)
          </button>
          <button
            type="button"
            className="btn"
            style={{
              padding: "6px 14px",
              fontSize: "0.8125rem",
              background: reportType === "monthly_register" ? "#0f172a" : "transparent",
              color: reportType === "monthly_register" ? "#ffffff" : "#475569",
              border: "none",
              boxShadow: reportType === "monthly_register" ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
            }}
            onClick={() => setReportType("monthly_register")}
          >
            📅 Monthly Day-Wise Register
          </button>
        </div>
      </div>

      {reportType === "college_pdf" ? (
        <CollegeAttendanceReport defaultSectionId={sectionId} isFacultyView={true} />
      ) : (
        <>
          {sectionsError && <ErrorBanner message={sectionsError} onRetry={fetchSections} />}
          {subjectsError && <ErrorBanner message={subjectsError} onRetry={() => fetchSubjects(sectionId)} />}
          {reportError && <ErrorBanner message={reportError} onRetry={() => loadReport()} />}

          <div className="card">
            <form onSubmit={loadReport} className="form-grid">
              <div>
                <label>Section</label>
                <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} required disabled={loadingSections || loading}>
                  <option value="">{loadingSections ? "Loading…" : "Select…"}</option>
                  {sections.map((s) => <option key={s.id} value={s.id}>{s.display_name}</option>)}
                </select>
              </div>
              <div>
                <label>Subject</label>
                <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required disabled={!sectionId || loadingSubjects || loading}>
                  <option value="">{loadingSubjects ? "Loading…" : "Select…"}</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label>Month</label>
                <select value={month} onChange={(e) => setMonth(e.target.value)} disabled={loading}>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label>Year</label>
                <input value={year} onChange={(e) => setYear(e.target.value)} disabled={loading} />
              </div>
              <div style={{ alignSelf: "end", display: "flex", gap: 8 }}>
                <button className="btn" type="submit" disabled={loading || !sectionId || !subjectId}>
                  {loading ? <Spinner inline label="Loading report…" /> : "Load report"}
                </button>
              </div>
            </form>
          </div>

          {loading && <Spinner label="Generating monthly report…" />}

          {!loading && rows.length > 0 && (
            <div className="card" style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Roll No</th><th>Name</th>
                    {dayKeys.map((k) => <th key={k}>{k.split("-").slice(2).join(" ")}</th>)}
                    <th>Held</th><th>Present</th><th>Absent</th><th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.student_id}>
                      <td className="mono">{r.roll_no}</td>
                      <td>{r.name}</td>
                      {dayKeys.map((k) => (
                        <td key={k} className="mono" style={{ color: r.day_wise[k] === "A" ? "var(--absent)" : "var(--present)" }}>
                          {r.day_wise[k] ?? "-"}
                        </td>
                      ))}
                      <td className="mono">{r.total_held}</td>
                      <td className="mono">{r.total_present}</td>
                      <td className="mono">{r.total_absent}</td>
                      <td className="mono">{r.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );

}

