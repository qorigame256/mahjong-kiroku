// 符の計算と練習問題の出題（画面に依存しない純粋な関数だけを置く。tests/fu.test.mjs が直接読む）
//
// 牌は2文字: 1文字目が種類（m=萬子 p=筒子 s=索子 z=字牌）、2文字目が数（字牌は 1東 2南 3西 4北 5白 6發 7中）。
// 手は { win: 'ron'|'tsumo', sets: [{ kind: 'shun'|'kou'|'kan', open, tiles }], pair, wait, winSet, winIdx }。
//   門前かどうかは sets に open（鳴いた面子）があるかで決まる。暗槓は open:false なので門前のまま。
//   wait は 'ryanmen'|'kanchan'|'penchan'|'tanki'|'shanpon'。winSet は和了牌を含む面子の番号（単騎は -1＝雀頭）、
//   winIdx はその面子の中の和了牌の位置（画面で光らせるだけ）。七対子は { win, chiitoi: [7種の牌] }。
// 雀頭の役牌は三元牌（白發中）だけを数える。風牌の雀頭は場風・自風が要るので出題しない（連風牌は2符/4符が卓で分かれる）。

// 早見表の列。start は「副底20＋門前ロン10／ツモ2」の合計（足し符を足す前の数）
export const FORMS = [
  { key: 'menzenRon', label: '門前ロン', start: 30 },
  { key: 'tsumo', label: 'ツモ', start: 22 },
  { key: 'nakiRon', label: '鳴きロン', start: 20 },
];
// 早見表の行（足し符の範囲）。同じ行の中では3列とも符が変わらない（tests で確かめている）
export const ROWS = [[0, 0], [2, 8], [10, 10], [12, 18], [20, 20], [22, 28], [30, 30]];
// 足し符が30を超える手の答え合わせ用に、同じ並び（2〜8 の幅と 10 ちょうど）で行を足す
export function rowsUpTo(extra) {
  const rows = [...ROWS];
  while (extra > rows.at(-1)[1]) {
    const b = rows.at(-1)[1];
    rows.push(b % 10 === 0 ? [b + 2, b + 8] : [b + 2, b + 2]);
  }
  return rows;
}

const ceil10 = (x) => Math.ceil(x / 10) * 10;

// 足し符（面子・雀頭・待ちの符の合計）から符を出す。鳴きロンで足し符0（合計20）は30符として数える。
// 門前ツモで足し符0は平和ツモの20符だが、表では注で示すので、ここでは鳴きツモと同じ30を返す
export function fuFromExtra(formKey, extra) {
  const form = FORMS.find((f) => f.key === formKey);
  return Math.max(30, ceil10(form.start + extra));
}

// 刻子・槓子の符。明刻の中張牌2が出発点で、么九牌なら×2、暗なら×2、槓なら×4
export function setFu(kind, yaochu, concealed) {
  return (kind === 'kan' ? 8 : 2) * (yaochu ? 2 : 1) * (concealed ? 2 : 1);
}

const KANJI = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const SUIT = { m: '萬', p: '筒', s: '索' };
const HONOR = ['', '東', '南', '西', '北', '白', '發', '中'];
const tileNum = (t) => Number(t[1]);
// 牌の表の字（上）と種類の字（下。字牌は無し）
export const tileFace = (t) => (t[0] === 'z' ? [HONOR[tileNum(t)], ''] : [KANJI[tileNum(t)], SUIT[t[0]]]);
export const tileName = (t) => tileFace(t).join('');
export const isYaochu = (t) => t[0] === 'z' || t[1] === '1' || t[1] === '9';
const isDragon = (t) => t[0] === 'z' && tileNum(t) >= 5;
export const WAIT_NAME = { ryanmen: '両面', kanchan: '嵌張', penchan: '辺張', tanki: '単騎', shanpon: 'シャンポン' };

export const isMenzen = (hand) => !hand.sets.some((s) => s.open);
// 早見表のどの列で読むか
export const formOf = (hand) => (hand.win === 'tsumo' ? 'tsumo' : isMenzen(hand) ? 'menzenRon' : 'nakiRon');

// 符の内訳。base は足し符より前の分（副底・門前ロン・ツモ）、extras は足し符の内訳。
// special は早見表の外の決まり（七対子・平和ツモ）で、このときは extras を使わない
export function calcFu(hand) {
  if (hand.chiitoi) return { base: [], extras: [], extra: 0, raw: 25, fu: 25, special: true, note: '七対子は25符で固定（切り上げない）' };
  const menzen = isMenzen(hand);
  const extras = [];
  hand.sets.forEach((s, i) => {
    if (s.kind === 'shun') return;
    const shanponRon = hand.win === 'ron' && hand.wait === 'shanpon' && hand.winSet === i;
    const concealed = !s.open && !shanponRon;
    const y = isYaochu(s.tiles[0]);
    const name = s.kind === 'kan' ? (concealed ? '暗槓' : '明槓') : concealed ? '暗刻' : '明刻';
    extras.push({
      label: `${tileName(s.tiles[0])}の${name}（${y ? '么九牌' : '中張牌'}）`,
      fu: setFu(s.kind, y, concealed),
      note: shanponRon ? 'シャンポン待ちをロンで完成させたので明刻として数える' : '',
    });
  });
  if (isDragon(hand.pair)) extras.push({ label: `雀頭の${tileName(hand.pair)}（役牌）`, fu: 2 });
  if (['kanchan', 'penchan', 'tanki'].includes(hand.wait)) extras.push({ label: `${WAIT_NAME[hand.wait]}待ち`, fu: 2 });
  const extra = extras.reduce((a, p) => a + p.fu, 0);
  if (menzen && hand.win === 'tsumo' && extra === 0) {
    return { base: [], extras, extra, raw: 20, fu: 20, special: true, note: '平和ツモは20符で固定（ツモの2符も付けない）' };
  }
  const base = [{ label: '副底', fu: 20 }];
  if (hand.win === 'ron' && menzen) base.push({ label: '門前ロン', fu: 10 });
  if (hand.win === 'tsumo') base.push({ label: 'ツモ', fu: 2 });
  const raw = base.reduce((a, p) => a + p.fu, 0) + extra;
  if (!menzen && hand.win === 'ron' && extra === 0) {
    return { base, extras, extra, raw, fu: 30, special: false, note: '鳴いた手のロンで足し符が0（合計20）のときは30符として数える' };
  }
  const fu = ceil10(raw);
  const note = menzen && hand.win === 'ron' && extra === 0 ? '平和のロンは30符'
    : fu === raw ? `合計${raw}は一の位が0なので、はねずに${fu}符` : `合計${raw}の一の位を切り上げて${fu}符`;
  return { base, extras, extra, raw, fu, special: false, note };
}

// ---------- 練習問題 ----------
const NUM_SUITS = ['m', 'p', 's'];
const NUMBERS = NUM_SUITS.flatMap((s) => [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => s + n));
const YAOCHU = [...NUM_SUITS.flatMap((s) => [s + 1, s + 9]), ...[1, 2, 3, 4, 5, 6, 7].map((n) => 'z' + n)];
const CHUNCHAN = NUMBERS.filter((t) => !isYaochu(t));

function weighted(rand, pairs) {
  let r = rand() * pairs.reduce((a, [, w]) => a + w, 0);
  for (const [v, w] of pairs) if ((r -= w) < 0) return v;
  return pairs.at(-1)[0];
}
function shuffle(rand, a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 1問の下書き。牌が重なりすぎたなど、使えない形になったら null を返す（呼ぶ側が引き直す）
function draftHand(rand) {
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const win = rand() < 0.5 ? 'ron' : 'tsumo';
  if (rand() < 0.05) {
    const tiles = shuffle(rand, [...NUMBERS, ...YAOCHU.filter((t) => t[0] === 'z')]).slice(0, 7).sort();
    return { win, chiitoi: tiles, sets: [] };
  }
  const naki = rand() < 0.45;
  const nKou = weighted(rand, [[0, 2], [1, 4], [2, 3], [3, 1]]);
  const sets = [0, 1, 2, 3].map((i) => ({ kind: i < nKou ? 'kou' : 'shun', open: naki && rand() < 0.5 }));
  if (nKou && rand() < 0.25) sets[0].kind = 'kan'; // 槓子は1問に1つまで（符が110を超えないように）
  if (naki && !sets.some((s) => s.open)) pick(sets).open = true;
  shuffle(rand, sets).sort((a, b) => a.open - b.open); // 手の中の面子を先、鳴いた面子を後に並べる

  // 和了牌は手の中（鳴いていない面子か雀頭）にしか無い
  const closed = (kind) => sets.flatMap((s, i) => (s.kind === kind && !s.open ? [i] : []));
  const waits = [['tanki', 2]];
  if (closed('shun').length) waits.push(['ryanmen', 3], ['kanchan', 2], ['penchan', 1]);
  if (closed('kou').length) waits.push(['shanpon', 2]);
  const wait = weighted(rand, waits);
  const winSet = wait === 'tanki' ? -1 : pick(closed(wait === 'shanpon' ? 'kou' : 'shun'));
  let winIdx = 1;

  const pair = rand() < 0.35 ? 'z' + (5 + Math.floor(rand() * 3)) : pick(NUMBERS);
  const used = new Set([pair]); // 刻子・雀頭の牌。順子と重ねない（待ちの取り方が何通りにも読めるのを避ける）
  for (const [i, s] of sets.entries()) {
    if (s.kind === 'shun') continue;
    const t = pick(rand() < 0.5 ? YAOCHU : CHUNCHAN);
    if (used.has(t)) return null;
    used.add(t);
    s.tiles = Array(s.kind === 'kan' ? 4 : 3).fill(t);
    if (i === winSet) winIdx = 2;
  }
  const count = {};
  for (const [i, s] of sets.entries()) {
    if (s.kind !== 'shun') continue;
    let start = 1 + Math.floor(rand() * 7);
    if (i === winSet) {
      if (wait === 'penchan') start = rand() < 0.5 ? 1 : 7;
      // 両面: 123 は 1 で、789 は 9 で和了ったときだけ両面（反対側だと辺張になる）
      winIdx = wait === 'kanchan' ? 1 : wait === 'penchan' ? (start === 1 ? 2 : 0)
        : start === 1 ? 0 : start === 7 ? 2 : rand() < 0.5 ? 0 : 2;
    }
    const suit = pick(NUM_SUITS);
    s.tiles = [0, 1, 2].map((d) => suit + (start + d));
    for (const t of s.tiles) {
      count[t] = (count[t] || 0) + 1;
      if (used.has(t) || count[t] > 4) return null;
    }
  }
  const hand = { win, sets, pair, wait, winSet, winIdx };
  // 順子どうしが重なると、別の待ちにも読める（例: 123萬・345萬 の3萬は両面とも辺張とも読める）。符が1つに決まらない手は使わない
  return readingFus(hand).size === 1 ? hand : null;
}

// 手の中の牌（鳴いた面子と暗槓は宣言済みなので除く）を、面子の組み方と和了牌の入り方を変えて読み直し、
// 読み方ごとの符をすべて返す（七対子にも読めるならその25符も入れる）。
// 2つ以上の値が返る手は、どの待ちで数えるかで符が変わる＝「高いほうで数える」が要る手なので出題しない
export function readingFus(hand) {
  if (hand.chiitoi) return new Set([25]);
  const fixed = hand.sets.filter((s) => s.open || s.kind === 'kan');
  const tiles = [...hand.sets.filter((s) => !s.open && s.kind !== 'kan').flatMap((s) => s.tiles), hand.pair, hand.pair];
  const winTile = hand.winSet === -1 ? hand.pair : hand.sets[hand.winSet].tiles[hand.winIdx];
  const count = {};
  for (const t of tiles) count[t] = (count[t] || 0) + 1;
  const keys = Object.keys(count).sort();
  const fus = new Set();
  if (isMenzen(hand) && !fixed.length && keys.length === 7 && keys.every((t) => count[t] === 2)) fus.add(25);
  const next = (t, d) => (t[0] === 'z' ? null : t[0] + (tileNum(t) + d));
  // groups: 面子の並び、pair: 雀頭（まだ無ければ null）
  const walk = (groups, pair) => {
    const t = keys.find((k) => count[k] > 0);
    if (!t) { if (pair) judge(groups, pair); return; }
    if (!pair && count[t] >= 2) { count[t] -= 2; walk(groups, t); count[t] += 2; }
    if (count[t] >= 3) { count[t] -= 3; walk([...groups, { kind: 'kou', open: false, tiles: [t, t, t] }], pair); count[t] += 3; }
    const t1 = next(t, 1), t2 = next(t, 2);
    if (t1 && tileNum(t) <= 7 && count[t1] > 0 && count[t2] > 0) {
      count[t]--; count[t1]--; count[t2]--;
      walk([...groups, { kind: 'shun', open: false, tiles: [t, t1, t2] }], pair);
      count[t]++; count[t1]++; count[t2]++;
    }
  };
  const judge = (groups, pair) => {
    const sets = [...groups, ...fixed];
    if (pair === winTile) fus.add(calcFu({ win: hand.win, sets, pair, wait: 'tanki', winSet: -1, winIdx: 0 }).fu);
    groups.forEach((g, i) => {
      const idx = g.tiles.indexOf(winTile);
      if (idx < 0) return;
      const start = tileNum(g.tiles[0]);
      const wait = g.kind === 'kou' ? 'shanpon' : idx === 1 ? 'kanchan'
        : (idx === 0 && start === 7) || (idx === 2 && start === 1) ? 'penchan' : 'ryanmen';
      fus.add(calcFu({ win: hand.win, sets, pair, wait, winSet: i, winIdx: idx }).fu);
    });
  };
  walk([], null);
  return fus;
}

// 符はねの境目（合計の一の位が 0・2・8）。早見表の外の決まりと、足し符0（平和形・鳴きロンの30符）は境目に数えない
export function isTricky(hand) {
  const r = calcFu(hand);
  return !r.special && r.extra > 0 && [0, 2, 8].includes(r.raw % 10);
}

// 6割は符はねの境目の問題を出す（本人の苦手が「はねるか、はねないか」のため）
export function makeQuestion(rand = Math.random) {
  const wantTricky = rand() < 0.6;
  let hand = null;
  for (let i = 0; i < 300 || !hand; i++) {
    const d = draftHand(rand);
    if (!d) continue;
    hand = d;
    if (!wantTricky || isTricky(d)) break;
  }
  return hand;
}
