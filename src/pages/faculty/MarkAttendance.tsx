import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../api/client";
import { MarkStatus, SessionStatus, Student } from "../../types";
import Spinner from "../../components/Spinner";
import ErrorBanner from "../../components/ErrorBanner";
import { SidebarLayout } from "../../components/SidebarLayout";
import { getOutboxItems, removeOutboxForSession, saveToOutbox, OutboxItem } from "../../api/outbox";

type RowState =
  | { mode: "same"; status: MarkStatus }
  | { mode: "split"; perPeriod: Record<number, MarkStatus> };

export default function MarkAttendance() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const sectionId = Number(params.get("section_id"));
  const subjectId = Number(params.get("subject_id"));
  const sectionName = params.get("section_name") || "";
  const subjectName = params.get("subject_name") || "";
  const date = params.get("date") || new Date().toISOString().slice(0, 10);
  const initialPeriods = useMemo(
    () => (params.get("periods") || "").split(",").filter(Boolean).map(Number),
    [params]
  );

  const [availablePeriods, setAvailablePeriods] = useState<number[]>(
    initialPeriods.length > 0 ? initialPeriods : [1, 2, 3, 4, 5, 6, 7]
  );
  const [postedPeriods, setPostedPeriods] = useState<number[]>([]);
  const [selectedPeriods, setSelectedPeriods] = useState<number[]>(
    initialPeriods.length > 0 ? initialPeriods : [1]
  );
  const periods = selectedPeriods;

  const isNonAttendanceSubject = useMemo(() => {
    const s = subjectName.trim().toUpperCase();
    return s.includes("LIBRARY") || s.includes("SPORTS") || s.includes("SPORT") || s === "LIB" || s === "SPT";
  }, [subjectName]);

  const [students, setStudents] = useState<Student[]>([]);
  const [rows, setRows] = useState<Record<number, RowState>>({});
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("held");
  const [remarks, setRemarks] = useState("");
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [saving, setSaving] = useState(false);
  const [savedTime, setSavedTime] = useState<string | null>(null);
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  
  const [isDirty, setIsDirty] = useState(false);
  const [conflictItem, setConflictItem] = useState<OutboxItem | null>(null);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !savedTime && !offlineSaved) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, savedTime, offlineSaved]);

  async function load() {
    setLoading(true);
    setLoadError("");
    setConflictItem(null);
    setSavedTime(null);
    try {
      const outboxItems = await getOutboxItems();
      const conflict = outboxItems.find(
        (item) =>
          item.status === "conflict" &&
          item.payload.section_id === sectionId &&
          item.payload.date === date &&
          item.payload.period_numbers.some((p) => periods.includes(p))
      );
      if (conflict) setConflictItem(conflict);

      // 1. Fetch scheduled periods from backend timetable
      if (sectionId && subjectId) {
        try {
          const schedRes = await api.get<{ scheduled_periods: number[]; periods_posted: number[] }>(
            "/faculty/scheduled-periods",
            { params: { section_id: sectionId, subject_id: subjectId, date } }
          );
          const sched = schedRes.data?.scheduled_periods || [];
          const posted = schedRes.data?.periods_posted || [];
          setPostedPeriods(posted);

          if (sched.length > 0) {
            setAvailablePeriods(sched);
            setSelectedPeriods((prev) => {
              const valid = prev.filter((p) => sched.includes(p));
              return valid.length > 0 ? valid : [...sched];
            });
          } else if (initialPeriods.length > 0) {
            setAvailablePeriods(initialPeriods);
          }
        } catch {
          // Fallback to initialPeriods if backend timetable endpoint is unavailable
          if (initialPeriods.length > 0) {
            setAvailablePeriods(initialPeriods);
          }
        }
      }

      // 2. Fetch student roster for section
      const res = await api.get<Student[]>(`/faculty/sections/${sectionId}/students`);
      setStudents(res.data);
      const initial: Record<number, RowState> = {};
      res.data.forEach((s) => { initial[s.id] = { mode: "same", status: "present" }; });

      if (periods.length > 0) {
        try {
          const existing = await api.get("/faculty/attendance/session", {
            params: { section_id: sectionId, date, period_number: periods[0] },
          });
          if (existing.data) {
            setSessionStatus(existing.data.status);
            setRemarks(existing.data.remarks || "");
            existing.data.records.forEach((r: any) => {
              initial[r.student_id] = { mode: "same", status: r.status };
            });
            setSavedTime("Loaded from database");
          }
        } catch { /* fine */ }
      }
      setRows(initial);
      setIsDirty(false);
    } catch (err: any) {
      setLoadError(err?.response?.data?.detail || err?.message || "Failed to load attendance roster.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (sectionId) load();
  }, [sectionId, subjectId, date]);

  function setStatus(studentId: number, status: MarkStatus, period?: number) {
    setIsDirty(true);
    setRows((r) => {
      if (!isSplitMode || !period) {
        return { ...r, [studentId]: { mode: "same", status } };
      }
      const current = r[studentId];
      const perPeriod = current.mode === "split" ? { ...current.perPeriod } : {};
      periods.forEach((p) => {
        if (!(p in perPeriod)) perPeriod[p] = current.mode === "same" ? current.status : "present";
      });
      perPeriod[period] = status;
      return { ...r, [studentId]: { mode: "split", perPeriod } };
    });
  }

  function toggleSplitMode(enableSplit: boolean) {
    setIsSplitMode(enableSplit);
    setIsDirty(true);
    setRows((r) => {
      const next = { ...r };
      students.forEach((s) => {
        const cur = r[s.id];
        if (enableSplit) {
          const baseStatus = cur.mode === "same" ? cur.status : "present";
          const perPeriod: Record<number, MarkStatus> = {};
          periods.forEach((p) => { perPeriod[p] = baseStatus; });
          next[s.id] = { mode: "split", perPeriod };
        } else {
          next[s.id] = { mode: "same", status: "present" };
        }
      });
      return next;
    });
  }

  function markAll(status: MarkStatus) {
    setIsDirty(true);
    setRows((r) => {
      const next = { ...r };
      students.forEach((s) => {
        if (isSplitMode) {
          const perPeriod: Record<number, MarkStatus> = {};
          periods.forEach((p) => { perPeriod[p] = status; });
          next[s.id] = { mode: "split", perPeriod };
        } else {
          next[s.id] = { mode: "same", status };
        }
      });
      return next;
    });
  }

  function invertSelection() {
    setIsDirty(true);
    setRows((r) => {
      const next = { ...r };
      students.forEach((s) => {
        const cur = r[s.id];
        if (!cur) return;
        if (cur.mode === "same") {
          next[s.id] = { mode: "same", status: cur.status === "present" ? "absent" : "present" };
        } else {
          const perPeriod: Record<number, MarkStatus> = {};
          periods.forEach((p) => {
            perPeriod[p] = cur.perPeriod[p] === "present" ? "absent" : "present";
          });
          next[s.id] = { mode: "split", perPeriod };
        }
      });
      return next;
    });
  }

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.roll_no.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  const presentCount = students.filter((s) => {
    const row = rows[s.id];
    if (!row) return false;
    if (row.mode === "same") return row.status === "present";
    return Object.values(row.perPeriod).some((st) => st === "present");
  }).length;

  const absentCount = students.length - presentCount;
  const attendancePct = students.length > 0 ? ((presentCount / students.length) * 100).toFixed(1) : "0.0";

  async function handleSave() {
    if (periods.length === 0) {
      alert("Please select at least one period before saving.");
      return;
    }

    if (sessionStatus === "held" && students.length > 0 && presentCount === 0) {
      if (!confirm(`You've marked all ${students.length} students absent — confirm?`)) {
        return;
      }
    }

    setSaving(true);
    setSaveError("");
    setSavedTime(null);

    const perPeriodOverrides: Record<number, { student_id: number; status: MarkStatus }[]> = {};
    if (sessionStatus === "held") {
      periods.forEach((p) => {
        perPeriodOverrides[p] = students.map((s) => {
          const row = rows[s.id];
          const status = row.mode === "same" ? row.status : row.perPeriod[p] || "present";
          return { student_id: s.id, status };
        });
      });
    }

    const payload = {
      section_id: sectionId,
      subject_id: subjectId,
      date,
      period_numbers: periods,
      status: sessionStatus,
      marks: sessionStatus === "held" && !isSplitMode ? students.map((s) => {
        const row = rows[s.id];
        const st: MarkStatus = row && row.mode === "same" ? row.status : "present";
        return { student_id: s.id, status: st };
      }) : [],
      remarks: remarks || null,
      per_period_overrides: sessionStatus === "held" ? perPeriodOverrides : {},
      section_name: sectionName,
      subject_name: subjectName,
    };

    try {
      await api.post("/faculty/attendance/post", payload);
      await removeOutboxForSession(sectionId, date, periods);
      const nowStr = new Date().toLocaleTimeString();
      setSavedTime(`Attendance submitted successfully at ${nowStr}`);
      setIsDirty(false);
      setTimeout(() => navigate("/faculty"), 900);
    } catch (err: any) {
      if (!navigator.onLine || !err?.response || err?.code === "ERR_NETWORK") {
        try {
          await saveToOutbox(payload);
          setOfflineSaved(true);
          setIsDirty(false);
          setTimeout(() => navigate("/faculty"), 1200);
        } catch {
          setSaveError("Failed to save attendance locally.");
        }
      } else {
        setSaveError(err?.response?.data?.detail || err?.message || "Could not submit attendance.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SidebarLayout>
        <h1 className="page-heading">Take Attendance</h1>
        <Spinner label="Loading attendance roster…" />
      </SidebarLayout>
    );
  }

  const periodLabel = periods.length > 1 ? `Period ${periods.join(" & ")}` : `Period ${periods[0] || 1}`;

  return (
    <SidebarLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: 8 }}>
        <button className="btn secondary" onClick={() => navigate("/faculty")} style={{ padding: "6px 12px" }}>
          ← Back to Schedule
        </button>

        {isDirty && (
          <span style={{ fontSize: "0.82rem", color: "#ca8a04", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
            Unsaved Changes
          </span>
        )}
      </div>

      {loadError && <ErrorBanner message={loadError} onRetry={load} />}
      {saveError && <ErrorBanner message={saveError} onDismiss={() => setSaveError("")} />}
      {isNonAttendanceSubject && (
        <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", color: "#92400e", padding: "12px 16px", borderRadius: 8, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 24, color: "#d97706" }}>info</span>
          <div>
            <strong>Non-Attendance Subject:</strong> Attendance records are completely disabled for Library and Sports sessions and are not counted towards attendance rates.
          </div>
        </div>
      )}
      {savedTime && (
        <div className="status-badge posted" style={{ marginBottom: 16, padding: "8px 16px", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>cloud_done</span>
          ✓ {savedTime}
        </div>
      )}
      {offlineSaved && <div className="status-badge pending" style={{ marginBottom: 16 }}>📶 Saved to offline outbox. Will sync automatically when online.</div>}

      {/* Class Info Header Card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--ink-dark)" }}>
              {sectionName}
            </div>
            <div style={{ color: "var(--primary)", fontWeight: 600, fontSize: "1rem", marginTop: 2 }}>
              {subjectName}
            </div>
            <div style={{ color: "var(--ink-soft)", fontSize: "0.85rem", marginTop: 4 }}>
              📅 Date: <strong>{date}</strong> · 👥 Total Roster: <strong>{students.length} Students</strong>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <span className="period-pill" style={{ margin: 0, padding: "6px 14px", fontSize: "0.9rem", background: "var(--primary)", color: "#fff" }}>
              {periodLabel}
            </span>
            <button
              className="btn secondary"
              type="button"
              onClick={load}
              disabled={loading}
              style={{ padding: "4px 10px", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>sync</span>
              Refresh Roster
            </button>
          </div>
        </div>
      </div>

      {/* Period Selection Card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
          <label style={{ fontWeight: 700, margin: 0, display: "block" }}>Select Teaching Period(s):</label>
          {availablePeriods.length > 1 && (
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                className="btn secondary"
                style={{ padding: "3px 10px", fontSize: "0.78rem", cursor: "pointer" }}
                onClick={() => {
                  setSelectedPeriods([...availablePeriods]);
                  setIsDirty(true);
                }}
              >
                Select All
              </button>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {availablePeriods.map((p) => {
            const isSel = selectedPeriods.includes(p);
            const isPosted = postedPeriods.includes(p);
            return (
              <button
                key={p}
                type="button"
                className={`btn ${isSel ? "" : "secondary"}`}
                style={{
                  minWidth: 84,
                  padding: "8px 16px",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  borderColor: isSel ? "var(--primary)" : "var(--surface-variant)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
                onClick={() => {
                  setSelectedPeriods((prev) =>
                    prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p].sort((a, b) => a - b)
                  );
                  setIsDirty(true);
                }}
              >
                <span>Period {p}</span>
                {isPosted && (
                  <span style={{ fontSize: "0.75rem", opacity: 0.85, fontWeight: 600 }}>
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {periods.length === 0 && (
          <p style={{ color: "#dc2626", fontSize: "0.82rem", marginTop: 8, fontWeight: 600 }}>
            ⚠️ Please select at least one period to record attendance.
          </p>
        )}
      </div>

      {/* Session Status Pills Card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <label style={{ fontWeight: 700, marginBottom: 8, display: "block" }}>Session Status:</label>
        <div className="session-status-row" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div
            className={`status-pill ${sessionStatus === "held" ? "active posted" : ""}`}
            style={{ cursor: "pointer", padding: "8px 16px", borderRadius: 8, border: "1px solid var(--surface-variant)", fontWeight: 600 }}
            onClick={() => { setSessionStatus("held"); setIsDirty(true); }}
          >
            ✅ Regular Class Conducted
          </div>
          <div
            className={`status-pill ${sessionStatus === "holiday" ? "active holiday" : ""}`}
            style={{ cursor: "pointer", padding: "8px 16px", borderRadius: 8, border: "1px solid var(--surface-variant)", fontWeight: 600 }}
            onClick={() => { setSessionStatus("holiday"); setIsDirty(true); }}
          >
            🚫 College Holiday / Suspended
          </div>
          <div
            className={`status-pill ${sessionStatus === "faculty_leave" ? "active faculty_leave" : ""}`}
            style={{ cursor: "pointer", padding: "8px 16px", borderRadius: 8, border: "1px solid var(--surface-variant)", fontWeight: 600 }}
            onClick={() => { setSessionStatus("faculty_leave"); setIsDirty(true); }}
          >
            👤 Faculty on Leave / Not Held
          </div>
        </div>

        {sessionStatus !== "held" && (
          <div style={{ marginTop: 12 }}>
            <label htmlFor="remarks">Remarks (Optional)</label>
            <input
              id="remarks"
              value={remarks}
              onChange={(e) => { setRemarks(e.target.value); setIsDirty(true); }}
              placeholder="e.g. Festival holiday, Dept seminar, Sick leave"
            />
          </div>
        )}
      </div>

      {sessionStatus === "held" && (
        <>
          {/* Live Attendance Tally & Action Bar */}
          <div className="card" style={{ marginBottom: 16 }}>
            {periods.length > 1 && (
              <div className="mode-tab-bar" style={{ marginBottom: 16 }}>
                <div
                  className={`mode-tab ${!isSplitMode ? "active" : ""}`}
                  onClick={() => toggleSplitMode(false)}
                >
                  Post Combined ({periods.length} Periods Together)
                </div>
                <div
                  className={`mode-tab ${isSplitMode ? "active" : ""}`}
                  onClick={() => toggleSplitMode(true)}
                >
                  Post Separately (Period-by-Period Overrides)
                </div>
              </div>
            )}

            {/* Quick Bulk Actions */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
              <button className="btn secondary" type="button" onClick={() => markAll("present")}>
                ✓ All Present
              </button>
              <button className="btn secondary" type="button" onClick={() => markAll("absent")}>
                ⊗ All Absent
              </button>
              <button className="btn secondary" type="button" onClick={invertSelection}>
                ⇄ Invert Marks
              </button>
            </div>

            {/* Live Count Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, padding: "12px", background: "rgba(107, 70, 193, 0.04)", borderRadius: 10, border: "1px solid var(--surface-variant)" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--present)" }}>{presentCount}</div>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--ink-soft)" }}>PRESENT</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--absent)" }}>{absentCount}</div>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--ink-soft)" }}>ABSENT</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: Number(attendancePct) >= 75 ? "#16a34a" : Number(attendancePct) >= 65 ? "#ca8a04" : "#dc2626" }}>
                  {attendancePct}%
                </div>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--ink-soft)" }}>PERCENTAGE</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--ink-dark)" }}>{students.length}</div>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--ink-soft)" }}>TOTAL ROSTER</div>
              </div>
            </div>

            {/* Live Search Box */}
            <div style={{ marginTop: 14 }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Search student by roll number or name in real-time…"
                style={{ width: "100%" }}
              />
            </div>
          </div>

          {/* Student Roster Ledger */}
          <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 24 }}>
            {filteredStudents.length === 0 ? (
              <div style={{ padding: "30px", textAlign: "center", color: "var(--ink-soft)" }}>
                No students match your search query "{searchQuery}".
              </div>
            ) : (
              filteredStudents.map((s, idx) => {
                const row = rows[s.id];
                const isPresent = row?.mode === "same" ? row.status === "present" : Object.values(row?.perPeriod || {}).some(x => x === "present");

                return (
                  <div
                    key={s.id}
                    className="ledger-row"
                    style={{
                      background: isPresent ? "transparent" : "rgba(239, 68, 68, 0.04)",
                      borderBottom: "1px solid var(--surface-variant)",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <div className="student-info">
                      <div className="name" style={{ fontWeight: 700, color: "var(--ink-dark)" }}>
                        {String(idx + 1).padStart(2, "0")}. {s.name}
                      </div>
                      <div className="roll" style={{ fontFamily: "var(--font-mono)", color: "var(--ink-soft)", fontSize: "0.82rem" }}>
                        {s.roll_no}
                      </div>
                    </div>

                    <div className="mark-toggle">
                      {!isSplitMode ? (
                        <>
                          <button
                            type="button"
                            className={`mark-btn present ${row?.mode === "same" && row.status === "present" ? "active" : ""}`}
                            onClick={() => setStatus(s.id, "present")}
                          >
                            P
                          </button>
                          <button
                            type="button"
                            className={`mark-btn absent ${row?.mode === "same" && row.status === "absent" ? "active" : ""}`}
                            onClick={() => setStatus(s.id, "absent")}
                          >
                            A
                          </button>
                        </>
                      ) : (
                        periods.map((p) => {
                          const curStatus = row?.mode === "split" ? row.perPeriod[p] || "present" : "present";
                          return (
                            <div key={p} style={{ display: "flex", gap: 2, marginRight: 6, alignItems: "center" }}>
                              <span style={{ fontSize: "0.72rem", color: "var(--ink-soft)", marginRight: 2 }}>P{p}:</span>
                              <button
                                type="button"
                                className={`mark-btn present ${curStatus === "present" ? "active" : ""}`}
                                onClick={() => setStatus(s.id, "present", p)}
                              >
                                P
                              </button>
                              <button
                                type="button"
                                className={`mark-btn absent ${curStatus === "absent" ? "active" : ""}`}
                                onClick={() => setStatus(s.id, "absent", p)}
                              >
                                A
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Save Button Bar */}
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <button
          className="btn large"
          onClick={handleSave}
          disabled={saving || periods.length === 0 || isNonAttendanceSubject}
          style={{ minWidth: 260, fontSize: "1.05rem", padding: "14px 28px", boxShadow: "0 4px 14px rgba(107, 70, 193, 0.3)" }}
        >
          {saving ? (
            <Spinner inline label="Submitting attendance…" />
          ) : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>check_circle</span>
              Submit Attendance
            </span>
          )}
        </button>
        <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)", marginTop: 8 }}>
          Attendance records are securely registered for Avanthi Institute of Engineering and Technology.
        </div>
      </div>
    </SidebarLayout>
  );
}

