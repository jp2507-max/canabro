# Strain Filtering – Issue Summary & Next-Steps

_Last updated: 2025-07-10_

---

## TL;DR
* **Bug:** Selecting “Sativa” or “Hybrid” in the Strains tab does **not** change the list of strains.
* **State:** App no longer crashes (navigation-context overlay suppressed) but filtering logic still fails → list stays on Indica dataset.
* **Priority:** High – core user feature blocked. 7+ hrs already spent; needs fresh investigation when energy returns.

---

## What We Already Know

### Sources
1. `docs/navigation-context-debugging-report.md` – details mis-focused effort on NavigationContext error.
2. `docs/strain-filtering-debug-plan.md` – outlines correct debug approach & instrumentation.

### Reproduction Steps
1. Launch app, log in, open **Strains** tab (loads Indica by default).
2. Tap **Sativa** chip → dev console shows navigation-context warning, but **list remains Indica**.
3. Tap **Hybrid** chip → same behaviour.
4. Advanced Filter modal: setting species does highlight chip but **still doesn’t alter data**.

### Observed Logs (condensed)
```text
[useInfiniteStrains] Filtering parameters: {
  species: 'indica',
  'activeFilters.species': 'sativa',
  speciesFilter: 'sativa',
  queryKey: [... 'sativa' ...]
}
[WeedDbService] Type filter response: { total: 387, pageItems: 20 }
```
*Even though query key changes, UI list does not update → flattening logic or rendering memo likely stale.*

---

## Hypothesis
`strains` memo in `app/(app)/(tabs)/strains.tsx` flattens `data.pages` **once**.  When the query key changes, React Query delivers a **new `data` object**, but `useMemo` dependency array contains only `[data]` (✅), so theoretically it should recompute.

Two possibilities:
1. **We receive correct new data** but UI list still shows cached items – maybe `FlatList` `keyExtractor` returns same keys → diffing does not trigger re-render.
2. **We don’t actually receive new species data** – WeedDB returns same records (unlikely; direct API test shows variation).

---

## Immediate Debug Tasks (deferred)
1. **Verify response content**
   * Add `console.log(JSON.stringify(strains.slice(0,3), null, 2))` after memo to confirm species field per item.
2. **Check keyExtractor** uniqueness
   * Ensure IDs differ across species; if not, prepend species to fallback key.
3. **Force list re-render**
   * Temporarily add `extraData={selectedStrainType}` to `AnimatedFlashList` to bypass diffing.
4. **Unit test `mapWeedDbStrainToAppStrain`** for species mapping accuracy.

---

## Next Steps After Sleep 🙏
1. Re-run with debug logs; capture first item name for each species.
2. If names differ but UI static → focus on FlashList diffing.
3. If names same → query still wrong → dig into `speciesFilter` precedence & WeedDB API.

---

> **Commit message suggestion:** `docs: add strain-filtering error summary & follow-up plan` 