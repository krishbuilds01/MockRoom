export type Difficulty = "Easy" | "Mid" | "Hard";
export type Lang = "javascript" | "python" | "java";

export type JavaKind = "intArray" | "boolIntArray" | "boolString" | "intString" | "groups" | "intervals" | "intIntArray" | "treeGroups";

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
  {
    id: "task-scheduler",
    title: "Task Scheduler",
    difficulty: "Mid",
    topic: "Heap",
    statement:
      "Given an array of tasks, each labelled with a capital letter, and a cooling interval n, find the least number of intervals the CPU needs to finish all tasks. In one interval the CPU either runs one task or stays idle. The same task must wait at least n intervals between two runs.",
    examples: [
      { input: 'tasks = ["A","A","A","B","B","B"], n = 2', output: "8", explanation: "A B idle A B idle A B" },
      { input: 'tasks = ["A","A","A","B","B","B"], n = 0', output: "6" },
      { input: 'tasks = ["A","A","A","A","A","A","B","C","D","E","F","G"], n = 2', output: "16" },
    ],
    constraints: ["1 <= tasks.length <= 10^4", "tasks[i] is an uppercase English letter", "0 <= n <= 100"],
    functionJs: "leastInterval",
    functionPy: "least_interval",
    javaMethod: "leastInterval",
    javaKind: "intIntArray",
    starter: {
      javascript: "function leastInterval(tasks, n) {\n  \n}\n",
      python: "def least_interval(tasks, n):\n    pass\n",
      java: "import java.util.*;\n\nclass Solution {\n  public int leastInterval(String[] tasks, int n) {\n    return 0;\n  }\n}\n",
    },
    tests: [
      { args: [["A", "A", "A", "B", "B", "B"], 2], expected: 8 },
      { args: [["A", "A", "A", "B", "B", "B"], 0], expected: 6 },
      { args: [["A", "A", "A", "A", "A", "A", "B", "C", "D", "E", "F", "G"], 2], expected: 16 },
      { args: [["A"], 5], expected: 1, hidden: true },
      { args: [["A", "A"], 3], expected: 5, hidden: true },
      { args: [["A", "B", "C", "D"], 2], expected: 4, hidden: true },
    ],
    compare: "exact",
    hints: {
      Easy: "Count the most frequent task, say it runs f times. It forces (f - 1) blocks of size n + 1, plus one slot for each task tied at frequency f. The answer is that, or the total task count if that is bigger.",
      Mid: "Only the highest frequency really matters. What schedule does the most frequent task force on its own?",
      Hard: "Greedy by count: (maxFreq - 1) * (n + 1) + countOfMax, floored at tasks.length.",
    },
    extraTest: { args: [["A", "A", "B", "B"], 2], expected: 5, note: "tasks = [A,A,B,B] with n = 2 runs A B idle A B, which is 5 intervals." },
    emptyInputNote: "Constraints say there is at least 1 task. A single task always takes exactly 1 interval, whatever n is.",
    complexity: "Expected: O(n) time to count frequencies and O(1) extra space beyond the 26 letter counts.",
    pattern: "Count frequencies: the most frequent task sets the frame, (maxFreq - 1) * (n + 1) + how many tasks share maxFreq, and never less than the total number of tasks.",
    keyPoints: ["Idle time only appears when the most frequent task has to wait out its cooldown", "Tasks tied at the max frequency each add one slot to the last block", "If there are enough other tasks, they fill every gap and the answer is just tasks.length"],
    edgeCases: ["n = 0 means no cooldown, answer is the task count", "A single task takes 1 interval", "All tasks different means no idle time"],
  },
  {
    id: "word-search",
    title: "Word Search",
    difficulty: "Mid",
    topic: "Backtracking",
    statement:
      "Given an m x n grid of characters board and a string word, return true if word exists in the grid. The word is built from letters of adjacent cells, where adjacent means horizontally or vertically neighbouring. The same cell may not be used more than once in one word.",
    examples: [
      { input: 'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCCED"', output: "true" },
      { input: 'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "SEE"', output: "true" },
      { input: 'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCB"', output: "false" },
    ],
    constraints: ["1 <= board.length, board[i].length <= 6", "1 <= word.length <= 15", "board and word consist of uppercase and lowercase English letters"],
    functionJs: "exist",
    functionPy: "exist",
    javaMethod: "exist",
    javaKind: "boolString",
    starter: {
      javascript: "function exist(board, word) {\n  \n}\n",
      python: "def exist(board, word):\n    pass\n",
      java: "import java.util.*;\n\nclass Solution {\n  public boolean exist(String[][] board, String word) {\n    return false;\n  }\n}\n",
    },
    tests: [
      { args: [[["A", "B", "C", "E"], ["S", "F", "C", "S"], ["A", "D", "E", "E"]], "ABCCED"], expected: true },
      { args: [[["A", "B", "C", "E"], ["S", "F", "C", "S"], ["A", "D", "E", "E"]], "SEE"], expected: true },
      { args: [[["A", "B", "C", "E"], ["S", "F", "C", "S"], ["A", "D", "E", "E"]], "ABCB"], expected: false },
      { args: [[["a"]], "a"], expected: true, hidden: true },
      { args: [[["A", "B"], ["C", "D"]], "ABCD"], expected: false, hidden: true },
      { args: [[["C", "A", "A"], ["A", "A", "A"], ["B", "C", "D"]], "AAB"], expected: true, hidden: true },
    ],
    compare: "exact",
    hints: {
      Easy: "Try every cell as the start. From a cell, DFS in four directions matching the next character. Mark the cell as visited while you explore it and unmark it when you backtrack.",
      Mid: "DFS with backtracking. The visited marking is the part people get wrong.",
      Hard: "Backtracking DFS, mark in place, restore on the way out.",
    },
    extraTest: { args: [[["A", "A"]], "AAA"], expected: false, note: "board = [[A,A]] with word 'AAA' must return false: there are only two cells and neither can be reused." },
    emptyInputNote: "The board always has at least one cell and the word at least one letter. A word longer than the number of cells can never match.",
    complexity: "Expected: O(m * n * 3^L) worst case where L is the word length, O(L) recursion space.",
    pattern: "Backtracking DFS from every cell: match one character, mark the cell visited, explore four neighbours, then restore the cell.",
    keyPoints: ["A cell can be used only once per path, so visited state must be tracked and undone on backtrack", "Fail fast: if the first letter does not match, do not start the DFS", "Diagonal moves do not count, only up, down, left and right"],
    edgeCases: ["A single cell board", "A word that needs the same cell twice must fail", "The path can turn, it does not have to be a straight line"],
  },
  {
    id: "sqrtx",
    title: "Sqrt(x)",
    difficulty: "Easy",
    topic: "Binary Search",
    statement:
      "Given a non-negative integer x, return the square root of x rounded down to the nearest integer. You may not use any built-in exponent function or operator, such as pow or **.",
    examples: [
      { input: "x = 4", output: "2" },
      { input: "x = 8", output: "2", explanation: "The square root of 8 is 2.828, rounded down to 2" },
    ],
    constraints: ["0 <= x <= 2^31 - 1"],
    functionJs: "mySqrt",
    functionPy: "my_sqrt",
    javaMethod: "mySqrt",
    javaKind: "intIntArray",
    starter: {
      javascript: "function mySqrt(x) {\n  \n}\n",
      python: "def my_sqrt(x):\n    pass\n",
      java: "import java.util.*;\n\nclass Solution {\n  public int mySqrt(int x) {\n    return 0;\n  }\n}\n",
    },
    tests: [
      { args: [4], expected: 2 },
      { args: [8], expected: 2 },
      { args: [1], expected: 1 },
      { args: [0], expected: 0 },
      { args: [2147395600], expected: 46340, hidden: true },
      { args: [15], expected: 3, hidden: true },
      { args: [99], expected: 9, hidden: true },
    ],
    compare: "exact",
    hints: {
      Easy: "Binary search the answer between 0 and x. For a mid value, compare mid * mid with x: if it equals x you are done, if it is smaller the answer is mid or higher, otherwise it is lower. Keep the last mid that was not too big.",
      Mid: "The answer itself is searchable. What does mid * mid tell you about which half to keep?",
      Hard: "Binary search on the answer. Watch out for mid * mid overflowing a 32 bit int.",
    },
    extraTest: { args: [2147483647], expected: 46340, note: "x = 2^31 - 1 should give 46340. It catches solutions where mid * mid overflows a 32 bit int." },
    emptyInputNote: "x can be 0, and the answer is 0. Make sure the search range handles it without a special case crash.",
    complexity: "Expected: O(log x) time and O(1) space with binary search.",
    pattern: "Binary search on the answer: find the largest r with r * r <= x.",
    keyPoints: ["The result is the floor, so you keep the best mid that does not overshoot", "mid * mid can overflow a 32 bit int near the top of the range; use a long or compare mid with x / mid", "x = 0 and x = 1 are their own answers"],
    edgeCases: ["x = 0 returns 0", "Perfect squares return the exact root", "The largest input, 2^31 - 1, returns 46340"],
  },
  {
    id: "max-points-on-a-line",
    title: "Max Points on a Line",
    difficulty: "Hard",
    topic: "Math",
    statement:
      "Given an array of points where points[i] = [xi, yi] is a point on the X-Y plane, return the maximum number of points that lie on the same straight line.",
    examples: [
      { input: "points = [[1,1],[2,2],[3,3]]", output: "3" },
      { input: "points = [[1,1],[3,2],[5,3],[4,1],[2,3],[1,4]]", output: "4" },
    ],
    constraints: ["1 <= points.length <= 300", "-10^4 <= xi, yi <= 10^4"],
    functionJs: "maxPoints",
    functionPy: "max_points",
    javaMethod: "maxPoints",
    javaKind: "intIntArray",
    starter: {
      javascript: "function maxPoints(points) {\n  \n}\n",
      python: "def max_points(points):\n    pass\n",
      java: "import java.util.*;\n\nclass Solution {\n  public int maxPoints(int[][] points) {\n    return 0;\n  }\n}\n",
    },
    tests: [
      { args: [[[1, 1], [2, 2], [3, 3]]], expected: 3 },
      { args: [[[1, 1], [3, 2], [5, 3], [4, 1], [2, 3], [1, 4]]], expected: 4 },
      { args: [[[0, 0]]], expected: 1 },
      { args: [[[1, 1], [1, 1], [2, 2]]], expected: 3, hidden: true },
      { args: [[[2, 3], [3, 3], [-5, 3]]], expected: 3, hidden: true },
      { args: [[[0, 0], [0, 1], [0, 2], [0, 3]]], expected: 4, hidden: true },
    ],
    compare: "exact",
    hints: {
      Easy: "Fix one point as the anchor. For every other point, compute the slope from the anchor as a reduced pair (dy/g, dx/g) with a fixed sign rule, and count equal slopes in a map. Points on the same line through the anchor share the slope. Duplicate points count separately.",
      Mid: "Anchor each point and group the others by slope. How do you represent a slope so 1/2 and 2/4 collide but floats never lie?",
      Hard: "Per anchor, hash reduced slope pairs. Handle duplicates and vertical lines inside the same scheme.",
    },
    extraTest: { args: [[[1, 1], [2, 2], [3, 3], [4, 4], [5, 6]]], expected: 4, note: "Four points sit on y = x and one is off it, so the answer is 4." },
    emptyInputNote: "With 1 or 2 points the answer is just the number of points, every pair forms a line.",
    complexity: "Expected: O(n^2) time and O(n) space, one slope map per anchor point.",
    pattern: "For each anchor point, count other points by reduced slope (dy, dx divided by gcd, sign normalised); the biggest slope group plus the anchor and its duplicates is a candidate answer.",
    keyPoints: ["Floating point slopes cause false matches and misses; a reduced integer pair is exact", "Normalise the sign, so slope (1, -1) and (-1, 1) are the same line direction", "Duplicate points lie on every line through the anchor and must be added to every count"],
    edgeCases: ["A single point returns 1", "Vertical lines have dx = 0 and must reduce cleanly", "Duplicate points at the anchor location"],
  },
  {
    id: "find-leaves",
    title: "Find Leaves of a Binary Tree",
    difficulty: "Mid",
    topic: "Trees",
    statement:
      "Given the root of a binary tree, collect its leaf nodes in rounds. In each round, remove the current leaves and record their values from left to right, then repeat with the smaller tree until it is empty. Return the list of rounds. The tree is given as a level order array where null marks a missing node, for example [1,2,3,4,5]. In Java the driver builds the TreeNode for you and your method receives the root.",
    examples: [
      { input: "root = [1,2,3,4,5]", output: "[[4,5,3],[2],[1]]" },
      { input: "root = [1]", output: "[[1]]" },
    ],
    constraints: ["The number of nodes in the tree is in the range [1, 100]", "-100 <= Node.val <= 100"],
    functionJs: "findLeaves",
    functionPy: "find_leaves",
    javaMethod: "findLeaves",
    javaKind: "treeGroups",
    starter: {
      javascript: "function findLeaves(tree) {\n  \n}\n",
      python: "def find_leaves(tree):\n    pass\n",
      java: "import java.util.*;\n\nclass Solution {\n  public List<List<Integer>> findLeaves(TreeNode root) {\n    return new ArrayList<>();\n  }\n}\n",
    },
    tests: [
      { args: [[1, 2, 3, 4, 5]], expected: [[4, 5, 3], [2], [1]] },
      { args: [[1]], expected: [[1]] },
      { args: [[1, 2, 3]], expected: [[2, 3], [1]] },
      { args: [[1, 2, null, 3]], expected: [[3], [2], [1]], hidden: true },
      { args: [[1, 2, 3, 4, null, null, 5]], expected: [[4, 5], [2, 3], [1]], hidden: true },
    ],
    compare: "unorderedGroups",
    hints: {
      Easy: "Compute the height of every node, where a leaf has height 0 and every other node is 1 + max of its children heights. A node's height is exactly the round in which it gets removed, so place its value in the group at that index.",
      Mid: "Repeatedly stripping leaves is slow to simulate. There is a single number per node that tells you its round directly.",
      Hard: "One post-order pass: group nodes by height above the leaves.",
    },
    extraTest: { args: [[1, 2, 3, 4, 5, 6, 7]], expected: [[4, 5, 6, 7], [2, 3], [1]], note: "A complete tree of 7 nodes loses all four leaves in round one, then both parents, then the root." },
    emptyInputNote: "The tree always has at least one node. A single node tree returns [[value]]: the root is also a leaf.",
    complexity: "Expected: O(n) time and O(n) space with one post-order traversal.",
    pattern: "Post-order height: a node's removal round equals its height above the leaves, so group values by that height.",
    keyPoints: ["Simulating round by round removal costs O(n^2) in the worst case; heights give the same answer in one pass", "Height here counts edges down to the nearest leaf, with leaves at 0", "The checker ignores order inside a round, but rounds themselves are ordered"],
    edgeCases: ["A single node is its own only round", "A skewed tree gives one node per round", "Nodes at the same height can sit in different subtrees"],
  },
  {
    id: "maximum-subarray",
    title: "Maximum Subarray",
    difficulty: "Easy",
    topic: "DP",
    statement:
      "Given an integer array nums, find the subarray with the largest sum and return its sum. A subarray is a contiguous part of the array.",
    examples: [
      { input: "nums = [-2,1,-3,4,-1,2,1,-5,4]", output: "6", explanation: "The subarray [4,-1,2,1] sums to 6" },
      { input: "nums = [1]", output: "1" },
      { input: "nums = [5,4,-1,7,8]", output: "23" },
    ],
    constraints: ["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"],
    functionJs: "maxSubArray",
    functionPy: "max_sub_array",
    javaMethod: "maxSubArray",
    javaKind: "intIntArray",
    starter: {
      javascript: "function maxSubArray(nums) {\n  \n}\n",
      python: "def max_sub_array(nums):\n    pass\n",
      java: "import java.util.*;\n\nclass Solution {\n  public int maxSubArray(int[] nums) {\n    return 0;\n  }\n}\n",
    },
    tests: [
      { args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6 },
      { args: [[1]], expected: 1 },
      { args: [[5, 4, -1, 7, 8]], expected: 23 },
      { args: [[-1]], expected: -1, hidden: true },
      { args: [[-3, -2, -1]], expected: -1, hidden: true },
      { args: [[2, -1, 2]], expected: 3, hidden: true },
    ],
    compare: "exact",
    hints: {
      Easy: "Walk once keeping the best sum of a subarray ending at the current position: either extend the previous run or start fresh at this number, whichever is bigger. Track the best seen anywhere.",
      Mid: "Kadane's idea: when does a running sum stop being worth carrying?",
      Hard: "One pass, current sum and best sum. The all negative case is the trap.",
    },
    extraTest: { args: [[-2, -1]], expected: -1, note: "nums = [-2,-1] should return -1, the single least negative element. Returning 0 here means an empty subarray slipped in." },
    emptyInputNote: "Constraints guarantee at least one element, and the subarray must be non-empty, so an all negative array returns its largest single element, not 0.",
    complexity: "Expected: O(n) time and O(1) space with Kadane's algorithm.",
    pattern: "Kadane's algorithm: current = max(nums[i], current + nums[i]), and the answer is the best current ever seen.",
    keyPoints: ["The subarray must be contiguous and non-empty", "A running sum that has gone negative can only hurt what comes next, so restart", "Initialise the answer with the first element, not 0, or all negative arrays break"],
    edgeCases: ["All negative numbers return the largest single element", "A single element array", "The best subarray can be the whole array"],
  },
  {
    id: "count-connected-components",
    title: "Count Connected Components",
    difficulty: "Easy",
    topic: "Graphs",
    statement:
      "You have a graph of n nodes labelled from 0 to n - 1 and a list of undirected edges, where edges[i] = [ai, bi] connects ai and bi. Return the number of connected components in the graph.",
    examples: [
      { input: "n = 5, edges = [[0,1],[1,2],[3,4]]", output: "2" },
      { input: "n = 5, edges = [[0,1],[1,2],[2,3],[3,4]]", output: "1" },
    ],
    constraints: ["1 <= n <= 2000", "0 <= edges.length <= 5000", "edges[i].length == 2", "0 <= ai, bi < n", "ai != bi, and there are no duplicate edges"],
    functionJs: "countComponents",
    functionPy: "count_components",
    javaMethod: "countComponents",
    javaKind: "intIntArray",
    starter: {
      javascript: "function countComponents(n, edges) {\n  \n}\n",
      python: "def count_components(n, edges):\n    pass\n",
      java: "import java.util.*;\n\nclass Solution {\n  public int countComponents(int n, int[][] edges) {\n    return 0;\n  }\n}\n",
    },
    tests: [
      { args: [5, [[0, 1], [1, 2], [3, 4]]], expected: 2 },
      { args: [5, [[0, 1], [1, 2], [2, 3], [3, 4]]], expected: 1 },
      { args: [4, [[0, 1], [2, 3]]], expected: 2 },
      { args: [3, [[0, 1], [0, 2]]], expected: 1, hidden: true },
      { args: [6, [[0, 1], [2, 3], [4, 5]]], expected: 3, hidden: true },
      { args: [2, [[0, 1]]], expected: 1, hidden: true },
    ],
    compare: "exact",
    hints: {
      Easy: "Start with n components. Union the two ends of every edge: if they were in different sets, merge them and drop the count by one. Union find with a parent array does this cleanly.",
      Mid: "Every successful union removes exactly one component. What structure tracks set membership?",
      Hard: "Union find, or DFS from every unvisited node. Either is fine, say why you picked yours.",
    },
    extraTest: { args: [4, [[0, 1], [1, 2]]], expected: 2, note: "n = 4 with a chain on 0, 1, 2 leaves node 3 alone, so the answer is 2, not 1." },
    emptyInputNote: "An empty edge list is possible in general: every node is then its own component and the answer is n. Isolated nodes always count.",
    complexity: "Expected: O(n + edges) time with union find, O(n) space.",
    pattern: "Union find: start at n components and subtract one for every edge that joins two different sets.",
    keyPoints: ["Isolated nodes are components too, which is why you start from n", "An edge inside one set changes nothing", "DFS or BFS from each unvisited node counts the same thing, one component per fresh start"],
    edgeCases: ["A node with no edges counts as a component", "No edges at all returns n", "One long chain across all nodes returns 1"],
  },
  {
    id: "lru-cache",
    title: "LRU Cache",
    difficulty: "Mid",
    topic: "Design",
    statement:
      "Design a least recently used (LRU) cache with a fixed capacity. Reading a key returns its value, or -1 if the key is absent, and marks the key as most recently used. Writing a key updates its value if present, otherwise inserts it, evicting the least recently used key first if the cache is full. To run your design here, implement the function lruCache(capacity, ops): ops is a list of operations where [1, key, value] means write and [0, key] means read. Return the results of the read operations, in order.",
    examples: [
      { input: "capacity = 2, ops = [[1,1,1],[1,2,2],[0,1],[1,3,3],[0,2],[1,4,4],[0,1],[0,3],[0,4]]", output: "[1,-1,-1,3,4]", explanation: "Reads return 1, then 2 and 1 are evicted in turn, so later reads of 2 and 1 give -1 while 3 and 4 give their values" },
      { input: "capacity = 1, ops = [[1,1,10],[0,1],[1,2,20],[0,1],[0,2]]", output: "[10,-1,20]" },
    ],
    constraints: ["1 <= capacity <= 3000", "0 <= key <= 10^4", "0 <= value <= 10^5", "At most 2 * 10^5 operations"],
    functionJs: "lruCache",
    functionPy: "lru_cache",
    javaMethod: "lruCache",
    javaKind: "intArray",
    starter: {
      javascript: "function lruCache(capacity, ops) {\n  \n}\n",
      python: "def lru_cache(capacity, ops):\n    pass\n",
      java: "import java.util.*;\n\nclass Solution {\n  public int[] lruCache(int capacity, int[][] ops) {\n    return new int[0];\n  }\n}\n",
    },
    tests: [
      { args: [2, [[1, 1, 1], [1, 2, 2], [0, 1], [1, 3, 3], [0, 2], [1, 4, 4], [0, 1], [0, 3], [0, 4]]], expected: [1, -1, -1, 3, 4] },
      { args: [1, [[1, 1, 10], [0, 1], [1, 2, 20], [0, 1], [0, 2]]], expected: [10, -1, 20] },
      { args: [2, [[1, 1, 1], [1, 2, 2], [0, 1], [1, 3, 3], [0, 2]]], expected: [1, -1] },
      { args: [2, [[1, 1, 1], [1, 1, 100], [0, 1]]], expected: [100], hidden: true },
      { args: [3, [[1, 1, 1], [1, 2, 2], [1, 3, 3], [1, 4, 4], [0, 1], [0, 2]]], expected: [-1, 2], hidden: true },
    ],
    compare: "exact",
    hints: {
      Easy: "Keep a hash map from key to node plus a doubly linked list ordered by recency. A read or write moves the node to the front; a write past capacity removes the tail node. In JavaScript a Map keeps insertion order, which can play the list's role.",
      Mid: "You need O(1) lookup and O(1) reordering. Which pair of structures gives both?",
      Hard: "Hash map plus doubly linked list. Reads refresh recency too, that is the part people forget.",
    },
    extraTest: { args: [2, [[1, 9, 9], [0, 9]]], expected: [9], note: "A single write then read must return the written value, 9." },
    emptyInputNote: "Reading a key that was never written returns -1, and that read does not change the recency order.",
    complexity: "Expected: O(1) average time per operation, O(capacity) space.",
    pattern: "Hash map for lookup plus a recency order (doubly linked list or ordered map): every access moves the key to most recent, eviction removes the least recent.",
    keyPoints: ["Both reads and writes count as use and refresh recency", "Writing an existing key updates the value and the recency, and never evicts", "Eviction happens only when a new key arrives at a full cache"],
    edgeCases: ["Capacity 1 evicts on every second distinct key", "Reading a missing key returns -1", "Updating a key in a full cache evicts nothing"],
  },
  {
    id: "course-schedule",
    title: "Course Schedule",
    difficulty: "Mid",
    topic: "Graphs",
    statement:
      "There are numCourses courses labelled 0 to numCourses - 1. Some courses need prerequisites: prerequisites[i] = [ai, bi] means you must take bi before ai. Return true if it is possible to finish all courses, and false otherwise.",
    examples: [
      { input: "numCourses = 2, prerequisites = [[1,0]]", output: "true" },
      { input: "numCourses = 2, prerequisites = [[1,0],[0,1]]", output: "false" },
    ],
    constraints: ["1 <= numCourses <= 2000", "0 <= prerequisites.length <= 5000", "prerequisites[i].length == 2", "0 <= ai, bi < numCourses", "All prerequisite pairs are unique"],
    functionJs: "canFinish",
    functionPy: "can_finish",
    javaMethod: "canFinish",
    javaKind: "boolIntArray",
    starter: {
      javascript: "function canFinish(numCourses, prerequisites) {\n  \n}\n",
      python: "def can_finish(numCourses, prerequisites):\n    pass\n",
      java: "import java.util.*;\n\nclass Solution {\n  public boolean canFinish(int numCourses, int[][] prerequisites) {\n    return false;\n  }\n}\n",
    },
    tests: [
      { args: [2, [[1, 0]]], expected: true },
      { args: [2, [[1, 0], [0, 1]]], expected: false },
      { args: [4, [[1, 0], [2, 0], [3, 1], [3, 2]]], expected: true },
      { args: [3, [[0, 1], [1, 2], [2, 0]]], expected: false, hidden: true },
      { args: [5, [[1, 4], [2, 4], [3, 1], [3, 2]]], expected: true, hidden: true },
      { args: [3, [[0, 1], [1, 2]]], expected: true, hidden: true },
    ],
    compare: "exact",
    hints: {
      Easy: "Model it as a graph and look for a cycle. Kahn's algorithm: compute indegrees, repeatedly take courses with indegree 0 and reduce their neighbours. If you can take all numCourses, return true.",
      Mid: "Finishing everything is impossible exactly when the graph has a cycle. Two standard ways to detect one here.",
      Hard: "Topological sort (Kahn or DFS states). A back edge means false.",
    },
    extraTest: { args: [4, [[1, 0], [2, 1], [3, 2]]], expected: true, note: "A plain chain, 0 before 1 before 2 before 3, has no cycle, so all 4 courses can be finished." },
    emptyInputNote: "An empty prerequisite list means any order works, so the answer is true. A self loop would be a cycle, but the constraints rule it out.",
    complexity: "Expected: O(courses + prerequisites) time and space.",
    pattern: "Cycle detection in a directed graph: topological sort succeeds for every course exactly when there is no cycle.",
    keyPoints: ["The pair [a, b] is an edge b -> a: b must come first", "A cycle anywhere makes the whole thing impossible, even if other courses are fine", "Kahn's algorithm and three colour DFS are both correct; pick one and be able to explain it"],
    edgeCases: ["No prerequisites returns true", "A two course cycle returns false", "Disconnected groups of courses are fine as long as none has a cycle"],
  },
  {
    id: "binary-tree-level-order",
    title: "Binary Tree Level Order Traversal",
    difficulty: "Mid",
    topic: "Trees",
    statement:
      "Given the root of a binary tree, return its node values level by level, left to right, as a list of lists. The tree is given as a level order array where null marks a missing node, for example [3,9,20,null,null,15,7]. In Java the driver builds the TreeNode for you and your method receives the root.",
    examples: [
      { input: "root = [3,9,20,null,null,15,7]", output: "[[3],[9,20],[15,7]]" },
      { input: "root = [1]", output: "[[1]]" },
    ],
    constraints: ["The number of nodes in the tree is in the range [0, 2000]", "-1000 <= Node.val <= 1000"],
    functionJs: "levelOrder",
    functionPy: "level_order",
    javaMethod: "levelOrder",
    javaKind: "treeGroups",
    starter: {
      javascript: "function levelOrder(tree) {\n  \n}\n",
      python: "def level_order(tree):\n    pass\n",
      java: "import java.util.*;\n\nclass Solution {\n  public List<List<Integer>> levelOrder(TreeNode root) {\n    return new ArrayList<>();\n  }\n}\n",
    },
    tests: [
      { args: [[3, 9, 20, null, null, 15, 7]], expected: [[3], [9, 20], [15, 7]] },
      { args: [[1]], expected: [[1]] },
      { args: [[1, 2, 3, 4, 5]], expected: [[1], [2, 3], [4, 5]] },
      { args: [[1, 2, null, 3, null, 4]], expected: [[1], [2], [3], [4]], hidden: true },
      { args: [[1, 2, 3, null, null, 4, 5]], expected: [[1], [2, 3], [4, 5]], hidden: true },
    ],
    compare: "exact",
    hints: {
      Easy: "Use a queue. Each round, note the queue size: that many nodes form the current level. Pop them, record values, and push their children for the next round.",
      Mid: "BFS with a queue. How do you know where one level ends and the next begins?",
      Hard: "Queue plus level size snapshot. DFS with a depth index also works.",
    },
    extraTest: { args: [[1, 2, 3, 4, 5, 6, 7]], expected: [[1], [2, 3], [4, 5, 6, 7]], note: "A complete tree of 7 nodes has levels of size 1, 2 and 4." },
    emptyInputNote: "An empty tree returns an empty list. The tests always pass at least one node, but a null root guard costs one line.",
    complexity: "Expected: O(n) time and O(n) space for the queue and output.",
    pattern: "Breadth first search with a queue, processing exactly one level per round by snapshotting the queue size.",
    keyPoints: ["The queue size at the start of a round is the level size; children pushed during the round belong to the next level", "Left child is queued before right child, which gives the left to right order", "Missing nodes (nulls in the input) never enter the queue"],
    edgeCases: ["A single node tree returns [[value]]", "A skewed tree returns one value per level", "Null children are skipped, not recorded"],
  },
  {
    id: "coin-change",
    title: "Coin Change",
    difficulty: "Mid",
    topic: "DP",
    statement:
      "Given an array of coin denominations and a total amount, return the fewest number of coins needed to make up that amount. You have an unlimited supply of each coin. If the amount cannot be made, return -1.",
    examples: [
      { input: "coins = [1,2,5], amount = 11", output: "3", explanation: "11 = 5 + 5 + 1" },
      { input: "coins = [2], amount = 3", output: "-1" },
      { input: "coins = [1], amount = 0", output: "0" },
    ],
    constraints: ["1 <= coins.length <= 12", "1 <= coins[i] <= 2^31 - 1", "0 <= amount <= 10^4"],
    functionJs: "coinChange",
    functionPy: "coin_change",
    javaMethod: "coinChange",
    javaKind: "intIntArray",
    starter: {
      javascript: "function coinChange(coins, amount) {\n  \n}\n",
      python: "def coin_change(coins, amount):\n    pass\n",
      java: "import java.util.*;\n\nclass Solution {\n  public int coinChange(int[] coins, int amount) {\n    return 0;\n  }\n}\n",
    },
    tests: [
      { args: [[1, 2, 5], 11], expected: 3 },
      { args: [[2], 3], expected: -1 },
      { args: [[1], 0], expected: 0 },
      { args: [[1, 2, 5], 100], expected: 20, hidden: true },
      { args: [[2, 5, 10, 1], 27], expected: 4, hidden: true },
      { args: [[3], 7], expected: -1, hidden: true },
    ],
    compare: "exact",
    hints: {
      Easy: "Build dp[a] = fewest coins for amount a, from 0 up to amount. dp[0] = 0, and for each amount try every coin c <= a: dp[a] = min(dp[a], dp[a - c] + 1). Start unreachable amounts at infinity and return -1 if the target stays unreachable.",
      Mid: "Unbounded knapsack over amounts. Greedy by biggest coin fails; where does it fail?",
      Hard: "DP over amount, min over coins. Sentinel for unreachable, not a big count that can win a min.",
    },
    extraTest: { args: [[1, 3, 4], 6], expected: 2, note: "coins = [1,3,4], amount = 6: greedy takes 4 + 1 + 1 (3 coins) but 3 + 3 needs only 2." },
    emptyInputNote: "Amount 0 always needs 0 coins, even before looking at the denominations.",
    complexity: "Expected: O(amount * coins) time and O(amount) space.",
    pattern: "Bottom up DP: dp[a] is the fewest coins for amount a, built from dp[a - c] + 1 over every coin c.",
    keyPoints: ["Greedy fails: [1,3,4] and amount 6 proves it", "Coins are unlimited, so each dp entry can reuse any coin any number of times", "Unreachable amounts must stay out of the min; use an infinity sentinel and convert to -1 at the end"],
    edgeCases: ["Amount 0 returns 0", "An amount no combination reaches returns -1", "A single coin denomination either divides the amount or fails"],
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
