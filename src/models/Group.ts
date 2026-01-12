import mongoose, { Schema, model, models } from 'mongoose';

export const GroupSchema = new mongoose.Schema({
  groupName: String,
  thesisTitle: String,
  members: [String],
  assignPM: String,
  // This field stores the heatmap/parsed data
  schedules: {
    type: Map,
    of: mongoose.Schema.Types.Mixed, 
    default: {}
  }
}, { timestamps: true });

// THIS IS THE MISSING LINK:
// We check if the 'Group' model already exists to prevent Next.js 
// from trying to create it twice every time you save a file.
export const Group = models.Group || model("Group", GroupSchema);