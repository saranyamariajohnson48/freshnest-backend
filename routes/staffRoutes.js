const express = require("express");
const router = express.Router();
const {
  createStaff,
  getAllStaff,
  getStaffById,
  updateStaff,
  deleteStaff,
  resetStaffPassword,
  getStaffStats,
  generateStaffQR,
  exportStaffData
} = require("../controllers/staffController");

const { adminOnly } = require("../middleware/auth");

// All staff routes require admin authentication
router.use(adminOnly);

// Staff management routes
router.post("/", createStaff);                    // POST /api/staff - Create new staff
router.get("/", getAllStaff);                     // GET /api/staff - Get all staff with pagination/filtering
router.get("/stats", getStaffStats);              // GET /api/staff/stats - Get staff statistics
router.get("/export", exportStaffData);           // GET /api/staff/export - Export staff data
router.get("/:id", getStaffById);                 // GET /api/staff/:id - Get staff by ID
router.get("/:id/qr", generateStaffQR);           // GET /api/staff/:id/qr - Generate QR code for staff
router.put("/:id", updateStaff);                  // PUT /api/staff/:id - Update staff
router.delete("/:id", deleteStaff);               // DELETE /api/staff/:id - Delete/deactivate staff
router.post("/:id/reset-password", resetStaffPassword); // POST /api/staff/:id/reset-password - Reset staff password

module.exports = router;