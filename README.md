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

No API key is needed to run it - the local engine covers everything. Add a `GEMINI_API_KEY` (see below) to switch the interviewer to real Gemini replies.

## How code running works

Code runs through the free Judge0 CE public API at https://ce.judge0.com (language ids 63 for JavaScript, 71 for Python) - this needs internet. Note: the public Piston execute API became whitelist only in Feb 2026, so Judge0 is the primary runner in `src/lib/runner.ts`, with the driver format kept compatible so a self hosted Piston or Judge0 instance can be swapped in by changing one fetch URL.

Each problem in `src/lib/problems.ts` defines a solution function name and test cases as function calls. The runner in `src/lib/runner.ts` takes your code, appends a small driver that calls your function with each test case's arguments, and compares the JSON output with the expected value. Run checks visible cases only. Submit checks all cases including hidden ones. Group Anagrams uses a sorted comparison because group order does not matter.

## How the AI interviewer works

The interviewer is Gemini first, with a local fallback. Both rooms call the server route `/api/interview`, and each response says which engine answered. The rooms show a small indicator: "AI: Gemini" or "AI: local mode".

With a Gemini key set, the route in `src/app/api/interview/route.ts` sends a short interviewer prompt to Gemini (`gemini-2.5-flash`, with `gemini-2.0-flash` as a backup model) through the server helper in `src/lib/gemini.ts`. The prompt tells the AI to act like a real interviewer: short plain sentences, one question at a time, no markdown, because replies are spoken aloud. Difficulty changes the behaviour: Easy is supportive with hints, Mid is normal with follow-ups, Hard is strict on complexity and edge cases with minimal hints.

The route handles these modes:

- `general` - follow-up to a candidate answer in the live interview
- `approach` - reaction to the candidate's stated approach, plus one probing question
- `codewatch` - one counter question about what the candidate just wrote or deleted, based on their code and a summary of the change. If there is nothing worth asking, the reply is empty and the room stays silent
- `ask` - the candidate asks the AI something, like "give me a test case" (it gives one concrete input and expected output), "hint", or "what about empty input?"
- `complexity` - asks for, or reacts to, the time and space complexity of the final code
- `feedback` - a short spoken closing summary. The detailed numeric scoring stays local, as before

Without a key, or if the Gemini call fails or times out, the route falls back to the local rule and state engine in `src/lib/interviewer.ts`, so the app always works:

- General interview: question bank per difficulty, one follow-up per answer, stricter on Hard, hints on Easy
- Approach analysis: keyword based - it reacts differently to a hash map plan, brute force, sorting, a stack, two pointers or a sliding window
- Code watching: the technical room snapshots your code, diffs it after a pause, and turns diff patterns into questions - a new loop, a Map, a sort, a return, or a deleted line ("I saw you removed X - why?")
- Candidate questions: test case, hint, empty input and complexity requests are answered from the problem data

The key is a server side env var only. It is never sent to the browser and never appears in the client bundle:

- Local dev: create `.env.local` from `.env.example` and set `GEMINI_API_KEY`. Get a free key from Google AI Studio at https://aistudio.google.com/apikey - the free tier is fine.
- Production: set `GEMINI_API_KEY` in the Vercel project under Settings - Environment Variables, then redeploy.

Never commit a real key. Without a key the app still runs fully on the local engine.

## Project structure

- `src/app/page.tsx` - home, setup and history
- `src/app/interview/general/page.tsx` - live AI interview room
- `src/app/interview/technical/page.tsx` - technical coding room
- `src/app/interview/feedback/page.tsx` - scored feedback
- `src/app/api/interview/route.ts` - interview API route, Gemini first with local engine fallback
- `src/lib/gemini.ts` - server only Gemini API helper
- `src/lib/interviewApi.ts` - small client helper for calling `/api/interview`
- `src/lib/problems.ts` - 6 problems with starter code and test cases
- `src/lib/runner.ts` - Judge0 code runner and driver builder
- `src/lib/interviewer.ts` - local interviewer engine, code watching, scoring, session storage
- `src/lib/useVoice.ts` - Web Speech API voice input hook
- `src/components/Camera.tsx` - camera preview with graceful fallback

## Roadmap

- Streaming Gemini replies so the AI starts speaking sooner
- More problems, including Trees and DP topics
- Auth with GitHub and saving history to an account
- Rating history and progress charts
- Deploy to Vercel

## Known limits

- Voice input (Web Speech API) works in Chrome and Edge, not in all browsers. Typing always works.
- Voice output uses the browser speech synthesis voices.
- Code running needs internet for the Judge0 API.
