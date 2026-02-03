const express = require("express");
const router = express.Router();
const {
    markAttendance,
    getMyStats,
    getMyHistory,
    getAllStaffAttendance,
    getStaffAttendanceHistory
} = require("../controllers/attendanceController");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

// QR Scan endpoint (can be called by staff or admin)
router.post("/scan", authenticateToken, markAttendance);

// Staff specific endpoints
router.get("/my-stats", authenticateToken, getMyStats);
router.get("/my-history", authenticateToken, getMyHistory);

// Admin specific endpoints
router.get("/admin/all", authenticateToken, authorizeRoles("admin", "Admin"), getAllStaffAttendance);
router.get("/admin/staff/:staffId", authenticateToken, authorizeRoles("admin", "Admin"), getStaffAttendanceHistory);

module.exports = router;
