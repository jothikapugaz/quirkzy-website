# Quirkzy — Weird & Wonderful

Quirkzy is a playful, responsive e-commerce portfolio project for quirky home, desk, and décor products. The original multi-page frontend is being connected to a Node.js/Express API and PostgreSQL database.

**Live frontend (static demo):** https://jothikapugaz.github.io/quirkzy-website/

> The GitHub Pages URL hosts only static files. Full account, cart, review, custom-request, and order persistence requires the API and PostgreSQL database to be deployed and the API URL configured in `api-config.js`. No real payment is collected.

## Features

- Responsive home, product, cart, wishlist, account history, login, checkout, and custom-request pages
- Product catalogue with category/search API support
- Express REST API and PostgreSQL persistence
- Password-hashed accounts and signed JWT sessions
- Server-persisted carts and wishlists for signed-in users
- Account dashboard with personal order and custom-request history
- Product reviews with server-side validation
- Checkout orders with server-calculated prices and totals
- Custom product requests
- Database migrations and repeatable catalogue seeding
- Automated API/database integration tests and GitHub Actions CI

## Stack

- Frontend: HTML5, CSS3, vanilla JavaScript
- Backend: Node.js, Express
- Database: PostgreSQL
- Security: bcrypt password hashing, JWT authentication, Helmet, rate limiting, parameterized SQL
- Testing: Node.js test runner, Supertest, PostgreSQL service in GitHub Actions
- Deployment blueprint: Render (`render.yaml`)

## Run locally

Requirements: Node.js 20+, PostgreSQL 15+.

1. Clone the repository and install dependencies:

   ```bash
   npm install
   ```

2. Create a PostgreSQL database named `quirkzy`, then copy `.env.example` to `.env` and update `DATABASE_URL`. Set `JWT_SECRET` to a random secret of at least 32 characters. Never commit `.env`.

3. Create the tables and seed the catalogue:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

5. Open http://localhost:3000. Check http://localhost:3000/api/health; a healthy response is `{"status":"ok","database":"connected"}`.

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign authentication tokens (minimum 32 characters) |
| `PORT` | Server port; defaults to 3000 |
| `FRONTEND_ORIGIN` | Optional frontend origin allowed by CORS |
| `DATABASE_SSL` | Set to `true` for hosted databases that require TLS |
| `DB_POOL_MAX` | Optional PostgreSQL pool size; defaults to 10 |

## Main API routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | API/database health |
| GET | `/api/products` | Product catalogue, optional `search` and `category` |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Validate current session |
| GET / PUT | `/api/cart` | Read/save signed-in cart |
| GET / POST / DELETE | `/api/wishlist` and `/api/wishlist/:slug` | Wishlist operations |
| GET / POST | `/api/products/:slug/reviews` | Read/add a product review |
| GET / POST | `/api/orders` | Read order history / place an order |
| GET / POST | `/api/custom-requests` | Read / submit custom product requests |

Authenticated endpoints require an `Authorization: Bearer <token>` header.

## Tests

The integration suite expects a migrated and seeded test database. Set `TEST_DATABASE_URL` to a disposable database, then run:

```bash
npm run db:migrate
npm run db:seed
npm test
```

Do not point integration tests at a production database. The suite creates and removes a test user and creates test orders/reviews.

## Deployment

- Deploy the API and PostgreSQL database using a host that supports Node.js and PostgreSQL. `render.yaml` provides a starting blueprint.
- Configure the service's `DATABASE_URL`, `JWT_SECRET`, and `DATABASE_SSL` variables.
- Run `npm run db:migrate` and `npm run db:seed` against the hosted database.
- For a separately hosted GitHub Pages frontend, set `window.QUIRKZY_API_BASE` in `api-config.js` to the deployed API origin and ensure that origin is permitted by the API's CORS policy.
- Re-run the mobile and desktop shopping flow after deployment.

## Important limitations

- The current online-payment choice is a demo only; it does not charge a card or UPI account. Use a payment provider and verified webhook flow before accepting real payments.
- Reference images selected on the custom-request form are currently recorded as filenames/metadata; production image storage requires an object-storage service.
- This is a portfolio project, not a production store. Before real customers use it, add a verified payment integration, email notifications, monitoring, backups, and a privacy policy/terms.

## Author

Jothika P
