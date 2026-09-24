import { formatPrice } from "@/lib/format";

export function PriceTag({ price, currency }: {
  price: number; currency: string;
}) {
  return (
    <p className="listing-price">
      {formatPrice(price, currency)}
    </p>
  );
}
