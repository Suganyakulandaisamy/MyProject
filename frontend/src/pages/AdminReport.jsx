import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api";

export default function AdminReport() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const load = async () => {
    try {
      const data = await apiRequest("/reports");
      setRows(data);
    } catch (err) {
      setError(err.message || "Failed to load reports");
    }
  };

  useEffect(() => {
    load();
  }, []);

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

  return (
    <div className="stack">
      <div className="toolbar">
        <button className="ghost" onClick={() => navigate("/admin-dashboard")}>
          Back to Dashboard
        </button>
      </div>
      <div className="toolbar">
        <div>
          <h2>Quality Report</h2>
          <p className="subtle">Summary of teaching performance and feedback.</p>
        </div>
        <button className="primary" onClick={downloadCsv}>
          Download CSV
        </button>
      </div>

      {error && <p className="error">{error}</p>}

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
              <th>Average Feedback Rating</th>
              <th>Quality Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.department}</td>
                <td>{row.subject}</td>
                <td>{row.semester ?? "-"}</td>
                <td>{row.academic_year ?? "-"}</td>
                <td>{row.pass_percentage ?? "-"}</td>
                <td>{row.avg_rating ?? "Pending"}</td>
                <td>
                  {row.quality_status ? (
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
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan="8" className="empty">No report data yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
