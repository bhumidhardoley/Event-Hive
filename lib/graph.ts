import { Annotation, StateGraph, START, END } from "@langchain/langgraph"
import { ChatOllama } from "@langchain/ollama"

const model = new ChatOllama({ model: "qwen2.5", temperature: 0.1 })

export const State = Annotation.Root({
  chatHistory: Annotation<string>(), // Formatted chat log
  csvData: Annotation<string>(),
  
  // Dynamic Routing State
  nextAgents: Annotation<string[]>({ reducer: (x, y) => y ?? x, default: () => [] }),
  isSwarmDone: Annotation<boolean>({ reducer: (x, y) => y ?? x, default: () => false }),

  // Outputs
  marketingOutput: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => "" }),
  mailingOutput: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => "" }),
  schedulerOutput: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => "" })
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
If ALL 3 parameters are present, you MUST start your response with the exact text: ###START_SWARM###
(Example: "###START_SWARM### Perfect! I have all the details. I am starting the team now.")

Chat History:
${state.chatHistory}`
    }
  ], { runName: "supervisorNode" })

  const reply = String(res.content)
  const isReady = reply.includes("###START_SWARM###")

  return {
    // If we are NOT ready, we end the graph run here and wait for the user to reply again.
    isSwarmDone: !isReady, 
    // If we ARE ready, we queue up the agents!
    nextAgents: isReady ? ["marketingNode", "mailingNode", "schedulerNode"] : []
  }
}

const marketingAgent = async (state: AgentState) => {
  const res = await model.invoke([
    { 
      role: "system", 
      content: `You are the Marketing Agent. Write 100 words of promotional copy based on the event details in the chat.
      CRITICAL INSTRUCTION: Pay special attention to the LATEST USER MESSAGE in the history. If the user provided a correction or interrupted you to change something, you MUST follow their latest instruction.
      
      Context History:
      ${state.chatHistory}` 
    }
  ], { runName: "marketingNode" })
  return { marketingOutput: String(res.content) }
}

const mailingAgent = async (state: AgentState) => {
  const res = await model.invoke([
    { 
      role: "system", 
      content: `You are the Mailing Agent. Draft an email template based on the event details.
      CRITICAL INSTRUCTION: Pay special attention to the LATEST USER MESSAGE in the history. If the user provided a correction or interrupted you to change something, you MUST follow their latest instruction.
      
      CSV Data:\n${state.csvData}
      
      Context History:
      ${state.chatHistory}` 
    }
  ], { runName: "mailingNode" })
  return { mailingOutput: String(res.content) }
}

const schedulerAgent = async (state: AgentState) => {
  const res = await model.invoke([
    { 
      role: "system", 
      content: `You are the Scheduler Agent. Create a bulleted timeline.
      CRITICAL INSTRUCTION: Pay special attention to the LATEST USER MESSAGE in the history. If the user provided a correction or interrupted you to change something, you MUST follow their latest instruction.
      
      Context History:
      ${state.chatHistory}` 
    }
  ], { runName: "schedulerNode" })
  return { schedulerOutput: String(res.content) }
}

// DYNAMIC ROUTER
const dynamicRouter = (state: AgentState) => {
  if (state.isSwarmDone || state.nextAgents.length === 0) return END;
  return state.nextAgents[0]; // Go to the first agent in the queue
}

// POST-AGENT QUEUE MANAGER
const shiftQueue = (state: AgentState) => {
  const remaining = state.nextAgents.slice(1);
  return { nextAgents: remaining, isSwarmDone: remaining.length === 0 };
}

export const graph = new StateGraph(State)
  .addNode("supervisorNode", supervisorAgent)
  .addNode("marketingNode", marketingAgent)
  .addNode("mailingNode", mailingAgent)
  .addNode("schedulerNode", schedulerAgent)
  .addNode("queueManager", async (state) => shiftQueue(state)) // Invisible node to manage state

  .addEdge(START, "supervisorNode")
  
  // After Supervisor, either end (reply) or route to the first agent
  .addConditionalEdges("supervisorNode", (state) => state.isSwarmDone ? END : dynamicRouter(state))
  
  // After any agent runs, they go to the Queue Manager
  .addEdge("marketingNode", "queueManager")
  .addEdge("mailingNode", "queueManager")
  .addEdge("schedulerNode", "queueManager")

  // Queue Manager routes to the next agent, or ends
  .addConditionalEdges("queueManager", dynamicRouter)
  
  .compile()