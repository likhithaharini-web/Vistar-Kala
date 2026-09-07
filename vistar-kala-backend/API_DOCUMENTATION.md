# Vistar Kala Backend - API Documentation

Base URL (local development): `http://localhost:5000/api`

## Response format

Every endpoint returns one of these two shapes.

**Success:**
```json
{ "success": true, "data": { }, "message": "Human-readable message" }
```

**Error:**
```json
{ "success": false, "message": "Human-readable message", "error": "MACHINE_READABLE_CODE" }
```

## Authentication

Most endpoints require a JWT, obtained from `/auth/login` or `/auth/register`, sent as:

```
Authorization: Bearer <token>
```

Endpoints marked **Public** need no token. Endpoints marked **Artisan** or **Buyer** require a token belonging to a user with that role (`403 USER_NOT_AUTHORIZED` otherwise). Endpoints marked **Owner** additionally require the caller to own the specific resource.

---

## Auth

### POST /auth/register
**Public.** Registers a new artisan or buyer user with phone and password. Returns a JWT and safe user object.

Body:
```json
{
  "phone": "+919810000001",
  "password": "ExamplePassword123",
  "name": "Lakshmi Devi",
  "role": "artisan"
}
```
Validation:
- `phone`: required string
- `password`: required string (minimum 8 characters)
- `name`: optional string
- `role`: `"buyer"` (default) or `"artisan"`. (Public requests cannot register `"admin"`).

Response:
```json
{
  "success": true,
  "token": "<jwt>",
  "user": {
    "id": "uuid-here",
    "phone": "+919810000001",
    "name": "Lakshmi Devi",
    "role": "artisan",
    "languagePreference": "en"
  }
}
```
Errors: `400 INVALID_FIELDS`, `409 PHONE_ALREADY_REGISTERED`

### POST /auth/login
**Public.** Authenticates an existing user via phone and password. Returns a JWT and safe user object.

Body:
```json
{
  "phone": "+919810000001",
  "password": "ExamplePassword123"
}
```
Response:
```json
{
  "success": true,
  "token": "<jwt>",
  "user": {
    "id": "uuid-here",
    "phone": "+919810000001",
    "name": "Lakshmi Devi",
    "role": "artisan",
    "languagePreference": "en"
  }
}
```
Errors: `400 MISSING_CREDENTIALS`, `401 INVALID_PHONE_OR_PASSWORD`

### GET /auth/profile
**Requires auth.** Returns the logged-in user merged with their artisan/buyer profile.

### PUT /auth/profile
**Requires auth.** Updates the user's own profile.

Body (all optional):
```json
{ "name": "New Name", "languagePreference": "Hindi", "profile": { "craftCategory": "Pottery", "bio": "..." } }
```

---

## Products

### POST /products
**Artisan.** Creates a product owned by the caller.

Required body fields: `name`, `category`, `material`, `craftType`, `price`.
Optional: `origin`, `description`, `shortDescription`, `features` (string[]), `keywords` (string[]), `quantity`, `dimensions`, `productionTime`, `customizationAvailable` (bool), `status` (`PUBLISHED` default, or `DRAFT`).

Returns `201` with the created product (including an initial `authentication` object, all `NOT_APPLICABLE`/`NOT_VERIFIED`).

### GET /products
**Public.** Search & filter, paginated.

Query params: `search`, `category`, `material`, `craftType`, `origin`, `minPrice`, `maxPrice`, `authenticationStatus`, `artisanId`, `status` (defaults to only `PUBLISHED` products), `page`, `limit`.

Response `data`: `{ "products": [...], "total": 42, "page": 1, "limit": 50 }`

### GET /products/:id
**Public.** Returns one product including its `authentication` (certification) object.

Errors: `404 PRODUCT_NOT_FOUND`

### PUT /products/:id
**Owner (artisan).** Updates any editable product field (same list as create, minus `artisanId`/`images`).

Errors: `403 USER_NOT_AUTHORIZED`, `404 PRODUCT_NOT_FOUND`

### DELETE /products/:id
**Owner (artisan).** Deletes the product and its certification record.

### POST /products/:id/images
**Owner (artisan).** `multipart/form-data` with field name **`image`** (jpeg/png/webp, max `MAX_UPLOAD_SIZE_MB`). Stores the file locally under `/uploads/originals` and appends it to the product's `images` array.

Response `data`: `{ "image": { "id", "url", "type": "original" }, "product": { ... } }`

Errors: `400 NO_FILE`, `400 INVALID_FILE_TYPE`, `403 USER_NOT_AUTHORIZED`

### GET /products/:id/authentication
**Public.** Returns the certification/authentication record for a product.

### POST /products/:id/authentication
**Owner (artisan).** Submits/updates verification info. The overall `status` is *derived* by the server from `artisanVerification` + `originVerification` - it is never set to `VERIFIED` just because the caller says so (see PRD ​section on authentication).

Body (all optional): `artisanVerification`, `originVerification` (`VERIFIED`|`PENDING`|`NOT_VERIFIED`|`NOT_APPLICABLE`), `giStatus`, `handloomMark`, `otherCertification`, `craftTechnique`, `verificationSource`, `verificationDate`.

---

## AI

All AI endpoints require `OPENAI_API_KEY` to be set in `.env`. If it's missing, every AI endpoint returns:
```json
{ "success": false, "message": "OpenAI API key is not configured on this server...", "error": "OPENAI_KEY_MISSING" }
```
with HTTP status `503`, instead of failing unpredictably.

### POST /ai/enhance-image
**Requires auth.** `multipart/form-data`, field name **`image`**. Optional field `productId` - if provided and owned by the caller, the enhanced image is also attached to that product.

Uses OpenAI's `gpt-image-1` image-edit endpoint with a prompt asking for a clean studio background, corrected lighting, and preserved product details. **Known limitation:** OpenAI has no purpose-built "enhance my product photo" operation; this is the closest practical real approach, and results can vary more than a dedicated photo-enhancement model - see README.md.

Response `data`: `{ "enhancedImageUrl": "/uploads/enhanced/xyz.png" }`

Errors: `400 NO_FILE`, `502 AI_IMAGE_ENHANCE_FAILED`, `503 OPENAI_KEY_MISSING`

### POST /ai/catalogue
**Requires auth.** Body: `{ "description": "...", "language": "Telugu" }` (`language` is a hint; the model detects the actual language itself).

Uses OpenAI chat completions (`gpt-4o-mini`, JSON mode) to translate/understand the description and generate a catalogue entry.

Response `data`:
```json
{
  "productName": "", "category": "", "material": "", "craftType": "",
  "shortDescription": "", "description": "", "features": [], "keywords": [],
  "englishDescription": "", "hindiDescription": ""
}
```
This is fully editable by the frontend before saving as a product.

Errors: `400 MISSING_FIELDS`, `502 AI_CATALOGUE_FAILED`, `503 OPENAI_KEY_MISSING`

### POST /ai/transcribe
**Requires auth.** `multipart/form-data`, field name **`audio`** (mp3/wav/m4a/ogg/webm). Uses OpenAI Whisper (`whisper-1`).

Response `data`: `{ "transcript": "...", "language": "..." }`

Errors: `400 NO_FILE`, `502 AI_TRANSCRIBE_FAILED`, `503 OPENAI_KEY_MISSING`

### POST /ai/fair-price
**Public (works with or without auth; if authenticated, the analysis is logged against the caller).** A transparent, rule-based calculation - **not** a claim of live competitor analysis. See `src/services/pricing/fairPriceService.js` for the fully-documented formula and constants.

Body:
```json
{
  "materialCost": 1000, "artisansInvolved": 2, "labourHours": 20, "productionTime": 5,
  "craftsmanshipComplexity": "High", "authenticityCertification": "GI Verified",
  "currentMarketPrice": 2500, "marketDemand": "High", "additionalCosts": 200,
  "category": "Handloom Sarees", "productId": "PROD_1001"
}
```
`craftsmanshipComplexity` and `marketDemand` accept `Low`/`Medium`/`High` (defaults to `Medium` if omitted/invalid). If `currentMarketPrice` is omitted, the server tries to find a seeded reference price by `category`/`material`; if none exists, the range is derived from production cost alone (and the response says so).

Response `data`:
```json
{
  "productionCost": 1843, "marketRange": { "min": 2200, "max": 2800 },
  "recommendedPrice": 2805, "estimatedProfit": 962,
  "explanation": "...", "factors": ["...", "..."]
}
```

### POST /ai/match-artisans
**Public.** Body: `{ "requirementId": "REQ_4001" }`. A transparent, weighted scoring algorithm (craft expertise, product compatibility, customization capability, quantity capacity, delivery deadline, location, rating/history, price fit) - see `src/services/matching/matchingService.js`.

Response `data`:
```json
{
  "requirementId": "REQ_4001",
  "matches": [
    { "artisanId": "USR_A005", "artisanName": "Kavita Bunkar", "matchScore": 81, "reasons": ["...", "..."] }
  ]
}
```
Errors: `400 MISSING_FIELDS`, `404 REQUIREMENT_NOT_FOUND`

---

## Auctions (normal bidding)

### POST /auctions
**Artisan (must own the product).** Body: `{ "productId", "basePrice", "minimumBidIncrement", "startTime", "endTime", "quantity", "preparationTime" }` (ISO 8601 datetimes).

### GET /auctions
**Public.** Query filters: `status` (`SCHEDULED`|`ACTIVE`|`CLOSED`), `productId`, `artisanId`. Auctions past their `endTime` are automatically flipped to `CLOSED` on read (no cron needed for the prototype), with `AUCTION_WON`/`AUCTION_LOST`/`AUCTION_ENDING` notifications sent exactly once.

### GET /auctions/:id
**Public.** Includes `currentHighestBid` and `bidCount`.

### POST /auctions/:id/bids
**Buyer.** Rate-limited (15/min). Body: `{ "bidAmount": 21500 }`. Validates the auction is `ACTIVE` and the bid meets `currentHighest + minimumBidIncrement` (or `basePrice` if no bids yet).

Errors: `400 AUCTION_CLOSED`, `400 BID_TOO_LOW`, `400 INVALID_BID`

### GET /auctions/:id/bids
**Public.** All bids for an auction, highest first.

---

## Reverse bidding (buyer requirements)

### POST /requirements
**Buyer.** Required: `productRequired`, `quantity`, `requiredBy`, `deliveryLocation`. Optional: `customization`, `budget`, `additionalRequirements`, `referenceImage`. Notifies artisans whose craft category loosely matches the requirement text.

### GET /requirements
**Public.** Filters: `status` (`OPEN`|`CLOSED`), `buyerId`.

### GET /requirements/:id
**Public.** Includes `bidCount`.

### POST /requirements/:id/bids
**Artisan.** Required: `bidPrice`, `quantity`, `completionTime`, `proposal`. Optional: `customizationCapability`, `sampleWork`. One bid per artisan per requirement (`409 DUPLICATE_BID` on a second attempt). Requirement must be `OPEN` (`400 REQUIREMENT_CLOSED` otherwise).

### GET /requirements/:id/bids
**Public.** Each bid is enriched with `artisan: { id, name, rating, verificationStatus, craftCategory }` so the buyer can compare offers side by side.

### POST /requirements/:id/select-artisan
**Buyer (owner of the requirement).** Body: `{ "reverseBidId", "shippingAddress"? }`. Marks the chosen bid `ACCEPTED`, all others `REJECTED`, closes the requirement, and **creates an order**.

Response `data`: `{ "requirement", "selectedBid", "order" }`

---

## Orders

### POST /orders
**Buyer.** Two supported flows:
- Direct purchase: `{ "productId", "quantity", "shippingAddress" }` (decrements product stock)
- From a won auction: `{ "auctionId", "shippingAddress" }` (only the winning bidder may call this, and only once per auction)

(Reverse-bidding orders are created via `select-artisan` above, not this endpoint.)

### GET /orders
**Requires auth.** Returns the caller's orders (as buyer or artisan), newest first. Optional `?status=` filter.

### GET /orders/:id
**Requires auth, participant only** (buyer or artisan on that order).

### PUT /orders/:id/status
**Artisan (the fulfilling artisan only).** Body: `{ "status", "trackingId"?, "courier"? }`. `status` must be one of `CONFIRMED`, `IN_PRODUCTION`, `READY`, `SHIPPED`, `DELIVERED`, `CANCELLED`. Notifies the buyer.

---

## Notifications

### GET /notifications
**Requires auth.** Returns the caller's notifications, newest first. Optional `?unreadOnly=true`.

### PUT /notifications/:id/read
**Requires auth, owner only.** Marks one notification as read.

---

## Health

### GET /health
**Public.** `{ "success": true, "data": { "timestamp": "..." }, "message": "Vistar Kala backend is running" }`

---

## Error codes reference

| Code | Meaning |
|---|---|
| `MISSING_FIELDS` | A required body field was missing/empty |
| `NO_TOKEN` / `INVALID_TOKEN` | Missing or invalid JWT |
| `USER_NOT_AUTHORIZED` | Authenticated, but wrong role or doesn't own the resource |
| `*_NOT_FOUND` | The referenced resource doesn't exist |
| `OTP_NOT_FOUND` / `OTP_EXPIRED` / `OTP_INVALID` | OTP verification problems |
| `INVALID_FILE_TYPE` / `NO_FILE` | File upload problems |
| `OPENAI_KEY_MISSING` | `OPENAI_API_KEY` not set in `.env` |
| `AI_IMAGE_ENHANCE_FAILED` / `AI_CATALOGUE_FAILED` / `AI_TRANSCRIBE_FAILED` | The OpenAI API call itself failed |
| `AUCTION_CLOSED` / `BID_TOO_LOW` / `INVALID_BID` | Bidding validation errors |
| `REQUIREMENT_CLOSED` / `DUPLICATE_BID` | Reverse-bidding validation errors |
| `INSUFFICIENT_STOCK` / `DUPLICATE_ORDER` / `AUCTION_NOT_CLOSED` | Order creation validation errors |
| `RATE_LIMIT_EXCEEDED` | Too many requests to a rate-limited endpoint |
| `ROUTE_NOT_FOUND` | No matching route |
| `INTERNAL_SERVER_ERROR` | Unexpected server error (details are never leaked to the client) |
