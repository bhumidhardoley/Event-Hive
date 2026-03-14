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
  whatsappOutput: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => "" })
})

type AgentState = typeof State.State

const supervisorAgent = async (state: AgentState) => {
  const res = await model.invoke([
    {
      role: "system",
      content: `You are the Event Hive Supervisor.
Your STRICT goal is to collect EXACTLY 3 parameters from the user before proceeding:
1. Event Name or Theme
2. Target Audience
3. Date and Time

INSTRUCTIONS:
- Read the Chat History carefully.
- If ANY of the 3 parameters are missing, reply with a natural, friendly message asking for the missing information. DO NOT use any special tags.
- If AND ONLY IF all 3 parameters are clearly provided, write a short conversational message saying you are organizing the event (e.g., "Perfect, I have all the details! Organizing the tech meetup now..."). Then, append the exact tag "###START_SWARM###|" followed by the event name at the very end of your message.

Chat History:
${state.chatHistory}`
    }
  ], { runName: "supervisorNode" })

  const reply = String(res.content)
  const isReady = reply.includes("###START_SWARM###")
  
  let extractedName = state.eventName // Default to existing
  if (isReady) {
    const parts = reply.split("###START_SWARM###|")
    if (parts.length > 1) {
      extractedName = parts[1].split("\n")[0].trim()
    }
  }

  return {
    isSwarmDone: !isReady, 
    nextAgents: isReady ? ["marketingNode", "mailingNode", "schedulerNode", "whatsappNode"] : [],
    eventName: extractedName 
  }
}

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
  .addNode("whatsappNode", whatsappAgent) 
  .addNode("queueManager", async (state) => shiftQueue(state))
  .addEdge(START, "supervisorNode")
  .addConditionalEdges("supervisorNode", (state) => state.isSwarmDone ? END : dynamicRouter(state))
  .addEdge("marketingNode", "queueManager")
  .addEdge("mailingNode", "queueManager")
  .addEdge("schedulerNode", "queueManager")
  .addEdge("whatsappNode", "queueManager") 
  .addConditionalEdges("queueManager", dynamicRouter)
  .compile()