import { describe, expect, it } from "vitest";
import { defaultPaneVisibility, togglePaneVisibility } from "./paneVisibility";

describe("togglePaneVisibility", () => {
  it("toggles the requested pane", () => {
    expect(togglePaneVisibility(defaultPaneVisibility, "list")).toEqual({
      sidebar: true,
      list: false,
      detail: true,
    });
  });

  it("keeps the final visible pane open", () => {
    const onlyDetail = { sidebar: false, list: false, detail: true };

    expect(togglePaneVisibility(onlyDetail, "detail")).toEqual(onlyDetail);
  });
});
