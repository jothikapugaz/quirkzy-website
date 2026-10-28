(function () {
  "use strict";
  const api = window.QuirkzyAPI;
  if (!api) return;

  const byId = (id) => document.getElementById(id);
  const readJson = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  };
  const money = (value) => "₹" + Number(value || 0).toLocaleString("en-IN");
  const notify = (message) => {
    const toast = byId("toast");
    if (toast) {
      toast.textContent = message;
      toast.classList.add("show");
      window.setTimeout(() => toast.classList.remove("show"), 2600);
    } else {
      window.alert(message);
    }
  };
  const productSlug = () => {
    const selected = readJson("selectedProduct", {}) || {};
    const name = byId("product-name")?.textContent?.trim() || selected.name || "";
    return selected.slug || api.slugify(name);
  };

  // GitHub Pages cannot run Express. Preserve the existing browser-only demo until an API URL is configured.
  if (window.QUIRKZY_API_DISABLED) {
    document.querySelectorAll(".login-note").forEach((note) => {
      note.textContent = "Demo mode: this account is saved only in this browser. Do not use a real password.";
    });
    const loginForm = byId("login-form");
    if (loginForm) {
      let mode = "login";
      document.addEventListener("click", (event) => {
        const toggle = event.target.closest("#show-signup");
        if (!toggle) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        mode = mode === "login" ? "register" : "login";
        loginForm.dataset.mode = mode;
        const nameInput = byId("login-name");
        const nameLabel = byId("login-name-label");
        if (nameInput) { nameInput.hidden = mode !== "register"; nameInput.required = mode === "register"; }
        if (nameLabel) nameLabel.hidden = mode !== "register";
        const heading = document.querySelector(".login-page h1");
        const button = loginForm.querySelector('button[type="submit"]');
        const switchText = document.querySelector(".login-switch");
        if (heading) heading.textContent = mode === "register" ? "Make it yours." : "Come on in.";
        if (button) button.textContent = mode === "register" ? "Create account →" : "Log in →";
        if (switchText) switchText.innerHTML = mode === "register" ? 'Already have an account? <a href="#" id="show-signup">Log in</a>' : 'Don\'t have an account? <a href="#" id="show-signup">Create one</a>';
      }, true);
      document.addEventListener("submit", (event) => {
        if (event.target !== loginForm) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const email = byId("login-email")?.value.trim().toLowerCase() || "";
        const password = byId("login-password")?.value || "";
        const name = byId("login-name")?.value.trim() || "";
        const message = byId("login-message");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || (mode === "register" && name.length < 2)) {
          if (message) message.textContent = "Enter valid details. Demo passwords must be at least 8 characters.";
          return;
        }
        let saved = null;
        try { saved = JSON.parse(localStorage.getItem("quirkzyUser") || "null"); } catch {}
        if (mode === "login" && (!saved || saved.email.toLowerCase() !== email)) {
          if (message) message.textContent = "No demo account for this email in this browser. Choose Create one first.";
          return;
        }
        if (mode === "register") localStorage.setItem("quirkzyUser", JSON.stringify({ name, email }));
        if (message) message.textContent = "Demo account ready. Returning to Quirkzy…";
        window.location.href = "index.html";
      }, true);
    }

    if (byId("account-orders") && byId("account-custom-requests")) {
      let user = null;
      try { user = JSON.parse(localStorage.getItem("quirkzyUser") || "null"); } catch {}
      if (!user) window.location.replace("login.html");
      else {
        if (byId("account-name")) byId("account-name").textContent = user.name || "Quirkzy friend";
        if (byId("account-email")) byId("account-email").textContent = user.email || "";
        const lastOrder = (() => { try { return JSON.parse(localStorage.getItem("quirkzyLastOrder") || "null"); } catch { return null; } })();
        const ordersRoot = byId("account-orders");
        ordersRoot.replaceChildren();
        const orderText = document.createElement("p");
        orderText.className = "account-empty";
        orderText.textContent = lastOrder ? "Last demo order: " + (lastOrder.order_number || "saved in this browser") + " · " + money(lastOrder.total) : "No demo orders saved in this browser yet. Full order history requires the backend.";
        ordersRoot.appendChild(orderText);
        const requestsRoot = byId("account-custom-requests");
        requestsRoot.replaceChildren();
        const requestText = document.createElement("p");
        requestText.className = "account-empty";
        requestText.textContent = "Custom request history is available when the backend is deployed.";
        requestsRoot.appendChild(requestText);
      }
    }
    document.addEventListener("click", (event) => {
      const button = event.target.closest("#logout-button");
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      localStorage.removeItem("quirkzyUser");
      window.location.href = "login.html";
    }, true);
    return;
  }

  // The database is the catalogue source of truth whenever the API is available.
  async function syncCatalogWithApi() {
    const grid = document.querySelector("#shop .product-grid");
    const productPage = document.querySelector(".product-page");
    let records;
    try {
      const result = await api.getProducts();
      records = Array.isArray(result.products) ? result.products : [];
    } catch (error) {
      console.warn("Catalogue sync unavailable; keeping the current storefront:", error.message);
      return;
    }

    const productsBySlug = new Map();
    const localProducts = typeof quirkzyProducts !== "undefined" ? quirkzyProducts : [];
    for (const record of records) {
      const product = {
        name: record.name,
        slug: record.slug,
        price: money(record.price),
        image: record.image,
        category: record.category || "",
        description: record.description || "",
        stock: Number(record.stock)
      };
      const existing = localProducts.find((item) => api.slugify(item.name) === record.slug || item.slug === record.slug);
      if (existing) Object.assign(existing, product);
      else localProducts.push(product);
      productsBySlug.set(record.slug, existing || product);
    }

    if (grid) {
      const existingCards = [...grid.querySelectorAll(".product-card")];
      const matched = new Set();
      for (const record of records) {
        const card = existingCards.find((candidate) => {
          const name = candidate.querySelector("h3")?.textContent?.trim() || "";
          return api.slugify(name) === record.slug || candidate.dataset.productSlug === record.slug;
        });
        const product = productsBySlug.get(record.slug);
        let target = card;
        if (target) {
          matched.add(target);
        } else {
          target = document.createElement("article");
          target.className = "product-card";
          const image = document.createElement("img");
          const info = document.createElement("div");
          info.className = "product-info";
          info.append(document.createElement("h3"), document.createElement("span"));
          const add = document.createElement("button");
          add.type = "button";
          add.textContent = "Add to bag +";
          info.appendChild(add);
          target.append(image, info);
          grid.appendChild(target);
          const heart = document.createElement("button");
          heart.type = "button";
          heart.className = "card-wishlist-button";
          heart.setAttribute("aria-label", "Add to wishlist");
          heart.setAttribute("aria-pressed", "false");
          heart.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.7 C20.8 5.9 18.7 4 16.1 4 C14.6 4 13.2 4.7 12 6 C10.8 4.7 9.4 4 7.9 4 C5.3 4 3.2 5.9 3.2 8.7 C3.2 13.2 7.2 16.1 12 20 C16.8 16.1 20.8 13.2 20.8 8.7Z"/></svg>';
          target.appendChild(heart);
        }
        target.dataset.category = product.category;
        target.dataset.productSlug = product.slug;
        target.dataset.apiProduct = "true";
        const image = target.querySelector("img");
        const name = target.querySelector("h3");
        const price = target.querySelector(".product-info span");
        const addButton = target.querySelector(".product-info button");
        if (image) { image.src = product.image; image.alt = product.name; }
        if (name) name.textContent = product.name;
        if (price) price.textContent = product.price;
        if (addButton) {
          addButton.disabled = product.stock < 1;
          addButton.textContent = product.stock < 1 ? "Out of stock" : "Add to bag +";
        }
        const heart = target.querySelector(".card-wishlist-button");
        if (heart && typeof updateWishlistButton === "function") updateWishlistButton(heart, product.name);
      }
      existingCards.forEach((card) => { if (!matched.has(card) && !records.some((r) => r.slug === card.dataset.productSlug)) card.remove(); });

      const categoryButtons = document.querySelector(".category-buttons");
      if (categoryButtons) {
        const known = new Set([...categoryButtons.querySelectorAll(".category-btn")].map((button) => button.dataset.category));
        for (const category of [...new Set(records.map((record) => record.category).filter(Boolean))]) {
          if (known.has(category)) continue;
          const button = document.createElement("button");
          button.type = "button";
          button.className = "category-btn";
          button.dataset.category = category;
          button.textContent = category.replace(/-/g, " ").toUpperCase();
          button.addEventListener("click", () => {
            categoryButtons.querySelectorAll(".category-btn").forEach((item) => item.classList.toggle("active", item === button));
            grid.querySelectorAll(".product-card").forEach((card) => { card.style.display = category === "all" || card.dataset.category === category ? "" : "none"; });
          });
          categoryButtons.appendChild(button);
        }
      }
    }

    // Intercept cards in capture phase so the old demo handlers cannot use stale hard-coded prices.
    document.addEventListener("click", (event) => {
      const card = event.target.closest("#shop .product-card[data-api-product='true']");
      if (!card) return;
      const product = productsBySlug.get(card.dataset.productSlug);
      if (!product) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const heart = event.target.closest(".card-wishlist-button");
      if (heart) {
        if (typeof handleWishlistClick === "function") handleWishlistClick(heart, product);
        return;
      }
      if (event.target.closest(".product-info button")) {
        if (product.stock < 1) return notify("This product is currently out of stock.");
        const added = typeof addProductToBagWithLogin === "function" && addProductToBagWithLogin(product);
        if (added) notify(product.name + " added to your bag! ♡");
        return;
      }
      sessionStorage.setItem("quirkzyScrollPosition", window.scrollY);
      if (typeof selectProduct === "function") selectProduct(product);
      window.location.href = "product.html";
    }, true);

    if (productPage) {
      const selected = readJson("selectedProduct", {}) || {};
      const slug = selected.slug || api.slugify(selected.name || byId("product-name")?.textContent || "");
      const record = records.find((item) => item.slug === slug);
      if (record) {
        const product = productsBySlug.get(record.slug);
        Object.assign(selected, product);
        if (typeof currentProduct !== "undefined" && currentProduct) Object.assign(currentProduct, product);
        localStorage.setItem("selectedProduct", JSON.stringify(selected));
        if (byId("product-name")) byId("product-name").textContent = record.name;
        if (byId("product-price")) byId("product-price").textContent = money(record.price);
        if (byId("product-image")) { byId("product-image").src = record.image; byId("product-image").alt = record.name; }
        if (byId("product-category")) byId("product-category").textContent = record.category || "";
        if (byId("product-description")) byId("product-description").textContent = record.description || "";
        if (byId("product-dimensions")) byId("product-dimensions").textContent = record.dimensions || byId("product-dimensions").textContent || "—";
        if (byId("product-material")) byId("product-material").textContent = record.material || byId("product-material").textContent || "—";
        for (const id of ["product-weight","product-features","product-color","product-care"]) {
          const field = byId(id);
          if (field && !field.textContent.trim()) field.textContent = "—";
        }
        for (const id of ["add-to-bag","order-now"]) {
          const button = byId(id);
          if (button) { button.disabled = Number(record.stock) < 1; if (button.disabled) button.textContent = "Out of stock"; }
        }
      } else {
        if (byId("product-description")) byId("product-description").textContent = "This product is no longer available.";
        for (const id of ["add-to-bag","order-now"]) {
          const button = byId(id);
          if (button) { button.disabled = true; button.textContent = "Unavailable"; }
        }
      }
    }

    // Refresh prices and image references in saved lists from the server's catalogue.
    let changedBag = false;
    const bag = readJson("quirkzyBag", []);
    for (const item of bag) {
      const record = records.find((entry) => entry.slug === (item.slug || api.slugify(item.name)));
      if (!record) continue;
      if (item.price !== money(record.price) || item.image !== record.image || item.name !== record.name) changedBag = true;
      Object.assign(item, { slug:record.slug, name:record.name, price:money(record.price), image:record.image, category:record.category });
    }
    if (changedBag) {
      localStorage.setItem("quirkzyBag", JSON.stringify(bag));
      if (typeof renderCart === "function") renderCart();
      if (typeof updateBagCount === "function") updateBagCount();
    }
    const wishlist = readJson("quirkzyWishlist", []);
    let changedWishlist = false;
    for (const item of wishlist) {
      const record = records.find((entry) => entry.slug === (item.slug || api.slugify(item.name)));
      if (!record) continue;
      if (item.price !== money(record.price) || item.image !== record.image || item.name !== record.name) changedWishlist = true;
      Object.assign(item, { slug:record.slug, name:record.name, price:money(record.price), image:record.image, category:record.category });
    }
    if (changedWishlist) localStorage.setItem("quirkzyWishlist", JSON.stringify(wishlist));
  }
  syncCatalogWithApi();

  // Keep logged-in carts persisted on the server while retaining a local cache for guests.
  const originalSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    originalSetItem.call(this, key, value);
    if (this !== localStorage || !api.isSignedIn()) return;
    if (key === "quirkzyBag") {
      try { api.saveCart().catch((error) => console.warn("Cart sync deferred:", error.message)); } catch {}
    }
    if (key === "quirkzyWishlist") {
      let desired = [];
      try { desired = JSON.parse(value || "[]"); } catch {}
      api.getWishlist().then(async ({ items }) => {
        const current = new Set(items.map((item) => item.slug));
        const target = new Set(desired.map((item) => item.slug || api.slugify(item.name)));
        for (const slug of target) if (!current.has(slug)) await api.addWishlist(slug);
        for (const slug of current) if (!target.has(slug)) await api.removeWishlist(slug);
      }).catch((error) => console.warn("Wishlist sync deferred:", error.message));
    }
  };

  function requireAccount() {
    if (api.isSignedIn()) return true;
    const modal = byId("login-modal");
    if (modal) {
      modal.classList.add("show");
      const message = modal.querySelector(".login-note");
      if (message) message.textContent = "Create an account or sign in to save your bag and orders. You can also open the account page.";
      return false;
    }
    window.location.href = "login.html";
    return false;
  }

  // Replace the old demo modal login with actual registration.
  document.addEventListener("click", async (event) => {
    const button = event.target.closest("#login-button");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const name = byId("login-name")?.value.trim() || "";
    const email = byId("login-email")?.value.trim() || "";
    const password = byId("login-modal-password")?.value || "";
    if (name.length < 2 || !email || password.length < 8) {
      notify("Enter your name, a valid email, and a password of at least 8 characters.");
      return;
    }
    button.disabled = true;
    try {
      await api.register(name, email, password);
      notify("Your Quirkzy account is ready! ♡");
      byId("login-modal")?.classList.remove("show");
      window.location.reload();
    } catch (error) {
      notify(error.message + (error.message.includes("already exists") ? " Please use the account page to sign in." : ""));
    } finally {
      button.disabled = false;
    }
  }, true);

  // Dedicated login and registration page.
  const loginForm = byId("login-form");
  if (loginForm) {
    document.addEventListener("submit", async (event) => {
      if (event.target !== loginForm) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const email = byId("login-email")?.value.trim() || "";
      const password = byId("login-password")?.value || "";
      const mode = loginForm.dataset.mode || "login";
      const name = byId("login-name")?.value.trim() || "";
      const message = byId("login-message");
      const submit = loginForm.querySelector('button[type="submit"]');
      if (submit) submit.disabled = true;
      try {
        if (mode === "register") await api.register(name, email, password);
        else await api.login(email, password);
        if (message) {
          message.textContent = "You're signed in. Taking you back to Quirkzy…";
          message.setAttribute("role", "status");
        }
        window.location.href = "index.html";
      } catch (error) {
        if (message) {
          message.textContent = error.message;
          message.setAttribute("role", "alert");
        } else notify(error.message);
      } finally {
        if (submit) submit.disabled = false;
      }
    }, true);

    document.addEventListener("click", (event) => {
      const toggle = event.target.closest("#show-signup");
      if (!toggle) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const form = byId("login-form");
      const isRegister = form.dataset.mode !== "register";
      form.dataset.mode = isRegister ? "register" : "login";
      const nameLabel = byId("login-name-label");
      const nameInput = byId("login-name");
      const heading = document.querySelector(".login-page h1");
      const button = form.querySelector('button[type="submit"]');
      const switchText = document.querySelector(".login-switch");
      if (nameLabel) nameLabel.hidden = !isRegister;
      if (nameInput) { nameInput.hidden = !isRegister; nameInput.required = isRegister; }
      if (heading) heading.textContent = isRegister ? "Make it yours." : "Come on in.";
      if (button) button.textContent = isRegister ? "Create account →" : "Log in →";
      if (switchText) switchText.innerHTML = isRegister ? 'Already have an account? <a href="#" id="show-signup">Log in</a>' : 'Don\'t have an account? <a href="#" id="show-signup">Create one</a>';
    }, true);
  }

  // Real product reviews are stored on the API.
  if (byId("reviews-list") && byId("submit-review")) {
    const slug = productSlug();
    api.getReviews(slug).then((result) => {
      if (typeof productReviews !== "undefined") {
        productReviews = result.reviews || [];
        updateRatingSummary();
        displayReviews();
      }
    }).catch((error) => console.warn("Reviews unavailable:", error.message));

    document.addEventListener("click", async (event) => {
      const button = event.target.closest("#submit-review");
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!requireAccount()) return;
      const rating = Number(typeof selectedRating === "undefined" ? 0 : selectedRating);
      const text = byId("review-text")?.value.trim() || "";
      if (!rating || !text) return notify("Choose a star rating and write your review first.");
      button.disabled = true;
      try {
        await api.saveReview(slug, rating, text);
        const result = await api.getReviews(slug);
        productReviews = result.reviews || [];
        updateRatingSummary();
        displayReviews();
        byId("review-text").value = "";
        notify("Your review has been saved. ♡");
      } catch (error) {
        notify(error.message);
      } finally { button.disabled = false; }
    }, true);
  }

  // Place orders through the server; totals and product prices are recalculated there.
  const placeOrder = byId("place-order-button");
  if (placeOrder) {
    document.addEventListener("click", async (event) => {
      const button = event.target.closest("#place-order-button");
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!requireAccount()) return;
      const items = readJson("quirkzyCheckoutItems", []);
      if (!items.length) return notify("Your checkout is empty.");
      const value = (id) => byId(id)?.value.trim() || "";
      const customer = {
        name:value("checkout-name"), email:value("checkout-email"), phone:value("checkout-phone"),
        address:value("checkout-address"), city:value("checkout-city"), pincode:value("checkout-pincode")
      };
      const invalid = !customer.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email) ||
        !/^[6-9]\d{9}$/.test(customer.phone) || customer.address.length < 5 || !customer.city || !/^\d{6}$/.test(customer.pincode);
      if (invalid) return notify("Please complete all delivery fields with a valid email, 10-digit Indian mobile number, and six-digit PIN code.");
      const payment = document.querySelector('input[name="payment"]:checked')?.value || "cash_on_delivery";
      button.disabled = true;
      try {
        const result = await api.createOrder({ customer, items:items.map((item)=>({slug:item.slug || api.slugify(item.name), quantity:Number(item.quantity)||1})), paymentMethod:payment });
        localStorage.setItem("quirkzyLastOrder", JSON.stringify({ ...result.order, customer, payment, date:result.order.created_at }));
        localStorage.removeItem("quirkzyCheckoutItems");
        const success = byId("order-success");
        if (success) {
          success.classList.add("show");
          const heading = success.querySelector("h2");
          if (heading) heading.textContent = "Your order is in! ♡";
          const paragraph = success.querySelector("p");
          if (paragraph) paragraph.textContent = "Order " + result.order.order_number + " has been saved. Payment is pending; this demo does not charge your card.";
        } else notify("Order placed: " + result.order.order_number);
        const bag = readJson("quirkzyBag", []);
        const remaining = [...bag];
        for (const bought of items) {
          const index = remaining.findIndex((item)=>item.name===bought.name);
          if (index >= 0) {
            remaining[index].quantity = Number(remaining[index].quantity||0)-Number(bought.quantity||1);
            if (remaining[index].quantity <= 0) remaining.splice(index,1);
          }
        }
        localStorage.setItem("quirkzyBag", JSON.stringify(remaining));
        if (typeof updateBagCount === "function") updateBagCount();
      } catch (error) {
        notify(error.message);
      } finally { button.disabled = false; }
    }, true);
  }

  // Persist custom ideas instead of showing a local-only success message.
  const customForm = byId("custom-request-form");
  if (customForm) {
    document.addEventListener("submit", async (event) => {
      if (event.target !== customForm) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!requireAccount()) return;
      const value = (id) => byId(id)?.value.trim() || "";
      const category = document.querySelector('input[name="category"]:checked')?.value || "";
      const payload = {
        name:value("custom-name"), email:value("custom-email"), phone:value("custom-phone"),
        title:value("custom-title"), description:value("custom-description"), category,
        quantity:Number(value("custom-quantity"))||1, budget:value("custom-budget"), notes:value("custom-notes"),
        referenceImages:Array.from(byId("custom-image-preview")?.querySelectorAll("img")||[]).map((img)=>img.dataset.filename||img.alt).slice(0,3)
      };
      const submit = customForm.querySelector('button[type="submit"]');
      if (submit) submit.disabled = true;
      try {
        const result = await api.createCustomRequest(payload);
        const success = byId("custom-success");
        if (success) {
          success.classList.add("show");
          const heading = success.querySelector("h2");
          if (heading) heading.textContent = "That's wonderfully weird.";
          const paragraph = success.querySelector("p:last-of-type");
          if (paragraph) paragraph.textContent = "Your idea request #" + result.request.id + " has been saved. We'll review it soon.";
        }
        customForm.reset();
      } catch (error) { notify(error.message); }
      finally { if (submit) submit.disabled = false; }
    }, true);
  }

  // Refresh product details from PostgreSQL-backed catalogue data.
  api.getProducts().then(({ products }) => {
    if (!Array.isArray(products) || !products.length) return;
    const mapped = products.map((product) => ({
      ...product,
      price: money(product.price)
    }));
    if (typeof quirkzyProducts !== "undefined" && Array.isArray(quirkzyProducts)) {
      quirkzyProducts.splice(0, quirkzyProducts.length, ...mapped);
    }
    document.querySelectorAll("#shop .product-card").forEach((card) => {
      const name = card.querySelector("h3")?.textContent.trim();
      const product = products.find((item) => item.name === name);
      if (!product) return;
      const image = card.querySelector("img");
      const price = card.querySelector(".product-info span");
      if (image) { image.src = product.image; image.alt = product.name; }
      if (price) price.textContent = money(product.price);
      card.dataset.category = product.category;
    });
    const detailName = byId("product-name")?.textContent.trim();
    const detailProduct = products.find((item) => item.name === detailName);
    if (detailProduct) {
      const image = byId("product-image");
      if (image) { image.src = detailProduct.image; image.alt = detailProduct.name; }
      if (byId("product-category")) byId("product-category").textContent = detailProduct.category.replace(/-/g, " ");
      if (byId("product-name")) byId("product-name").textContent = detailProduct.name;
      if (byId("product-price")) byId("product-price").textContent = money(detailProduct.price);
      if (byId("product-description")) byId("product-description").textContent = detailProduct.description;
      if (byId("product-dimensions")) byId("product-dimensions").textContent = detailProduct.dimensions;
      if (byId("product-material")) byId("product-material").textContent = detailProduct.material;
    }
  }).catch((error) => console.warn("Catalogue API unavailable:", error.message));

  // Account dashboard: show only the signed-in user's own orders and custom requests.
  if (byId("account-orders") && byId("account-custom-requests")) {
    if (!api.isSignedIn()) {
      window.location.replace("login.html");
    } else {
      Promise.all([api.refreshSession(), api.getOrders(), api.getCustomRequests()]).then(([user, ordersResult, requestsResult]) => {
        if (byId("account-name")) byId("account-name").textContent = user.name;
        if (byId("account-email")) byId("account-email").textContent = user.email;
        const ordersRoot = byId("account-orders");
        ordersRoot.replaceChildren();
        const orders = ordersResult.orders || [];
        if (!orders.length) {
          const empty = document.createElement("p");
          empty.className = "account-empty";
          empty.textContent = "No orders yet. Your next little quirk is waiting in the shop.";
          ordersRoot.appendChild(empty);
        }
        for (const order of orders) {
          const card = document.createElement("article");
          card.className = "account-list-card";
          const title = document.createElement("strong");
          title.textContent = order.order_number;
          const status = document.createElement("span");
          status.className = "account-status";
          status.textContent = String(order.status || "placed").replace(/-/g, " ");
          const meta = document.createElement("p");
          meta.textContent = new Date(order.created_at).toLocaleDateString() + " · " + money(order.total) + " · Payment: " + String(order.payment_status || "pending").replace(/-/g, " ");
          card.append(title, status, meta);
          ordersRoot.appendChild(card);
        }
        const requestsRoot = byId("account-custom-requests");
        requestsRoot.replaceChildren();
        const requests = requestsResult.requests || [];
        if (!requests.length) {
          const empty = document.createElement("p");
          empty.className = "account-empty";
          empty.textContent = "No custom ideas submitted yet. Tell us what you imagine.";
          requestsRoot.appendChild(empty);
        }
        for (const idea of requests) {
          const card = document.createElement("article");
          card.className = "account-list-card";
          const title = document.createElement("strong");
          title.textContent = idea.title;
          const status = document.createElement("span");
          status.className = "account-status";
          status.textContent = String(idea.status || "received").replace(/-/g, " ");
          const meta = document.createElement("p");
          meta.textContent = idea.category.replace(/-/g, " ") + " · Quantity: " + idea.quantity + " · " + new Date(idea.created_at).toLocaleDateString();
          card.append(title, status, meta);
          requestsRoot.appendChild(card);
        }
      }).catch((error) => {
        notify(error.message);
        window.location.replace("login.html");
      });
    }
  }

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("#logout-button");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    await api.logout();
    window.location.href = "login.html";
  }, true);

  // Load authoritative product data where useful and report a visible backend issue on the health endpoint.
  api.request("/api/health").then((health) => {
    document.documentElement.dataset.apiStatus = health.status === "ok" ? "connected" : "disconnected";
  }).catch((error) => {
    document.documentElement.dataset.apiStatus = "disconnected";
    console.info("Quirkzy API is not connected yet:", error.message);
  });

  if (api.isSignedIn()) api.refreshSession().catch(() => {});
})();
