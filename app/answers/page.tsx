"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAgentContext } from "@/context/AgentContext"
import ReactMarkdown from "react-markdown"

type AgentType = "marketing" | "mailing" | "scheduler"

// Helper to strip out the ```markdown blocks and squash huge gaps
const cleanMarkdown = (text: string) => {
  if (!text) return "";
  return text
    .replace(/^```(markdown|md|html)?\n?/gi, "")
    .replace(/```$/g, "")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

function AnswersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("sessionId")
  
  const { inputs, outputs, setOutputs } = useAgentContext()

  // State for Tab selection
  const [activeTab, setActiveTab] = useState<AgentType>("marketing")

  const [editing, setEditing] = useState({ marketing: false, mailing: false, scheduler: false })
  const [prompts, setPrompts] = useState({ marketing: "", mailing: "", scheduler: "" })
  const [loading, setLoading] = useState({ marketing: false, mailing: false, scheduler: false, sync: false, fetch: true, finalize: false })

  useEffect(() => {
    if (sessionId) {
      fetch(`/api/events?sessionId=${sessionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.event) {
            setOutputs(prev => ({
              ...prev,
              marketingOutput: cleanMarkdown(data.event.marketingOutput),
              mailingOutput: cleanMarkdown(data.event.mailingOutput),
              schedulerOutput: cleanMarkdown(data.event.schedulerOutput),
              whatsappOutput: data.event.whatsappOutput || "",
              formOutput: data.event.formOutput || "" // Successfully loads the Form JSON
            }))
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
        setOutputs(prev => ({ ...prev, [`${agent}Output`]: cleanMarkdown(data.updatedText) }))
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
        setOutputs(prev => ({
          ...prev, // Protects whatsappOutput and formOutput during sync
          marketingOutput: cleanMarkdown(data.syncedOutputs.marketing),
          mailingOutput: cleanMarkdown(data.syncedOutputs.mailing),
          schedulerOutput: cleanMarkdown(data.syncedOutputs.scheduler),
        }))
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
      setOutputs(prev => ({
        ...prev,
        marketingOutput: outputs.marketingOutput,
        mailingOutput: outputs.mailingOutput,
        schedulerOutput: outputs.schedulerOutput,
        whatsappOutput: outputs.whatsappOutput,
        formOutput: outputs.formOutput // Passes Form output to Final page
      }));
      router.push(`/final?sessionId=${sessionId || ""}`);
    } catch (e) {
      console.error("Failed to finalize event", e)
    } finally {
      setLoading(prev => ({ ...prev, finalize: false }))
    }
  }

  const agents: { title: string, key: AgentType, colorClass: string }[] = [
    { title: "Marketing Copy", key: "marketing", colorClass: "bg-emerald-50 text-emerald-900 border-emerald-200" },
    { title: "Email Template", key: "mailing", colorClass: "bg-blue-50 text-blue-900 border-blue-200" },
    { title: "Event Timeline", key: "scheduler", colorClass: "bg-purple-50 text-purple-900 border-purple-200" }
  ]

  if (loading.fetch) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading Event Data...</div>
  }

  const activeAgent = agents.find(a => a.key === activeTab) || agents[0];

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden text-slate-900">
      
      <main className="flex-1 flex flex-col w-full max-w-5xl mx-auto p-4 md:p-6 gap-5 min-h-0">
        
        {/* --- HEADER --- */}
        <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Review & Refine</h1>
            <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
              Active Session ID: 
              <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                {sessionId || "Unsaved Local Session"}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:gap-3">
            <button onClick={() => router.push("/dashboard")} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-full text-sm font-bold transition">
              ← Back
            </button>
            <button 
              onClick={handleSync}
              disabled={loading.sync}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white rounded-full text-sm font-bold shadow-sm transition flex items-center gap-2"
            >
              {loading.sync ? "Syncing..." : "🔄 Sync"}
            </button>
            <button 
              onClick={handleFinalize}
              disabled={loading.finalize}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-300 text-white rounded-full text-sm font-bold shadow-sm transition flex items-center gap-2"
            >
              {loading.finalize ? "Finalizing..." : "Review & Finish →"}
            </button>
          </div>
        </div>

        {/* --- PROFESSIONAL TAB BUTTONS --- */}
        <div className="shrink-0 flex justify-center">
          <div className="bg-slate-200/60 p-1.5 rounded-xl flex flex-wrap gap-1 border border-slate-200 shadow-inner w-full md:w-auto">
            {agents.map((agent) => {
              const isActive = activeTab === agent.key;
              return (
                <button 
                  key={agent.key} 
                  onClick={() => setActiveTab(agent.key)}
                  className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ease-out ${
                    isActive 
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/50' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-300/50'
                  }`}
                >
                  {agent.title}
                </button>
              )
            })}
          </div>
        </div>

        {/* --- ACTIVE AGENT BOX --- */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-0">
          
          <div className={`shrink-0 px-5 py-4 flex justify-between items-center border-b ${activeAgent.colorClass}`}>
            <h3 className="font-bold text-sm uppercase tracking-wider">{activeAgent.title}</h3>
            <button 
              onClick={() => toggleEdit(activeAgent.key)}
              className="p-1.5 hover:bg-white/50 rounded-md transition text-slate-700 font-medium text-xs flex items-center gap-1"
              title="Toggle Manual Edit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
              {editing[activeAgent.key] ? "Close Edit" : "Manual Edit"}
            </button>
          </div>

          <div className="flex-1 p-5 md:p-6 bg-slate-50/50 overflow-y-auto">
            {editing[activeAgent.key] ? (
              <textarea 
                className="w-full h-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm text-slate-700 resize-none whitespace-pre-wrap break-words shadow-inner"
                value={cleanMarkdown(outputs[`${activeAgent.key}Output`])}
                onChange={(e) => handleManualEdit(activeAgent.key, e.target.value)}
              />
            ) : (
              <div className="prose prose-sm max-w-none text-slate-800 break-words whitespace-pre-wrap">
                <ReactMarkdown>{cleanMarkdown(outputs[`${activeAgent.key}Output`]) || "*No output generated yet.*"}</ReactMarkdown>
              </div>
            )}
          </div>

          <div className="shrink-0 p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col">
            <div className="w-full flex flex-col bg-white border border-slate-300 shadow-sm transition-all overflow-hidden rounded-3xl focus-within:ring-2 focus-within:ring-slate-900 focus-within:border-transparent">
              <div className="flex items-end gap-2 p-2">
                
                <textarea 
                  rows={1}
                  placeholder={`Ask ${activeAgent.title} to change...`}
                  value={prompts[activeAgent.key]}
                  onChange={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                    setPrompts(prev => ({ ...prev, [activeAgent.key]: e.target.value }));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (!loading[activeAgent.key] && prompts[activeAgent.key].trim()) {
                        handleReprompt(activeAgent.key);
                      }
                    }
                  }}
                  disabled={loading[activeAgent.key]}
                  className="flex-1 max-h-[200px] min-h-[44px] py-3 px-3 bg-transparent outline-none resize-none overflow-y-auto text-slate-800 placeholder-slate-400"
                />
                
                <div className="p-1 flex-shrink-0">
                  <button 
                    onClick={() => handleReprompt(activeAgent.key)}
                    disabled={loading[activeAgent.key] || !prompts[activeAgent.key].trim()}
                    className="p-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-full shadow-sm transition-colors flex items-center justify-center"
                    title="Send Update Request"
                  >
                    {loading[activeAgent.key] ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                    )}
                  </button>
                </div>

              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}

export default function AnswersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium">Loading Application...</div>}>
      <AnswersContent />
    </Suspense>
  )
}