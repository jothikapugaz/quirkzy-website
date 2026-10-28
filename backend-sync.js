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
    const name = byId("product-name")?.textContent?.trim() || readJson("selectedProduct", {}).name || "";
    return api.slugify(name);
  };

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
