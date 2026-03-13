"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import FileUploadPreview from "@/components/FileUploadPreview"
import { useAgentContext } from "@/context/AgentContext"

interface MailingEntry {
  id?: string | number
  email?: string
  name?: string
  [key: string]: unknown
}

export default function Dashboard() {
  const router = useRouter()

  const { setInputs } = useAgentContext()

  const [mailingData, setMailingData] = useState<MailingEntry[]>([])
  const [marketingInput, setMarketingInput] = useState("")
  const [mailingContext, setMailingContext] = useState("")
  const [schedulerInput, setSchedulerInput] = useState("")

  const runAgents = () => {
    setInputs({
      marketingInput,
      mailingData,
      mailingContext,
      schedulerInput
    })

    router.push("/answers")
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        
        <header className="mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Event Hive AI
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Configure your marketing agents and deployment constraints below.
          </p>
        </header>

        <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-8 space-y-8">
            
            <section>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Marketing Prompt
              </label>
              <textarea
                className="w-full p-4 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none resize-none"
                placeholder="Describe the campaign goals or tone..."
                rows={4}
                value={marketingInput}
                onChange={(e) => setMarketingInput(e.target.value)}
              />
            </section>

            <section>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email List (CSV / Excel)
              </label>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-2 hover:border-indigo-400 transition-colors">
                <FileUploadPreview onDataExtracted={(data: MailingEntry[]) => setMailingData(data)} />
              </div>
            </section>

            <section>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Campaign Context
              </label>
              <textarea
                className="w-full p-4 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none resize-none"
                placeholder="Provide extra context for the email campaign..."
                rows={3}
                value={mailingContext}
                onChange={(e) => setMailingContext(e.target.value)}
              />
            </section>

            <section>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Schedule Constraints
              </label>
              <textarea
                className="w-full p-4 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none resize-none"
                placeholder="e.g., Only send on weekdays between 9 AM and 5 PM EST..."
                rows={4}
                value={schedulerInput}
                onChange={(e) => setSchedulerInput(e.target.value)}
              />
            </section>

            <div className="pt-4">
              <button
                onClick={runAgents}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Run AI Agents
              </button>
            </div>

          </div>
        </div>

        <footer className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            Powered by Event Hive Intelligence • Standardized Data Processing
          </p>
        </footer>

      </div>
    </div>
  )
}