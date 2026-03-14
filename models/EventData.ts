import mongoose, { Schema, Document } from "mongoose";

// Define the TypeScript interface for the data
// models/EventData.ts
export interface IEventData extends Document {
  sessionId: string;
  eventName: string;
  marketingOutput: string;
  mailingOutput: string;
  schedulerOutput: string;
  whatsappOutput: string; 
  formOutput: string; // <-- 1. ADD THIS HERE
  chatHistory: any[]; 
  createdAt: Date;
  updatedAt: Date;
}

const EventDataSchema = new Schema<IEventData>(
  {
    sessionId: { type: String, required: true, unique: true },
    eventName: { type: String, default: "Untitled Event" },
    marketingOutput: { type: String, default: "" },
    mailingOutput: { type: String, default: "" },
    schedulerOutput: { type: String, default: "" },
    whatsappOutput: { type: String, default: "" }, 
    formOutput: { type: String, default: "" }, // <-- 2. ADD THIS HERE
    chatHistory: { type: Schema.Types.Mixed, default: [] },
  },
  { timestamps: true }
);