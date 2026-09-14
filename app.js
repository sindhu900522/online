/* =========================================================================
   app.js - UI behavior (non-analytics). Every meaningful interaction here
   calls track() from analytics.js so it lands in adobeDataLayer + alloy.
   ========================================================================= */

var PRODUCTS = [
  { id: "sku-101", name: "Aero Runner Sneaker", cat: "shoes", price: 79.99, oldPrice: 99.99, icon: "\uD83D\uDC5F", sale: true },
  { id: "sku-102", name: "Classic Denim Jacket", cat: "outerwear", price: 64.0, icon: "\uD83E\uDDE5" },
  { id: "sku-103", name: "Everyday Tote Bag", cat: "accessories", price: 34.5, icon: "\uD83D\uDC5C" },
  { id: "sku-104", name: "Trail Hiking Boots", cat: "shoes", price: 110.0, icon: "\uD83E\uDD7E" },
  { id: "sku-105", name: "Minimal Analog Watch", cat: "accessories", price: 89.0, oldPrice: 120.0, icon: "\u231A", sale: true },
  { id: "sku-106", name: "Rain Shell Windbreaker", cat: "outerwear", price: 72.0, icon: "\uD83E\uDDE5" },
  { id: "sku-107", name: "Studio Yoga Mat", cat: "fitness", price: 28.0, icon: "\uD83E\uDDD8" },
  { id: "sku-108", name: "Performance Cap", cat: "accessories", price: 19.99, icon: "\uD83E\uDDE2" },
  { id: "sku-109", name: "Trail Running Shorts", cat: "fitness", price: 32.0, icon: "\uD83C\uDFC3" }
];

function money(n) { return "$" + n.toFixed(2); }

function showToast(msg) {
  var toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(function () { toast.classList.remove("show"); }, 2200);
}

/* -------------------- Home page: product grid + filters -------------------- */
function renderProductGrid(filter) {
  var grid = document.getElementById("productGrid");
  if (!grid) return;
  var list = filter && filter !== "all" ? PRODUCTS.filter(function (p) { return p.cat === filter; }) : PRODUCTS;

  grid.innerHTML = list.map(function (p) {
    return (
      '<div class="product-card" data-id="' + p.id + '">' +
        '<div class="product-thumb">' + (p.sale ? '<span class="badge-sale">SALE</span>' : '') + p.icon + '</div>' +
        '<div class="product-info">' +
          '<div class="cat">' + p.cat + '</div>' +
          '<h3>' + p.name + '</h3>' +
          '<div class="price-row">' +
            '<span class="price">' + money(p.price) + '</span>' +
            (p.oldPrice ? '<span class="price-old">' + money(p.oldPrice) + '</span>' : '') +
          '</div>' +
          '<div class="card-actions">' +
            '<a class="btn btn-outline btn-sm" href="product.html?id=' + p.id + '" data-quick-nav="' + p.id + '">View</a>' +
            '<button class="btn btn-primary btn-sm" data-quick-add="' + p.id + '">Add to Cart</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }).join("");

  // Wire product-card clicks (impression -> click tracking)
  grid.querySelectorAll(".product-card").forEach(function (card) {
    card.addEventListener("click", function (e) {
      var id = card.getAttribute("data-id");
      var product = PRODUCTS.find(function (p) { return p.id === id; });
      if (e.target.matches("[data-quick-add]")) {
        e.preventDefault();
        Cart.add({ id: product.id, name: product.name, price: product.price, qty: 1, size: "N/A" });
        showToast(product.name + " added to cart");
      } else if (e.target.matches("[data-quick-nav]")) {
        track("product click", { productId: product.id, productName: product.name, position: "grid" });
      }
    });
  });
}

function initFilters() {
  var chips = document.querySelectorAll(".filter-chip");
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      chips.forEach(function (c) { c.classList.remove("active"); });
      chip.classList.add("active");
      var cat = chip.getAttribute("data-filter");
      renderProductGrid(cat);
      track("filter apply", { category: cat });
    });
  });
}

/* -------------------- Quick view modal (home page) -------------------- */
function initQuickViewModal() {
  var overlay = document.getElementById("quickViewModal");
  if (!overlay) return;
  document.body.addEventListener("click", function (e) {
    if (e.target.matches("[data-quickview]")) {
      var id = e.target.getAttribute("data-quickview");
      var p = PRODUCTS.find(function (x) { return x.id === id; });
      document.getElementById("qvTitle").textContent = p.name;
      document.getElementById("qvPrice").textContent = money(p.price);
      document.getElementById("qvIcon").textContent = p.icon;
      overlay.classList.add("open");
      track("quick view open", { productId: p.id, productName: p.name });
    }
  });
  overlay.querySelector(".modal-close").addEventListener("click", function () {
    overlay.classList.remove("open");
    track("modal close", { modal: "quick-view" });
  });
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) overlay.classList.remove("open");
  });
}

/* -------------------- Newsletter form -------------------- */
function initNewsletterForm() {
  var form = document.getElementById("newsletterForm");
  if (!form) return;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = form.querySelector("input[type=email]").value;
    track("newsletter signup", { email_domain: email.split("@")[1] || "unknown" });
    showToast("Subscribed! Check your inbox.");
    form.reset();
  });
}

/* -------------------- Search -------------------- */
function initSearch() {
  var input = document.querySelector("[data-search-input]");
  if (!input) return;
  var lastValue = "";
  input.addEventListener("keyup", debounce(function () {
    if (input.value && input.value !== lastValue) {
      lastValue = input.value;
      track("site search", { term: input.value });
    }
  }, 500));
}

/* -------------------- Generic CTA click tracking (data-cta attr) -------------------- */
function initCtaTracking() {
  document.body.addEventListener("click", function (e) {
    var el = e.target.closest("[data-cta]");
    if (el) {
      track("cta click", {
        ctaName: el.getAttribute("data-cta"),
        location: el.getAttribute("data-cta-location") || "unspecified"
      });
    }
  });
}

/* -------------------- Nav link tracking -------------------- */
function initNavTracking() {
  document.querySelectorAll("nav.main-nav a").forEach(function (link) {
    link.addEventListener("click", function () {
      track("nav click", { label: link.textContent.trim() });
    });
  });
}

document.addEventListener("DOMContentLoaded", function () {
  renderProductGrid("all");
  initFilters();
  initQuickViewModal();
  initNewsletterForm();
  initSearch();
  initCtaTracking();
  initNavTracking();
});
