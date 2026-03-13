import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";

/*
Ollama Model
*/
const model = new ChatOllama({
  model: "qwen2.5",
});

export const State = Annotation.Root({
  marketingInput: Annotation<string>(),
  mailingInput: Annotation<string>(),
  schedulerInput: Annotation<string>(),

  marketingOutput: Annotation<string>(),
  mailingOutput: Annotation<string>(),
  schedulerOutput: Annotation<string>(),

  supervisorRequest: Annotation<string>(),
  supervisorMode: Annotation<string>(), 
  supervisorOutput: Annotation<string>(),
});

const supervisorAgent = async (state: typeof State.State) => {
  const response = await model.invoke([
    {
      role: "system",
      content: `
You are the Supervisor AI of an Event Management system.

You oversee:
• Marketing Strategy
• Email Communication
• Event Scheduling

The user may request to EDIT or REFINE these plans.

IMPORTANT: You MUST return your response as a valid JSON object. Do not wrap it in markdown block quotes. 
Format exactly like this:
{
  "marketing": "Updated markdown for marketing...",
  "email": "Updated markdown for email...",
  "schedule": "Updated markdown for schedule..."
}
`
    },
    {
      role: "user",
      content: `
Mode: ${state.supervisorMode}
User Request: ${state.supervisorRequest}

Current Marketing:
${state.marketingOutput}

Current Mailing:
${state.mailingOutput}

Current Schedule:
${state.schedulerOutput}
`
    }
  ], {
    format: "json" 
  });

  try {
    const contentString = typeof response.content === "string"  ? response.content   : ""; 
    const parsed = JSON.parse(contentString);

    return {
      marketingOutput: parsed.marketing || state.marketingOutput,
      mailingOutput: parsed.email || state.mailingOutput,
      schedulerOutput: parsed.schedule || state.schedulerOutput,
      supervisorOutput: "Success"
    };
  } catch (error) {
    console.error("Failed to parse Supervisor JSON:", response.content);
    return { supervisorOutput: "Error processing refined data." };
  }
}

const marketingAgent = async (state: typeof State.State) => {

  const response = await model.invoke([
    {
  role: "system",
  content: `
Acts as the Content Strategist & Social Media Agent.

The organizer provides a raw event prompt.

Responsibilities:
• Generate promotional copy
• Suggest a series of social media posts
• Recommend optimal posting times
• Build hype for the event

IMPORTANT:
Return the response in clean Markdown format.

Structure the output like this:

# Marketing Campaign Plan

## Promotional Copy
(write the promotional text)

## Social Media Post Series
- Post 1
- Post 2
- Post 3

## Recommended Posting Times
| Platform | Time |
|----------|------|
| Instagram | |
| LinkedIn | |

Use proper headings, bullet points, and spacing.
`
},
    {
      role: "user",
      content: state.marketingInput,
    },
  ], { runName: "marketingNode" });

  return {
    marketingOutput: response.content,
  };
};

/*
Agent 2 — Communications & Targeted Mailing Agent
*/
const mailingAgent = async (state: typeof State.State) => {

  const response = await model.invoke([
    {
      role: "system",
      content: `
Acts as the Communications & Targeted Mailing Agent for an Event Management System.

You assist the event organizer in communicating with participants.

You will receive:
• Event marketing plan
• Event organizer input
• A CSV dataset containing participant information

Your responsibilities:

1. Analyze the participant CSV list
2. Identify potential email recipients
3. Personalize an email invitation for the event
4. Show a sample list of people who will receive the email
5. Design a mailing strategy

IMPORTANT:
Return the response in clean Markdown format.

Structure your response exactly like this:

# Email Communication Plan

## Event Invitation Email
(write a professional invitation email based on the event details)

## Sample Recipients From CSV
| Name | Email | Segment |
|------|------|------|

(show a few example rows from the dataset)

## Audience Segments
- Students
- Developers
- Designers
- Startups

## Distribution Strategy
- When emails should be sent
- Which segments receive them
- Reminder email timing
`
    },
    {
      role: "user",
      content: `
Event Organizer Input:
${state.marketingInput}

Marketing Strategy Context:
${state.marketingOutput}

Participant CSV Data:
${state.mailingInput}

Use the participant list to demonstrate who would receive the event email.
`
    },
  ], { runName: "mailingNode" });

  return {
    mailingOutput: response.content,
  };
};
/*
Agent 3 — Dynamic Scheduler & Conflict Resolver Agent
*/
const schedulerAgent = async (state: typeof State.State) => {

  const response = await model.invoke([
    {
  role: "system",
  content: `
Acts as the Dynamic Scheduler & Conflict Resolver Agent.

Responsibilities:
• Build the event schedule
• Detect conflicts
• Recalculate timelines when constraints change

IMPORTANT:
Return the response in clean Markdown format.

Structure:

# Event Schedule

## Timeline
| Time | Activity |
|------|----------|

## Conflict Resolution
Explain how conflicts were handled.

## Final Optimized Schedule
Provide the final schedule clearly.
`
},
    {
      role: "user",
      content: `
Marketing Plan:
${state.marketingOutput}

Communication Plan:
${state.mailingOutput}

Scheduler Input:
${state.schedulerInput}
      `,
    },
  ], { runName: "schedulerNode" });

  return {
    schedulerOutput: response.content,
  };
};

/*
Build Graph
*/
/*
Build Graph
*/
export const graph = new StateGraph(State)

  .addNode("marketing", marketingAgent)
  .addNode("mailing", mailingAgent)
  .addNode("scheduler", schedulerAgent)

  .addEdge(START, "marketing")
  .addEdge("marketing", "mailing")
  .addEdge("mailing", "scheduler")
  .addEdge("scheduler", END)

  .compile();