import mongoose, { Schema, Document } from "mongoose"

export interface IChatSession extends Document {
  sessionId: string
  messages: Array<{ role: string; content: string; name?: string }>
  createdAt: Date
}

const ChatSessionSchema = new Schema<IChatSession>({
  sessionId: { type: String, required: true, unique: true },
  messages: [{ 
    role: { type: String, required: true }, 
    content: { type: String, required: true },
    name: { type: String }
  }],
  createdAt: { type: Date, default: Date.now }
})

export default mongoose.models.ChatSession || mongoose.model<IChatSession>("ChatSession", ChatSessionSchema)