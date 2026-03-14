import { Annotation, StateGraph, START, END } from "@langchain/langgraph"
import { ChatOllama } from "@langchain/ollama"

// Initialize your local Qwen model
const model = new ChatOllama({
  model: "qwen2.5",
  temperature: 0.2
})

export const State = Annotation.Root({
  supervisorRequest: Annotation<string>(),
  mailingCSV: Annotation<string>(),
  
  humanFeedback: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => ""
  }),

  marketingInput: Annotation<string>(),
  mailingInput: Annotation<string>(),
  schedulerInput: Annotation<string>(),

  marketingOutput: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => "" }),
  mailingOutput: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => "" }),
  schedulerOutput: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => "" })
})

type AgentState = typeof State.State

const supervisorAgent = async (state: AgentState) => {
  const res = await model.invoke([
    {
      role: "system",
      content: `
You are an AI supervisor coordinating specialized agents for an event.
Your job is ONLY to analyze the user request and assign tasks.

IMPORTANT RULES:
- ONLY assign tasks to the agents.
- Return STRICT JSON ONLY. No markdown, no conversational text.

ORIGINAL USER REQUEST:
${state.supervisorRequest}

LATEST HUMAN CORRECTIONS (CRITICAL - OVERRIDE PREVIOUS FACTS):
${state.humanFeedback ? state.humanFeedback : "None yet."}

Instructions: If the human corrections mention a date change, new constraint, or specific detail, you MUST include that updated detail in the tasks for ALL relevant agents so they stay in sync.

Format:
{
 "marketing": "task for marketing agent",
 "mailing": "task for email agent",
 "scheduler": "task for scheduler agent"
}
`
    }
  ], { runName: "supervisorNode" })

  const raw = String(res.content)
  let marketing = "", mailing = "", scheduler = ""

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as any
      marketing = parsed.marketing ?? ""
      mailing = parsed.mailing ?? ""
      scheduler = parsed.scheduler ?? ""
    }
  } catch {
    marketing = state.supervisorRequest
    mailing = state.supervisorRequest
    scheduler = state.supervisorRequest
  }

  return {
    marketingInput: marketing,
    mailingInput: `${mailing}\n\nParticipant Data:\n${state.mailingCSV}`,
    schedulerInput: scheduler
  }
}

const marketingAgent = async (state: AgentState) => {
  const res = await model.invoke([
    {
      role: "system",
      content: `
You are THE CONTENT STRATEGIST & SOCIAL MEDIA AGENT.
Role: You act as the marketing lead. Generate the promotional copy, suggest a series of posts to build hype, and recommend optimal release times.

Task:
${state.marketingInput}

STRICT INSTRUCTIONS:
- Be incredibly concise. 
- DO NOT use conversational filler.
- Output your plan using STRICT bullet points only.
- Limit: Maximum 100 words.
- Do not invent unnecessary details.
`
    }
  ], { runName: "marketingNode" })

  return {
    marketingOutput: String(res.content)
  }
}

const mailingAgent = async (state: AgentState) => {
  const res = await model.invoke([
    {
      role: "system",
      content: `
You are THE COMMUNICATIONS & TARGETED MAILING AGENT.
Role: Streamlines participant outreach. Autonomously extract and validate emails, dynamically personalize the draft, and handle automated bulk distribution.

Task:
${state.mailingInput}

STRICT INSTRUCTIONS:
- Rely ONLY on the provided participant data. Do NOT make up fake emails.
- DO NOT use conversational filler.
- Output your strategy using STRICT bullet points only.
- Limit: Maximum 100 words.
`
    }
  ], { runName: "mailingNode" })

  return {
    mailingOutput: String(res.content)
  }
}

const schedulerAgent = async (state: AgentState) => {
  const res = await model.invoke([
    {
      role: "system",
      content: `
You are THE DYNAMIC SCHEDULER & CONFLICT RESOLVER AGENT.
Role: Manages the master timeline. Build the schedule, calculate constraints, and resolve clashes.

Task:
${state.schedulerInput}

STRICT INSTRUCTIONS:
- DO NOT use conversational filler.
- Output the timeline using STRICT bullet points only.
- Limit: Maximum 100 words.
`
    }
  ], { runName: "schedulerNode" })

  return {
    schedulerOutput: String(res.content)
  }
}

export const graph = new StateGraph(State)
  .addNode("supervisorNode", supervisorAgent)
  .addNode("marketingNode", marketingAgent)
  .addNode("mailingNode", mailingAgent)
  .addNode("schedulerNode", schedulerAgent)
  
  .addEdge(START, "supervisorNode")
  .addEdge("supervisorNode", "marketingNode")
  .addEdge("marketingNode", "mailingNode")
  .addEdge("mailingNode", "schedulerNode")
  .addEdge("schedulerNode", END)
  .compile()