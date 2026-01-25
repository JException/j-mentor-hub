"use server" 
import { dbConnect } from "@/lib/db";
import { Group } from "@/models/Group";
import { revalidatePath } from "next/cache";
import Task from "@/models/Task";
import Progress from '@/models/Progress';

// --- DEFINING THE INTERFACE ---
export interface GroupData {
  _id?: string;
  groupName: string;
  thesisTitle: string;
  members: string[];
  assignPM?: string;
  // New fields
  sections?: string[]; 
  se2Adviser?: string;
  pmAdviser?: string;
  consultationDay?: string;
  consultationTime?: string;
  // End new fields
  isPinned?: boolean;
  createdAt?: string;
}
export async function getLeaderboardData() {
  await dbConnect();
  
  const groups = await Group.find({}).lean();
  const tasks = await Task.find({}).sort({ deadline: 1 }).lean(); 
  const progress = await Progress.find({}).lean();

  return {
    groups: JSON.parse(JSON.stringify(groups)),
    tasks: JSON.parse(JSON.stringify(tasks)),
    progress: JSON.parse(JSON.stringify(progress))
  };
}

export async function updateGroupProgress(groupId: string, taskId: string, status: string) {
  try {
    await dbConnect();
    await Progress.findOneAndUpdate(
      { groupId, taskId },
      { status, lastUpdated: new Date() },
      { upsert: true, new: true }
    );
    return { success: true };
  } catch (error) {
    console.error("Update failed", error);
    return { success: false };
  }
}

export async function saveGroupToDB(formData: GroupData) {
  try {
    await dbConnect();
    
    // We explicitly map the fields to ensure nothing is missed
    const newGroup = await Group.create({
      groupName: formData.groupName,
      thesisTitle: formData.thesisTitle,
      members: formData.members,
      sections: formData.sections,
      assignPM: formData.assignPM,
      se2Adviser: formData.se2Adviser,
      pmAdviser: formData.pmAdviser,
      
      // 👇 Explicitly saving the schedule
      consultationDay: formData.consultationDay,
      consultationTime: formData.consultationTime,

      isPinned: false,
      createdAt: new Date().toISOString()
    });
    
    revalidatePath('/groups'); 
    return { success: true };
  } catch (error) {
    console.error("Failed to save group:", error);
    return { success: false, error: "Database save failed" };
  }
}

export async function togglePinGroup(groupId: string, currentStatus: boolean) {
  try {
    await dbConnect(); 
    await Group.findByIdAndUpdate(
      groupId, 
      { isPinned: !currentStatus }
    );

    revalidatePath('/groups');
    return { success: true };
  } catch (error) {
    console.error("Pin toggle failed:", error);
    return { success: false };
  }
}

export async function getGroupsFromDB() {
  try {
    await dbConnect();
    // Sort by createdAt so newest groups appear first by default
    const groups = await Group.find({}).sort({ createdAt: -1 });
    return JSON.parse(JSON.stringify(groups));
  } catch (error) {
    console.error("Failed to fetch groups:", error);
    return [];
  }
}

const sanitizeKey = (key: string) => key.replace(/\./g, ' ');

export async function updateGroupSchedule(groupId: string, scheduleData: any) {
  try {
    await dbConnect();
    const cleanData: any = {};
    Object.keys(scheduleData).forEach(name => {
      cleanData[sanitizeKey(name)] = scheduleData[name];
    });

    const group = await Group.findById(groupId);
    if (!group) return { success: false, error: "Group not found" };

    group.schedules = cleanData;
    group.markModified('schedules');

    await group.save();
    revalidatePath('/parser'); 
    revalidatePath('/groups'); 
    
    return { success: true };
  } catch (error: any) {
    console.error("Save Error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteGroup(groupId: string) {
  try {
    await dbConnect();
    await Group.findByIdAndDelete(groupId);
    revalidatePath('/groups'); 
    return { success: true };
  } catch (error) {
    console.error("Delete failed:", error);
    return { success: false };
  }
}

export async function updateGroup(groupId: string, formData: GroupData) {
  try {
    await dbConnect();
    // This will update whatever fields are passed in formData
    await Group.findByIdAndUpdate(groupId, formData);
    revalidatePath('/groups');
    return { success: true };
  } catch (error) {
    console.error("Update failed:", error);
    return { success: false };
  }
}

export async function getTasks() {
  try {
    await dbConnect(); 
    const tasks = await Task.find({}).sort({ createdAt: -1 });

    return tasks.map(task => ({
      id: task._id.toString(), 
      name: task.name,
      deadline: task.deadline,
      type: task.type
    }));
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
    return [];
  }
}

export async function createTask(data: any) {
  try {
    await dbConnect(); 
    const newTask = await Task.create({
      name: data.name,
      deadline: data.deadline,
      type: data.type
    });

    revalidatePath('/deliverables');
    return { success: true, newId: newTask._id.toString() };
  } catch (error) {
    console.error("Failed to create task:", error);
    return { success: false, error: 'Database Error' };
  }
}

export async function deleteTask(taskId: string) {
  try {
    await dbConnect();
    await Task.findByIdAndDelete(taskId);
    revalidatePath("/deliverables");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete task:", error);
    return { success: false, error };
  }
}

export async function updateTask(id: string, data: any) {
  try {
    await dbConnect();
    await Task.findByIdAndUpdate(id, {
      name: data.name,
      deadline: data.deadline,
      type: data.type
    });
    revalidatePath('/deliverables');
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

export async function getDeliverablesFromDB() {
  try {
    await dbConnect();
    const tasks = await Task.find({}).sort({ deadline: 1 }).lean();

    return tasks.map((task: any) => ({
      id: task._id.toString(),
      taskName: task.name,      
      deadline: task.deadline,
      type: task.type
    }));
  } catch (error) {
    console.error("Failed to fetch deliverables:", error);
    return [];
  }
}