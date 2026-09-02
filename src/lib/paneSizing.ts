const SPLITTER_WIDTH = 12;
const SIDEBAR_MIN_WIDTH = 160;
const SIDEBAR_MAX_WIDTH = 340;
const LIST_MIN_WIDTH = 200;
const LIST_MAX_WIDTH = 420;
const MIN_COMPACT_SIDEBAR_WIDTH = 96;
const MIN_COMPACT_LIST_WIDTH = 120;
const COMPACT_SIDEBAR_WIDTH = 72;
const COMPACT_SIDEBAR_THRESHOLD = 200;
const NARROW_LAYOUT_BREAKPOINT = 760;

interface PaneWidths {
  sidebarWidth: number;
  listWidth: number;
  isSidebarCompact: boolean;
  isNarrowLayout: boolean;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

/** Keeps resizable panes within the current viewport while preserving saved preferences. */
export function fitPaneWidths(
  viewportWidth: number,
  preferredSidebarWidth: number,
  preferredListWidth: number,
): PaneWidths {
  const availableWidth = Math.max(0, viewportWidth - SPLITTER_WIDTH);
  const sidebarMinimum = Math.min(
    SIDEBAR_MIN_WIDTH,
    Math.max(MIN_COMPACT_SIDEBAR_WIDTH, Math.floor(availableWidth * 0.28)),
  );
  const listMinimum = Math.min(
    LIST_MIN_WIDTH,
    Math.max(MIN_COMPACT_LIST_WIDTH, Math.floor(availableWidth * 0.33)),
  );
  const sidebarWidth = clamp(
    preferredSidebarWidth,
    sidebarMinimum,
    Math.max(sidebarMinimum, Math.min(SIDEBAR_MAX_WIDTH, Math.floor(availableWidth * 0.3))),
  );
  const listWidth = clamp(
    preferredListWidth,
    listMinimum,
    Math.max(listMinimum, Math.min(LIST_MAX_WIDTH, Math.floor(availableWidth * 0.38))),
  );
  const isNarrowLayout = viewportWidth < NARROW_LAYOUT_BREAKPOINT;
  const isSidebarCompact = isNarrowLayout || sidebarWidth < COMPACT_SIDEBAR_THRESHOLD;
  const resolvedSidebarWidth = isSidebarCompact ? COMPACT_SIDEBAR_WIDTH : sidebarWidth;

  if (isNarrowLayout) {
    return { sidebarWidth: resolvedSidebarWidth, listWidth, isSidebarCompact, isNarrowLayout };
  }

  const detailMinimum = Math.min(360, Math.floor(availableWidth * 0.4));

  if (availableWidth < sidebarMinimum + listMinimum + detailMinimum) {
    return { sidebarWidth: resolvedSidebarWidth, listWidth, isSidebarCompact, isNarrowLayout };
  }

  const listOverflow = Math.min(
    listWidth - listMinimum,
    Math.max(0, resolvedSidebarWidth + listWidth + detailMinimum - availableWidth),
  );
  const adjustedListWidth = listWidth - listOverflow;
  const sidebarOverflow = Math.max(
    0,
    resolvedSidebarWidth + adjustedListWidth + detailMinimum - availableWidth,
  );

  return {
    sidebarWidth: resolvedSidebarWidth - sidebarOverflow,
    listWidth: adjustedListWidth,
    isSidebarCompact,
    isNarrowLayout,
  };
}
