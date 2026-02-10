import mongoose, { Schema, model, models } from 'mongoose';

// 1. Define the File Schema (Sub-document)
const FileSchema = new Schema({
  fileId: { type: String, required: true },
  name: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, default: 'PDF' },
  uploadDate: { type: Date, default: Date.now }
});

// 2. Define the Main Group Schema
const GroupSchema = new Schema({
  groupName: { 
    type: String, 
    required: [true, "Group name is required"] 
  },
  thesisTitle: { type: String, default: "" },
  members: { type: [String], default: [] },
  projectManager: { type: String, default: "" },
  
  // --- SECTIONS & ADVISERS ---
  sections: { type: [String], default: [] },
  advisers: {
    seAdviser: { type: String, default: "" },
    pmAdviser: { type: String, default: "" }
  },

  // --- PANELISTS ---
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

  // --- EVALUATIONS ---
  evaluations: [
    {
      evaluator: { type: String },
      scores: {
        paper: { type: Number, default: 0 },
        presentation: { type: Number, default: 0 },
        individual: { type: mongoose.Schema.Types.Mixed, default: {} } 
      },
      grandTotal: { type: Number, default: 0 },
      comments: { type: String, default: "" },
      timestamp: { type: String }
    }
  ],

  // --- DEFENSE DETAILS (✅ Fixed!) ---
  defense: {
    date: { type: String },
    time: { type: String },
    status: { 
      type: String, 
      enum: ['Pending', 'Approved', 'Evaluated', 'Completed'], 
      default: 'Pending' 
    }
  },

  // --- MOCK DEFENSE ---
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
  },

  isPinned: { type: Boolean, default: false }

}, { timestamps: true });

// Prevent model overwrite in hot-reload
const Group = models.Group || model('Group', GroupSchema);

export default Group;