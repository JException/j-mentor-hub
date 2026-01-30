"use server";

import { dbConnect } from "@/lib/db";
import Group from "@/models/Group";
import Task from "@/models/Task";
import Progress from '@/models/Progress';
import { revalidatePath } from "next/cache";
import mongoose from "mongoose"; 

// --- DEFINING THE INTERFACE ---
export interface GroupData {
  _id?: string;
  groupName: string;
  thesisTitle: string;
  members: string[];
  assignPM?: string;
  sections?: string[]; 
  se2Adviser?: string;
  pmAdviser?: string;
  consultationDay?: string;
  consultationTime?: string;
  files?: {
    fileId: string;
    name: string;
    url: string;
    uploadDate: string;
    type: string;
  }[];
  isPinned?: boolean;
  createdAt?: string;
}

// --- LEADERBOARD & PROGRESS ---
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

// --- GROUP MANAGEMENT ---
// --- GROUP MANAGEMENT ---
export async function saveGroupToDB(formData: GroupData) {
  try {
    await dbConnect();
    
    // 🔍 DEBUG: Log what we are trying to save
    console.log("Saving Group Data:", formData);

    await Group.create({
      groupName: formData.groupName,
      thesisTitle: formData.thesisTitle,
      members: formData.members,
      sections: formData.sections || [], // Ensure array is not undefined
      
      // ✅ FIX 1: Map "assignPM" (Frontend) to "projectManager" (Schema)
      projectManager: formData.assignPM || "",

      // ✅ FIX 2: Structure "Advisers" as a nested object
      advisers: {
        seAdviser: formData.se2Adviser || "",
        pmAdviser: formData.pmAdviser || ""
      },
      
      // ✅ FIX 3: Structure "Schedule" as a nested object
      consultationSchedule: {
        day: formData.consultationDay || "",
        time: formData.consultationTime || ""
      },

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
    // Fetch data and convert to plain JS objects
    const groups = await Group.find({}).sort({ createdAt: -1 }).lean();
    
    return groups.map((group: any) => ({
      ...group,
      // 1. Convert Root ID
      _id: group._id.toString(),
      assignPM: group.projectManager || group.assignPM || "",
      // 2. 👇 UNPACK ADVISERS (Fix for UI showing dashes)
      // If the nested object exists, grab the value. If not, fallback to the old flat field.
      se2Adviser: group.advisers?.seAdviser || group.se2Adviser || "",
      pmAdviser: group.advisers?.pmAdviser || group.pmAdviser || "",

      // 3. 👇 UNPACK SCHEDULE (Fix for UI showing "Unset")
      consultationDay: group.consultationSchedule?.day || group.consultationDay || "",
      consultationTime: group.consultationSchedule?.time || group.consultationTime || "",

      // 4. Convert Dates (Safety check)
      createdAt: group.createdAt ? new Date(group.createdAt).toISOString() : null,
      updatedAt: group.updatedAt ? new Date(group.updatedAt).toISOString() : null,
      mockDefenseDate: group.mockDefenseDate ? new Date(group.mockDefenseDate).toISOString() : null,

      // 5. Handle Files
      files: (group.files || []).map((file: any) => {
        if (typeof file === 'string') {
            return {
                fileId: Math.random().toString(),
                name: "Legacy File",
                url: file,
                uploadDate: new Date().toISOString(),
                type: "PDF"
            };
        }
        return {
            ...file,
            fileId: file.fileId || file._id?.toString() || Math.random().toString(),
            uploadDate: file.uploadDate ? new Date(file.uploadDate).toISOString() : null
        };
      }),

      // 6. Handle Defense Grades
      mockDefenseGrades: (group.mockDefenseGrades || []).map((grade: any) => ({
        ...grade,
        _id: grade._id ? grade._id.toString() : null, 
        timestamp: grade.timestamp ? new Date(grade.timestamp).toISOString() : null
      }))
    }));

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
    await Group.findByIdAndUpdate(groupId, formData);
    revalidatePath('/groups');
    return { success: true };
  } catch (error) {
    console.error("Update failed:", error);
    return { success: false };
  }
}

// --- TASKS / DELIVERABLES ---
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

// --- FILE UPLOAD ACTIONS (FIXED TO BYPASS SCHEMA) ---

// 1. ADD FILE TO GROUP
export async function addFileToGroup(groupId: string, fileUrl: string) {
  try {
    console.log("SERVER: Starting DB Connection...");
    await dbConnect();

    // ⭐ SAFE CHECK: Ensure DB is connected
    if (!mongoose.connection.db) {
        throw new Error("Database connection failed or not ready.");
    }

    console.log("SERVER: Connected. Searching for Group:", groupId);

    if (!groupId || !mongoose.Types.ObjectId.isValid(groupId)) {
      return { success: false, error: "Invalid Group ID format" };
    }

    const newFile = {
      fileId: new mongoose.Types.ObjectId().toString(),
      name: `Draft - ${new Date().toLocaleDateString('en-US')}`,
      url: fileUrl,
      uploadDate: new Date().toISOString(),
      type: 'PDF'
    };

    // 🛑 BYPASS SCHEMA: Use raw MongoDB driver
    const result = await mongoose.connection.db
      .collection('groups') 
      .updateOne(
        { _id: new mongoose.Types.ObjectId(groupId) },
        // ⭐ ADDED "as any" HERE TO FIX SQUIGGLY LINE
        { $push: { files: newFile } } as any 
      );

    if (result.matchedCount === 0) {
      console.error("SERVER ERROR: Group not found with ID:", groupId);
      return { success: false, error: "Group not found in DB" };
    }

    console.log("SERVER: Success! File saved using raw driver.");
    revalidatePath('/files'); 
    
    return { success: true, file: newFile };

  } catch (error: any) {
    console.error("SERVER CRASH ERROR:", error); 
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}

// 2. DELETE FILE FROM GROUP
export async function removeFileFromGroup(groupId: string, fileId: string) {
  try {
    await dbConnect();

    // ⭐ SAFE CHECK
    if (!mongoose.connection.db) {
        throw new Error("Database connection failed or not ready.");
    }

    // 🛑 BYPASS SCHEMA: Use raw MongoDB driver
    await mongoose.connection.db
      .collection('groups')
      .updateOne(
        { _id: new mongoose.Types.ObjectId(groupId) },
        { $pull: { files: { fileId: fileId } } } as any
      );

    revalidatePath('/files');
    return { success: true };
  } catch (error) {
    console.error("Error removing file:", error);
    return { success: false };
  }
}



// ... imports

// 1. SAVE SCHEDULE
// --- MOCK DEFENSE ACTIONS ---

// 1. SAVE SCHEDULE
export async function updateMockSchedule(scheduleData: { groupId: string, date: string, mode: string }[]) {
  try {
    console.log("🔄 Connecting to DB to save schedule...");
    await dbConnect(); // <--- CRITICAL: Must connect before querying!

    console.log("📦 Received Updates:", scheduleData);

    for (const item of scheduleData) {
      // Ensure we are not sending empty dates
      if (!item.date) continue;

      const result = await Group.findByIdAndUpdate(
        item.groupId,
        {
          mockDefenseDate: item.date,
          mockDefenseMode: item.mode
        },
        { new: true } // This option returns the updated doc for debugging
      );

      console.log(`✅ Updated Group ${item.groupId}:`, result ? "Success" : "Not Found");
    }

    // Revalidate the path so the UI updates immediately
    // import { revalidatePath } from 'next/cache';
    // revalidatePath('/mock-defense'); 
    
    return { success: true };
  } catch (e: any) {
    console.error("❌ Save Error:", e);
    return { success: false, error: e.message || "Failed to save schedule" };
  }
}

// 2. SUBMIT GRADE
export async function submitDefenseGrade(groupId: string, grade: any) {
  try {
    // @ts-ignore
    await Group.findByIdAndUpdate(groupId, {
      $push: { mockDefenseGrades: grade }
    });
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: "Failed to submit grade" };
  }
}

// --- GRADE MANAGEMENT ---

// 3. DELETE A GRADE
export async function deleteDefenseGrade(groupId: string, gradeId: string) {
  try {
    await dbConnect();
    await Group.findByIdAndUpdate(groupId, {
      $pull: { mockDefenseGrades: { _id: gradeId } }
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to delete grade" };
  }
}

// 4. EDIT A GRADE
export async function editDefenseGrade(groupId: string, gradeId: string, updatedData: any) {
  try {
    await dbConnect();
    // We use the positional operator $ to update the specific item in the array
    await Group.findOneAndUpdate(
      { "_id": groupId, "mockDefenseGrades._id": gradeId },
      {
        $set: {
          "mockDefenseGrades.$.presentationScore": updatedData.pres,
          "mockDefenseGrades.$.paperScore": updatedData.paper,
          "mockDefenseGrades.$.comment": updatedData.comment,
          "mockDefenseGrades.$.panelistName": updatedData.name
        }
      }
    );
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: "Failed to update grade" };
  }
}