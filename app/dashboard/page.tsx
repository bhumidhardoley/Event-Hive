"use client"

import { useState } from "react"

export default function Home() {

  const [message, setMessage] = useState("")
  const [response, setResponse] = useState("")

  async function send() {

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    })

    const data = await res.json()

    const last = data.messages[data.messages.length - 1]

    setResponse(last.content ?? last.kwargs?.content)
  }

  return (
    <div style={{ padding: 40 }}>

      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask something"
      />

      <button onClick={send}>
        Send
      </button>

      <h3>Response</h3>
      <p>{response}</p>

    </div>
  )
}