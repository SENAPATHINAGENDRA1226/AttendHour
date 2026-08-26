import React, { useEffect, useState } from "react";
import { api } from "../../api/client";
import { Faculty, Section, Subject, TimetableEntry, Student } from "../../types";
import Spinner from "../../components/Spinner";
import ErrorBanner from "../../components/ErrorBanner";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7];

export default function TimetableManage() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
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
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ inserted: number; updated: number; errors: string[] } | null>(null);
  const [uploadError, setUploadError] = useState("");

  async function loadData() {
    setLoading(true);
    setLoadError("");
    try {
      const [f, s, sub, t] = await Promise.all([
        api.get<Faculty[]>("/admin/faculty"),
        api.get<Section[]>("/admin/sections"),
        api.get<Subject[]>("/admin/subjects"),
        api.get<TimetableEntry[]>("/admin/timetable"),
      ]);
      setFaculty(f.data);
      setSections(s.data);
      setSubjects(sub.data);
      setEntries(t.data);

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

  // Subjects relevant to current section's department
  const sectionSubjects = subjects.filter(
    (sub) => !currentSection || sub.department_id === currentSection.department_id || true
  );

  // Filter timetable entries for current section
  const sectionEntries = entries.filter((e) => e.section_id === selectedSectionId);

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
        faculty_id: faculty.length > 0 ? String(faculty[0].id) : "",
        subject_id: sectionSubjects.length > 0 ? String(sectionSubjects[0].id) : "",
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 className="page-heading" style={{ fontSize: "1.4rem" }}>Sections & Timetable Allocation</h2>
          <p className="page-subheading" style={{ margin: 0 }}>Allocation set here drives every faculty's daily class list.</p>
        </div>
        <button
          className="btn secondary"
          onClick={() => setShowBulkUpload(!showBulkUpload)}
          style={{ fontSize: "0.82rem" }}
        >
          {showBulkUpload ? "Close Import Panel" : "📁 Bulk Import Timetable"}
        </button>
      </div>

      {/* Optional Bulk Import Card */}
      {showBulkUpload && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>Bulk Timetable CSV/XLSX Upload</h3>
            <button className="btn secondary" type="button" onClick={downloadTimetableTemplate}>
              Download CSV Template
            </button>
          </div>
          <p className="hint-text" style={{ marginBottom: 14 }}>
            Required columns: <code>faculty_username</code>, <code>section_display_name</code>, <code>subject_code</code>, <code>day_of_week</code> (Monday-Sunday), <code>period_number</code> (1-7), <code>session_type</code>.
          </p>
          {uploadError && <ErrorBanner message={uploadError} onDismiss={() => setUploadError("")} />}
          <form onSubmit={handleTimetableUpload} className="form-grid">
            <div style={{ gridColumn: "span 2" }}>
              <label>Timetable file</label>
              <input type="file" accept=".csv,.xlsx" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} required disabled={uploadBusy} />
            </div>
            <div style={{ alignSelf: "end" }}>
              <button className="btn" disabled={uploadBusy || !uploadFile} type="submit">
                {uploadBusy ? <Spinner inline label="Importing…" /> : "Import Timetable"}
              </button>
            </div>
          </form>
          {uploadResult && (
            <div className="hint-text" style={{ marginTop: 10 }}>
              Inserted {uploadResult.inserted}, updated {uploadResult.updated} slots.
              {uploadResult.errors.length > 0 && (
                <ul style={{ marginTop: 6 }}>{uploadResult.errors.map((e, i) => <li key={i} className="error-text">{e}</li>)}</ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Section Selector Pills */}
      <div className="section-pills-row">
        {sections.map((sec) => {
          const isSelected = sec.id === selectedSectionId;
          const secSlots = entries.filter((e) => e.section_id === sec.id);
          const hasLab = secSlots.some((e) => e.session_type === "lab");

          return (
            <div
              key={sec.id}
              className={`section-pill-card ${isSelected ? "active" : ""}`}
              onClick={() => setSelectedSectionId(sec.id)}
            >
              <div className="sec-title">{sec.display_name}</div>
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
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {subjects.map((sub) => (
                <span key={sub.id} className="subject-badge">
                  {sub.name}
                </span>
              ))}
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
                {DAYS.map((dayName, dayIdx) => (
                  <tr key={dayName}>
                    <td className="day-label">{SHORT_DAYS[dayIdx]}</td>
                    {PERIODS.map((period) => {
                      const entry = getSlotEntry(dayIdx, period);
                      let isConflict = false;
                      let facultyObj: Faculty | undefined;
                      let subjectObj: Subject | undefined;

                      if (entry) {
                        facultyObj = faculty.find((f) => f.id === entry.faculty_id);
                        subjectObj = subjects.find((s) => s.id === entry.subject_id);
                        isConflict = checkFacultyConflict(entry.faculty_id, dayIdx, period, currentSection.id);
                      }

                      return (
                        <td key={period} className="timetable-cell">
                          {entry ? (
                            <div
                              className={`cell-card ${isConflict ? "conflict" : ""}`}
                              onClick={() => handleOpenAssignModal(dayIdx, period, entry)}
                            >
                              <div className="sub-name">{subjectObj?.name || "Subject"}</div>
                              <div className="fac-name">{facultyObj?.full_name || "Faculty"}</div>
                              {entry.session_type === "lab" && (
                                <div className="badge-tag combined">🔗 Combined {period}-{period + 1}</div>
                              )}
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
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Legend */}
          <div className="timetable-footer-legend">
            <div className="legend-item">
              <span className="badge-tag combined" style={{ fontSize: "0.75rem", padding: "2px 8px" }}>🔗 Combined 1-2</span>
              <span>= 2-hour lab period, single attendance session</span>
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
                {modalSlot.existingEntry ? "Edit Slot Allocation" : `Assign Slot — ${DAYS[modalSlot.dayIndex]}, Period ${modalSlot.period}`}
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
                  onChange={(e) => setModalForm({ ...modalForm, subject_id: e.target.value })}
                  required
                >
                  <option value="">Select subject…</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.code})
                    </option>
                  ))}
                </select>
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
                    const hasConflict = checkFacultyConflict(
                      f.id,
                      modalSlot.dayIndex,
                      modalSlot.period,
                      selectedSectionId || 0
                    );
                    return (
                      <option key={f.id} value={f.id}>
                        {f.full_name} {hasConflict ? "⚠️ (Assigned elsewhere this period)" : ""}
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
                  <option value="lab">Lab (Combined Period)</option>
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
    </div>
  );
}
