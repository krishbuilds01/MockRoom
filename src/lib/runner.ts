import type { Lang, Problem, TestCase } from "./problems";

export interface RunResult {
  index: number;
  args: unknown[];
  expected: unknown;
  got: unknown;
  passed: boolean;
  hidden?: boolean;
  error?: string;
}

export interface RunOutput {
  results: RunResult[];
  stdout: string;
  stderr: string;
  passed: number;
  total: number;
}

function buildJsSource(problem: Problem, code: string, tests: TestCase[]): string {
  const driver = `
const __tests = ${JSON.stringify(tests.map((t) => ({ args: t.args, expected: t.expected, hidden: !!t.hidden })))};
function __norm(v) {
  ${problem.compare === "unorderedGroups"
    ? "if (Array.isArray(v)) { return v.map(function(g){ return Array.isArray(g) ? g.slice().sort() : g; }).sort(function(a,b){ return JSON.stringify(a) < JSON.stringify(b) ? -1 : 1; }); } return v;"
    : "return v;"}
}
__tests.forEach(function(t, i) {
  try {
    const got = ${problem.functionJs}(...t.args.map(function(a){ return JSON.parse(JSON.stringify(a)); }));
    const pass = JSON.stringify(__norm(got)) === JSON.stringify(__norm(t.expected));
    console.log("__RESULT__" + JSON.stringify({ index: i, got: got === undefined ? null : got, passed: pass }));
  } catch (e) {
    console.log("__RESULT__" + JSON.stringify({ index: i, got: null, passed: false, error: String(e && e.message ? e.message : e) }));
  }
});
`;
  return code + "\n" + driver;
}

function buildPySource(problem: Problem, code: string, tests: TestCase[]): string {
  const payload = JSON.stringify(tests.map((t) => ({ args: t.args, expected: t.expected, hidden: !!t.hidden })));
  const driver = `
import json as __json
__tests = __json.loads(${JSON.stringify(payload)})
def __norm(v):
    ${problem.compare === "unorderedGroups"
      ? "return sorted([sorted(g) if isinstance(g, list) else g for g in v]) if isinstance(v, list) else v"
      : "return v"}
for __i, __t in enumerate(__tests):
    try:
        __args = __json.loads(__json.dumps(__t["args"]))
        __got = ${problem.functionPy}(*__args)
        __pass = __json.dumps(__norm(__got), sort_keys=True) == __json.dumps(__norm(__t["expected"]), sort_keys=True)
        print("__RESULT__" + __json.dumps({"index": __i, "got": __got, "passed": bool(__pass)}))
    except Exception as __e:
        print("__RESULT__" + __json.dumps({"index": __i, "got": None, "passed": False, "error": str(__e)}))
`;
  return code + "\n" + driver;
}

export function buildSource(problem: Problem, code: string, lang: Lang, tests: TestCase[]): string {
  return lang === "python" ? buildPySource(problem, code, tests) : buildJsSource(problem, code, tests);
}

function toB64(text: string): string {
  return btoa(unescape(encodeURIComponent(text)));
}

function fromB64(text: string | null | undefined): string {
  if (!text) return "";
  try {
    return decodeURIComponent(escape(atob(text)));
  } catch {
    return text;
  }
}

function parseOutput(problem: Problem, tests: TestCase[], stdout: string, stderr: string): RunOutput {
  const byIndex = new Map<number, { got: unknown; passed: boolean; error?: string }>();
  stdout.split("\n").forEach((line) => {
    const at = line.indexOf("__RESULT__");
    if (at >= 0) {
      try {
        const parsed = JSON.parse(line.slice(at + 10));
        byIndex.set(parsed.index, parsed);
      } catch {}
    }
  });
  const results: RunResult[] = tests.map((t, i) => {
    const r = byIndex.get(i);
    return {
      index: i,
      args: t.args,
      expected: t.expected,
      got: r ? r.got : null,
      passed: r ? !!r.passed : false,
      hidden: t.hidden,
      error: r?.error || (r ? undefined : "No output for this case. Check for syntax errors or a missing return."),
    };
  });
  return { results, stdout, stderr, passed: results.filter((r) => r.passed).length, total: results.length };
}

// Primary runner: Judge0 CE public instance. Language ids: 63 = JavaScript, 71 = Python 3.
export async function runCode(problem: Problem, code: string, lang: Lang, includeHidden: boolean): Promise<RunOutput> {
  const tests = includeHidden ? problem.tests : problem.tests.filter((t) => !t.hidden);
  const source = buildSource(problem, code, lang, tests);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  let res: Response;
  try {
    res = await fetch("https://ce.judge0.com/submissions?base64_encoded=true&wait=true", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_code: toB64(source), language_id: lang === "python" ? 71 : 63 }),
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("Judge0 timed out after 30 seconds. Try running again.");
    }
    throw new Error("Could not reach the code runner. Check your internet connection and try again.");
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 429) throw new Error("Judge0 is rate limiting right now. Wait a few seconds and run again.");
  if (!res.ok) throw new Error("Judge0 returned " + res.status + ". Try running again in a moment.");
  const data = await res.json().catch(() => null);
  if (!data) throw new Error("Judge0 returned an unreadable response. Try running again.");
  const stdout = fromB64(data?.stdout);
  const stderr = [fromB64(data?.compile_output), fromB64(data?.stderr), data?.message || ""].filter(Boolean).join("\n");
  return parseOutput(problem, tests, stdout, stderr);
}

// Kept for compatibility. The public Piston execute API is whitelist only,
// so this now delegates to the Judge0 runner above.
export const runWithPiston = runCode;
