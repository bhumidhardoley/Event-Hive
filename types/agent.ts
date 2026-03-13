export type AgentNode = "marketingNode" | "mailingNode" | "schedulerNode"

export type StreamMessage = {
  node: AgentNode
  text: string
}