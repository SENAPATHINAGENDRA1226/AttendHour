import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/AdminDashboard";
import FacultyDashboard from "./pages/faculty/FacultyDashboard";
import MarkAttendance from "./pages/faculty/MarkAttendance";
import FacultyRecords from "./pages/faculty/FacultyRecords";
import FacultyProfile from "./pages/faculty/FacultyProfile";
import MonthlyReport from "./pages/faculty/MonthlyReport";
import { initOutboxSync } from "./api/outbox";

function Protected({ role, children }: { role: "admin" | "faculty"; children: JSX.Element }) {
  const { auth } = useAuth();
  if (!auth) return <Navigate to="/login" replace />;
  if (role === "admin" && auth.role !== "admin") return <Navigate to="/faculty" replace />;
  return children;
}

export default function App() {
  const { auth } = useAuth();

  useEffect(() => {
    initOutboxSync();
  }, []);

  return (
    <Routes>
      <Route path="/login" element={auth ? <Navigate to={auth.role === "admin" ? "/admin" : "/faculty"} /> : <Login />} />
      <Route path="/admin" element={<Protected role="admin"><AdminDashboard /></Protected>} />
      <Route path="/admin/*" element={<Protected role="admin"><AdminDashboard /></Protected>} />
      
      <Route path="/faculty" element={<Protected role="faculty"><FacultyDashboard /></Protected>} />
      <Route path="/faculty/mark" element={<Protected role="faculty"><MarkAttendance /></Protected>} />
      <Route path="/faculty/records" element={<Protected role="faculty"><FacultyRecords /></Protected>} />
      <Route path="/faculty/profile" element={<Protected role="faculty"><FacultyProfile /></Protected>} />
      <Route path="/faculty/report" element={<Protected role="faculty"><MonthlyReport /></Protected>} />
      
      <Route path="*" element={<Navigate to={auth ? (auth.role === "admin" ? "/admin" : "/faculty") : "/login"} replace />} />
    </Routes>
  );
}
