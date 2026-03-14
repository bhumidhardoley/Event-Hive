"use client"

import ReactMarkdown from "react-markdown"

type AgentNode = "marketingNode" | "mailingNode" | "schedulerNode" | "whatsappNode"

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

      {/* Added strict spacing controls for paragraphs, lists, and headings */}
      <div className="prose prose-sm max-w-none text-slate-700 prose-headings:text-emerald-900 prose-p:my-1.5 prose-ul:my-1 prose-li:my-0.5 prose-headings:mb-2 prose-headings:mt-4 first:prose-headings:mt-0">
        <ReactMarkdown>
          {content || "Waiting for agent..."}
        </ReactMarkdown>
      </div>

    </div>
  )
}