"use server";

/**
 * Market server actions (L50 — the market board, gap #5). The same
 * official mutating-data path as the feed's and the events' actions
 * (POST-only, Origin/Host CSRF check enforced by the framework); every
 * action re-checks the session itself and the backend's
 * resource-server chain remains the authorization authority. Writes
 * ride backendSend — the same direct BACKEND_URL channel as the reads.
 *
 * The withdraw is the delete-button pattern's own shape (the feed's
 * deletePostAction verbatim): the form carries the item's id, the
 * action answers expected failures as ActionState data, and
 * refresh() re-renders the board from its read — the contract is the
 * display's single source of truth.
 *
 * The publish action composes the form's price in WHOLE riyals (the
 * design's own display vocabulary carries whole numbers only) into
 * the backend's integer-cents money shape, and mirrors the backend's
 * ONE pricing rule («مجاني ⇔ بلا سعر») with the same friendly Arabic
 * gates — the backend re-validates and owns the authorization.
 */

import { refresh } from "next/cache";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import { createMarketItem, deleteMarketItem } from "@/lib/api/community";
import {
  MARKET_CATEGORIES,
  MARKET_CONDITIONS,
  MAX_MARKET_LABEL_LENGTH,
  MAX_MARKET_TITLE_LENGTH,
  type MarketCategory,
  type MarketCondition,
} from "@/lib/api/community-contract";
import { isUuid } from "@/lib/api/geo";

/**
 * The form state contract shared by every market action form (the
 * feed's own ActionState shape — a `use server` module's runtime
 * exports are the async functions alone; forms inline `{ status: "idle" }`).
 */
export type MarketActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

const REAUTH_MESSAGE = "جلستك انتهت — سجّل الدخول من جديد ثم أعد المحاولة.";

/** The whole-riyal price ceiling the input accepts (sanity, not product). */
const MAX_PRICE_RIYAL = 1_000_000;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Publish an item — the design's own form fields (title, category,
 * condition, price in whole riyals, the pickup spot). The Arabic
 * gates mirror the backend's own type gates (the vocabulary, the
 * bounds, the ONE pricing rule); the backend re-validates and owns
 * the authorization (the membership match, the level-3 gate, the
 * write right).
 *
 * The price field composes the ONE rule with the category: the FREE
 * category (ركن الإهداء) means a GIFT — the field must stay empty;
 * each of the four sale categories means a possession for sale — a
 * whole-positive price is required (converted to the backend's
 * integer-cents shape, SAR — the platform's own listing currency).
 */
export async function publishAction(
  _prev: MarketActionState,
  formData: FormData,
): Promise<MarketActionState> {
  const session = await getSession();
  if (!session) {
    return { status: "error", message: "سجّل الدخول أولاً لتنشر معروضًا في سوق حارتك." };
  }

  const locationId = text(formData, "locationId");
  const category = text(formData, "category");
  const title = text(formData, "title");
  const condition = text(formData, "condition");
  const priceRaw = text(formData, "price");
  const locationLabel = text(formData, "location");

  if (!isUuid(locationId)) {
    return { status: "error", message: "معرّف الحارة غير صالح — انضم إلى حارة أولاً." };
  }
  if (!MARKET_CATEGORIES.includes(category as MarketCategory)) {
    return { status: "error", message: "اختر تصنيفًا صحيحًا للمعروض." };
  }
  if (!MARKET_CONDITIONS.includes(condition as MarketCondition)) {
    return { status: "error", message: "اختر حالة البضاعة." };
  }
  if (title.length === 0 || title.length > MAX_MARKET_TITLE_LENGTH) {
    return {
      status: "error",
      message: `اسم المعروض مطلوب (${MAX_MARKET_TITLE_LENGTH} حرفاً كحد أقصى).`,
    };
  }
  if (locationLabel.length === 0 || locationLabel.length > MAX_MARKET_LABEL_LENGTH) {
    return {
      status: "error",
      message: `نقطة الاستلام داخل الحي مطلوبة (${MAX_MARKET_LABEL_LENGTH} حرفاً كحد أقصى).`,
    };
  }

  // The ONE pricing rule's friendly twin: a gift carries no price at
  // all; a sale carries whole positive riyals (integer cents below).
  let priceCents: number | null = null;
  if (category === "FREE") {
    if (priceRaw !== "") {
      return {
        status: "error",
        message: "الإهداء بلا مقابل — اترك حقل السعر فارغاً لنشر المقتنى مجاناً.",
      };
    }
  } else {
    if (priceRaw === "") {
      return {
        status: "error",
        message: "سعر البيع مطلوب بالريال — أو اختر تصنيف «مقتنيات مجانية» للإهداء.",
      };
    }
    const riyals = Number(priceRaw);
    if (!Number.isInteger(riyals) || riyals < 1 || riyals > MAX_PRICE_RIYAL) {
      return {
        status: "error",
        message: "السعر يجب أن يكون رقماً صحيحاً موجباً بالريال (بلا كسور).",
      };
    }
    priceCents = riyals * 100;
  }

  const result = await createMarketItem({
    locationId,
    category: category as MarketCategory,
    title,
    condition: condition as MarketCondition,
    priceCents,
    priceCurrency: priceCents === null ? null : "SAR",
    locationLabel,
  });
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر نشر المعروض (رمز ${result.status}).`,
      ),
    };
  }

  // refresh(): the board's server render IS the market's source of
  // truth — the re-read carries the new item on the board.
  refresh();
  return {
    status: "success",
    message:
      priceCents === null
        ? "نُشر إهداؤك في ركن الإهداء — عسى أن يفرح به جار."
        : "نُشر معروضك على لوحة سوق حارتك الآن.",
  };
}

/**
 * Withdraw my item — the author's own soft delete. Expected failures
 * (the honest 404 for an already-withdrawn item, the authorship 403)
 * come back as ActionState data; success refreshes the server render
 * so the board re-renders without the item.
 */
export async function withdrawAction(
  _prev: MarketActionState,
  formData: FormData,
): Promise<MarketActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const itemId = text(formData, "itemId");
  if (!isUuid(itemId)) {
    return { status: "error", message: "معرّف المعروض غير صالح." };
  }

  const result = await deleteMarketItem(itemId);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر سحب المعروض (رمز ${result.status}).`,
      ),
    };
  }

  // refresh(): the board's server render IS the source of truth —
  // the re-read no longer carries the item.
  refresh();
  return { status: "success", message: "سُحب معروضك من اللوحة." };
}
