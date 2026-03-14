import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import EventData from "@/models/EventData"

export async function POST(req: Request) {
  try {
    await dbConnect()
    const body = await req.json()
    
    // MUST have formOutput here
    const { sessionId, eventName, marketingOutput, mailingOutput, schedulerOutput, whatsappOutput, formOutput, chatHistory } = body

    const event = await EventData.findOneAndUpdate(
      { sessionId },
      { eventName, marketingOutput, mailingOutput, schedulerOutput, whatsappOutput, formOutput, chatHistory }, // MUST have formOutput here
      { new: true, upsert: true }
    )

    return NextResponse.json({ success: true, event })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to save" }, { status: 500 })
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

    // This will now automatically pull the whatsappOutput field too
    const event = await EventData.findOne({ sessionId })
    return NextResponse.json({ success: true, event })
  } catch (error) {
    console.error("Database GET Error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch event" }, { status: 500 })
  }
}