import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({ children }) => {
  const { auth, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isFaculty = auth?.role === "faculty";
  const isAdmin = auth?.role === "admin";

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
    { label: "Home", path: "/faculty", icon: "🏠" },
    { label: "Attendance", path: "/faculty/mark", icon: "📋" },
    { label: "Records", path: "/faculty/records", icon: "📊" },
    { label: "Profile", path: "/faculty/profile", icon: "👤" },
  ];

  const adminNav = [
    { label: "Dashboard", path: "/admin", icon: "📊" },
    { label: "Faculty", path: "/admin/faculty", icon: "👥" },
    { label: "Students", path: "/admin/students", icon: "🎓" },
    { label: "Sections", path: "/admin/sections", icon: "📅" },
    { label: "Timetable", path: "/admin/timetable", icon: "🕒" },
    { label: "Reports", path: "/admin/reports", icon: "📄" },
  ];

  const navItems = isFaculty ? facultyNav : isAdmin ? adminNav : [];

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-profile">
          <div className="avatar-circle">{getInitial()}</div>
          <div className="sidebar-profile-info">
            <div className="name">{auth?.fullName || (isFaculty ? "Faculty Member" : "System Administrator")}</div>
            <div className="subtitle">
              {auth?.username ? `@${auth.username}` : (isFaculty ? "Faculty Portal" : "Admin Console")}
            </div>
          </div>
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
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-link" onClick={handleSignOut}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M13 4h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
              <path d="M11 16l-4-4 4-4" />
              <path d="M7 12h10" />
            </svg>
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
};
