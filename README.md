# InterviewAI

An AI interview practice platform. Practice a live one on one interview with an AI that talks, listens and follows up, or a technical coding interview where the AI watches your code as you write it and asks counter questions.

## Features

- Home page with two interview types, difficulty selector (Easy / Mid / Hard) and topic selector
- Live AI Interview: camera preview, voice input and voice output, follow-up questions, 5 questions per session
- Technical Interview: LeetCode style layout with problem panel, Monaco editor (JavaScript and Python), Run and Submit, visible and hidden test cases
- AI interviewer in the technical room works in 3 phases:
  - Approach: it asks for your approach first and responds to what you say
  - Coding: it watches editor changes, notices new loops, hash maps, sorting, returns and deleted lines, and asks why - at most one question every 25 seconds, spoken out loud with a mute toggle
  - Review: after Submit it asks for time and space complexity, then closes
- Ask the AI while coding: "give me a test case", "hint", "what about empty input?" - hints depend on difficulty
- Feedback page with scores out of 10 for Problem Solving, Coding, Communication and Complexity Analysis, based on real signals: tests passed, runs, approach explained, AI questions answered and time taken
- Past interviews saved in your browser (localStorage) and shown on the home page

## How to run

```bash
npm install
npm run dev
```

Open http://localhost:3000 in Chrome (voice input needs Chrome). Allow camera and mic when asked. Camera denial does not block the interview.

No API key is needed for the MVP.

## How code running works

Code runs through the free Judge0 CE public API at https://ce.judge0.com (language ids 63 for JavaScript, 71 for Python) - this needs internet. Note: the public Piston execute API became whitelist only in Feb 2026, so Judge0 is the primary runner in `src/lib/runner.ts`, with the driver format kept compatible so a self hosted Piston or Judge0 instance can be swapped in by changing one fetch URL.

Each problem in `src/lib/problems.ts` defines a solution function name and test cases as function calls. The runner in `src/lib/runner.ts` takes your code, appends a small driver that calls your function with each test case's arguments, and compares the JSON output with the expected value. Run checks visible cases only. Submit checks all cases including hidden ones. Group Anagrams uses a sorted comparison because group order does not matter.

## How the AI interviewer works

The interviewer is a local rule and state engine in `src/lib/interviewer.ts`. It needs no key and works fully offline except for code running:

- General interview: question bank per difficulty, one follow-up per answer, stricter on Hard, hints on Easy
- Approach analysis: keyword based - it reacts differently to a hash map plan, brute force, sorting, a stack, two pointers or a sliding window
- Code watching: the technical room snapshots your code, diffs it after a pause, and turns diff patterns into questions - a new loop, a Map, a sort, a return, or a deleted line ("I saw you removed X - why?")
- Candidate questions: test case, hint, empty input and complexity requests are answered from the problem data

Optional smarter replies: create `.env.local` from `.env.example` and set `GEMINI_API_KEY` or `OPENAI_API_KEY`. The `/api/interview` route checks for a key and reports `llmAvailable`. Without a key it returns local engine replies. Never commit a real key.

## Project structure

- `src/app/page.tsx` - home, setup and history
- `src/app/interview/general/page.tsx` - live AI interview room
- `src/app/interview/technical/page.tsx` - technical coding room
- `src/app/interview/feedback/page.tsx` - scored feedback
- `src/app/api/interview/route.ts` - interview API route (local engine fallback)
- `src/lib/problems.ts` - 6 problems with starter code and test cases
- `src/lib/runner.ts` - Judge0 code runner and driver builder
- `src/lib/interviewer.ts` - interviewer engine, code watching, scoring, session storage
- `src/lib/useVoice.ts` - Web Speech API voice input hook
- `src/components/Camera.tsx` - camera preview with graceful fallback

## Roadmap

- Real LLM streaming replies using Gemini or OpenAI when a key is set
- More problems, including Trees and DP topics
- Auth with GitHub and saving history to an account
- Rating history and progress charts
- Deploy to Vercel

## Known limits

- Voice input (Web Speech API) works in Chrome and Edge, not in all browsers. Typing always works.
- Voice output uses the browser speech synthesis voices.
- Code running needs internet for the Judge0 API.
