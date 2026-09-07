# Vistar Kala — Backend

Core backend for the Vistar Kala artisan marketplace: OTP auth, artisan/buyer
profiles, product management, AI image processing & auto-cataloguing, a
dynamic fair-price engine, normal + reverse bidding with AI artisan matching,
order management, real-time notifications, search/filtering, and an admin
backend. Built from the project PRD.

This is a **working prototype**, matching the PRD's own "Prototype Scope"
(section 20): market-price data is seeded/mock, AI services (image
enhancement, transcription, cataloguing) are mocked so the full pipeline
runs end-to-end without needing external API keys, and the Fair Price Engine
and AI Artisan Matching are implemented as real, deterministic rule-based
logic (not mocked) — see `src/utils/fairPriceEngine.js` and
`src/utils/matchScore.js`.

## Stack

- Node.js + Express
- Sequelize ORM — **SQLite by default** (zero setup, file-based DB), swap to
  **PostgreSQL/Supabase** by changing two env vars
- JWT auth (mocked OTP delivery — the code is logged to the console / echoed
  in the API response in dev mode instead of being sent via SMS)
- Socket.IO for real-time bid/notification pushes
- Multer for image/audio uploads (stored under `/uploads`, served statically)

## Getting started

```bash
npm install
cp .env.example .env
npm run seed     # creates demo admin/artisan/buyer users + sample product + market-price data
npm run dev       # or: npm start
```

The server starts on `http://localhost:4000` (see `PORT` in `.env`).
`GET /api/health` confirms it's up.

### Switching to PostgreSQL / Supabase

In `.env`:

```
DB_DIALECT=postgres
DATABASE_URL=postgres://user:password@host:5432/dbname
```

No code changes needed — `src/config/database.js` reads these automatically.

### Demo accounts (created by `npm run seed`)

| Role    | Phone           |
|---------|-----------------|
| admin   | +910000000001   |
| artisan | +910000000002   |
| buyer   | +910000000003   |

Login flow: `POST /api/auth/send-otp` with the phone, then
`POST /api/auth/verify-otp` with the same phone and the OTP
(`MOCK_OTP` in `.env`, default `123456`). In non-production mode the
send-otp response also echoes the code as `devOtp` for convenience.

## Project layout

```
src/
  config/database.js       Sequelize setup (sqlite / postgres)
  models/                  14 Sequelize models + associations (index.js)
  middleware/               auth (JWT), role (RBAC), validate, upload, errorHandler
  utils/                    jwt, otpStore (mock), fairPriceEngine, matchScore, asyncHandler, ApiError
  services/notificationService.js   creates + pushes notifications over Socket.IO
  controllers/              one per domain (auth, product, ai, auction, requirement, order, notification, admin)
  routes/                   one per domain, mounted under /api in routes/index.js
  app.js                    Express app (security middleware, static /uploads, routes, error handling)
  server.js                 HTTP server + Socket.IO + auction auto-close background job
  seed.js                   demo data
```

## Real-time notifications

Connect a Socket.IO client with the JWT in the handshake:

```js
io("http://localhost:4000", { auth: { token: jwtToken } });
socket.on("notification", (n) => { /* ... */ });
```

The server joins each authenticated socket to a `user:<id>` room and emits
`notification` events there (new bids, outbids, auction won/lost, new
orders, new reverse-bidding opportunities, accepted bids, order updates,
etc.) — these are also persisted and retrievable via `GET /api/notifications`.

## Background jobs

`autoCloseExpiredAuctions` runs every 30s: activates `SCHEDULED` auctions
whose `startTime` has arrived, closes `ACTIVE` auctions whose `endTime` has
passed, marks the winning/losing bids, and notifies both parties.

## API reference

All endpoints are prefixed with `/api`. Authenticated routes expect
`Authorization: Bearer <token>`.

### Auth & profile
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | /auth/send-otp | — | `{ phone }` |
| POST | /auth/verify-otp | — | `{ phone, code, name?, role? }` → `{ token, user }` |
| GET | /user/profile | any | role-specific profile included |
| PUT | /user/profile | any | `{ name?, languagePreference?, artisan?: {...}, buyer?: {...} }` |

### Products
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | /products | artisan | create (status starts `DRAFT`) |
| GET | /products | public | search & filter: `q`, `category`, `material`, `craftType`, `artisanLocation`, `minPrice`, `maxPrice`, `handmade`, `gi`, `customization`, `availability`, `status`, `page`, `limit` |
| GET | /products/:id | public | |
| PUT | /products/:id | owner/admin | includes publish/unpublish via `status` |
| DELETE | /products/:id | owner/admin | |
| POST | /products/:id/images | owner | `{ url, type }` |
| POST | /products/:id/report | any | flags for admin review |

### AI services (mocked pipeline, see note above)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | /ai/enhance-image | artisan | multipart `image`; returns original + "enhanced" URLs |
| POST | /ai/transcribe | artisan | multipart `audio` or `{ mockText }`; returns transcript + translation |
| POST | /ai/catalogue | artisan | `{ transcript/translatedText, artisanInfo, language }` → editable catalogue fields |
| POST | /ai/fair-price | artisan | full cost/complexity/market-demand factors → recommended price, range, profit, market comparison, explanation |

### Bidding (auctions)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | /auctions | artisan (owner) | `{ productId, basePrice, minBidIncrement, startTime, endTime, quantity }` |
| GET | /auctions | public | filter by `status` (computed live), `productId`, `artisanId` |
| GET | /auctions/:id | public | includes bids, sorted highest first |
| POST | /auctions/:id/bids | buyer | validates active + min increment; updates highest bid; notifies outbid party |

### Reverse bidding
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | /requirements | buyer | posts a requirement; notifies matching-craft artisans |
| GET | /requirements | public | filter by `status`, `buyerId`, `category` |
| GET | /requirements/:id | public | |
| POST | /requirements/:id/bids | artisan | computes and stores an AI match score |
| GET | /requirements/:id/bids | buyer/artisan | sorted by match score |
| POST | /requirements/:id/select-artisan | buyer (owner) | `{ reverseBidId, shippingAddress? }` → creates an Order, rejects other bids |

### Orders
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | /orders | buyer | direct purchase of a published product |
| GET | /orders | any | scoped to buyer/artisan; admin sees all |
| GET | /orders/:id | participant/admin | |
| PUT | /orders/:id/status | participant/admin | enforces `Confirmed → In Production → Ready → Shipped → Delivered` (or `Cancelled` while `Confirmed`) |

### Notifications
| Method | Path | Auth |
|---|---|---|
| GET | /notifications | any (`?unreadOnly=true`) |
| PUT | /notifications/:id/read | owner |
| PUT | /notifications/read-all | any |

### Admin (all require role `admin`)
| Method | Path |
|---|---|
| GET/PUT | /admin/artisans, /admin/artisans/:id/verify |
| GET/PUT | /admin/certifications, /admin/certifications/:id/review |
| GET/PUT | /admin/products/reported, /admin/products/:id/resolve-report |
| GET | /admin/auctions, /admin/requirements |
| GET/PUT | /admin/users, /admin/users/:id/role |
| PUT | /admin/disputes/:orderId/resolve |
| GET/POST/PUT/DELETE | /admin/market-prices |

## Security

Helmet, CORS, JSON body-size limits, rate limiting (global + a stricter
limiter on OTP endpoints), JWT auth, role-based access control, ownership
checks on product/order/auction mutations, and centralized error handling
that never leaks stack traces to the client.

## What's mocked vs. real (prototype scope)

| Area | Status |
|---|---|
| Fair Price Engine | **Real** rule-based calculation using cost, complexity, certification, demand and blended seeded market data |
| AI Artisan Matching | **Real** weighted scoring algorithm |
| Auction lifecycle, bidding, order status flow, notifications | **Real** |
| OTP delivery (SMS) | Mocked — logged/echoed instead of sent |
| Image enhancement / transcription / catalogue generation | Mocked — pipeline and data shape are real, the AI calls are stubbed so the demo runs without external API keys. Swap in a real provider (OpenAI, etc.) inside `src/controllers/aiController.js` when ready |
| Market price data | Seeded/mock, replaceable with a real data source per the PRD |

## Next steps for production

- Replace `sequelize.sync()` with versioned migrations
- Real SMS provider for OTP; move the OTP store to Redis
- Real AI provider integration for image/voice/cataloguing
- Cloud object storage (S3/Supabase Storage) instead of local `/uploads`
- Payment gateway integration for `Order.paymentStatus`
