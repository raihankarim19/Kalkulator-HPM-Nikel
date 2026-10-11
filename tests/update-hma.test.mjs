// Unit test parser HMA untuk scripts/update-hma.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseHMA, parseNumber, validate } from '../scripts/update-hma.mjs';

test('parseNumber: format Indonesia, US, dan polos', () => {
    assert.equal(parseNumber('16.322,67'), 16322.67);
    assert.equal(parseNumber('16,322.67'), 16322.67);
    assert.equal(parseNumber('16322.67'), 16322.67);
    assert.equal(parseNumber('1,45'), 1.45);
    assert.equal(parseNumber('US$ 6.37'), 6.37);
    assert.equal(parseNumber('-'), null);
});

const TABLE = `
<table>
  <tr><th>Komoditas</th><th>Satuan</th><th>Periode II September 2026</th><th>Periode I Oktober 2026</th></tr>
  <tr><td>Nikel</td><td>USD/dmt</td><td>16.698,00</td><td>16.322,67</td></tr>
  <tr><td>Bijih Nikel</td><td>USD/wmt</td><td>24,89</td><td>23,19</td></tr>
  <tr><td>Kobalt</td><td>USD/dmt</td><td>52.704,33</td><td>41.047,33</td></tr>
  <tr><td>Bijih Besi Laterit/Hematit/Magnetit</td><td>USD/dmt</td><td>1,47</td><td>1,45</td></tr>
  <tr><td>Bijih Krom</td><td>USD/dmt</td><td>6,37</td><td>6,37</td></tr>
</table>`;

test('parseHMA: ambil kolom terbaru, abaikan baris "Bijih Nikel"', () => {
    const r = parseHMA(TABLE);
    assert.equal(r.nikel, 16322.67);
    assert.equal(r.kobalt, 41047.33);
    assert.equal(r.bijihBesi, 1.45);
    assert.equal(r.bijihKrom, 6.37);
    assert.equal(r.periode, 'Periode I Oktober 2026');
    assert.deepEqual(validate(r), []);
});

test('validate: halaman perbaikan tidak menghasilkan data', () => {
    const r = parseHMA('<h1>SISTEM SEDANG DALAM PERBAIKAN</h1>');
    assert.equal(validate(r).length, 4);
});

test('validate: nilai di luar rentang wajar ditolak', () => {
    const r = parseHMA(TABLE.replace('16.322,67', '16,32'));
    assert.ok(validate(r).some(p => p.startsWith('nikel')));
});

test('hma.json di repo valid', async () => {
    const data = JSON.parse(await readFile(new URL('../hma.json', import.meta.url), 'utf8'));
    assert.deepEqual(validate(data), []);
    assert.ok(data.periode);
});
