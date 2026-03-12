import { StateSchema, MessagesValue, GraphNode, StateGraph, START, END, interrupt } from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";

const model = new ChatOllama({
  model: "qwen2.5",
});

const State = new StateSchema({
  messages: MessagesValue,
});

const analystAgent: GraphNode<typeof State> = async (state) => {

  const response = await model.invoke([
    {
      role: "system",
      content: "Generate promotional content from a raw organizer prompt, create a series of hype-building posts, analyze past engagement to find optimal posting times, and schedule the content for publishing."
    },
    ...state.messages
  ]);

  /* pause execution */
  interrupt({
    message: response.content
  });

  return {
    messages: [response]
  };
};

export const graph = new StateGraph(State)
  .addNode("analyst", analystAgent)
  .addEdge(START, "analyst")
  .addEdge("analyst", END)
  .compile();