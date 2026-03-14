"use client"
import { createContext, useContext, useState, ReactNode } from "react"

export interface ChatMessage {
  id: string
  // ADDED: formNode
  role: "user" | "supervisor" | "marketingNode" | "mailingNode" | "schedulerNode" | "whatsappNode" | "formNode" | "system" | "supervisorNode"
  content: string
}

interface AgentInputs {
  mailingData: any[]
  chatHistory: ChatMessage[]
}

interface AgentOutputs {
  marketingOutput: string
  mailingOutput: string
  schedulerOutput: string
  whatsappOutput: string 
  formOutput: string // <-- ADDED THIS
  posterImage: string
}

interface AgentContextType {
  inputs: AgentInputs
  setInputs: React.Dispatch<React.SetStateAction<AgentInputs>>
  outputs: AgentOutputs
  setOutputs: React.Dispatch<React.SetStateAction<AgentOutputs>>
}

const AgentContext = createContext<AgentContextType | undefined>(undefined)

export function AgentProvider({ children }: { children: ReactNode }) {
  const [inputs, setInputs] = useState<AgentInputs>({
    mailingData: [],
    chatHistory: [
      { id: "1", role: "supervisor", content: "Hello! I am the Event Hive Supervisor. To get started, what event are we planning today, and do you need a registration form for it?" }
    ]
  })

  const [outputs, setOutputs] = useState<AgentOutputs>({
    marketingOutput: "",
    mailingOutput: "",
    schedulerOutput: "",
    whatsappOutput: "",
    formOutput: "", // <-- ADDED THIS
    posterImage: ""
  })

  return (
    <AgentContext.Provider value={{ inputs, setInputs, outputs, setOutputs }}>
      {children}
    </AgentContext.Provider>
  )
}

export function useAgentContext() {
  const context = useContext(AgentContext)
  if (!context) throw new Error("useAgentContext must be used inside AgentProvider")
  return context
}