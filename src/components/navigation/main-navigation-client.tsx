"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import TopContactBar from "./top-contact-bar";

interface NavigationItem {
  id: string;
  label: string;
  href: string | null;
  children?: NavigationItem[];
}

interface MainNavigationClientProps {
  items: NavigationItem[];
}

export default function MainNavigationClient({ items }: MainNavigationClientProps) {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [hoveredSubmenu, setHoveredSubmenu] = useState<string | null>(null);
  const [hoveredSubmenus, setHoveredSubmenus] = useState<Set<string>>(new Set());
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [siteName, setSiteName] = useState<string>("Familien Herz Zeit");
  const [mounted, setMounted] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const hoverTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    setMounted(true);
    // Lade Settings beim Mount
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setLogoUrl(data.header_logo_url || null);
        setSiteName(data.site_name || "Familien Herz Zeit");
      })
      .catch((err) => console.error("Fehler beim Laden der Settings:", err));
  }, []);

  // Schließe Dropdowns beim Klick außerhalb
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Prüfe ob der Klick außerhalb der Navigation war
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };

    if (openDropdown) {
      // Verwende setTimeout, um sicherzustellen, dass der Event Listener nach dem onClick des Buttons ausgeführt wird
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [openDropdown]);

  // Navigation nicht auf Admin-Seiten anzeigen
  // Warte auf Mount, um Hydration-Fehler zu vermeiden
  if (!mounted) {
    // Während SSR, zeige Navigation (wird auf Client gefiltert)
    return null;
  }

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  // Fallback auf leeres Array wenn keine Items
  const navItems = items || [];

  const closeAllMenus = () => {
    setOpenDropdown(null);
    setHoveredSubmenus(new Set());
    // Lösche alle Timeouts
    hoverTimeoutRef.current.forEach((timeout) => {
      clearTimeout(timeout);
    });
    hoverTimeoutRef.current.clear();
  };

  const isActive = (href?: string | null) => {
    if (!href) return false;
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  const renderMobileItem = (item: NavigationItem, level: number = 0): React.ReactNode => {
    const paddingLeft = level * 16;
    const hasSubmenu = item.children && item.children.length > 0;

    if (item.href && !hasSubmenu) {
      return (
        <Link
          key={item.id || `nav-${item.label}-${item.href ?? ""}`}
          href={item.href}
          className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
          style={{ paddingLeft: `${paddingLeft + 16}px` }}
          onClick={() => setOpenDropdown(null)}
        >
          {item.label}
        </Link>
      );
    }

    return (
      <div key={item.id || `nav-${item.label}-${item.href ?? ""}`}>
        {item.href ? (
          <Link
            href={item.href}
            className="block px-4 py-2 font-semibold text-gray-900 rounded"
            style={{ paddingLeft: `${paddingLeft + 16}px` }}
            onClick={() => setOpenDropdown(null)}
          >
            {item.label}
          </Link>
        ) : (
          <div
            className="px-4 py-2 font-semibold text-gray-900"
            style={{ paddingLeft: `${paddingLeft + 16}px` }}
          >
            {item.label}
          </div>
        )}
        {item.children?.map((child) => renderMobileItem(child, level + 1))}
      </div>
    );
  };

  const renderSubmenu = (item: NavigationItem, level: number = 0, parentId: string = ""): React.ReactNode => {
    const hasSubmenu = item.children && item.children.length > 0;
    const itemId = `${parentId}-${item.id || `${item.label}-${item.href ?? ""}`}`;
    const isOpen = openDropdown === itemId;
    const isHovered = hoveredSubmenus.has(itemId);

    if (item.href && !hasSubmenu) {
      // Einfacher Link
      const active = isActive(item.href);
      return (
        <Link
          key={itemId}
          href={item.href}
          className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
          onClick={closeAllMenus}
        >
          {item.label}
        </Link>
      );
    }

    // Dropdown mit möglichen Untermenüs
    const handleMouseEnter = () => {
      // Lösche eventuell vorhandenen Timeout für dieses Element
      const existingTimeout = hoverTimeoutRef.current.get(itemId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        hoverTimeoutRef.current.delete(itemId);
      }
      
      // Füge dieses Submenü und alle übergeordneten Submenüs hinzu
      setHoveredSubmenus((current) => {
        const newSet = new Set(current);
        newSet.add(itemId);
        // Füge auch alle Parent-IDs hinzu (damit übergeordnete Submenüs offen bleiben)
        // Die itemId hat das Format: "parentId-itemId", also müssen wir alle Präfixe hinzufügen
        if (parentId) {
          // Parent-ID ist bereits eine vollständige ID, füge sie hinzu
          newSet.add(parentId);
          // Füge auch alle weiteren Parent-IDs hinzu (rekursiv)
          // Die parentId kann selbst zusammengesetzt sein, z.B. "abc-def"
          // Wir müssen alle Präfixe hinzufügen: "abc-def", "abc"
          let currentParentId = parentId;
          while (currentParentId) {
            newSet.add(currentParentId);
            // Finde den nächsten Parent (alles vor dem letzten "-")
            const lastDashIndex = currentParentId.lastIndexOf('-');
            if (lastDashIndex > 0) {
              currentParentId = currentParentId.substring(0, lastDashIndex);
            } else {
              break;
            }
          }
        }
        return newSet;
      });
    };

    const handleMouseLeave = () => {
      // Verzögere das Schließen, damit man zum verschachtelten Submenü navigieren kann
      const timeout = setTimeout(() => {
        setHoveredSubmenus((current) => {
          const newSet = new Set(current);
          
          // Prüfe, ob es noch verschachtelte Submenüs gibt, die geöffnet sind
          // (d.h. Submenüs, die mit dieser itemId + "-" beginnen)
          const hasNestedOpen = Array.from(current).some(id => 
            id !== itemId && id.startsWith(itemId + '-')
          );
          
          // Wenn keine verschachtelten Submenüs offen sind, entferne dieses und alle untergeordneten
          if (!hasNestedOpen) {
            newSet.delete(itemId);
            // Entferne auch alle untergeordneten Submenüs
            Array.from(current).forEach(id => {
              if (id.startsWith(itemId + '-')) {
                newSet.delete(id);
              }
            });
          }
          
          return newSet;
        });
        hoverTimeoutRef.current.delete(itemId);
      }, 200);
      hoverTimeoutRef.current.set(itemId, timeout);
    };

    return (
      <div 
        key={itemId} 
        className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {item.href ? (
          <Link
            href={item.href}
            className="block px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center justify-between"
            onClick={closeAllMenus}
          >
            <span>{item.label}</span>
            {hasSubmenu && <span className="text-xs">▶</span>}
          </Link>
        ) : (
          <div className="px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center justify-between">
            <span>{item.label}</span>
            {hasSubmenu && <span className="text-xs">▶</span>}
          </div>
        )}
        {hasSubmenu && isHovered && (
          <>
            {/* Unsichtbarer Brückenbereich zwischen Menü und Submenu */}
            <div 
              className="absolute left-full top-0 w-2 h-full pointer-events-none"
              style={{ zIndex: 49 + level }}
            />
            {/* Submenu mit Überlappung nach oben, damit kein leerer Bereich entsteht */}
            <div 
              className="absolute left-[calc(100%-8px)] top-[-4px] bg-white rounded-lg shadow-lg border border-gray-200 min-w-[200px] py-2"
              style={{ zIndex: 50 + level }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {item.children!.map((child) => renderSubmenu(child, level + 1, itemId))}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderItem = (item: NavigationItem) => {
    const hasSubmenu = item.children && item.children.length > 0;
    const itemId = item.id || `${item.label}-${item.href ?? ""}`;
    const isOpen = openDropdown === itemId;

    if (item.href && !hasSubmenu) {
      // Einfacher Link
      const active = isActive(item.href);
      return (
        <Link
          key={itemId}
          href={item.href}
          className={`px-4 py-2 rounded-lg transition-colors ${
            active
              ? "bg-rose-500 text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
          onClick={closeAllMenus}
        >
          {item.label}
        </Link>
      );
    }

    // Dropdown
    return (
      <div key={itemId} className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpenDropdown(isOpen ? null : itemId);
          }}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-1 ${
            isOpen
              ? "bg-rose-500 text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          {item.label}
          <span className="text-xs">{isOpen ? "▲" : "▼"}</span>
        </button>
        {isOpen && hasSubmenu && (
          <div 
            className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[200px] py-2 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            {item.children!.map((subItem) => renderSubmenu(subItem, 1, itemId))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <TopContactBar />
      <nav ref={navRef} className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={siteName}
                  width={200}
                  height={50}
                  className="h-12 w-auto object-contain"
                  priority
                />
              ) : (
                <span className="text-2xl font-bold text-rose-500">
                  {siteName}
                </span>
              )}
            </Link>
            
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => renderItem(item))}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenDropdown(openDropdown ? null : "mobile");
                }}
                className="text-gray-700 hover:text-gray-900"
              >
                {openDropdown === "mobile" ? "✕" : "☰"}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {openDropdown === "mobile" && (
            <div 
              className="md:hidden border-t border-gray-200 py-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-2">
                {navItems.map((item) => renderMobileItem(item, 0))}
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}

