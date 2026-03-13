import { graph } from "@/lib/graph";

export async function POST(req: Request) {

  let body: {
    marketingInput?: string
    mailingInput?: string
    schedulerInput?: string
    supervisorRequest?: string
    mode?: string
  } = {}

  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({

    async start(controller) {

      let closed = false

      try {

        const events = await graph.streamEvents(
          {
            marketingInput: body.marketingInput,
            mailingInput: body.mailingInput,
            schedulerInput: body.schedulerInput,
            supervisorRequest: body.supervisorRequest || "",
            supervisorMode: body.mode || ""
          },
          { version: "v2" }
        )

        for await (const event of events) {

          if (closed) break

          if (event.event === "on_chat_model_stream") {

            const chunk = event.data?.chunk?.content

            if (
              chunk &&
              ["marketingNode", "mailingNode", "schedulerNode"].includes(event.name)
            ) {

              const payload = JSON.stringify({
                node: event.name,
                text: chunk
              })

              try {
                controller.enqueue(
                  encoder.encode(`data: ${payload}\n\n`)
                )
              } catch {
                closed = true
                break
              }

            }

          }

        }

        if (!closed) {

          controller.enqueue(
            encoder.encode(`data: [DONE]\n\n`)
          )

          controller.close()
          closed = true

        }

      } catch (error: unknown) {

        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Stream error:", error)
        }

        if (!closed) controller.close()

      }

    }

  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  })
}