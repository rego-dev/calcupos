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
    <div className={cn("flex items-center", className)} suppressHydrationWarning>
      {isMounted && (
        <>
          <img
            src="/images/logo.png"
            alt="FlowCart Sync"
            className="hidden h-10 w-10 rounded-full object-cover shadow-sm group-data-[collapsible=icon]:block"
          />
          <img
            src="/logo.png"
            alt="FlowCart Sync"
            className="h-9 w-auto object-contain group-data-[collapsible=icon]:hidden"
          />
        </>
      )}
    </div>
  )
}
