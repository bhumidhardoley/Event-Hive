"use client"

import { createContext, useContext, useState } from "react"

interface MailingEntry {
  id?: string | number
  email?: string
  name?: string
  [key: string]: unknown
}

type AgentInputs = {
  marketingInput: string
  mailingData: MailingEntry[]
  mailingContext: string
  schedulerInput: string
}

type AgentContextType = {
  inputs: AgentInputs
  setInputs: (inputs: AgentInputs) => void
}

const AgentContext = createContext<AgentContextType | undefined>(undefined)

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const [inputs, setInputs] = useState<AgentInputs>({
    marketingInput: "",
    mailingData: [],
    mailingContext: "",
    schedulerInput: ""
  })

  return (
    <AgentContext.Provider value={{ inputs, setInputs }}>
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