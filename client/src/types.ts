export type Priority = "HOT" | "WARM" | "COLD";

export interface Analysis {
  priority: Priority;
  priorityReason: string;
  summary: string;
  intent: string;
  keyRequirements: string[];
  concerns: string[];
  recommendedNextAction: string;
  suggestedResponse: string;
  generatedAt: string;
}

export interface CallBrief {
  emphasize: string[];
  avoid: string[];
  questionsToAsk: string[];
  callGoal: string;
  generatedAt: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  at: string;
}

export interface LeadInput {
  name: string;
  location: string;
  requirement: string;
  budget: string;
  timeline: string;
  message: string;
}

export interface Lead extends LeadInput {
  id: string;
  createdAt: string;
  analysis: Analysis | null;
  analysisError: string | null;
  callBrief: CallBrief | null;
  chat: ChatMessage[];
}
