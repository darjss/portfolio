# Базаррагчаагийн Авиддарам

**Програм хангамжийн инженер · Full-stack ба AI агент**
Улаанбаатар · Remote эсвэл гадаадад ажиллах боломжтой · +976 9456 8799 · hi@darjs.dev · [github.com/darjss](https://github.com/darjss) · [darjs.dev](https://darjs.dev)

## Товч танилцуулга

Production систем бүтээж, нэвтрүүлсэн 2.5 жилийн туршлагатай програм хангамжийн инженер. Үндэсний банкинд төлбөрийн функц, нээлттэй эхийн CRM-д AI агентын платформ, гэр бүлийнхээ бизнест онлайн дэлгүүр бүтээсэн. Функцийг schema, UI, deploy хүртэл бүрэн хариуцаж, даалгахыг хүлээлгүй эхлүүлдэг. erxes-д кодын чанар, SEO сайжруулах ажлыг санаачлан удирдаж байна. Англи хэлээр чөлөөтэй харилцдаг.

## Ажлын туршлага

### [erxes](https://github.com/erxes/erxes) · Backend инженер, full stack · Remote
**2026.06 – одоог хүртэл**

Нээлттэй эхийн CRM, хэрэглэгчийн туршлагыг удирдах платформ. 4 сард 6 repository-д 117 PR merge хийсэн.

- TypeScript, Mastra, AI SDK, React, MongoDB ашиглан erxes-ийн AI агент plugin-ийн ихэнхийг нэг инженертэй хамт бүтээсэн: Mastra runtime, persistent memory, агентын skill, streaming чат, PPTX, PDF, график artifact, монгол ярианы горим.
- Production орчны tool call алдааг бууруулсан. Deal үүсгэх 45 дуудлага бүгд ID шалгалтад унаж, нийт tool call-ийн 19 орчим хувь буруу аргументаас болж алдаж байсан. Нэрээр ID олдог resolver нэмж, GraphQL schema-ийн бодит мэдээллийг tool-ийн тодорхойлолтод оруулж, хоёр алдааг зассан.
- Агентыг SSRF, DNS rebinding, zip bomb, Mermaid болон SVG XSS халдлагаас хамгаалсан. Устгах үйлдэлд хүнээс зөвшөөрөл авах, серверээс цуцлах боломж, tenant бүрд тусгаарласан cache нэмсэн.
- MCP, API холбодог Executor болон Cloudflare OS-ийг erxes-д нэгтгэн суулгасан: tenant бүрийн provisioning, нууц үггүй SSO.
- Plugin-уудыг erxes monorepo-оос тусдаа repository-д ажиллуулахад дутуу байсан боломжуудыг нэмсэн: dev орчинд ачаалах, UI remote-оо өөрөө serve хийх, нэгдсэн theme. Одоо plugin marketplace, hackathon зохион байгуулах багуудад ажиллаж байна.
- Кодын чанарын ажлыг санаачилж, CTO-тай хамт удирдаж байна. Нэг plugin-ийг бүхэлд нь 280 файл хамарсан 12 PR-аар schema-first GraphQL codegen-д шилжүүлсэн. Build үед contract шалгадаг болгож, бусад plugin багийн шилжилтэд тусалж байна.
- Вэбсайтад суулгадаг messenger widget-ийн bundle-ийг 72–82%-иар багасгасан: Lighthouse mobile 63 → 86, total blocking time 2.4 с → 0.56 с. Санаачлан удирдаж буй SEO ажлаар erxes.io-ийн 18 секундын LCP-г зассан.

### Amerik Vitamin · Үүсгэн байгуулагч, инженер · Гэр бүлийн бизнес
**2025.07 – одоог хүртэл**

- Ээжийнхээ АНУ-аас витамин импортолдог бизнест зориулж [amerikvitamin.mn](https://amerikvitamin.mn) онлайн дэлгүүр бүтээж, ажиллуулж байна: Astro, Solid, React, Hono, tRPC, Cloudflare Workers, Postgres, QPay. 652 бүтээгдэхүүн, 483 вэб захиалга, 367 хэрэглэгч.
- Хэрэглэгчийн илгээсэн зургаар бүтээгдэхүүнийг таньж, чатаар захиалга авдаг Messenger AI борлуулалтын агент хийж байна.

### Голомт банк · Програм хангамжийн инженер, SocialPay backend баг
**2024.05 – 2025.06**

SocialPay нь Голомт банкны төлбөр, хэтэвчний апп. Хичээлтэй үед цагийн, амралтаар бүтэн цагаар. Java, Spring Boot, Oracle, ArgoCD.

- Жижиг, дунд бизнес эрхлэгчдийн SME аппын backend-ийг эхний 4 сартаа ганцаараа бүрэн бичиж, Spring Boot-ийг ажил дээрээ сурсан: данс, гүйлгээ, POS гүйлгээний түүх, цаасны захиалга, засварын хүсэлт. UAT, production-д deploy хийж, DevOps багтай анхан шатны CI/CD тохируулсан. Банк олон нийтэд нээхийг хойшлуулсан.
- SocialPay-ийн MostMoney QR төлбөрийн backend-ийг бүрэн хариуцсан: QPay-тай зэрэгцэх шинэ QR урсгал, дансны шилжүүлгээр тооцоо хийдэг.
- Монголын IBAN шилжилтийн SocialPay-д хамаарах ажлыг хийсэн: Монголбанкаар IBAN хайх, Дансны нэгдсэн санд бүртгэх. Ингэснээр аль ч банкны апп хэрэглэгчийг утасны дугаар эсвэл имэйлээр нь олох боломжтой болсон.
- И-баримтын интеграцийг бүрэн хариуцсан. Firebase console-оос илгээдэг, өмнө нь хадгалдаггүй байсан push мэдэгдлийг хадгалах шийдэл хийсэн.
- Багийн ахлагчийн амралтаар удирдлагын анхааралд байсан чухал ажлуудыг нь хариуцсан.

## Сонгосон төслүүд

- **[T3 Code](https://github.com/pingdotgg/t3code)**, 27k одтой open-source төсөлд оруулсан хувь нэмэр. ACP adapter-ийн event log квадрат хурдтай өсдөг алдааг олж зассан: 17.8 GB SQLite-ийн 3.68 сая мөрийн 95% нь stream хийгдсэн tool update байсан. Maintainer merge хийсэн ([#16682](https://github.com/pingdotgg/t3code/pull/16682)).
- **[Tranzfer](https://github.com/darjss/tranzfer-v2)**. Контент бүтээгч, эвлүүлэгчдэд зориулсан файл дамжуулах үйлчилгээ. Тасарсан дамжуулалтыг үргэлжлүүлдэг. Solid 2, Effect, Alchemy, Cloudflare D1, R2. PR бүрийн preview орчин, CI-д e2e тест.
- **[khaan-client](https://github.com/darjss/khaan-client)**. Хаан банкны баримтжуулаагүй API-д зориулсан TypeScript SDK: OTP-оор төхөөрөмж бүртгэх, гүйлгээ татах, шилжүүлгийг автоматаар тулгах.
- **[Herdr Orchestrate](https://github.com/darjss/herdr-orchestrate)**. Олон AI coding агентыг terminal session-д харагдахаар ажиллуулдаг хэрэгсэл: тусгаарласан Git worktree, model routing.
- **[DMS plugin-ууд](https://github.com/darjss/dms-bar-usage)**. Linux-ийн DankMaterialShell-д зориулсан plugin-ууд: Go сервистэй AI хэрэглээний widget, дуудлагын overlay, cast удирдлага.

## Ур чадвар

**Програмчлалын хэл:** TypeScript, Java, Go, Kotlin, Python, SQL, QML
**AI:** Mastra, AI SDK, MCP, tool calling, agent memory, human-in-the-loop, voice
**Backend ба өгөгдөл:** Bun, Node.js, Elysia, Hono, Effect, tRPC, GraphQL, Spring Boot, Drizzle, PostgreSQL, Oracle, MongoDB, Redis
**Frontend ба infra:** SolidJS, React, Astro, TanStack, Tailwind, Cloudflare Workers, Durable Objects, D1, R2, Alchemy, Docker, ArgoCD

## Боловсрол

**МУИС** · Мэдээллийн систем, бакалавр · 2022 – 2027, диплом 2027.01
**Pinecone Academy** · Програм хангамжийн инженерийн bootcamp · 2023 – 2024
