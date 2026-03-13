"use client"

import ReactMarkdown from "react-markdown"
import { useAgentContext } from "@/context/AgentContext"

export default function Final(){

  const { inputs } = useAgentContext()

  return(

    <div style={{maxWidth:"1000px",margin:"auto",padding:"40px"}}>

      <h1>Final Event Plan</h1>

      <ReactMarkdown>
        {inputs.marketingInput}
      </ReactMarkdown>

    </div>

  )
}