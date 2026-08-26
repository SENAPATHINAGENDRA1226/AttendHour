import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { Section, Subject, MonthlyReportRow } from "../../types";
import Spinner from "../../components/Spinner";
import ErrorBanner from "../../components/ErrorBanner";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function AdminReports() {
  const now = new Date();
  const [sections, setSections] = useState<Section[]>([]);
  const [loadingSections, setLoadingSections] = useState(true);
  const [sectionsError, setSectionsError] = useState("");

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));

  const [rows, setRows] = useState<MonthlyReportRow[]>([]);
  const [dayKeys, setDayKeys] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  async function loadOptions() {
    setLoadingSections(true);
    setSectionsError("");
    try {
      const [secRes, subRes] = await Promise.all([
        api.get<Section[]>("/admin/sections"),
        api.get<Subject[]>("/admin/subjects"),
      ]);
      setSections(secRes.data);
      setSubjects(subRes.data);
      if (secRes.data.length > 0) setSectionId(String(secRes.data[0].id));
      if (subRes.data.length > 0) setSubjectId(String(subRes.data[0].id));
    } catch (err: any) {
      setSectionsError(err?.response?.data?.detail || err?.message || "Failed to load options.");
    } finally {
      setLoadingSections(false);
    }
  }

  useEffect(() => {
    loadOptions();
  }, []);

  async function loadReport(e?: React.FormEvent) {
    e?.preventDefault();
    if (!sectionId || !subjectId) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get<MonthlyReportRow[]>("/admin/reports/monthly", {
        params: { section_id: sectionId, subject_id: subjectId, year, month },
      });
      setRows(res.data);
      const keys = new Set<string>();
      res.data.forEach((r) => Object.keys(r.day_wise).forEach((k) => keys.add(k)));
      setDayKeys(Array.from(keys).sort());
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to load report.");
    } finally {
      setLoading(false);
    }
  }

  async function downloadFinalReport() {
    if (!sectionId || !subjectId) return;
    setDownloading(true);
    setError("");
    try {
      const response = await api.get("/admin/reports/monthly/download", {
        params: { section_id: sectionId, subject_id: subjectId, year, month },
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "text/csv" });
      const filename = `attendance_section${sectionId}_subject${subjectId}_${year}-${String(month).padStart(2, "0")}.csv`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to download final report.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <h1 className="page-heading">Final Attendance Reports</h1>
      <p className="page-subheading">Generate and download official CSV attendance reports for administrative record-keeping.</p>

      {sectionsError && <ErrorBanner message={sectionsError} onRetry={loadOptions} />}
      {error && <ErrorBanner message={error} onRetry={() => loadReport()} />}

      <div className="card">
        <form onSubmit={loadReport} className="form-grid">
          <div>
            <label>Section</label>
            <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} required disabled={loadingSections || loading}>
              <option value="">{loadingSections ? "Loading…" : "Select section…"}</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.display_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label>Subject</label>
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required disabled={loadingSections || loading}>
              <option value="">{loadingSections ? "Loading…" : "Select subject…"}</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label>Month</label>
            <select value={month} onChange={(e) => setMonth(e.target.value)} disabled={loading}>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label>Year</label>
            <input value={year} onChange={(e) => setYear(e.target.value)} disabled={loading} />
          </div>

          <div style={{ alignSelf: "end", display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn" type="submit" disabled={loading || !sectionId || !subjectId}>
              {loading ? <Spinner inline label="Loading report…" /> : "View Report"}
            </button>

            <button
              className="btn secondary"
              type="button"
              onClick={downloadFinalReport}
              disabled={downloading || !sectionId || !subjectId}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              {downloading ? <Spinner inline label="Downloading…" /> : "📥 Download Final Report (CSV)"}
            </button>
          </div>
        </form>
      </div>

      {loading && <Spinner label="Generating attendance report…" />}

      {!loading && rows.length > 0 && (
        <div className="card" style={{ overflowX: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: "1rem" }}>Monthly Report Data ({rows.length} Students)</h3>
            <button className="btn secondary" onClick={downloadFinalReport} disabled={downloading}>
              📥 Download CSV
            </button>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Name</th>
                {dayKeys.map((k) => (
                  <th key={k}>{k.split("-").slice(2).join(" ")}</th>
                ))}
                <th>Held</th>
                <th>Present</th>
                <th>Absent</th>
                <th>%</th>
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
    </div>
  );
}
