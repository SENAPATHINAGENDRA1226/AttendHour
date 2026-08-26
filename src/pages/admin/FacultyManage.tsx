import React, { useEffect, useState, useRef } from "react";
import { api } from "../../api/client";
import { Faculty } from "../../types";
import Spinner from "../../components/Spinner";
import ErrorBanner from "../../components/ErrorBanner";

export default function FacultyManage() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  
  const editUsernameInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ username: "", full_name: "", email: "", password: "" });
  const [formError, setFormError] = useState("");
  const [formBusy, setFormBusy] = useState(false);

  const [actionBusyId, setActionBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");

  const [editItem, setEditItem] = useState<Faculty | null>(null);
  const [editForm, setEditForm] = useState({ username: "", full_name: "", email: "" });
  const [editBusy, setEditBusy] = useState(false);

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const res = await api.get<Faculty[]>("/admin/faculty");
      setFaculty(res.data);
    } catch (err: any) {
      setLoadError(err?.response?.data?.detail || err?.message || "Failed to load faculty list.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (editItem && editUsernameInputRef.current) editUsernameInputRef.current.focus();
  }, [editItem]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setEditItem(null);
    }
  }

  async function createFaculty(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormBusy(true);
    try {
      await api.post("/admin/faculty", form);
      setForm({ username: "", full_name: "", email: "", password: "" });
      await load();
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || err?.message || "Could not create faculty account");
    } finally {
      setFormBusy(false);
    }
  }

  async function toggleActive(id: number) {
    setActionError("");
    setActionBusyId(id);
    try {
      await api.patch(`/admin/faculty/${id}/toggle-active`);
      await load();
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || err?.message || "Could not update faculty status.");
    } finally {
      setActionBusyId(null);
    }
  }

  async function resetPassword(id: number) {
    const pw = prompt("New password for this faculty account:");
    if (!pw) return;
    setActionError("");
    setActionBusyId(id);
    try {
      await api.post(`/admin/faculty/${id}/reset-password?new_password=${encodeURIComponent(pw)}`);
      alert("Password reset successfully.");
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || err?.message || "Could not reset password.");
    } finally {
      setActionBusyId(null);
    }
  }

  async function deleteFaculty(f: Faculty) {
    if (!confirm(`Are you sure you want to PERMANENTLY delete faculty member '${f.full_name}'?`)) {
      return;
    }
    setActionError("");
    setActionBusyId(f.id);
    try {
      await api.delete(`/admin/faculty/${f.id}`);
      await load();
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || err?.message || "Could not delete faculty account.");
    } finally {
      setActionBusyId(null);
    }
  }

  function startEdit(f: Faculty) {
    setEditItem(f);
    setEditForm({ username: f.username, full_name: f.full_name, email: f.email || "" });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editItem) return;
    setEditBusy(true);
    setActionError("");
    try {
      await api.patch(`/admin/faculty/${editItem.id}`, editForm);
      setEditItem(null);
      await load();
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || err?.message || "Could not update faculty.");
    } finally {
      setEditBusy(false);
    }
  }

  return (
    <div onKeyDown={handleKeyDown}>
      {/* Accessible Edit Faculty Modal Card */}
      {editItem && (
        <div
          className="card"
          style={{ border: "2px solid var(--primary)", marginBottom: 24 }}
          role="dialog"
          aria-labelledby="edit-faculty-heading"
        >
          <h3 id="edit-faculty-heading">Edit Faculty Account: {editItem.full_name}</h3>
          <form onSubmit={saveEdit}>
            <div className="form-grid">
              <div>
                <label htmlFor="edit-fac-username">Username</label>
                <input
                  id="edit-fac-username"
                  ref={editUsernameInputRef}
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  required
                  disabled={editBusy}
                />
              </div>
              <div>
                <label htmlFor="edit-fac-fullname">Full Name</label>
                <input
                  id="edit-fac-fullname"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  required
                  disabled={editBusy}
                />
              </div>
              <div>
                <label htmlFor="edit-fac-email">Email</label>
                <input
                  id="edit-fac-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  disabled={editBusy}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button className="btn" type="submit" disabled={editBusy} aria-label="Save faculty member changes">
                {editBusy ? <Spinner inline label="Saving..." /> : "Save Changes"}
              </button>
              <button
                className="btn secondary"
                type="button"
                onClick={() => setEditItem(null)}
                disabled={editBusy}
                aria-label="Cancel editing faculty member"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h3>Add Faculty Account</h3>
        {formError && <ErrorBanner message={formError} onDismiss={() => setFormError("")} />}
        <form onSubmit={createFaculty}>
          <div className="form-grid">
            <div>
              <label htmlFor="create-fac-username">Username</label>
              <input
                id="create-fac-username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
                disabled={formBusy}
              />
            </div>
            <div>
              <label htmlFor="create-fac-fullname">Full Name</label>
              <input
                id="create-fac-fullname"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
                disabled={formBusy}
              />
            </div>
            <div>
              <label htmlFor="create-fac-email">Email (optional)</label>
              <input
                id="create-fac-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={formBusy}
              />
            </div>
            <div>
              <label htmlFor="create-fac-password">Temporary Password</label>
              <input
                id="create-fac-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                disabled={formBusy}
              />
            </div>
          </div>
          <button className="btn" type="submit" disabled={formBusy} aria-label="Create faculty account">
            {formBusy ? <Spinner inline label="Creating…" /> : "Create Faculty Account"}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Faculty List</h3>
        {actionError && <ErrorBanner message={actionError} onDismiss={() => setActionError("")} />}
        {loading ? (
          <Spinner label="Loading faculty members…" />
        ) : loadError ? (
          <ErrorBanner message={loadError} onRetry={load} />
        ) : (
          <div className="table-responsive">
            <table className="data-table" aria-label="Faculty Accounts Table">
              <thead>
                <tr>
                  <th scope="col">Username</th>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {faculty.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "var(--ink-soft)" }}>
                      No faculty accounts found.
                    </td>
                  </tr>
                ) : (
                  faculty.map((f) => (
                    <tr key={f.id}>
                      <td className="mono">{f.username}</td>
                      <td>{f.full_name}</td>
                      <td>{f.email || "—"}</td>
                      <td>
                        <span className={`status-badge ${f.is_active ? "posted" : "pending"}`}>
                          {f.is_active ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn secondary"
                          onClick={() => startEdit(f)}
                          disabled={actionBusyId === f.id}
                          style={{ marginRight: 6 }}
                          aria-label={`Edit faculty member ${f.full_name}`}
                        >
                          Edit
                        </button>
                        <button
                          className="btn secondary"
                          onClick={() => toggleActive(f.id)}
                          disabled={actionBusyId === f.id}
                          style={{ marginRight: 6 }}
                          aria-label={`${f.is_active ? "Disable" : "Enable"} faculty member ${f.full_name}`}
                        >
                          {actionBusyId === f.id ? (
                            <Spinner inline label="Updating…" />
                          ) : f.is_active ? (
                            "Disable"
                          ) : (
                            "Enable"
                          )}
                        </button>
                        <button
                          className="btn secondary"
                          onClick={() => resetPassword(f.id)}
                          disabled={actionBusyId === f.id}
                          style={{ marginRight: 6 }}
                          aria-label={`Reset password for ${f.full_name}`}
                        >
                          Reset pw
                        </button>
                        <button
                          className="btn danger"
                          onClick={() => deleteFaculty(f)}
                          disabled={actionBusyId === f.id}
                          aria-label={`Delete faculty member ${f.full_name}`}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
