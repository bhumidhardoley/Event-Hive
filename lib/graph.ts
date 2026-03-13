
import { Annotation, StateGraph, START, END } from "@langchain/langgraph"
import { ChatOllama } from "@langchain/ollama"

const model = new ChatOllama({
  model: "qwen2.5",
  temperature: 0.2
})

export const State = Annotation.Root({
  supervisorRequest: Annotation<string>(),
  mailingCSV: Annotation<string>(),
  
  // NEW: Store all human feedback to keep context in sync
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

/* SUPERVISOR AGENT */
const supervisorAgent = async (state: AgentState) => {
  const res = await model.invoke([
    {
      role: "system",
      content: `
You are an AI supervisor coordinating three specialized agents: Marketing, Email Outreach, and Event Scheduler.

Your job is ONLY to analyze the user request and assign tasks.

IMPORTANT RULES:
- ONLY assign tasks to the agents.
- Return STRICT JSON ONLY. No markdown.

Format:
{
 "marketing": "task for marketing agent",
 "mailing": "task for email agent",
 "scheduler": "task for scheduler agent"
}

ORIGINAL USER REQUEST:
${state.supervisorRequest}

LATEST HUMAN CORRECTIONS (CRITICAL - OVERRIDE PREVIOUS FACTS):
${state.humanFeedback ? state.humanFeedback : "None yet."}

Instructions: If the human corrections mention a date change, new constraint, or specific detail, you MUST include that updated detail in the tasks for ALL relevant agents so they stay in sync.
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

// ... Keep your marketingAgent, mailingAgent, and schedulerAgent exactly as they were ...

/*
MARKETING AGENT
*/
const marketingAgent = async (state: AgentState) => {
  const res = await model.invoke([
    {
      role: "system",
      content: `
You are THE CONTENT STRATEGIST & SOCIAL MEDIA AGENT.
Role: You act as the marketing lead. 
Responsibilities: Generate the promotional copy, suggest a series of posts to build hype, analyze historical engagement data to recommend optimal release times, and queue the content for execution.

Task:
${state.marketingInput}

STRICT INSTRUCTIONS:
- Be incredibly concise. 
- DO NOT use conversational filler (e.g., "Here is your plan", "Sure!").
- Output your plan using STRICT bullet points only.
- Limit: Maximum 100 words.
- Do not invent unnecessary details or hallucinate events.
`
    }
  ], { runName: "marketingNode" })

  return {
    marketingOutput: String(res.content)
  }
}

/*
MAILING AGENT
*/
const mailingAgent = async (state: AgentState) => {
  const res = await model.invoke([
    {
      role: "system",
      content: `
You are THE COMMUNICATIONS & TARGETED MAILING AGENT.
Role: Streamlines participant outreach. 
Responsibilities: You receive an event registration sheet (CSV/Excel) and a base email draft. You autonomously extract and validate emails, dynamically personalize the draft for each recipient using data from the sheet, and handle the automated bulk distribution to segmented groups.

Task:
${state.mailingInput}

STRICT INSTRUCTIONS:
- Rely ONLY on the provided participant data. Do NOT make up fake emails or names.
- DO NOT use conversational filler.
- Output your strategy using STRICT bullet points only.
- Limit: Maximum 100 words.
- Be direct and professional.
`
    }
  ], { runName: "mailingNode" })

  return {
    mailingOutput: String(res.content)
  }
}

/*
SCHEDULER AGENT
*/
const schedulerAgent = async (state: AgentState) => {
  const res = await model.invoke([
    {
      role: "system",
      content: `
You are THE DYNAMIC SCHEDULER & CONFLICT RESOLVER AGENT.
Role: Manages the master timeline. 
Responsibilities: You take rough constraints and build the schedule. If a new constraint is introduced, autonomously recalculate the entire schedule, resolve new clashes, and define triggers for the email agent to notify participants of changes.

Task:
${state.schedulerInput}

STRICT INSTRUCTIONS:
- DO NOT use conversational filler.
- Output the timeline and conflict resolution using STRICT bullet points only.
- Limit: Maximum 100 words.
- Do not hallucinate constraints that the user did not provide.
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