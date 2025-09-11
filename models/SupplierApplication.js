const mongoose = require('mongoose');

const supplierApplicationSchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  supplierType: { type: String, enum: ['individual','company'], required: true },
  contactPerson: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  gstNumber: { type: String },
  tradeLicenseNo: { type: String },
  bankAccountNumber: { type: String },
  bankNameIfsc: { type: String },
  identityProofType: { type: String },
  identityProofUrl: { type: String },
  productCategory: { type: String },
  deliveryCapability: { type: String },
  previousClients: { type: String },
  declarationAccepted: { type: Boolean, default: false },
  status: { type: String, enum: ['submitted','reviewed','approved','rejected'], default: 'submitted' }
}, { timestamps: true });

module.exports = mongoose.model('SupplierApplication', supplierApplicationSchema);


