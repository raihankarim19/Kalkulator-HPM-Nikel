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
        periode: 'Periode I Oktober 2026'
    };

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

    /**
     * Fetch HMA from ESDM website via CORS proxy
     * Tries multiple proxy services for redundancy
     */
    async function fetchHMA() {
        const targetUrl = 'https://www.minerba.esdm.go.id/harga_acuan';
        const proxies = [
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
            `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
            `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`,
            `https://www.whateverorigin.org/get?url=${encodeURIComponent(targetUrl)}&callback=`,
            `https://thingproxy.freeboard.io/fetch/${targetUrl}`
        ];

        let html = null;

        for (const proxyUrl of proxies) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 12000);

                const response = await fetch(proxyUrl, {
                    signal: controller.signal,
                    headers: {
                        'Accept': 'text/html,application/xhtml+xml,*/*'
                    }
                });
                clearTimeout(timeoutId);

                if (response.ok) {
                    let text = await response.text();
                    // Handle JSONP callback wrapper from whateverorigin
                    if (text.startsWith('(') || text.startsWith('{')) {
                        try {
                            const json = JSON.parse(text.replace(/^\(|\);?$/g, ''));
                            text = json.contents || json.html || text;
                        } catch(e) { /* not JSON, use as-is */ }
                    }
                    // Verify it's actual HTML from ESDM
                    if (text.includes('minerba') || text.includes('harga') || text.includes('Nikel')) {
                        html = text;
                        break;
                    }
                }
            } catch (e) {
                continue;
            }
        }

        if (!html) {
            throw new Error('Gagal mengambil data HMA. Semua proxy tidak merespon. Silakan input manual.');
        }

        return parseHMAFromHTML(html);
    }

    /**
     * Parse HMA values from ESDM HTML page
     * The ESDM table has rows like:
     *   Nikel | value_period1 | value_period2 | ...
     */
    function parseHMAFromHTML(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        let result = { ...defaultHMA };
        result.lastUpdated = new Date().toISOString();
        result.periode = null;

        const tables = doc.querySelectorAll('table');

        for (const table of tables) {
            const rows = table.querySelectorAll('tr');
            for (const row of rows) {
                const cells = row.querySelectorAll('td, th');
                if (cells.length < 2) continue;

                const label = (cells[0]?.textContent || '').trim();
                const labelLower = label.toLowerCase();

                // Get the latest non-empty numeric value (last column first)
                let latestValue = null;
                for (let i = cells.length - 1; i >= 1; i--) {
                    let cellText = (cells[i]?.textContent || '').trim();
                    if (!cellText || !/\d/.test(cellText)) continue;

                    // US format: 16,933.57 | ID format: 16.933,57 | Plain: 16933.57
                    const lastComma = cellText.lastIndexOf(',');
                    const lastPeriod = cellText.lastIndexOf('.');

                    let numStr;
                    if (lastComma > lastPeriod) {
                        numStr = cellText.replace(/\./g, '').replace(',', '.');
                    } else {
                        numStr = cellText.replace(/,/g, '');
                    }

                    const num = parseFloat(numStr);
                    if (!isNaN(num) && num > 0) {
                        latestValue = num;
                        break;
                    }
                }

                if (latestValue === null) continue;

                if ((labelLower.includes('nikel') || labelLower.includes('nickel'))
                    && !labelLower.includes('bijih nikel')
                    && !labelLower.includes('ore')) {
                    result.nikel = latestValue;
                } else if (labelLower.includes('kobalt') || labelLower.includes('cobalt')) {
                    result.kobalt = latestValue;
                } else if (labelLower.includes('bijih besi')
                    || labelLower.includes('laterit')
                    || labelLower.includes('hematit')
                    || labelLower.includes('magnetit')
                    || labelLower.includes('iron ore')) {
                    result.bijihBesi = latestValue;
                } else if (labelLower.includes('krom') || labelLower.includes('chrom')) {
                    result.bijihKrom = latestValue;
                }
            }
        }

        return result;
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
        fetchHMA,
        formatUSD,
        formatPct
    };
})();

// Allow use from Node (tests) without affecting the browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HPM;
}
