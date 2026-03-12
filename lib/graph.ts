import { StateSchema, MessagesValue, GraphNode, StateGraph, START, END } from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";

/* Ollama model */
const model = new ChatOllama({
  model: "qwen2.5",
});

/* Graph state */
const State = new StateSchema({
  messages: MessagesValue,
});

/* Singer Agent */
const singerAgent: GraphNode<typeof State> = async (state) => {

  const response = await model.invoke([
    {
      role: "system",
      content: "You are a singer. Reply to everything like you are singing a song."
    },
    ...state.messages
  ]);

  return {
    messages: [response],
  };
};

/* Angry Agent */

/* Build graph */
export const graph = new StateGraph(State)
  .addNode("singer", singerAgent)
  .addEdge(START, "singer")
  .addEdge("singer", END)

  .compile();