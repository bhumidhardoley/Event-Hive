"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"

type AgentInputs = {
  eventName: string
  targetAudience: string
  eventDate: string
}

type StreamMessage = {
  node: "marketingNode" | "mailingNode" | "schedulerNode"
  text: string
}

export default function Answers() {
  const router = useRouter()

  const [marketingOutput, setMarketingOutput] = useState<string>("")
  const [mailingOutput, setMailingOutput] = useState<string>("")
  const [schedulerOutput, setSchedulerOutput] = useState<string>("")

  const [isGenerating, setIsGenerating] = useState<boolean>(true)

  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const inputsRaw = localStorage.getItem("agentInputs")

    if (!inputsRaw) {
      router.push("/dashboard")
      return
    }

    const inputs: AgentInputs = JSON.parse(inputsRaw)

    startStream(inputs)

    return () => stopStream()
  }, [router])

  const startStream = async (inputs: AgentInputs) => {
    setIsGenerating(true)
    abortControllerRef.current = new AbortController()

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify(inputs)
      })

      if (!res.body) throw new Error("No response body")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let done = false
      let buffer = ""

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone

        if (value) {
          buffer += decoder.decode(value, { stream: true })

          const parts = buffer.split("\n\n")
          buffer = parts.pop() || ""

          for (const part of parts) {
            const line = part.trim()

            if (line.startsWith("data: ")) {
              const dataStr = line.substring(6)

              if (dataStr === "[DONE]") {
                setIsGenerating(false)
                return
              }

              try {
                const parsed: StreamMessage = JSON.parse(dataStr)

                if (parsed.node === "marketingNode") {
                  setMarketingOutput((prev) => prev + parsed.text)
                } 
                else if (parsed.node === "mailingNode") {
                  setMailingOutput((prev) => prev + parsed.text)
                } 
                else if (parsed.node === "schedulerNode") {
                  setSchedulerOutput((prev) => prev + parsed.text)
                }

              } catch {
                console.warn("Skipped malformed chunk", dataStr)
              }
            }
          }
        }
      }

    } catch (error: unknown) {

      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Stream failed:", error.message)
      }

    } finally {
      setIsGenerating(false)
    }
  }

  const stopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsGenerating(false)
    }
  }

  return (

    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">

      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}

        <div className="flex justify-between items-end border-b pb-4">

          <h1 className="text-3xl font-bold text-gray-900">
            Agent Results
          </h1>

          {isGenerating ? (
            <button
              onClick={stopStream}
              className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 font-medium animate-pulse"
            >
              Stop Generation
            </button>
          ) : (
            <span className="text-green-600 font-medium bg-green-100 px-4 py-2 rounded-md">
              ✓ Generation Complete
            </span>
          )}

        </div>

        <div className="grid grid-cols-1 gap-8">

          {/* Marketing Agent */}

          <div className="bg-white shadow-sm rounded-xl p-8 border border-gray-200">

            <h2 className="text-xl font-semibold text-blue-600 mb-4 uppercase tracking-wider text-sm">
              Marketing Strategy
            </h2>

            <div className="prose prose-blue max-w-none break-words overflow-hidden prose-pre:overflow-x-auto prose-code:break-all">

              <ReactMarkdown>
                {marketingOutput || "Waiting for agent..."}
              </ReactMarkdown>

            </div>

          </div>


          {/* Email Agent */}

          <div className="bg-white shadow-sm rounded-xl p-8 border border-gray-200">

            <h2 className="text-xl font-semibold text-blue-600 mb-4 uppercase tracking-wider text-sm">
              Email Campaign
            </h2>

            <div className="prose prose-blue max-w-none break-words overflow-hidden prose-pre:overflow-x-auto prose-code:break-all">

              <ReactMarkdown>
                {mailingOutput || "Waiting for marketing agent to finish..."}
              </ReactMarkdown>

            </div>

          </div>


          {/* Scheduler Agent */}

          <div className="bg-white shadow-sm rounded-xl p-8 border border-gray-200">

            <h2 className="text-xl font-semibold text-blue-600 mb-4 uppercase tracking-wider text-sm">
              Event Schedule
            </h2>

            <div className="prose prose-blue max-w-none break-words overflow-hidden prose-pre:overflow-x-auto prose-code:break-all">

              <ReactMarkdown>
                {schedulerOutput || "Waiting for email agent to finish..."}
              </ReactMarkdown>

            </div>

          </div>

        </div>

      </div>

    </div>
  )
}