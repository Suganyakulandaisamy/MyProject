import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest, getStoredUser } from "../api";

const emptyForm = {
  id: null,
  name: "",
  department: "",
  subject: "",
  semester: "",
  academic_year: "",
  pass_percentage: ""
};

export default function FacultyForm() {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [subjects, setSubjects] = useState([]);
  const user = getStoredUser();
  const navigate = useNavigate();
  const backPath = user?.role === "Admin" ? "/admin-dashboard" : "/faculty-dashboard";

  useEffect(() => {
    const stored = localStorage.getItem("aaqap_edit_faculty");
    if (stored) {
      const parsed = JSON.parse(stored);
      setForm({
        id: parsed.id,
        name: parsed.name,
        department: parsed.department,
        subject: parsed.subject,
        semester: parsed.semester ?? "",
        academic_year: parsed.academic_year ?? "",
        pass_percentage: parsed.pass_percentage
      });
    }
  }, []);

  useEffect(() => {
    let active = true;
    const loadSubjects = async () => {
      try {
        const data = await apiRequest("/subjects");
        if (!active) return;
        const fromDb = data.map((item) => item.name);
        setSubjects(Array.from(new Set(fromDb)));
      } catch (err) {
        if (!active) return;
        setSubjects([]);
      }
    };

    const handleFocus = () => loadSubjects();
    loadSubjects();
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      active = false;
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, []);

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (
      !form.name ||
      !form.department ||
      !form.subject ||
      !form.semester ||
      !form.academic_year ||
      form.pass_percentage === ""
    ) {
      setError("Please fill in all fields.");
      return;
    }

    const payload = {
      id: form.id,
      name: form.name.trim(),
      department: form.department.trim(),
      subject: form.subject.trim(),
      semester: form.semester.trim(),
      academic_year: form.academic_year.trim(),
      pass_percentage: Number(form.pass_percentage)
    };

    try {
      if (form.id) {
        await apiRequest("/faculty/update", {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        setSuccess("Faculty data updated.");
      } else {
        await apiRequest("/faculty/add", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        setSuccess("Faculty data saved.");
      }
      localStorage.removeItem("aaqap_edit_faculty");
      setForm(emptyForm);
    } catch (err) {
      setError(err.message || "Failed to submit data");
    }
  };

  return (
    <div className="stack">
      <div className="toolbar">
        <button
          className="ghost"
          type="button"
          onClick={() => {
            localStorage.removeItem("aaqap_edit_faculty");
            navigate(backPath);
          }}
        >
          Back to Dashboard
        </button>
      </div>
      <div className="form-shell">
        <form className="card" onSubmit={handleSubmit}>
        <div className="form-header">
          <h2>{form.id ? "Update Faculty Data" : "New Faculty Entry"}</h2>
          <p className="subtle">Quality status is calculated automatically.</p>
        </div>
        <label>
          Faculty Name
          <input name="name" value={form.name} onChange={handleChange} required />
        </label>
        <label>
          Department
          <input name="department" value={form.department} onChange={handleChange} required />
        </label>
        <label>
          Subject
          <input
            name="subject"
            value={form.subject}
            onChange={handleChange}
            list="subject-options"
            placeholder="Select or type a subject"
            required
          />
          <datalist id="subject-options">
            {subjects.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </label>
        <label>
          Semester
          <input
            name="semester"
            value={form.semester}
            onChange={handleChange}
            placeholder="e.g., Semester 5"
            required
          />
        </label>
        <label>
          Academic Year
          <input
            name="academic_year"
            value={form.academic_year}
            onChange={handleChange}
            placeholder="e.g., 2024-2025"
            required
          />
        </label>
        <label>
          Pass Percentage
          <input
            name="pass_percentage"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={form.pass_percentage}
            onChange={handleChange}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
          <div className="actions">
            <button className="primary" type="submit">
              {form.id ? "Update" : "Save"}
            </button>
            <Link
              className="ghost"
              to={backPath}
              onClick={() => {
                localStorage.removeItem("aaqap_edit_faculty");
              }}
            >
              Back to Dashboard
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
