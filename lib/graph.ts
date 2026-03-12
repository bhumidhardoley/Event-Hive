import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";

/*
Ollama Model
*/
const model = new ChatOllama({
  model: "qwen2.5",
});

/*
Shared Graph State
*/
export const State = Annotation.Root({
  marketingInput: Annotation<string>(),
  mailingInput: Annotation<string>(),
  schedulerInput: Annotation<string>(),

  marketingOutput: Annotation<string>(),
  mailingOutput: Annotation<string>(),
  schedulerOutput: Annotation<string>(),

  supervisorRequest: Annotation<string>(),
  supervisorMode: Annotation<string>(), // edit | refine
  supervisorOutput: Annotation<string>(),
});

const supervisorAgent = async (state: typeof State.State) => {

  const response = await model.invoke([
    {
      role: "system",
      content: `
You are the Supervisor AI of an Event Management system.

You oversee:
• Marketing Strategy
• Email Communication
• Event Scheduling

The user may request:

EDIT → change specific parts
REFINE → improve the existing outputs

Return the updated result in structured Markdown.

Structure:

# Final Event Plan

## Marketing Strategy

## Email Campaign

## Event Schedule
`
    },
    {
      role: "user",
      content: `
Mode: ${state.supervisorMode}

User Request:
${state.supervisorRequest}

Marketing Output:
${state.marketingOutput}

Mailing Output:
${state.mailingOutput}

Schedule Output:
${state.schedulerOutput}
`
    }
  ]);

  return {
    supervisorOutput: response.content
  };
};
/*
Agent 1 — Content Strategist & Social Media Agent
*/
const marketingAgent = async (state: typeof State.State) => {

  const response = await model.invoke([
    {
  role: "system",
  content: `
Acts as the Content Strategist & Social Media Agent.

The organizer provides a raw event prompt.

Responsibilities:
• Generate promotional copy
• Suggest a series of social media posts
• Recommend optimal posting times
• Build hype for the event

IMPORTANT:
Return the response in clean Markdown format.

Structure the output like this:

# Marketing Campaign Plan

## Promotional Copy
(write the promotional text)

## Social Media Post Series
- Post 1
- Post 2
- Post 3

## Recommended Posting Times
| Platform | Time |
|----------|------|
| Instagram | |
| LinkedIn | |

Use proper headings, bullet points, and spacing.
`
},
    {
      role: "user",
      content: state.marketingInput,
    },
  ]);

  return {
    marketingOutput: response.content,
  };
};

/*
Agent 2 — Communications & Targeted Mailing Agent
*/
const mailingAgent = async (state: typeof State.State) => {

  const response = await model.invoke([
    {
  role: "system",
  content: `
Acts as the Communications & Targeted Mailing Agent.

Responsibilities:
• Extract and validate emails
• Personalize the provided email draft
• Segment participants
• Plan automated mailing

IMPORTANT:
Return the response in clean Markdown format.

Structure:

# Email Communication Plan

## Email Template
(write the personalized email)

## Audience Segments
- Segment 1
- Segment 2

## Distribution Strategy
- When emails should be sent
- Which groups receive them
`
},
    {
      role: "user",
      content: `
Marketing Context:
${state.marketingOutput}

Mailing Input:
${state.mailingInput}
      `,
    },
  ]);

  return {
    mailingOutput: response.content,
  };
};

/*
Agent 3 — Dynamic Scheduler & Conflict Resolver Agent
*/
const schedulerAgent = async (state: typeof State.State) => {

  const response = await model.invoke([
    {
  role: "system",
  content: `
Acts as the Dynamic Scheduler & Conflict Resolver Agent.

Responsibilities:
• Build the event schedule
• Detect conflicts
• Recalculate timelines when constraints change

IMPORTANT:
Return the response in clean Markdown format.

Structure:

# Event Schedule

## Timeline
| Time | Activity |
|------|----------|

## Conflict Resolution
Explain how conflicts were handled.

## Final Optimized Schedule
Provide the final schedule clearly.
`
},
    {
      role: "user",
      content: `
Marketing Plan:
${state.marketingOutput}

Communication Plan:
${state.mailingOutput}

Scheduler Input:
${state.schedulerInput}
      `,
    },
  ]);

  return {
    schedulerOutput: response.content,
  };
};

/*
Build Graph
*/
export const graph = new StateGraph(State)

  .addNode("marketing", marketingAgent)
  .addNode("mailing", mailingAgent)
  .addNode("scheduler", schedulerAgent)
  .addNode("supervisor", supervisorAgent)

  .addEdge(START, "marketing")
  .addEdge("marketing", "mailing")
  .addEdge("mailing", "scheduler")

  // supervisor runs only when requested
  .addEdge("scheduler", "supervisor")

  .addEdge("supervisor", END)

  .compile();