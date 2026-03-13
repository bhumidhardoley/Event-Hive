import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";

/*
Ollama Model
*/
const model = new ChatOllama({
  model: "qwen2.5",
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
const marketingAgent = async (state: typeof State.State) => {
  const response = await model.invoke([
    {
      role: "system",
      content: `Acts as the Content Strategist. Generate promotional copy, social posts, and timing in Markdown.`
    },
    {
      role: "user",
      content: state.marketingInput,
    },
  ], { runName: "marketingNode" }); // MATCHES FRONTEND

  return {
    marketingOutput: String(response.content)
  };
};

/*
Agent 2 — Communications & Mailing
*/
const mailingAgent = async (state: typeof State.State) => {
  const response = await model.invoke([
    {
      role: "system",
      content: `Acts as the Communications Agent. Analyze CSV data and design a mailing strategy in Markdown.`
    },
    {
      role: "user",
      content: `
Organizer Input: ${state.marketingInput}
Marketing Context: ${state.marketingOutput}
CSV Data: ${state.mailingInput}
`
    },
  ], { runName: "mailingNode" }); // MATCHES FRONTEND

  return {
    mailingOutput: String(response.content),
  };
};

/*
Agent 3 — Scheduler
*/
const schedulerAgent = async (state: typeof State.State) => {
  const response = await model.invoke([
    {
      role: "system",
      content: `Acts as the Dynamic Scheduler. Build the event schedule and resolve conflicts in Markdown.`
    },
    {
      role: "user",
      content: `
Marketing: ${state.marketingOutput}
Mailing: ${state.mailingOutput}
Input: ${state.schedulerInput}
`
    },
  ], { runName: "schedulerNode" }); // MATCHES FRONTEND

  return {
    schedulerOutput: String(response.content),
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