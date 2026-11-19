export type Difficulty = "Easy" | "Mid" | "Hard";
export type Lang = "javascript" | "python" | "java";

export type JavaKind = "intArray" | "boolIntArray" | "boolString" | "intString" | "groups" | "intervals" | "intIntArray";

export const LANGS: { id: Lang; label: string }[] = [
  { id: "javascript", label: "JavaScript" },
  { id: "python", label: "Python" },
  { id: "java", label: "Java" },
];

export function langLabel(lang: string | undefined): string {
  return LANGS.find((l) => l.id === lang)?.label || "JavaScript";
}

export interface TestCase {
  args: unknown[];
  expected: unknown;
  hidden?: boolean;
}

export interface Problem {
  id: string;
  title: string;
  difficulty: Difficulty;
  topic: string;
  statement: string;
  examples: { input: string; output: string; explanation?: string }[];
  constraints: string[];
  functionJs: string;
  functionPy: string;
  javaMethod: string;
  javaKind: JavaKind;
  starter: Record<Lang, string>;
  tests: TestCase[];
  compare: "exact" | "unorderedGroups";
  hints: Record<"Easy" | "Mid" | "Hard", string>;
  extraTest: TestCase & { note: string };
  emptyInputNote: string;
  complexity: string;
  pattern: string;
  keyPoints: string[];
  edgeCases: string[];
}

// Test cases are function calls: the runner appends a driver that calls
// functionJs/functionPy with each test args and compares JSON output.
export const problems: Problem[] = [
  {
    id: "two-sum",
    title: "Two Sum",
    difficulty: "Easy",
    topic: "HashMap",
    statement:
      "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume each input has exactly one solution, and you may not use the same element twice. Return the indices in ascending order.",
    examples: [
      { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "nums[0] + nums[1] = 9" },
      { input: "nums = [3,2,4], target = 6", output: "[1,2]" },
    ],
    constraints: ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "Only one valid answer exists"],
    functionJs: "twoSum",
    functionPy: "two_sum",
    javaMethod: "twoSum",
    javaKind: "intArray",
    starter: {
      javascript: "function twoSum(nums, target) {\n  \n}\n",
      python: "def two_sum(nums, target):\n    pass\n",
      java: "import java.util.*;\n\nclass Solution {\n  public int[] twoSum(int[] nums, int target) {\n    return new int[0];\n  }\n}\n",
    },
    tests: [
      { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { args: [[3, 2, 4], 6], expected: [1, 2] },
      { args: [[3, 3], 6], expected: [0, 1] },
      { args: [[-1, -2, -3, -4, -5], -8], expected: [2, 4], hidden: true },
      { args: [[0, 4, 3, 0], 0], expected: [0, 3], hidden: true },
    ],
    compare: "exact",
    hints: {
      Easy: "Use a Map. For each number x, check if target - x was already seen. If yes, return both indices. If no, store x with its index.",
      Mid: "Think about checking the complement of each number in a data structure with O(1) lookup.",
      Hard: "One pass. What do you store, and when do you check?",
    },
    extraTest: { args: [[5, 5, 5], 10], expected: [0, 1], note: "nums = [5,5,5], target = 10 should return [0,1]. Your code must not reuse the same index." },
    emptyInputNote: "The constraints say nums has at least 2 elements, so empty input will not be tested. Still, returning an empty array for that case is a safe guard.",
    complexity: "Expected: O(n) time and O(n) space with a hash map. Brute force is O(n^2) time.",
  pattern: "Hash map, one pass: store each value with its index, check the complement before inserting.",
  keyPoints: ["Check the complement (target - x) before storing x, so you never reuse the same index", "A Map gives O(1) average lookup, which is what turns O(n^2) into O(n)", "Return indices, not the values"],
  edgeCases: ["Duplicate values, like [3,3] with target 6", "Negative numbers and a negative target", "The pair can be at the very start or very end of the array"],
  },
  {
    id: "contains-duplicate",
    title: "Contains Duplicate",
    difficulty: "Easy",
    topic: "Arrays",
    statement:
      "Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.",
    examples: [
      { input: "nums = [1,2,3,1]", output: "true" },
      { input: "nums = [1,2,3,4]", output: "false" },
      { input: "nums = [1,1,1,3,3,4,3,2,4,2]", output: "true" },
    ],
    constraints: ["1 <= nums.length <= 10^5", "-10^9 <= nums[i] <= 10^9"],
    functionJs: "containsDuplicate",
    functionPy: "contains_duplicate",
    javaMethod: "containsDuplicate",
    javaKind: "boolIntArray",
    starter: {
      javascript: "function containsDuplicate(nums) {\n  \n}\n",
      python: "def contains_duplicate(nums):\n    pass\n",
      java: "import java.util.*;\n\nclass Solution {\n  public boolean containsDuplicate(int[] nums) {\n    return false;\n  }\n}\n",
    },
    tests: [
      { args: [[1, 2, 3, 1]], expected: true },
      { args: [[1, 2, 3, 4]], expected: false },
      { args: [[1, 1, 1, 3, 3, 4, 3, 2, 4, 2]], expected: true },
      { args: [[7]], expected: false, hidden: true },
      { args: [[-1, -2, -1]], expected: true, hidden: true },
      { args: [[0, 0]], expected: true, hidden: true },
    ],
    compare: "exact",
    hints: {
      Easy: "Use a Set. Walk the array once: if the number is already in the set, return true. Otherwise add it. At the end, return false.",
      Mid: "One pass with a structure that answers 'have I seen this' in O(1).",
      Hard: "Set, one pass. Justify why sorting is worse here.",
    },
    extraTest: { args: [[5, 4, 3, 2, 1, 5]], expected: true, note: "nums = [5,4,3,2,1,5] should return true, the duplicate is the first and last element." },
    emptyInputNote: "Constraints say nums has at least 1 element, but an empty array has no duplicates, so returning false for it is the safe behaviour.",
    complexity: "Expected: O(n) time and O(n) space with a hash set. Sorting first is O(n log n) time.",
    pattern: "Hash set, one pass: if the value is already in the set it is a duplicate, otherwise add it and continue.",
    keyPoints: ["A Set gives O(1) average membership checks, which is the whole problem", "You can return true the moment you see the second copy, no need to scan the rest", "Sorting also works but costs O(n log n) and mutates or copies the input"],
    edgeCases: ["A single element array has no duplicate", "The duplicate can be the first and last elements", "Negative numbers must work the same as positive ones"],
  },
  {
    id: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "Easy",
    topic: "Strings",
    statement:
      "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. A string is valid if open brackets are closed by the same type of bracket and in the correct order.",
    examples: [
      { input: 's = "()[]{}"', output: "true" },
      { input: 's = "(]"', output: "false" },
      { input: 's = "([)]"', output: "false" },
    ],
    constraints: ["1 <= s.length <= 10^4", "s consists of parentheses only"],
    functionJs: "isValid",
    functionPy: "is_valid",
    javaMethod: "isValid",
    javaKind: "boolString",
    starter: {
      javascript: "function isValid(s) {\n  \n}\n",
      python: "def is_valid(s):\n    pass\n",
      java: "import java.util.*;\n\nclass Solution {\n  public boolean isValid(String s) {\n    return false;\n  }\n}\n",
    },
    tests: [
      { args: ["()"], expected: true },
      { args: ["()[]{}"], expected: true },
      { args: ["(]"], expected: false },
      { args: ["([)]"], expected: false },
      { args: ["{[]}"], expected: true },
      { args: ["("], expected: false, hidden: true },
      { args: [")"], expected: false, hidden: true },
      { args: ["((()))"], expected: true, hidden: true },
    ],
    compare: "exact",
    hints: {
      Easy: "Use a stack. Push open brackets. On a close bracket, pop and check it matches. At the end the stack must be empty.",
      Mid: "The last opened bracket must be the first closed. Which data structure gives you that order?",
      Hard: "Stack. Watch the empty stack case on a closing bracket.",
    },
    extraTest: { args: ["{[()]}"], expected: true, note: "s = '{[()]}' is fully nested and should return true." },
    emptyInputNote: "An empty string has no unmatched brackets. Most solutions return true for it because the stack ends empty, but constraints say length is at least 1.",
    complexity: "Expected: O(n) time and O(n) space using a stack.",
  pattern: "Stack: push openers, and on a closer pop and check the match. Empty stack at the end means valid.",
  keyPoints: ["A closing bracket must match the most recent unmatched opener, which is exactly stack order", "A closer arriving on an empty stack is an automatic fail", "At the end the stack must be empty, not just free of mismatches"],
  edgeCases: ["A single opening bracket", "A closing bracket first", "Interleaved types like ([)] which must fail"],
  },
  {
    id: "longest-substring",
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Mid",
    topic: "Strings",
    statement:
      "Given a string s, find the length of the longest substring without repeating characters.",
    examples: [
      { input: 's = "abcabcbb"', output: "3", explanation: 'The answer is "abc", length 3' },
      { input: 's = "bbbbb"', output: "1" },
      { input: 's = "pwwkew"', output: "3", explanation: 'The answer is "wke", length 3' },
    ],
    constraints: ["0 <= s.length <= 5 * 10^4", "s consists of English letters, digits, symbols and spaces"],
    functionJs: "lengthOfLongestSubstring",
    functionPy: "length_of_longest_substring",
    javaMethod: "lengthOfLongestSubstring",
    javaKind: "intString",
    starter: {
      javascript: "function lengthOfLongestSubstring(s) {\n  \n}\n",
      python: "def length_of_longest_substring(s):\n    pass\n",
      java: "import java.util.*;\n\nclass Solution {\n  public int lengthOfLongestSubstring(String s) {\n    return 0;\n  }\n}\n",
    },
    tests: [
      { args: ["abcabcbb"], expected: 3 },
      { args: ["bbbbb"], expected: 1 },
      { args: ["pwwkew"], expected: 3 },
      { args: [""], expected: 0 },
      { args: ["dvdf"], expected: 3, hidden: true },
      { args: ["abba"], expected: 2, hidden: true },
      { args: [" "], expected: 1, hidden: true },
    ],
    compare: "exact",
    hints: {
      Easy: "Use a sliding window with a Map of last seen index. When you see a repeat inside the window, move the left edge past it and update the best length.",
      Mid: "Sliding window. The key decision is where to move the left pointer when a character repeats.",
      Hard: "Window plus last seen index. No nested scan.",
    },
    extraTest: { args: ["tmmzuxt"], expected: 5, note: "s = 'tmmzuxt' should give 5 ('mzuxt'). It catches windows that restart from the wrong place." },
    emptyInputNote: "Empty string is a real test case here and the answer is 0. Make sure your code returns 0 instead of crashing.",
    complexity: "Expected: O(n) time, O(min(n, alphabet)) space with sliding window.",
  pattern: "Sliding window with a map of last seen index: expand right, and when a repeat falls inside the window, jump the left edge past it.",
  keyPoints: ["The left edge only moves forward, which is what keeps it O(n)", "Only move left when the repeated character is inside the current window", "Track the best length after each step, not just at the end"],
  edgeCases: ["Empty string must return 0", "All same character, like bbbbb, must return 1", "Cases like abba and dvdf catch windows that restart from the wrong place"],
  },
  {
    id: "group-anagrams",
    title: "Group Anagrams",
    difficulty: "Mid",
    topic: "HashMap",
    statement:
      "Given an array of strings strs, group the anagrams together. You can return the answer in any order. The test checker sorts groups before comparing, so group order does not matter.",
    examples: [
      { input: 'strs = ["eat","tea","tan","ate","nat","bat"]', output: '[["bat"],["nat","tan"],["ate","eat","tea"]]' },
      { input: 'strs = [""]', output: '[[""]]' },
      { input: 'strs = ["a"]', output: '[["a"]]' },
    ],
    constraints: ["1 <= strs.length <= 10^4", "0 <= strs[i].length <= 100", "strs[i] consists of lowercase English letters"],
    functionJs: "groupAnagrams",
    functionPy: "group_anagrams",
    javaMethod: "groupAnagrams",
    javaKind: "groups",
    starter: {
      javascript: "function groupAnagrams(strs) {\n  \n}\n",
      python: "def group_anagrams(strs):\n    pass\n",
      java: "import java.util.*;\n\nclass Solution {\n  public List<List<String>> groupAnagrams(String[] strs) {\n    return new ArrayList<>();\n  }\n}\n",
    },
    tests: [
      { args: [["eat", "tea", "tan", "ate", "nat", "bat"]], expected: [["bat"], ["nat", "tan"], ["ate", "eat", "tea"]] },
      { args: [[""]], expected: [[""]] },
      { args: [["a"]], expected: [["a"]] },
      { args: [["ab", "ba", "abc", "cab", "xyz"]], expected: [["ab", "ba"], ["abc", "cab"], ["xyz"]], hidden: true },
      { args: [["", "", ""]], expected: [["", "", ""]], hidden: true },
    ],
    compare: "unorderedGroups",
    hints: {
      Easy: "Sort each word and use the sorted word as a Map key. Words with the same sorted form are anagrams, so push them into the same group.",
      Mid: "You need a key that is the same for all anagrams and different for non anagrams.",
      Hard: "Sorted string as key, or a 26 count tuple. Pick one and justify the cost.",
    },
    extraTest: { args: [["listen", "silent", "enlist", "hello"]], expected: [["listen", "silent", "enlist"], ["hello"]], note: "'listen', 'silent' and 'enlist' are one group, 'hello' is alone." },
    emptyInputNote: "An empty string is a valid word here and forms its own group. strs itself has at least 1 element by constraints.",
    complexity: "Expected: O(n * k log k) time where k is max word length, using sorting as the key.",
  pattern: "Hash map with a canonical key: the sorted word (or a 26 letter count) is the same for every anagram in a group.",
  keyPoints: ["The key must be identical for anagrams and different for non anagrams", "Sorting each word costs O(k log k); a letter count key costs O(k)", "Empty strings are valid words and group together"],
  edgeCases: ["An empty string in the input", "All words identical", "Words with the same letters but different lengths must not group"],
  },
  {
    id: "merge-intervals",
    title: "Merge Intervals",
    difficulty: "Mid",
    topic: "Arrays",
    statement:
      "Given an array of intervals where intervals[i] = [start, end], merge all overlapping intervals and return an array of the non-overlapping intervals that cover all the intervals in the input, sorted by start.",
    examples: [
      { input: "intervals = [[1,3],[2,6],[8,10],[15,18]]", output: "[[1,6],[8,10],[15,18]]" },
      { input: "intervals = [[1,4],[4,5]]", output: "[[1,5]]", explanation: "Intervals [1,4] and [4,5] are considered overlapping" },
    ],
    constraints: ["1 <= intervals.length <= 10^4", "intervals[i].length == 2", "0 <= start <= end <= 10^4"],
    functionJs: "merge",
    functionPy: "merge",
    javaMethod: "merge",
    javaKind: "intervals",
    starter: {
      javascript: "function merge(intervals) {\n  \n}\n",
      python: "def merge(intervals):\n    pass\n",
      java: "import java.util.*;\n\nclass Solution {\n  public int[][] merge(int[][] intervals) {\n    return new int[0][0];\n  }\n}\n",
    },
    tests: [
      { args: [[[1, 3], [2, 6], [8, 10], [15, 18]]], expected: [[1, 6], [8, 10], [15, 18]] },
      { args: [[[1, 4], [4, 5]]], expected: [[1, 5]] },
      { args: [[[1, 4], [0, 4]]], expected: [[0, 4]] },
      { args: [[[1, 4], [2, 3]]], expected: [[1, 4]], hidden: true },
      { args: [[[5, 6]]], expected: [[5, 6]], hidden: true },
      { args: [[[1, 10], [2, 3], [4, 5], [6, 7]]], expected: [[1, 10]], hidden: true },
    ],
    compare: "exact",
    hints: {
      Easy: "Sort by start time. Then walk once: if the current interval overlaps the last merged one, extend its end with max of both ends, otherwise push it.",
      Mid: "Sorting first makes this a single pass. What is the overlap condition after sorting?",
      Hard: "Sort by start, one pass, compare with the last output interval only.",
    },
    extraTest: { args: [[[1, 4], [0, 0]]], expected: [[0, 0], [1, 4]], note: "intervals = [[1,4],[0,0]] is unsorted input and should return [[0,0],[1,4]]." },
    emptyInputNote: "Constraints say at least 1 interval, but returning an empty array for empty input is the safe behaviour and costs one check.",
    complexity: "Expected: O(n log n) time for sorting, O(n) space for the output.",
  pattern: "Sort by start, then one pass: extend the last merged interval when the next one overlaps it, otherwise start a new one.",
  keyPoints: ["After sorting by start, you only ever compare against the last output interval", "Overlap after sorting means current start <= last end", "Extending uses max of both ends, because one interval can sit fully inside another"],
  edgeCases: ["Touching intervals like [1,4] and [4,5] count as overlapping", "One interval fully inside another", "Unsorted input, so never skip the sort"],
  },
  {
    id: "trapping-rain-water",
    title: "Trapping Rain Water",
    difficulty: "Hard",
    topic: "Two Pointers",
    statement:
      "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
    examples: [
      { input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]", output: "6" },
      { input: "height = [4,2,0,3,2,5]", output: "9" },
    ],
    constraints: ["n == height.length", "1 <= n <= 2 * 10^4", "0 <= height[i] <= 10^5"],
    functionJs: "trap",
    functionPy: "trap",
    javaMethod: "trap",
    javaKind: "intIntArray",
    starter: {
      javascript: "function trap(height) {\n  \n}\n",
      python: "def trap(height):\n    pass\n",
      java: "import java.util.*;\n\nclass Solution {\n  public int trap(int[] height) {\n    return 0;\n  }\n}\n",
    },
    tests: [
      { args: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], expected: 6 },
      { args: [[4, 2, 0, 3, 2, 5]], expected: 9 },
      { args: [[1, 2, 3]], expected: 0 },
      { args: [[3, 0, 3]], expected: 3, hidden: true },
      { args: [[5]], expected: 0, hidden: true },
      { args: [[2, 0, 2]], expected: 2, hidden: true },
    ],
    compare: "exact",
    hints: {
      Easy: "Water above a bar is min of the tallest bar on its left and right, minus its own height. The two pointer version keeps leftMax and rightMax and moves the smaller side.",
      Mid: "For each position, what limits the water level - the left side or the right side?",
      Hard: "Two pointers, move the side with the smaller max. No extra arrays needed.",
    },
    extraTest: { args: [[0, 2, 0]], expected: 0, note: "height = [0,2,0] traps 0 because there is no wall on the left of the dip." },
    emptyInputNote: "With fewer than 3 bars no water can be trapped, so the answer is 0. Two pointers handle this naturally if the loop condition is left < right.",
    complexity: "Expected: O(n) time and O(1) space with two pointers.",
  pattern: "Two pointers with leftMax and rightMax: the smaller side limits the water, so resolve that side and move it inward.",
  keyPoints: ["Water above a bar is min(left max, right max) minus the bar height", "You can decide a position as soon as one side's max is the smaller one", "The two pointer version needs O(1) extra space; precomputed max arrays cost O(n)"],
  edgeCases: ["Fewer than 3 bars trap nothing", "Strictly rising or falling ground traps nothing", "A dip at the edge traps nothing without a wall outside it"],
  },
];

export const topics = ["Arrays", "Strings", "HashMap", "Two Pointers", "Trees", "DP"];

const diffRank: Record<string, number> = { Easy: 0, Mid: 1, Hard: 2 };

export function pickProblem(topic: string, difficulty: string): Problem {
  const byTopic = problems.filter((p) => p.topic === topic);
  const exact = byTopic.find((p) => p.difficulty === difficulty);
  if (exact) return exact;
  if (byTopic.length) {
    const want = diffRank[difficulty] ?? 1;
    return [...byTopic].sort(
      (a, b) => Math.abs(diffRank[a.difficulty] - want) - Math.abs(diffRank[b.difficulty] - want)
    )[0];
  }
  const byDiff = problems.filter((p) => p.difficulty === difficulty);
  if (byDiff.length) return byDiff[0];
  return problems[0];
}

export function getProblemById(id: string | null | undefined): Problem | undefined {
  if (!id) return undefined;
  return problems.find((p) => p.id === id);
}

export function targetSecFor(type: "general" | "technical", difficulty: string, problem?: Problem): number {
  if (type === "general") return difficulty === "Hard" ? 35 * 60 : difficulty === "Easy" ? 20 * 60 : 25 * 60;
  const base = problem ? { Easy: 20, Mid: 30, Hard: 45 }[problem.difficulty] : 30;
  return base * 60;
}

export const progression: string[] = [
  "two-sum",
  "valid-parentheses",
  "longest-substring",
  "group-anagrams",
  "merge-intervals",
  "trapping-rain-water",
];
