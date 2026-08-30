import React, { useState, useEffect, useMemo } from "react";
import { api } from "../../api/client";
import { Section, ComprehensiveAttendanceRow, SubjectAttendanceStat } from "../../types";
import Spinner from "../../components/Spinner";
import ErrorBanner from "../../components/ErrorBanner";

// Standard Subject Order as specified in the College Attendance Report PDF
export const SUBJECT_COLUMNS = [
  { key: "MFAI", label: "MFAI" },
  { key: "JAVA", label: "JAVA" },
  { key: "FAI&ML", label: "FAI&ML" },
  { key: "CN", label: "CN" },
  { key: "UHV", label: "UHV" },
  { key: "JAVA Lab", label: "JAVA Lab" },
  { key: "Python Lab", label: "Python Lab" },
  { key: "PowerBI Lab", label: "PowerBI Lab" },
] as const;

type SortField = "s_no" | "roll_no" | "name" | "total_max" | "total_obtained" | "percentage" | string;
type SortOrder = "asc" | "desc";

interface Props {
  defaultSectionId?: number | string;
  isFacultyView?: boolean;
}

export default function CollegeAttendanceReport({ defaultSectionId, isFacultyView = false }: Props) {
  const [sections, setSections] = useState<Section[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [sectionsError, setSectionsError] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>(defaultSectionId ? String(defaultSectionId) : "");

  // Report Data
  const [reportRows, setReportRows] = useState<ComprehensiveAttendanceRow[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState("");

  // Metadata
  const [collegeName, setCollegeName] = useState("AVANTHI INSTITUTE OF ENGINEERING AND TECHNOLOGY");
  const [academicYear, setAcademicYear] = useState("2024-2025");
  const [semester, setSemester] = useState("II Year – I Semester");
  const [department, setDepartment] = useState("Department of Computer Science and Engineering (AI & ML)");
  const [sectionName, setSectionName] = useState("Section A");
  const [reportDate, setReportDate] = useState(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  });

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("ALL");
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<"ALL" | "SATISFACTORY" | "WARNING" | "CRITICAL">("ALL");

  // Sorting
  const [sortField, setSortField] = useState<SortField>("s_no");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Pagination
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Selected student for detail modal
  const [selectedStudent, setSelectedStudent] = useState<ComprehensiveAttendanceRow | null>(null);

  // Fetch sections
  async function loadSections() {
    setLoadingSections(true);
    setSectionsError("");
    try {
      const endpoint = isFacultyView ? "/faculty/options/sections" : "/admin/sections";
      const res = await api.get<Section[]>(endpoint);
      setSections(res.data);
      if (res.data.length > 0) {
        const targetId = selectedSectionId && res.data.some((s) => String(s.id) === selectedSectionId)
          ? selectedSectionId
          : String(res.data[0].id);
        setSelectedSectionId(targetId);
        const matchSec = res.data.find((s) => String(s.id) === targetId);
        if (matchSec) setSectionName(matchSec.display_name);
      }
    } catch (err: any) {
      setSectionsError(err?.response?.data?.detail || err?.message || "Failed to load sections.");
    } finally {
      setLoadingSections(false);
    }
  }

  useEffect(() => {
    loadSections();
  }, [isFacultyView]);

  // Load comprehensive report from backend
  async function fetchReport(secId: string) {
    if (!secId) return;
    setLoadingReport(true);
    setReportError("");
    try {
      const endpoint = isFacultyView ? "/faculty/report/comprehensive" : "/admin/reports/comprehensive";
      const res = await api.get(endpoint, { params: { section_id: secId } });
      if (res.data) {
        setReportRows(res.data.rows || []);
        if (res.data.college_name) setCollegeName(res.data.college_name);
        if (res.data.academic_year) setAcademicYear(res.data.academic_year);
        if (res.data.semester) setSemester(res.data.semester);
        if (res.data.department) setDepartment(res.data.department);
        if (res.data.year_section) setSectionName(res.data.year_section);
        if (res.data.report_date) setReportDate(res.data.report_date);
      }
    } catch (err: any) {
      setReportError(err?.response?.data?.detail || err?.message || "Failed to fetch comprehensive attendance report.");
    } finally {
      setLoadingReport(false);
    }
  }

  useEffect(() => {
    if (selectedSectionId) {
      fetchReport(selectedSectionId);
    }
  }, [selectedSectionId]);

  // Sorting helper
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Filter and sort rows
  const filteredAndSortedRows = useMemo(() => {
    let result = [...reportRows];

    // 1. Search Query (Roll number or Student Name)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) => r.roll_no.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
      );
    }

    // 2. Attendance Status Filter
    if (attendanceStatusFilter === "SATISFACTORY") {
      result = result.filter((r) => r.percentage >= 75.0);
    } else if (attendanceStatusFilter === "WARNING") {
      result = result.filter((r) => r.percentage >= 65.0 && r.percentage < 75.0);
    } else if (attendanceStatusFilter === "CRITICAL") {
      result = result.filter((r) => r.percentage < 65.0);
    }

    // 3. Sorting
    result.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortField === "s_no") {
        valA = a.s_no;
        valB = b.s_no;
      } else if (sortField === "roll_no") {
        valA = a.roll_no;
        valB = b.roll_no;
      } else if (sortField === "name") {
        valA = a.name;
        valB = b.name;
      } else if (sortField === "total_max") {
        valA = a.total_max;
        valB = b.total_max;
      } else if (sortField === "total_obtained") {
        valA = a.total_obtained;
        valB = b.total_obtained;
      } else if (sortField === "percentage") {
        valA = a.percentage;
        valB = b.percentage;
      } else if (sortField.startsWith("sub_")) {
        const subKey = sortField.replace("sub_", "");
        valA = a.subjects[subKey]?.percentage ?? 0;
        valB = b.subjects[subKey]?.percentage ?? 0;
      } else if (sortField === "crt") {
        valA = a.crt.percentage;
        valB = b.crt.percentage;
      } else if (sortField === "es") {
        valA = a.es.percentage;
        valB = b.es.percentage;
      }

      if (typeof valA === "string") {
        return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === "asc" ? valA - valB : valB - valA;
    });

    return result;
  }, [reportRows, searchQuery, attendanceStatusFilter, sortField, sortOrder]);

  // Paginated Rows
  const totalItems = filteredAndSortedRows.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedRows.slice(start, start + pageSize);
  }, [filteredAndSortedRows, currentPage, pageSize]);

  // Export to Excel / CSV with exact multi-level columns
  const handleExportExcel = () => {
    const headerRow1 = [
      "S.NO",
      "Roll Number",
      "Name of the Student",
      "MFAI Held",
      "MFAI Attended",
      "JAVA Held",
      "JAVA Attended",
      "FAI&ML Held",
      "FAI&ML Attended",
      "CN Held",
      "CN Attended",
      "UHV Held",
      "UHV Attended",
      "JAVA Lab Held",
      "JAVA Lab Attended",
      "Python Lab Held",
      "Python Lab Attended",
      "PowerBI Lab Held",
      "PowerBI Lab Attended",
      "CRT Held",
      "CRT Attended",
      "ES Held",
      "ES Attended",
      "Total Maximum",
      "Total Obtained",
      "Overall %",
    ];

    const csvLines = [
      `"ATTENDANCE REPORT - ${collegeName}"`,
      `"Academic Year: ${academicYear}","Semester: ${semester}","Department: ${department}","Section: ${sectionName}","Date: ${reportDate}"`,
      "",
      headerRow1.map((h) => `"${h}"`).join(","),
    ];

    filteredAndSortedRows.forEach((r) => {
      const line = [
        r.s_no,
        `"${r.roll_no}"`,
        `"${r.name}"`,
        r.subjects["MFAI"]?.held ?? 0,
        r.subjects["MFAI"]?.attended ?? 0,
        r.subjects["JAVA"]?.held ?? 0,
        r.subjects["JAVA"]?.attended ?? 0,
        r.subjects["FAI&ML"]?.held ?? 0,
        r.subjects["FAI&ML"]?.attended ?? 0,
        r.subjects["CN"]?.held ?? 0,
        r.subjects["CN"]?.attended ?? 0,
        r.subjects["UHV"]?.held ?? 0,
        r.subjects["UHV"]?.attended ?? 0,
        r.subjects["JAVA Lab"]?.held ?? 0,
        r.subjects["JAVA Lab"]?.attended ?? 0,
        r.subjects["Python Lab"]?.held ?? 0,
        r.subjects["Python Lab"]?.attended ?? 0,
        r.subjects["PowerBI Lab"]?.held ?? 0,
        r.subjects["PowerBI Lab"]?.attended ?? 0,
        r.crt?.held ?? 0,
        r.crt?.attended ?? 0,
        r.es?.held ?? 0,
        r.es?.attended ?? 0,
        r.total_max.toFixed(1),
        r.total_obtained.toFixed(1),
        `${r.percentage.toFixed(1)}%`,
      ];
      csvLines.push(line.join(","));
    });

    const blob = new Blob([csvLines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Attendance_Report_${sectionName.replace(/\s+/g, "_")}_${academicYear}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handlePrint = () => {
    window.print();
  };

  const getPercentageClass = (pct: number) => {
    if (pct >= 75.0) return "satisfactory";
    if (pct >= 65.0) return "warning";
    return "critical";
  };

  return (
    <div className="pdf-report-page">
      {sectionsError && <ErrorBanner message={sectionsError} onRetry={loadSections} />}
      {reportError && <ErrorBanner message={reportError} onRetry={() => fetchReport(selectedSectionId)} />}

      {/* 1. FILTER & CONTROL BAR */}
      <div className="pdf-filter-panel">
        <div className="pdf-filter-row">
          <div className="pdf-filter-group" style={{ minWidth: 120 }}>
            <label>Academic Year</label>
            <select
              className="pdf-filter-select"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
            >
              <option value="2024-2025">2024–2025</option>
              <option value="2025-2026">2025–2026</option>
              <option value="2023-2024">2023–2024</option>
            </select>
          </div>

          <div className="pdf-filter-group" style={{ minWidth: 140 }}>
            <label>Semester</label>
            <select
              className="pdf-filter-select"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
            >
              <option value="I Year – I Semester">I Year – I Semester</option>
              <option value="I Year – II Semester">I Year – II Semester</option>
              <option value="II Year – I Semester">II Year – I Semester</option>
              <option value="II Year – II Semester">II Year – II Semester</option>
              <option value="III Year – I Semester">III Year – I Semester</option>
              <option value="IV Year – I Semester">IV Year – I Semester</option>
            </select>
          </div>

          <div className="pdf-filter-group" style={{ minWidth: 180 }}>
            <label>Department</label>
            <select
              className="pdf-filter-select"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="Department of Computer Science and Engineering (AI & ML)">CSE (AI & ML)</option>
              <option value="Department of Computer Science and Engineering">CSE</option>
              <option value="Department of Information Technology">Information Technology</option>
              <option value="Department of Electronics and Communication">ECE</option>
            </select>
          </div>

          <div className="pdf-filter-group" style={{ minWidth: 130 }}>
            <label>Section</label>
            <select
              className="pdf-filter-select"
              value={selectedSectionId}
              onChange={(e) => {
                setSelectedSectionId(e.target.value);
                const s = sections.find((sec) => String(sec.id) === e.target.value);
                if (s) setSectionName(s.display_name);
              }}
              disabled={loadingSections || loadingReport}
            >
              {loadingSections ? (
                <option value="">Loading sections…</option>
              ) : sections.length > 0 ? (
                sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.display_name}
                  </option>
                ))
              ) : (
                <option value="">No sections available</option>
              )}
            </select>
          </div>

          <div className="pdf-filter-group" style={{ minWidth: 180, flex: 2 }}>
            <label>Search Student</label>
            <input
              type="text"
              className="pdf-filter-input"
              placeholder="Search by Name or Roll Number…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="pdf-filter-group" style={{ minWidth: 130 }}>
            <label>Subject View</label>
            <select
              className="pdf-filter-select"
              value={selectedSubjectFilter}
              onChange={(e) => {
                setSelectedSubjectFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="ALL">All Subjects (Full PDF)</option>
              {SUBJECT_COLUMNS.map((sub) => (
                <option key={sub.key} value={sub.key}>
                  {sub.label}
                </option>
              ))}
            </select>
          </div>

          <div className="pdf-filter-group" style={{ minWidth: 130 }}>
            <label>Attendance Status</label>
            <select
              className="pdf-filter-select"
              value={attendanceStatusFilter}
              onChange={(e) => {
                setAttendanceStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="SATISFACTORY">Satisfactory (≥ 75%)</option>
              <option value="WARNING">Warning (65% – 74.9%)</option>
              <option value="CRITICAL">Critical (&lt; 65%)</option>
            </select>
          </div>
        </div>

        {/* Action Buttons & Status Legend */}
        <div className="pdf-actions-row">
          <div className="pdf-status-legend">
            <span>Status:</span>
            <span className="legend-chip satisfactory">≥ 75% Satisfactory</span>
            <span className="legend-chip warning">65%–74.99% Warning</span>
            <span className="legend-chip critical">&lt; 65% Critical</span>
          </div>

          {!isFacultyView ? (
            <div className="pdf-action-buttons">
              <button
                className="pdf-btn"
                onClick={handleExportExcel}
                disabled={reportRows.length === 0}
                title="Export full report as Excel / CSV"
              >
                📊 Export Excel
              </button>
              <button
                className="pdf-btn"
                onClick={handlePrint}
                disabled={reportRows.length === 0}
                title="Export as PDF / Print preview"
              >
                📄 Export PDF
              </button>
              <button
                className="pdf-btn primary"
                onClick={handlePrint}
                disabled={reportRows.length === 0}
                title="Print Attendance Register"
              >
                🖨️ Print Report
              </button>
            </div>
          ) : (
            <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--ink-muted)" }}>lock</span>
              Official report exports &amp; printouts are restricted to Administrator access.
            </div>
          )}
        </div>
      </div>

      {loadingReport && <Spinner label="Loading official college attendance data from database…" />}

      {/* 2. OFFICIAL REPORT CARD */}
      {!loadingReport && (
        <div className="pdf-report-card">
          {/* Official Report Header */}
          <div className="pdf-official-header">
            <h2 className="pdf-college-title">{collegeName}</h2>
            <h3 className="pdf-report-title">ATTENDANCE REPORT</h3>
            
            <div className="pdf-meta-grid">
              <div className="pdf-meta-item">
                <span className="label">Department:</span>
                <span className="value">{department}</span>
              </div>
              <div className="pdf-meta-item">
                <span className="label">Academic Year:</span>
                <span className="value">{academicYear}</span>
              </div>
              <div className="pdf-meta-item">
                <span className="label">Class & Sem:</span>
                <span className="value">B.Tech {semester}</span>
              </div>
              <div className="pdf-meta-item">
                <span className="label">Section:</span>
                <span className="value">{sectionName}</span>
              </div>
              <div className="pdf-meta-item">
                <span className="label">Date:</span>
                <span className="value">{reportDate}</span>
              </div>
            </div>
          </div>

          {/* 3. MAIN TABLE (Exact Multi-Level Column Hierarchy) */}
          {selectedSubjectFilter === "ALL" ? (
            <div className="pdf-table-wrapper">
              <table className="pdf-sheet-table">
                <thead>
                  {/* ROW 1: Subject Groups & Spanning Headers */}
                  <tr className="top-header-row">
                    <th rowSpan={2} className="pdf-col-sno" onClick={() => handleSort("s_no")} style={{ cursor: "pointer" }}>
                      S.NO {sortField === "s_no" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                    </th>
                    <th rowSpan={2} className="pdf-col-roll" onClick={() => handleSort("roll_no")} style={{ cursor: "pointer" }}>
                      Roll Number {sortField === "roll_no" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                    </th>
                    <th rowSpan={2} className="pdf-col-name" onClick={() => handleSort("name")} style={{ cursor: "pointer" }}>
                      Name of the Student {sortField === "name" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                    </th>

                    {/* 8 Core Subject Groups */}
                    {SUBJECT_COLUMNS.map((sub) => (
                      <th
                        key={sub.key}
                        colSpan={2}
                        className="th-subject"
                        onClick={() => handleSort(`sub_${sub.key}`)}
                        style={{ cursor: "pointer" }}
                        title={`Click to sort by ${sub.label} percentage`}
                      >
                        {sub.label}
                      </th>
                    ))}

                    {/* CRT */}
                    <th
                      colSpan={2}
                      className="th-summary"
                      onClick={() => handleSort("crt")}
                      style={{ cursor: "pointer" }}
                      title="Click to sort by CRT percentage"
                    >
                      CRT
                    </th>

                    {/* ES */}
                    <th
                      colSpan={2}
                      className="th-summary"
                      onClick={() => handleSort("es")}
                      style={{ cursor: "pointer" }}
                      title="Click to sort by ES percentage"
                    >
                      ES
                    </th>

                    {/* TOTAL */}
                    <th
                      colSpan={2}
                      className="th-total"
                      onClick={() => handleSort("total_obtained")}
                      style={{ cursor: "pointer" }}
                      title="Click to sort by Total Obtained"
                    >
                      TOTAL
                    </th>

                    {/* Overall % */}
                    <th
                      rowSpan={2}
                      className="th-pct"
                      onClick={() => handleSort("percentage")}
                      style={{ cursor: "pointer", minWidth: 60 }}
                      title="Click to sort by Overall Percentage"
                    >
                      % {sortField === "percentage" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                    </th>
                  </tr>

                  {/* ROW 2: Held | Attended Subcolumns */}
                  <tr className="sub-header-row">
                    {/* Subject Subcolumns */}
                    {SUBJECT_COLUMNS.map((sub) => (
                      <React.Fragment key={sub.key}>
                        <th>Held</th>
                        <th className="group-end">Attended</th>
                      </React.Fragment>
                    ))}

                    {/* CRT Subcolumns */}
                    <th>Held</th>
                    <th className="group-end">Attended</th>

                    {/* ES Subcolumns */}
                    <th>Held</th>
                    <th className="group-end">Attended</th>

                    {/* TOTAL Subcolumns */}
                    <th>Maximum</th>
                    <th className="group-end">Obtained</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedRows.length > 0 ? (
                    paginatedRows.map((row) => (
                      <tr
                        key={row.student_id}
                        className="clickable-row"
                        onClick={() => setSelectedStudent(row)}
                        title="Click row to view detailed student breakdown"
                      >
                        {/* Sticky 1: S.NO */}
                        <td className="pdf-col-sno num-cell">{row.s_no}</td>

                        {/* Sticky 2: Roll Number */}
                        <td className="pdf-col-roll">{row.roll_no}</td>

                        {/* Sticky 3: Name */}
                        <td className="pdf-col-name">{row.name}</td>

                        {/* 8 Subjects: Held | Attended */}
                        {SUBJECT_COLUMNS.map((sub) => {
                          const stat: SubjectAttendanceStat = row.subjects[sub.key] || { held: 0, attended: 0, percentage: 0 };
                          return (
                            <React.Fragment key={sub.key}>
                              <td className="num-cell">{stat.held}</td>
                              <td className="num-cell group-end">{stat.attended}</td>
                            </React.Fragment>
                          );
                        })}

                        {/* CRT: Held | Attended */}
                        <td className="num-cell">{row.crt?.held ?? 0}</td>
                        <td className="num-cell group-end">{row.crt?.attended ?? 0}</td>

                        {/* ES: Held | Attended */}
                        <td className="num-cell">{row.es?.held ?? 0}</td>
                        <td className="num-cell group-end">{row.es?.attended ?? 0}</td>

                        {/* TOTAL: Maximum | Obtained */}
                        <td className="num-cell total-cell">{row.total_max.toFixed(1)}</td>
                        <td className="num-cell total-cell group-end">{row.total_obtained.toFixed(1)}</td>

                        {/* Overall % */}
                        <td className="pdf-pct-cell">
                          <span className={`pct-badge ${getPercentageClass(row.percentage)}`}>
                            {row.percentage.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={26} style={{ textAlign: "center", padding: "32px 16px", color: "#64748b", fontWeight: 500 }}>
                        {selectedSectionId
                          ? "No attendance records found for this section in the database."
                          : "Please select a section above to view the attendance report."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* 4. SUBJECT-WISE DRILLDOWN MODE */
            <div className="pdf-table-wrapper">
              <div style={{ padding: "8px 12px", background: "#f1f5f9", fontWeight: 700, fontSize: "0.85rem", borderBottom: "1px solid #cbd5e1" }}>
                Focused Subject Report: <span style={{ color: "#0f172a", textDecoration: "underline" }}>{selectedSubjectFilter}</span>
              </div>
              <table className="subject-single-table">
                <thead>
                  <tr>
                    <th style={{ width: 50, textAlign: "center" }}>S.NO</th>
                    <th style={{ width: 130, textAlign: "center" }}>Roll Number</th>
                    <th style={{ textAlign: "left" }}>Name of the Student</th>
                    <th style={{ width: 110, textAlign: "center" }}>Classes Held</th>
                    <th style={{ width: 130, textAlign: "center" }}>Classes Attended</th>
                    <th
                      style={{ width: 100, textAlign: "center", cursor: "pointer" }}
                      onClick={() => handleSort(`sub_${selectedSubjectFilter}`)}
                    >
                      % {sortField === `sub_${selectedSubjectFilter}` ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                    </th>
                    <th style={{ width: 130, textAlign: "center" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.length > 0 ? (
                    paginatedRows.map((r) => {
                      const stat = r.subjects[selectedSubjectFilter] || { held: 0, attended: 0, percentage: 0 };
                      const statusClass = getPercentageClass(stat.percentage);
                      return (
                        <tr
                          key={r.student_id}
                          className="clickable-row"
                          onClick={() => setSelectedStudent(r)}
                          style={{ cursor: "pointer" }}
                        >
                          <td style={{ textAlign: "center" }}>{r.s_no}</td>
                          <td style={{ textAlign: "center", fontFamily: "monospace", fontWeight: 600 }}>{r.roll_no}</td>
                          <td style={{ fontWeight: 600 }}>{r.name}</td>
                          <td style={{ textAlign: "center" }}>{stat.held}</td>
                          <td style={{ textAlign: "center" }}>{stat.attended}</td>
                          <td style={{ textAlign: "center", fontWeight: 700 }}>{stat.percentage.toFixed(1)}%</td>
                          <td style={{ textAlign: "center" }}>
                            <span className={`pct-badge ${statusClass}`}>
                              {statusClass === "satisfactory" ? "Satisfactory" : statusClass === "warning" ? "Warning" : "Critical"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "32px 16px", color: "#64748b" }}>
                        No records found for {selectedSubjectFilter}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 5. PAGINATION CONTROLS */}
          {filteredAndSortedRows.length > 0 && (
            <div className="pdf-pagination">
              <div>
                Showing <strong>{paginatedRows.length}</strong> of <strong>{totalItems}</strong> students (
                {filteredAndSortedRows.filter((r) => r.percentage >= 75).length} Satisfactory,{" "}
                {filteredAndSortedRows.filter((r) => r.percentage >= 65 && r.percentage < 75).length} Warning,{" "}
                {filteredAndSortedRows.filter((r) => r.percentage < 65).length} Critical)
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>
                  Per Page:
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    style={{ marginLeft: 4, padding: "2px 4px", fontSize: "0.75rem" }}
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={1000}>All</option>
                  </select>
                </label>

                <div className="pdf-page-buttons">
                  <button
                    className="pdf-page-btn"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    ◀ Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                    .map((p, idx, arr) => (
                      <React.Fragment key={p}>
                        {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ padding: "0 2px" }}>…</span>}
                        <button
                          className={`pdf-page-btn ${currentPage === p ? "active" : ""}`}
                          onClick={() => setCurrentPage(p)}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    ))}
                  <button
                    className="pdf-page-btn"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    Next ▶
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. STUDENT DETAILS MODAL */}
      {selectedStudent && (
        <div className="pdf-modal-backdrop" onClick={() => setSelectedStudent(null)}>
          <div className="pdf-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="pdf-modal-header">
              <h3 className="pdf-modal-title">Student Attendance Breakdown</h3>
              <button className="pdf-modal-close" onClick={() => setSelectedStudent(null)}>
                ✕
              </button>
            </div>

            <div className="pdf-modal-body">
              <div className="student-info-box">
                <div>
                  <div className="field-label">Student Name</div>
                  <div className="field-value">{selectedStudent.name}</div>
                </div>
                <div>
                  <div className="field-label">Roll Number</div>
                  <div className="field-value" style={{ fontFamily: "monospace" }}>
                    {selectedStudent.roll_no}
                  </div>
                </div>
                <div>
                  <div className="field-label">Section & Sem</div>
                  <div className="field-value">
                    {sectionName} ({semester})
                  </div>
                </div>
                <div>
                  <div className="field-label">Overall Attendance</div>
                  <div className="field-value">
                    <span className={`pct-badge ${getPercentageClass(selectedStudent.percentage)}`}>
                      {selectedStudent.percentage.toFixed(1)}% (
                      {selectedStudent.percentage >= 75
                        ? "Satisfactory"
                        : selectedStudent.percentage >= 65
                        ? "Warning"
                        : "Critical"}
                      )
                    </span>
                  </div>
                </div>
              </div>

              <table className="student-breakdown-table">
                <thead>
                  <tr>
                    <th>Subject / Lab Name</th>
                    <th style={{ width: 80 }}>Held</th>
                    <th style={{ width: 80 }}>Attended</th>
                    <th style={{ width: 80 }}>%</th>
                    <th style={{ width: 100 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {SUBJECT_COLUMNS.map((sub) => {
                    const stat = selectedStudent.subjects[sub.key] || { held: 0, attended: 0, percentage: 0 };
                    const cls = getPercentageClass(stat.percentage);
                    return (
                      <tr key={sub.key}>
                        <td style={{ fontWeight: 600 }}>{sub.label}</td>
                        <td style={{ textAlign: "center" }}>{stat.held}</td>
                        <td style={{ textAlign: "center" }}>{stat.attended}</td>
                        <td style={{ textAlign: "center", fontWeight: 700 }}>{stat.percentage.toFixed(1)}%</td>
                        <td style={{ textAlign: "center" }}>
                          <span className={`pct-badge ${cls}`}>
                            {cls === "satisfactory" ? "Eligible" : cls === "warning" ? "Warning" : "Shortage"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td style={{ fontWeight: 600 }}>CRT (Campus Recruitment Training)</td>
                    <td style={{ textAlign: "center" }}>{selectedStudent.crt?.held ?? 0}</td>
                    <td style={{ textAlign: "center" }}>{selectedStudent.crt?.attended ?? 0}</td>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>
                      {selectedStudent.crt?.percentage.toFixed(1) ?? "0.0"}%
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`pct-badge ${getPercentageClass(selectedStudent.crt?.percentage ?? 0)}`}>
                        {getPercentageClass(selectedStudent.crt?.percentage ?? 0) === "satisfactory"
                          ? "Good"
                          : "Low"}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>ES (Environmental Science)</td>
                    <td style={{ textAlign: "center" }}>{selectedStudent.es?.held ?? 0}</td>
                    <td style={{ textAlign: "center" }}>{selectedStudent.es?.attended ?? 0}</td>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>
                      {selectedStudent.es?.percentage.toFixed(1) ?? "0.0"}%
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`pct-badge ${getPercentageClass(selectedStudent.es?.percentage ?? 0)}`}>
                        {getPercentageClass(selectedStudent.es?.percentage ?? 0) === "satisfactory"
                          ? "Good"
                          : "Low"}
                      </span>
                    </td>
                  </tr>
                  <tr className="total-row">
                    <td>TOTAL OVERALL ATTENDANCE</td>
                    <td style={{ textAlign: "center" }}>{selectedStudent.total_max.toFixed(1)}</td>
                    <td style={{ textAlign: "center" }}>{selectedStudent.total_obtained.toFixed(1)}</td>
                    <td style={{ textAlign: "center", color: "#0f172a" }}>{selectedStudent.percentage.toFixed(1)}%</td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`pct-badge ${getPercentageClass(selectedStudent.percentage)}`}>
                        {selectedStudent.percentage >= 75 ? "Satisfactory" : selectedStudent.percentage >= 65 ? "Warning" : "Critical"}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                <button className="pdf-btn" onClick={() => setSelectedStudent(null)}>
                  Close
                </button>
                <button className="pdf-btn primary" onClick={() => window.print()}>
                  🖨️ Print Student Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
