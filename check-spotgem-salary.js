const mongoose = require('mongoose');
const User = require('./models/User');
const SalaryPayment = require('./models/SalaryPayment');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/freshnest');
    const user = await User.findOne({ fullName: { $regex: '^Spotgem Thomas$', $options: 'i' }, role: 'staff' }).lean();
    console.log('User:', user ? { _id: user._id, email: user.email, role: user.role } : null);
    if (!user) return;

    const email = user.email || '';
    const emailRegex = new RegExp('^' + email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');

    const byId = await SalaryPayment.find({ staffId: user._id }).lean();
    const byEmail = await SalaryPayment.find({ staffEmail: emailRegex }).lean();

    console.log('Payments byId:', byId.length);
    console.log('Payments byEmail:', byEmail.length);
    console.log('byId sample:', byId.slice(0, 3).map(p => ({ month: p.month, paidAmount: p.paidAmount })));
    console.log('byEmail sample:', byEmail.slice(0, 3).map(p => ({ month: p.month, paidAmount: p.paidAmount })));
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await mongoose.disconnect();
  }
})();
