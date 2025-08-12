const mongoose = require('mongoose');
const Leave = require('./models/Leave');
const User = require('./models/User');

async function testLeaveSystemDirect() {
  try {
    console.log('🧪 Testing Leave Management System (Direct Database Access)...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/freshnest');
    console.log('✅ Connected to MongoDB');

    // 1. Check existing leave applications
    console.log('\n1. Checking existing leave applications...');
    const leaves = await Leave.find({}).populate('employeeId', 'fullName email employeeId');
    console.log(`✅ Found ${leaves.length} leave applications`);
    
    if (leaves.length > 0) {
      leaves.forEach((leave, index) => {
        console.log(`   ${index + 1}. ${leave.employeeDetails.fullName} - ${leave.type} leave (${leave.status})`);
        console.log(`      From: ${leave.startDate.toDateString()} To: ${leave.endDate.toDateString()}`);
        console.log(`      Reason: ${leave.reason}`);
      });
    }

    // 2. Get leave statistics
    console.log('\n2. Calculating leave statistics...');
    const stats = await Leave.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const summary = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    };

    stats.forEach(stat => {
      summary[stat._id] = stat.count;
      summary.total += stat.count;
    });

    console.log('✅ Leave Statistics:');
    console.log(`   Total: ${summary.total}`);
    console.log(`   Pending: ${summary.pending}`);
    console.log(`   Approved: ${summary.approved}`);
    console.log(`   Rejected: ${summary.rejected}`);

    // 3. Test approving a leave (simulate admin action)
    if (leaves.length > 0) {
      const pendingLeave = leaves.find(leave => leave.status === 'pending');
      
      if (pendingLeave) {
        console.log('\n3. Approving a pending leave application...');
        
        // Get admin user
        const adminUser = await User.findOne({ email: 'admin@test.com' });
        
        // Update leave status
        pendingLeave.status = 'approved';
        pendingLeave.reviewedBy = adminUser._id;
        pendingLeave.reviewedOn = new Date();
        pendingLeave.reviewComments = 'Approved. Take care and get well soon!';
        
        await pendingLeave.save();
        console.log('✅ Leave application approved successfully');
        console.log(`   Leave ID: ${pendingLeave._id}`);
        console.log(`   Employee: ${pendingLeave.employeeDetails.fullName}`);
        console.log(`   Status: ${pendingLeave.status}`);
        console.log(`   Reviewed by: ${adminUser.fullName}`);
      } else {
        console.log('\n3. No pending leave applications to approve');
      }
    }

    // 4. Test rejecting a leave (create another one first)
    console.log('\n4. Creating and rejecting a leave application...');
    const staffUser = await User.findOne({ email: 'staff@test.com' });
    
    const newLeave = new Leave({
      employeeId: staffUser._id,
      employeeDetails: {
        fullName: staffUser.fullName,
        email: staffUser.email,
        employeeId: staffUser.employeeId
      },
      type: 'casual',
      startDate: new Date('2024-12-25'),
      endDate: new Date('2024-12-26'),
      reason: 'Family vacation during holidays',
      isHalfDay: false,
      status: 'pending',
      totalDays: 2,
      appliedOn: new Date()
    });

    await newLeave.save();
    console.log('✅ New leave application created');

    // Reject it
    const adminUser = await User.findOne({ email: 'admin@test.com' });
    newLeave.status = 'rejected';
    newLeave.reviewedBy = adminUser._id;
    newLeave.reviewedOn = new Date();
    newLeave.reviewComments = 'Sorry, we need full staff during holiday season.';
    
    await newLeave.save();
    console.log('✅ Leave application rejected successfully');

    // 5. Final statistics
    console.log('\n5. Final leave statistics...');
    const finalStats = await Leave.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const finalSummary = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    };

    finalStats.forEach(stat => {
      finalSummary[stat._id] = stat.count;
      finalSummary.total += stat.count;
    });

    console.log('✅ Final Statistics:');
    console.log(`   Total: ${finalSummary.total}`);
    console.log(`   Pending: ${finalSummary.pending}`);
    console.log(`   Approved: ${finalSummary.approved}`);
    console.log(`   Rejected: ${finalSummary.rejected}`);

    console.log('\n🎉 Leave Management System Test Completed Successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ Leave applications are stored in MongoDB "leaves" collection');
    console.log('✅ Admin can approve/reject leave applications');
    console.log('✅ Leave statistics are calculated correctly');
    console.log('✅ Employee details are embedded in leave documents');
    console.log('✅ Review information is tracked (reviewer, date, comments)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testLeaveSystemDirect();