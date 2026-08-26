import React, { useEffect, useState, useMemo } from "react";
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

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [result, setResult] = useState<{ inserted: number; updated: number; errors: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [togglingId, setTogglingId] = useState<number | null>(null);

  async function fetchSections() {
    setLoadingSections(true);
    setSectionsError("");
    try {
      const r = await api.get<Section[]>("/admin/sections");
      setSections(r.data);
      if (r.data.length > 0 && !sectionId) {
        setSectionId(String(r.data[0].id));
        loadRoster(String(r.data[0].id));
      }
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
    if (!id) {
      setStudents([]);
      return;
    }
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

  function handleSelectSection(id: string) {
    setSectionId(id);
    setSearchQuery("");
    setStatusFilter("all");
    loadRoster(id);
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
      await fetchSections();
      await loadRoster(sectionId);
    } catch (err: any) {
      setUploadError(err?.response?.data?.detail || err?.message || "Roster upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleStatus(student: Student) {
    setTogglingId(student.id);
    try {
      const res = await api.patch<Student>(`/admin/students/${student.id}/toggle-active`);
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, is_active: res.data.is_active } : s))
      );
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Could not update student status.");
    } finally {
      setTogglingId(null);
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

  const totalEnrolled = useMemo(() => {
    return sections.reduce((acc, sec) => acc + (sec.student_count || 0), 0);
  }, [sections]);

  const activeSectionObj = useMemo(() => {
    return sections.find((s) => String(s.id) === sectionId);
  }, [sections, sectionId]);

  const activeStudentsCount = useMemo(() => {
    return students.filter((s) => s.is_active).length;
  }, [students]);

  const inactiveStudentsCount = useMemo(() => {
    return students.length - activeStudentsCount;
  }, [students, activeStudentsCount]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.roll_no.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
          ? s.is_active
          : !s.is_active;
      return matchesSearch && matchesStatus;
    });
  }, [students, searchQuery, statusFilter]);

  if (loadingSections) {
    return <Spinner label="Loading sections & student summary…" />;
  }

  if (sectionsError) {
    return <ErrorBanner message={sectionsError} onRetry={fetchSections} />;
  }

  return (
    <div>
      {/* Overview Stat Header */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.3rem", fontFamily: "var(--font-display)" }}>
              🎓 Student Roster Directory
            </h2>
            <div style={{ color: "var(--ink-soft)", fontSize: "0.9rem", marginTop: 4 }}>
              Overview of all department sections and student enrollment counts.
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--primary)" }}>{totalEnrolled}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--ink-muted)" }}>Total Students</div>
            </div>
            <div style={{ height: 32, width: 1, backgroundColor: "var(--border)" }} />
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--ink-strong)" }}>{sections.length}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--ink-muted)" }}>Total Sections</div>
            </div>
          </div>
        </div>
      </div>

      {/* Section Cards Bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--ink-soft)", marginBottom: 10 }}>
          Select Section to View Roster:
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {sections.map((sec) => {
            const isSelected = String(sec.id) === sectionId;
            return (
              <div
                key={sec.id}
                onClick={() => handleSelectSection(String(sec.id))}
                className={`card ${isSelected ? "active" : ""}`}
                style={{
                  margin: 0,
                  padding: "14px 16px",
                  cursor: "pointer",
                  border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border)",
                  backgroundColor: isSelected ? "var(--surface-active, rgba(79, 70, 229, 0.05))" : "var(--surface)",
                  transition: "all 0.15s ease-in-out",
                  boxShadow: isSelected ? "0 4px 12px rgba(0,0,0,0.08)" : "none",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 700, fontSize: "1.05rem", color: isSelected ? "var(--primary)" : "var(--ink-strong)" }}>
                    {sec.display_name}
                  </div>
                  <span
                    className="period-pill"
                    style={{
                      margin: 0,
                      padding: "2px 8px",
                      fontSize: "0.78rem",
                      backgroundColor: isSelected ? "var(--primary)" : "var(--border)",
                      color: isSelected ? "#fff" : "var(--ink-soft)",
                    }}
                  >
                    👥 {sec.student_count ?? 0}
                  </span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--ink-muted)", marginTop: 6 }}>
                  Academic Year: {sec.academic_year}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upload CSV Roster Form */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ margin: 0, borderBottom: "none", paddingBottom: 0 }}>
            Upload / Bulk Update Roster ({activeSectionObj?.display_name || "Select Section"})
          </h3>
          <button className="btn secondary" type="button" onClick={downloadRosterTemplate}>
            Download CSV template
          </button>
        </div>
        <p className="hint-text" style={{ marginBottom: 14 }}>
          CSV or XLSX with columns <code>roll_no</code>, <code>name</code>, and optional <code>order_no</code> (1–70). Re-uploading updates existing roll numbers and adds new ones.
        </p>

        {uploadError && <ErrorBanner message={uploadError} onDismiss={() => setUploadError("")} />}

        <form onSubmit={handleUpload} className="form-grid">
          <div>
            <label>Target Section</label>
            <select
              value={sectionId}
              onChange={(e) => handleSelectSection(e.target.value)}
              required
              disabled={busy}
            >
              <option value="">Select Section…</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.display_name} ({s.student_count ?? 0} students)
                </option>
              ))}
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
              {busy ? <Spinner inline label="Uploading…" /> : "Upload Roster"}
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

      {/* Roster Viewer Card */}
      {sectionId && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, borderBottom: "none", paddingBottom: 0 }}>
                {activeSectionObj?.display_name} Roster {!loadingRoster && `(${students.length} Total)`}
              </h3>
              {!loadingRoster && (
                <div style={{ fontSize: "0.82rem", color: "var(--ink-muted)", marginTop: 4 }}>
                  Active: <strong style={{ color: "var(--present)" }}>{activeStudentsCount}</strong> · Inactive: <strong style={{ color: "var(--absent)" }}>{inactiveStudentsCount}</strong>
                </div>
              )}
            </div>
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

          {/* Controls Bar: Search & Status Filter */}
          {!loadingRoster && students.length > 0 && (
            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <input
                  type="text"
                  placeholder="🔍 Search by roll number or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px" }}
                />
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={(e: any) => setStatusFilter(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "6px" }}
                >
                  <option value="all">All Statuses ({students.length})</option>
                  <option value="active">Active Only ({activeStudentsCount})</option>
                  <option value="inactive">Inactive Only ({inactiveStudentsCount})</option>
                </select>
              </div>
            </div>
          )}

          {loadingRoster ? (
            <Spinner label="Loading student roster…" />
          ) : rosterError ? (
            <ErrorBanner message={rosterError} onRetry={() => loadRoster(sectionId)} />
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Roll No</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", color: "var(--ink-soft)", padding: "24px" }}>
                        {searchQuery || statusFilter !== "all"
                          ? "No students match your search filter."
                          : "No students in this roster yet."}
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => (
                      <tr key={s.id}>
                        <td>{s.order_no}</td>
                        <td className="mono" style={{ fontWeight: 600 }}>{s.roll_no}</td>
                        <td>{s.name}</td>
                        <td>
                          <span
                            className={`status-badge ${s.is_active ? "posted" : "pending"}`}
                            style={{ fontSize: "0.75rem", padding: "2px 8px" }}
                          >
                            {s.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            className="btn secondary"
                            type="button"
                            onClick={() => handleToggleStatus(s)}
                            disabled={togglingId === s.id}
                            style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                          >
                            {togglingId === s.id ? "Updating..." : s.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </td>
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
