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
  posterImage: string 
}

export default function Answers() {
  const router = useRouter()
  const { inputs, setOutputs } = useAgentContext()

  const [state, setState] = useState<AgentOutputs>({
    marketingOutput: "",
    mailingOutput: "",
    schedulerOutput: "",
    posterImage: "" 
  })

  const [activeTab, setActiveTab] = useState<AgentNode>("marketingNode")
  const [isGenerating, setIsGenerating] = useState(false)
  const [humanInput, setHumanInput] = useState("")
  const [feedbackLog, setFeedbackLog] = useState<string[]>([])
  const [needsSync, setNeedsSync] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)

  // Background Image Generator Function
  const generateImageInBackground = async (promptData: string) => {
    console.log("Starting background image generation...");
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptData || inputs.prompt })
      });
      const data = await res.json();
      
      if (data.posterImage) {
        setState(prev => ({ ...prev, posterImage: data.posterImage }));
        console.log("Background image generation complete!");
      } else {
        setState(prev => ({ ...prev, posterImage: "ERROR: Generation Failed" }));
      }
    } catch (error) {
      setState(prev => ({ ...prev, posterImage: "ERROR: Network failure" }));
    }
  };

  const runAgents = async (currentFeedbackLog: string[]) => {
    setIsGenerating(true)
    setNeedsSync(false)
    
    setState({ marketingOutput: "", mailingOutput: "", schedulerOutput: "", posterImage: "" })

    abortControllerRef.current = new AbortController()

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          prompt: inputs.prompt,
          csv: JSON.stringify(inputs.mailingData),
          feedbackLog: currentFeedbackLog.join("\n")
        })
      })

      const reader = res.body?.getReader()
      if (!reader) return
      const decoder = new TextDecoder()

      let buffer = ""
      let localSchedulerOutput = "" // Track locally for the image prompt

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const messages = buffer.split("\n\n")
        buffer = messages.pop() || ""

        for (const message of messages) {
          const line = message.trim()
          if (!line.startsWith("data:")) continue
          
          const data = line.replace("data:", "").trim()
          if (!data) continue
          
          if (data === "[DONE]") {
            setIsGenerating(false)
            // Kick off image generation in the background!
            generateImageInBackground(localSchedulerOutput)
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
            if (parsed.node === "schedulerNode") {
              next.schedulerOutput += parsed.text
              localSchedulerOutput += parsed.text 
            }
            return next
          })
        }
      }
    } catch (error: any) {
      if (error.name !== "AbortError") console.error(error)
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    if (inputs.prompt) runAgents([])
    return () => stopGeneration()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs])

  const stopGeneration = () => {
    if (abortControllerRef.current) { abortControllerRef.current.abort(); setIsGenerating(false); }
  }

  const handleQueueFeedback = () => {
    if (!humanInput.trim()) return
    const newEntry = `[Context for ${activeTab.replace('Node', '')}]: ${humanInput}`
    setFeedbackLog(prev => [...prev, newEntry]); setHumanInput(""); setNeedsSync(true);
  }

  const handleSync = () => runAgents(feedbackLog)

  const handleDone = () => {
    setOutputs(state) 
    router.push("/final")
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 pb-32">
      <div className="max-w-5xl mx-auto">
        
        <div className="flex justify-between items-center gap-4 mb-6 border-b pb-4">
          <h1 className="text-xl font-bold text-slate-900">Agent Workspace</h1>
          <div className="flex gap-3 items-center">
            {needsSync && <button onClick={handleSync} disabled={isGenerating} className="bg-amber-500 text-white px-5 py-2 rounded-lg text-sm font-bold shadow animate-pulse whitespace-nowrap">⚠️ Sync All</button>}
            <button onClick={handleDone} disabled={isGenerating || needsSync} className="bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white px-6 py-2 rounded-lg text-sm font-bold shadow transition">Review & Finish →</button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {(["marketingNode", "mailingNode", "schedulerNode"] as const).map(node => (
            <button key={node} onClick={() => setActiveTab(node)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === node ? "bg-emerald-600 text-white shadow" : "bg-white border text-slate-600"}`}>
              {node.replace('Node', '').replace(/^\w/, c => c.toUpperCase())} Agent
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6 min-h-[400px] relative">
          {isGenerating && <div className="absolute top-4 right-4 text-xs text-emerald-600 font-medium animate-pulse">Graph is running...</div>}
          
          {activeTab === "marketingNode" && <AgentCard title="Marketing Agent" node="marketingNode" content={state.marketingOutput} />}
          {activeTab === "mailingNode" && <AgentCard title="Mailing Agent" node="mailingNode" content={state.mailingOutput} />}
          {activeTab === "schedulerNode" && <AgentCard title="Scheduler Agent" node="schedulerNode" content={state.schedulerOutput} />}
        </div>
      </div>

      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-3xl px-4 z-50">
        <div className="bg-white border shadow-2xl rounded-2xl p-3 flex flex-col sm:flex-row items-center gap-3">
          <input type="text" value={humanInput} onChange={(e) => setHumanInput(e.target.value)} placeholder={`Instruct the ${activeTab.replace('Node', '')} agent...`} className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm" onKeyDown={(e) => e.key === 'Enter' && handleQueueFeedback()} disabled={isGenerating} />
          {isGenerating ? <button onClick={stopGeneration} className="w-full sm:w-auto bg-red-500 text-white px-6 py-3 rounded-xl font-bold text-sm shadow">Stop</button> : <button onClick={handleQueueFeedback} disabled={!humanInput.trim()} className="w-full sm:w-auto bg-slate-800 text-white px-6 py-3 rounded-xl font-bold text-sm shadow">Add Constraint</button>}
        </div>
      </div>
    </div>
  )
}