import { NextResponse } from 'next/server';
import { connectToDB } from '../../../lib/mongoose'; 
import Group from '@/models/Group'; 

// ✅ 1. Define User Once (Global Constant)
const CURRENT_USER_FULL = "Mr. Justine Jude C. Pura";
const CURRENT_USER_NAME_ONLY = "Justine Jude"; // Used for fuzzy matching

// GET: Fetch Groups with Filters
export async function GET(req: Request) {
  try {
    await connectToDB();

    const { searchParams } = new URL(req.url);
    const viewMode = searchParams.get('view'); 
    
    // 🔍 REGEX: Matches "Justine Jude" (case insensitive)
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
        filter = {
          $and: [
            { "panelists.chair": { $not: userRegex } },
            { "panelists.internal": { $not: userRegex } },
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

    console.log(`🔍 Fetching View: [${viewMode || 'default'}]`);

    // Sort by newest first so your new group appears at the top
    const groups = await Group.find(filter).sort({ createdAt: -1 });

    return NextResponse.json(groups, { status: 200 });

  } catch (error) {
    console.error("Fetch Error:", error);
    return NextResponse.json({ message: "Error fetching groups" }, { status: 500 });
  }
}

// POST: Register a new Group
export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectToDB();

    console.log("📥 Receiving Registration Data:", body); 

    // FIX: Handle 'section' (singular from frontend) vs 'sections' (plural in DB)
    let sectionData = [];
    if (body.sections) {
        sectionData = Array.isArray(body.sections) ? body.sections : [body.sections];
    } else if (body.section) {
        sectionData = [body.section];
    }

    const newGroup = await Group.create({
      // Map 'name' from frontend to 'groupName' in DB
      groupName: body.groupName || body.name || "Untitled Group",
      
      // Map 'title' from frontend to 'thesisTitle' in DB
      thesisTitle: body.thesisTitle || body.title || "No Title Yet",
      
      members: body.members || [], 
      
      // ✅ FIX: Correctly maps the section array
      sections: sectionData, 

      advisers: {
        seAdviser: body.se2Adviser || body.adviser || "", 
        pmAdviser: body.pmAdviser || "" 
      },
      
      consultationDay: body.consultationDay || "",
      consultationTime: body.consultationTime || "",

      // NOTE: If you register a group here, Panelists are usually empty.
      // This means they will NOT show up in 'view=panel' until you assign a panelist.
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