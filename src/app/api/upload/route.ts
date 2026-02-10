import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  // Check if token exists in the environment
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("❌ ERROR: BLOB_READ_WRITE_TOKEN is missing from .env.local");
    return NextResponse.json({ error: "Server Configuration Error: Token Missing" }, { status: 500 });
  }

  if (!filename) {
    return NextResponse.json({ error: 'Missing filename' }, { status: 400 });
  }

  try {
    const blob = await put(filename, request.body!, {
      access: 'public',
      addRandomSuffix: true,
    });

    return NextResponse.json(blob);
  } catch (error: any) {
    // This logs the REAL error to your VS Code terminal
    console.error("❌ VERCEL BLOB UPLOAD ERROR:", error.message);
    
    return NextResponse.json(
      { error: `Upload failed: ${error.message}` },
      { status: 500 }
    );
  }
}