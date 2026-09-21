/**
 * Server-side display formatting for backend facts — Arabic locale per
 * the app's single-locale contract (root layout lang="ar"). Formatting
 * happens in RSC only; results ride the serialized payload, so there is
 * no client re-format and no hydration drift.
 *
 * No invented facts: these helpers only RENDER measured values (prices
 * arrive in major units, dates as ISO instants from the backend).
 */

/** ISO 4217 currency display, Arabic locale (e.g. SAR → ر.س.). */
export function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("ar", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(price);
}

/** ISO instant → Arabic medium date (e.g. updatedAt display). */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("ar", { dateStyle: "medium" }).format(new Date(iso));
}
