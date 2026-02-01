import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { dbConnect } from '@/lib/db';
import AuditLog from '@/models/AuditLog'; 

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { status, attemptCount } = await req.json();
    
    // 1. Get IP
    const headersList = await headers(); 
    const forwardedFor = headersList.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0] : '::1'; // Default to local IPv6 if null

    // 2. Prepare Data (MATCHING YOUR EXISTING SCHEMA)
    // We use 'description' instead of 'details' so it shows up in your table automatically.
    const logData = {
      action: status === 'FAILED' ? 'Login Failed' : 'Login Success',
      module: 'System Gatekeeper', // This will appear in the Module column
      ipAddress: ip,
      description: status === 'FAILED' 
        ? `Security Alert: Failed access attempt #${attemptCount} from IP ${ip}` 
        : 'Authorized access granted to System Hub.',
      // Remove 'timestamp': new Date() -> Let Mongoose use createdAt automatically
    };

    console.log("📝 WRITING LOG:", logData);

    // 3. Create Entry
    await AuditLog.create(logData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to log attempt:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}