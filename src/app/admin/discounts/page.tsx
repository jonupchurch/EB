import { listPromotions } from "./actions";
import { DiscountsManager } from "./discounts-manager";

export default async function DiscountsPage() {
  const result = await listPromotions();
  const promotions = result.ok ? result.data : [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-ink">Discounts</h1>
      <DiscountsManager initial={promotions} />
    </div>
  );
}
