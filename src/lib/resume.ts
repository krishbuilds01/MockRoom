export interface ResumeQuestion {
  question: string;
  target: string;
}

const TECH_KEYWORDS = [
  "javascript",
  "typescript",
  "react",
  "next.js",
  "node.js",
  "express",
  "python",
  "java",
  "c++",
  "sql",
  "mysql",
  "postgres",
  "postgresql",
  "mongodb",
  "redis",
  "graphql",
  "rest api",
  "aws",
  "docker",
  "kubernetes",
  "git",
  "tailwind",
  "html",
  "css",
  "firebase",
  "linux",
  "machine learning",
  "data analysis",
  "testing",
  "jwt",
  "websocket",
];

const SKILL_PROBES: Record<string, string> = {
  react: "how re-rendering works in React, and what makes it slow in a real app",
  "next.js": "when Next.js renders on the server versus the client, and why you would choose each",
  "node.js": "how the Node.js event loop handles a task that blocks for two seconds",
  javascript: "closures, with an example from your own code where one actually mattered",
  typescript: "one bug TypeScript caught for you that plain JavaScript would have shipped",
  python: "what the GIL is and when it would actually limit your program",
  java: "how garbage collection affects a long running Java service, in plain terms",
  sql: "when a database index stops helping and starts hurting",
  mysql: "when a database index stops helping and starts hurting",
  postgres: "when a database index stops helping and starts hurting",
  postgresql: "when a database index stops helping and starts hurting",
  mongodb: "a case where MongoDB is the wrong choice for data you own",
  redis: "what happens when Redis runs out of memory, and how you would design around it",
  aws: "which AWS service did the most work in your project, and what it cost you in complexity",
  docker: "what a container actually isolates, and one problem Docker solved for you",
  graphql: "GraphQL versus REST for your own project: what did the choice cost and buy",
  "rest api": "how you version and secure a REST API once real users depend on it",
  "machine learning": "how you evaluated your model, and what a wrong prediction costs in your use case",
};

const SKILL_DISPLAY: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  react: "React",
  "next.js": "Next.js",
  "node.js": "Node.js",
  express: "Express",
  python: "Python",
  java: "Java",
  "c++": "C++",
  sql: "SQL",
  mysql: "MySQL",
  postgres: "PostgreSQL",
  postgresql: "PostgreSQL",
  mongodb: "MongoDB",
  redis: "Redis",
  graphql: "GraphQL",
  "rest api": "REST API",
  aws: "AWS",
  docker: "Docker",
  kubernetes: "Kubernetes",
  git: "Git",
  tailwind: "Tailwind CSS",
  html: "HTML",
  css: "CSS",
  firebase: "Firebase",
  linux: "Linux",
  "machine learning": "Machine Learning",
  "data analysis": "Data Analysis",
  testing: "Testing",
  jwt: "JWT",
  websocket: "WebSocket",
};

export function skillDisplayName(skill: string): string {
  return SKILL_DISPLAY[skill.toLowerCase()] || skill;
}

const SECTION_HEADERS = /^(education|experience|work experience|skills|technical skills|projects|personal projects|certifications|achievements|summary|objective|contact|internships?)\b/i;

function cleanLine(l: string): string {
  return l.replace(/^[\s•\-*#>]+/, "").trim();
}

export function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const k of TECH_KEYWORDS) {
    const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(lower)) {
      const display = skillDisplayName(k);
      if (!found.includes(display)) found.push(display);
    }
  }
  return found;
}

export function extractProjects(text: string): { name: string; line: string }[] {
  const lines = text.split(/\r?\n/);
  const projects: { name: string; line: string }[] = [];
  let inProjects = false;
  for (const raw of lines) {
    const line = cleanLine(raw);
    if (!line) continue;
    if (SECTION_HEADERS.test(line)) {
      inProjects = /^projects/i.test(line) || /^personal projects/i.test(line);
      continue;
    }
    if (inProjects) {
      if (line.length < 4) continue;
      const name = line.split(/[-:|–]/)[0].trim().replace(/\s+/g, " ");
      if (name.length >= 3 && name.length <= 60 && !/^\d+$/.test(name)) {
        projects.push({ name, line });
      }
      if (projects.length >= 4) break;
    }
  }
  if (!projects.length) {
    for (const raw of lines) {
      const line = cleanLine(raw);
      if (/\b(built|developed|created|designed and built)\b/i.test(line) && line.length > 20) {
        let name = line.split(/[-:|–]/)[0].trim().slice(0, 60);
        const dot = name.lastIndexOf(". ");
        if (dot >= 0) name = name.slice(dot + 2).trim();
        if (name.length >= 3 && !SECTION_HEADERS.test(name)) projects.push({ name, line });
      }
      if (projects.length >= 3) break;
    }
  }
  const seen = new Set<string>();
  return projects.filter((p) => {
    const k = p.name.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function techInLine(line: string, skills: string[]): string | null {
  const lower = line.toLowerCase();
  return skills.find((s) => lower.includes(s.toLowerCase())) || null;
}

export function buildResumeQuestionsLocal(text: string): ResumeQuestion[] {
  const skills = extractSkills(text);
  const projects = extractProjects(text);
  const out: ResumeQuestion[] = [];
  const push = (question: string, target: string) => {
    if (out.length < 8 && !out.some((q) => q.question === question)) out.push({ question, target });
  };

  const first = projects[0];
  if (first) {
    push(
      `Your resume leads with ${first.name}. Walk me through it properly: what it does, your exact role, and the hardest technical part.`,
      first.name
    );
  } else {
    push(
      "Your resume does not name a clear lead project, so start here: tell me about the strongest thing you have built, your exact role in it, and the hardest part.",
      "Your strongest project"
    );
  }

  for (const p of projects.slice(0, 3)) {
    const tech = techInLine(p.line, skills) || skills[0];
    push(
      tech
        ? `In ${p.name}, why did you choose ${tech}? What was the alternative, and what would break first if usage grew ten times?`
        : `In ${p.name}, what was the core technical decision you made, and what would break first if usage grew ten times?`,
      p.name
    );
  }

  const hasExperience = /\b(intern|internship|worked at|software engineer at|developer at)\b/i.test(text);
  if (hasExperience) {
    push(
      "Your resume mentions work experience. Pick the role you learned most in: what did you personally ship, and what did your team trust you with by the end?",
      "Work experience"
    );
  }

  for (const s of skills.slice(0, 2)) {
    const probe = SKILL_PROBES[s.toLowerCase()];
    push(
      probe
        ? `You list ${s} on your resume, so let us verify it: explain ${probe}.`
        : `You list ${s} on your resume. Give me one concrete example from your own work where ${s} was the hard part, not just a tool you opened.`,
      s
    );
  }

  if (first) {
    push(
      `What is the weakest part of ${first.name} today, technically? If you had two more weeks on it, what exactly would you change first?`,
      first.name
    );
    push(
      `Pick the data structure or storage choice that mattered most in ${first.name}. Why that one, and what did it cost in time or space complexity?`,
      first.name
    );
  }
  if (skills.length >= 3) {
    push(
      `Of everything on your resume, ${skills[2]} is the one interviewers will test hardest. Rate your own depth in it honestly, then prove the rating with an example.`,
      skills[2]
    );
  }
  while (out.length < 6) {
    push(
      "Tell me about a bug in your own project that took you more than a day to find. What was the root cause, and how did you actually find it?",
      "Debugging"
    );
    if (out.length < 6) {
      push(
        "Which part of your resume would you be least comfortable defending under follow-up questions, and why?",
        "Resume gaps"
      );
    }
  }
  return out.slice(0, 8);
}

export async function postResumeQuestions(text: string, interviewerId?: string): Promise<{ questions: ResumeQuestion[]; engine: "gemini" | "local" } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35000);
  try {
    const res = await fetch("/api/resume-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, interviewer: interviewerId }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data || !Array.isArray(data.questions)) return null;
    const questions = (data.questions as unknown[])
      .filter((q): q is ResumeQuestion => !!q && typeof q === "object" && typeof (q as ResumeQuestion).question === "string")
      .map((q) => ({ question: q.question, target: typeof q.target === "string" ? q.target : "Resume" }))
      .slice(0, 8);
    if (questions.length < 3) return null;
    return { questions, engine: data.engine === "gemini" ? "gemini" : "local" };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const RESUME_STORAGE_KEY = "interviewai-resume";
export const RESUME_QUESTIONS_KEY = "interviewai-resume-questions";
