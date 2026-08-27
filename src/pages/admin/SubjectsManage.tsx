import React, { useEffect, useState, useRef } from "react";
import { api } from "../../api/client";
import { Subject, Faculty, Section, FacultyAllocation } from "../../types";
import Spinner from "../../components/Spinner";
import ErrorBanner from "../../components/ErrorBanner";

const YEAR_OPTIONS = [
  { value: "1", label: "1st Year" },
  { value: "2", label: "2nd Year" },
  { value: "3", label: "3rd Year" },
  { value: "4", label: "4th Year" },
];

export default function SubjectsManage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [allocations, setAllocations] = useState<FacultyAllocation[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>("all");

  // Create Subject Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", code: "", year: "2" });
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  // Edit Subject State
  const [editSubjectItem, setEditSubjectItem] = useState<Subject | null>(null);
  const [editSubjectForm, setEditSubjectForm] = useState({ name: "", code: "", year: "2" });
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");
  const editNameRef = useRef<HTMLInputElement>(null);

  // Allocate Subject to Faculty Modal State
  const [allocModalSubject, setAllocModalSubject] = useState<Subject | null>(null);
  const [allocFacultyId, setAllocFacultyId] = useState<string>("");
  const [allocSectionIds, setAllocSectionIds] = useState<number[]>([]);
  const [allocShowAllSections, setAllocShowAllSections] = useState(false);
  const [allocBusy, setAllocBusy] = useState(false);
  const [allocError, setAllocError] = useState("");
  const [allocSuccess, setAllocSuccess] = useState("");

  async function loadData() {
    setLoading(true);
    setLoadError("");
    try {
      const [subRes, facRes, secRes, allocRes] = await Promise.all([
        api.get<Subject[]>("/admin/subjects"),
        api.get<Faculty[]>("/admin/faculty"),
        api.get<Section[]>("/admin/sections"),
        api.get<FacultyAllocation[]>("/admin/allocations"),
      ]);
      setSubjects(subRes.data);
      setFaculty(facRes.data);
      setSections(secRes.data);
      setAllocations(allocRes.data);
    } catch (err: any) {
      setLoadError(err?.response?.data?.detail || err?.message || "Failed to load subjects and allocation data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (editSubjectItem && editNameRef.current) {
      editNameRef.current.focus();
    }
  }, [editSubjectItem]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setEditSubjectItem(null);
      setAllocModalSubject(null);
    }
  }

  // --- Create Subject ---
  async function handleCreateSubject(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    setCreateBusy(true);
    try {
      const payload = {
        name: createForm.name.trim(),
        code: createForm.code.trim().toUpperCase(),
        year: createForm.year ? Number(createForm.year) : null,
      };
      const res = await api.post<Subject>("/admin/subjects", payload);
      setCreateSuccess(`Subject "${res.data.name}" (${res.data.code}) created successfully!`);
      setCreateForm({ name: "", code: "", year: createForm.year });
      await loadData();
    } catch (err: any) {
      setCreateError(err?.response?.data?.detail || err?.message || "Could not create subject.");
    } finally {
      setCreateBusy(false);
    }
  }

  // --- Edit Subject ---
  function startEdit(s: Subject) {
    setEditSubjectItem(s);
    setEditSubjectForm({
      name: s.name,
      code: s.code,
      year: s.year ? String(s.year) : "2",
    });
    setEditError("");
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editSubjectItem) return;
    setEditBusy(true);
    setEditError("");
    try {
      await api.patch(`/admin/subjects/${editSubjectItem.id}`, {
        name: editSubjectForm.name.trim(),
        code: editSubjectForm.code.trim().toUpperCase(),
        year: editSubjectForm.year ? Number(editSubjectForm.year) : null,
      });
      setEditSubjectItem(null);
      await loadData();
    } catch (err: any) {
      setEditError(err?.response?.data?.detail || err?.message || "Could not update subject.");
    } finally {
      setEditBusy(false);
    }
  }

  // --- Delete Subject ---
  async function handleDeleteSubject(s: Subject) {
    if (!confirm(`Are you sure you want to PERMANENTLY delete subject "${s.name}" (${s.code})?\nThis will also remove any faculty allocations associated with this subject.`)) {
      return;
    }
    setCreateError("");
    try {
      await api.delete(`/admin/subjects/${s.id}`);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || err?.message || "Could not delete subject.");
    }
  }

  // --- Open Allocation Modal for Subject ---
  function openAllocationModal(s: Subject) {
    setAllocModalSubject(s);
    setAllocFacultyId(faculty.length > 0 ? String(faculty[0].id) : "");
    setAllocError("");
    setAllocSuccess("");
    setAllocShowAllSections(false);
    setAllocSectionIds([]);
  }

  function toggleAllocSection(sectionId: number) {
    setAllocSectionIds((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    );
  }

  function selectAllMatchingSections(matchingSecs: Section[]) {
    const matchingIds = matchingSecs.map((sec) => sec.id);
    const allSelected = matchingIds.every((id) => allocSectionIds.includes(id));
    if (allSelected) {
      setAllocSectionIds((prev) => prev.filter((id) => !matchingIds.includes(id)));
    } else {
      setAllocSectionIds((prev) => Array.from(new Set([...prev, ...matchingIds])));
    }
  }

  async function handleSaveAllocation(e: React.FormEvent) {
    e.preventDefault();
    if (!allocModalSubject || !allocFacultyId || allocSectionIds.length === 0) {
      setAllocError("Please choose a faculty member and select at least one section.");
      return;
    }
    setAllocBusy(true);
    setAllocError("");
    setAllocSuccess("");
    try {
      await api.post(`/admin/subjects/${allocModalSubject.id}/allocate`, {
        faculty_id: Number(allocFacultyId),
        section_ids: allocSectionIds,
      });
      setAllocSuccess("Subject allocated successfully!");
      setAllocSectionIds([]);
      await loadData();
      setTimeout(() => {
        setAllocModalSubject(null);
      }, 900);
    } catch (err: any) {
      setAllocError(err?.response?.data?.detail || err?.message || "Could not allocate subject.");
    } finally {
      setAllocBusy(false);
    }
  }

  async function handleRemoveAllocation(allocId: number, facId: number) {
    try {
      await api.delete(`/admin/faculty/${facId}/allocations/${allocId}`);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || err?.message || "Could not remove allocation.");
    }
  }

  // Filter subjects
  const filteredSubjects = subjects.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesYear =
      selectedYearFilter === "all" ||
      (selectedYearFilter === "unassigned" && !s.year) ||
      (s.year !== null && s.year !== undefined && String(s.year) === selectedYearFilter);
    return matchesSearch && matchesYear;
  });

  // Group allocations by subject_id
  const allocationsBySubject: Record<number, FacultyAllocation[]> = {};
  allocations.forEach((a) => {
    if (!allocationsBySubject[a.subject_id]) {
      allocationsBySubject[a.subject_id] = [];
    }
    allocationsBySubject[a.subject_id].push(a);
  });

  if (loading) return <Spinner label="Loading subjects & allocations…" />;
  if (loadError) return <ErrorBanner message={loadError} onRetry={loadData} />;

  return (
    <div onKeyDown={handleKeyDown}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-heading" style={{ margin: 0 }}>Subjects & Allocations</h1>
          <p className="page-subheading" style={{ margin: "4px 0 0" }}>
            Add subjects by Academic Year (1st, 2nd, 3rd, 4th Year) and allocate them to teaching faculty.
          </p>
        </div>
        <button
          className="btn"
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          {showAddForm ? "▲ Hide Form" : "➕ Add New Subject"}
        </button>
      </div>

      {/* Add New Subject Form Card */}
      {showAddForm && (
        <div className="card" style={{ border: "2px solid var(--primary)", marginBottom: 24, animation: "fadeIn 0.2s ease" }}>
          <h3 style={{ margin: "0 0 16px" }}>Add New Subject</h3>
          {createError && <ErrorBanner message={createError} onDismiss={() => setCreateError("")} />}
          {createSuccess && (
            <div style={{ background: "var(--present-bg, #dcfce7)", color: "var(--present, #15803d)", padding: "10px 14px", borderRadius: 6, marginBottom: 16, fontSize: "0.88rem", fontWeight: 500 }}>
              ✓ {createSuccess}
            </div>
          )}

          <form onSubmit={handleCreateSubject}>
            <div className="form-grid">
              <div>
                <label htmlFor="create-sub-name">Subject Name *</label>
                <input
                  id="create-sub-name"
                  placeholder="e.g. Operating Systems"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  required
                  disabled={createBusy}
                />
              </div>

              <div>
                <label htmlFor="create-sub-code">Subject Code *</label>
                <input
                  id="create-sub-code"
                  placeholder="e.g. CS302"
                  value={createForm.code}
                  onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                  required
                  disabled={createBusy}
                />
              </div>

              <div>
                <label htmlFor="create-sub-year">Target Year *</label>
                <select
                  id="create-sub-year"
                  value={createForm.year}
                  onChange={(e) => setCreateForm({ ...createForm, year: e.target.value })}
                  required
                  disabled={createBusy}
                >
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="btn" type="submit" disabled={createBusy}>
                {createBusy ? <Spinner inline label="Adding Subject…" /> : "Create Subject"}
              </button>
              <button
                className="btn secondary"
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setCreateError("");
                  setCreateSuccess("");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Subject Modal */}
      {editSubjectItem && (
        <div
          className="card"
          style={{ border: "2px solid var(--primary)", marginBottom: 24, background: "var(--paper-raised)" }}
          role="dialog"
          aria-labelledby="edit-sub-title"
        >
          <h3 id="edit-sub-title">Edit Subject: {editSubjectItem.name}</h3>
          {editError && <ErrorBanner message={editError} onDismiss={() => setEditError("")} />}
          <form onSubmit={handleSaveEdit}>
            <div className="form-grid">
              <div>
                <label htmlFor="edit-sub-name">Subject Name</label>
                <input
                  id="edit-sub-name"
                  ref={editNameRef}
                  value={editSubjectForm.name}
                  onChange={(e) => setEditSubjectForm({ ...editSubjectForm, name: e.target.value })}
                  required
                  disabled={editBusy}
                />
              </div>
              <div>
                <label htmlFor="edit-sub-code">Subject Code</label>
                <input
                  id="edit-sub-code"
                  value={editSubjectForm.code}
                  onChange={(e) => setEditSubjectForm({ ...editSubjectForm, code: e.target.value })}
                  required
                  disabled={editBusy}
                />
              </div>
              <div>
                <label htmlFor="edit-sub-year">Target Year</label>
                <select
                  id="edit-sub-year"
                  value={editSubjectForm.year}
                  onChange={(e) => setEditSubjectForm({ ...editSubjectForm, year: e.target.value })}
                  disabled={editBusy}
                >
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="btn" type="submit" disabled={editBusy}>
                {editBusy ? <Spinner inline label="Saving…" /> : "Save Changes"}
              </button>
              <button
                className="btn secondary"
                type="button"
                onClick={() => setEditSubjectItem(null)}
                disabled={editBusy}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Allocate Modal Dialog */}
      {allocModalSubject && (
        <div
          className="card"
          style={{
            border: "2px solid var(--primary)",
            marginBottom: 24,
            background: "var(--paper-raised)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
          role="dialog"
          aria-labelledby="alloc-title"
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 id="alloc-title" style={{ margin: 0 }}>
              Allocate Subject: <span style={{ color: "var(--primary)" }}>{allocModalSubject.name}</span> ({allocModalSubject.code})
            </h3>
            <button
              className="btn secondary"
              type="button"
              onClick={() => setAllocModalSubject(null)}
              style={{ padding: "4px 8px", fontSize: "0.8rem" }}
            >
              ✕ Close
            </button>
          </div>

          <p style={{ fontSize: "0.85rem", color: "var(--ink-soft)", margin: "0 0 16px" }}>
            Select the faculty member who will teach this subject, then select the target sections.
          </p>

          {allocError && <ErrorBanner message={allocError} onDismiss={() => setAllocError("")} />}
          {allocSuccess && (
            <div style={{ background: "var(--present-bg, #dcfce7)", color: "var(--present, #15803d)", padding: "10px 14px", borderRadius: 6, marginBottom: 16, fontSize: "0.88rem", fontWeight: 500 }}>
              ✓ {allocSuccess}
            </div>
          )}

          <form onSubmit={handleSaveAllocation}>
            {/* Faculty Dropdown */}
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="alloc-faculty-select" style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                Select Faculty Member *
              </label>
              <select
                id="alloc-faculty-select"
                value={allocFacultyId}
                onChange={(e) => setAllocFacultyId(e.target.value)}
                required
                disabled={allocBusy || faculty.length === 0}
                style={{ width: "100%", marginTop: 4 }}
              >
                {faculty.length === 0 ? (
                  <option value="">No faculty accounts available</option>
                ) : (
                  faculty.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.full_name} (@{f.username}) {f.is_active ? "" : "— Disabled"}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Sections Selector */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                  Target Sections * (Year {allocModalSubject.year || "All"})
                </label>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {allocModalSubject.year && (
                    <label style={{ fontSize: "0.78rem", cursor: "pointer", color: "var(--ink-soft)" }}>
                      <input
                        type="checkbox"
                        checked={allocShowAllSections}
                        onChange={(e) => setAllocShowAllSections(e.target.checked)}
                        style={{ marginRight: 4 }}
                      />
                      Show all years
                    </label>
                  )}
                  {(() => {
                    const candidateSections = sections.filter((sec) =>
                      allocShowAllSections || !allocModalSubject.year ? true : sec.year === allocModalSubject.year
                    );
                    if (candidateSections.length === 0) return null;
                    const allSelected = candidateSections.every((sec) => allocSectionIds.includes(sec.id));
                    return (
                      <button
                        type="button"
                        className="btn secondary"
                        style={{ padding: "2px 8px", fontSize: "0.75rem" }}
                        onClick={() => selectAllMatchingSections(candidateSections)}
                      >
                        {allSelected ? "Deselect All" : "Select All"}
                      </button>
                    );
                  })()}
                </div>
              </div>

              {/* Sections checkboxes grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: 8,
                  maxHeight: 220,
                  overflowY: "auto",
                  padding: 10,
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  background: "var(--surface, #fff)",
                }}
              >
                {(() => {
                  const candidateSections = sections.filter((sec) =>
                    allocShowAllSections || !allocModalSubject.year ? true : sec.year === allocModalSubject.year
                  );

                  if (candidateSections.length === 0) {
                    return (
                      <span style={{ color: "var(--ink-soft)", fontSize: "0.85rem", gridColumn: "1 / -1", padding: 8 }}>
                        No matching sections found for Year {allocModalSubject.year}. You can check "Show all years" above.
                      </span>
                    );
                  }

                  return candidateSections.map((sec) => {
                    const isSelected = allocSectionIds.includes(sec.id);
                    return (
                      <label
                        key={sec.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: "0.85rem",
                          cursor: "pointer",
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: isSelected ? "1px solid var(--primary)" : "1px solid var(--border)",
                          background: isSelected ? "var(--primary-light, #e6f0fa)" : "var(--paper-raised, #fff)",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleAllocSection(sec.id)}
                          disabled={allocBusy}
                        />
                        <div>
                          <div style={{ fontWeight: 600 }}>{sec.display_name}</div>
                          <div style={{ fontSize: "0.74rem", color: "var(--ink-soft)" }}>Year {sec.year} · {sec.academic_year}</div>
                        </div>
                      </label>
                    );
                  });
                })()}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button className="btn" type="submit" disabled={allocBusy || allocSectionIds.length === 0}>
                {allocBusy ? <Spinner inline label="Allocating…" /> : `Allocate to ${allocSectionIds.length} Section(s)`}
              </button>
              <button
                className="btn secondary"
                type="button"
                onClick={() => setAllocModalSubject(null)}
                disabled={allocBusy}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Directory Filter Bar */}
      <div className="card" style={{ marginBottom: 16, padding: "14px 16px" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          {/* Year Filter Pills */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--ink-soft)", marginRight: 4 }}>
              Year:
            </span>
            <button
              className={`btn ${selectedYearFilter === "all" ? "" : "secondary"}`}
              style={{ borderRadius: 16, padding: "4px 12px", fontSize: "0.78rem" }}
              onClick={() => setSelectedYearFilter("all")}
            >
              All Years ({subjects.length})
            </button>
            {YEAR_OPTIONS.map((yo) => {
              const count = subjects.filter((s) => String(s.year) === yo.value).length;
              return (
                <button
                  key={yo.value}
                  className={`btn ${selectedYearFilter === yo.value ? "" : "secondary"}`}
                  style={{ borderRadius: 16, padding: "4px 12px", fontSize: "0.78rem" }}
                  onClick={() => setSelectedYearFilter(yo.value)}
                >
                  {yo.label} ({count})
                </button>
              );
            })}
            {subjects.some((s) => !s.year) && (
              <button
                className={`btn ${selectedYearFilter === "unassigned" ? "" : "secondary"}`}
                style={{ borderRadius: 16, padding: "4px 12px", fontSize: "0.78rem" }}
                onClick={() => setSelectedYearFilter("unassigned")}
              >
                Unassigned ({subjects.filter((s) => !s.year).length})
              </button>
            )}
          </div>

          {/* Search Box */}
          <div style={{ minWidth: 220, flex: "0 1 300px" }}>
            <input
              type="search"
              placeholder="Search by subject name or code…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "100%", padding: "6px 12px", fontSize: "0.85rem" }}
            />
          </div>
        </div>
      </div>

      {/* Subjects & Allocations List */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>
            Subjects Directory
            <span style={{ fontSize: "0.82rem", fontWeight: 400, color: "var(--ink-soft)", marginLeft: 8 }}>
              ({filteredSubjects.length} of {subjects.length} total)
            </span>
          </h3>
          <button
            className="btn secondary"
            style={{ fontSize: "0.78rem", padding: "4px 10px" }}
            onClick={loadData}
          >
            ↻ Refresh
          </button>
        </div>

        {filteredSubjects.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--ink-soft)" }}>
            <div style={{ fontSize: "2rem", marginBottom: 8 }}>📚</div>
            <div style={{ fontWeight: 600 }}>No subjects found</div>
            <p style={{ fontSize: "0.85rem", marginTop: 4 }}>
              {searchQuery || selectedYearFilter !== "all"
                ? "Try clearing your search or year filter."
                : "Get started by adding your first subject above."}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table" aria-label="Subjects and Allocations table">
              <thead>
                <tr>
                  <th scope="col" style={{ width: "22%" }}>Subject Name</th>
                  <th scope="col" style={{ width: "12%" }}>Code</th>
                  <th scope="col" style={{ width: "12%" }}>Year</th>
                  <th scope="col">Allocated Faculty & Sections</th>
                  <th scope="col" style={{ width: "180px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubjects.map((s) => {
                  const subjectAllocs = allocationsBySubject[s.id] || [];
                  return (
                    <tr key={s.id}>
                      {/* Name */}
                      <td style={{ fontWeight: 600 }}>{s.name}</td>

                      {/* Code */}
                      <td>
                        <span className="mono status-badge" style={{ background: "var(--bg-main)", border: "1px solid var(--border)", fontWeight: 700 }}>
                          {s.code}
                        </span>
                      </td>

                      {/* Year */}
                      <td>
                        {s.year ? (
                          <span
                            className="status-badge"
                            style={{
                              background: s.year === 1 ? "#E0F2FE" : s.year === 2 ? "#E0E7FF" : s.year === 3 ? "#EDE9FE" : "#FAE8FF",
                              color: s.year === 1 ? "#0369A1" : s.year === 2 ? "#3730A3" : s.year === 3 ? "#5B21B6" : "#86198F",
                              fontWeight: 600,
                            }}
                          >
                            {s.year === 1 ? "1st Year" : s.year === 2 ? "2nd Year" : s.year === 3 ? "3rd Year" : "4th Year"}
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.78rem", color: "var(--ink-muted)" }}>Unassigned</span>
                        )}
                      </td>

                      {/* Allocations */}
                      <td>
                        {subjectAllocs.length === 0 ? (
                          <span style={{ fontSize: "0.8rem", color: "var(--ink-muted)", fontStyle: "italic" }}>
                            Not allocated yet
                          </span>
                        ) : (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {subjectAllocs.map((a) => (
                              <span
                                key={a.id}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  fontSize: "0.78rem",
                                  background: "var(--paper-raised)",
                                  border: "1px solid var(--border)",
                                  borderRadius: 14,
                                  padding: "2px 8px",
                                }}
                              >
                                <span style={{ fontWeight: 600, color: "var(--primary)" }}>{a.faculty_name}</span>
                                <span style={{ color: "var(--ink-soft)" }}>→ {a.section_display_name}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAllocation(a.id, a.faculty_id)}
                                  style={{
                                    border: "none",
                                    background: "transparent",
                                    cursor: "pointer",
                                    color: "var(--absent, #b91c1c)",
                                    fontSize: "0.75rem",
                                    marginLeft: 2,
                                    padding: 0,
                                  }}
                                  title={`Remove allocation for ${a.faculty_name}`}
                                >
                                  ✕
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <button
                          className="btn"
                          style={{ fontSize: "0.75rem", padding: "4px 8px", marginRight: 6 }}
                          onClick={() => openAllocationModal(s)}
                          title={`Allocate ${s.name} to faculty`}
                        >
                          ➕ Allocate
                        </button>
                        <button
                          className="btn secondary"
                          style={{ fontSize: "0.75rem", padding: "4px 8px", marginRight: 6 }}
                          onClick={() => startEdit(s)}
                          title={`Edit ${s.name}`}
                        >
                          Edit
                        </button>
                        <button
                          className="btn danger"
                          style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                          onClick={() => handleDeleteSubject(s)}
                          title={`Delete ${s.name}`}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
