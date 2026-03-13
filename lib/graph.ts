import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";

/*
Ollama Model
*/
const model = new ChatOllama({
  model: "qwen2.5",
  temperature: 0.4
});

export const State = Annotation.Root({
  marketingInput: Annotation<string>(),
  mailingInput: Annotation<string>(),
  schedulerInput: Annotation<string>(),

  // Reducers ensure that as we move from Node A to Node B, 
  // the data from Node A isn't lost or "reset".
  marketingOutput: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  mailingOutput: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  schedulerOutput: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),

  supervisorRequest: Annotation<string>(),
  supervisorMode: Annotation<string>(), 
  supervisorOutput: Annotation<string>(),
});

/*
Agent 1 — Marketing Strategy
*/
/*
Agent 1 — Marketing Strategy
*/
const marketingAgent = async (state: typeof State.State) => {
  const response = await model.invoke([
    {
      role: "system",
      content: `
# Marketing Lead Agent

You ACT as the **Marketing Lead** for an event platform.

## Responsibilities
The organizer provides a raw text prompt describing the campaign goals.

You must:

1. Generate promotional marketing copy.
2. Suggest a **series of social media posts** to build hype.
3. Recommend **optimal release timing** for posts.
4. Structure the campaign plan clearly.

## Context
Follow the organizer's prompt **very strictly** and do not introduce unrelated assumptions.

Organizer Input:
${state.marketingInput}

## Output Format (Markdown)

### Promotional Copy
...

### Social Media Hype Plan
- Post 1
- Post 2
- Post 3

### Recommended Release Timing
...

## Rules
- Respond **ONLY in English**
- Follow the provided context **very strictly**
- Keep the response **under 250 words**
- Do NOT exceed the word limit
`
    },
    {
      role: "user",
      content: state.marketingInput,
    },
  ], { runName: "marketingNode" });

  return {
    marketingOutput: String(response.content)
  };
};

/*
Agent 2 — Communications & Mailing
*/
/*
Agent 2 — Communications & Mailing
*/
const mailingAgent = async (state: typeof State.State) => {
  const response = await model.invoke([
    {
      role: "system",
      content: `
# Communications & Targeted Mailing Agent

You act as the **Communications & Targeted Mailing Agent**.

## Responsibilities
The organizer uploads a **CSV/Excel event registration sheet** and provides a base email draft.

You must:

1. Extract and validate email addresses.
2. Personalize the email content for recipients.
3. Segment participants into relevant groups.
4. Plan the outreach strategy.

## Context Inputs

Organizer Prompt:
${state.marketingInput}

Marketing Strategy:
${state.marketingOutput}

CSV Registration Data:
${state.mailingInput}

Follow these inputs **very strictly**.

## Output Format (Markdown)

### Email Personalization Strategy
...

### Audience Segmentation
...

### Outreach Execution Plan
...

## Rules
- Respond **ONLY in English**
- Follow the provided context **very strictly**
- Maximum **250 words**
- Do NOT exceed the word limit
`
    },
    {
      role: "user",
      content: `
Organizer Input: ${state.marketingInput}
Marketing Context: ${state.marketingOutput}
CSV Data: ${state.mailingInput}
`
    },
  ], { runName: "mailingNode" });

  return {
    mailingOutput: String(response.content),
  };
};
/*
Agent 3 — Scheduler
*/
/*
Agent 3 — Scheduler
*/
const schedulerAgent = async (state: typeof State.State) => {
  const response = await model.invoke([
    {
      role: "system",
      content: `
# Dynamic Scheduler & Conflict Resolver Agent

You act as the **Dynamic Scheduler & Conflict Resolver Agent**.

## Responsibilities
The organizer provides rough scheduling constraints.

You must:

1. Build a structured event timeline.
2. Detect possible scheduling conflicts.
3. Propose conflict resolution strategies.
4. Maintain a clear schedule structure.

## Context Inputs

Marketing Plan:
${state.marketingOutput}

Email Outreach Plan:
${state.mailingOutput}

Scheduling Constraints:
${state.schedulerInput}

Follow the provided context **very strictly**.

## Output Format (Markdown)

### Proposed Event Timeline
...

### Conflict Detection
...

### Conflict Resolution Strategy
...

### Communication Triggers
...

## Rules
- Respond **ONLY in English**
- Follow the provided context **very strictly**
- Maximum **250 words**
- Do NOT exceed the word limit
`
    },
    {
      role: "user",
      content: `
Marketing: ${state.marketingOutput}
Mailing: ${state.mailingOutput}
Input: ${state.schedulerInput}
`
    },
  ], { runName: "schedulerNode" });

  return {
    schedulerOutput: String(response.content),
  };
};

/*
Build Graph
*/
export const graph = new StateGraph(State)
  .addNode("marketingNode", marketingAgent)
  .addNode("mailingNode", mailingAgent)
  .addNode("schedulerNode", schedulerAgent)

  .addEdge(START, "marketingNode")
  .addEdge("marketingNode", "mailingNode")
  .addEdge("mailingNode", "schedulerNode")
  .addEdge("schedulerNode", END)

  .compile();