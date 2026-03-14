// models/EventData.ts
import mongoose from 'mongoose'

const EventDataSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  marketingOutput: { type: String, default: "" },
  mailingOutput: { type: String, default: "" },
  schedulerOutput: { type: String, default: "" },
  chatHistory: { type: Array, default: [] }
}, { timestamps: true })

// This prevents Mongoose from recompiling the model upon hot-reloads
export default mongoose.models.EventData || mongoose.model('EventData', EventDataSchema)