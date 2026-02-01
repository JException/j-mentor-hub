import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema({
  module: { type: String, required: true },
  action: { type: String, required: true },
  description: { type: String, required: true },
  ipAddress: { type: String },
  details: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);