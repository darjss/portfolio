# Базаррагчаагийн Авиддарам

**Програм хангамжийн инженер · Full-stack ба AI агент**
Улаанбаатар · Remote болон гадаадад шилжин ажиллахад нээлттэй · +976 9456 8799 · hi@darjs.dev · [github.com/darjss](https://github.com/darjss) · [darjs.dev](https://darjs.dev)

## Товч танилцуулга

Production систем бүтээж, нэвтрүүлсэн 2.5 жилийн туршлагатай програм хангамжийн инженер. Үндэсний банкинд төлбөрийн функцууд, нээлттэй эхийн CRM-д AI агент платформ, гэр бүлийнхээ бизнест онлайн дэлгүүр бүтээсэн. Функцийг схемээс эхлээд UI, deploy хүртэл бүрэн хариуцдаг, хэн ч даалгаагүй ажлыг өөрөө эхлүүлдэг. erxes-д код чанарын болон SEO санаачилгыг гаргаж, удирдаж байна. Англи хэл чөлөөтэй.

## Ажлын туршлага

### erxes · Backend инженер, full stack · Remote
**2026.06 – одоог хүртэл**

Нээлттэй эхийн CRM ба хэрэглэгчийн туршлагын платформ. 4 сарын дотор 6 repository-д 117 PR merge хийсэн.

- TypeScript, Mastra, AI SDK, React, MongoDB дээр erxes-ийн AI агент plugin-ийн ихэнх хэсгийг өөр нэг инженертэй хамт бүтээсэн: Mastra runtime, байнгын санах ой, агент skill, streaming чат, PPTX, PDF, график artifact, яриаг нь тасалж болдог монгол дуут горим.
- Production дахь tool-call алдааг бууруулсан. Deal үүсгэх 45 дуудлага бүгд ID шалгалт дээр унаж, нийт tool дуудлагын 19 орчим хувь буруу аргументаас болж алдаа өгч байсан. Нэрээр нь ID олдог resolver болон GraphQL схемийн бодит мэдээллийг tool тодорхойлолтод оруулж хоёуланг нь зассан.
- Агентыг SSRF, DNS rebinding, zip bomb, Mermaid болон SVG XSS халдлагаас хамгаалсан. Устгах үйлдэлд хүний зөвшөөрөл, сервер талаас цуцлах боломж, tenant тус бүрээр тусгаарласан cache нэмсэн.
- MCP ба API интеграцийн давхарга болох Executor болон Cloudflare OS-ийг erxes дотор суурилсан бүтээгдэхүүн болгон нэгтгэсэн: tenant тус бүрийн provisioning, нууц үггүй SSO.
- Plugin-ууд erxes monorepo-оос гадуур тусдаа repository-д ажиллахад дутуу байсан хэсгүүдийг нэмсэн: dev орчинд ачаалах, өөрийн UI remote-ийг үйлчлэх, нийтлэг theme. Одоо plugin marketplace болон hackathon зохион байгуулах багт ажиллаж байна.
- Код чанарын санаачилгыг гаргаж, CTO-тай хамт удирдаж байна. Нэг plugin-ийг бүхэлд нь 280 файл хамарсан 12 PR-аар schema-first GraphQL codegen руу шилжүүлж, build үеийн contract шалгалт нэмж, бусад plugin багуудад шилжихэд тусалж байна.
- Вэбсайтад суулгадаг messenger widget-ийн bundle-ийг 72–82%-иар багасгасан: Lighthouse mobile 63 → 86, total blocking time 2.4 с → 0.56 с. Өөрийн санаачилсан SEO ажлын хүрээнд erxes.io дээрх 18 секундын LCP-г зассан.

### Amerik Vitamin · Үүсгэн байгуулагч, инженер · Гэр бүлийн бизнес
**2025.07 – одоог хүртэл**

- Ээжийнхээ АНУ-аас витамин импортлох бизнест зориулсан [amerikvitamin.mn](https://amerikvitamin.mn) онлайн дэлгүүрийг бүтээж, ажиллуулж байна: Astro ба Solid storefront, React админ, Cloudflare Workers дээр Hono ба tRPC, Postgres, QPay төлбөр. 652 бүтээгдэхүүн, 483 вэб захиалга, 367 хэрэглэгч.
- Хэрэглэгчийн илгээсэн зургаар бүтээгдэхүүнийг таньж, чатаар захиалга авдаг Messenger AI худалдааны агент хөгжүүлж байна.

### Голомт банк · Програм хангамжийн инженер, SocialPay backend баг
**2024.05 – 2025.06**

SocialPay бол Голомт банкны төлбөр, хэтэвчний апп. Хичээлийн үеэр цагийн, амралтын үеэр бүтэн цагаар ажилласан. Java, Spring Boot, Oracle, ArgoCD.

- Жижиг, дунд бизнес эрхлэгчдэд зориулсан SME аппын backend-ийг эхний 4 сартаа ганцаараа бүхэлд нь бичиж, Spring Boot-ийг ажил дээрээ сурсан: данс, гүйлгээ, POS гүйлгээний түүх, цаас захиалга, засварын хүсэлт. UAT болон production орчинд гаргаж, DevOps багтай хамт үндсэн CI/CD-г тохируулсан. Олон нийтэд нээхийг банк түр зогсоосон.
- SocialPay-д MostMoney QR төлбөрийг backend талд бүрэн хариуцсан: QPay-ийн хажууд шинэ QR уншилтын урсгал, дансны шилжүүлгээр тооцоо хийдэг.
- Монголын IBAN шилжилтэд SocialPay-ийн хэсгийг хийсэн: Монголбанкаар дамжуулан IBAN хайх, Дансны нэгдсэн санд бүртгэх. Ингэснээр аль ч банкны апп хэрэглэгчийг утасны дугаар эсвэл имэйлээр нь олох боломжтой болсон.
- И-баримтын интеграцийг эхнээс нь дуустал хариуцсан. Өмнө нь Firebase console-оос илгээгээд хадгалагддаггүй байсан push мэдэгдлийг хадгалдаг болгож шинээр зохион бүтээсэн.
- Багийн ахлагчийг амралттай үед удирдлагын анхаарлын төвд байсан чухал ажлуудыг нь хариуцсан. Apple Pay нэвтрүүлэхэд дэмжлэг үзүүлж, WeChat Pay QR deep link-ийн алдааг WeChat-ийн инженерүүдтэй хамт шийдсэн.

## Сонгосон төслүүд

- **[Tranzfer](https://github.com/darjss/tranzfer-v2)**. Контент бүтээгч, засварлагчдад зориулсан, тасарсан ч үргэлжлүүлж болдог файл дамжуулах үйлчилгээ. Олон нийтэд нээхэд бэлтгэж байна. Cloudflare D1, R2 дээр Solid 2, Effect, Alchemy. Staging, production, PR тус бүрийн preview орчин, CI дээр e2e тест, Axiom telemetry.
- **[khaan-client](https://github.com/darjss/khaan-client)**. Хаан банкны баримт бичиггүй API-д зориулсан TypeScript SDK: OTP-оор төхөөрөмж бүртгэх, гүйлгээ татах, шилжүүлгийг автоматаар тулгах. Amerik Vitamin-ийн backend дээр орж ирсэн шилжүүлгийг захиалгатай тулгадаг.
- **[Herdr Orchestrate](https://github.com/darjss/herdr-orchestrate)**. Олон AI coding агентыг харагдах terminal session-д ажиллуулдаг хэрэгсэл: тогтвортой төлөв, тусгаарлагдсан Git worktree, моделийн чиглүүлэлт. GitHub дээр 7 од.
- **[Plugged Audio](https://github.com/darjss/plugged)**. Монголд зориулсан IEM чихэвчний дэлгүүр, нээлтэд бэлтгэж байна. Cloudflare D1 дээр Astro, Solid, Elysia, Drizzle, QPay төлбөр, Vectorize дээр semantic ба түлхүүр үгийн хосолсон хайлт, Android утсыг SMS gateway болгон нэвтрэх код илгээдэг.

## Ур чадвар

**Програмчлалын хэл:** TypeScript, Java, Go, Kotlin, Python, SQL
**AI:** Mastra, AI SDK, MCP, tool calling, memory, human-in-the-loop, voice
**Backend:** Node.js, Bun, Spring Boot, Hono, GraphQL, tRPC, PostgreSQL, Oracle, MongoDB, Redis
**Frontend ба infra:** React, SolidJS, Astro, Cloudflare Workers, Durable Objects, D1, R2, Docker, ArgoCD, GitHub Actions
**Хэл:** Монгол хэл төрөлх, англи хэл чөлөөтэй

## Боловсрол

**МУИС** · Мэдээллийн систем, бакалавр · 2022 – 2027, диплом 2027.01
**Pinecone Academy** · Програм хангамжийн инженерийн bootcamp · 2023 – 2024
