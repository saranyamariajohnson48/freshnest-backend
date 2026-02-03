const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
    staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    checkIn: {
        type: Date,
    },
    checkOut: {
        type: Date,
    },
    status: {
        type: String,
        enum: ['Present', 'Absent', 'Late', 'Early Exit', 'Half Day'],
        default: 'Present',
    },
    workingHours: {
        type: Number,
        default: 0,
    },
    isLate: {
        type: Boolean,
        default: false,
    },
    isEarlyExit: {
        type: Boolean,
        default: false,
    },
    shift: {
        type: String,
        enum: ["morning", "evening", "night", "flexible"],
    }
}, {
    timestamps: true
});

// Compound index to ensure one attendance record per staff per day
attendanceSchema.index({ staff: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
