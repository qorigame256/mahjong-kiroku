// 走らせ方: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_RULES, basePoints, ronValue, tsumoPays, replay, settle, kyokuName } from '../app/js/score.js';

const R4 = DEFAULT_RULES[4], R3 = DEFAULT_RULES[3];
const game = (mode, rounds, rule = DEFAULT_RULES[mode]) => ({ mode, rule, rounds });

test('ロンの点数表', () => {
  assert.equal(ronValue(1, 30, false), 1000);
  assert.equal(ronValue(1, 30, true), 1500);
  assert.equal(ronValue(2, 25, false), 1600);
  assert.equal(ronValue(3, 30, false), 3900);
  assert.equal(ronValue(3, 30, true), 5800);
  assert.equal(ronValue(4, 30, false), 7700);
  assert.equal(ronValue(4, 30, true), 11600);
  assert.equal(ronValue(3, 60, false), 7700);
  assert.equal(ronValue(4, 40, false), 8000);
  assert.equal(ronValue(5, 30, false), 8000);
  assert.equal(ronValue(6, 30, true), 18000);
  assert.equal(ronValue(8, 30, false), 16000);
  assert.equal(ronValue(11, 30, false), 24000);
  assert.equal(ronValue(13, 30, false), 32000);
  assert.equal(ronValue(26, 30, true), 96000);
  assert.equal(basePoints(3, 70), 2000);
});

test('ツモの支払い（四人）', () => {
  assert.deepEqual(tsumoPays(4, R4, 1, 0, 1, 30), [500, 0, 300, 300]);
  assert.deepEqual(tsumoPays(4, R4, 0, 0, 3, 30), [0, 2000, 2000, 2000]);
  assert.deepEqual(tsumoPays(4, R4, 2, 0, 5, 30), [4000, 2000, 0, 2000]);
});

test('ツモの支払い（三人・ツモ損あり／なし）', () => {
  assert.deepEqual(tsumoPays(3, R3, 1, 0, 5, 30), [4000, 0, 2000]);
  const noLoss = { ...R3, tsumoLoss: false };
  assert.deepEqual(tsumoPays(3, noLoss, 1, 0, 5, 30), [5000, 0, 3000]);
  assert.deepEqual(tsumoPays(3, noLoss, 0, 0, 5, 30), [0, 6000, 6000]);
});

test('子のロンで局が進み、本場が消える', () => {
  const st = replay(game(4, [{ type: 'ron', loser: 0, wins: [{ winner: 1, han: 3, fu: 30 }], riichi: [1] }]));
  assert.deepEqual(st.scores, [21100, 28900, 25000, 25000]); // 25000 -1000(リーチ) +3900 +1000(供託が戻る)
  assert.equal(st.k, 1);
  assert.equal(st.honba, 0);
  assert.equal(st.kyotaku, 0);
  assert.equal(st.dealer, 1);
});

test('親のあがりは連荘で本場が増え、本場分が上乗せされる', () => {
  const st = replay(game(4, [
    { type: 'tsumo', winner: 0, han: 1, fu: 30, riichi: [] },
    { type: 'ron', loser: 2, wins: [{ winner: 1, han: 1, fu: 30 }], riichi: [] },
  ]));
  // 1局目: 親500オール → [26500,24500,24500,24500]、2局目(1本場): 1000+300
  assert.deepEqual(st.scores, [26500, 25800, 23200, 24500]);
  assert.equal(st.k, 1);
  assert.equal(st.honba, 0);
});

test('ツモの本場は1人100点ずつ', () => {
  const st = replay(game(4, [
    { type: 'draw', tenpai: [0], riichi: [] },
    { type: 'tsumo', winner: 1, han: 1, fu: 30, riichi: [] },
  ]));
  // 流局: [28000,24000,24000,24000] 親聴牌で連荘1本場 → 子ツモ 300/500 + 100ずつ
  assert.deepEqual(st.scores, [27400, 25400, 23600, 23600]);
});

test('流局: ノーテン罰符・親流れ・供託の持ち越し', () => {
  const a = replay(game(4, [{ type: 'draw', tenpai: [1, 2], riichi: [1] }]));
  assert.deepEqual(a.scores, [23500, 25500, 26500, 23500]);
  assert.equal(a.kyotaku, 1000);
  assert.equal(a.k, 1);
  assert.equal(a.honba, 1);
  const b = replay(game(4, [{ type: 'draw', tenpai: [0, 1, 2, 3], riichi: [] }]));
  assert.deepEqual(b.scores, [25000, 25000, 25000, 25000]);
  assert.equal(b.k, 0); // 親が聴牌なら連荘
  const c = replay(game(4, [{ type: 'draw', tenpai: [], abort: true, riichi: [] }]));
  assert.equal(c.k, 0);
  assert.equal(c.honba, 1);
  const d = replay(game(3, [{ type: 'draw', tenpai: [1], riichi: [] }]));
  assert.deepEqual(d.scores, [34000, 37000, 34000]);
});

test('2人ロン: 本場と供託は放銃者から順番が近い人が取る', () => {
  const st = replay(game(4, [
    { type: 'draw', tenpai: [0], riichi: [3] }, // 連荘1本場、供託1000
    { type: 'ron', loser: 2, wins: [{ winner: 1, han: 1, fu: 30 }, { winner: 3, han: 1, fu: 30 }], riichi: [] },
  ]));
  // 流局後 [28000,24000,24000,23000]。席3が席2の次なので本場300と供託1000は席3
  assert.deepEqual(st.scores, [28000, 25000, 21700, 25300]);
  assert.equal(st.kyotaku, 0);
});

test('点数の修正は局を進めない', () => {
  const st = replay(game(4, [{ type: 'adjust', deltas: [-8000, 4000, 2000, 2000] }]));
  assert.deepEqual(st.scores, [17000, 29000, 27000, 27000]);
  assert.equal(st.k, 0);
  assert.equal(st.honba, 0);
});

test('局の名前', () => {
  assert.equal(kyokuName(0, 4), '東1局');
  assert.equal(kyokuName(5, 4), '南2局');
  assert.equal(kyokuName(3, 3), '南1局');
});

test('精算: ウマ・オカ込みで合計0、同点は起家に近い席が上', () => {
  const s = settle(4, R4, [35000, 28000, 22000, 15000]);
  assert.deepEqual(s.rank, [1, 2, 3, 4]);
  assert.deepEqual(s.pts, [45, 8, -18, -35]);
  const t = settle(4, R4, [25000, 25000, 25000, 25000]);
  assert.deepEqual(t.rank, [1, 2, 3, 4]);
  assert.deepEqual(t.pts, [35, 5, -15, -25]);
  const k = settle(4, R4, [24000, 26000, 25000, 24000], 1000); // 残った供託はトップへ
  assert.deepEqual(k.final, [24000, 27000, 25000, 24000]);
  assert.equal(k.pts.reduce((a, b) => a + b, 0), 0);
  const u = settle(3, R3, [45000, 35000, 25000]);
  assert.deepEqual(u.pts, [40, -5, -35]);
});
