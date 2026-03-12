"use client"

import { useEffect,useState } from "react"
import ReactMarkdown from "react-markdown"

export default function Final(){

  const [data,setData] = useState<any>(null)

  useEffect(()=>{

    const stored = localStorage.getItem("finalResults")

    if(stored){
      setData(JSON.parse(stored))
    }

  },[])

  if(!data) return <p>Loading...</p>

  return(

    <div style={{maxWidth:"1000px",margin:"auto",padding:"40px"}}>

      <h1>Final Event Plan</h1>

      <ReactMarkdown>
        {data.supervisorOutput}
      </ReactMarkdown>

    </div>
  )
}