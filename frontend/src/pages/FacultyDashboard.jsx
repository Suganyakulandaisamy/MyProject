import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api";

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const data = await apiRequest("/faculty/list");
      setRows(data);
    } catch (err) {
      setError(err.message || "Failed to load faculty data");
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="stack">
      <div className="toolbar">
        <div>
          <h2>Teaching Records</h2>
          <p className="subtle">Manage your submitted teaching data and status.</p>
        </div>
        <button className="primary" onClick={() => navigate("/faculty/form")}>
          New Entry
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Department</th>
              <th>Subject</th>
              <th>Pass %</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.department}</td>
                <td>{row.subject}</td>
                <td>{row.pass_percentage}</td>
                <td>
                  <span className={row.quality_status === "Good" ? "pill good" : "pill warn"}>
                    {row.quality_status}
                  </span>
                </td>
                <td>
                  <button
                    className="ghost"
                    onClick={() => {
                      localStorage.setItem("aaqap_edit_faculty", JSON.stringify(row));
                      navigate("/faculty/form");
                    }}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan="6" className="empty">No faculty entries yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
