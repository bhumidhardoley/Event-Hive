import mongoose, { Schema, Document } from "mongoose";

// Define the TypeScript interface for the data
export interface IEventData extends Document {
  sessionId: string;
  eventName: string;
  marketingOutput: string;
  mailingOutput: string;
  schedulerOutput: string;
  whatsappOutput: string; 
  chatHistory: any[]; 
  createdAt: Date;
  updatedAt: Date;
}

// Define the Mongoose Schema
const EventDataSchema = new Schema<IEventData>(
  {
    sessionId: { type: String, required: true, unique: true },
    eventName: { type: String, default: "Untitled Event" },
    marketingOutput: { type: String, default: "" },
    mailingOutput: { type: String, default: "" },
    schedulerOutput: { type: String, default: "" },
    whatsappOutput: { type: String, default: "" }, 
    chatHistory: { type: Schema.Types.Mixed, default: [] },
  },
  { timestamps: true }
);

// This checks if the model already exists (important for Next.js hot-reloading)
const EventData = mongoose.models.EventData || mongoose.model<IEventData>("EventData", EventDataSchema);

export default EventData;