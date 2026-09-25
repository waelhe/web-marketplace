# مواصفة تصميم: لوحة الإدارة ٢ (الدفعة ٤ — إغلاق نطاق العقد الإداري كاملًا)

> **الحالة:** الدفعة الرابعة من خطة رفع التغطية — كلمة المالك «نفّذ الدفعة اربعة وتحقّق» (2026-09-25) فتحت تنفيذها؛ كل قسم هنا قِفْه على قياس حي مؤرّخ (جلسة qa-tester منعشة، 2026-09-25 — إعادة قياس كاملة قبل الكتابة) أو `ملف:سطر` — لا اجتهاد.
> **المصدر الحاكم:** عقد OpenAPI الحي (staging `/v3/api-docs` — مقارنة sha256 مع نسخة المهمة 24: **مطابق بالبايت**، إعادة قياس هذه الجلسة) + كود مستودع الباك اند (البوابات والعقود من المصدر) + الوثائق المحزومة (Next 16.3.5).
> **نقطة الانطلاق المقيسة:** الدفعة-3 حيّة في الإنتاج (d46db2c، نشر Railway SUCCESS) وقد غطّت 3 عمليات إدارية (طابور الإشراف ×2 + قائمة المدفوعات). هذه الدفعة تغلق **الـ21 عملية الإدارية المتبقية** في العقد كله (users ×6 · bookings ×1 · listings ×2 · promotion ×1 · payments قصد-واحد ×1 · providers ×2 · ledger ×2 · disputes ×1 · geo ×3 · revisions ×2) — لا يبقى بعدها أي مسار `/api/v1/admin/**` أو عملية `hasRole('ADMIN')` خارج الواجهة.

## سجل القرارات المقيسة (قبل الكتابة — جلسة منعشة 2026-09-25)

| # | القياس (حي/مصدر، 2026-09-25) | الأثر |
|---|---|---|
| 1 | بنود التسليم الأربعة **دون تغيير** بإعادة قياس هذه الجلسة: ledger 403 AUTHZ-001 ×2، `users/me` بلا `profileId`، stats 409، geo/tree 409؛ والعقد **مطابق بالبايت** (sha256 = نسخة المهمة 24) | فريق الخلفي لم ينشر شيئًا؛ القسمان 3+4 من الدفعة-1 يبقيان موقوفين؛ النطاق الوحيد المتبقي القابل للبناء = الأسطح الإدارية الـ21 |
| 2 | `AdminController` صنفه محرس `@PreAuthorize("hasRole('ADMIN')")` (السطر 29) — **كل** عملياته الـ14؛ `GeoAdminController` كذلك (سطر 35)؛ `LedgerController` حرستانه على الطريقتين؛ `POST /admin/providers/{id}/verify|suspend` يقعان تحت قاعدة `/api/v1/admin/**` في SecurityConfig (الطبقة الثلاثية نفسها) | البطارية الحية لحسابنا = كلمات الرفض الحرفية (نمط الدفعة-3 المقرّ) |
| 3 | `UserRole.java`: المعجم **CONSUMER \| PROVIDER \| ADMIN**؛ `updateUserRole` يمرّر `UserRole.valueOf(newRole)` (UserService:196) — قيمة غير معروفة = استثناء، والطلب لا يحرس المعجم (فقط `@NotBlank`) | نموذج الدور: select بمعجم المصدر الحرفي — لا حقل حر |
| 4 | `ChangeStatusRequest`: `status` `@NotBlank` + `@Pattern(DISABLED\|ENABLED)` + `reason` `@NotBlank` (AdminController:73-76) | نموذج الحالة: select بمعجمين + السبب إلزامي — كلمات 400 تُعرض حرفيًا |
| 5 | `pseudonymizeUser` يجيب **503 SU-001** ما دامت `PSEUDONYMIZATION_HMAC_KEY` غير مربوطة (javadoc AdminController:96-98 — «القدرة موقوفة لا معطوبة») | إقرار صدق على النموذج نفسه؛ رفض 403 يُعرض لحسابنا قبل بلوغ 503 أصلًا |
| 6 | purge-content يجيب `{purgedRows}` وpurge-audit-history يجيب `{scrubbedRows, usersAudRowsDeleted}` (سجلات المصدر 126/153)؛ كلاهما `@NotBlank reason` | الأعداد تُعرض في كلمات النجاح عند توفر أدمن — عبر حالة الإجراء |
| 7 | `setListingPromotion`: جسم `{until: Instant}` **اختياري الإرسال** — الغياب/null **يمسح** الترويج (javadoc:180-183 «an admin correcting a shading is the documented exit»)؛ الاستجابة `ListingPromotion {id, promotedUntil: Instant\|null}` | نموذج واحد للتغيير والمسح: حقل فارغ = مسح — بدلالة المصدر نفسها |
| 8 | `archiveListing` يجيب صف `ProviderListingSummary` كاملًا (id/title/category/price/**providerId**/status/…) — الواجهة الإدارية الوحيدة التي تكشف `providerId` في قراءة (قياس المهمة 26: مقصور على أسطح AdminController) | صفوف قائمة الإعلانات تحمل مصدر معرّف المزوّد لنموذجي verify/suspend — مقيدًا بقراءة الأدمن نفسها (لحسابنا: 403) |
| 9 | `creditProvider`: **عقد query-string** `@RequestParam paymentIntentId, amountCents` (LedgerController:21-25) — لا جسم JSON؛ والقراءة `getProviderBalance` → `ProviderBalance` بمعرّف الكيان = providerId نفسه (getId مُعاد التعريف) | نفس انضباط الدفعة-2 لعقود `@RequestParam`؛ الرصيد `{id, availableCents, createdAt, updatedAt}` |
| 10 | `POST /admin/disputes/{id}/resolve`: الجسم **اختياري** (`required = false`) — الغياب = NO_ACTION حرفيًا (DisputeController:40-56)؛ المعجم REFUND_CONSUMER \| RELEASE_PROVIDER \| NO_ACTION (موجود أصلاً في disputes-contract.ts من الدفعة-2) | select بثلاث قيم + خيار «بلا جسم (NO_ACTION)» صريح — عقد المصدر نفسه |
| 11 | `GeoAdminController`: الإنشاء `parentId` يمرّ بـ`requireExisting` (404 مجهول — GeoService:132-133)، `nameAr @NotBlank`، `slug @NotBlank @Pattern([a-z0-9-]{2,120})`، تعارض slug = 409 «slug already exists»؛ الحذف childless-only (409 مع أبناء)؛ PATCH = إعادة تسمية/re-slug فقط | الحدود حراسة المصدر؛ 404/409 بكلمات الخلفي الحرفية |
| 12 | `RevisionEntry {revisionNumber, revisedAt, revisionType, entity: Object}` — الكيان **شكل خام** (سجل المصدر 83-88) + `listAuditedEntities` يعيد أسماء الكيانات Audited مرتبة | قراءة المراجعات تعرض الأرقام/النوع/التاريخ والكيان كما هو (JSON خام بلا إعادة تركيب) |
| 13 | **لا اعتمادات ADMIN موجودة عندنا** (قياس المهمة 26 — bcrypt غير معروف، فحص متغيرات الستيجم كاملًا) | إقرار الصدق نفسه: المسارات السعيدة غير قابلة للتحقق الحي بحسابنا — يُصرَّح ولا يُفترض؛ البطارية تتحقق من البوابات والبنية وكلمات الرفض |
| 14 | **القراءات ذات المدخل** (قصد واحد بالمعرّف، رصيد مزوّد، مراجعات كيان): لا حالة طرفية — القراءة تُقاد **بالعنوان (URL-as-state)** عبر نموذج `method="get"` + `searchParams` في RSC — نمط `/neighborhoods?parent=` و`/listings` المقرر | لا action للقراءة الصرفة؛ الكتابات وحدها Server Actions |

## القسم 1 — المستخدمون (٦ عمليات)

على `/admin` نفسها قسم «المستخدمون»: القراءة `GET /api/v1/admin/users?page=0&size=20` (صفوف `UserSummary {id, email, displayName, role, createdAt, updatedAt}`) + خمسة نماذج أوامر Server Actions:
- **الدور**: `PUT …/users/{id}/role {role}` — select بمعجم المصدر الحرفي (CONSUMER/PROVIDER/ADMIN — القياس #3).
- **الحالة**: `PUT …/users/{id}/status {status, reason}` — select بمعجمين (DISABLED/ENABLED) + سبب إلزامي (القياس #4).
- **التجنّب (pseudonymize)**: `POST …/users/{id}/pseudonymize {reason}` — مع إقرار 503 SU-001 على النموذج (القياس #5).
- **تطهير المحتوى**: `POST …/users/{id}/purge-content {reason}` → `purgedRows` في كلمات النجاح (القياس #6).
- **تطهير سجل التدقيق**: `POST …/users/{id}/purge-audit-history {reason}` → العدّان في كلمات النجاح (القياس #6).

معرّف المستخدم: من صفوف القسم نفسها عند توفر الأدمن؛ الحقل صريح قابل للنسخ (نمط «معرّف الدفعة» بالدفعة-3).

## القسم 2 — الحجوزات (قراءة)

قسم «الحجوزات (كلها)»: `GET /api/v1/admin/bookings?status=&page=0&size=20` — `status` اختياري (`@RequestParam(required=false)`, AdminController:203-208) بلا تحرّي معجم طرفي (الخلفي يمرره كما هو إلى `listByStatusSummary`)؛ الصفوف `BookingSummary {id, consumerId, providerId, listingId, status, priceCents, currency, startsAt, endsAt, createdAt, updatedAt}` — يُعرض بالتسميات الموجودة (booking-contract.ts) بلا قراءة إضافية.

## القسم 3 — الإعلانات والترويج (٣ عمليات)

قسم «كل الإعلانات»: `GET /api/v1/admin/listings?page=0&size=20` (صفوف `ProviderListingSummary` — القياس #8: مصدر `providerId` الوحيد في قراءة تعرضه الواجهة) + نموذجان:
- **الأرشفة**: `POST …/admin/listings/{id}/archive` → الصف المؤرشف يُعرض في كلمات النجاح.
- **الترويج (L37)**: `PUT …/admin/listings/{id}/promotion {until}` — حقل `datetime` اختياري؛ **الفارغ = مسح** (القياس #7 بدلالة المصدر)؛ الاستجابة `{id, promotedUntil|null}` تُعرض حرفيًا.

## القسم 4 — قصد دفع واحد (قراءة بالمدخل)

داخل قسم «المدفوعات» القائم: نموذج `method="get"` بحقل `intentId` → `GET /api/v1/admin/payments/{id}` (`PaymentSummary` — العقد نفسه لصفوف القائمة) يقرأ في RSC عند وجود المعيار ويُعرض صفًّا واحدًا تحت القائمة؛ بلا حالة طرفية (القياس #14).

## القسم 5 — المزوّدون: التحقق والتعليق (عمليتان)

قسم «المزوّدون»: نموذجان Server Actions:
- **verify**: `POST …/admin/providers/{id}/verify` → `ProviderResponse` (الحالة VERIFIED في كلمات النجاح).
- **suspend**: `POST …/admin/providers/{id}/suspend` → `ProviderResponse` (الحالة SUSPENDED).

معرّف المزوّد بفضاء **معرّف الملف** (لا معرّف المستخدم — فضاءان مختلفان، القياس المقيس H4)؛ مصدره لعملياتنا: صفوف قائمة الإعلانات الإدارية (providerId) — وإلا فالحقل صريح بإقرار الفضاء.

## القسم 6 — الأستاذ الإداري (عمليتان)

قسم «الأستاذ»: نموذج `method="get"` بحقل `balanceProviderId` → `GET /api/v1/admin/ledger/providers/{providerId}/balance` يُقرأ في RSC عند وجود المعيار ويعرض بطاقة `ProviderBalance {id, availableCents, createdAt, updatedAt}` (الرصيد بالوحدات الصغرى — القياس #9). + نموذج **الإيداع**: `POST …/admin/ledger/providers/{providerId}/credit?paymentIntentId&amountCents` — **عقد query-string حرفيًا** (القياس #9) بجسم فارغ، كنمط الدفعة-2.

## القسم 7 — تسوية النزاعات (عملية)

قسم «النزاعات»: نموذج `POST …/admin/disputes/{id}/resolve` بمعرّف النزاع + select القرار بمعجم المصدر الثلاثي + خيار صريح «بلا قرار (NO_ACTION)» الذي يرسل **بلا جسم** (القياس #10 — `required=false` حرفيًا)؛ الاستجابة `DisputeResponse` (موجودة أصلاً في disputes-contract.ts) تُعرض في كلمات النجاح.

## القسم 8 — الجغرافيا الإدارية (٣ عمليات)

قسم «الشجرة الجغرافية»: ثلاثة نماذج Server Actions على `GeoAdminController`:
- **إنشاء فرع**: `POST /api/v1/admin/geo {parentId, nameAr, nameEn?, slug}` — 201 + صدى `GeoNode` (القياس #11: parentId مجهول = 404، slug التعارض = 409، النمط `[a-z0-9-]{2,120}`).
- **إعادة تسمية/re-slug**: `PATCH …/admin/geo/{id} {nameAr, nameEn?, slug}` → `GeoNode`.
- **حذف**: `DELETE …/admin/geo/{id}` — 204 (childless-only؛ الأبناء = 409).

مصدر معرّفات المواقع لعملياتنا: منتقي `/neighborhoods` العام (قراءة `/geo/locations?parent=` — الشجرة نفسها 409 معطوبة)؛ الحقول صريحة.

## القسم 9 — مراجعات التدقيق (عمليتان)

قسم «سجل المراجعات»: القراءة الأولى `GET /api/v1/admin/revisions/entities` (أسماء الكيانات Audited مرتبة — تُعرض كقائمة) + نموذج `method="get"` بحقلين `revisionEntity` و`revisionId` → `GET /api/v1/admin/revisions/{entityName}/{id}` يُقرأ في RSC عند وجودهما: صفوف `RevisionEntry {revisionNumber, revisedAt, revisionType, entity}` — الكيان الخام يُعرض كـJSON مضغوط (بلا إعادة تركيب — القياس #12).

## حدّ الصدق المُلزم للوحة كلها (قياس #13)

إقرار الدفعة-3 يبقى فوق الأقسام: اللوحة للإدارة؛ حساب غير الأدمن يرى رفض الخلفي الحرفي (403 AUTHZ-001) في **كل** قراءة وحالة إجراء جديدة؛ المسارات السعيدة غير قابلة للتحقق بحساب الاختبار (لا اعتمادات أدمن) — التصميم ضد العقد الرسمي والمصدر، والخلفي هو السلطة الوحيدة.

## بوابات ما قبل التنفيذ

- كل كتابة عبر Server Action: فحص جلسة + `backendSend` + كلمات problem+json حرفياً + `refresh()` (نمط المستودع ×10 + refresh.md المحزومة)؛ عقود `@RequestParam` عبر المسار (نمط الدفعة-2).
- كل قراءة ذات مدخل = نموذج `method="get"` + `searchParams` في RSC (URL-as-state — نمط `/neighborhoods?parent=`) — لا قراءة مصافة طرفية.
- **خطة التحقق الملزمة**: lint → `tsc` → `build` بالمثبتة `../.tools/node-v26.8.2` + حلقة next-dev-loop (MCP `get_compilation_issues` صفر + `get_errors` صفر + `agent-browser` سلوك مقيس) + **دمج محلي فقط — لا دفع إلا بكلمة المالك**.
- بطارية حية عبر BFF (القناة نفسها): مجهول → بوابة + noindex + صفر تسريب أقسام/نماذج؛ مصادق (qa-tester) → القراءات الجديدة السبع + نماذج القياس تُظهر كلمات الرفض الحرفية؛ حالة الإجراء تُظهر 403 نفسه؛ البنية سليمة بعد reload بلا أخطاء hydration.
- قسم Routes في AGENTS.md يُحدَّث للأقسام الجديدة على المسار نفسه `/admin` (البلوك المُدار لا يُلمس).

## خارج النطاق صراحة

webhooks الدفع (قناة خادم-إلى-خادم موقّعة) · مسارات الفئة المقصوصة ×2 و`GET /payments/intents/{id}` العام و`GET /reviews/{id}` (مقصوصة بقياس سابق) · محول العملة (YAGNI سابقاً) · الأستاذ للمزوّد وتحرير ملفه وstats وgeo/tree (بنود تسليم الخلفي الأربعة — دون تغيير بالقياس #1) · رابط تنقل عام للوحة · إصلاحات الخلفي نفسها (مستودع منفصل) · أي دفع للأصل.
