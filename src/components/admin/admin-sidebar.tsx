"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AppVersion from "./app-version";

interface MenuItem {
  href: string;
  label: string;
  icon: string;
  show?: boolean;
}

interface MenuGroup {
  label: string;
  icon: string;
  items: MenuItem[];
  show?: boolean;
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  // Bestimme welches Untermenü geöffnet sein sollte
  const getActiveSubmenu = (): string | null => {
    if (!pathname) return null;
    if (pathname.startsWith("/admin/pages") || pathname.startsWith("/admin/media") || 
        pathname.startsWith("/admin/signs") || pathname.startsWith("/admin/navigation")) {
      return "Content";
    }
    if (pathname.startsWith("/admin/video-courses") || pathname.startsWith("/admin/courses") || 
        pathname.startsWith("/admin/course-series") || pathname.startsWith("/admin/calendar")) {
      return "Kurse";
    }
    if (pathname.startsWith("/admin/bookings") || pathname.startsWith("/admin/invoices") || 
        pathname.startsWith("/admin/discounts")) {
      return "Buchungen & Zahlungen";
    }
    if (pathname.startsWith("/admin/settings") || pathname.startsWith("/admin/invoice-settings") ||
        pathname.startsWith("/admin/env") || pathname.startsWith("/admin/email-templates") ||
        pathname.startsWith("/admin/logs") || pathname.startsWith("/admin/users") ||
        pathname.startsWith("/admin/activity") || pathname.startsWith("/admin/cookies") ||
        pathname.startsWith("/admin/updates")) {
      return "System";
    }
    return null;
  };

  const [openSubmenu, setOpenSubmenu] = useState<string | null>(getActiveSubmenu());
  // Initial state muss auf Server und Client gleich sein (false)
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Lade collapsed state aus localStorage nach dem Mount
    const saved = localStorage.getItem("admin-sidebar-collapsed");
    if (saved === "true") {
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    setOpenSubmenu(getActiveSubmenu());
  }, [pathname]);

  useEffect(() => {
    // Speichere nur nach dem Mount, um Hydration-Mismatch zu vermeiden
    if (mounted) {
      localStorage.setItem("admin-sidebar-collapsed", collapsed.toString());
    }
  }, [collapsed, mounted]);

  const menuGroups: MenuGroup[] = [
    {
      label: "Content",
      icon: "📝",
      items: [
        { href: "/admin/pages", label: "Seiten", icon: "📄" },
        { href: "/admin/media", label: "Medien", icon: "🖼️" },
        { href: "/admin/signs", label: "Zeichen-Lexikon", icon: "👶" },
        { href: "/admin/navigation", label: "Navigation", icon: "🔗" },
      ],
    },
    {
      label: "Kurse",
      icon: "📚",
      items: [
        { href: "/admin/video-courses", label: "Videokurse", icon: "🎥" },
        { href: "/admin/courses", label: "Kurse", icon: "📅" },
        { href: "/admin/waitlist", label: "Warteliste", icon: "📋" },
        { href: "/admin/course-series", label: "Serien", icon: "🔄" },
        { href: "/admin/calendar", label: "Kalender", icon: "📆" },
      ],
    },
    {
      label: "Buchungen & Zahlungen",
      icon: "💰",
      items: [
        { href: "/admin/bookings", label: "Buchungen", icon: "📋" },
        { href: "/admin/invoices", label: "Rechnungen", icon: "🧾" },
        { href: "/admin/discounts", label: "Rabattcodes", icon: "🎟️", show: isAdmin },
      ],
    },
    {
      label: "System",
      icon: "⚙️",
      show: isAdmin,
      items: [
        { href: "/admin/settings", label: "Website-Einstellungen", icon: "🌐" },
        { href: "/admin/invoice-settings", label: "Rechnungseinstellungen", icon: "🧾" },
        { href: "/admin/email-templates", label: "E-Mail-Vorlagen", icon: "✉️" },
        { href: "/admin/cookies", label: "Cookies", icon: "🍪" },
        { href: "/admin/users", label: "Benutzer", icon: "👥" },
        { href: "/admin/activity", label: "Aktivitäten", icon: "📊" },
        { href: "/admin/logs", label: "System-Logs", icon: "📋" },
        { href: "/admin/env", label: "Environment", icon: "🔐" },
        { href: "/admin/updates", label: "Updates", icon: "⬆️" },
      ],
    },
  ];

  const isActive = (href: string): boolean => {
    if (!pathname) return false;
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  const toggleSubmenu = (groupLabel: string) => {
    setOpenSubmenu(openSubmenu === groupLabel ? null : groupLabel);
  };

  return (
    <aside className={`${collapsed ? "w-16" : "w-64"} bg-gray-900 text-white min-h-screen flex flex-col transition-all duration-300 relative`}>
      {/* Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 z-10 bg-gray-800 hover:bg-gray-700 text-white p-1.5 rounded-full border-2 border-gray-900 shadow-lg transition-colors"
        title={collapsed ? "Menü ausklappen" : "Menü einklappen"}
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>

      <div className={`p-6 border-b border-gray-800 ${collapsed ? "px-2" : ""}`}>
        <Link href="/admin" className="flex items-center justify-center">
          {collapsed ? (
            <span className="text-2xl">📊</span>
          ) : (
            <span className="text-xl font-bold text-rose-400">
              Admin Bereich
            </span>
          )}
        </Link>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {/* Dashboard */}
          <li>
            <Link
              href="/admin"
              className={`flex items-center ${collapsed ? "justify-center px-2" : "gap-3 px-4"} py-3 rounded-lg transition-colors ${
                pathname === "/admin"
                  ? "bg-rose-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
              title={collapsed ? "Dashboard" : undefined}
            >
              <span className="text-xl">📊</span>
              {!collapsed && <span className="font-medium">Dashboard</span>}
            </Link>
          </li>

          {/* Menu Groups */}
          {menuGroups.map((group) => {
            if (group.show === false) return null;

            const isGroupActive = openSubmenu === group.label;
            const hasActiveItem = group.items.some((item) => item.show !== false && isActive(item.href));

            return (
              <li key={group.label}>
                {collapsed ? (
                  // Collapsed: Show only icon with hover tooltip
                  <div className="relative group">
                    <button
                      onClick={() => toggleSubmenu(group.label)}
                      className={`w-full flex items-center justify-center px-2 py-3 rounded-lg transition-colors ${
                        hasActiveItem
                          ? "bg-rose-600/50 text-white"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      }`}
                    >
                      <span className="text-xl">{group.icon}</span>
                    </button>
                    {/* Tooltip on hover */}
                    <div className="absolute left-full ml-2 top-0 z-50 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                      <div className="font-medium mb-1">{group.label}</div>
                      {isGroupActive && (
                        <ul className="space-y-1">
                          {group.items.map((item) => {
                            if (item.show === false) return null;
                            return (
                              <li key={item.href}>
                                <div className={`flex items-center gap-2 px-2 py-1 rounded ${
                                  isActive(item.href) ? "text-rose-400" : "text-gray-300"
                                }`}>
                                  <span>{item.icon}</span>
                                  <span className="text-sm">{item.label}</span>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                    {/* Submenu when active (clickable) */}
                    {isGroupActive && (
                      <div className="absolute left-full ml-2 top-0 z-50 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg min-w-[200px]">
                        <div className="font-medium mb-2">{group.label}</div>
                        <ul className="space-y-1">
                          {group.items.map((item) => {
                            if (item.show === false) return null;
                            return (
                              <li key={item.href}>
                                <Link
                                  href={item.href}
                                  className={`flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-700 ${
                                    isActive(item.href) ? "text-rose-400" : "text-gray-300"
                                  }`}
                                >
                                  <span>{item.icon}</span>
                                  <span className="text-sm">{item.label}</span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  // Expanded: Show full menu
                  <>
                    <button
                      onClick={() => toggleSubmenu(group.label)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        hasActiveItem
                          ? "bg-rose-600/50 text-white"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      }`}
                    >
                      <span className="text-xl">{group.icon}</span>
                      <span className="font-medium flex-1 text-left">{group.label}</span>
                      <span className={`transform transition-transform ${isGroupActive ? "rotate-90" : ""}`}>
                        ▶
                      </span>
                    </button>

                    {isGroupActive && (
                      <ul className="ml-4 mt-1 space-y-1 border-l-2 border-gray-700 pl-2">
                        {group.items.map((item) => {
                          if (item.show === false) return null;
                          return (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                                  isActive(item.href)
                                    ? "bg-rose-600 text-white"
                                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                                }`}
                              >
                                <span className="text-lg">{item.icon}</span>
                                <span className="text-sm">{item.label}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={`p-4 border-t border-gray-800 ${collapsed ? "px-2" : ""}`}>
        <button
          onClick={() => signOut({ callbackUrl: typeof window !== "undefined" ? `${window.location.origin}/` : "/" })}
          className={`w-full flex items-center ${collapsed ? "justify-center px-2" : "gap-3 px-4"} py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors`}
          title={collapsed ? "Abmelden" : undefined}
        >
          <span className="text-xl">🚪</span>
          {!collapsed && <span className="font-medium">Abmelden</span>}
        </button>
        <Link
          href="/"
          className={`mt-2 w-full flex items-center ${collapsed ? "justify-center px-2" : "gap-3 px-4"} py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors`}
          title={collapsed ? "Zur Startseite" : undefined}
        >
          <span className="text-xl">🏠</span>
          {!collapsed && <span className="font-medium">Zur Startseite</span>}
        </Link>
        <AppVersion collapsed={collapsed} />
      </div>
    </aside>
  );
}
