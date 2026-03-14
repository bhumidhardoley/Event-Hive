// app/answers/page.tsx
"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAgentContext } from "@/context/AgentContext"
import ReactMarkdown from "react-markdown"

type AgentType = "marketing" | "mailing" | "scheduler"

function AnswersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("sessionId")
  
  const { inputs, outputs, setOutputs } = useAgentContext()

  const [editing, setEditing] = useState({ marketing: false, mailing: false, scheduler: false })
  const [prompts, setPrompts] = useState({ marketing: "", mailing: "", scheduler: "" })
  const [loading, setLoading] = useState({ marketing: false, mailing: false, scheduler: false, sync: false, fetch: true, finalize: false })

  // Fetch data from MongoDB on page load
  useEffect(() => {
    if (sessionId) {
      fetch(`/api/events?sessionId=${sessionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.event) {
            setOutputs({
              marketingOutput: data.event.marketingOutput,
              mailingOutput: data.event.mailingOutput,
              schedulerOutput: data.event.schedulerOutput
            })
          }
          setLoading(prev => ({ ...prev, fetch: false }))
        })
        .catch(err => {
          console.error("Failed to fetch event", err)
          setLoading(prev => ({ ...prev, fetch: false }))
        })
    } else {
      setLoading(prev => ({ ...prev, fetch: false }))
    }
  }, [sessionId, setOutputs])

  const handleManualEdit = (agent: AgentType, value: string) => {
    setOutputs(prev => ({ ...prev, [`${agent}Output`]: value }))
  }

  const toggleEdit = (agent: AgentType) => {
    setEditing(prev => ({ ...prev, [agent]: !prev[agent] }))
  }

  const handleReprompt = async (agent: AgentType) => {
    if (!prompts[agent].trim()) return
    
    setLoading(prev => ({ ...prev, [agent]: true }))
    try {
      const res = await fetch("/api/reprompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentName: agent,
          prompt: prompts[agent],
          currentOutput: outputs[`${agent}Output`],
          chatHistory: inputs.chatHistory
        })
      })
      const data = await res.json()
      if (data.updatedText) {
        setOutputs(prev => ({ ...prev, [`${agent}Output`]: data.updatedText }))
        setPrompts(prev => ({ ...prev, [agent]: "" })) 
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(prev => ({ ...prev, [agent]: false }))
    }
  }

  const handleSync = async () => {
    setLoading(prev => ({ ...prev, sync: true }))
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outputs })
      })
      const data = await res.json()
      if (data.syncedOutputs) {
        setOutputs({
          marketingOutput: data.syncedOutputs.marketing,
          mailingOutput: data.syncedOutputs.mailing,
          schedulerOutput: data.syncedOutputs.scheduler,
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(prev => ({ ...prev, sync: false }))
    }
  }

  const handleFinalize = async () => {
    setLoading(prev => ({ ...prev, finalize: true }))
    try {
      // Save current outputs (including any manual edits) to context.
      setOutputs({
        marketingOutput: outputs.marketingOutput,
        mailingOutput: outputs.mailingOutput,
        schedulerOutput: outputs.schedulerOutput
      });

      // Navigate to the final page, passing the sessionId so we can route back if needed
      router.push(`/final?sessionId=${sessionId || ""}`);
    } catch (e) {
      console.error("Failed to finalize event", e)
    } finally {
      setLoading(prev => ({ ...prev, finalize: false }))
    }
  }

  const agents: { title: string, key: AgentType, colorClass: string }[] = [
    { title: "Marketing Copy", key: "marketing", colorClass: "bg-emerald-50 text-emerald-900" },
    { title: "Email Template", key: "mailing", colorClass: "bg-blue-50 text-blue-900" },
    { title: "Event Timeline", key: "scheduler", colorClass: "bg-purple-50 text-purple-900" }
  ]

  if (loading.fetch) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading Event Data...</div>
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Review & Refine</h1>
            <p className="text-slate-500 text-sm mt-1">Session ID: <span className="font-mono text-xs">{sessionId || "Unsaved Local Session"}</span></p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push("/dashboard")} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-full text-sm font-bold transition">
              ← Back to Chat
            </button>
            <button 
              onClick={handleSync}
              disabled={loading.sync}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white rounded-full text-sm font-bold shadow-sm transition flex items-center gap-2"
            >
              {loading.sync ? "Syncing..." : "🔄 Sync Changes Across Agents"}
            </button>
            <button 
              onClick={handleFinalize}
              disabled={loading.finalize}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-300 text-white rounded-full text-sm font-bold shadow-sm transition flex items-center gap-2"
            >
              {loading.finalize ? "Finalizing..." : "Review & Finish →"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <div key={agent.key} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className={`px-4 py-3 border-b border-slate-100 flex justify-between items-center ${agent.colorClass}`}>
                <h3 className="font-bold text-sm uppercase tracking-wider">{agent.title}</h3>
                <button 
                  onClick={() => toggleEdit(agent.key)}
                  className="p-1.5 hover:bg-white/50 rounded-md transition text-slate-700"
                  title="Toggle Manual Edit"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                </button>
              </div>

              <div className="p-4 flex-1 bg-slate-50/50">
                {editing[agent.key] ? (
                  <textarea 
                    className="w-full h-64 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm text-slate-700 resize-y whitespace-pre-wrap break-words"
                    value={outputs[`${agent.key}Output`]}
                    onChange={(e) => handleManualEdit(agent.key, e.target.value)}
                  />
                ) : (
                  <div className="prose prose-sm max-w-none text-slate-800 h-64 overflow-y-auto pr-2 break-words whitespace-pre-wrap overflow-x-hidden">
                    <ReactMarkdown>{outputs[`${agent.key}Output`] || "*No output generated yet.*"}</ReactMarkdown>
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-slate-100 bg-white flex gap-2">
                <input 
                  type="text"
                  placeholder={`Ask ${agent.title} to change...`}
                  value={prompts[agent.key]}
                  onChange={(e) => setPrompts(prev => ({ ...prev, [agent.key]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleReprompt(agent.key)}
                  className="flex-1 text-sm px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-slate-400 transition"
                />
                <button 
                  onClick={() => handleReprompt(agent.key)}
                  disabled={loading[agent.key] || !prompts[agent.key].trim()}
                  className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  {loading[agent.key] ? "..." : "Update"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Wrapping in Suspense is required by Next.js when using useSearchParams in a client component
export default function AnswersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading Application...</div>}>
      <AnswersContent />
    </Suspense>
  )
}