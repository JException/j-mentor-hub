import mongoose, { Schema, model, models } from 'mongoose';

// 1. Define the File Schema
const FileSchema = new Schema({
  fileId: { type: String, required: true },
  name: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, default: 'PDF' },
  uploadDate: { type: Date, default: Date.now }
});

// 2. Update Group Schema
const GroupSchema = new Schema({
  groupName: { 
    type: String, 
    required: [true, "Group name is required"] 
  },
  thesisTitle: { 
    type: String, 
    default: "" 
  },
  members: { 
    type: [String], 
    default: [] 
  },
  projectManager: {
    type: String,
    default: ""
  },
  
  // --- MISSING FIELDS ADDED BELOW ---

  // Sections (e.g., ["TN31", "TN32"])
  sections: {
    type: [String],
    default: []
  },

  // Advisers (SE II and PM Professors)
  advisers: {
    seAdviser: { type: String, default: "" },
    pmAdviser: { type: String, default: "" }
  },

  // Consultation Schedule
  consultationSchedule: {
    day: { type: String, default: "" },
    time: { type: String, default: "" }
  },

  // ----------------------------------

  files: { 
    type: [FileSchema], 
    default: [] 
  },

  mockDefenseDate: { type: Date },
  mockDefenseMode: { type: String, enum: ['F2F', 'Online'] },
  mockDefenseGrades: [
    {
      panelistName: String,
      presentationScore: Number,
      paperScore: Number, 
      comment: String,
      timestamp: { type: Date, default: Date.now }
    }
  ]
  
}, { timestamps: true });

const Group = models.Group || model('Group', GroupSchema);

export default Group;