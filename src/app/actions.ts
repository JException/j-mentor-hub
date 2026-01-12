"use server" 
import { dbConnect } from "@/lib/db";
import { Group } from "@/models/Group";
// ... the rest of your imports
import { revalidatePath } from "next/cache";


export async function saveGroupToDB(formData: any) {
  try {
    await dbConnect();
    await Group.create(formData);
    revalidatePath('/groups'); 
    return { success: true };
  } catch (error) {
    console.error("Failed to save group:", error);
    return { success: false, error: "Database save failed" };
  }
}


export async function getGroupsFromDB() {
  try {
    await dbConnect();
    const groups = await Group.find({}).sort({ createdAt: -1 });
    return JSON.parse(JSON.stringify(groups));
  } catch (error) {
    console.error("Failed to fetch groups:", error);
    return [];
  }
}

export async function updateGroupSchedule(groupId: string, scheduleData: any) {
  try {
    await dbConnect();
    
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


export async function deleteGroup(groupId: string) {
  try {
    await dbConnect();
    await Group.findByIdAndDelete(groupId);
    revalidatePath('/groups'); // Refresh the UI immediately
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

