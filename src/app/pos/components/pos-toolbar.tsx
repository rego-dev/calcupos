"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Pencil,
  XCircle,
  Percent,
  Pause,
  Layers,
  ArrowUpDown,
  Tag,
  Banknote,
  ArrowLeftRight,
  Users,
  History,
  Ban,
  Undo2,
  Receipt,
  Search,
  DoorOpen,
  LucideIcon,
} from "lucide-react";

export type PosAction =
  | "editItem"
  | "cancel"
  | "discount"
  | "hold"
  | "holdTrans"
  | "quantity"
  | "editPrice"
  | "cashCount"
  | "cashTransfer"
  | "customer"
  | "recentSales"
  | "voidSales"
  | "returnSales"
  | "zReading"
  | "priceInquiry"
  | "openDrawer";

/* Full literal class strings (kept literal so Tailwind never purges them). */
const COLOR: Record<string, string> = {
  blue: "border-blue-500/60 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10",
  red: "border-red-500/60 text-red-600 dark:text-red-400 hover:bg-red-500/10",
  amber: "border-amber-500/60 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10",
  orange: "border-orange-500/60 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10",
  violet: "border-violet-500/60 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10",
  cyan: "border-cyan-500/60 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10",
  teal: "border-teal-500/60 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10",
  emerald: "border-emerald-500/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10",
  green: "border-green-500/60 text-green-600 dark:text-green-400 hover:bg-green-500/10",
  sky: "border-sky-500/60 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10",
  indigo: "border-indigo-500/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10",
  rose: "border-rose-500/60 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10",
  fuchsia: "border-fuchsia-500/60 text-fuchsia-600 dark:text-fuchsia-400 hover:bg-fuchsia-500/10",
  purple: "border-purple-500/60 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10",
  lime: "border-lime-500/60 text-lime-600 dark:text-lime-400 hover:bg-lime-500/10",
  pink: "border-pink-500/60 text-pink-600 dark:text-pink-400 hover:bg-pink-500/10",
};

type ButtonDef = { action: PosAction; label: string; key: string; color: string; icon: LucideIcon };

/*
 * Single line, left → right. The transaction actions (Edit Item … Edit Price)
 * have no keyboard shortcut; the station actions carry F1..F9.
 */
const ALL: ButtonDef[] = [
  { action: "editItem", label: "Edit Item", key: "", color: "blue", icon: Pencil },
  { action: "cancel", label: "Cancel", key: "", color: "red", icon: XCircle },
  { action: "discount", label: "Discount", key: "", color: "amber", icon: Percent },
  { action: "hold", label: "Hold", key: "", color: "orange", icon: Pause },
  { action: "holdTrans", label: "Hold Trans", key: "", color: "violet", icon: Layers },
  { action: "quantity", label: "+/- Qty", key: "", color: "cyan", icon: ArrowUpDown },
  { action: "editPrice", label: "Edit Price", key: "", color: "teal", icon: Tag },
  { action: "cashCount", label: "Cash Count", key: "F1", color: "emerald", icon: Banknote },
  { action: "cashTransfer", label: "Cash Transfer", key: "F2", color: "green", icon: ArrowLeftRight },
  { action: "customer", label: "Customer", key: "F3", color: "sky", icon: Users },
  { action: "recentSales", label: "Recent Sales", key: "F4", color: "indigo", icon: History },
  { action: "voidSales", label: "Void Sales", key: "F5", color: "rose", icon: Ban },
  { action: "returnSales", label: "Return Sales", key: "F6", color: "fuchsia", icon: Undo2 },
  { action: "zReading", label: "Z-Reading", key: "F7", color: "purple", icon: Receipt },
  { action: "priceInquiry", label: "Price Inquiry", key: "F8", color: "lime", icon: Search },
  { action: "openDrawer", label: "Open Drawer", key: "F9", color: "pink", icon: DoorOpen },
];

/** Single source of truth: lower-cased keyboard key -> POS action (skips unassigned). */
export const KEY_TO_ACTION: Record<string, PosAction> = ALL.reduce((acc, b) => {
  if (b.key) acc[b.key.toLowerCase()] = b.action;
  return acc;
}, {} as Record<string, PosAction>);

interface PosToolbarProps {
  onAction: (action: PosAction) => void;
  cartCount: number;
  hasSelection: boolean;
}

export function PosToolbar({ onAction, cartCount, hasSelection }: PosToolbarProps) {
  const needsSelection = (a: PosAction) => ["editItem", "editPrice", "quantity"].includes(a);
  const needsCart = (a: PosAction) => ["cancel", "discount", "hold"].includes(a);
  const isDisabled = (a: PosAction) =>
    (needsSelection(a) && !hasSelection) || (needsCart(a) && cartCount === 0);

  return (
    <div className="flex gap-1.5 w-full bg-card p-2 sm:p-3 rounded-2xl shadow-sm border border-border/50">
      {ALL.map((b) => {
        const Icon = b.icon;
        return (
          <Button
            key={b.action}
            variant="outline"
            className={`relative flex-1 min-w-0 h-14 sm:h-16 lg:h-[76px] flex-col gap-1 rounded-lg lg:rounded-xl border-2 px-1 text-[9px] sm:text-[10px] md:text-xs font-semibold ${COLOR[b.color]}`}
            disabled={isDisabled(b.action)}
            onClick={() => onAction(b.action)}
          >
            {b.key && (
              <kbd className="absolute top-0.5 right-0.5 text-[8px] sm:text-[10px] font-bold text-muted-foreground bg-muted rounded px-1 leading-4">
                {b.key}
              </kbd>
            )}
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 shrink-0" />
            <span className="text-foreground truncate max-w-full leading-tight">{b.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
