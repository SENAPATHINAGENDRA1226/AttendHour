import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({ children }) => {
  const { auth, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isFaculty = auth?.role === "faculty";
  const isAdmin = auth?.role === "admin";

  // Auto-close sidebar on route change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  // Close sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSidebarOpen]);

  const handleSignOut = () => {
    logout();
    navigate("/login");
  };

  const getInitial = () => {
    if (auth?.fullName) return auth.fullName.charAt(0).toUpperCase();
    if (auth?.username) return auth.username.charAt(0).toUpperCase();
    return isFaculty ? "F" : "A";
  };

  const facultyNav = [
    { label: "Home", path: "/faculty", icon: "home" },
    { label: "Take Attendance", path: "/faculty/mark", icon: "fact_check" },
    { label: "Records", path: "/faculty/records", icon: "monitoring" },
    { label: "Monthly Report", path: "/faculty/report", icon: "summarize" },
    { label: "Profile", path: "/faculty/profile", icon: "account_circle" },
  ];

  const adminNav = [
    { label: "Dashboard", path: "/admin", icon: "dashboard" },
    { label: "Faculty", path: "/admin/faculty", icon: "groups" },
    { label: "Subjects", path: "/admin/subjects", icon: "menu_book" },
    { label: "Students", path: "/admin/students", icon: "school" },
    { label: "Sections", path: "/admin/sections", icon: "view_agenda" },
    { label: "Timetable", path: "/admin/timetable", icon: "calendar_month" },
    { label: "Reports", path: "/admin/reports", icon: "analytics" },
  ];

  const navItems = isFaculty ? facultyNav : isAdmin ? adminNav : [];

  return (
    <div className="app-layout">
      {/* Top Navigation Bar with 3 Horizontal Lines (Hamburger Menu) for Mobile & PWA */}
      <header className="mobile-topbar">
        <button
          className="hamburger-btn"
          aria-label="Toggle navigation menu"
          onClick={() => setIsSidebarOpen((prev) => !prev)}
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>

        <div className="mobile-brand">
          <span className="brand-name">HourLogix</span>
          <span className="brand-badge">{isFaculty ? "Faculty" : "Admin"}</span>
        </div>

        <div
          className="mobile-avatar"
          onClick={() => setIsSidebarOpen(true)}
          role="button"
          tabIndex={0}
          aria-label="Open profile"
        >
          {getInitial()}
        </div>
      </header>

      {/* Backdrop overlay for mobile drawer */}
      {isSidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Side Navigation Bar */}
      <aside className={`sidebar ${isSidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-profile">
          <div className="avatar-circle">{getInitial()}</div>
          <div className="sidebar-profile-info">
            <div className="name">{auth?.fullName || (isFaculty ? "Faculty Member" : "System Administrator")}</div>
            <div className="subtitle">
              {auth?.username ? `@${auth.username}` : (isFaculty ? "Faculty Portal" : "Admin Console")}
            </div>
          </div>
          <button
            className="sidebar-close-btn"
            aria-label="Close navigation"
            onClick={() => setIsSidebarOpen(false)}
          >
            ✕
          </button>
        </div>

        <nav className="sidebar-menu">
          {navItems.map((item) => {
            const isActive =
              item.path === "/admin" || item.path === "/faculty"
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-link ${isActive ? "active" : ""}`}
                onClick={() => setIsSidebarOpen(false)}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-link" onClick={handleSignOut}>
            <span className="material-symbols-outlined">logout</span>
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
};
