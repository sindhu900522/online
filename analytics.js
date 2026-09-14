/* =========================================================================
   analytics.js
   Central tracking layer for the demo store.
   Built for: Adobe Experience Platform Web SDK (alloy.js) + adobeDataLayer
   Wire this up in Adobe Launch by:
     1. Adding a Data Element / Rule that listens on "adobeDataLayer:change"
        (via the Data Layer extension) OR
     2. Adding Rules with a Custom Code / Core "Direct Call" trigger keyed to
        each event name pushed below (e.g. "cta click", "product view",
        "add to cart", "cart update", "checkout start", "purchase").
     3. Mapping the eventInfo.data fields to XDM fields in your Rule's
        "Adobe Experience Platform - Send Event" action.
   ========================================================================= */

// 1. Initialize the data layer array BEFORE the Launch embed script loads.
//    (In production this line lives inline in <head>, before the Launch tag.)
window.adobeDataLayer = window.adobeDataLayer || [];

/**
 * track()
 * Single entry point every interactive element on the site calls.
 * - Pushes a structured event to adobeDataLayer (for the Data Layer / Rule Engine)
 * - Also fires alloy("sendEvent", ...) directly, so the demo works even
 *   before Launch rules are configured.
 *
 * @param {string} eventName  e.g. "add to cart", "cta click"
 * @param {object} data       arbitrary event payload (product, page, form, etc.)
 */
function track(eventName, data) {
  data = data || {};

  var payload = {
    event: eventName,
    eventInfo: {
      timestamp: new Date().toISOString(),
      page: document.title,
      url: window.location.pathname,
      data: data
    }
  };

  // ---- 1. Push to adobeDataLayer (Launch "Data Layer" extension picks this up) ----
  window.adobeDataLayer.push(payload);

  // ---- 2. Direct Web SDK call (works standalone, no Launch property needed) ----
  if (typeof alloy === "function") {
    alloy("sendEvent", {
      xdm: {
        eventType: eventName,
        web: {
          webPageDetails: {
            name: document.title,
            URL: window.location.href
          }
        },
        _demoStore: data // custom XDM field group placeholder - map in your schema
      }
    });
  }

  // ---- 3. Console trace for debugging while building Launch rules ----
  console.log("%c[track]", "color:#e1251b;font-weight:bold;", eventName, data);
}

/* ---------------------------------------------------------------------
   Automatic tracking that fires on every page without extra wiring:
   page view, scroll depth (25/50/75/100%), and time-on-page milestones.
   --------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", function () {
  track("page view", {
    pageName: document.title,
    pageType: document.body.getAttribute("data-page-type") || "unknown"
  });

  // Scroll depth tracking
  var firedThresholds = {};
  var thresholds = [25, 50, 75, 100];
  window.addEventListener(
    "scroll",
    debounce(function () {
      var scrollTop = window.scrollY || document.documentElement.scrollTop;
      var docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      var pct = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 100;

      thresholds.forEach(function (t) {
        if (pct >= t && !firedThresholds[t]) {
          firedThresholds[t] = true;
          track("scroll depth", { percent: t });
        }
      });
    }, 200)
  );

  // Time on page milestones (10s, 30s, 60s)
  [10, 30, 60].forEach(function (seconds) {
    setTimeout(function () {
      track("time on page", { seconds: seconds });
    }, seconds * 1000);
  });

  // Exit intent (mouse leaves top of viewport) - common Target trigger
  document.addEventListener("mouseout", function (e) {
    if (!e.relatedTarget && e.clientY < 10) {
      track("exit intent", {});
    }
  });
});

/* Utility: debounce for scroll handler */
function debounce(fn, wait) {
  var t;
  return function () {
    clearTimeout(t);
    var args = arguments;
    t = setTimeout(function () {
      fn.apply(null, args);
    }, wait);
  };
}

/* ---------------------------------------------------------------------
   Simple cart state shared across pages via localStorage, so cart.html
   reflects what was added on index.html / product.html.
   --------------------------------------------------------------------- */
var Cart = {
  KEY: "demoStoreCart",

  get: function () {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || [];
    } catch (e) {
      return [];
    }
  },

  save: function (items) {
    localStorage.setItem(this.KEY, JSON.stringify(items));
    this.updateBadge();
  },

  add: function (product) {
    var items = this.get();
    var existing = items.find(function (i) {
      return i.id === product.id && i.size === product.size;
    });
    if (existing) {
      existing.qty += product.qty;
    } else {
      items.push(product);
    }
    this.save(items);

    track("add to cart", {
      productId: product.id,
      productName: product.name,
      price: product.price,
      qty: product.qty,
      size: product.size,
      cartTotalItems: items.reduce(function (sum, i) {
        return sum + i.qty;
      }, 0)
    });
  },

  updateQty: function (id, size, qty) {
    var items = this.get();
    items.forEach(function (i) {
      if (i.id === id && i.size === size) i.qty = qty;
    });
    items = items.filter(function (i) {
      return i.qty > 0;
    });
    this.save(items);
    track("cart update", { productId: id, size: size, newQty: qty });
  },

  remove: function (id, size) {
    var items = this.get().filter(function (i) {
      return !(i.id === id && i.size === size);
    });
    this.save(items);
    track("remove from cart", { productId: id, size: size });
  },

  clear: function () {
    localStorage.removeItem(this.KEY);
    this.updateBadge();
  },

  total: function () {
    return this.get().reduce(function (sum, i) {
      return sum + i.price * i.qty;
    }, 0);
  },

  updateBadge: function () {
    var badge = document.querySelector("[data-cart-count]");
    if (!badge) return;
    var count = this.get().reduce(function (sum, i) {
      return sum + i.qty;
    }, 0);
    badge.textContent = count;
  }
};

document.addEventListener("DOMContentLoaded", function () {
  Cart.updateBadge();
});
