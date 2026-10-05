import React, { useEffect, useState } from "react";
import { api } from "../../api/client";
import { Faculty, Section, Subject, TimetableEntry, Student, FacultyAllocation } from "../../types";
import Spinner from "../../components/Spinner";
import ErrorBanner from "../../components/ErrorBanner";
import PeriodScheduleModal from "../../components/PeriodScheduleModal";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7];

const YEAR_OPTIONS = [
  { value: "1", label: "1st Year", color: "#0369a1", bg: "#e0f2fe" },
  { value: "2", label: "2nd Year", color: "#3730a3", bg: "#e0e7ff" },
  { value: "3", label: "3rd Year", color: "#5b21b6", bg: "#ede9fe" },
  { value: "4", label: "4th Year", color: "#86198f", bg: "#fae8ff" },
];

export default function TimetableManage() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [allocations, setAllocations] = useState<FacultyAllocation[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Modal / Assign state
  const [modalSlot, setModalSlot] = useState<{ dayIndex: number; period: number; existingEntry?: TimetableEntry } | null>(null);
  const [modalForm, setModalForm] = useState({ faculty_id: "", subject_id: "", session_type: "lecture" });
  const [modalError, setModalError] = useState("");
  const [savingBusy, setSavingBusy] = useState(false);
  const [deletingBusy, setDeletingBusy] = useState(false);

  // Bulk import state
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showPeriodSchedule, setShowPeriodSchedule] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ inserted: number; updated: number; errors: string[] } | null>(null);
  const [uploadError, setUploadError] = useState("");

  async function loadData() {
    setLoading(true);
    setLoadError("");
    try {
      const [f, s, sub, t, a] = await Promise.all([
        api.get<Faculty[]>("/admin/faculty"),
        api.get<Section[]>("/admin/sections"),
        api.get<Subject[]>("/admin/subjects"),
        api.get<TimetableEntry[]>("/admin/timetable"),
        api.get<FacultyAllocation[]>("/admin/allocations"),
      ]);
      setFaculty(f.data);
      setSections(s.data);
      setSubjects(sub.data);
      setEntries(t.data);
      setAllocations(a.data);

      if (s.data.length > 0 && selectedSectionId === null) {
        setSelectedSectionId(s.data[0].id);
      }
    } catch (err: any) {
      setLoadError(err?.response?.data?.detail || err?.message || "Failed to load timetable allocation data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const currentSection = sections.find((s) => s.id === selectedSectionId) || sections[0];

  // All subjects are available across sections
  const sectionSubjects = subjects;

  // Filter timetable entries for current section
  const sectionEntries = entries.filter((e) => e.section_id === selectedSectionId);

  // Find the faculty allocated to teach a given subject for the current section (or globally)
  function getSubjectAllocatedFacultyId(subjectId: number | string, sectionId?: number | null): string {
    if (!subjectId) return "";
    const subIdNum = Number(subjectId);
    const secId = sectionId || selectedSectionId;

    // 1. Exact match for this section and subject
    if (secId) {
      const secAlloc = allocations.find(
        (a) => a.section_id === secId && a.subject_id === subIdNum && a.is_active
      );
      if (secAlloc) return String(secAlloc.faculty_id);
    }

    // 2. Fallback: match any allocation for this subject
    const anyAlloc = allocations.find(
      (a) => a.subject_id === subIdNum && a.is_active
    );
    if (anyAlloc) return String(anyAlloc.faculty_id);

    return "";
  }

  // Check if a faculty is assigned elsewhere during the same day and period
  function checkFacultyConflict(facultyId: number, dayIndex: number, period: number, excludeSectionId: number) {
    return entries.some(
      (e) =>
        e.faculty_id === facultyId &&
        e.day_of_week === dayIndex &&
        e.period_number === period &&
        e.section_id !== excludeSectionId
    );
  }

  function getSlotEntry(dayIndex: number, period: number) {
    return sectionEntries.find((e) => e.day_of_week === dayIndex && e.period_number === period);
  }

  function handleOpenAssignModal(dayIndex: number, period: number, existing?: TimetableEntry) {
    setModalSlot({ dayIndex, period, existingEntry: existing });
    if (existing) {
      setModalForm({
        faculty_id: String(existing.faculty_id),
        subject_id: String(existing.subject_id),
        session_type: existing.session_type || "lecture",
      });
    } else {
      setModalForm({
        faculty_id: "",
        subject_id: "",
        session_type: "lecture",
      });
    }
    setModalError("");
  }

  async function handleSaveSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!modalSlot || !selectedSectionId) return;
    if (!modalForm.faculty_id || !modalForm.subject_id) {
      setModalError("Please select both a faculty member and a subject.");
      return;
    }

    setSavingBusy(true);
    setModalError("");

    try {
      if (modalSlot.existingEntry) {
        await api.delete(`/admin/timetable/${modalSlot.existingEntry.id}`);
      }

      // If assigning a combined lab, remove any existing slot in the next period for this section
      if (modalForm.session_type === "lab" && modalSlot.period < PERIODS[PERIODS.length - 1]) {
        const nextSlot = getSlotEntry(modalSlot.dayIndex, modalSlot.period + 1);
        if (nextSlot && nextSlot.id !== modalSlot.existingEntry?.id) {
          await api.delete(`/admin/timetable/${nextSlot.id}`);
        }
      }

      await api.post("/admin/timetable", {
        section_id: selectedSectionId,
        faculty_id: Number(modalForm.faculty_id),
        subject_id: Number(modalForm.subject_id),
        day_of_week: modalSlot.dayIndex,
        period_number: modalSlot.period,
        session_type: modalForm.session_type,
      });

      await loadData();
      setModalSlot(null);
    } catch (err: any) {
      setModalError(err?.response?.data?.detail || err?.message || "Could not assign slot");
    } finally {
      setSavingBusy(false);
    }
  }

  async function handleDeleteSlot() {
    if (!modalSlot?.existingEntry) return;
    if (!confirm("Are you sure you want to remove this slot allocation?")) return;

    setDeletingBusy(true);
    try {
      await api.delete(`/admin/timetable/${modalSlot.existingEntry.id}`);
      await loadData();
      setModalSlot(null);
    } catch (err: any) {
      setModalError(err?.response?.data?.detail || err?.message || "Could not delete slot");
    } finally {
      setDeletingBusy(false);
    }
  }

  async function handleTimetableUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile) return;
    setUploadBusy(true);
    setUploadError("");
    setUploadResult(null);
    const fd = new FormData();
    fd.append("file", uploadFile);
    try {
      const res = await api.post("/admin/timetable/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadResult(res.data);
      await loadData();
    } catch (err: any) {
      setUploadError(err?.response?.data?.detail || err?.message || "Timetable import failed.");
    } finally {
      setUploadBusy(false);
    }
  }

  function downloadTimetableTemplate() {
    const content = "faculty_username,section_display_name,subject_code,day_of_week,period_number,session_type\nfaculty1,2nd CSM-A,CS201,Monday,1,lecture\nfaculty2,2nd CSM-A,CS202,Monday,2,lab\n";
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "timetable_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (loading) return <Spinner label="Loading weekly timetable data…" />;
  if (loadError) return <ErrorBanner message={loadError} onRetry={loadData} />;

  return (
    <div>
      {/* Top Description & Action Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 className="page-heading" style={{ fontSize: "1.4rem", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: "28px", color: "var(--primary)" }}>calendar_month</span>
            Sections & Timetable Allocation
          </h2>
          <p className="page-subheading" style={{ margin: "4px 0 0" }}>Allocation set here drives every faculty's daily scheduled classes.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            className="btn secondary"
            onClick={() => setShowPeriodSchedule(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.82rem" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "var(--primary)" }}>
              schedule
            </span>
            Bell Timetable Schedule
          </button>
          <button
            className="btn secondary"
            onClick={() => setShowBulkUpload(!showBulkUpload)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.82rem" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              upload_file
            </span>
            {showBulkUpload ? "Close Import Panel" : "Bulk Import Timetable"}
          </button>
        </div>
      </div>

      {/* Optional Bulk Import Card */}
      {showBulkUpload && (
        <div className="card" style={{ border: "2px solid var(--primary)", marginBottom: 20, animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>upload_file</span>
              Bulk Timetable CSV/XLSX Upload
            </h3>
            <button
              className="btn secondary"
              type="button"
              onClick={downloadTimetableTemplate}
              style={{ fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>download</span>
              Download CSV Template
            </button>
          </div>
          <p className="hint-text" style={{ marginBottom: 14, fontSize: "0.85rem", color: "var(--ink-soft)" }}>
            Upload a CSV or Excel (.xlsx) file with timetable slot mappings.
            <br />
            <strong>Required columns:</strong> <code>faculty_username</code>, <code>section_display_name</code>, <code>subject_code</code>, <code>day_of_week</code> (Monday-Sunday), <code>period_number</code> (1-7), <code>session_type</code> (lecture or lab).
          </p>
          {uploadError && <ErrorBanner message={uploadError} onDismiss={() => setUploadError("")} />}
          <form onSubmit={handleTimetableUpload} className="form-grid">
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>Timetable File (.csv or .xlsx)</label>
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                required
                disabled={uploadBusy}
                style={{ width: "100%", marginTop: 4 }}
              />
            </div>
            <div style={{ alignSelf: "end" }}>
              <button
                className="btn"
                disabled={uploadBusy || !uploadFile}
                type="submit"
                style={{ backgroundColor: "var(--primary)", color: "#fff", fontWeight: 600 }}
              >
                {uploadBusy ? <Spinner inline label="Importing Timetable…" /> : "Import & Process Timetable"}
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
                  uploadResult.errors.length > 0 && uploadResult.inserted === 0 && uploadResult.updated === 0
                    ? "var(--absent-bg, #fee2e2)"
                    : "var(--present-bg, #dcfce7)",
                color:
                  uploadResult.errors.length > 0 && uploadResult.inserted === 0 && uploadResult.updated === 0
                    ? "var(--absent, #b91c1c)"
                    : "var(--present, #15803d)",
                fontSize: "0.88rem",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                ✓ Timetable processed: Inserted {uploadResult.inserted}, updated {uploadResult.updated} slots.
              </div>
              {uploadResult.errors.length > 0 && (
                <div style={{ marginTop: 8, color: "var(--absent, #b91c1c)" }}>
                  <strong>Errors / Warnings ({uploadResult.errors.length}):</strong>
                  <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
                    {uploadResult.errors.map((e, i) => (
                      <li key={i} style={{ fontSize: "0.82rem" }}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Year Filter Pills for Section Selector */}
      <div
        className="card"
        style={{
          marginBottom: 14,
          padding: "10px 14px",
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#ffffff",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--ink)", marginRight: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>filter_list</span>
            Year:
          </span>
          <button
            type="button"
            className={`btn ${selectedYearFilter === "all" ? "" : "secondary"}`}
            style={{
              borderRadius: 16,
              padding: "4px 12px",
              fontSize: "0.78rem",
              fontWeight: 600,
              backgroundColor: selectedYearFilter === "all" ? "var(--primary)" : "#f1f5f9",
              color: selectedYearFilter === "all" ? "#ffffff" : "var(--ink)",
              border: "1px solid var(--border)",
            }}
            onClick={() => setSelectedYearFilter("all")}
          >
            All Years ({sections.length})
          </button>

          {YEAR_OPTIONS.map((yo) => {
            const count = sections.filter((s) => String(s.year) === yo.value).length;
            const isSelected = selectedYearFilter === yo.value;
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
                onClick={() => setSelectedYearFilter(yo.value)}
              >
                {yo.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Section Selector Pills */}
      <div className="section-pills-row">
        {sections
          .filter((s) => (selectedYearFilter === "all" ? true : String(s.year) === selectedYearFilter))
          .map((sec) => {
            const isSelected = sec.id === selectedSectionId;
            const secSlots = entries.filter((e) => e.section_id === sec.id);
            const hasLab = secSlots.some((e) => e.session_type === "lab");
            const yearOpt = YEAR_OPTIONS.find((y) => Number(y.value) === sec.year);

            return (
              <div
                key={sec.id}
                className={`section-pill-card ${isSelected ? "active" : ""}`}
                onClick={() => setSelectedSectionId(sec.id)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div className="sec-title">{sec.display_name}</div>
                  {yearOpt && (
                    <span
                      style={{
                        padding: "1px 6px",
                        borderRadius: 8,
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        backgroundColor: yearOpt.bg,
                        color: yearOpt.color,
                      }}
                    >
                      {yearOpt.label}
                    </span>
                  )}
                </div>
                <div className="sec-sub">
                  {hasLab ? "Theory + Lab" : "Theory"} · Academic Yr {sec.academic_year}
                </div>
              </div>
            );
          })}
      </div>

      {/* Main Timetable Grid Card */}
      {currentSection && (
        <div className="timetable-grid-card">
          {/* Header Bar above Grid */}
          <div className="timetable-header-bar">
            <div className="timetable-header-title">
              <span>WEEKLY TIMETABLE — {currentSection.display_name.toUpperCase()}</span>
            </div>
          </div>

          {/* Grid Table */}
          <div className="table-responsive">
            <table className="timetable-grid-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}></th>
                  {PERIODS.map((p) => (
                    <th key={p}>Period {p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((dayName, dayIdx) => {
                  const cells: React.ReactNode[] = [];
                  let skipNext = false;

                  for (let i = 0; i < PERIODS.length; i++) {
                    const period = PERIODS[i];
                    if (skipNext) {
                      skipNext = false;
                      continue;
                    }

                    const entry = getSlotEntry(dayIdx, period);
                    let isConflict = false;
                    let facultyObj: Faculty | undefined;
                    let subjectObj: Subject | undefined;

                    const isCombined =
                      entry?.session_type === "lab" && period < PERIODS[PERIODS.length - 1];

                    if (entry) {
                      facultyObj = faculty.find((f) => f.id === entry.faculty_id);
                      subjectObj = subjects.find((s) => s.id === entry.subject_id);
                      isConflict = checkFacultyConflict(entry.faculty_id, dayIdx, period, currentSection.id);
                      if (isCombined) {
                        isConflict =
                          isConflict ||
                          checkFacultyConflict(entry.faculty_id, dayIdx, period + 1, currentSection.id);
                      }
                    }

                    if (isCombined) {
                      skipNext = true;
                    }

                    cells.push(
                      <td
                        key={period}
                        colSpan={isCombined ? 2 : 1}
                        className="timetable-cell"
                      >
                        {entry ? (
                          <div
                            className={`cell-card ${isConflict ? "conflict" : ""}`}
                            onClick={() => handleOpenAssignModal(dayIdx, period, entry)}
                          >
                            <div className="sub-name">{subjectObj?.name || "Subject"}</div>
                            <div className="fac-name">{facultyObj?.full_name || "Faculty"}</div>
                            {isCombined ? (
                              <div className="badge-tag combined">🔗 Combined {period}-{period + 1}</div>
                            ) : entry.session_type === "lab" ? (
                              <div className="badge-tag combined">🔗 Lab (Period {period})</div>
                            ) : null}
                            {isConflict && (
                              <div className="badge-tag conflict-tag">⚠ Conflict</div>
                            )}
                          </div>
                        ) : (
                          <div
                            className="cell-card-empty"
                            onClick={() => handleOpenAssignModal(dayIdx, period)}
                          >
                            + Assign
                          </div>
                        )}
                      </td>
                    );
                  }

                  return (
                    <tr key={dayName}>
                      <td className="day-label">{SHORT_DAYS[dayIdx]}</td>
                      {cells}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Legend */}
          <div className="timetable-footer-legend">
            <div className="legend-item">
              <span className="badge-tag combined" style={{ fontSize: "0.75rem", padding: "2px 8px" }}>🔗 Combined</span>
              <span>= 2-hour lab period (spans 2 consecutive periods), single attendance session</span>
            </div>
            <div className="legend-item">
              <span className="badge-tag conflict-tag" style={{ fontSize: "0.75rem", padding: "2px 8px", background: "#FEE2E2", color: "#991B1B" }}>⚠ Conflict</span>
              <span>= Faculty member is allotted to another class in this period</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Assign / Edit Slot Modal */}
      {modalSlot && (
        <div className="modal-backdrop" onClick={() => setModalSlot(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                {modalSlot.existingEntry
                  ? `Edit Slot Allocation (${DAYS[modalSlot.dayIndex]}, Period ${modalSlot.period})`
                  : `Assign Slot — ${DAYS[modalSlot.dayIndex]}, Period ${modalSlot.period}`}
              </h3>
              <button
                className="btn ghost"
                style={{ padding: "4px 8px", fontSize: "1.2rem" }}
                onClick={() => setModalSlot(null)}
              >
                ✕
              </button>
            </div>

            {modalError && <ErrorBanner message={modalError} onDismiss={() => setModalError("")} />}

            <form onSubmit={handleSaveSlot}>
              <div style={{ marginBottom: 14 }}>
                <label>Subject</label>
                <select
                  value={modalForm.subject_id}
                  onChange={(e) => {
                    const newSubId = e.target.value;
                    const autoFacId = getSubjectAllocatedFacultyId(newSubId);
                    setModalForm((prev) => ({
                      ...prev,
                      subject_id: newSubId,
                      faculty_id: autoFacId || prev.faculty_id,
                    }));
                  }}
                  required
                >
                  <option value="">Select subject…</option>
                  {(() => {
                    const secYear = currentSection?.year;
                    const matchingYearSubs = subjects.filter((s) => secYear && s.year === secYear);
                    const otherSubs = subjects.filter((s) => !secYear || s.year !== secYear);

                    const renderSubOption = (sub: Subject) => {
                      const allocFacId = getSubjectAllocatedFacultyId(sub.id);
                      const allocFac = allocFacId ? faculty.find((f) => f.id === Number(allocFacId)) : null;
                      const yrLabel = sub.year ? `[Year ${sub.year}] ` : "";
                      return (
                        <option key={sub.id} value={sub.id}>
                          {yrLabel}{sub.name} ({sub.code}){allocFac ? ` — 👤 ${allocFac.full_name}` : ""}
                        </option>
                      );
                    };

                    if (matchingYearSubs.length > 0) {
                      return (
                        <>
                          <optgroup label={`Year ${secYear} Subjects (Matching ${currentSection?.display_name || "Section"})`}>
                            {matchingYearSubs.map(renderSubOption)}
                          </optgroup>
                          {otherSubs.length > 0 && (
                            <optgroup label="Other Year / General Subjects">
                              {otherSubs.map(renderSubOption)}
                            </optgroup>
                          )}
                        </>
                      );
                    }

                    return subjects.map(renderSubOption);
                  })()}
                </select>
                {modalForm.subject_id && (() => {
                  const allocFacId = getSubjectAllocatedFacultyId(modalForm.subject_id);
                  const allocFac = allocFacId ? faculty.find((f) => f.id === Number(allocFacId)) : null;
                  if (!allocFac) return null;
                  return (
                    <div style={{ marginTop: 6, fontSize: "0.82rem", color: "var(--primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>how_to_reg</span>
                      Allocated Faculty: <strong>{allocFac.full_name}</strong> (Auto-selected)
                    </div>
                  );
                })()}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label>Faculty Member</label>
                <select
                  value={modalForm.faculty_id}
                  onChange={(e) => setModalForm({ ...modalForm, faculty_id: e.target.value })}
                  required
                >
                  <option value="">Select faculty…</option>
                  {faculty.map((f) => {
                    const isAllocated = String(f.id) === getSubjectAllocatedFacultyId(modalForm.subject_id);
                    const hasConflict =
                      checkFacultyConflict(
                        f.id,
                        modalSlot.dayIndex,
                        modalSlot.period,
                        selectedSectionId || 0
                      ) ||
                      (modalForm.session_type === "lab" &&
                        modalSlot.period < PERIODS[PERIODS.length - 1] &&
                        checkFacultyConflict(
                          f.id,
                          modalSlot.dayIndex,
                          modalSlot.period + 1,
                          selectedSectionId || 0
                        ));
                    return (
                      <option key={f.id} value={f.id}>
                        {f.full_name} {isAllocated ? "⭐ (Allocated Faculty)" : ""} {hasConflict ? "⚠️ (Assigned elsewhere this period)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label>Session Type</label>
                <select
                  value={modalForm.session_type}
                  onChange={(e) => setModalForm({ ...modalForm, session_type: e.target.value })}
                >
                  <option value="lecture">Lecture (Single Period)</option>
                  <option
                    value="lab"
                    disabled={modalSlot.period >= PERIODS[PERIODS.length - 1]}
                  >
                    Lab (Combined Period: {modalSlot.period} &amp; {modalSlot.period + 1})
                  </option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                {modalSlot.existingEntry && (
                  <button
                    className="btn danger"
                    type="button"
                    onClick={handleDeleteSlot}
                    disabled={deletingBusy || savingBusy}
                    style={{ marginRight: "auto" }}
                  >
                    {deletingBusy ? <Spinner inline label="Removing…" /> : "Remove"}
                  </button>
                )}
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() => setModalSlot(null)}
                  disabled={savingBusy}
                >
                  Cancel
                </button>
                <button className="btn" type="submit" disabled={savingBusy}>
                  {savingBusy ? <Spinner inline label="Saving…" /> : "Save Slot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Period Schedule Modal */}
      <PeriodScheduleModal
        isOpen={showPeriodSchedule}
        onClose={() => setShowPeriodSchedule(false)}
      />
    </div>
  );
}
