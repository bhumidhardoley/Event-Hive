import { NextResponse } from "next/server"
import { ChatOllama } from "@langchain/ollama"

// Connect to your local Qwen model just like your other routes
const model = new ChatOllama({ model: "qwen2.5", temperature: 0.1 })

export async function POST(req: Request) {
  try {
    const { outputs } = await req.json()

    const prompt = `You are the Event Synchronization Coordinator.
    Review the following three event documents: Marketing Copy, Email Template, and Event Timeline.
    Your task is to cross-check them for factual consistency (event name, dates, times, locations) and fix any contradictions.
    DO NOT drastically change the content, length, or markdown formatting—only harmonize the facts so they all align perfectly.

    CURRENT MARKETING COPY:
    ${outputs.marketingOutput || "None"}

    CURRENT EMAIL TEMPLATE:
    ${outputs.mailingOutput || "None"}

    CURRENT TIMELINE:
    ${outputs.schedulerOutput || "None"}

    Return your output EXACTLY using these delimiters, with no conversational filler before or after:
    ===MARKETING===
    [Your synchronized marketing copy here]
    ===MAILING===
    [Your synchronized mailing template here]
    ===SCHEDULER===
    [Your synchronized timeline here]`

    const res = await model.invoke([{ role: "user", content: prompt }])
    const responseText = String(res.content)

    // Parse the AI's response using the delimiters
    const marketingMatch = responseText.match(/===MARKETING===\n([\s\S]*?)(?====MAILING===)/);
    const mailingMatch = responseText.match(/===MAILING===\n([\s\S]*?)(?====SCHEDULER===)/);
    const schedulerMatch = responseText.match(/===SCHEDULER===\n([\s\S]*)$/);

    // If a section fails to parse, fallback to the original input to prevent data loss
    const syncedOutputs = {
      marketing: marketingMatch ? marketingMatch[1].trim() : outputs.marketingOutput,
      mailing: mailingMatch ? mailingMatch[1].trim() : outputs.mailingOutput,
      scheduler: schedulerMatch ? schedulerMatch[1].trim() : outputs.schedulerOutput,
    }

    return NextResponse.json({ syncedOutputs })
    
  } catch (error) {
    console.error("Sync API Error:", error)
    return NextResponse.json({ error: "Failed to synchronize outputs" }, { status: 500 })
  }
}