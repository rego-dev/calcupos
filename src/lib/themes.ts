export type ColorTheme = "gold" | "ocean" | "emerald" | "violet" | "rose" | "crimson";
export type ThemeMode = "light" | "dark";

export interface ColorThemeConfig {
  id: ColorTheme;
  name: string;
  hsl: string;
  preview: {
    darkBg: string;
    lightBg: string;
    darkSidebar: string;
    lightSidebar: string;
  };
}

export const colorThemes: ColorThemeConfig[] = [
  {
    id: "gold",
    name: "Gold",
    hsl: "43 80% 50%",
    preview: {
      darkBg: "#09090e",
      lightBg: "#faf9f5",
      darkSidebar: "#08080f",
      lightSidebar: "#0d0d14",
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    hsl: "210 80% 55%",
    preview: {
      darkBg: "#050e1a",
      lightBg: "#f2f7fc",
      darkSidebar: "#030a12",
      lightSidebar: "#0c1928",
    },
  },
  {
    id: "emerald",
    name: "Emerald",
    hsl: "158 65% 42%",
    preview: {
      darkBg: "#060f0b",
      lightBg: "#f3faf7",
      darkSidebar: "#040c07",
      lightSidebar: "#091510",
    },
  },
  {
    id: "violet",
    name: "Violet",
    hsl: "262 72% 56%",
    preview: {
      darkBg: "#09070f",
      lightBg: "#f5f3fb",
      darkSidebar: "#06040c",
      lightSidebar: "#100b1c",
    },
  },
  {
    id: "rose",
    name: "Rose",
    hsl: "346 78% 52%",
    preview: {
      darkBg: "#0f0608",
      lightBg: "#fdf3f5",
      darkSidebar: "#0c0407",
      lightSidebar: "#190b0f",
    },
  },
  {
    id: "crimson",
    name: "Crimson",
    hsl: "0 72% 48%",
    preview: {
      darkBg: "#0f0707",
      lightBg: "#faf4f4",
      darkSidebar: "#0c0505",
      lightSidebar: "#180a0a",
    },
  },
];

export function applyTheme(mode: ThemeMode, color: ColorTheme): void {
  const root = document.documentElement;
  if (mode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  if (color === "gold") {
    root.removeAttribute("data-color");
  } else {
    root.setAttribute("data-color", color);
  }
  localStorage.setItem("theme", mode);
  localStorage.setItem("colorTheme", color);
}

export function getStoredTheme(): { mode: ThemeMode; color: ColorTheme } {
  if (typeof window === "undefined") return { mode: "dark", color: "gold" };
  const mode = (localStorage.getItem("theme") as ThemeMode) || "dark";
  const color = (localStorage.getItem("colorTheme") as ColorTheme) || "gold";
  return { mode, color };
}
