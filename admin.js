(function () {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const api = window.QuirkzyAPI;
  const loginPanel = $("#admin-login-panel"), dashboard = $("#admin-dashboard");
  const logoutButton = $("#admin-logout");
  const status = $("#admin-status");
  const money = (value) => "₹" + Number(value || 0).toLocaleString("en-IN");
  const date = (value) => value ? new Date(value).toLocaleString("en-IN", { dateStyle:"medium", timeStyle:"short" }) : "—";
  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined && text !== null) node.textContent = String(text);
    if (className) node.className = className;
    return node;
  }
  function cell(row, value) { row.appendChild(el("td", value)); }
  function table(headers) {
    const wrap = el("div", undefined, "admin-table-wrap");
    const t = el("table", undefined, "admin-table");
    const thead = el("thead"), tr = el("tr");
    headers.forEach((h) => tr.appendChild(el("th", h)));
    thead.appendChild(tr); t.appendChild(thead);
    const tbody = el("tbody"); t.appendChild(tbody); wrap.appendChild(t);
    return { wrap, tbody };
  }
  function select(options, current, label) {
    const input = el("select");
    input.setAttribute("aria-label", label);
    options.forEach((option) => {
      const o = el("option", option.label); o.value = option.value; o.selected = option.value === current; input.appendChild(o);
    });
    return input;
  }
  function setMessage(target, message, error = false) {
    target.textContent = message || "";
    target.classList.toggle("is-error", error);
  }
  function showDashboard(user) {
    loginPanel.hidden = true; dashboard.hidden = false; logoutButton.hidden = false;
    $("#admin-name").textContent = user?.name || "Admin";
  }
  function showLogin() {
    loginPanel.hidden = false; dashboard.hidden = true; logoutButton.hidden = true;
  }
  async function adminRequest(path, options) { return api.request("/api/admin" + path, options); }

  async function loadSummary() {
    const data = await adminRequest("/summary");
    const metrics = [
      ["Active products", data.products.active + " / " + data.products.total],
      ["Stock units", data.products.stock],
      ["Customers", data.customers],
      ["Total orders", data.orders.total],
      ["Open orders", data.orders.open],
      ["Paid revenue", money(data.paidRevenue)],
      ["Open custom requests", data.openCustomRequests]
    ];
    const root = $("#admin-metrics"); root.replaceChildren();
    metrics.forEach(([label, value]) => {
      const card = el("article", undefined, "admin-metric");
      card.append(el("p", label), el("strong", value)); root.appendChild(card);
    });
  }

  async function loadProducts() {
    const { products } = await adminRequest("/products");
    const t = table(["Product", "Price (₹)", "Stock", "Category", "Status", "Actions"]);
    products.forEach((product) => {
      const row = el("tr");
      const info = el("td"); info.append(el("strong", product.name), el("small", product.slug), el("small", product.image)); row.appendChild(info);
      const price = el("input"); price.type = "number"; price.min = "0"; price.step = "1"; price.value = product.price; price.setAttribute("aria-label", product.name + " price"); cell(row, "");
      row.lastChild.replaceChildren(price);
      const stock = el("input"); stock.type = "number"; stock.min = "0"; stock.max = "100000"; stock.step = "1"; stock.value = product.stock; stock.setAttribute("aria-label", product.name + " stock"); const stockCell = el("td"); stockCell.appendChild(stock); row.appendChild(stockCell);
      cell(row, product.category);
      const active = select([{value:"true",label:"Active"},{value:"false",label:"Archived"}], String(product.active), product.name + " visibility");
      const statusCell = el("td"); statusCell.appendChild(active); row.appendChild(statusCell);
      const actions = el("td"); const save = el("button", "Save", "admin-small-button"); save.type = "button";
      save.addEventListener("click", async () => {
        save.disabled = true;
        try {
          await adminRequest("/products/" + product.id, { method:"PATCH", body:{ price:Number(price.value), stock:Number(stock.value), active:active.value === "true" } });
          setMessage($("#admin-product-message"), "Saved " + product.name + ".");
          await Promise.all([loadProducts(), loadSummary()]);
        } catch (error) { setMessage($("#admin-product-message"), error.message, true); }
        finally { save.disabled = false; }
      });
      actions.appendChild(save); row.appendChild(actions); t.tbody.appendChild(row);
    });
    $("#admin-products-table").replaceChildren(t.wrap);
  }

  async function loadOrders() {
    const { orders } = await adminRequest("/orders");
    const t = table(["Order", "Customer / delivery", "Items", "Total", "Payment", "Status", "Update"]);
    orders.forEach((order) => {
      const row = el("tr");
      const orderCell = el("td"); orderCell.append(el("strong", order.order_number), el("small", date(order.created_at))); row.appendChild(orderCell);
      const customer = el("td"); customer.append(el("strong", order.customer_name), el("small", order.email), el("small", order.phone), el("small", [order.address,order.city,order.pincode].filter(Boolean).join(", "))); row.appendChild(customer);
      const items = Array.isArray(order.items) ? order.items.map((i) => i.name + " × " + i.quantity).join(", ") : "";
      cell(row, items); cell(row, money(order.total)); cell(row, (order.payment_method || "—") + " / " + (order.payment_status || "pending"));
      const state = select(["placed","processing","shipped","delivered","cancelled"].map((s)=>({value:s,label:s})), order.status, "Order " + order.order_number + " status");
      const stateCell = el("td"); stateCell.appendChild(state); row.appendChild(stateCell);
      const actions = el("td"), save = el("button","Update","admin-small-button"); save.type="button";
      save.addEventListener("click", async () => {
        save.disabled=true;
        try { await adminRequest("/orders/" + order.id, {method:"PATCH",body:{status:state.value}}); setMessage(status,"Updated " + order.order_number + "."); await Promise.all([loadOrders(),loadSummary()]); }
        catch(error) { setMessage(status,error.message,true); } finally { save.disabled=false; }
      });
      actions.appendChild(save); row.appendChild(actions); t.tbody.appendChild(row);
    });
    $("#admin-orders-table").replaceChildren(orders.length ? t.wrap : el("p","No orders yet.","admin-empty"));
  }

  async function loadRequests() {
    const { requests } = await adminRequest("/custom-requests");
    const t = table(["Request", "Customer", "Details", "Status", "Update"]);
    requests.forEach((request) => {
      const row = el("tr"), title = el("td"); title.append(el("strong",request.title),el("small",date(request.created_at))); row.appendChild(title);
      const customer = el("td"); customer.append(el("strong",request.customer_name),el("small",request.email),el("small",request.phone)); row.appendChild(customer);
      const details = el("td"); details.append(el("span",request.category + " · Qty " + request.quantity),el("small",request.description),el("small",request.budget ? "Budget: " + request.budget : "")); row.appendChild(details);
      const state = select(["received","reviewing","quoted","accepted","declined","completed"].map((s)=>({value:s,label:s})),request.status,"Request " + request.title + " status");
      const stateCell = el("td"); stateCell.appendChild(state); row.appendChild(stateCell);
      const actions = el("td"), save = el("button","Update","admin-small-button"); save.type="button";
      save.addEventListener("click",async()=>{save.disabled=true;try{await adminRequest("/custom-requests/"+request.id,{method:"PATCH",body:{status:state.value}});setMessage(status,"Updated custom request.");await Promise.all([loadRequests(),loadSummary()]);}catch(error){setMessage(status,error.message,true);}finally{save.disabled=false;}});
      actions.appendChild(save);row.appendChild(actions);t.tbody.appendChild(row);
    });
    $("#admin-requests-table").replaceChildren(requests.length ? t.wrap : el("p","No custom requests yet.","admin-empty"));
  }

  async function loadCustomers() {
    const { customers } = await adminRequest("/customers");
    const t = table(["Customer","Joined","Orders","Order value"]);
    customers.forEach((customer)=>{const row=el("tr"),who=el("td");who.append(el("strong",customer.name),el("small",customer.email));row.appendChild(who);cell(row,date(customer.created_at));cell(row,customer.order_count);cell(row,money(customer.order_total));t.tbody.appendChild(row);});
    $("#admin-customers-table").replaceChildren(customers.length ? t.wrap : el("p","No customers yet.","admin-empty"));
  }

  const loaders = {products:loadProducts,orders:loadOrders,requests:loadRequests,customers:loadCustomers};
  async function loadPanel(name) {
    try { await loaders[name](); }
    catch (error) { setMessage(status,error.message,true); }
  }
  async function refreshAll() {
    setMessage(status,"Refreshing store data…");
    try { await loadSummary(); await loadPanel("products"); setMessage(status,"Store data is up to date."); }
    catch (error) { setMessage(status,error.message,true); }
  }

  $("#admin-login-form").addEventListener("submit",async(event)=>{
    event.preventDefault();
    const button=$("button[type='submit']",event.currentTarget), message=$("#admin-login-message");
    button.disabled=true;setMessage(message,"Checking administrator credentials…");
    try {
      const result=await api.request("/api/admin/login",{method:"POST",body:{email:$("#admin-email").value.trim(),password:$("#admin-password").value}});
      localStorage.setItem("quirkzyToken",result.token);localStorage.setItem("quirkzyUser",JSON.stringify(result.user));
      showDashboard(result.user);await refreshAll();
    } catch(error) { setMessage(message,error.message,true); }
    finally { button.disabled=false; }
  });

  logoutButton.addEventListener("click",()=>{api.logout();showLogin();$("#admin-password").value="";});
  $$(".admin-tab").forEach((button)=>button.addEventListener("click",async()=>{
    $$(".admin-tab").forEach((tab)=>tab.classList.toggle("active",tab===button));
    $$(".admin-panel").forEach((panel)=>panel.hidden=panel.id!=="panel-"+button.dataset.panel);
    await loadPanel(button.dataset.panel);
  }));
  $$("[data-refresh]").forEach((button)=>button.addEventListener("click",()=>loadPanel(button.dataset.refresh)));

  $("#admin-product-form").addEventListener("submit",async(event)=>{
    event.preventDefault();
    const form=event.currentTarget, button=$("button[type='submit']",form), message=$("#admin-product-message");
    const data=Object.fromEntries(new FormData(form).entries());data.price=Number(data.price);data.stock=Number(data.stock);
    button.disabled=true;
    try { await adminRequest("/products",{method:"POST",body:data});form.reset();setMessage(message,"Product added to the catalogue.");await Promise.all([loadProducts(),loadSummary()]); }
    catch(error) { setMessage(message,error.message,true); }
    finally { button.disabled=false; }
  });

  (async()=>{
    const user=api.user;
    if(user && api.isSignedIn()) {
      try { const current=await api.refreshSession(); if(current?.role==="admin"){showDashboard(current);await refreshAll();return;} }
      catch {}
    }
    showLogin();
  })();
})();
