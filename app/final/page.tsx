// app/final/page.tsx
"use client"

import { useState, useEffect, Suspense, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAgentContext, MailingEntry } from "@/context/AgentContext"
import ReactMarkdown from "react-markdown"

function FinalContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("sessionId")
  
  // Relying entirely on your original Context data flow
  const { inputs, outputs } = useAgentContext()

  // ---- Image State ----
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [loadingImage, setLoadingImage] = useState(false)
  const [imagePrompt, setImagePrompt] = useState("")

  // ---- Email State ----
  const [sendingEmail, setSendingEmail] = useState(false)
  const [localMailingData, setLocalMailingData] = useState<MailingEntry[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // ---- UI & Export State ----
  const [showShareOptions, setShowShareOptions] = useState(false)
  const [exportingSheet, setExportingSheet] = useState(false)
  
  // Accordion Sidebar State: Default open to the first tab
  const [activeAgentTab, setActiveAgentTab] = useState<string | null>("Marketing Copy")

  // Background Image Generation & Data Init on page load
  useEffect(() => {
    // Sync context CSV data to local state
    if (inputs.mailingData && inputs.mailingData.length > 0) {
      setLocalMailingData(inputs.mailingData)
    }

    // Prepare the image prompt and run the initial generation
    const initialPrompt = outputs.marketingOutput ? outputs.marketingOutput.substring(0, 300) : "A great tech event"
    setImagePrompt(initialPrompt)
    
    // Only generate if we don't already have an image (prevents double fetches)
    if (!generatedImageUrl) {
      generateImage(initialPrompt)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outputs.marketingOutput, inputs.mailingData])

  // Extract the original fetch logic into a callable function for Reprompting
  const generateImage = (promptText: string) => {
    if (!promptText) return;
    setLoadingImage(true)
    fetch(`/api/generate-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: promptText }) 
    })
      .then(res => res.json())
      .then(data => {
        if (data.posterImage) { 
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
  }

  // New Image Download Logic
  const handleDownloadImage = async () => {
    if (!generatedImageUrl) return;
    try {
      const response = await fetch(generatedImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Event-Poster-${sessionId || 'download'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed, opening in new tab", error);
      window.open(generatedImageUrl, '_blank');
    }
  }

  // New Local CSV Upload Logic
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n').filter(line => line.trim() !== '')
      if (lines.length < 2) return

      const headers = lines[0].split(',').map(h => h.trim())
      const parsedData = lines.slice(1).map(line => {
        const values = line.split(',')
        const obj: any = {}
        headers.forEach((h, i) => { obj[h] = values[i]?.trim() || "" })
        return obj
      })

      setLocalMailingData(parsedData)
      alert(`Successfully loaded ${parsedData.length} recipients from your new CSV!`)
    }
    reader.readAsText(file)
  }

  const handleSendEmail = async () => {
    setSendingEmail(true)
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: localMailingData, // Using the local data (which includes new uploads)
          emailContent: outputs.mailingOutput 
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

  const handleExportSheet = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent accordion from toggling
    setExportingSheet(true)
    try {
      const res = await fetch("/api/export-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedulerOutput: outputs.schedulerOutput })
      })
      const data = await res.json()
      
      if (data.success) {
        alert(`Successfully exported ${data.rowsAdded} timeline events to Google Sheets!`)
      } else {
        alert("Failed to export: " + data.error)
      }
    } catch (e) {
      console.error(e)
      alert("Network error while exporting to Sheets.")
    } finally {
      setExportingSheet(false)
    }
  }

  const outputCards = [
    { title: "Marketing Copy", content: outputs.marketingOutput, colorClass: "bg-emerald-50 text-emerald-900" },
    { title: "Email Template", content: outputs.mailingOutput, colorClass: "bg-blue-50 text-blue-900" },
    { title: "Event Timeline", content: outputs.schedulerOutput, colorClass: "bg-purple-50 text-purple-900", isTimeline: true }
  ]

  const whatsappText = encodeURIComponent(outputs.whatsappOutput || "Join us for this exciting event!")
  const emailSubject = encodeURIComponent("Invitation: Event")
  const emailBody = encodeURIComponent(outputs.mailingOutput || "")

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* ---------------- HEADER ---------------- */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm shrink-0">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Final Event Review</h1>
            <p className="text-slate-500 text-sm mt-1">Review finalized content, manage assets, and distribute.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={() => router.push(`/answers?sessionId=${sessionId}`)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-full text-sm font-bold transition flex items-center gap-2">
              ← Back to Edit
            </button>
            
            <div className="relative">
              <button 
                onClick={() => setShowShareOptions(!showShareOptions)}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-sm transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                Share Event
              </button>

              {showShareOptions && (
                <div className="absolute right-0 mt-3 bg-white border border-slate-200 shadow-xl rounded-2xl p-2 flex gap-2 animate-in fade-in slide-in-from-top-2">
                  <a href={`https://wa.me/?text=${whatsappText}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-12 h-12 bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white rounded-xl transition-colors group" title="Share to WhatsApp">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 21.042c-1.571 0-3.11-.424-4.453-1.229l-.32-.191-3.308.867.882-3.226-.21-.334c-.886-1.408-1.353-3.037-1.353-4.721 0-4.908 3.996-8.904 8.905-8.904 2.379 0 4.616.927 6.297 2.61a8.857 8.857 0 012.607 6.297c0 4.907-3.996 8.904-8.905 8.904h-.001a8.865 8.865 0 01-.141-.073zm.142-16.353c-4.102 0-7.443 3.34-7.443 7.442 0 1.312.343 2.592.996 3.723l.149.256-.526 1.926 1.97-.517.246.146c1.093.649 2.333.99 3.608.991h.001c4.102 0 7.442-3.341 7.442-7.442a7.404 7.404 0 00-2.18-5.262 7.399 7.399 0 00-5.263-2.18zm3.805 10.165c-.208-.105-1.233-.609-1.424-.679-.191-.07-.33-.105-.469.104-.139.208-.538.679-.66.818-.121.14-.243.157-.451.053-.208-.105-.88-.324-1.676-1.036-.618-.553-1.036-1.236-1.157-1.445-.121-.208-.013-.321.092-.425.093-.093.208-.244.312-.366.104-.121.139-.208.208-.347.07-.139.035-.261-.018-.365-.052-.104-.469-1.13-.642-1.547-.168-.403-.339-.348-.469-.355h-.401c-.139 0-.365.052-.556.261-.191.208-.73.712-.73 1.737 0 1.025.747 2.016.851 2.155.104.139 1.47 2.245 3.563 3.149.498.215.886.343 1.189.44.5.158.955.135 1.313.082.404-.06 1.233-.504 1.406-.991.174-.486.174-.903.121-.991-.052-.088-.191-.14-.4-.245z"></path></svg>
                  </a>
                  <a href={`mailto:?subject=${emailSubject}&body=${emailBody}`} className="flex items-center justify-center w-12 h-12 bg-blue-50 hover:bg-blue-500 text-blue-600 hover:text-white rounded-xl transition-colors group" title="Share via Email">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- MAIN CONTENT AREA ---------------- */}
      <div className="flex flex-1 overflow-hidden max-w-[1600px] mx-auto w-full p-6 lg:p-8 gap-8 flex-col lg:flex-row">
        
        {/* LEFT ANIMATED SIDEBAR (AGENT ACCORDIONS) */}
        <div className="w-full lg:w-[400px] flex flex-col gap-4 overflow-y-auto shrink-0 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">AI Output Explorer</h2>
          
          {outputCards.map((card, index) => {
            const isOpen = activeAgentTab === card.title;
            return (
              <div key={index} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                
                {/* Accordion Header */}
                <button 
                  onClick={() => setActiveAgentTab(isOpen ? null : card.title)}
                  className={`px-5 py-4 w-full flex justify-between items-center transition-colors ${isOpen ? card.colorClass : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                >
                  <span className="font-bold text-sm uppercase tracking-wider">{card.title}</span>
                  <div className="flex items-center gap-3">
                    {/* Google Sheets Export Button - specifically for the Timeline card */}
                    {card.isTimeline && (
                      <div 
                        onClick={handleExportSheet}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm ${exportingSheet || !card.content ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${isOpen ? 'bg-white/50 hover:bg-white text-purple-900' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                        title="Export to Google Sheets"
                      >
                        {exportingSheet ? (
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 14H7v-2h10v2zm0-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                        )}
                        <span className="hidden sm:inline">{exportingSheet ? "Exporting..." : "To Sheets"}</span>
                      </div>
                    )}
                    <svg className={`w-5 h-5 transition-transform duration-300 text-slate-400 ${isOpen ? 'rotate-180 text-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </button>

                {/* Accordion Content Body (CSS Grid Animation) */}
                <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <div className="p-5 bg-slate-50/50 border-t border-slate-100 max-h-[400px] overflow-y-auto">
                      <div className="prose prose-sm max-w-none text-slate-800 break-words whitespace-pre-wrap">
                        <ReactMarkdown>{card.content || "*No content generated.*"}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )
          })}
        </div>

        {/* RIGHT ACTION DASHBOARD */}
        <div className="flex-1 flex flex-col xl:flex-row gap-6 lg:gap-8 overflow-y-auto pb-10 scrollbar-thin scrollbar-thumb-slate-200">
          
          {/* EMAIL ACTION CARD */}
          <div className="flex-1 bg-white p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[500px]">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Email Campaign Hub</h2>
              <p className="text-slate-600 text-sm">Review your target audience and fire off the generated email via Resend.</p>
            </div>
            
            <div className="flex-1 flex flex-col">
              
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 flex flex-col gap-4 flex-1">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-700">Recipient Preview</h4>
                  
                  {/* CSV Upload Button */}
                  <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} className="text-xs font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition shadow-sm flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                    Upload CSV
                  </button>
                </div>

                {localMailingData && localMailingData.length > 0 ? (
                  <div className="space-y-2 flex-1 max-h-52 overflow-y-auto pr-2 text-sm text-slate-600 bg-white p-4 rounded-lg border border-slate-200 shadow-inner">
                    {localMailingData.slice(0, 5).map((recipient: MailingEntry, index: number) => {
                      const email = recipient.email || recipient.Email || recipient.EMAIL || 'N/A'
                      const name = recipient.name || recipient.Name || recipient.NAME || 'N/A'
                      return (
                        <div key={index} className="flex gap-4 items-center border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                          <span className="font-medium text-slate-800 w-1/3 truncate">{name}</span>
                          <span className="truncate flex-1">{email}</span>
                          {index === 0 && <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">TARGET</span>}
                        </div>
                      )
                    })}
                    {localMailingData.length > 5 && (
                      <div className="text-slate-400 italic text-xs pt-2 text-center border-t border-slate-100 mt-2">...and {localMailingData.length - 5} more recipients ready.</div>
                    )}
                  </div>
                ) : (
                  <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-sm border border-amber-200 mt-2">
                    ⚠️ No CSV data uploaded. Upload a CSV file above to target recipients.
                  </div>
                )}
              </div>

              {/* Big Send Button */}
              <div className="mt-6">
                <button 
                  onClick={handleSendEmail} 
                  disabled={sendingEmail || !outputs.mailingOutput || localMailingData.length === 0}
                  className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white rounded-xl text-md font-bold shadow-sm transition flex items-center justify-center gap-2"
                >
                  {sendingEmail ? "Sending via Resend..." : `Send Email to ${localMailingData?.length || 0} Recipients`}
                </button>
              </div>
            </div>
          </div>

          {/* IMAGE GENERATION CARD */}
          <div className="flex-1 bg-white p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[500px]">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Event Poster Studio</h2>
              <p className="text-slate-600 text-sm">Generate and refine visual assets for your event.</p>
            </div>
            
            {/* Image Prompt Input & Regenerate Button */}
            <div className="mb-5 space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Image Prompt (Editable)</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={imagePrompt} 
                  onChange={(e) => setImagePrompt(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && generateImage(imagePrompt)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition"
                  placeholder="Describe your event poster..."
                />
                <button 
                  onClick={() => generateImage(imagePrompt)}
                  disabled={loadingImage || !imagePrompt.trim()}
                  className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition flex items-center gap-2 shrink-0"
                >
                  {loadingImage ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : "Regenerate ✨"}
                </button>
              </div>
            </div>
            
            {/* Visual Display Box */}
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-slate-100 overflow-hidden relative">
              {loadingImage ? (
                <div className="flex flex-col items-center text-slate-400 animate-pulse gap-4 p-8">
                   <svg className="w-10 h-10 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                   <span className="font-medium text-sm">Generating new poster via Hugging Face...</span>
                </div>
              ) : generatedImageUrl ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-6">
                  <div className="relative group rounded-lg overflow-hidden shadow-sm border border-slate-200">
                    <img src={generatedImageUrl} alt="Generated Event Poster" className="max-w-full max-h-[250px] object-contain" />
                  </div>
                  
                  {/* Download Action */}
                  <div className="mt-6 w-full max-w-[250px]">
                    <button 
                      onClick={handleDownloadImage}
                      className="w-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                      Download Poster
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-slate-400 gap-3 p-8 text-center">
                  <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  <p className="text-sm font-medium">No poster generated yet.<br/>Click regenerate above.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default function FinalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-bold">Loading Final Review Page...</div>}>
      <FinalContent />
    </Suspense>
  )
}