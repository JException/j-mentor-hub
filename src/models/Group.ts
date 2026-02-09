import mongoose, { Schema, model, models } from 'mongoose';

// 1. File Schema (Keep as is)
const FileSchema = new Schema({
  fileId: { type: String, required: true },
  name: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, default: 'PDF' },
  uploadDate: { type: Date, default: Date.now }
});

// 2. Evaluation Schema (For the Panel Cockpit Scores)
const EvaluationSchema = new Schema({
  panelistId: String, // Or name if no auth system yet
  presentationScore: { type: Number, default: 0 },
  manuscriptScore: { type: Number, default: 0 },
  systemScore: { type: Number, default: 0 },
  totalScore: { type: Number, default: 0 },
  comments: [{
    type: { type: String, enum: ['major', 'minor', 'question'] },
    text: String,
    timestamp: { type: Date, default: Date.now }
  }],
  isFinalized: { type: Boolean, default: false }
});

// 3. MAIN GROUP SCHEMA
const GroupSchema = new Schema({

  groupName: { type: String, required: true },
  thesisTitle: { type: String, default: "" },
  members: { type: [String], default: [] },
  sections: { type: [String], default: [] }, 

  projectManager: { type: String, default: "" },
  
  // Mentoring Advisers
  advisers: {
    seAdviser: { type: String, default: "" },
    pmAdviser: { type: String, default: "" }
  },

  consultationDay: { type: String, default: "" },
  consultationTime: { type: String, default: "" },
  schedules: { type: Map, of: Object, default: {} },
  
  // 🟢 UPDATED: Specific Roles for Panelists
  panelists: { 
    chair: { type: String, default: "" },
    internal: { type: String, default: "" },
    external: { type: String, default: "" }
  },

  defense: { // Mock Defense
    date: { type: String, default: "" }, 
    time: { type: String, default: "" }, 
    room: { type: String, default: "" },
    status: { 
      type: String, 
      enum: ['Pending', 'Evaluated', 'Missed'], 
      default: 'Pending' 
    },
    evaluations: [EvaluationSchema] 
  },

  finalDefense: { // Final defense details
    date: { type: String, default: "" }, 
    time: { type: String, default: "" },
  },

  files: { type: [FileSchema], default: [] },

}, { timestamps: true });

const Group = models.Group || model('Group', GroupSchema);

export default Group;