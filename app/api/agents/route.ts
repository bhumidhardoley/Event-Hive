import { graph } from "@/lib/graph"

type RequestBody = {
  prompt?: string
  csv?: string
  feedbackLog?: string
}

export async function POST(req: Request) {
  let body: RequestBody = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      const safeClose = () => {
        if (closed) return
        closed = true
        try { controller.close() } catch {}
      }

      try {
        const events = await graph.streamEvents(
          {
            supervisorRequest: body.prompt ?? "",
            mailingCSV: body.csv ?? "",
            humanFeedback: body.feedbackLog ?? "" 
          },
          { version: "v2" }
        )

        for await (const event of events) {
          if (closed) break

          if (event.event === "on_chat_model_stream") {
            const chunk = event.data?.chunk?.content

            if (chunk && ["marketingNode", "mailingNode", "schedulerNode"].includes(event.name)) {
              const payload = JSON.stringify({ node: event.name, text: chunk })
              try {
                controller.enqueue(encoder.encode(`data: ${payload}\n\n`))
              } catch {
                safeClose()
                break
              }
            }
          }
        }

        if (!closed) {
          try { controller.enqueue(encoder.encode(`data: [DONE]\n\n`)) } catch {}
          safeClose()
        }
      } catch (error) {
        safeClose()
      }
    }
  })

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" }
  })
}