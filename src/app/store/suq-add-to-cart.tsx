import { addToCart } from "./actions";

/**
 * زر الإضافة الدائري — the attached design's round add button, the
 * official server-action-in-form pattern (progressive enhancement: works
 * before hydration, no client JS required). Bound per product id; the
 * action's own bounds are the gate (unknown/stalled ids no-op honestly)
 * and it keeps the buyer on the current screen — the design's own
 * behavior — with the unified cart bar re-rendering from the server.
 */
export function SuqAddToCart({
  productId,
  inStock,
}: {
  productId: string;
  inStock: boolean;
}) {
  if (!inStock) {
    return <span className="suq-add-sold">نفدت الكمية</span>;
  }
  return (
    <span className="suq-add">
      <form action={addToCart.bind(null, productId)}>
        <button type="submit" aria-label="أضف إلى السلة">
          <span className="material-symbols-outlined" aria-hidden="true">
            add
          </span>
        </button>
      </form>
    </span>
  );
}
