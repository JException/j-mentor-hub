"use server" 
import { dbConnect } from "@/lib/db";
import { Group } from "@/models/Group";
import { revalidatePath } from "next/cache";
// Fix: Import ObjectId to resolve the ReferenceError
import { ObjectId } from "mongodb"; 

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