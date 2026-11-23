# MockRoom

Free AI mock interviews. No account, no payment.

Live: https://ai-interview-platform-zeta-woad.vercel.app

Practice with two AI interviewers, Maya and Rohan. They ask questions, push back on weak answers, watch your code, and score you at the end.

## What you can do

- Live voice interview - 5 questions, follow-ups, scored feedback
- Technical interview - coding room with editor, test cases, and an interviewer who watches your code
- Resume interview - questions based on your own resume
- Company mode - Google, Amazon, Microsoft, Meta, Adobe, Flipkart, TCS, Infosys, Wipro
- Problem bank - 44 real interview questions at /problems
- Progress - scores, streak and weak areas at /progress, saved in your browser

Easy, Mid and Hard modes. Hard gives no hints.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 in Chrome. Voice input needs Chrome or Edge.

No API key is needed. The app runs fully on its local engine and browser voice.

Optional: add `GEMINI_API_KEY` in `.env.local` for Gemini replies and voice. Get a free key from https://aistudio.google.com/apikey

## Tech

Next.js, TypeScript, Tailwind CSS, Monaco Editor, Judge0 for code running, Edge TTS for voice.

Your sessions and resume stay in your browser. Nothing is uploaded.
