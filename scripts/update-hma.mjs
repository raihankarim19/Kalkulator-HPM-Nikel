#!/usr/bin/env node
// ============================================================
// Ambil HMA terbaru dari minerba.esdm.go.id dan perbarui hma.json.
// Dijalankan oleh GitHub Actions (.github/workflows/update-hma.yml).
// Tanpa dependensi: butuh Node 18+ (fetch bawaan).
//
// Aman by design: hma.json hanya ditulis bila keempat HMA ditemukan
// DAN semuanya lolos uji kewajaran. Bila situs ESDM down, sedang
// perbaikan, atau strukturnya berubah, file dibiarkan apa adanya.
// ============================================================

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const SOURCE_URL = 'https://www.minerba.esdm.go.id/harga_acuan';
const HMA_PATH = fileURLToPath(new URL('../hma.json', import.meta.url));

// Rentang wajar (USD/dmt). Di luar rentang = kemungkinan salah parse.
export const SANITY = {
    nikel:     [5000, 60000],
    kobalt:    [5000, 150000],
    bijihBesi: [0.1, 10],
    bijihKrom: [0.5, 50],
};

const BULAN = /(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)/i;

function cleanText(html) {
    return html
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/\s+/g, ' ')
        .trim();
}

/** "16.322,67" | "16,322.67" | "16322.67" → 16322.67 */
export function parseNumber(text) {
    if (!text || !/\d/.test(text)) return null;
    const s = text.replace(/[^\d.,-]/g, '');
    const lastComma = s.lastIndexOf(',');
    const lastPeriod = s.lastIndexOf('.');
    const numStr = lastComma > lastPeriod
        ? s.replace(/\./g, '').replace(',', '.')
        : s.replace(/,/g, '');
    const n = parseFloat(numStr);
    return Number.isFinite(n) && n > 0 ? n : null;
}

function classify(label) {
    const l = label.toLowerCase();
    if ((l.includes('nikel') || l.includes('nickel')) && !l.includes('bijih') && !l.includes('ore')) return 'nikel';
    if (l.includes('kobalt') || l.includes('cobalt')) return 'kobalt';
    if (l.includes('bijih besi') || l.includes('laterit') || l.includes('hematit') || l.includes('magnetit') || l.includes('iron ore')) return 'bijihBesi';
    if (l.includes('krom') || l.includes('chrom')) return 'bijihKrom';
    return null;
}

/**
 * Parse tabel HMA dari HTML. Untuk tiap baris komoditas, ambil nilai
 * numerik paling kanan (= periode terbaru). Label periode diambil dari
 * header kolom terakhir bila memuat nama bulan.
 */
export function parseHMA(html) {
    const result = {};
    let periode = null;

    const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];
    for (const row of rows) {
        const cells = (row.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) || []).map(cleanText);
        if (cells.length < 2) continue;

        if (!periode) {
            const headerCells = cells.filter(c => BULAN.test(c));
            if (headerCells.length) periode = headerCells[headerCells.length - 1];
        }

        const key = classify(cells[0]);
        if (!key || result[key] !== undefined) continue;

        for (let i = cells.length - 1; i >= 1; i--) {
            const n = parseNumber(cells[i]);
            if (n !== null) { result[key] = n; break; }
        }
    }
    return { ...result, periode };
}

export function validate(hma) {
    const problems = [];
    for (const [key, [min, max]] of Object.entries(SANITY)) {
        const v = hma[key];
        if (v === undefined) problems.push(`${key} tidak ditemukan`);
        else if (v < min || v > max) problems.push(`${key}=${v} di luar rentang wajar [${min}, ${max}]`);
    }
    return problems;
}

async function main() {
    let html;
    try {
        const res = await fetch(SOURCE_URL, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Kalkulator-HPM-Nikel updater)' },
            signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        html = await res.text();
    } catch (e) {
        console.log(`⚠️  Gagal mengambil ${SOURCE_URL}: ${e.message}. hma.json tidak diubah.`);
        return;
    }

    if (/sedang dalam perbaikan|maintenance/i.test(html)) {
        console.log('⚠️  Situs Minerba sedang perbaikan. hma.json tidak diubah.');
        return;
    }

    const parsed = parseHMA(html);
    const problems = validate(parsed);
    if (problems.length) {
        console.log('⚠️  Hasil parse tidak lolos validasi, hma.json tidak diubah:\n   - ' + problems.join('\n   - '));
        return;
    }

    const current = JSON.parse(await readFile(HMA_PATH, 'utf8'));
    const keys = Object.keys(SANITY);
    if (keys.every(k => current[k] === parsed[k])) {
        console.log('✓ HMA tidak berubah.');
        return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const next = {
        periode: parsed.periode || `HMA terbaru per ${today}`,
        dasarHukum: null,
        satuan: 'USD/dmt',
        nikel: parsed.nikel,
        kobalt: parsed.kobalt,
        bijihBesi: parsed.bijihBesi,
        bijihKrom: parsed.bijihKrom,
        sumber: 'Ditjen Minerba ESDM - minerba.esdm.go.id/harga_acuan',
        sumberUrl: SOURCE_URL,
        diperbarui: today,
        metode: 'otomatis',
    };
    await writeFile(HMA_PATH, JSON.stringify(next, null, 2) + '\n');
    console.log('✓ hma.json diperbarui:', next);
}

// Jalankan main() hanya bila dipanggil langsung (bukan saat di-import test)
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    main();
}
