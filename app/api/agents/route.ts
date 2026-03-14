import { graph } from "@/lib/graph"
// import { connectToDatabase } from "@/lib/db"
// import ChatSession from "@/models/ChatSession"

export async function POST(req: Request) {
  const body = await req.json()
  const { chatHistory, csvData, sessionId } = body

  // Format history for the LLM
  const formattedHistory = chatHistory
    .map((msg: any) => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join("\n")

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      const safeClose = () => { if (!closed) { closed = true; try { controller.close() } catch {} } }

      try {
        // PASS THE req.signal HERE SO LANGGRAPH KNOWS WHEN TO STOP!
        const events = await graph.streamEvents(
          { chatHistory: formattedHistory, csvData: csvData ?? "" },
          { version: "v2", signal: req.signal } 
        )

        for await (const event of events) {
          if (closed) break

          if (event.event === "on_chat_model_stream") {
            const chunk = event.data?.chunk?.content
            if (chunk && ["supervisorNode", "marketingNode", "mailingNode", "schedulerNode"].includes(event.name)) {
              const payload = JSON.stringify({ node: event.name, text: chunk })
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`))
            }
          }
        }
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
        safeClose()
      } catch (error: any) {
        // If the user aborts, gracefully close the stream
        if (error.name === "AbortError" || error.message.includes("abort")) {
          console.log("Stream stopped by user.")
        }
        safeClose() 
      }
    }
  })

  return new Response(stream, { headers: { "Content-Type": "text/event-stream" } })
}