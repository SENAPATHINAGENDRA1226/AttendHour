import { useNavigate } from "react-router-dom";
import { SidebarLayout } from "../../components/SidebarLayout";
import { useAuth } from "../../context/AuthContext";


export default function FacultyProfile() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate("/login");
  };

  return (
    <SidebarLayout>
      <h1 className="page-heading">Profile</h1>
      <p className="page-subheading">Allocation is managed by the department office.</p>

      {/* Profile Info Card */}
      <div className="card">
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <div className="avatar-circle" style={{ width: 64, height: 64, fontSize: "1.6rem" }}>
            {auth?.fullName ? auth.fullName.charAt(0).toUpperCase() : "R"}
          </div>
          <div>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "var(--font-display)" }}>
              {auth?.fullName || "Dr. K. Ramesh"}
            </div>
            <div style={{ color: "var(--ink-soft)", fontSize: "0.9rem", marginTop: 2 }}>
              Assistant Professor
            </div>

            <div style={{ display: "flex", gap: 24, marginTop: 16, flexWrap: "wrap", fontSize: "0.85rem", color: "var(--ink-soft)" }}>
              <div>🪪 CSM-1042</div>
              <div>✉️ k.ramesh@college.edu</div>
              <div>🎓 CSE (AI & ML)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Allocated Sections & Subjects Card */}
      <div className="card">
        <h3>MY SECTIONS & SUBJECTS</h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ fontWeight: 700, fontSize: "1rem" }}>2nd CSM-A</div>
              <span className="status-badge pending">Read-only</span>
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--ink-muted)", marginBottom: 12 }}>
              68 students · Theory + Lab
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <span className="period-pill" style={{ margin: 0 }}>Data Structures</span>
              <span className="period-pill" style={{ margin: 0 }}>DS Lab</span>
            </div>
          </div>

          <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ fontWeight: 700, fontSize: "1rem" }}>2nd CSM-C</div>
              <span className="status-badge pending">Read-only</span>
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--ink-muted)", marginBottom: 12 }}>
              64 students · Theory
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <span className="period-pill" style={{ margin: 0 }}>Data Structures</span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Action Buttons */}
      <div className="card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <button className="btn secondary" onClick={() => alert("Contact department admin to update your password.")}>
          🔒 Change password
        </button>
        <button className="btn secondary" onClick={handleSignOut} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 4h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/>
            <path d="M11 16l-4-4 4-4"/>
            <path d="M7 12h10"/>
          </svg>
          <span>Sign out</span>
        </button>
      </div>

      <div style={{ textAlign: "center", fontSize: "0.82rem", color: "var(--ink-muted)", marginTop: 24 }}>
        Need a section added or removed? Contact the HOD office.
      </div>
    </SidebarLayout>
  );
}
