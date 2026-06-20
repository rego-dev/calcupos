"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, Timer } from "lucide-react";
import Link from "next/link";
import EndShiftDialog from "./end-shift-dialog";
import { performLogout } from "../actions";

interface POSHeaderProps {
  userName: string;
  roleName: string;
  hasDashboardPermission: boolean;
}

export default function POSHeader({
  userName,
  roleName,
  hasDashboardPermission,
}: POSHeaderProps) {
  const [endShiftOpen, setEndShiftOpen] = useState(false);

  return (
    <>
      <header className="h-14 border-b flex items-center justify-between px-4 bg-card text-card-foreground shrink-0 shadow-sm border-border">
        <div className="flex items-center gap-4">
          <h1 className="font-nano text-lg font-bold tracking-[0.1em] bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 bg-clip-text text-transparent">
            FLOWCART SYNC
          </h1>
          <span className="text-sm text-muted-foreground font-medium pl-4 border-l border-border uppercase tracking-widest hidden sm:inline-block">
            Point of Sale
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium mr-2 max-w-[120px] truncate hidden md:block">
            <span className="opacity-60 text-xs uppercase tracking-wider block">
              {roleName}
            </span>
            {userName}
          </div>

          {hasDashboardPermission && (
            <Button asChild variant="outline" size="sm" className="hidden sm:flex">
              <Link href="/dashboard">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Back Office
              </Link>
            </Button>
          )}

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setEndShiftOpen(true)}
          >
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">End Shift</span>
          </Button>
        </div>
      </header>

      <EndShiftDialog
        open={endShiftOpen}
        onOpenChange={setEndShiftOpen}
        cashierName={userName}
        cashierRole={roleName}
      />
    </>
  );
}
