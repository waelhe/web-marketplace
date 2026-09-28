import type { ListingCategory } from "@/lib/api/types";

/**
 * The live category vocabulary's shared UI pieces (charter J2, slice S2).
 *
 * The vocabulary comes from ONE source — `getListingCategories()`
 * (src/lib/api/public.ts → `GET /api/v1/listings/categories`, the
 * backend's V70 registry read, measured 2026-09-29). No surface may
 * hard-code or invent category values: the wire is CODE-ONLY (searching
 * by the Arabic name answers a 200 empty envelope — measured), and the
 * write side rejects unknown codes with the backend's own 400
 * (`CatalogService.requireKnownCategory`).
 *
 * Both components are plain markup (no hooks) — usable from server
 * components and inside client forms alike.
 */

/**
 * The option label's fallback chain — the schema's display names are
 * NULLABLE (V70 `name_en`/`name_ar`): the Arabic UI shows `nameAr`
 * first, then the English name, then the bare code. Never empty.
 */
export function categoryLabel(category: ListingCategory): string {
  return category.nameAr ?? category.nameEn ?? category.code;
}

/** The shared option markup: value = the CODE (the only valid wire
 *  value), label = the Arabic display name, the English name rides the
 *  title attribute (the bilingual affordance — hover reveals it). */
function categoryOptions(categories: ListingCategory[]) {
  return categories.map((category) => (
    <option
      key={category.code}
      value={category.code}
      title={category.nameEn ?? undefined}
    >
      {categoryLabel(category)}
    </option>
  ));
}

/**
 * The visible picker — a native `<select>` fed ONLY by the live
 * vocabulary (the purpose/propertyType sidebar pattern). `emptyLabel`
 * renders the optional "no filter" option («الكل» on browse, the
 * general-rule option on the admin form). An arriving/current value
 * outside the live vocabulary is APPENDED as a raw-value option — the
 * lossless round-trip pattern (the radius select's discipline): a
 * submit never silently drops arriving state, and a legacy category
 * stays submittable unchanged (the backend's own
 * requireKnownCategoryUnlessUnchanged gate).
 */
export function CategorySelect({
  id,
  name = "category",
  required = false,
  emptyLabel,
  categories,
  defaultValue,
}: {
  id?: string;
  name?: string;
  required?: boolean;
  /** The "no category" option's label — omit for required pickers. */
  emptyLabel?: string;
  /** The live vocabulary; an empty array is the honest degraded state (no invented options). */
  categories: ListingCategory[];
  /** The arriving/current value — preserved as an option when outside the vocabulary. */
  defaultValue?: string;
}) {
  const preserve =
    defaultValue !== undefined &&
    defaultValue !== "" &&
    !categories.some((category) => category.code === defaultValue) ? (
      // A value the registry does not name (URL-carried or legacy): shown
      // verbatim — honest, never remapped.
      <option value={defaultValue}>{defaultValue}</option>
    ) : null;
  const initial =
    defaultValue !== undefined && defaultValue !== ""
      ? defaultValue
      : emptyLabel !== undefined
        ? ""
        : undefined;
  return (
    <select id={id} name={name} required={required} defaultValue={initial}>
      {emptyLabel !== undefined ? <option value="">{emptyLabel}</option> : null}
      {categoryOptions(categories)}
      {preserve}
    </select>
  );
}

/**
 * The light-hero variant — a `<datalist>` of live suggestions for the
 * free-text input (the landing spec keeps the hero select-free; the
 * smoke e2e pins `select` count 0 there). Suggestion VALUES are the
 * codes — picking one submits the valid wire value; the browser shows
 * the Arabic label beside it. Degraded read → zero options (the input
 * keeps working; nothing invented).
 */
export function CategoryDatalist({
  id,
  categories,
}: {
  id: string;
  categories: ListingCategory[];
}) {
  return <datalist id={id}>{categoryOptions(categories)}</datalist>;
}
