# مواصفة تصميم: أدوات المزوّد المتقدمة (الدفعة ١ — رفع تغطية العقد)

> **الحالة:** مسودة للاعتماد — لم تُعتمد بعد؛ كلمة المالك تعتمدها قسماً قسماً.
> **النطاق:** أربعة أسطح (تقويم أسعار الإعلان + البحوث المحفوظة — قابلان للبناء فوراً؛ أستاذ المزوّد + تحرير ملفه — مصمَّمان ومحجوبان بعيوب خلفية مقيسة). كل بند مثبَّت بقياس حي مؤرّخ (جلسة qa-tester، 2026-09-25) أو `ملف:سطر` — لا اجتهاد.
> **المصدر الحاكم:** عقد OpenAPI الحي (staging `/v3/api-docs`: 108 مسارات / 125 عملية / 118 مخططاً) + كود مستودع الباك اند + الوثائق المحزومة (Next 16.3.5).

## سجل القرارات المقيسة (تصحيح خطة الدفعة ١ الأصلية)

| # | القياس | الأثر |
|---|---|---|
| 1 | قواعد التسعير الخمس (`/pricing/rules`) حرّاسها `hasRole('ADMIN')` — `PricingRuleController.java:20` | **ليست سطح مزوّد** — تُنقل للدفعة ٣ (نطاق الأدمن) |
| 2 | تقويم الأسعار حرّاسه `hasAnyRole('PROVIDER','ADMIN')` — `ListingPriceCalendarController.java:52` + قياس حي 200 | **قابل للبناء فوراً** |
| 3 | الأستاذ يرد 403 AUTHZ-001 للمالك الشرعي (قياس حي ×2) — خلل خلفي مقيس (القسم 3) | مصمَّم — محجوب |
| 4 | لا قناة عاملة تكشف معرّف ملف المتصل (قياس حي — القسم 4) | مصمَّم — محجوب |
| 5 | `convert` يعمل لكن `source:"static-config"` (قياس حي 200) | مقصوص (YAGNI — سعر مرجعي ثابت ليس قوة تُعرض) |
| 6 | البحوث المحفوظة: قناة حية فارغة (قياس 200) | **قابل للبناء فوراً** |

## القسم 1 — تقويم أسعار الإعلان `/provider/listings/[id]/pricing` (قابل للبناء)

**المسار الجديد** (فرعي من صفحة الإدارة؛ رابط «التسعير» منها — بلا تعديل قنواتها). القراءة قناة RSC موثّقة واحدة: `GET /api/v1/pricing/listings/{id}/calendar` (مقيس 200 حتى على إعلان مؤرشف): `{listingId, weekendRule: {id, listingId, multiplier, createdAt, updatedAt} | null, seasonalRates: [{id, listingId, fromDate, toDate, priceCents, createdAt, updatedAt}]}`.

**قاعدة نهاية الأسبوع:** عرض المضاعف الحالي أو `EmptyState` «لا قاعدة» + نموذج `multiplier` بحدود المصنع `(0,10]` بدقة 3 خانات (V41) → `PUT …/calendar/weekend-rule {multiplier}` / `DELETE …/weekend-rule` (204).

**الأسعار الموسمية:** جدول النطاقات `[fromDate, toDate)` — الطرف الحصري موسوم «حتى (غير شامل)» — بسعر ليلي مطلق بالوحدات الصغرى ≥ 0 + إضافة/تحرير/حذف: `POST …/calendar/seasonal-rates` / `PUT|DELETE …/seasonal-rates/{rateId}` بجسم `{fromDate, toDate, priceCents}`.

**حدّ صدق ملزم:** وصف العملية في العقد يذكر «effective nightly prices for the requested window» لكن الاستجابة المقيسة **لا تحمل أسعار أيام ولا تستقبل نافذة** (`ListingPriceCalendarController.java:61-67`) — الواجهة تعرض **القواعد فقط** ويُمنع حساب أسعار الأيام طرفيّاً (تكرار منطق التسعير = دين ترقيع). السعر الأساس يظل في حقول الإعلان نفسها.

**الكتابة:** 5 Server Actions بنمط المستودع الحرفي (`provider/actions.ts`): فحص الجلسة + `backendSend` + كلمات problem+json تُعرض حرفياً + `refresh()` — الوثيقة المحزومة `01-app/03-api-reference/04-functions/refresh.md`: «يمكن استدعاؤها داخل Server Actions فقط» (نمط المستودع ×10).

## القسم 2 — البحوث المحفوظة على `/listings` (قابل للبناء)

**بلا مسار جديد** — سرد واحدة للتصفح (عقد §3 المعتمد): شريط رقائق واعٍ بالجلسة أعلى النتائج + زر «احفظ هذا البحث» يظهر عند فلاتر غير افتراضية وجلسة قائمة.

**القنوات (مقيس):** `GET /me/saved-searches` → `PagedResponse` فارغة حياً؛ `POST /me/saved-searches {criteria, alertEnabled}` → `SavedSearchView {id, criteria, alertEnabled, lastMatchedAt, createdAt}`؛ `DELETE /me/saved-searches/{id}` → 204.

**خريطة التحويل (مقيسة — فخّ التسمية):** جسم `criteria` يفكّ عبر `SearchCriteria.java:72-89` فأسماؤه `query`/`latitude`/`longitude`، بينما رابط `/listings` (عقد §3) يستخدم `q`/`lat`/`lng` — التحويل: `q↔query`، `lat↔latitude`، `lng↔longitude`، والبقية 1:1 (`category, minPrice, maxPrice, checkIn, checkOut, guests, locationId, purpose, propertyType, minRooms, minBathrooms, minAreaM2, radiusKm`)؛ **`page`/`sort` خارج المعيار** (لا وجود لهما في السجل). رحلة العودة: رقاقة → `/listings?<معيار>` — URL هو الحالة بلا مساس.

`alertEnabled` مبدئياً false بمسمّى «نبّهني عند مطابقة» (`lastMatchedAt` يُعرض عند وجوده) — بلا بنية تنبيه طرفيّة (المطابق مسؤولية الخلفي).

## القسم 3 — أستاذ المزوّد (محجوب — خلل خلفي مقيس)

**العقد مثبَّت:** `GET /providers/me/ledger/balance` → `{availableCents (int64), id, createdAt, updatedAt…}`؛ `GET /providers/me/ledger/statement` → `PagedResponse<LedgerEntryResponse {id, sourceId, entryType, amountCents, createdAt}>`.

**التصميم جاهز:** قسم «الأستاذ» في `/provider`: بطاقة الرصيد (تنسيق هللات) + جدول حركات مرقّم الصفحات بملصقات `entryType` ومبالغ موقّعة.

**الحجز (قياس ×2 — 403 AUTHZ-001):** `ProviderLedgerController.java:69-74` يحلّ «me» عبر `findByUserId` ثم يمرر `ProviderSummary::id` (وهو **معرّف ملف** — `ProviderLookupAdapter.java:24-26`) إلى حارس `LedgerService.java:142,153` `@authHelper.ownsProvider(#providerId…)` الذي يفسّر وسيطه **كمعرّف مستخدم** (`AuthHelper.java:63-72` — `findByUserId`) → معرّف الملف لا يساوي معرّف مستخدم أبداً → **رفض المالك الشرعي دائماً** — الفخ نفسه الذي يحذّر منه توثيق AuthHelper حرفياً. **التنفيذ يتوقف حتى يصلح الخلفي** (تمرير معرّف المستخدم للحارس) — يُضمّن في موجّه الفريق الخلفي.

## القسم 4 — تحرير ملف المزوّد (محجوب — فجوة اكتشاف مقيسة)

**العقد مثبَّت:** `GET/PUT /providers/{id}` — `{id}` بفضاء **معرّف الملف** (`ProviderService.java:65` ‏`findById`) مع تحقق ملكية ضد معرّف المستخدم (`:141-146`). دلالات PUT لكل فئة حقل (`ProviderController.java:52-63`): `displayName` إلزامي ≤200؛ `bio` ≤1000 استبدال كامل؛ `actorType` — الحذف **يُبقي** التصنيف المخزّن (تصنيف مطلوب لا يُصفَّر بصمت)؛ حذف `agencyName`/`licenseNumber` **يمسحهما**. الاستجابة `ProviderResponse {id, displayName, bio, status, actorType, agencyName, licenseNumber, ratingAverage, createdAt, updatedAt}`.

**التصميم جاهز:** قسم «بيانات المضيف» في `/profile` بنموذج L36 (التصنيف/المكتب/الرخصة + الاسم/النبذة) بدلالات الحقول أعلاه موثّقة في النموذج نفسه.

**الحجز (قياس):** لا قناة عاملة تكشف معرّف ملف المتصل — `users/me` بلا حقل ملف (قياس 200: id/email/displayName/createdAt/updatedAt فقط)، `ProviderStatsResponse` بلا معرّف وهي 409-broken أصلاً، ولا يوجد `GET /providers/me` في مسارات العقد الـ108. **التنفيذ يتوقف حتى يضيف الخلفي** معرّف الملف إلى `users/me` أو مسار `GET /providers/me`.

## بوابات ما قبل التنفيذ

- **العقود مُثبَّتة هنا من القياس الحي والعقد المنشور** (أنجزت ضمن هذه المسودة — كل شكل أعلاه مقيس).
- كل عملية كتابة عبر Server Action: فحص جلسة + `backendSend` + problem+json حرفياً + `refresh()` (الوثيقة المحزومة).
- **خطة التحقق الملزمة لكل زيادة** (عقد التصفح §5 حرفياً): `typegen`→lint→`tsc`→`build` بالمثبتة `../.tools/node-v26.8.2` + حلقة next-dev-loop (MCP `get_compilation_issues` صفر + `agent-browser` سلوك مقيس) + دمج محلي فقط — الدفع بكلمة المالك.
- تحديث قسم Routes في `AGENTS.md` مع كل مسار جديد (القسم 1) ضمن نفس الدفعة.

## خارج النطاق صراحة

قواعد التسعير الخمس (ADMIN — الدفعة ٣) · محول العملة (مقصوص: `source:"static-config"` — قياس) · حساب أسعار الأيام طرفيّاً · أسطح الأدمن الـ24 · إصلاحات الخلفي نفسها (مستودع منفصل — موجّه الفريق) · أي دفع للأصل.
