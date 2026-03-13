"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"

export default function AgentCard({
  title,
  node,
  content,
  onEditText,
  onPrompt
}: any) {

  const [mode,setMode]=useState<"view"|"edit"|"prompt">("view")
  const [text,setText]=useState(content)
  const [prompt,setPrompt]=useState("")

  return (

    <div className="bg-white border rounded-xl p-6 shadow-sm">

      <div className="flex justify-between mb-3">

        <h2 className="text-sm font-semibold text-blue-600 uppercase">
          {title}
        </h2>

        <button
          onClick={()=>setMode("edit")}
          className="text-indigo-600 text-sm"
        >
          Edit
        </button>

      </div>

      {mode==="view" && (

        <div className="prose max-w-none">

          <ReactMarkdown>
            {content || "Waiting for agent..."}
          </ReactMarkdown>

        </div>

      )}

      {mode==="edit" && (

        <div className="space-y-3">

          <textarea
            value={text}
            onChange={(e)=>setText(e.target.value)}
            className="w-full border rounded p-3 text-sm"
            rows={6}
          />

          <div className="flex gap-2">

            <button
              onClick={()=>onEditText(node,text)}
              className="bg-green-600 text-white px-3 py-2 rounded text-sm"
            >
              Save
            </button>

            <button
              onClick={()=>setMode("prompt")}
              className="bg-blue-600 text-white px-3 py-2 rounded text-sm"
            >
              New Prompt
            </button>

          </div>

        </div>

      )}

      {mode==="prompt" && (

        <div className="space-y-3">

          <input
            value={prompt}
            onChange={(e)=>setPrompt(e.target.value)}
            placeholder="Refine this plan..."
            className="w-full border rounded p-3 text-sm"
          />

          <button
            onClick={()=>onPrompt(node,prompt)}
            className="bg-indigo-600 text-white px-3 py-2 rounded text-sm"
          >
            Send Prompt
          </button>

        </div>

      )}

    </div>

  )

}