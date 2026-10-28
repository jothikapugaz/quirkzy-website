(function () {
  "use strict";

  const API_BASE = String(window.QUIRKZY_API_BASE || "").replace(/\/$/, "");
  const TOKEN_KEY = "quirkzyToken";
  const USER_KEY = "quirkzyUser";

  async function request(path, options = {}) {
    const headers = { Accept: "application/json", ...(options.headers || {}) };
    if (options.body !== undefined && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) headers.Authorization = "Bearer " + token;
    const response = await fetch(API_BASE + path, {
      ...options,
      headers,
      body: options.body !== undefined && !(options.body instanceof FormData) ? JSON.stringify(options.body) : options.body
    });
    if (response.status === 204) return null;
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 && token) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
      throw new Error(payload.error || "Request failed. Please try again.");
    }
    return payload;
  }

  function slugify(value) {
    return String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function cartItems() {
    try { return JSON.parse(localStorage.getItem("quirkzyBag") || "[]"); }
    catch { return []; }
  }

  function saveLocalCart(items) {
    localStorage.setItem("quirkzyBag", JSON.stringify(items));
  }

  async function syncCart() {
    const items = cartItems().map((item) => ({ slug: item.slug || slugify(item.name), quantity: Number(item.quantity) || 1 }));
    return request("/api/cart", { method: "PUT", body: { items } });
  }

  window.QuirkzyAPI = {
    request,
    slugify,
    get token() { return localStorage.getItem(TOKEN_KEY); },
    get user() {
      try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); }
      catch { return null; }
    },
    isSignedIn() { return Boolean(localStorage.getItem(TOKEN_KEY)); },
    async register(name, email, password) {
      const result = await request("/api/auth/register", { method: "POST", body: { name, email, password } });
      localStorage.setItem(TOKEN_KEY, result.token);
      localStorage.setItem(USER_KEY, JSON.stringify(result.user));
      await syncCart().catch(() => {});
      return result.user;
    },
    async login(email, password) {
      const result = await request("/api/auth/login", { method: "POST", body: { email, password } });
      localStorage.setItem(TOKEN_KEY, result.token);
      localStorage.setItem(USER_KEY, JSON.stringify(result.user));
      const serverCart = await request("/api/cart").catch(() => ({ items: [] }));
      if (serverCart.items.length) {
        saveLocalCart(serverCart.items.map((item) => ({ name:item.name, slug:item.slug, price:"₹"+item.price, image:item.image, category:item.category, quantity:Number(item.quantity) })));
      } else {
        await syncCart().catch(() => {});
      }
      const serverWishlist = await request("/api/wishlist").catch(() => ({ items: [] }));
      if (serverWishlist.items.length) {
        localStorage.setItem("quirkzyWishlist", JSON.stringify(serverWishlist.items.map((item) => ({ name:item.name, slug:item.slug, price:"₹"+item.price, image:item.image, category:item.category }))));
      } else {
        let localWishlist = [];
        try { localWishlist = JSON.parse(localStorage.getItem("quirkzyWishlist") || "[]"); } catch {}
        for (const item of localWishlist) {
          await request("/api/wishlist/" + encodeURIComponent(item.slug || slugify(item.name)), { method:"POST" }).catch(() => {});
        }
      }
      return result.user;
    },
    async logout() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },
    async getProducts(params = {}) {
      const query = new URLSearchParams();
      if (params.search) query.set("search", params.search);
      if (params.category && params.category !== "all") query.set("category", params.category);
      return request("/api/products" + (query.size ? "?" + query.toString() : ""));
    },
    async getReviews(slug) { return request("/api/products/" + encodeURIComponent(slug) + "/reviews"); },
    async saveReview(slug, rating, text) {
      return request("/api/products/" + encodeURIComponent(slug) + "/reviews", { method:"POST", body:{ rating, text } });
    },
    async saveCart() { return syncCart(); },
    async getWishlist() { return request("/api/wishlist"); },
    async addWishlist(slug) { return request("/api/wishlist/" + encodeURIComponent(slug), { method:"POST" }); },
    async removeWishlist(slug) { return request("/api/wishlist/" + encodeURIComponent(slug), { method:"DELETE" }); },
    async createOrder(payload) { return request("/api/orders", { method:"POST", body:payload }); },
    async getOrders() { return request("/api/orders"); },
    async createCustomRequest(payload) { return request("/api/custom-requests", { method:"POST", body:payload }); },
    async getCustomRequests() { return request("/api/custom-requests"); },
    async refreshSession() {
      if (!localStorage.getItem(TOKEN_KEY)) return null;
      const result = await request("/api/auth/me");
      localStorage.setItem(USER_KEY, JSON.stringify(result.user));
      return result.user;
    }
  };
})();
