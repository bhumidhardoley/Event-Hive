"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"

type AgentNode = "marketingNode" | "mailingNode" | "schedulerNode"

interface AgentCardProps {
  title: string
  node: AgentNode
  content: string
  onEditText: (node: AgentNode, text: string) => void
  onPrompt: (node: AgentNode, prompt: string) => void
}

export default function AgentCard({
  title,
  node,
  content,
  onEditText,
  onPrompt
}: AgentCardProps) {

  const [mode, setMode] = useState<"view" | "edit" | "prompt">("view")
  const [text, setText] = useState(content)
  const [prompt, setPrompt] = useState("")

  return (
    // Changed border color and hover shadow color
    <div className="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm hover:shadow-emerald-100/50 hover:shadow-lg transition-all duration-300">

      <div className="flex justify-between items-center mb-4">
        {/* Changed text to emerald-600 */}
        <h2 className="text-xs font-bold text-emerald-600 tracking-widest uppercase">
          {title}
        </h2>

        <button
          onClick={() => setMode("edit")}
          className="text-sm font-semibold text-slate-400 hover:text-emerald-500 transition-colors"
        >
          {mode === "view" ? "Edit" : "Cancel"}
        </button>
      </div>

      {mode === "view" && (
        <div className="prose prose-sm max-w-none text-slate-700 prose-headings:text-emerald-900 prose-a:text-emerald-600">
          <ReactMarkdown>
            {content || "Waiting for agent..."}
          </ReactMarkdown>
        </div>
      )}

      {mode === "edit" && (
        <div className="space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            // Changed focus ring to emerald
            className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
            rows={6}
          />

          <div className="flex gap-3">
            <button
              onClick={() => {
                onEditText(node, text);
                setMode("view");
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-sm shadow-emerald-200 transition"
            >
              Save Changes
            </button>

            <button
              onClick={() => setMode("prompt")}
              className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-bold transition"
            >
              Refine with AI
            </button>
          </div>
        </div>
      )}

      {mode === "prompt" && (
        <div className="space-y-4">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask the agent to rewrite..."
            className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
          />

          <div className="flex gap-2">
            <button
              onClick={() => onPrompt(node, prompt)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition shadow-md shadow-emerald-100"
            >
              Send Prompt
            </button>
            <button
              onClick={() => setMode("view")}
              className="px-4 py-2.5 text-sm font-medium text-slate-500"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  )
}