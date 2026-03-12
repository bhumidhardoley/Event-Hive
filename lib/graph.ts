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
const State = Annotation.Root({
  marketingInput: Annotation<string>(),
  mailingInput: Annotation<string>(),
  schedulerInput: Annotation<string>(),

  marketingOutput: Annotation<string>(),
  mailingOutput: Annotation<string>(),
  schedulerOutput: Annotation<string>(),
});

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
• Recommend optimal release times
• Build hype for the event
      `,
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
• Process event registration sheets
• Extract and validate emails
• Personalize the provided email draft
• Send targeted communication to participants
      `,
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
• Detect scheduling conflicts
• Recalculate timelines if constraints change
• Notify participants of schedule changes
      `,
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

  .addEdge(START, "marketing")
  .addEdge("marketing", "mailing")
  .addEdge("mailing", "scheduler")
  .addEdge("scheduler", END)

  .compile();