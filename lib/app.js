import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicPages = new Set([
  "/", "/index.html", "/product.html", "/cart.html", "/wishlist.html", "/account.html",
  "/checkout.html", "/login.html", "/custom.html", "/admin.html", "/admin.js", "/style.css", "/script.js",
  "/api-client.js", "/api-config.js", "/backend-sync.js"
]);

const slugify = (value = "") => String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function validEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function makeToken(user, secret) {
  return jwt.sign({ sub: String(user.id), email: user.email }, secret, { expiresIn: "7d" });
}

export function createApp({ pool, jwtSecret = process.env.JWT_SECRET, frontendOrigin = process.env.FRONTEND_ORIGIN } = {}) {
  if (!pool) throw new Error("createApp requires a PostgreSQL pool");
  if (!jwtSecret || jwtSecret.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters");

  const app = express();
  app.disable("x-powered-by");
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" }, contentSecurityPolicy: false }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || origin === frontendOrigin || (!frontendOrigin && process.env.NODE_ENV !== "production")) return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: false
  }));
  app.use(express.json({ limit: "1mb" }));
  app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }));
  app.use("/api/admin/login", rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false }));

  const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
  const requireAuth = (req, res, next) => {
    const header = req.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) return next(httpError(401, "Please sign in to continue."));
    try {
      const payload = jwt.verify(token, jwtSecret);
      req.userId = Number(payload.sub);
      if (!Number.isSafeInteger(req.userId) || req.userId <= 0) throw new Error("Invalid subject");
      return next();
    } catch {
      return next(httpError(401, "Your session is invalid or has expired. Please sign in again."));
    }
  };

  const requireAdmin = asyncRoute(async (req, res, next) => {
    const result = await pool.query("SELECT role FROM users WHERE id = $1", [req.userId]);
    if (!result.rows[0] || result.rows[0].role !== "admin") throw httpError(403, "Administrator access is required.");
    return next();
  });

  async function productBySlug(slug, client = pool) {
    const result = await client.query("SELECT id, slug, name, description, price, image, category, dimensions, material, stock FROM products WHERE slug = $1 AND active = TRUE", [slug]);
    return result.rows[0] || null;
  }

  app.get("/api/health", asyncRoute(async (_req, res) => {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  }));

  app.get("/api/products", asyncRoute(async (req, res) => {
    const params = [];
    const conditions = ["active = TRUE"];
    if (req.query.category && req.query.category !== "all") {
      params.push(String(req.query.category).slice(0, 80));
      conditions.push(`category = $${params.length}`);
    }
    if (req.query.search) {
      params.push(`%${String(req.query.search).slice(0, 100)}%`);
      conditions.push(`(name ILIKE $${params.length} OR description ILIKE $${params.length})`);
    }
    const result = await pool.query(`SELECT id, slug, name, description, price, image, category, dimensions, material, stock FROM products WHERE ${conditions.join(" AND ")} ORDER BY id`, params);
    res.json({ products: result.rows });
  }));

  app.get("/api/products/:slug/reviews", asyncRoute(async (req, res) => {
    const product = await productBySlug(req.params.slug);
    if (!product) throw httpError(404, "Product not found.");
    const result = await pool.query(
      `SELECT r.id, r.rating, r.review_text AS text, r.created_at AS date, u.name
       FROM reviews r JOIN users u ON u.id = r.user_id
       WHERE r.product_id = $1 ORDER BY r.created_at DESC`, [product.id]);
    const ratings = result.rows.map((row) => ({ ...row, rating: Number(row.rating) }));
    const average = ratings.length ? ratings.reduce((sum, row) => sum + row.rating, 0) / ratings.length : 0;
    res.json({ reviews: ratings, average: Number(average.toFixed(1)), count: ratings.length });
  }));

  app.post("/api/products/:slug/reviews", requireAuth, asyncRoute(async (req, res) => {
    const product = await productBySlug(req.params.slug);
    if (!product) throw httpError(404, "Product not found.");
    const rating = Number(req.body.rating);
    const reviewText = typeof req.body.text === "string" ? req.body.text.trim() : "";
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw httpError(400, "Rating must be between 1 and 5.");
    if (reviewText.length < 2 || reviewText.length > 1200) throw httpError(400, "Review must be between 2 and 1200 characters.");
    const result = await pool.query(
      `INSERT INTO reviews(user_id, product_id, rating, review_text)
       VALUES($1,$2,$3,$4)
       ON CONFLICT(user_id, product_id) DO UPDATE SET rating = EXCLUDED.rating, review_text = EXCLUDED.review_text, created_at = NOW()
       RETURNING id, rating, review_text AS text, created_at AS date`,
      [req.userId, product.id, rating, reviewText]);
    const user = await pool.query("SELECT name FROM users WHERE id = $1", [req.userId]);
    res.status(201).json({ review: { ...result.rows[0], rating: Number(result.rows[0].rating), name: user.rows[0].name } });
  }));

  app.post("/api/auth/register", asyncRoute(async (req, res) => {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (name.length < 2 || name.length > 100) throw httpError(400, "Name must be between 2 and 100 characters.");
    if (!validEmail(email)) throw httpError(400, "Enter a valid email address.");
    if (password.length < 8 || password.length > 128) throw httpError(400, "Password must be between 8 and 128 characters.");
    const passwordHash = await bcrypt.hash(password, 12);
    let user;
    try {
      const result = await pool.query("INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id,name,email,role,created_at", [name,email,passwordHash]);
      user = result.rows[0];
    } catch (error) {
      if (error.code === "23505") throw httpError(409, "An account with this email already exists.");
      throw error;
    }
    res.status(201).json({ user, token: makeToken(user, jwtSecret) });
  }));

  app.post("/api/auth/login", asyncRoute(async (req, res) => {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!validEmail(email) || !password) throw httpError(400, "Enter your email and password.");
    const result = await pool.query("SELECT id,name,email,role,password_hash,created_at FROM users WHERE email = $1", [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) throw httpError(401, "Email or password is incorrect.");
    delete user.password_hash;
    res.json({ user, token: makeToken(user, jwtSecret) });
  }));

  app.post("/api/admin/login", asyncRoute(async (req, res) => {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!validEmail(email) || !password) throw httpError(400, "Enter your administrator email and password.");
    const result = await pool.query("SELECT id,name,email,role,password_hash,created_at FROM users WHERE email = $1", [email]);
    const user = result.rows[0];
    if (!user || user.role !== "admin" || !(await bcrypt.compare(password, user.password_hash))) {
      throw httpError(401, "Administrator email or password is incorrect.");
    }
    delete user.password_hash;
    res.json({ user, token: makeToken(user, jwtSecret) });
  }));

  app.get("/api/auth/me", requireAuth, asyncRoute(async (req, res) => {
    const result = await pool.query("SELECT id,name,email,role,created_at FROM users WHERE id = $1", [req.userId]);
    if (!result.rows[0]) throw httpError(401, "Account no longer exists.");
    res.json({ user: result.rows[0] });
  }));

  app.get("/api/cart", requireAuth, asyncRoute(async (req, res) => {
    const result = await pool.query(
      `SELECT p.id AS product_id, p.slug, p.name, p.price, p.image, p.category, c.quantity
       FROM cart_items c JOIN products p ON p.id = c.product_id
       WHERE c.user_id = $1 AND p.active = TRUE ORDER BY c.updated_at DESC`, [req.userId]);
    res.json({ items: result.rows });
  }));

  app.put("/api/cart", requireAuth, asyncRoute(async (req, res) => {
    if (!Array.isArray(req.body.items) || req.body.items.length > 50) throw httpError(400, "Cart must contain at most 50 items.");
    const normalized = [];
    for (const item of req.body.items) {
      const slug = typeof item.slug === "string" ? item.slug : slugify(item.name);
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw httpError(400, "Each cart quantity must be between 1 and 100.");
      const product = await productBySlug(slug);
      if (!product) throw httpError(400, `Unknown product: ${slug}`);
      normalized.push({ productId: product.id, quantity });
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM cart_items WHERE user_id = $1", [req.userId]);
      for (const item of normalized) {
        await client.query(
          `INSERT INTO cart_items(user_id,product_id,quantity) VALUES($1,$2,$3)
           ON CONFLICT(user_id,product_id) DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW()`,
          [req.userId,item.productId,item.quantity]);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    res.json({ saved: normalized.length });
  }));

  app.get("/api/wishlist", requireAuth, asyncRoute(async (req, res) => {
    const result = await pool.query(
      `SELECT p.id AS product_id,p.slug,p.name,p.price,p.image,p.category
       FROM wishlist_items w JOIN products p ON p.id = w.product_id
       WHERE w.user_id = $1 AND p.active = TRUE ORDER BY w.created_at DESC`, [req.userId]);
    res.json({ items: result.rows });
  }));

  app.post("/api/wishlist/:slug", requireAuth, asyncRoute(async (req, res) => {
    const product = await productBySlug(req.params.slug);
    if (!product) throw httpError(404, "Product not found.");
    await pool.query("INSERT INTO wishlist_items(user_id,product_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [req.userId,product.id]);
    res.status(201).json({ saved: true });
  }));

  app.delete("/api/wishlist/:slug", requireAuth, asyncRoute(async (req, res) => {
    const product = await productBySlug(req.params.slug);
    if (!product) throw httpError(404, "Product not found.");
    await pool.query("DELETE FROM wishlist_items WHERE user_id = $1 AND product_id = $2", [req.userId,product.id]);
    res.status(204).end();
  }));

  app.post("/api/orders", requireAuth, asyncRoute(async (req, res) => {
    const { customer = {}, items } = req.body;
    const name = typeof customer.name === "string" ? customer.name.trim() : "";
    const email = typeof customer.email === "string" ? customer.email.trim().toLowerCase() : "";
    const phone = typeof customer.phone === "string" ? customer.phone.trim() : "";
    const address = typeof customer.address === "string" ? customer.address.trim() : "";
    const city = typeof customer.city === "string" ? customer.city.trim() : "";
    const pincode = typeof customer.pincode === "string" ? customer.pincode.trim() : "";
    if (name.length < 2 || !validEmail(email) || !/^[6-9]\d{9}$/.test(phone) || address.length < 5 || !city || !/^\d{6}$/.test(pincode)) {
      throw httpError(400, "Check your name, email, Indian mobile number, address, city, and six-digit PIN code.");
    }
    if (!Array.isArray(items) || items.length < 1 || items.length > 50) throw httpError(400, "Your order must contain at least one item.");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const orderProducts = [];
      for (const item of items) {
        const slug = typeof item.slug === "string" ? item.slug : slugify(item.name);
        const quantity = Number(item.quantity);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw httpError(400, "Order quantity must be between 1 and 100.");
        const result = await client.query("SELECT id,slug,name,price,stock FROM products WHERE slug=$1 AND active=TRUE FOR UPDATE", [slug]);
        const product = result.rows[0];
        if (!product) throw httpError(400, `Product is no longer available: ${slug}`);
        if (product.stock < quantity) throw httpError(409, `Not enough stock for ${product.name}.`);
        orderProducts.push({ ...product, price: Number(product.price), quantity });
      }
      const subtotal = orderProducts.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const shipping = subtotal >= 1500 ? 0 : 50;
      const total = subtotal + shipping;
      const orderNumber = `QZ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
      const paymentMethod = ["cash_on_delivery", "cod"].includes(req.body.paymentMethod) ? "cash_on_delivery" : "demo";
      const orderResult = await client.query(
        `INSERT INTO orders(order_number,user_id,customer_name,email,phone,address,city,pincode,payment_method,payment_status,subtotal,shipping,total)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10,$11,$12)
         RETURNING id,order_number,status,payment_status,subtotal,shipping,total,created_at`,
        [orderNumber,req.userId,name,email,phone,address,city,pincode,paymentMethod,subtotal,shipping,total]);
      const order = orderResult.rows[0];
      for (const item of orderProducts) {
        await client.query("INSERT INTO order_items(order_id,product_id,product_name,unit_price,quantity) VALUES($1,$2,$3,$4,$5)", [order.id,item.id,item.name,item.price,item.quantity]);
        await client.query("UPDATE products SET stock=stock-$1 WHERE id=$2", [item.quantity,item.id]);
        await client.query("DELETE FROM cart_items WHERE user_id=$1 AND product_id=$2", [req.userId,item.id]);
      }
      await client.query("COMMIT");
      res.status(201).json({ order: { ...order, id: Number(order.id), subtotal: Number(order.subtotal), shipping: Number(order.shipping), total: Number(order.total), items: orderProducts.map(({slug,name,price,quantity})=>({slug,name,price,quantity})) } });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }));

  app.get("/api/orders", requireAuth, asyncRoute(async (req, res) => {
    const result = await pool.query(
      `SELECT o.id,o.order_number,o.status,o.payment_status,o.payment_method,o.subtotal,o.shipping,o.total,o.created_at,
       COALESCE(json_agg(json_build_object('name',oi.product_name,'price',oi.unit_price,'quantity',oi.quantity)) FILTER (WHERE oi.id IS NOT NULL),'[]'::json) AS items
       FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id
       WHERE o.user_id=$1 GROUP BY o.id ORDER BY o.created_at DESC LIMIT 100`, [req.userId]);
    res.json({ orders: result.rows.map((row)=>({ ...row, subtotal:Number(row.subtotal), shipping:Number(row.shipping), total:Number(row.total), items:row.items || [] })) });
  }));

  app.post("/api/custom-requests", requireAuth, asyncRoute(async (req, res) => {
    const body = req.body || {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "";
    const quantity = Number(body.quantity);
    if (name.length < 2 || !validEmail(email) || !/^[6-9]\d{9}$/.test(phone) || title.length < 2 || title.length > 160 || description.length < 10 || description.length > 1000 || !category || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      throw httpError(400, "Please check the required custom request fields.");
    }
    const images = Array.isArray(body.referenceImages) ? body.referenceImages.filter((name) => typeof name === "string").slice(0,3).map((name)=>name.slice(0,200)) : [];
    const result = await pool.query(
      `INSERT INTO custom_requests(user_id,customer_name,email,phone,title,description,category,quantity,budget,notes,reference_images)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
       RETURNING id,title,category,quantity,status,created_at`,
      [req.userId,name,email,phone,title,description,category,quantity,String(body.budget||"").slice(0,80),String(body.notes||"").slice(0,2000),JSON.stringify(images)]);
    res.status(201).json({ request: result.rows[0] });
  }));

  app.get("/api/custom-requests", requireAuth, asyncRoute(async (req, res) => {
    const result = await pool.query(
      `SELECT id,title,category,quantity,status,created_at FROM custom_requests WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`, [req.userId]);
    res.json({ requests: result.rows });
  }));

  // Administrator APIs: every route checks the role stored in PostgreSQL, not a browser flag.
  app.get("/api/admin/summary", requireAuth, requireAdmin, asyncRoute(async (_req, res) => {
    const [products, customers, orders, revenue, requests] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE active)::int AS active, COALESCE(SUM(stock) FILTER (WHERE active),0)::int AS stock FROM products"),
      pool.query("SELECT COUNT(*)::int AS total FROM users WHERE role='customer'"),
      pool.query("SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status IN ('placed','processing'))::int AS open FROM orders"),
      pool.query("SELECT COALESCE(SUM(total),0)::bigint AS total FROM orders WHERE status <> 'cancelled' AND payment_status='paid'"),
      pool.query("SELECT COUNT(*)::int AS total FROM custom_requests WHERE status NOT IN ('completed','declined')")
    ]);
    res.json({ products: products.rows[0], customers: customers.rows[0].total, orders: orders.rows[0], paidRevenue: Number(revenue.rows[0].total), openCustomRequests: requests.rows[0].total });
  }));

  app.get("/api/admin/products", requireAuth, requireAdmin, asyncRoute(async (_req, res) => {
    const result = await pool.query("SELECT id,slug,name,description,price,image,category,dimensions,material,stock,active,created_at FROM products ORDER BY id DESC");
    res.json({ products: result.rows.map((p) => ({ ...p, price:Number(p.price), stock:Number(p.stock) })) });
  }));

  app.post("/api/admin/products", requireAuth, requireAdmin, asyncRoute(async (req, res) => {
    const body = req.body || {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const slug = slugify(body.slug || name);
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "";
    const image = typeof body.image === "string" ? body.image.trim() : "";
    const price = Number(body.price);
    const stock = Number(body.stock ?? 0);
    if (name.length < 2 || name.length > 160 || !slug || slug.length > 120 || description.length > 5000 || !category || category.length > 80 ||
        !Number.isSafeInteger(price) || price < 0 || !Number.isSafeInteger(stock) || stock < 0 || stock > 100000 ||
        !(image.startsWith("assets/") && !image.includes("..") && !image.includes("\\\\") || /^https:\/\//i.test(image))) {
      throw httpError(400, "Check product name, description, category, image path, price, and stock.");
    }
    try {
      const result = await pool.query(
        "INSERT INTO products(slug,name,description,price,image,category,dimensions,material,stock,active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE) RETURNING *",
        [slug,name,description,price,image,category,String(body.dimensions||"").slice(0,160),String(body.material||"").slice(0,160),stock]);
      res.status(201).json({ product: result.rows[0] });
    } catch (error) {
      if (error.code === "23505") throw httpError(409, "A product with this URL slug already exists.");
      throw error;
    }
  }));

  app.patch("/api/admin/products/:id", requireAuth, requireAdmin, asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, "Invalid product ID.");
    const existing = await pool.query("SELECT * FROM products WHERE id=$1", [id]);
    if (!existing.rows[0]) throw httpError(404, "Product not found.");
    const old = existing.rows[0], body = req.body || {};
    const name = body.name === undefined ? old.name : String(body.name).trim();
    const description = body.description === undefined ? old.description : String(body.description).trim();
    const category = body.category === undefined ? old.category : String(body.category).trim();
    const image = body.image === undefined ? old.image : String(body.image).trim();
    const price = body.price === undefined ? Number(old.price) : Number(body.price);
    const stock = body.stock === undefined ? Number(old.stock) : Number(body.stock);
    const active = body.active === undefined ? old.active : body.active;
    if (name.length < 2 || name.length > 160 || description.length > 5000 || !category || category.length > 80 ||
        !Number.isSafeInteger(price) || price < 0 || !Number.isSafeInteger(stock) || stock < 0 || stock > 100000 || typeof active !== "boolean" ||
        !(image.startsWith("assets/") && !image.includes("..") && !image.includes("\\\\") || /^https:\/\//i.test(image))) {
      throw httpError(400, "Check product name, description, category, image path, price, and stock.");
    }
    try {
      const result = await pool.query(
        "UPDATE products SET name=$1,description=$2,price=$3,image=$4,category=$5,dimensions=$6,material=$7,stock=$8,active=$9 WHERE id=$10 RETURNING *",
        [name,description,price,image,category,String(body.dimensions ?? old.dimensions).slice(0,160),String(body.material ?? old.material).slice(0,160),stock,active,id]);
      res.json({ product: result.rows[0] });
    } catch (error) {
      if (error.code === "23505") throw httpError(409, "A product with this URL slug already exists.");
      throw error;
    }
  }));

  app.get("/api/admin/orders", requireAuth, requireAdmin, asyncRoute(async (_req, res) => {
    const result = await pool.query(
      `SELECT o.id,o.order_number,o.customer_name,o.email,o.phone,o.address,o.city,o.pincode,o.payment_method,o.payment_status,o.status,o.subtotal,o.shipping,o.total,o.created_at,
       COALESCE(json_agg(json_build_object('name',oi.product_name,'price',oi.unit_price,'quantity',oi.quantity)) FILTER (WHERE oi.id IS NOT NULL),'[]'::json) AS items
       FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id GROUP BY o.id ORDER BY o.created_at DESC LIMIT 500`);
    res.json({ orders: result.rows });
  }));

  app.patch("/api/admin/orders/:id", requireAuth, requireAdmin, asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    const status = req.body?.status;
    if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, "Invalid order ID.");
    if (!["placed","processing","shipped","delivered","cancelled"].includes(status)) throw httpError(400, "Invalid order status.");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const currentResult = await client.query("SELECT id,order_number,status,payment_status FROM orders WHERE id=$1 FOR UPDATE", [id]);
      const current = currentResult.rows[0];
      if (!current) throw httpError(404, "Order not found.");
      if (current.status === "cancelled" && status !== "cancelled") throw httpError(409, "A cancelled order cannot be reopened.");
      if (["shipped","delivered"].includes(current.status) && status === "cancelled") throw httpError(409, "A shipped or delivered order cannot be cancelled from this dashboard.");
      if (current.status !== "cancelled" && status === "cancelled") {
        await client.query(
          `UPDATE products p SET stock = p.stock + restock.quantity
           FROM (
             SELECT product_id, SUM(quantity)::int AS quantity
             FROM order_items WHERE order_id=$1 AND product_id IS NOT NULL
             GROUP BY product_id
           ) AS restock WHERE restock.product_id=p.id`, [id]);
      }
      const result = await client.query("UPDATE orders SET status=$1 WHERE id=$2 RETURNING id,order_number,status,payment_status", [status,id]);
      await client.query("COMMIT");
      res.json({ order: result.rows[0] });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }));

  app.get("/api/admin/custom-requests", requireAuth, requireAdmin, asyncRoute(async (_req, res) => {
    const result = await pool.query("SELECT id,customer_name,email,phone,title,description,category,quantity,budget,notes,reference_images,status,created_at FROM custom_requests ORDER BY created_at DESC LIMIT 500");
    res.json({ requests: result.rows });
  }));

  app.patch("/api/admin/custom-requests/:id", requireAuth, requireAdmin, asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    const status = req.body?.status;
    if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, "Invalid request ID.");
    if (!["received","reviewing","quoted","accepted","declined","completed"].includes(status)) throw httpError(400, "Invalid custom request status.");
    const result = await pool.query("UPDATE custom_requests SET status=$1 WHERE id=$2 RETURNING id,title,status", [status,id]);
    if (!result.rows[0]) throw httpError(404, "Custom request not found.");
    res.json({ request: result.rows[0] });
  }));

  app.get("/api/admin/customers", requireAuth, requireAdmin, asyncRoute(async (_req, res) => {
    const result = await pool.query(
      `SELECT u.id,u.name,u.email,u.created_at,COUNT(o.id)::int AS order_count,COALESCE(SUM(o.total) FILTER (WHERE o.status <> 'cancelled'),0)::bigint AS order_total
       FROM users u LEFT JOIN orders o ON o.user_id=u.id WHERE u.role='customer' GROUP BY u.id ORDER BY u.created_at DESC LIMIT 500`);
    res.json({ customers: result.rows.map((u)=>({...u,order_total:Number(u.order_total)})) });
  }));

  // Serve only public website files; never expose environment files, migrations, or server source.
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    const safeAssetPath = req.path.startsWith("/assets/") && !req.path.includes("..") && !req.path.includes("\\");
    if (publicPages.has(req.path) || safeAssetPath) return next();
    return res.status(404).send("Not found");
  });
  app.use(express.static(root, { index: "index.html", dotfiles: "deny", fallthrough: true }));

  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) return next(httpError(404, "API endpoint not found."));
    return next();
  });

  app.use((error, _req, res, _next) => {
    if (error.message === "Origin is not allowed by CORS") return res.status(403).json({ error: error.message });
    const status = Number(error.status) || 500;
    if (status >= 500) console.error(error);
    res.status(status).json({ error: status >= 500 ? "Something went wrong. Please try again." : error.message });
  });

  return app;
}
