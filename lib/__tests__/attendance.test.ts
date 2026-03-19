import { describe, it, expect } from "vitest";
import {
  getAttendancePercentage,
  getSafeBunks,
  getRequiredClasses,
  getAttendanceStatus,
  getAggregateStats,
} from "../attendance";
import { Subject } from "../types";

// ─── getAttendancePercentage ──────────────────────────────────────────────────

describe("getAttendancePercentage", () => {
  it("returns 75% for 30 present out of 40 total", () => {
    expect(getAttendancePercentage(30, 40)).toBe(75);
  });

  it("returns 100% when fully present", () => {
    expect(getAttendancePercentage(10, 10)).toBe(100);
  });

  it("returns 0% when no classes attended", () => {
    expect(getAttendancePercentage(0, 40)).toBe(0);
  });

  it("returns 0 when total classes is 0 (no division by zero)", () => {
    expect(getAttendancePercentage(0, 0)).toBe(0);
  });

  it("handles fractional percentages", () => {
    expect(getAttendancePercentage(1, 3)).toBeCloseTo(33.33, 1);
  });
});

// ─── getSafeBunks ─────────────────────────────────────────────────────────────

describe("getSafeBunks", () => {
  it("allows 2 bunks with 80% attendance at 75% threshold", () => {
    // 32 present, 40 total → 80%, threshold 75%
    // (32*100 - 75*40) / 75 = (3200 - 3000)/75 = 200/75 = 2.66 → floor = 2
    // Wait: the formula gives floor((32*100 - 75*40)/75) = floor(200/75) = 2
    expect(getSafeBunks(32, 40, 75)).toBe(2);
  });

  it("allows 0 safe bunks when exactly at threshold", () => {
    // 30 present, 40 total → 75%, threshold 75%
    // (30*100 - 75*40) / 75 = (3000 - 3000)/75 = 0
    expect(getSafeBunks(30, 40, 75)).toBe(0);
  });

  it("returns 0 when below threshold", () => {
    // 20 present, 40 total → 50%, below 75%
    expect(getSafeBunks(20, 40, 75)).toBe(0);
  });

  it("returns 0 when totalHours is 0", () => {
    expect(getSafeBunks(0, 0, 75)).toBe(0);
  });

  it("returns 0 for invalid threshold (0)", () => {
    expect(getSafeBunks(30, 40, 0)).toBe(0);
  });

  it("returns 0 for invalid threshold (>100)", () => {
    expect(getSafeBunks(30, 40, 110)).toBe(0);
  });

  it("handles 90% threshold strictly", () => {
    // 45 present, 50 total → 90%, threshold 90%
    // (45*100 - 90*50)/90 = (4500-4500)/90 = 0
    expect(getSafeBunks(45, 50, 90)).toBe(0);
  });

  it("returns correct bunks for high attendance", () => {
    // 50 present, 50 total → 100%, threshold 75%
    // (50*100 - 75*50)/75 = (5000-3750)/75 = 1250/75 = 16.66 → 16
    expect(getSafeBunks(50, 50, 75)).toBe(16);
  });
});

// ─── getRequiredClasses ───────────────────────────────────────────────────────

describe("getRequiredClasses", () => {
  it("returns 0 when already above threshold", () => {
    expect(getRequiredClasses(30, 40, 75)).toBe(0);
  });

  it("returns 0 when exactly at threshold", () => {
    expect(getRequiredClasses(30, 40, 75)).toBe(0);
  });

  it("calculates classes needed to recover from 50% to 75%", () => {
    // 20 present, 40 total → 50%, need 75%
    // required = ceil((75*40 - 20*100) / (100-75)) = ceil((3000-2000)/25) = ceil(40) = 40
    expect(getRequiredClasses(20, 40, 75)).toBe(40);
  });

  it("calculates classes needed from zero attendance", () => {
    // 0 present, 10 total → 0%, need 75%
    // required = ceil((75*10 - 0*100) / (100-75)) = ceil(750/25) = ceil(30) = 30
    expect(getRequiredClasses(0, 10, 75)).toBe(30);
  });

  it("returns 0 for threshold of 0", () => {
    expect(getRequiredClasses(0, 40, 0)).toBe(0);
  });

  it("returns 0 for threshold of 100 (cannot be achieved with finite classes)", () => {
    expect(getRequiredClasses(30, 40, 100)).toBe(0);
  });
});

// ─── getAttendanceStatus ─────────────────────────────────────────────────────

describe("getAttendanceStatus", () => {
  it("returns 'safe' when above threshold with bunk room", () => {
    // 35 present, 40 total → 87.5%, threshold 75% → bunks available
    expect(getAttendanceStatus(35, 40, 75)).toBe("safe");
  });

  it("returns 'warning' when exactly at threshold (no bunks left)", () => {
    // 30 present, 40 total → 75%, threshold 75% → 0 bunks
    expect(getAttendanceStatus(30, 40, 75)).toBe("warning");
  });

  it("returns 'danger' when below threshold", () => {
    // 20 present, 40 total → 50%, below 75%
    expect(getAttendanceStatus(20, 40, 75)).toBe("danger");
  });

  it("returns 'warning' when total is 0 (no data)", () => {
    expect(getAttendanceStatus(0, 0, 75)).toBe("warning");
  });
});

// ─── getAggregateStats ────────────────────────────────────────────────────────

describe("getAggregateStats", () => {
  const mockSubjects: Subject[] = [
    {
      id: "1",
      name: "Mathematics",
      type: "Theory",
      totalHours: 40,
      hoursPresent: 35, // 87.5% — safe
      threshold: 75,
    },
    {
      id: "2",
      name: "Physics Lab",
      type: "Lab",
      totalHours: 20,
      hoursPresent: 10, // 50% — danger
      threshold: 75,
    },
    {
      id: "3",
      name: "Chemistry",
      type: "Theory",
      totalHours: 30,
      hoursPresent: 24, // 80% — safe (with bunk room)
      threshold: 75,
    },
  ];

  it("calculates total classes correctly", () => {
    const stats = getAggregateStats(mockSubjects);
    expect(stats.totalClasses).toBe(90); // 40 + 20 + 30
  });

  it("calculates total present correctly", () => {
    const stats = getAggregateStats(mockSubjects);
    expect(stats.totalPresent).toBe(69); // 35 + 10 + 24
  });

  it("calculates overall percentage correctly", () => {
    const stats = getAggregateStats(mockSubjects);
    expect(stats.overallPercentage).toBeCloseTo(76.67, 1); // 69/90 * 100
  });

  it("counts at-risk subjects correctly", () => {
    const stats = getAggregateStats(mockSubjects);
    expect(stats.atRiskCount).toBe(1); // only Physics Lab
  });

  it("counts safe subjects correctly", () => {
    const stats = getAggregateStats(mockSubjects);
    expect(stats.safeCount).toBe(2); // Mathematics + Chemistry
  });

  it("handles empty subject list", () => {
    const stats = getAggregateStats([]);
    expect(stats.totalClasses).toBe(0);
    expect(stats.totalPresent).toBe(0);
    expect(stats.overallPercentage).toBe(0);
    expect(stats.atRiskCount).toBe(0);
    expect(stats.safeCount).toBe(0);
  });

  it("handles subject with zero total hours (no division by zero)", () => {
    const subjects: Subject[] = [
      {
        id: "1",
        name: "New Subject",
        type: "Theory",
        totalHours: 0,
        hoursPresent: 0,
        threshold: 75,
      },
    ];
    const stats = getAggregateStats(subjects);
    expect(stats.overallPercentage).toBe(0);
    expect(stats.atRiskCount).toBe(0);
    expect(stats.safeCount).toBe(0);
  });
});
