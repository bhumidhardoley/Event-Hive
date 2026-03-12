import { graph } from "@/lib/graph";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const result = await graph.invoke({
      messages: [
        {
          role: "user",
          content: body.message,
        },
      ],
    });

    return Response.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        error: "Something went wrong",
      },
      { status: 500 }
    );
  }
}