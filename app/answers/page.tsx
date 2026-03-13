"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import AgentCard from "@/components/AgentCard"
import { useAgentContext } from "@/context/AgentContext"

type AgentNode = "marketingNode" | "mailingNode" | "schedulerNode"

type StreamMessage = { node: AgentNode; text: string }

type AgentOutputs = {
  marketingOutput: string
  mailingOutput: string
  schedulerOutput: string
}

export default function Answers() {
  const router = useRouter()
  // Ensure your AgentContext provides inputs, outputs, and setOutputs as defined previously
  const { inputs, setOutputs } = useAgentContext()

  // Local state for the streaming text
  const [state, setState] = useState<AgentOutputs>({
    marketingOutput: "",
    mailingOutput: "",
    schedulerOutput: ""
  })

  // UI States
  const [activeTab, setActiveTab] = useState<AgentNode>("marketingNode")
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Human-in-the-loop States
  const [humanInput, setHumanInput] = useState("")
  const [feedbackLog, setFeedbackLog] = useState<string[]>([])
  const [needsSync, setNeedsSync] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)

  const runAgents = async (currentFeedbackLog: string[]) => {
    setIsGenerating(true)
    setNeedsSync(false)
    
    // Clear outputs for fresh generation
    setState({ marketingOutput: "", mailingOutput: "", schedulerOutput: "" })

    abortControllerRef.current = new AbortController()

    const combinedFeedback = currentFeedbackLog.join("\n")

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          prompt: inputs.prompt,
          csv: JSON.stringify(inputs.mailingData),
          feedbackLog: combinedFeedback
        })
      })

      const reader = res.body?.getReader()
      if (!reader) return
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (!line.startsWith("data:")) continue
          const data = line.replace("data:", "").trim()
          if (!data) continue
          if (data === "[DONE]") {
            setIsGenerating(false)
            return
          }

          let parsed: StreamMessage
          try {
            parsed = JSON.parse(data) as StreamMessage
          } catch {
            continue
          }

          setState((prev) => {
            const next = { ...prev }
            if (parsed.node === "marketingNode") next.marketingOutput += parsed.text
            if (parsed.node === "mailingNode") next.mailingOutput += parsed.text
            if (parsed.node === "schedulerNode") next.schedulerOutput += parsed.text
            return next
          })
        }
      }
    } catch (error: any) {
      if (error.name !== "AbortError") console.error("Stream error:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  // Initial Run
  useEffect(() => {
    if (inputs.prompt) runAgents([])
    return () => stopGeneration()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs])

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsGenerating(false)
    }
  }

  const handleQueueFeedback = () => {
    if (!humanInput.trim()) return
    
    // Format the feedback so the supervisor knows which agent it targets natively
    const newEntry = `[Context for ${activeTab.replace('Node', '')}]: ${humanInput}`
    setFeedbackLog(prev => [...prev, newEntry])
    setHumanInput("")
    setNeedsSync(true)
  }

  const handleSync = () => {
    runAgents(feedbackLog)
  }

  const handleDone = () => {
    // Save the local state to the global context so the final page can access it
    setOutputs(state)
    router.push("/final")
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 pb-32">
      <div className="max-w-5xl mx-auto">

        {/* HEADER & ACTION BUTTONS */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          
          {/* TABS */}
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setActiveTab("marketingNode")} 
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === "marketingNode" ? "bg-emerald-600 text-white shadow-md" : "bg-white border text-slate-600 hover:bg-slate-50"}`}
            >
              Marketing Agent
            </button>
            <button 
              onClick={() => setActiveTab("mailingNode")} 
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === "mailingNode" ? "bg-emerald-600 text-white shadow-md" : "bg-white border text-slate-600 hover:bg-slate-50"}`}
            >
              Email Agent
            </button>
            <button 
              onClick={() => setActiveTab("schedulerNode")} 
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === "schedulerNode" ? "bg-emerald-600 text-white shadow-md" : "bg-white border text-slate-600 hover:bg-slate-50"}`}
            >
              Time Schedule Agent
            </button>
          </div>

          {/* SYNC & DONE BUTTONS */}
          <div className="flex gap-3 items-center w-full md:w-auto">
            {needsSync && (
              <button 
                onClick={handleSync}
                disabled={isGenerating}
                className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-md animate-pulse whitespace-nowrap"
              >
                ⚠️ Sync All Agents
              </button>
            )}
            
            <button 
              onClick={handleDone}
              disabled={isGenerating || needsSync}
              className="bg-slate-900 hover:bg-black disabled:bg-slate-300 disabled:text-slate-500 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md transition whitespace-nowrap"
            >
              Review & Finish →
            </button>
          </div>
        </div>

        {/* AGENT OUTPUT */}
        <div className="bg-white rounded-xl shadow-sm border p-6 min-h-[400px]">
          {activeTab === "marketingNode" && <AgentCard title="Marketing Agent" node="marketingNode" content={state.marketingOutput} />}
          {activeTab === "mailingNode" && <AgentCard title="Mailing Agent" node="mailingNode" content={state.mailingOutput} />}
          {activeTab === "schedulerNode" && <AgentCard title="Scheduler Agent" node="schedulerNode" content={state.schedulerOutput} />}
        </div>

      </div>

      {/* FLOATING ACTION BAR FOR INPUT */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-3xl px-4 z-50">
        <div className="bg-white border shadow-2xl rounded-2xl p-3 flex flex-col sm:flex-row items-center gap-3">
          
          <input 
            type="text"
            value={humanInput}
            onChange={(e) => setHumanInput(e.target.value)}
            placeholder={`Instruct the ${activeTab.replace('Node', '')} agent... (e.g., "Change date to 19th")`}
            className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleQueueFeedback()}
            disabled={isGenerating}
          />

          {isGenerating ? (
            <button 
              onClick={stopGeneration} 
              className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-bold text-sm transition shadow-sm"
            >
              Stop Generating
            </button>
          ) : (
            <button 
              onClick={handleQueueFeedback}
              disabled={!humanInput.trim()}
              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold text-sm transition shadow-sm whitespace-nowrap"
            >
              Add Constraint
            </button>
          )}

        </div>
      </div>
    </div>
  )
}