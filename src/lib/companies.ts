import { generalQuestions } from "./interviewer";

export interface CompanyProfile {
  id: string;
  name: string;
  style: string;
  focusAreas: string[];
  behaviouralThemes: string[];
  strictnessNote: string;
  openingLine: string;
  technicalFocus: string;
  barLine: string;
  bank: Record<string, string[]>;
}

export const ANY_COMPANY: CompanyProfile = {
  id: "any",
  name: "Any company",
  style: "A standard senior engineer loop: behavioural questions, concepts, and problem solving.",
  focusAreas: ["Behavioural depth", "Core concepts", "Problem solving"],
  behaviouralThemes: ["Ownership", "Handling failure", "Teamwork"],
  strictnessNote: "Strict like a real interviewer at a top company.",
  openingLine: "",
  technicalFocus: "General problem solving, clean code, and stated complexity.",
  barLine: "Against a typical product company bar for interns: structured answers and correct complexity decide it.",
  bank: {},
};

const google: CompanyProfile = {
  id: "google",
  name: "Google",
  style: "Depth first. Data structures and algorithms taken apart properly, plus Googleyness: intellectual humility, comfort with ambiguity, and learning speed.",
  focusAreas: ["DSA depth", "Structured thinking", "Complexity rigour"],
  behaviouralThemes: ["Googleyness", "Learning fast", "Handling ambiguity"],
  strictnessNote: "The bar is very high on DSA depth and structured thinking. Half answers get taken apart.",
  openingLine: "I will run this the way a Google loop runs: depth first, structured thinking, and I will keep digging until the reasoning is exact.",
  technicalFocus: "Data structures and algorithms in depth, exact complexity, and clean structured reasoning out loud.",
  barLine: "Against Google's bar for interns: depth of reasoning decides it, not the final answer alone.",
  bank: {
    Easy: [
      "Tell me about yourself and the project you would most want me to dig into.",
      "Explain how a hash map works under the hood. What happens when two keys collide?",
      "What is the difference between an array and a linked list? When is the linked list actually the better choice?",
      "Tell me about a time you had to learn something fast for a project. How did you go about it?",
      "How do you check whether a string is a palindrome? Walk me through the cleanest approach and its complexity.",
    ],
    Mid: [
      "Tell me about the hardest debugging session you have had. What was the root cause and how did you find it?",
      "Given a stream of numbers, how would you find the median at any point? Start with the simple version, then improve it.",
      "Explain how you would detect a cycle in a directed graph, and where that shows up in real systems.",
      "Describe a time you disagreed with a teammate about a design. What evidence settled it?",
      "How does a browser actually load a page, from URL to pixels? Go layer by layer.",
    ],
    Hard: [
      "Design a system that indexes the web for search. Cover crawling, storage, and ranking at a high level, then go deep on one part.",
      "Tell me about a technical decision you made that you now think was wrong. What would you do with perfect information?",
      "How would you find the k most frequent words in a file too large to fit in memory?",
      "Explain consistent hashing, then tell me exactly what breaks when a node joins a live ring.",
      "Describe the most ambiguous problem you have worked on. How did you structure it before solving?",
    ],
  },
};

const amazon: CompanyProfile = {
  id: "amazon",
  name: "Amazon",
  style: "Every behavioural answer is checked against the Leadership Principles. Stories need a situation, your action, and a measurable result.",
  focusAreas: ["Leadership Principles", "Ownership", "Dive Deep"],
  behaviouralThemes: ["Customer Obsession", "Ownership", "Dive Deep", "Bias for Action", "Earn Trust", "Deliver Results", "Insist on the Highest Standards"],
  strictnessNote: "Stories without numbers or personal ownership get pushed hard. 'We' answers get re-asked as 'you'.",
  openingLine: "I will run this the way Amazon runs its loop: every story gets checked against the Leadership Principles, and I will ask for numbers.",
  technicalFocus: "Correctness under load, ownership of trade-offs, and designs that survive a traffic spike.",
  barLine: "Against Amazon's bar for interns: ownership, numbers, and dive-deep detail decide it.",
  bank: {
    Easy: [
      "Tell me about a time you went beyond what was asked to help a user or a customer. That is what we call Customer Obsession.",
      "What does ownership mean in a project? Give me an example where you owned something end to end.",
      "Explain the difference between SQL and NoSQL databases, and when you would pick each.",
      "Tell me about a mistake you made in a project. What did you change afterwards?",
      "What is a REST API? Explain it like the other person runs a shop, not a codebase.",
    ],
    Mid: [
      "Tell me about a time you had to deliver something against an unrealistic deadline. What did you cut, and how did you decide? That is Bias for Action with Deliver Results.",
      "Describe a bug that took you deep into code you did not write. How did you dive deep and find the root cause?",
      "A feature you shipped made one metric better and another worse. Walk me through how you would decide whether to keep it.",
      "Tell me about a time you received hard feedback on your work. What exactly did you do with it? That is Earn Trust.",
      "How would you design the order history page for an e-commerce site that has to load fast for millions of users?",
    ],
    Hard: [
      "Tell me about the highest standard you have insisted on when others wanted to ship something weaker. What did it cost you? That is Insist on the Highest Standards.",
      "Design a flash sale system that has to survive a 50x traffic spike in the first minute. Where does it break first?",
      "Describe a time you made a decision with incomplete data that turned out wrong. What did you do next?",
      "How would you detect and stop fake reviews on a marketplace, technically and operationally?",
      "Tell me about a project where you simplified something complex. What did the simpler version give up? That is Invent and Simplify.",
    ],
  },
};

const microsoft: CompanyProfile = {
  id: "microsoft",
  name: "Microsoft",
  style: "Approach matters as much as the answer. Growth mindset, clear thinking out loud, and how you work with other people.",
  focusAreas: ["Problem-solving approach", "Growth mindset", "Collaboration"],
  behaviouralThemes: ["Growth mindset", "Learning from failure", "Helping others succeed"],
  strictnessNote: "Silent thinking scores zero. Reasoning has to be audible and structured.",
  openingLine: "I will run this the way Microsoft interviews run: your approach matters as much as your answer, so think out loud.",
  technicalFocus: "Structured problem solving, clean data structure choices, and reasoning stated out loud step by step.",
  barLine: "Against Microsoft's bar for interns: the quality of the approach decides it, not just the final code.",
  bank: {
    Easy: [
      "Tell me about yourself and a project where you learned the most.",
      "Explain object oriented programming with a real example from something you built.",
      "What is the difference between a stack and a queue? Give me one real use for each.",
      "Tell me about a time a plan failed. What did you learn from it?",
      "How would you test a simple login page? List the cases you would check.",
    ],
    Mid: [
      "Walk me through how you would design the undo feature of a text editor. Which data structures, and why?",
      "Tell me about a time you helped a teammate who was stuck. What did you actually do?",
      "Explain how indexing works in a database, and when an index hurts instead of helps.",
      "Describe a project where the requirements changed halfway. How did you adapt the design?",
      "How would you find the first non-repeating character in a string? Give me two approaches and their trade-offs.",
    ],
    Hard: [
      "Design a collaborative document editing system like Word Online. Cover conflicts and offline edits.",
      "Tell me about the most complex system you have reasoned about. Where is its weakest point?",
      "How would you design autocomplete for a search box serving 100 million queries a day?",
      "Describe a time your first solution was wrong in a way you only saw later. What signal did you miss?",
      "Explain how you would make a desktop app's update system safe against a bad release.",
    ],
  },
};

const meta: CompanyProfile = {
  id: "meta",
  name: "Meta",
  style: "Move fast and show impact. Product reasoning is probed in every answer, and systems questions go to real scale.",
  focusAreas: ["Impact", "Product sense", "Systems at scale"],
  behaviouralThemes: ["Move fast", "Impact over activity", "Product thinking"],
  strictnessNote: "Vague impact claims get challenged. Numbers, users, and trade-offs, or it did not happen.",
  openingLine: "I will run this the way Meta runs its interviews: fast, impact focused, and product reasoning in every answer.",
  technicalFocus: "Systems at real scale, product reasoning, and shipping trade-offs stated plainly.",
  barLine: "Against Meta's bar for interns: demonstrated impact and scale thinking decide it.",
  bank: {
    Easy: [
      "Tell me about a product you use every day. What would you improve, and why?",
      "Explain what happens when you post a photo on a social app, step by step.",
      "What is the difference between a process and a thread?",
      "Tell me about a project you shipped quickly. What did you deliberately leave out?",
      "How would you count how many users clicked a button yesterday, at a high level?",
    ],
    Mid: [
      "How would you design news feed ranking for a social app? What signals matter?",
      "Tell me about a time you had to choose speed over polish. Was it the right call?",
      "Explain caching like I am a product manager. Where does it help, and where does it bite?",
      "Describe the most impactful thing you have built. How do you know it mattered?",
      "How would you detect duplicate accounts being created in bulk?",
    ],
    Hard: [
      "Design a messaging system for 2 billion users. Go deep on delivery guarantees and storage.",
      "Tell me about a system you would rebuild from scratch today. What changes, and why?",
      "How would you stop a viral misinformation post from spreading, technically, in the first hour?",
      "Explain how you would shard a comments database that has outgrown one machine.",
      "Describe a trade-off between user growth and system reliability that an engineer here would have to make.",
    ],
  },
};

const adobe: CompanyProfile = {
  id: "adobe",
  name: "Adobe",
  style: "Craft, media, and performance. How the product feels to the person using it counts as much as the code.",
  focusAreas: ["Product craft", "Media and performance", "User thinking"],
  behaviouralThemes: ["Craft", "Simplifying for the user", "Performance care"],
  strictnessNote: "Answers that ignore the user or performance on real hardware get pushed.",
  openingLine: "I will run this the way Adobe interviews run: craft, performance, and how you think about the person using the product.",
  technicalFocus: "Media data structures, performance on real hardware, and product craft in technical choices.",
  barLine: "Against Adobe's bar for interns: craft and performance thinking decide it, alongside correct code.",
  bank: {
    Easy: [
      "Tell me about something you built that other people actually used. What feedback did you get?",
      "Explain how an image is stored on a computer. What changes when you compress it?",
      "What is the difference between vector and raster graphics?",
      "Tell me about a time you had to make something simpler for the user.",
      "How would you store and retrieve a user's edited photos in an app?",
    ],
    Mid: [
      "How would you design the layers panel of a photo editor? What data structure sits behind it?",
      "Tell me about a performance problem in something visual you built. How did you find it?",
      "Explain how undo and redo should work in a creative tool with large files.",
      "Describe a feature you would add to a PDF reader for students. How would you build it?",
      "How would you sync a document across devices when the user edits offline?",
    ],
    Hard: [
      "Design a cloud rendering pipeline for video effects. Cover queueing, scaling, and failure recovery.",
      "Tell me about the hardest trade-off between quality and speed you have made in a product.",
      "How would you build real-time collaborative editing for a design file with hundreds of objects?",
      "Explain how you would make a creative app work well on a low-end laptop with 4 GB of RAM.",
      "Describe how you would detect when an export pipeline produces subtly wrong output at scale.",
    ],
  },
};

const flipkart: CompanyProfile = {
  id: "flipkart",
  name: "Flipkart",
  style: "Practical engineering tested against Indian sale-day scale: correctness under load, low-end devices, slow networks.",
  focusAreas: ["Sale-day scale", "Correctness under load", "Practical trade-offs"],
  behaviouralThemes: ["Ownership under pressure", "Frugal engineering", "Bias for action"],
  strictnessNote: "Designs that only work on fast networks and flagship phones get challenged.",
  openingLine: "I will run this the way Flipkart interviews run: practical engineering, and everything gets tested against sale day scale.",
  technicalFocus: "Correctness under concurrent load, caching that stays right, and designs that survive a sale day spike.",
  barLine: "Against Flipkart's bar for interns: practical scale thinking and correctness under load decide it.",
  bank: {
    Easy: [
      "Tell me about yourself and the project you are most confident explaining.",
      "What happens when a user searches for a product on an e-commerce site? Walk me through it.",
      "Explain the difference between MySQL and MongoDB with one example each.",
      "Tell me about a time you fixed something under time pressure.",
      "How would you make a product page load fast on a slow 3G connection?",
    ],
    Mid: [
      "How would you design the cart system for a sale day with ten times normal traffic?",
      "Tell me about a time you optimised something slow. What was the bottleneck really?",
      "Explain how you would keep stock counts correct when thousands of people buy the same item at once.",
      "Describe a disagreement you had about an approach. How was it resolved?",
      "How would you design notifications for order updates without spamming the user?",
    ],
    Hard: [
      "Design the backend for a Big Billion Days style sale. Where does it break first, and what do you protect?",
      "Tell me about the toughest scale problem you have thought through. What numbers drove the design?",
      "How would you build a price comparison crawler that stays correct when sellers change prices hourly?",
      "Explain how you would run a flash sale fairly when stock is 100 units and demand is a million buyers.",
      "Describe a time you chose a boring, reliable technology over a new one. Why?",
    ],
  },
};

const tcs: CompanyProfile = {
  id: "tcs",
  name: "TCS",
  style: "A panel style round: fundamentals first, OOP and SQL done properly, basic DSA logic talked through, and straight HR answers.",
  focusAreas: ["OOP fundamentals", "SQL", "Basic DSA", "HR readiness"],
  behaviouralThemes: ["Communication", "Relocation readiness", "Team conduct"],
  strictnessNote: "Textbook answers without an example of your own get re-asked. HR answers are scored for honesty and clarity.",
  openingLine: "I will run this the way a TCS panel runs: fundamentals first, OOP and SQL done properly, and straight answers.",
  technicalFocus: "Fundamentals stated exactly: OOP pillars, SQL queries, and basic DSA logic talked through before code.",
  barLine: "Against TCS's bar for freshers: clean fundamentals and clear, honest answers decide it.",
  bank: {
    Easy: [
      "Tell me about yourself: your education, your strengths, and why you want to work at TCS.",
      "Explain the four pillars of OOP with one small example each.",
      "How would you reverse a string? Talk me through the logic before any code.",
      "What is the difference between a primary key and a foreign key in SQL?",
      "Why should we hire you over other freshers from your batch?",
    ],
    Mid: [
      "Explain inheritance versus composition. When is inheritance the wrong choice?",
      "Write a SQL query to find the second highest salary in an employee table. Explain how it works.",
      "Tell me about your final year project. What was your exact role in it?",
      "What is normalization in databases? Take a table and normalize it for me, verbally.",
      "Are you willing to relocate and work on client projects in other cities? Answer honestly and say how you see it.",
    ],
    Hard: [
      "Explain how the Java garbage collector works, or the memory model of your main language, in depth.",
      "Design a small library management system: the classes, the tables, and the main flows.",
      "Tell me about a time you worked in a team where someone was not contributing. What did you do?",
      "What is the difference between TCP and UDP, and where would a banking application use each?",
      "Where do you see yourself in five years, and what are you doing now to get there?",
    ],
  },
};

const infosys: CompanyProfile = {
  id: "infosys",
  name: "Infosys",
  style: "Fundamentals and learnability. Clear communication is scored as heavily as technical correctness.",
  focusAreas: ["Fundamentals", "Learnability", "Communication"],
  behaviouralThemes: ["Learning agility", "Team projects", "Explaining clearly"],
  strictnessNote: "Mumbled or memorised answers get unpacked. If you cannot explain it simply, you do not know it yet.",
  openingLine: "I will run this the way Infosys interviews run: strong fundamentals, clear communication, and how fast you learn.",
  technicalFocus: "Core fundamentals explained simply and exactly: memory, data structures, operating systems, databases.",
  barLine: "Against Infosys's bar for freshers: fundamentals you can explain simply, and visible learnability, decide it.",
  bank: {
    Easy: [
      "Introduce yourself: your background, your favourite subject, and one project.",
      "What is a pointer? If your language has none, how does memory work in your language?",
      "Explain the difference between an array and a linked list, in words a first year student would follow.",
      "Why Infosys? What do you know about what the company actually does?",
      "Tell me about a subject you found hard. How did you get through it?",
    ],
    Mid: [
      "Explain polymorphism with an example that is not from a textbook.",
      "How would you write a program to check whether a number is prime, then make it faster?",
      "What happens in an operating system when you run a program? Walk me through it.",
      "Tell me about a group project and exactly what you contributed.",
      "How do you keep yourself updated with new technology? Give me a recent example.",
    ],
    Hard: [
      "Explain deadlocks: how they happen, and three ways to prevent them.",
      "Design the data model for an online examination system for a university.",
      "Tell me about a time you had to explain a technical idea to a non-technical person. Did it land?",
      "What is cloud computing, really? Explain IaaS, PaaS and SaaS with examples.",
      "If you get an offer from a product company and from Infosys, how will you decide? Answer honestly.",
    ],
  },
};

const wipro: CompanyProfile = {
  id: "wipro",
  name: "Wipro",
  style: "Fundamentals, SDLC, testing basics, and whether you are ready to be put in front of a client.",
  focusAreas: ["Fundamentals", "SDLC and testing", "Client readiness"],
  behaviouralThemes: ["Client conduct", "Learning speed", "Handling feedback"],
  strictnessNote: "Answers are checked for client readiness: clarity, honesty about limits, and structured thinking.",
  openingLine: "I will run this the way Wipro interviews run: fundamentals, SDLC, and whether you are ready for client work.",
  technicalFocus: "SDLC and testing fundamentals, secure basics like HTTPS, and concurrency stated plainly.",
  barLine: "Against Wipro's bar for freshers: fundamentals plus client-ready communication decide it.",
  bank: {
    Easy: [
      "Tell me about yourself in two minutes: background, skills, and one achievement.",
      "What is the difference between Java and JavaScript? If you know C and C++ better, use that pair instead.",
      "Explain what a database index is, in simple words.",
      "Why do you want to join Wipro specifically?",
      "Tell me about a time you learned a completely new tool quickly.",
    ],
    Mid: [
      "Explain the software development life cycle using a project you actually did.",
      "Talk me through the logic to find duplicate elements in an array, before any code.",
      "What is the difference between black box and white box testing? Where have you used either?",
      "Tell me about a client-style deadline you faced, in college or an internship. How did you handle it?",
      "How comfortable are you with relocation and working with global clients across time zones?",
    ],
    Hard: [
      "Explain how HTTPS works end to end, including certificates.",
      "Design a ticket booking system for trains: data model, concurrency, and failure cases.",
      "Tell me about the most difficult feedback you received. What changed after it?",
      "What would you do in your first 90 days on a client project you know nothing about?",
      "Explain microservices versus a monolith using a real example, and when the monolith wins.",
    ],
  },
};

export const companies: CompanyProfile[] = [ANY_COMPANY, google, amazon, microsoft, meta, adobe, flipkart, tcs, infosys, wipro];

export function getCompany(id: string | null | undefined): CompanyProfile {
  return companies.find((c) => c.id === id) || ANY_COMPANY;
}

export function companyQuestions(companyId: string, difficulty: string): string[] {
  const c = getCompany(companyId);
  if (c.id === "any") return generalQuestions(difficulty);
  return c.bank[difficulty] || c.bank.Mid || generalQuestions(difficulty);
}

export function companyContext(c: CompanyProfile): string | undefined {
  if (c.id === "any") return undefined;
  return `${c.name}. Style: ${c.style} Strictness: ${c.strictnessNote} Focus areas: ${c.focusAreas.join(", ")}.`;
}

export function companyTechnicalContext(c: CompanyProfile): string | undefined {
  if (c.id === "any") return undefined;
  return `${c.name}. Technical focus: ${c.technicalFocus} Strictness: ${c.strictnessNote}`;
}
