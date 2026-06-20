
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  LineChart,
  Settings,
  User,
  Boxes,
  ChevronDown,
  MapPin,
  Computer,
  Warehouse,
  TrendingUp,
} from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { UserPermissions } from "@/lib/types";
import { hasPermission } from "@/lib/permissions";

const navGroups = [
  {
    label: "Overview",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: <LayoutDashboard />,
        permission: "dashboard",
      },
    ],
  },
  {
    label: "Sales",
    items: [
      {
        href: "/pos",
        label: "POS",
        icon: <Computer />,
        permission: "orders",
      },
      {
        href: "/orders",
        label: "Orders",
        icon: <ShoppingCart />,
        permission: "orders",
      },
      {
        href: "/pre-orders",
        label: "Pre orders",
        icon: <ShoppingCart />,
        permission: "preOrders",
      },
    ],
  },
  {
    label: "Inventory",
    items: [
      {
        href: "/inventory",
        label: "Inventory",
        icon: <Boxes />,
        permission: "inventory",
      },
      {
        href: "/warehouses",
        label: "Warehouses",
        icon: <Warehouse />,
        permission: "warehouses",
      },
      {
        href: "/branches",
        label: "Branches",
        icon: <MapPin />,
        permission: "branches",
      },
    ],
  },
  {
    label: "Customers",
    items: [
      {
        href: "/customers",
        label: "Customers",
        icon: <Users />,
        permission: "customers",
      },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        href: "/reports",
        label: "Reports",
        icon: <LineChart />,
        permission: "reports",
      },
      {
        href: "/sales",
        label: "Sales",
        icon: <TrendingUp />,
        permission: "sales",
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        href: "/settings",
        label: "Settings",
        icon: <Settings />,
        permission: "settings",
      },
    ],
  },
];

const accountLinks = [
  {
    href: "/profile",
    label: "Profile",
    icon: <User />,
    permission: null, // Always visible
  },
];

interface NavLinksProps {
  permissions?: UserPermissions;
  role?: string;
}

export function NavLinks({ permissions, role }: NavLinksProps) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = React.useState(false);
  const [preOrdersOpen, setPreOrdersOpen] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    if (pathname.startsWith('/pre-orders')) {
      setPreOrdersOpen(true);
    }
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname.startsWith(href);
  };

  if (!isMounted) return null;

  const renderLink = (link: { href: string; label: string; icon: React.ReactNode; permission: string | null }) => {
    // Special handling for Pre-orders - make it collapsible
    if (link.href === '/pre-orders') {
      return (
        <Collapsible
          key={link.href}
          open={preOrdersOpen}
          onOpenChange={setPreOrdersOpen}
          className="group/collapsible"
        >
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                tooltip={link.label}
                isActive={isActive(link.href)}
              >
                {link.icon}
                <span>{link.label}</span>
                <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenu className="pl-4 border-l ml-4 mt-1">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === '/pre-orders/all'}
                    tooltip="All Pre-orders"
                  >
                    <Link href="/pre-orders/all">
                      <span>Orders</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === '/pre-orders/inventory'}
                    tooltip="Pre-order Inventory"
                  >
                    <Link href="/pre-orders/inventory">
                      <span>Item List</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );
    }

    // Regular menu items
    return (
      <SidebarMenuItem key={link.href}>
        <SidebarMenuButton
          asChild
          isActive={isActive(link.href)}
          tooltip={link.label}
        >
          <Link href={link.href}>
            {link.icon}
            <span>{link.label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <>
      {navGroups.map((group) => {
        const visibleItems = group.items.filter((link) =>
          hasPermission(link.href, permissions, role)
        );

        if (visibleItems.length === 0) return null;

        return (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleItems.map(renderLink)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        );
      })}

      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {accountLinks
              .filter((link) => hasPermission(link.href, permissions, role))
              .map(renderLink)}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  );
}
