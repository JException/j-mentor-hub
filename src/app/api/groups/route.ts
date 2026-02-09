import { NextResponse } from 'next/server';
import { connectToDB } from '../../../lib/mongoose'; 
import Group from '@/models/Group'; 

// ✅ 1. Define User Once (Global Constant)
// We will use a "part" of the name for matching to be safer against typos.
const CURRENT_USER_FULL = "Mr. Justine Jude C. Pura";
const CURRENT_USER_NAME_ONLY = "Justine Jude"; // Used for fuzzy matching

export async function GET(req: Request) {
  try {
    await connectToDB();

    const { searchParams } = new URL(req.url);
    const viewMode = searchParams.get('view'); 
    
    // 🔍 REGEX: Matches "Justine Jude" (case insensitive) inside any string
    // This handles "Mr. Justine Jude Pura", "Justine Jude", etc.
    const userRegex = { $regex: CURRENT_USER_NAME_ONLY, $options: "i" };

    let filter: any = {};

    switch (viewMode) {
      case 'panel':
        // VIEW 1: PANELIST
        // Show groups where I AM the Chair OR Internal OR External
        filter = {
          $or: [
            { "panelists.chair": userRegex },
            { "panelists.internal": userRegex },
            { "panelists.external": userRegex }
          ]
        };
        break;

      case 'mentoring':
        // 🟢 VIEW 2: MENTORING (Logic: "Not Panel")
        // "If I am NOT the Chair AND NOT the Internal, I must be the Mentor."
        // We use $and with $not to exclude groups where you appear in panel fields.
        filter = {
          $and: [
            // Exclude groups where I am the Chair
            { "panelists.chair": { $not: userRegex } },
            // Exclude groups where I am the Internal Panel
            { "panelists.internal": { $not: userRegex } },
            // Optional: Exclude External too (if being external means you aren't mentor)
            { "panelists.external": { $not: userRegex } } 
          ]
        };
        break;

      case 'all':
      default:
        // VIEW 3: ALL GROUPS
        filter = {}; 
        break;
    }

    console.log(`🔍 Fetching View: [${viewMode}]`);

    const groups = await Group.find(filter).sort({ createdAt: -1 });

    return NextResponse.json(groups, { status: 200 });

  } catch (error) {
    console.error("Fetch Error:", error);
    return NextResponse.json({ message: "Error fetching groups" }, { status: 500 });
  }
}

// POST: Register a new Group (KEPT EXACTLY AS IS)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectToDB();

    console.log("📥 Receiving Registration Data:", body); 

    const newGroup = await Group.create({
      groupName: body.groupName || body.name || "Untitled Group",
      thesisTitle: body.thesisTitle || body.title || "No Title Yet",
      members: body.members || [], 
      sections: Array.isArray(body.sections) ? body.sections : [body.sections], 

      advisers: {
        seAdviser: body.se2Adviser || body.adviser || "", 
        pmAdviser: body.pmAdviser || "" 
      },
      
      consultationDay: body.consultationDay || "",
      consultationTime: body.consultationTime || "",

      panelists: {
        chair: body.panelChair || "",       
        internal: body.panelInternal || "", 
        external: body.panelExternal || ""  
      },

      defense: { 
        date: body.defenseDate || "",
        time: body.defenseTime || "",
        status: 'Pending',
        evaluations: []
      },

      finalDefense: {
        date: body.finalDefenseDate || "",
        time: body.finalDefenseTime || "",
      },
    });

    console.log("✅ Group Saved Successfully:", newGroup._id);
    return NextResponse.json(newGroup, { status: 201 });

  } catch (error: any) {
    console.error("❌ Registration Error:", error);
    return NextResponse.json(
      { message: "Error creating group", error: error.message }, 
      { status: 500 }
    );
  }
}