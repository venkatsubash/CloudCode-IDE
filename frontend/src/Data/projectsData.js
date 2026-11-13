export const DEFAULT_PROJECTS = [
  {
    id: "dsa-practice",
    name: "DSA Practice",
    lang: "C++",
    files: 8,
    modified: "Today",
    modifiedAt: "2026-09-30",
  },
  {
    id: "python-ml",
    name: "Python ML",
    lang: "Python",
    files: 12,
    modified: "Yesterday",
    modifiedAt: "2026-09-29",
  },
  {
    id: "java-labs",
    name: "Java Labs",
    lang: "Java",
    files: 6,
    modified: "Sep 28",
    modifiedAt: "2026-09-28",
  },
  {
    id: "web-project",
    name: "Web Project",
    lang: "JavaScript",
    files: 14,
    modified: "Sep 25",
    modifiedAt: "2026-09-25",
  },
];

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
    d: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7-3a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.3 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z",
  },
];

export const COLUMNS = [
  {
    key: "name",
    label: "Project",
  },
  {
    key: "lang",
    label: "Language",
  },
  {
    key: "files",
    label: "Files",
  },
  {
    key: "modifiedAt",
    label: "Modified",
  },
];