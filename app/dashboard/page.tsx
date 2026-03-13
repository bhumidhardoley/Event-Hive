"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import FileUploadPreview from "@/components/FileUploadPreview"
import { useAgentContext, MailingEntry } from "@/context/AgentContext"

export default function Dashboard() {

  const router = useRouter()
  const { setInputs } = useAgentContext()

  const [prompt, setPrompt] = useState("")
  const [mailingData, setMailingData] = useState<MailingEntry[]>([])

  const runAgents = () => {

    setInputs({
      prompt,
      mailingData
    })

    router.push("/answers")
  }

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-6">

      <div className="max-w-3xl mx-auto">

        {/* HEADER */}

        <div className="mb-10">

          <h1 className="text-3xl font-bold text-slate-900">
            Event Hive AI
          </h1>

          <p className="text-sm text-slate-600 mt-2">
            Describe your event campaign and upload your participant list.
            The AI supervisor will coordinate marketing, email outreach, and scheduling.
          </p>

        </div>

        {/* CARD */}

        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-8 space-y-8">

          {/* PROMPT INPUT */}

          <div>

            <label className="block text-sm font-semibold text-slate-800 mb-2">
              Event Campaign Request
            </label>

            <textarea
              className="w-full p-4 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none transition"
              placeholder="Example: Promote our upcoming hackathon, email registered participants, and schedule announcements across social media."
              rows={5}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />

          </div>

          {/* CSV UPLOAD */}

          <div>

            <label className="block text-sm font-semibold text-slate-800 mb-2">
              Participant List (CSV / Excel)
            </label>

            <div className="border-2 border-dashed border-slate-300 rounded-lg p-3 hover:border-indigo-400 transition">
              <FileUploadPreview
                onDataExtracted={(data: MailingEntry[]) => setMailingData(data)}
              />
            </div>

            <p className="text-xs text-slate-500 mt-2">
              Upload your event registration list to enable personalized email campaigns.
            </p>

          </div>

        </div>

      </div>

      {/* FLOATING RUN BUTTON */}

      <button
        onClick={runAgents}
        className="fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-6 py-3 rounded-full shadow-lg transition"
      >
        Run AI Agents
      </button>

    </div>
  )
}