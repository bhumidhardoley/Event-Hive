"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAgentContext, ChatMessage } from "@/context/AgentContext"
import FileUploadPreview from "@/components/FileUploadPreview"
import ReactMarkdown from "react-markdown"

export default function DashboardChat() {
  const router = useRouter()
  const { inputs, setInputs, setOutputs } = useAgentContext()
  
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [swarmComplete, setSwarmComplete] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

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

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return
    
    const newUserMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: inputValue }
    const updatedHistory = [...inputs.chatHistory, newUserMsg]
    
    setInputs(prev => ({ ...prev, chatHistory: updatedHistory }))
    setInputValue("")
    setIsTyping(true)
    setSwarmComplete(false)

    abortControllerRef.current = new AbortController()

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatHistory: updatedHistory,
          csvData: JSON.stringify(inputs.mailingData),
          sessionId: "session-" + Date.now()
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
          if (data === "[DONE]") {
             setSwarmComplete(true)
             continue
          }

          try {
            const parsed = JSON.parse(data)
            
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      
      {/* SIDEBAR */}
      <div className="w-full md:w-80 bg-white border-r border-slate-200 p-6 flex flex-col h-screen overflow-y-auto">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Event Hive AI</h2>
        <p className="text-xs text-slate-500 mb-8">Chat with the Supervisor to define your event. Stop agents anytime to add corrections!</p>
        
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
           <h3 className="text-sm font-bold text-slate-700 mb-3">Participant List</h3>
           <FileUploadPreview onDataExtracted={(data) => setInputs(prev => ({...prev, mailingData: data}))} />
        </div>
      </div>

      {/* CHAT INTERFACE */}
      <div className="flex-1 flex flex-col h-screen relative">
        <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-32">
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
                <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${isUser ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-800"}`}>
                  <div className={`prose prose-sm ${isUser ? "prose-invert" : ""} max-w-none`}>
                    <ReactMarkdown>{msg.content.replace("###START_SWARM###", "")}</ReactMarkdown>
                  </div>
                </div>
              </div>
            )
          })}
          {isTyping && (
             <div className="flex items-start">
               <span className="bg-white border border-slate-200 text-slate-400 text-xs px-4 py-2 rounded-full shadow-sm animate-pulse">
                 Working...
               </span>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT AREA */}
        <div className="absolute bottom-0 left-0 w-full bg-slate-50/80 backdrop-blur-md border-t p-4">
          <div className="max-w-4xl mx-auto flex gap-3">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isTyping && handleSendMessage()}
              placeholder="Type your details or corrections here..." 
              className="flex-1 rounded-full border border-slate-300 px-6 py-3 shadow-sm outline-none focus:ring-2 focus:ring-slate-900 transition text-slate-900"
              disabled={isTyping}
            />
            
            {isTyping ? (
              <button 
                onClick={handleStop}
                className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-full font-bold shadow-sm transition shadow-red-500/30"
              >
                Stop
              </button>
            ) : (
              <button 
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-full font-bold shadow-sm transition disabled:bg-slate-300"
              >
                Send
              </button>
            )}
            
            {swarmComplete && !isTyping && (
              <button 
                onClick={() => router.push("/answers")}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-full font-bold shadow-sm transition animate-bounce"
              >
                Finish →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}