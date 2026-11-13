export const DEFAULT_USER = {
  name: "Developer",
  email: "developer@email.com",
};

export const DEFAULT_SETTINGS = {
  theme: "dark",
  fontSize: 14,
  wordWrap: true,
  minimap: true,
  autoSave: true,
};

export const THEMES = {
  dark: {
    label: "Dark",
    bg: "#0b1424",
    fg: "#dbe5f6",
    dim: "#7f90ad",
    kw: "#ff9c86",
    gutter: "#4a5d80",
  },

  light: {
    label: "Light",
    bg: "#ffffff",
    fg: "#1b2740",
    dim: "#6b7a93",
    kw: "#c4321a",
    gutter: "#9aa7bd",
  },

  contrast: {
    label: "High contrast",
    bg: "#000000",
    fg: "#ffffff",
    dim: "#c8c8c8",
    kw: "#ffd75e",
    gutter: "#8a8a8a",
  },
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