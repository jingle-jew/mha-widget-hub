export function destroyDomSubtree(root) {
  if (!root) return;

  const descendants = typeof root.querySelectorAll === "function"
    ? [...root.querySelectorAll("*")]
    : [];

  [...descendants.reverse(), root].forEach((node) => {
    const destroy = node?.__mhaDestroy;
    if (typeof destroy !== "function") return;

    delete node.__mhaDestroy;
    destroy();
  });
}
