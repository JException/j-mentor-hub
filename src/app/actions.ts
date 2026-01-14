"use server" 
import { dbConnect } from "@/lib/db";
import { Group } from "@/models/Group";
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
    // Using lean() or JSON.parse(JSON.stringify()) is good practice to avoid 
    // Mongoose prototype errors when passing data to Client Components
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

    // 1. Sanitize the keys before saving
    const cleanData: any = {};
    Object.keys(scheduleData).forEach(name => {
      // This changes "David D. Grün" to "David D  Grün"
      cleanData[sanitizeKey(name)] = scheduleData[name];
    });

    // 2. Find the group
    const group = await Group.findById(groupId);
    if (!group) return { success: false, error: "Group not found" };

    // 3. Assign the CLEANED data, not the original scheduleData
    group.schedules = cleanData;
    group.markModified('schedules');
    // 4. CRITICAL: Tell Mongoose the 'schedules' field changed
    group.markModified('schedules');

    await group.save();

    revalidatePath('/parser'); 
    revalidatePath('/groups'); // Also refresh the groups page if you show schedules there
    
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
    // findByIdAndUpdate is efficient for updating the full group object
    await Group.findByIdAndUpdate(groupId, formData);
    revalidatePath('/groups');
    return { success: true };
  } catch (error) {
    console.error("Update failed:", error);
    return { success: false };
  }
}