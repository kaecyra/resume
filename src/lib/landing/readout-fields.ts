// Shared by delivery-readout.ts and basement-readout.ts: true when `ids` is
// exactly the set `expected` names, order-independent. Each live source
// checks this before swapping any value into its readout - a readout whose
// fields only partly match its formatter would put a measured number beside
// a stale one with nothing to tell them apart.
export function covers_exact_fields(
  ids: readonly string[],
  expected: readonly string[],
): boolean {
  if (ids.length !== expected.length) {
    return false;
  }

  const present = new Set(ids);

  return expected.every((id) => present.has(id));
}
