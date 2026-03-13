"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import { useAgentContext } from "@/context/AgentContext"

type StreamMessage = {
  node: "marketingNode" | "mailingNode" | "schedulerNode"
  text: string
}

export default function Answers() {

  const router = useRouter()
  const { inputs } = useAgentContext()

  const [marketingOutput,setMarketingOutput] = useState("")
  const [mailingOutput,setMailingOutput] = useState("")
  const [schedulerOutput,setSchedulerOutput] = useState("")
  const [isGenerating,setIsGenerating] = useState(true)

  useEffect(() => {

    if(!inputs.marketingInput){
      router.push("/dashboard")
      return
    }

    startStream()

  }, [])

  const startStream = async () => {

    setIsGenerating(true)

    try{

      const res = await fetch("/api/agents",{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          marketingInput: inputs.marketingInput,
          mailingInput: JSON.stringify(inputs.mailingData),
          schedulerInput: inputs.schedulerInput
        })
      })

      if(!res.body) throw new Error("No stream")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      let buffer = ""

      while(true){

        const {value,done} = await reader.read()
        if(done) break

        buffer += decoder.decode(value,{stream:true})

        const parts = buffer.split("\n\n")
        buffer = parts.pop() || ""

        for(const part of parts){

          const line = part.trim()
          if(!line.startsWith("data: ")) continue

          const json = line.replace("data: ","")

          if(json === "[DONE]"){
            setIsGenerating(false)
            return
          }

          const parsed:StreamMessage = JSON.parse(json)

          if(parsed.node==="marketingNode"){
            setMarketingOutput(p=>p+parsed.text)
          }

          if(parsed.node==="mailingNode"){
            setMailingOutput(p=>p+parsed.text)
          }

          if(parsed.node==="schedulerNode"){
            setSchedulerOutput(p=>p+parsed.text)
          }

        }

      }

    }catch(err){
      console.error("Stream error:",err)
    }

    setIsGenerating(false)
  }

  return (

    <div className="min-h-screen bg-gray-50 py-12 px-4">

      <div className="max-w-5xl mx-auto space-y-8">

        <h1 className="text-3xl font-bold">
          Agent Results
        </h1>

        <AgentBox title="Marketing Strategy" content={marketingOutput}/>
        <AgentBox title="Email Campaign" content={mailingOutput}/>
        <AgentBox title="Event Schedule" content={schedulerOutput}/>

      </div>

    </div>
  )
}

function AgentBox({title,content}:{title:string,content:string}){

  return(

    <div className="bg-white p-6 rounded-xl border shadow-sm">

      <h2 className="text-xs uppercase text-indigo-500 mb-4 font-bold">
        {title}
      </h2>

      {content ? (

        <ReactMarkdown>{content}</ReactMarkdown>

      ):(
        <p className="text-gray-400">Agent thinking...</p>
      )}

    </div>
  )
}