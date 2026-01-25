// src/models/Task.ts
import mongoose, { Schema, Document, model, models } from 'mongoose';

export interface ITask extends Document {
  name: string;
  deadline: string; // Storing as YYYY-MM-DD string is fine for this
  type: 'Course Deadline' | 'Internal Deadline' | 'Others';
  createdAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    name: { type: String, required: true },
    deadline: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['Course Deadline', 'Internal Deadline', 'Others'],
      default: 'Others' 
    },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt
);

// Prevent overwriting the model if it already exists (Next.js hot reload fix)
const Task = models.Task || model<ITask>('Task', TaskSchema);

export default Task;