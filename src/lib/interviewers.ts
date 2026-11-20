export interface InterviewerProfile {
  id: string;
  name: string;
  gender: string;
  voice: string;
  objectPronoun: string;
  reflexivePronoun: string;
}

export const INTERVIEWERS: InterviewerProfile[] = [
  { id: "kore", name: "Kore", gender: "Female", voice: "Kore", objectPronoun: "her", reflexivePronoun: "herself" },
  { id: "iapetus", name: "Iapetus", gender: "Male", voice: "Orus", objectPronoun: "him", reflexivePronoun: "himself" },
];

export const DEFAULT_INTERVIEWER: InterviewerProfile = INTERVIEWERS[0];

export function getInterviewer(id: unknown): InterviewerProfile {
  if (typeof id === "string") {
    const found = INTERVIEWERS.find((i) => i.id === id);
    if (found) return found;
  }
  return DEFAULT_INTERVIEWER;
}
