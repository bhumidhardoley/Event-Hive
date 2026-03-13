"use client"

import ReactMarkdown from "react-markdown"

type AgentNode = "marketingNode" | "mailingNode" | "schedulerNode"

interface AgentCardProps {
  title: string
  node: AgentNode
  content: string
}

export default function AgentCard({
  title,
  content
}: AgentCardProps) {

  return (
    <div className="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm">

      <div className="mb-4">
        <h2 className="text-xs font-bold text-emerald-600 tracking-widest uppercase">
          {title}
        </h2>
      </div>

      <div className="prose prose-sm max-w-none text-slate-700 prose-headings:text-emerald-900">
        <ReactMarkdown>
          {content || "Waiting for agent..."}
        </ReactMarkdown>
      </div>

    </div>
  )
}