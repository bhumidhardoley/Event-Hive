import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json()

    if (!process.env.HF_API_KEY) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 500 })
    }

    const finalPromptForApi = `A cinematic promotional poster in ENGLISHt. Modern aesthetic, bold typography. Event details: ${prompt}`

    let response;
    let retries = 3; 
    const delay = 5000; 

    while (retries > 0) {
      response = await fetch(
        "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
        {
          headers: {
            Authorization: `Bearer ${process.env.HF_API_KEY}`,
            "Content-Type": "application/json",
            "x-use-cache": "false" 
          },
          method: "POST",
          body: JSON.stringify({ 
            inputs: finalPromptForApi,
            parameters: { width: 512, height: 512 } 
          }),
        }
      );

      if (response.status === 503) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        retries--;
      } else {
        break;
      }
    }

    if (!response || !response.ok) {
      return NextResponse.json({ error: "HF API Failed" }, { status: response?.status || 500 })
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Image = `data:image/jpeg;base64,${buffer.toString("base64")}`

    return NextResponse.json({ posterImage: base64Image })

  } catch (error) {
    console.error("Image Gen Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}