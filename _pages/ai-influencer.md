---
layout: archive
title: "AI Influencer"
description: "Brand Voice Tracker — comparing official, consumer, and AI-generated brand voices for top global brands."
permalink: /ai-influencer/
author_profile: true
---

<link rel="stylesheet" href="{{ base_path }}/assets/css/brand-tracker.css">

This page explores how brands sound across three increasingly important channels.
As AI systems and AI influencers begin to speak *for* and *about* brands, the gap
between a brand's **official voice**, its **consumers' voice**, and the
**AI-generated voice** becomes a question worth tracking. The tracker below lets
you compare all three side by side for a set of top global brands.

Brand Voice Tracker
-----

<div id="bt-root" class="bt-root">
  <div class="bt-toolbar">
    <input id="bt-search" class="bt-search" type="search" placeholder="Search brands or categories…" aria-label="Search brands">
    <div id="bt-meta" class="bt-meta"></div>
  </div>
  <div id="bt-voice-filters" class="bt-voice-filters" role="group" aria-label="Toggle voice types"></div>
  <div id="bt-rail" class="bt-rail" role="tablist" aria-label="Brands"></div>
  <div id="bt-board" class="bt-board" aria-live="polite"></div>
</div>

<p style="font-size:0.8rem;color:#999;margin-top:1.5rem;">
  Voices shown are illustrative demo data. The tracker is built to read from a
  live data feed — see <code>assets/js/brand-tracker.js</code> to connect an API.
</p>

<script src="{{ base_path }}/assets/js/brand-tracker.js"></script>
