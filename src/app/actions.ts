"use server";

import { dbConnect } from "@/lib/db";
import Group from "@/models/Group";
import Task from "@/models/Task";
import Progress from '@/models/Progress';
import AuditLog  from "@/models/AuditLog"; 
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import { headers, cookies } from "next/headers"; 

// --- DEFINING THE INTERFACE ---
// Updated to include the flat panelist fields sent by the frontend
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
  panelChair?: string;    // Added
  panelInternal?: string; // Added
  panelExternal?: string; // Added
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

// --- HELPER: SANITIZE KEY ---
const sanitizeKey = (key: string) => {
  if (!key) return "";
  return key
    .toLowerCase()
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

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
    
    // Construct the group object with the nested panelists
    const newGroup = await Group.create({
      groupName: formData.groupName,
      thesisTitle: formData.thesisTitle,
      members: formData.members,
      sections: formData.sections || [],
      projectManager: formData.assignPM || "",
      advisers: { seAdviser: formData.se2Adviser || "", pmAdviser: formData.pmAdviser || "" },
      consultationSchedule: { day: formData.consultationDay || "", time: formData.consultationTime || "" },
      isPinned: false,
      // 👇 Mapped flat frontend fields to nested DB object
      panelists: {
        chair: formData.panelChair || "",
        internal: formData.panelInternal || "",
        external: formData.panelExternal || "",
      },
      createdAt: new Date().toISOString()
    });

    await recordAuditLog("Groups", "CREATE", `Created group: ${formData.groupName}`);
    
    revalidatePath('/groups'); 
    return { success: true };
  } catch (error) {
    console.error("Save Group Error:", error);
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

    if (mongoose.connection.readyState !== 1) {
      console.error("⚠️ MongoDB is not connected.");
      return [];
    }

    const groups = await Group.find({}).sort({ createdAt: -1 }).lean();
    
    const formattedGroups = groups.map((group: any) => ({
      ...group,
      _id: group._id.toString(),
      assignPM: group.projectManager || group.assignPM || "",
      se2Adviser: group.advisers?.seAdviser || group.se2Adviser || "",
      pmAdviser: group.advisers?.pmAdviser || group.pmAdviser || "",
      consultationDay: group.consultationSchedule?.day || group.consultationDay || "",
      consultationTime: group.consultationSchedule?.time || group.consultationTime || "",
      // 👇 Ensure panelists object exists in the response
      panelists: group.panelists || { chair: "", internal: "", external: "" }, 
      createdAt: group.createdAt ? new Date(group.createdAt).toISOString() : null,
      updatedAt: group.updatedAt ? new Date(group.updatedAt).toISOString() : null,
      mockDefenseDate: group.mockDefenseDate ? new Date(group.mockDefenseDate).toISOString() : null,
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
      mockDefenseGrades: (group.mockDefenseGrades || []).map((grade: any) => ({
        ...grade,
        _id: grade._id ? grade._id.toString() : null, 
        timestamp: grade.timestamp ? new Date(grade.timestamp).toISOString() : null
      }))
    }));

    return JSON.parse(JSON.stringify(formattedGroups));
  } catch (error) {
    console.error("Failed to fetch groups:", error);
    return [];
  }
}

// --- UPDATED: GROUP SCHEDULE SYNC ---
export async function updateGroupSchedule(groupId: string, scheduleData: any) {
  try {
    await dbConnect();
    
    const sanitizedData: Record<string, any> = {};
    Object.keys(scheduleData).forEach(key => {
      sanitizedData[sanitizeKey(key)] = scheduleData[key];
    });

    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $set: { schedules: sanitizedData } },
      { new: true } 
    ).lean();

    if (!updatedGroup) throw new Error("Group not found");

    revalidatePath('/groups');

    return { 
      success: true, 
      updatedGroup: JSON.parse(JSON.stringify(updatedGroup)) 
    };
  } catch (error) {
    console.error("Database Update Error:", error);
    return { success: false, error: "Failed to update schedule" };
  }
}

export async function deleteGroup(groupId: string) {
  try {
    await dbConnect();
    const group = await Group.findById(groupId);
    if (group) {
      await Group.findByIdAndDelete(groupId);
      await recordAuditLog("GROUPS", "DELETE", `Deleted group: ${group.groupName}`);
    }
    revalidatePath('/groups'); 
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

export async function updateGroup(groupId: string, formData: any) {
  try {
    await dbConnect();
    
    // 1. Construct the NESTED objects cleanly
    const advisersData = {
        seAdviser: formData.se2Adviser || formData.advisers?.seAdviser || "",
        pmAdviser: formData.pmAdviser || formData.advisers?.pmAdviser || ""
    };

    const panelistsData = {
        chair: formData.panelChair || formData.panelists?.chair || "",
        internal: formData.panelInternal || formData.panelists?.internal || "",
        external: formData.panelExternal || formData.panelists?.external || ""
    };

    // 2. Build the STRICT update payload
    // We do NOT use "...formData" here. We manually select fields to avoid conflicts.
    const updatePayload: any = {
        groupName: formData.groupName,
        thesisTitle: formData.thesisTitle,
        members: formData.members,
        sections: formData.sections || [],
        
        // Map Frontend names -> Schema names
        projectManager: formData.assignPM, 
        
        // Root level fields (per your latest schema)
        consultationDay: formData.consultationDay,   
        consultationTime: formData.consultationTime, 
        
        // Nested Objects
        advisers: advisersData,   // Saves the whole object at once
        panelists: panelistsData, // Saves the whole object at once
    };

    // 3. Handle optional complex objects (Only add if they exist)
    if (formData.finalDefense) {
        updatePayload.finalDefense = formData.finalDefense;
    }
    
    // 4. Handle Pin status specifically
    if (typeof formData.isPinned === 'boolean') {
        updatePayload.isPinned = formData.isPinned;
    }

    console.log("💾 Saving Clean Payload:", updatePayload);

    // 5. Execute Update
    const result = await Group.findByIdAndUpdate(groupId, updatePayload, { new: true });

    if (!result) {
        throw new Error("Group not found");
    }

    await recordAuditLog("Groups", "UPDATE", `Updated group details for: ${formData.groupName}`);
    revalidatePath('/groups');
    
    return { success: true };

  } catch (error: any) {
    console.error("❌ Update Group Error:", error);
    return { success: false, error: error.message }; 
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

// --- FILE MANAGEMENT ---

export async function addFileToGroup(groupId: string, fileUrl: string) {
  try {
    await dbConnect();
    if (!groupId || !mongoose.Types.ObjectId.isValid(groupId)) {
      return { success: false, error: "Invalid Group ID" };
    }

    const safeFileId = new mongoose.Types.ObjectId().toString();
    const safeName = `Draft - ${new Date().toLocaleDateString()}`;
    const safeDate = new Date().toISOString();
    const safeType = 'PDF';

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

    await recordAuditLog(
      "Files", 
      "UPLOAD", 
      `Uploaded file to group: ${updatedGroup.groupName}`,
      { groupId, fileName: safeName }
    );

    revalidatePath('/files');

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
    if (!mongoose.connection.db) {
        throw new Error("Database connection failed or not ready.");
    }

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

export async function editDefenseGrade(groupId: string, gradeId: string, updatedData: any) {
  try {
    await dbConnect();
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

    await recordAuditLog(
      "Mock Defense",
      "UPDATE",
      `Updated grade by panelist ${updatedData.name}`, 
      { groupId, gradeId, newScores: updatedData }
    );

    revalidatePath('/mock-defense');
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: "Failed to update grade" };
  }
}

export async function recordAuditLog(
  module: string, 
  action: string, 
  description: string, 
  details?: any, 
  user?: string 
) {
  try {
    await dbConnect();
    let finalUser = user;

    if (!finalUser) {
      const cookieStore = await cookies();
      const userCookie = cookieStore.get("audit_user");
      finalUser = userCookie ? userCookie.value : "Guest";
    }

    const headerList = await headers();
    const forwardedFor = headerList.get("x-forwarded-for");
    const realIp = forwardedFor ? forwardedFor.split(',')[0].trim() : "127.0.0.1";

    const logEntry = {
      module,
      action,
      description,
      ipAddress: realIp, 
      details,
      user: finalUser,
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
    return JSON.parse(JSON.stringify(logs));
  } catch (error) {
    console.error("Fetch Error:", error);
    return [];
  }
}

export async function clearAuditLogs() {
  try {
    await dbConnect();
    await AuditLog.deleteMany({});
    revalidatePath("/audit-trail"); 
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to clear logs:", error);
    return { success: false, error: "Failed to clear audit logs." };
  }
}

export async function setAuthCookie(username: string) {
  const cookieStore = await cookies();
  cookieStore.set("audit_user", username, { 
    path: "/", 
    secure: process.env.NODE_ENV === "production", 
    sameSite: "lax",
    maxAge: 60 * 60 * 24
  });
}