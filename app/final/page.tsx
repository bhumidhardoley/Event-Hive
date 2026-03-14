// app/final/page.tsx
"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAgentContext, MailingEntry } from "@/context/AgentContext"
import ReactMarkdown from "react-markdown"

function FinalContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("sessionId")
  
  const { inputs, outputs } = useAgentContext()

  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [showImage, setShowImage] = useState(false)
  const [loadingImage, setLoadingImage] = useState(true)
  const [sendingEmail, setSendingEmail] = useState(false)

  // Background Image Generation on page load
  useEffect(() => {
    // Generate a clean prompt from the marketing output (or a fallback)
    const promptText = outputs.marketingOutput ? outputs.marketingOutput.substring(0, 300) : "A great tech event"

    fetch(`/api/generate-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: promptText }) // Matches your backend req.json().prompt
    })
      .then(res => res.json())
      .then(data => {
        if (data.posterImage) { // Matches your backend NextResponse.json({ posterImage: ... })
          setGeneratedImageUrl(data.posterImage)
        } else {
          console.error("Image generation failed:", data.error)
        }
      })
      .catch(err => {
        console.error("Failed to generate image", err)
      })
      .finally(() => {
        setLoadingImage(false)
      })
  }, [outputs.marketingOutput])

  const handleSendEmail = async () => {
    setSendingEmail(true)
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: inputs.mailingData, // Matches your backend requirement
          emailContent: outputs.mailingOutput // Matches your backend requirement
        })
      })
      
      const data = await res.json()
      
      if (data.success) {
        alert(`Success! Email sent to your demo address: ${data.demoEmailSentTo}`)
      } else {
        alert(`Failed to send: ${data.error}`)
      }
    } catch (e) {
      console.error("Failed to send email API request", e)
      alert("A network error occurred while sending the email.")
    } finally {
      setSendingEmail(false)
    }
  }

  const outputCards: { title: string, content: string, colorClass: string }[] = [
    { title: "Marketing Copy", content: outputs.marketingOutput, colorClass: "bg-emerald-50 text-emerald-900" },
    { title: "Email Template", content: outputs.mailingOutput, colorClass: "bg-blue-50 text-blue-900" },
    { title: "Event Timeline", content: outputs.schedulerOutput, colorClass: "bg-purple-50 text-purple-900" }
  ]

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Final Event Review</h1>
            <p className="text-slate-500 mt-1">Review finalized content, generate a poster, and send emails.</p>
          </div>
          <button onClick={() => router.push(`/answers?sessionId=${sessionId}`)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-full text-sm font-bold transition flex items-center gap-2">
            ← Back to Edit
          </button>
        </div>

        {/* 3-Column Grid for Agents */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {outputCards.map((card, index) => (
            <div key={index} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
              <div className={`px-4 py-3 border-b border-slate-100 ${card.colorClass}`}>
                <h3 className="font-bold text-sm uppercase tracking-wider">{card.title}</h3>
              </div>
              <div className="p-6 flex-1 bg-slate-50/50 overflow-y-auto">
                <div className="prose prose-sm max-w-none text-slate-800 break-words whitespace-pre-wrap">
                  <ReactMarkdown>{card.content || "*No content generated.*"}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Final Actions Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Send Email Part */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Send Email</h2>
              <p className="text-slate-600 text-sm">Review the email content above. Click below to fire off the campaign via Resend.</p>
              
              {/* Recipient Details */}
              {inputs.mailingData && inputs.mailingData.length > 0 ? (
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-3 mt-6">
                  <h4 className="text-sm font-bold text-slate-700">Recipient Preview (Demo Mode: Sends to first only):</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-2 text-sm text-slate-600">
                    {inputs.mailingData.slice(0, 3).map((recipient: MailingEntry, index: number) => {
                      const email = recipient.email || recipient.Email || recipient.EMAIL || 'N/A'
                      const name = recipient.name || recipient.Name || recipient.NAME || 'N/A'
                      return (
                        <div key={index} className="flex gap-4">
                          <span className="font-medium text-slate-800">{name}</span>
                          <span>{email}</span>
                          {index === 0 && <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold ml-auto">TARGET</span>}
                        </div>
                      )
                    })}
                    {inputs.mailingData.length > 3 && (
                      <div className="text-slate-500 italic mt-2 border-t border-slate-200 pt-2">...and {inputs.mailingData.length - 3} more</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-sm mt-6 border border-amber-200">
                  ⚠️ No CSV data uploaded. Please go back to the chat and upload a CSV with recipient data first.
                </div>
              )}
            </div>

            <button 
              onClick={handleSendEmail} 
              disabled={sendingEmail || !outputs.mailingOutput || !inputs.mailingData || inputs.mailingData.length === 0}
              className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white rounded-xl text-md font-bold shadow-sm transition flex items-center justify-center gap-2 mt-6"
            >
              {sendingEmail ? "Sending via Resend..." : `Send Email to ${inputs.mailingData?.length || 0} Recipients`}
            </button>
          </div>

          {/* Image Generated Part */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Event Poster</h2>
              <p className="text-slate-600 text-sm">An AI poster is generated for the event based on your marketing details.</p>
              
              <div className="mt-6 flex-1 flex flex-col justify-center">
                {loadingImage ? (
                  <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-xl border border-slate-100 text-slate-500 text-center animate-pulse gap-4">
                     <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                     <span className="font-medium text-sm">Generating poster via Hugging Face...</span>
                  </div>
                ) : generatedImageUrl ? (
                    <div className="w-full text-center">
                        {!showImage ? (
                          <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-xl flex flex-col items-center gap-4">
                            <span className="text-emerald-700 font-medium">✨ Poster successfully generated!</span>
                            <button 
                                onClick={() => setShowImage(true)}
                                className="w-full px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-md font-bold shadow-sm transition flex items-center justify-center gap-2"
                            >
                               Show Generated Poster
                            </button>
                          </div>
                        ) : (
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-3">
                               <img src={generatedImageUrl} alt="Generated Event Poster" className="rounded-lg w-full h-auto shadow-sm object-cover" />
                               <button onClick={() => setShowImage(false)} className="text-sm text-slate-500 hover:text-slate-900 underline font-medium p-2">Hide Poster</button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-8 bg-red-50 rounded-xl border border-red-100 text-red-700 text-center text-sm font-medium">
                      Failed to generate event poster. Ensure your Hugging Face API key is set in .env.local.
                    </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// Wrapping in Suspense is required by Next.js when using useSearchParams in a client component
export default function FinalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading Final Review Page...</div>}>
      <FinalContent />
    </Suspense>
  )
}