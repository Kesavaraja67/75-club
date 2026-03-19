import { Subject } from "@/lib/types";

/**
 * Core attendance calculation utilities.
 * Pure functions — no side effects, no network calls.
 * Easily unit-testable with Vitest.
 */

/**
 * Calculate attendance percentage for a single subject.
 * Returns 0 if no classes have been conducted yet.
 */
export function getAttendancePercentage(
  hoursPresent: number,
  totalHours: number
): number {
  if (totalHours <= 0) return 0;
  const pct = (hoursPresent / totalHours) * 100;
  return Math.min(Math.max(0, pct), 100);
}

/**
 * Calculate how many classes a student can still skip
 * while staying AT OR ABOVE the threshold percentage.
 *
 * Formula derivation:
 *   (hoursPresent) / (totalHours + bunked) >= threshold/100
 *   => bunked <= (hoursPresent * 100 - threshold * totalHours) / threshold
 *
 * Returns 0 if already below threshold or threshold is invalid.
 */
export function getSafeBunks(
  hoursPresent: number,
  totalHours: number,
  threshold: number
): number {
  if (threshold <= 0 || threshold > 100) return 0;
  if (totalHours === 0) return 0;
  const bunks = Math.floor(
    (hoursPresent * 100 - threshold * totalHours) / threshold
  );
  return Math.max(0, bunks);
}

/**
 * Calculate how many consecutive classes a student must attend
 * to reach the threshold percentage from a below-threshold state.
 *
 * Formula derivation:
 *   (hoursPresent + required) / (totalHours + required) >= threshold/100
 *   => required >= (threshold * totalHours - hoursPresent * 100) / (100 - threshold)
 *
 * Returns 0 if already meeting threshold.
 */
export function getRequiredClasses(
  hoursPresent: number,
  totalHours: number,
  threshold: number
): number {
  if (threshold <= 0 || threshold >= 100) return 0;
  const currentPct = getAttendancePercentage(hoursPresent, totalHours);
  if (currentPct >= threshold) return 0;
  const required = Math.ceil(
    (threshold * totalHours - hoursPresent * 100) / (100 - threshold)
  );
  return Math.max(0, required);
}

/**
 * Determine the status of an attendance record.
 * safe    → at or above threshold with bunk room
 * warning → at or above threshold but no bunk room
 * danger  → below threshold
 */
export function getAttendanceStatus(
  hoursPresent: number,
  totalHours: number,
  threshold: number
): "safe" | "warning" | "danger" {
  if (totalHours === 0) return "warning";
  const pct = getAttendancePercentage(hoursPresent, totalHours);
  if (pct < threshold) return "danger";
  const bunks = getSafeBunks(hoursPresent, totalHours, threshold);
  return bunks > 0 ? "safe" : "warning";
}

/**
 * Aggregate stats across an array of subjects.
 * Used by StatsGrid.
 */
export interface AttendanceStats {
  totalClasses: number;
  totalPresent: number;
  overallPercentage: number;
  atRiskCount: number;
  safeCount: number;
}

export function getAggregateStats(subjects: Subject[]): AttendanceStats {
  // Normalize subject data defensively
  const normalizedSubjects = subjects.map((s) => {
    const totalHours = Math.max(0, s.totalHours);
    // Clamp hoursPresent to be between 0 and totalHours
    const hoursPresent = Math.min(Math.max(0, s.hoursPresent), totalHours);
    return { ...s, totalHours, hoursPresent };
  });

  const totalClasses = normalizedSubjects.reduce((acc, s) => acc + s.totalHours, 0);
  const totalPresent = normalizedSubjects.reduce((acc, s) => acc + s.hoursPresent, 0);
  const overallPercentage =
    totalClasses > 0 ? (totalPresent / totalClasses) * 100 : 0;

  const atRiskCount = normalizedSubjects.filter((s) => {
    if (s.totalHours === 0) return false;
    return getAttendancePercentage(s.hoursPresent, s.totalHours) < s.threshold;
  }).length;

  const safeCount = normalizedSubjects.filter((s) => {
    if (s.totalHours === 0) return false;
    const pct = getAttendancePercentage(s.hoursPresent, s.totalHours);
    const bunks = getSafeBunks(s.hoursPresent, s.totalHours, s.threshold);
    return pct >= s.threshold && bunks > 0;
  }).length;

  return { totalClasses, totalPresent, overallPercentage, atRiskCount, safeCount };
}
