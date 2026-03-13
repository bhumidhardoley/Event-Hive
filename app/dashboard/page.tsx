"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export default function Dashboard(){

  const router = useRouter()

  const [marketingInput,setMarketingInput] = useState("")
  const [mailingInput,setMailingInput] = useState("")
  const [schedulerInput,setSchedulerInput] = useState("")

  const runAgents = async () => {

    const res = await fetch("/api/agents",{
      method:"POST",
      headers:{ "Content-Type":"application/json"},
      body:JSON.stringify({
        marketingInput,
        mailingInput,
        schedulerInput
      })
    })

    const data = await res.json()

    localStorage.setItem("agentResults", JSON.stringify(data))

    router.push("/answers")
  }

  return (

    <div style={{maxWidth:"900px",margin:"auto",padding:"40px"}}>

      <h1>Event Hive AI</h1>

      <h3>Marketing Prompt</h3>
      <textarea
        style={{width:"100%"}}
        rows={4}
        value={marketingInput}
        onChange={(e)=>setMarketingInput(e.target.value)}
      />

      <h3>Email Draft</h3>
      <textarea
        style={{width:"100%"}}
        rows={4}
        value={mailingInput}
        onChange={(e)=>setMailingInput(e.target.value)}
      />

      <h3>Schedule Constraints</h3>
      <textarea
        style={{width:"100%"}}
        rows={4}
        value={schedulerInput}
        onChange={(e)=>setSchedulerInput(e.target.value)}
      />

      <br/><br/>

      <button onClick={runAgents}>
        Run Agents
      </button>

    </div>
  )
}