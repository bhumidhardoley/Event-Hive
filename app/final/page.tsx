"use client"

import { useAgentContext } from "@/context/AgentContext"
import ReactMarkdown from "react-markdown"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function FinalReview() {
  const { inputs, outputs } = useAgentContext()
  const router = useRouter()
  const [isSending, setIsSending] = useState(false)
  const [emailStatus, setEmailStatus] = useState<"idle" | "success" | "error">("idle")

  // Redirect back if there is no data (e.g., user refreshed the page)
  if (!outputs.marketingOutput && !outputs.mailingOutput && !outputs.schedulerOutput) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <button onClick={() => router.push("/")} className="text-emerald-600 underline">
          Go back to start
        </button>
      </div>
    )
  }

  const handleSendEmails = async () => {
    if (inputs.mailingData.length === 0) {
      alert("No email data provided in the CSV.")
      return
    }

    setIsSending(true)
    setEmailStatus("idle")

    // 🔥 1. LOG THE EXACT DATA BEING SENT
    console.log("=== FRONTEND: PREPARING TO SEND ===")
    console.log("First person in CSV array:", inputs.mailingData[0])
    console.log("Does it have an 'email' property?", inputs.mailingData[0].email)

    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: inputs.mailingData,
          emailContent: outputs.mailingOutput 
        })
      })

      // 🔥 2. ALWAYS READ THE JSON RESPONSE TO GET THE EXACT ERROR
      const responseData = await res.json()

      if (!res.ok) {
        // Log the exact error coming from the server
        console.error("=== FRONTEND: BACKEND REJECTED IT ===")
        console.error("Backend Error Message:", responseData.error)
        alert(`API Error: ${responseData.error}`) // Show an alert so you can't miss it
        throw new Error(responseData.error || "Failed to send")
      }
      
      console.log("=== FRONTEND: SUCCESS ===", responseData)
      setEmailStatus("success")
    } catch (error) {
      console.error("=== FRONTEND: FETCH CATCH BLOCK ===", error)
      setEmailStatus("error")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex justify-between items-center border-b pb-4">
          <h1 className="text-3xl font-bold text-slate-800">Final Event Overview</h1>
          <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-800">
            ← Back to Editor
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* MARKETING COLUMN */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-xs font-bold text-blue-600 tracking-widest uppercase mb-4">Marketing Strategy</h2>
            <div className="prose prose-sm text-slate-700">
              <ReactMarkdown>{outputs.marketingOutput}</ReactMarkdown>
            </div>
          </div>

          {/* SCHEDULER COLUMN */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-xs font-bold text-amber-600 tracking-widest uppercase mb-4">Master Schedule</h2>
            <div className="prose prose-sm text-slate-700">
              <ReactMarkdown>{outputs.schedulerOutput}</ReactMarkdown>
            </div>
          </div>

          {/* MAILING COLUMN WITH ACTION BUTTON */}
          <div className="bg-emerald-50 p-6 rounded-2xl shadow-sm border border-emerald-200 flex flex-col">
            <h2 className="text-xs font-bold text-emerald-700 tracking-widest uppercase mb-4">Email Outreach</h2>
            <div className="prose prose-sm text-slate-700 flex-grow mb-6">
              <ReactMarkdown>{outputs.mailingOutput}</ReactMarkdown>
            </div>
            
            <div className="mt-auto pt-4 border-t border-emerald-200">
              <div className="text-sm text-emerald-800 mb-3 font-medium">
                Ready to send to {inputs.mailingData.length} recipients?
              </div>
              <button 
                onClick={handleSendEmails}
                disabled={isSending || inputs.mailingData.length === 0}
                className="w-full py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 transition shadow-sm"
              >
                {isSending ? "Sending Emails..." : "Send Emails Now"}
              </button>
              
              {emailStatus === "success" && <p className="text-xs text-emerald-600 mt-2 text-center font-bold">Emails sent successfully!</p>}
              {emailStatus === "error" && <p className="text-xs text-red-600 mt-2 text-center font-bold">Failed to send emails. Check console.</p>}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}