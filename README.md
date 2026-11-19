# InterviewAI

A strict AI interview practice platform. Practice a live one on one interview with an AI that talks in a human sounding voice, listens, and pushes back hard, or a technical coding interview where the AI watches your code as you write it and asks counter questions. It is built to prepare you for a real interview, not to make you feel good: scores are honest, hints are recorded, and every session ends with feedback that teaches.

## Features

- Home page with two interview types, difficulty selector (Easy / Mid / Hard) and topic selector
- Live AI Interview: camera preview, voice input and voice output, follow-up questions, 5 questions per session
- Technical Interview: LeetCode style layout with problem panel, Monaco editor (JavaScript and Python, code is kept per language when you switch), Run and Submit, visible and hidden test cases
- AI interviewer in the technical room works in 3 phases:
  - Approach: it asks for your approach first and judges it. No code runs before you state an approach
  - Coding: it watches editor changes, notices new loops, hash maps, sorting, returns, deleted lines, long stretches without a run, and asks why, at most one question every 25 seconds
  - Review: after Submit it asks for time and space complexity, checks your answer, and records whether it was right
- Ask the AI while coding: "give me a test case", "hint", "what about empty input?" - hints depend on difficulty and are recorded
- Feedback that teaches (see below), saved in your browser with a progress view on the home page

## How strict is it

The interviewer behaves like a tough interviewer at a top company, in both the Gemini prompts and the local engine:

- Vague or short answers are not accepted. You get pushed for a concrete example, exact steps, or numbers, and in the live interview a thin follow-up answer earns a second, deeper follow-up on the same question
- Easy still demands specifics but allows one small hint. Mid gives hints only when you explicitly ask, and says they are recorded. Hard gives no hints at all
- A brute force approach on Mid gets challenged to optimise before coding. On Hard it is rejected in the approach phase and you must state a faster approach first
- Complexity is a scored round, not small talk: your stated time and space complexity is checked against the expected answer for the problem
- Scoring is recalibrated so a 10 is rare. Passing all tests is necessary but not sufficient: hints used, unanswered interviewer questions, a thin approach, and a wrong complexity answer all pull scores down. A flawless session (all tests, correct complexity, no hints, every question answered) is roughly what it takes to see 9s and 10s

## Feedback that teaches

The feedback page is the point of the platform:

- Scores out of 10 for Problem Solving, Coding, Communication and Complexity Analysis, plus an overall score, all computed from real signals: tests passed, runs, hints, approach quality, questions answered, complexity correctness, answer depth, and time against a target for the level
- Phase by phase notes: what you actually said and did in Approach, Coding, and Complexity/Communication, what was weak about it, and what a strong version looks like
- Model pointers, shown only after the interview ends: the intended pattern for the problem, the expected complexity, the key points, and the edge cases that matter
- Weak areas: 2 to 4 concrete areas derived from your signals, like complexity analysis, edge cases, hint independence, or answer depth
- Next steps: 2 to 3 recommended problems from the set with a reason for each (retry a failed problem first, rebuild the pattern, or move up the sequence), each with a link that starts that interview directly
- Progress over time: the home page lists your sessions with date, problem, tests, hints, and overall score, shows the change versus your previous session, and draws a simple bar trend of your overall scores

## Voice: humanised, not robotic

- Primary voice is Gemini text to speech via the server route `/api/tts`. The route calls the Gemini TTS model (`gemini-2.5-flash-preview-tts`, voice "Kore") with your server side key, wraps the returned PCM audio in a WAV header, and the browser plays it sentence by sentence so long replies start fast and can be stopped or muted. The rooms show "AI voice: Gemini voice" when it is active
- Fallback voice is the browser speech synthesis, improved: it picks the best available voice (Google US English, Natural, Neural, or Microsoft online voices first), uses a natural rate of 0.98, and speaks sentence by sentence with small pauses. The rooms show "AI voice: browser voice" in that case
- The interviewer's words are also written to sound human: contractions, varied short acknowledgements, no repeated robotic opener, and no filler spam
- Voice input uses the Web Speech API (Chrome and Edge). Typing always works

## How to run

```bash
npm install
npm run dev
```

Open http://localhost:3000 in Chrome (voice input needs Chrome). Allow camera and mic when asked. Camera denial does not block the interview.

No API key is needed to run it: the local engine and browser voice cover everything. Add a `GEMINI_API_KEY` (see below) to switch the interviewer to real Gemini replies and the voice to Gemini TTS.

## How code running works

Code runs through the free Judge0 CE public API at https://ce.judge0.com (language ids 63 for JavaScript, 71 for Python), with a 30 second timeout and per case results even when your code has a syntax error. This needs internet. Note: the public Piston execute API became whitelist only in Feb 2026, so Judge0 is the primary runner in `src/lib/runner.ts`.

Each problem in `src/lib/problems.ts` defines a solution function name, test cases as function calls, the intended pattern, key points, and edge cases. The runner appends a small driver that calls your function with each test case's arguments and compares the JSON output. Run checks visible cases only. Submit checks all cases including hidden ones. Group Anagrams uses a sorted comparison because group order does not matter.

## How the AI interviewer works

The interviewer is Gemini first, with a local fallback. Both rooms call the server route `/api/interview`, and each response says which engine answered. The rooms show "AI: Gemini" or "AI: local mode", plus which voice is speaking.

With a Gemini key set, the route sends a strict interviewer prompt to Gemini (`gemini-2.5-flash`, with `gemini-2.0-flash` as a backup model) through the server helper in `src/lib/gemini.ts`. Thinking is disabled for these calls and the token limit is sized for short spoken replies, so answers arrive complete and fast. If a reply ever comes back cut off, it is treated as a failure and the local engine answers instead, so you never see half a sentence.

The route handles these modes:

- `general` - strict follow-up to a candidate answer in the live interview
- `approach` - reaction to the candidate's stated approach, plus one probing question
- `codewatch` - one counter question about what the candidate just wrote or deleted. If there is nothing worth asking, the reply is empty and the room stays silent
- `ask` - the candidate asks the AI something, like "give me a test case" (one concrete input and expected output), "hint" (difficulty rules apply, and it is recorded), or "what about empty input?"
- `complexity` - asks for, or checks, the time and space complexity of the final code
- `feedback` - a short, honest spoken closing summary. The detailed scoring stays local

Without a key, or if a Gemini call fails or times out, the route falls back to the local rule and state engine in `src/lib/interviewer.ts`, which implements the same strict behaviour: thin answer detection, brute force rejection, code watching from diffs, hint rules per difficulty, complexity checking against the problem data, and strict scoring.

## Environment variables

One optional variable, placeholder in `.env.example`:

- `GEMINI_API_KEY` - server side only, never sent to the browser. Powers Gemini interviewer replies (`/api/interview`) and the Gemini voice (`/api/tts`). Get a free key from Google AI Studio at https://aistudio.google.com/apikey - the free tier is fine.
  - Local dev: copy `.env.example` to `.env.local` and fill it in
  - Production: set it in the Vercel project under Settings - Environment Variables, then redeploy

Never commit a real key. Without a key the app still runs fully on the local engine and browser voice.

## Project structure

- `src/app/page.tsx` - home, setup, history and progress trend
- `src/app/interview/general/page.tsx` - live AI interview room
- `src/app/interview/technical/page.tsx` - technical coding room
- `src/app/interview/feedback/page.tsx` - scored feedback, phase notes, model pointers, weak areas, next problems
- `src/app/api/interview/route.ts` - interview API route, Gemini first with local engine fallback
- `src/app/api/tts/route.ts` - Gemini TTS route returning WAV audio, with a fallback signal when unavailable
- `src/lib/gemini.ts` - server only Gemini API helper
- `src/lib/interviewApi.ts` - small client helper for calling `/api/interview`
- `src/lib/problems.ts` - 6 problems with starter code, test cases, patterns, key points and edge cases
- `src/lib/runner.ts` - Judge0 code runner and driver builder
- `src/lib/interviewer.ts` - local strict interviewer engine, code watching, complexity checking, scoring, session storage
- `src/lib/feedback.ts` - weak areas, next problem recommendations, phase by phase notes
- `src/lib/useVoice.ts` - Web Speech API voice input hook
- `src/lib/useSpeaker.ts` and `src/lib/voice.ts` - humanised voice output: Gemini TTS first, improved browser voice fallback
- `src/components/Camera.tsx` - camera preview with graceful fallback

## Roadmap

- Streaming Gemini replies so the AI starts speaking sooner
- More problems, including Trees and DP topics
- Auth with GitHub and saving history to an account
- A larger problem set with per topic progression paths

## Known limits

- Voice input (Web Speech API) works in Chrome and Edge, not in all browsers. Typing always works.
- Gemini TTS and Gemini replies need a `GEMINI_API_KEY` and internet. Without them the app uses the local engine and browser voice, which are less human.
- Code running needs internet for the Judge0 API, and the free public instance can rate limit under heavy use.
- Session history lives in your browser localStorage only, so it does not follow you across devices.
- Trees and DP topics do not have dedicated problems yet and fall back to the closest available problem.
