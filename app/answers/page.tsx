"use client"

import { useEffect,useState } from "react"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"

export default function Answers(){

  const router = useRouter()

  const [data,setData] = useState<any>(null)
  const [request,setRequest] = useState("")

  useEffect(()=>{

    const stored = localStorage.getItem("agentResults")

    if(stored){
      setData(JSON.parse(stored))
    }

  },[])

  const callSupervisor = async (mode:string) => {

    const res = await fetch("/api/agents",{
      method:"POST",
      headers:{ "Content-Type":"application/json"},
      body:JSON.stringify({

        marketingInput:data.marketingOutput,
        mailingInput:data.mailingOutput,
        schedulerInput:data.schedulerOutput,

        supervisorRequest:request,
        mode

      })
    })

    const result = await res.json()

    localStorage.setItem("finalResults", JSON.stringify(result))

    router.push("/final")
  }

  if(!data) return <p>Loading...</p>

  return (

    <div style={{maxWidth:"1000px",margin:"auto",padding:"40px"}}>

      <h1>Agent Results</h1>

      <section>
        <h2>Marketing Strategy</h2>
        <ReactMarkdown>{data.marketingOutput}</ReactMarkdown>
      </section>

      <section>
        <h2>Email Campaign</h2>
        <ReactMarkdown>{data.mailingOutput}</ReactMarkdown>
      </section>

      <section>
        <h2>Event Schedule</h2>
        <ReactMarkdown>{data.schedulerOutput}</ReactMarkdown>
      </section>

      <hr/>

      <h3>Edit or Refine</h3>

      <textarea
        rows={4}
        style={{width:"100%"}}
        placeholder="Describe the changes you want..."
        value={request}
        onChange={(e)=>setRequest(e.target.value)}
      />

      <br/><br/>

      <button onClick={()=>callSupervisor("edit")}>
        Edit
      </button>

      <button onClick={()=>callSupervisor("refine")}>
        Refine
      </button>

    </div>
  )
}