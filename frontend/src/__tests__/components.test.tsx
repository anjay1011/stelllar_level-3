import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import StatusBadge from "@/components/shared/StatusBadge";
import ErrorState from "@/components/shared/ErrorState";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("StatusBadge", () => {
  it("renders the correct label for registration_open", () => {
    render(<StatusBadge status="registration_open" />);
    expect(screen.getByText("Registration Open")).toBeInTheDocument();
  });

  it("renders the correct label for completed status", () => {
    render(<StatusBadge status="completed" />);
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("renders the correct label for ongoing status", () => {
    render(<StatusBadge status="ongoing" />);
    expect(screen.getByText("Ongoing")).toBeInTheDocument();
  });

  it("applies md size class when size is md", () => {
    const { container } = render(<StatusBadge status="draft" size="md" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("text-sm");
  });

  it("applies sm size class by default", () => {
    const { container } = render(<StatusBadge status="draft" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("text-xs");
  });
});

describe("ErrorState", () => {
  it("renders default title and message", () => {
    render(<ErrorState />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("We couldn't load the data. Please try again.")).toBeInTheDocument();
  });

  it("renders custom title and message", () => {
    render(
      <ErrorState title="Custom Error" message="Custom message here" />
    );
    expect(screen.getByText("Custom Error")).toBeInTheDocument();
    expect(screen.getByText("Custom message here")).toBeInTheDocument();
  });

  it("renders retry button when onRetry is provided", () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    const button = screen.getByText("Try Again");
    expect(button).toBeInTheDocument();
    button.click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("does not render retry button when onRetry is undefined", () => {
    const { container } = render(<ErrorState onRetry={undefined} />);
    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBe(0);
  });
});

describe("LoadingSkeleton", () => {
  it("renders card skeleton by default", () => {
    const { container } = render(<LoadingSkeleton />);
    const items = container.querySelectorAll("[class*='animate-pulse']");
    expect(items.length).toBeGreaterThan(0);
  });

  it("renders the correct number of items", () => {
    const { container } = render(<LoadingSkeleton variant="row" count={5} />);
    const rows = container.querySelectorAll("[class*='rounded-xl'][class*='border']");
    expect(rows.length).toBe(5);
  });

  it("renders text skeleton variant", () => {
    const { container } = render(<LoadingSkeleton variant="text" count={3} />);
    const lines = container.querySelectorAll("[class*='animate-pulse']");
    expect(lines.length).toBe(3);
  });
});
