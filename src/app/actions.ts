"use server" 
import { dbConnect } from "@/lib/db";
import { Group } from "@/models/Group";
import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb"; 
import clientPromise from "@/lib/mongodb"; 
import Task from "@/models/Task";

export async function saveGroupToDB(formData: any) {
  try {
    await dbConnect();
    // Ensure new groups have default values for pinning and sorting
    const newGroup = {
      ...formData,
      isPinned: false,
      createdAt: new Date().toISOString()
    };
    await Group.create(newGroup);
    revalidatePath('/groups'); 
    return { success: true };
  } catch (error) {
    console.error("Failed to save group:", error);
    return { success: false, error: "Database save failed" };
  }
}

export async function togglePinGroup(groupId: string, currentStatus: boolean) {
  try {
    await dbConnect(); // Use your existing Mongoose connection
    
    // Use Mongoose to update the group
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

export async function updateGroup(groupId: string, formData: any) {
  try {
    await dbConnect();
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
    await dbConnect(); // Use the same connection as Groups
    
    // Find all tasks
    const tasks = await Task.find({}).sort({ createdAt: -1 });

    // Convert Mongoose documents to plain objects for the frontend
    return tasks.map(task => ({
      id: task._id.toString(), // Convert ObjectId to string
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
    await dbConnect(); // Ensure DB is connected

    // Create directly using the Model
    const newTask = await Task.create({
      name: data.name,
      deadline: data.deadline,
      type: data.type
    });

    revalidatePath('/deliverables');
    
    // Return the new ID so the UI can update immediately
    return { success: true, newId: newTask._id.toString() };
  } catch (error) {
    console.error("Failed to create task:", error);
    return { success: false, error: 'Database Error' };
  }
}

export async function deleteTask(taskId: string) {
  try {
    await dbConnect();
    
    // Mongoose handles the string-to-ObjectId conversion automatically here
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