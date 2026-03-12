"use client"

import { useState } from "react"

export default function Dashboard() {

  const [marketingInput,setMarketingInput] = useState("")
  const [mailingInput,setMailingInput] = useState("")
  const [schedulerInput,setSchedulerInput] = useState("")

  const [result,setResult] = useState<any>(null)
  const [loading,setLoading] = useState(false)

  const runAgents = async () => {

    setLoading(true)

    const res = await fetch("/api/agents",{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        marketingInput,
        mailingInput,
        schedulerInput
      })
    })

    const data = await res.json()

    setResult(data)
    setLoading(false)
  }

  return (
    <div style={{padding:"40px",maxWidth:"900px",margin:"auto"}}>

      <h1>Event Hive AI Agents</h1>

      {/* Marketing Agent */}
      <h3>Marketing Prompt</h3>
      <textarea
        rows={4}
        style={{width:"100%"}}
        placeholder="Describe the event for promotion..."
        value={marketingInput}
        onChange={(e)=>setMarketingInput(e.target.value)}
      />

      {/* Mailing Agent */}
      <h3>Mailing Prompt</h3>
      <textarea
        rows={4}
        style={{width:"100%"}}
        placeholder="Paste email draft or mailing instructions..."
        value={mailingInput}
        onChange={(e)=>setMailingInput(e.target.value)}
      />

      {/* Scheduler Agent */}
      <h3>Scheduler Constraints</h3>
      <textarea
        rows={4}
        style={{width:"100%"}}
        placeholder="Provide event scheduling constraints..."
        value={schedulerInput}
        onChange={(e)=>setSchedulerInput(e.target.value)}
      />

      <br/><br/>

      <button
        onClick={runAgents}
        style={{
          padding:"10px 20px",
          background:"#111",
          color:"white",
          borderRadius:"8px"
        }}
      >
        Run Event AI
      </button>

      {loading && <p>Running AI Agents...</p>}

      {result && (
        <div style={{marginTop:"40px"}}>

          <h2>Marketing Strategy</h2>
          <p>{result.marketingOutput}</p>

          <h2>Email Campaign</h2>
          <p>{result.mailingOutput}</p>

          <h2>Event Schedule</h2>
          <p>{result.schedulerOutput}</p>

        </div>
      )}

    </div>
  )
}