/**
 * FlexBarChart.js  —  v2.5  —  Qlik Sense Extension
 * ═══════════════════════════════════════════════════════════════════════════
 * Target  : Qlik Sense May 2025 Patch 15  (14.231.27 / QSEoW)
 * License : MIT
 *
 * ── WHAT'S IN v2.0 ──────────────────────────────────────────────────────
 *
 * CHART MODES
 *   • Grouped  — side-by-side bars per category (Qlik default for multi-measure)
 *   • Stacked  — segmented bars (part-to-whole)
 *   • Nested / Inset — child bars inside a consolidated parent bar
 *   • All modes support Vertical and Horizontal bar direction
 *
 * LABEL SYSTEM (datapoints)
 *   • Labels on every bar in every mode (no suppression)
 *   • Label orientation: Horizontal | Vertical (inside bar) | Tilted 45°
 *   • Nested Vertical — two dedicated top-panel modes:
 *       "Above bar — Tilted 45°"   values fan diagonally above swatches
 *       "Above bar — Vertical 90°" values stand upright above swatches
 *   • Swatch row: fixed horizontal band at chart top; all columns aligned
 *   • Per-bar colour-matched dashed lines connect swatch → bar tip
 *   • Label collision detection with stagger offsets (grouped/stacked modes)
 *
 * NESTED BAR DESIGN
 *   • Parent/consolidated bar: grayscale fill (#c8c7c0 / #888780 border)
 *   • Child bars: palette colours
 *   • Horizontal nested: right-side label column with swatch + connector lines
 *       Solid colour connector for large bars, dashed for small bars
 *       Dot anchor at each bar tip
 *   • Vertical nested: fixed-top swatch band, dashed lines drop to bar tips
 *
 * COLOURS
 *   • Auto-colour from app theme (default ON)
 *   • When OFF: 6 palette presets (Qlik / Classic / Pastel / Bold / Diverging / Mono)
 *   • Color by measure or by dimension
 *   • Custom hex CSV override
 *   • Theme re-applied automatically on first render
 *
 * RESPONSIVENESS
 *   • Bars fill the available container — no manual size sliders
 *   • Minimum bar size = 10px; chart scrolls when container is too small
 *   • Scroll: horizontal for vertical charts, vertical for horizontal charts
 *
 * AXES & LABELS
 *   • X-axis: tick labels + optional title, auto/tilted orientation
 *   • Y-axis: tick labels + optional title, full/auto label option
 *   • Axis label tooltips show full row data on hover (same as bar hover)
 *   • Category axis tooltip shows all measures for that dimension value
 *
 * TOOLTIP
 *   • Full-row tooltip on bar hover: category name + all measure values
 *   • Same tooltip on axis tick label hover (dimension axis only)
 *   • Toggleable in settings
 *
 * LEGEND
 *   • Positions: Bottom / Top / Left / Right / Hidden (single dropdown)
 *   • Colour swatches + measure names
 *
 * SORTING
 *   • Load order / Dim A→Z / Dim Z→A / First measure asc / First measure desc
 *
 * PROPERTY PANEL
 *   • Appearance accordion with sub-sections: General, Presentation,
 *     Value labels, Colors and legend, X-axis, Y-axis, Tooltip
 *   • All color controls always visible (not buried in sub-accordions)
 *
 * ── CHANGELOG v1.x → v2.0 ───────────────────────────────────────────────
 *   v1.1  D3 v7 AMD loading fix; stacked/grouped/nested modes
 *   v1.2  Property panel sub-sections; axis title drawing
 *   v1.3  Value labels on ALL bars; label orientation unified; nested direction
 *   v1.4  Label collision detection; axis label full-row tooltips; color section
 *   v1.5  bboxes scoped per category; minBarSize formula fixed
 *   v1.6  Y-axis label orientation; row height as fixed control; theme re-render
 *   v1.7  Horizontal label column system; fixed top margin for vertical labels
 *   v1.8  Fixed-top swatch band; tilted45/vertical90 modes; gray parent bar
 *   v1.9  Horizontal connector lines (colour-matched); sliders removed;
 *         10px responsive floor; fully auto-responsive sizing
 *   v2.0  All v1.x changes committed as stable baseline
 *   v2.1  Space optimisation, color section split, legend consistency
 *   v2.5  Property panel overhaul — matches Qlik native extension patterns
 *         • Flat structure: all Appearance items at single depth with text separators
 *         • Colors toggle: switch→dropdown (reliable across all QSEoW versions)
 *         • colorpicker→string hex inputs (avoids QSEoW colorpicker rendering bugs)
 *         • Unique labels: Value label style / Axis label angle / Category label width
 *         • nestedParentKey moved to Presentation section in Appearance
 *   v2.1  First stable release build — space optimisation
 *         • Verified: all 6 render paths pass syntax + feature checks
 *         • Verified: horizontal connector lines (solid/dashed per bar size)
 *         • Verified: vertical swatch band fixed at chart top for all columns
 *         • Verified: gray parent bar in both horizontal and vertical nested
 *         • Verified: responsive 10px floor with auto-scroll
 *         • Verified: no slider controls — fully auto-sizing
 * ═══════════════════════════════════════════════════════════════════════════
 */

define(["qlik","./lib/d3.v7.min"], function(qlik) {
  "use strict";
  var d3 = window.d3;

  /* ── Palette presets ─────────────────────────────────────────────────── */
  var PALETTES = {
    qlik:      ["#4477aa","#66aadd","#cc6677","#882255","#44aa99","#117733","#999933","#ddcc77","#aa4499","#332288","#661100","#aa7744"],
    classic:   ["#1f77b4","#ff7f0e","#2ca02c","#d62728","#9467bd","#8c564b","#e377c2","#7f7f7f","#bcbd22","#17becf","#aec7e8","#ffbb78"],
    pastel:    ["#a6cee3","#b2df8a","#fb9a99","#fdbf6f","#cab2d6","#ffff99","#8dd3c7","#ffffb3","#bebada","#fb8072","#80b1d3","#fdb462"],
    bold:      ["#e41a1c","#377eb8","#4daf4a","#984ea3","#ff7f00","#ffff33","#a65628","#f781bf","#999999","#66c2a5","#fc8d62","#8da0cb"],
    diverging: ["#d73027","#f46d43","#fdae61","#fee090","#e0f3f8","#abd9e9","#74add1","#4575b4","#313695","#a50026","#006837","#1a9850"],
    mono:      ["#08306b","#08519c","#2171b5","#4292c6","#6baed6","#9ecae1","#c6dbef","#252525","#525252","#737373","#969696","#bdbdbd"]
  };

  /* ── Base style ──────────────────────────────────────────────────────── */
  var S = {
    fontFamily: "'Source Sans Pro','Arial',sans-serif",
    fontSize:   12,
    labelColor: "#595959",
    axisColor:  "#d9d9d9",
    gridColor:  "#e6e6e6",
    animDur:    280,
    piInner:    0.35, /* bar padding inner */
    piOuter:    0.18,
    piGroup:    0.06
  };

  /* ═══════════════════════════════════════════════════════════════════════
     COLOUR RESOLVER
  ════════════════════════════════════════════════════════════════════════ */
  function _resolvePalette(layout, qTheme) {
    var cc = layout.colorConfig || {};
    var pal;
    /* useAppTheme stored as string "true"/"false" or legacy boolean */
    var auto = (cc.useAppTheme === true || cc.useAppTheme === "true" || cc.useAppTheme === undefined);
    /* 1. App theme auto */
    if (auto && qTheme) {
      var dc = qTheme.dataColors;
      if (dc) {
        var tc = dc.colors || dc.primaryColor;
        if (Array.isArray(tc) && tc.length >= 2) pal = tc;
        else if (typeof tc === "string") pal = _monoRamp(tc, 12);
      }
    }
    /* 2. Single color mode */
    if (!pal && !auto && cc.coloringMode === "single") {
      var sc = cc.singleColorHex || (cc.singleColor && typeof cc.singleColor==="object" ? cc.singleColor.color : cc.singleColor);
      if (sc && /^#/.test(sc)) pal = Array(12).fill(sc);
    }
    /* 3. Custom CSV */
    if (!pal && !auto && cc.customCsv) {
      var c = cc.customCsv.split(",").map(function(s){return s.trim();})
                .filter(function(s){return /^#[0-9A-Fa-f]{3,6}$/.test(s);});
      if (c.length) pal = c;
    }
    /* 4. Preset */
    if (!pal) pal = PALETTES[cc.palettePreset||"qlik"] || PALETTES.qlik;
    return pal;
  }

  /* Resolve the actual colour for one series slot.
     Priority: per-measure override (m0..m4) → palette (by measure or dimension).
     si: series index (0-based).  ri: row (category) index.
     The property panel stores overrides at colorConfig.measureColors.m0..m4
     matching series index. Qlik colorpicker writes {color, index} objects.    */
  function _resolveColor(layout, pal, seriesKey, si, ri) {
    var cc = layout.colorConfig || {};
    /* Per-measure override: now stored as plain hex string (e.g. "#cc6677") */
    if (cc.measureColors) {
      var mkey = "m" + si;
      var ov   = cc.measureColors[mkey];
      if (ov && typeof ov === "string" && /^#[0-9A-Fa-f]{3,6}$/.test(ov.trim())) {
        return ov.trim();
      }
      /* Legacy: colorpicker object {color:"#hex"} */
      if (ov && typeof ov === "object" && ov.color) return ov.color;
    }
    /* Single-color mode */
    var auto = (cc.useAppTheme === true || cc.useAppTheme === "true" || cc.useAppTheme === undefined);
    if (!auto && cc.coloringMode === "single") {
      var sc = cc.singleColorHex || (cc.singleColor && typeof cc.singleColor==="object" ? cc.singleColor.color : cc.singleColor);
      if (sc && /^#/.test(sc)) return sc;
    }
    /* Fallback: palette by measure or dimension */
    var idx = (cc.colorBy === "dimension" || cc.coloringMode === "dimension") ? ri : si;
    return pal[idx % pal.length];
  }

  function _monoRamp(hex, n) {
    var r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
    return Array.from({length:n},function(_,i){
      var t=0.3+(i/(n-1))*0.7,m=function(c){return Math.round(c*t+255*(1-t));};
      return "#"+[m(r),m(g),m(b)].map(function(v){return v.toString(16).padStart(2,"0");}).join("");
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════
     DATA PARSER
  ════════════════════════════════════════════════════════════════════════ */
  var EMPTY={categories:[],seriesKeys:[],rows:[],parentKey:null,childKeys:[]};

  function _parseData(layout) {
    var hc=layout.qHyperCube, cfg=layout.chartConfig||{};
    if (!hc||!hc.qDimensionInfo||!hc.qDimensionInfo.length||
        !hc.qMeasureInfo||!hc.qMeasureInfo.length||
        !hc.qDataPages||!hc.qDataPages.length||
        !hc.qDataPages[0].qMatrix||!hc.qDataPages[0].qMatrix.length) return EMPTY;

    var msL=hc.qMeasureInfo.map(function(m,i){return m.qFallbackTitle||m.qLabel||("M"+(i+1));});
    var cats=[],rowMap={};
    hc.qDataPages[0].qMatrix.forEach(function(row){
      var cat=row[0].qText!=null?row[0].qText:(""+row[0].qElemNumber);
      if(!rowMap[cat]){rowMap[cat]={category:cat};cats.push(cat);}
      msL.forEach(function(l,mi){var c=row[1+mi];rowMap[cat][l]=(c&&isFinite(c.qNum))?+c.qNum:0;});
    });
    var so=cfg.sortOrder||"none";
    if(so==="asc")       cats.sort(function(a,b){return a.localeCompare(b);});
    else if(so==="desc") cats.sort(function(a,b){return b.localeCompare(a);});
    else if(so==="valueAsc"||so==="valueDesc"){
      var fk=msL[0];
      cats.sort(function(a,b){return so==="valueAsc"?(rowMap[a][fk]||0)-(rowMap[b][fk]||0):(rowMap[b][fk]||0)-(rowMap[a][fk]||0);});
    }
    var rows=cats.map(function(c){return rowMap[c];});
    var pk=cfg.nestedParentKey||msL[0]||null;
    var ck=msL.filter(function(k){return k!==pk;});
    return {categories:cats,seriesKeys:msL,rows:rows,parentKey:pk,childKeys:ck};
  }

  /* ═══════════════════════════════════════════════════════════════════════
     FORMATTERS
  ════════════════════════════════════════════════════════════════════════ */
  function _fmt(v){
    if(v==null||v==="")return"";
    var n=parseFloat(v);if(isNaN(n))return String(v);
    if(Math.abs(n)>=1e9)return(n/1e9).toFixed(1)+"B";
    if(Math.abs(n)>=1e6)return(n/1e6).toFixed(1)+"M";
    if(Math.abs(n)>=1e3)return(n/1e3).toFixed(1)+"K";
    return n%1!==0?n.toFixed(1):String(n);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     VALUE LABEL RENDERER  —  with collision detection
     labelBBoxes: shared array per render pass tracking placed label bounds
     { x, y, w, h }  so we can detect overlaps and stagger.
     orient: "horizontal" | "vertical" | "tilted" | "auto"
     atTip:  force label at outer bar tip (consolidated/parent bars)
  ════════════════════════════════════════════════════════════════════════ */

  /* Approximate text width in px */
  function _textW(str, fs) { return str.length * fs * 0.6; }

  /* Check if two axis-aligned bounding boxes overlap (with `pad` px padding) */
  function _overlaps(a, b, pad) {
    pad = pad || 3;
    return !(a.x + a.w + pad < b.x || b.x + b.w + pad < a.x ||
             a.y + a.h + pad < b.y || b.y + b.h + pad < a.y);
  }

  /* ── _findSlot ────────────────────────────────────────────────────────────
     Try up to maxSteps positions, stepping by `stepPx` in the given direction
     (dy=-1 means step upward, dx=+1 means step rightward, etc.).
     Returns { x, y, step } for the first free slot, or null if all crowded.
  ─────────────────────────────────────────────────────────────────────────── */
  function _findSlot(bboxes, nx, ny, nw, nh, stepPx, dx, dy, maxSteps) {
    dx = dx || 0; dy = dy || -1; maxSteps = maxSteps || 4;
    stepPx = stepPx || Math.max(14, nh + 3); /* step >= label height + gap */
    for (var step = 0; step <= maxSteps; step++) {
      var tx = nx + step * stepPx * dx;
      var ty = ny + step * stepPx * dy;
      var box = { x: tx, y: ty, w: nw, h: nh };
      var ok = true;
      for (var i = 0; i < bboxes.length; i++) {
        if (_overlaps(bboxes[i], box)) { ok = false; break; }
      }
      if (ok) { bboxes.push(box); return { x: tx, y: ty, step: step }; }
    }
    return null; /* crowded — suppress */
  }

  /* ── _drawLabel ───────────────────────────────────────────────────────────
     Unified label renderer for all chart modes and orientations.
     bboxes: per-category collision tracker ([] per category).
     isHoriz: true = horizontal bar chart (value extends RIGHT, categories on Y).
     orient: "horizontal" | "vertical" | "tilted" | "auto"
     atTip: force label exactly at outer bar tip regardless of orient (parent bar).

     LABEL PLACEMENT RULES:
     ┌─────────────┬─────────────────┬──────────────────────────────────────┐
     │ orient      │ bar direction   │ placement                            │
     ├─────────────┼─────────────────┼──────────────────────────────────────┤
     │ horizontal  │ horizontal      │ right of tip, stagger DOWN in Y      │
     │ horizontal  │ vertical        │ above tip, stagger UP in Y           │
     │ vertical    │ either          │ rotated 90° inside bar               │
     │ tilted      │ vertical        │ 45° rotated above tip, stagger UP    │
     │ tilted      │ horizontal      │ same as "horizontal" — tilted does   │
     │             │                 │ not make sense on horiz (would cross) │
     │ auto        │ either          │ → horizontal                         │
     └─────────────┴─────────────────┴──────────────────────────────────────┘
     atTip=true always places at bar tip using "horizontal" rules.
  ─────────────────────────────────────────────────────────────────────────── */
  function _drawLabel(g, bboxes, bx, by, bw, bh, value, isHoriz, orient, atTip) {
    var text = _fmt(value);
    if (!text) return;
    var eff = orient === "auto" ? "horizontal" : orient;
    var fs  = Math.max(9, S.fontSize - 1);
    var tw  = _textW(text, fs);
    var th  = fs + 2;

    /* ── "vertical": rotated 90° INSIDE bar — no collision, size-gated ── */
    if (eff === "vertical") {
      var minSz = 20;
      if ((isHoriz && bw < minSz) || (!isHoriz && bh < minSz)) return;
      g.append("text")
        .attr("transform","translate("+(bx+bw/2)+","+(by+bh/2)+") rotate(-90)")
        .attr("text-anchor","middle").attr("dy","0.35em")
        .attr("fill","rgba(255,255,255,0.90)")
        .style("font-size",Math.min(fs,isHoriz?bh-2:bw-2)+"px")
        .style("font-family",S.fontFamily).style("pointer-events","none")
        .text(text);
      return;
    }

    /* ── "tilted": 45° ONLY for VERTICAL bars (above tip).
          For HORIZONTAL bars, tilted = "horizontal" (diagonal text on horiz
          bars causes visual crossing — treat as plain horizontal stacking).  ── */
    if (eff === "tilted" && !isHoriz && !atTip) {
      /* Tilted for vertical bars: rotate -45° above tip.
         Effective bbox: a rotated label of (tw × th) at 45° occupies
         roughly (tw×cos45 + th×sin45) × (tw×sin45 + th×cos45) ≈ (tw+th)/√2 each.
         Approximate with a square bbox of side = tw (the dominant dimension).  */
      var diagSide = tw * 0.75; /* conservative estimate */
      var nomX3 = bx + bw / 2 - diagSide / 2;
      var nomY3 = by - 4 - diagSide;
      var stepPxT = Math.max(14, diagSide + 3);
      var slot3 = _findSlot(bboxes, nomX3, nomY3, diagSide, diagSide, stepPxT, 0, -1, 4);
      if (!slot3) return;
      var tipXt = bx + bw / 2;
      var labelYt = slot3.y + diagSide;
      if (slot3.step > 0) {
        g.append("line")
          .attr("x1",tipXt).attr("y1",by-2)
          .attr("x2",tipXt).attr("y2",labelYt)
          .attr("stroke",S.axisColor).attr("stroke-width",0.8)
          .style("pointer-events","none");
      }
      g.append("text")
        .attr("transform","translate("+tipXt+","+labelYt+") rotate(-45)")
        .attr("text-anchor","start").attr("dy","0")
        .attr("fill",S.labelColor).style("font-size",fs+"px")
        .style("font-family",S.fontFamily).style("pointer-events","none")
        .text(text);
      return;
    }

    /* ── "horizontal" / "tilted-on-horiz" / atTip: collision-aware ─────── */
    if (isHoriz) {
      /* HORIZONTAL BAR: label to the right of bar tip, stagger DOWNWARD in Y.
         Labels for near-zero bars anchor at x=5 (just right of axis) so
         they are always visible — we never suppress based on bar width.       */
      var nomX = bw > 2 ? bw + 5 : 5;
      var nomY = by + bh / 2 - th / 2;
      var stepPxH = Math.max(th + 4, 16);

      /* Step downward (+Y) so labels stack below the natural midpoint */
      var slot = _findSlot(bboxes, nomX, nomY, tw, th, stepPxH, 0, 1, 4);
      if (!slot) return;
      var labelY = slot.y + th / 2;

      /* Connection indicator: dot at bar tip + short horizontal leader to label */
      if (slot.step > 0 || bw < 5) {
        var tipY  = by + bh / 2;
        var tipX  = bw > 2 ? bw + 2 : 2;
        /* Dot at bar tip */
        g.append("circle")
          .attr("cx", tipX).attr("cy", tipY).attr("r", 1.5)
          .attr("fill", S.axisColor).style("pointer-events","none");
        /* Horizontal dashed line from dot to label */
        if (nomX - tipX > 4) {
          g.append("line")
            .attr("x1", tipX + 2).attr("y1", tipY)
            .attr("x2", nomX - 2).attr("y2", tipY)
            .attr("stroke", S.axisColor).attr("stroke-width", 0.6)
            .attr("stroke-dasharray","3,2")
            .style("pointer-events","none");
          /* Vertical connector from bar level to label level */
          if (Math.abs(tipY - labelY) > 2) {
            g.append("line")
              .attr("x1", nomX - 2).attr("y1", tipY)
              .attr("x2", nomX - 2).attr("y2", labelY)
              .attr("stroke", S.axisColor).attr("stroke-width", 0.5)
              .style("pointer-events","none");
          }
        }
      }
      g.append("text")
        .attr("x", nomX).attr("y", labelY).attr("dy","0.35em")
        .attr("fill",S.labelColor).style("font-size",fs+"px")
        .style("font-family",S.fontFamily).style("pointer-events","none")
        .text(text);

    } else {
      /* VERTICAL BAR: label above bar tip, steps UPWARD (-Y).               */
      var nomX2 = bx + bw / 2 - tw / 2;
      var nomY2 = by - 4 - th;
      var stepPxV = Math.max(14, th + 3);
      var slot2 = _findSlot(bboxes, nomX2, nomY2, tw, th, stepPxV, 0, -1, 4);
      if (!slot2) return;
      var labelY2 = slot2.y + th;
      if (slot2.step > 0) {
        var tipX = bx + bw / 2;
        g.append("line")
          .attr("x1",tipX).attr("y1",by-2)
          .attr("x2",tipX).attr("y2",labelY2+2)
          .attr("stroke",S.axisColor).attr("stroke-width",0.8)
          .attr("stroke-dasharray","2,1")
          .style("pointer-events","none");
      }
      g.append("text")
        .attr("x",bx+bw/2).attr("y",labelY2)
        .attr("text-anchor","middle")
        .attr("fill",S.labelColor).style("font-size",fs+"px")
        .style("font-family",S.fontFamily).style("pointer-events","none")
        .text(text);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     AXIS HELPERS
  ════════════════════════════════════════════════════════════════════════ */
  function _hgrid(g, scale, size, isHoriz) {
    var ticks=scale.ticks?scale.ticks(5):[];
    if (!isHoriz) {
      g.selectAll(".hg").data(ticks).enter().append("line").attr("class","hg")
        .attr("x1",0).attr("x2",size)
        .attr("y1",function(t){return scale(t);}).attr("y2",function(t){return scale(t);})
        .attr("stroke",S.gridColor).attr("stroke-width",1);
    } else {
      g.selectAll(".vg").data(ticks).enter().append("line").attr("class","vg")
        .attr("x1",function(t){return scale(t);}).attr("x2",function(t){return scale(t);})
        .attr("y1",0).attr("y2",size)
        .attr("stroke",S.gridColor).attr("stroke-width",1);
    }
  }

  /* Attach floating tooltip to all SVG text nodes in an axis group.
     data + contentFn are optional: if provided, hovering shows full row data
     (same as bar hover). contentFn(cat) → HTML string.                     */
  function _axisTooltip(axisG, tipEl, contentFn) {
    if (!tipEl) return;
    axisG.selectAll("text").each(function() {
      var node = this;
      var full = d3.select(node).attr("data-full") || d3.select(node).text() || "";
      node.addEventListener("mouseenter", function(e) {
        if (!full) return;
        /* If we have a content builder, show full row; else show category name */
        tipEl.innerHTML = contentFn ? contentFn(full) : ("<strong>" + full + "</strong>");
        tipEl.style.opacity = "1";
        var b = tipEl.parentElement.getBoundingClientRect();
        var OFFSET = 5;
        var left = e.clientX - b.left + OFFSET;
        var top  = e.clientY - b.top  + OFFSET;
        /* Edge detection */
        setTimeout(function() {
          var tw = tipEl.offsetWidth || 160, th = tipEl.offsetHeight || 80;
          if (left + tw > tipEl.parentElement.clientWidth - 4) left = e.clientX - b.left - tw - OFFSET;
          if (top  + th > tipEl.parentElement.clientHeight - 4) top  = e.clientY - b.top  - th - OFFSET;
          tipEl.style.left = left + "px"; tipEl.style.top = top + "px";
        }, 0);
      });
      node.addEventListener("mousemove", function(e) {
        var b = tipEl.parentElement.getBoundingClientRect();
        tipEl.style.left = (e.clientX - b.left + 5) + "px";
        tipEl.style.top  = (e.clientY - b.top  + 5) + "px";
      });
      node.addEventListener("mouseleave", function() { tipEl.style.opacity = "0"; });
    });
  }

  /* X-axis: tick labels + optional title */
  function _axisX(g, x, h, cfg, titleText, tipEl) {
    var showLbls  = cfg.xShowLabels  !== false;
    var showTitle = cfg.xShowTitle   === true && titleText;
    if (!showLbls && !showTitle) return;

    var bw=typeof x.bandwidth==="function"?x.bandwidth():40, charW=S.fontSize*0.6;
    var orient=cfg.xLabelOrientation||"auto";
    var shouldTilt=orient==="tilted"||(orient==="auto"&&x.domain&&x.domain().length>7);

    if (showLbls) {
      var axG = g.append("g").attr("transform","translate(0,"+h+")")
        .call(d3.axisBottom(x).tickSizeOuter(0).tickSize(0));
      axG.select(".domain").attr("stroke",S.axisColor);
      var isBand = typeof x.bandwidth === "function"; /* true = category axis */
      axG.selectAll("text")
        .attr("fill",S.labelColor).style("font-size",S.fontSize+"px").style("font-family",S.fontFamily)
        .call(function(texts){
          texts.each(function(){
            var nd=d3.select(this),full=nd.text();
            nd.attr("data-full",full);
            if(isBand) nd.attr("data-iscat","1"); /* only mark dimension (band) labels */
            if(shouldTilt){
              if(full.length>18) nd.text(full.slice(0,17)+"…");
              nd.attr("text-anchor","end").attr("dx","-0.5em").attr("dy","0.1em").attr("transform","rotate(-35)");
            } else {
              var maxFit=Math.max(3,Math.floor((bw-4)/charW));
              if(full.length>maxFit) nd.text(full.slice(0,maxFit-1)+"…");
            }
          });
        });
      if (tipEl) _axisTooltip(axG, tipEl);
    }

    if (showTitle && titleText) {
      /* Axis title below tick labels */
      var titleY = h + (showLbls ? (shouldTilt ? 56 : 36) : 16);
      g.append("text")
        .attr("x", (+g.attr("data-w")||200)/2)
        .attr("y", titleY)
        .attr("text-anchor","middle")
        .attr("fill",S.labelColor)
        .style("font-size",S.fontSize+"px").style("font-family",S.fontFamily)
        .style("font-weight","600")
        .text(titleText);
    }

    /* Left border line */
    g.append("line").attr("x1",0).attr("x2",0).attr("y1",0).attr("y2",h).attr("stroke",S.axisColor).attr("stroke-width",1);
  }

  /* Y-axis (value scale — vertical bars) */
  function _axisY(g, y, cfg, titleText, h, tipEl) {
    var showLbls  = cfg.yShowLabels  !== false;
    var showTitle = cfg.yShowTitle   === true && titleText;
    if (!showLbls && !showTitle) return;

    if (showLbls) {
      var axG = g.append("g").call(d3.axisLeft(y).ticks(5).tickFormat(_fmt).tickSize(0));
      axG.select(".domain").remove();
      axG.selectAll("text")
        .attr("fill",S.labelColor).style("font-size",S.fontSize+"px").style("font-family",S.fontFamily)
        .each(function(){ var nd=d3.select(this); nd.attr("data-full",nd.text()); });
      if (tipEl) _axisTooltip(axG, tipEl);
    }

    if (showTitle && titleText) {
      g.append("text")
        .attr("transform","rotate(-90)")
        .attr("x", -(h||200)/2).attr("y", -42)
        .attr("text-anchor","middle")
        .attr("fill",S.labelColor)
        .style("font-size",S.fontSize+"px").style("font-family",S.fontFamily)
        .style("font-weight","600")
        .text(titleText);
    }
  }

  /* Y-axis (category scale — horizontal bars) */
  function _axisYCat(g, y, leftMargin, bold, tipEl, showFull) {
    /* showFull=true: don't truncate (wider margin required from caller).
       showFull=false/undefined: truncate to fit leftMargin.               */
    var maxFit = showFull
      ? 40
      : Math.max(4, Math.floor((leftMargin - 8) / (S.fontSize * 0.6)));
    var axG = g.append("g").call(d3.axisLeft(y).tickSize(0));
    axG.select(".domain").remove();
    axG.selectAll("text")
      .attr("fill", S.labelColor)
      .style("font-size", S.fontSize + "px")
      .style("font-family", S.fontFamily)
      .style("font-weight", bold ? "600" : "400")
      .call(function(texts) {
        texts.each(function() {
          var nd = d3.select(this), full = nd.text();
          nd.attr("data-full", full).attr("data-iscat", "1");
          if (!showFull && full.length > maxFit) nd.text(full.slice(0, maxFit - 1) + "…");
        });
      });
    if (tipEl) _axisTooltip(axG, tipEl);
  }

  function _baseline(g,w,h){g.append("line").attr("x1",0).attr("x2",w).attr("y1",h).attr("y2",h).attr("stroke",S.axisColor).attr("stroke-width",1);}
  function _leftline(g,h){g.append("line").attr("x1",0).attr("x2",0).attr("y1",0).attr("y2",h).attr("stroke",S.axisColor).attr("stroke-width",1);}

  /* ═══════════════════════════════════════════════════════════════════════
     TOOLTIP DIV  (shared across all modes)
  ════════════════════════════════════════════════════════════════════════ */
  function _makeTip(el) {
    var tip=document.createElement("div");
    tip.style.cssText=[
      "position:absolute","pointer-events:none","opacity:0","transition:opacity 0.08s",
      "background:#fff","border-radius:3px","border:1px solid #c8c8c8",
      "box-shadow:0 2px 8px rgba(0,0,0,0.18)","padding:7px 11px",
      "font-family:"+S.fontFamily,"font-size:"+S.fontSize+"px","color:#333",
      "line-height:1.6","z-index:99999","white-space:nowrap","max-width:320px","min-width:120px"
    ].join(";");
    el.appendChild(tip);
    return tip;
  }

  function _attachBarTooltip(el, data, layout, tipEl) {
    if ((layout.tooltipConfig||{}).show===false) return null;
    var OFFSET=5;

    function _content(cat){
      var row=null;
      for(var i=0;i<data.rows.length;i++){if(data.rows[i].category===cat){row=data.rows[i];break;}}
      if(!row) return"<strong>"+cat+"</strong>";
      var html='<div style="font-weight:700;border-bottom:1px solid #eee;margin-bottom:4px;padding-bottom:3px;">'+cat+'</div>';
      data.seriesKeys.forEach(function(key){
        var val=row[key];if(val==null)return;
        var isPk=(data.parentKey===key)||(layout.chartConfig&&layout.chartConfig.nestedParentKey===key);
        html+='<div style="display:flex;justify-content:space-between;gap:14px;'+(isPk?"font-weight:600;":"")+'">'+
          '<span style="color:'+S.labelColor+'">'+key+'</span><span style="font-weight:700">'+_fmt(val)+'</span></div>';
      });
      return html;
    }
    function _pos(e){
      var b=el.getBoundingClientRect(),mx=e.clientX-b.left,my=e.clientY-b.top;
      var tw=tipEl.offsetWidth||160,th=tipEl.offsetHeight||80;
      var left=mx+OFFSET;if(left+tw>el.clientWidth-4)left=mx-tw-OFFSET;if(left<2)left=2;
      var top=my+OFFSET; if(top+th>el.clientHeight-4)top=my-th-OFFSET; if(top<2)top=2;
      tipEl.style.left=left+"px"; tipEl.style.top=top+"px";
    }
    el.querySelectorAll("rect[data-lbl]").forEach(function(r){
      r.addEventListener("mouseenter",function(e){ tipEl.innerHTML=_content(r.getAttribute("data-cat")||""); tipEl.style.opacity="1"; _pos(e); });
      r.addEventListener("mousemove",_pos);
      r.addEventListener("mouseleave",function(){ tipEl.style.opacity="0"; });
    });

    /* Return content builder so axis tooltips can reuse it */
    return _content;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     HELPER: resolve axis title from qHyperCube
  ════════════════════════════════════════════════════════════════════════ */
  function _dimTitle(layout)  { var hc=layout.qHyperCube; return (hc&&hc.qDimensionInfo&&hc.qDimensionInfo[0]&&(hc.qDimensionInfo[0].qFallbackTitle||hc.qDimensionInfo[0].qGroupFieldDefs&&hc.qDimensionInfo[0].qGroupFieldDefs[0]))||""; }
  function _msrTitle(layout)  { var hc=layout.qHyperCube; return (hc&&hc.qMeasureInfo&&hc.qMeasureInfo.map(function(m){return m.qFallbackTitle||m.qLabel;}).join(", "))||""; }

  /* ═══════════════════════════════════════════════════════════════════════
     MODE 1 — GROUPED (default)
  ════════════════════════════════════════════════════════════════════════ */
  function _grouped(g, data, cfg, pal, layout, tip) {
    var horiz  = cfg.orientation==="horizontal";
    var labelO = cfg.labelOrientation||"horizontal";
    var showVL = cfg.showValueLabels!==false;
    var cc     = layout.colorConfig||{};
    var W=+g.attr("data-w"),H=+g.attr("data-h"),lm=+g.attr("data-leftmargin")||60;
    var dimT=_dimTitle(layout), msrT=_msrTitle(layout);

    if (horiz) {
      /* rowH = fixed per-bar height — slider directly controls rendered bar height */
      /* Responsive: fill container; scroll if bars < 10px */
      var minH=10; /* absolute floor */
      var nSeries = data.seriesKeys.length;
      var groupH = nSeries * minH / (1 - S.piGroup);
      var H2=Math.max(H, data.categories.length * groupH / (1 - S.piInner));
      var y0=d3.scaleBand().domain(data.categories).range([0,H2]).paddingInner(S.piInner).paddingOuter(S.piOuter);
      var y1=d3.scaleBand().domain(data.seriesKeys).range([0,y0.bandwidth()]).paddingInner(S.piGroup);
      var maxV=d3.max(data.rows,function(r){return d3.max(data.seriesKeys,function(k){return r[k]||0;})||0;})||1;
      var x=d3.scaleLinear().domain([0,maxV*1.12]).nice().range([0,W]);
      if(H2>H) g.attr("data-scrollh",H2);
      if(cfg.showGrid!==false) _hgrid(g,x,H2,true);
      /* Axes for horizontal grouped */
      var xAxG=g.append("g").attr("transform","translate(0,"+H2+")").call(d3.axisBottom(x).ticks(5).tickFormat(_fmt).tickSize(0));
      xAxG.select(".domain").attr("stroke",S.axisColor);
      xAxG.selectAll("text").attr("fill",S.labelColor).style("font-size",S.fontSize+"px").style("font-family",S.fontFamily);
      if(tip) _axisTooltip(xAxG,tip);
      _axisYCat(g,y0,lm,false,tip,cfg.yLabelOrientation==="full");
      if(cfg.xShowTitle&&msrT) g.append("text").attr("x",W/2).attr("y",H2+44).attr("text-anchor","middle").attr("fill",S.labelColor).style("font-size",S.fontSize+"px").style("font-family",S.fontFamily).style("font-weight","600").text(msrT);
      if(cfg.yShowTitle&&dimT) g.append("text").attr("transform","rotate(-90)").attr("x",-H2/2).attr("y",-lm+10).attr("text-anchor","middle").attr("fill",S.labelColor).style("font-size",S.fontSize+"px").style("font-family",S.fontFamily).style("font-weight","600").text(dimT);

      var grp=g.selectAll(".grp").data(data.rows).enter().append("g").attr("class","grp").attr("transform",function(d){return"translate(0,"+y0(d.category)+")";});
      /* FIX: bboxes reset PER CATEGORY ROW — labels in different rows occupy
         different y-bands so sharing boxes causes false collisions.             */
      grp.each(function(d,ri) {
        var rowG   = d3.select(this);
        var rowBox = []; /* fresh collision tracker per category row */
        data.seriesKeys.forEach(function(key,si){
          var color=pal[_colIdx(cc,si,ri)%pal.length];
          rowG.append("rect").attr("y",y1(key)).attr("height",y1.bandwidth()).attr("x",0).attr("width",0)
            .attr("fill",color)
            .attr("data-cat",d.category).attr("data-lbl",key).attr("data-val",_fmt(d[key]))
            .transition().duration(S.animDur).ease(d3.easeCubicOut).delay(si*6)
            .attr("width",Math.max(0,x(d[key]||0)));
          if(showVL){
            var bw=x(d[key]||0),by=y1(key),bh=y1.bandwidth();
            _drawLabel(rowG,rowBox,0,by,bw,bh,d[key],true,labelO,false);
          }
        });
        if (cc.colorBy==="dimension") {
          rowG.selectAll("rect").attr("fill",pal[ri%pal.length]);
        }
      });

    } else {
      /* Responsive: fill container; scroll if bars < 10px */
      var minW=10; /* absolute floor */
      var nS=data.seriesKeys.length, nC=data.categories.length;
      var groupW = nS * minW / (1 - S.piGroup);
      var W2=Math.max(W, nC * groupW / (1 - S.piInner));
      var x0=d3.scaleBand().domain(data.categories).range([0,W2]).paddingInner(S.piInner).paddingOuter(S.piOuter);
      var x1=d3.scaleBand().domain(data.seriesKeys).range([0,x0.bandwidth()]).paddingInner(S.piGroup);
      var maxVv=d3.max(data.rows,function(r){return d3.max(data.seriesKeys,function(k){return r[k]||0;})||0;})||1;
      var yv=d3.scaleLinear().domain([0,maxVv*1.12]).nice().range([H,0]);
      if(W2>W) g.attr("data-scrollw",W2);
      if(cfg.showGrid!==false) _hgrid(g,yv,W2,false);
      _axisX(g,x0,H,cfg,cfg.xShowTitle?dimT:null,tip);
      _axisY(g,yv,cfg,cfg.yShowTitle?msrT:null,H,tip);
      _baseline(g,W2,H);

      var grpV=g.selectAll(".grp").data(data.rows).enter().append("g").attr("class","grp").attr("transform",function(d){return"translate("+x0(d.category)+",0)";});
      /* FIX: bboxes reset PER CATEGORY — labels in different categories never
         overlap visually (different x regions), so sharing boxes would cause
         false collision detection and over-staggering.                         */
      grpV.each(function(d) {
        var catG   = d3.select(this);
        var catBox = []; /* fresh collision tracker per category */
        data.seriesKeys.forEach(function(key,si){
          var color=_resolveColor(layout,pal,key,si,0);
          catG.append("rect").attr("x",x1(key)).attr("width",x1.bandwidth()).attr("y",H).attr("height",0)
            .attr("fill",color)
            .attr("data-cat",d.category).attr("data-lbl",key).attr("data-val",_fmt(d[key]))
            .transition().duration(S.animDur).ease(d3.easeCubicOut).delay(si*6)
            .attr("y",yv(d[key]||0))
            .attr("height",Math.max(0,H-yv(d[key]||0)));
          if(showVL){
            var bh=H-yv(d[key]||0),bx=x1(key),bw=x1.bandwidth();
            _drawLabel(catG,catBox,bx,yv(d[key]||0),bw,bh,d[key],false,labelO,false);
          }
        });
      });
      if (cc.colorBy==="dimension") {
        grpV.each(function(d,ri){d3.select(this).selectAll("rect").attr("fill",pal[ri%pal.length]);});
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     MODE 2 — STACKED
  ════════════════════════════════════════════════════════════════════════ */
  function _stacked(g, data, cfg, pal, layout, tip) {
    var horiz=cfg.orientation==="horizontal";
    var labelO=cfg.labelOrientation||"horizontal";
    var showVL=cfg.showValueLabels!==false;
    var stk=d3.stack().keys(data.seriesKeys).value(function(d,k){return d[k]||0;});
    var sd=stk(data.rows);
    var W=+g.attr("data-w"),H=+g.attr("data-h"),lm=+g.attr("data-leftmargin")||60;
    var dimT=_dimTitle(layout),msrT=_msrTitle(layout);

    if (horiz) {
      /* Responsive stacked horizontal — fill container; 10px floor */
      var minH=10;
      var H2=Math.max(H,data.categories.length * minH / (1 - S.piInner));
      var y=d3.scaleBand().domain(data.categories).range([0,H2]).paddingInner(S.piInner).paddingOuter(S.piOuter);
      var maxV=d3.max(sd[sd.length-1],function(d){return d[1];})||1;
      var x=d3.scaleLinear().domain([0,maxV*1.1]).nice().range([0,W]);
      if(H2>H) g.attr("data-scrollh",H2);
      if(cfg.showGrid!==false) _hgrid(g,x,H2,true);
      var xAxG=g.append("g").attr("transform","translate(0,"+H2+")").call(d3.axisBottom(x).ticks(5).tickFormat(_fmt).tickSize(0));
      xAxG.select(".domain").attr("stroke",S.axisColor);xAxG.selectAll("text").attr("fill",S.labelColor).style("font-size",S.fontSize+"px").style("font-family",S.fontFamily);
      if(tip) _axisTooltip(xAxG,tip);
      _axisYCat(g,y,lm,false,tip,cfg.yLabelOrientation==="full");
      /* FIX: build per-category bboxes map for stacked horizontal.
         In a stacked bar, segments within ONE row can have labels that collide.
         Segments in different rows are in different y-bands — no real collision. */
      var catBoxH = {}; /* category → [] */
      data.categories.forEach(function(c){ catBoxH[c]=[]; });
      sd.forEach(function(series,si){
        var color=_resolveColor(layout,pal,series.key||data.seriesKeys[si]||"",si,0);
        g.selectAll(".seg"+si).data(series).enter().append("rect").attr("class","seg"+si)
          .attr("y",function(d){return y(d.data.category);}).attr("height",y.bandwidth()).attr("x",0).attr("width",0)
          .attr("fill",color)
          .attr("data-cat",function(d){return d.data.category;}).attr("data-lbl",series.key).attr("data-val",function(d){return _fmt(d[1]-d[0]);})
          .transition().duration(S.animDur).ease(d3.easeCubicOut).delay(function(_,i){return i*18+si*8;})
          .attr("x",function(d){return x(d[0]);}).attr("width",function(d){return Math.max(0,x(d[1])-x(d[0]));});
        if(showVL){
          series.forEach(function(d){
            var bx=x(d[0]),bw=x(d[1])-x(d[0]),by=y(d.data.category),bh=y.bandwidth();
            _drawLabel(g,catBoxH[d.data.category],bx,by,bw,bh,d[1]-d[0],true,labelO,false);
          });
        }
      });
    } else {
      /* Responsive stacked vertical — fill container; 10px floor */
      var minW=10;
      var W2=Math.max(W,data.categories.length * minW / (1 - S.piInner));
      var xV=d3.scaleBand().domain(data.categories).range([0,W2]).paddingInner(S.piInner).paddingOuter(S.piOuter);
      var maxVv=d3.max(sd[sd.length-1],function(d){return d[1];})||1;
      var yV=d3.scaleLinear().domain([0,maxVv*1.1]).nice().range([H,0]);
      if(W2>W) g.attr("data-scrollw",W2);
      if(cfg.showGrid!==false) _hgrid(g,yV,W2,false);
      _axisX(g,xV,H,cfg,cfg.xShowTitle?dimT:null,tip);
      _axisY(g,yV,cfg,cfg.yShowTitle?msrT:null,H,tip);
      _baseline(g,W2,H);
      /* FIX: per-category bboxes for stacked vertical. */
      var catBoxV = {};
      data.categories.forEach(function(c){ catBoxV[c]=[]; });
      sd.forEach(function(series,si){
        var color=_resolveColor(layout,pal,series.key||data.seriesKeys[si]||"",si,0);
        g.selectAll(".seg"+si).data(series).enter().append("rect").attr("class","seg"+si)
          .attr("x",function(d){return xV(d.data.category);}).attr("width",xV.bandwidth()).attr("y",H).attr("height",0)
          .attr("fill",color)
          .attr("data-cat",function(d){return d.data.category;}).attr("data-lbl",series.key).attr("data-val",function(d){return _fmt(d[1]-d[0]);})
          .transition().duration(S.animDur).ease(d3.easeCubicOut).delay(function(_,i){return i*18+si*8;})
          .attr("y",function(d){return yV(d[1]);}).attr("height",function(d){return Math.max(0,yV(d[0])-yV(d[1]));});
        if(showVL){
          series.forEach(function(d){
            var bx=xV(d.data.category),bw=xV.bandwidth(),by=yV(d[1]),bh=yV(d[0])-yV(d[1]);
            _drawLabel(g,catBoxV[d.data.category],bx,by,bw,bh,d[1]-d[0],false,labelO,false);
          });
        }
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     MODE 3 — NESTED / INSET
     • Parent/consolidated value always at bar TIP (atTip=true)
     • Child values follow labelOrientation setting
     • minBarWidth / minBarHeight independent
  ════════════════════════════════════════════════════════════════════════ */
  function _nested(g, svg, el, data, cfg, pal, layout, tip) {
    var horiz=cfg.orientation!=="vertical";
    var labelO=cfg.labelOrientation||"horizontal";
    var showVL=cfg.showValueLabels!==false;
    var pk=data.parentKey||data.seriesKeys[0];
    var ck=(data.childKeys&&data.childKeys.length)?data.childKeys:data.seriesKeys.filter(function(k){return k!==pk;});
    var W=+g.attr("data-w"),H=+g.attr("data-h"),lm=+g.attr("data-leftmargin")||100;
    var nc=ck.length||1;
    var dimT=_dimTitle(layout);

    if (horiz) {
      /* ── Horizontal nested (categories on Y) ──
         rowH = FIXED row height per category (slider controls this directly).
         AUTO-EXPAND: ensure rowH is large enough to fit all label lines.
         nMeasures × (fontSize+5) = minimum row height for readable labels. */
      var fs   = Math.max(9, S.fontSize - 1);
      var th   = fs + 2;
      var gap2 = 3;
      var nM   = 1 + nc; /* parent + children */

      /* Responsive sizing: bars fill the container.
         Floor = max(minRowForLabels, so labels fit, 10px per child bar).
         If container already gives more space per row → use it (no scroll).
         Scroll only kicks in when container < minimum needed.              */
      var minBarPx = 10; /* absolute minimum bar height */
      var minRowForLabels = showVL ? nM * (th + gap2) + 10 : 20;
      var minRowForBars   = nM * minBarPx + 10; /* 10px per bar + padding */
      var minRowH = Math.max(minRowForLabels, minRowForBars);

      /* Natural row height if we fill the container evenly */
      var naturalRowH = H / Math.max(data.categories.length, 1) * (1 - 0.2);
      /* Use natural size if >= minimum, else use minimum (triggers scroll) */
      var rowH = Math.max(minRowH, naturalRowH);

      var h = Math.max(H, data.categories.length * rowH / (1 - 0.2));
      if(h > H){ svg.attr("height", h + 76); el.style.overflowY="auto"; el.style.overflowX="hidden"; }
      else { el.style.overflow="hidden"; }

      var maxParent=d3.max(data.rows,function(r){return r[pk]||0;})||1;
      var x=d3.scaleLinear().domain([0,maxParent*1.08]).range([0,W]);
      var y=d3.scaleBand().domain(data.categories).range([0,h]).paddingInner(0.2).paddingOuter(0.08);

      if(cfg.showGrid!==false) _hgrid(g,x,h,true);
      var xAxG=g.append("g").attr("transform","translate(0,"+h+")").call(d3.axisBottom(x).ticks(5).tickFormat(_fmt).tickSize(0));
      xAxG.select(".domain").attr("stroke",S.axisColor);xAxG.selectAll("text").attr("fill",S.labelColor).style("font-size",S.fontSize+"px").style("font-family",S.fontFamily);
      if(tip) _axisTooltip(xAxG,tip);
      _axisYCat(g,y,lm,true,tip,cfg.yLabelOrientation==="full");
      _leftline(g,h);

      /* Reserve right-side label column width so bars don't overlap labels.
         Estimate max label text width + swatch + gap.                       */
      var maxLabelW = 60; /* px reserved on right side for label column */
      var xRange = W - maxLabelW; /* bars draw within [0, xRange] */
      x = d3.scaleLinear().domain([0,maxParent*1.08]).range([0, Math.max(xRange, 60)]);

      var oh=y.bandwidth(), gap=Math.max(1,oh*0.06);
      var ch=Math.max(3,(oh*(1-0.28)-gap*(nc-1))/nc);
      var childTop=(oh-nc*ch-(nc-1)*gap)/2;

      /* Label column: right-aligned to chart width */
      var colX = xRange + 8; /* fixed x for all labels in all rows */
      var stepL = th + gap2; /* vertical step between stacked labels */

      data.rows.forEach(function(row,ri){
        var cy=y(row.category),pw=x(row[pk]||0);

        /* Parent ghost bar */
        g.append("rect").attr("x",0).attr("y",cy).attr("width",0).attr("height",oh)
          .attr("fill","#c8c7c0").attr("stroke","#888780").attr("stroke-width","0.8").attr("opacity",1)
          .attr("data-cat",row.category).attr("data-lbl",pk).attr("data-val",_fmt(row[pk]))
          .transition().duration(S.animDur).ease(d3.easeCubicOut).attr("width",pw);

        ck.forEach(function(k,ci){
          var cv=row[k]||0,cw=x(cv),cly=cy+childTop+ci*(ch+gap),clipId="c"+ri+"_"+ci;
          g.append("clipPath").attr("id",clipId).append("rect").attr("x",0).attr("y",cly).attr("width",pw).attr("height",ch);
          g.append("rect").attr("clip-path","url(#"+clipId+")").attr("x",0).attr("y",cly).attr("width",0).attr("height",ch)
            .attr("fill",_resolveColor(layout,pal,k,ci+1,0))
            .attr("data-cat",row.category).attr("data-lbl",k).attr("data-val",_fmt(cv))
            .transition().duration(S.animDur).ease(d3.easeCubicOut).delay(ci*14).attr("width",cw);
        });

        /* ── LABEL COLUMN SYSTEM for horizontal bars ──────────────────────
           Design rules (per user requirement):
           • ALL labels appear in a FIXED right-side column (colX)
           • Labels stack VERTICALLY — one per measure, parent first
           • Each label has a COLOUR SWATCH on its left (5px wide)
           • A SHORT HORIZONTAL TICK (6px) connects swatch to label text
           • A VERTICAL DASHED LINE runs from bar tip downward to the
             swatch, showing which bar the label belongs to
           • No long cross-chart lines — leaders stay short (≤ 10px)
           • Row height is auto-expanded to fit all labels cleanly         */
        if (showVL) {
          /* Ordered list: parent first, then children in measure order */
          var allBars = [{
            val:      row[pk]||0,
            barRightX: pw,
            barCY:    cy + oh/2,
            color:    pal[0],
            isParent: true
          }];
          ck.forEach(function(k,ci){
            var cw2 = x(row[k]||0);
            allBars.push({
              val:       row[k]||0,
              barRightX: Math.min(cw2, pw),
              barCY:     cy + childTop + ci*(ch+gap) + ch/2,
              color:     _resolveColor(layout,pal,k,ci+1,0),
              isParent:  false
            });
          });

          /* Parent swatch color = gray (matches gray parent bar) */
          allBars[0].color = "#888780";

          allBars.forEach(function(bar, idx){
            var text = _fmt(bar.val);
            if (!text) return;

            /* Label Y: evenly distributed within the row, starting near top */
            var labelCY = cy + 4 + idx * stepL + th/2;
            var swatchX = colX;

            /* ── Colour swatch ── */
            g.append("rect")
              .attr("x", swatchX).attr("y", labelCY - th/2 + 1)
              .attr("width", 6).attr("height", th - 2)
              .attr("rx", 1).attr("fill", bar.color)
              .style("pointer-events","none");

            /* ── Short horizontal tick from swatch to label value ── */
            g.append("line")
              .attr("x1", swatchX + 8).attr("y1", labelCY)
              .attr("x2", swatchX + 12).attr("y2", labelCY)
              .attr("stroke", S.axisColor).attr("stroke-width", 0.8)
              .style("pointer-events","none");

            /* ── HORIZONTAL colour-matched connector: bar right tip → swatch ──
               Solid line when bar tip is close to label column (≥ colX-20).
               Dashed line when bar tip is far (small bar).
               Line runs at bar.barCY (bar's vertical centre) then a short
               vertical tick drops to labelCY so it lands on the swatch.     */
            var tipX = Math.max(bar.barRightX, 1);
            var lineY = bar.barCY;
            var isSolid = tipX >= colX - 20;

            /* Horizontal leg: from bar tip to just before label column.
               tipX clamped to xRange so it never draws into the label area. */
            var clampedTipX = Math.min(tipX, xRange);
            g.append("line")
              .attr("x1", clampedTipX).attr("y1", lineY)
              .attr("x2", swatchX - 2).attr("y2", lineY)
              .attr("stroke", bar.color)
              .attr("stroke-width", isSolid ? 1.2 : 0.8)
              .attr("stroke-dasharray", isSolid ? "none" : "4,2")
              .attr("opacity", isSolid ? 0.9 : 0.65)
              .style("pointer-events","none");

            /* Vertical leg: from bar centre Y down/up to label row Y */
            if (Math.abs(lineY - labelCY) > 2) {
              g.append("line")
                .attr("x1", swatchX - 2).attr("y1", lineY)
                .attr("x2", swatchX - 2).attr("y2", labelCY)
                .attr("stroke", bar.color)
                .attr("stroke-width", 0.7)
                .attr("stroke-dasharray", "2,2")
                .attr("opacity", 0.5)
                .style("pointer-events","none");
            }

            /* Small dot at bar tip for visual anchor */
            if (tipX > 3) {
              g.append("circle")
                .attr("cx", tipX).attr("cy", lineY).attr("r", 2)
                .attr("fill", bar.color).attr("opacity", 0.7)
                .style("pointer-events","none");
            }

            /* ── Label value text ── */
            g.append("text")
              .attr("x", swatchX + 14).attr("y", labelCY).attr("dy","0.35em")
              .attr("fill", S.labelColor)
              .style("font-size", fs + "px")
              .style("font-weight", bar.isParent ? "600" : "400")
              .style("font-family", S.fontFamily)
              .style("pointer-events","none")
              .text(text);
          });
        }
      });

    } else {
      /* ── Vertical nested (categories on X, bars go up) ──
         FIX: Use correct formula so minBarWidth = actual rendered bar px width.
         Each parent band = ow. Child bars within it share (ow × 0.72).
         We want cw2 (child bar width) = minBarWidth.
         So: cw2 = (ow × (1-0.28) - gapV × (nc-1)) / nc = minBarWidth
         → ow = (minBarWidth × nc + gapEstimate × (nc-1)) / (1-0.28)
         Approximate: ow = minBarWidth × nc / 0.72 + gaps
         W2 = nCats × ow / (1-piInner)                                       */
      /* Responsive sizing: fill container first, scroll only when bars < 10px.
         Natural column width = W / nCats. If that gives child bars ≥ 10px → use it.
         Otherwise expand to ensure 10px per child bar.                            */
      var minBarPxV = 10; /* absolute minimum child bar width */
      var gapEstV   = 3;
      /* Min band width to get 10px child bars */
      var owMin = (minBarPxV * nc + gapEstV * (nc-1)) / (1-0.28) + 8;
      /* Natural band width from container */
      var owNatural = (W / Math.max(data.categories.length,1)) * (1-S.piInner);
      var owNeeded = Math.max(owMin, owNatural);
      var W2 = Math.max(W, data.categories.length * owNeeded / (1-S.piInner));
      var w = W2;
      if(w > W) g.attr("data-scrollw", w);

      var maxParentV=d3.max(data.rows,function(r){return r[pk]||0;})||1;
      var yN=d3.scaleLinear().domain([0,maxParentV*1.08]).range([H,0]);
      var xN=d3.scaleBand().domain(data.categories).range([0,w]).paddingInner(0.2).paddingOuter(0.08);

      if(cfg.showGrid!==false) _hgrid(g,yN,w,false);
      _axisX(g,xN,H,cfg,cfg.xShowTitle?dimT:null,tip);
      _axisY(g,yN,cfg,null,H,tip);
      _baseline(g,w,H);

      var ow=xN.bandwidth(),gapV=Math.max(1,ow*0.06);
      var cw2=Math.max(3,(ow*(1-0.28)-gapV*(nc-1))/nc);
      var childLeft=(ow-nc*cw2-(nc-1)*gapV)/2;

      /* Pre-compute label metrics */
      var fs2   = Math.max(9, S.fontSize - 1);
      var th2   = fs2 + 2;
      var gap3  = 3;
      var stepV = th2 + gap3;

      /* ── Fixed swatch band ────────────────────────────────────────────────
         swatchBandY = y coordinate (in g-space) of the top of the swatch rects.
         We place swatches at a fixed distance from y=0 (chart top edge).
         The value text above swatches needs extra space:
           tilted45  → text sweeps diagonally: reserve ≈ maxTextLen * 0.7 px
           vertical90 → text stands upright: reserve ≈ longest label text * fs2
         The g element is translated by margin.top (24px).
         swatchBandY is chosen so swatches are always fully visible:
           swatchBandY = 4  (4px below chart top in g-space)
         Value text above that extends to negative y (above chart area).
         To keep them visible, the SVG has overflow:visible AND the outer
         chartWrap now gets overflow:visible when in top-panel mode.          */
      var useTopPanelMode = (showVL && (labelO==="tilted45"||labelO==="vertical90"));
      var swatchBandY     = 4;   /* fixed: 4px below chart g top */

      data.rows.forEach(function(row,ri){
        var cx=xN(row.category), ph=H-yN(row[pk]||0);
        /* Parent ghost bar */
        g.append("rect").attr("x",cx).attr("y",H).attr("width",ow).attr("height",0)
          .attr("fill","#c8c7c0").attr("stroke","#888780").attr("stroke-width","0.8").attr("opacity",1)
          .attr("data-cat",row.category).attr("data-lbl",pk).attr("data-val",_fmt(row[pk]))
          .transition().duration(S.animDur).ease(d3.easeCubicOut).attr("y",yN(row[pk]||0)).attr("height",ph);

        ck.forEach(function(k,ci){
          var cv=row[k]||0,cvH=H-yN(cv),clx=cx+childLeft+ci*(cw2+gapV),clipId="cv"+ri+"_"+ci;
          var clipY=yN(row[pk]||0);
          g.append("clipPath").attr("id",clipId).append("rect").attr("x",clx).attr("y",clipY).attr("width",cw2).attr("height",H-clipY);
          g.append("rect").attr("clip-path","url(#"+clipId+")").attr("x",clx).attr("y",H).attr("width",cw2).attr("height",0)
            .attr("fill",_resolveColor(layout,pal,k,ci+1,0))
            .attr("data-cat",row.category).attr("data-lbl",k).attr("data-val",_fmt(cv))
            .transition().duration(S.animDur).ease(d3.easeCubicOut).delay(ci*14)
            .attr("y",yN(cv)).attr("height",Math.min(cvH,H-clipY));
        }); /* end ck.forEach */

        if (!showVL) return;

        /* ── FIXED-TOP SWATCH LABEL SYSTEM for nested vertical bars ──────────
           Design (confirmed):
           • ALL swatches sit at the SAME fixed y (swatchY) regardless of
             bar height — consistent horizontal strip at the top of the chart.
           • Values appear ABOVE their swatch, tilted 45° or rotated 90°
             (user selects "Above bar — Tilted 45°" or "Above bar — Vertical 90°"
             in Label orientation dropdown; other modes use _drawLabel as before).
           • Colour-matched DASHED VERTICAL LINE from swatch bottom straight
             down to the bar's own tip — short for tall bars, long for short bars.
           • A short HORIZONTAL dashed line from bar x-centre to swatch x
             for child bars that are horizontally offset from the swatch.
           • Parent swatch is GRAY (#888780) matching the gray parent bar.
           • Parent value is BOLD.
           • Swatches are evenly spread L→R within the column band.
        ─────────────────────────────────────────────────────────────────── */

        var lO = labelO; /* "tilted45" | "vertical90" | other (handled by _drawLabel) */
        var useTopPanel = (lO === "tilted45" || lO === "vertical90");

        if (!useTopPanel) {
          /* Non-top-panel modes: fall back to per-bar _drawLabel (colBox) */
          var colBoxFB = [];
          ck.forEach(function(k,ci){
            var cv=row[k]||0,cvH2=H-yN(cv),clx2=cx+childLeft+ci*(cw2+gapV);
            _drawLabel(g,colBoxFB,clx2,yN(cv),cw2,Math.min(cvH2,H-yN(row[pk]||0)),cv,false,lO,false);
          });
          _drawLabel(g,colBoxFB,cx,yN(row[pk]||0),ow,H-yN(row[pk]||0),row[pk],false,lO,true);
          return;
        }

        /* Fixed swatch band: swatches sit at swatchY (bottom of swatch rect).
           This is the same y for every column regardless of bar height.
           swatchY is pre-computed outside the forEach (see below).           */

        /* Build ordered list: children left→right, parent rightmost (or first) */
        var labelsTop = [];
        /* Parent first at leftmost swatch position (position 0) */
        labelsTop.push({
          val:      row[pk] || 0,
          barCX:    cx + ow / 2,
          barTipY:  yN(row[pk] || 0),
          color:    "#888780",  /* gray for parent */
          isParent: true
        });
        ck.forEach(function(k,ci){
          labelsTop.push({
            val:      row[k] || 0,
            barCX:    cx + childLeft + ci*(cw2+gapV) + cw2/2,
            barTipY:  yN(row[k] || 0),
            color:    pal[(ci+1) % pal.length],
            isParent: false
          });
        });

        var nLabels  = labelsTop.length;
        var swatchW  = 10;  /* swatch rect width */
        var swatchH  = 6;   /* swatch rect height */
        /* Distribute swatches evenly across the column band */
        var swatchStep = Math.max(swatchW + 4, (ow - swatchW) / Math.max(nLabels - 1, 1));

        labelsTop.forEach(function(bar, idx){
          var text2 = _fmt(bar.val);
          if (!text2) return;

          /* Swatch x: evenly spread, left-aligned within column */
          var sx = cx + 2 + idx * swatchStep;
          /* Fixed top: swatchBandY is computed once before this forEach */
          var sy = swatchBandY;

          /* ── Colour swatch ── */
          g.append("rect")
            .attr("x", sx).attr("y", sy)
            .attr("width", swatchW).attr("height", swatchH)
            .attr("rx", 1).attr("fill", bar.color)
            .style("pointer-events","none");

          /* ── Value text above swatch ── */
          var textX = sx + swatchW/2;
          var textY = sy - 3; /* just above swatch top */
          if (lO === "tilted45") {
            g.append("text")
              .attr("transform","translate("+textX+","+textY+") rotate(-45)")
              .attr("text-anchor","start")
              .attr("fill", S.labelColor)
              .style("font-size", fs2+"px")
              .style("font-weight", bar.isParent ? "600" : "400")
              .style("font-family", S.fontFamily)
              .style("pointer-events","none")
              .text(text2);
          } else {
            /* vertical90 */
            g.append("text")
              .attr("transform","translate("+textX+","+textY+") rotate(-90)")
              .attr("text-anchor","start")
              .attr("fill", S.labelColor)
              .style("font-size", fs2+"px")
              .style("font-weight", bar.isParent ? "600" : "400")
              .style("font-family", S.fontFamily)
              .style("pointer-events","none")
              .text(text2);
          }

          /* ── Vertical dashed line from swatch bottom down to bar tip ──
               Clamped to H (baseline) so lines never extend below the axis. ── */
          var lineStartY = sy + swatchH + 1;
          var lineEndY   = Math.min(bar.barTipY - 1, H - 1); /* clamp at baseline */
          if (lineEndY > lineStartY + 2) {
            g.append("line")
              .attr("x1", sx + swatchW/2).attr("y1", lineStartY)
              .attr("x2", sx + swatchW/2).attr("y2", lineEndY)
              .attr("stroke", bar.color).attr("stroke-width", 0.7)
              .attr("stroke-dasharray","3,2").attr("opacity", 0.65)
              .style("pointer-events","none");
          }

          /* ── Short horizontal dashed from bar x-centre to swatch centre ──
                 Only drawn when bar is horizontally offset from swatch.       */
          var swatchCX = sx + swatchW/2;
          if (Math.abs(bar.barCX - swatchCX) > 4) {
            g.append("line")
              .attr("x1", bar.barCX).attr("y1", bar.barTipY - 1)
              .attr("x2", swatchCX).attr("y2", bar.barTipY - 1)
              .attr("stroke", bar.color).attr("stroke-width", 0.5)
              .attr("stroke-dasharray","2,2").attr("opacity", 0.45)
              .style("pointer-events","none");
          }
        });

      }); /* end data.rows.forEach */
    } /* end else (vertical nested) */
  } /* end _nested */

  /* ═══════════════════════════════════════════════════════════════════════
     LEGEND  (fixed div; legendPosition="hidden" hides it)
  ════════════════════════════════════════════════════════════════════════ */
  function _buildLegend(container, keys, pal, position) {
    var isVert=position==="left"||position==="right";
    var div=document.createElement("div");
    div.style.cssText=["display:flex","flex-wrap:wrap","align-items:center","gap:6px 14px",
      isVert?"flex-direction:column":"flex-direction:row",
      isVert?"align-items:flex-start":"justify-content:center",
      "padding:6px 8px","flex-shrink:0",
      "font-family:"+S.fontFamily,"font-size:11px","color:"+S.labelColor,
      isVert?"width:auto;max-width:130px":"width:100%"].join(";");
    keys.forEach(function(key,i){
      var item=document.createElement("div");
      item.style.cssText="display:flex;align-items:center;gap:5px;min-width:0;cursor:default;";
      var sw=document.createElement("span");
      sw.style.cssText="width:10px;height:10px;flex-shrink:0;background:"+pal[i%pal.length]+";display:inline-block;";
      var lb=document.createElement("span");
      lb.style.cssText="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:110px;";
      lb.title=key;lb.textContent=key;
      item.appendChild(sw);item.appendChild(lb);div.appendChild(item);
    });
    container.appendChild(div);return div;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     EMPTY STATE
  ════════════════════════════════════════════════════════════════════════ */
  function _showEmpty(el){
    el.innerHTML='<div style="height:100%;min-height:80px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;font:12px \'Source Sans Pro\',sans-serif;color:#aaa;"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/></svg><span>Add a dimension and measures to display the chart</span></div>';
  }

  /* ═══════════════════════════════════════════════════════════════════════
     MAIN RENDER
  ════════════════════════════════════════════════════════════════════════ */
  function _renderChart(el, layout, qTheme) {
    el.innerHTML="";el.style.position="relative";
    if(!d3||typeof d3.scaleBand!=="function"){
      el.innerHTML='<div style="padding:16px;font:12px sans-serif;color:#c00;">FlexBarChart: D3 not loaded.</div>';return;
    }
    var data=_parseData(layout);
    var cfg=layout.chartConfig||{};
    var mode=cfg.renderMode||"grouped";
    var pal=_resolvePalette(layout,qTheme);

    /* Legend: legendPosition controls both visibility and position */
    var legPos=(layout.legendConfig&&layout.legendConfig.position)||"bottom";
    var showLeg=legPos!=="hidden";

    if(!data.categories||!data.categories.length){_showEmpty(el);return;}

    var legSize=showLeg?(legPos==="left"||legPos==="right"?130:36):0;
    var isVertLeg=legPos==="left"||legPos==="right";

    var nMeasures = (data.seriesKeys && data.seriesKeys.length) || 1;

    /* For nested vertical with top-panel labels, increase margin.top so
       value text above swatches (tilted or rotated) is never cut off.
       tilted45:   text sweeps ~45° → needs ≈ (longest label) * 0.7 px ≈ 55px
       vertical90: text stands upright → needs ≈ 50px
       Other modes: 24px is fine.                                          */
    var isNestedVertTopPanel = (mode==="nested" &&
      cfg.orientation!=="horizontal" &&
      cfg.showValueLabels!==false &&
      (cfg.labelOrientation==="tilted45"||cfg.labelOrientation==="vertical90"));
    var topMargin = isNestedVertTopPanel ? 55 : 24;

    var margin={
      top:    topMargin,
      right:  20,
      bottom: 44,
      left:   mode==="nested" && cfg.orientation!=="vertical" ? 80 : 56
    };

    var totalW=Math.max(el.clientWidth||el.offsetWidth||400,200);
    var totalH=Math.max(el.clientHeight||el.offsetHeight||300,120);

    var outer=document.createElement("div");
    outer.style.cssText="width:100%;height:100%;display:flex;overflow:hidden;"+(isVertLeg?"flex-direction:row;":"flex-direction:column;")+"align-items:stretch;";
    el.appendChild(outer);

    /* ── Legend palette: in Nested mode the parent/consolidated bar is
       rendered gray (#c8c7c0 fill / #888780 border). Override pal[0]
       in the legend palette so the legend swatch matches the bar and
       the label swatch — all three consistent. Other modes unaffected. */
    var legPal = pal.slice(); /* copy so chart rendering palette is untouched */
    if (mode === "nested") legPal[0] = "#888780";

    if(showLeg&&(legPos==="top"||legPos==="left")) _buildLegend(outer,data.seriesKeys,legPal,legPos);

    var chartWrap=document.createElement("div");
    chartWrap.style.cssText="flex:1;overflow:hidden;position:relative;min-width:0;min-height:0;";
    /* For nested vertical top-panel labels, allow SVG text to overflow upward */
    if(isNestedVertTopPanel) chartWrap.style.overflow="visible";
    outer.appendChild(chartWrap);

    if(showLeg&&(legPos==="bottom"||legPos==="right")) _buildLegend(outer,data.seriesKeys,legPal,legPos);

    var cW=totalW-(isVertLeg?legSize:0);
    var cH=totalH-(!isVertLeg?legSize:0);
    var w=cW-margin.left-margin.right;
    var h=cH-margin.top-margin.bottom;
    if(w<30||h<30) return;

    /* Shared tooltip div */
    var tip=(layout.tooltipConfig||{}).show!==false ? _makeTip(chartWrap) : null;

    var svg=d3.select(chartWrap).append("svg").attr("width",cW).attr("height",cH).style("overflow","visible");
    var g=svg.append("g").attr("transform","translate("+margin.left+","+margin.top+")")
      .attr("data-w",w).attr("data-h",h).attr("data-leftmargin",margin.left);

    if      (mode==="stacked") _stacked(g,data,cfg,pal,layout,tip);
    else if (mode==="nested")  _nested(g,svg,chartWrap,data,cfg,pal,layout,tip);
    else                       _grouped(g,data,cfg,pal,layout,tip);

    var sw=g.attr("data-scrollw"),sh=g.attr("data-scrollh");
    if(sw){chartWrap.style.overflowX="auto";svg.attr("width",+sw+margin.left+margin.right);}
    if(sh){chartWrap.style.overflowY="auto";svg.attr("height",+sh+margin.top+margin.bottom);}

    if(tip) {
      var contentFn = _attachBarTooltip(chartWrap,data,layout,tip);
      /* Attach full-row tooltip ONLY to DIMENSION (category) axis labels.
         data-iscat="1" is set on scaleBand tick labels; value axis labels do NOT
         have this attribute so they never trigger the full-row tooltip.          */
      if (contentFn) {
        chartWrap.querySelectorAll("g text[data-iscat='1']").forEach(function(node) {
          var full = node.getAttribute("data-full");
          if (!full) return;
          /* Build the tooltip content — if category not found, just show the name */
          node.addEventListener("mouseenter", function(e) {
            tip.innerHTML = contentFn(full);
            tip.style.opacity = "1";
            var b = chartWrap.getBoundingClientRect();
            var OFFSET=5;
            var left=e.clientX-b.left+OFFSET;
            var top=e.clientY-b.top+OFFSET;
            tip.style.left = left + "px";
            tip.style.top  = top  + "px";
          });
          node.addEventListener("mousemove", function(e) {
            var b = chartWrap.getBoundingClientRect();
            var tw=tip.offsetWidth||160, th=tip.offsetHeight||80;
            var OFFSET=5;
            var left=e.clientX-b.left+OFFSET;
            var top=e.clientY-b.top+OFFSET;
            if(left+tw>chartWrap.clientWidth-4) left=e.clientX-b.left-tw-OFFSET;
            if(top+th>chartWrap.clientHeight-4) top=e.clientY-b.top-th-OFFSET;
            tip.style.left = left + "px";
            tip.style.top  = top  + "px";
          });
          node.addEventListener("mouseleave", function() { tip.style.opacity = "0"; });
        });
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     PROPERTY PANEL
  ════════════════════════════════════════════════════════════════════════ */
  var DEF={type:"items",component:"accordion",items:{

    dimensions:{uses:"dimensions",min:1,max:1},

    measures:{type:"items",label:"Measures",items:{
      measuresPanel:{uses:"measures",min:1,max:10}
    }},

    sorting:{label:"Sorting",type:"items",items:{
      sortOrder:{ref:"chartConfig.sortOrder",label:"Sort by",type:"string",component:"dropdown",
        options:[{value:"none",label:"Load order (default)"},{value:"asc",label:"Dimension A → Z"},{value:"desc",label:"Dimension Z → A"},{value:"valueAsc",label:"First measure ascending"},{value:"valueDesc",label:"First measure descending"}],
        defaultValue:"none"},
      sortNote:{label:"Drag dimensions and measures above to change their order.",component:"text"}
    }},

    addons:{label:"Add-ons",type:"items",items:{note:{label:"No add-ons configured.",component:"text"}}},

    appearance:{label:"Appearance",type:"items",items:{

      /* ═══ GENERAL ═══════════════════════════════════════════════════════ */
      sepGeneral:{label:"── General ────────────────────────────────────────",component:"text"},
      showTitles:{ref:"showTitles",label:"Show titles",type:"boolean",component:"switch",defaultValue:true},
      title:{ref:"title",label:"Title",type:"string",expression:"optional",defaultValue:"",
        show:function(l){return l.showTitles!==false;}},

      /* ═══ PRESENTATION ══════════════════════════════════════════════════ */
      sepPresent:{label:"── Presentation ───────────────────────────────────",component:"text"},
      renderMode:{ref:"chartConfig.renderMode",label:"Chart mode",type:"string",component:"dropdown",
        options:[
          {value:"grouped",label:"Grouped"},
          {value:"stacked",label:"Stacked"},
          {value:"nested", label:"Nested / Inset"}
        ],defaultValue:"grouped"},
      orientationNested:{ref:"chartConfig.orientation",label:"Bar direction",type:"string",component:"dropdown",
        options:[{value:"horizontal",label:"Horizontal"},{value:"vertical",label:"Vertical"}],
        defaultValue:"horizontal",
        show:function(l){return l.chartConfig&&l.chartConfig.renderMode==="nested";}},
      orientationOther:{ref:"chartConfig.orientation",label:"Bar direction",type:"string",component:"dropdown",
        options:[{value:"vertical",label:"Vertical"},{value:"horizontal",label:"Horizontal"}],
        defaultValue:"vertical",
        show:function(l){return !l.chartConfig||l.chartConfig.renderMode!=="nested";}},
      nestedParentKey:{ref:"chartConfig.nestedParentKey",label:"Consolidated / parent measure",
        type:"string",component:"dropdown",defaultValue:"",
        options:function(l){
          var hc=l&&l.qHyperCube;
          if(!hc||!hc.qMeasureInfo||!hc.qMeasureInfo.length)return[{value:"",label:"(add measures first)"}];
          return hc.qMeasureInfo.map(function(m){var lb=m.qFallbackTitle||m.qLabel||"(unnamed)";return{value:lb,label:lb};});
        },
        show:function(l){return l.chartConfig&&l.chartConfig.renderMode==="nested";}},
      showGrid:{ref:"chartConfig.showGrid",label:"Show grid lines",type:"boolean",component:"switch",defaultValue:true},

      /* ═══ DATA POINTS (value labels) ════════════════════════════════════ */
      sepLabels:{label:"── Data points ────────────────────────────────────",component:"text"},
      showValueLabels:{ref:"chartConfig.showValueLabels",label:"Show data point values",type:"boolean",component:"switch",defaultValue:true},
      labelOrientation:{ref:"chartConfig.labelOrientation",label:"Value label style",type:"string",component:"dropdown",
        options:[
          {value:"horizontal", label:"Horizontal — at bar tip"},
          {value:"vertical",   label:"Vertical — rotated inside bar"},
          {value:"tilted",     label:"Tilted 45° — at bar tip"},
          {value:"tilted45",   label:"Above bar: Tilted 45° (nested vertical)"},
          {value:"vertical90", label:"Above bar: Vertical 90° (nested vertical)"},
          {value:"auto",       label:"Auto"}
        ],
        defaultValue:"horizontal",
        show:function(l){return !l.chartConfig||l.chartConfig.showValueLabels!==false;}},

      /* ═══ COLORS ═════════════════════════════════════════════════════════ */
      sepColors:{label:"── Colors ──────────────────────────────────────────",component:"text"},
      /* ── Color source: dropdown is most reliable across QSEoW versions ── */
      useAppTheme:{ref:"colorConfig.useAppTheme",label:"Colors",type:"string",component:"dropdown",
        options:[
          {value:"true", label:"Inherit from app theme (auto)"},
          {value:"false",label:"Set colors manually"}
        ],
        defaultValue:"true"},
      coloringMode:{ref:"colorConfig.coloringMode",label:"Coloring mode",type:"string",component:"dropdown",
        options:[
          {value:"measure",   label:"By measure — each series gets its own color"},
          {value:"dimension", label:"By dimension — each category gets its own color"},
          {value:"single",    label:"Single color — all bars the same color"}
        ],
        defaultValue:"measure",
        show:function(l){return l.colorConfig&&l.colorConfig.useAppTheme==="false";}},
      singleColorHex:{ref:"colorConfig.singleColorHex",label:"Bar color (hex, e.g. #4477aa)",type:"string",defaultValue:"",
        show:function(l){return l.colorConfig&&l.colorConfig.useAppTheme==="false"&&l.colorConfig.coloringMode==="single";}},
      palettePreset:{ref:"colorConfig.palettePreset",label:"Color palette",type:"string",component:"dropdown",
        options:[
          {value:"qlik",      label:"Qlik    #4477aa #66aadd #cc6677 #882255 #44aa99 #117733"},
          {value:"classic",   label:"Classic #1f77b4 #ff7f0e #2ca02c #d62728 #9467bd #8c564b"},
          {value:"pastel",    label:"Pastel  #a6cee3 #b2df8a #fb9a99 #fdbf6f #cab2d6 #ffff99"},
          {value:"bold",      label:"Bold    #e41a1c #377eb8 #4daf4a #984ea3 #ff7f00 #ffff33"},
          {value:"diverging", label:"Diverg  #d73027 #f46d43 #fdae61 #4575b4 #74add1 #abd9e9"},
          {value:"mono",      label:"Mono    #08306b #08519c #2171b5 #4292c6 #6baed6 #9ecae1"}
        ],
        defaultValue:"qlik",
        show:function(l){return l.colorConfig&&l.colorConfig.useAppTheme==="false"&&l.colorConfig.coloringMode!=="single";}},
      customCsv:{ref:"colorConfig.customCsv",label:"Custom hex colors (comma-separated)",type:"string",defaultValue:"",
        show:function(l){return l.colorConfig&&l.colorConfig.useAppTheme==="false"&&l.colorConfig.coloringMode!=="single";}},
      /* Per-measure hex overrides — reliable string inputs */
      measureColor0:{ref:"colorConfig.measureColors.m0",label:"Measure 1 color (hex)",type:"string",defaultValue:"",
        show:function(l){var hc=l&&l.qHyperCube;return l.colorConfig&&l.colorConfig.useAppTheme==="false"&&l.colorConfig.coloringMode==="measure"&&hc&&hc.qMeasureInfo&&hc.qMeasureInfo.length>=1;}},
      measureColor1:{ref:"colorConfig.measureColors.m1",label:"Measure 2 color (hex)",type:"string",defaultValue:"",
        show:function(l){var hc=l&&l.qHyperCube;return l.colorConfig&&l.colorConfig.useAppTheme==="false"&&l.colorConfig.coloringMode==="measure"&&hc&&hc.qMeasureInfo&&hc.qMeasureInfo.length>=2;}},
      measureColor2:{ref:"colorConfig.measureColors.m2",label:"Measure 3 color (hex)",type:"string",defaultValue:"",
        show:function(l){var hc=l&&l.qHyperCube;return l.colorConfig&&l.colorConfig.useAppTheme==="false"&&l.colorConfig.coloringMode==="measure"&&hc&&hc.qMeasureInfo&&hc.qMeasureInfo.length>=3;}},
      measureColor3:{ref:"colorConfig.measureColors.m3",label:"Measure 4 color (hex)",type:"string",defaultValue:"",
        show:function(l){var hc=l&&l.qHyperCube;return l.colorConfig&&l.colorConfig.useAppTheme==="false"&&l.colorConfig.coloringMode==="measure"&&hc&&hc.qMeasureInfo&&hc.qMeasureInfo.length>=4;}},
      measureColor4:{ref:"colorConfig.measureColors.m4",label:"Measure 5 color (hex)",type:"string",defaultValue:"",
        show:function(l){var hc=l&&l.qHyperCube;return l.colorConfig&&l.colorConfig.useAppTheme==="false"&&l.colorConfig.coloringMode==="measure"&&hc&&hc.qMeasureInfo&&hc.qMeasureInfo.length>=5;}},

      /* ═══ LEGEND ═════════════════════════════════════════════════════════ */
      sepLegend:{label:"── Legend ──────────────────────────────────────────",component:"text"},
      legendPosition:{ref:"legendConfig.position",label:"Legend",type:"string",component:"dropdown",
        options:[
          {value:"bottom",label:"Show — Bottom"},
          {value:"top",   label:"Show — Top"},
          {value:"left",  label:"Show — Left"},
          {value:"right", label:"Show — Right"},
          {value:"hidden",label:"Hidden"}
        ],
        defaultValue:"bottom"},

      /* ═══ X-AXIS ═════════════════════════════════════════════════════════ */
      sepXAxis:{label:"── X-axis ──────────────────────────────────────────",component:"text"},
      xShowLabels:{ref:"chartConfig.xShowLabels",label:"Axis labels",type:"boolean",component:"switch",defaultValue:true},
      xLabelOrientation:{ref:"chartConfig.xLabelOrientation",label:"Axis label angle",type:"string",component:"dropdown",
        options:[{value:"auto",label:"Auto"},{value:"horizontal",label:"Horizontal"},{value:"tilted",label:"Tilted"}],
        defaultValue:"auto",
        show:function(l){return !l.chartConfig||l.chartConfig.xShowLabels!==false;}},
      xShowTitle:{ref:"chartConfig.xShowTitle",label:"Axis title",type:"boolean",component:"switch",defaultValue:false},

      /* ═══ Y-AXIS ═════════════════════════════════════════════════════════ */
      sepYAxis:{label:"── Y-axis ──────────────────────────────────────────",component:"text"},
      yShowLabels:{ref:"chartConfig.yShowLabels",label:"Axis labels",type:"boolean",component:"switch",defaultValue:true},
      yLabelOrientation:{ref:"chartConfig.yLabelOrientation",label:"Category label width",type:"string",component:"dropdown",
        options:[{value:"auto",label:"Auto (truncate to fit)"},{value:"full",label:"Show full labels"}],
        defaultValue:"auto",
        show:function(l){return !l.chartConfig||l.chartConfig.yShowLabels!==false;}},
      yShowTitle:{ref:"chartConfig.yShowTitle",label:"Axis title",type:"boolean",component:"switch",defaultValue:false},

      /* ═══ TOOLTIP ════════════════════════════════════════════════════════ */
      sepTooltip:{label:"── Tooltip ─────────────────────────────────────────",component:"text"},
      showTooltip:{ref:"tooltipConfig.show",label:"Show tooltip on hover",type:"boolean",component:"switch",defaultValue:true},
      tipNote:{label:"Tooltip shows all measure values for the hovered category.",component:"text",
        show:function(l){return !l.tooltipConfig||l.tooltipConfig.show!==false;}}

    }}  /* end appearance */
  }};  /* end accordion */

  /* ═══════════════════════════════════════════════════════════════════════
     EXTENSION EXPORT
  ════════════════════════════════════════════════════════════════════════ */
  var _cachedTheme=null;
  return {
    definition:DEF,
    support:{snapshot:true,export:true,exportData:true},
    initialProperties:{
      qHyperCubeDef:{qDimensions:[],qMeasures:[],qInitialDataFetch:[{qWidth:20,qHeight:500}]},
      chartConfig:{
        renderMode:"grouped", orientation:"vertical",
        showGrid:true,
        /* bar sizing is auto-responsive — no min size stored in layout */
        showValueLabels:true, labelOrientation:"horizontal",
        nestedParentKey:"", sortOrder:"none",
        xShowLabels:true,  xShowTitle:false, xLabelOrientation:"auto",
        yShowLabels:true,  yShowTitle:false, yLabelOrientation:"auto"
      },
      colorConfig:{useAppTheme:"true", colorBy:"measure", coloringMode:"measure", palettePreset:"qlik", customCsv:"", singleColorHex:"", measureColors:{}},
      legendConfig:{position:"bottom"},
      tooltipConfig:{show:true},
      showTitles:true, title:""
    },

    paint:function(el,layout){
      var self = this;
      var container=(el&&el[0]&&el[0].nodeType===1)?el[0]:el;
      /* Load app theme — re-render once theme resolves so colors apply immediately */
      try{
        var app=qlik.currApp(this);
        if(app&&app.theme&&typeof app.theme.getApplied==="function"){
          app.theme.getApplied().then(function(t){
            if (t !== _cachedTheme) {
              _cachedTheme = t;
              /* Theme changed — re-render to apply correct colors */
              try { _renderChart(container, layout, _cachedTheme); } catch(e){}
            }
          }).catch(function(){});
        }
      }catch(e){}
      try{
        _renderChart(container,layout,_cachedTheme);
      }catch(err){
        console.error("[FlexBarChart] paint error:",err);
        container.innerHTML='<div style="padding:16px;font:12px sans-serif;color:#c00;word-break:break-all;">FlexBarChart error: '+String(err)+'</div>';
      }
    },
    resize:function(el,layout){return this.paint(el,layout);}
  };
});
