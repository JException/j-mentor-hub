import { NextResponse } from 'next/server';
import { connectToDB } from '../../../../lib/mongoose';
import Group from '@/models/Group';

// ✅ PUT: Update an existing Group
export async function PUT(
  req: Request, 
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    // 1. Await params (Next.js 15 requirement)
    const { id } = await params;
    const body = await req.json();
    
    await connectToDB();

    console.log(`📝 Updating Group ID: ${id}`);

    // 2. Extract Data (Handle Nested vs Flat)
    // Your frontend sends 'defense' as an object now, so we must look inside it.
    const defenseData = body.defense || {};
    const panelistsData = body.panelists || {};
    const advisersData = body.advisers || {};

    // 3. Prepare Update Object
    // We use "Dot Notation" (e.g., "defense.date") to update specific fields
    const updateData = {
      groupName: body.groupName || body.name,
      thesisTitle: body.thesisTitle || body.title,
      members: body.members,
      sections: Array.isArray(body.sections) ? body.sections : (body.section ? [body.section] : []),
      
      // ADVISERS
      "advisers.seAdviser": advisersData.seAdviser || body.adviser,
      "advisers.pmAdviser": advisersData.pmAdviser || body.pmAdviser,

      // PANELISTS
      "panelists.chair": panelistsData.chair || body.panelChair,
      "panelists.internal": panelistsData.internal || body.panelInternal,
      "panelists.external": panelistsData.external || body.panelExternal,

      // 👇 CRITICAL FIX: Look inside defenseData first
      "defense.date": defenseData.date || body.defenseDate,
      "defense.time": defenseData.time || body.defenseTime,
      "defense.status": defenseData.status || body.status || "Pending",
    };

    // 4. Perform the update
    const updatedGroup = await Group.findByIdAndUpdate(
      id, 
      { $set: updateData }, 
      { new: true, runValidators: true }
    );

    if (!updatedGroup) {
      return NextResponse.json({ message: "Group not found" }, { status: 404 });
    }

    console.log("✅ Update Success. Date saved:", updatedGroup.defense?.date);

    return NextResponse.json(updatedGroup, { status: 200 });

  } catch (error: any) {
    console.error("❌ PUT Error:", error);
    return NextResponse.json({ message: "Error updating group", error: error.message }, { status: 500 });
  }
}

// ✅ DELETE: Remove a Group
export async function DELETE(
  req: Request, 
  { params }: { params: Promise<{ id: string }> } 
) {
    try {
        const { id } = await params; 
        
        await connectToDB();
        await Group.findByIdAndDelete(id);
        
        return NextResponse.json({ message: "Deleted" }, { status: 200 });
    } catch (error) {
        console.error("DELETE Error:", error);
        return NextResponse.json({ message: "Error deleting group" }, { status: 500 });
    }
}