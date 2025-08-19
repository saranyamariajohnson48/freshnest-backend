const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const taskController = require("../controllers/taskController");

// All task routes require authentication
router.post("/", authenticateToken, taskController.createTask);
router.get("/", authenticateToken, taskController.listTasks);
router.put("/:id/status", authenticateToken, taskController.updateStatus);
router.delete("/:id", authenticateToken, taskController.deleteTask);

module.exports = router;


