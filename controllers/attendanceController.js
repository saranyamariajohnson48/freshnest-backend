const Attendance = require("../models/Attendance");
const User = require("../models/User");

const SHIFT_TIMINGS = {
    morning: { start: "09:00", end: "18:00" },
    evening: { start: "14:00", end: "22:00" },
    night: { start: "22:00", end: "06:00" },
};

const getShiftTimes = (shift, date = new Date()) => {
    if (!SHIFT_TIMINGS[shift]) return null;
    const { start, end } = SHIFT_TIMINGS[shift];
    const [sH, sM] = start.split(":").map(Number);
    const [eH, eM] = end.split(":").map(Number);

    const startTime = new Date(date);
    startTime.setHours(sH, sM, 0, 0);

    const endTime = new Date(date);
    endTime.setHours(eH, eM, 0, 0);
    if (shift === "night" && eH < sH) {
        endTime.setDate(endTime.getDate() + 1);
    }

    return { startTime, endTime };
};

exports.markAttendance = async (req, res) => {
    try {
        const { employeeId } = req.body;
        if (!employeeId) {
            return res.status(400).json({ error: "Employee ID is required" });
        }

        const staff = await User.findOne({ employeeId, role: "staff" });
        if (!staff) {
            return res.status(404).json({ error: "Staff member not found" });
        }

        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);

        let attendance = await Attendance.findOne({ staff: staff._id, date: today });

        if (!attendance) {
            // Check-in logic
            const shiftTimes = getShiftTimes(staff.shift || "morning", today);
            let isLate = false;
            if (shiftTimes && now > new Date(shiftTimes.startTime.getTime() + 15 * 60000)) {
                isLate = true;
            }

            attendance = new Attendance({
                staff: staff._id,
                date: today,
                checkIn: now,
                status: isLate ? "Late" : "Present",
                isLate,
                shift: staff.shift || "morning"
            });

            await attendance.save();
            return res.status(200).json({
                message: "Checked in successfully",
                type: "check-in",
                attendance
            });
        } else {
            // Check-out logic
            if (attendance.checkOut) {
                return res.status(400).json({ error: "Attendance already marked for today" });
            }

            const shiftTimes = getShiftTimes(attendance.shift, today);
            let isEarlyExit = false;
            if (shiftTimes && now < shiftTimes.endTime) {
                isEarlyExit = true;
            }

            const workingHours = (now - attendance.checkIn) / (1000 * 60 * 60);

            attendance.checkOut = now;
            attendance.workingHours = workingHours.toFixed(2);
            attendance.isEarlyExit = isEarlyExit;
            if (isEarlyExit && attendance.status === "Present") {
                attendance.status = "Early Exit";
            }

            await attendance.save();
            return res.status(200).json({
                message: "Checked out successfully",
                type: "check-out",
                attendance
            });
        }
    } catch (error) {
        console.error("Mark attendance error:", error);
        res.status(500).json({ error: "Failed to mark attendance" });
    }
};

exports.getMyStats = async (req, res) => {
    try {
        const staffId = req.user.id;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const attendanceRecords = await Attendance.find({
            staff: staffId,
            date: { $gte: startOfMonth }
        });

        const stats = {
            present: 0,
            absent: 0,
            late: 0,
            earlyExit: 0,
            totalWorkingHours: 0,
        };

        attendanceRecords.forEach(rec => {
            if (rec.checkIn) stats.present++;
            if (rec.isLate) stats.late++;
            if (rec.isEarlyExit) stats.earlyExit++;
            stats.totalWorkingHours += rec.workingHours || 0;
        });

        // Simple absent calculation (crude: days elapsed in month - present)
        const daysElapsed = now.getDate();
        stats.absent = Math.max(0, daysElapsed - stats.present);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayRecord = await Attendance.findOne({ staff: staffId, date: today });

        res.json({
            stats,
            today: todayRecord || null
        });
    } catch (error) {
        console.error("Get attendance stats error:", error);
        res.status(500).json({ error: "Failed to fetch attendance statistics" });
    }
};

exports.getMyHistory = async (req, res) => {
    try {
        const staffId = req.user.id;
        const { month, year } = req.query;

        const startDate = new Date(year || new Date().getFullYear(), (month || new Date().getMonth() + 1) - 1, 1);
        const endDate = new Date(year || new Date().getFullYear(), month || new Date().getMonth() + 1, 0, 23, 59, 59);

        const history = await Attendance.find({
            staff: staffId,
            date: { $gte: startDate, $lte: endDate }
        }).sort({ date: 1 });

        res.json({ history });
    } catch (error) {
        console.error("Get attendance history error:", error);
        res.status(500).json({ error: "Failed to fetch attendance history" });
    }
};

exports.getAllStaffAttendance = async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date ? new Date(date) : new Date();
        targetDate.setHours(0, 0, 0, 0);

        // Fetch all staff
        const staffList = await User.find({ role: "staff" }).select("fullName employeeId shift position");

        // Fetch attendance for the target date
        const attendanceRecords = await Attendance.find({ date: targetDate }).populate("staff", "fullName employeeId");

        const recordsMap = {};
        attendanceRecords.forEach(rec => {
            if (rec.staff) {
                recordsMap[rec.staff._id.toString()] = rec;
            }
        });

        const report = staffList.map(staff => ({
            _id: staff._id,
            name: staff.fullName,
            employeeId: staff.employeeId,
            shift: staff.shift,
            position: staff.position,
            attendance: recordsMap[staff._id.toString()] || { status: "Absent" }
        }));

        res.json({ report, date: targetDate });
    } catch (error) {
        console.error("Get all staff attendance error:", error);
        res.status(500).json({ error: "Failed to fetch staff attendance" });
    }
};

exports.getStaffAttendanceHistory = async (req, res) => {
    try {
        const { staffId } = req.params;
        const { month, year } = req.query;

        const startDate = new Date(year || new Date().getFullYear(), (month || new Date().getMonth() + 1) - 1, 1);
        const endDate = new Date(year || new Date().getFullYear(), month || new Date().getMonth() + 1, 0, 23, 59, 59);

        const history = await Attendance.find({
            staff: staffId,
            date: { $gte: startDate, $lte: endDate }
        }).sort({ date: 1 });

        res.json({ history });
    } catch (error) {
        console.error("Get staff attendance history error:", error);
        res.status(500).json({ error: "Failed to fetch staff attendance history" });
    }
};
