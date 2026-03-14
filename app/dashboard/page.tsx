"use client"

import { useState, useRef, useEffect, ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { useAgentContext, ChatMessage } from "@/context/AgentContext"
import ReactMarkdown from "react-markdown"

type DBHistoryItem = {
  _id: string;
  sessionId: string;
  eventName: string;
  createdAt: string;
}

// --- NEW COMPONENT: Active Agents Dropdown ---
function ActiveAgentsList() {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const agents = [
    { id: "supervisor", name: "Supervisor", desc: "Coordinates the swarm by collecting the Event Name, Target Audience, and Date/Time.", color: "text-amber-600 bg-amber-50 border-amber-200" },
    { id: "marketing", name: "Marketing Agent", desc: "Crafts engaging promotional copy, Instagram visual ideas, and Twitter drafts.", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    { id: "mailing", name: "Mailing Agent", desc: "Drafts professional, high-converting email invitation templates with placeholders.", color: "text-blue-600 bg-blue-50 border-blue-200" },
    { id: "scheduler", name: "Scheduler Agent", desc: "Generates a logical, well-paced bulleted timeline for your event.", color: "text-purple-600 bg-purple-50 border-purple-200" },
    { id: "whatsapp", name: "WhatsApp Agent", desc: "Writes concise, formatted WhatsApp messages tailored to the event's tone.", color: "text-teal-600 bg-teal-50 border-teal-200" },
    { id: "form", name: "Form Agent", desc: "Generates necessary registration fields for the event to create a Google Form.", color: "text-pink-600 bg-pink-50 border-pink-200" }
  ]

  return (
    <div className="absolute top-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white border border-slate-200 shadow-sm hover:shadow-md rounded-full px-4 py-2.5 text-sm font-bold text-slate-700 transition-all active:scale-95"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        Swarm Agents
        <svg className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </button>

      {/* Expandable Dropdown Panel */}
      <div className={`mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden origin-top-right transition-all duration-300 ease-out ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
        <div className="p-4 border-b border-slate-50 bg-slate-50/50">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Active AI Roster</h3>
        </div>
        <div className="flex flex-col max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 p-2 gap-1">
          {agents.map((agent) => {
            const isExpanded = expandedId === agent.id;
            return (
              <div key={agent.id} className="rounded-xl border border-transparent overflow-hidden transition-all duration-200">
                <button 
                  onClick={() => setExpandedId(isExpanded ? null : agent.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors hover:bg-slate-50 ${isExpanded ? 'bg-slate-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${agent.color.split(' ')[1]}`}></span>
                    <span className="text-sm font-bold text-slate-700">{agent.name}</span>
                  </div>
                  <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
                {/* Accordion Description Area */}
                <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <div className="px-4 pb-3 pt-1 text-xs text-slate-500 leading-relaxed ml-3 border-l-2 border-slate-100">
                      {agent.desc}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
// ----------------------------------------------

export default function DashboardChat() {
  const router = useRouter()
  const { inputs, setInputs, outputs, setOutputs } = useAgentContext()
  
  const [sessionId, setSessionId] = useState(() => "session-" + Date.now())
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [swarmComplete, setSwarmComplete] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  const [currentStreamingNode, setCurrentStreamingNode] = useState<string | null>(null)
  
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false)
  const [history, setHistory] = useState<DBHistoryItem[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false)
      } else {
        setIsSidebarOpen(true)
      }
    }
    
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history')
      const data = await res.json()
      if (data.success) {
        setHistory(data.history)
      }
    } catch (e) {
      console.error("Failed to fetch DB history", e)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [inputs.chatHistory])

  const handleNewChat = () => {
    if (inputs.chatHistory.length <= 1) return;

    setSessionId("session-" + Date.now())
    setInputs({
      mailingData: [],
      chatHistory: [
        { id: Date.now().toString(), role: "supervisor", content: "Hello! I am the Event Hive Supervisor. To get started, what kind of event are you hosting, and do you want me to generate a registration form?" }
      ]
    })
    setOutputs({ marketingOutput: "", mailingOutput: "", schedulerOutput: "", whatsappOutput: "", formOutput: "", posterImage: "" })
    setSwarmComplete(false)
    setUploadedFileName(null)
    setInputValue("")
    setIsWhatsAppOpen(false)
    setCurrentStreamingNode(null)
  }

  const deleteHistoryItem = async (e: React.MouseEvent, idToRemove: string) => {
    e.stopPropagation();
    if (confirm("Permanently delete this session from the database?")) {
      try {
        setHistory(prev => prev.filter(h => h.sessionId !== idToRemove));
        const res = await fetch(`/api/history?sessionId=${idToRemove}`, { method: 'DELETE' });
        const data = await res.json();
        
        if (!data.success) {
          fetchHistory();
          alert("Failed to delete from database.");
        }
      } catch (err) {
        console.error("Delete error", err);
        fetchHistory();
      }
    }
  }

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsTyping(false)
    setCurrentStreamingNode(null)
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
    setIsWhatsAppOpen(false) 
    setCurrentStreamingNode(null)

    // Clear outputs before new generation
    setOutputs({ marketingOutput: "", mailingOutput: "", schedulerOutput: "", whatsappOutput: "", formOutput: "", posterImage: "" })

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
            // Correctly scoped parsed object
            const parsed = JSON.parse(data)
            
            setCurrentStreamingNode(parsed.node)

            if (["marketingNode", "mailingNode", "schedulerNode", "whatsappNode", "formNode"].includes(parsed.node)) {
              agentsRanThisTurn = true
            }
            
            setInputs(prev => {
              const history = [...prev.chatHistory]
              const lastIndex = history.length - 1
              const lastMsg = history[lastIndex]

              if (lastMsg.role !== parsed.node) {
                // Type casting here to satisfy ChatMessage role type constraints
                history.push({ id: Date.now().toString(), role: parsed.node as any, content: parsed.text })
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
              if (parsed.node === "whatsappNode") next.whatsappOutput += parsed.text 
              if (parsed.node === "formNode") next.formOutput += parsed.text // Safely capturing Form JSON
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
      setCurrentStreamingNode(null) 
      abortControllerRef.current = null
      
      if (agentsRanThisTurn) {
        setSwarmComplete(true)
        fetchHistory() 
      }
    }
  }

  const getAgentLabel = (role: string) => {
    switch(role) {
      case "supervisorNode": return { name: "Supervisor", color: "text-amber-600 bg-amber-50" }
      case "marketingNode": return { name: "Marketing Agent", color: "text-emerald-600 bg-emerald-50" }
      case "mailingNode": return { name: "Mailing Agent", color: "text-blue-600 bg-blue-50" }
      case "schedulerNode": return { name: "Scheduler Agent", color: "text-purple-600 bg-purple-50" }
      case "whatsappNode": return { name: "WhatsApp Agent", color: "text-teal-600 bg-teal-50" }
      case "formNode": return { name: "Form Agent", color: "text-pink-600 bg-pink-50" }
      default: return { name: "Supervisor", color: "text-slate-600 bg-slate-50" }
    }
  }

  const handleFinishAndSave = async () => {
    setIsSaving(true)

    let extractedEventName = "Untitled Event"
    const lastSupervisorMsg = inputs.chatHistory.slice().reverse().find(m => m.role === "supervisorNode" || m.role === "supervisor")
    if (lastSupervisorMsg && lastSupervisorMsg.content.includes("###START_SWARM###|")) {
      extractedEventName = lastSupervisorMsg.content.split("###START_SWARM###|")[1].split("\n")[0].replace("|FORM_YES", "").replace("|FORM_NO", "").trim()
    }

    try {
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          eventName: extractedEventName,
          marketingOutput: outputs.marketingOutput,
          mailingOutput: outputs.mailingOutput,
          schedulerOutput: outputs.schedulerOutput,
          whatsappOutput: outputs.whatsappOutput, 
          formOutput: outputs.formOutput, // Sending Form JSON to Database
          chatHistory: inputs.chatHistory
        })
      })
      router.push(`/answers?sessionId=${sessionId}`)
    } catch (e) {
      console.error("Failed to save", e)
      setIsSaving(false)
    }
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col md:flex-row overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className={`bg-white border-r border-slate-200 hidden sm:flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 h-full shrink-0 transition-[width] duration-300 ease-in-out ${isSidebarOpen ? 'w-72' : 'w-[76px]'}`}>
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 h-[68px] shrink-0">
          {isSidebarOpen && (
            <h2 className="font-bold text-slate-800 flex items-center gap-2 whitespace-nowrap overflow-hidden">
              <svg className="w-5 h-5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              History
            </h2>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition ml-auto"
            title={isSidebarOpen ? "Minimize Sidebar" : "Expand Sidebar"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isSidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path> 
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              )}
            </svg>
          </button>
        </div>

        <div className="p-3 border-b border-slate-100 shrink-0">
          <button 
            onClick={handleNewChat}
            className={`flex items-center justify-center gap-2 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-bold transition-all shadow-sm ${!isSidebarOpen ? 'px-0' : 'px-4'}`}
            title="Start New Chat"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            {isSidebarOpen && <span className="whitespace-nowrap overflow-hidden">New Chat</span>}
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-slate-200">
          {history.length === 0 ? (
            <div className={`text-center p-4 text-slate-400 text-sm mt-4 ${!isSidebarOpen && 'hidden'}`}>
              No recent sessions.
            </div>
          ) : (
            history.map((item) => (
              <div 
                key={item.sessionId}
                onClick={() => router.push(`/answers?sessionId=${item.sessionId}`)}
                className={`group rounded-xl cursor-pointer transition-all border ${
                  !isSidebarOpen ? 'p-3 flex justify-center hover:bg-slate-50' : 'p-3 bg-transparent border-transparent hover:bg-slate-50 hover:border-slate-100'
                }`}
                title={item.eventName || "Untitled Event"}
              >
                {isSidebarOpen ? (
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate text-slate-700">
                        {item.eventName || "Untitled Event"}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 font-mono uppercase tracking-wider">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "Recently"}
                      </p>
                    </div>
                    
                    <button 
                      onClick={(e) => deleteHistoryItem(e, item.sessionId)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all ml-2"
                      title="Delete Session"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                  </div>
                ) : (
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-slate-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>
                )}
              </div>
            ))
          )}
        </div>

        {isSidebarOpen && (
          <div className="p-4 border-t border-slate-100 shrink-0">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Current Session</h3>
            <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 font-mono truncate">
              {sessionId}
            </div>
          </div>
        )}
      </aside>

      {/* CHAT INTERFACE - ADDED RELATIVE POSITIONING */}
      <div className="flex-1 flex flex-col h-full bg-slate-50 relative">
        
        {/* ADDED THE NEW COMPONENT HERE */}
        <ActiveAgentsList />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center">
          <div className="w-full max-w-3xl space-y-6 pb-6">
            
            {inputs.chatHistory.map((msg, i) => {
              const isUser = msg.role === "user"
              const agentUI = getAgentLabel(msg.role)
              const displayContent = msg.content.replace(/###START_SWARM###(?:\|.*)?/g, "*(Initiating Swarm...)*");

              // Hide WhatsApp and Form raw JSON nodes from the main chat flow
              if (msg.role === "whatsappNode" || msg.role === "formNode") return null;

              return (
                <div key={i} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                  {!isUser && (
                    <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 px-2 py-0.5 rounded-full ${agentUI.color}`}>
                      {agentUI.name}
                    </span>
                  )}
                  <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${isUser ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-800"}`}>
                    <div className={`prose prose-sm ${isUser ? "prose-invert" : ""} max-w-none break-words whitespace-pre-wrap overflow-x-hidden`}>
                      <ReactMarkdown>{displayContent}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              )
            })}
            
            {/* UPDATED LOADING UI */}
            {isTyping && (!currentStreamingNode || currentStreamingNode === "whatsappNode" || currentStreamingNode === "formNode") && (
               <div className="flex items-start">
                 <span className="bg-white border border-slate-200 text-slate-500 text-xs font-medium px-4 py-2 rounded-full shadow-sm animate-pulse flex items-center gap-2">
                   <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                   {!currentStreamingNode 
                     ? "Agents are thinking..." 
                     : currentStreamingNode === "whatsappNode" 
                       ? "Generating WhatsApp text..." 
                       : currentStreamingNode === "formNode" 
                         ? "Generating Google Form structure..." 
                         : "Agents are typing..."}
                 </span>
               </div>
            )}

            {/* EXPANDABLE WHATSAPP CARD */}
            {outputs.whatsappOutput && swarmComplete && !isTyping && (
              <div className="mt-8 border border-emerald-200 bg-emerald-50 rounded-2xl overflow-hidden shadow-sm transition-all">
                <button 
                  onClick={() => setIsWhatsAppOpen(!isWhatsAppOpen)} 
                  className="w-full px-5 py-4 flex justify-between items-center bg-emerald-100/50 hover:bg-emerald-100 text-emerald-900 font-bold text-sm transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 21.042c-1.571 0-3.11-.424-4.453-1.229l-.32-.191-3.308.867.882-3.226-.21-.334c-.886-1.408-1.353-3.037-1.353-4.721 0-4.908 3.996-8.904 8.905-8.904 2.379 0 4.616.927 6.297 2.61a8.857 8.857 0 012.607 6.297c0 4.907-3.996 8.904-8.905 8.904h-.001a8.865 8.865 0 01-.141-.073zm.142-16.353c-4.102 0-7.443 3.34-7.443 7.442 0 1.312.343 2.592.996 3.723l.149.256-.526 1.926 1.97-.517.246.146c1.093.649 2.333.99 3.608.991h.001c4.102 0 7.442-3.341 7.442-7.442a7.404 7.404 0 00-2.18-5.262 7.399 7.399 0 00-5.263-2.18zm3.805 10.165c-.208-.105-1.233-.609-1.424-.679-.191-.07-.33-.105-.469.104-.139.208-.538.679-.66.818-.121.14-.243.157-.451.053-.208-.105-.88-.324-1.676-1.036-.618-.553-1.036-1.236-1.157-1.445-.121-.208-.013-.321.092-.425.093-.093.208-.244.312-.366.104-.121.139-.208.208-.347.07-.139.035-.261-.018-.365-.052-.104-.469-1.13-.642-1.547-.168-.403-.339-.348-.469-.355h-.401c-.139 0-.365.052-.556.261-.191.208-.73.712-.73 1.737 0 1.025.747 2.016.851 2.155.104.139 1.47 2.245 3.563 3.149.498.215.886.343 1.189.44.5.158.955.135 1.313.082.404-.06 1.233-.504 1.406-.991.174-.486.174-.903.121-.991-.052-.088-.191-.14-.4-.245z"></path></svg>
                    WhatsApp Invite Ready
                  </span>
                  <span>{isWhatsAppOpen ? '▼' : '▶'}</span>
                </button>
                
                {isWhatsAppOpen && (
                  <div className="p-5 flex flex-col gap-5 border-t border-emerald-100">
                    <div className="prose prose-sm text-emerald-900 whitespace-pre-wrap bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                      <ReactMarkdown>{outputs.whatsappOutput}</ReactMarkdown>
                    </div>
                    <a 
                      href={`https://wa.me/?text=${encodeURIComponent(outputs.whatsappOutput)}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-full text-center flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] shadow-sm"
                    >
                      Share to WhatsApp ↗
                    </a>
                  </div>
                )}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* INPUT AREA */}
        <div className="w-full bg-slate-50 border-t border-slate-200 pt-4 pb-6 px-4 md:px-8 shrink-0 flex justify-center">
          <div className="w-full max-w-3xl flex flex-col">
            
            {uploadedFileName && (
              <div className="flex items-center gap-2 bg-slate-200 w-max px-3 py-1.5 rounded-t-lg text-xs font-medium text-slate-700 ml-4 border border-slate-300 border-b-0">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                {uploadedFileName}
                <button onClick={removeFile} className="text-slate-500 hover:text-red-600 ml-1 font-bold leading-none">×</button>
              </div>
            )}

            <div className={`flex flex-col bg-white border border-slate-300 shadow-sm transition-all overflow-hidden ${uploadedFileName ? 'rounded-b-3xl rounded-tr-3xl rounded-tl-sm' : 'rounded-3xl focus-within:ring-2 focus-within:ring-slate-900 focus-within:border-transparent'}`}>
              <div className="flex items-end gap-2 p-2">
                <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0"
                  title="Attach Mailing CSV"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                </button>

                <textarea 
                  ref={textareaRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your event details..." 
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

            {swarmComplete && !isTyping && (
              <div className="mt-4 flex justify-center">
                <button 
                  onClick={handleFinishAndSave}
                  disabled={isSaving}
                  className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-500 text-white px-8 py-2.5 rounded-full font-bold shadow-sm transition flex items-center gap-2 text-sm"
                >
                  {isSaving ? "Saving Event..." : "Review & Finish Event"} <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}