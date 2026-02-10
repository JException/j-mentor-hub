import mongoose from "mongoose";

const FileSchema = new mongoose.Schema({
  fileId: { type: String },
  name: { type: String },
  url: { type: String },
  uploadDate: { type: String },
  type: { type: String }
}, { _id: false });

const GroupSchema = new mongoose.Schema({
  groupName: { type: String, required: true },
  thesisTitle: { type: String },
  members: [{ type: String }],
  sections: [{ type: String }],
  projectManager: { type: String },
  
  advisers: {
    seAdviser: { type: String, default: "" },
    pmAdviser: { type: String, default: "" },
  },
  panelists: {
    chair: { type: String, default: "" },
    internal: { type: String, default: "" },
    external: { type: String, default: "" },
  },

  // Schedules & Files
  consultationSchedule: { day: String, time: String },
  mockDefenseDate: { type: String },
  mockDefenseMode: { type: String },
  
  files: [FileSchema],
  defense: {
    date: { type: String },
    time: { type: String },
    status: { type: String, default: "Pending" }
  },
  // 👇 UPDATED: Allows storing Raw Slider Data
  evaluations: [
    {
      evaluator: { type: String }, // e.g., "Panelist" or specific name
      scores: {
        // We use Mixed to store the raw object { "background": 5, "objectives": 4 }
        paperRaw: { type: mongoose.Schema.Types.Mixed, default: {} },
        presentationRaw: { type: mongoose.Schema.Types.Mixed, default: {} },
        individualRaw: { type: mongoose.Schema.Types.Mixed, default: {} },
        
        // Calculated Totals
        paperCalculated: { type: Number, default: 0 },
        presentationCalculated: { type: Number, default: 0 },
        grandTotal: { type: Number, default: 0 }
      },
      comments: { type: mongoose.Schema.Types.Mixed, default: [] }, 
      timestamp: { type: String },
      status: { type: String, default: "PENDING" }
    }
  ],
  // 👆 END UPDATED SECTION

  isPinned: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.Group || mongoose.model("Group", GroupSchema);