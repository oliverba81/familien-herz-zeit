import { UserRole } from "@prisma/client";

/**
 * Policy-Funktionen: Welche Role darf was?
 * Gibt true/false zurück für konsistente Checks in UI & API
 */

export function canManagePages(role: UserRole): boolean {
  return role === "ADMIN" || role === "EDITOR";
}

export function canManageMedia(role: UserRole): boolean {
  return role === "ADMIN" || role === "EDITOR";
}

export function canManageCourses(role: UserRole): boolean {
  return role === "ADMIN" || role === "EDITOR";
}

export function canManageBookings(role: UserRole): boolean {
  return role === "ADMIN" || role === "EDITOR";
}

export function canManageVideoCourses(role: UserRole): boolean {
  return role === "ADMIN" || role === "EDITOR";
}

export function canManageSeries(role: UserRole): boolean {
  return role === "ADMIN" || role === "EDITOR";
}

export function canManageUsers(role: UserRole): boolean {
  return role === "ADMIN";
}

export function canManagePayments(role: UserRole): boolean {
  return role === "ADMIN";
}

export function canDeleteMedia(role: UserRole): boolean {
  return role === "ADMIN";
}

export function canDeleteCourses(role: UserRole): boolean {
  return role === "ADMIN";
}





