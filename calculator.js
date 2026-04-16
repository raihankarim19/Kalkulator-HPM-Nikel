// ============================================================
// HPM Bijih Nikel Calculator — KEPMEN ESDM No. 144/2026
// Core Calculation Engine
// ============================================================

const HPM = (() => {
    // --- Regulatory Constants ---
    const REGS = {
        // New formula (KEPMEN 144/2026)
        CF_NI_BASELINE: 0.30,       // 30% at Ni = 1.6%
        BASELINE_NI: 0.016,          // 1.6% Ni
        CF_SENSITIVITY: 0.01,        // 1% per 0.1% Ni
        CF_FE: 0.30,                 // 30% fixed
        CF_CO: 0.30,                 // 30% fixed
        CF_CR: 0.10,                 // 10% fixed
        THRESHOLD_FE: 0.35,          // Fe ≤ 35%
        THRESHOLD_CO: 0.0005,        // Co ≥ 0.05%

        // Old formula (KEPMEN 268/2025)
        CF_NI_BASELINE_OLD: 0.20,    // 20% at Ni = 1.9%
        BASELINE_NI_OLD: 0.019,      // 1.9% Ni
    };

    // --- Ore Type Presets ---
    const PRESETS = {
        limonite: {
            ni: 1.35, fe: 40.50, co: 0.15, cr: 2.24, mc: 36.69,
            label: 'Limonit'
        },
        saprolite: {
            ni: 1.81, fe: 11.79, co: 0.03, cr: 0.77, mc: 35.00,
            label: 'Saprolit'
        }
    };

    // --- Default HMA values (will be updated by fetch) ---
    let defaultHMA = {
        nikel: 17092.67,
        bijihBesi: 1.55,
        kobalt: 55848,
        bijihKrom: 6.37,
        lastUpdated: null,
        periode: null
    };

    /**
     * Convert percentage input to decimal form.
     * User always enters in percent (e.g., 1.35 means 1.35% → 0.0135)
     * ALL inputs are percentage form, so always divide by 100.
     */
    function toDecimal(val) {
        const v = parseFloat(val);
        if (isNaN(v)) return 0;
        return v / 100;
    }

    /**
     * Calculate CF Bijih Nikel Aktual (new formula)
     * CF = MAX(0, CF_baseline + ((Ni - baseline) / 0.001) × sensitivity)
     */
    function calculateCFNi(niDecimal) {
        const deltaCF = ((niDecimal - REGS.BASELINE_NI) / 0.001) * REGS.CF_SENSITIVITY;
        return Math.max(0, REGS.CF_NI_BASELINE + deltaCF);
    }

    /**
     * Calculate CF Bijih Nikel Aktual (old formula)
     */
    function calculateCFNiOld(niDecimal) {
        const deltaCF = ((niDecimal - REGS.BASELINE_NI_OLD) / 0.001) * REGS.CF_SENSITIVITY;
        return Math.max(0, REGS.CF_NI_BASELINE_OLD + deltaCF);
    }

    /**
     * Check Fe threshold: included when Fe ≤ 35%
     */
    function checkFe(feDecimal) {
        return feDecimal <= REGS.THRESHOLD_FE;
    }

    /**
     * Check Co threshold: included when Co ≥ 0.05%
     */
    function checkCo(coDecimal) {
        return coDecimal >= REGS.THRESHOLD_CO;
    }

    /**
     * Main HPM calculation — KEPMEN 144/2026
     * HPM = [(% Ni × CF_Ni × HMA_Ni)
     *      + (% Fe × CF_Fe × HMA_BijihBesi × 100)
     *      + (% Co × CF_Co × HMA_Co)
     *      + (% Cr × CF_Cr × HMA_BijihKrom × 100)] × (1 - MC)
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

        // CF calculations
        const cfNi = calculateCFNi(ni);
        const feIncluded = checkFe(fe);
        const coIncluded = checkCo(co);

        // Component calculations (before MC)
        const komponenNi = ni * cfNi * hmaNi;
        const komponenFe = feIncluded ? fe * REGS.CF_FE * hmaFe * 100 : 0;
        const komponenCo = coIncluded ? co * REGS.CF_CO * hmaCo : 0;
        const komponenCr = cr * REGS.CF_CR * hmaCr * 100;

        const subTotal = komponenNi + komponenFe + komponenCo + komponenCr;
        const faktorMC = 1 - mc;
        const hpm = subTotal * faktorMC;

        // Old formula comparison
        const cfNiOld = calculateCFNiOld(ni);
        const hpmOld = ni * cfNiOld * hmaNi * faktorMC;
        const selisih = hpm - hpmOld;
        const pctKenaikan = hpmOld !== 0 ? (selisih / hpmOld) : 0;

        return {
            // Inputs
            ni, fe, co, cr, mc,
            hmaNi, hmaFe, hmaCo, hmaCr,

            // CF
            cfNi,
            deltaNi: ni - REGS.BASELINE_NI,
            deltaCFNi: ((ni - REGS.BASELINE_NI) / 0.001) * REGS.CF_SENSITIVITY,

            // Thresholds
            feIncluded,
            coIncluded,

            // Components (DMT basis)
            komponenNi,
            komponenFe,
            komponenCo,
            komponenCr,
            subTotal,

            // Final HPM (WMT)
            faktorMC,
            hpm,

            // Old formula comparison
            cfNiOld,
            hpmOld,
            selisih,
            pctKenaikan
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
        let lastError = null;

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
                lastError = e;
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

        // Find all tables
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
                    // Skip empty cells or non-numeric text
                    if (!cellText || !/\d/.test(cellText)) continue;

                    // Detect number format:
                    // US format:  16,933.57  (comma=thousands, period=decimal)
                    // ID format:  16.933,57  (period=thousands, comma=decimal)
                    // Plain:      16933.57 or 16933
                    const lastComma = cellText.lastIndexOf(',');
                    const lastPeriod = cellText.lastIndexOf('.');

                    let numStr;
                    if (lastComma > lastPeriod) {
                        // ID format: period is thousands, comma is decimal
                        numStr = cellText.replace(/\./g, '').replace(',', '.');
                    } else if (lastPeriod > lastComma) {
                        // US format: comma is thousands, period is decimal
                        numStr = cellText.replace(/,/g, '');
                    } else {
                        // No separators or equal position — try direct parse
                        numStr = cellText.replace(/,/g, '');
                    }

                    const num = parseFloat(numStr);
                    if (!isNaN(num) && num > 0) {
                        latestValue = num;
                        break;
                    }
                }

                if (latestValue === null) continue;

                // Match mineral names (support various formats from ESDM)
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

    /**
     * Format number as USD currency
     */
    function formatUSD(value, decimals = 2) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(value);
    }

    /**
     * Format as percentage
     */
    function formatPct(value, decimals = 2) {
        return (value * 100).toFixed(decimals) + '%';
    }

    return {
        REGS,
        PRESETS,
        defaultHMA,
        toDecimal,
        calculateCFNi,
        calculateCFNiOld,
        checkFe,
        checkCo,
        calculate,
        fetchHMA,
        formatUSD,
        formatPct
    };
})();
