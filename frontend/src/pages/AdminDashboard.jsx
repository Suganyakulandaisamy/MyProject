import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api";

const defaultDepartments = ["All Departments", "CSE", "ECE", "IT", "EEE"];

const emptyEdit = {
  id: "",
  name: "",
  department: "",
  subject: "",
  semester: "",
  academic_year: "",
  pass_percentage: ""
};

export default function AdminDashboard() {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({
    total_faculty: 0,
    average_pass_percentage: null,
    average_rating: null,
    department_summary: [],
    top_faculty: null
  });
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All Departments");
  const [semesterFilter, setSemesterFilter] = useState("All Semesters");
  const [yearFilter, setYearFilter] = useState("All Years");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    department: "",
    subject: "",
    semester: "",
    academic_year: "",
    pass_percentage: ""
  });
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(emptyEdit);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyBase, setHistoryBase] = useState(null);
  const [historySemester, setHistorySemester] = useState("All Semesters");
  const [historyYear, setHistoryYear] = useState("All Years");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const historySemesterOptions = useMemo(() => {
    const dynamic = historyRows
      .map((row) => row.semester)
      .filter(Boolean)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    return Array.from(new Set(["All Semesters", ...dynamic]));
  }, [historyRows]);

  const historyYearOptions = useMemo(() => {
    const dynamic = historyRows
      .map((row) => row.academic_year)
      .filter(Boolean)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    return Array.from(new Set(["All Years", ...dynamic]));
  }, [historyRows]);

  const departmentOptions = useMemo(() => {
    const dynamic = rows
      .map((row) => row.department)
      .filter(Boolean)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    const merged = Array.from(new Set([...defaultDepartments, ...dynamic]));
    return merged;
  }, [rows]);

  const semesterOptions = useMemo(() => {
    const dynamic = rows
      .map((row) => row.semester)
      .filter(Boolean)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    return Array.from(new Set(["All Semesters", ...dynamic]));
  }, [rows]);

  const yearOptions = useMemo(() => {
    const dynamic = rows
      .map((row) => row.academic_year)
      .filter(Boolean)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    return Array.from(new Set(["All Years", ...dynamic]));
  }, [rows]);

  const loadRows = async (currentSearch, currentDepartment, currentSemester, currentYear, currentPage) => {
    setError("");
    try {
      const params = new URLSearchParams();
      if (currentSearch && currentSearch.trim()) {
        params.set("search", currentSearch.trim());
      }
      if (currentDepartment && currentDepartment !== "All Departments") {
        params.set("department", currentDepartment);
      }
      if (currentSemester && currentSemester !== "All Semesters") {
        params.set("semester", currentSemester);
      }
      if (currentYear && currentYear !== "All Years") {
        params.set("academic_year", currentYear);
      }
      params.set("page", String(currentPage));
      params.set("limit", "10");
      const query = params.toString();
      const data = await apiRequest(`/faculty/list?${query}`);
      setRows(data.data || []);
      const newTotalPages = data.totalPages || 1;
      setTotalPages(newTotalPages);
      setTotalCount(data.totalCount || 0);
      if (currentPage > newTotalPages) {
        setPage(newTotalPages);
      }
    } catch (err) {
      setError(err.message || "Failed to load faculty data");
    }
  };

  const loadStats = async () => {
    try {
      const data = await apiRequest("/faculty/stats");
      setStats(data);
    } catch (err) {
      setError(err.message || "Failed to load dashboard statistics");
    }
  };

  const loadNotifications = async () => {
    try {
      const data = await apiRequest("/notifications?limit=10");
      setNotifications(data.items || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      setError(err.message || "Failed to load notifications");
    }
  };

  useEffect(() => {
    const handle = setTimeout(() => {
      loadRows(search, department, semesterFilter, yearFilter, page);
    }, 300);
    return () => clearTimeout(handle);
  }, [search, department, semesterFilter, yearFilter, page]);

  useEffect(() => {
    setPage(1);
  }, [search, department, semesterFilter, yearFilter]);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadRows(search, department, semesterFilter, yearFilter, page);
      loadStats();
      loadNotifications();
    }, 15000);
    return () => clearInterval(interval);
  }, [search, department, semesterFilter, yearFilter, page]);

  const startEdit = (row) => {
    setNotice("");
    setEditing(row.id);
    setEditForm({
      id: row.id,
      name: row.name || "",
      department: row.department || "",
      subject: row.subject || "",
      semester: row.semester || "",
      academic_year: row.academic_year || "",
      pass_percentage: row.pass_percentage ?? "",
    });
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditForm(emptyEdit);
  };

  const handleEditChange = (event) => {
    setEditForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (
      !editForm.name.trim() ||
      !editForm.department.trim() ||
      !editForm.subject.trim() ||
      !editForm.semester.trim() ||
      !editForm.academic_year.trim() ||
      editForm.pass_percentage === ""
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    const payload = {
      id: editForm.id,
      name: editForm.name.trim(),
      department: editForm.department.trim(),
      subject: editForm.subject.trim(),
      semester: editForm.semester.trim(),
      academic_year: editForm.academic_year.trim(),
      pass_percentage: Number(editForm.pass_percentage)
    };

    try {
      await apiRequest("/faculty/update", {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      setNotice("Faculty record updated.");
      cancelEdit();
      await loadRows(search, department, semesterFilter, yearFilter, page);
      await loadStats();
    } catch (err) {
      setError(err.message || "Failed to update faculty data");
    }
  };

  const handleDelete = async (row) => {
    const confirmed = window.confirm(`Delete faculty record for ${row.name}?`);
    if (!confirmed) return;
    setError("");
    setNotice("");
    try {
      await apiRequest(`/faculty/delete/${row.id}`, { method: "DELETE" });
      setNotice("Faculty record deleted.");
      await loadRows(search, department, semesterFilter, yearFilter, page);
      await loadStats();
    } catch (err) {
      setError(err.message || "Failed to delete faculty data");
    }
  };

  const handleAddChange = (event) => {
    setAddForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const submitAdd = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (
      !addForm.name.trim() ||
      !addForm.department.trim() ||
      !addForm.subject.trim() ||
      !addForm.semester.trim() ||
      !addForm.academic_year.trim() ||
      addForm.pass_percentage === ""
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    const payload = {
      name: addForm.name.trim(),
      department: addForm.department.trim(),
      subject: addForm.subject.trim(),
      semester: addForm.semester.trim(),
      academic_year: addForm.academic_year.trim(),
      pass_percentage: Number(addForm.pass_percentage)
    };

    try {
      await apiRequest("/faculty/add", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setNotice("Faculty record added.");
      setAddForm({
        name: "",
        department: "",
        subject: "",
        semester: "",
        academic_year: "",
        pass_percentage: ""
      });
      setShowAdd(false);
      setPage(1);
      await loadRows(search, department, semesterFilter, yearFilter, 1);
      await loadStats();
    } catch (err) {
      setError(err.message || "Failed to add faculty data");
    }
  };

  const downloadCsv = async () => {
    try {
      const csv = await apiRequest("/reports?format=csv");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "aaqap-report.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Failed to download report");
    }
  };

  useEffect(() => {
    if (!historyOpen || !historyBase) return;
    loadHistory(historyBase, historySemester, historyYear);
  }, [historyOpen, historyBase, historySemester, historyYear]);

  const downloadDepartmentCsv = async () => {
    try {
      const csv = await apiRequest("/reports/departments?format=csv");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "aaqap-department-summary.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Failed to download department summary");
    }
  };

  const openHistory = async (row) => {
    setError("");
    setHistoryBase(row);
    setHistorySemester("All Semesters");
    setHistoryYear("All Years");
    setHistoryOpen(true);
    try {
      const data = await apiRequest(`/faculty/history/${row.id}`);
      setHistoryRows(data);
    } catch (err) {
      setError(err.message || "Failed to load faculty history");
    }
  };

  const loadHistory = async (baseRow, semesterValue, yearValue) => {
    if (!baseRow) return;
    const params = new URLSearchParams();
    if (semesterValue && semesterValue !== "All Semesters") {
      params.set("semester", semesterValue);
    }
    if (yearValue && yearValue !== "All Years") {
      params.set("academic_year", yearValue);
    }
    const query = params.toString();
    const data = await apiRequest(
      `/faculty/history/${baseRow.id}${query ? `?${query}` : ""}`
    );
    setHistoryRows(data);
  };

  const formatNumber = (value) => {
    if (value === null || value === undefined) return "-";
    return Number(value).toFixed(2);
  };

  const formatNotificationTime = (value) => {
    if (!value) return "";
    const created = new Date(value);
    const now = new Date();
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    const isToday =
      created.getDate() === now.getDate() &&
      created.getMonth() === now.getMonth() &&
      created.getFullYear() === now.getFullYear();
    const time = created.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (isToday) return `Today ${time}`;
    return created.toLocaleDateString() + " " + time;
  };

  const clearAllNotifications = async () => {
    try {
      await apiRequest("/notifications", { method: "DELETE" });
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      setError(err.message || "Failed to clear notifications");
    }
  };

  return (
    <div className="stack">
      <div className="toolbar">
        <div>
          <h2>Faculty Management</h2>
          <p className="subtle">Search, filter, and maintain faculty records.</p>
        </div>
        <div className="actions">
          <div className="notification-wrap">
            <button
              className="ghost"
              type="button"
              onClick={() => {
                const next = !notificationsOpen;
                setNotificationsOpen(next);
                if (next) {
                  loadNotifications();
                }
              }}
            >
              <span className="bell">🔔</span>
              {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
            </button>
            {notificationsOpen && (
              <div className="notification-menu">
                <div className="notification-header">
                  <p className="subtle">Notifications</p>
                  <button className="ghost small" type="button" onClick={clearAllNotifications}>
                    Clear All
                  </button>
                </div>
                <div className="notification-list">
                  {notifications.length === 0 ? (
                    <p className="subtle">No new notifications</p>
                  ) : (
                    notifications.map((note) => (
                      <div key={note.id} className="notification-item">
                        {note.message} - {formatNotificationTime(note.createdAt)}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <button className="ghost" onClick={downloadDepartmentCsv}>
            Export Department Summary
          </button>
          <button className="primary" onClick={downloadCsv}>
            Download CSV
          </button>
        </div>
      </div>

      <div className="stats">
        <div className="stat-card">
          <p className="subtle">Total Faculty</p>
          <h3>{stats.total_faculty}</h3>
        </div>
        <div className="stat-card">
          <p className="subtle">Average Pass %</p>
          <h3>{formatNumber(stats.average_pass_percentage)}</h3>
        </div>
        <div className="stat-card">
          <p className="subtle">Average Rating</p>
          <h3>{formatNumber(stats.average_rating)}</h3>
        </div>
        <div className="stat-card">
          <p className="subtle">Top Performing Faculty</p>
          {stats.top_faculty ? (
            <div className="stack">
              <h3>{stats.top_faculty.name}</h3>
              <p className="subtle">
                {stats.top_faculty.department} - {stats.top_faculty.subject}
              </p>
              <p className="subtle">Avg Rating: {formatNumber(stats.top_faculty.avg_rating)}</p>
            </div>
          ) : (
            <p className="subtle">Pending</p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <div>
            <h3>Department Performance</h3>
            <p className="subtle">Average pass percentage by department.</p>
          </div>
        </div>
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Department</th>
                <th>Average Pass %</th>
                <th>Total Records</th>
              </tr>
            </thead>
            <tbody>
              {stats.department_summary.map((row) => (
                <tr key={row.department}>
                  <td>{row.department}</td>
                  <td>{formatNumber(row.average_pass_percentage)}</td>
                  <td>{row.total_records}</td>
                </tr>
              ))}
              {stats.department_summary.length === 0 && (
                <tr>
                  <td colSpan="3" className="empty">
                    No department data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="filters card">
        <label>
          Search Faculty
          <input
            placeholder="Search by name, department, or subject"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          Department
          <select value={department} onChange={(event) => setDepartment(event.target.value)}>
            {departmentOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Semester
          <select
            value={semesterFilter}
            onChange={(event) => setSemesterFilter(event.target.value)}
          >
            {semesterOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Academic Year
          <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
            {yearOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      {editing && (
        <form className="card" onSubmit={submitEdit}>
          <div>
            <h3>Edit Faculty Details</h3>
            <p className="subtle">Update teaching data.</p>
          </div>
          <label>
            Faculty Name
            <input name="name" value={editForm.name} onChange={handleEditChange} required />
          </label>
          <label>
            Department
            <input
              name="department"
              value={editForm.department}
              onChange={handleEditChange}
              required
            />
          </label>
          <label>
            Subject
            <input name="subject" value={editForm.subject} onChange={handleEditChange} required />
          </label>
          <label>
            Semester
            <input
              name="semester"
              value={editForm.semester}
              onChange={handleEditChange}
              placeholder="e.g., Semester 5"
              required
            />
          </label>
          <label>
            Academic Year
            <input
              name="academic_year"
              value={editForm.academic_year}
              onChange={handleEditChange}
              placeholder="e.g., 2024-2025"
              required
            />
          </label>
          <label>
            Pass Percentage
            <input
              name="pass_percentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={editForm.pass_percentage}
              onChange={handleEditChange}
              required
            />
          </label>
          <div className="actions">
            <button className="primary" type="submit">
              Save Changes
            </button>
            <button className="ghost" type="button" onClick={cancelEdit}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <p className="error">{error}</p>}
      {notice && <p className="success">{notice}</p>}

      {showAdd && (
        <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
          <div
            className="modal card"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div>
              <h3>Add Faculty</h3>
              <p className="subtle">Create a new faculty record.</p>
            </div>
            <form className="stack" onSubmit={submitAdd}>
              <label>
                Faculty Name
                <input name="name" value={addForm.name} onChange={handleAddChange} required />
              </label>
              <label>
                Department
                <input
                  name="department"
                  value={addForm.department}
                  onChange={handleAddChange}
                  required
                />
              </label>
              <label>
                Subject
                <input name="subject" value={addForm.subject} onChange={handleAddChange} required />
              </label>
              <label>
                Semester
                <input
                  name="semester"
                  value={addForm.semester}
                  onChange={handleAddChange}
                  placeholder="e.g., Semester 5"
                  required
                />
              </label>
              <label>
                Academic Year
                <input
                  name="academic_year"
                  value={addForm.academic_year}
                  onChange={handleAddChange}
                  placeholder="e.g., 2024-2025"
                  required
                />
              </label>
              <label>
                Pass Percentage
                <input
                  name="pass_percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={addForm.pass_percentage}
                  onChange={handleAddChange}
                  required
                />
              </label>
              <div className="actions">
                <button className="primary" type="submit">
                  Save
                </button>
                <button
                  className="ghost"
                  type="button"
                  onClick={() => setShowAdd(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Faculty Name</th>
              <th>Department</th>
              <th>Subject</th>
              <th>Semester</th>
              <th>Academic Year</th>
              <th>Pass %</th>
              <th>Avg Rating</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rating = row.avg_rating ?? null;
              return (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.department}</td>
                  <td>{row.subject}</td>
                  <td>{row.semester ?? "-"}</td>
                  <td>{row.academic_year ?? "-"}</td>
                  <td>{row.pass_percentage ?? "-"}</td>
                  <td>{rating === null ? "Pending" : Number(rating).toFixed(2)}</td>
                  <td>
                    <span
                      className={
                        row.quality_status === "Good"
                          ? "pill good"
                          : row.quality_status === "Pending Evaluation"
                            ? "pill pending"
                            : "pill warn"
                      }
                    >
                      {row.quality_status}
                    </span>
                  </td>
                  <td className="row-actions">
                    <button className="ghost" onClick={() => startEdit(row)}>
                      Edit
                    </button>
                    <button className="ghost" onClick={() => openHistory(row)}>
                      History
                    </button>
                    <button className="danger" onClick={() => handleDelete(row)}>
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan="9" className="empty">
                  No faculty records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button
          className="ghost"
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page <= 1}
        >
          Previous
        </button>
        <span className="subtle">
          Page {page} of {totalPages} - {totalCount} records
        </span>
        <button
          className="ghost"
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
