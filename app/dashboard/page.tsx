// app/dashboard/page.tsx
"use client"

import { useState, useRef, useEffect, ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { useAgentContext, ChatMessage } from "@/context/AgentContext"
import ReactMarkdown from "react-markdown"

export default function DashboardChat() {
  const router = useRouter()
  const { inputs, setInputs, outputs, setOutputs } = useAgentContext()
  
  // Generate a stable session ID for this specific event creation flow
  const [sessionId] = useState(() => "session-" + Date.now())
  
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [swarmComplete, setSwarmComplete] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false) // Tracks DB save state
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [inputs.chatHistory])

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsTyping(false)
  }

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto' 
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault() 
      if (!isTyping && inputValue.trim()) {
        handleSendMessage()
      }
    }
  }

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadedFileName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n').filter(line => line.trim() !== '')
      if (lines.length < 2) return

      const headers = lines[0].split(',').map(h => h.trim())
      const parsedData = lines.slice(1).map(line => {
        const values = line.split(',')
        const obj: any = {}
        headers.forEach((h, i) => { obj[h] = values[i]?.trim() || "" })
        return obj
      })

      setInputs(prev => ({ ...prev, mailingData: parsedData }))
    }
    reader.readAsText(file)
  }

  const removeFile = () => {
    setUploadedFileName(null)
    setInputs(prev => ({ ...prev, mailingData: [] }))
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return
    
    const newUserMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: inputValue }
    const updatedHistory = [...inputs.chatHistory, newUserMsg]
    
    setInputs(prev => ({ ...prev, chatHistory: updatedHistory }))
    setInputValue("")
    setIsTyping(true)
    setSwarmComplete(false)

    // FIX: Clear outputs BEFORE the swarm runs to prevent Agent text from bleeding into each other
    setOutputs({ marketingOutput: "", mailingOutput: "", schedulerOutput: "" })

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    abortControllerRef.current = new AbortController()
    let agentsRanThisTurn = false 

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatHistory: updatedHistory,
          csvData: JSON.stringify(inputs.mailingData),
          sessionId: sessionId
        }),
        signal: abortControllerRef.current.signal
      })

      const reader = res.body?.getReader()
      if (!reader) return
      const decoder = new TextDecoder()
      let buffer = ""

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
          
          if (data === "[DONE]") continue

          try {
            const parsed = JSON.parse(data)
            
            if (["marketingNode", "mailingNode", "schedulerNode"].includes(parsed.node)) {
              agentsRanThisTurn = true
            }
            
            setInputs(prev => {
              const history = [...prev.chatHistory]
              const lastIndex = history.length - 1
              const lastMsg = history[lastIndex]

              if (lastMsg.role !== parsed.node) {
                history.push({ id: Date.now().toString(), role: parsed.node, content: parsed.text })
              } else {
                history[lastIndex] = { ...lastMsg, content: lastMsg.content + parsed.text }
              }
              return { ...prev, chatHistory: history }
            })

            setOutputs(prev => {
              const next = { ...prev }
              if (parsed.node === "marketingNode") next.marketingOutput += parsed.text
              if (parsed.node === "mailingNode") next.mailingOutput += parsed.text
              if (parsed.node === "schedulerNode") next.schedulerOutput += parsed.text
              return next
            })

          } catch (e) {}
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Generation intentionally stopped by human in the loop.")
      } else {
        console.error(error)
      }
    } finally {
      setIsTyping(false)
      abortControllerRef.current = null
      
      if (agentsRanThisTurn) {
        setSwarmComplete(true)
      }
    }
  }

  const getAgentLabel = (role: string) => {
    switch(role) {
      case "supervisorNode": return { name: "Supervisor", color: "text-amber-600 bg-amber-50" }
      case "marketingNode": return { name: "Marketing Agent", color: "text-emerald-600 bg-emerald-50" }
      case "mailingNode": return { name: "Mailing Agent", color: "text-blue-600 bg-blue-50" }
      case "schedulerNode": return { name: "Scheduler Agent", color: "text-purple-600 bg-purple-50" }
      default: return { name: "Supervisor", color: "text-slate-600 bg-slate-50" }
    }
  }

  const handleFinishAndSave = async () => {
    setIsSaving(true)
    try {
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          marketingOutput: outputs.marketingOutput,
          mailingOutput: outputs.mailingOutput,
          schedulerOutput: outputs.schedulerOutput,
          chatHistory: inputs.chatHistory
        })
      })
      // Pass the session ID to the answers page via URL
      router.push(`/answers?sessionId=${sessionId}`)
    } catch (e) {
      console.error("Failed to save", e)
      setIsSaving(false)
    }
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col md:flex-row overflow-hidden">
      
      {/* SIDEBAR */}
      <div className="hidden md:flex w-72 bg-white border-r border-slate-200 p-6 flex-col h-full overflow-y-auto shrink-0">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Event Hive AI</h2>
        <div className="flex-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Current Session ID</h3>
          <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono break-all">
            {sessionId}
          </div>
        </div>
      </div>

      {/* CHAT INTERFACE */}
      <div className="flex-1 flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {inputs.chatHistory.map((msg, i) => {
            const isUser = msg.role === "user"
            const agentUI = getAgentLabel(msg.role)

            return (
              <div key={i} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                {!isUser && (
                  <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 px-2 py-0.5 rounded-full ${agentUI.color}`}>
                    {agentUI.name}
                  </span>
                )}
                <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 shadow-sm ${isUser ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-800"}`}>
                  <div className={`prose prose-sm ${isUser ? "prose-invert" : ""} max-w-none break-words whitespace-pre-wrap overflow-x-hidden`}>
                    <ReactMarkdown>{msg.content.replace("###START_SWARM###", "")}</ReactMarkdown>
                  </div>
                </div>
              </div>
            )
          })}
          {isTyping && (
             <div className="flex items-start">
               <span className="bg-white border border-slate-200 text-slate-400 text-xs px-4 py-2 rounded-full shadow-sm animate-pulse">
                 Agent is typing...
               </span>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT AREA */}
        <div className="w-full bg-slate-50 border-t border-slate-200 pt-4 pb-6 px-4 md:px-8 shrink-0">
          <div className="max-w-4xl mx-auto flex flex-col bg-white border border-slate-300 rounded-3xl shadow-sm focus-within:ring-2 focus-within:ring-slate-900 focus-within:border-transparent transition-all overflow-hidden">
            
            {uploadedFileName && (
              <div className="flex items-center gap-2 bg-slate-100 w-max px-3 py-1.5 rounded-lg mx-3 mt-3 text-xs font-medium text-slate-700 border border-slate-200">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                {uploadedFileName}
                <button onClick={removeFile} className="text-slate-400 hover:text-red-500 ml-1 font-bold leading-none">×</button>
              </div>
            )}

            <div className="flex items-end gap-2 p-2">
              <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0"
                title="Attach CSV"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              </button>

              <textarea 
                ref={textareaRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type your details or corrections here..." 
                className="flex-1 max-h-[200px] min-h-[44px] py-3 px-2 bg-transparent outline-none resize-none overflow-y-auto text-slate-800 placeholder-slate-400"
                disabled={isTyping}
                rows={1}
              />
              
              <div className="p-1 flex-shrink-0">
                {isTyping ? (
                  <button onClick={handleStop} className="p-3 bg-red-600 hover:bg-red-500 text-white rounded-full shadow-sm transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"></path></svg>
                  </button>
                ) : (
                  <button onClick={handleSendMessage} disabled={!inputValue.trim()} className="p-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-full shadow-sm transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Finish Button calls DB Save */}
          {swarmComplete && !isTyping && (
            <div className="max-w-4xl mx-auto mt-4 flex justify-center">
              <button 
                onClick={handleFinishAndSave}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white px-8 py-2.5 rounded-full font-bold shadow-sm transition animate-bounce flex items-center gap-2 text-sm"
              >
                {isSaving ? "Saving..." : "Review & Finish Event"} <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}