import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api";

const emptyForm = { id: "", name: "" };

export default function ManageSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const navigate = useNavigate();

  const loadSubjects = async () => {
    setError("");
    try {
      const data = await apiRequest("/subjects");
      setSubjects(data);
    } catch (err) {
      setError(err.message || "Failed to load subjects");
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const openAdd = () => {
    setNotice("");
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (subject) => {
    setNotice("");
    setForm({ id: subject.id, name: subject.name });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setForm(emptyForm);
  };

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!form.name.trim()) {
      setError("Please enter a subject name.");
      return;
    }

    try {
      if (form.id) {
        await apiRequest(`/subjects/${form.id}`, {
          method: "PUT",
          body: JSON.stringify({ name: form.name.trim() })
        });
        setNotice("Subject updated.");
      } else {
        await apiRequest("/subjects", {
          method: "POST",
          body: JSON.stringify({ name: form.name.trim() })
        });
        setNotice("Subject added.");
      }
      closeModal();
      await loadSubjects();
    } catch (err) {
      setError(err.message || "Failed to save subject");
    }
  };

  const handleDelete = async (subject) => {
    const confirmed = window.confirm(`Delete subject "${subject.name}"?`);
    if (!confirmed) return;
    setError("");
    setNotice("");
    try {
      await apiRequest(`/subjects/${subject.id}`, { method: "DELETE" });
      setNotice("Subject deleted.");
      await loadSubjects();
    } catch (err) {
      setError(err.message || "Failed to delete subject");
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
          <h2>Manage Subjects</h2>
          <p className="subtle">Maintain the shared subject catalog.</p>
        </div>
        <div className="actions">
          <button className="primary" onClick={openAdd}>
            Add Subject
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {notice && <p className="success">{notice}</p>}

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Assigned Faculty</th>
              <th>Department</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject) => (
              <tr key={subject.id}>
                <td>{subject.name}</td>
                <td>{subject.faculty ? subject.faculty.name : "Not Assigned"}</td>
                <td>{subject.faculty ? subject.faculty.department : "-"}</td>
                <td className="row-actions">
                  <button className="ghost" onClick={() => openEdit(subject)}>
                    Edit
                  </button>
                  <button className="danger" onClick={() => handleDelete(subject)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {subjects.length === 0 && (
              <tr>
                <td colSpan="4" className="empty">
                  No subjects found yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div
            className="modal card"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div>
              <h3>{form.id ? "Edit Subject" : "Add Subject"}</h3>
              <p className="subtle">Subjects appear in the faculty entry form.</p>
            </div>
            <form className="stack" onSubmit={handleSubmit}>
              <label>
                Subject Name
                <input name="name" value={form.name} onChange={handleChange} required />
              </label>
              <div className="actions">
                <button className="primary" type="submit">
                  {form.id ? "Save Changes" : "Save Subject"}
                </button>
                <button className="ghost" type="button" onClick={closeModal}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
