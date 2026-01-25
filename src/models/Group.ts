import mongoose, { Schema } from "mongoose";

// 1. Force delete the old model from Mongoose's cache to ensure it reloads
if (mongoose.models.Group) {
  delete mongoose.models.Group;
}

const GroupSchema = new Schema({
  groupName: { type: String, required: true },
  thesisTitle: { type: String, required: true },
  members: [String],
  assignPM: String,

// --- NEW FIELDS ADDED HERE ---
  sections: { type: [String], default: [] }, // Stores ["TN31", "TN32"]
  se2Adviser: { type: String, default: "" },
  pmAdviser: { type: String, default: "" },
  // ------------------
  consultationDay: { type: String, default: "" },
  consultationTime: { type: String, default: "" },
  

  schedules: {
    type: Schema.Types.Mixed,
    default: {}
  },
  isPinned: { type: Boolean, default: false }, 
  createdAt: { type: Date, default: Date.now }
}, { 
  timestamps: true,
  minimize: false 
});

export const Group = mongoose.model("Group", GroupSchema);