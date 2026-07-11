"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Client-side redirect used by the app root page's final fallback.
//
// Beyond performing the navigation, importing and rendering this "use client"
// component gives the root page's module graph a client reference so Next.js
// emits its `page_client-reference-manifest.js`. Without one, `next start`
// crashes with "The client reference manifest for route / does not exist".
export function RedirectFallback({ to }: { to: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(to);
  }, [to, router]);

  return null;
}
