import { WINDS, DEFAULT_RULES, HAN_OPTIONS, FU_OPTIONS, replay, settle, kyokuName } from './score.js';
import { calcFu, makeQuestion } from './fu.js';
import { sheetHtml, quizHtml, fuTemplate, partsSheet } from './fuview.js';

const KEY = 'mahjong-kiroku-v1';
const $ = (s) => document.querySelector(s);
const h = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const num = (x) => x.toLocaleString('ja-JP');
const signed = (x) => (x > 0 ? '+' : '') + num(x);
const pt = (x) => (x > 0 ? '+' : '') + (Math.round(x * 10) / 10).toFixed(1);

function emptyDb() {
  return { version: 1, players: [], games: [], rules: structuredClone(DEFAULT_RULES) };
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && d.version === 1) return d;
  } catch { /* 壊れていたら空から始める */ }
  return emptyDb();
}
// 読み込んだ控えが、このアプリの画面と replay() が落ちずに扱える形かを確かめる（置き換える前に使う）
function validDb(d) {
  const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
  const isSeat = (n) => (x) => Number.isInteger(x) && x >= 0 && x < n;
  const nums = (a, n) => Array.isArray(a) && a.length === n && a.every(isNum);
  const ruleOk = (r, n) => r && ['start', 'ret', 'honba', 'tenpai'].every((k) => isNum(r[k])) && nums(r.uma, n) && typeof r.tsumoLoss === 'boolean';
  const handOk = (x) => HAN_OPTIONS.some(([v]) => v === x.han) && FU_OPTIONS.includes(x.fu);
  const roundOk = (r, n) => {
    if (!r || (r.riichi != null && !(Array.isArray(r.riichi) && r.riichi.every(isSeat(n))))) return false;
    if (r.type === 'ron') return isSeat(n)(r.loser) && Array.isArray(r.wins) && r.wins.length > 0 && r.wins.every((w) => w && isSeat(n)(w.winner) && w.winner !== r.loser && handOk(w));
    if (r.type === 'tsumo') return isSeat(n)(r.winner) && handOk(r);
    if (r.type === 'draw') return r.tenpai == null || (Array.isArray(r.tenpai) && r.tenpai.every(isSeat(n)));
    if (r.type === 'adjust') return nums(r.deltas, n);
    return false;
  };
  const resultOk = (x, n) => x && nums(x.rank, n) && nums(x.pts, n) && nums(x.final, n);
  const gameOk = (g) => {
    const n = g?.mode;
    return (n === 3 || n === 4) && typeof g.id === 'string' && !Number.isNaN(new Date(g.date).getTime())
      && ruleOk(g.rule, n) && Array.isArray(g.playerIds) && g.playerIds.length === n
      && Array.isArray(g.rounds) && g.rounds.every((r) => roundOk(r, n))
      && (!g.finished || resultOk(g.result, n));
  };
  return Boolean(d && d.version === 1 && d.rules && ruleOk(d.rules[3], 3) && ruleOk(d.rules[4], 4)
    && Array.isArray(d.players) && d.players.every((p) => p && typeof p.id === 'string' && typeof p.name === 'string')
    && Array.isArray(d.games) && d.games.every(gameOk));
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
    ui.saveError = false;
  } catch {
    ui.saveError = true;
  }
}

let db = load();
const ui = { tab: 'game', armed: null, statMode: 4, open: null, f: null, msg: '', saveError: false,
  fuView: 'sheet', fuq: null, fuAns: null, fuScore: { ok: 0, total: 0 } }; // 符計算タブの練習は保存しない
let draft = newDraft(4);

function newDraft(mode) {
  return { mode, detail: true, length: 'hanchan', seats: Array(mode).fill(''), scores: Array(mode).fill(''), newName: '' };
}
const active = () => db.games.find((g) => !g.finished);
const pname = (id) => db.players.find((p) => p.id === id)?.name ?? '？';

// ---------- 部品 ----------
function seg(act, value, options) {
  return `<div class="seg">${options.map(([v, label]) => `<button class="${String(v) === String(value) ? 'on' : ''}" data-act="${act}" data-v="${v}">${label}</button>`).join('')}</div>`;
}
// 2回押して初めて実行されるボタン（消す・終える などの取り返しがつかない操作用）
function cbtn(act, label, id = '', cls = '') {
  const armed = ui.armed === act + id;
  return `<button class="btn ${cls} ${armed ? 'armed' : ''}" data-act="${act}" data-id="${id}" data-confirm>${armed ? 'もう一度押すと実行' : label}</button>`;
}
function ruleLine(mode, r) {
  return `${num(r.start)}点持ち / ${num(r.ret)}点返し / ウマ ${r.uma.map((u) => (u > 0 ? '+' : '') + u).join(' ')}${mode === 3 ? ` / ツモ損${r.tsumoLoss ? 'あり' : 'なし'}` : ''}`;
}

// ---------- 対局タブ ----------
function renderNew() {
  const d = draft, n = d.mode, rule = db.rules[n];
  const opts = (sel) => `<option value="">えらぶ</option>` + db.players.map((p) => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${h(p.name)}</option>`).join('');
  const seats = d.seats.map((pid, i) => `
    <div class="row">
      <span class="windmark">${WINDS[i]}</span>
      <select data-chg="seat" data-i="${i}">${opts(pid)}</select>
      ${d.detail ? '' : `<input class="scorein" type="number" inputmode="numeric" step="100" placeholder="最終点数" value="${h(d.scores[i])}" data-inp="score" data-i="${i}">`}
    </div>`).join('');
  return `
  <section class="card">
    <h2>新しい対局</h2>
    <label class="lbl">人数</label>${seg('mode', n, [[4, '四人麻雀'], [3, '三人麻雀']])}
    <label class="lbl">記録のしかた</label>${seg('detail', d.detail, [[true, '1局ごとに記録'], [false, '結果だけ記録']])}
    ${d.detail ? `<label class="lbl">長さ</label>${seg('length', d.length, [['hanchan', '半荘'], ['tonpu', '東風']])}` : ''}
    <label class="lbl">${d.detail ? '席（東＝最初の親）' : '席と最終点数'}</label>
    ${seats}
    ${d.detail ? '' : `<p class="note" id="sumline">${sumLine()}</p>`}
    <div class="row add">
      <input type="text" maxlength="12" placeholder="新しい人の名前" value="${h(d.newName)}" data-inp="newName">
      <button class="btn" data-act="addPlayer">追加</button>
    </div>
    <p class="note">ルール: ${ruleLine(n, rule)}（「設定」で変えられます）</p>
    ${ui.msg ? `<p class="err">${h(ui.msg)}</p>` : ''}
    <button class="btn primary wide" data-act="start">${d.detail ? '対局を始める' : 'この結果を保存'}</button>
  </section>`;
}
function sumLine() {
  const rule = db.rules[draft.mode];
  const want = rule.start * draft.mode;
  const sum = draft.scores.reduce((a, v) => a + (Number(v) || 0), 0);
  return `合計 ${num(sum)} / ${num(want)}点${sum === want ? ' ✓' : `（差 ${signed(sum - want)}）`}　※供託が残ったらトップに足して入力`;
}

function describe(e, g) {
  const r = e.round, nm = (s) => h(pname(g.playerIds[s]));
  let t = '';
  if (r.type === 'ron') t = `${r.wins.map((w) => nm(w.winner)).join('・')} ロン ← ${nm(r.loser)}`;
  else if (r.type === 'tsumo') t = `${nm(r.winner)} ツモ`;
  else if (r.type === 'draw') t = r.abort ? '途中流局' : `流局（聴牌: ${r.tenpai.length ? r.tenpai.map(nm).join('・') : 'なし'}）`;
  else t = '点数の修正';
  if (r.riichi?.length) t += `　リーチ: ${r.riichi.map(nm).join('・')}`;
  return t;
}
function logHtml(g, st) {
  if (!st.log.length) return '<p class="note">まだ記録がありません</p>';
  return `<ol class="log">${[...st.log].reverse().map((e) => `
    <li><div class="logh"><b>${e.round.type === 'adjust' ? '修正' : `${kyokuName(e.k, g.mode)} ${e.honba}本場`}</b> ${describe(e, g)}</div>
    <div class="deltas">${e.delta.map((d, i) => `<span class="${d > 0 ? 'plus' : d < 0 ? 'minus' : ''}">${h(pname(g.playerIds[i]))} ${signed(d)}</span>`).join('')}</div></li>`).join('')}</ol>`;
}

function renderTable(g) {
  const st = replay(g), n = g.mode;
  const total = n * (g.length === 'hanchan' ? 2 : 1);
  const hint = st.scores.some((s) => s < 0) ? '持ち点がマイナスの人がいます' : st.k >= total ? '決めた局数が終わりました' : '';
  const pos = ['bottom', 'right', 'top', 'left'];
  const seats = g.playerIds.map((pid, i) => `
    <div class="seat ${pos[i]} ${i === st.dealer ? 'dealer' : ''}">
      <span class="wind">${WINDS[(i - st.dealer + n) % n]}</span>
      <span class="pname">${h(pname(pid))}</span>
      <span class="score">${num(st.scores[i])}</span>
    </div>`).join('');
  return `
  <section class="felt">
    <div class="table">
      ${seats}
      <div class="center"><b>${kyokuName(st.k, n)}</b><span>${st.honba}本場</span><span>供託 ${num(st.kyotaku)}</span></div>
    </div>
  </section>
  ${hint ? `<p class="hint">${hint}。終えるときは下の「対局を終える」を押してください</p>` : ''}
  <div class="acts">
    <button class="btn primary" data-act="open" data-v="ron">ロン</button>
    <button class="btn primary" data-act="open" data-v="tsumo">ツモ</button>
    <button class="btn primary" data-act="open" data-v="draw">流局</button>
  </div>
  <div class="acts">
    <button class="btn" data-act="open" data-v="adjust">点数を直す</button>
    ${g.rounds.length ? cbtn('undo', '1つ戻す') : '<button class="btn" disabled>1つ戻す</button>'}
  </div>
  <section class="card"><h2>この対局の記録</h2>${logHtml(g, st)}</section>
  <div class="acts">
    ${cbtn('finish', '対局を終える', '', 'gold')}
    ${cbtn('discard', 'この対局を捨てる', '', 'danger')}
  </div>`;
}

// ---------- 入力ダイアログ ----------
function openDialog(type) {
  const g = active();
  ui.f = { type, loser: null, winner: null, winners: [], hands: {}, han: 2, fu: 30, riichi: [], tenpai: [], abort: false, deltas: Array(g.mode).fill('') };
  renderDlg();
  $('#dlg').showModal();
}
function closeDialog() {
  ui.f = null;
  $('#dlg').close();
}
function buildRound(g, f) {
  const badHand = (x) => x.han === 1 && x.fu < 30;
  if (f.type === 'ron') {
    if (f.loser == null) return { error: '振り込んだ人を選んでください' };
    if (!f.winners.length) return { error: 'あがった人を選んでください' };
    const wins = f.winners.map((w) => ({ winner: w, ...(f.hands[w] || { han: 2, fu: 30 }) }));
    if (wins.some(badHand)) return { error: '1翻は30符以上です' };
    return { round: { type: 'ron', loser: f.loser, wins, riichi: f.riichi } };
  }
  if (f.type === 'tsumo') {
    if (f.winner == null) return { error: 'あがった人を選んでください' };
    if (badHand(f)) return { error: '1翻は30符以上です' };
    return { round: { type: 'tsumo', winner: f.winner, han: f.han, fu: f.fu, riichi: f.riichi } };
  }
  if (f.type === 'draw') return { round: { type: 'draw', tenpai: f.abort ? [] : f.tenpai, abort: f.abort, riichi: f.riichi } };
  const deltas = f.deltas.map((v) => Number(v) || 0);
  if (deltas.every((d) => d === 0)) return { error: '増減を入力してください（減るときは -1000 のように）' };
  return { round: { type: 'adjust', deltas } };
}
function handSelect(hand, attrs) {
  return `
    <select data-chg="hand" data-k="han" ${attrs}>${HAN_OPTIONS.map(([v, l]) => `<option value="${v}" ${v === hand.han ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <select data-chg="hand" data-k="fu" ${attrs} ${hand.han >= 5 ? 'disabled' : ''}>${FU_OPTIONS.map((v) => `<option value="${v}" ${v === hand.fu ? 'selected' : ''}>${v}符</option>`).join('')}</select>`;
}
function renderDlg() {
  const g = active(), f = ui.f;
  const names = g.playerIds.map(pname);
  const chips = (key, skip = null) => `<div class="chips">${names.map((nm, i) => {
    const on = Array.isArray(f[key]) ? f[key].includes(i) : f[key] === i;
    return i === skip ? '' : `<button class="chip ${on ? 'on' : ''}" data-act="pick" data-key="${key}" data-i="${i}">${h(nm)}</button>`;
  }).join('')}</div>`;
  const title = { ron: 'ロン', tsumo: 'ツモ', draw: '流局', adjust: '点数を直す' }[f.type];
  // 符に迷ったとき、入力を消さずにその場で早見表を開く
  const peek = `<button class="linkbtn" data-act="fuPeek">${f.showFu ? '符の早見表をとじる' : '符の早見表を見る'}</button>
    ${f.showFu ? `<div class="peek">${fuTemplate()}${partsSheet()}</div>` : ''}`;
  let body = '';
  if (f.type === 'ron') {
    body = `<label class="lbl">振り込んだ人</label>${chips('loser')}
      <label class="lbl">あがった人（2人以上も選べます）</label>${chips('winners', f.loser)}
      ${f.winners.map((w) => `<div class="row"><span class="handname">${h(names[w])}</span>${handSelect(f.hands[w], `data-i="${w}"`)}</div>`).join('')}
      ${peek}`;
  } else if (f.type === 'tsumo') {
    body = `<label class="lbl">あがった人</label>${chips('winner')}
      <div class="row">${handSelect(f, '')}</div>${peek}`;
  } else if (f.type === 'draw') {
    body = `<label class="check"><input type="checkbox" data-chg="abort" ${f.abort ? 'checked' : ''}> 途中流局（九種九牌など。点数は動かず親はそのまま）</label>
      ${f.abort ? '' : `<label class="lbl">聴牌（テンパイ）していた人</label>${chips('tenpai')}`}`;
  } else {
    body = `<p class="note">チョンボの罰符や、入力まちがいの埋め合わせに使います。局は進みません。</p>
      ${names.map((nm, i) => `<div class="row"><span class="handname">${h(nm)}</span><input type="number" inputmode="numeric" step="100" placeholder="0" value="${h(f.deltas[i])}" data-inp="delta" data-i="${i}"></div>`).join('')}`;
  }
  if (f.type !== 'adjust') body += `<label class="lbl">この局でリーチした人</label>${chips('riichi')}`;
  $('#dlg').innerHTML = `
    <h2>${title}</h2>${body}
    <div id="preview"></div>
    <div class="acts">
      <button class="btn" data-act="cancel">やめる</button>
      <button class="btn primary" id="commit" data-act="commit">記録する</button>
    </div>`;
  renderPreview();
}
// 入力中の内容で点数がどう動くかを先に見せる（入力欄を作り直さないので、打っている途中でも呼べる）
function renderPreview() {
  const g = active(), built = buildRound(g, ui.f);
  let html = `<p class="err">${h(built.error || '')}</p>`;
  if (built.round) {
    const e = replay({ ...g, rounds: [...g.rounds, built.round] }).log.at(-1);
    html = `<div class="deltas big">${e.delta.map((d, i) => `<span class="${d > 0 ? 'plus' : d < 0 ? 'minus' : ''}">${h(pname(g.playerIds[i]))}<b>${signed(d)}</b></span>`).join('')}</div>`;
  }
  $('#preview').innerHTML = html;
  $('#commit').disabled = !built.round;
}

// ---------- 履歴タブ ----------
function resultRows(g) {
  const order = g.playerIds.map((_, i) => i).sort((a, b) => g.result.rank[a] - g.result.rank[b]);
  return order.map((i) => `<tr><td class="rk r${g.result.rank[i]}">${g.result.rank[i]}</td><td>${h(pname(g.playerIds[i]))}</td><td class="n">${num(g.result.final[i])}</td><td class="n ${g.result.pts[i] >= 0 ? 'plus' : 'minus'}">${pt(g.result.pts[i])}</td></tr>`).join('');
}
function renderHistory() {
  const games = db.games.filter((g) => g.finished).sort((a, b) => b.date.localeCompare(a.date));
  if (!games.length) return '<section class="card"><p class="note">終わった対局はまだありません</p></section>';
  return games.map((g) => `
    <section class="card">
      <div class="gh"><b>${new Date(g.date).toLocaleDateString('ja-JP')}</b><span class="tag">${g.mode === 4 ? '四麻' : '三麻'}</span><span class="tag">${g.detail ? (g.length === 'hanchan' ? '半荘' : '東風') : '結果のみ'}</span></div>
      <table class="res">${resultRows(g)}</table>
      <div class="acts small">
        ${g.detail ? `<button class="btn" data-act="toggle" data-id="${g.id}">${ui.open === g.id ? '記録をとじる' : '1局ごとの記録'}</button>` : ''}
        ${cbtn('delGame', '消す', g.id, 'danger')}
      </div>
      ${ui.open === g.id ? logHtml(g, replay(g)) : ''}
    </section>`).join('');
}

// ---------- 戦績タブ ----------
function calcStats(mode) {
  const m = new Map();
  const get = (id) => {
    if (!m.has(id)) m.set(id, { id, games: 0, pts: 0, rankSum: 0, ranks: Array(mode).fill(0), best: -Infinity, series: [0], rounds: 0, wins: 0, tsumo: 0, deal: 0, riichi: 0, winSum: 0, dealSum: 0, draws: 0, tenpai: 0 });
    return m.get(id);
  };
  const games = db.games.filter((g) => g.finished && g.mode === mode).sort((a, b) => a.date.localeCompare(b.date));
  for (const g of games) {
    g.playerIds.forEach((pid, i) => {
      const s = get(pid);
      s.games++;
      s.pts += g.result.pts[i];
      s.rankSum += g.result.rank[i];
      s.ranks[g.result.rank[i] - 1]++;
      s.best = Math.max(s.best, g.result.final[i]);
      s.series.push(s.pts);
    });
    if (!g.detail) continue;
    for (const e of replay(g).log) {
      const r = e.round;
      if (r.type === 'adjust') continue;
      g.playerIds.forEach((pid, i) => {
        const s = get(pid);
        s.rounds++;
        if (r.riichi?.includes(i)) s.riichi++;
        if (r.type === 'draw' && !r.abort) { s.draws++; if (r.tenpai.includes(i)) s.tenpai++; }
        if (e.loser === i) { s.deal++; s.dealSum += e.lossValue; }
      });
      for (const w of e.wins) {
        const s = get(g.playerIds[w.seat]);
        s.wins++; s.winSum += w.value;
        if (w.tsumo) s.tsumo++;
      }
    }
  }
  return [...m.values()].sort((a, b) => b.pts - a.pts);
}
function spark(series) {
  const W = 280, H = 56, min = Math.min(...series), max = Math.max(...series), span = max - min || 1;
  const x = (i) => (series.length === 1 ? 0 : (i / (series.length - 1)) * W);
  const y = (v) => H - 4 - ((v - min) / span) * (H - 8);
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-label="ポイントの推移">
    <line x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}" class="zero"/>
    <polyline points="${series.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}"/></svg>`;
}
function renderStats() {
  const mode = ui.statMode, list = calcStats(mode);
  const pc = (a, b) => (b ? (a / b * 100).toFixed(1) + '%' : '—');
  const avg = (a, b) => (b ? num(Math.round(a / b)) : '—');
  const cards = list.map((s) => `
    <section class="card">
      <div class="gh"><b class="big">${h(pname(s.id))}</b><span class="total ${s.pts >= 0 ? 'plus' : 'minus'}">${pt(s.pts)}</span></div>
      ${spark(s.series)}
      <div class="rankbar">${s.ranks.map((c, i) => (c ? `<span class="r${i + 1}" style="flex:${c}">${i + 1}位 ${c}</span>` : '')).join('')}</div>
      <dl class="stats">
        <div><dt>対局数</dt><dd>${s.games}</dd></div>
        <div><dt>平均順位</dt><dd>${(s.rankSum / s.games).toFixed(2)}</dd></div>
        <div><dt>トップ率</dt><dd>${pc(s.ranks[0], s.games)}</dd></div>
        <div><dt>ラス率</dt><dd>${pc(s.ranks[mode - 1], s.games)}</dd></div>
        <div><dt>平均ポイント</dt><dd>${pt(s.pts / s.games)}</dd></div>
        <div><dt>最高点</dt><dd>${num(s.best)}</dd></div>
        ${s.rounds ? `
        <div><dt>和了率</dt><dd>${pc(s.wins, s.rounds)}</dd></div>
        <div><dt>放銃率</dt><dd>${pc(s.deal, s.rounds)}</dd></div>
        <div><dt>リーチ率</dt><dd>${pc(s.riichi, s.rounds)}</dd></div>
        <div><dt>ツモ和了の割合</dt><dd>${pc(s.tsumo, s.wins)}</dd></div>
        <div><dt>平均和了点</dt><dd>${avg(s.winSum, s.wins)}</dd></div>
        <div><dt>平均放銃点</dt><dd>${avg(s.dealSum, s.deal)}</dd></div>
        <div><dt>流局時の聴牌率</dt><dd>${pc(s.tenpai, s.draws)}</dd></div>
        <div><dt>記録した局数</dt><dd>${s.rounds}</dd></div>` : ''}
      </dl>
    </section>`).join('');
  return `${seg('statMode', mode, [[4, '四人麻雀'], [3, '三人麻雀']])}
    ${cards || '<section class="card"><p class="note">この人数での終わった対局はまだありません</p></section>'}
    ${list.some((s) => s.rounds) ? '<p class="note">和了率などの細かい数字は「1局ごとに記録」した対局だけから出しています</p>' : ''}`;
}

// ---------- 設定タブ ----------
function renderSettings() {
  const ruleCard = (mode) => {
    const r = db.rules[mode];
    const f = (k, label, extra = '') => `<div class="row"><span class="handname">${label}</span><input type="number" inputmode="numeric" value="${r[k]}" data-chg="rule" data-mode="${mode}" data-k="${k}" ${extra}></div>`;
    return `<section class="card"><h2>${mode === 4 ? '四人麻雀' : '三人麻雀'}のルール</h2>
      ${f('start', '持ち点', 'step="1000"')}${f('ret', '返し点', 'step="1000"')}
      <div class="row"><span class="handname">ウマ（1位から）</span>${r.uma.map((u, i) => `<input class="uma" type="number" value="${u}" data-chg="rule" data-mode="${mode}" data-k="uma" data-i="${i}">`).join('')}</div>
      ${f('honba', '1本場（1人あたり）', 'step="100"')}${f('tenpai', 'ノーテン罰符の合計', 'step="1000"')}
      ${mode === 3 ? `<label class="lbl">ツモのときの点数</label>${seg('tsumoLoss', r.tsumoLoss, [[true, 'ツモ損あり'], [false, 'ツモ損なし']])}` : ''}
    </section>`;
  };
  const used = new Set(db.games.flatMap((g) => g.playerIds));
  return `
    ${ruleCard(4)}${ruleCard(3)}
    <p class="note">ルールの変更は、次に始める対局から使われます</p>
    <section class="card"><h2>メンバー</h2>
      ${db.players.map((p) => `<div class="row"><input type="text" maxlength="12" value="${h(p.name)}" data-chg="rename" data-id="${p.id}">${used.has(p.id) ? '' : cbtn('delPlayer', '消す', p.id, 'danger')}</div>`).join('') || '<p class="note">まだ誰もいません（「対局」で追加できます）</p>'}
    </section>
    <section class="card"><h2>データの控え</h2>
      <p class="note">記録はこの端末のブラウザの中だけにあります。機種変更の前や、ときどきの控えに書き出してください。</p>
      <div class="acts">
        <button class="btn" data-act="export">ファイルに書き出す</button>
        <label class="btn filebtn">ファイルから読み込む<input type="file" accept=".json,application/json" data-chg="import" hidden></label>
      </div>
      ${ui.pending ? `<p class="hint">読み込むと、いまの記録（対局 ${db.games.length} 件）は読み込んだ内容（対局 ${ui.pending.games.length} 件）に置き換わります</p><div class="acts">${cbtn('doImport', '置き換える', '', 'danger')}<button class="btn" data-act="cancelImport">やめる</button></div>` : ''}
      ${ui.msg ? `<p class="err">${h(ui.msg)}</p>` : ''}
    </section>`;
}

// ---------- 符計算タブ ----------
function renderFu() {
  return seg('fuView', ui.fuView, [['sheet', '早見表'], ['quiz', '練習']])
    + (ui.fuView === 'quiz' ? quizHtml(ui.fuq, ui.fuAns, ui.fuScore) : sheetHtml());
}

// ---------- 描画 ----------
function render() {
  const a = active();
  const views = { game: () => (a ? renderTable(a) : renderNew()), history: renderHistory, stats: renderStats, fu: renderFu, settings: renderSettings };
  $('#main').innerHTML = (ui.saveError ? '<p class="err">保存に失敗しました。ブラウザの空き容量や「プライベート」モードを確かめてください</p>' : '') + views[ui.tab]();
  $('#tabs').innerHTML = [['game', '対局'], ['history', '履歴'], ['stats', '戦績'], ['fu', '符計算'], ['settings', '設定']]
    .map(([k, l]) => `<button class="${ui.tab === k ? 'on' : ''}" data-act="tab" data-v="${k}">${l}</button>`).join('');
  if (ui.f) renderDlg();
}

// ---------- 操作 ----------
const bool = (v) => v === 'true';
const actions = {
  tab(d) { ui.tab = d.v; ui.msg = ''; ui.pending = null; },
  mode(d) { draft = { ...newDraft(Number(d.v)), detail: draft.detail, length: draft.length }; },
  detail(d) { draft.detail = bool(d.v); },
  length(d) { draft.length = d.v; },
  statMode(d) { ui.statMode = Number(d.v); },
  tsumoLoss(d) { db.rules[3].tsumoLoss = bool(d.v); save(); },
  addPlayer() {
    const name = draft.newName.trim();
    if (!name) return;
    if (db.players.some((p) => p.name === name)) { ui.msg = '同じ名前の人がいます'; return; }
    const p = { id: uid(), name };
    db.players.push(p);
    const empty = draft.seats.indexOf('');
    if (empty >= 0) draft.seats[empty] = p.id;
    draft.newName = '';
    ui.msg = '';
    save();
  },
  start() {
    const d = draft, n = d.mode, rule = structuredClone(db.rules[n]);
    if (d.seats.some((s) => !s)) { ui.msg = '全員の席を選んでください'; return; }
    if (new Set(d.seats).size !== n) { ui.msg = '同じ人が2つの席に入っています'; return; }
    const g = { id: uid(), date: new Date().toISOString(), mode: n, detail: d.detail, length: d.length, rule, playerIds: [...d.seats], rounds: [], finished: false };
    if (!d.detail) {
      const scores = d.scores.map((v) => Number(v));
      if (d.scores.some((v) => v === '' || Number.isNaN(Number(v)))) { ui.msg = '全員の最終点数を入力してください'; return; }
      if (scores.reduce((a, b) => a + b, 0) !== rule.start * n) { ui.msg = '点数の合計が合っていません'; return; }
      g.result = settle(n, rule, scores);
      g.finished = true;
      ui.tab = 'history';
    }
    db.games.push(g);
    draft = newDraft(n);
    ui.msg = '';
    save();
  },
  open(d) { openDialog(d.v); },
  cancel() { closeDialog(); },
  pick(d) {
    const f = ui.f, i = Number(d.i), key = d.key;
    if (Array.isArray(f[key])) f[key] = f[key].includes(i) ? f[key].filter((x) => x !== i) : [...f[key], i].sort();
    else f[key] = f[key] === i ? null : i;
    if (key === 'loser') f.winners = f.winners.filter((w) => w !== f.loser);
    for (const w of f.winners) f.hands[w] ??= { han: 2, fu: 30 };
  },
  commit() {
    const g = active(), built = buildRound(g, ui.f);
    if (!built.round) return;
    g.rounds.push(built.round);
    save();
    closeDialog();
  },
  undo() { active().rounds.pop(); save(); },
  finish() {
    const g = active(), st = replay(g);
    g.result = settle(g.mode, g.rule, st.scores, st.kyotaku);
    g.finished = true;
    ui.tab = 'history';
    save();
  },
  discard() { db.games = db.games.filter((g) => g.finished); save(); },
  toggle(d) { ui.open = ui.open === d.id ? null : d.id; },
  delGame(d) { db.games = db.games.filter((g) => g.id !== d.id); save(); },
  delPlayer(d) { db.players = db.players.filter((p) => p.id !== d.id); save(); },
  export() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 1)], { type: 'application/json' }));
    a.download = `麻雀記録_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  },
  doImport() { db = ui.pending; ui.pending = null; draft = newDraft(4); save(); },
  cancelImport() { ui.pending = null; },
  fuView(d) { ui.fuView = d.v; if (d.v === 'quiz' && !ui.fuq) actions.fuNext(); },
  fuAnswer(d) {
    if (ui.fuAns != null) return; // 答えたあとは押し直せない
    ui.fuAns = Number(d.v);
    ui.fuScore.total++;
    if (ui.fuAns === calcFu(ui.fuq).fu) ui.fuScore.ok++;
  },
  fuNext() {
    ui.fuq = makeQuestion();
    ui.fuAns = null;
    queueMicrotask(() => window.scrollTo(0, 0)); // 描き直したあとで、次の問題が見える位置へ戻す
  },
  fuPeek() { ui.f.showFu = !ui.f.showFu; },
};

document.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-act]');
  if (!b) return;
  const d = b.dataset;
  if ('confirm' in d) {
    const key = d.act + (d.id || '');
    if (ui.armed !== key) { ui.armed = key; render(); return; }
  }
  ui.armed = null;
  actions[d.act]?.(d);
  render();
});

document.addEventListener('input', (ev) => {
  const t = ev.target, d = t.dataset;
  if (d.inp === 'newName') draft.newName = t.value;
  else if (d.inp === 'score') { draft.scores[Number(d.i)] = t.value; $('#sumline').textContent = sumLine(); }
  else if (d.inp === 'delta') { ui.f.deltas[Number(d.i)] = t.value; renderPreview(); }
});

document.addEventListener('change', (ev) => {
  const t = ev.target, d = t.dataset;
  if (d.chg === 'seat') draft.seats[Number(d.i)] = t.value;
  else if (d.chg === 'hand') {
    const hand = d.i === undefined ? ui.f : ui.f.hands[Number(d.i)];
    hand[d.k] = Number(t.value);
  } else if (d.chg === 'abort') ui.f.abort = t.checked;
  else if (d.chg === 'rule') {
    const v = Number(t.value);
    if (t.value === '' || Number.isNaN(v)) return;
    const r = db.rules[d.mode];
    if (d.k === 'uma') r.uma[Number(d.i)] = v; else r[d.k] = v;
    save();
    return;
  } else if (d.chg === 'rename') {
    const p = db.players.find((x) => x.id === d.id), name = t.value.trim();
    if (p && name) { p.name = name; save(); }
    return;
  } else if (d.chg === 'import') {
    const file = t.files[0];
    if (!file) return;
    file.text().then((text) => {
      try {
        const data = JSON.parse(text);
        if (!validDb(data)) throw new Error();
        ui.pending = data; ui.msg = '';
      } catch { ui.pending = null; ui.msg = 'このアプリで書き出したファイルではないようです'; }
      render();
    });
    return;
  } else return;
  render();
});

$('#dlg').addEventListener('close', () => { ui.f = null; });

render();
