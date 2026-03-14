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
  
  // NEW: State for Share Dropdown
  const [showShareOptions, setShowShareOptions] = useState(false)

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

  // Prepare encoded strings for the share buttons
  const whatsappText = encodeURIComponent(outputs.whatsappOutput || "Join us for this exciting event!")
  const emailSubject = encodeURIComponent("Invitation: Event")
  const emailBody = encodeURIComponent(outputs.mailingOutput || "")

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header with Share Button added */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-50">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Final Event Review</h1>
            <p className="text-slate-500 mt-1">Review finalized content, generate a poster, and share or send emails.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={() => router.push(`/answers?sessionId=${sessionId}`)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-full text-sm font-bold transition flex items-center gap-2">
              ← Back to Edit
            </button>
            
            {/* NEW SHARE ACTION AREA */}
            <div className="relative">
              <button 
                onClick={() => setShowShareOptions(!showShareOptions)}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-sm transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                Share Event
              </button>

              {/* DROPDOWN ICONS */}
              {showShareOptions && (
                <div className="absolute right-0 mt-3 bg-white border border-slate-200 shadow-xl rounded-2xl p-2 flex gap-2 animate-in fade-in slide-in-from-top-2">
                  
                  {/* WHATSAPP BUTTON */}
                  <a 
                    href={`https://wa.me/?text=${whatsappText}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-12 h-12 bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white rounded-xl transition-colors group"
                    title="Share to WhatsApp"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 21.042c-1.571 0-3.11-.424-4.453-1.229l-.32-.191-3.308.867.882-3.226-.21-.334c-.886-1.408-1.353-3.037-1.353-4.721 0-4.908 3.996-8.904 8.905-8.904 2.379 0 4.616.927 6.297 2.61a8.857 8.857 0 012.607 6.297c0 4.907-3.996 8.904-8.905 8.904h-.001a8.865 8.865 0 01-.141-.073zm.142-16.353c-4.102 0-7.443 3.34-7.443 7.442 0 1.312.343 2.592.996 3.723l.149.256-.526 1.926 1.97-.517.246.146c1.093.649 2.333.99 3.608.991h.001c4.102 0 7.442-3.341 7.442-7.442a7.404 7.404 0 00-2.18-5.262 7.399 7.399 0 00-5.263-2.18zm3.805 10.165c-.208-.105-1.233-.609-1.424-.679-.191-.07-.33-.105-.469.104-.139.208-.538.679-.66.818-.121.14-.243.157-.451.053-.208-.105-.88-.324-1.676-1.036-.618-.553-1.036-1.236-1.157-1.445-.121-.208-.013-.321.092-.425.093-.093.208-.244.312-.366.104-.121.139-.208.208-.347.07-.139.035-.261-.018-.365-.052-.104-.469-1.13-.642-1.547-.168-.403-.339-.348-.469-.355h-.401c-.139 0-.365.052-.556.261-.191.208-.73.712-.73 1.737 0 1.025.747 2.016.851 2.155.104.139 1.47 2.245 3.563 3.149.498.215.886.343 1.189.44.5.158.955.135 1.313.082.404-.06 1.233-.504 1.406-.991.174-.486.174-.903.121-.991-.052-.088-.191-.14-.4-.245z"></path></svg>
                  </a>

                  {/* EMAIL BUTTON */}
                  <a 
                    href={`mailto:?subject=${emailSubject}&body=${emailBody}`} 
                    className="flex items-center justify-center w-12 h-12 bg-blue-50 hover:bg-blue-500 text-blue-600 hover:text-white rounded-xl transition-colors group"
                    title="Share via Email"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3-Column Grid for Agents */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 z-10">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 z-10">
          
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

export default function FinalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading Final Review Page...</div>}>
      <FinalContent />
    </Suspense>
  )
}