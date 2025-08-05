const mongoose = require('mongoose');
require('dotenv').config();

// Import User model
const User = require('../models/User');

async function checkStaffData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Check all users with username "libin"
    console.log('\n=== CHECKING USERS WITH USERNAME "libin" ===');
    const libinUsers = await User.find({ 
      $or: [
        { username: 'libin' },
        { username: { $regex: 'libin', $options: 'i' } },
        { fullName: { $regex: 'libin', $options: 'i' } },
        { email: { $regex: 'libin', $options: 'i' } }
      ]
    }).select('fullName email username role status employeeId createdAt');
    
    if (libinUsers.length > 0) {
      console.log(`Found ${libinUsers.length} user(s) with "libin":`);
      libinUsers.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user._id}`);
        console.log(`   Name: ${user.fullName}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Status: ${user.status}`);
        console.log(`   Employee ID: ${user.employeeId}`);
        console.log(`   Created: ${user.createdAt}`);
        console.log('   ---');
      });
    } else {
      console.log('No users found with "libin"');
    }
    
    // Check all staff members
    console.log('\n=== ALL STAFF MEMBERS ===');
    const allStaff = await User.find({ role: 'staff' })
      .select('fullName email username employeeId status createdAt')
      .sort({ createdAt: -1 });
    
    console.log(`Total staff members: ${allStaff.length}`);
    allStaff.forEach((staff, index) => {
      console.log(`${index + 1}. ${staff.fullName} (${staff.email}) - ${staff.employeeId} - ${staff.status}`);
    });
    
    // Check all users by role
    console.log('\n=== USERS BY ROLE ===');
    const roleStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);
    
    roleStats.forEach(stat => {
      console.log(`${stat._id}: ${stat.count} users`);
    });
    
    // Check for duplicate usernames
    console.log('\n=== CHECKING FOR DUPLICATE USERNAMES ===');
    const duplicateUsernames = await User.aggregate([
      {
        $match: { username: { $ne: null } }
      },
      {
        $group: {
          _id: '$username',
          count: { $sum: 1 },
          users: { $push: { id: '$_id', role: '$role', email: '$email' } }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);
    
    if (duplicateUsernames.length > 0) {
      console.log('Found duplicate usernames:');
      duplicateUsernames.forEach(dup => {
        console.log(`Username "${dup._id}" appears ${dup.count} times:`);
        dup.users.forEach(user => {
          console.log(`  - ${user.id} (${user.role}) - ${user.email}`);
        });
      });
    } else {
      console.log('No duplicate usernames found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run the check
checkStaffData();