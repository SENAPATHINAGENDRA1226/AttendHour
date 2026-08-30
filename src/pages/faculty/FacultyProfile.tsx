import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarLayout } from "../../components/SidebarLayout";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import { FacultyProfileData } from "../../types";
import Spinner from "../../components/Spinner";
import ErrorBanner from "../../components/ErrorBanner";

export default function FacultyProfile() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<FacultyProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadProfile() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<FacultyProfileData>("/faculty/profile");
      setProfile(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to load faculty profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSignOut = () => {
    logout();
    navigate("/login");
  };

  const initial = profile?.full_name
    ? profile.full_name.charAt(0).toUpperCase()
    : auth?.fullName
      ? auth.fullName.charAt(0).toUpperCase()
      : "F";

  return (
    <SidebarLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 className="page-heading" style={{ margin: 0 }}>Faculty Profile</h1>
          <p className="page-subheading" style={{ margin: "4px 0 0" }}>
            Manage Your Profile
          </p>
        </div>
        <button
          className="btn secondary"
          onClick={loadProfile}
          disabled={loading}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: "0.85rem" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>sync</span>
          Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadProfile} />}

      {loading ? (
        <div style={{ padding: "60px 0", textAlign: "center" }}>
          <Spinner label="Loading Your Details…" />
        </div>
      ) : (
        <>
          {/* Profile Overview Card */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
              <div className="avatar-circle" style={{ width: 68, height: 68, fontSize: "1.8rem", background: "var(--primary)", color: "#fff" }}>
                {initial}
              </div>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontSize: "1.35rem", fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--ink-dark)" }}>
                  {profile?.full_name || auth?.fullName || "Faculty Member"}
                </div>
                <div style={{ color: "var(--primary)", fontWeight: 600, fontSize: "0.92rem", marginTop: 2 }}>
                  Faculty · Avanthi Institute of Engineering and Technology
                </div>

                <div style={{ display: "flex", gap: 20, marginTop: 14, flexWrap: "wrap", fontSize: "0.88rem", color: "var(--ink-soft)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--primary)" }}>badge</span>
                    <span><strong>ID:</strong> {profile?.username || auth?.username}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--secondary)" }}>mail</span>
                    <span>{profile?.email || (profile?.username ? `${profile.username}@avanthi.edu.in` : "faculty@avanthi.edu.in")}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--primary-container)" }}>verified</span>
                    <span className="status-badge posted" style={{ padding: "2px 8px", fontSize: "0.75rem" }}>Active Account</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Metric Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
            <div className="card" style={{ margin: 0, padding: 18, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(107, 70, 193, 0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 24 }}>class</span>
              </div>
              <div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--ink-dark)" }}>
                  {profile?.total_allocations || 0}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)", fontWeight: 500 }}>
                  Allocated Classes
                </div>
              </div>
            </div>

            <div className="card" style={{ margin: 0, padding: 18, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(34, 197, 94, 0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 24 }}>fact_check</span>
              </div>
              <div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#16a34a" }}>
                  {profile?.total_sessions_taken || 0}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)", fontWeight: 500 }}>
                  Saved Records
                </div>
              </div>
            </div>

            <div className="card" style={{ margin: 0, padding: 18, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(59, 130, 246, 0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 24 }}>groups</span>
              </div>
              <div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--ink-dark)" }}>
                  {profile?.total_students_taught || 0}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)", fontWeight: 500 }}>
                  Students Taught
                </div>
              </div>
            </div>
          </div>

          {/* Allocated Sections & Subjects Card */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "1.05rem", display: "flex", alignItems: "center", gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--primary)" }}>menu_book</span>
              My Allocated Sections &amp; Subjects
            </h3>

            {!profile?.allocations || profile.allocations.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--ink-soft)" }}>
                No sections currently allocated. Contact Department Admin to assign your classes.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                {profile.allocations.map((alloc) => (
                  <div
                    key={alloc.allocation_id}
                    style={{
                      border: "1px solid var(--surface-variant)",
                      borderRadius: 12,
                      padding: 16,
                      background: "var(--surface)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--ink-dark)" }}>
                          {alloc.section_name}
                        </div>
                        <span className="status-badge posted" style={{ fontSize: "0.72rem", padding: "2px 8px" }}>
                          Active
                        </span>
                      </div>
                      <div style={{ fontSize: "0.84rem", color: "var(--ink-soft)", marginBottom: 8 }}>
                        {alloc.department_name} · {alloc.student_count} students
                      </div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 8, background: "rgba(107, 70, 193, 0.08)", color: "var(--primary)", fontWeight: 600, fontSize: "0.85rem" }}>
                        <span>{alloc.subject_name}</span>
                        <span style={{ opacity: 0.7 }}>({alloc.subject_code})</span>
                      </div>
                    </div>

                    <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px dashed var(--surface-variant)", display: "flex", justifyContent: "flex-end" }}>
                      <button
                        className="btn secondary"
                        style={{ padding: "4px 10px", fontSize: "0.8rem" }}
                        onClick={() => {
                          const p = new URLSearchParams({
                            section_id: String(alloc.section_id),
                            section_name: alloc.section_name,
                            subject_id: String(alloc.subject_id),
                            subject_name: alloc.subject_name,
                          });
                          navigate(`/faculty/mark?${p.toString()}`);
                        }}
                      >
                        Take Attendance →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Database Sessions */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "1.05rem", display: "flex", alignItems: "center", gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--primary)" }}>history</span>
              Recently Saved Attendance Records...
            </h3>

            {!profile?.recent_sessions || profile.recent_sessions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--ink-soft)" }}>
                No attendance sessions recorded yet.Take Attendance To Record.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="data-table" style={{ width: "100%", fontSize: "0.88rem" }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Period</th>
                      <th>Section</th>
                      <th>Subject</th>
                      <th>Status</th>
                      <th>Present / Total</th>
                      <th>Percentage</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.recent_sessions.map((s) => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 600 }}>{s.date}</td>
                        <td><span className="period-pill" style={{ margin: 0 }}>P{s.period_number}</span></td>
                        <td>{s.section_name}</td>
                        <td>{s.subject_name} ({s.subject_code})</td>
                        <td>
                          {s.status === "held" ? (
                            <span className="status-badge posted">Conducted</span>
                          ) : s.status === "holiday" ? (
                            <span className="status-badge" style={{ background: "#fee2e2", color: "#dc2626" }}>Holiday</span>
                          ) : (
                            <span className="status-badge pending">Leave</span>
                          )}
                        </td>
                        <td>
                          {s.status === "held" ? (
                            <span><strong style={{ color: "#16a34a" }}>{s.present_count}</strong> / {s.total_students}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          {s.status === "held" ? (
                            <span style={{ fontWeight: 700, color: s.percentage >= 75 ? "#16a34a" : s.percentage >= 65 ? "#ca8a04" : "#dc2626" }}>
                              {s.percentage}%
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <button
                            className="btn secondary"
                            style={{ padding: "4px 8px", fontSize: "0.78rem" }}
                            onClick={() => {
                              const p = new URLSearchParams({
                                section_id: String(s.section_id),
                                section_name: s.section_name,
                                subject_id: String(s.subject_id),
                                subject_name: s.subject_name,
                                date: s.date,
                                periods: String(s.period_number),
                              });
                              navigate(`/faculty/mark?${p.toString()}`);
                            }}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Account Actions */}
          <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
              Avanthi Institute of Engineering and Technology · Attendance Management System
            </div>
            <button
              className="btn secondary"
              onClick={handleSignOut}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", color: "var(--absent)" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
              Sign out
            </button>
          </div>
        </>
      )}
    </SidebarLayout>
  );
}

