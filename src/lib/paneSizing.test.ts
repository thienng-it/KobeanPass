import { describe, expect, it } from "vitest";
import { fitPaneWidths } from "./paneSizing";

describe("fitPaneWidths", () => {
  it("preserves the launch defaults when every pane fits", () => {
    expect(fitPaneWidths(1280, 220, 280)).toEqual({
      sidebarWidth: 220,
      listWidth: 280,
      isSidebarCompact: false,
      isNarrowLayout: false,
    });
  });

  it("keeps a usable detail pane when saved widths exceed a tight window", () => {
    expect(fitPaneWidths(900, 340, 420)).toEqual({
      sidebarWidth: 266,
      listWidth: 267,
      isSidebarCompact: false,
      isNarrowLayout: false,
    });
  });

  it("uses an icon rail instead of compressing desktop sidebar content", () => {
    expect(fitPaneWidths(348, 340, 420)).toEqual({
      sidebarWidth: 72,
      listWidth: 127,
      isSidebarCompact: true,
      isNarrowLayout: true,
    });
  });

  it("uses one content pane before the list and detail views become unreadable", () => {
    expect(fitPaneWidths(720, 220, 280)).toEqual({
      sidebarWidth: 72,
      listWidth: 269,
      isSidebarCompact: true,
      isNarrowLayout: true,
    });
  });
});
