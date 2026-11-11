// 点数計算と対局の進行（画面に依存しない純粋な計算だけを置く。tests/score.test.mjs が直接読む）

export const WINDS = ['東', '南', '西', '北'];

export const DEFAULT_RULES = {
  4: { start: 25000, ret: 30000, uma: [20, 10, -10, -20], honba: 100, tenpai: 3000, tsumoLoss: true },
  3: { start: 35000, ret: 40000, uma: [20, 0, -20], honba: 100, tenpai: 2000, tsumoLoss: true },
};

// han は翻数。満貫=5 跳満=6 倍満=8 三倍満=11 役満=13 2倍役満=26 として持つ
export const HAN_OPTIONS = [[1, '1翻'], [2, '2翻'], [3, '3翻'], [4, '4翻'], [5, '満貫'], [6, '跳満'], [8, '倍満'], [11, '三倍満'], [13, '役満'], [26, '2倍役満']];
export const FU_OPTIONS = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110];

const ceil100 = (x) => Math.ceil(x / 100) * 100;

export function basePoints(han, fu) {
  if (han >= 13) return 8000 * Math.floor(han / 13);
  if (han >= 11) return 6000;
  if (han >= 8) return 4000;
  if (han >= 6) return 3000;
  if (han >= 5) return 2000;
  return Math.min(2000, fu * 2 ** (han + 2));
}

export function ronValue(han, fu, isDealer) {
  return ceil100(basePoints(han, fu) * (isDealer ? 6 : 4));
}

// ツモのとき各席が払う点（本場を含まない）。三人麻雀で tsumoLoss=false のときは、いない1人の分を2人で折半する
export function tsumoPays(n, rule, winner, dealer, han, fu) {
  const b = basePoints(han, fu);
  const pays = Array(n).fill(0);
  for (let s = 0; s < n; s++) {
    if (s === winner) continue;
    let m = winner === dealer || s === dealer ? 2 : 1;
    if (n === 3 && !rule.tsumoLoss) m += winner === dealer ? 1 : 0.5;
    pays[s] = ceil100(b * m);
  }
  return pays;
}

export function kyokuName(k, n) {
  return `${WINDS[Math.floor(k / n) % 4]}${(k % n) + 1}局`;
}

// game.rounds を最初から順に適用し、今の点数・局・本場・供託と、1局ごとの結果を返す
export function replay(game) {
  const n = game.mode;
  const rule = game.rule;
  const scores = Array(n).fill(rule.start);
  let k = 0, honba = 0, kyotaku = 0;
  const log = [];
  for (const r of game.rounds) {
    const dealer = k % n;
    const delta = Array(n).fill(0);
    const e = { round: r, k, honba, dealer, delta, wins: [], loser: null, lossValue: 0 };
    if (r.type === 'adjust') {
      r.deltas.forEach((d, i) => { delta[i] += d; });
    } else {
      for (const s of r.riichi || []) { delta[s] -= 1000; kyotaku += 1000; }
      const hb = honba * rule.honba;
      if (r.type === 'ron') {
        // 2人以上のロンでは、本場と供託は放銃者から見て順番が近い人が取る
        const dist = (w) => (w - r.loser + n) % n;
        const head = r.wins.map((w) => w.winner).sort((a, b) => dist(a) - dist(b))[0];
        for (const w of r.wins) {
          let v = ronValue(w.han, w.fu, w.winner === dealer);
          if (w.winner === head) v += hb * (n - 1);
          delta[w.winner] += v;
          delta[r.loser] -= v;
          e.wins.push({ seat: w.winner, value: v, tsumo: false });
          e.lossValue += v;
        }
        delta[head] += kyotaku;
        kyotaku = 0;
        e.loser = r.loser;
        if (r.wins.some((w) => w.winner === dealer)) honba++; else { honba = 0; k++; }
      } else if (r.type === 'tsumo') {
        const pays = tsumoPays(n, rule, r.winner, dealer, r.han, r.fu);
        let v = 0;
        for (let s = 0; s < n; s++) {
          if (s === r.winner) continue;
          const p = pays[s] + hb;
          delta[s] -= p;
          v += p;
        }
        delta[r.winner] += v + kyotaku;
        kyotaku = 0;
        e.wins.push({ seat: r.winner, value: v, tsumo: true });
        if (r.winner === dealer) honba++; else { honba = 0; k++; }
      } else if (r.type === 'draw') {
        const t = r.tenpai || [];
        if (!r.abort && t.length > 0 && t.length < n) {
          for (let s = 0; s < n; s++) {
            delta[s] += t.includes(s) ? rule.tenpai / t.length : -rule.tenpai / (n - t.length);
          }
        }
        const renchan = r.abort || t.includes(dealer);
        honba++;
        if (!renchan) k++;
      }
    }
    delta.forEach((d, i) => { scores[i] += d; });
    e.after = [...scores];
    log.push(e);
  }
  return { scores, k, honba, kyotaku, dealer: k % n, log };
}

// 終了時の精算。同点は起家に近い席が上。残った供託はトップへ。トップのポイントは他の合計の逆（合計が必ず0になる）
export function settle(n, rule, scores, kyotaku = 0) {
  const order = [...scores.keys()].sort((a, b) => scores[b] - scores[a] || a - b);
  const final = [...scores];
  final[order[0]] += kyotaku;
  const pts = Array(n).fill(0);
  const rank = Array(n).fill(0);
  let sum = 0;
  order.forEach((s, i) => {
    rank[s] = i + 1;
    if (i > 0) {
      pts[s] = Math.round(((final[s] - rule.ret) / 1000 + rule.uma[i]) * 10) / 10;
      sum += pts[s];
    }
  });
  pts[order[0]] = Math.round(-sum * 10) / 10;
  return { rank, pts, final };
}
