"use server";

import { dbConnect } from "@/lib/db";
import Group from "@/models/Group";
import Task from "@/models/Task";
import Progress from '@/models/Progress';
import AuditLog  from "@/models/AuditLog"; 
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import { headers } from "next/headers";

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

  // ✅ FIX: Sanitize all returns
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
    
    await recordAuditLog("Leaderboard", "UPDATE", `Updated progress to ${status}`, { groupId, taskId });
    
    revalidatePath('/leaderboards');
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

// --- GROUP MANAGEMENT ---

export async function saveGroupToDB(formData: GroupData) {
  try {
    await dbConnect();
    const newGroup = await Group.create({
      groupName: formData.groupName,
      thesisTitle: formData.thesisTitle,
      members: formData.members,
      sections: formData.sections || [],
      projectManager: formData.assignPM || "",
      advisers: { seAdviser: formData.se2Adviser || "", pmAdviser: formData.pmAdviser || "" },
      consultationSchedule: { day: formData.consultationDay || "", time: formData.consultationTime || "" },
      isPinned: false,
      createdAt: new Date().toISOString()
    });

    await recordAuditLog("Groups", "CREATE", `Created group: ${formData.groupName}`);
    
    revalidatePath('/groups'); 
    return { success: true };
  } catch (error) {
    return { success: false };
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

export async function getGroupsFromDB(currentUser?: string) {
  try {
    await dbConnect();
    // Fetch data and convert to plain JS objects
    const groups = await Group.find({}).sort({ createdAt: -1 }).lean();
    
    // Process the groups to handle nested fields and nulls
    const formattedGroups = groups.map((group: any) => ({
      ...group,
      // 1. Convert Root ID
      _id: group._id.toString(),
      assignPM: group.projectManager || group.assignPM || "",
      
      // 2. UNPACK ADVISERS
      se2Adviser: group.advisers?.seAdviser || group.se2Adviser || "",
      pmAdviser: group.advisers?.pmAdviser || group.pmAdviser || "",

      // 3. UNPACK SCHEDULE
      consultationDay: group.consultationSchedule?.day || group.consultationDay || "",
      consultationTime: group.consultationSchedule?.time || group.consultationTime || "",

      // 4. Convert Dates
      createdAt: group.createdAt ? new Date(group.createdAt).toISOString() : null,
      updatedAt: group.updatedAt ? new Date(group.updatedAt).toISOString() : null,
      mockDefenseDate: group.mockDefenseDate ? new Date(group.mockDefenseDate).toISOString() : null,
      evaluations: group.evaluations || [],
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

    // ✅ FIX: "Nuclear" Deep Clean
    return JSON.parse(JSON.stringify(formattedGroups));

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
    const group = await Group.findById(groupId);
    if (group) {
      await Group.findByIdAndDelete(groupId);
      await recordAuditLog("Groups", "DELETE", `Deleted group: ${group.groupName}`, { groupId: groupId });
    }
    revalidatePath('/groups'); 
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

export async function updateGroup(groupId: string, formData: GroupData) {
  try {
    await dbConnect();
    await Group.findByIdAndUpdate(groupId, formData);
    await recordAuditLog("Groups", "UPDATE", `Updated group details for: ${formData.groupName}`);
    revalidatePath('/groups');
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

// --- TASKS / DELIVERABLES ---

export async function getTasks() {
  try {
    await dbConnect(); 
    const tasks = await Task.find({}).sort({ createdAt: -1 }).lean();

    const formattedTasks = tasks.map((task: any) => ({
      id: task._id.toString(), 
      name: task.name,
      deadline: task.deadline,
      type: task.type
    }));

    return JSON.parse(JSON.stringify(formattedTasks));
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

    await recordAuditLog("Deliverables", "CREATE", `Added new deliverable: ${data.name}`);
    revalidatePath('/deliverables');
    return { success: true, id: newTask._id.toString() };
  } catch (error) {
    return { success: false };
  }
}

export async function deleteTask(taskId: string) {
  try {
    await dbConnect();
    const task = await Task.findById(taskId);
    await Task.findByIdAndDelete(taskId);
    
    await recordAuditLog("Deliverables", "DELETE", `Removed deliverable: ${task?.name || taskId}`);
    revalidatePath("/deliverables");
    return { success: true };
  } catch (error) {
    return { success: false };
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

    const plainTasks = tasks.map((task: any) => ({
      id: task._id.toString(),
      taskName: task.name,      
      deadline: task.deadline,
      type: task.type
    }));

    return JSON.parse(JSON.stringify(plainTasks));
  } catch (error) {
    console.error("Failed to fetch deliverables:", error);
    return [];
  }
}

// --- FILE MANAGEMENT (UPDATED FIX) ---

export async function addFileToGroup(groupId: string, fileUrl: string) {
  try {
    await dbConnect();

    if (!groupId || !mongoose.Types.ObjectId.isValid(groupId)) {
      return { success: false, error: "Invalid Group ID" };
    }

    // 1. Define primitive strings first (Safety Step)
    const safeFileId = new mongoose.Types.ObjectId().toString();
    const safeName = `Draft - ${new Date().toLocaleDateString()}`;
    const safeDate = new Date().toISOString();
    const safeType = 'PDF';

    // 2. Update Database
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { 
        $push: { 
          files: {
            fileId: safeFileId,
            name: safeName,
            url: fileUrl,
            uploadDate: safeDate,
            type: safeType
          } 
        } 
      },
      { new: true } 
    );

    if (!updatedGroup) {
      return { success: false, error: "Group not found" };
    }

    // 3. Log Audit
    await recordAuditLog(
      "Files", 
      "UPLOAD", 
      `Uploaded file to group: ${updatedGroup.groupName}`,
      { groupId, fileName: safeName }
    );

    revalidatePath('/files');

    // 4. ✅ RETURN MANUAL OBJECT - "Nuclear Fix"
    // We construct a brand new object to ensure no Mongoose Hidden Properties exist.
    return JSON.parse(JSON.stringify({ 
      success: true, 
      file: {
        fileId: safeFileId,
        name: safeName,
        url: fileUrl,
        uploadDate: safeDate,
        type: safeType
      }
    }));

  } catch (error: any) {
    console.error("Upload Error:", error);
    return { success: false, error: error.message };
  }
}

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
    return JSON.parse(JSON.stringify({ success: true }));
  } catch (error) {
    console.error("Error removing file:", error);
    return { success: false };
  }
}

// --- MOCK DEFENSE ACTIONS ---

export async function updateMockSchedule(scheduleData: any[]): Promise<{ success: boolean; error?: string }> {
  try {
    await dbConnect();
    for (const item of scheduleData) {
      if (!item.date) continue;
      await Group.findByIdAndUpdate(item.groupId, {
        mockDefenseDate: item.date,
        mockDefenseMode: item.mode
      });
    }

    await recordAuditLog("Mock Defense", "UPDATE", "Updated the defense schedule for multiple groups");
    revalidatePath('/mock-defense'); 
    return { success: true };
  } catch (e: any) {
    console.error("❌ Save Error:", e);
    return { success: false, error: e.message || "Failed to save schedule" };
  }
}

export async function submitDefenseGrade(groupId: string, grade: any) {
  try {
    await dbConnect();
    await Group.findByIdAndUpdate(groupId, {
      $push: { mockDefenseGrades: grade }
    });
    
    await recordAuditLog(
      "Mock Defense", "GRADE", 
      `Submitted grade by ${grade.panelistName}`, 
      { groupId, scores: grade }
    );
    revalidatePath('/mock-defense');
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}

export async function deleteDefenseGrade(groupId: string, gradeId: string) {
  try {
    await dbConnect();
    await Group.findByIdAndUpdate(groupId, {
      $pull: { mockDefenseGrades: { _id: gradeId } }
    });

    await recordAuditLog("Mock Defense", "DELETE", `Deleted a defense grade for Group ID: ${groupId}`, { groupId, gradeId });

    revalidatePath('/mock-defense'); 
    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to delete grade" };
  }
}


// 4. EDIT A GRADE
export async function editDefenseGrade(groupId: string, gradeId: string, updatedData: any) {
  try {
    await dbConnect();
    
    // 1. Update the specific grade in the array
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

    // 2. Log the update
    await recordAuditLog(
      "Mock Defense",
      "UPDATE",
      `Updated grade by panelist ${updatedData.name}`, 
      { groupId, gradeId, newScores: updatedData }
    );

    revalidatePath('/mock-defense'); // Ensure UI updates
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: "Failed to update grade" };
  }
}

export async function recordAuditLog(module: string, action: string, description: string, details?: any) {
  try {
    await dbConnect();

    // 1. Get the headers object (await is required in newer Next.js versions)
    const headerList = await headers();
    
    // 2. Extract IP (x-forwarded-for usually contains "client, proxy1, proxy2")
    const forwardedFor = headerList.get("x-forwarded-for");
    const realIp = forwardedFor ? forwardedFor.split(',')[0].trim() : "127.0.0.1";

    const logEntry = {
      module,
      action,
      description,
      ipAddress: realIp, 
      details,
      createdAt: new Date()
    };
    
    await AuditLog.create(logEntry);
  } catch (error) {
    console.error("❌ DB SAVE FAILED:", error);
  }
}

export async function getAuditLogs() {
  try {
    await dbConnect();
    const logs = await AuditLog.find({}).sort({ createdAt: -1 }).lean();
    
    // DEBUG: Check what we are sending to the frontend
    if (logs.length > 0) {
      console.log("📤 FETCHING LOGS. First Log Item Keys:", Object.keys(logs[0]));
      console.log("   -> First Module Value:", (logs[0] as any).module);
    }
    
    return JSON.parse(JSON.stringify(logs));
  } catch (error) {
    console.error("Fetch Error:", error);
    return [];
  }
}

export async function clearAuditLogs() {
  try {
    await dbConnect();
    
    // Deletes all records in the collection
    await AuditLog.deleteMany({});
    
    // Tells Next.js to refresh the data on the Audit Trail page
    revalidatePath("/audit-trail"); 
    
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to clear logs:", error);
    return { success: false, error: "Failed to clear audit logs." };
  }
}

function getClientIp() {
  throw new Error("Function not implemented.");
}
// --- PASTE THIS AT THE BOTTOM OF src/app/actions.ts ---

export async function saveGroupEvaluation(data: any) {
  try {
    await dbConnect();
    
    if (!data.groupId || !data.evaluator) {
      return { success: false, error: "Missing Group ID or Evaluator Name" };
    }

    console.log("💾 Saving Evaluation for:", data.groupId, "by", data.evaluator);

    // 1. Construct the Evaluation Object
    // we ensure 'individual' is an object and 'comments' is a string
    const newEvaluation = {
      evaluator: data.evaluator,
      scores: {
        paper: Number(data.scores.paper) || 0,
        presentation: Number(data.scores.presentation) || 0,
        individual: data.scores.individual || {} 
      },
      grandTotal: Number(data.scores.grandTotal || data.grandTotal || 0),
      comments: data.comments || "", // ✅ FIX: Must be a String, not []
      timestamp: new Date().toISOString()
    };

    // 2. Remove any existing evaluation by this person (Upsert Logic)
    // This ensures we don't get duplicates if they click save twice
    await Group.findByIdAndUpdate(data.groupId, {
      $pull: { 
        evaluations: { evaluator: data.evaluator } 
      }
    });

    // 3. Add the new evaluation
    const updatedGroup = await Group.findByIdAndUpdate(
      data.groupId,
      { 
        $push: { evaluations: newEvaluation } 
      },
      { new: true }
    );

    if (!updatedGroup) {
      throw new Error("Group not found");
    }

    // 4. Record Audit Log
    await recordAuditLog(
      "Panel Board", 
      "GRADE", 
      `Panelist ${data.evaluator} saved an evaluation`,
      { groupId: data.groupId, totalScore: newEvaluation.grandTotal }
    );

    revalidatePath(`/panel-board/${data.groupId}`);
    
    return { success: true };

  } catch (error: any) {
    console.error("❌ Save Evaluation Error:", error);
    return { success: false, error: error.message || "Database save failed" };
  }
}