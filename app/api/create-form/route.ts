import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { eventName, fieldsJson } = body;

    // 1. Authenticate with Google Service Account
    // You need to put these in your .env.local file
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        // Replace literal \n with actual newlines for the private key
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: [
        "https://www.googleapis.com/auth/forms.body",
        "https://www.googleapis.com/auth/drive", // Needed to give public access
      ],
    });

    const forms = google.forms({ version: "v1", auth });
    const drive = google.drive({ version: "v3", auth });

    // 2. Create a Blank Form
    const createRes = await forms.forms.create({
      requestBody: {
        info: { title: `${eventName} Registration`, documentTitle: eventName },
      },
    });
    const formId = createRes.data.formId!;

    // 3. Make the Form Public (Anyone with link can respond)
    await drive.permissions.create({
      fileId: formId,
      requestBody: { type: "anyone", role: "reader" },
    });

    // 4. Parse the AI's JSON output
    let customFields = [];
    try {
      customFields = JSON.parse(fieldsJson);
    } catch (e) {
      console.log("Failed to parse AI JSON, using defaults.");
    }

    // 5. Build the Form Questions
    // We always add Name and Email manually first
    const requests = [
      { createItem: { item: { title: "Full Name", questionItem: { question: { textQuestion: {} } } }, location: { index: 0 } } },
      { createItem: { item: { title: "Email Address", questionItem: { question: { textQuestion: {} } } }, location: { index: 1 } } }
    ];

    // Add the AI generated custom fields
    customFields.forEach((field: any, index: number) => {
      requests.push({
        createItem: {
          item: { title: field.title, questionItem: { question: { textQuestion: {} } } },
          location: { index: index + 2 }
        }
      });
    });

    // 6. Send the batch update to Google
    await forms.forms.batchUpdate({
      formId: formId,
      requestBody: { requests },
    });

    const formUrl = `https://docs.google.com/forms/d/${formId}/viewform`;
    
    return NextResponse.json({ success: true, formUrl });

  } catch (error: any) {
    console.error("Google Forms API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}