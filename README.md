# Quirkzy — Weird & Wonderful

Quirkzy is a playful e-commerce storefront concept for distinctive home, desk, and décor products. The experience pairs a warm, characterful storefront with customer accounts and store-management workflows while retaining the original Quirkzy product photography, descriptions, and visual identity.

**Live storefront preview:** https://jothikapugaz.github.io/quirkzy-website/

> **Preview status:** The public GitHub Pages URL serves the browser-based storefront demo. The full API and database are implemented in the project code but are not yet connected to a deployed production service. The preview does not collect real payments.

## Experience highlights

### Customer storefront
- Product browsing, category filtering, product details, and product reviews
- Shopping bag, quantity controls, wishlist, and checkout flow
- Customer registration, sign-in, and sign-out
- Personal order history and custom-product request tracking
- Responsive layouts for mobile, tablet, and desktop

### Store operations
- Separate administrator sign-in with server-verified roles
- Product catalogue management and stock updates
- Order overview and fulfilment-status management
- Customer overview and custom-request status tracking
- Order cancellation inventory restoration and server-calculated checkout totals

### Engineering
- HTML, CSS, and vanilla JavaScript frontend
- Node.js and Express REST API
- PostgreSQL schema and repeatable migrations
- Password hashing, signed sessions, parameterized queries, rate limiting, and server-side authorization
- Automated API/database integration tests in GitHub Actions

## Application structure

- `index.html`, `product.html`, `cart.html`, `wishlist.html`, `checkout.html` — storefront and shopping flow
- `login.html`, `account.html` — customer identity and account history
- `admin.html`, `admin.js` — private store-management interface
- `server.js`, `lib/app.js` — API server and route handlers
- `migrations/` — database schema changes
- `scripts/` — catalogue seeding, migration, and owner-controlled admin provisioning
- `tests/` — automated integration tests

## Production deployment status

The codebase is being prepared for a complete hosted shopping experience. Before accepting real customer orders, the deployment still needs:

- A hosted Node.js API and PostgreSQL database
- A verified payment-provider integration and signed webhook handling
- Production API configuration and HTTPS on the storefront
- Object storage for custom-request reference images
- Email notifications, operational monitoring, and automated database backups
- Store policies, privacy disclosures, and end-to-end testing against the production environment
- A custom domain, if desired

**Payments:** The current checkout records an order and a pending payment status; it does not charge cards or UPI. Do not represent the preview as accepting online payments until the payment provider and webhook verification are configured.

**Reference images:** The current custom-request API records selected image metadata, not uploaded image files. Production uploads require secured object storage.

## Live preview

The public preview is useful for reviewing the existing Quirkzy brand, product presentation, and storefront flow. Customer account persistence, administrator operations, and database-backed catalogue updates become available when the frontend is connected to the deployed API.
