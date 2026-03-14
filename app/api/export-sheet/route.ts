// app/api/export-sheet/route.ts
import { NextResponse } from "next/server";
import { ChatOllama } from "@langchain/ollama";
import { google } from "googleapis";

const model = new ChatOllama({ model: "qwen2.5", temperature: 0 });

export async function POST(req: Request) {
  try {
    const { schedulerOutput } = await req.json();

    if (!schedulerOutput) {
      return NextResponse.json({ success: false, error: "No timeline data provided." }, { status: 400 });
    }

    // --- FAIL FAST: Check if Environment Variables are actually loaded ---
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_SHEET_ID) {
      console.error("🚨 MISSING ENV VARS - Did you restart your Next.js server?");
      return NextResponse.json({ success: false, error: "Server missing Google API credentials." }, { status: 500 });
    }

    // 1. Force the LLM to format the markdown into strict JSON
    const prompt = `You are a strict data extraction tool. Convert the following event timeline into a JSON array of objects. 
    Each object MUST have these exact keys: "time", "activity", "duration", "notes".
    If a field is missing, leave it as an empty string "".
    Respond with ONLY the valid JSON array. No markdown formatting, no backticks, no conversation.
    
    Timeline:
    ${schedulerOutput}`;

    const res = await model.invoke([{ role: "user", content: prompt }]);
    
    // Clean the output in case the LLM adds markdown code blocks
    let rawJson = String(res.content).replace(/```json/g, "").replace(/```/g, "").trim();
    const parsedData = JSON.parse(rawJson);

    // 2. Convert the JSON objects into a 2D Array for Google Sheets
    const headers = ["Time", "Activity", "Duration", "Notes"];
    const rows = parsedData.map((item: any) => [
      item.time || "",
      item.activity || "",
      item.duration || "",
      item.notes || ""
    ]);
    
    const sheetData = [headers, ...rows];

    // 3. Bulletproof Google Auth Authentication
    // This strips any accidental start/end quotes and fixes the \n linebreaks
    const formattedPrivateKey = process.env.GOOGLE_PRIVATE_KEY
      .replace(/\\n/g, "\n")
      .replace(/^"|"$/g, ""); 

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: formattedPrivateKey,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // 4. Append the data to the spreadsheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Sheet1!A1", // Note: If your tab in Google Sheets is named differently, change "Sheet1" here!
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: sheetData
      }
    });

    return NextResponse.json({ success: true, rowsAdded: rows.length });

  } catch (error: any) {
    console.error("Google Sheet Export Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to export to sheets" }, { status: 500 });
  }
}