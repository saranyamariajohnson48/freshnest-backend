const SupplierApplication = require('../models/SupplierApplication');

exports.createApplication = async (req, res) => {
  try {
    const app = new SupplierApplication(req.body);
    await app.save();
    res.status(201).json({ success: true, application: app });
  } catch (error) {
    console.error('createApplication error:', error);
    res.status(400).json({ error: 'Invalid application data' });
  }
};

exports.listApplications = async (req, res) => {
  try {
    const apps = await SupplierApplication.find().sort({ createdAt: -1 });
    res.json({ success: true, applications: apps });
  } catch (error) {
    console.error('listApplications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
};

exports.updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const app = await SupplierApplication.findByIdAndUpdate(id, { status }, { new: true });
    if (!app) return res.status(404).json({ error: 'Application not found' });
    res.json({ success: true, application: app });
  } catch (error) {
    console.error('updateApplicationStatus error:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
};


