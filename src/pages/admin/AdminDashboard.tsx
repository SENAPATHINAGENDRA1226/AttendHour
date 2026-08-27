import { useLocation, useNavigate } from "react-router-dom";
import { SidebarLayout } from "../../components/SidebarLayout";
import AdminOverview from "./AdminOverview";
import FacultyManage from "./FacultyManage";
import SubjectsManage from "./SubjectsManage";
import ClassesManage from "./ClassesManage";
import StudentUpload from "./StudentUpload";
import TimetableManage from "./TimetableManage";
import AdminReports from "./AdminReports";

const TABS = [
  { key: "overview", label: "Dashboard", path: "/admin" },
  { key: "faculty", label: "Faculty", path: "/admin/faculty" },
  { key: "subjects", label: "Subjects", path: "/admin/subjects" },
  { key: "students", label: "Students", path: "/admin/students" },
  { key: "classes", label: "Sections", path: "/admin/sections" },
  { key: "timetable", label: "Timetable", path: "/admin/timetable" },
  { key: "reports", label: "Reports", path: "/admin/reports" },
] as const;

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromPath = (path: string) => {
    if (path.startsWith("/admin/faculty")) return "faculty";
    if (path.startsWith("/admin/subjects")) return "subjects";
    if (path.startsWith("/admin/students")) return "students";
    if (path.startsWith("/admin/sections") || path.startsWith("/admin/classes")) return "classes";
    if (path.startsWith("/admin/timetable")) return "timetable";
    if (path.startsWith("/admin/reports")) return "reports";
    return "overview";
  };

  const activeTab = getTabFromPath(location.pathname);

  const handleTabChange = (targetKey: string) => {
    const matched = TABS.find((t) => t.key === targetKey);
    if (matched) {
      navigate(matched.path);
    }
  };

  return (
    <SidebarLayout>
      {activeTab === "overview" && <AdminOverview onNavigateTab={(target) => handleTabChange(target)} />}
      {activeTab === "faculty" && <FacultyManage />}
      {activeTab === "subjects" && <SubjectsManage />}
      {activeTab === "classes" && <ClassesManage />}
      {activeTab === "students" && <StudentUpload />}
      {activeTab === "timetable" && <TimetableManage />}
      {activeTab === "reports" && <AdminReports />}
    </SidebarLayout>
  );
}

