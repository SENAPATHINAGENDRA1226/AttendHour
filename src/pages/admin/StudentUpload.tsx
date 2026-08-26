import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { Section, Student } from "../../types";
import Spinner from "../../components/Spinner";
import ErrorBanner from "../../components/ErrorBanner";

export default function StudentUpload() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loadingSections, setLoadingSections] = useState(true);
  const [sectionsError, setSectionsError] = useState("");

  const [sectionId, setSectionId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [rosterError, setRosterError] = useState("");

  const [result, setResult] = useState<{ inserted: number; updated: number; errors: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function fetchSections() {
    setLoadingSections(true);
    setSectionsError("");
    try {
      const r = await api.get<Section[]>("/admin/sections");
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

  async function loadRoster(id: string) {
    if (!id) { setStudents([]); return; }
    setLoadingRoster(true);
    setRosterError("");
    try {
      const res = await api.get<Student[]>(`/admin/sections/${id}/students`);
      setStudents(res.data);
    } catch (err: any) {
      setRosterError(err?.response?.data?.detail || err?.message || "Failed to load student roster.");
    } finally {
      setLoadingRoster(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !sectionId) return;
    setBusy(true);
    setUploadError("");
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await api.post(`/admin/sections/${sectionId}/students/upload`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
      await loadRoster(sectionId);
    } catch (err: any) {
      setUploadError(err?.response?.data?.detail || err?.message || "Roster upload failed.");
    } finally {
      setBusy(false);
    }
  }

  function downloadRosterTemplate() {
    const content = "roll_no,name,order_no\n23CS01,John Doe,1\n23CS02,Jane Smith,2\n";
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "student_roster_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (loadingSections) {
    return <Spinner label="Loading sections…" />;
  }

  if (sectionsError) {
    return <ErrorBanner message={sectionsError} onRetry={fetchSections} />;
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ margin: 0, borderBottom: "none", paddingBottom: 0 }}>Upload key list (student roster)</h3>
          <button className="btn secondary" type="button" onClick={downloadRosterTemplate}>
            Download roster template
          </button>
        </div>
        <p className="hint-text" style={{ marginBottom: 14 }}>
          CSV or XLSX with columns <code>roll_no</code>, <code>name</code>, and optional <code>order_no</code>
          (the register order 1–70). Re-uploading updates existing roll numbers and adds new ones without
          deleting old attendance history.
        </p>

        {uploadError && <ErrorBanner message={uploadError} onDismiss={() => setUploadError("")} />}
        <form onSubmit={handleUpload} className="form-grid">
          <div>
            <label>Section</label>
            <select
              value={sectionId}
              onChange={(e) => { setSectionId(e.target.value); loadRoster(e.target.value); }}
              required
              disabled={busy}
            >
              <option value="">Select…</option>
              {sections.map((s) => <option key={s.id} value={s.id}>{s.display_name}</option>)}
            </select>
          </div>
          <div>
            <label>File (.csv or .xlsx)</label>
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
              disabled={busy}
            />
          </div>
          <div style={{ alignSelf: "end" }}>
            <button className="btn" disabled={busy || !file || !sectionId} type="submit">
              {busy ? <Spinner inline label="Uploading…" /> : "Upload roster"}
            </button>
          </div>
        </form>
        {result && (
          <div
            className="status-badge posted"
            style={{
              marginTop: 16,
              padding: "12px 16px",
              borderRadius: "8px",
              fontSize: "0.95rem",
              display: "block",
              lineHeight: "1.5",
            }}
          >
            <strong>✓ Student roster inserted successfully!</strong>
            <div style={{ marginTop: 4 }}>
              {result.inserted} student{result.inserted === 1 ? "" : "s"} inserted, {result.updated} updated.
            </div>
            {result.errors.length > 0 && (
              <div style={{ marginTop: 8, color: "var(--absent)" }}>
                <strong>Errors encountered:</strong>
                <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {sectionId && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ margin: 0, borderBottom: "none", paddingBottom: 0 }}>
              Roster {!loadingRoster && `(${students.length} students)`}
            </h3>
            <button
              className="btn secondary"
              type="button"
              onClick={() => loadRoster(sectionId)}
              disabled={loadingRoster}
              style={{ padding: "6px 14px", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              {loadingRoster ? <Spinner inline label="Refreshing…" /> : "🔄 Refresh Roster"}
            </button>
          </div>
          {loadingRoster ? (
            <Spinner label="Loading student roster…" />
          ) : rosterError ? (
            <ErrorBanner message={rosterError} onRetry={() => loadRoster(sectionId)} />
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead><tr><th>#</th><th>Roll No</th><th>Name</th><th>Status</th></tr></thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--ink-soft)" }}>No students in this roster yet.</td></tr>
                  ) : (
                    students.map((s) => (
                      <tr key={s.id}>
                        <td>{s.order_no}</td>
                        <td className="mono">{s.roll_no}</td>
                        <td>{s.name}</td>
                        <td>{s.is_active ? "Active" : "Inactive"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


