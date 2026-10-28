import "dotenv/config";
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import request from "supertest";
import bcrypt from "bcryptjs";
import { createApp } from "../lib/app.js";

const { Pool } = pg;
const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) throw new Error("Set TEST_DATABASE_URL to a disposable test database before running integration tests.");
const pool = new Pool({ connectionString: databaseUrl, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined });
const app = createApp({ pool, jwtSecret: process.env.JWT_SECRET || "test-secret-that-is-long-enough-for-ci-123456", frontendOrigin: "http://localhost:3000" });
const email = `quirkzy-test-${Date.now()}@example.com`;
let token = "";
let userId = 0;
let adminUserId = 0;
let adminToken = "";

before(async () => {
  await pool.query("SELECT 1");
  const products = await pool.query("SELECT COUNT(*)::int AS count FROM products WHERE active=TRUE");
  assert.ok(products.rows[0].count >= 4, "Run npm run db:seed before integration tests.");
});

after(async () => {
  if (adminUserId) await pool.query("DELETE FROM users WHERE id=$1", [adminUserId]);
  if (userId) await pool.query("DELETE FROM users WHERE id=$1", [userId]);
  await pool.end();
});

test("serves the responsive frontend from the app root", async () => {
  const response = await request(app).get("/").expect(200);
  assert.match(response.text, /QUIRKZY/);
  assert.match(response.text, /name="viewport"/);
  await request(app).get("/account.html").expect(200);
  await request(app).get("/admin.html").expect(200);
  await request(app).get("/admin.js").expect(200);
  await request(app).get("/product.html").expect(200);
  await request(app).get("/style.css").expect(200);
  await request(app).get("/server.js").expect(404);
  await request(app).get("/.env.example").expect(404);
  await request(app).get("/migrations/001_initial.sql").expect(404);
});

test("health check confirms PostgreSQL connectivity", async () => {
  const response = await request(app).get("/api/health").expect(200);
  assert.deepEqual(response.body, { status: "ok", database: "connected" });
});

test("product catalogue supports listing and filtering", async () => {
  const all = await request(app).get("/api/products").expect(200);
  assert.ok(all.body.products.length >= 4);
  const filtered = await request(app).get("/api/products?category=plant-pals").expect(200);
  assert.ok(filtered.body.products.length >= 1);
  assert.ok(filtered.body.products.every((product) => product.category === "plant-pals"));
});

test("registration hashes passwords and returns an authenticated session", async () => {
  const response = await request(app).post("/api/auth/register").send({ name: "Quirkzy Tester", email, password: "strong-password-123" }).expect(201);
  assert.ok(response.body.token);
  assert.equal(response.body.user.email, email);
  assert.equal("password_hash" in response.body.user, false);
  token = response.body.token;
  userId = response.body.user.id;
  const saved = await pool.query("SELECT password_hash FROM users WHERE id=$1", [userId]);
  assert.notEqual(saved.rows[0].password_hash, "strong-password-123");
  await request(app).post("/api/auth/register").send({ name: "Quirkzy Tester", email, password: "strong-password-123" }).expect(409);
});

test("login rejects incorrect passwords and accepts valid credentials", async () => {
  await request(app).post("/api/auth/login").send({ email, password: "wrong-password-123" }).expect(401);
  const response = await request(app).post("/api/auth/login").send({ email, password: "strong-password-123" }).expect(200);
  assert.ok(response.body.token);
  assert.equal(response.body.user.email, email);
});

test("admin access is role-protected and separate from customer login", async () => {
  await request(app).get("/api/admin/summary").expect(401);
  await request(app).get("/api/admin/summary").set("Authorization", `Bearer ${token}`).expect(403);
  await request(app).post("/api/admin/login").send({ email, password: "strong-password-123" }).expect(401);

  const adminEmail = `quirkzy-admin-test-${Date.now()}@example.com`;
  const passwordHash = await bcrypt.hash("admin-password-123", 10);
  const created = await pool.query(
    "INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,'admin') RETURNING id",
    ["Quirkzy Admin Test", adminEmail, passwordHash]
  );
  adminUserId = Number(created.rows[0].id);
  const login = await request(app).post("/api/admin/login").send({ email: adminEmail, password: "admin-password-123" }).expect(200);
  assert.equal(login.body.user.role, "admin");
  assert.ok(login.body.token);
  adminToken = login.body.token;
  const summary = await request(app).get("/api/admin/summary").set("Authorization", `Bearer ${adminToken}`).expect(200);
  assert.ok(summary.body.products.total >= 4);
  await request(app).get("/api/admin/products").set("Authorization", `Bearer ${adminToken}`).expect(200);
  await request(app).get("/api/admin/orders").set("Authorization", `Bearer ${adminToken}`).expect(200);

  await pool.query("UPDATE users SET role='customer' WHERE id=$1", [adminUserId]);
  await request(app).get("/api/admin/summary").set("Authorization", `Bearer ${adminToken}`).expect(403);
});

test("protected cart and wishlist persist for the signed-in user", async () => {
  await request(app).put("/api/cart").send({ items: [{ slug: "ufo-planter", quantity: 2 }] }).expect(401);
  await request(app).put("/api/cart").set("Authorization", `Bearer ${token}`).send({ items: [{ slug: "ufo-planter", quantity: 2 }] }).expect(200);
  const cart = await request(app).get("/api/cart").set("Authorization", `Bearer ${token}`).expect(200);
  assert.equal(Number(cart.body.items[0].quantity), 2);
  await request(app).post("/api/wishlist/ufo-planter").set("Authorization", `Bearer ${token}`).expect(201);
  const wishlist = await request(app).get("/api/wishlist").set("Authorization", `Bearer ${token}`).expect(200);
  assert.ok(wishlist.body.items.some((item) => item.slug === "ufo-planter"));
});

test("reviews validate ratings and are available to later reads", async () => {
  await request(app).post("/api/products/ufo-planter/reviews").set("Authorization", `Bearer ${token}`).send({ rating: 6, text: "Too many stars" }).expect(400);
  await request(app).post("/api/products/ufo-planter/reviews").set("Authorization", `Bearer ${token}`).send({ rating: 5, text: "A wonderfully quirky planter." }).expect(201);
  const reviews = await request(app).get("/api/products/ufo-planter/reviews").expect(200);
  assert.ok(reviews.body.reviews.some((review) => review.text === "A wonderfully quirky planter."));
});

test("orders use server-side product prices and are saved to the database", async () => {
  await request(app).post("/api/orders").set("Authorization", `Bearer ${token}`).send({
    customer: { name: "Quirkzy Tester", email, phone: "123", address: "12 Example Street", city: "Chennai", pincode: "600001" },
    items: [{ slug: "ufo-planter", quantity: 1 }]
  }).expect(400);
  const response = await request(app).post("/api/orders").set("Authorization", `Bearer ${token}`).send({
    customer: { name: "Quirkzy Tester", email, phone: "9876543210", address: "12 Example Street", city: "Chennai", pincode: "600001" },
    items: [{ slug: "ufo-planter", quantity: 1 }],
    paymentMethod: "cod"
  }).expect(201);
  assert.equal(response.body.order.subtotal, 699);
  assert.equal(response.body.order.total, 749);
  const orders = await request(app).get("/api/orders").set("Authorization", `Bearer ${token}`).expect(200);
  assert.ok(orders.body.orders.some((order) => order.order_number === response.body.order.order_number));
});

test("custom requests validate fields and persist", async () => {
  await request(app).post("/api/custom-requests").set("Authorization", `Bearer ${token}`).send({ title: "X" }).expect(400);
  const response = await request(app).post("/api/custom-requests").set("Authorization", `Bearer ${token}`).send({
    name: "Quirkzy Tester", email, phone: "9876543210", title: "Tiny moon lamp",
    description: "A small moon-shaped desk lamp with a soft warm glow.", category: "home-decor", quantity: 1,
    budget: "₹500 – ₹1000", notes: "Test request"
  }).expect(201);
  assert.equal(response.body.request.title, "Tiny moon lamp");
  const requests = await request(app).get("/api/custom-requests").set("Authorization", `Bearer ${token}`).expect(200);
  assert.ok(requests.body.requests.some((item) => item.title === "Tiny moon lamp"));
});
