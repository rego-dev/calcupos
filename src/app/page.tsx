import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { UserPermissions } from '@/lib/types'
import { RedirectFallback } from './root-redirect'

// Root entry point ("/"). This deliberately lives at the app root — NOT inside
// the (app) route group — because Next.js fails to emit a
// client-reference-manifest for a route group's *index* page, which makes
// `next start` crash with "The client reference manifest for route / does not
// exist". A top-level page avoids that bug. Since this page only ever redirects,
// it does not need the app shell provided by (app)/layout.tsx.
export default async function Home() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Cashiers go straight to the POS terminal.
  if (user.role?.name?.toLowerCase() === 'cashier') {
    redirect('/pos')
  }

  if (user.permissions?.dashboard) {
    redirect('/dashboard')
  }

  const availablePaths = [
    { key: 'orders', path: '/orders' },
    { key: 'inventory', path: '/inventory' },
    { key: 'branches', path: '/branches' },
    { key: 'customers', path: '/customers' },
    { key: 'stations', path: '/stations' },
    { key: 'warehouses', path: '/warehouses' },
    { key: 'preOrders', path: '/pre-orders' },
    { key: 'reports', path: '/reports' },
    { key: 'sales', path: '/sales' },
    { key: 'users', path: '/users' },
    { key: 'settings', path: '/settings' },
  ];

  const firstAvailable = availablePaths.find(p => user.permissions?.[p.key as keyof UserPermissions]);

  if (firstAvailable) {
    redirect(firstAvailable.path)
  }

  // No permitted section — hand off to the client to land on the profile page.
  return <RedirectFallback to="/profile" />
}
