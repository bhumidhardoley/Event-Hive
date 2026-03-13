import { graph } from "@/lib/graph";

export async function POST(req: Request) {
  const body = await req.json();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const events = await graph.streamEvents({
          marketingInput: body.marketingInput,
          mailingInput: body.mailingInput,
          schedulerInput: body.schedulerInput,
          supervisorRequest: body.supervisorRequest || "",
          supervisorMode: body.mode || ""
        }, { version: "v2" });

      for await (const event of events) {
          if (event.event === "on_chat_model_stream") {
            const chunk = event.data.chunk?.content;
            
            // 🚨 ADD THIS CONSOLE LOG 🚨
            console.log(`[DEBUG] Agent: ${event.name} | Word: ${chunk}`);

            if (chunk && ["marketingNode", "mailingNode", "schedulerNode"].includes(event.name)) {
              const payload = JSON.stringify({ node: event.name, text: chunk });
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error: any) {
        if (error.name !== "AbortError") console.error("Stream error:", error);
        controller.enqueue(encoder.encode(`data: {"error": "Stopped"}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
  });
}