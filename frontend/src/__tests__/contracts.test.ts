import { describe, it, expect } from "vitest";
import { statusNumToEnum } from "@/lib/stellar/contracts";

describe("statusNumToEnum", () => {
  it("maps 0 to draft", () => {
    expect(statusNumToEnum(0)).toBe("draft");
  });

  it("maps 1 to registration_open", () => {
    expect(statusNumToEnum(1)).toBe("registration_open");
  });

  it("maps 2 to registration_closed", () => {
    expect(statusNumToEnum(2)).toBe("registration_closed");
  });

  it("maps 3 to ongoing", () => {
    expect(statusNumToEnum(3)).toBe("ongoing");
  });

  it("maps 4 to completed", () => {
    expect(statusNumToEnum(4)).toBe("completed");
  });

  it("maps 5 to prize_released", () => {
    expect(statusNumToEnum(5)).toBe("prize_released");
  });

  it("maps 6 to cancelled", () => {
    expect(statusNumToEnum(6)).toBe("cancelled");
  });

  it("falls back to draft for unknown status numbers", () => {
    expect(statusNumToEnum(99)).toBe("draft");
    expect(statusNumToEnum(-1)).toBe("draft");
  });
});
