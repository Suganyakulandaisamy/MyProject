import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { getStoredUser, clearUser } from "./api";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import FacultyDashboard from "./pages/FacultyDashboard";
import FacultyForm from "./pages/FacultyForm";
import StudentFeedback from "./pages/StudentFeedback";
import AdminDashboard from "./pages/AdminDashboard";
import AdminReport from "./pages/AdminReport";
import ManageSubjects from "./pages/ManageSubjects";
import "./styles.css";

function ProtectedRoute({ children, roles }) {
  const user = getStoredUser();
  if (!user) return <Navigate to="/" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function Layout({ title, children }) {
  const user = getStoredUser();
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Automated Academic Quality Assurance Portal</p>
          <h1>{title}</h1>
        </div>
        {user && (
          <button
            className="ghost"
            onClick={() => {
              clearUser();
              window.location.href = import.meta.env.BASE_URL;
            }}
          >
            Logout
          </button>
        )}
      </header>
      {user?.role === "Admin" && (
        <nav className="admin-nav">
          <Link className="ghost" to="/admin-dashboard">
            Dashboard
          </Link>
          <Link className="ghost" to="/faculty/form">
            Add Faculty
          </Link>
          <Link className="ghost" to="/admin-dashboard">
            Faculty List
          </Link>
          <Link className="ghost" to="/admin/reports">
            Quality Report
          </Link>
          <Link className="ghost" to="/admin/subjects">
            Manage Subjects
          </Link>
        </nav>
      )}
      <main className="content">{children}</main>
    </div>
  );
}

export default function App() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return (
    <BrowserRouter basename={base}>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/faculty-dashboard"
          element={
            <ProtectedRoute roles={["Faculty", "Admin"]}>
              <Layout title="Faculty Dashboard">
                <FacultyDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/faculty/form"
          element={
            <ProtectedRoute roles={["Faculty", "Admin"]}>
              <Layout title="Faculty Data Entry">
                <FacultyForm />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/student-dashboard"
          element={
            <ProtectedRoute roles={["Student", "Admin"]}>
              <Layout title="Student Feedback">
                <StudentFeedback />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute roles={["Admin"]}>
              <Layout title="Admin Dashboard">
                <AdminDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/subjects"
          element={
            <ProtectedRoute roles={["Admin"]}>
              <Layout title="Manage Subjects">
                <ManageSubjects />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute roles={["Admin"]}>
              <Layout title="Quality Reports">
                <AdminReport />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}