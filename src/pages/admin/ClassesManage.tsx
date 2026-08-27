import React, { useEffect, useState, useRef } from "react";
import { api } from "../../api/client";
import { Department, Section, Subject } from "../../types";
import Spinner from "../../components/Spinner";
import ErrorBanner from "../../components/ErrorBanner";

export default function ClassesManage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Edit references for auto-focusing
  const editDeptInputRef = useRef<HTMLInputElement>(null);
  const editSecInputRef = useRef<HTMLInputElement>(null);
  const editSubInputRef = useRef<HTMLInputElement>(null);

  // Department State
  const [deptForm, setDeptForm] = useState({ name: "", code: "" });
  const [deptBusy, setDeptBusy] = useState(false);
  const [deptError, setDeptError] = useState("");
  const [editDeptItem, setEditDeptItem] = useState<Department | null>(null);
  const [editDeptForm, setEditDeptForm] = useState({ name: "", code: "" });

  // Section State (with Academic Year)
  const [sectionForm, setSectionForm] = useState({
    department_id: "", year: "2", name: "", display_name: "", academic_year: "2025-26",
  });
  const [sectionBusy, setSectionBusy] = useState(false);
  const [sectionError, setSectionError] = useState("");
  const [editSectionItem, setEditSectionItem] = useState<Section | null>(null);
  const [editSectionForm, setEditSectionForm] = useState({
    department_id: "", year: "2", name: "", display_name: "", academic_year: "2025-26",
  });

  // Form Collapsible Visibility State
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [showSecForm, setShowSecForm] = useState(false);
  const [showSubForm, setShowSubForm] = useState(false);

  // Subject State
  const [subjectForm, setSubjectForm] = useState({ name: "", code: "" });
  const [subjectBusy, setSubjectBusy] = useState(false);
  const [subjectError, setSubjectError] = useState("");
  const [editSubjectItem, setEditSubjectItem] = useState<Subject | null>(null);
  const [editSubjectForm, setEditSubjectForm] = useState({ name: "", code: "" });

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const [d, s, sub] = await Promise.all([
        api.get<Department[]>("/admin/departments"),
        api.get<Section[]>("/admin/sections"),
        api.get<Subject[]>("/admin/subjects"),
      ]);
      setDepartments(d.data);
      setSections(s.data);
      setSubjects(sub.data);
    } catch (err: any) {
      setLoadError(err?.response?.data?.detail || err?.message || "Failed to load classes configuration data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Auto focus input when editing opens
  useEffect(() => {
    if (editDeptItem && editDeptInputRef.current) editDeptInputRef.current.focus();
  }, [editDeptItem]);

  useEffect(() => {
    if (editSectionItem && editSecInputRef.current) editSecInputRef.current.focus();
  }, [editSectionItem]);

  useEffect(() => {
    if (editSubjectItem && editSubInputRef.current) editSubInputRef.current.focus();
  }, [editSubjectItem]);

  // Handle escape key to close modals
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setEditDeptItem(null);
      setEditSectionItem(null);
      setEditSubjectItem(null);
    }
  }

  // --- Department Actions ---
  async function createDept(e: React.FormEvent) {
    e.preventDefault();
    setDeptError("");
    setDeptBusy(true);
    try {
      await api.post("/admin/departments", deptForm);
      setDeptForm({ name: "", code: "" });
      await load();
    } catch (err: any) {
      setDeptError(err?.response?.data?.detail || err?.message || "Could not create department.");
    } finally {
      setDeptBusy(false);
    }
  }

  async function saveEditDept(e: React.FormEvent) {
    e.preventDefault();
    if (!editDeptItem) return;
    setDeptError("");
    setDeptBusy(true);
    try {
      await api.patch(`/admin/departments/${editDeptItem.id}`, editDeptForm);
      setEditDeptItem(null);
      await load();
    } catch (err: any) {
      setDeptError(err?.response?.data?.detail || err?.message || "Could not update department.");
    } finally {
      setDeptBusy(false);
    }
  }

  async function deleteDept(dept: Department) {
    if (!confirm(`Are you sure you want to PERMANENTLY delete department '${dept.name}'?`)) return;
    setDeptError("");
    setDeptBusy(true);
    try {
      await api.delete(`/admin/departments/${dept.id}`);
      await load();
    } catch (err: any) {
      setDeptError(err?.response?.data?.detail || err?.message || "Could not delete department.");
    } finally {
      setDeptBusy(false);
    }
  }

  // --- Section Actions ---
  async function createSection(e: React.FormEvent) {
    e.preventDefault();
    setSectionError("");
    setSectionBusy(true);
    try {
      await api.post("/admin/sections", {
        ...sectionForm,
        department_id: Number(sectionForm.department_id),
        year: Number(sectionForm.year),
      });
      setSectionForm({ department_id: "", year: "2", name: "", display_name: "", academic_year: sectionForm.academic_year });
      await load();
    } catch (err: any) {
      setSectionError(err?.response?.data?.detail || err?.message || "Could not create section.");
    } finally {
      setSectionBusy(false);
    }
  }

  async function saveEditSection(e: React.FormEvent) {
    e.preventDefault();
    if (!editSectionItem) return;
    setSectionError("");
    setSectionBusy(true);
    try {
      await api.patch(`/admin/sections/${editSectionItem.id}`, {
        ...editSectionForm,
        department_id: Number(editSectionForm.department_id),
        year: Number(editSectionForm.year),
      });
      setEditSectionItem(null);
      await load();
    } catch (err: any) {
      setSectionError(err?.response?.data?.detail || err?.message || "Could not update section.");
    } finally {
      setSectionBusy(false);
    }
  }

  async function deleteSection(sec: Section) {
    if (!confirm(`Are you sure you want to PERMANENTLY delete section '${sec.display_name}'?`)) return;
    setSectionError("");
    setSectionBusy(true);
    try {
      await api.delete(`/admin/sections/${sec.id}`);
      await load();
    } catch (err: any) {
      setSectionError(err?.response?.data?.detail || err?.message || "Could not delete section.");
    } finally {
      setSectionBusy(false);
    }
  }

  // --- Subject Actions ---
  async function createSubject(e: React.FormEvent) {
    e.preventDefault();
    setSubjectError("");
    setSubjectBusy(true);
    try {
      await api.post("/admin/subjects", subjectForm);
      setSubjectForm({ name: "", code: "" });
      await load();
    } catch (err: any) {
      setSubjectError(err?.response?.data?.detail || err?.message || "Could not create subject.");
    } finally {
      setSubjectBusy(false);
    }
  }

  async function saveEditSubject(e: React.FormEvent) {
    e.preventDefault();
    if (!editSubjectItem) return;
    setSubjectError("");
    setSubjectBusy(true);
    try {
      await api.patch(`/admin/subjects/${editSubjectItem.id}`, editSubjectForm);
      setEditSubjectItem(null);
      await load();
    } catch (err: any) {
      setSubjectError(err?.response?.data?.detail || err?.message || "Could not update subject.");
    } finally {
      setSubjectBusy(false);
    }
  }

  async function deleteSubject(sub: Subject) {
    if (!confirm(`Are you sure you want to PERMANENTLY delete subject '${sub.name}' (${sub.code})?`)) return;
    setSubjectError("");
    setSubjectBusy(true);
    try {
      await api.delete(`/admin/subjects/${sub.id}`);
      await load();
    } catch (err: any) {
      setSubjectError(err?.response?.data?.detail || err?.message || "Could not delete subject.");
    } finally {
      setSubjectBusy(false);
    }
  }

  if (loading) return <Spinner label="Loading departments, sections & subjects…" />;
  if (loadError) return <ErrorBanner message={loadError} onRetry={load} />;

  return (
    <div onKeyDown={handleKeyDown}>
      {/* Accessible Edit Department Modal */}
      {editDeptItem && (
        <div
          className="card"
          style={{ border: "2px solid var(--primary)", marginBottom: 20 }}
          role="dialog"
          aria-labelledby="edit-dept-title"
        >
          <h3 id="edit-dept-title">Edit Department: {editDeptItem.name}</h3>
          <form onSubmit={saveEditDept} className="form-grid">
            <div>
              <label htmlFor="edit-dept-name">Department Name</label>
              <input
                id="edit-dept-name"
                ref={editDeptInputRef}
                value={editDeptForm.name}
                onChange={(e) => setEditDeptForm({ ...editDeptForm, name: e.target.value })}
                required
                disabled={deptBusy}
                aria-required="true"
              />
            </div>
            <div>
              <label htmlFor="edit-dept-code">Department Code</label>
              <input
                id="edit-dept-code"
                value={editDeptForm.code}
                onChange={(e) => setEditDeptForm({ ...editDeptForm, code: e.target.value })}
                required
                disabled={deptBusy}
                aria-required="true"
              />
            </div>
            <div style={{ alignSelf: "end", display: "flex", gap: 8 }}>
              <button className="btn" type="submit" disabled={deptBusy} aria-label="Save department changes">
                {deptBusy ? <Spinner inline label="Saving..." /> : "Save Changes"}
              </button>
              <button
                className="btn secondary"
                type="button"
                onClick={() => setEditDeptItem(null)}
                disabled={deptBusy}
                aria-label="Cancel editing department"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Accessible Edit Section & Academic Year Modal */}
      {editSectionItem && (
        <div
          className="card"
          style={{ border: "2px solid var(--primary)", marginBottom: 20 }}
          role="dialog"
          aria-labelledby="edit-sec-title"
        >
          <h3 id="edit-sec-title">Edit Section & Academic Year: {editSectionItem.display_name}</h3>
          <form onSubmit={saveEditSection} className="form-grid">
            <div>
              <label htmlFor="edit-sec-dept">Department</label>
              <select
                id="edit-sec-dept"
                value={editSectionForm.department_id}
                onChange={(e) => setEditSectionForm({ ...editSectionForm, department_id: e.target.value })}
                required
                disabled={sectionBusy}
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} — {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="edit-sec-year">Year</label>
              <select
                id="edit-sec-year"
                value={editSectionForm.year}
                onChange={(e) => setEditSectionForm({ ...editSectionForm, year: e.target.value })}
                disabled={sectionBusy}
              >
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
            <div>
              <label htmlFor="edit-sec-name">Section Letter</label>
              <input
                id="edit-sec-name"
                ref={editSecInputRef}
                value={editSectionForm.name}
                onChange={(e) => setEditSectionForm({ ...editSectionForm, name: e.target.value })}
                required
                disabled={sectionBusy}
              />
            </div>
            <div>
              <label htmlFor="edit-sec-display">Display Name</label>
              <input
                id="edit-sec-display"
                value={editSectionForm.display_name}
                onChange={(e) => setEditSectionForm({ ...editSectionForm, display_name: e.target.value })}
                required
                disabled={sectionBusy}
              />
            </div>
            <div>
              <label htmlFor="edit-sec-academic-year">Academic Year</label>
              <input
                id="edit-sec-academic-year"
                value={editSectionForm.academic_year}
                onChange={(e) => setEditSectionForm({ ...editSectionForm, academic_year: e.target.value })}
                placeholder="e.g. 2025-26"
                required
                disabled={sectionBusy}
                aria-label="Academic Year"
              />
            </div>
            <div style={{ alignSelf: "end", display: "flex", gap: 8 }}>
              <button className="btn" type="submit" disabled={sectionBusy} aria-label="Save section and academic year changes">
                {sectionBusy ? <Spinner inline label="Saving..." /> : "Save Section"}
              </button>
              <button
                className="btn secondary"
                type="button"
                onClick={() => setEditSectionItem(null)}
                disabled={sectionBusy}
                aria-label="Cancel editing section"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Accessible Edit Subject Modal */}
      {editSubjectItem && (
        <div
          className="card"
          style={{ border: "2px solid var(--primary)", marginBottom: 20 }}
          role="dialog"
          aria-labelledby="edit-sub-title"
        >
          <h3 id="edit-sub-title">Edit Subject: {editSubjectItem.name}</h3>
          <form onSubmit={saveEditSubject} className="form-grid">
            <div>
              <label htmlFor="edit-sub-name">Subject Name</label>
              <input
                id="edit-sub-name"
                ref={editSubInputRef}
                value={editSubjectForm.name}
                onChange={(e) => setEditSubjectForm({ ...editSubjectForm, name: e.target.value })}
                required
                disabled={subjectBusy}
              />
            </div>
            <div>
              <label htmlFor="edit-sub-code">Subject Code</label>
              <input
                id="edit-sub-code"
                value={editSubjectForm.code}
                onChange={(e) => setEditSubjectForm({ ...editSubjectForm, code: e.target.value })}
                required
                disabled={subjectBusy}
              />
            </div>
            <div style={{ alignSelf: "end", display: "flex", gap: 8 }}>
              <button className="btn" type="submit" disabled={subjectBusy} aria-label="Save subject changes">
                {subjectBusy ? <Spinner inline label="Saving..." /> : "Save Subject"}
              </button>
              <button
                className="btn secondary"
                type="button"
                onClick={() => setEditSubjectItem(null)}
                disabled={subjectBusy}
                aria-label="Cancel editing subject"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Departments Management Card */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showDeptForm ? 14 : 10 }}>
          <h3 style={{ margin: 0, borderBottom: "none", paddingBottom: 0 }}>Departments</h3>
          <button
            className="btn secondary"
            type="button"
            onClick={() => setShowDeptForm(!showDeptForm)}
            style={{ fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {showDeptForm ? "▲ Hide Form" : "➕ Add Department ▾"}
          </button>
        </div>
        {deptError && <ErrorBanner message={deptError} onDismiss={() => setDeptError("")} />}
        {showDeptForm && (
          <form onSubmit={createDept} className="form-grid" style={{ marginBottom: 16 }}>
            <div>
              <label htmlFor="create-dept-name">Name</label>
              <input
                id="create-dept-name"
                value={deptForm.name}
                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                placeholder="Computer Science & Mining"
                required
                disabled={deptBusy}
              />
            </div>
            <div>
              <label htmlFor="create-dept-code">Code</label>
              <input
                id="create-dept-code"
                value={deptForm.code}
                onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                placeholder="CSM"
                required
                disabled={deptBusy}
              />
            </div>
            <div style={{ alignSelf: "end" }}>
              <button className="btn" type="submit" disabled={deptBusy} aria-label="Add new department">
                {deptBusy ? <Spinner inline label="Adding…" /> : "Add Department"}
              </button>
            </div>
          </form>
        )}
        {departments.length === 0 ? (
          <p className="hint-text">No departments created yet.</p>
        ) : (
          <div className="table-responsive" style={{ marginTop: 16 }}>
            <table className="data-table" aria-label="Departments Table">
              <thead>
                <tr>
                  <th scope="col">Department</th>
                  <th scope="col">Code</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((d) => (
                  <tr key={d.id}>
                    <td>{d.name}</td>
                    <td className="mono">{d.code}</td>
                    <td>
                      <button
                        className="btn secondary"
                        style={{ marginRight: 6 }}
                        onClick={() => {
                          setEditDeptItem(d);
                          setEditDeptForm({ name: d.name, code: d.code });
                        }}
                        aria-label={`Edit department ${d.name}`}
                      >
                        Edit
                      </button>
                      <button
                        className="btn danger"
                        onClick={() => deleteDept(d)}
                        disabled={deptBusy}
                        aria-label={`Delete department ${d.name}`}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sections & Academic Year Card */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showSecForm ? 14 : 10 }}>
          <h3 style={{ margin: 0, borderBottom: "none", paddingBottom: 0 }}>Sections & Academic Year</h3>
          <button
            className="btn secondary"
            type="button"
            onClick={() => setShowSecForm(!showSecForm)}
            style={{ fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {showSecForm ? "▲ Hide Form" : "➕ Add Section ▾"}
          </button>
        </div>
        {sectionError && <ErrorBanner message={sectionError} onDismiss={() => setSectionError("")} />}
        {showSecForm && (
          <form onSubmit={createSection} className="form-grid" style={{ marginBottom: 16 }}>
            <div>
              <label htmlFor="create-sec-dept">Department</label>
              <select
                id="create-sec-dept"
                value={sectionForm.department_id}
                onChange={(e) => setSectionForm({ ...sectionForm, department_id: e.target.value })}
                required
                disabled={sectionBusy}
              >
                <option value="">Select department…</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="create-sec-year">Year</label>
              <select
                id="create-sec-year"
                value={sectionForm.year}
                onChange={(e) => setSectionForm({ ...sectionForm, year: e.target.value })}
                disabled={sectionBusy}
              >
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
            <div>
              <label htmlFor="create-sec-letter">Section Letter</label>
              <input
                id="create-sec-letter"
                value={sectionForm.name}
                onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                placeholder="A"
                required
                disabled={sectionBusy}
              />
            </div>
            <div>
              <label htmlFor="create-sec-display">Display Name</label>
              <input
                id="create-sec-display"
                value={sectionForm.display_name}
                onChange={(e) => setSectionForm({ ...sectionForm, display_name: e.target.value })}
                placeholder="2nd CSM-A"
                required
                disabled={sectionBusy}
              />
            </div>
            <div>
              <label htmlFor="create-sec-acad">Academic Year</label>
              <input
                id="create-sec-acad"
                value={sectionForm.academic_year}
                onChange={(e) => setSectionForm({ ...sectionForm, academic_year: e.target.value })}
                placeholder="2025-26"
                required
                disabled={sectionBusy}
              />
            </div>
            <div style={{ alignSelf: "end" }}>
              <button className="btn" type="submit" disabled={sectionBusy} aria-label="Add new section">
                {sectionBusy ? <Spinner inline label="Adding…" /> : "Add Section"}
              </button>
            </div>
          </form>
        )}
        <div className="table-responsive" style={{ marginTop: 16 }}>
          <table className="data-table" aria-label="Sections Table">
            <thead>
              <tr>
                <th scope="col">Section</th>
                <th scope="col">Year</th>
                <th scope="col">Academic Year</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sections.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "var(--ink-soft)" }}>
                    No sections created yet.
                  </td>
                </tr>
              ) : (
                sections.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.display_name}</td>
                    <td>Year {s.year}</td>
                    <td>
                      <span className="status-badge pending" style={{ color: "var(--ink)" }}>
                        {s.academic_year}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn secondary"
                        style={{ marginRight: 6 }}
                        onClick={() => {
                          setEditSectionItem(s);
                          setEditSectionForm({
                            department_id: String(s.department_id),
                            year: String(s.year),
                            name: s.name,
                            display_name: s.display_name,
                            academic_year: s.academic_year,
                          });
                        }}
                        aria-label={`Edit section ${s.display_name} and academic year ${s.academic_year}`}
                      >
                        Edit
                      </button>
                      <button
                        className="btn danger"
                        onClick={() => deleteSection(s)}
                        disabled={sectionBusy}
                        aria-label={`Delete section ${s.display_name}`}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subjects Card */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showSubForm ? 14 : 10 }}>
          <h3 style={{ margin: 0, borderBottom: "none", paddingBottom: 0 }}>Subjects</h3>
          <button
            className="btn secondary"
            type="button"
            onClick={() => setShowSubForm(!showSubForm)}
            style={{ fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {showSubForm ? "▲ Hide Form" : "➕ Add Subject ▾"}
          </button>
        </div>
        {subjectError && <ErrorBanner message={subjectError} onDismiss={() => setSubjectError("")} />}
        {showSubForm && (
          <form onSubmit={createSubject} className="form-grid" style={{ marginBottom: 16 }}>
            <div>
              <label htmlFor="create-sub-name">Subject Name</label>
              <input
                id="create-sub-name"
                value={subjectForm.name}
                onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                required
                disabled={subjectBusy}
              />
            </div>
            <div>
              <label htmlFor="create-sub-code">Code</label>
              <input
                id="create-sub-code"
                value={subjectForm.code}
                onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                required
                disabled={subjectBusy}
              />
            </div>
            <div style={{ alignSelf: "end" }}>
              <button className="btn" type="submit" disabled={subjectBusy} aria-label="Add new subject">
                {subjectBusy ? <Spinner inline label="Adding…" /> : "Add Subject"}
              </button>
            </div>
          </form>
        )}
        <div className="table-responsive" style={{ marginTop: 16 }}>
          <table className="data-table" aria-label="Subjects Table">
            <thead>
              <tr>
                <th scope="col">Subject</th>
                <th scope="col">Code</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subjects.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center", color: "var(--ink-soft)" }}>
                    No subjects created yet.
                  </td>
                </tr>
              ) : (
                subjects.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td className="mono">{s.code}</td>
                    <td>
                      <button
                        className="btn secondary"
                        style={{ marginRight: 6 }}
                        onClick={() => {
                          setEditSubjectItem(s);
                          setEditSubjectForm({
                            name: s.name,
                            code: s.code,
                          });
                        }}
                        aria-label={`Edit subject ${s.name}`}
                      >
                        Edit
                      </button>
                      <button
                        className="btn danger"
                        onClick={() => deleteSubject(s)}
                        disabled={subjectBusy}
                        aria-label={`Delete subject ${s.name}`}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
