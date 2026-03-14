import { NextResponse } from "next/server"
import { ChatOllama } from "@langchain/ollama" // Or your Qwen model setup

// Configure your local model exactly as you did in lib/graph.ts
const model = new ChatOllama({ model: "qwen2.5", temperature: 0.1 })

export async function POST(req: Request) {
  try {
    const { agentName, prompt, currentOutput, chatHistory } = await req.json()

    // Format chat history so the agent knows the context
    const historyText = chatHistory.map((m: any) => `${m.role}: ${m.content}`).join("\n")

    const res = await model.invoke([
      {
        role: "system",
        content: `You are the ${agentName} agent for an event. 
        Here is your CURRENT output:
        ---
        ${currentOutput}
        ---
        
        The user has a specific revision request: "${prompt}"
        
        Revise your output to satisfy the user's request. Maintain the same formatting. 
        Return ONLY the newly revised text, nothing else.`
      }
    ])

    return NextResponse.json({ updatedText: String(res.content) })
  } catch (error) {
    return NextResponse.json({ error: "Failed to reprompt agent" }, { status: 500 })
  }
}