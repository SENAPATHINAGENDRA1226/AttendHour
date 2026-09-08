import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { Faculty } from "../../types";
import { useAuth } from "../../context/AuthContext";
import Spinner from "../../components/Spinner";
import ErrorBanner from "../../components/ErrorBanner";

export default function FacultySelect() {
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { setOperator, operator } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadFaculty() {
      try {
        setLoading(true);
        const res = await api.get<Faculty[]>("/faculty/options/faculty");
        setFacultyList(res.data);
      } catch (err: any) {
        setError(err?.response?.data?.detail || err?.message || "Failed to load faculty list.");
      } finally {
        setLoading(false);
      }
    }
    loadFaculty();
  }, []);

  function handleSelect(fac: Faculty) {
    setOperator({ id: fac.id, name: fac.full_name });
    navigate("/faculty");
  }

  const filtered = facultyList.filter(
    (f) =>
      f.full_name.toLowerCase().includes(search.toLowerCase()) ||
      f.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="login-shell">
      <div className="login-card" style={{ maxWidth: 560 }}>
        <div className="login-header">
          <div className="login-icon" style={{ background: "transparent", boxShadow: "none", width: "auto", height: "auto", margin: "0 auto 16px" }}>
            <img src="/icons/Attend Final logo.png" alt="AttendHour Logo" style={{ height: 72, width: "auto", objectFit: "contain" }} />
          </div>
          <h1 style={{ fontSize: "1.5rem" }}>Who is Operating Now?</h1>
          <p className="tagline">Select your name to log in and post attendance for your classes or substitutions.</p>
        </div>

        {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Search faculty name or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            style={{ width: "100%", padding: "10px 14px", fontSize: "0.95rem" }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Spinner inline label="Loading faculty directory…" />
          </div>
        ) : (
          <div
            style={{
              maxHeight: 360,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              paddingRight: 4,
            }}
          >
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: 24, color: "var(--color-text-muted)" }}>
                No faculty found matching "{search}"
              </div>
            ) : (
              filtered.map((fac) => {
                const isCurrent = operator?.id === fac.id;
                return (
                  <button
                    key={fac.id}
                    type="button"
                    onClick={() => handleSelect(fac)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      borderRadius: 8,
                      border: isCurrent ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                      background: isCurrent ? "var(--color-primary-light, #eef2ff)" : "var(--color-surface)",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--color-text)" }}>
                        {fac.full_name}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                        ID: {fac.username}
                      </div>
                    </div>
                    {isCurrent ? (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          padding: "4px 8px",
                          borderRadius: 4,
                          background: "var(--color-primary)",
                          color: "#fff",
                        }}
                      >
                        Current
                      </span>
                    ) : (
                      <span className="material-symbols-outlined" style={{ color: "var(--color-text-muted)", fontSize: 20 }}>
                        chevron_right
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}

        {operator && (
          <button
            className="btn secondary"
            type="button"
            onClick={() => navigate("/faculty")}
            style={{ width: "100%", marginTop: 16 }}
          >
            Cancel &amp; Return to Dashboard
          </button>
        )}
      </div>
      <footer className="app-attribution app-attribution--login">
        Developed by Senapathi Nagendra · CSMD · © 2026 All Rights Reserved
      </footer>
    </div>
  );
}
