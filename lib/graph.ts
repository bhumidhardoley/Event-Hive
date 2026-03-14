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
      content: `You are the Event Hive Supervisor. Collect: 1) Event Name, 2) Target Audience, 3) Date/Time.
      If info is missing, ask conversationally. 
      If ready, start with: ###START_SWARM###|Extracted Name`
    },
    { role: "user", content: state.chatHistory }
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
    nextAgents: isReady ? ["marketingNode", "mailingNode", "schedulerNode", "whatsappNode"] : [],
    eventName: extractedName 
  }
}

const marketingAgent = async (state: AgentState) => {
  const res = await model.invoke([{ role: "system", content: `Marketing Agent: 100 words copy. History: ${state.chatHistory}` }], { runName: "marketingNode" })
  return { marketingOutput: String(res.content) }
}

const mailingAgent = async (state: AgentState) => {
  const res = await model.invoke([{ role: "system", content: `Mailing Agent: Email template. CSV: ${state.csvData}` }], { runName: "mailingNode" })
  return { mailingOutput: String(res.content) }
}

const schedulerAgent = async (state: AgentState) => {
  const res = await model.invoke([{ role: "system", content: `Scheduler Agent: Timeline. History: ${state.chatHistory}` }], { runName: "schedulerNode" })
  return { schedulerOutput: String(res.content) }
}

const whatsappAgent = async (state: AgentState) => {
  const res = await model.invoke([{ role: "system", content: `WhatsApp Agent: Write a short invite with *bolding* and emojis. Context: ${state.chatHistory}` }], { runName: "whatsappNode" })
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