import mongoose, { Schema, model, models } from 'mongoose';

// 1. Define the File Schema (Sub-document)
const FileSchema = new Schema({
  fileId: { type: String, required: true },
  name: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, default: 'PDF' },
  uploadDate: { type: Date, default: Date.now }
});

// 2. Define the Group Schema
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
  
  // --- SECTIONS & ADVISERS ---
  sections: {
    type: [String],
    default: []
  },
  advisers: {
    seAdviser: { type: String, default: "" },
    pmAdviser: { type: String, default: "" }
  },

  // --- PANELISTS (Crucial for your Panel Board) ---
  panelists: {
    chair: { type: String, default: "" },
    internal: { type: String, default: "" },
    external: { type: String, default: "" }
  },

  // --- SCHEDULES ---
  consultationSchedule: {
    day: { type: String, default: "" },
    time: { type: String, default: "" }
  },

  // --- FILES ---
  files: { 
    type: [FileSchema], 
    default: [] 
  },

  // --- DEFENSE DETAILS ---
  defense: {
    date: { type: String },
    time: { type: String },
    status: { 
      type: String, 
      // ✅ Included 'Evaluated' here so your update works
      enum: ['Pending', 'Approved', 'Evaluated', 'Completed'], 
      default: 'Pending' 
    }
  },

  // --- MOCK DEFENSE (Separate Object) ---
  mockDefense: {
    date: { type: Date },
    mode: { type: String, enum: ['F2F', 'Online'] },
    grades: [
      {
        panelistName: String,
        presentationScore: Number,
        paperScore: Number, 
        comment: String,
        timestamp: { type: Date, default: Date.now }
      }
    ]
  }

}, { timestamps: true });

// Prevent model overwrite in hot-reload (Next.js specific)
const Group = models.Group || model('Group', GroupSchema);

export default Group;