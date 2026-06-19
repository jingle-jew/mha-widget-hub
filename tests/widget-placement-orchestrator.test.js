import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWidgetConfigPanelProps,
  buildWidgetManagerPanelProps,
} from "../src/widgets/widget-placement-orchestrator.js";

test("widget manager panel props retain state and callback routing", () => {
  const onClose = () => {};
  const onBack = () => {};
  const onSelectCategory = () => {};
  const onSelectWidget = () => {};
  const categories = [{ id: "media", label: "Media" }];

  const props = buildWidgetManagerPanelProps({
    open: true,
    activeCategory: "media",
    categories,
    onClose,
    onBack,
    onSelectCategory,
    onSelectWidget,
  });

  assert.equal(props.open, true);
  assert.equal(props.activeCategory, "media");
  assert.equal(props.categories, categories);
  assert.equal(props.onClose, onClose);
  assert.equal(props.onBack, onBack);
  assert.equal(props.onSelectCategory, onSelectCategory);
  assert.equal(props.onSelectWidget, onSelectWidget);
});

test("widget config panel props rerender only when the popup requests it", () => {
  let rerenders = 0;
  const props = buildWidgetConfigPanelProps({
    session: { mode: "create", draft: {} },
    onRerender: () => { rerenders += 1; },
  });

  props.onChange({ rerender: false });
  props.onChange({});
  assert.equal(rerenders, 0);

  props.onChange({ rerender: true });
  assert.equal(rerenders, 1);
});
