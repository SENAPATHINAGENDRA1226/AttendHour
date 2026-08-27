import React, { useEffect, useState, useRef } from "react";
import { api } from "../../api/client";
import { Faculty, Subject, Section, FacultyAllocation } from "../../types";
import Spinner from "../../components/Spinner";
import ErrorBanner from "../../components/ErrorBanner";

export default function FacultyManage() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const editUsernameInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ username: "", full_name: "", email: "", password: "" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [formBusy, setFormBusy] = useState(false);

  const [actionBusyId, setActionBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");

  const [editItem, setEditItem] = useState<Faculty | null>(null);
  const [editForm, setEditForm] = useState({ username: "", full_name: "", email: "" });
  const [editBusy, setEditBusy] = useState(false);

  // Allocation state
  const [expandedFacultyId, setExpandedFacultyId] = useState<number | null>(null);
  const [allocations, setAllocations] = useState<FacultyAllocation[]>([]);
  const [allocLoading, setAllocLoading] = useState(false);
  const [allocError, setAllocError] = useState("");

  // Data for allocation form
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [allSections, setAllSections] = useState<Section[]>([]);

  // Allocation form
  const [allocSubjectId, setAllocSubjectId] = useState<string>("");
  const [allocSectionIds, setAllocSectionIds] = useState<number[]>([]);
  const [allocSaving, setAllocSaving] = useState(false);
  const [allocFormError, setAllocFormError] = useState("");

  // Inline subject creation with Year
  const [showNewSubject, setShowNewSubject] = useState(false);
  const [newSubjectForm, setNewSubjectForm] = useState({ name: "", code: "", year: "2" });
  const [newSubjectBusy, setNewSubjectBusy] = useState(false);
  const [newSubjectError, setNewSubjectError] = useState("");

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const res = await api.get<Faculty[]>("/admin/faculty");
      setFaculty(res.data);
    } catch (err: any) {
      setLoadError(err?.response?.data?.detail || err?.message || "Failed to load faculty list.");
    } finally {
      setLoading(false);
    }
  }

  async function loadSubjectsAndSections() {
    try {
      const [subRes, secRes] = await Promise.all([
        api.get<Subject[]>("/admin/subjects"),
        api.get<Section[]>("/admin/sections"),
      ]);
      setAllSubjects(subRes.data);
      setAllSections(secRes.data);
    } catch { /* ignore */ }
  }

  async function loadAllocations(facultyId: number) {
    setAllocLoading(true);
    setAllocError("");
    try {
      const res = await api.get<FacultyAllocation[]>(`/admin/faculty/${facultyId}/allocations`);
      setAllocations(res.data);
    } catch (err: any) {
      setAllocError(err?.response?.data?.detail || err?.message || "Failed to load allocations.");
    } finally {
      setAllocLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (editItem && editUsernameInputRef.current) editUsernameInputRef.current.focus();
  }, [editItem]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setEditItem(null);
    }
  }

  async function createFaculty(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormBusy(true);
    try {
      await api.post("/admin/faculty", form);
      setForm({ username: "", full_name: "", email: "", password: "" });
      await load();
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || err?.message || "Could not create faculty account");
    } finally {
      setFormBusy(false);
    }
  }

  async function toggleActive(id: number) {
    setActionError("");
    setActionBusyId(id);
    try {
      await api.patch(`/admin/faculty/${id}/toggle-active`);
      await load();
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || err?.message || "Could not update faculty status.");
    } finally {
      setActionBusyId(null);
    }
  }

  async function resetPassword(id: number) {
    const pw = prompt("New password for this faculty account:");
    if (!pw) return;
    setActionError("");
    setActionBusyId(id);
    try {
      await api.post(`/admin/faculty/${id}/reset-password?new_password=${encodeURIComponent(pw)}`);
      alert("Password reset successfully.");
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || err?.message || "Could not reset password.");
    } finally {
      setActionBusyId(null);
    }
  }

  async function deleteFaculty(f: Faculty) {
    if (!confirm(`Are you sure you want to PERMANENTLY delete faculty member '${f.full_name}'?`)) {
      return;
    }
    setActionError("");
    setActionBusyId(f.id);
    try {
      await api.delete(`/admin/faculty/${f.id}`);
      if (expandedFacultyId === f.id) setExpandedFacultyId(null);
      await load();
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || err?.message || "Could not delete faculty account.");
    } finally {
      setActionBusyId(null);
    }
  }

  function startEdit(f: Faculty) {
    setEditItem(f);
    setEditForm({ username: f.username, full_name: f.full_name, email: f.email || "" });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editItem) return;
    setEditBusy(true);
    setActionError("");
    try {
      await api.patch(`/admin/faculty/${editItem.id}`, editForm);
      setEditItem(null);
      await load();
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || err?.message || "Could not update faculty.");
    } finally {
      setEditBusy(false);
    }
  }

  // --- Allocation handlers ---
  async function toggleExpand(facultyId: number) {
    if (expandedFacultyId === facultyId) {
      setExpandedFacultyId(null);
      return;
    }
    setExpandedFacultyId(facultyId);
    setAllocSubjectId("");
    setAllocSectionIds([]);
    setAllocFormError("");
    await loadSubjectsAndSections();
    await loadAllocations(facultyId);
  }

  function toggleSectionSelection(sectionId: number) {
    setAllocSectionIds((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    );
  }

  async function addAllocation(e: React.FormEvent) {
    e.preventDefault();
    if (!allocSubjectId || allocSectionIds.length === 0) {
      setAllocFormError("Select a subject and at least one section.");
      return;
    }
    setAllocSaving(true);
    setAllocFormError("");
    try {
      await api.post(`/admin/faculty/${expandedFacultyId}/allocations`, {
        subject_id: Number(allocSubjectId),
        section_ids: allocSectionIds,
      });
      setAllocSubjectId("");
      setAllocSectionIds([]);
      await loadAllocations(expandedFacultyId!);
    } catch (err: any) {
      setAllocFormError(err?.response?.data?.detail || err?.message || "Could not add allocation.");
    } finally {
      setAllocSaving(false);
    }
  }

  async function removeAllocation(allocId: number) {
    try {
      await api.delete(`/admin/faculty/${expandedFacultyId}/allocations/${allocId}`);
      await loadAllocations(expandedFacultyId!);
    } catch (err: any) {
      setAllocError(err?.response?.data?.detail || err?.message || "Could not remove allocation.");
    }
  }

  async function createSubjectInline(e: React.FormEvent) {
    e.preventDefault();
    setNewSubjectBusy(true);
    setNewSubjectError("");
    try {
      const payload = {
        name: newSubjectForm.name.trim(),
        code: newSubjectForm.code.trim().toUpperCase(),
        year: newSubjectForm.year ? Number(newSubjectForm.year) : null,
      };
      const res = await api.post<Subject>("/admin/subjects", payload);
      setAllSubjects((prev) => [...prev, res.data]);
      setAllocSubjectId(String(res.data.id));
      setNewSubjectForm({ name: "", code: "", year: "2" });
      setShowNewSubject(false);
    } catch (err: any) {
      setNewSubjectError(err?.response?.data?.detail || err?.message || "Could not create subject.");
    } finally {
      setNewSubjectBusy(false);
    }
  }

  return (
    <div onKeyDown={handleKeyDown}>
      {/* Accessible Edit Faculty Modal Card */}
      {editItem && (
        <div
          className="card"
          style={{ border: "2px solid var(--primary)", marginBottom: 24 }}
          role="dialog"
          aria-labelledby="edit-faculty-heading"
        >
          <h3 id="edit-faculty-heading">Edit Faculty Account: {editItem.full_name}</h3>
          <form onSubmit={saveEdit}>
            <div className="form-grid">
              <div>
                <label htmlFor="edit-fac-username">Username</label>
                <input
                  id="edit-fac-username"
                  ref={editUsernameInputRef}
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  required
                  disabled={editBusy}
                />
              </div>
              <div>
                <label htmlFor="edit-fac-fullname">Full Name</label>
                <input
                  id="edit-fac-fullname"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  required
                  disabled={editBusy}
                />
              </div>
              <div>
                <label htmlFor="edit-fac-email">Email</label>
                <input
                  id="edit-fac-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  disabled={editBusy}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button className="btn" type="submit" disabled={editBusy} aria-label="Save faculty member changes">
                {editBusy ? <Spinner inline label="Saving..." /> : "Save Changes"}
              </button>
              <button
                className="btn secondary"
                type="button"
                onClick={() => setEditItem(null)}
                disabled={editBusy}
                aria-label="Cancel editing faculty member"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showAddForm ? 14 : 0 }}>
          <h3 style={{ margin: 0, borderBottom: "none", paddingBottom: 0 }}>Add Faculty Account</h3>
          <button
            className="btn secondary"
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            style={{ fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {showAddForm ? "▲ Hide Form" : "👤 Add New Faculty ▾"}
          </button>
        </div>
        {formError && <ErrorBanner message={formError} onDismiss={() => setFormError("")} />}
        {showAddForm && (
          <form onSubmit={createFaculty}>
            <div className="form-grid">
              <div>
                <label htmlFor="create-fac-username">Username</label>
                <input
                  id="create-fac-username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                  disabled={formBusy}
                />
              </div>
              <div>
                <label htmlFor="create-fac-fullname">Full Name</label>
                <input
                  id="create-fac-fullname"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                  disabled={formBusy}
                />
              </div>
              <div>
                <label htmlFor="create-fac-email">Email (optional)</label>
                <input
                  id="create-fac-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  disabled={formBusy}
                />
              </div>
              <div>
                <label htmlFor="create-fac-password">Temporary Password</label>
                <input
                  id="create-fac-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  disabled={formBusy}
                />
              </div>
            </div>
            <button className="btn" type="submit" disabled={formBusy} aria-label="Create faculty account" style={{ marginTop: 16 }}>
              {formBusy ? <Spinner inline label="Creating…" /> : "Create Faculty Account"}
            </button>
          </form>
        )}
      </div>

      <div className="card">
        <h3>Faculty List</h3>
        {actionError && <ErrorBanner message={actionError} onDismiss={() => setActionError("")} />}
        {loading ? (
          <Spinner label="Loading faculty members…" />
        ) : loadError ? (
          <ErrorBanner message={loadError} onRetry={load} />
        ) : faculty.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--ink-soft)" }}>No faculty accounts found.</p>
        ) : (
          faculty.map((f) => (
            <div key={f.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16, marginBottom: 16 }}>
              {/* Faculty row */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 600 }}>{f.full_name}</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>@{f.username}{f.email ? ` · ${f.email}` : ""}</div>
                </div>
                <span className={`status-badge ${f.is_active ? "posted" : "pending"}`}>
                  {f.is_active ? "Active" : "Disabled"}
                </span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button
                    className="btn secondary"
                    onClick={() => toggleExpand(f.id)}
                    style={{ fontSize: "0.78rem" }}
                    aria-label={`Manage allocations for ${f.full_name}`}
                  >
                    {expandedFacultyId === f.id ? "▲ Allocations" : "📋 Allocations ▾"}
                  </button>
                  <button
                    className="btn secondary"
                    onClick={() => startEdit(f)}
                    disabled={actionBusyId === f.id}
                    style={{ fontSize: "0.78rem" }}
                    aria-label={`Edit faculty member ${f.full_name}`}
                  >
                    Edit
                  </button>
                  <button
                    className="btn secondary"
                    onClick={() => toggleActive(f.id)}
                    disabled={actionBusyId === f.id}
                    style={{ fontSize: "0.78rem" }}
                    aria-label={`${f.is_active ? "Disable" : "Enable"} faculty member ${f.full_name}`}
                  >
                    {actionBusyId === f.id ? (
                      <Spinner inline label="…" />
                    ) : f.is_active ? "Disable" : "Enable"}
                  </button>
                  <button
                    className="btn secondary"
                    onClick={() => resetPassword(f.id)}
                    disabled={actionBusyId === f.id}
                    style={{ fontSize: "0.78rem" }}
                    aria-label={`Reset password for ${f.full_name}`}
                  >
                    Reset pw
                  </button>
                  <button
                    className="btn danger"
                    onClick={() => deleteFaculty(f)}
                    disabled={actionBusyId === f.id}
                    style={{ fontSize: "0.78rem" }}
                    aria-label={`Delete faculty member ${f.full_name}`}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Expanded allocation panel */}
              {expandedFacultyId === f.id && (
                <div style={{ marginTop: 16, padding: 16, background: "var(--surface-alt, #f8f7f3)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <h4 style={{ margin: "0 0 12px", fontSize: "0.92rem" }}>Subject–Section Allocations for {f.full_name}</h4>

                  {allocError && <ErrorBanner message={allocError} onDismiss={() => setAllocError("")} />}

                  {allocLoading ? (
                    <Spinner label="Loading allocations…" />
                  ) : (
                    <>
                      {/* Current allocations */}
                      {allocations.length === 0 ? (
                        <p style={{ fontSize: "0.85rem", color: "var(--ink-soft)", margin: "0 0 14px" }}>No allocations yet. Add one below.</p>
                      ) : (
                        <div style={{ marginBottom: 16 }}>
                          <div className="table-responsive">
                            <table className="data-table" aria-label="Allocations table" style={{ fontSize: "0.85rem" }}>
                              <thead>
                                <tr>
                                  <th scope="col">Subject</th>
                                  <th scope="col">Code</th>
                                  <th scope="col">Section</th>
                                  <th scope="col" style={{ width: 70 }}></th>
                                </tr>
                              </thead>
                              <tbody>
                                {allocations.map((a) => (
                                  <tr key={a.id}>
                                    <td>{a.subject_name}</td>
                                    <td className="mono">{a.subject_code}</td>
                                    <td>{a.section_display_name}</td>
                                    <td>
                                      <button
                                        className="btn danger"
                                        style={{ fontSize: "0.75rem", padding: "3px 8px" }}
                                        onClick={() => removeAllocation(a.id)}
                                        aria-label={`Remove ${a.subject_name} from ${a.section_display_name}`}
                                      >
                                        ✕
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Add allocation form */}
                      <div style={{ border: "1px dashed var(--border)", borderRadius: 8, padding: 14 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: 10 }}>Add Allocation</div>
                        {allocFormError && <ErrorBanner message={allocFormError} onDismiss={() => setAllocFormError("")} style={{ marginBottom: 10 }} />}
                        <form onSubmit={addAllocation}>
                          {/* Subject selector */}
                          <div style={{ marginBottom: 10 }}>
                            <label htmlFor={`alloc-subject-${f.id}`} style={{ fontSize: "0.82rem" }}>Subject</label>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <select
                                id={`alloc-subject-${f.id}`}
                                value={allocSubjectId}
                                onChange={(e) => setAllocSubjectId(e.target.value)}
                                style={{ flex: 1 }}
                                disabled={allocSaving}
                              >
                                <option value="">— Select subject —</option>
                                {allSubjects.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name} ({s.code}){s.year ? ` — ${s.year === 1 ? "1st" : s.year === 2 ? "2nd" : s.year === 3 ? "3rd" : "4th"} Year` : ""}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="btn secondary"
                                style={{ fontSize: "0.78rem", whiteSpace: "nowrap" }}
                                onClick={() => setShowNewSubject(!showNewSubject)}
                              >
                                {showNewSubject ? "Cancel" : "+ New"}
                              </button>
                            </div>
                          </div>

                          {/* Inline new subject */}
                          {showNewSubject && (
                            <div style={{ background: "var(--surface, #fff)", padding: 12, borderRadius: 6, border: "1px solid var(--border)", marginBottom: 10 }}>
                              {newSubjectError && <ErrorBanner message={newSubjectError} onDismiss={() => setNewSubjectError("")} style={{ marginBottom: 8 }} />}
                              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                                <div style={{ flex: 2, minWidth: 140 }}>
                                  <label style={{ fontSize: "0.8rem" }}>Subject Name</label>
                                  <input
                                    value={newSubjectForm.name}
                                    onChange={(e) => setNewSubjectForm({ ...newSubjectForm, name: e.target.value })}
                                    placeholder="e.g. Data Structures"
                                    required
                                    disabled={newSubjectBusy}
                                  />
                                </div>
                                <div style={{ flex: 1, minWidth: 100 }}>
                                  <label style={{ fontSize: "0.8rem" }}>Code</label>
                                  <input
                                    value={newSubjectForm.code}
                                    onChange={(e) => setNewSubjectForm({ ...newSubjectForm, code: e.target.value })}
                                    placeholder="e.g. CS301"
                                    required
                                    disabled={newSubjectBusy}
                                  />
                                </div>
                                <div style={{ flex: 1, minWidth: 110 }}>
                                  <label style={{ fontSize: "0.8rem" }}>Year</label>
                                  <select
                                    value={newSubjectForm.year}
                                    onChange={(e) => setNewSubjectForm({ ...newSubjectForm, year: e.target.value })}
                                    disabled={newSubjectBusy}
                                    style={{ fontSize: "0.82rem" }}
                                  >
                                    <option value="1">1st Year</option>
                                    <option value="2">2nd Year</option>
                                    <option value="3">3rd Year</option>
                                    <option value="4">4th Year</option>
                                  </select>
                                </div>
                                <button
                                  className="btn"
                                  style={{ fontSize: "0.8rem" }}
                                  onClick={createSubjectInline}
                                  disabled={newSubjectBusy || !newSubjectForm.name || !newSubjectForm.code}
                                  type="button"
                                >
                                  {newSubjectBusy ? <Spinner inline label="…" /> : "Create"}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Section multi-select */}
                          <div style={{ marginBottom: 12 }}>
                            {(() => {
                              const selectedSub = allSubjects.find((s) => String(s.id) === allocSubjectId);
                              const matchingSecs = selectedSub && selectedSub.year
                                ? allSections.filter((sec) => sec.year === selectedSub.year)
                                : allSections;
                              const allMatchingSelected = matchingSecs.length > 0 && matchingSecs.every((sec) => allocSectionIds.includes(sec.id));

                              return (
                                <>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                    <label style={{ fontSize: "0.82rem", margin: 0 }}>
                                      Sections {selectedSub?.year ? `(Year ${selectedSub.year})` : ""} (select one or more)
                                    </label>
                                    {matchingSecs.length > 0 && (
                                      <button
                                        type="button"
                                        className="btn secondary"
                                        style={{ padding: "2px 6px", fontSize: "0.72rem" }}
                                        onClick={() => {
                                          const mIds = matchingSecs.map((s) => s.id);
                                          if (allMatchingSelected) {
                                            setAllocSectionIds((prev) => prev.filter((id) => !mIds.includes(id)));
                                          } else {
                                            setAllocSectionIds((prev) => Array.from(new Set([...prev, ...mIds])));
                                          }
                                        }}
                                      >
                                        {allMatchingSelected ? "Deselect matching" : "Select matching"}
                                      </button>
                                    )}
                                  </div>

                                  <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                                    gap: 6,
                                    maxHeight: 200,
                                    overflowY: "auto",
                                    padding: 8,
                                    border: "1px solid var(--border)",
                                    borderRadius: 6,
                                    background: "var(--surface, #fff)",
                                  }}>
                                    {allSections.length === 0 ? (
                                      <span style={{ color: "var(--ink-soft)", fontSize: "0.82rem" }}>No sections available.</span>
                                    ) : (
                                      allSections.map((sec) => {
                                        const isMatchingYear = selectedSub?.year ? sec.year === selectedSub.year : true;
                                        return (
                                          <label key={sec.id} style={{
                                            display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem",
                                            cursor: "pointer", padding: "4px 6px", borderRadius: 4,
                                            border: isMatchingYear ? "1px solid var(--border)" : "1px dashed var(--border)",
                                            background: allocSectionIds.includes(sec.id) ? "var(--primary-light, #e8eaf6)" : "transparent",
                                            opacity: isMatchingYear ? 1 : 0.65,
                                          }}>
                                            <input
                                              type="checkbox"
                                              checked={allocSectionIds.includes(sec.id)}
                                              onChange={() => toggleSectionSelection(sec.id)}
                                              disabled={allocSaving}
                                            />
                                            <span>
                                              <strong>{sec.display_name}</strong>
                                              <span style={{ fontSize: "0.72rem", color: "var(--ink-soft)", marginLeft: 4 }}>
                                                (Y{sec.year})
                                              </span>
                                            </span>
                                          </label>
                                        );
                                      })
                                    )}
                                  </div>
                                </>
                              );
                            })()}
                          </div>

                          <button className="btn" type="submit" disabled={allocSaving || !allocSubjectId || allocSectionIds.length === 0}>
                            {allocSaving ? <Spinner inline label="Adding…" /> : "Add Allocation"}
                          </button>
                        </form>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
