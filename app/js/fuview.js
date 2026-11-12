// 「符計算」タブと、和了入力の中で開く早見表の HTML（中身の計算は fu.js）
import { FORMS, rowsUpTo, fuFromExtra, setFu, calcFu, formOf, isMenzen, tileFace, WAIT_NAME } from './fu.js';
import { FU_OPTIONS } from './score.js';

// 早見表。mark = { form, extra } を渡すと、そのマスを光らせる（練習の答え合わせ用）
export function fuTemplate(mark = null) {
  const head = FORMS.map((f) => `<th><b>${f.label}</b>${f.start}から</th>`).join('');
  const body = rowsUpTo(mark ? mark.extra : 0).map(([a, b]) => {
    const cells = FORMS.map((f) => {
      const fu = fuFromExtra(f.key, a);
      const raw = a === b ? `${f.start + a}` : `${f.start + a}〜${f.start + b}`;
      const on = mark && mark.form === f.key && mark.extra >= a && mark.extra <= b;
      const star = a === 0 && f.key !== 'menzenRon' ? '<sup>※</sup>' : '';
      return `<td class="b${fu}${on ? ' mark' : ''}"><span class="v">${fu}${star}</span><span class="raw">${raw}</span></td>`;
    }).join('');
    return `<tr><th class="ex">${a === b ? a : `${a}〜${b}`}</th>${cells}</tr>`;
  }).join('');
  return `<table class="futable"><thead><tr><th class="ex">足し符</th>${head}</tr></thead><tbody>${body}</tbody></table>
    <p class="note">マスの小さい数字は切り上げる前の合計。※ツモで足し符0は、門前なら平和ツモで20符（鳴いていれば30符）。鳴きロンで足し符0は合計20だが30符として数える。</p>`;
}

export function partsSheet() {
  const kinds = [['明刻', 'kou', false], ['暗刻', 'kou', true], ['明槓', 'kan', false], ['暗槓', 'kan', true]];
  const rows = [['中張牌', '2〜8', false], ['么九牌', '1・9・字牌', true]];
  return `<table class="parts">
      <tr><th></th>${kinds.map(([n]) => `<th>${n}</th>`).join('')}</tr>
      ${rows.map(([n, sub, y]) => `<tr><th>${n}<small>${sub}</small></th>${kinds.map(([, k, c]) => `<td>${setFu(k, y, c)}</td>`).join('')}</tr>`).join('')}
    </table>
    <p class="memo">明刻の中張牌＝2から。么九牌で×2・暗で×2・槓で×4</p>
    <dl class="partlist">
      <div><dt>雀頭</dt><dd>役牌（三元牌・場風・自風）は2符。連風牌（場風と自風が同じ。東場の東家の東など）は卓のルールで2符か4符。ほかは0</dd></div>
      <div><dt>待ち</dt><dd>嵌張・辺張・単騎は2符。両面・シャンポンは0</dd></div>
    </dl>`;
}

export function sheetHtml() {
  return `
  <section class="card">
    <h2>符はねの早見表</h2>
    <p class="lead"><b>足し符</b>＝面子（刻子・槓子）＋雀頭＋待ちの符。和了の形ごとのスタートに足して、一の位を切り上げる。</p>
    <p class="note">スタート: 門前ロン30（副底20＋門前ロン10）、ツモ22（副底20＋ツモ2）、鳴きロン20（副底20だけ）</p>
    ${fuTemplate()}
  </section>
  <section class="card">
    <h2>はねる・はねないの覚え方</h2>
    <ul class="tips">
      <li>足し符はいつも偶数。合計の一の位が0ならそのまま、0以外なら次の10へ</li>
      <li><b>ロン</b>（門前・鳴き）は足し符が 10・20・30 ちょうどなら<b>はねない</b>。12 から次の段</li>
      <li><b>ツモ</b>は2符が先に入っているので、足し符が 8・18・28 ちょうどなら<b>はねない</b>。10 から次の段</li>
      <li>例: 么九牌の暗刻1つだけ（足し符8）→ ツモ30符・門前ロン40符・鳴きロン30符</li>
      <li>30 を超えても、同じく10ごとに段が上がる</li>
    </ul>
  </section>
  <section class="card">
    <h2>足し符の部品</h2>
    ${partsSheet()}
  </section>
  <section class="card">
    <h2>まちがえやすいところ</h2>
    <ul class="tips">
      <li>シャンポン待ちを<b>ロン</b>で和了ったら、和了牌で完成した刻子は<b>明刻</b>として数える（么九牌なら8→4、中張牌なら4→2）。ツモなら暗刻のまま</li>
      <li>暗槓は鳴いたことにならない。暗槓だけの手は門前のまま（ロンなら30から）</li>
      <li>鳴いた手のロンには門前ロンの10符が付かない（20から）</li>
      <li>七対子は25符で固定（切り上げない）。平和ツモは20符（ツモの2符も付けない）</li>
      <li>待ちが2通りに取れる形は、点数が高くなるほうで数える</li>
    </ul>
  </section>`;
}

// ---------- 練習 ----------
function tile(t, win) {
  const [top, suit] = tileFace(t);
  return `<span class="tile ${t[0]} ${t}${win ? ' win' : ''}"><b>${top}</b>${suit ? `<i>${suit}</i>` : ''}</span>`;
}
function setLabel(q, s, i) {
  if (i === q.winSet && q.wait === 'shanpon') return '刻子（和了牌で完成）';
  if (s.kind === 'shun') return s.open ? 'チー' : '順子';
  if (s.kind === 'kou') return s.open ? 'ポン' : '暗刻';
  return s.open ? '明槓' : '暗槓';
}
const formLabel = (q) => (isMenzen(q) ? '門前' : '鳴いて') + (q.win === 'ron' ? 'ロン' : 'ツモ');

function handHtml(q) {
  if (q.chiitoi) {
    return `<div class="hand"><div class="set"><span class="tiles">${q.chiitoi.map((t, i) => tile(t) + tile(t, i === 6)).join('')}</span><span class="setname">七対子の形</span></div></div>`;
  }
  const row = (tiles, label, winIdx, open) => `<div class="set${open ? ' open' : ''}"><span class="tiles">${tiles.map((t, j) => tile(t, j === winIdx)).join('')}</span><span class="setname">${label}</span></div>`;
  const sets = q.sets.map((s, i) => ({ s, i }));
  return `<div class="hand">
    ${sets.filter(({ s }) => !s.open).map(({ s, i }) => row(s.tiles, setLabel(q, s, i), i === q.winSet ? q.winIdx : -1, false)).join('')}
    ${row([q.pair, q.pair], '雀頭', q.winSet === -1 ? q.winIdx : -1, false)}
    ${sets.filter(({ s }) => s.open).map(({ s, i }) => row(s.tiles, setLabel(q, s, i), -1, true)).join('')}
  </div>`;
}

function answerHtml(q, r, ans) {
  const ok = ans === r.fu;
  const line = (label, fu, note = '') => `<tr><td>${label}${note ? `<small>${note}</small>` : ''}</td><td class="n">${fu}</td></tr>`;
  let detail;
  if (r.special) {
    detail = `<p class="sum">${r.note}</p>`;
  } else {
    const form = FORMS.find((f) => f.key === formOf(q));
    detail = `<table class="breakdown">
        ${line(`スタート（${form.label}）`, form.start, r.base.map((p) => `${p.label}${p.fu}`).join('＋'))}
        ${r.extras.map((p) => line(p.label, p.fu, p.note)).join('')}
      </table>
      <p class="sum">足し符 <b>${r.extra}</b> → 合計 ${r.raw} → <b>${r.fu}符</b></p>
      <p class="note">${r.note}。早見表では「${form.label}」の列、足し符${r.extra}のマス${r.extra > 30 ? '（30より先の行を足してあります）' : ''}</p>
      ${fuTemplate({ form: form.key, extra: r.extra })}`;
  }
  return `<div class="verdict ${ok ? 'ok' : 'ng'}">${ok ? `正解！ ${r.fu}符` : `ちがいます。正解は ${r.fu}符`}</div>
    ${detail}
    <button class="btn primary wide" data-act="fuNext">次の問題</button>`;
}

export function quizHtml(q, ans, score) {
  const r = calcFu(q);
  const answered = ans != null;
  const btns = FU_OPTIONS.map((v) => {
    const cls = !answered ? '' : v === r.fu ? 'right' : v === ans ? 'wrong' : 'dim';
    return `<button class="btn ${cls}" data-act="fuAnswer" data-v="${v}">${v}</button>`;
  }).join('');
  return `
  <section class="card">
    <div class="gh"><h2>この手は何符？</h2><span class="score">正解 ${score.ok} / ${score.total}</span></div>
    <div class="qhead"><span class="badge">${formLabel(q)}</span>${q.chiitoi ? '' : `<span>待ち: <b>${WAIT_NAME[q.wait]}</b></span>`}</div>
    ${handHtml(q)}
    <p class="note">光っている牌が和了牌。役の有無は問いません。雀頭の字牌は三元牌だけ出ます</p>
    <div class="fuans">${btns}</div>
    ${answered ? answerHtml(q, r, ans) : ''}
  </section>
  <p class="note">正解の数はこの画面を開いている間だけ数えます（保存しません）</p>`;
}
