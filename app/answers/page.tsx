"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"

interface MailingEntry {
  id?: string | number
  email?: string
  name?: string
  [key: string]: unknown 
}

type AgentInputs = {
  marketingInput: string
  mailingData: MailingEntry[] 
  schedulerInput: string
}

type StreamMessage = {
  node: "marketingNode" | "mailingNode" | "schedulerNode"
  text: string
}

export default function Answers() {
  const router = useRouter()

  const [marketingOutput, setMarketingOutput] = useState("")
  const [mailingOutput, setMailingOutput] = useState("")
  const [schedulerOutput, setSchedulerOutput] = useState("")
  const [isGenerating, setIsGenerating] = useState(true)

  useEffect(() => {
    const raw = localStorage.getItem("agentInputs")

    if (!raw) {
      router.push("/dashboard")
      return
    }

    try {
      const inputs: AgentInputs = JSON.parse(raw)
      startStream(inputs)
    } catch {
      router.push("/dashboard")
    }
  }, [router])

  const startStream = async (inputs: AgentInputs) => {
    setIsGenerating(true)

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketingInput: inputs.marketingInput,
          mailingInput: JSON.stringify(inputs.mailingData),
          schedulerInput: inputs.schedulerInput
        })
      })

      if (!res.body) throw new Error("No response body")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split("\n\n")
        buffer = parts.pop() || ""

        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith("data: ")) continue

          const dataStr = line.substring(6)

          if (dataStr === "[DONE]") {
            setIsGenerating(false)
            return
          }

          try {
            const parsed: StreamMessage = JSON.parse(dataStr)
            if (parsed.node === "marketingNode") {
              setMarketingOutput(prev => prev + parsed.text)
            } else if (parsed.node === "mailingNode") {
              setMailingOutput(prev => prev + parsed.text)
            } else if (parsed.node === "schedulerNode") {
              setSchedulerOutput(prev => prev + parsed.text)
            }
          } catch {
            continue
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Stream failed:", error.message)
      }
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex justify-between items-center border-b border-gray-200 pb-6">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight tracking-tighter">
            Agent Results
          </h1>
          
          {/* We are now using isGenerating here to fix the ESLint error */}
          {isGenerating ? (
            <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              <span className="text-xs font-medium uppercase tracking-wider">Agents Processing</span>
            </div>
          ) : (
            <div className="text-xs font-medium uppercase tracking-wider text-green-600 bg-green-50 px-4 py-1.5 rounded-full border border-green-100">
              Analysis Complete
            </div>
          )}
        </div>

        <AgentBox title="Marketing Strategy" content={marketingOutput} />
        <AgentBox title="Email Campaign" content={mailingOutput} />
        <AgentBox title="Event Schedule" content={schedulerOutput} />
      </div>
    </div>
  )
}

function AgentBox({ title, content }: { title: string; content: string }) {
  const cleanContent = content
    .replace(/^---$/gm, "") 
    .replace(/\n{3,}/g, "\n\n");

  return (
    <div className="bg-white shadow-sm rounded-2xl p-8 border border-gray-200 transition-all hover:shadow-md">
      <h2 className="text-[10px] font-black text-indigo-500 mb-6 uppercase tracking-[0.2em]">
        {title}
      </h2>
      
      <div className="text-gray-700 leading-relaxed">
        {content ? (
          <div className="markdown-prose">
            <ReactMarkdown>{cleanContent}</ReactMarkdown>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-400">
            <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" />
            <p className="text-sm italic text-gray-400">Agent is thinking...</p>
          </div>
        )}
      </div>

      <style jsx global>{`
        .markdown-prose h1 { @apply text-2xl font-bold mb-4 mt-2 text-gray-900; }
        .markdown-prose h2 { @apply text-xl font-semibold mb-3 mt-6 text-gray-800 border-b pb-1; }
        .markdown-prose h3 { @apply text-lg font-bold mb-2 mt-4 text-gray-800; }
        .markdown-prose p { @apply mb-4 last:mb-0; }
        .markdown-prose ul { @apply list-disc pl-5 mb-4 space-y-1; }
        .markdown-prose ol { @apply list-decimal pl-5 mb-4 space-y-1; }
        .markdown-prose li { @apply text-gray-700; }
        .markdown-prose table { @apply w-full border-collapse mb-4 mt-2 text-sm; }
        .markdown-prose th { @apply bg-gray-50 border border-gray-200 p-2 text-left font-bold; }
        .markdown-prose td { @apply border border-gray-200 p-2; }
        .markdown-prose strong { @apply font-bold text-gray-900; }
        .markdown-prose blockquote { @apply border-l-4 border-gray-200 pl-4 italic text-gray-500 my-4; }
      `}</style>
    </div>
  )
}