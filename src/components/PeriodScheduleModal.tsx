import { useState, useEffect } from "react";
import { api } from "../api/client";
import { PeriodSchedule } from "../types";
import Spinner from "./Spinner";
import ErrorBanner from "./ErrorBanner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function PeriodScheduleModal({ isOpen, onClose, onSaved }: Props) {
  const [schedules, setSchedules] = useState<PeriodSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadSchedules();
    }
  }, [isOpen]);

  async function loadSchedules() {
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await api.get<PeriodSchedule[]>("/admin/period-schedule");
      // Sort periods 1 to 8
      const sorted = [...res.data].sort((a, b) => a.period_number - b.period_number);
      setSchedules(sorted);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to load period schedule");
    } finally {
      setLoading(false);
    }
  }

  function handleTimeChange(index: number, field: "start_time" | "end_time" | "label", value: string) {
    setSchedules((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccessMsg("");

    try {
      const payload = {
        schedules: schedules.map((s) => ({
          period_number: s.period_number,
          start_time: s.start_time.length === 5 ? `${s.start_time}:00` : s.start_time,
          end_time: s.end_time.length === 5 ? `${s.end_time}:00` : s.end_time,
          academic_year: s.academic_year || null,
          label: s.label || `Period ${s.period_number}`,
        })),
      };

      const res = await api.put<PeriodSchedule[]>("/admin/period-schedule", payload);
      setSchedules([...res.data].sort((a, b) => a.period_number - b.period_number));
      setSuccessMsg("Bell timetable schedule updated successfully.");
      if (onSaved) onSaved();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to save period schedule");
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(9, 28, 50, 0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: 680,
          maxHeight: "90vh",
          overflowY: "auto",
          margin: 0,
          padding: 24,
          boxShadow: "var(--card-shadow-lg)",
          borderRadius: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem", color: "var(--on-surface)", display: "flex", alignItems: "center", gap: 8 }}>
              <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>schedule</span>
              Period Bell Timetable Schedule
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--ink-muted)" }}>
              Configures period start/end timings used to calculate late postings and pending sessions.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: "var(--ink-muted)",
              borderRadius: 8,
            }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {error && <ErrorBanner message={error} />}
        {successMsg && (
          <div
            style={{
              padding: "10px 14px",
              backgroundColor: "var(--present-bg)",
              color: "var(--present)",
              borderRadius: 8,
              fontSize: "0.85rem",
              fontWeight: 600,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
            {successMsg}
          </div>
        )}

        {loading ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <Spinner label="Loading period schedules…" />
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--ink-muted)" }}>
                    <th style={{ padding: "8px 6px", width: 60 }}>Period</th>
                    <th style={{ padding: "8px 6px" }}>Label</th>
                    <th style={{ padding: "8px 6px" }}>Start Time (IST)</th>
                    <th style={{ padding: "8px 6px" }}>End Time (IST)</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s, idx) => (
                    <tr key={s.period_number} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "10px 6px", fontWeight: 700, color: "var(--primary)" }}>
                        #{s.period_number}
                      </td>
                      <td style={{ padding: "10px 6px" }}>
                        <input
                          type="text"
                          value={s.label || `Period ${s.period_number}`}
                          onChange={(e) => handleTimeChange(idx, "label", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "6px 10px",
                            border: "1px solid var(--border)",
                            borderRadius: 6,
                            fontSize: "0.85rem",
                          }}
                        />
                      </td>
                      <td style={{ padding: "10px 6px" }}>
                        <input
                          type="time"
                          step="60"
                          value={s.start_time.slice(0, 5)}
                          onChange={(e) => handleTimeChange(idx, "start_time", e.target.value)}
                          required
                          style={{
                            padding: "6px 10px",
                            border: "1px solid var(--border)",
                            borderRadius: 6,
                            fontSize: "0.85rem",
                            fontFamily: "var(--font-mono)",
                          }}
                        />
                      </td>
                      <td style={{ padding: "10px 6px" }}>
                        <input
                          type="time"
                          step="60"
                          value={s.end_time.slice(0, 5)}
                          onChange={(e) => handleTimeChange(idx, "end_time", e.target.value)}
                          required
                          style={{
                            padding: "6px 10px",
                            border: "1px solid var(--border)",
                            borderRadius: 6,
                            fontSize: "0.85rem",
                            fontFamily: "var(--font-mono)",
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
              <button
                type="button"
                className="btn secondary"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn"
                disabled={saving}
                style={{ backgroundColor: "var(--primary)", color: "#fff", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                {saving ? <Spinner inline label="Saving Schedule…" /> : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>save</span>
                    Save Bell Timings
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
