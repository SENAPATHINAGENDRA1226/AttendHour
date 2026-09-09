import React, { useEffect, useState, useRef, useMemo } from "react";
import { api } from "../../api/client";
import { Subject, Faculty, Section, FacultyAllocation } from "../../types";
import Spinner from "../../components/Spinner";
import ErrorBanner from "../../components/ErrorBanner";

const YEAR_OPTIONS = [
  { value: "1", label: "1st Year", color: "#0369a1", bg: "#e0f2fe" },
  { value: "2", label: "2nd Year", color: "#3730a3", bg: "#e0e7ff" },
  { value: "3", label: "3rd Year", color: "#5b21b6", bg: "#ede9fe" },
  { value: "4", label: "4th Year", color: "#86198f", bg: "#fae8ff" },
];

export default function SubjectsManage() {
  // Top-level tab: "subjects" | "allocations"
  const [activeTab, setActiveTab] = useState<"subjects" | "allocations">("subjects");

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [allocations, setAllocations] = useState<FacultyAllocation[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Filter & Search - Subjects Tab
  const [subjectSearch, setSubjectSearch] = useState("");
  const [subjectYearFilter, setSubjectYearFilter] = useState<string>("all");
  const [subjectBranchFilter, setSubjectBranchFilter] = useState<string>("all");

  // Filter & Search - Allocations Tab
  const [allocSearch, setAllocSearch] = useState("");
  const [allocYearFilter, setAllocYearFilter] = useState<string>("all");
  const [allocFacultyFilter, setAllocFacultyFilter] = useState<string>("all");
  const [allocSectionFilter, setAllocSectionFilter] = useState<string>("all");

  // Create Subject Form State
  const [showAddSubjectForm, setShowAddSubjectForm] = useState(false);
  const [createSubjectForm, setCreateSubjectForm] = useState({ name: "", code: "", year: "2", branch: "CSM" });
  const [createSubjectBusy, setCreateSubjectBusy] = useState(false);
  const [createSubjectError, setCreateSubjectError] = useState("");
  const [createSubjectSuccess, setCreateSubjectSuccess] = useState("");

  // Edit Subject State
  const [editSubjectItem, setEditSubjectItem] = useState<Subject | null>(null);
  const [editSubjectForm, setEditSubjectForm] = useState({ name: "", code: "", year: "2", branch: "CSM" });
  const [editSubjectBusy, setEditSubjectBusy] = useState(false);
  const [editSubjectError, setEditSubjectError] = useState("");
  const editNameRef = useRef<HTMLInputElement>(null);

  // Allocate Subject to Faculty Modal State (from Subjects or Allocations tab)
  const [showAllocModal, setShowAllocModal] = useState(false);
  const [allocModalSubjectId, setAllocModalSubjectId] = useState<string>("");
  const [allocFacultyId, setAllocFacultyId] = useState<string>("");
  const [allocSectionIds, setAllocSectionIds] = useState<number[]>([]);
  const [allocShowAllSections, setAllocShowAllSections] = useState(false);
  const [allocBusy, setAllocBusy] = useState(false);
  const [allocError, setAllocError] = useState("");
  const [allocSuccess, setAllocSuccess] = useState("");

  // Bulk Upload State
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    subjects_created: number;
    subjects_updated: number;
    allocations_created: number;
    errors: string[];
  } | null>(null);
  const [uploadError, setUploadError] = useState("");

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
      setShowAllocModal(false);
    }
  }

  // --- Create Subject ---
  async function handleCreateSubject(e: React.FormEvent) {
    e.preventDefault();
    setCreateSubjectError("");
    setCreateSubjectSuccess("");
    setCreateSubjectBusy(true);
    try {
      const payload = {
        name: createSubjectForm.name.trim(),
        code: createSubjectForm.code.trim().toUpperCase(),
        year: createSubjectForm.year ? Number(createSubjectForm.year) : null,
        branch: createSubjectForm.branch || "CSM",
      };
      const res = await api.post<Subject>("/admin/subjects", payload);
      setCreateSubjectSuccess(`Subject "${res.data.name}" (${res.data.code}) for Year ${res.data.year || "—"} created successfully!`);
      setCreateSubjectForm({ name: "", code: "", year: createSubjectForm.year, branch: createSubjectForm.branch });
      await loadData();
    } catch (err: any) {
      setCreateSubjectError(err?.response?.data?.detail || err?.message || "Could not create subject.");
    } finally {
      setCreateSubjectBusy(false);
    }
  }

  // --- Edit Subject ---
  function startEdit(s: Subject) {
    setEditSubjectItem(s);
    setEditSubjectForm({
      name: s.name,
      code: s.code,
      year: s.year ? String(s.year) : "2",
      branch: s.branch || "CSM",
    });
    setEditSubjectError("");
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editSubjectItem) return;
    setEditSubjectBusy(true);
    setEditSubjectError("");
    try {
      await api.patch(`/admin/subjects/${editSubjectItem.id}`, {
        name: editSubjectForm.name.trim(),
        code: editSubjectForm.code.trim().toUpperCase(),
        year: editSubjectForm.year ? Number(editSubjectForm.year) : null,
        branch: editSubjectForm.branch || "CSM",
      });
      setEditSubjectItem(null);
      await loadData();
    } catch (err: any) {
      setEditSubjectError(err?.response?.data?.detail || err?.message || "Could not update subject.");
    } finally {
      setEditSubjectBusy(false);
    }
  }

  // --- Delete Subject ---
  async function handleDeleteSubject(s: Subject) {
    if (
      !confirm(
        `Are you sure you want to PERMANENTLY delete subject "${s.name}" (${s.code})?\nThis will also remove any faculty allocations associated with this subject.`
      )
    ) {
      return;
    }
    try {
      await api.delete(`/admin/subjects/${s.id}`);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || err?.message || "Could not delete subject.");
    }
  }

  // --- Open Allocation Modal ---
  function openAllocationModal(targetSubjectId?: number) {
    setShowAllocModal(true);
    setAllocModalSubjectId(targetSubjectId ? String(targetSubjectId) : subjects.length > 0 ? String(subjects[0].id) : "");
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
    if (!allocModalSubjectId || !allocFacultyId || allocSectionIds.length === 0) {
      setAllocError("Please choose a subject, faculty member, and select at least one section.");
      return;
    }
    setAllocBusy(true);
    setAllocError("");
    setAllocSuccess("");
    try {
      await api.post("/admin/allocations", {
        faculty_id: Number(allocFacultyId),
        subject_id: Number(allocModalSubjectId),
        section_ids: allocSectionIds,
      });
      setAllocSuccess("Subject allocated successfully!");
      setAllocSectionIds([]);
      await loadData();
      setTimeout(() => {
        setShowAllocModal(false);
      }, 900);
    } catch (err: any) {
      setAllocError(err?.response?.data?.detail || err?.message || "Could not allocate subject.");
    } finally {
      setAllocBusy(false);
    }
  }

  async function handleRemoveAllocation(allocId: number) {
    if (!confirm("Are you sure you want to remove this faculty allocation?")) {
      return;
    }
    try {
      await api.delete(`/admin/allocations/${allocId}`);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || err?.message || "Could not remove allocation.");
    }
  }

  // --- Bulk Roster Upload ---
  async function handleSubjectUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile) return;
    setUploadBusy(true);
    setUploadError("");
    setUploadResult(null);
    const fd = new FormData();
    fd.append("file", uploadFile);
    try {
      const res = await api.post("/admin/subjects/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadResult(res.data);
      setUploadFile(null);
      await loadData();
    } catch (err: any) {
      setUploadError(err?.response?.data?.detail || err?.message || "Subject roster upload failed.");
    } finally {
      setUploadBusy(false);
    }
  }

  function downloadRosterTemplate() {
    const content =
      "subject_name,subject_code,year,faculty_username,section_name\n" +
      "Operating Systems,CS301,2,faculty1,2nd CSM-A\n" +
      "Operating Systems,CS301,2,faculty1,2nd CSM-B\n" +
      "Database Management Systems,CS302,3,faculty2,3rd CSM-A\n" +
      "Computer Networks,CS303,3,faculty2,3rd CSM-A\n";
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "subject_faculty_roster_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- Filtered Data ---
  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(subjectSearch.toLowerCase()) ||
        s.code.toLowerCase().includes(subjectSearch.toLowerCase());
      const matchesYear =
        subjectYearFilter === "all" ||
        (subjectYearFilter === "unassigned" && !s.year) ||
        (s.year !== null && s.year !== undefined && String(s.year) === subjectYearFilter);
      const matchesBranch =
        subjectBranchFilter === "all" ||
        (s.branch || "CSM") === subjectBranchFilter;
      return matchesSearch && matchesYear && matchesBranch;
    });
  }, [subjects, subjectSearch, subjectYearFilter, subjectBranchFilter]);

  // Group allocations by subject_id for quick count badge in Subjects tab
  const allocationsBySubject = useMemo(() => {
    const map: Record<number, FacultyAllocation[]> = {};
    allocations.forEach((a) => {
      if (!map[a.subject_id]) map[a.subject_id] = [];
      map[a.subject_id].push(a);
    });
    return map;
  }, [allocations]);

  // Filtered Allocations for Allocations tab
  const filteredAllocations = useMemo(() => {
    return allocations.filter((a) => {
      const matchesFaculty =
        allocFacultyFilter === "all" || String(a.faculty_id) === allocFacultyFilter;
      const matchesSection =
        allocSectionFilter === "all" || String(a.section_id) === allocSectionFilter;
      const matchesYear =
        allocYearFilter === "all" ||
        (allocYearFilter === "unassigned" && !a.subject_year) ||
        (a.subject_year !== null && a.subject_year !== undefined && String(a.subject_year) === allocYearFilter);

      const q = allocSearch.toLowerCase();
      const matchesSearch =
        !q ||
        (a.faculty_name && a.faculty_name.toLowerCase().includes(q)) ||
        (a.faculty_username && a.faculty_username.toLowerCase().includes(q)) ||
        a.subject_name.toLowerCase().includes(q) ||
        a.subject_code.toLowerCase().includes(q) ||
        a.section_display_name.toLowerCase().includes(q);

      return matchesFaculty && matchesSection && matchesYear && matchesSearch;
    });
  }, [allocations, allocFacultyFilter, allocSectionFilter, allocYearFilter, allocSearch]);

  const selectedAllocSubject = subjects.find((s) => String(s.id) === allocModalSubjectId);

  if (loading) return <Spinner label="Loading subjects & allocations…" />;
  if (loadError) return <ErrorBanner message={loadError} onRetry={loadData} />;

  return (
    <div onKeyDown={handleKeyDown} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top Header & Sub-Tab Switcher */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h1 className="page-heading" style={{ margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: "28px", color: "var(--primary)" }}>
              {activeTab === "subjects" ? "menu_book" : "assignment_ind"}
            </span>
            {activeTab === "subjects" ? "Subjects Catalog" : "Faculty Allocations"}
          </h1>
          <p className="page-subheading" style={{ margin: "4px 0 0" }}>
            {activeTab === "subjects"
              ? "Manage academic subjects with assigned Year (1st, 2nd, 3rd, 4th Year) for seamless timetable allocation."
              : "Review and manage all active faculty-to-subject allocations across class sections."}
          </p>
        </div>

        {/* Dedicated Separate Sub-Tabs */}
        <div
          style={{
            display: "inline-flex",
            backgroundColor: "#e2e8f0",
            padding: 4,
            borderRadius: 8,
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)",
          }}
          role="tablist"
          aria-label="Subjects & Allocations views"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "subjects"}
            onClick={() => setActiveTab("subjects")}
            style={{
              padding: "7px 16px",
              borderRadius: 6,
              border: "none",
              fontSize: "0.86rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
              backgroundColor: activeTab === "subjects" ? "#ffffff" : "transparent",
              color: activeTab === "subjects" ? "var(--primary)" : "var(--ink-soft)",
              boxShadow: activeTab === "subjects" ? "0 2px 5px rgba(0,0,0,0.08)" : "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              menu_book
            </span>
            Subjects ({subjects.length})
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "allocations"}
            onClick={() => setActiveTab("allocations")}
            style={{
              padding: "7px 16px",
              borderRadius: 6,
              border: "none",
              fontSize: "0.86rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
              backgroundColor: activeTab === "allocations" ? "#ffffff" : "transparent",
              color: activeTab === "allocations" ? "var(--primary)" : "var(--ink-soft)",
              boxShadow: activeTab === "allocations" ? "0 2px 5px rgba(0,0,0,0.08)" : "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              assignment_ind
            </span>
            Allocations ({allocations.length})
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: SUBJECTS CATALOG                                                  */}
      {/* ========================================================================= */}
      {activeTab === "subjects" && (
        <>
          {/* Action Row for Subjects */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div style={{ fontSize: "0.9rem", color: "var(--ink-soft)", fontWeight: 500 }}>
              Showing {filteredSubjects.length} of {subjects.length} subjects
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="btn secondary"
                type="button"
                onClick={() => {
                  setShowBulkUpload(!showBulkUpload);
                  if (showAddSubjectForm) setShowAddSubjectForm(false);
                }}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  upload_file
                </span>
                {showBulkUpload ? "Close Roster Upload" : "Bulk Import Roster"}
              </button>

              <button
                className="btn"
                type="button"
                onClick={() => {
                  setShowAddSubjectForm(!showAddSubjectForm);
                  if (showBulkUpload) setShowBulkUpload(false);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: "var(--primary)",
                  color: "#fff",
                  fontWeight: 600,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  {showAddSubjectForm ? "close" : "add"}
                </span>
                {showAddSubjectForm ? "Hide Form" : "Add New Subject"}
              </button>
            </div>
          </div>

          {/* Bulk Roster CSV / XLSX Upload Card */}
          {showBulkUpload && (
            <div className="card" style={{ border: "2px solid var(--primary)", animation: "fadeIn 0.2s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>upload_file</span>
                  Bulk Import Subjects & Faculty Allocations
                </h3>
                <button
                  className="btn secondary"
                  type="button"
                  onClick={downloadRosterTemplate}
                  style={{ fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>download</span>
                  Download CSV Template
                </button>
              </div>

              <p className="hint-text" style={{ marginBottom: 14, fontSize: "0.85rem", color: "var(--ink-soft)" }}>
                Upload a CSV or Excel (.xlsx) file to create multiple subjects with academic year and assign faculty to sections in one click.
                <br />
                <strong>Required columns:</strong> <code>subject_name</code>, <code>subject_code</code>.
                <br />
                <strong>Optional columns:</strong> <code>year</code> (1..4), <code>faculty_username</code>, <code>section_name</code> (e.g. 2nd CSM-A).
              </p>

              {uploadError && <ErrorBanner message={uploadError} onDismiss={() => setUploadError("")} />}

              <form onSubmit={handleSubjectUpload} className="form-grid">
                <div style={{ gridColumn: "span 2" }}>
                  <label htmlFor="subject-roster-file" style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                    Select CSV or Excel File
                  </label>
                  <input
                    id="subject-roster-file"
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    required
                    disabled={uploadBusy}
                    style={{ width: "100%", marginTop: 4 }}
                  />
                </div>
                <div style={{ alignSelf: "end" }}>
                  <button className="btn" type="submit" disabled={uploadBusy || !uploadFile}>
                    {uploadBusy ? <Spinner inline label="Importing Roster…" /> : "Upload & Process Roster"}
                  </button>
                </div>
              </form>

              {uploadResult && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 12,
                    borderRadius: 6,
                    background:
                      uploadResult.errors.length > 0 && uploadResult.subjects_created === 0 && uploadResult.allocations_created === 0
                        ? "var(--absent-bg, #fee2e2)"
                        : "var(--present-bg, #dcfce7)",
                    color:
                      uploadResult.errors.length > 0 && uploadResult.subjects_created === 0 && uploadResult.allocations_created === 0
                        ? "var(--absent, #b91c1c)"
                        : "var(--present, #15803d)",
                    fontSize: "0.88rem",
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    ✓ Processing complete: Created {uploadResult.subjects_created} subject(s), updated {uploadResult.subjects_updated} subject(s), created {uploadResult.allocations_created} faculty allocation(s).
                  </div>
                  {uploadResult.errors.length > 0 && (
                    <div style={{ marginTop: 8, color: "var(--absent, #b91c1c)" }}>
                      <strong>Errors / Warnings ({uploadResult.errors.length}):</strong>
                      <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
                        {uploadResult.errors.map((err, i) => (
                          <li key={i} style={{ fontSize: "0.82rem" }}>
                            {err}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Add New Subject Form Card */}
          {showAddSubjectForm && (
            <div className="card" style={{ border: "2px solid var(--primary)", animation: "fadeIn 0.2s ease" }}>
              <h3 style={{ margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
                <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>add_circle</span>
                Add New Subject with Academic Year
              </h3>
              {createSubjectError && <ErrorBanner message={createSubjectError} onDismiss={() => setCreateSubjectError("")} />}
              {createSubjectSuccess && (
                <div
                  style={{
                    background: "var(--present-bg, #dcfce7)",
                    color: "var(--present, #15803d)",
                    padding: "10px 14px",
                    borderRadius: 6,
                    marginBottom: 16,
                    fontSize: "0.88rem",
                    fontWeight: 500,
                  }}
                >
                  ✓ {createSubjectSuccess}
                </div>
              )}

              <form onSubmit={handleCreateSubject}>
                <div className="form-grid">
                  <div>
                    <label htmlFor="create-sub-name" style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                      Subject Name *
                    </label>
                    <input
                      id="create-sub-name"
                      placeholder="e.g. Operating Systems"
                      value={createSubjectForm.name}
                      onChange={(e) => setCreateSubjectForm({ ...createSubjectForm, name: e.target.value })}
                      required
                      disabled={createSubjectBusy}
                    />
                  </div>

                  <div>
                    <label htmlFor="create-sub-code" style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                      Subject Code *
                    </label>
                    <input
                      id="create-sub-code"
                      placeholder="e.g. CS302"
                      value={createSubjectForm.code}
                      onChange={(e) => setCreateSubjectForm({ ...createSubjectForm, code: e.target.value })}
                      required
                      disabled={createSubjectBusy}
                    />
                  </div>

                  <div>
                    <label htmlFor="create-sub-year" style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                      Academic Year * (Helps in Timetable Allocation)
                    </label>
                    <select
                      id="create-sub-year"
                      value={createSubjectForm.year}
                      onChange={(e) => setCreateSubjectForm({ ...createSubjectForm, year: e.target.value })}
                      required
                      disabled={createSubjectBusy}
                    >
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="create-sub-branch" style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                      Branch / Department *
                    </label>
                    <select
                      id="create-sub-branch"
                      value={createSubjectForm.branch}
                      onChange={(e) => setCreateSubjectForm({ ...createSubjectForm, branch: e.target.value })}
                      required
                      disabled={createSubjectBusy}
                    >
                      <option value="CSM">CSM (AI &amp; ML)</option>
                      <option value="CSD">CSD (Data Science)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button className="btn" type="submit" disabled={createSubjectBusy}>
                    {createSubjectBusy ? <Spinner inline label="Adding Subject…" /> : "Create Subject"}
                  </button>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => {
                      setShowAddSubjectForm(false);
                      setCreateSubjectError("");
                      setCreateSubjectSuccess("");
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
              style={{ border: "2px solid var(--primary)", background: "var(--paper-raised)" }}
              role="dialog"
              aria-labelledby="edit-sub-title"
            >
              <h3 id="edit-sub-title" style={{ margin: "0 0 16px" }}>
                Edit Subject: {editSubjectItem.name}
              </h3>
              {editSubjectError && <ErrorBanner message={editSubjectError} onDismiss={() => setEditSubjectError("")} />}
              <form onSubmit={handleSaveEdit}>
                <div className="form-grid">
                  <div>
                    <label htmlFor="edit-sub-name" style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                      Subject Name
                    </label>
                    <input
                      id="edit-sub-name"
                      ref={editNameRef}
                      value={editSubjectForm.name}
                      onChange={(e) => setEditSubjectForm({ ...editSubjectForm, name: e.target.value })}
                      required
                      disabled={editSubjectBusy}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-sub-code" style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                      Subject Code
                    </label>
                    <input
                      id="edit-sub-code"
                      value={editSubjectForm.code}
                      onChange={(e) => setEditSubjectForm({ ...editSubjectForm, code: e.target.value })}
                      required
                      disabled={editSubjectBusy}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-sub-year" style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                      Academic Year
                    </label>
                    <select
                      id="edit-sub-year"
                      value={editSubjectForm.year}
                      onChange={(e) => setEditSubjectForm({ ...editSubjectForm, year: e.target.value })}
                      disabled={editSubjectBusy}
                    >
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="edit-sub-branch" style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                      Branch / Department
                    </label>
                    <select
                      id="edit-sub-branch"
                      value={editSubjectForm.branch}
                      onChange={(e) => setEditSubjectForm({ ...editSubjectForm, branch: e.target.value })}
                      disabled={editSubjectBusy}
                    >
                      <option value="CSM">CSM (AI &amp; ML)</option>
                      <option value="CSD">CSD (Data Science)</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button className="btn" type="submit" disabled={editSubjectBusy}>
                    {editSubjectBusy ? <Spinner inline label="Saving…" /> : "Save Changes"}
                  </button>
                  <button className="btn secondary" type="button" onClick={() => setEditSubjectItem(null)} disabled={editSubjectBusy}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Subjects Filter Bar: Year Pills + Search Input */}
          <div
            className="card"
            style={{
              padding: "14px 18px",
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "#ffffff",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {/* Year Filter Pills */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--ink)", marginRight: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>filter_list</span>
                Year:
              </span>
              <button
                type="button"
                className={`btn ${subjectYearFilter === "all" ? "" : "secondary"}`}
                style={{
                  borderRadius: 16,
                  padding: "4px 12px",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  backgroundColor: subjectYearFilter === "all" ? "var(--primary)" : "#f1f5f9",
                  color: subjectYearFilter === "all" ? "#ffffff" : "var(--ink)",
                  border: "1px solid var(--border)",
                }}
                onClick={() => setSubjectYearFilter("all")}
              >
                All Years ({subjects.length})
              </button>

              {YEAR_OPTIONS.map((yo) => {
                const count = subjects.filter((s) => String(s.year) === yo.value).length;
                const isSelected = subjectYearFilter === yo.value;
                return (
                  <button
                    key={yo.value}
                    type="button"
                    style={{
                      borderRadius: 16,
                      padding: "4px 12px",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: isSelected ? `2px solid ${yo.color}` : "1px solid var(--border)",
                      backgroundColor: isSelected ? yo.color : yo.bg,
                      color: isSelected ? "#ffffff" : yo.color,
                      transition: "all 0.15s ease",
                    }}
                    onClick={() => setSubjectYearFilter(yo.value)}
                  >
                    {yo.label} ({count})
                  </button>
                );
              })}

              {subjects.some((s) => !s.year) && (
                <button
                  type="button"
                  style={{
                    borderRadius: 16,
                    padding: "4px 12px",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: subjectYearFilter === "unassigned" ? "2px solid #475569" : "1px solid var(--border)",
                    backgroundColor: subjectYearFilter === "unassigned" ? "#475569" : "#f1f5f9",
                    color: subjectYearFilter === "unassigned" ? "#ffffff" : "#475569",
                  }}
                  onClick={() => setSubjectYearFilter("unassigned")}
                >
                  Unassigned ({subjects.filter((s) => !s.year).length})
                </button>
              )}
            </div>

            {/* Branch Filter Pills */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--ink)", marginRight: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>account_tree</span>
                Branch:
              </span>
              {[
                { value: "all", label: "All Branches" },
                { value: "CSM", label: "CSM" },
                { value: "CSD", label: "CSD" },
              ].map((b) => {
                const isSelected = subjectBranchFilter === b.value;
                return (
                  <button
                    key={b.value}
                    type="button"
                    style={{
                      borderRadius: 16,
                      padding: "4px 12px",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border)",
                      backgroundColor: isSelected ? "var(--primary)" : "#f1f5f9",
                      color: isSelected ? "#ffffff" : "var(--ink)",
                      transition: "all 0.15s ease",
                    }}
                    onClick={() => setSubjectBranchFilter(b.value)}
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>

            {/* Search Box */}
            <div style={{ minWidth: 220, flex: "0 1 280px" }}>
              <input
                type="search"
                placeholder="Search subject name or code…"
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 12px",
                  fontSize: "0.85rem",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                }}
              />
            </div>
          </div>

          {/* Subjects Table */}
          <div
            className="card"
            style={{
              padding: 0,
              overflow: "hidden",
              border: "1px solid var(--border-subtle)",
              backgroundColor: "#ffffff",
            }}
          >
            {filteredSubjects.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 16px", color: "var(--ink-soft)" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "40px", color: "var(--outline)" }}>
                  menu_book
                </span>
                <div style={{ fontWeight: 600, marginTop: 8, fontSize: "1rem" }}>No subjects found</div>
                <p style={{ fontSize: "0.85rem", marginTop: 4 }}>
                  {subjectSearch || subjectYearFilter !== "all" || subjectBranchFilter !== "all"
                    ? "Try clearing your search, year, or branch filter."
                    : "Get started by adding your first subject using the button above."}
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table" aria-label="Subjects Catalog Table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "var(--surface-container-low)", borderBottom: "2px solid var(--border-subtle)", textAlign: "left" }}>
                      <th scope="col" style={{ padding: "12px 16px", width: "24%" }}>Subject Name</th>
                      <th scope="col" style={{ padding: "12px 16px", width: "12%" }}>Subject Code</th>
                      <th scope="col" style={{ padding: "12px 16px", width: "12%" }}>Branch</th>
                      <th scope="col" style={{ padding: "12px 16px", width: "14%" }}>Academic Year</th>
                      <th scope="col" style={{ padding: "12px 16px", width: "22%" }}>Allocated Faculty</th>
                      <th scope="col" style={{ padding: "12px 16px", width: "16%", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubjects.map((s) => {
                      const subjectAllocs = allocationsBySubject[s.id] || [];
                      const yearOpt = YEAR_OPTIONS.find((y) => Number(y.value) === s.year);

                      return (
                        <tr key={s.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                          {/* Subject Name */}
                          <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--ink)" }}>
                            {s.name}
                          </td>

                          {/* Code */}
                          <td style={{ padding: "12px 16px" }}>
                            <span
                              className="mono"
                              style={{
                                padding: "3px 8px",
                                borderRadius: 4,
                                backgroundColor: "var(--surface-container-high)",
                                border: "1px solid var(--border)",
                                fontWeight: 700,
                                fontSize: "0.82rem",
                                color: "var(--ink)",
                              }}
                            >
                              {s.code}
                            </span>
                          </td>

                          {/* Branch Badge */}
                          <td style={{ padding: "12px 16px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "3px 9px",
                                borderRadius: 9999,
                                fontSize: "0.76rem",
                                fontWeight: 700,
                                backgroundColor: s.branch === "CSD" ? "#ccfbf1" : "#ede9fe",
                                color: s.branch === "CSD" ? "#0f766e" : "#5b21b6",
                                border: s.branch === "CSD" ? "1px solid #99f6e4" : "1px solid #ddd6fe",
                              }}
                            >
                              {s.branch || "CSM"}
                            </span>
                          </td>

                          {/* Year Badge */}
                          <td style={{ padding: "12px 16px" }}>
                            {yearOpt ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  padding: "3px 9px",
                                  borderRadius: 9999,
                                  fontSize: "0.78rem",
                                  fontWeight: 700,
                                  backgroundColor: yearOpt.bg,
                                  color: yearOpt.color,
                                  border: `1px solid ${yearOpt.color}30`,
                                }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                                  calendar_month
                                </span>
                                {yearOpt.label}
                              </span>
                            ) : (
                              <span style={{ fontSize: "0.8rem", color: "var(--ink-muted)", fontStyle: "italic" }}>
                                Unassigned
                              </span>
                            )}
                          </td>

                          {/* Allocations Summary */}
                          <td style={{ padding: "12px 16px" }}>
                            {subjectAllocs.length === 0 ? (
                              <span style={{ fontSize: "0.82rem", color: "var(--ink-muted)", fontStyle: "italic" }}>
                                Not allocated yet
                              </span>
                            ) : (
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                                <span
                                  style={{
                                    fontSize: "0.78rem",
                                    padding: "2px 8px",
                                    borderRadius: 12,
                                    backgroundColor: "var(--primary-light)",
                                    color: "var(--primary)",
                                    fontWeight: 700,
                                  }}
                                >
                                  {subjectAllocs.length} section{subjectAllocs.length > 1 ? "s" : ""}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAllocSearch(s.name);
                                    setActiveTab("allocations");
                                  }}
                                  style={{
                                    border: "none",
                                    background: "transparent",
                                    color: "var(--primary)",
                                    fontSize: "0.78rem",
                                    textDecoration: "underline",
                                    cursor: "pointer",
                                    padding: 0,
                                  }}
                                >
                                  View allocations →
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                            <button
                              className="btn"
                              style={{
                                fontSize: "0.75rem",
                                padding: "4px 8px",
                                marginRight: 6,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                              }}
                              onClick={() => openAllocationModal(s.id)}
                              title={`Allocate ${s.name} to faculty`}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                                person_add
                              </span>
                              Allocate
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
        </>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: FACULTY ALLOCATIONS                                               */}
      {/* ========================================================================= */}
      {activeTab === "allocations" && (
        <>
          {/* Action Row for Allocations */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div style={{ fontSize: "0.9rem", color: "var(--ink-soft)", fontWeight: 500 }}>
              Showing {filteredAllocations.length} of {allocations.length} faculty allocations
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn secondary"
                type="button"
                onClick={loadData}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>refresh</span>
                Refresh
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => openAllocationModal()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: "var(--primary)",
                  color: "#fff",
                  fontWeight: 600,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
                Assign New Allocation
              </button>
            </div>
          </div>

          {/* Allocation Filters Bar */}
          <div
            className="card"
            style={{
              padding: "16px 18px",
              backgroundColor: "#ffffff",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: 12,
                alignItems: "end",
              }}
            >
              {/* Year Filter */}
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4, color: "var(--ink)" }}>
                  Subject Year
                </label>
                <select
                  value={allocYearFilter}
                  onChange={(e) => setAllocYearFilter(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)" }}
                >
                  <option value="all">All Academic Years</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                  <option value="unassigned">Unassigned Year</option>
                </select>
              </div>

              {/* Faculty Filter */}
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4, color: "var(--ink)" }}>
                  Faculty Member
                </label>
                <select
                  value={allocFacultyFilter}
                  onChange={(e) => setAllocFacultyFilter(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)" }}
                >
                  <option value="all">All Faculty</option>
                  {faculty.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.full_name} (@{f.username})
                    </option>
                  ))}
                </select>
              </div>

              {/* Section Filter */}
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4, color: "var(--ink)" }}>
                  Class Section
                </label>
                <select
                  value={allocSectionFilter}
                  onChange={(e) => setAllocSectionFilter(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)" }}
                >
                  <option value="all">All Sections</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.display_name} ({sec.academic_year})
                    </option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4, color: "var(--ink)" }}>
                  Search Allocation
                </label>
                <input
                  type="search"
                  placeholder="Search faculty, subject, or section…"
                  value={allocSearch}
                  onChange={(e) => setAllocSearch(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)" }}
                />
              </div>
            </div>
          </div>

          {/* Allocations Table */}
          <div
            className="card"
            style={{
              padding: 0,
              overflow: "hidden",
              border: "1px solid var(--border-subtle)",
              backgroundColor: "#ffffff",
            }}
          >
            {filteredAllocations.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 16px", color: "var(--ink-soft)" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "40px", color: "var(--outline)" }}>
                  assignment_ind
                </span>
                <div style={{ fontWeight: 600, marginTop: 8, fontSize: "1rem" }}>No allocations found</div>
                <p style={{ fontSize: "0.85rem", marginTop: 4 }}>
                  {allocSearch || allocYearFilter !== "all" || allocFacultyFilter !== "all" || allocSectionFilter !== "all"
                    ? "Try adjusting your filter criteria."
                    : "No faculty members have been allocated to classes yet. Click 'Assign New Allocation' above."}
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table" aria-label="Faculty Allocations Table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "var(--surface-container-low)", borderBottom: "2px solid var(--border-subtle)", textAlign: "left" }}>
                      <th scope="col" style={{ padding: "12px 16px" }}>Faculty Member</th>
                      <th scope="col" style={{ padding: "12px 16px" }}>Subject</th>
                      <th scope="col" style={{ padding: "12px 16px" }}>Subject Year</th>
                      <th scope="col" style={{ padding: "12px 16px" }}>Target Section</th>
                      <th scope="col" style={{ padding: "12px 16px" }}>Status</th>
                      <th scope="col" style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAllocations.map((a) => {
                      const yearOpt = YEAR_OPTIONS.find((y) => Number(y.value) === a.subject_year);
                      return (
                        <tr key={a.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                          {/* Faculty Member */}
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ fontWeight: 600, color: "var(--ink)" }}>{a.faculty_name}</div>
                            <div style={{ fontSize: "0.78rem", color: "var(--ink-muted)" }}>@{a.faculty_username}</div>
                          </td>

                          {/* Subject */}
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ fontWeight: 600, color: "var(--ink)" }}>{a.subject_name}</div>
                            <div style={{ fontSize: "0.78rem" }}>
                              <span className="mono" style={{ color: "var(--primary)", fontWeight: 700 }}>
                                {a.subject_code}
                              </span>
                            </div>
                          </td>

                          {/* Subject Year */}
                          <td style={{ padding: "12px 16px" }}>
                            {yearOpt ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  padding: "2px 8px",
                                  borderRadius: 9999,
                                  fontSize: "0.76rem",
                                  fontWeight: 700,
                                  backgroundColor: yearOpt.bg,
                                  color: yearOpt.color,
                                }}
                              >
                                {yearOpt.label}
                              </span>
                            ) : (
                              <span style={{ fontSize: "0.8rem", color: "var(--ink-muted)" }}>—</span>
                            )}
                          </td>

                          {/* Target Section */}
                          <td style={{ padding: "12px 16px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "3px 8px",
                                borderRadius: 6,
                                backgroundColor: "var(--surface-container-high)",
                                fontWeight: 600,
                                fontSize: "0.82rem",
                                color: "var(--ink)",
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "var(--secondary)" }}>
                                class
                              </span>
                              {a.section_display_name}
                            </span>
                          </td>

                          {/* Status */}
                          <td style={{ padding: "12px 16px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "2px 8px",
                                borderRadius: 9999,
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                backgroundColor: a.is_active ? "#dcfce7" : "#f1f5f9",
                                color: a.is_active ? "#15803d" : "#475569",
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: "12px" }}>
                                {a.is_active ? "check" : "block"}
                              </span>
                              {a.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ padding: "12px 16px", textAlign: "right" }}>
                            <button
                              className="btn danger"
                              style={{
                                fontSize: "0.75rem",
                                padding: "4px 8px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                              onClick={() => handleRemoveAllocation(a.id)}
                              title="Remove this allocation"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                                delete
                              </span>
                              Remove
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
        </>
      )}

      {/* ========================================================================= */}
      {/* ALLOCATE SUBJECT TO FACULTY MODAL DIALOG                                  */}
      {/* ========================================================================= */}
      {showAllocModal && (
        <div
          className="card"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          role="dialog"
          aria-labelledby="alloc-dialog-title"
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 12,
              padding: 24,
              maxWidth: 580,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 id="alloc-dialog-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>assignment_ind</span>
                Assign Subject to Faculty
              </h3>
              <button
                type="button"
                onClick={() => setShowAllocModal(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  color: "var(--ink-muted)",
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--ink-soft)", margin: "0 0 16px" }}>
              Allocate a subject to a faculty member for specific sections. Sections are filtered according to the subject's academic year.
            </p>

            {allocError && <ErrorBanner message={allocError} onDismiss={() => setAllocError("")} />}
            {allocSuccess && (
              <div
                style={{
                  background: "var(--present-bg, #dcfce7)",
                  color: "var(--present, #15803d)",
                  padding: "10px 14px",
                  borderRadius: 6,
                  marginBottom: 16,
                  fontSize: "0.88rem",
                  fontWeight: 500,
                }}
              >
                ✓ {allocSuccess}
              </div>
            )}

            <form onSubmit={handleSaveAllocation}>
              {/* Subject Selection */}
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="alloc-sub-select" style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                  Select Subject *
                </label>
                <select
                  id="alloc-sub-select"
                  value={allocModalSubjectId}
                  onChange={(e) => {
                    setAllocModalSubjectId(e.target.value);
                    setAllocSectionIds([]);
                  }}
                  required
                  disabled={allocBusy}
                  style={{ width: "100%", marginTop: 4, padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)" }}
                >
                  <option value="">Choose subject…</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.code}) — {sub.year ? `${sub.year}${sub.year === 1 ? "st" : sub.year === 2 ? "nd" : sub.year === 3 ? "rd" : "th"} Year` : "Unassigned"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Faculty Selection */}
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="alloc-fac-select" style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                  Select Faculty Member *
                </label>
                <select
                  id="alloc-fac-select"
                  value={allocFacultyId}
                  onChange={(e) => setAllocFacultyId(e.target.value)}
                  required
                  disabled={allocBusy || faculty.length === 0}
                  style={{ width: "100%", marginTop: 4, padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)" }}
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

              {/* Sections Selection */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                    Target Sections *{" "}
                    {selectedAllocSubject?.year && (
                      <span style={{ color: "var(--primary)", fontWeight: 700 }}>
                        (Filtered for Year {selectedAllocSubject.year})
                      </span>
                    )}
                  </label>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {selectedAllocSubject?.year && (
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
                        allocShowAllSections || !selectedAllocSubject?.year ? true : sec.year === selectedAllocSubject.year
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

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                    gap: 8,
                    maxHeight: 200,
                    overflowY: "auto",
                    padding: 10,
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    background: "var(--surface)",
                  }}
                >
                  {(() => {
                    const candidateSections = sections.filter((sec) =>
                      allocShowAllSections || !selectedAllocSubject?.year ? true : sec.year === selectedAllocSubject.year
                    );

                    if (candidateSections.length === 0) {
                      return (
                        <span style={{ color: "var(--ink-soft)", fontSize: "0.85rem", gridColumn: "1 / -1", padding: 8 }}>
                          No sections found for Year {selectedAllocSubject?.year || "this subject"}. Check "Show all years" above.
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
                            background: isSelected ? "var(--primary-light)" : "#ffffff",
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
                            <div style={{ fontSize: "0.72rem", color: "var(--ink-soft)" }}>
                              Year {sec.year} · {sec.academic_year}
                            </div>
                          </div>
                        </label>
                      );
                    });
                  })()}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() => setShowAllocModal(false)}
                  disabled={allocBusy}
                >
                  Cancel
                </button>
                <button
                  className="btn"
                  type="submit"
                  disabled={allocBusy || allocSectionIds.length === 0 || !allocModalSubjectId || !allocFacultyId}
                  style={{ backgroundColor: "var(--primary)", color: "#fff", fontWeight: 600 }}
                >
                  {allocBusy ? <Spinner inline label="Allocating…" /> : `Allocate to ${allocSectionIds.length} Section(s)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
