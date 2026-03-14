"use client"

import { createContext, useContext, useState, ReactNode } from "react"

export interface MailingEntry {
  id?: string | number
  email?: string
  name?: string
  [key: string]: unknown
}

interface AgentInputs {
  prompt: string
  mailingData: MailingEntry[]
}

// Updated to include posterImage
interface AgentOutputs {
  marketingOutput: string
  mailingOutput: string
  schedulerOutput: string
  posterImage: string 
}

interface AgentContextType {
  inputs: AgentInputs
  setInputs: (inputs: AgentInputs) => void
  outputs: AgentOutputs
  setOutputs: (outputs: AgentOutputs) => void
}

const AgentContext = createContext<AgentContextType | undefined>(undefined)

export function AgentProvider({ children }: { children: ReactNode }) {
  const [inputs, setInputs] = useState<AgentInputs>({
    prompt: "",
    mailingData: []
  })

  // Initialize posterImage
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
  if (!context) {
    throw new Error("useAgentContext must be used inside AgentProvider")
  }
  return context
}