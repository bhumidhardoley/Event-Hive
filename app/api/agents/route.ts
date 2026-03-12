import { graph } from "@/lib/graph"

export async function POST(req: Request) {

  const body = await req.json()

  const result = await graph.invoke({
    marketingInput: body.marketingInput,
    mailingInput: body.mailingInput,
    schedulerInput: body.schedulerInput
  })

  return Response.json(result)
}