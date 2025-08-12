const Leave = require('../models/Leave');
const User = require('../models/User');
const mongoose = require('mongoose');

// Apply for leave (Staff only)
const applyLeave = async (req, res) => {
  try {
    const { type, startDate, endDate, reason, isHalfDay } = req.body;
    const employeeId = req.user.id;

    // Validate required fields
    if (!type || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Validate leave type
    if (!['sick', 'casual', 'annual'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leave type'
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be in the past'
      });
    }

    if (end < start) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be before start date'
      });
    }

    // Get employee details
    const employee = await User.findById(employeeId);
    if (!employee || employee.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Staff access required.'
      });
    }

    // Check for overlapping leaves
    const overlappingLeave = await Leave.findOne({
      employeeId,
      status: { $in: ['pending', 'approved'] },
      $or: [
        {
          startDate: { $lte: end },
          endDate: { $gte: start }
        }
      ]
    });

    if (overlappingLeave) {
      return res.status(400).json({
        success: false,
        message: 'You already have a leave application for overlapping dates'
      });
    }

    // Calculate leave balance (simplified - you can implement more complex logic)
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);

    const usedLeaves = await Leave.aggregate([
      {
        $match: {
          employeeId: new mongoose.Types.ObjectId(employeeId),
          status: 'approved',
          startDate: { $gte: yearStart, $lte: yearEnd }
        }
      },
      {
        $group: {
          _id: '$type',
          totalDays: { $sum: '$totalDays' }
        }
      }
    ]);

    // Default leave balances (you can make this configurable)
    const defaultBalances = {
      casual: 12,
      sick: 10,
      annual: 15
    };

    const leaveBalance = { ...defaultBalances };
    usedLeaves.forEach(leave => {
      leaveBalance[leave._id] = Math.max(0, defaultBalances[leave._id] - leave.totalDays);
    });

    // Create leave application
    const leave = new Leave({
      employeeId,
      employeeDetails: {
        fullName: employee.fullName,
        employeeId: employee.employeeId,
        email: employee.email
      },
      type,
      startDate: start,
      endDate: end,
      reason: reason.trim(),
      isHalfDay: Boolean(isHalfDay),
      leaveBalance
    });

    await leave.save();

    res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully',
      data: leave
    });

  } catch (error) {
    console.error('Apply leave error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit leave application',
      error: error.message
    });
  }
};

// Get employee's leave applications
const getMyLeaves = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    const query = { employeeId };
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status;
    }

    const leaves = await Leave.find(query)
      .sort({ appliedOn: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('reviewedBy', 'fullName employeeId');

    const total = await Leave.countDocuments(query);

    // Get leave balance
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);

    const usedLeaves = await Leave.aggregate([
      {
        $match: {
          employeeId: new mongoose.Types.ObjectId(employeeId),
          status: 'approved',
          startDate: { $gte: yearStart, $lte: yearEnd }
        }
      },
      {
        $group: {
          _id: '$type',
          totalDays: { $sum: '$totalDays' }
        }
      }
    ]);

    const defaultBalances = {
      casual: 12,
      sick: 10,
      annual: 15
    };

    const leaveBalance = { ...defaultBalances };
    usedLeaves.forEach(leave => {
      leaveBalance[leave._id] = Math.max(0, defaultBalances[leave._id] - leave.totalDays);
    });

    res.json({
      success: true,
      data: {
        leaves,
        leaveBalance,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: leaves.length,
          totalRecords: total
        }
      }
    });

  } catch (error) {
    console.error('Get my leaves error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave applications',
      error: error.message
    });
  }
};

// Get all leave applications (Admin only)
const getAllLeaves = async (req, res) => {
  try {
    const { status, employeeId, page = 1, limit = 10, startDate, endDate } = req.query;

    const query = {};
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status;
    }
    if (employeeId) {
      query.employeeId = employeeId;
    }
    if (startDate && endDate) {
      query.startDate = { $gte: new Date(startDate) };
      query.endDate = { $lte: new Date(endDate) };
    }

    const leaves = await Leave.find(query)
      .sort({ appliedOn: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('employeeId', 'fullName employeeId email')
      .populate('reviewedBy', 'fullName employeeId');

    const total = await Leave.countDocuments(query);

    // Get summary statistics
    const stats = await Leave.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const summary = {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: total
    };

    stats.forEach(stat => {
      summary[stat._id] = stat.count;
    });

    res.json({
      success: true,
      data: {
        leaves,
        summary,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: leaves.length,
          totalRecords: total
        }
      }
    });

  } catch (error) {
    console.error('Get all leaves error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave applications',
      error: error.message
    });
  }
};

// Review leave application (Admin only)
const reviewLeave = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { status, reviewComments } = req.body;
    const reviewerId = req.user.id;

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be approved or rejected'
      });
    }

    // Find the leave application
    const leave = await Leave.findById(leaveId);
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave application not found'
      });
    }

    // Check if already reviewed
    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Leave application has already been reviewed'
      });
    }

    // Update leave status
    leave.status = status;
    leave.reviewedBy = reviewerId;
    leave.reviewedOn = new Date();
    if (reviewComments) {
      leave.reviewComments = reviewComments.trim();
    }

    await leave.save();

    // Populate reviewer details for response
    await leave.populate('reviewedBy', 'fullName employeeId');

    res.json({
      success: true,
      message: `Leave application ${status} successfully`,
      data: leave
    });

  } catch (error) {
    console.error('Review leave error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review leave application',
      error: error.message
    });
  }
};

// Cancel leave application (Staff only - for pending leaves)
const cancelLeave = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const employeeId = req.user.id;

    const leave = await Leave.findOne({
      _id: leaveId,
      employeeId,
      status: 'pending'
    });

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Pending leave application not found'
      });
    }

    await Leave.findByIdAndDelete(leaveId);

    res.json({
      success: true,
      message: 'Leave application cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel leave error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel leave application',
      error: error.message
    });
  }
};

// Get leave statistics (Admin only)
const getLeaveStats = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);

    // Monthly leave statistics
    const monthlyStats = await Leave.aggregate([
      {
        $match: {
          startDate: { $gte: yearStart, $lte: yearEnd }
        }
      },
      {
        $group: {
          _id: {
            month: { $month: '$startDate' },
            status: '$status'
          },
          count: { $sum: 1 },
          totalDays: { $sum: '$totalDays' }
        }
      },
      {
        $sort: { '_id.month': 1 }
      }
    ]);

    // Leave type statistics
    const typeStats = await Leave.aggregate([
      {
        $match: {
          startDate: { $gte: yearStart, $lte: yearEnd },
          status: 'approved'
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalDays: { $sum: '$totalDays' }
        }
      }
    ]);

    // Top employees by leave days
    const employeeStats = await Leave.aggregate([
      {
        $match: {
          startDate: { $gte: yearStart, $lte: yearEnd },
          status: 'approved'
        }
      },
      {
        $group: {
          _id: '$employeeId',
          employeeName: { $first: '$employeeDetails.fullName' },
          employeeId: { $first: '$employeeDetails.employeeId' },
          totalDays: { $sum: '$totalDays' },
          leaveCount: { $sum: 1 }
        }
      },
      {
        $sort: { totalDays: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      success: true,
      data: {
        monthlyStats,
        typeStats,
        employeeStats,
        year: currentYear
      }
    });

  } catch (error) {
    console.error('Get leave stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave statistics',
      error: error.message
    });
  }
};

module.exports = {
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  reviewLeave,
  cancelLeave,
  getLeaveStats
};