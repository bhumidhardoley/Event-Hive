import { Annotation, StateGraph, START, END } from "@langchain/langgraph"
import { ChatOllama } from "@langchain/ollama"

const model = new ChatOllama({ model: "qwen2.5", temperature: 0.1 })

export const State = Annotation.Root({
  chatHistory: Annotation<string>(),
  csvData: Annotation<string>(),
  eventName: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => "Untitled Event" }),

  nextAgents: Annotation<string[]>({ reducer: (x, y) => y ?? x, default: () => [] }),
  isSwarmDone: Annotation<boolean>({ reducer: (x, y) => y ?? x, default: () => false }),
  needsForm: Annotation<boolean>({ reducer: (x, y) => y ?? x, default: () => false }),

  // Outputs
  marketingOutput: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => "" }),
  mailingOutput: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => "" }),
  schedulerOutput: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => "" }),
  whatsappOutput: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => "" }),
  formOutput: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => "" })
})

type AgentState = typeof State.State

const supervisorAgent = async (state: AgentState) => {
  const res = await model.invoke([
    {
      role: "system",
      content: `You are the Event Hive Supervisor.
Your STRICT goal is to collect EXACTLY 4 parameters from the user before proceeding:
1. Event Name or Theme
2. Target Audience
3. Date and Time
4. Do they want a registration form? (Yes/No)

INSTRUCTIONS:
- Read the Chat History carefully.
- If ANY of the 4 parameters are missing, reply with a natural, friendly message asking for the missing info.
- If ALL 4 are provided, write a short message saying you are organizing the event. 
- Then, append the exact tag "###START_SWARM###|" followed by the event name.
- Finally, at the very end of the name, append "|FORM_YES" if they want a form, or "|FORM_NO" if they do not. (e.g., "###START_SWARM###|Tech Meetup|FORM_YES")

Chat History:
${state.chatHistory}`
    }
  ], { runName: "supervisorNode" })

  const reply = String(res.content)
  const isReady = reply.includes("###START_SWARM###")
  
  let extractedName = state.eventName
  let wantsForm = false

  if (isReady) {
    const parts = reply.split("###START_SWARM###")
    if (parts.length > 1) {
      // Made parsing much more forgiving to catch "FORM_YES" even with spaces or weird formatting
      const dataStr = parts[1].split("\n")[0].toUpperCase()
      extractedName = dataStr.replace("|FORM_YES", "").replace("|FORM_NO", "").replace("|", "").trim()
      wantsForm = dataStr.includes("FORM_YES")
    }
  }

  // Dynamically add the formNode if requested
  const agentsToRun = ["marketingNode", "mailingNode", "schedulerNode", "whatsappNode"]
  if (wantsForm) agentsToRun.push("formNode")

  return {
    isSwarmDone: !isReady, 
    nextAgents: isReady ? agentsToRun : [],
    eventName: extractedName,
    needsForm: wantsForm
  }
}

const marketingAgent = async (state: AgentState) => {
  const res = await model.invoke([{ role: "system", content: `You are an elite Event Marketing Specialist. 
Your goal is to create a comprehensive, well-formatted marketing package for the event detailed in the chat history.

STRICT INSTRUCTIONS:
Structure your response EXACTLY using the following markdown headers and spacing.
CRITICAL: DO NOT use double spacing or leave excessive blank lines between sections. Keep the text compact.
CRITICAL: DO NOT generate a registration form, list of form questions, or form fields. Another AI agent handles that. Focus ONLY on the marketing copy.

### 📝 Main Promotional Copy
(Write ~100 words of exciting, professional, and persuasive copy. Include a compelling hook, the core value proposition, and a strong Call to Action. Just say "Link in bio" or "Register here" - DO NOT write the actual form.)

### 📸 Instagram Post Idea
- **Visual Suggestion:** (Briefly describe what the image, graphic, or reel should look like)
- **Caption:** (Write an engaging, platform-appropriate caption with emojis)
- **Hashtags:** (Provide 3-5 targeted hashtags)

### 🐦 Twitter/X Post Idea
- **Draft Tweet:** (Write a short, punchy, engaging tweet under 280 characters)
- **Hashtags:** (Provide 2-3 targeted hashtags)

CRITICAL: Output ONLY the formatted marketing content. DO NOT include any conversational filler (e.g., "Here is your marketing plan:"). If the user provided a correction in their latest message, you MUST follow it.

Context History:
${state.chatHistory}` }], { runName: "marketingNode" })
  return { marketingOutput: String(res.content) }
}

const mailingAgent = async (state: AgentState) => {
  const res = await model.invoke([{ role: "system", content: `You are a Corporate Communications Expert. 
Your goal is to draft a professional, high-converting email invitation template based on the event details.

STRICT INSTRUCTIONS:
- Include a clear, catchy Subject Line at the top.
- Keep paragraphs short (1-3 sentences) for easy reading.
- Include placeholders like [Recipient Name] where appropriate.
- CRITICAL: DO NOT create registration form fields in the email. Just use a placeholder like [Link to Registration Form].
- Formatting: Use basic markdown (bolding for key details). Output ONLY the email template. NO conversational filler.

CRITICAL: If the user provided a correction in their latest message, you MUST follow it.

Context History:
${state.chatHistory}` }], { runName: "mailingNode" })
  return { mailingOutput: String(res.content) }
}

const schedulerAgent = async (state: AgentState) => {
  const res = await model.invoke([{ role: "system", content: `You are an Expert Event Coordinator. 
Your goal is to create a logical, well-paced timeline/itinerary for the event.

STRICT INSTRUCTIONS:
- Format the output strictly as a bulleted list.
- Format: "- **[Time]**: [Activity Name] - [Brief Description]"
- Ensure the pacing is realistic (include breaks, registration, opening remarks, main events, and closing).
- CRITICAL: DO NOT include a registration form, list of form questions, or form fields. Another AI agent handles that. Focus ONLY on the timeline.
- Formatting: Output ONLY the timeline. NO conversational filler.

CRITICAL: If the user provided a correction in their latest message, you MUST follow it.

Context History:
${state.chatHistory}` }], { runName: "schedulerNode" })
  return { schedulerOutput: String(res.content) }
}

const whatsappAgent = async (state: AgentState) => {
  const res = await model.invoke([
    { 
      role: "system", 
      content: `You are the WhatsApp Agent. Write a WhatsApp-friendly message to invite people to the event.
      Analyze the context to determine if this is a personal event (use a friendly, warm tone with emojis) or an official/corporate event (use a professional, polite, and clean tone).
      Use WhatsApp formatting like *bold* for emphasis. Keep it relatively concise.
      
      Context History:
      ${state.chatHistory}` 
    }
  ], { runName: "whatsappNode" })
  return { whatsappOutput: String(res.content) }
}

const formAgent = async (state: AgentState) => {
  const res = await model.invoke([{ 
    role: "system", 
    content: `You are an Expert Registration Architect.
Determine 3 to 5 necessary registration fields for the event in the chat history.

STRICT INSTRUCTIONS:
- You MUST output ONLY a raw JSON array. Do not use markdown blocks (\`\`\`json). No conversational text.
- Standard fields (Name, Email) are assumed, do NOT include them. Only output specific fields (e.g., Dietary Restrictions, LinkedIn URL).
- Format MUST be exactly like this example:
[
  {"title": "Dietary Restrictions", "type": "TEXT"},
  {"title": "T-Shirt Size", "type": "TEXT"}
]

Context History:
${state.chatHistory}` 
  }], { runName: "formNode" })
  return { formOutput: String(res.content) }
}

const dynamicRouter = (state: AgentState) => {
  if (state.isSwarmDone || state.nextAgents.length === 0) return END;
  return state.nextAgents[0]; 
}

const shiftQueue = (state: AgentState) => {
  const remaining = state.nextAgents.slice(1);
  return { nextAgents: remaining, isSwarmDone: remaining.length === 0 };
}

export const graph = new StateGraph(State)
  .addNode("supervisorNode", supervisorAgent)
  .addNode("marketingNode", marketingAgent) 
  .addNode("mailingNode", mailingAgent)
  .addNode("schedulerNode", schedulerAgent)
  .addNode("whatsappNode", whatsappAgent) 
  .addNode("formNode", formAgent)
  .addNode("queueManager", async (state) => shiftQueue(state))
  .addEdge(START, "supervisorNode")
  .addConditionalEdges("supervisorNode", (state) => state.isSwarmDone ? END : dynamicRouter(state))
  .addEdge("marketingNode", "queueManager")
  .addEdge("mailingNode", "queueManager")
  .addEdge("schedulerNode", "queueManager")
  .addEdge("whatsappNode", "queueManager") 
  .addEdge("formNode", "queueManager")
  .addConditionalEdges("queueManager", dynamicRouter)
  .compile()

export async function POST(req: Request) {
  const body = await req.json()
  const { chatHistory, csvData, sessionId } = body

  // Format history for the LLM
  const formattedHistory = chatHistory
    .map((msg: any) => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join("\n")

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      const safeClose = () => { if (!closed) { closed = true; try { controller.close() } catch {} } }

      try {
        const events = await graph.streamEvents(
          { chatHistory: formattedHistory, csvData: csvData ?? "" },
          { version: "v2", signal: req.signal } 
        )

        for await (const event of events) {
          if (closed) break

          if (event.event === "on_chat_model_stream") {
            const chunk = event.data?.chunk?.content
            // FIX: Added "formNode" so it actually gets sent to the frontend!
            if (chunk && ["supervisorNode", "marketingNode", "mailingNode", "schedulerNode", "whatsappNode", "formNode"].includes(event.name)) {
              const payload = JSON.stringify({ node: event.name, text: chunk })
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`))
            }
          }
        }
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
        safeClose()
      } catch (error: any) {
        if (error.name === "AbortError" || error.message.includes("abort")) {
          console.log("Stream stopped by user.")
        }
        safeClose() 
      }
    }
  })

  return new Response(stream, { headers: { "Content-Type": "text/event-stream" } })
}