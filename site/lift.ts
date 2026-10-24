// "The loader is lifting" event for the site-owned loader (lesson 80): the hero entrance and the traveller start here.
let lifted = false;
const fns = new Set<() => void>();

export function lift() {
  lifted = true;
  fns.forEach((f) => f());
}

/** Run `fn` when the loader starts to lift (immediately if it already has). */
export function onLift(fn: () => void) {
  if (lifted) {
    fn();
    return () => {};
  }
  fns.add(fn);
  return () => {
    fns.delete(fn);
  };
}
