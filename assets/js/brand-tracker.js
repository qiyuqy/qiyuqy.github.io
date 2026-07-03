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

  var state = {
    data: null,
    activeBrand: null,
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
    renderBrandRail();
    renderFilters();
    renderBoard();
  }

  function renderMeta() {
    var meta = state.data.meta || {};
    var badge = el("bt-meta");
    if (!badge) return;
    var live = DATA_SOURCE.mode === "api";
    var parts = [];
    parts.push(
      '<span class="bt-pill ' + (live ? "bt-pill--live" : "bt-pill--demo") + '">' +
      (live ? "Live data" : "Demo data") + "</span>"
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
        state.activeBrand = btn.getAttribute("data-brand");
        render();
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
      "</div>";

    var grid = '<div class="bt-cols" data-count="' + cols.length + '">' +
      cols.map(function (key) {
        var voice = (brand.voices && brand.voices[key]) || {};
        var t = types[key] || { label: key, description: "" };
        return voiceColumn(key, t, voice);
      }).join("") +
      "</div>";

    board.innerHTML = header + grid;
  }

  function voiceColumn(key, type, voice) {
    var tags = (voice.tone_tags || []).map(function (tag) {
      return '<span class="bt-tag">' + escapeHtml(tag) + "</span>";
    }).join("");

    var samples = (voice.samples || []).map(function (s) {
      return (
        '<figure class="bt-sample">' +
        '<blockquote>' + escapeHtml(s.text) + "</blockquote>" +
        '<figcaption><span class="bt-sample__src">' + escapeHtml(s.source || "") + "</span>" +
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
    load();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
