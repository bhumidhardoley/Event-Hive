import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json()
    console.log("LOG: Received prompt for image generation:", prompt);

    if (!process.env.HF_API_KEY) {
      console.error("LOG: Error - HF_API_KEY is missing in environment variables.");
      return NextResponse.json({ error: "Missing API Key" }, { status: 500 })
    }

    const finalPromptForApi = `A cinematic promotional poster in ENGLISH. Modern aesthetic, bold typography. Event details: ${prompt}`
    console.log("LOG: Final Prompt being sent to HF:", finalPromptForApi);

    let response: Response | undefined;
    let retries = 3; 
    const delay = 5000; 

    while (retries > 0) {
      console.log(`LOG: Attempting fetch to Hugging Face. Retries left: ${retries}`);
      
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

      console.log(`LOG: HF API Response Status: ${response.status} (${response.statusText})`);

      if (response.status === 503) {
        console.warn("LOG: HF API is loading model (503). Waiting to retry...");
        await new Promise((resolve) => setTimeout(resolve, delay));
        retries--;
      } else {
        break;
      }
    }

    if (!response || !response.ok) {
      const errorText = await response?.text();
      console.error("LOG: HF API Failed completely. Body:", errorText);
      return NextResponse.json({ error: "HF API Failed", details: errorText }, { status: response?.status || 500 })
    }

    // Log the Content-Type to ensure it's actually an image
    const contentType = response.headers.get("content-type");
    console.log("LOG: HF API Response Content-Type:", contentType);

    const arrayBuffer = await response.arrayBuffer()
    console.log(`LOG: Received ArrayBuffer. Length: ${arrayBuffer.byteLength} bytes`);

    const buffer = Buffer.from(arrayBuffer)
    const base64Image = `data:image/jpeg;base64,${buffer.toString("base64")}`
    
    console.log("LOG: Base64 conversion complete. Sending response to client.");

    return NextResponse.json({ posterImage: base64Image })

  } catch (error: any) {
    console.error("LOG: Internal Exception caught:", error.message);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 })
  }
}