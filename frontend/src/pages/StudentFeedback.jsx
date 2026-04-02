import { useEffect, useState } from "react";
import { apiRequest, getStoredUser } from "../api";

export default function StudentFeedback() {
  const [faculty, setFaculty] = useState([]);
  const [form, setForm] = useState({ faculty_id: "", rating: "", comment: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiRequest("/faculty/list");
        setFaculty(data);
      } catch (err) {
        setError(err.message || "Failed to load faculty list");
      }
    };
    load();
  }, []);

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.faculty_id || !form.rating) {
      setError("Please select a faculty member and rating.");
      return;
    }

    const user = getStoredUser();
    if (!user?.token) {
      setError("Session expired. Please login again.");
      return;
    }

    try {
      await apiRequest("/feedback/submit", {
        method: "POST",
        body: JSON.stringify({
          faculty_id: form.faculty_id,
          rating: Number(form.rating),
          comment: form.comment.trim()
        })
      });
      setSuccess("Feedback submitted successfully.");
      setForm({ faculty_id: "", rating: "", comment: "" });
    } catch (err) {
      setError(err.message || "Failed to submit feedback");
    }
  };

  return (
    <div className="form-shell">
      <form className="card" onSubmit={handleSubmit}>
        <div className="form-header">
          <h2>Student Feedback</h2>
          <p className="subtle">Give one feedback entry per faculty subject.</p>
        </div>
        <label>
          Select Faculty
          <select name="faculty_id" value={form.faculty_id} onChange={handleChange} required>
            <option value="">Choose faculty</option>
            {faculty.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} - {item.subject}
              </option>
            ))}
          </select>
        </label>
        <label>
          Rating (1-5)
          <select name="rating" value={form.rating} onChange={handleChange} required>
            <option value="">Select rating</option>
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Comments
          <textarea
            name="comment"
            value={form.comment}
            onChange={handleChange}
            placeholder="Share detailed feedback"
            rows="4"
          />
        </label>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
        <button className="primary" type="submit">
          Submit Feedback
        </button>
      </form>
    </div>
  );
}
