"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Check, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { applyTheme, getStoredTheme, colorThemes } from "@/lib/themes";
import type { ThemeMode, ColorTheme, ColorThemeConfig } from "@/lib/themes";

export function AppearanceTab() {
  const [mode, setMode] = useState<ThemeMode>("dark");
  const [color, setColor] = useState<ColorTheme>("gold");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = getStoredTheme();
    setMode(stored.mode);
    setColor(stored.color);
  }, []);

  const handleMode = (m: ThemeMode) => {
    setMode(m);
    applyTheme(m, color);
  };

  const handleColor = (c: ColorTheme) => {
    setColor(c);
    applyTheme(mode, c);
  };

  const currentTheme = colorThemes.find((t) => t.id === color) ?? colorThemes[0];

  if (!mounted) {
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
  }

  return (
    <div className="space-y-10 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Palette className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Appearance</h2>
          <p className="text-sm text-muted-foreground">Personalize how the system looks for you</p>
        </div>
      </div>

      {/* Mode */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Mode</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Choose between light and dark appearance</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <ModeCard
            mode="light"
            label="Light"
            description="Clean & bright"
            selected={mode === "light"}
            onClick={() => handleMode("light")}
            bg={currentTheme.preview.lightBg}
            sidebar={currentTheme.preview.lightSidebar}
            accentHsl={currentTheme.hsl}
          />
          <ModeCard
            mode="dark"
            label="Dark"
            description="Easy on the eyes"
            selected={mode === "dark"}
            onClick={() => handleMode("dark")}
            bg={currentTheme.preview.darkBg}
            sidebar={currentTheme.preview.darkSidebar}
            accentHsl={currentTheme.hsl}
          />
        </div>
      </section>

      {/* Accent Color */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Accent Color</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Pick your preferred accent color — changes the entire color scheme</p>
        </div>
        <div className="flex flex-wrap gap-5">
          {colorThemes.map((theme) => (
            <ColorSwatch
              key={theme.id}
              theme={theme}
              selected={color === theme.id}
              onClick={() => handleColor(theme.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function ModeCard({
  mode,
  label,
  description,
  selected,
  onClick,
  bg,
  sidebar,
  accentHsl,
}: {
  mode: "light" | "dark";
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  bg: string;
  sidebar: string;
  accentHsl: string;
}) {
  const dark = mode === "dark";
  const textColor = dark ? "rgba(220,220,230,0.85)" : "rgba(20,20,30,0.75)";
  const barColor = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const barColor2 = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
  const borderColor = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-full rounded-xl border-2 p-3 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
        selected
          ? "border-primary shadow-lg shadow-primary/20"
          : "border-border hover:border-primary/40"
      )}
    >
      {/* Mini App Preview */}
      <div
        className="rounded-lg overflow-hidden mb-3"
        style={{ border: `1px solid ${borderColor}` }}
      >
        {/* Title bar */}
        <div
          className="flex items-center gap-1 px-2 py-1.5"
          style={{ backgroundColor: sidebar }}
        >
          <span className="w-2 h-2 rounded-full bg-red-400/70" />
          <span className="w-2 h-2 rounded-full bg-yellow-400/70" />
          <span className="w-2 h-2 rounded-full bg-green-400/70" />
        </div>
        {/* Layout */}
        <div className="flex h-20" style={{ backgroundColor: bg }}>
          {/* Sidebar */}
          <div className="w-10 flex-shrink-0 p-2 space-y-2" style={{ backgroundColor: sidebar }}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-1 rounded-full"
                style={{
                  backgroundColor:
                    i === 1 ? `hsl(${accentHsl})` : barColor,
                  opacity: i === 1 ? 0.9 : 1,
                }}
              />
            ))}
          </div>
          {/* Content */}
          <div className="flex-1 p-2.5 space-y-2">
            <div className="h-1.5 w-3/4 rounded-full" style={{ backgroundColor: barColor }} />
            <div className="h-1.5 w-1/2 rounded-full" style={{ backgroundColor: barColor2 }} />
            <div className="h-1.5 w-2/3 rounded-full" style={{ backgroundColor: barColor2 }} />
            <div
              className="h-3.5 w-12 rounded-md"
              style={{ backgroundColor: `hsl(${accentHsl})` }}
            />
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="flex items-center gap-2">
        {dark ? (
          <Moon className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        <div>
          <p className="text-sm font-medium leading-none">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>

      {selected && (
        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-3 h-3 text-primary-foreground" />
        </span>
      )}
    </button>
  );
}

function ColorSwatch({
  theme,
  selected,
  onClick,
}: {
  theme: ColorThemeConfig;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 group"
      title={theme.name}
    >
      <div
        className={cn(
          "w-11 h-11 rounded-full border-[3px] transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center shadow-sm",
          selected
            ? "border-foreground scale-110 shadow-md"
            : "border-transparent group-hover:border-foreground/30"
        )}
        style={{ backgroundColor: `hsl(${theme.hsl})` }}
      >
        {selected && <Check className="w-4 h-4 text-white drop-shadow" />}
      </div>
      <span
        className={cn(
          "text-xs transition-colors",
          selected
            ? "font-semibold text-foreground"
            : "text-muted-foreground group-hover:text-foreground"
        )}
      >
        {theme.name}
      </span>
    </button>
  );
}
