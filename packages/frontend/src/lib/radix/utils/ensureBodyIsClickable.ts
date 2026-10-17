// Actually ridiculous that we have to do this...
// https://github.com/radix-ui/primitives/issues/1241
export function ensureBodyIsClickable(newOpenState: boolean) {
  if (newOpenState) {
    return;
  }

  // This should technically not be needed so long as @radix-ui/react-dismissable-layer doesn't have a version mismatch, but just in case...
  requestAnimationFrame(() => {
    document.body.style.pointerEvents = "";
  });
}
