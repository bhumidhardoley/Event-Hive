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

  // FIX 1: Include posterImage in the check so we don't accidentally hide the page
  if (!outputs.marketingOutput && !outputs.mailingOutput && !outputs.schedulerOutput && !outputs.posterImage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <button onClick={() => router.push("/")} className="text-slate-600 hover:text-slate-900 underline font-medium">
          Go back to start
        </button>
      </div>
    )
  }

  const handleSendEmails = async () => {
    setIsSending(true); setEmailStatus("idle");
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: inputs.mailingData,
          emailContent: outputs.mailingOutput,
          posterBase64: outputs.posterImage 
        })
      })
      const data = await res.json()
      if (!res.ok) { alert(`API Error: ${data.error}`); throw new Error(data.error); }
      setEmailStatus("success")
    } catch (error) { setEmailStatus("error") } finally { setIsSending(false) }
  }

  // Check if there's an error string, or if it's completely empty
  const isImageError = outputs.posterImage?.startsWith("ERROR");
  const hasImage = outputs.posterImage && outputs.posterImage.startsWith("data:image");

  return (
    <div className="min-h-screen bg-slate-50 p-8 pb-32">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex justify-between items-center border-b border-slate-200 pb-4">
          <h1 className="text-3xl font-bold text-slate-900">Final Event Overview</h1>
          <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-900 font-medium transition-colors">
            ← Back to Editor
          </button>
        </div>

        {/* TOP ROW: TEXT CONTENT */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xs font-bold text-slate-800 tracking-widest uppercase mb-4">Marketing</h2>
            <div className="prose prose-sm prose-slate max-w-none text-slate-700">
              <ReactMarkdown>{outputs.marketingOutput || "No marketing data"}</ReactMarkdown>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xs font-bold text-slate-800 tracking-widest uppercase mb-4">Schedule</h2>
            <div className="prose prose-sm prose-slate max-w-none text-slate-700">
              <ReactMarkdown>{outputs.schedulerOutput || "No schedule data"}</ReactMarkdown>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
            <h2 className="text-xs font-bold text-slate-800 tracking-widest uppercase mb-4">Emails</h2>
            <div className="prose prose-sm prose-slate max-w-none text-slate-700 flex-grow mb-6">
              <ReactMarkdown>{outputs.mailingOutput || "No email data"}</ReactMarkdown>
            </div>
            
            <div className="mt-auto pt-4 border-t border-slate-100">
              <button 
                onClick={handleSendEmails} 
                disabled={isSending || inputs.mailingData.length === 0} 
                className="w-full py-3 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 transition shadow-sm"
              >
                {isSending ? "Sending to Test Email..." : "Send Test Email"}
              </button>
              {emailStatus === "success" && <p className="text-xs text-green-600 mt-3 text-center font-bold">Sent successfully!</p>}
              {emailStatus === "error" && <p className="text-xs text-red-600 mt-3 text-center font-bold">Failed to send.</p>}
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: AI POSTER DISPLAY */}
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row items-start gap-8">
            
            <div className="w-full md:w-1/3 space-y-4">
              <h2 className="text-2xl font-bold text-slate-900">Event Branding</h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                The image generation agent automatically engineered a prompt based on your event details and schedule, creating this unique promotional poster using FLUX AI.
              </p>
            </div>

            {/* IMAGE DISPLAY FRAME */}
            <div className="flex-1 w-full flex justify-center border border-slate-200 rounded-2xl bg-slate-50 min-h-[500px] overflow-hidden relative">
              
              {/* FIX 2: Better conditional rendering for the Base64 image */}
              {hasImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={outputs.posterImage} 
                  alt="AI Generated Event Poster" 
                  className="object-contain w-full max-h-[600px] p-2" 
                />
              ) : isImageError ? (
                <div className="flex flex-col items-center justify-center h-full text-red-500 italic p-10 text-center gap-4">
                  <span className="font-bold text-lg">⚠️ Image Generation Failed</span>
                  <span className="text-sm">{outputs.posterImage}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 italic p-10 text-center gap-4">
                  <span>Waiting for the graph to finish generating the poster...</span>
                </div>
              )}

            </div>
            
          </div>
        </div>

      </div>
    </div>
  )
}