import { NextResponse } from 'next/server';
// 👇 USE THIS EXACT RELATIVE PATH (5 sets of dots)
import { connectToDB } from '../../../../../lib/mongoose'; 
import Group from '@/models/Group';

// ✅ FIX: params is a Promise in Next.js 15
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // 1. Await params before using the ID
    const { id } = await params;

    // 2. Parse the body data
    const { scores, comments, evaluator } = await req.json();
    
    // 3. Connect to Database
    await connectToDB();

    // 4. Find the Group
    const group = await Group.findById(id);
    if (!group) {
      return NextResponse.json({ message: "Group not found" }, { status: 404 });
    }

    // 5. Update or Add Evaluation
    // Ensure the defense/evaluations structure exists
    if (!group.defense) group.defense = {};
    if (!group.defense.evaluations) group.defense.evaluations = [];

    // Check if this specific evaluator has already graded
    const existingIndex = group.defense.evaluations.findIndex((e: any) => e.evaluator === evaluator);

    const evaluationData = {
      evaluator,
      scores,
      comments,
      date: new Date()
    };

    if (existingIndex > -1) {
      // Update existing evaluation
      group.defense.evaluations[existingIndex] = evaluationData;
    } else {
      // Push new evaluation
      group.defense.evaluations.push(evaluationData);
    }

    // 6. Save changes
    await group.save();

    return NextResponse.json({ message: "Saved successfully", group }, { status: 200 });

  } catch (error) {
    console.error("Save Error:", error);
    return NextResponse.json({ message: "Error saving evaluation" }, { status: 500 });
  }
}