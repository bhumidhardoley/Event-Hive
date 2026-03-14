"use client"

import { createContext, useContext, useState, ReactNode } from "react"

export interface MailingEntry {
  id?: string | number
  email?: string
  name?: string
  [key: string]: unknown
}

export interface ChatMessage {
  id: string
  role: "user" | "supervisor" | "marketingNode" | "mailingNode" | "schedulerNode" | "system"
  content: string
}

interface AgentInputs {
  mailingData: MailingEntry[]
  chatHistory: ChatMessage[] // <-- NEW
}

interface AgentOutputs {
  marketingOutput: string
  mailingOutput: string
  schedulerOutput: string
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
      { id: "1", role: "supervisor", content: "Hello! I am the Event Hive Supervisor. To get started, what kind of event are you hosting? Please provide the event name, target audience, and general timeframe." }
    ]
  })

  const [outputs, setOutputs] = useState<AgentOutputs>({
    marketingOutput: "",
    mailingOutput: "",
    schedulerOutput: "",
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