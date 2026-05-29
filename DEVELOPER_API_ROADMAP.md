# Woontegra Developer API / Public API — Yol Haritası

> **Durum:** Planlandı · Henüz aktif değil  
> **Son güncelleme:** 2026-05  
> **İlgili iskelet:** [`backend/src/modules/developer-api/README.md`](backend/src/modules/developer-api/README.md)

---

## Amaç

Woontegra’yı kullanan mağazaların ve üçüncü taraf yazılımların (ERP, muhasebe, stok, özel panel, entegrasyon araçları) **güvenli, tenant izole ve denetlenebilir** bir **Public API / Developer API** üzerinden Woontegra ile konuşabilmesini sağlamak.

Bu doküman, dış entegrasyon API’sinin **henüz açılmadığını** ve hangi sırayla geliştirileceğini netleştirir. Projeyi tarayan herkes “eksik ama planlanmış” durumunu görebilir.

---

## Neden gerekli?

- Mağaza sahipleri ürün, sipariş, stok ve müşteri verilerini kendi sistemleriyle senkronize etmek isteyebilir.
- Pazaryeri / kargo / muhasebe entegrasyonları tek bir **standart REST API** ile yönetilebilir hale gelir.
- Admin panel API’si (`/api/admin/*`) iç operasyon içindir; dış entegrasyon için **ayrı kimlik doğrulama, scope ve rate limit** gerekir.
- API key, webhook ve audit log altyapısı olmadan dış API açmak güvenlik riski oluşturur.

---

## Kapsam

| Dahil | Hariç (ilk fazlar) |
|--------|---------------------|
| REST API v1 (`/api/v1/*`) | GraphQL |
| API key + tenant scope | OAuth2 / SSO (sonraki faz) |
| Ürün, sipariş, müşteri, stok (okuma + sınırlı yazma) | Admin panel endpoint’lerinin proxy’lenmesi |
| Webhook kayıt ve teslimat | Gerçek zamanlı bidirectional sync protokolü |
| OpenAPI/Swagger dokümantasyonu | Public SDK paketleri (sonraki faz) |
| Rate limit + audit log | Sınırsız bulk export |

---

## İlk sürümde planlanan endpoint grupları

> **Önemli:** Aşağıdaki route’lar **yalnızca plandır**. API key + tenant scope + rate limit + audit log tamamlanmadan **aktif edilmeyecektir**.

### Ürünler

| Method | Route | Açıklama |
|--------|-------|----------|
| GET | `/api/v1/products` | Tenant’a ait ürün listesi (sayfalı) |
| GET | `/api/v1/products/:id` | Tek ürün detayı |
| POST | `/api/v1/products` | Yeni ürün oluşturma |
| PATCH | `/api/v1/products/:id` | Ürün güncelleme |

### Siparişler

| Method | Route | Açıklama |
|--------|-------|----------|
| GET | `/api/v1/orders` | Sipariş listesi |
| GET | `/api/v1/orders/:id` | Sipariş detayı |
| PATCH | `/api/v1/orders/:id/status` | Sipariş durumu güncelleme |

### Müşteriler

| Method | Route | Açıklama |
|--------|-------|----------|
| GET | `/api/v1/customers` | Müşteri listesi |

### Stok

| Method | Route | Açıklama |
|--------|-------|----------|
| GET | `/api/v1/stock` | Stok özeti / liste |
| PATCH | `/api/v1/stock/:productId` | Ürün stok güncelleme |

### Webhook’lar

| Method | Route | Açıklama |
|--------|-------|----------|
| POST | `/api/v1/webhooks` | Webhook endpoint kaydı |
| GET | `/api/v1/webhooks` | Kayıtlı webhook listesi |
| DELETE | `/api/v1/webhooks/:id` | Webhook silme |

---

## İlk sürümde olmayacaklar

- Mevcut **admin API** route’larının dışarıya açılması veya JWT admin token’ının üçüncü tarafa verilmesi
- GraphQL veya gRPC
- OAuth2 authorization server (Faz 2+ değerlendirilecek)
- Toplu veri export (CSV/Excel) public API üzerinden
- Ödeme kartı / PCI kapsamındaki ham veri
- Super-admin / çoklu tenant yönetimi public API’den
- Pazaryeri credential’larının ham döndürülmesi

---

## Güvenlik gereksinimleri

Public API **aşağıdaki katmanlar tamamlanmadan production’da açılmayacaktır:**

1. **API key doğrulama** — Her istek `Authorization: Bearer <api_key>` veya `X-Api-Key` ile kimlik doğrulanır.
2. **Tenant izolasyonu** — Key yalnızca bağlı olduğu tenant verisine erişir; cross-tenant sızıntı engellenir.
3. **Scope / permission** — Key başına `products:read`, `orders:write` gibi yetkiler.
4. **Rate limit** — Tenant + key bazlı (bkz. mevcut `API_KEY_RATE_LIMIT_README.md` ile uyumlu tasarım).
5. **Audit log** — Kim, hangi key, hangi endpoint, hangi tenant, sonuç (success/fail).
6. **HTTPS zorunlulu** — Production’da yalnızca TLS.
7. **Input validation** — DTO + class-validator; mass assignment koruması.
8. **Idempotency** — Yazma işlemlerinde `Idempotency-Key` header (Faz 1B).

> **Kritik not:** Bu endpoint’ler **API key + tenant scope + rate limit + audit log tamamlanmadan aktif edilmeyecektir.**

---

## Tenant izolasyonu

- Her API key `tenantId` ile ilişkilidir.
- Service katmanında tüm sorgular `WHERE tenant_id = :authenticatedTenantId` zorunludur.
- URL veya body’den gelen `tenantId` **asla** güvenilmez; yalnızca key’den çözümlenir.
- Super-admin key’leri public API’de **varsayılan olarak yoktur**; ayrı internal API gerekir.

---

## API key sistemi

- Key üretimi: admin panel → Developer / Integrations bölümü (Faz 1).
- Key formatı: `wnt_live_...` / `wnt_test_...` (prefix + random).
- Hash’lenmiş saklama (plain text DB’de tutulmaz).
- Key rotation ve revoke desteği.
- Son kullanım / son IP audit alanı.

---

## Scope / permission sistemi

Örnek scope’lar:

| Scope | İzin |
|-------|------|
| `products:read` | GET products |
| `products:write` | POST/PATCH products |
| `orders:read` | GET orders |
| `orders:write` | PATCH order status |
| `customers:read` | GET customers |
| `stock:read` | GET stock |
| `stock:write` | PATCH stock |
| `webhooks:manage` | POST/GET/DELETE webhooks |

Key oluşturulurken scope seti seçilir; controller seviyesinde `ApiScopeGuard` kontrol eder.

---

## Rate limit

- Varsayılan: örn. 60 req/dk/key (ayarlanabilir).
- Aşımda `429 Too Many Requests` + `Retry-After`.
- Mevcut rate limit altyapısı (`API_KEY_RATE_LIMIT_README.md`) ile entegre edilecek; duplicate logic yazılmayacak.

---

## Webhook sistemi

- Olaylar: `order.created`, `order.status_changed`, `product.updated`, `stock.updated` (Faz 1B genişletme).
- HMAC imza (`X-Woontegra-Signature`) ile doğrulama.
- Retry + dead letter queue (mevcut `WEBHOOK_SYSTEM_README.md` ile uyum).
- Public API webhook kayıtları tenant + key scope ile sınırlı.

---

## Audit log

Her public API isteği için minimum kayıt:

- `timestamp`, `tenantId`, `apiKeyId` (hash/id), `method`, `path`, `statusCode`, `ip`, `userAgent`, `durationMs`

Admin panelden Developer API → Audit sekmesinde filtrelenebilir olacak (Faz 2 UI).

---

## Versiyonlama

- URL prefix: `/api/v1/`
- Breaking change → `/api/v2/`; v1 en az 12 ay destek.
- `Accept-Version` veya path versiyonu (v1 path tercih edilir).
- Deprecation: `Sunset` header + dokümantasyon uyarısı.

---

## OpenAPI / Swagger dokümantasyonu

- Faz 1C: `@nestjs/swagger` veya statik `openapi.yaml` → `/api/v1/docs` (auth korumalı veya public read-only spec).
- Her endpoint için request/response şeması, scope gereksinimi, rate limit notu.
- Postman collection export.

---

## Uygulama fazları

| Faz | İçerik | Çıktı |
|-----|--------|--------|
| **Faz 0** (şu an) | Roadmap + kapalı modül iskeleti | Bu dosya + `developer-api/README.md` |
| **Faz 1A** | API key modeli, guard’lar, tenant izolasyonu, audit log | Key CRUD (admin), guard’lar, boş health endpoint |
| **Faz 1B** | Read-only endpoints: products, orders, customers, stock GET | `/api/v1/*` GET’ler |
| **Faz 1C** | Write endpoints + OpenAPI | POST/PATCH + Swagger |
| **Faz 1D** | Webhook kayıt API + event dispatch | `/api/v1/webhooks` |
| **Faz 2** | Developer portal UI, key yönetimi, usage dashboard | Admin/Developer sayfası |
| **Faz 3** | OAuth2, SDK’lar, sandbox ortamı | Partner onboarding |

**Developer API hangi fazda geliştirilecek?** → **Faz 1A** ile kodlamaya başlanacak; Faz 0 tamamlandı (planlama).

---

## Yapılacaklar listesi

### Faz 0 — Planlama (tamamlandı / devam)

- [x] `DEVELOPER_API_ROADMAP.md` oluştur
- [x] `backend/src/modules/developer-api/README.md` placeholder
- [ ] Product owner ile scope listesini onayla
- [ ] Mevcut `API_KEY_RATE_LIMIT_README.md` ile teknik uyum review

### Faz 1A — Güvenlik iskeleti

- [ ] Prisma: `DeveloperApiKey`, `DeveloperApiAuditLog` modelleri
- [ ] `api-key.guard.ts` — key doğrulama + tenant çözümleme
- [ ] `api-scope.guard.ts` — route scope kontrolü
- [ ] `api-rate-limit.middleware.ts` — key bazlı limit
- [ ] `developer-api-audit.service.ts` — istek loglama
- [ ] Admin: API key oluştur / revoke UI
- [ ] `GET /api/v1/health` (auth’lu ping, veri döndürmez)

### Faz 1B — Read API

- [ ] `GET /api/v1/products`, `GET /api/v1/products/:id`
- [ ] `GET /api/v1/orders`, `GET /api/v1/orders/:id`
- [ ] `GET /api/v1/customers`
- [ ] `GET /api/v1/stock`

### Faz 1C — Write API + Docs

- [ ] `POST /api/v1/products`, `PATCH /api/v1/products/:id`
- [ ] `PATCH /api/v1/orders/:id/status`
- [ ] `PATCH /api/v1/stock/:productId`
- [ ] OpenAPI spec + `/api/v1/docs`

### Faz 1D — Webhooks

- [ ] `POST/GET/DELETE /api/v1/webhooks`
- [ ] Event dispatcher + HMAC imza
- [ ] Retry policy

### Faz 2+

- [ ] Developer portal
- [ ] Usage / quota dashboard
- [ ] Sandbox API keys
- [ ] Resmi SDK (Node, PHP)

---

## İlgili mevcut dokümanlar (değiştirilmedi)

- [`API_KEY_RATE_LIMIT_README.md`](API_KEY_RATE_LIMIT_README.md) — Rate limit tasarım referansı
- [`WEBHOOK_SYSTEM_README.md`](WEBHOOK_SYSTEM_README.md) — Webhook altyapı referansı
- [`RBAC_SYSTEM_README.md`](RBAC_SYSTEM_README.md) — Admin yetki modeli (public API scope’tan ayrı)

---

## Kontrol listesi (Public API açılmadan önce)

- [ ] API key + hash storage
- [ ] Tenant scope guard testleri
- [ ] Rate limit aktif
- [ ] Audit log yazılıyor
- [ ] Admin API route’ları public mount’ta değil
- [ ] OpenAPI yayında
- [ ] Penetrasyon / tenant isolation testi
- [ ] Production feature flag: `DEVELOPER_API_ENABLED=false` (varsayılan)
