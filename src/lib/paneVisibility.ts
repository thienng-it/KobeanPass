export type PaneId = "sidebar" | "list" | "detail";

export interface PaneVisibility {
  sidebar: boolean;
  list: boolean;
  detail: boolean;
}

export const defaultPaneVisibility: PaneVisibility = {
  sidebar: true,
  list: true,
  detail: true,
};

export function togglePaneVisibility(
  panes: PaneVisibility,
  pane: PaneId,
): PaneVisibility {
  if (panes[pane] && Object.values(panes).filter(Boolean).length === 1) {
    return panes;
  }

  return { ...panes, [pane]: !panes[pane] };
}
