CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL CHECK (price >= 0),
  image TEXT NOT NULL DEFAULT '',
  category VARCHAR(80) NOT NULL,
  dimensions VARCHAR(160) NOT NULL DEFAULT '',
  material VARCHAR(160) NOT NULL DEFAULT '',
  stock INTEGER NOT NULL DEFAULT 100 CHECK (stock >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS wishlist_items (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  order_number VARCHAR(32) NOT NULL UNIQUE,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  customer_name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  pincode VARCHAR(6) NOT NULL,
  payment_method VARCHAR(40) NOT NULL DEFAULT 'cash_on_delivery',
  payment_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  status VARCHAR(30) NOT NULL DEFAULT 'placed',
  subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
  shipping INTEGER NOT NULL CHECK (shipping >= 0),
  total INTEGER NOT NULL CHECK (total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(160) NOT NULL,
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 100)
);

CREATE TABLE IF NOT EXISTS reviews (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text VARCHAR(1200) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS custom_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  phone VARCHAR(10) NOT NULL,
  title VARCHAR(160) NOT NULL,
  description VARCHAR(1000) NOT NULL,
  category VARCHAR(80) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 100),
  budget VARCHAR(80) NOT NULL DEFAULT '',
  notes VARCHAR(2000) NOT NULL DEFAULT '',
  reference_images JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'received',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_product_created ON reviews(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_custom_requests_user_created ON custom_requests(user_id, created_at DESC);
