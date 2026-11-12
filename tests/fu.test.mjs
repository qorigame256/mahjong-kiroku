// 走らせ方: node --test tests/fu.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { FORMS, ROWS, rowsUpTo, fuFromExtra, setFu, calcFu, formOf, isMenzen, isTricky, makeQuestion } from '../app/js/fu.js';
import { FU_OPTIONS } from '../app/js/score.js';

// 種を決めた乱数（同じ順で同じ問題が出る）
function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const shun = (s, n, open = false) => ({ kind: 'shun', open, tiles: [s + n, s + (n + 1), s + (n + 2)] });
const kou = (t, open = false) => ({ kind: 'kou', open, tiles: [t, t, t] });
const kan = (t, open = false) => ({ kind: 'kan', open, tiles: [t, t, t, t] });
const hand = (win, sets, pair, wait, winSet = 0, winIdx = 0) => ({ win, sets, pair, wait, winSet, winIdx });

test('早見表: 手で数えた値と一致し、同じ行の中では符が変わらない', () => {
  const expected = {
    menzenRon: [30, 40, 40, 50, 50, 60, 60],
    tsumo: [30, 30, 40, 40, 50, 50, 60],
    nakiRon: [30, 30, 30, 40, 40, 50, 50],
  };
  let next = 0;
  ROWS.forEach(([a, b], r) => {
    assert.equal(a, next, '行が足し符0〜30の偶数をすき間なく覆う');
    next = b + 2;
    for (const f of FORMS) {
      for (let e = a; e <= b; e += 2) assert.equal(fuFromExtra(f.key, e), expected[f.key][r], `${f.label} 足し符${e}`);
    }
  });
  assert.equal(next, 32);
  // 30より先に足す行も、すき間なく覆い、行の中で符が変わらない
  next = 0;
  for (const [a, b] of rowsUpTo(60)) {
    assert.equal(a, next);
    next = b + 2;
    for (const f of FORMS) {
      for (let e = a; e <= b; e += 2) assert.equal(fuFromExtra(f.key, e), fuFromExtra(f.key, a), `${f.label} 足し符${e}`);
    }
  }
  assert.ok(next > 60);
});

test('刻子・槓子の符', () => {
  assert.deepEqual([setFu('kou', false, false), setFu('kou', false, true), setFu('kan', false, false), setFu('kan', false, true)], [2, 4, 8, 16]);
  assert.deepEqual([setFu('kou', true, false), setFu('kou', true, true), setFu('kan', true, false), setFu('kan', true, true)], [4, 8, 16, 32]);
});

test('符の計算: 代表的な手', () => {
  const r1 = calcFu(hand('ron', [kou('z1'), shun('m', 3), shun('p', 2), shun('s', 5)], 'z7', 'kanchan', 1, 1));
  assert.deepEqual([r1.extra, r1.raw, r1.fu], [12, 42, 50], '門前ロン 東暗刻＋嵌張＋中の雀頭');
  const r2 = calcFu(hand('tsumo', [kou('m9'), shun('m', 3), shun('p', 2), shun('s', 5)], 'p5', 'ryanmen', 1, 0));
  assert.deepEqual([r2.extra, r2.raw, r2.fu], [8, 30, 30], '門前ツモ 么九暗刻だけ → はねない');
  const r3 = calcFu(hand('tsumo', [kou('m9'), shun('m', 3), shun('p', 2), shun('s', 5)], 'p5', 'kanchan', 1, 1));
  assert.deepEqual([r3.raw, r3.fu], [32, 40], '門前ツモ 么九暗刻＋嵌張 → はねる');
  const r4 = calcFu(hand('tsumo', [shun('m', 1), shun('m', 3), shun('p', 2), shun('s', 5)], 'p5', 'ryanmen', 0, 0));
  assert.deepEqual([r4.fu, r4.special], [20, true], '平和ツモ');
  const r5 = calcFu(hand('ron', [shun('m', 1), shun('m', 3), shun('p', 2), shun('s', 5)], 'p5', 'ryanmen', 0, 0));
  assert.equal(r5.fu, 30, '平和ロン');
  const r6 = calcFu(hand('ron', [shun('m', 1), shun('m', 3), shun('p', 2), shun('s', 5, true)], 'p5', 'ryanmen', 0, 0));
  assert.deepEqual([r6.raw, r6.fu], [20, 30], '鳴きロン 足し符0 は30符');
  const r7 = calcFu(hand('ron', [kou('z1'), kou('m5'), shun('p', 2), shun('s', 5)], 'p8', 'shanpon', 0, 2));
  assert.deepEqual([r7.extra, r7.fu], [8, 40], 'シャンポンのロン: 和了で完成した東は明刻4');
  const r8 = calcFu(hand('tsumo', [kou('z1'), kou('m5'), shun('p', 2), shun('s', 5)], 'p8', 'shanpon', 0, 2));
  assert.deepEqual([r8.extra, r8.raw, r8.fu], [12, 34, 40], 'シャンポンのツモ: 東は暗刻8のまま');
  const h9 = hand('ron', [kan('z7'), shun('m', 3), shun('p', 2), shun('s', 5)], 'p5', 'tanki', -1, 1);
  assert.ok(isMenzen(h9), '暗槓だけなら門前');
  assert.deepEqual([calcFu(h9).raw, calcFu(h9).fu], [64, 70]);
  const r10 = calcFu(hand('ron', [kou('m4'), shun('p', 2), shun('s', 5), kou('z2', true)], 'p5', 'tanki', -1, 1));
  assert.deepEqual([r10.extra, r10.raw, r10.fu], [10, 30, 30], '鳴きロン ポン南4＋中張暗刻4＋単騎2 → はねない');
  assert.equal(calcFu({ win: 'ron', chiitoi: ['m1', 'm3', 'p5', 'p7', 's2', 'z1', 'z7'], sets: [] }).fu, 25, '七対子');
});

test('練習問題: 形が正しく、答えが早見表と一致する', () => {
  const rand = seeded(20261112);
  const seen = new Set();
  let tricky = 0;
  const N = 4000;
  for (let n = 0; n < N; n++) {
    const q = makeQuestion(rand);
    const r = calcFu(q);
    assert.ok(FU_OPTIONS.includes(r.fu), `入力できる符 ${r.fu}`);
    if (isTricky(q)) tricky++;
    if (q.chiitoi) {
      assert.equal(new Set(q.chiitoi).size, 7);
      seen.add('七対子');
      continue;
    }
    seen.add(formOf(q) + (isMenzen(q) ? '門前' : '鳴き')).add(q.wait);
    assert.equal(q.sets.length, 4);
    assert.ok(!['z1', 'z2', 'z3', 'z4'].includes(q.pair), '雀頭に風牌を出さない');
    assert.ok(q.sets.filter((s) => s.kind === 'kan').length <= 1);
    const count = { [q.pair]: 2 };
    for (const s of q.sets) {
      for (const t of s.tiles) count[t] = (count[t] || 0) + 1;
      if (s.kind === 'shun') {
        assert.ok(s.tiles.every((t, j) => t[0] === s.tiles[0][0] && t[0] !== 'z' && Number(t[1]) === Number(s.tiles[0][1]) + j), `順子 ${s.tiles}`);
      } else {
        assert.equal(s.tiles.length, s.kind === 'kan' ? 4 : 3);
        assert.ok(s.tiles.every((t) => t === s.tiles[0]));
      }
    }
    assert.ok(Object.values(count).every((c) => c <= 4), `同じ牌は4枚まで ${JSON.stringify(count)}`);
    // 和了牌は手の中にあり、待ちの名前と形が合っている
    if (q.wait === 'tanki') assert.equal(q.winSet, -1);
    else {
      const s = q.sets[q.winSet];
      assert.ok(!s.open, '鳴いた面子では和了れない');
      const start = Number(s.tiles[0][1]);
      if (q.wait === 'shanpon') assert.equal(s.kind, 'kou');
      else assert.equal(s.kind, 'shun');
      if (q.wait === 'kanchan') assert.equal(q.winIdx, 1);
      if (q.wait === 'penchan') assert.ok((start === 1 && q.winIdx === 2) || (start === 7 && q.winIdx === 0), `辺張 ${s.tiles} ${q.winIdx}`);
      if (q.wait === 'ryanmen') assert.ok((q.winIdx === 0 && start <= 6) || (q.winIdx === 2 && start >= 2), `両面 ${s.tiles} ${q.winIdx}`);
    }
    // 早見表で読んだ符と、1つずつ数えた符が同じ（平和ツモだけは表の注で示す）
    if (!r.special) assert.equal(r.fu, fuFromExtra(formOf(q), r.extra), JSON.stringify(q));
  }
  for (const k of ['menzenRon門前', 'tsumo門前', 'nakiRon鳴き', 'tsumo鳴き', '七対子', 'ryanmen', 'kanchan', 'penchan', 'tanki', 'shanpon']) {
    assert.ok(seen.has(k), `${k} の問題が出る`);
  }
  assert.ok(tricky / N > 0.5, `符はねの境目の問題が半分より多い（${tricky}/${N}）`);
});
