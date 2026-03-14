import { Annotation, StateGraph, START, END } from "@langchain/langgraph"
import { ChatOllama } from "@langchain/ollama"

const model = new ChatOllama({ model: "qwen2.5", temperature: 0.1 })

export const State = Annotation.Root({
  chatHistory: Annotation<string>(),
  csvData: Annotation<string>(),
  eventName: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => "Untitled Event" }),

  nextAgents: Annotation<string[]>({ reducer: (x, y) => y ?? x, default: () => [] }),
  isSwarmDone: Annotation<boolean>({ reducer: (x, y) => y ?? x, default: () => false }),

  // Outputs
  marketingOutput: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => "" }),
  mailingOutput: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => "" }),
  schedulerOutput: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => "" }),
  whatsappOutput: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => "" }) // <-- NEW
})

type AgentState = typeof State.State

const supervisorAgent = async (state: AgentState) => {
  const res = await model.invoke([
    {
      role: "system",
      content: `You are the Event Hive Supervisor.
Your goal is to collect 3 parameters from the user: 1) Event Name/Theme, 2) Target Audience, 3) Date/Time.

Analyze the chat history. 
If ANY information is missing, reply to the user conversationally to ask for it. DO NOT USE JSON. Just write a normal message.
If ALL 3 parameters are present, you MUST start your response with the exact text: ###START_SWARM###| followed immediately by the extracted Event Name.
(Example: "###START_SWARM###|Tech Innovators 2026")

Chat History:
${state.chatHistory}`
    }
  ], { runName: "supervisorNode" })

  const reply = String(res.content)
  const isReady = reply.includes("###START_SWARM###")
  
  let extractedName = "Untitled Event"
  if (isReady) {
    const parts = reply.split("###START_SWARM###|")
    if (parts.length > 1) extractedName = parts[1].split("\n")[0].trim()
  }

  return {
    isSwarmDone: !isReady, 
    // Added whatsappNode to the queue!
    nextAgents: isReady ? ["marketingNode", "mailingNode", "schedulerNode", "whatsappNode"] : [],
    eventName: extractedName 
  }
}

// ... Keep your marketingAgent, mailingAgent, and schedulerAgent the same ...
const marketingAgent = async (state: AgentState) => {
  const res = await model.invoke([{ role: "system", content: `You are the Marketing Agent. Write 100 words of promotional copy based on the event details in the chat.\nCRITICAL INSTRUCTION: Pay special attention to the LATEST USER MESSAGE in the history. If the user provided a correction or interrupted you to change something, you MUST follow their latest instruction.\n\nContext History:\n${state.chatHistory}` }], { runName: "marketingNode" })
  return { marketingOutput: String(res.content) }
}

const mailingAgent = async (state: AgentState) => {
  const res = await model.invoke([{ role: "system", content: `You are the Mailing Agent. Draft an email template based on the event details.\nCRITICAL INSTRUCTION: Pay special attention to the LATEST USER MESSAGE in the history. If the user provided a correction or interrupted you to change something, you MUST follow their latest instruction.\n\nCSV Data:\n${state.csvData}\n\nContext History:\n${state.chatHistory}` }], { runName: "mailingNode" })
  return { mailingOutput: String(res.content) }
}

const schedulerAgent = async (state: AgentState) => {
  const res = await model.invoke([{ role: "system", content: `You are the Scheduler Agent. Create a bulleted timeline.\nCRITICAL INSTRUCTION: Pay special attention to the LATEST USER MESSAGE in the history. If the user provided a correction or interrupted you to change something, you MUST follow their latest instruction.\n\nContext History:\n${state.chatHistory}` }], { runName: "schedulerNode" })
  return { schedulerOutput: String(res.content) }
}

// NEW: WhatsApp Agent
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
  .addNode("whatsappNode", whatsappAgent) // Add new node
  .addNode("queueManager", async (state) => shiftQueue(state))

  .addEdge(START, "supervisorNode")
  .addConditionalEdges("supervisorNode", (state) => state.isSwarmDone ? END : dynamicRouter(state))
  .addEdge("marketingNode", "queueManager")
  .addEdge("mailingNode", "queueManager")
  .addEdge("schedulerNode", "queueManager")
  .addEdge("whatsappNode", "queueManager") // Add new edge
  .addConditionalEdges("queueManager", dynamicRouter)
  .compile()