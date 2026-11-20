# Mock Room

Interview practice with two named AI interviewers, Maya and Rohan. Run a live voice interview (5 questions, follow-ups, pushback on thin answers) or a technical coding interview where the interviewer watches your code as you write it and asks about the lines you add and delete. Scores are out of 10 on four axes, hints are recorded, and every session ends with a scorecard that names your weak areas and your next problems.

## Features

- Home page with three interview modes (Technical, Live voice, Interview on my resume), difficulty selector (Easy / Mid / Hard), company selector and topic selector
- Company modes: pick Google, Amazon, Microsoft, Meta, Adobe, Flipkart, TCS, Infosys or Wipro and your interviewer runs the session in that company's style, with its own question bank and focus areas (Amazon checks stories against the Leadership Principles, service companies weight OOP, SQL and fundamentals), an opening line in that style, and feedback that frames your score against that company's bar. The company is saved on the session and shown in history and feedback
- Interview on my resume: paste your resume (or upload a .txt or .md file) and your interviewer questions you on it, with 6 to 8 questions targeted at your own projects and listed skills. With a Gemini key the questions are generated from the resume by `/api/resume-questions`; without one, a local extractor pulls out your projects and skills and builds the questions on device. The resume stays in your browser (localStorage only) and can be deleted any time
- Progress page (`/progress`): totals, average score, practice streak, strongest area, a labelled score trend, per topic and per axis averages, your weakest area, and a rule based plan for this week with three suggested sessions. Everything is computed from the history already in your browser; under 3 sessions the page says so honestly instead of drawing trends from nothing
- Interview problem bank (`/problems`): 44 real interview questions (18 coding, 14 system design, 12 general) with the companies that ask them, stage and topics, searchable and filterable by format, company, difficulty and topic. Playable coding questions start the coding room directly; the rest start a voice room on that question
- System design room: Coming soon. The system design page lists the full question set the rooms will use (typeahead, URL shortener, rate limiter, file storage, news feed and more) in the same bank table. It is not startable yet
- Self-review recording: an optional toggle in both rooms (off by default) records your camera and mic with MediaRecorder. The video is stored only in your browser (IndexedDB, keyed by session, size guarded) and never uploaded. The feedback page shows a player with Download and Delete when a recording exists, and nothing extra when it does not
- Live AI Interview: camera preview, voice input and voice output, follow-up questions, 5 questions per session
- Technical Interview: LeetCode style layout with problem panel, Monaco editor (JavaScript, Python and Java, code is kept per language when you switch), Run and Submit, visible and hidden test cases
- Both rooms run like a real interview, with a phase indicator at the top:
  - Opening: the interviewer explains the format, and asks you to introduce yourself
  - Clarifying: in the technical room, The interviewer presents the problem and asks for your clarifying questions first, and answers them from the problem data. Whether you asked any is recorded
  - Approach: he asks for your approach and judges it. No code runs before an approach is accepted
  - Coding: he watches real editor content changes (cursor moves and no-op edits never trigger anything), notices new loops, hash maps, sorting, returns, deleted lines, and long stretches without a run, and asks why. At most one question is ever waiting for an answer, questions never repeat, and there is a minimum 45 second gap while you code
  - Dry run: after Submit passes to the review stage, the interviewer asks you to dry run one example input out loud, value by value, before complexity
  - Complexity: your stated time and space complexity is checked. If you already stated it correctly earlier, he confirms it instead of asking again
  - Your questions: the interviewer asks if you have questions and answers one briefly, then closes professionally
- Ask the AI while coding: "give me a test case", "hint", "what about empty input?" - hints depend on difficulty and are recorded
- If you leave a room mid interview, the session is saved to your history as incomplete instead of being lost
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
- Progress over time: the home page lists your sessions with date, problem, tests, hints, and overall score, shows the change versus your previous session, and draws a bar trend with each bar labeled by its overall score. All score bars everywhere scale on a fixed 0 to 10 axis. The dedicated `/progress` page adds streaks, per topic and per axis averages, and a weekly practice plan

## Voice and interview architecture

The interview is led by the engine, not by a free-running voice model. Both rooms run on one path: for every answer you give, the interview engine (Gemini over REST, or the local engine) computes exactly one reply. Replies are committed to the transcript in order through a single-flight queue (the send button waits, stale responses are ignored, nothing is ever committed twice), and a typing indicator shows while the interviewer is thinking. Every AI message also passes through a sanitizer before it can reach the transcript, the speaker, or your session record, so internal instruction text can never leak into the conversation.

Voice on this main path:

1. Gemini TTS (primary voice). `/api/tts` uses the Gemini TTS model (`gemini-2.5-flash-preview-tts`, voice Callirrhoe, with a natural spoken style direction prepended server side) and returns WAV audio. The client fires all sentence chunk requests in parallel, merges short fragments so a typical reply is one or two calls, caches repeated lines for the session, and plays chunks in order through one reusable audio element. If the first chunk has not arrived within about 2.5 seconds, the browser voice starts that chunk so you are never left in silence. Rooms show "Voice: Gemini voice".
2. Browser voice (fallback). Improved speech synthesis: it picks the best available voice (Google US English, Natural, Neural, or Microsoft online voices first) at a natural rate. With no Gemini key at all, this is where the app starts, instantly, because the no-key responses are fast and latched.

Mic gating: while the interviewer is speaking, your mic pauses automatically and the room shows "Mic paused while the interviewer speaks". It resumes just before he finishes (when the last chunk starts playing, or about 0.8 seconds from the end), so you can answer without a dead gap. It only auto-resumes if you had the mic on; if you muted yourself, you stay muted. Anything the recognizer hears while the interviewer speaks is discarded, and tapping the mic control while the interviewer speaks always interrupts him first and then turns your mic on, never starts recognition into live speech. Muting the interviewer's voice is a separate control and does not change the mic.

Speaking indicator and mic sound: while the interviewer speaks, a small five bar waveform animates next to his name in the AI panel header (the one place that owns speaking status), in the accent green, and freezes to static bars when he stops. Under `prefers-reduced-motion` it stays static. When your mic opens, on auto resume after the interviewer finishes or when you interrupt, a soft two tone earcon plays (WebAudio sine, about 620Hz rising to 880Hz over 140ms at low volume, generated in `src/lib/sounds.ts`, no audio files). It plays only when the interviewer's voice is enabled, never on page load, and there is no sound when the mic pauses.

Gemini Live (experimental, opt-in, general room only). The Live AI Interview room has a "Live conversation (experimental)" button, off by default. In this mode the Gemini Live model leads the conversation itself from its system instruction (the interviewer persona, the opening, the 5 questions for your difficulty, strict follow-ups, your questions, the close). The app never injects instructions into a Live session; it only listens, appending the Live transcriptions to the transcript and deriving progress passively, so end-of-interview scoring still works from what was actually said. The same mic gating applies: your mic frames stop going up while the interviewer's audio is playing and resume as his turn ends. A visible "End live and use standard mode" button switches back to the engine path at any point. The server route `/api/live-token` mints a short lived ephemeral token from your `GEMINI_API_KEY` (the real key never reaches the browser) for the native audio model (`gemini-2.5-flash-native-audio-preview-12-2025`, changeable with `GEMINI_LIVE_MODEL`) with the voice of the interviewer you picked (Kore for Maya, Orus for Rohan). The technical room never uses Live: code watching needs exact engine control.

Voice input on the main path uses the Web Speech API (Chrome and Edge), with visible listening, paused, and error states. In Live mode your mic streams to the Live session and Gemini transcribes it. Typing always works.

## Design contract

Who this is for: a student preparing for real company interview loops who wants to be scored honestly before the real thing.

The product's own objects, and how the interface shows them instead of generic marketing blocks:

- Two named interviewers, Maya and Rohan. You pick one before every session. The name and voice run the whole session, the room header carries the name, and the name is printed on the session record.
- Company loops. Picking a company (Google, Amazon, Microsoft, Meta, Adobe, Flipkart, TCS, Infosys, Wipro) changes the question bank, the interviewer's style, and the bar your feedback is judged against.
- A strict scorecard. Every session ends with scores out of 10 on four axes (problem solving, coding, communication, complexity analysis), notes on what you actually said and did in each phase, your weak areas, and the next problems to do.
- Your practice record. Sessions, average, streak and weakest areas, computed from the history stored in your own browser. No account and no invented numbers: when there is no history, the pages say what a first session looks like instead of showing fake stats.

One action per page:

- Home opens with a short hero (the product name, one line about the strict interviewer, two actions: browse problems or start), then the working desk: set up a session and start it. Below the form, problems are browsable by format with real counts from the bank, then your practice record and session history.
- The rooms run the interview. The transcript, the problem and the editor are the page; panel headers carry the session facts (interviewer, company, phase, timer).
- Feedback is a scorecard document: scores first as a table, then strengths and improvements as plain lists, then the next problems.
- Progress is one data page: a stat row, the score trend, per axis and per topic tables, and a plan for this week built from your weakest scores.

Reading order on every page: orientation first (where am I, whose session is this), then the primary content, then the one primary action, then secondary detail.

Structure rules: single surfaces with hairline dividers beat stacks of floating cards. Transcripts read as transcripts (name, then text), not chat bubbles. Every state is designed: loading, empty, error, disabled.

Copy rules: plain, short, and specific to this product. Every line has to pass the portability test: if it could sit unchanged on another product's page, it gets rewritten with a fact from this one (the 5 questions, the four score axes, the company names, the interviewers' names, the pushback on thin answers, the recorded hints). No filler words (leverage, robust, elevate and friends), no "not X, it's Y" contrasts, no slogans, no exclamation marks. Lines end on a fact or an action.

## Design system

Dark identity in the style of a problem bank: near-black surfaces, white text, one lime accent for actions and active states. Sans type throughout, no serif.

- Colours (tokens in `src/app/globals.css`): page background `#131315`, panel `#1B1B1D`, raised surface `#1E1E20`, tile `#29292D`, border `#2A2A2E`, text `#FFFFFF`, secondary text `#B0B0B0`, muted text `#909090`, accent lime `#B8F2A3` with dark ink text `#131315` on it. Lime carries primary buttons, the active tab underline, selected chips (on the lime tint `#1F362B`), links that act, the score trend line, high score bars and live indicators (speaking wave, listening and recording dots). Difficulty reads as a dot and text on a tint: Easy `#73C493` on `#1F362B`, Medium `#EAC762` on `#3E3217`, Hard `#FF6B5E` on `#40201A`. Stage pills have their own tints: Phone Screen `#9CC4FF` on `#103050`, Onsite `#CDB2F5` on `#302040`, OA `#F2C063` on `#403010`. Red appears only in error states and FAIL chips. The Monaco editor sits on the panel colour `#1B1B1D` with a `#29292D` line highlight. No gradients, no shadows.
- Type: Inter for everything. Headings are bold Inter with tight tracking via the `.font-display` class. Scale tokens: display 56px/1.05, h2 22px, body 15px, small 13px, caption 12px. Nothing renders under 12px. Scores, timers and counts use tabular figures (`.tnum`). Sentence case everywhere.
- Spacing and shape: an 8pt rhythm (4/8/12/16/24/32/48). One surface padding everywhere (`.card-pad`: 16px mobile, 20px desktop). A shared top nav (80px) sits on home, the problem bank, progress and system design over a 1340px column; the rooms and feedback keep their own session headers. Radius scale: pill buttons and selects, 12px surfaces, 16px dialogs (`.card-hero`, dialogs only). Buttons are at least 44px tall (40px for the small size) with designed hover, active, focus-visible and disabled states; a disabled button of any variant reads as a dark neutral tile. Transitions are 150 to 250ms ease-out on colour only. The only pulsing elements are the live dots and the speaking indicator.
- Layout: the home page is the only page that scrolls. The problem bank, feedback, progress, system design and the two interview rooms use fixed 100dvh shells with no page scroll; overflow lives inside internal panes only (the bank table, the feedback detail pane, the progress data cards, transcripts, the editor and run output).
- Problem bank (`/problems`, data in `src/lib/problemBank.ts`): real interview questions with the companies that ask them, a stage and topics per question. Format tabs carry counts computed from the dataset, and every count on the site is computed from the dataset or from the visitor's own session history, never typed in. A coding question that exists in the engine bank starts the coding room on that exact problem; other coding and general questions start a voice room set to that question; system design questions link to the system design page, which lists the same set with a Coming soon tag while those rooms are built.

## How to run

```bash
npm install
npm run dev
```

Open http://localhost:3000 in Chrome (voice input needs Chrome). Allow camera and mic when asked. Camera denial does not block the interview.

No API key is needed to run it: the local engine and browser voice cover everything. Add a `GEMINI_API_KEY` (see below) to switch the interviewer to real Gemini replies and the voice to Gemini TTS.

## How code running works

Code runs through the free Judge0 CE public API at https://ce.judge0.com (language ids 63 for JavaScript, 71 for Python, 62 for Java OpenJDK 13), with a 30 second timeout and per case results even when your code has a syntax or compile error. This needs internet. Note: the public Piston execute API became whitelist only in Feb 2026, so Judge0 is the primary runner in `src/lib/runner.ts`.

Each problem in `src/lib/problems.ts` defines a solution function name, test cases as function calls, the intended pattern, key points, and edge cases. The runner appends a small driver that calls your function with each test case's arguments and compares the JSON output. For Java you write a non-public `class Solution` with the problem's method; the runner adds the imports and a generated `Main` class that runs the cases and prints results in the same format (Group Anagrams groups are sorted inside and out before comparing). Run checks visible cases only. Submit checks all cases including hidden ones. Group Anagrams uses a sorted comparison because group order does not matter.

## How the AI interviewer works

The interviewer is Gemini first, with a local fallback. Both rooms call the server route `/api/interview`, and each response says which engine answered. The rooms show "AI: Gemini" or "AI: local mode", plus which voice is speaking.

With a Gemini key set, the route sends a strict interviewer prompt to Gemini (`gemini-2.5-flash`, with `gemini-2.0-flash` as a backup model) through the server helper in `src/lib/gemini.ts`. Thinking is disabled for these calls and the token limit is sized for short spoken replies, so answers arrive complete and fast. If a reply ever comes back cut off, it is treated as a failure and the local engine answers instead, so you never see half a sentence.

The route handles these modes:

- `general` - strict follow-up to a candidate answer in the live interview
- `approach` - reaction to the candidate's stated approach, plus one probing question
- `codewatch` - one counter question about what the candidate just wrote or deleted. If there is nothing worth asking, the reply is empty and the room stays silent
- `ask` - the candidate asks the AI something, like "give me a test case" (one concrete input and expected output), "hint" (difficulty rules apply, and it is recorded), or "what about empty input?"
- `complexity` - asks for, or checks, the time and space complexity of the final code. When a complexity was already stated during coding, the room completes this step with an engine template that confirms or corrects what you said, instead of asking again
- `feedback` - a short, honest spoken closing summary. The detailed scoring stays local
- `intro` - reaction to the candidate's self introduction at the opening
- `clarifying` - answers a clarifying question from the problem data (examples, constraints, edge case notes)
- `dryrun` - reacts to the candidate's spoken dry run of their code on an example input
- `candidate-question` - answers the candidate's own question about the role or team at the end, briefly and in character

Without a key, or if a Gemini call fails or times out, the route falls back to the local rule and state engine in `src/lib/interviewer.ts`, which implements the same strict behaviour: thin answer detection, brute force rejection, code watching from diffs, hint rules per difficulty, complexity checking against the problem data, and strict scoring.

## Environment variables

One optional variable, placeholder in `.env.example`:

- `GEMINI_API_KEY` - server side only, never sent to the browser. Powers Gemini interviewer replies (`/api/interview`), the Gemini voice (`/api/tts`), and Gemini Live ephemeral tokens (`/api/live-token`). Get a free key from Google AI Studio at https://aistudio.google.com/apikey - the free tier is fine.
  - Local dev: copy `.env.example` to `.env.local` and fill it in
  - Production: set it in the Vercel project under Settings - Environment Variables, then redeploy
- `GEMINI_LIVE_MODEL` - optional. Overrides the Gemini Live model name (default `gemini-2.5-flash-native-audio-preview-12-2025`) if Google renames or retires it.

Never commit a real key. Without a key the app still runs fully on the local engine and browser voice.

## Project structure

- `src/app/page.tsx` - home, setup (mode, difficulty, company, topic), history and progress trend
- `src/app/interview/general/page.tsx` - live AI interview room (also runs resume interviews)
- `src/app/interview/technical/page.tsx` - technical coding room
- `src/app/interview/feedback/page.tsx` - scored feedback, phase notes, model pointers, weak areas, next problems, session recording player
- `src/app/progress/page.tsx` - progress analytics: trend, streak, per topic and per axis averages, weekly plan
- `src/app/system-design/page.tsx` - system design room preview (Coming soon, not startable)
- `src/app/api/interview/route.ts` - interview API route, Gemini first with local engine fallback
- `src/app/api/resume-questions/route.ts` - generates resume interview questions (Gemini structured JSON, local extractor fallback)
- `src/app/api/tts/route.ts` - Gemini TTS route returning WAV audio, with a fallback signal when unavailable
- `src/app/api/live-token/route.ts` - mints short lived Gemini Live ephemeral tokens server side, with the session setup locked in
- `src/lib/gemini.ts` - server only Gemini API helper
- `src/lib/interviewApi.ts` - small client helper for calling `/api/interview`
- `src/lib/companies.ts` - company profiles: style, focus areas, behavioural themes, opening lines, per difficulty question banks, and the verdict framing used in feedback
- `src/lib/resume.ts` - resume question building: local project and skill extraction plus the client for `/api/resume-questions`
- `src/lib/analytics.ts` - progress analytics computed from local history (averages, streak, trend, weekly plan inputs)
- `src/lib/recording.ts` - self-review recording: MediaRecorder wrapper and raw IndexedDB storage, no network calls
- `src/lib/sounds.ts` and `src/lib/useMicOpenSound.ts` - the mic-open earcon (WebAudio) and the hook that fires it on mic gate transitions
- `src/lib/problems.ts` - 7 problems with starter code, test cases, patterns, key points and edge cases
- `src/lib/runner.ts` - Judge0 code runner and driver builder
- `src/lib/interviewer.ts` - local strict interviewer engine, code watching, complexity checking, scoring, session storage
- `src/lib/feedback.ts` - weak areas, next problem recommendations, phase by phase notes, company bar verdict
- `src/lib/liveSession.ts` - Gemini Live session manager for the opt-in experimental mode: WebSocket, mic streaming with playout gating, gapless audio playout, transcriptions
- `src/lib/sanitize.ts` - shared sanitizer that strips internal instruction markers from any AI text before it is shown, spoken, or saved
- `src/lib/voiceGate.ts` - the mic gating state machine shared by both rooms (pause while the interviewer speaks, resume just before the turn ends, interrupt, user mute wins)
- `src/lib/useVoice.ts` - Web Speech API voice input hook
- `src/lib/useSpeaker.ts` and `src/lib/voice.ts` - fallback voice output: Gemini TTS with parallel prefetch and caching first, improved browser voice after that
- `src/components/Camera.tsx` - camera preview with a designed off state and retry
- `src/components/SpeakingWave.tsx` - the speaking waveform shown in the AI panel header
- `src/components/LeaveModal.tsx` and `src/components/ConfirmModal.tsx` - the in-page dialogs for leaving a room and for ending an interview
- `src/components/Logo.tsx` and `src/components/Footer.tsx` - brand mark, wordmark and footer used across pages

## Roadmap

- The system design room itself (the preview page lists the first five topics)
- More problems, including Trees and DP topics
- Auth with GitHub and saving history to an account
- A larger problem set with per topic progression paths

## Known limits

- Voice input on the main path (Web Speech API) works in Chrome and Edge, not in all browsers. Gemini Live voice input works wherever WebSockets and mic access work. Typing always works.
- Gemini Live is experimental and opt-in, in the general room only. Sessions are capped by Google (about 15 minutes of audio per session today). If Live cannot connect, the room stays on the standard engine path and says so; the "End live and use standard mode" button returns you to it at any time.
- Gemini Live, Gemini TTS and Gemini replies need a `GEMINI_API_KEY` and internet. Without them the app uses the local engine and browser voice, which are less human.
- Code running needs internet for the Judge0 API, and the free public instance can rate limit under heavy use.
- Session history lives in your browser localStorage only, so it does not follow you across devices.
- Trees and DP topics do not have dedicated problems yet and fall back to the closest available problem.
