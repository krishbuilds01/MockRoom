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

function jLit(v: unknown): string {
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) {
    if (!v.length) return "new int[0]";
    const first = v[0];
    if (typeof first === "number") return `new int[]{${v.join(",")}}`;
    if (typeof first === "string") return `new String[]{${v.map((x) => JSON.stringify(x)).join(",")}}`;
    if (Array.isArray(first)) {
      const inner = (first as unknown[])[0];
      if (typeof inner === "string") return `new String[][]{${v.map((a) => jLit(a)).join(",")}}`;
      if (Array.isArray(inner)) return `new String[][][]{${v.map((a) => jLit(a)).join(",")}}`;
      return `new int[][]{${v.map((a) => jLit(a)).join(",")}}`;
    }
  }
  return "null";
}

const JAVA_HELPERS = `
public class Main {
  static String esc(String s) {
    if (s == null) return "";
    return s.replace("\\\\", "\\\\\\\\").replace("\\"", "\\\\\\"").replace("\\n", " ");
  }
  static String arrJson(int[] a) {
    if (a == null) return "null";
    StringBuilder sb = new StringBuilder("[");
    for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(","); sb.append(a[i]); }
    return sb.append("]").toString();
  }
  static String gridJson(int[][] g) {
    if (g == null) return "null";
    StringBuilder sb = new StringBuilder("[");
    for (int i = 0; i < g.length; i++) { if (i > 0) sb.append(","); sb.append(arrJson(g[i])); }
    return sb.append("]").toString();
  }
  static java.util.List<java.util.List<String>> canonList(java.util.List<java.util.List<String>> in) {
    java.util.List<java.util.List<String>> out = new java.util.ArrayList<>();
    if (in != null) {
      for (java.util.List<String> g : in) {
        java.util.List<String> c = new java.util.ArrayList<>(g);
        java.util.Collections.sort(c);
        out.add(c);
      }
    }
    out.sort((a, b) -> String.join(",", a).compareTo(String.join(",", b)));
    return out;
  }
  static java.util.List<java.util.List<String>> expList(String[][] e) {
    java.util.List<java.util.List<String>> out = new java.util.ArrayList<>();
    for (String[] g : e) out.add(new java.util.ArrayList<>(java.util.Arrays.asList(g)));
    return out;
  }
  static String canonStr(java.util.List<java.util.List<String>> in) {
    java.util.List<java.util.List<String>> c = canonList(in);
    StringBuilder sb = new StringBuilder("[");
    for (int i = 0; i < c.size(); i++) {
      if (i > 0) sb.append(",");
      sb.append("[");
      java.util.List<String> g = c.get(i);
      for (int j = 0; j < g.size(); j++) {
        if (j > 0) sb.append(",");
        sb.append("\\"").append(esc(g.get(j))).append("\\"");
      }
      sb.append("]");
    }
    return sb.append("]").toString();
  }
`;

function javaTestBlock(problem: Problem, t: TestCase, i: number): string {
  const call = `sol.${problem.javaMethod}(${t.args.map(jLit).join(", ")})`;
  const exp = jLit(t.expected);
  let body = "";
  switch (problem.javaKind) {
    case "intArray":
      body = `int[] got = ${call}; boolean pass = java.util.Arrays.equals(got, ${exp}); System.out.println("__RESULT__{\\"index\\":${i},\\"got\\":" + arrJson(got) + ",\\"passed\\":" + pass + "}");`;
      break;
    case "boolIntArray":
    case "boolString":
      body = `boolean got = ${call}; boolean pass = got == ${exp}; System.out.println("__RESULT__{\\"index\\":${i},\\"got\\":" + got + ",\\"passed\\":" + pass + "}");`;
      break;
    case "intString":
    case "intIntArray":
      body = `int got = ${call}; boolean pass = got == ${exp}; System.out.println("__RESULT__{\\"index\\":${i},\\"got\\":" + got + ",\\"passed\\":" + pass + "}");`;
      break;
    case "groups":
      body = `java.util.List<java.util.List<String>> got = ${call}; String gotJson = canonStr(got); boolean pass = gotJson.equals(canonStr(expList(${exp}))); System.out.println("__RESULT__{\\"index\\":${i},\\"got\\":" + gotJson + ",\\"passed\\":" + pass + "}");`;
      break;
    case "intervals":
      body = `int[][] got = ${call}; boolean pass = java.util.Arrays.deepEquals(got, ${exp}); System.out.println("__RESULT__{\\"index\\":${i},\\"got\\":" + gridJson(got) + ",\\"passed\\":" + pass + "}");`;
      break;
  }
  return `    try { ${body} } catch (Throwable e) { System.out.println("__RESULT__{\\"index\\":${i},\\"got\\":null,\\"passed\\":false,\\"error\\":\\"" + esc(String.valueOf(e.getMessage())) + "\\"}"); }`;
}

function buildJavaSource(problem: Problem, code: string, tests: TestCase[]): string {
  const blocks = tests.map((t, i) => javaTestBlock(problem, t, i)).join("\n");
  const driver = `${JAVA_HELPERS}  public static void main(String[] args) {\n    Solution sol = new Solution();\n${blocks}\n  }\n}\n`;
  return "import java.util.*;\n" + code + "\n" + driver;
}

export function buildSource(problem: Problem, code: string, lang: Lang, tests: TestCase[]): string {
  if (lang === "java") return buildJavaSource(problem, code, tests);
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

// Primary runner: Judge0 CE public instance. Language ids: 63 = JavaScript, 71 = Python 3, 62 = Java (OpenJDK 13).
const JUDGE0_LANG: Record<Lang, number> = { javascript: 63, python: 71, java: 62 };
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
      body: JSON.stringify({ source_code: toB64(source), language_id: JUDGE0_LANG[lang] }),
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
