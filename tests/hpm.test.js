// ============================================================
// Unit test engine HPM - Kepmen ESDM 363.K/MB.01/MEM.B/2026
// Jalankan: npm test   (atau: node --test tests/*.test.js)
// ============================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const HPM = require('../calculator.js');

// Toleransi pembulatan: 1 sen
const near = (actual, expected, tol = 0.006) =>
    assert.ok(Math.abs(actual - expected) <= tol,
        `expected ${expected}, got ${actual.toFixed(4)}`);

// Asumsi kualitas bijih yang konsisten dengan publikasi SMM:
// Fe > 35% (tidak dihitung), Co 0,10%, Cr 2%, MC 35%
const smmOre = { fe: 45, co: 0.10, cr: 2, mc: 35 };

const PERIODS = {
    'Sep-II 2026': { hmaNikel: 16698.00, hmaKobalt: 52704.33, hmaBijihBesi: 1.47, hmaBijihKrom: 6.37 },
    'Okt-I 2026':  { hmaNikel: 16322.67, hmaKobalt: 41047.33, hmaBijihBesi: 1.45, hmaBijihKrom: 6.37 },
};

test('CF Ni - rezim normal (Ni > 1,2%)', () => {
    near(HPM.calculateCFNi(0.016), 0.30, 1e-9);
    near(HPM.calculateCFNi(0.018), 0.32, 1e-9);
    near(HPM.calculateCFNi(0.013), 0.27, 1e-9);
    near(HPM.calculateCFNi(0.0121), 0.261, 1e-9);
});

test('CF Ni - rezim kadar rendah (Ni ≤ 1,2%)', () => {
    near(HPM.calculateCFNi(0.012), 0.14, 1e-9);
    near(HPM.calculateCFNi(0.011), 0.13, 1e-9);
    near(HPM.calculateCFNi(0.010), 0.12, 1e-9);
});

test('Batas 1,2% tahan floating-point (input 1.2 → 0.012000…02)', () => {
    assert.equal(HPM.isLowGrade(HPM.toDecimal('1.2')), true);
    assert.equal(HPM.isLowGrade(HPM.toDecimal('1.21')), false);
});

test('CF Ni tidak pernah negatif (ekstrapolasi rezim kadar rendah: Ni 0% → 2%)', () => {
    near(HPM.calculateCFNi(0), 0.02, 1e-9);
    for (let ni = 0; ni <= 0.05; ni += 0.0005) {
        assert.ok(HPM.calculateCFNi(ni) >= 0);
        assert.ok(HPM.calculateCFNiPrev(ni) >= 0);
    }
});

test('CF Kobalt ikutan: 17% bila Ni ≤ 1,2%, 30% bila Ni > 1,2%', () => {
    assert.equal(HPM.calculateCFCo(0.012), 0.17);
    assert.equal(HPM.calculateCFCo(0.013), 0.30);
});

test('Threshold Fe ≤ 35% dan Co ≥ 0,05%', () => {
    assert.equal(HPM.checkFe(0.35), true);
    assert.equal(HPM.checkFe(0.3501), false);
    assert.equal(HPM.checkCo(0.0005), true);
    assert.equal(HPM.checkCo(0.0004), false);
});

// Angka publikasi SMM (USD/wmt)
const PUBLISHED = [
    ['Sep-II 2026', 1.2, 24.89, 44.97],
    ['Sep-II 2026', 1.3, 49.20, 49.20],
    ['Okt-I 2026',  1.2, 23.19, null],
    ['Okt-I 2026',  1.3, 46.07, null],
];

for (const [period, ni, expected, expectedPrev] of PUBLISHED) {
    test(`HPM ${period}, Ni ${ni}% = $${expected}/wmt (publikasi SMM)`, () => {
        const r = HPM.calculate({ ni, ...smmOre, ...PERIODS[period] });
        near(r.hpm, expected);
        if (expectedPrev !== null) near(r.hpmPrev, expectedPrev);
    });
}

test('Saprolit (Ni > 1,2%): rumus 363/2026 = rumus 144/2026', () => {
    const r = HPM.calculate({ ni: 1.81, fe: 11.79, co: 0.03, cr: 0.77, mc: 35, ...PERIODS['Okt-I 2026'] });
    near(r.selisih, 0, 1e-9);
});

// ------------------------------------------------------------
// Sensitivitas kadar Ni + korelasi geologis
// ------------------------------------------------------------
const OKT = PERIODS['Okt-I 2026'];
const LIMONIT = { ni: 1.35, fe: 40.5, co: 0.15, cr: 2.24, mc: 36.69, ...OKT };
const SAPROLIT = { ni: 1.81, fe: 11.79, co: 0.03, cr: 0.77, mc: 35, ...OKT };

test('Sensitivitas: 21 titik untuk ±0,10% dengan langkah 0,01%, titik tengah = input', () => {
    const s = HPM.sensitivity(LIMONIT, { range: 0.10 });
    assert.equal(s.rows.length, 21);
    assert.equal(s.rows[10].ni, 1.35);
    near(s.rows[10].hpm, HPM.calculate(LIMONIT).hpm, 1e-9);
    near(s.rows[10].delta, 0, 1e-9);
});

test('Jalur profil otomatis: limonit → atas, saprolit ber-Fe rendah → bawah', () => {
    assert.equal(HPM.sensitivity(LIMONIT).path, 'atas');
    assert.equal(HPM.sensitivity(SAPROLIT).path, 'bawah');
});

test('Profil atas: Ni naik ⇒ Fe dan Cr turun (korelasi negatif)', () => {
    const s = HPM.sensitivity(LIMONIT, { range: 0.05 });
    const first = s.rows[0], last = s.rows[s.rows.length - 1];
    assert.ok(last.fe < first.fe);
    assert.ok(last.cr < first.cr);
});

test('Profil atas: Co memuncak di dasar limonit (Ni 1,4%)', () => {
    const co = ni => HPM.profileAt('atas', ni).co;
    assert.ok(co(1.40) > co(1.30) && co(1.40) > co(1.50));
});

test('Mode "tetap": kadar lain tidak berubah', () => {
    const s = HPM.sensitivity(LIMONIT, { mode: 'tetap' });
    assert.ok(s.rows.every(r => r.fe === 40.5 && r.co === 0.15 && r.mc === 36.69));
});

test('Lompatan di batas Ni 1,2% terdeteksi dan bernilai besar', () => {
    const s = HPM.sensitivity({ ni: 1.20, fe: 45, co: 0.10, cr: 2, mc: 35, ...OKT });
    assert.ok(s.events.some(e => e.type === 'cfNi'));
    assert.ok(s.marginalUp > 15);           // 1,20% → 1,21%: CF 14% → 26,1%
    assert.ok(Math.abs(s.marginalDown) < 1);
});

test('Fe melewati 35% di zona transisi terdeteksi', () => {
    const s = HPM.sensitivity({ ni: 1.45, fe: 36, co: 0.13, cr: 1.9, mc: 36, ...OKT });
    assert.ok(s.events.some(e => e.type === 'fe'));
});

test('Kadar hasil penyesuaian tidak pernah negatif', () => {
    const s = HPM.sensitivity({ ni: 1.5, fe: 0.5, co: 0.001, cr: 0.01, mc: 1, ...OKT }, { range: 0.20, path: 'atas' });
    assert.ok(s.rows.every(r => r.fe >= 0 && r.co >= 0 && r.cr >= 0 && r.mc >= 0));
});
