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

  const ALL_PERIODS = [1, 2, 3, 4, 5, 6, 7];
  const [selectedPeriods, setSelectedPeriods] = useState<number[]>(initialPeriods.length > 0 ? initialPeriods : []);
  const periods = selectedPeriods;

  const [students, setStudents] = useState<Student[]>([]);
  const [rows, setRows] = useState<Record<number, RowState>>({});
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("held");
  const [remarks, setRemarks] = useState("");
  const [isSplitMode, setIsSplitMode] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  
  const [isDirty, setIsDirty] = useState(false);
  const [conflictItem, setConflictItem] = useState<OutboxItem | null>(null);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !saved && !offlineSaved) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, saved, offlineSaved]);

  async function load() {
    setLoading(true);
    setLoadError("");
    setConflictItem(null);
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
    if (sectionId && periods.length > 0) load();
  }, [sectionId, date, selectedPeriods.join(",")]);

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

  const presentCount = students.filter((s) => {
    const row = rows[s.id];
    if (!row) return false;
    if (row.mode === "same") return row.status === "present";
    return Object.values(row.perPeriod).some((st) => st === "present");
  }).length;

  const absentCount = students.length - presentCount;

  async function handleSave() {
    if (sessionStatus === "held" && students.length > 0 && presentCount === 0) {
      if (!confirm(`You've marked all ${students.length} students absent — confirm?`)) {
        return;
      }
    }

    setSaving(true);
    setSaveError("");
    setSaved(false);

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
      marks: [],
      remarks: remarks || null,
      per_period_overrides: sessionStatus === "held" ? perPeriodOverrides : {},
      section_name: sectionName,
      subject_name: subjectName,
    };

    try {
      await api.post("/faculty/attendance/post", payload);
      await removeOutboxForSession(sectionId, date, periods);
      setSaved(true);
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
        setSaveError(err?.response?.data?.detail || err?.message || "Could not save attendance.");
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
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <button className="btn secondary" onClick={() => navigate("/faculty")} style={{ padding: "6px 12px" }}>
          ← Take Attendance
        </button>
      </div>

      {loadError && <ErrorBanner message={loadError} onRetry={load} />}
      {saveError && <ErrorBanner message={saveError} onDismiss={() => setSaveError("")} />}
      {saved && <div className="status-badge posted" style={{ marginBottom: 16 }}>✓ Attendance saved successfully!</div>}
      {offlineSaved && <div className="status-badge pending" style={{ marginBottom: 16 }}>📶 Saved to offline outbox. Will sync automatically when online.</div>}

      {/* Period Selection */}
      <div className="card">
        <label>Select Period(s)</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
          {ALL_PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              className={`btn ${selectedPeriods.includes(p) ? "" : "secondary"}`}
              style={{ minWidth: 48, padding: "6px 12px", fontSize: "0.85rem" }}
              onClick={() => {
                setSelectedPeriods((prev) =>
                  prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p].sort((a, b) => a - b)
                );
              }}
            >
              P{p}
            </button>
          ))}
        </div>
        {periods.length === 0 && (
          <p style={{ color: "var(--ink-soft)", fontSize: "0.82rem", marginTop: 8 }}>Select at least one period to continue.</p>
        )}
      </div>

      {/* Class Info Header Card */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "var(--font-display)" }}>{sectionName}</div>
            <div style={{ color: "var(--ink-soft)", fontSize: "0.95rem", marginTop: 2 }}>{subjectName}</div>
            <div style={{ color: "var(--ink-muted)", fontSize: "0.82rem", marginTop: 4 }}>
              {date} · 01:10–02:50 · {students.length} students
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <span className="period-pill" style={{ margin: 0 }}>{periodLabel}</span>
            <button
              className="btn secondary"
              type="button"
              onClick={load}
              disabled={loading}
              style={{ padding: "4px 10px", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              🔄 Refresh Roster
            </button>
          </div>
        </div>
      </div>

      {/* Session Status Pills Card */}
      <div className="card">
        <label>Class Status Override</label>
        <div className="session-status-row">
          <div
            className={`status-pill ${sessionStatus === "holiday" ? "active holiday" : ""}`}
            onClick={() => { setSessionStatus(sessionStatus === "holiday" ? "held" : "holiday"); setIsDirty(true); }}
          >
            🚫 Holiday — No Class
          </div>
          <div
            className={`status-pill ${sessionStatus === "faculty_leave" ? "active faculty_leave" : ""}`}
            onClick={() => { setSessionStatus(sessionStatus === "faculty_leave" ? "held" : "faculty_leave"); setIsDirty(true); }}
          >
            👤 Faculty Did Not Attend
          </div>
        </div>
      </div>

      {sessionStatus === "held" && (
        <>
          {/* Mode Toggle & Bulk Actions Card */}
          <div className="card">
            {periods.length > 1 && (
              <div className="mode-tab-bar">
                <div
                  className={`mode-tab ${!isSplitMode ? "active" : ""}`}
                  onClick={() => toggleSplitMode(false)}
                >
                  Post Combined
                </div>
                <div
                  className={`mode-tab ${isSplitMode ? "active" : ""}`}
                  onClick={() => toggleSplitMode(true)}
                >
                  Post Separately
                </div>
              </div>
            )}


            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <button className="btn secondary" onClick={() => markAll("present")}>
                ✓ Mark All Present
              </button>
              <button className="btn secondary" onClick={() => markAll("absent")}>
                ⊗ Mark All Absent
              </button>
            </div>

            <div className="ledger-header">
              <div className="ledger-tally">
                Present <strong style={{ color: "var(--present)" }}>{presentCount}</strong> · Absent <strong style={{ color: "var(--absent)" }}>{absentCount}</strong>
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--ink-muted)", fontFamily: "var(--font-mono)" }}>
                {periods.map((p) => `P${p}`).join(" / ")}
              </div>
            </div>
          </div>

          {/* Student Roster Ledger */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {students.map((s, idx) => {
              const row = rows[s.id];
              const rollDisp = String(idx + 1).padStart(2, "0") + ". " + s.name;
              return (
                <div key={s.id} className="ledger-row">
                  <div className="student-info">
                    <div className="name">{rollDisp}</div>
                    <div className="roll">{s.roll_no}</div>
                  </div>

                  <div className="mark-toggle">
                    {!isSplitMode ? (
                      <>
                        <button
                          className={`mark-btn present ${row?.mode === "same" && row.status === "present" ? "active" : ""}`}
                          onClick={() => setStatus(s.id, "present")}
                        >
                          P
                        </button>
                        <button
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
                          <div key={p} style={{ display: "flex", gap: 2, marginRight: 6 }}>
                            <button
                              className={`mark-btn present ${curStatus === "present" ? "active" : ""}`}
                              onClick={() => setStatus(s.id, "present", p)}
                            >
                              P
                            </button>
                            <button
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
            })}
          </div>

          {/* Bottom Sticky Save Button */}
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <button className="btn large" onClick={handleSave} disabled={saving}>
              {saving ? <Spinner inline label="Saving attendance…" /> : "Save Attendance"}
            </button>
            <div style={{ fontSize: "0.8rem", color: "var(--ink-muted)", marginTop: 8 }}>
              Not saved yet — nothing is auto-saved.
            </div>
          </div>
        </>
      )}
    </SidebarLayout>
  );
}
