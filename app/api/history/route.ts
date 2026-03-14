// app/api/history/route.ts
import { NextResponse } from "next/server";
import mongoose from "mongoose";
// 👇 REMEMBER TO UPDATE THESE IMPORTS TO MATCH YOUR ACTUAL FILE PATHS!
import dbConnect from "@/lib/mongodb"; // or "@/lib/mongodb", wherever your db connection is
import Event from "@/models/EventData"; // wherever your mongoose model is

export async function GET() {
  try {
    await dbConnect();
    
    // Fetch all sessions, but ONLY grab the fields we need for the sidebar to keep it fast
    const history = await Event.find({})
      .sort({ createdAt: -1 }) // Newest first
      .select('sessionId eventName createdAt'); 

    return NextResponse.json({ success: true, history });
  } catch (error) {
    console.error("Failed to fetch history:", error);
    return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "Missing sessionId" }, { status: 400 });
    }

    await Event.deleteOne({ sessionId });
    
    return NextResponse.json({ success: true, message: "Session deleted" });
  } catch (error) {
    console.error("Failed to delete history:", error);
    return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
  }
}