/* =====================================================================
   DUKA ZOOM: PRODUCT DETAILS PAGE (specifications)
   Add ONE line just before </body> in your store file:
       <script src="product-details.js"></script>
   Needs the Stock tab "Specs" column (F) and the one-line Code.gs change.
   Works with the store's existing PRODUCTS, basket, reviews and stock data.
   ===================================================================== */
(function () {
  'use strict';
  var specsMap = new Map();
  var current = null;

  // ---------- styles ----------
  var css = '' +
    '.pcard .swatch,.pcard h3{cursor:pointer}' +
    '.pcard h3:hover{text-decoration:underline}' +
    '#pd-overlay{z-index:250}' +
    '.pd-modal{max-width:640px;max-height:92vh;overflow-y:auto;position:relative;padding:0}' +
    '.pd-close{position:sticky;top:0;float:right;margin:10px 10px 0 0;z-index:2;background:var(--card);border:1px solid var(--line);border-radius:50%;width:34px;height:34px;font-size:16px;color:var(--ink-soft)}' +
    '.pd-img{height:260px;background:var(--bg);border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:90px;overflow:hidden}' +
    '.pd-img img{width:100%;height:100%;object-fit:contain;padding:12px}' +
    '.pd-body{padding:20px 24px 26px}' +
    '.pd-title{font-family:"Space Grotesk",sans-serif;font-size:22px;line-height:1.25;margin-bottom:6px}' +
    '.pd-price{margin:10px 0 4px;align-items:center}' +
    '.pd-price .price{font-size:24px}' +
    '.pd-tag{display:inline-block;font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;color:#fff;margin-left:4px}' +
    '.pd-tag.out{background:var(--ink)}.pd-tag.low{background:var(--coral)}.pd-tag.off{background:var(--coral)}' +
    '.pd-add{margin:14px 0 4px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}' +
    '.pd-add .add-btn{width:auto;min-width:180px;padding:11px 22px;font-size:14px}' +
    '.pd-add .stepper{min-width:150px}' +
    '.pd-basket{background:none;border:none;color:var(--teal-dark);font-weight:600;text-decoration:underline;font-size:13px}' +
    '.pd-desc{margin:16px 0 0;font-size:14px;line-height:1.6;white-space:pre-line}' +
    '.pd-spec-title{font-family:"Space Grotesk",sans-serif;font-size:19px;margin:22px 0 4px;padding-top:16px;border-top:1px solid var(--line)}' +
    '.pd-sh{font-size:15px;font-weight:700;margin:14px 0 4px}' +
    '.pd-sl{margin:0 0 4px 20px;padding:0;font-size:14px;line-height:1.7}' +
    '.pd-sl li{margin:0}' +
    '.pd-empty{font-size:13px;color:var(--ink-soft);margin-top:18px}' +
    '@media (max-width:600px){.pd-img{height:200px}.pd-body{padding:16px 18px 22px}}';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ---------- modal shell ----------
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'pd-overlay';
  overlay.innerHTML = '<div class="modal pd-modal" role="dialog" aria-modal="true" aria-label="Product details">' +
    '<button type="button" class="pd-close" aria-label="Close">✕</button><div id="pd-content"></div></div>';
  document.body.appendChild(overlay);
  var content = overlay.querySelector('#pd-content');

  function closeModal() { overlay.classList.remove('open'); current = null; }
  overlay.querySelector('.pd-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal(); });

  // ---------- specs text -> headings and bullets ----------
  // A line starting with # is a heading. Other lines become bullets.
  // "Label: value" lines get a bold label.
  function specsHtml(text) {
    var lines = String(text || '').split('\n');
    var html = '', open = false;
    lines.forEach(function (raw) {
      var l = raw.trim();
      if (!l) return;
      if (l.charAt(0) === '#') {
        if (open) { html += '</ul>'; open = false; }
        html += '<h4 class="pd-sh">' + escHtml(l.replace(/^#+\s*/, '')) + '</h4>';
        return;
      }
      if (!open) { html += '<ul class="pd-sl">'; open = true; }
      l = l.replace(/^[-•*]\s*/, '');
      var i = l.indexOf(':');
      if (i > 0 && i < 40) html += '<li><b>' + escHtml(l.slice(0, i)) + ':</b> ' + escHtml(l.slice(i + 1).trim()) + '</li>';
      else html += '<li>' + escHtml(l) + '</li>';
    });
    if (open) html += '</ul>';
    return html;
  }

  // ---------- render ----------
  function render() {
    var p = PRODUCTS.find(function (x) { return x.id === current; });
    if (!p) { closeModal(); return; }
    var k = String(p.name).toLowerCase();
    var out = outOfStockNames.has(k);
    var low = lowStockMap.get(k);
    var qty = basket[p.id] || 0;
    var desc = descriptionsMap.get(k) || '';
    var specs = specsMap.get(k) || '';
    var disc = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : null;

    var tag = out ? '<span class="pd-tag out">Out of stock</span>'
      : (low ? '<span class="pd-tag low">Only ' + low + ' left</span>'
      : (disc ? '<span class="pd-tag off">' + disc + '% off</span>' : ''));

    var addArea;
    if (out) addArea = '<button class="add-btn" disabled>Out of stock</button>';
    else if (qty === 0) addArea = '<button class="add-btn" data-pd-add>+ Add to basket</button>';
    else addArea = '<div class="stepper"><button data-pd-dec aria-label="Remove one">−</button><span>' + qty +
      '</span><button data-pd-inc aria-label="Add one">+</button></div>' +
      '<button type="button" class="pd-basket" data-pd-basket>View basket</button>';

    content.innerHTML =
      '<div class="pd-img">' + (p.image ? '<img src="' + p.image + '" alt="' + escHtml(p.name) + '">' : (p.icon || '')) + '</div>' +
      '<div class="pd-body">' +
        '<h2 class="pd-title">' + escHtml(p.name) + '</h2>' +
        renderRatingRow(p.name) +
        '<div class="price-row pd-price"><span class="price">' + fmt(p.price) + '</span>' +
          (p.oldPrice ? '<span class="old-price">' + fmt(p.oldPrice) + '</span>' : '') + tag + '</div>' +
        '<div class="pd-add">' + addArea + '</div>' +
        (desc ? '<p class="pd-desc">' + escHtml(desc) + '</p>' : '') +
        (specs ? '<h3 class="pd-spec-title">Specifications</h3>' + specsHtml(specs)
               : '<p class="pd-empty">Detailed specifications for this product are coming soon.</p>') +
      '</div>';

    var el;
    if ((el = content.querySelector('[data-pd-add]'))) el.addEventListener('click', function () { changeQty(p.id, 1); });
    if ((el = content.querySelector('[data-pd-inc]'))) el.addEventListener('click', function () { changeQty(p.id, 1); });
    if ((el = content.querySelector('[data-pd-dec]'))) el.addEventListener('click', function () { changeQty(p.id, -1); });
    if ((el = content.querySelector('[data-pd-basket]'))) el.addEventListener('click', function () { closeModal(); openDrawer(); });
    content.querySelectorAll('[data-rate]').forEach(function (b) { b.addEventListener('click', function () { openReviewModal(b.dataset.rate); }); });
    content.querySelectorAll('[data-view-reviews]').forEach(function (b) { b.addEventListener('click', function () { openViewReviewsModal(b.dataset.viewReviews); }); });
  }

  function openProduct(id) {
    current = id;
    render();
    overlay.classList.add('open');
    overlay.querySelector('.pd-modal').scrollTop = 0;
    loadSpecs();   // refresh specs so edits in the Sheet show up
  }

  // ---------- specs from the Stock tab ----------
  function loadSpecs() {
    if (typeof SHEET_WEBHOOK_URL === 'undefined' || SHEET_WEBHOOK_URL.indexOf('PASTE_YOUR') > -1) return;
    jsonpRequest(SHEET_WEBHOOK_URL, { action: 'stock' }).then(function (d) {
      if (!d || d.status !== 'ok' || !Array.isArray(d.stock)) return;
      var m = new Map();
      d.stock.forEach(function (r) {
        var s = String(r.specs || '').trim();
        if (s) m.set(String(r.name).toLowerCase(), s);
      });
      specsMap = m;
      if (current) render();
    }).catch(function () { /* the page still works without specs */ });
  }

  // ---------- hook into the store ----------
  var grid = document.getElementById('product-grid');
  grid.addEventListener('click', function (e) {
    var t = e.target.closest('.swatch, h3');
    if (!t) return;
    var card = t.closest('.pcard');
    var h = card && card.querySelector('h3');
    if (!h) return;
    var name = h.textContent.trim().toLowerCase();
    var p = PRODUCTS.find(function (x) { return String(x.name).toLowerCase() === name; });
    if (p) openProduct(p.id);
  });

  // "Read more" on a card now opens the full product page too.
  openDetailsModal = function (id) { openProduct(id); };

  // Keep the open product page in step with basket, stock and review updates.
  var originalRender = renderProducts;
  renderProducts = function () {
    originalRender.apply(this, arguments);
    if (current && overlay.classList.contains('open')) render();
  };

  loadSpecs();
})();
