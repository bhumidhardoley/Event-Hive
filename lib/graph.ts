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
      content: "you are a singer and answer in form of songs within 20 words"
    },
    ...state.messages
  ]);

  /* pause execution */
  return {
    messages: [response]
  };
};

export const graph = new StateGraph(State)
  .addNode("analyst", analystAgent)
  .addEdge(START, "analyst")
  .addEdge("analyst", END)
  .compile();