#!/usr/bin/env node
// Tests the scoring core embedded in hand-foot-toe.html.
// Usage: node test-core.js [path/to/hand-foot-toe.html]
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');

const file = process.argv[2] || path.join(__dirname, 'hand-foot-toe.html');
const html = fs.readFileSync(file, 'utf8');
const m = html.match(/<script id="core">([\s\S]*?)<\/script>/);
if (!m) { console.error('core script block not found'); process.exit(2); }
const HFT = new Function(m[1] + '\nreturn HFT;')();

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('ok   ' + name); }
  catch (e) { fail++; console.log('FAIL ' + name + '\n     ' + e.message); }
}

const S = HFT.defaultSettings();
const entry = o => Object.assign(HFT.blankEntry(), o);
// set a round: a and b are partial entries
function play(g, r, a, b) { g.rounds[r][0] = entry(a); g.rounds[r][1] = entry(b); }

test('roundScore matches spreadsheet row (P22: 10465)', () => {
  // 0,3500,300,2000,1500,1000,600,500,1080,-15
  const e = entry({ clean: 7, dirty: 1, sevens: 1, fives: 1, wilds: 1, red3: 6, out: true, count: 1080, penalty: 15 });
  assert.equal(HFT.roundScore(e, S.pts), 10465);
});

test('penalty counts negative whatever sign is typed', () => {
  assert.equal(HFT.roundScore(entry({ penalty: 120 }), S.pts), -120);
  assert.equal(HFT.roundScore(entry({ penalty: -120 }), S.pts), -120);
});

test('deal bonus and blank entry', () => {
  assert.equal(HFT.roundScore(entry({}), S.pts), 0);
  assert.equal(HFT.roundScore(entry({ deal: true }), S.pts), 200);
});

test('meld table lookup', () => {
  const t = S.meldTable;
  const cases = [[-500, 50], [0, 50], [7499, 50], [7500, 90], [14999, 90], [15000, 120],
                 [22500, 150], [30000, 180], [37499, 180], [37500, 220], [99999, 220]];
  for (const [total, want] of cases) assert.equal(HFT.meldFor(total, t), want, `total ${total}`);
});

test('parseCell and cellError', () => {
  assert.equal(HFT.parseCell(''), null);
  assert.equal(HFT.parseCell(' 42 '), 42);
  assert.equal(HFT.parseCell('-5'), -5);
  assert.equal(HFT.parseCell('4x'), '4x');
  assert.ok(HFT.cellError('4x', 'int'));
  assert.ok(HFT.cellError(-1, 'int'));
  assert.equal(HFT.cellError(-1, 'neg'), null);
  assert.equal(HFT.cellError(null, 'int'), null);
});

test('cannot finish round without exactly one team out', () => {
  const g = HFT.newGame(S, 't0', 'g1');
  play(g, 0, { clean: 2 }, { clean: 1 });
  assert.equal(HFT.canFinishRound(g), false);
  g.rounds[0][0].out = true;
  assert.equal(HFT.canFinishRound(g), true);
  g.rounds[0][1].out = true;
  assert.equal(HFT.canFinishRound(g), false);
});

test('meld original frozen at round end; edits show updated', () => {
  const g = HFT.newGame(S, 't0', 'g2');
  assert.deepEqual(g.meldOrig[0], [50, 50]);
  play(g, 0, { clean: 15, out: true }, { clean: 2 });     // 8000 vs 1000
  HFT.finishRound(g);
  assert.deepEqual(g.meldOrig[1], [90, 50]);
  let mi = HFT.meldInfo(g, 1, 0);
  assert.deepEqual([mi.orig, mi.cur, mi.changed], [90, 90, false]);
  g.rounds[0][0].clean = 10;                               // correction: 5500
  mi = HFT.meldInfo(g, 1, 0);
  assert.deepEqual([mi.orig, mi.cur, mi.changed], [90, 50, true]);
  g.rounds[0][0].clean = 30;                               // second correction: 15500 -> only latest kept
  mi = HFT.meldInfo(g, 1, 0);
  assert.deepEqual([mi.orig, mi.cur], [90, 120]);
  assert.equal(HFT.meldInfo(g, 2, 0), null);               // round 3 not reached
});

test('editing a finished round to remove "out" blocks progress', () => {
  const g = HFT.newGame(S, 't0', 'g3');
  play(g, 0, { out: true }, {});
  HFT.finishRound(g);
  g.rounds[0][0].out = false;
  assert.ok(HFT.validate(g).some(e => /exactly one/.test(e)));
  assert.equal(HFT.canFinishRound(g), false);
});

test('full game record: totals, red3, winner', () => {
  const g = HFT.newGame(S, 't0', 'g4');
  for (let r = 0; r < 4; r++) {
    play(g, r, { clean: 4, red3: 2, out: r % 2 === 0, count: 900, penalty: 10 },
               { clean: 3, red3: 1, out: r % 2 === 1, count: 800, penalty: 200 });
    HFT.finishRound(g);
  }
  assert.equal(HFT.canRecord(g), true);
  const rec = HFT.makeRecord(g, false, 't1');
  // team0 per round: 2000+200+900-10 = 3090, +500 in rounds 1,3
  // team1 per round: 1500+100+800-200 = 2200, +500 in rounds 2,4
  assert.deepEqual(rec.totals, [3090 * 4 + 1000, 2200 * 4 + 1000]);
  assert.deepEqual(rec.red3, [8, 4]);
  assert.equal(rec.forfeit, false);
  assert.equal(HFT.winnerOf(rec.totals), 0);
});

test('forfeit scores current round as entered, no one out', () => {
  const g = HFT.newGame(S, 't0', 'g5');
  play(g, 0, { clean: 6, out: true, count: 1000 }, { clean: 2, count: 500, penalty: 300 });
  HFT.finishRound(g);
  play(g, 1, { clean: 3, count: 700 }, { dirty: 1, count: 200, penalty: 600 });
  assert.equal(HFT.canForfeit(g), true);
  const rec = HFT.makeRecord(g, true, 't1');
  assert.deepEqual(rec.totals, [3000 + 500 + 1000 + 1500 + 700, 1000 + 500 - 300 + 300 + 200 - 600]);
  assert.equal(rec.forfeit, true);
  assert.equal(rec.rounds, 2);
  assert.throws(() => HFT.makeRecord(g, false));            // not complete
});

test('tie has no winner', () => {
  assert.equal(HFT.winnerOf([5000, 5000]), -1);
  const s = HFT.summarize([{ id: 'a', finished: '1', totals: [5000, 5000], red3: [1, 1] }]);
  assert.equal(s.ties, 1);
  assert.deepEqual(s.wins, [0, 0]);
});

const rec = (id, fin, a, b, site) => ({ id, finished: fin, started: fin, site: site || '', teams: ['girls', 'guys'],
  totals: [a, b], red3: [1, 2], forfeit: false, rounds: 4 });

test('summarize: wins, points, streak', () => {
  const h = [rec('1', '2026-01-01', 20000, 15000), rec('2', '2026-01-02', 14000, 18000), rec('3', '2026-01-03', 12000, 19000)];
  const s = HFT.summarize(h);
  assert.deepEqual(s.wins, [1, 2]);
  assert.deepEqual(s.points, [46000, 52000]);
  assert.equal(s.lead, -6000);
  assert.deepEqual(s.red3, [3, 6]);
  assert.deepEqual(s.streak, { team: 1, n: 2 });
  assert.deepEqual(s.high, [20000, 19000]);
});

test('merge is a union by id, idempotent, commutative', () => {
  const ours = [rec('a', '2026-01-01', 1, 2, 'Ours'), rec('b', '2026-01-03', 3, 4, 'Ours')];
  const theirs = [rec('c', '2026-01-02', 5, 6, 'Theirs'), rec('b', '2026-01-03', 3, 4, 'Ours')];
  const m1 = HFT.mergeHistory(ours, theirs, 0, ['girls', 'guys']);
  assert.equal(m1.added, 1); assert.equal(m1.duplicates, 1);
  assert.deepEqual(m1.history.map(g => g.id), ['a', 'c', 'b']);
  const m2 = HFT.mergeHistory(m1.history, theirs, 0, ['girls', 'guys']);
  assert.equal(m2.added, 0);
  const m3 = HFT.mergeHistory(theirs, ours, 0, ['girls', 'guys']);
  assert.deepEqual(m3.history.map(g => g.id), m1.history.map(g => g.id));
});

test('merge with swapped teams reverses totals and red3', () => {
  const theirs = [Object.assign(rec('x', '2026-02-01', 100, 200), { teams: ['guys', 'girls'], red3: [7, 3] })];
  assert.equal(HFT.autoMap(['girls', 'guys'], ['Guys', 'Girls']), 1);
  assert.equal(HFT.autoMap(['girls', 'guys'], ['A', 'B']), null);
  const m = HFT.mergeHistory([], theirs, 1, ['girls', 'guys']);
  assert.deepEqual(m.history[0].totals, [200, 100]);
  assert.deepEqual(m.history[0].red3, [3, 7]);
  assert.deepEqual(m.history[0].teams, ['girls', 'guys']);
  assert.deepEqual(theirs[0].totals, [100, 200]);          // source untouched
});

test('export / import round trip; foreign files rejected', () => {
  const st = HFT.migrate(null);
  st.history.push(rec('z', '2026-03-01', 9, 8));
  const text = JSON.stringify(HFT.exportData(st, 'now'));
  const inc = HFT.parseImport(text);
  assert.equal(inc.error, undefined);
  assert.equal(inc.history.length, 1);
  assert.ok(HFT.parseImport('{"foo":1}').error);
  assert.ok(HFT.parseImport('not json').error);
  assert.ok(HFT.parseImport(JSON.stringify({ app: 'hand-foot-toe', schema: 99 })).error);
});

test('settings validation', () => {
  assert.deepEqual(HFT.validateSettings(HFT.defaultSettings()), []);
  const bad = HFT.defaultSettings(); bad.teams = ['x', 'X']; bad.pts.clean = -1; bad.meldTable.push([0, 10]);
  assert.equal(HFT.validateSettings(bad).length, 3);
});

test('ids are unique v4 uuids', () => {
  const a = HFT.newId(), b = HFT.newId();
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(a, b);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
