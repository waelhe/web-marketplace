import { addToCart } from "./actions";

/**
 * The add-to-cart form — the official server-action-in-form pattern
 * (progressive enhancement: works before hydration, no client JS
 * required). Bound per product id; the action's own bounds are the
 * gate (unknown/stalled ids no-op honestly).
 */
export function AddToCartForm({
  productId,
  inStock,
  compact = false,
}: {
  productId: string;
  inStock: boolean;
  compact?: boolean;
}) {
  if (!inStock) {
    return (
      <p className="page-note" role="status">
        نفدت الكمية — راجع البائع لاحقًا.
      </p>
    );
  }
  return (
    <form action={addToCart.bind(null, productId)}>
      <button type="submit" className="button" data-variant="primary">
        {compact ? "أضف للسلة" : "أضف إلى السلة"}
      </button>
    </form>
  );
}
