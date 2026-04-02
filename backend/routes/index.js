import { Router } from "express";
import { login, register } from "../controllers/authController.js";
import {
  addFaculty,
  updateFaculty,
  listFaculty,
  deleteFaculty,
  getFacultyStats,
  getFacultyHistory
} from "../controllers/facultyController.js";
import { submitFeedback } from "../controllers/feedbackController.js";
import { getReports, getDepartmentSummary } from "../controllers/reportController.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import {
  listSubjects,
  addSubject,
  updateSubject,
  deleteSubject
} from "../controllers/subjectController.js";
import { listNotifications, clearNotifications } from "../controllers/notificationController.js";

const router = Router();

router.post("/login", login);
router.post("/register", register);

router.post("/faculty/add", authenticate, requireRole(["Faculty", "Admin"]), addFaculty);
router.put("/faculty/update", authenticate, requireRole(["Faculty", "Admin"]), updateFaculty);
router.get("/faculty/list", authenticate, requireRole(["Faculty", "Admin", "Student"]), listFaculty);
router.delete("/faculty/delete/:id", authenticate, requireRole(["Admin"]), deleteFaculty);
router.get("/faculty/stats", authenticate, requireRole(["Admin"]), getFacultyStats);
router.get("/faculty/history/:id", authenticate, requireRole(["Admin"]), getFacultyHistory);

router.post("/feedback/submit", authenticate, requireRole(["Student"]), submitFeedback);

router.get("/reports", authenticate, requireRole(["Admin"]), getReports);
router.get("/reports/departments", authenticate, requireRole(["Admin"]), getDepartmentSummary);

router.get("/notifications", authenticate, requireRole(["Admin"]), listNotifications);
router.delete("/notifications", authenticate, requireRole(["Admin"]), clearNotifications);
router.get("/subjects", authenticate, requireRole(["Admin", "Faculty"]), listSubjects);
router.post("/subjects", authenticate, requireRole(["Admin"]), addSubject);
router.put("/subjects/:id", authenticate, requireRole(["Admin"]), updateSubject);
router.delete("/subjects/:id", authenticate, requireRole(["Admin"]), deleteSubject);

export default router;
