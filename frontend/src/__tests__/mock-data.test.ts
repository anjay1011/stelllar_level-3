import { describe, it, expect } from "vitest";
import {
  formatXLM,
  formatDate,
  formatTime,
  timeAgo,
  statusConfig,
  type TournamentStatus,
} from "@/lib/mock-data";

describe("formatXLM", () => {
  it("formats zero XLM", () => {
    expect(formatXLM(0)).toBe("0 XLM");
  });

  it("formats positive amounts with commas", () => {
    expect(formatXLM(100)).toBe("100 XLM");
    expect(formatXLM(1500)).toBe("1,500 XLM");
    expect(formatXLM(25000)).toBe("25,000 XLM");
  });
});

describe("formatDate", () => {
  it("formats a valid ISO date string", () => {
    const result = formatDate("2026-07-15T10:30:00Z");
    expect(result).toContain("Jul");
    expect(result).toContain("15");
    expect(result).toContain("2026");
  });
});

describe("formatTime", () => {
  it("formats a valid ISO date string to time", () => {
    const result = formatTime("2026-07-15T14:30:00Z");
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe("timeAgo", () => {
  it("returns 'just now' for very recent timestamps", () => {
    const now = new Date().toISOString();
    expect(timeAgo(now)).toBe("just now");
  });

  it("returns minutes ago for recent timestamps", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(timeAgo(fiveMinAgo)).toBe("5m ago");
  });

  it("returns hours ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(twoHoursAgo)).toBe("2h ago");
  });

  it("returns days ago", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(threeDaysAgo)).toBe("3d ago");
  });
});

describe("statusConfig", () => {
  const statuses: TournamentStatus[] = [
    "draft",
    "registration_open",
    "registration_closed",
    "ongoing",
    "completed",
    "prize_released",
    "cancelled",
  ];

  it("has config for every tournament status", () => {
    for (const status of statuses) {
      expect(statusConfig[status]).toBeDefined();
      expect(statusConfig[status].label).toBeTruthy();
      expect(statusConfig[status].color).toBeTruthy();
      expect(statusConfig[status].bgColor).toBeTruthy();
    }
  });

  it("has correct labels", () => {
    expect(statusConfig.draft.label).toBe("Draft");
    expect(statusConfig.registration_open.label).toBe("Registration Open");
    expect(statusConfig.ongoing.label).toBe("Ongoing");
    expect(statusConfig.completed.label).toBe("Completed");
    expect(statusConfig.cancelled.label).toBe("Cancelled");
  });
});
