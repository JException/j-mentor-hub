import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import AuditLog from '@/models/AuditLog'; 

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    // Destructure specifically
    const { status, attemptCount, user } = body;

    console.log("API FINAL RECEIVE:", { status, user, attemptCount }); // Check this log!

    const ip = (req.headers.get('x-forwarded-for') ?? '::1').split(',')[0];

    let description = '';
    
    if (status === 'FAILED') {
        description = `Security Alert: Failed access attempt #${attemptCount} from IP ${ip}`;
    } else {
        // If user is missing here, it means the frontend didn't send it.
        // But with the new code, it is impossible for 'user' to be undefined if status is SUCCESS.
        description = `Authorized access granted to ${user || 'System Hub'}.`;
    }

    await AuditLog.create({
      action: status === 'FAILED' ? 'Login Failed' : 'Login Success',
      module: 'System Gatekeeper',
      ipAddress: ip,
      description: description,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}