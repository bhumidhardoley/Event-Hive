// app/api/events/route.ts
import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import EventData from "@/models/EventData"

export async function POST(req: Request) {
  try {
    await dbConnect()
    const body = await req.json()
    const { sessionId, marketingOutput, mailingOutput, schedulerOutput, chatHistory } = body

    // Create or update the event data for this session
    const event = await EventData.findOneAndUpdate(
      { sessionId },
      { marketingOutput, mailingOutput, schedulerOutput, chatHistory },
      { new: true, upsert: true }
    )

    return NextResponse.json({ success: true, event })
  } catch (error) {
    console.error("Database POST Error:", error)
    return NextResponse.json({ success: false, error: "Failed to save to database" }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    await dbConnect()
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
    }

    const event = await EventData.findOne({ sessionId })
    return NextResponse.json({ success: true, event })
  } catch (error) {
    console.error("Database GET Error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch event" }, { status: 500 })
  }
}