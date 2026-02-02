import mongoose from 'mongoose';

const ProgressSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'ThesisGroup', required: true },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  status: { 
    type: String, 
    enum: ['Done', 'In Progress', 'Not Started'], 
    default: 'Not Started' 
  },
  lastUpdated: { type: Date, default: Date.now }
});

// Ensures a group can only have one status entry per task
// Note: If you get an index error, you might need to drop the collection in MongoDB Compass first
ProgressSchema.index({ groupId: 1, taskId: 1 }, { unique: true });

export default mongoose.models.Progress || mongoose.model('Progress', ProgressSchema);