"use server"
import { connectDB } from "@/lib/db";
import { Group } from "@/models/Group";
import { revalidatePath } from "next/cache";

/**
 * Saves a new thesis group to the database
 */
export async function saveGroupToDB(formData: any) {
  try {
    await connectDB();
    await Group.create(formData);
    revalidatePath('/groups'); 
    return { success: true };
  } catch (error) {
    console.error("Failed to save group:", error);
    return { success: false, error: "Database save failed" };
  }
}

/**
 * Fetches all groups to populate your dropdown
 */
export async function getGroupsFromDB() {
  try {
    await connectDB();
    const groups = await Group.find({}).sort({ createdAt: -1 });
    return JSON.parse(JSON.stringify(groups));
  } catch (error) {
    console.error("Failed to fetch groups:", error);
    return [];
  }
}

/**
 * UPDATES an existing group with the parsed schedules
 * This is the function the error said was missing!
 */
export async function updateGroupSchedule(groupId: string, scheduleData: any) {
  try {
    await connectDB();
    
    // Find the group and update only the 'schedules' field
    await Group.findByIdAndUpdate(groupId, { 
      $set: { schedules: scheduleData } 
    });

    revalidatePath('/parser'); 
    return { success: true };
  } catch (error) {
    console.error("Failed to update schedule in DB:", error);
    return { success: false, error: "Failed to save schedule" };
  }
}

/**
 * Deletes a group by its ID
 */
export async function deleteGroup(groupId: string) {
  try {
    await connectDB();
    await Group.findByIdAndDelete(groupId);
    revalidatePath('/groups'); // Refresh the UI immediately
    return { success: true };
  } catch (error) {
    console.error("Delete failed:", error);
    return { success: false };
  }
}

/**
 * Updates an existing group's details
 */
export async function updateGroup(groupId: string, formData: any) {
  try {
    await connectDB();
    await Group.findByIdAndUpdate(groupId, formData);
    revalidatePath('/groups');
    return { success: true };
  } catch (error) {
    console.error("Update failed:", error);
    return { success: false };
  }
}