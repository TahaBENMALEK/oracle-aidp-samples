/*
 * render_chart_marker.js
 * ---------------------------------------------------------------------------
 * Renders an inline chart directly beneath an agent's answer inside an Oracle
 * APEX chat region, driven by a hidden marker the agent appends to its reply:
 *
 *   <!--CHART:{"type":"hbar","title":"Sales by region",
 *              "data":[{"label":"North","value":120},{"label":"South","value":90}]}-->
 *
 * The marker is AGENT-AGNOSTIC: a low-code AIDP agent (via pasted instructions)
 * and a high-code agent (via a system-prompt rule) emit the IDENTICAL marker,
 * so this front-end code does not care which one produced the answer.
 *
 * Chart types:
 *   - Oracle JET <oj-chart> renders:  hbar, pie, bar, line, pyramid, funnel
 *   - Chart.js renders:               donut  (JET oj-chart has no hole/cutout type)
 *
 * Dependencies:
 *   - Oracle JET (ships with APEX) provides <oj-chart>.
 *   - Chart.js is loaded on demand, and ONLY when a donut is requested.
 *
 * Usage (see the README for full wiring):
 *   - ACPChart.renderAfter(answerEl, answerText)  render a chart after one answer
 *   - ACPChart.scan(rootEl, answerSelector)       auto-render every answer under root
 *
 * Notes:
 *   - The marker is an HTML comment, so it never shows in the rendered bubble.
 *   - All example data below is invented; wire the marker to your own dataset.
 * ---------------------------------------------------------------------------
 */
(function (window, document) {
  "use strict";

  // Categorical palette. Replace with your own theme colours if you like.
  var PALETTE = ["#4f7fa8", "#5a9e6f", "#a3924e", "#b5544a", "#8a6d9e", "#6b8fb5", "#7cae8a", "#c98a3a"];

  // Chart.js is fetched only for the donut. Pin the version you have vetted.
  var CHARTJS_URL = "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js";

  // Map the marker "type" to an oj-chart config. (donut is handled by Chart.js;
  // the "donut" branch here is only a safety fallback to a plain pie.)
  function chartType(t) {
    switch (String(t || "hbar").toLowerCase()) {
      case "hbar":    return { type: "bar", horizontal: true };
      case "pie":     return { type: "pie" };
      case "bar":     return { type: "bar" };
      case "line":    return { type: "line" };
      case "donut":   return { type: "pie" };
      case "pyramid": return { type: "pyramid" };
      case "funnel":  return { type: "funnel" };
      default:        return { type: "bar", horizontal: true };
    }
  }

  // Load Chart.js once and reuse the same promise for every later donut.
  function loadChartJs() {
    if (window.__acpChartJsPromise) return window.__acpChartJsPromise;
    window.__acpChartJsPromise = new Promise(function (resolve, reject) {
      if (window.Chart) { resolve(window.Chart); return; }
      // APEX ships RequireJS, so Chart.js's UMD wrapper would register as an AMD
      // module instead of setting window.Chart. Hide define() during the load so
      // the UMD falls back to the global assignment, then restore define().
      var savedDefine = window.define;
      window.define = undefined;
      var restore = function () { window.define = savedDefine; };
      var s = document.createElement("script");
      s.src = CHARTJS_URL; s.async = true;
      s.onload  = function () { restore(); resolve(window.Chart); };
      s.onerror = function () { restore(); reject(new Error("Chart.js failed to load")); };
      document.head.appendChild(s);
    });
    return window.__acpChartJsPromise;
  }

  // Pick a readable label colour (dark or white) for a given slice colour.
  function textOn(hex) {
    var h = String(hex).replace("#", "");
    var r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
    return ((0.299 * r + 0.587 * g + 0.114 * b) / 255) > 0.6 ? "#25303b" : "#ffffff";
  }

  // Draw a donut WITH a real hole using Chart.js, into the given card element.
  function drawDonut(card, spec) {
    var wrap = document.createElement("div");
    wrap.style.cssText = "position:relative;width:100%;height:340px;"; // fixed-height box so maintainAspectRatio:false sizes correctly
    var canvas = document.createElement("canvas");
    wrap.appendChild(canvas);
    card.appendChild(wrap);

    loadChartJs().then(function (Chart) {
      var labels = spec.data.map(function (d) { return String(d.label); });
      var values = spec.data.map(function (d) { return Number(d.value); });
      var colors = spec.data.map(function (d, i) { return PALETTE[i % PALETTE.length]; });
      var total  = values.reduce(function (a, b) { return a + (b || 0); }, 0);

      // Draw each slice's % on the ring (best practice for pie/donut).
      var slicePct = {
        id: "acpSlicePct",
        afterDraw: function (chart) {
          var meta = chart.getDatasetMeta(0);
          if (!meta || !meta.data) return;
          var visTotal = values.reduce(function (a, b, j) {
            return a + ((chart.getDataVisibility && !chart.getDataVisibility(j)) ? 0 : (Number(b) || 0));
          }, 0);
          if (!visTotal) return;
          var c = chart.ctx; c.save();
          c.textAlign = "center"; c.textBaseline = "middle";
          c.font = "600 12px 'Oracle Sans', sans-serif";
          meta.data.forEach(function (arc, i) {
            if (chart.getDataVisibility && !chart.getDataVisibility(i)) return; // skip hidden slices
            var pct = Math.round(((Number(values[i]) || 0) / visTotal) * 1000) / 10;
            if (pct < 4) return;                                               // skip slivers (no room for a label)
            var mid = (arc.startAngle + arc.endAngle) / 2;
            var r = (arc.innerRadius + arc.outerRadius) / 2;
            c.fillStyle = textOn(colors[i]);
            c.fillText(pct + "%", arc.x + Math.cos(mid) * r, arc.y + Math.sin(mid) * r);
          });
          c.restore();
        }
      };

      // Draw the total in the donut hole (that empty centre is meant for a summary).
      var centerTotal = {
        id: "acpCenterTotal",
        afterDraw: function (chart) {
          var meta = chart.getDatasetMeta(0); var el = meta && meta.data && meta.data[0];
          if (!el) return;
          var c = chart.ctx; c.save();
          c.textAlign = "center"; c.textBaseline = "middle";
          c.fillStyle = "#25303b"; c.font = "600 22px 'Oracle Sans', sans-serif";
          c.fillText(String(total), el.x, el.y - 8);
          c.fillStyle = "#7a8794"; c.font = "400 11px 'Oracle Sans', sans-serif";
          c.fillText("Total", el.x, el.y + 12);
          c.restore();
        }
      };

      new Chart(canvas, {
        type: "doughnut",
        data: { labels: labels, datasets: [{ data: values, backgroundColor: colors, borderColor: "#fff", borderWidth: 2 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          cutout: "58%",                                          // hole big enough to hold the total
          plugins: {
            legend: {
              position: "right",
              labels: {
                boxWidth: 12, font: { size: 12 },
                // when a slice is toggled off, show its swatch as an empty outline
                generateLabels: function (chart) {
                  var items;
                  try {
                    var o = Chart.overrides && Chart.overrides.doughnut;
                    var gen = (o && o.plugins && o.plugins.legend && o.plugins.legend.labels && o.plugins.legend.labels.generateLabels)
                           || Chart.defaults.plugins.legend.labels.generateLabels;
                    items = gen(chart);
                  } catch (e) { items = []; }
                  items.forEach(function (it) {
                    if (it.hidden) { it.fillStyle = "#ffffff"; it.strokeStyle = "#c9ced4"; it.lineWidth = 1; }
                  });
                  return items;
                }
              }
            },
            tooltip: {
              callbacks: {
                label: function (ctx) {                            // hover shows e.g. "North: 120 (34%)"
                  var v = Number(ctx.parsed) || 0;
                  var pct = total ? Math.round((v / total) * 1000) / 10 : 0;
                  return ctx.label + ": " + v + " (" + pct + "%)";
                }
              }
            }
          }
        },
        plugins: [centerTotal, slicePct]
      });
    }).catch(function () { /* Chart.js unavailable: leave the titled card, never break the chat */ });
  }

  // Build the chart card element from a parsed marker spec. Returns the card, or null.
  function buildCard(spec) {
    if (!spec || !spec.data || !spec.data.length) return null;
    var rawType = String(spec.type || "hbar").toLowerCase();

    var card = document.createElement("div");
    card.className = "acp-chart";
    card.style.cssText = "background:#fff;border:1px solid #e3e6ea;border-radius:12px;padding:12px 16px;margin:8px 0 4px;width:100%;box-sizing:border-box;";
    if (spec.title) {
      var h = document.createElement("div");
      h.textContent = spec.title;
      h.style.cssText = "font-size:13px;font-weight:600;color:#25303b;margin-bottom:8px;";
      card.appendChild(h);
    }

    // DONUT: JET oj-chart has no donut/hole type -> draw with Chart.js.
    if (rawType === "donut") { drawDonut(card, spec); return card; }

    // ALL OTHER TYPES: JET oj-chart.
    var cfg = chartType(rawType);
    // JET data shape:
    //   pie / funnel / pyramid -> ONE series PER category (1 group): distinct colours,
    //                             per-item legend + click-to-hide.
    //   bar / hbar             -> one series across N groups, one colour per category.
    //   line                   -> one series across N groups (markers set below).
    var nSeries = (cfg.type === "pie" || rawType === "funnel" || rawType === "pyramid");
    var isLine  = (rawType === "line");
    var groups, series;
    if (nSeries) {
      groups = [spec.title || "Total"];
      series = spec.data.map(function (d, i) { return { name: String(d.label), items: [Number(d.value)], color: PALETTE[i % PALETTE.length] }; });
    } else if (isLine) {
      groups = spec.data.map(function (d) { return String(d.label); });
      series = [{ name: spec.title || "Value", color: PALETTE[0], lineWidth: 3, items: spec.data.map(function (d) { return Number(d.value); }) }];
    } else {
      groups = spec.data.map(function (d) { return String(d.label); });
      series = [{ name: spec.title || "Value", items: spec.data.map(function (d, i) { return { value: Number(d.value), color: PALETTE[i % PALETTE.length] }; }) }];
    }

    var chart = document.createElement("oj-chart");
    chart.setAttribute("type", cfg.type);
    if (cfg.horizontal) chart.setAttribute("orientation", "horizontal");
    chart.setAttribute("hover-behavior", "dim");
    chart.setAttribute("animation-on-display", "auto");
    if (nSeries) chart.setAttribute("hide-and-show-behavior", "withRescale");
    if (isLine) {
      // sparse single line: show a dot at each point, and drop the 1-item legend
      chart.setAttribute("style-defaults", JSON.stringify({ markerDisplayed: "on" }));
      chart.setAttribute("legend", JSON.stringify({ rendered: "off" }));
    }
    if (!nSeries && !isLine) {
      // bar / hbar: the bars are already labeled on the axis, so the single-series
      // legend ("Value") is redundant and misleading - drop it.
      chart.setAttribute("legend", JSON.stringify({ rendered: "off" }));
    }
    chart.style.width = "100%";
    chart.style.height = "340px";
    chart.setAttribute("groups", JSON.stringify(groups));
    chart.setAttribute("series", JSON.stringify(series));
    card.appendChild(chart);
    return card;
  }

  // Parse the first <!--CHART:...--> marker in a block of text -> spec object (or null).
  function parseMarker(text) {
    var m = /<!--CHART:([\s\S]*?)-->/.exec(text || "");
    if (!m) return null;
    try { return JSON.parse(m[1]); } catch (e) { return null; }
  }

  window.ACPChart = {
    // Parse-only helper (exposed for testing).
    parseMarker: parseMarker,

    // Render a chart INTO a container element from marker text. Returns the card, or null.
    renderInto: function (container, text) {
      if (!container) return null;
      var card = buildCard(parseMarker(text));
      if (card) container.appendChild(card);
      return card;
    },

    // Render a chart immediately AFTER a message element from marker text.
    // Guards with data-acp-charted so an answer is only charted once.
    renderAfter: function (rowEl, text) {
      if (!rowEl || rowEl.getAttribute("data-acp-charted")) return null;
      var card = buildCard(parseMarker(text));
      if (card) { rowEl.setAttribute("data-acp-charted", "1"); rowEl.insertAdjacentElement("afterend", card); }
      return card;
    },

    // Scan a root element for assistant answers and render each answer's marker.
    // answerSelector should match each assistant-answer element whose textContent
    // still contains the raw marker. Default: elements tagged [data-agent-answer].
    scan: function (root, answerSelector) {
      if (!root) return;
      var sel = answerSelector || "[data-agent-answer]";
      Array.prototype.forEach.call(root.querySelectorAll(sel), function (el) {
        window.ACPChart.renderAfter(el, el.textContent || "");
      });
    }
  };
})(window, document);
