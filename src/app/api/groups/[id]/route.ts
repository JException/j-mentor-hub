import { NextResponse } from 'next/server';
import { connectToDB } from '../../../../lib/mongoose';
import Group from '@/models/Group';

// ✅ Fix: Type 'params' as a Promise and await it
export async function PUT(
  req: Request, 
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    // 1. Await the params to get the ID (Required in Next.js 15+)
    const { id } = await params;
    const body = await req.json();
    
    await connectToDB();

    console.log("Updating Group ID:", id);
    console.log("New Status:", body.status);

    const updateData = {
      groupName: body.name,
      thesisTitle: body.title,
      members: body.members,
      sections: [body.section],
      
      // Nested updates
      "advisers.seAdviser": body.adviser,
      "defense.date": body.defenseDate,
      "defense.time": body.defenseTime,
      "defense.status": body.status,

      // Panelists
      "panelists.chair": body.panelChair,
      "panelists.internal": body.panelInternal,
      "panelists.external": body.panelExternal,
    };

    // 2. Perform the update
    const updatedGroup = await Group.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedGroup) {
      return NextResponse.json({ message: "Group not found" }, { status: 404 });
    }

    return NextResponse.json(updatedGroup, { status: 200 });

  } catch (error) {
    console.error("PUT Error:", error);
    return NextResponse.json({ message: "Error updating group" }, { status: 500 });
  }
}

// ✅ Fix: Apply the same 'await params' logic to DELETE
export async function DELETE(
  req: Request, 
  { params }: { params: Promise<{ id: string }> } 
) {
    try {
        const { id } = await params; // Await here too
        
        await connectToDB();
        await Group.findByIdAndDelete(id);
        
        return NextResponse.json({ message: "Deleted" }, { status: 200 });
    } catch (error) {
        console.error("DELETE Error:", error);
        return NextResponse.json({ message: "Error deleting group" }, { status: 500 });
    }
}