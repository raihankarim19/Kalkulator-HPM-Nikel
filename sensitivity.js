// ============================================================
// Sensitivitas Kadar Ni - grafik SVG tanpa dependensi
// Bergantung pada HPM.sensitivity() di calculator.js
// ============================================================

const Sens = (() => {
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const C = {
        line: '#0862A4',        // seri utama (blue-700)
        ghost: '#94a3b8',       // pembanding (de-emphasis)
        wash: 'rgba(8, 98, 164, 0.08)',
        grid: '#e2e8f0',
        axis: '#cbd5e1',
        text: '#64748b',
        ink: '#163254',
        event: '#d97706',       // ambang regulasi
        surface: '#ffffff',
    };

    const state = { range: 0.10, mode: 'geo', path: 'auto', data: null, ghost: null, hover: null };
    let lastInputs = null;

    // ---------- helpers ----------
    const el = (tag, attrs = {}, parent) => {
        const n = document.createElementNS(SVG_NS, tag);
        for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
        if (parent) parent.appendChild(n);
        return n;
    };
    const text = (parent, x, y, str, attrs = {}) => {
        const t = el('text', { x, y, fill: C.text, 'font-size': 11, ...attrs }, parent);
        t.textContent = str;
        return t;
    };
    const usd = (v, d = 2) => '$' + v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    const signedUsd = v => (v >= 0 ? '+' : '−') + usd(Math.abs(v));
    const pct = (v, d = 2) => v.toFixed(d) + '%';

    function niceTicks(min, max, count = 4) {
        if (min === max) { min -= 1; max += 1; }
        const span = max - min;
        const raw = span / count;
        const mag = Math.pow(10, Math.floor(Math.log10(raw)));
        const norm = raw / mag;
        const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
        const lo = Math.floor(min / step) * step;
        const hi = Math.ceil(max / step) * step;
        const ticks = [];
        for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v / step) * step);
        return { lo, hi, ticks, step };
    }

    function decimalsFor(step) {
        if (step >= 1) return 0;
        return Math.min(4, Math.ceil(-Math.log10(step)));
    }

    // ---------- chart ----------
    /**
     * Gambar grafik garis ke dalam `host`.
     * cfg: { key, yFormat, height, margin, events, ghostRows, threshold, mini }
     */
    function drawChart(host, rows, cfg) {
        host.textContent = '';
        const W = Math.max(cfg.mini ? 120 : 260, host.clientWidth || 320);
        const H = cfg.height;
        const m = cfg.margin;
        const svg = el('svg', {
            width: W, height: H, viewBox: `0 0 ${W} ${H}`,
            role: 'img', 'aria-label': cfg.ariaLabel || '',
            class: 'sens-svg'
        }, host);

        const xs = rows.map(r => r.ni);
        const ys = rows.map(r => r[cfg.key]);
        if (cfg.ghostRows) cfg.ghostRows.forEach(r => ys.push(r[cfg.key]));
        if (cfg.threshold !== undefined) {
            // tampilkan garis ambang hanya bila dekat rentang data
            const lo = Math.min(...ys), hi = Math.max(...ys);
            const pad = (hi - lo) * 0.6 || Math.abs(hi) * 0.1;
            if (cfg.threshold >= lo - pad && cfg.threshold <= hi + pad) ys.push(cfg.threshold);
            else cfg = { ...cfg, threshold: undefined };
        }
        let yMin = Math.min(...ys), yMax = Math.max(...ys);
        if (cfg.zeroBase) yMin = Math.min(0, yMin);
        const yt = niceTicks(yMin, yMax, cfg.mini ? 2 : 4);
        const xMin = xs[0], xMax = xs[xs.length - 1];

        const px = v => m.l + (v - xMin) / (xMax - xMin || 1) * (W - m.l - m.r);
        const py = v => m.t + (1 - (v - yt.lo) / (yt.hi - yt.lo || 1)) * (H - m.t - m.b);

        // grid + y labels
        const yd = decimalsFor(yt.step);
        yt.ticks.forEach(v => {
            el('line', { x1: m.l, x2: W - m.r, y1: py(v), y2: py(v), stroke: C.grid, 'stroke-width': 1 }, svg);
            text(svg, m.l - 6, py(v) + 3.5, cfg.yFormat(v, yd), { 'text-anchor': 'end', class: 'sens-tick' });
        });

        // x labels
        const span = xMax - xMin;
        const xStep = span <= 0.12 ? 0.02 : span <= 0.25 ? 0.05 : 0.10;
        const first = Math.ceil(xMin / xStep - 1e-9) * xStep;
        if (cfg.mini) {
            // grafik kecil: cukup ujung kiri, tengah, dan kanan
            [[xMin, 'start'], [(xMin + xMax) / 2, 'middle'], [xMax, 'end']].forEach(([v, anchor]) => {
                text(svg, px(v), H - m.b + 15, v.toFixed(2), { 'text-anchor': anchor, class: 'sens-tick', 'font-size': 10 });
            });
        } else {
            for (let v = first; v <= xMax + 1e-9; v += xStep) {
                const x = px(v);
                el('line', { x1: x, x2: x, y1: H - m.b, y2: H - m.b + 4, stroke: C.axis }, svg);
                text(svg, x, H - m.b + 16, v.toFixed(2), { 'text-anchor': 'middle', class: 'sens-tick' });
            }
        }
        el('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, stroke: C.axis, 'stroke-width': 1 }, svg);

        // threshold (horizontal)
        if (cfg.threshold !== undefined) {
            const y = py(cfg.threshold);
            el('line', { x1: m.l, x2: W - m.r, y1: y, y2: y, stroke: C.event, 'stroke-width': 1, opacity: 0.8 }, svg);
            text(svg, m.l + 4, y - 4, cfg.thresholdLabel, { 'text-anchor': 'start', fill: '#92400e', 'font-size': 10, class: 'sens-halo' });
        }

        // events (vertical)
        (cfg.events || []).forEach((e, i) => {
            const x = px(e.ni);
            el('line', { x1: x, x2: x, y1: m.t - (cfg.mini ? 0 : 6), y2: H - m.b, stroke: C.event, 'stroke-width': 1, opacity: 0.85 }, svg);
            if (!cfg.mini) {
                const anchor = x > W * 0.7 ? 'end' : 'start';
                text(svg, x + (anchor === 'end' ? -5 : 5), m.t - 8 + i * 12, e.label,
                    { 'text-anchor': anchor, fill: '#92400e', 'font-size': 10.5, 'font-weight': 600 });
            }
        });

        const pathOf = (rs) => rs.map((r, i) => `${i ? 'L' : 'M'}${px(r.ni).toFixed(1)},${py(r[cfg.key]).toFixed(1)}`).join('');

        // area wash (main chart only)
        if (!cfg.mini) {
            const d = pathOf(rows) + `L${px(xMax)},${H - m.b}L${px(xMin)},${H - m.b}Z`;
            el('path', { d, fill: C.wash, stroke: 'none' }, svg);
        }
        if (cfg.ghostRows) {
            el('path', { d: pathOf(cfg.ghostRows), fill: 'none', stroke: C.ghost, 'stroke-width': 1.5,
                'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
        }
        el('path', { d: pathOf(rows), fill: 'none', stroke: C.line, 'stroke-width': 2,
            'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);

        // base point (input)
        const bi = rows.findIndex(r => Math.abs(r.ni - state.data.ni0) < 1e-9);
        if (bi >= 0) {
            const bx = px(rows[bi].ni), by = py(rows[bi][cfg.key]);
            el('circle', { cx: bx, cy: by, r: cfg.mini ? 4 : 5, fill: C.line, stroke: C.surface, 'stroke-width': 2 }, svg);
            if (!cfg.mini) {
                const lbl = 'Input ' + cfg.yFormat(rows[bi][cfg.key], 2);
                const below = by < m.t + 24;
                text(svg, bx, below ? by + 20 : by - 12, lbl,
                    { 'text-anchor': bx > W * 0.8 ? 'end' : bx < W * 0.2 ? 'start' : 'middle', fill: C.ink, 'font-size': 11.5, 'font-weight': 700, class: 'sens-halo' });
            }
        }

        // hover layer
        const cross = el('line', { y1: m.t, y2: H - m.b, stroke: C.ink, 'stroke-width': 1, opacity: 0, 'pointer-events': 'none' }, svg);
        const dot = el('circle', { r: cfg.mini ? 3.5 : 5, fill: C.line, stroke: C.surface, 'stroke-width': 2, opacity: 0, 'pointer-events': 'none' }, svg);
        const hit = el('rect', { x: m.l, y: 0, width: W - m.l - m.r, height: H, fill: 'transparent', style: 'cursor:crosshair' }, svg);

        const idxAt = (clientX) => {
            const rect = svg.getBoundingClientRect();
            const x = (clientX - rect.left) * (W / rect.width);
            const v = xMin + (x - m.l) / (W - m.l - m.r) * (xMax - xMin);
            let best = 0, bd = Infinity;
            rows.forEach((r, i) => { const d = Math.abs(r.ni - v); if (d < bd) { bd = d; best = i; } });
            return best;
        };
        hit.addEventListener('pointermove', e => setHover(idxAt(e.clientX)));
        hit.addEventListener('pointerdown', e => setHover(idxAt(e.clientX)));
        hit.addEventListener('pointerleave', () => setHover(null));

        return {
            show(i) {
                if (i === null || i === undefined) {
                    cross.setAttribute('opacity', 0); dot.setAttribute('opacity', 0);
                    return null;
                }
                const r = rows[i];
                const x = px(r.ni), y = py(r[cfg.key]);
                cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.setAttribute('opacity', 0.35);
                dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('opacity', 1);
                return { x, y, W, H, svg };
            }
        };
    }

    // ---------- rendering ----------
    const charts = {};
    const MINIS = [
        { key: 'fe', label: 'Fe', unit: '%', d: 2, threshold: 35, thresholdLabel: 'ambang 35%' },
        { key: 'co', label: 'Co', unit: '%', d: 3, threshold: 0.05, thresholdLabel: 'ambang 0,05%' },
        { key: 'cr', label: 'Cr', unit: '%', d: 2 },
        { key: 'mc', label: 'MC', unit: '%', d: 2 },
    ];

    function render() {
        const s = state.data;
        const root = document.getElementById('section-sensitivitas');
        if (!root) return;
        const empty = !s;
        root.classList.toggle('is-empty', empty);
        if (empty) return;

        // KPI
        setKpi('kpi-up', s.marginalUp, s.upRow);
        setKpi('kpi-down', s.marginalDown, s.downRow);

        // path chip
        const chip = document.getElementById('sens-path-chip');
        chip.textContent = (state.mode === 'geo')
            ? 'Jalur: ' + s.pathLabel + (state.path === 'auto' ? ' · otomatis' : '')
            : 'Kadar Fe, Co, Cr, MC dibuat tetap';

        // legend
        document.getElementById('sens-legend').style.display = state.ghost ? '' : 'none';

        // main chart
        const mainHost = document.getElementById('sens-chart-main');
        const narrow = mainHost.clientWidth < 480;
        charts.main = drawChart(mainHost, s.rows, {
            key: 'hpm',
            height: narrow ? 230 : 280,
            margin: { l: 52, r: 14, t: 30, b: 34 },
            yFormat: (v, d) => '$' + v.toFixed(Math.min(d, 2)),
            events: s.events,
            ghostRows: state.ghost ? state.ghost.rows : null,
            ariaLabel: `HPM terhadap kadar Ni dari ${s.rows[0].ni}% sampai ${s.rows[s.rows.length - 1].ni}%`,
        });

        // mini charts
        MINIS.forEach(mc => {
            const host = document.getElementById('sens-mini-' + mc.key);
            charts[mc.key] = drawChart(host, s.rows, {
                key: mc.key, mini: true, showX: true,
                height: 112,
                margin: { l: 40, r: 8, t: 8, b: 22 },
                yFormat: (v, d) => v.toFixed(d),
                events: s.events,
                threshold: mc.threshold, thresholdLabel: mc.thresholdLabel,
                ariaLabel: `Kadar ${mc.label} terhadap kadar Ni`,
            });
        });

        renderTable();
        setHover(state.hover);
    }

    function setKpi(id, delta, row) {
        const box = document.getElementById(id);
        const v = box.querySelector('.kpi-value');
        const sub = box.querySelector('.kpi-sub');
        if (delta === null || !row) { v.textContent = '-'; sub.textContent = ''; return; }
        v.textContent = signedUsd(delta);
        box.classList.toggle('is-jump', Math.abs(delta) >= 5);
        sub.textContent = `HPM ${usd(row.hpm)}/wmt pada Ni ${pct(row.ni)}`;
    }

    function setHover(i) {
        state.hover = i;
        const s = state.data;
        if (!s) return;
        const tip = document.getElementById('sens-tooltip');
        const res = charts.main ? charts.main.show(i) : null;
        MINIS.forEach(mc => {
            if (charts[mc.key]) charts[mc.key].show(i);
            const r = (i === null || i === undefined) ? s.base : s.rows[i];
            document.getElementById('sens-mini-val-' + mc.key).textContent = pct(r[mc.key], mc.d);
        });
        // Layar sempit: tooltip menjadi panel tetap di bawah grafik,
        // menampilkan titik input bila tidak ada titik yang disorot
        const docked = window.matchMedia('(max-width: 600px)').matches;
        tip.classList.toggle('is-docked', docked);
        if (!res && !docked) { tip.classList.remove('show'); return; }

        const r = res ? s.rows[i] : s.base;
        const dNi = r.ni - s.ni0;
        tip.querySelector('.tt-ni').textContent = `Ni ${pct(r.ni)}` + (Math.abs(dNi) > 1e-9 ? ` (${dNi > 0 ? '+' : '−'}${Math.abs(dNi).toFixed(2)}%)` : ' · input');
        tip.querySelector('.tt-hpm').textContent = usd(r.hpm);
        const dEl = tip.querySelector('.tt-delta');
        dEl.textContent = Math.abs(r.delta) < 0.005 ? 'sama dengan input' : signedUsd(r.delta) + ' vs input';
        dEl.className = 'tt-delta ' + (r.delta > 0.005 ? 'up' : r.delta < -0.005 ? 'down' : '');
        tip.querySelector('.tt-grades').textContent =
            `Fe ${pct(r.fe)} · Co ${pct(r.co, 3)} · Cr ${pct(r.cr)} · MC ${pct(r.mc)}`;
        tip.querySelector('.tt-cf').textContent =
            `CF Ni ${pct(r.cfNi * 100)} · Fe ${r.feIncluded ? 'dihitung' : 'tidak dihitung'} · Co ${r.coIncluded ? 'dihitung' : 'tidak dihitung'}`;

        tip.classList.add('show');
        document.querySelectorAll('#sens-table tbody tr').forEach((tr, k) => tr.classList.toggle('is-hover', k === i));
        if (docked) { tip.style.left = ''; tip.style.top = ''; return; }

        // posisi tooltip relatif kartu grafik
        const host = document.getElementById('sens-chart-main');
        const scale = host.clientWidth / res.W;
        const x = res.x * scale;
        const tw = tip.offsetWidth;
        let left = x + 14;
        if (left + tw > host.clientWidth) left = x - tw - 14;
        tip.style.left = Math.max(0, left) + 'px';
        tip.style.top = '8px';
    }

    function renderTable() {
        const s = state.data;
        const tbody = document.querySelector('#sens-table tbody');
        tbody.textContent = '';
        s.rows.forEach(r => {
            const tr = document.createElement('tr');
            if (Math.abs(r.ni - s.ni0) < 1e-9) tr.className = 'is-base';
            [pct(r.ni), pct(r.fe), pct(r.co, 3), pct(r.cr), pct(r.mc), pct(r.cfNi * 100), usd(r.hpm),
             Math.abs(r.delta) < 0.005 ? '-' : signedUsd(r.delta)].forEach(v => {
                const td = document.createElement('td');
                td.textContent = v;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        document.getElementById('sens-table-count').textContent = s.rows.length;
    }

    // ---------- public ----------
    function update(inputs) {
        lastInputs = inputs;
        if (!inputs || !(parseFloat(inputs.ni) > 0)) { state.data = null; render(); return; }
        const opts = { range: state.range, mode: state.mode, path: state.path };
        state.data = HPM.sensitivity(inputs, opts);
        state.ghost = state.mode === 'geo' ? HPM.sensitivity(inputs, { ...opts, mode: 'tetap' }) : null;
        if (state.hover !== null && (!state.data || state.hover >= state.data.rows.length)) state.hover = null;
        render();
    }

    function bindSeg(groupId, key, parse = v => v) {
        const group = document.getElementById(groupId);
        group.addEventListener('click', e => {
            const btn = e.target.closest('button[data-value]');
            if (!btn) return;
            group.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
            state[key] = parse(btn.dataset.value);
            state.hover = null;
            update(lastInputs);
        });
    }

    function init() {
        bindSeg('sens-range', 'range', parseFloat);
        bindSeg('sens-mode', 'mode');
        bindSeg('sens-path', 'path');

        // keyboard: panah kiri/kanan menggeser titik
        const main = document.getElementById('sens-chart-main');
        main.addEventListener('keydown', e => {
            if (!state.data) return;
            const n = state.data.rows.length;
            const baseIdx = state.data.rows.findIndex(r => Math.abs(r.ni - state.data.ni0) < 1e-9);
            let i = state.hover ?? baseIdx;
            if (e.key === 'ArrowRight') i = Math.min(n - 1, i + 1);
            else if (e.key === 'ArrowLeft') i = Math.max(0, i - 1);
            else if (e.key === 'Escape') i = null;
            else return;
            e.preventDefault();
            setHover(i);
        });
        main.addEventListener('blur', () => setHover(null));

        let raf = null;
        window.addEventListener('resize', () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => state.data && render());
        });
    }

    return { init, update };
})();
