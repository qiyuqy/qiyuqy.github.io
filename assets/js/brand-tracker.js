/*
 * Brand Voice Tracker
 * --------------------
 * Tracks three voices per brand: Official, Consumer, and AI-generated.
 *
 * DATA SOURCE — going live:
 *   Today this reads a static demo file (DATA_SOURCE.localUrl). To make the
 *   tracker live, stand up an endpoint that returns JSON of the SAME shape as
 *   assets/data/brand-voices.json, then set DATA_SOURCE.mode = 'api' and point
 *   DATA_SOURCE.apiUrl at it. No other code changes are required.
 */
(function () {
  "use strict";

  var DATA_SOURCE = {
    mode: "local", // 'local' (demo file) | 'api' (live endpoint)
    localUrl: "/assets/data/brand-voices.json",
    apiUrl: "https://your-api.example.com/v1/brand-voices" // replace when live
  };

  var VOICE_ORDER = ["official", "consumer", "ai"];
  var VOICE_LABEL = { official: "Official", consumer: "Consumer", ai: "AI" };

  // Default comparison brand (category rival) for the perception profile.
  var RIVALS = {
    nike: "adidas", adidas: "nike",
    apple: "samsung", samsung: "apple",
    tesla: "toyota", toyota: "tesla",
    mcdonalds: "chick-fil-a", "chick-fil-a": "mcdonalds",
    amazon: "costco", costco: "amazon",
    starbucks: "mcdonalds", "coca-cola": "starbucks", netflix: "amazon"
  };

  var state = {
    data: null,
    activeBrand: null,
    compareBrand: null,
    activeVoices: { official: true, consumer: true, ai: true },
    query: ""
  };

  function el(id) { return document.getElementById(id); }

  function dataUrl() {
    return DATA_SOURCE.mode === "api" ? DATA_SOURCE.apiUrl : DATA_SOURCE.localUrl;
  }

  function load() {
    var root = el("bt-root");
    if (!root) return;
    fetch(dataUrl(), { headers: { "Accept": "application/json" } })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        state.data = data;
        state.activeBrand = data.brands && data.brands.length ? data.brands[0].slug : null;
        state.compareBrand = RIVALS[state.activeBrand] || "";
        render();
      })
      .catch(function (err) {
        el("bt-board").innerHTML =
          '<div class="bt-error">Could not load brand data (' +
          escapeHtml(String(err.message || err)) +
          "). If you just switched to a live API, check the endpoint URL and CORS.</div>";
      });
  }

  function filteredBrands() {
    var brands = (state.data && state.data.brands) || [];
    var q = state.query.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter(function (b) {
      return (
        b.name.toLowerCase().indexOf(q) !== -1 ||
        (b.category || "").toLowerCase().indexOf(q) !== -1
      );
    });
  }

  function getBrand(slug) {
    var brands = (state.data && state.data.brands) || [];
    for (var i = 0; i < brands.length; i++) {
      if (brands[i].slug === slug) return brands[i];
    }
    return null;
  }

  function render() {
    if (!state.data) return;
    renderMeta();
    renderOverview();
    renderBrandRail();
    renderFilters();
    renderBoard();
  }

  function selectBrand(slug) {
    state.activeBrand = slug;
    state.compareBrand = RIVALS[slug] === state.activeBrand ? "" : (RIVALS[slug] || "");
    render();
  }

  // Overview: dumbbell chart of voice valence per brand, sorted by the
  // official-consumer spread. Doubles as brand navigation.
  function renderOverview() {
    var box = el("bt-overview");
    if (!box) return;
    var brands = (state.data.brands || []).filter(function (b) { return b.voice_gap; });
    if (!brands.length) { box.innerHTML = ""; return; }

    var rows = brands.map(function (b) {
      var g = b.voice_gap;
      return { b: b, g: g, spread: Math.abs((g.official != null ? g.official : 2) - g.consumer) };
    }).sort(function (a, c) { return c.spread - a.spread; });

    function pos(v) { return ((v + 2) / 4) * 100; }

    var ticks = [-2, -1, 0, 1, 2].map(function (t) {
      return '<span class="bt-ov__tick" style="left:' + pos(t) + '%">' + signed(t).replace("+0", "0").replace("-0", "0") + "</span>";
    }).join("");

    var legend = VOICE_ORDER.map(function (k) {
      return '<span class="bt-ov__leg bt-ov__leg--' + k + '"><span class="bt-dot"></span>' + VOICE_LABEL[k] + "</span>";
    }).join("");

    var body = rows.map(function (r) {
      var g = r.g;
      var active = r.b.slug === state.activeBrand ? " is-active" : "";
      var grid = [-2, -1, 0, 1, 2].map(function (t) {
        return '<i class="bt-ov__grid" style="left:' + pos(t) + '%"></i>';
      }).join("");
      var link = "";
      if (state.activeVoices.official && state.activeVoices.consumer && g.official != null && g.consumer != null) {
        var x1 = Math.min(pos(g.official), pos(g.consumer));
        var x2 = Math.max(pos(g.official), pos(g.consumer));
        link = '<i class="bt-ov__link" style="left:' + x1 + "%;width:" + (x2 - x1) + '%"></i>';
      }
      var dots = VOICE_ORDER.map(function (k) {
        if (!state.activeVoices[k] || g[k] == null) return "";
        return '<i class="bt-ov__pt bt-ov__pt--' + k + '" style="left:' + pos(g[k]) + '%" data-tip="' +
          escapeHtml(r.b.name + " — " + VOICE_LABEL[k] + " voice: " + signed(g[k])) + '"></i>';
      }).join("");
      return (
        '<button class="bt-ov__row' + active + '" data-brand="' + escapeHtml(r.b.slug) + '">' +
        '<span class="bt-ov__label"><span aria-hidden="true">' + escapeHtml(r.b.emoji || "") + "</span> " + escapeHtml(r.b.name) + "</span>" +
        '<span class="bt-ov__plot">' + grid + link + dots + "</span>" +
        '<span class="bt-ov__gapval">' + r.spread + "</span>" +
        "</button>"
      );
    }).join("");

    box.innerHTML =
      '<div class="bt-ov">' +
      '<div class="bt-ov__head"><h3>The voice gap at a glance</h3>' +
      '<span class="bt-ov__hint">valence −2…+2 · sorted by official–consumer gap · click a brand</span>' +
      '<span class="bt-ov__legend">' + legend + "</span></div>" +
      '<div class="bt-ov__axisrow"><span class="bt-ov__label"></span><span class="bt-ov__axis">' + ticks + '</span><span class="bt-ov__gapval bt-ov__gapval--head">gap</span></div>' +
      body +
      "</div>";

    Array.prototype.forEach.call(box.querySelectorAll(".bt-ov__row"), function (btn) {
      btn.addEventListener("click", function () {
        selectBrand(btn.getAttribute("data-brand"));
        var board = el("bt-board");
        var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (board && board.scrollIntoView) board.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      });
    });
  }

  function renderMeta() {
    var meta = state.data.meta || {};
    var badge = el("bt-meta");
    if (!badge) return;
    var live = DATA_SOURCE.mode === "api";
    var label = live ? "Live data" : (meta.is_demo ? "Demo data" : "Curated public data");
    var parts = [];
    parts.push(
      '<span class="bt-pill ' + (live || !meta.is_demo ? "bt-pill--live" : "bt-pill--demo") + '">' +
      label + "</span>"
    );
    if (meta.generated_at) {
      parts.push('<span class="bt-meta-stamp">Updated ' + escapeHtml(meta.generated_at) + "</span>");
    }
    badge.innerHTML = parts.join("");
  }

  function renderBrandRail() {
    var rail = el("bt-rail");
    if (!rail) return;
    var brands = filteredBrands();
    if (!brands.length) {
      rail.innerHTML = '<div class="bt-empty">No brands match "' + escapeHtml(state.query) + '".</div>';
      return;
    }
    // Keep a valid active brand within the filtered set.
    var stillVisible = brands.some(function (b) { return b.slug === state.activeBrand; });
    if (!stillVisible) state.activeBrand = brands[0].slug;

    rail.innerHTML = brands.map(function (b) {
      var active = b.slug === state.activeBrand ? " is-active" : "";
      return (
        '<button class="bt-brand' + active + '" data-brand="' + escapeHtml(b.slug) + '"' +
        ' style="--bt-accent:' + escapeHtml(b.color || "#444") + '">' +
        '<span class="bt-brand__emoji" aria-hidden="true">' + escapeHtml(b.emoji || "•") + "</span>" +
        '<span class="bt-brand__name">' + escapeHtml(b.name) + "</span>" +
        '<span class="bt-brand__cat">' + escapeHtml(b.category || "") + "</span>" +
        "</button>"
      );
    }).join("");

    Array.prototype.forEach.call(rail.querySelectorAll(".bt-brand"), function (btn) {
      btn.addEventListener("click", function () {
        selectBrand(btn.getAttribute("data-brand"));
      });
    });
  }

  function renderFilters() {
    var box = el("bt-voice-filters");
    if (!box) return;
    var types = (state.data.meta && state.data.meta.voice_types) || {};
    box.innerHTML = VOICE_ORDER.map(function (key) {
      var t = types[key] || { label: key };
      var on = state.activeVoices[key] ? " is-on" : "";
      return (
        '<button class="bt-toggle bt-toggle--' + key + on + '" data-voice="' + key + '">' +
        '<span class="bt-dot"></span>' + escapeHtml(t.label) + "</button>"
      );
    }).join("");
    Array.prototype.forEach.call(box.querySelectorAll(".bt-toggle"), function (btn) {
      btn.addEventListener("click", function () {
        var k = btn.getAttribute("data-voice");
        // Prevent turning all three off.
        var onCount = VOICE_ORDER.filter(function (v) { return state.activeVoices[v]; }).length;
        if (state.activeVoices[k] && onCount === 1) return;
        state.activeVoices[k] = !state.activeVoices[k];
        render();
      });
    });
  }

  function renderBoard() {
    var board = el("bt-board");
    if (!board) return;
    var brand = getBrand(state.activeBrand);
    if (!brand) {
      board.innerHTML = '<div class="bt-empty">Select a brand to compare its voices.</div>';
      return;
    }
    var types = (state.data.meta && state.data.meta.voice_types) || {};
    var cols = VOICE_ORDER.filter(function (k) { return state.activeVoices[k]; });

    var header =
      '<div class="bt-board__head" style="--bt-accent:' + escapeHtml(brand.color || "#444") + '">' +
      '<span class="bt-board__emoji" aria-hidden="true">' + escapeHtml(brand.emoji || "•") + "</span>" +
      "<div><h3>" + escapeHtml(brand.name) + "</h3>" +
      '<span class="bt-board__cat">' + escapeHtml(brand.category || "") + "</span></div>" +
      "</div>" +
      gapStrip(brand.voice_gap);

    var grid = '<div class="bt-cols" data-count="' + cols.length + '">' +
      cols.map(function (key) {
        var voice = (brand.voices && brand.voices[key]) || {};
        var t = types[key] || { label: key, description: "" };
        return voiceColumn(key, t, voice);
      }).join("") +
      "</div>";

    board.innerHTML = header + profilePanel(brand) + grid;
    wireProfile();
  }

  // Perception profile: paired bars of the AI-elicited attribute ratings,
  // selected brand vs a comparison brand (default: category rival).
  function profilePanel(brand) {
    var attrs = brand.voices.ai && brand.voices.ai.attributes;
    if (!attrs || !attrs.length) return "";
    var cmp = state.compareBrand && state.compareBrand !== brand.slug ? getBrand(state.compareBrand) : null;
    var cmpAttrs = {};
    if (cmp && cmp.voices.ai && cmp.voices.ai.attributes) {
      cmp.voices.ai.attributes.forEach(function (a) { cmpAttrs[a.name] = a.score; });
    }

    var options = (state.data.brands || []).filter(function (b) { return b.slug !== brand.slug; })
      .map(function (b) {
        return '<option value="' + escapeHtml(b.slug) + '"' + (cmp && cmp.slug === b.slug ? " selected" : "") + ">" +
          escapeHtml(b.name) + "</option>";
      }).join("");

    var rows = attrs.map(function (a) {
      var av = Math.max(0, Math.min(10, a.score));
      var bar = function (cls, brandName, val) {
        return '<span class="bt-pr__track"><span class="bt-pr__bar ' + cls + '" style="width:' + (val * 10) + '%" data-tip="' +
          escapeHtml(brandName + " — " + a.name + ": " + val + "/10") + '"></span>' +
          '<span class="bt-pr__val">' + val + "</span></span>";
      };
      return (
        '<div class="bt-pr">' +
        '<span class="bt-pr__name">' + escapeHtml(a.name) + "</span>" +
        '<span class="bt-pr__bars">' +
        bar("bt-pr__bar--a", brand.name, av) +
        (cmp ? bar("bt-pr__bar--b", cmp.name, Math.max(0, Math.min(10, cmpAttrs[a.name] != null ? cmpAttrs[a.name] : 0))) : "") +
        "</span></div>"
      );
    }).join("");

    return (
      '<div class="bt-profile">' +
      '<div class="bt-profile__head">' +
      "<h4>Perception profile <span>AI-elicited, 0–10</span></h4>" +
      '<label class="bt-profile__cmp">Compare with ' +
      '<select id="bt-compare"><option value="">— none —</option>' + options + "</select></label>" +
      "</div>" +
      '<div class="bt-profile__legend">' +
      '<span class="bt-pr__leg bt-pr__leg--a"><span class="bt-dot"></span>' + escapeHtml(brand.name) + "</span>" +
      (cmp ? '<span class="bt-pr__leg bt-pr__leg--b"><span class="bt-dot"></span>' + escapeHtml(cmp.name) + "</span>" : "") +
      "</div>" +
      rows +
      "</div>"
    );
  }

  function wireProfile() {
    var sel = el("bt-compare");
    if (!sel) return;
    sel.addEventListener("change", function () {
      state.compareBrand = sel.value;
      renderBoard();
    });
  }

  // One shared hover tooltip for chart marks ([data-tip] elements).
  function initTooltip() {
    var tip = document.createElement("div");
    tip.className = "bt-tip";
    tip.setAttribute("role", "status");
    document.body.appendChild(tip);
    function move(e) {
      var pad = 12;
      var x = Math.min(e.clientX + pad, window.innerWidth - tip.offsetWidth - pad);
      var y = e.clientY - tip.offsetHeight - pad;
      if (y < pad) y = e.clientY + pad;
      tip.style.left = x + "px";
      tip.style.top = y + "px";
    }
    document.addEventListener("mouseover", function (e) {
      var t = e.target && e.target.closest ? e.target.closest("[data-tip]") : null;
      if (!t) return;
      tip.textContent = t.getAttribute("data-tip");
      tip.classList.add("is-on");
      move(e);
    });
    document.addEventListener("mousemove", function (e) {
      if (tip.classList.contains("is-on")) move(e);
    });
    document.addEventListener("mouseout", function (e) {
      if (e.target && e.target.closest && e.target.closest("[data-tip]")) tip.classList.remove("is-on");
    });
  }

  function signed(n) { return (n > 0 ? "+" : "") + n; }

  // Ordinal voice-valence coding (−2…+2). Official is anchored at +2 by
  // construction (self-presentation); the informative quantity is the gap.
  function gapStrip(gap) {
    if (!gap) return "";
    var spread = Math.abs((gap.official != null ? gap.official : 2) - gap.consumer);
    var label = spread >= 3 ? "large" : spread === 2 ? "moderate" : "small";
    var chips = VOICE_ORDER.map(function (k) {
      if (gap[k] == null) return "";
      return '<span class="bt-gap__chip bt-gap__chip--' + k + '">' +
        '<span class="bt-dot"></span>' + signed(gap[k]) + "</span>";
    }).join("");
    return (
      '<div class="bt-gap">' +
      '<span class="bt-gap__title">Voice valence</span>' + chips +
      '<span class="bt-gap__spread bt-gap__spread--' + label + '">official–consumer gap: ' +
      spread + " (" + label + ")</span>" +
      (gap.note ? '<span class="bt-gap__note">' + escapeHtml(gap.note) + "</span>" : "") +
      "</div>"
    );
  }

  function sourceLink(name, url) {
    var safe = escapeHtml(name || "");
    if (!url) return safe;
    return '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' + safe + "</a>";
  }

  function voiceColumn(key, type, voice) {
    var tags = (voice.tone_tags || []).map(function (tag) {
      return '<span class="bt-tag">' + escapeHtml(tag) + "</span>";
    }).join("");

    var metrics = (voice.metrics || []).map(function (m) {
      return (
        '<div class="bt-metric">' +
        '<span class="bt-metric__value">' + escapeHtml(m.value || "") + "</span>" +
        '<span class="bt-metric__label">' + escapeHtml(m.label || "") +
        (m.source ? " · " + sourceLink(m.source, m.source_url) : "") +
        "</span></div>"
      );
    }).join("");

    var samples = (voice.samples || []).map(function (s) {
      return (
        '<figure class="bt-sample">' +
        '<blockquote>' + escapeHtml(s.text) + "</blockquote>" +
        "<figcaption>" +
        (s.attribution ? '<span class="bt-sample__attr">' + escapeHtml(s.attribution) + "</span>" : "") +
        '<span class="bt-sample__src">' + sourceLink(s.source, s.source_url) + "</span>" +
        '<span class="bt-sample__meta">' +
        escapeHtml(s.date || "") +
        (s.metric ? ' · ' + escapeHtml(s.metric) : "") +
        "</span></figcaption></figure>"
      );
    }).join("");

    return (
      '<section class="bt-col bt-col--' + key + '">' +
      '<header class="bt-col__head">' +
      '<span class="bt-dot"></span>' +
      "<h4>" + escapeHtml(type.label) + "</h4>" +
      (voice.sentiment ? '<span class="bt-sentiment">' + escapeHtml(voice.sentiment) + "</span>" : "") +
      "</header>" +
      '<p class="bt-col__desc">' + escapeHtml(type.description || "") + "</p>" +
      (voice.summary ? '<p class="bt-col__summary">' + escapeHtml(voice.summary) + "</p>" : "") +
      (metrics ? '<div class="bt-metrics">' + metrics + "</div>" : "") +
      (tags ? '<div class="bt-tags">' + tags + "</div>" : "") +
      '<div class="bt-samples">' + (samples || '<p class="bt-empty">No samples yet.</p>') + "</div>" +
      "</section>"
    );
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function wireSearch() {
    var input = el("bt-search");
    if (!input) return;
    input.addEventListener("input", function () {
      state.query = input.value || "";
      renderBrandRail();
      renderBoard();
    });
  }

  function init() {
    if (!el("bt-root")) return;
    wireSearch();
    initTooltip();
    load();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
