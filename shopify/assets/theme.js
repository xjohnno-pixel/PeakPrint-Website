/*
  Peak Framed — theme.js
  Shared chrome JS used across every template.

  Section-specific JS (product order form, frame/tile state machine,
  Cloudinary uploader) lives in its own section file so it only loads
  on the page that needs it.

  All initialisers are defensive — they check the relevant elements
  exist before binding, so a page without (e.g.) a lightbox doesn't
  throw.
*/

(function () {
  'use strict';

  /* ------------------------------------------------------------------
     Fade-up on scroll
     In Shopify's theme editor (designMode), force everything visible
     immediately so merchants see content while editing.
     ------------------------------------------------------------------ */
  var inDesignMode = !!(window.Shopify && window.Shopify.designMode);

  function initFadeUp(scope) {
    var root = scope || document;
    var els = root.querySelectorAll('.fade-up');
    if (!els.length) return;
    if (inDesignMode || !('IntersectionObserver' in window)) {
      // Fallback / editor: show everything immediately.
      els.forEach(function (el) { el.classList.add('visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -50px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------------
     Mobile menu toggle
     ------------------------------------------------------------------ */
  function initMobileMenu() {
    var btn = document.querySelector('[data-mobile-menu-toggle]');
    var nav = document.getElementById('mobile-nav');
    if (!btn || !nav) return;

    btn.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('open');
      btn.classList.toggle('active', isOpen);
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Close on link click
    nav.querySelectorAll('[data-mobile-menu-link]').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
        btn.classList.remove('active');
        btn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ------------------------------------------------------------------
     Vertical nav scroll spy (homepage only)
     ------------------------------------------------------------------ */
  function initScrollSpy() {
    var navLinks = document.querySelectorAll('.vertical-nav a');
    if (!navLinks.length || !('IntersectionObserver' in window)) return;
    var sections = document.querySelectorAll('section[id]');
    if (!sections.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (l) { l.classList.remove('active'); });
        var active = document.querySelector('.vertical-nav a[data-section="' + entry.target.id + '"]');
        if (active) active.classList.add('active');
      });
    }, { threshold: 0.3, rootMargin: '-10% 0px -10% 0px' });

    sections.forEach(function (s) { io.observe(s); });
  }

  /* ------------------------------------------------------------------
     Gallery + add-on lightbox (single shared overlay, dual-mode)
     ------------------------------------------------------------------ */
  function initLightbox() {
    var lightbox = document.getElementById('galleryLightbox');
    var img      = document.getElementById('lightboxImg');
    if (!lightbox || !img) return;

    var items = document.querySelectorAll('.gallery-item');
    var srcs  = Array.prototype.map.call(items, function (i) { return i.querySelector('img').src; });
    var idx   = 0;

    function openAt(i) {
      idx = i;
      img.src = srcs[idx];
      lightbox.classList.remove('single');
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
    function openSingle(src, alt) {
      img.src = src;
      if (alt) img.alt = alt;
      lightbox.classList.add('single');
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      lightbox.classList.remove('active');
      lightbox.classList.remove('single');
      document.body.style.overflow = '';
    }
    function prev() { idx = (idx - 1 + srcs.length) % srcs.length; img.src = srcs[idx]; }
    function next() { idx = (idx + 1) % srcs.length; img.src = srcs[idx]; }

    items.forEach(function (item, i) {
      item.setAttribute('tabindex', '0');
      item.addEventListener('click', function () { openAt(i); });
      item.addEventListener('keydown', function (e) { if (e.key === 'Enter') openAt(i); });
    });

    var closeBtn = lightbox.querySelector('.lightbox-close');
    var prevBtn  = lightbox.querySelector('.lightbox-prev');
    var nextBtn  = lightbox.querySelector('.lightbox-next');
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (prevBtn)  prevBtn.addEventListener('click', prev);
    if (nextBtn)  nextBtn.addEventListener('click', next);

    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) close();
    });

    document.addEventListener('keydown', function (e) {
      if (!lightbox.classList.contains('active')) return;
      if (e.key === 'Escape')     close();
      if (e.key === 'ArrowLeft')  prev();
      if (e.key === 'ArrowRight') next();
    });

    // Touch swipe
    var sx = 0, sy = 0, swiping = false;
    lightbox.addEventListener('touchstart', function (e) {
      sx = e.changedTouches[0].screenX;
      sy = e.changedTouches[0].screenY;
      swiping = true;
    }, { passive: true });
    lightbox.addEventListener('touchmove', function (e) {
      if (!swiping) return;
      var dx = Math.abs(e.changedTouches[0].screenX - sx);
      var dy = Math.abs(e.changedTouches[0].screenY - sy);
      if (dx > dy && dx > 10) e.preventDefault();
    }, { passive: false });
    lightbox.addEventListener('touchend', function (e) {
      if (!swiping) return;
      swiping = false;
      var dist = e.changedTouches[0].screenX - sx;
      if (Math.abs(dist) < 50) return;
      if (dist < 0) next(); else prev();
    }, { passive: true });

    // Public API for add-on info icons (called from product section)
    window.PeakFramedLightbox = { openSingle: openSingle, close: close };
  }

  /* ------------------------------------------------------------------
     Product order section
     Frame×Tile state, add-ons, collapsible toggle, route tabs,
     Cloudinary direct uploads, AJAX add-to-cart.
     ------------------------------------------------------------------ */
  function initProductOrder() {
    var section = document.getElementById('get-started');
    if (!section) return;
    var cfgEl = section.querySelector('[data-pf-config]');
    if (!cfgEl) return;
    var cfg;
    try { cfg = JSON.parse(cfgEl.textContent); } catch (e) { return; }

    var form = section.querySelector('[data-product-form]');
    if (!form) return;

    var state = { frame: 'black', tile: 'black', addon: 'none' };

    /* ----- Collapsible order form toggle ----- */
    var toggle = section.querySelector('[data-order-toggle]');
    var collapse = section.querySelector('#orderCollapse');
    var toggleLabel = section.querySelector('[data-order-toggle-label]');
    if (toggle && collapse) {
      toggle.addEventListener('click', function () {
        var isOpen = collapse.classList.toggle('open');
        toggle.classList.toggle('open', isOpen);
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        if (toggleLabel) toggleLabel.textContent = isOpen ? 'Hide Order Form' : 'Start Your Order';
      });
    }

    /* ----- Frame × Tile state ----- */
    var images = section.querySelectorAll('.product-image-wrap img');
    var variantInput = section.querySelector('[data-variant-id]');
    var propFrame = section.querySelector('[data-prop-frame]');
    var propTile  = section.querySelector('[data-prop-tile]');

    function applyVariantState() {
      var combo = state.frame + '-' + state.tile;
      images.forEach(function (img) {
        img.classList.toggle('active', img.dataset.combo === combo);
      });
      var vid = cfg.variants && cfg.variants[combo];
      if (vid && variantInput) variantInput.value = vid;
      if (propFrame) propFrame.value = state.frame === 'black' ? 'Black Frame' : 'White Frame';
      if (propTile)  propTile.value  = state.tile  === 'black' ? 'Black tile · White trail' : 'White tile · Black trail';
    }

    section.querySelectorAll('.frame-btn[data-frame]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.frame = btn.dataset.frame;
        section.querySelectorAll('.frame-btn[data-frame]').forEach(function (b) { b.classList.toggle('active', b === btn); });
        applyVariantState();
      });
    });
    section.querySelectorAll('.frame-btn[data-tile]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.tile = btn.dataset.tile;
        section.querySelectorAll('.frame-btn[data-tile]').forEach(function (b) { b.classList.toggle('active', b === btn); });
        applyVariantState();
      });
    });
    applyVariantState();

    /* ----- Add-on selector ----- */
    var submitBtn = section.querySelector('[data-order-submit]');
    var propAddon = section.querySelector('[data-prop-addon]');

    function applyAddonState() {
      var addonCfg = cfg.addons && cfg.addons[state.addon];
      var extra = addonCfg ? addonCfg.extra : 0;
      // Only reflect extra in displayed total if add-on charging is enabled
      var total = cfg.basePrice + (cfg.addons && cfg.addons.enabled ? extra : 0);
      if (submitBtn) submitBtn.textContent = 'Order Now — $' + total + ' AUD';
      if (propAddon) {
        if (state.addon === 'none') {
          propAddon.value = 'Frame only';
        } else if (addonCfg) {
          propAddon.value = addonCfg.label + (cfg.addons.enabled ? '' : ' (pricing to be confirmed)');
        }
      }
    }

    section.querySelectorAll('.addon-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        // Info icon click shouldn't trigger selection
        if (e.target.classList.contains('addon-info')) return;
        state.addon = btn.dataset.addon;
        section.querySelectorAll('.addon-btn').forEach(function (b) { b.classList.toggle('active', b === btn); });
        applyAddonState();
      });
    });

    // Wire up add-on info icons (open photo in lightbox)
    section.querySelectorAll('.addon-info').forEach(function (info) {
      info.addEventListener('click', function (e) {
        e.stopPropagation();
        var src = info.dataset.addonInfo;
        var alt = info.dataset.addonAlt;
        if (src && window.PeakFramedLightbox) window.PeakFramedLightbox.openSingle(src, alt);
      });
    });

    applyAddonState();

    /* ----- Route tab switching ----- */
    section.querySelectorAll('[data-route-tab]').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var which = tab.dataset.routeTab;
        section.querySelectorAll('[data-route-tab]').forEach(function (t) {
          t.classList.toggle('active', t.dataset.routeTab === which);
        });
        section.querySelectorAll('[data-route-tab-content]').forEach(function (c) {
          c.style.display = c.dataset.routeTabContent === which ? 'block' : 'none';
        });
      });
    });

    /* ----- File upload zones — Cloudinary direct upload ----- */
    var propGpsFile     = section.querySelector('[data-prop-gps-file]');
    var propRouteSource = section.querySelector('[data-prop-route-source]');

    function isExtAllowed(name) {
      var ext = (name.split('.').pop() || '').toLowerCase();
      return cfg.cloudinary.allowedExt.indexOf(ext) !== -1;
    }

    function uploadToCloudinary(file, zoneEl, displayEl, kind) {
      if (!cfg.cloudinary.cloudName || !cfg.cloudinary.uploadPreset) {
        displayEl.textContent = '✗ Upload not configured — contact us with your file at hello@peakframed.com.au';
        return;
      }
      if (!isExtAllowed(file.name)) {
        displayEl.textContent = '✗ ' + file.name + ' — file type not allowed';
        zoneEl.classList.remove('has-file');
        return;
      }
      if (file.size > cfg.cloudinary.maxBytes) {
        displayEl.textContent = '✗ ' + file.name + ' — over 25 MB limit';
        zoneEl.classList.remove('has-file');
        return;
      }
      displayEl.textContent = '⏳ Uploading ' + file.name + '…';
      zoneEl.classList.add('drag-over');

      var fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', cfg.cloudinary.uploadPreset);
      fd.append('folder', 'peakframed/orders');

      // GPX/KML/FIT/TCX = raw; images = image
      var ext = (file.name.split('.').pop() || '').toLowerCase();
      var resource = ['gpx','kml','fit','tcx'].indexOf(ext) !== -1 ? 'raw' : 'image';
      var url = 'https://api.cloudinary.com/v1_1/' + cfg.cloudinary.cloudName + '/' + resource + '/upload';

      fetch(url, { method: 'POST', body: fd })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          zoneEl.classList.remove('drag-over');
          if (data && data.secure_url) {
            displayEl.textContent = '✓ ' + file.name;
            zoneEl.classList.add('has-file');
            if (propGpsFile)     propGpsFile.value = data.secure_url;
            if (propRouteSource) propRouteSource.value = kind === 'file' ? 'GPS file upload' : 'Screenshot upload';
          } else {
            displayEl.textContent = '✗ Upload failed — try again or email hello@peakframed.com.au';
            zoneEl.classList.remove('has-file');
          }
        })
        .catch(function () {
          zoneEl.classList.remove('drag-over');
          displayEl.textContent = '✗ Upload failed — check your connection and retry';
          zoneEl.classList.remove('has-file');
        });
    }

    function bindFileZone(zoneEl) {
      if (!zoneEl) return;
      var kind = zoneEl.dataset.fileZone;
      var input = zoneEl.querySelector('input[type="file"]');
      var display = section.querySelector('[data-file-display="' + kind + '"]');
      if (!input || !display) return;

      zoneEl.addEventListener('click', function () { input.click(); });
      input.addEventListener('change', function () {
        if (input.files.length) uploadToCloudinary(input.files[0], zoneEl, display, kind);
      });
      zoneEl.addEventListener('dragover', function (e) {
        e.preventDefault();
        zoneEl.classList.add('drag-over');
      });
      zoneEl.addEventListener('dragleave', function () { zoneEl.classList.remove('drag-over'); });
      zoneEl.addEventListener('drop', function (e) {
        e.preventDefault();
        zoneEl.classList.remove('drag-over');
        if (e.dataTransfer.files.length) {
          input.files = e.dataTransfer.files;
          uploadToCloudinary(e.dataTransfer.files[0], zoneEl, display, kind);
        }
      });
    }
    section.querySelectorAll('[data-file-zone]').forEach(bindFileZone);

    /* ----- Accordion ----- */
    section.querySelectorAll('[data-accordion-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        btn.parentElement.classList.toggle('open');
      });
    });

    /* ----- AJAX add-to-cart ----- */
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // Require either a route link OR a successful Cloudinary upload
      var routeLink = section.querySelector('#routeLink');
      var hasLink = routeLink && routeLink.value.trim();
      var hasFile = propGpsFile && propGpsFile.value;
      if (!hasLink && !hasFile) {
        alert('Please share your route — paste a link, upload a GPX/KML file, or attach a screenshot.');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.textContent;
        submitBtn.textContent = 'Adding to cart…';
      }

      // Build line items: framed map + optional add-on
      var fd = new FormData(form);
      var properties = {};
      fd.forEach(function (val, key) {
        var m = key.match(/^properties\[(.+)\]$/);
        if (m && val) properties[m[1]] = val;
      });

      var items = [{
        id: parseInt(fd.get('id'), 10),
        quantity: 1,
        properties: properties
      }];

      if (cfg.addons && cfg.addons.enabled && state.addon !== 'none') {
        var addonCfg = cfg.addons[state.addon];
        if (addonCfg && addonCfg.variantId) {
          items.push({ id: addonCfg.variantId, quantity: 1 });
        }
      }

      // Clear any prior items first so each Order Now is a clean,
      // single-order add. Then add the new line items. Then checkout.
      fetch('/cart/clear.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
      })
        .then(function () {
          return fetch('/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ items: items })
          });
        })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
        .then(function (res) {
          if (res.ok) {
            // Direct-to-checkout: skip the cart page for a seamless flow.
            // Cart template still exists at /cart as a fallback for anyone
            // who navigates there directly (back button, shared URL, etc.).
            window.location.href = '/checkout';
          } else {
            var msg = (res.data && res.data.description) || 'Could not add to cart. Please try again.';
            alert(msg);
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = submitBtn.dataset.originalText;
            }
          }
        })
        .catch(function () {
          alert('Network error — please try again. If this keeps happening, email hello@peakframed.com.au and we\'ll take your order manually.');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = submitBtn.dataset.originalText;
          }
        });
    });
  }

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  function boot() {
    initFadeUp();
    initMobileMenu();
    initScrollSpy();
    initLightbox();
    initProductOrder();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* ------------------------------------------------------------------
     Shopify theme editor — re-init sections when they reload.
     When a merchant edits a section in the customiser, Shopify replaces
     that section's HTML in place. Without this, .fade-up elements in the
     new HTML stay at opacity 0 because the original observer was
     watching the (now detached) old nodes.
     ------------------------------------------------------------------ */
  if (inDesignMode) {
    document.addEventListener('shopify:section:load', function (e) {
      initFadeUp(e.target);
      initMobileMenu();
      initProductOrder();
    });
    document.addEventListener('shopify:section:reorder', function () {
      initFadeUp();
    });
  }
})();
