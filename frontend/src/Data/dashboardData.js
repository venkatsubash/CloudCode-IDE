export const DEFAULT_DATA = {
  userName: "Developer",

  stats: {
    projects: 12,
    executions: 87,
    success: 74,
    failed: 13,
  },

  projects: [
    {
      id: 1,
      name: "DSA Practice",
      lang: "C++",
      updated: "2h ago",
    },
    {
      id: 2,
      name: "Python ML",
      lang: "Python",
      updated: "1d ago",
    },
    {
      id: 3,
      name: "Java Labs",
      lang: "Java",
      updated: "2d ago",
    },
  ],

  executions: [
    {
      id: 1,
      project: "DSA Practice",
      lang: "C++",
      ok: true,
      time: "0.42s",
      date: "Today",
    },
    {
      id: 2,
      project: "Python ML",
      lang: "Python",
      ok: true,
      time: "1.2s",
      date: "Today",
    },
    {
      id: 3,
      project: "Java Labs",
      lang: "Java",
      ok: false,
      time: "0.8s",
      date: "Yesterday",
    },
  ],
};

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
    label: "Code editor",
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

export const NAV_BOTTOM = [
  {
    id: "profile",
    label: "Profile",
    href: "/profile",
    d: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0",
  },
  {
    id: "logout",
    label: "Log out",
    href: "/logout",
    d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  },
];