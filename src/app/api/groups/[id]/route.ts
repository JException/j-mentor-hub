import { NextResponse } from 'next/server';
import { connectToDB } from '../../../../lib/mongoose'; 
import Group from '@/models/Group';

// PUT: Update Group Details
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    await connectToDB();

    const updatedGroup = await Group.findByIdAndUpdate(
      id,
      {
        groupName: body.name,
        thesisTitle: body.title,
        members: body.members,
        sections: [body.section],
        'advisers.seAdviser': body.adviser,
        'defense.date': body.defenseDate,
        'defense.time': body.defenseTime,
        // We generally don't reset status automatically unless specified
      },
      { new: true }
    );

    return NextResponse.json(updatedGroup, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Error updating group" }, { status: 500 });
  }
}

// DELETE: Remove Group
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    await connectToDB();
    await Group.findByIdAndDelete(id);
    return NextResponse.json({ message: "Group deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Error deleting group" }, { status: 500 });
  }
}