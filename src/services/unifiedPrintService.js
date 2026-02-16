import { nextTick } from "vue";

export function useUnifiedPrinter(store, userStore, stageRef, scale, showHidesRef) {
  
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

  // =========================================
  // CSS STYLES
  // =========================================
  const getCss = (orientation = 'landscape') => `
    @media print { 
      @page { size: ${orientation}; margin: 0; } 
      body { -webkit-print-color-adjust: exact; }
    }
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #333; background: white; }
    
    .print-page { height: 98vh; width: 100%; page-break-after: always; position: relative; display: flex; flex-direction: column; }
    .print-page:last-child { page-break-after: auto; }
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80px; opacity: 0.1; pointer-events: none; z-index: 999; }
    
    /* Full Page Header */
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding: 10px 15px; margin-bottom: 10px; }
    .title-block h1 { margin: 0; font-size: 24px; }
    .title-block h2 { margin: 0; font-size: 16px; color: #666; font-weight: normal; }
    .meta-block { text-align: right; font-size: 12px; line-height: 1.4; }
    .page-body { flex: 1; display: flex; gap: 20px; overflow: hidden; padding: 0 15px; }
    .map-container { flex: 1; display: flex; justify-content: center; align-items: flex-start; }
    img.map-img { max-width: 100%; max-height: 100%; object-fit: contain; border: 1px solid #eee; }
    
    /* Grids */
    .grid-container { display: grid; height: 100%; width: 100%; padding: 15px; gap: 15px; box-sizing: border-box; }
    .half-grid { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; }
    .quarter-grid { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
    
    .grid-item { border: 1px dashed #ccc; padding: 10px; display: flex; flex-direction: column; overflow: hidden; page-break-inside: avoid; }
    .grid-img-wrapper { flex: 1; display: flex; justify-content: center; align-items: center; overflow: hidden; min-height: 0; }
    .grid-img { max-width: 98%; max-height: 98%; object-fit: contain; }

    /* Compact Header (Grid Items) */
    .compact-header { border-bottom: 1px solid #ccc; margin-bottom: 6px; padding-bottom: 4px; }
    .ch-top { display: flex; justify-content: space-between; align-items: baseline; }
    .ch-title { font-weight: bold; font-size: 14px; }
    .ch-sub { font-size: 12px; color: #666; }
    .ch-meta { display: flex; justify-content: space-between; font-size: 10px; color: #444; margin-top: 2px; }

    /* Legends */
    .legend-sidebar { width: 180px; flex-shrink: 0; border-left: 1px solid #ccc; padding-left: 15px; font-size: 11px; }
    .legend-section { margin-bottom: 12px; }
    .legend-section h4 { margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; color: #666; border-bottom: 1px solid #eee; }
    .legend-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: 10px; line-height: 1.2; }
    
    .mini-legend { display: flex; flex-wrap: wrap; gap: 4px 8px; border-top: 1px solid #eee; padding-top: 5px; margin-top: 5px; justify-content: center; }
    .mini-item { display: flex; align-items: center; gap: 3px; font-size: 9px; white-space: nowrap; }
    .mini-symbol { width: 10px; height: 10px; border: 1px solid #333; display: inline-block; vertical-align: middle; }

    /* Symbols */
    .symbol { display: inline-block; width: 16px; height: 10px; border: 1px solid black; position: relative; flex-shrink: 0; }
    .l1 { background: ${store.baleColors[1] || '#e6c200'}; }
    .l2 { background: ${store.baleColors[2] || '#4caf50'}; }
    .l3 { background: ${store.baleColors[3] || '#2196f3'}; }
    .flat { background: #fff; }
    .tall { background: linear-gradient(to bottom right, transparent 46%, black 47%, black 53%, transparent 54%); background-color: #fff; }
    .pillar { background: linear-gradient(to bottom right, transparent 46%, black 47%, black 53%, transparent 54%), linear-gradient(to bottom left, transparent 46%, black 47%, black 53%, transparent 54%); background-color: #fff; }
    .anchor { border: 2px solid #d32f2f; color: #d32f2f; font-weight: bold; text-align: center; line-height: 8px; font-size: 10px; border-radius: 2px; background: white; }
    .tunnel { height: 4px; background: #2e7d32; border: none; }
    .tunnelbox { height: 6px; background: rgba(139, 69, 19, 0.4); border: 1px solid brown; }
    .gate { border: 1px solid black; height: 4px; }
    .step { background: #8D6E63; border: 1px solid black;}
    .start { border: 1px solid black; background: #eee; }
    .dc { background: #d1c4e9; }
    .obstruction { border: 1px dashed black; background: rgba(100, 100, 100, 0.5); }
    .dead-zone { border: 1px dashed red; background: rgba(255, 0, 0, 0.3); }
    .fence { border: 1px solid black; background-color: transparent; }
    .wall { border: 3px solid black; background-color: transparent; }
    .hide-rat, .hide-litter, .hide-empty, .hide-rat-under { width: 16px; height: 16px; border-radius: 50%; border: 2px solid black; text-align: center; line-height: 12px; font-size: 11px; font-weight: bold; }
    .hide-rat { background: red; color: black; }
    .hide-litter { background: yellow; color: black; }
    .hide-empty { background: white; color: black; }
    .hide-rat-under { color: black; stroke-width: 2; border-style: dashed; }
    .leaner { border: none; font-size: 12px; font-weight: bold; width: auto; height: auto; }
  `;

  // =========================================
  // 2. HTML GENERATORS
  // =========================================
  
  function buildSidebarLegend(config) {
    if (!config.legend) return '';
    const l = config.legend;
    let html = '<div class="legend-sidebar">';
    const section = (title, content) => content ? `<div class="legend-section"><h4>${title}</h4><div class="legend-grid">${content}</div></div>` : '';

    if (l.showStats) {
      const inv = store.inventory;
      html += section("Counts", `<div class="legend-item">Total: <strong>${inv.total}</strong></div><div class="legend-item">L1: <strong>${inv.base}</strong></div><div class="legend-item">L2: <strong>${inv.layer2}</strong></div><div class="legend-item">L3: <strong>${inv.layer3}</strong></div>`);
    }
    if (l.showBales) {
      html += section("Bales", `<div class="legend-item"><span class="symbol l1"></span> Base</div><div class="legend-item"><span class="symbol flat"></span> Flat</div><div class="legend-item"><span class="symbol l2"></span> Layer 2</div><div class="legend-item"><span class="symbol tall"></span> Tall</div><div class="legend-item"><span class="symbol l3"></span> Layer 3</div><div class="legend-item"><span class="symbol pillar"></span> Pillar</div>`);
    }
    if (l.customItems && l.customDefinitions) {
      let c = '';
      l.customDefinitions.forEach(def => {
        if (l.customItems[def.id]) {
          const bg = def.style.fillColor || '#ccc';
          const border = def.style.strokeColor || '#333';
          c += `<div class="legend-item"><span class="symbol" style="background:${bg}; border-color:${border}"></span> ${def.label}</div>`;
        }
      });
      html += section("Custom", c);
    }
    let f = '';
    if (l.showWalls) f += `<div class="legend-item"><span class="symbol wall"></span> Wall</div>`;
    if (l.showFence) f += `<div class="legend-item"><span class="symbol fence"></span> Fence</div>`;
    if (l.showTunnels) f += `<div class="legend-item"><span class="symbol tunnel"></span> T-Line</div>`;
    if (l.showTunnelBox) f += `<div class="legend-item"><span class="symbol tunnelbox"></span> T-Box</div>`;
    if (l.showGate) f += `<div class="legend-item"><span class="symbol gate"></span> Gate</div>`;
    if (l.showStep) f += `<div class="legend-item"><span class="symbol step"></span> Step</div>`;
    if (l.showLeaners) f += `<div class="legend-item"><span class="symbol leaner">→</span> Lean</div>`;
    if (l.showAnchors) f += `<div class="legend-item"><span class="symbol anchor">⚓</span> Anchor</div>`;
    if (l.showStartBox) f += `<div class="legend-item"><span class="symbol start"></span> Start</div>`;
    if (l.showDCMat) f += `<div class="legend-item"><span class="symbol dc"></span> DC Mat</div>`;
    if (l.showObstruction) f += `<div class="legend-item"><span class="symbol obstruction"></span> Obstr.</div>`;
    if (l.showDeadZone) f += `<div class="legend-item"><span class="symbol dead-zone"></span> Dead Z.</div>`;
    html += section("Features", f);

    if (l.showHides) {
      html += section("Hides", `<div class="legend-item"><div class="symbol hide-rat">R</div> Rat</div><div class="legend-item"><div class="symbol hide-litter">L</div> Litter</div><div class="legend-item"><div class="symbol hide-empty">E</div> Empty</div><div class="legend-item"><div class="symbol hide-rat-under"></div> Under</div>`);
    }
    html += '</div>';
    return html;
  }

  // [UPDATED] Compact Legend with Full Coverage
  function buildCompactLegend(config) {
     const l = config.legend;
     let items = [];

     // Bales
     if (l.showBales) {
       items.push(`<div class="mini-item"><span class="mini-symbol l1"></span>L1</div>`);
       items.push(`<div class="mini-item"><span class="mini-symbol l2"></span>L2</div>`);
       items.push(`<div class="mini-item"><span class="mini-symbol l3"></span>L3</div>`);
       items.push(`<div class="mini-item"><span class="mini-symbol flat"></span>Flat</div>`);
       items.push(`<div class="mini-item"><span class="mini-symbol tall"></span>Tall</div>`);
       items.push(`<div class="mini-item"><span class="mini-symbol pillar"></span>Pillar</div>`);
     }
     
     // Features (Respecting all toggles)
     if (l.showWalls) items.push(`<div class="mini-item"><span class="mini-symbol wall"></span>Wall</div>`);
     if (l.showFence) items.push(`<div class="mini-item"><span class="mini-symbol fence"></span>Fence</div>`);
     if (l.showTunnels) items.push(`<div class="mini-item"><span class="mini-symbol tunnel"></span>T-Line</div>`);
     if (l.showTunnelBox) items.push(`<div class="mini-item"><span class="mini-symbol tunnelbox"></span>T-Box</div>`);
     if (l.showGate) items.push(`<div class="mini-item"><span class="mini-symbol gate"></span>Gate</div>`);
     if (l.showStep) items.push(`<div class="mini-item"><span class="mini-symbol step"></span>Step</div>`);
     if (l.showLeaners) items.push(`<div class="mini-item"><span class="mini-symbol leaner">→</span>Lean</div>`);
     if (l.showAnchors) items.push(`<div class="mini-item"><span class="mini-symbol anchor">⚓</span>Anch</div>`);
     if (l.showStartBox) items.push(`<div class="mini-item"><span class="mini-symbol start"></span>Start</div>`);
     if (l.showDCMat) items.push(`<div class="mini-item"><span class="mini-symbol dc"></span>DC</div>`);
     if (l.showObstruction) items.push(`<div class="mini-item"><span class="mini-symbol obstruction"></span>Obs</div>`);
     if (l.showDeadZone) items.push(`<div class="mini-item"><span class="mini-symbol dead-zone"></span>Dead</div>`);

     // Hides (Full set)
     if (l.showHides) {
       items.push(`<div class="mini-item"><span class="mini-symbol hide-rat" style="border-radius:50%">R</span>Rat</div>`);
       items.push(`<div class="mini-item"><span class="mini-symbol hide-litter" style="border-radius:50%">L</span>Lit</div>`);
       items.push(`<div class="mini-item"><span class="mini-symbol hide-empty" style="border-radius:50%">E</span>Emp</div>`);
       items.push(`<div class="mini-item"><span class="mini-symbol hide-rat-under" style="border-radius:50%; border-style:dashed"></span>Und</div>`);
     }

     // Custom Items
     if (l.customItems && l.customDefinitions) {
       l.customDefinitions.forEach(def => {
          if (l.customItems[def.id]) {
             const bg = def.style.fillColor || '#ccc';
             const border = def.style.strokeColor || '#333';
             items.push(`<div class="mini-item"><span class="mini-symbol" style="background:${bg}; border-color:${border}"></span>${def.label}</div>`);
          }
       });
     }

     return `<div class="mini-legend">${items.join('')}</div>`;
  }

  // =========================================
  // 3. CAPTURE LOGIC
  // =========================================
  async function captureStage(targetScale = 35) {
    const stage = stageRef.value.getStage();
    const originalStagePos = stage.position();

    try {
      scale.value = targetScale; 
      store.gridStep = 1; 
      stage.position({ x: 0, y: 0 });

      const GRID_OFFSET = 30;
      const cleanW = Number(store.ringDimensions.width) || 24;
      const cleanH = Number(store.ringDimensions.height) || 24;
      const totalWidth = cleanW * scale.value + (GRID_OFFSET * 2);
      const totalHeight = cleanH * scale.value + (GRID_OFFSET * 2);

      await nextTick();
      await wait(300); 
      stage.batchDraw();
      await wait(100);

      return await stage.toDataURL({ pixelRatio: 2, x: 0, y: 0, width: totalWidth, height: totalHeight });

    } catch (e) {
      console.error("Capture failed:", e);
      throw e;
    } finally {
      stage.position(originalStagePos);
    }
  }

  // =========================================
  // 4. MAIN ENTRY
  // =========================================
 async function generatePrintJob(config) {
    store.clearSelection();

    const win = window.open("", "_blank");
    if (!win) return { success: false, error: "Popup blocked. Please allow popups." };

    win.document.write(`
      <div style="font-family:sans-serif; text-align:center; padding-top:50px;">
        <h2>Generating Print...</h2>
        <p>Please wait...</p>
        <div style="width:40px; height:40px; border:4px solid #ccc; border-top-color:#333; border-radius:50%; margin:20px auto; animation:spin 1s linear infinite;"></div>
        <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
      </div>
    `);

    // Save State
    const originalLayer = store.currentLayer;
    const originalShowHides = store.showHides; // Legacy store state
    const originalRefState = showHidesRef ? showHidesRef.value : true; // Local ref state
    const originalMultiView = store.multiLayerView;
    const originalScale = scale.value;
    const originalStep = store.gridStep;
    const originalHides = JSON.parse(JSON.stringify(store.hides)); 
    
    // Helper to sync visibility
    const setVisibility = (visible) => {
      store.showHides = visible;
      if (showHidesRef) showHidesRef.value = visible;
    };

    try {
      const capturedPages = [];
      const isPro = userStore.isPro;
      const watermark = !isPro ? `<div class="watermark">DRAFT - UPGRADE TO REMOVE</div>` : "";

      // 1. Capture Images
      if (config.mode === 'layers') {
        for (const layer of (config.layers || [1, 2, 3])) {
          if (layer !== 1 && !store.bales.some(b => b.layer === layer)) continue;
          
          store.currentLayer = layer;
          store.multiLayerView = config.overlayAll ? layer : false;
          setVisibility(config.hides.mode === 'quick');

          const img = await captureStage();
          capturedPages.push({ title: `Layer ${layer}`, subTitle: store.mapName, img });
        }
      } 
      else if (config.mode === 'blinds') {
        let blinds = store.mapData.blinds || [];
        if (config.selectedBlindIds && config.selectedBlindIds.length > 0) {
          blinds = blinds.filter(b => config.selectedBlindIds.includes(b.id));
        }
        if (blinds.length === 0) throw new Error("No blinds selected.");

        // [FIX] Detect highest populated layer (3 -> 2 -> 1)
        // This ensures we print the "Top" view looking down through all layers
        const topLayer = [3, 2].find(l => store.bales.some(b => b.layer === l)) || 1;

        store.currentLayer = topLayer;
        store.multiLayerView = topLayer; // Enable ghosting for layers below the top
        setVisibility(true); // Force hides ON for blinds

        for (const blind of blinds) {
          store.hides = blind.hides; 
          const img = await captureStage(40); 
          capturedPages.push({ title: blind.name, subTitle: `Randoms: ${blind.randoms.join(' - ')}`, img });
        }
      }

      // 2. Apply Copies
      let finalItems = [];
      const copies = config.copies || 1;
      capturedPages.forEach(page => {
        for (let i = 0; i < copies; i++) {
          finalItems.push(page);
        }
      });

      // 3. Build Metadata Strings (Shared)
      const classStr = store.classLevel || '';
      const trialStr = store.trialNumber ? `Trial ${store.trialNumber}` : '';
      const dayStr = store.trialDay || '';
      // Join non-empty parts with bullets
      const metaCombined = [classStr, trialStr, dayStr].filter(Boolean).join(' • ');
      
      const metaJudge = userStore.judgeName || "__________________";
      const metaClub = store.trialLocation || userStore.clubName || "__________________";

      // 4. Generate HTML
      let pagesHtml = "";

      if (config.layout === 'full') {
        const sidebarLegend = buildSidebarLegend(config);
        pagesHtml = finalItems.map(p => {
          // Combine Metadata + Page Title (e.g. "Senior • Trial 1 - Layer 2")
          const fullSubHeader = [metaCombined, p.title].filter(Boolean).join(' - ');

          return `
          <div class="print-page">
            ${watermark}
            <div class="header">
              <div class="title-block">
                <h1>${p.subTitle}</h1> <h2>${fullSubHeader}</h2> </div>
              <div class="meta-block">
                <strong>Judge:</strong> ${metaJudge}<br>
                <strong>Club:</strong> ${metaClub}
              </div>
            </div>
            <div class="page-body">
              <div class="map-container"><img src="${p.img}" class="map-img" /></div>
              ${sidebarLegend}
            </div>
          </div>
        `}).join('');
      } 
      else {
        // Grid Layouts (Half / Quarter)
        const size = config.layout === 'half' ? 2 : 4;
        const gridClass = config.layout === 'half' ? 'half-grid' : 'quarter-grid';
        const pageGroups = chunk(finalItems, size);
        const compactLegend = buildCompactLegend(config);
        
        pagesHtml = pageGroups.map(group => `
          <div class="print-page">
            ${watermark}
            <div class="grid-container ${gridClass}">
               ${group.map(p => `
                 <div class="grid-item">
                    <div class="compact-header">
                      <div class="ch-top">
                        <div class="ch-title">${p.subTitle}</div>
                        <div class="ch-sub">${p.title}</div>
                      </div>
                      <div class="ch-meta">
                         <div style="font-weight:bold">${metaCombined}</div>
                         <div>${metaJudge} • ${metaClub}</div>
                      </div>
                    </div>
                    <div class="grid-img-wrapper"><img src="${p.img}" class="grid-img"/></div>
                    ${compactLegend}
                 </div>
               `).join('')}
            </div>
          </div>
        `).join('');
      }

      win.document.open();
      win.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${store.mapName}</title>
            <style>${getCss(config.orientation)}</style>
          </head>
          <body>${pagesHtml}</body>
        </html>
      `);
      win.document.close();

      setTimeout(() => { win.focus(); win.print(); }, 500);
      return { success: true };

    } catch (e) {
      console.error(e);
      win.document.body.innerHTML = `<h3 style="color:red">Error: ${e.message}</h3>`;
      return { success: false, error: e.message };
    } finally {
      // Restore State
      store.currentLayer = originalLayer;
      store.multiLayerView = originalMultiView;
      scale.value = originalScale;
      store.gridStep = originalStep;
      store.hides = originalHides;
      
      // Restore Visibility
      store.showHides = originalShowHides;
      if (showHidesRef) showHidesRef.value = originalRefState;
    }
  }

  return { generatePrintJob };
}