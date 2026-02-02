import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLog extends Document {
  action: string;
  module: string;
  ipAddress: string;
  description: string; // Ensure this matches the field used in your table
  createdAt: Date;
}

const AuditLogSchema: Schema = new Schema(
  {
    action: { type: String, required: false },
    module: { type: String, required: true },
    ipAddress: { type: String },
    description: { type: String, required: true }, // The table looks for this
  },
  { 
    timestamps: true // This automatically adds 'createdAt' which your table uses
  }
);

const AuditLog: Model<IAuditLog> = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;