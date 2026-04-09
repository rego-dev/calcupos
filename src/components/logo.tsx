"use client";

import { useEffect, useState } from 'react'
import { Boxes } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <div className={cn("flex items-center gap-3", className)} suppressHydrationWarning>
      {isMounted && (
        <img
          src="/images/logo.png"
          alt="CalcuPOS Logo"
          className="h-10 w-10 rounded-full object-cover shadow-sm"
        />
      )}
      <span className="group-data-[collapsible=icon]:hidden text-[23px] font-vintage bg-gradient-to-r from-cyan-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-md tracking-wide">
        CalcuPOS OMS
      </span>
    </div>
  )
}
