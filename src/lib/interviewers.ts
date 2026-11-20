export interface InterviewerProfile {
  id: string;
  name: string;
  gender: string;
  voice: string;
  pitch: number;
  objectPronoun: string;
  reflexivePronoun: string;
}

export const INTERVIEWERS: InterviewerProfile[] = [
  { id: "maya", name: "Maya", gender: "Female", voice: "Kore", pitch: 1.05, objectPronoun: "her", reflexivePronoun: "herself" },
  { id: "rohan", name: "Rohan", gender: "Male", voice: "Orus", pitch: 0.8, objectPronoun: "him", reflexivePronoun: "himself" },
];

export const DEFAULT_INTERVIEWER: InterviewerProfile = INTERVIEWERS[0];

export function getInterviewer(id: unknown): InterviewerProfile {
  if (typeof id === "string") {
    const found = INTERVIEWERS.find((i) => i.id === id);
    if (found) return found;
  }
  return DEFAULT_INTERVIEWER;
}
