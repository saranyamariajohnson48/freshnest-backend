const Task = require("../models/Task");
const User = require("../models/User");
const { sendTaskAssignmentEmail } = require("../services/emailService");

function isSupervisorPosition(position = "") {
  const p = String(position || "").toLowerCase();
  return p.includes("supervisor");
}

// Create a task (Supervisor or Admin)
exports.createTask = async (req, res) => {
  try {
    const requester = req.user;

    // Only admin or staff with supervisor position can assign tasks
    const canAssign =
      requester.role === "admin" ||
      (requester.role === "staff" && isSupervisorPosition(requester.position));
    if (!canAssign) {
      return res.status(403).json({ error: "Only supervisors or admins can assign tasks" });
    }

    const { title, description = "", assignedTo, dueDate = null, priority = "Medium" } = req.body;
    if (!title || !assignedTo) {
      return res.status(400).json({ error: "Title and assignedTo are required" });
    }

    // Validate assignee
    const assignee = await User.findOne({ _id: assignedTo, role: "staff", status: "active" });
    if (!assignee) {
      return res.status(400).json({ error: "Assignee must be an active staff member" });
    }
    // Prevent assigning to other supervisors (staff-only)
    if (isSupervisorPosition(assignee.position)) {
      return res.status(400).json({ error: "Tasks can only be assigned to non-supervisor staff" });
    }

    const task = await Task.create({
      title: String(title).trim(),
      description: String(description || "").trim(),
      assignedBy: requester._id,
      assignedTo: assignee._id,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      priority: ["Low", "Medium", "High"].includes(priority) ? priority : "Medium",
    });

    const populated = await task.populate([
      { path: "assignedBy", select: "fullName email employeeId role position" },
      { path: "assignedTo", select: "fullName email employeeId role position" },
    ]);

    res.status(201).json({ success: true, data: populated });
  
  // Fire-and-forget: send assignment email to assignee
  try {
    const assigneeEmail = populated.assignedTo?.email;
    if (assigneeEmail) {
      await sendTaskAssignmentEmail(assigneeEmail, {
        taskTitle: populated.title,
        taskDescription: populated.description,
        dueDate: populated.dueDate,
        priority: populated.priority,
        assigneeName: populated.assignedTo?.fullName || 'Team Member',
        assignerName: populated.assignedBy?.fullName || 'Supervisor',
        assignerEmail: populated.assignedBy?.email || '',
      });
    }
  } catch (emailErr) {
    console.error('Task assignment email error:', emailErr);
  }
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({ success: false, error: "Failed to create task" });
  }
};

// List tasks
exports.listTasks = async (req, res) => {
  try {
    const requester = req.user;
    const { status, priority, mine = "true" } = req.query;

    const query = {};

    if (requester.role === "admin") {
      // Admin can see all; if mine=true, see created by me
      if (mine === "true") query.assignedBy = requester._id;
    } else if (requester.role === "staff" && isSupervisorPosition(requester.position)) {
      // Supervisor sees tasks they assigned by default
      if (mine === "false") {
        query.assignedTo = requester._id; // allow viewing assigned to me
      } else {
        query.assignedBy = requester._id;
      }
    } else {
      // Regular staff: only tasks assigned to them
      query.assignedTo = requester._id;
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;

    const tasks = await Task.find(query)
      .populate("assignedBy", "fullName email employeeId role position")
      .populate("assignedTo", "fullName email employeeId role position")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error("List tasks error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch tasks" });
  }
};

// Update task status (assignee, creator, or admin)
exports.updateStatus = async (req, res) => {
  try {
    const requester = req.user;
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["Pending", "In Progress", "Completed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    const isCreator = String(task.assignedBy) === String(requester._id);
    const isAssignee = String(task.assignedTo) === String(requester._id);
    const isAdmin = requester.role === "admin";

    if (!(isCreator || isAssignee || isAdmin)) {
      return res.status(403).json({ error: "Not authorized to update this task" });
    }

    task.status = status;
    await task.save();

    const populated = await task.populate([
      { path: "assignedBy", select: "fullName email employeeId role position" },
      { path: "assignedTo", select: "fullName email employeeId role position" },
    ]);

    res.json({ success: true, data: populated });
  } catch (error) {
    console.error("Update task status error:", error);
    res.status(500).json({ success: false, error: "Failed to update task status" });
  }
};

// Delete task (creator or admin)
exports.deleteTask = async (req, res) => {
  try {
    const requester = req.user;
    const { id } = req.params;

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    const isCreator = String(task.assignedBy) === String(requester._id);
    const isAdmin = requester.role === "admin";

    if (!(isCreator || isAdmin)) {
      return res.status(403).json({ error: "Not authorized to delete this task" });
    }

    await Task.findByIdAndDelete(id);
    res.json({ success: true, message: "Task deleted" });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({ success: false, error: "Failed to delete task" });
  }
};

// List assignable staff (active staff excluding supervisors and current user)
exports.listAssignableStaff = async (req, res) => {
  try {
    const requester = req.user;

    const canView =
      requester.role === "admin" ||
      (requester.role === "staff" && isSupervisorPosition(requester.position));
    if (!canView) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    const allStaff = await User.find({ role: "staff", status: "active" })
      .select("fullName employeeId position email role status");
    const currentId = String(requester._id);
    const list = allStaff
      .filter(u => !isSupervisorPosition(u.position) && String(u._id) !== currentId)
      .map(u => ({
        _id: u._id,
        fullName: u.fullName,
        employeeId: u.employeeId,
        position: u.position || 'Staff',
        email: u.email,
      }));

    res.json({ success: true, data: list });
  } catch (error) {
    console.error("List assignable staff error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch staff" });
  }
};


