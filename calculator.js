// ============================================================
// HPM Bijih Nikel Calculator — KEPMEN ESDM No. 363.K/MB.01/MEM.B/2026
// (Perubahan Kedua atas Kepmen ESDM No. 268.K/MB.01/MEM.B/2025,
//  berlaku efektif 15 September 2026)
// Core Calculation Engine
// ============================================================

const HPM = (() => {
    // --- Regulatory Constants ---
    const REGS = {
        // ---- Formula berlaku: KEPMEN 363/2026 ----
        // Ni > 1,2%  : CF = 30% pada Ni 1,6%, ±1% per ±0,1% Ni
        // Ni ≤ 1,2%  : CF = 14% pada Ni 1,2%, turun 1% per penurunan 0,1% Ni
        CF_NI_BASELINE: 0.30,        // 30% pada Ni = 1,6%
        BASELINE_NI: 0.016,          // 1,6% Ni
        LOW_GRADE_NI: 0.012,         // batas kadar rendah: Ni ≤ 1,2%
        CF_NI_LOW_GRADE: 0.14,       // 14% pada Ni = 1,2%
        CF_SENSITIVITY: 0.01,        // 1% per 0,1% Ni
        CF_FE: 0.30,                 // 30% tetap
        CF_CO: 0.30,                 // 30% bila Ni > 1,2%
        CF_CO_LOW_GRADE: 0.17,       // 17% bila Ni ≤ 1,2%
        CF_CR: 0.10,                 // 10% tetap
        THRESHOLD_FE: 0.35,          // Fe dihitung bila ≤ 35%
        THRESHOLD_CO: 0.0005,        // Co dihitung bila ≥ 0,05%

        // ---- Formula sebelumnya: KEPMEN 144/2026 (perubahan pertama) ----
        // CF Ni linear 30% @1,6% untuk semua kadar; CF Co 30% untuk semua kadar
        CF_CO_PREV: 0.30,
    };

    // Tolerance for floating-point comparison at the 1,2% boundary
    // (mis. input 1.2 → 0.012 bisa jadi 0.012000000000000002)
    const EPS = 1e-9;

    // --- Ore Type Presets ---
    const PRESETS = {
        limonite: {
            ni: 1.35, fe: 40.50, co: 0.15, cr: 2.24, mc: 36.69,
            label: 'Limonit'
        },
        lowgrade: {
            ni: 1.20, fe: 45.00, co: 0.10, cr: 2.00, mc: 35.00,
            label: 'Limonit Kadar Rendah'
        },
        saprolite: {
            ni: 1.81, fe: 11.79, co: 0.03, cr: 0.77, mc: 35.00,
            label: 'Saprolit'
        }
    };

    // --- Default HMA values: Periode I Oktober 2026 (will be updated by fetch) ---
    let defaultHMA = {
        nikel: 16322.67,
        bijihBesi: 1.45,
        kobalt: 41047.33,
        bijihKrom: 6.37,
        lastUpdated: null,
        periode: 'Periode I Oktober 2026',
        dasarHukum: 'Kepmen ESDM No. 384.K/MB.01/MEM.B/2026',
        sumber: 'data bawaan aplikasi'
    };

    const VERSION = '2.2.0';

    /**
     * Convert percentage input to decimal form.
     * User always enters in percent (e.g., 1.35 means 1.35% → 0.0135)
     */
    function toDecimal(val) {
        const v = parseFloat(val);
        if (isNaN(v)) return 0;
        return v / 100;
    }

    /** Ni ≤ 1,2% → masuk rezim kadar rendah (Kepmen 363/2026) */
    function isLowGrade(niDecimal) {
        return niDecimal <= REGS.LOW_GRADE_NI + EPS;
    }

    /**
     * CF Bijih Nikel Aktual — KEPMEN 363/2026
     *   Ni > 1,2% : CF = 30% + ((Ni − 1,6%) / 0,1%) × 1%
     *   Ni ≤ 1,2% : CF = 14% + ((Ni − 1,2%) / 0,1%) × 1%
     */
    function calculateCFNi(niDecimal) {
        let cf;
        if (isLowGrade(niDecimal)) {
            cf = REGS.CF_NI_LOW_GRADE
                + ((niDecimal - REGS.LOW_GRADE_NI) / 0.001) * REGS.CF_SENSITIVITY;
        } else {
            cf = REGS.CF_NI_BASELINE
                + ((niDecimal - REGS.BASELINE_NI) / 0.001) * REGS.CF_SENSITIVITY;
        }
        return Math.max(0, cf);
    }

    /**
     * CF Bijih Nikel — KEPMEN 144/2026 (sebelumnya): linear 30% @1,6% untuk semua kadar
     */
    function calculateCFNiPrev(niDecimal) {
        const deltaCF = ((niDecimal - REGS.BASELINE_NI) / 0.001) * REGS.CF_SENSITIVITY;
        return Math.max(0, REGS.CF_NI_BASELINE + deltaCF);
    }

    /** CF Kobalt ikutan — KEPMEN 363/2026: 30% (Ni > 1,2%) atau 17% (Ni ≤ 1,2%) */
    function calculateCFCo(niDecimal) {
        return isLowGrade(niDecimal) ? REGS.CF_CO_LOW_GRADE : REGS.CF_CO;
    }

    /** Fe threshold: dihitung bila Fe ≤ 35% */
    function checkFe(feDecimal) {
        return feDecimal <= REGS.THRESHOLD_FE + EPS;
    }

    /** Co threshold: dihitung bila Co ≥ 0,05% */
    function checkCo(coDecimal) {
        return coDecimal >= REGS.THRESHOLD_CO - EPS;
    }

    /**
     * Generic HPM builder (shared by current & previous formula)
     * HPM = [(%Ni × CF_Ni × HMA_Ni)
     *      + (%Fe × CF_Fe × HMA_BijihBesi × 100)
     *      + (%Co × CF_Co × HMA_Co)
     *      + (%Cr × CF_Cr × HMA_BijihKrom × 100)] × (1 − MC)
     */
    function buildHPM({ ni, fe, co, cr, mc, hmaNi, hmaFe, hmaCo, hmaCr, cfNi, cfCo }) {
        const feIncluded = checkFe(fe);
        const coIncluded = checkCo(co);

        const komponenNi = ni * cfNi * hmaNi;
        const komponenFe = feIncluded ? fe * REGS.CF_FE * hmaFe * 100 : 0;
        const komponenCo = coIncluded ? co * cfCo * hmaCo : 0;
        const komponenCr = cr * REGS.CF_CR * hmaCr * 100;

        const subTotal = komponenNi + komponenFe + komponenCo + komponenCr;
        const faktorMC = 1 - mc;
        const hpm = subTotal * faktorMC;

        return { feIncluded, coIncluded, komponenNi, komponenFe, komponenCo, komponenCr, subTotal, faktorMC, hpm };
    }

    /**
     * Main HPM calculation — KEPMEN 363/2026, with comparison to KEPMEN 144/2026
     */
    function calculate(inputs) {
        const ni = toDecimal(inputs.ni);
        const fe = toDecimal(inputs.fe);
        const co = toDecimal(inputs.co);
        const cr = toDecimal(inputs.cr);
        const mc = toDecimal(inputs.mc);

        const hmaNi = parseFloat(inputs.hmaNikel) || 0;
        const hmaFe = parseFloat(inputs.hmaBijihBesi) || 0;
        const hmaCo = parseFloat(inputs.hmaKobalt) || 0;
        const hmaCr = parseFloat(inputs.hmaBijihKrom) || 0;

        const base = { ni, fe, co, cr, mc, hmaNi, hmaFe, hmaCo, hmaCr };

        // --- Current: KEPMEN 363/2026 ---
        const lowGrade = isLowGrade(ni);
        const cfNi = calculateCFNi(ni);
        const cfCo = calculateCFCo(ni);
        const cur = buildHPM({ ...base, cfNi, cfCo });

        const refNi = lowGrade ? REGS.LOW_GRADE_NI : REGS.BASELINE_NI;
        const refCF = lowGrade ? REGS.CF_NI_LOW_GRADE : REGS.CF_NI_BASELINE;
        const deltaNi = ni - refNi;
        const deltaCFNi = (deltaNi / 0.001) * REGS.CF_SENSITIVITY;

        // --- Previous: KEPMEN 144/2026 ---
        const cfNiPrev = calculateCFNiPrev(ni);
        const cfCoPrev = REGS.CF_CO_PREV;
        const prev = buildHPM({ ...base, cfNi: cfNiPrev, cfCo: cfCoPrev });

        const selisih = cur.hpm - prev.hpm;
        const pctPerubahan = prev.hpm !== 0 ? (selisih / prev.hpm) : 0;

        return {
            // Inputs
            ni, fe, co, cr, mc,
            hmaNi, hmaFe, hmaCo, hmaCr,

            // Regime & CF
            lowGrade,
            refNi, refCF,
            cfNi, cfCo,
            deltaNi, deltaCFNi,

            // Thresholds
            feIncluded: cur.feIncluded,
            coIncluded: cur.coIncluded,

            // Components (DMT basis)
            komponenNi: cur.komponenNi,
            komponenFe: cur.komponenFe,
            komponenCo: cur.komponenCo,
            komponenCr: cur.komponenCr,
            subTotal: cur.subTotal,

            // Final HPM (WMT)
            faktorMC: cur.faktorMC,
            hpm: cur.hpm,

            // Previous formula comparison (KEPMEN 144/2026)
            cfNiPrev, cfCoPrev,
            hpmPrev: prev.hpm,
            selisih,
            pctPerubahan
        };
    }

    // Rentang wajar HMA (USD/dmt) — menolak hasil parse yang keliru
    const HMA_SANITY = {
        nikel:     [5000, 60000],
        kobalt:    [5000, 150000],
        bijihBesi: [0.1, 10],
        bijihKrom: [0.5, 50],
    };

    function isValidHMA(d) {
        return !!d && Object.entries(HMA_SANITY).every(([k, [min, max]]) =>
            typeof d[k] === 'number' && d[k] >= min && d[k] <= max);
    }

    async function fetchWithTimeout(url, ms, opts = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), ms);
        try {
            return await fetch(url, { ...opts, signal: controller.signal });
        } finally {
            clearTimeout(timeoutId);
        }
    }

    // Salinan hma.json di luar GitHub Pages (CORS terbuka), dipakai bila
    // file di situs sendiri tidak terjangkau
    const HMA_MIRRORS = [
        'https://raw.githubusercontent.com/raihankarim19/Kalkulator-HPM-Nikel/main/hma.json',
        'https://cdn.jsdelivr.net/gh/raihankarim19/Kalkulator-HPM-Nikel@main/hma.json',
    ];

    async function fetchJSON(url, ms) {
        const res = await fetchWithTimeout(url, ms, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (!isValidHMA(data)) throw new Error('Data HMA tidak valid');
        return data;
    }

    /**
     * Ambil HMA terbaru. Urutan sumber:
     *  1. hma.json di situs ini (diperbarui otomatis oleh GitHub Actions)
     *  2. Salinan hma.json di GitHub raw / jsDelivr
     *  3. Halaman HMA ESDM lewat CORS proxy publik
     *  4. HMA bawaan aplikasi (ditandai fallback: true)
     * Tidak pernah melempar error; pemanggil cukup memeriksa `fallback`.
     */
    async function fetchHMA() {
        // 1) Situs sendiri
        try {
            const data = await fetchJSON('hma.json?t=' + Date.now(), 6000);
            return { ...data, lastUpdated: new Date().toISOString(), via: 'repo' };
        } catch (e) { /* lanjut */ }

        // 2) Mirror (paralel, ambil yang pertama berhasil)
        try {
            const data = await Promise.any(HMA_MIRRORS.map(u => fetchJSON(u + '?t=' + Date.now(), 6000)));
            return { ...data, lastUpdated: new Date().toISOString(), via: 'mirror' };
        } catch (e) { /* lanjut */ }

        // 3) ESDM via proxy (paralel)
        const targetUrl = 'https://www.minerba.esdm.go.id/harga_acuan';
        const proxies = [
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
            `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
            `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`,
        ];
        const attempt = async (proxyUrl) => {
            const res = await fetchWithTimeout(proxyUrl, 8000, {
                headers: { 'Accept': 'text/html,application/xhtml+xml,*/*' }
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const parsed = parseHMAFromHTML(await res.text());
            if (!parsed) throw new Error('Tabel HMA tidak ditemukan');
            return parsed;
        };
        try {
            return await Promise.any(proxies.map(attempt));
        } catch (e) { /* lanjut */ }

        // 4) Data bawaan
        return { ...defaultHMA, fallback: true, via: 'bawaan' };
    }

    /**
     * Parse HMA dari halaman ESDM. Mengembalikan null bila keempat HMA
     * tidak ditemukan atau tidak wajar (mis. halaman "sedang perbaikan").
     */
    function parseHMAFromHTML(html) {
        if (typeof DOMParser === 'undefined') return null;
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const found = {};

        for (const row of doc.querySelectorAll('tr')) {
            const cells = row.querySelectorAll('td, th');
            if (cells.length < 2) continue;

            const labelLower = (cells[0]?.textContent || '').trim().toLowerCase();
            let key = null;
            if ((labelLower.includes('nikel') || labelLower.includes('nickel'))
                && !labelLower.includes('bijih') && !labelLower.includes('ore')) key = 'nikel';
            else if (labelLower.includes('kobalt') || labelLower.includes('cobalt')) key = 'kobalt';
            else if (labelLower.includes('bijih besi') || labelLower.includes('laterit')
                || labelLower.includes('hematit') || labelLower.includes('magnetit')
                || labelLower.includes('iron ore')) key = 'bijihBesi';
            else if (labelLower.includes('krom') || labelLower.includes('chrom')) key = 'bijihKrom';
            if (!key || found[key] !== undefined) continue;

            // Nilai numerik paling kanan = periode terbaru
            for (let i = cells.length - 1; i >= 1; i--) {
                const cellText = (cells[i]?.textContent || '').trim().replace(/[^\d.,-]/g, '');
                if (!/\d/.test(cellText)) continue;
                const lastComma = cellText.lastIndexOf(',');
                const lastPeriod = cellText.lastIndexOf('.');
                const numStr = lastComma > lastPeriod
                    ? cellText.replace(/\./g, '').replace(',', '.')   // format ID: 16.322,67
                    : cellText.replace(/,/g, '');                      // format US: 16,322.67
                const num = parseFloat(numStr);
                if (!isNaN(num) && num > 0) { found[key] = num; break; }
            }
        }

        if (!isValidHMA(found)) return null;
        return {
            ...found,
            periode: 'Live ESDM',
            sumber: 'Ditjen Minerba ESDM',
            lastUpdated: new Date().toISOString(),
            via: 'esdm'
        };
    }

    /** Format number as USD currency */
    function formatUSD(value, decimals = 2) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(value);
    }

    /** Format as percentage */
    function formatPct(value, decimals = 2) {
        return (value * 100).toFixed(decimals) + '%';
    }

    return {
        VERSION,
        REGS,
        PRESETS,
        defaultHMA,
        toDecimal,
        isLowGrade,
        calculateCFNi,
        calculateCFNiPrev,
        calculateCFCo,
        checkFe,
        checkCo,
        calculate,
        isValidHMA,
        fetchHMA,
        formatUSD,
        formatPct
    };
})();

// Allow use from Node (tests) without affecting the browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HPM;
}
