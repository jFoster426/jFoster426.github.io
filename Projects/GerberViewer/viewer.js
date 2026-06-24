// -- Constants --
const MIN_ZOOM = 0.001;
const MAX_ZOOM = 500;

// -- State --
let layers = [], vb = null;
let panX = 0, panY = 0, scale = 1, panning = false, lx = 0, ly = 0;

// -- Status helpers --
function showStatus(msg, err = false, spin = false) {
    const ov = document.getElementById('status-overlay');
    ov.classList.remove('hidden');
    ov.innerHTML = '';
    if (spin) { const s = document.createElement('div'); s.className = 'spinner'; ov.appendChild(s); }
    else { const i = document.createElement('div'); i.className = 'st-icon'; i.textContent = err ? '⚠' : '⬡'; ov.appendChild(i); }
    const t = document.createElement('div'); t.className = 'st-text' + (err ? ' err' : ''); t.innerHTML = msg; ov.appendChild(t);
}
function hideStatus() { document.getElementById('status-overlay').classList.add('hidden'); }

// -- viewBox helpers --
function parseVB(svgStr) {
    const m = svgStr.match(/viewBox="([^"]+)"/);
    if (!m) return null;

    const [x, y, w, h] = m[1].split(' ').map(Number);
    return { x, y, w, h };
}
function mergeVB(a, b) {
    if (!a) return b; if (!b) return a;
    const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
    const x2 = Math.max(a.x + a.w, b.x + b.w), y2 = Math.max(a.y + a.h, b.y + b.h);
    return { x, y, w: x2 - x, h: y2 - y };
}

// -- Render one gerber layer --
function renderLayer(text, id) {
    return new Promise((res, rej) => {
        try { gerberToSvg(text, { id }, (err, svg) => err ? rej(err) : res(svg)); }
        catch (e) { rej(e); }
    });
}

// -- Build canvas SVG overlay --
function buildCanvas() {
    const canvas = document.getElementById('pcb-canvas');
    canvas.innerHTML = '';
    if (!vb || !layers.length) return;
    const { x, y, w, h } = vb;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    const parser = new DOMParser();
    for (const layer of layers) {
        const wrap = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        wrap.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
        wrap.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        wrap.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
        Object.assign(wrap.style, { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible' });

        const doc = parser.parseFromString(layer.svg, 'image/svg+xml');
        const src = doc.querySelector('svg');

        if (src) {
            const defs = src.querySelector('defs');
            if (defs) wrap.appendChild(document.importNode(defs, true));

            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            // Re-anchor the Y-flip to the unified viewBox height instead of per-layer height
            g.setAttribute('transform', `translate(0, ${h}) scale(1, -1)`);
            g.style.color = layer.color;
            g.style.fill = 'currentColor';
            g.style.stroke = 'currentColor';
            g.style.strokeLinecap = 'round';

            for (const c of src.children) {
                if (c.tagName.toLowerCase() !== 'defs') {
                    // Strip the inner <g transform="translate(0,H) scale(1,-1)"> and take its children
                    if (c.tagName.toLowerCase() === 'g' && c.getAttribute('transform')?.includes('scale(1,-1)')) {
                        for (const inner of c.children) {
                            g.appendChild(document.importNode(inner, true));
                        }
                    } else {
                        g.appendChild(document.importNode(c, true));
                    }
                }
            }
            wrap.appendChild(g);
        }
        wrap.style.display = layer.visible ? '' : 'none';
        layer.el = wrap;
        canvas.appendChild(wrap);
    }
}

// -- Sidebar --
function buildSidebar() {
    const list = document.getElementById('layer-list');
    list.innerHTML = '';
    // Parse the file in reverse order because the first line should be the last drawn
    for (const layer of layers.toReversed()) {
        const item = document.createElement('div');
        item.className = 'layer-item' + (layer.visible ? '' : ' off');
        item.dataset.id = layer.id;
        item.onclick = () => toggleLayer(layer.id);

        const sw = document.createElement('div');
        sw.className = 'layer-swatch'; sw.style.background = layer.color;

        const nm = document.createElement('div');
        nm.className = 'layer-name'; nm.textContent = layer.filename; nm.title = layer.filename;

        item.append(sw, nm);
        list.appendChild(item);
    }
}

function toggleLayer(id) {
    const l = layers.find(x => x.id === id); if (!l) return;
    l.visible = !l.visible;
    if (l.el) {
        l.el.style.display = l.visible ? '' : 'none';
    }
    const item = document.querySelector(`.layer-item[data-id="${id}"]`);
    if (item) {
        item.classList.toggle('off', !l.visible);
    }
}

function toggleAll() {
    const any = layers.some(l => l.visible);
    layers.forEach(l => {
        l.visible = !any;
        if (l.el) {
            l.el.style.display = l.visible ? '' : 'none';
        }
    });
    buildSidebar();
}

// -- Pan / Zoom --
function applyTransform() {
    document.getElementById('pcb-canvas').style.transform = `translate(${panX}px,${panY}px) scale(${scale})`;
    document.getElementById('zoom-pct').textContent = Math.round(scale * 100) + '%';
}

function zoom(factor, cx, cy) {
    const wrap = document.getElementById('canvas-wrap');
    if (cx === undefined) cx = wrap.clientWidth / 2;
    if (cy === undefined) cy = wrap.clientHeight / 2;
    const ns = Math.min(Math.max(scale * factor, MIN_ZOOM), MAX_ZOOM);
    const r = ns / scale;
    panX = cx - r * (cx - panX); panY = cy - r * (cy - panY); scale = ns;
    applyTransform();
}

function fitView() {
    if (!vb) return;
    const wrap = document.getElementById('canvas-wrap');
    const canvas = document.getElementById('pcb-canvas');
    const ww = wrap.clientWidth, wh = wrap.clientHeight, pad = 48;
    const cw = canvas.offsetWidth, ch = canvas.offsetHeight;
    if (!cw || !ch) return;
    const s = Math.min((ww - pad * 2) / cw, (wh - pad * 2) / ch);
    scale = s;
    panX = (ww - cw * s) / 2;
    panY = (wh - ch * s) / 2;
    applyTransform();
}

function orange(factor) {
    document.getElementById('opacity-pct').textContent = factor + '%';
    const opacity = factor / 100;
    for (const layer of layers) {
        if (layer.el) layer.el.style.opacity = opacity;
    }
}

const cw = document.getElementById('canvas-wrap');
cw.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    panning = true; lx = e.clientX; ly = e.clientY;
    cw.classList.add('grabbing'); cw.setPointerCapture(e.pointerId);
});
cw.addEventListener('pointermove', e => {
    if (!panning) return;
    panX += e.clientX - lx; panY += e.clientY - ly; lx = e.clientX; ly = e.clientY; applyTransform();
});
cw.addEventListener('pointerup', () => { panning = false; cw.classList.remove('grabbing'); });
cw.addEventListener('wheel', e => {
    e.preventDefault();
    const r = cw.getBoundingClientRect();
    zoom(e.deltaY < 0 ? 1.12 : 0.89, e.clientX - r.left, e.clientY - r.top);
}, { passive: false });

let lastPD = null;
cw.addEventListener('touchstart', e => {
    if (e.touches.length === 2) lastPD = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
}, { passive: true });
cw.addEventListener('touchmove', e => {
    if (e.touches.length === 2) {
        e.preventDefault();
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        const r = cw.getBoundingClientRect();
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top;
        if (lastPD) zoom(d / lastPD, cx, cy); lastPD = d;
    }
}, { passive: false });

// -- Core: render ZIP --
async function renderZip(buf) {
    layers = []; vb = null;
    document.getElementById('layer-list').innerHTML = '';
    document.getElementById('pcb-canvas').innerHTML = '';

    showStatus('Decompressing...', false, true);
    if (typeof gerberToSvg === 'undefined' || typeof whatsThatGerber === 'undefined') {
        return showStatus('Libraries failed to load. Check your internet connection.', true);
    }

    let zip;
    try { zip = await JSZip.loadAsync(buf); }
    catch (e) { return showStatus('Not a valid ZIP: ' + e.message, true); }

    const SKIP = /\.(png|jpg|jpeg|gif|bmp|pdf|md|json|xml|csv|html|zip)$/i;
    const entries = [];
    zip.forEach((path, entry) => {
        if (!entry.dir && !path.startsWith('__MACOSX') && !path.includes('.DS_Store')) {
            const fn = path.split('/').pop();
            if (!SKIP.test(fn)) entries.push({ path, entry, fn });
        }
    });

    if (!entries.length) return showStatus('No Gerber files found in ZIP.', true);

    let colorOverrides = {};
    let drawOrder = {};

    const txtEntry = entries.find(e => e.fn.endsWith('colors.txt'));

    if (txtEntry) {
        const txtContent = await txtEntry.entry.async('string');
        let lineIdx = 0;
        // Parse the file in reverse order because the first line should be the last drawn
        for (const line of txtContent.split('\n').toReversed()) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const parts = trimmed.split(/\s+/);
            if (parts.length >= 2) {
                colorOverrides[parts[0]] = parts[1];
                drawOrder[parts[0]] = lineIdx++;
            }
        }
    }
    else {
        console.log('No color information found, using default.');
    }

    const gerberEntries = entries.filter(e => !e.fn.endsWith('.txt'));

    showStatus(`Identifying ${gerberEntries.length} layer(s)...`, false, true);
    const fnames = gerberEntries.map(e => e.fn);
    const wtg = whatsThatGerber(fnames);

    const raw = [];
    for (let i = 0; i < gerberEntries.length; i++) {
        const { entry, fn } = gerberEntries[i];
        showStatus(`Rendering layer ${i + 1} / ${gerberEntries.length}...`, false, true);
        const info = wtg[fn] || { type: null, side: null };
        const id = 'g' + i;
        try {
            const text = await entry.async('string');
            const svg = await renderLayer(text, id);
            const layerVB = parseVB(svg);
            vb = mergeVB(vb, parseVB(svg));
            raw.push({
                id,
                filename: fn,
                type: info.type,
                side: info.side,
                color: colorOverrides[fn],
                zIndex: drawOrder[fn],
                svg,
                visible: true,
                el: null,
                layerVB: layerVB
            });
        } catch (e) {
            console.warn('Skip', fn, e.message);
        }
    }

    if (!raw.length) return showStatus('Could not render any layers. Check browser console.', true);

    layers = raw.sort((a, b) => a.zIndex - b.zIndex);

    buildCanvas();
    buildSidebar();
    hideStatus();
    fitView();
    orange(100); // Default opacity
    document.getElementById('orange').value = 100;
}

async function loadFromUrl(url) {
    console.log('Fetching:', url);
    showStatus('Loading ' + url + '...', false, true);
    const response = await fetch(url);
    if (!response.ok) {
        showStatus('Failed to load ' + url + ': ' + response.status, true, false);
        return;
    }
    const arrayBuffer = await response.arrayBuffer();
    await renderZip(arrayBuffer);
}

async function loadFromFile(input) {
    console.log(input);
    const file = input.files[0]; if (!file) return;
    showStatus('Reading ' + file.name + '…', false, true);
    await renderZip(await file.arrayBuffer());
}

window.addEventListener('DOMContentLoaded', () => {
    // const u = new URLSearchParams(location.search).get('url');
    // if (u) { document.getElementById('url-input').value = u; loadFromUrl(u); }
});

window.addEventListener('message', function(event) {
  const gerberZipPath = event.data;
  // Ignore anything that isn't a string, or doesn't look like our expected path
  if (typeof gerberZipPath !== 'string') return;
  if (!gerberZipPath.endsWith('.zip')) return;
  console.log('Received Gerber file path:', gerberZipPath);
  loadFromUrl(gerberZipPath);
});

window.addEventListener('resize', () => { if (layers.length) fitView(); });