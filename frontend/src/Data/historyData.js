const DAY = 86400000;

export function makeSample(now) {
  const ago = (days, hours = 0) =>
    new Date(now - days * DAY - hours * 3600000).toISOString();

  return [
    {
      id: "ex-104",
      projectId: "dsa-practice",
      project: "DSA Practice",
      lang: "C++",
      status: "success",
      timeMs: 420,
      memoryMb: 18,
      at: ago(0, 1),
      code: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    vector<int> v{5, 10, 20, 30, 40};\n    int target = 30, lo = 0, hi = v.size() - 1;\n    while (lo <= hi) {\n        int mid = (lo + hi) / 2;\n        if (v[mid] == target) { cout << "Found at index " << mid; return 0; }\n        (v[mid] < target) ? lo = mid + 1 : hi = mid - 1;\n    }\n    cout << "Not found";\n}`,
      input: "5 10 20 30 40",
      output: "Found at index 3",
      error: "",
    },
    {
      id: "ex-103",
      projectId: "python-ml",
      project: "Python ML",
      lang: "Python",
      status: "success",
      timeMs: 1210,
      memoryMb: 96,
      at: ago(0, 3),
      code: `import statistics\n\nscores = [72, 88, 91, 65, 79]\nprint("mean:", statistics.mean(scores))\nprint("stdev:", round(statistics.stdev(scores), 2))`,
      input: "",
      output: "mean: 79\nstdev: 10.52",
      error: "",
    },
    {
      id: "ex-102",
      projectId: "java-labs",
      project: "Java Labs",
      lang: "Java",
      status: "failed",
      timeMs: 180,
      memoryMb: null,
      at: ago(2),
      code: `public class Main {\n    public static void main(String[] args) {\n        int total = 0\n        for (int i = 1; i <= 5; i++) total += i;\n        System.out.println(total);\n    }\n}`,
      input: "",
      output: "",
      error: `Main.java:3: error: ';' expected
        int total = 0
                     ^
1 error`,
    },
    {
      id: "ex-101",
      projectId: "web-project",
      project: "Web Project",
      lang: "JavaScript",
      status: "timeout",
      timeMs: 10000,
      memoryMb: 31,
      at: ago(3),
      code: `let n = 0;\nwhile (true) {\n  n++;\n}\nconsole.log(n);`,
      input: "",
      output: "",
      error: "Execution timed out after 10 seconds.",
    },
  ];
}

export const NAV = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    d: "M4 13h7V4H4v9Zm9 7h7V11h-7v9ZM4 20h7v-5H4v5Zm9-11h7V4h-7v5Z",
  },
  {
    id: "projects",
    label: "Projects",
    href: "/projects",
    d: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z",
  },
  {
    id: "editor",
    label: "Editor",
    href: "/editor",
    d: "m8 8-5 4 5 4M16 8l5 4-5 4M14 5l-4 14",
  },
  {
    id: "history",
    label: "History",
    href: "/history",
    d: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 8v4l3 2",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    d: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7-3a7 7 0 0 0-.1-1.2l-2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.3 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z",
  },
];

export const STATUS = {
  success: {
    label: "Success",
    d: "m5 12 5 5 9-10",
  },
  failed: {
    label: "Failed",
    d: "M6 6l12 12M18 6 6 18",
  },
  timeout: {
    label: "Timeout",
    d: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  },
};

export const DATE_OPTIONS = [
  { id: "all", label: "Any date" },
  { id: "today", label: "Today" },
  { id: "7", label: "Last 7 days" },
  { id: "30", label: "Last 30 days" },
];

export const DAY_MS = DAY;