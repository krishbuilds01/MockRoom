import { problems as engineProblems } from "@/lib/problems";

export type BankFormat = "coding" | "system-design" | "general";
export type BankDifficulty = "Easy" | "Medium" | "Hard";
export type BankStage = "Phone Screen" | "Onsite" | "OA";

export interface BankProblem {
  title: string;
  format: BankFormat;
  difficulty?: BankDifficulty;
  companies: string[];
  stage: BankStage[];
  topics: string[];
  engineProblemId?: string;
}

export const problemBank: BankProblem[] = [
  // Coding
  { title: "Two Sum", format: "coding", difficulty: "Easy", companies: ["Google", "Amazon", "Meta"], stage: ["OA", "Phone Screen"], topics: ["Array", "Hash Table"], engineProblemId: "two-sum" },
  { title: "Contains Duplicate", format: "coding", difficulty: "Easy", companies: ["Amazon", "Microsoft"], stage: ["OA"], topics: ["Array", "Hash Table"], engineProblemId: "contains-duplicate" },
  { title: "Valid Parentheses", format: "coding", difficulty: "Easy", companies: ["Amazon", "Microsoft", "Google"], stage: ["OA", "Phone Screen"], topics: ["String", "Stack"], engineProblemId: "valid-parentheses" },
  { title: "Longest Substring Without Repeating Characters", format: "coding", difficulty: "Medium", companies: ["Amazon", "Google", "Meta"], stage: ["Phone Screen", "Onsite"], topics: ["String", "Sliding Window"], engineProblemId: "longest-substring" },
  { title: "Group Anagrams", format: "coding", difficulty: "Medium", companies: ["Amazon", "Google", "Meta"], stage: ["Phone Screen", "Onsite"], topics: ["String", "Hash Table"], engineProblemId: "group-anagrams" },
  { title: "Merge Intervals", format: "coding", difficulty: "Medium", companies: ["Google", "Amazon", "Microsoft"], stage: ["Onsite"], topics: ["Array", "Sorting"], engineProblemId: "merge-intervals" },
  { title: "Trapping Rain Water", format: "coding", difficulty: "Hard", companies: ["Amazon", "Google", "Bloomberg"], stage: ["Onsite"], topics: ["Array", "Two Pointers", "Stack"], engineProblemId: "trapping-rain-water" },
  { title: "Task Scheduler", format: "coding", difficulty: "Medium", companies: ["Amazon"], stage: ["Onsite"], topics: ["Greedy", "Heap"], engineProblemId: "task-scheduler" },
  { title: "Word Search", format: "coding", difficulty: "Medium", companies: ["Bloomberg", "Amazon"], stage: ["Onsite"], topics: ["Matrix", "Backtracking"], engineProblemId: "word-search" },
  { title: "Sqrt(x)", format: "coding", difficulty: "Easy", companies: ["LinkedIn"], stage: ["Phone Screen"], topics: ["Math", "Binary Search"], engineProblemId: "sqrtx" },
  { title: "Max Points on a Line", format: "coding", difficulty: "Hard", companies: ["LinkedIn"], stage: ["Onsite"], topics: ["Array", "Hash Table", "Math"], engineProblemId: "max-points-on-a-line" },
  { title: "Find Leaves of a Binary Tree", format: "coding", difficulty: "Medium", companies: ["LinkedIn"], stage: ["Onsite"], topics: ["Tree", "DFS"], engineProblemId: "find-leaves" },
  { title: "Maximum Subarray", format: "coding", difficulty: "Easy", companies: ["LinkedIn", "Amazon"], stage: ["OA", "Phone Screen"], topics: ["Array", "Dynamic Programming"], engineProblemId: "maximum-subarray" },
  { title: "Count Connected Components", format: "coding", difficulty: "Easy", companies: ["Amazon"], stage: ["OA"], topics: ["Graph", "Union Find"], engineProblemId: "count-connected-components" },
  { title: "LRU Cache", format: "coding", difficulty: "Medium", companies: ["Amazon", "Google", "Microsoft"], stage: ["Onsite"], topics: ["Design", "Hash Table"], engineProblemId: "lru-cache" },
  { title: "Course Schedule", format: "coding", difficulty: "Medium", companies: ["Google", "Amazon"], stage: ["Onsite"], topics: ["Graph", "Topological Sort"], engineProblemId: "course-schedule" },
  { title: "Binary Tree Level Order Traversal", format: "coding", difficulty: "Medium", companies: ["Meta", "Amazon"], stage: ["Phone Screen", "Onsite"], topics: ["Tree", "BFS"], engineProblemId: "binary-tree-level-order" },
  { title: "Coin Change", format: "coding", difficulty: "Medium", companies: ["Google", "Adobe"], stage: ["Onsite"], topics: ["Dynamic Programming"], engineProblemId: "coin-change" },
  // System design
  { title: "Design a Typeahead Suggestion Service", format: "system-design", companies: ["Pinterest", "Slack", "Google"], stage: ["Onsite"], topics: ["Search", "Caching"] },
  { title: "Design a URL Shortener", format: "system-design", companies: ["Google", "Amazon"], stage: ["Phone Screen", "Onsite"], topics: ["Storage"] },
  { title: "Design a Distributed Rate Limiter", format: "system-design", companies: ["Oracle", "Apple", "Amazon"], stage: ["Onsite"], topics: ["Rate Limiting"] },
  { title: "Design a Cloud File Storage System", format: "system-design", companies: ["Amazon", "Meta"], stage: ["Onsite"], topics: ["Storage"] },
  { title: "Design a Following News Feed Service", format: "system-design", companies: ["Pinterest", "Amazon", "Meta"], stage: ["Onsite"], topics: ["Data Modeling"] },
  { title: "Design a Personalized Recommendation System", format: "system-design", companies: ["Netflix", "Google"], stage: ["Onsite"], topics: ["Event-Driven"] },
  { title: "Design an Idempotent Ledger Service", format: "system-design", companies: ["Stripe", "Atlassian"], stage: ["Onsite"], topics: ["Transactions"] },
  { title: "Design a Calendar Event System", format: "system-design", companies: ["Postman", "LinkedIn"], stage: ["Phone Screen"], topics: ["Data Modeling"] },
  { title: "Design a Ticket Confirmation Service", format: "system-design", companies: ["Workday"], stage: ["Phone Screen"], topics: ["Consistency"] },
  { title: "Design a Metrics Monitoring and Alerting Platform", format: "system-design", companies: ["Zscaler", "Amazon"], stage: ["Onsite"], topics: ["Streaming"] },
  { title: "Design a Chat Messaging System", format: "system-design", companies: ["Meta", "Google"], stage: ["Onsite"], topics: ["Messaging"] },
  { title: "Design a Video Streaming Service", format: "system-design", companies: ["Netflix", "YouTube"], stage: ["Onsite"], topics: ["Streaming", "CDN"] },
  { title: "Design an E-commerce Checkout System", format: "system-design", companies: ["Amazon", "Flipkart"], stage: ["Onsite"], topics: ["Transactions"] },
  { title: "Design a Ride Sharing Service", format: "system-design", companies: ["Uber", "Lyft"], stage: ["Onsite"], topics: ["Geospatial"] },
  // General
  { title: "Tell me about yourself", format: "general", difficulty: "Easy", companies: ["Google", "Amazon", "Meta"], stage: ["Phone Screen"], topics: ["Behavioral"] },
  { title: "Why do you want to work at this company?", format: "general", difficulty: "Easy", companies: ["Amazon", "Microsoft"], stage: ["Phone Screen"], topics: ["Behavioral"] },
  { title: "Tell me about a time you disagreed with a teammate", format: "general", difficulty: "Medium", companies: ["Amazon"], stage: ["Onsite"], topics: ["Behavioral", "Leadership"] },
  { title: "Tell me about a project you are most proud of", format: "general", difficulty: "Easy", companies: ["Google", "Meta"], stage: ["Phone Screen"], topics: ["Behavioral"] },
  { title: "How does a HashMap work internally?", format: "general", difficulty: "Medium", companies: ["Amazon", "Adobe"], stage: ["Phone Screen", "Onsite"], topics: ["Java", "Data Structures"] },
  { title: "Explain the difference between processes and threads", format: "general", difficulty: "Medium", companies: ["Microsoft", "Google"], stage: ["Phone Screen"], topics: ["Operating Systems"] },
  { title: "What happens when you type a URL into a browser?", format: "general", difficulty: "Medium", companies: ["Meta", "Amazon"], stage: ["Onsite"], topics: ["Networks", "Web"] },
  { title: "Explain REST vs GraphQL trade-offs", format: "general", difficulty: "Medium", companies: ["Adobe", "Flipkart"], stage: ["Onsite"], topics: ["Web", "APIs"] },
  { title: "Tell me about a time you failed and what you learned", format: "general", difficulty: "Medium", companies: ["Amazon"], stage: ["Onsite"], topics: ["Behavioral", "Leadership"] },
  { title: "How would you design the data model for a college leaderboard?", format: "general", difficulty: "Hard", companies: ["Flipkart"], stage: ["Onsite"], topics: ["Data Modeling"] },
  { title: "Explain indexing in databases and when it hurts", format: "general", difficulty: "Hard", companies: ["Microsoft", "Amazon"], stage: ["Onsite"], topics: ["Databases"] },
  { title: "Why should we hire you?", format: "general", difficulty: "Easy", companies: ["TCS", "Infosys", "Wipro"], stage: ["Phone Screen"], topics: ["HR"] },
];

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function countByFormat(format: BankFormat): number {
  return problemBank.filter((p) => p.format === format).length;
}

export function bankCompanies(): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of problemBank) {
    for (const c of p.companies) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function bankTopics(format?: BankFormat | "all"): string[] {
  const set = new Set<string>();
  for (const p of problemBank) {
    if (format && format !== "all" && p.format !== format) continue;
    for (const t of p.topics) set.add(t);
  }
  return [...set].sort();
}

const ROOM_DIFFICULTY: Record<BankDifficulty, string> = { Easy: "Easy", Medium: "Mid", Hard: "Hard" };

export function startHref(p: BankProblem): string {
  if (p.format === "system-design") {
    return `/system-design?focus=${slugify(p.title)}`;
  }
  const difficulty = ROOM_DIFFICULTY[p.difficulty ?? "Medium"];
  if (p.format === "coding" && p.engineProblemId) {
    const engine = engineProblems.find((e) => e.id === p.engineProblemId);
    const q = new URLSearchParams({ problem: p.engineProblemId, difficulty, topic: engine?.topic ?? p.topics[0] });
    return `/interview/technical?${q}`;
  }
  const q = new URLSearchParams({ difficulty, topic: p.title });
  return `/interview/general?${q}`;
}
