"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"

type AgentInputs = {
  marketingInput: string
  mailingData: any[]
  schedulerInput: string
}

type StreamMessage = {
  node: "marketingNode" | "mailingNode" | "schedulerNode"
  text: string
}

export default function Answers() {

  const router = useRouter()

  const [marketingOutput,setMarketingOutput] = useState("")
  const [mailingOutput,setMailingOutput] = useState("")
  const [schedulerOutput,setSchedulerOutput] = useState("")

  const [isGenerating,setIsGenerating] = useState(true)

  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(()=>{

    const raw = localStorage.getItem("agentInputs")

    if(!raw){
      router.push("/dashboard")
      return
    }

    const inputs:AgentInputs = JSON.parse(raw)

    startStream(inputs)

    return ()=>stopStream()

  },[router])

  const startStream = async (inputs:AgentInputs)=>{

    setIsGenerating(true)

    abortControllerRef.current = new AbortController()

    try{

      const res = await fetch("/api/agents",{

        method:"POST",

        headers:{ "Content-Type":"application/json" },

        signal:abortControllerRef.current.signal,

        body:JSON.stringify({

          marketingInput:inputs.marketingInput,

          mailingInput:JSON.stringify(inputs.mailingData),

          schedulerInput:inputs.schedulerInput

        })

      })

      if(!res.body) throw new Error("No response body")

      const reader = res.body.getReader()

      const decoder = new TextDecoder()

      let buffer=""

      let done=false

      while(!done){

        const {value,done:readerDone} = await reader.read()

        done = readerDone

        if(value){

          buffer += decoder.decode(value,{stream:true})

          const parts = buffer.split("\n\n")

          buffer = parts.pop() || ""

          for(const part of parts){

            const line = part.trim()

            if(!line.startsWith("data: ")) continue

            const dataStr = line.substring(6)

            if(dataStr==="[DONE]"){

              setIsGenerating(false)

              return

            }

            try{

              const parsed:StreamMessage = JSON.parse(dataStr)

              if(parsed.node==="marketingNode"){

                setMarketingOutput(prev=>prev+parsed.text)

              }

              if(parsed.node==="mailingNode"){

                setMailingOutput(prev=>prev+parsed.text)

              }

              if(parsed.node==="schedulerNode"){

                setSchedulerOutput(prev=>prev+parsed.text)

              }

            }catch{

              console.warn("Bad chunk",dataStr)

            }

          }

        }

      }

    }
    catch(error:any){

      if(error.name!=="AbortError"){

        console.error("Stream failed:",error)

      }

    }
    finally{

      setIsGenerating(false)

    }

  }

  const stopStream=()=>{

    abortControllerRef.current?.abort()

    setIsGenerating(false)

  }

  return(

    <div className="min-h-screen bg-gray-50 py-12 px-4">

      <div className="max-w-5xl mx-auto space-y-8">

        <div className="flex justify-between items-end border-b pb-4">

          <h1 className="text-3xl font-bold text-black">

            Agent Results

          </h1>

          {isGenerating && (

            <button

              onClick={stopStream}

              className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 animate-pulse"

            >

              Stop Generation

            </button>

          )}

        </div>

        <AgentBox title="Marketing Strategy" content={marketingOutput} />

        <AgentBox title="Email Campaign" content={mailingOutput} />

        <AgentBox title="Event Schedule" content={schedulerOutput} />

      </div>

    </div>

  )

}

function AgentBox({title,content}:{title:string,content:string}){

  return(

    <div className="bg-white shadow-sm rounded-xl p-8 border">

      <h2 className="text-xl font-semibold text-blue-600 mb-4 uppercase text-sm">

        {title}

      </h2>

      <div className="prose max-w-none break-words">

        <ReactMarkdown>

          {content || "Waiting for agent..."}

        </ReactMarkdown>

      </div>

    </div>

  )

}