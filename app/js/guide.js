// 「手組」タブ：鳴かずにリーチまでの切り順を教える資料。中身は動かない HTML で、牌は SVG で描く。
// 見た目は guide.css（クラス名はすべて g- 付き）。data-h / data-t / data-n の印は guideHtml() が最初の1回だけ牌の絵に置き換える。
// data-h の書き方: 空白でかたまりを区切り、「牌/ラベル」。牌は 234m のように数字のあとに種類（m 萬・p 筒・s 索・z 字牌 1東〜7中）。
// 数字の直後の印: ! 切る / ? 待ち（点線） / * いまツモった牌 / ~ 横向き / # 赤く光らせる / - 薄く / + 金に光らせる / ^ 青い枠

const B = '#1f5f9c', R = '#c0392b', G = '#2e7d4a', K = '#1b2a3a', IV = '#fbf7ec';
const KAN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const HON = ['', '東', '南', '西', '北', '白', '發', '中'];
const SUITNAME = { m: '萬', p: '筒', s: '索' };

const pin = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${x}" cy="${y}" r="${(r * .62).toFixed(2)}" fill="${IV}"/><circle cx="${x}" cy="${y}" r="${(r * .32).toFixed(2)}" fill="${c}"/>`;
const PIN = {
  2: [6.2, [[15, 11, G], [15, 29, B]]],
  3: [5.2, [[8, 9, B], [15, 20, R], [22, 31, G]]],
  4: [5.2, [[9, 11, B], [21, 11, G], [9, 29, G], [21, 29, B]]],
  5: [4.6, [[8.5, 9, B], [21.5, 9, G], [15, 20, R], [8.5, 31, G], [21.5, 31, B]]],
  6: [4.2, [[9, 8, G], [21, 8, G], [9, 21, R], [21, 21, R], [9, 32, R], [21, 32, R]]],
  7: [3.7, [[7, 6.5, G], [15, 10, G], [23, 13.5, G], [9, 23, R], [21, 23, R], [9, 32.5, R], [21, 32.5, R]]],
  8: [3.7, [9, 21].flatMap(x => [6.5, 15.5, 24.5, 33.5].map(y => [x, y, B]))],
  9: [3.6, [[8, B], [20, R], [32, G]].flatMap(([y, c]) => [7, 15, 23].map(x => [x, y, c]))],
};
function pinz(n) {
  if (n === 1) return `<circle cx="15" cy="20" r="11" fill="${G}"/><circle cx="15" cy="20" r="8.6" fill="${IV}"/><circle cx="15" cy="20" r="7" fill="${R}"/><circle cx="15" cy="20" r="4.6" fill="${IV}"/><circle cx="15" cy="20" r="2.6" fill="${B}"/>` +
    [0, 45, 90, 135, 180, 225, 270, 315].map(a => { const t = a * Math.PI / 180; return `<circle cx="${(15 + 9.8 * Math.cos(t)).toFixed(2)}" cy="${(20 + 9.8 * Math.sin(t)).toFixed(2)}" r=".7" fill="${IV}"/>`; }).join('');
  const [r, pts] = PIN[n];
  return pts.map(([x, y, c]) => pin(x, y, r, c)).join('');
}
const stick = (x, y, l, c, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-1.9" y="${-l / 2}" width="3.8" height="${l}" rx="1.9" fill="${c}"/><rect x="-.45" y="${-l / 2 + 1.4}" width=".9" height="${l - 2.8}" rx=".45" fill="${IV}" opacity=".55"/><rect x="-2.4" y="-.75" width="4.8" height="1.5" rx=".75" fill="${c}"/></g>`;
const SOU = {
  2: [[15, 11, 13], [15, 29, 13]],
  3: [[15, 10, 12], [9, 29, 12], [21, 29, 12]],
  4: [[9, 10, 12], [21, 10, 12], [9, 29, 12], [21, 29, 12]],
  5: [[8, 10, 11], [22, 10, 11], [15, 20, 11, R], [8, 30, 11], [22, 30, 11]],
  6: [6.5, 15, 23.5].flatMap(x => [[x, 10, 12], [x, 29, 12]]),
  7: [[15, 7.5, 9, R], ...[6.5, 15, 23.5].flatMap(x => [[x, 20.5, 9.5], [x, 32, 9.5]])],
  8: [[5, 10, 12], [11.5, 10, 12, G, 20], [18.5, 10, 12, G, -20], [25, 10, 12], [5, 30, 12], [11.5, 30, 12, G, -20], [18.5, 30, 12, G, 20], [25, 30, 12]],
  9: [6.5, 15, 23.5].flatMap(x => [8, 20, 32].map(y => [x, y, 9.5, x === 15 ? R : G])),
};
function souz(n) {
  if (n === 1) return `<path d="M15 29 L10 35 M15 29 L15 35.5 M15 29 L20 35" stroke="${R}" stroke-width="1.6" stroke-linecap="round" fill="none"/>` +
    `<ellipse cx="15" cy="22" rx="6.5" ry="8" fill="${G}"/><ellipse cx="13" cy="22.5" rx="3.2" ry="5.4" fill="${B}"/>` +
    `<circle cx="16.5" cy="11.5" r="4" fill="${G}"/><circle cx="17.7" cy="10.8" r="1.1" fill="${IV}"/><circle cx="17.9" cy="10.8" r=".5" fill="${K}"/>` +
    `<path d="M20.2 11.3 L23.8 12.4 L20.2 13.5 Z" fill="${R}"/><circle cx="14.6" cy="7" r="1.3" fill="${R}"/><circle cx="16.8" cy="6.4" r="1.3" fill="${R}"/>`;
  return SOU[n].map(([x, y, l, c = G, rot = 0]) => stick(x, y, l, c, rot)).join('');
}
const txt = (s, y, size, c) => `<text x="15" y="${y}" font-size="${size}" fill="${c}" text-anchor="middle" font-family="'Shippori Mincho B1','Hiragino Mincho ProN','Yu Mincho',serif" font-weight="800">${s}</text>`;
function face(code) {
  const n = +code[0], s = code[1];
  if (s === 'm') return txt(KAN[n], 16, 14, K) + txt('萬', 33, 13.5, R);
  if (s === 'p') return pinz(n);
  if (s === 's') return souz(n);
  if (n === 5) return `<rect x="6" y="7.5" width="18" height="25" rx="2" fill="none" stroke="${B}" stroke-width="1.4"/>`;
  return txt(HON[n], 27, 20, n === 6 ? G : n === 7 ? R : K);
}
const nameOf = (code) => code[1] === 'z' ? HON[+code[0]] : code[0] + SUITNAME[code[1]];
const tileSVG = (code) => `<svg viewBox="0 0 30 40" role="img" aria-label="${nameOf(code)}"><rect x=".6" y="2.4" width="28.8" height="37" rx="4" fill="#2f6f55"/><rect x=".6" y=".6" width="28.8" height="36.6" rx="4" fill="${IV}" stroke="#d8cfb6" stroke-width=".8"/><g transform="translate(0 -1.2)">${face(code)}</g></svg>`;

const MOD = { "#": "bad", '!': 'cut', '?': 'wait', '*': 'new', '~': 'side', '-': 'dim', '+': 'on', '^': 'ring' };
function parse(str) {
  const out = []; let pend = [];
  for (const ch of str) {
    if (/[0-9]/.test(ch)) pend.push({ n: ch, mods: [] });
    else if ('mpsz'.includes(ch)) { pend.forEach(p => out.push({ code: p.n + ch, mods: p.mods })); pend = []; }
    else if (MOD[ch] && pend.length) pend[pend.length - 1].mods.push(MOD[ch]);
  }
  return out;
}
const tileHTML = (t) => `<span class="g-tw${t.mods.map((m) => ' g-' + m).join('')}">${tileSVG(t.code)}</span>`;
function kind(lb) {
  if (/待ち/.test(lb)) return 'wait';
  if (/メンツ/.test(lb)) return 'meld';
  if (/対子|雀頭/.test(lb)) return 'pair';
  if (/孤立|1枚/.test(lb)) return 'iso';
  return 'taatsu';
}
function handHTML(spec, nolab) {
  return spec.trim().split(/\s+/).map((g) => {
    const [tiles, label] = g.split('/');
    const ts = parse(tiles).map(tileHTML).join('');
    if (!label) return nolab ? ts : `<span class="g-grp"><span class="g-ts">${ts}</span></span>`;
    const cut = /!/.test(tiles);
    return `<span class="g-grp g-k-${cut ? 'cut' : kind(label)}"><span class="g-ts">${ts}</span><span class="g-lb">${label}${cut ? '→切る' : ''}</span></span>`;
  }).join('');
}
const lineHTML = (c) => [1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => tileHTML({ code: i + 'p', mods: i === c ? ['ring'] : Math.abs(i - c) <= 2 ? ['on'] : ['dim'] })).join('');

const BODY = `<div class="g-root">
<header class="g-hero">
  <div class="g-wrap">
    <p class="g-eyebrow">鳴かない麻雀・入門</p>
    <h1>はじめてのリーチ</h1>
    <p class="g-lead">決まった順番で牌を切って、あと1枚であがれる形になったら「リーチ」。このタブの順番どおりに進めれば、ひとりでリーチまでたどり着けます。</p>
    <div class="g-table">
      <div class="g-hand g-big g-nolab" data-h="234m789m234p678p55s"></div>
      <div class="g-stick" role="img" aria-label="1000点棒"></div>
      <p class="g-cap">ゴールの形：14枚の手と、リーチで出す1000点棒</p>
    </div>
  </div>
</header>

<nav class="g-toc" aria-label="目次">
  <div class="g-wrap">
    <a href="#yakusoku"><span>1</span>約束</a>
    <a href="#hai"><span>2</span>牌の種類</a>
    <a href="#agari"><span>3</span>あがりの形</a>
    <a href="#katamari"><span>4</span>かたまり</a>
    <a href="#kirijun"><span>5</span>切り順</a>
    <a href="#tenpai"><span>6</span>テンパイ</a>
    <a href="#riichi"><span>7</span>リーチ</a>
    <a href="#jissen"><span>8</span>実戦の流れ</a>
    <a href="#chui"><span>9</span>つまずき</a>
    <a href="#renshu"><span>10</span>練習問題</a>
    <a href="#matome"><span>11</span>まとめ</a>
  </div>
</nav>

<div class="g-main">

<section id="yakusoku">
  <div class="g-sh"><span class="g-no">1　約束</span><h2>守ることは3つだけ</h2></div>
  <ol class="g-rules">
    <li><span class="g-n">1</span><h3>鳴かない</h3><p>ほかの人が捨てた牌で「ポン」「チー」「カン」をしない。あがるときの「ロン」「ツモ」は言ってよい。</p></li>
    <li><span class="g-n">2</span><h3>決まった順番で切る</h3><p>どの牌を捨てるかは、毎回5章の「切り順」で決める。迷ったら5章に戻る。</p></li>
    <li><span class="g-n">3</span><h3>テンパイしたらリーチ</h3><p>あと1枚であがれる形になったら、待ちの良し悪しは気にせず必ずリーチする。</p></li>
  </ol>
  <div class="g-card g-why">
    <h3>なぜ鳴かないのか</h3>
    <p>麻雀は「役」が1つもないとあがれません。リーチは、鳴かずにテンパイして宣言するだけで付く役です。鳴かなければ、どんな形の手でも役のある手にできます。</p>
    <div class="g-flow"><span class="g-ttl">鳴かない</span><span class="g-box">テンパイ</span><span class="g-ar">→</span><span class="g-box">リーチ（これが役）</span><span class="g-ar">→</span><span class="g-box g-good">あがれる</span></div>
    <div class="g-flow"><span class="g-ttl">鳴いた</span><span class="g-box">テンパイ</span><span class="g-ar">→</span><span class="g-box">リーチできない・役がない</span><span class="g-ar">→</span><span class="g-box g-bad">あがれない</span></div>
  </div>
</section>

<section id="hai">
  <div class="g-sh"><span class="g-no">2　牌の種類</span><h2>34種類を4つのグループで見る</h2><p>同じ牌は4枚ずつあります。数字のある3グループ（数牌）と、文字だけのグループ（字牌）に分かれます。</p></div>
  <div class="g-card g-suits">
    <div class="g-suit"><div class="g-nm">マンズ<small>萬子・漢数字と「萬」</small></div><div class="g-row g-hand g-nolab" data-h="123456789m"></div></div>
    <div class="g-suit"><div class="g-nm">ピンズ<small>筒子・丸の数</small></div><div class="g-row g-hand g-nolab" data-h="123456789p"></div></div>
    <div class="g-suit"><div class="g-nm">ソーズ<small>索子・竹の本数（1は鳥の絵）</small></div><div class="g-row g-hand g-nolab" data-h="123456789s"></div></div>
    <div class="g-suit"><div class="g-nm">字牌<small>東南西北・白發中</small></div><div class="g-row g-hand g-nolab" data-h="1234567z"></div></div>
  </div>
  <p class="g-note">実際の牌は、メーカーによって絵が少し違います。数字の並びを作れるのは数牌だけで、字牌は同じ牌を集めることしかできません。</p>
</section>

<section id="agari">
  <div class="g-sh"><span class="g-no">3　あがりの形</span><h2>メンツ4つ＋雀頭1つ＝14枚</h2></div>
  <div class="g-card">
    <div class="g-hand" data-h="234m/メンツ 789m/メンツ 234p/メンツ 678p/メンツ 55s/雀頭"></div>
    <div class="g-formula"><span class="g-pill g-m">メンツ（3枚）×4</span><span>＋</span><span class="g-pill g-p">雀頭（2枚）×1</span><span>＝</span><span>14枚</span></div>
  </div>
  <div class="g-grid3">
    <div class="g-card g-part"><span class="g-tag g-meld">メンツ</span><h3>順子（シュンツ）</h3><div class="g-hand g-nolab" data-h="345p"></div><p class="g-note">同じグループで、数字が3つ続いている。</p></div>
    <div class="g-card g-part"><span class="g-tag g-meld">メンツ</span><h3>刻子（コーツ）</h3><div class="g-hand g-nolab" data-h="777s"></div><div class="g-hand g-nolab" data-h="777z"></div><p class="g-note">まったく同じ牌が3枚。字牌でも作れる。</p></div>
    <div class="g-card g-part"><span class="g-tag g-pair">雀頭</span><h3>雀頭（ジャントウ）</h3><div class="g-hand g-nolab" data-h="55m"></div><div class="g-hand g-nolab" data-h="11z"></div><p class="g-note">まったく同じ牌が2枚。「あたま」とも言う。</p></div>
  </div>
  <div class="g-card">
    <h3>メンツにならない並び</h3>
    <div class="g-ngok">
      <div><span class="g-mark g-red">✕ 9と1はつながらない</span><div class="g-hand g-nolab" data-h="891m"></div></div>
      <div><span class="g-mark g-red">✕ グループが違う</span><div class="g-hand g-nolab" data-h="3m4p5s"></div></div>
      <div><span class="g-mark g-red">✕ 字牌は並べられない</span><div class="g-hand g-nolab" data-h="123z"></div></div>
    </div>
  </div>
  <div class="g-card">
    <h3>ふだんは13枚、自分の番だけ14枚</h3>
    <div class="g-cycle"><span class="g-c">13枚</span><span class="g-op">山から1枚取る<br>（ツモ）→</span><span class="g-c">14枚</span><span class="g-op">1枚捨てる<br>（切る）→</span><span class="g-c">13枚</span></div>
    <p class="g-note">この「1枚取って1枚捨てる」を、あがるまでくり返します。この資料が教えるのは「どの1枚を捨てるか」です。</p>
  </div>
</section>

<section id="katamari">
  <div class="g-sh"><span class="g-no">4　かたまり</span><h2>手の牌を「かたまり」に分けて見る</h2><p>切る牌を選ぶ前に、手の牌が次のどれに当たるかを見分けます。</p></div>
  <div class="g-legend"><span><i style="background:var(--k-meld)"></i>メンツ（完成）</span><span><i style="background:var(--k-taatsu)"></i>ターツ（あと1枚でメンツ）</span><span><i style="background:var(--k-pair)"></i>対子（同じ牌2枚）</span><span><i style="background:var(--k-iso)"></i>孤立牌（ひとりぼっち）</span></div>
  <div class="g-grid2">
    <div class="g-card g-part"><span class="g-tag g-taatsu">ターツ</span><h3>両面（リャンメン）</h3><div class="g-waitrow"><div class="g-hand g-nolab" data-h="34m"></div><span class="g-arrow">待ち →</span><div class="g-hand g-nolab" data-h="2?5?m"></div></div><p class="g-note">となり合った2枚。両はしの2種類で完成する。いちばん強い。</p></div>
    <div class="g-card g-part"><span class="g-tag g-taatsu">ターツ</span><h3>カンチャン</h3><div class="g-waitrow"><div class="g-hand g-nolab" data-h="46m"></div><span class="g-arrow">待ち →</span><div class="g-hand g-nolab" data-h="5?m"></div></div><p class="g-note">1つとばしの2枚。間の1種類だけで完成する。</p></div>
    <div class="g-card g-part"><span class="g-tag g-taatsu">ターツ</span><h3>ペンチャン</h3><div class="g-waitrow"><div class="g-hand g-nolab" data-h="12m"></div><span class="g-arrow">待ち →</span><div class="g-hand g-nolab" data-h="3?m"></div></div><div class="g-waitrow"><div class="g-hand g-nolab" data-h="89m"></div><span class="g-arrow">待ち →</span><div class="g-hand g-nolab" data-h="7?m"></div></div><p class="g-note">1・2 か 8・9 の2枚。片側にしか伸びないので1種類だけ。</p></div>
    <div class="g-card g-part"><span class="g-tag g-pair">対子</span><h3>対子（トイツ）</h3><div class="g-waitrow"><div class="g-hand g-nolab" data-h="77m"></div><span class="g-arrow">待ち →</span><div class="g-hand g-nolab" data-h="7?m"></div></div><p class="g-note">同じ牌2枚。3枚目が来れば刻子。そのまま雀頭にもなる。</p></div>
  </div>
  <div class="g-card g-strength">
    <h3>完成させる牌が何枚残っているか</h3>
    <p class="g-note">同じ牌は4枚ずつなので、待ちが2種類なら最大8枚、1種類なら最大4枚です。多いほど早く完成します。</p>
    <div class="g-bar"><b>両面</b><div class="g-track"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div></div>
    <div class="g-bar"><b>カンチャン</b><div class="g-track"><span></span><span></span><span></span><span></span><span class="g-o"></span><span class="g-o"></span><span class="g-o"></span><span class="g-o"></span></div></div>
    <div class="g-bar"><b>ペンチャン</b><div class="g-track"><span></span><span></span><span></span><span></span><span class="g-o"></span><span class="g-o"></span><span class="g-o"></span><span class="g-o"></span></div></div>
    <div class="g-bar"><b>対子</b><div class="g-track"><span></span><span></span><span class="g-o"></span><span class="g-o"></span><span class="g-o"></span><span class="g-o"></span><span class="g-o"></span><span class="g-o"></span></div></div>
  </div>

  <div class="g-card">
    <h3>孤立牌の見分け方</h3>
    <p>同じグループで<b>数字の差が2以内</b>の牌が1枚もなく、同じ牌もない牌が孤立牌です。字牌は同じ牌しか仲間になれません。</p>
    <p class="g-note">見分ける前に、もう完成しているメンツ（3枚）は脇によけて数に入れません。</p>
    <div class="g-nls">
      <div class="g-nl"><span class="g-lbl">1 の仲間は 2・3 だけ</span><div class="g-hand g-nolab" data-n="1"></div></div>
      <div class="g-nl"><span class="g-lbl">2 の仲間は 1・3・4</span><div class="g-hand g-nolab" data-n="2"></div></div>
      <div class="g-nl"><span class="g-lbl">5 の仲間は 3・4・6・7</span><div class="g-hand g-nolab" data-n="5"></div></div>
      <div class="g-nl"><span class="g-lbl">字牌の仲間は同じ牌だけ</span><div class="g-hand g-nolab" data-h="1^z1+z3-z"></div></div>
    </div>
    <p class="g-note">まんなかの数字ほど仲間が多く、あとでかたまりになりやすい牌です。だから切るときは、仲間の少ない牌（字牌 → 1・9 → 2・8 → 3〜7）から先に捨てます。</p>
  </div>

  <div class="g-card">
    <h3>かたまりを数える</h3>
    <p>あがりに必要なかたまりは5つ（メンツ4つ＋雀頭1つ）。メンツ・ターツ・対子を1つずつ数えます。孤立牌は数えません。</p>
    <div class="g-hand" data-h="234m/メンツ① 79m/カンチャン② 23p/両面③ 678p/メンツ④ 12s/ペンチャン⑤ 55s/対子⑥"></div>
    <p class="g-note">この手はかたまりが6つ。5つより1つ多いので、どれか1つは崩すことになります（5章のSTEP5）。</p>
  </div>
</section>

<section id="kirijun">
  <div class="g-sh"><span class="g-no">5　切り順</span><h2>毎回、上から順に当てはめる</h2><p>ツモって14枚になったら、上から順に見ていき、最初に当てはまったところの牌を切ります。同じSTEPに候補が2枚以上あれば、どれを切ってもかまいません。</p></div>

  <div class="g-steps">
    <div class="g-step">
      <div class="g-rail"><div class="g-dot g-first">まず</div><div class="g-line"></div></div>
      <div class="g-body">
        <p class="g-q">ツモった牌で、メンツ4つ＋雀頭1つがそろった？</p>
        <p class="g-a">そろっていたら捨てずに<b class="g-say">「ツモ」</b>と言ってあがり。そろっていなければSTEP1へ。</p>
      </div>
    </div>

    <div class="g-step">
      <div class="g-rail"><div class="g-dot"><span>STEP</span><b>1</b></div><div class="g-line"></div></div>
      <div class="g-body">
        <p class="g-q">1枚だけの字牌がある？</p>
        <p class="g-a">あれば切る。2枚・3枚そろっている字牌は残す。</p>
        <div class="g-ex">
          <div class="g-hand" data-h="234m/メンツ 67m/両面 34p/両面 567s/メンツ 9s/孤立 3!z/1枚の字牌 77z/対子"></div>
          <p class="g-note">9索も孤立牌ですが、字牌が先。2枚ある中は残します。</p>
        </div>
      </div>
    </div>

    <div class="g-step">
      <div class="g-rail"><div class="g-dot"><span>STEP</span><b>2</b></div><div class="g-line"></div></div>
      <div class="g-body">
        <p class="g-q">孤立した 1 か 9 がある？</p>
        <p class="g-a">あれば切る。</p>
        <div class="g-ex">
          <div class="g-hand" data-h="1!m/孤立 456m/メンツ 24p/カンチャン 789p/メンツ 3s/孤立 67s/両面 55z/対子"></div>
          <p class="g-note">3索も孤立していますが、1・9が先です。</p>
        </div>
      </div>
    </div>

    <div class="g-step">
      <div class="g-rail"><div class="g-dot"><span>STEP</span><b>3</b></div><div class="g-line"></div></div>
      <div class="g-body">
        <p class="g-q">孤立した 2 か 8 がある？</p>
        <p class="g-a">あれば切る。</p>
        <div class="g-ex">
          <div class="g-hand" data-h="123m/メンツ 8!m/孤立 45p/両面 89p/ペンチャン 11s/対子 5s/孤立 111z/メンツ"></div>
          <p class="g-note">5索（3〜7）より、仲間の少ない8萬が先です。</p>
        </div>
      </div>
    </div>

    <div class="g-step">
      <div class="g-rail"><div class="g-dot"><span>STEP</span><b>4</b></div><div class="g-line"></div></div>
      <div class="g-body">
        <p class="g-q">孤立した 3〜7 がある？</p>
        <p class="g-a">あれば切る。</p>
        <div class="g-ex">
          <div class="g-hand" data-h="234m/メンツ 67m/両面 345p/メンツ 5!s/孤立 99s/対子 555z/メンツ"></div>
          <p class="g-note">5索を切ると、残り13枚があと1枚であがれる形（テンパイ）になります。このあとリーチ（7章）。</p>
        </div>
      </div>
    </div>

    <div class="g-step">
      <div class="g-rail"><div class="g-dot"><span>STEP</span><b>5</b></div><div class="g-line"></div></div>
      <div class="g-body">
        <p class="g-q">孤立牌がなく、かたまりが6つ以上ある？</p>
        <p class="g-a">弱いターツを1つ崩す。崩す順は <b>ペンチャン → カンチャン → 3つ目の対子 → 両面</b>。崩すときは 1・9 に近いほうの牌から切る。メンツは崩さない。</p>
        <div class="g-ex">
          <div class="g-hand" data-h="22m/対子 89!m/ペンチャン 35p/カンチャン 345s/メンツ 78s/両面 666z/メンツ"></div>
          <p class="g-note">かたまりが6つ。いちばん弱いペンチャン 8・9萬を崩し、端の9萬から切ります。残った8萬は次の番にSTEP3で切ります。</p>
        </div>
      </div>
    </div>

    <div class="g-step">
      <div class="g-rail"><div class="g-dot"><span>STEP</span><b>6</b></div><div class="g-line"></div></div>
      <div class="g-body">
        <p class="g-q">どれにも当てはまらない？</p>
        <p class="g-a">6章のやり方で「切ったらテンパイになる牌」を探して切る。2つ見つかったら、両面が残るほうを切る。見つからなければ、かたまりに入らずに余った牌（1・3・5萬なら、3・5萬をカンチャンと数えて余る1萬）を切る。余りが2枚以上あれば 1・9 → 2・8 → 3〜7 の順。</p>
        <div class="g-ex">
          <div class="g-hand" data-h="234m/メンツ 789m/メンツ 235!p/くっついた形 345s/メンツ 77s/雀頭"></div>
          <p class="g-note">5筒を切ると 2・3筒の両面が残ってテンパイ（待ち 1筒・4筒）。2筒を切っても 3・5筒のカンチャンでテンパイですが、待ちが少ないので5筒を切ります。</p>
        </div>
      </div>
    </div>

    <div class="g-step">
      <div class="g-rail"><div class="g-dot g-end">切る<br>前に</div></div>
      <div class="g-body">
        <p class="g-q">その牌を切ると、残りの13枚がテンパイ？</p>
        <p class="g-a">テンパイなら、捨てる前に<b class="g-say">「リーチ」</b>と言い、その牌を横向きに捨てる（7章）。テンパイでなければ、ふつうに捨てて次の自分の番を待つ。</p>
      </div>
    </div>
  </div>
</section>

<section id="tenpai">
  <div class="g-sh"><span class="g-no">6　テンパイ</span><h2>あと1枚であがれる13枚の形</h2><p>テンパイの形は3つしかありません。点線の牌が「待ち」、つまりあがれる牌です。</p></div>

  <div class="g-card">
    <h3>A　メンツ3つ＋雀頭＋ターツ</h3>
    <div class="g-hand" data-h="234m/メンツ 789m/メンツ 678p/メンツ 55s/雀頭 23p/両面 1?4?p/待ち"></div>
    <p class="g-note">ターツが両面なら待ちは2種類。カンチャン・ペンチャンなら1種類です。</p>
  </div>
  <div class="g-card">
    <h3>B　メンツ3つ＋対子2つ（シャンポン）</h3>
    <div class="g-hand" data-h="234m/メンツ 789m/メンツ 678p/メンツ 55s/対子 55z/対子 5?s5?z/待ち"></div>
    <p class="g-note">どちらかの対子が3枚になればメンツになり、もう片方が雀頭になります。</p>
  </div>
  <div class="g-card">
    <h3>C　メンツ4つ＋1枚（単騎）</h3>
    <div class="g-hand" data-h="234m/メンツ 789m/メンツ 678p/メンツ 345s/メンツ 1z/1枚 1?z/待ち"></div>
    <p class="g-note">残った1枚と同じ牌が来れば雀頭ができてあがりです。</p>
  </div>

  <div class="g-card">
    <h3>テンパイかどうかの確かめ方</h3>
    <p>メンツを3つ見つけて指で隠し、残りの4枚を見ます。（メンツが4つあれば残りは1枚で、Cの単騎です。）</p>
    <div class="g-judge">
      <div class="g-r g-yes"><div class="g-hand" data-h="23p/ターツ 55s/対子"></div><span class="g-v">テンパイ（Aの形）</span></div>
      <div class="g-r g-yes"><div class="g-hand" data-h="55s/対子 55z/対子"></div><span class="g-v">テンパイ（Bの形）</span></div>
      <div class="g-r g-no"><div class="g-hand" data-h="23p/ターツ 67s/ターツ"></div><span class="g-v">まだ（雀頭がない）</span></div>
      <div class="g-r g-no"><div class="g-hand" data-h="23p/ターツ 5s/孤立 1z/孤立"></div><span class="g-v">まだ（孤立牌が2枚）</span></div>
    </div>
    <p class="g-note">よくある間違いは「両面が2つ、雀頭なし」をテンパイと思うこと。雀頭がなければまだです。</p>
  </div>
  <div class="g-card">
    <h3>待ちを指で数える</h3>
    <p>テンパイしたら、待ちの牌を口の中で言えるようにしておきます。わからなくなったら、牌を1種類ずつ足してみて「メンツ4つ＋雀頭」になるかを確かめます。</p>
    <p class="g-note">待ちの牌が自分の捨て牌の中にないかも見ておきます（9章のフリテン）。</p>
  </div>
</section>

<section id="riichi">
  <div class="g-sh"><span class="g-no">7　リーチ</span><h2>リーチのしかた</h2></div>
  <div class="g-card">
    <h3>リーチできる条件</h3>
    <ul class="g-check">
      <li>ポン・チー・カンをしていない</li>
      <li>テンパイしている（6章）</li>
      <li>持ち点が1000点以上ある</li>
      <li>山に牌が4枚以上残っている（いちばん最後の1巡ではできない）</li>
    </ul>
  </div>
  <div class="g-how">
    <div class="g-card"><span class="g-num">1</span><h3>「リーチ」と言う</h3><span class="g-bubble">リーチ</span><p class="g-note">牌を捨てる前に、はっきり声に出す。</p></div>
    <div class="g-card"><span class="g-num">2</span><h3>牌を横向きに捨てる</h3><div class="g-river"><div class="g-hand g-nolab" data-h="15z9s1s2~s"></div><span class="g-cap">自分の捨て牌。横向きの牌が「ここでリーチした」しるし</span></div></div>
    <div class="g-card"><span class="g-num">3</span><h3>1000点棒を出す</h3><div class="g-stick" role="img" aria-label="1000点棒"></div><p class="g-note">捨てた牌でだれもロンしなければ、点棒を自分の前（卓のまん中寄り）に置く。</p></div>
  </div>
  <div class="g-card g-after">
    <h3>リーチしたあと</h3>
    <p>手の牌はもう入れかえられません。自分の番は、ツモって確かめるだけです。</p>
    <div class="g-branch"><span class="g-k">ツモった牌が待ちの牌</span><span><b class="g-say">「ツモ」</b>と言ってあがり</span></div>
    <div class="g-branch"><span class="g-k">待ちの牌ではない</span><span>その牌をそのまま捨てる（ツモ切り）</span></div>
    <div class="g-branch"><span class="g-k">ほかの人が待ちの牌を捨てた</span><span><b class="g-say">「ロン」</b>と言ってあがり</span></div>
  </div>
</section>

<section id="jissen">
  <div class="g-sh"><span class="g-no">8　実戦の流れ</span><h2>最初の14枚からリーチ、そしてあがりまで</h2><p>★はその番にツモってきた牌。下の線の色は4章のかたまりの種類です。</p></div>
  <div class="g-turns">
    <div class="g-turn">
      <div class="g-top"><span class="g-jun">1巡目</span><span class="g-chip">STEP1</span></div>
      <div class="g-hand" data-h="23m/両面 79m/カンチャン 2p/孤立 78p/両面 12s/ペンチャン 55s/対子 9s/孤立 1!z/1枚の字牌 5z/1枚の字牌"></div>
      <p class="g-res">1枚だけの字牌が2つ。どちらでもよいので東を切る。</p>
      <div class="g-draw">次のツモ<span class="g-ti" data-t="4m"></span></div>
    </div>
    <div class="g-turn">
      <div class="g-top"><span class="g-jun">2巡目</span><span class="g-chip">STEP1</span></div>
      <div class="g-hand" data-h="234*m/メンツ 79m/カンチャン 2p/孤立 78p/両面 12s/ペンチャン 55s/対子 9s/孤立 5!z/1枚の字牌"></div>
      <p class="g-res">4萬が来てメンツが1つできた。残った字牌の白を切る。</p>
      <div class="g-draw">次のツモ<span class="g-ti" data-t="6p"></span></div>
    </div>
    <div class="g-turn">
      <div class="g-top"><span class="g-jun">3巡目</span><span class="g-chip">STEP2</span></div>
      <div class="g-hand" data-h="234m/メンツ 79m/カンチャン 2p/孤立 6*78p/メンツ 12s/ペンチャン 55s/対子 9!s/孤立"></div>
      <p class="g-res">字牌はもうない。孤立牌は2筒と9索。1・9が先なので9索を切る。</p>
      <div class="g-draw">次のツモ<span class="g-ti" data-t="3p"></span></div>
    </div>
    <div class="g-turn">
      <div class="g-top"><span class="g-jun">4巡目</span><span class="g-chip">STEP5</span></div>
      <div class="g-hand" data-h="234m/メンツ 79m/カンチャン 23*p/両面 678p/メンツ 1!2s/ペンチャン 55s/対子"></div>
      <p class="g-res">孤立牌がなくなり、かたまりが6つ。いちばん弱いペンチャン 1・2索を崩し、端の1索を切る。</p>
      <div class="g-draw">次のツモ<span class="g-ti" data-t="8m"></span></div>
    </div>
    <div class="g-turn g-riichi">
      <div class="g-top"><span class="g-jun">5巡目</span><span class="g-chip">STEP3</span><span class="g-chip g-red">リーチ</span></div>
      <div class="g-hand" data-h="234m/メンツ 78*9m/メンツ 23p/両面 678p/メンツ 2!s/孤立 55s/雀頭"></div>
      <p class="g-res">8萬でカンチャンが埋まった。孤立した2索を切ると、残り13枚がAの形でテンパイ。<b class="g-say">「リーチ」</b>と言って2索を横向きに捨てる。</p>
      <div class="g-hand" data-h="234m/メンツ 789m/メンツ 678p/メンツ 55s/雀頭 23p/両面 1?4?p/待ち"></div>
      <div class="g-river"><div class="g-hand g-nolab" data-h="15z9s1s2~s"></div><span class="g-cap">ここまでの自分の捨て牌。待ちの1筒・4筒はないのでフリテンではない</span></div>
    </div>
    <div class="g-turn">
      <div class="g-top"><span class="g-jun">6巡目</span><span class="g-chip">リーチ中</span></div>
      <p class="g-res">9索をツモった。待ちの牌ではないので、そのまま捨てる。</p>
      <div class="g-hand g-nolab" data-h="9!s"></div>
    </div>
    <div class="g-turn g-ron">
      <div class="g-top"><span class="g-jun">ロン</span></div>
      <p class="g-res">ほかの人が4筒を捨てた。待ちの牌なので<b class="g-say">「ロン」</b>。</p>
      <div class="g-hand" data-h="234m/メンツ 789m/メンツ 234+p/メンツ 678p/メンツ 55s/雀頭"></div>
    </div>
  </div>
</section>

<section id="chui">
  <div class="g-sh"><span class="g-no">9　つまずきやすいところ</span><h2>あがれなくなる落とし穴</h2></div>
  <div class="g-warn">
    <div class="g-card">
      <h3>フリテン：自分が捨てた牌ではロンできない</h3>
      <p>待ちの牌のうち<b>1種類でも</b>自分の捨て牌にあると、ほかの人が待ちの牌を捨ててもロンできません。自分でツモればあがれます。</p>
      <div class="g-hand" data-h="234m/メンツ 789m/メンツ 678p/メンツ 55s/雀頭 23p/両面 1?4?p/待ち"></div>
      <div class="g-river"><div class="g-hand g-nolab" data-h="15z4#p1s2~s"></div><span class="g-cap">捨て牌に4筒がある → 1筒が出ても4筒が出てもロンできない</span></div>
      <p class="g-note">フリテンでもリーチはしてよい。その場合はツモであがるのを待ちます。</p>
    </div>
    <div class="g-card">
      <h3>リーチのあとは当たり牌を見逃さない</h3>
      <p>リーチのあとで待ちの牌が出たのにロンしないと、その局が終わるまでロンできなくなります。出たらすぐ「ロン」。</p>
    </div>
    <div class="g-card">
      <h3>テンパイしていないのにリーチしない</h3>
      <p>だれもあがらずに局が終わると、リーチした人は手を見せます。テンパイしていないと罰（チョンボ）になる卓が多いので、6章の確かめ方で確認してから宣言します。</p>
    </div>
    <div class="g-card">
      <h3>「ポン」と言いたくなっても言わない</h3>
      <p>欲しい牌が捨てられても、もらいません。鳴くとリーチができなくなり、役がなくてあがれない手になりがちです。</p>
    </div>
  </div>
</section>

<section id="renshu">
  <div class="g-sh"><span class="g-no">10　練習問題</span><h2>どれを切る？</h2><p>14枚の手です。5章の順番で考えてから、答えを開いてください。</p></div>
  <div class="g-quiz">
    <div class="g-qz">
      <p class="g-qh"><span>問1</span>どれを切る？</p>
      <div class="g-hand g-nolab" data-h="23m567m34p789p228s2z"></div>
      <details><summary>答えを見る</summary><div>
        <div class="g-hand" data-h="23m/両面 567m/メンツ 34p/両面 789p/メンツ 22s/対子 8s/孤立 2!z/1枚の字牌"></div>
        <p><b>南</b>（STEP1）。8索も孤立していますが、1枚だけの字牌が先です。</p>
      </div></details>
    </div>
    <div class="g-qz">
      <p class="g-qh"><span>問2</span>どれを切る？</p>
      <div class="g-hand g-nolab" data-h="3459m23p678p45s777s"></div>
      <details><summary>答えを見る</summary><div>
        <div class="g-hand" data-h="345m/メンツ 9!m/孤立 23p/両面 678p/メンツ 45s/両面 777s/メンツ"></div>
        <p><b>9萬</b>（STEP2）。完成したメンツ 3・4・5萬をよけると、9萬はひとりぼっちです。</p>
      </div></details>
    </div>
    <div class="g-qz">
      <p class="g-qh"><span>問3</span>どれを切る？</p>
      <div class="g-hand g-nolab" data-h="1236m458p23678s11z"></div>
      <details><summary>答えを見る</summary><div>
        <div class="g-hand" data-h="123m/メンツ 6m/孤立 45p/両面 8!p/孤立 23s/両面 678s/メンツ 11z/対子"></div>
        <p><b>8筒</b>（STEP3）。6萬も孤立していますが、2・8は3〜7より先に切ります。</p>
      </div></details>
    </div>
    <div class="g-qz">
      <p class="g-qh"><span>問4</span>どれを切る？</p>
      <div class="g-hand g-nolab" data-h="12678m35p4588s222z"></div>
      <details><summary>答えを見る</summary><div>
        <div class="g-hand" data-h="1!2m/ペンチャン 678m/メンツ 35p/カンチャン 45s/両面 88s/対子 222z/メンツ"></div>
        <p><b>1萬</b>（STEP5）。孤立牌がなく、かたまりが6つ。いちばん弱いペンチャンを崩し、端の1萬から切ります。</p>
      </div></details>
    </div>
    <div class="g-qz">
      <p class="g-qh"><span>問5</span>どれを切る？</p>
      <div class="g-hand g-nolab" data-h="123m456p789p467s11z"></div>
      <details><summary>答えを見る</summary><div>
        <div class="g-hand" data-h="123m/メンツ 456p/メンツ 789p/メンツ 4!67s/くっついた形 11z/雀頭"></div>
        <p><b>4索</b>（STEP6）。6・7索の両面が残ってテンパイ、待ちは5索・8索。そのままリーチ。7索を切ると4・6索のカンチャン（待ち5索だけ）になるので、4索のほうが良い。</p>
      </div></details>
    </div>
    <div class="g-qz">
      <p class="g-qh"><span>問6</span>この13枚の待ちは？</p>
      <div class="g-hand g-nolab" data-h="123m567p99p78s777z"></div>
      <details><summary>答えを見る</summary><div>
        <div class="g-hand" data-h="123m/メンツ 567p/メンツ 777z/メンツ 99p/雀頭 78s/両面 6?9?s/待ち"></div>
        <p><b>6索と9索</b>。メンツ3つ（1・2・3萬、5・6・7筒、中3枚）を隠すと、残りは9筒の対子と7・8索の両面。Aの形です。</p>
      </div></details>
    </div>
    <div class="g-qz">
      <p class="g-qh"><span>問7</span>問6の手でリーチ中。自分の捨て牌に9索がある。ほかの人が6索を捨てた。ロンできる？</p>
      <details><summary>答えを見る</summary><div>
        <p><b>できない</b>（フリテン）。待ちの1種類（9索）が自分の捨て牌にあるので、6索でもロンできません。自分で6索か9索をツモればあがれます。</p>
      </div></details>
    </div>
  </div>
</section>

<section id="matome">
  <div class="g-sh"><span class="g-no">11　まとめ</span><h2>これだけ見ればよい1枚</h2></div>
  <div class="g-sheet">
    <h3>ツモったら、上から順に</h3>
    <p class="g-pre">先に、完成しているメンツ（3枚）を脇によけて考える</p>
    <div class="g-s"><span class="g-q">メンツ4つ＋雀頭がそろった？</span><span class="g-a g-g">「ツモ」</span></div>
    <div class="g-dn">↓ いいえ</div>
    <div class="g-s"><span class="g-q">1枚だけの字牌がある？</span><span class="g-a">それを切る</span></div>
    <div class="g-dn">↓ ない</div>
    <div class="g-s"><span class="g-q">孤立した 1・9 がある？</span><span class="g-a">それを切る</span></div>
    <div class="g-dn">↓ ない</div>
    <div class="g-s"><span class="g-q">孤立した 2・8 がある？</span><span class="g-a">それを切る</span></div>
    <div class="g-dn">↓ ない</div>
    <div class="g-s"><span class="g-q">孤立した 3〜7 がある？</span><span class="g-a">それを切る</span></div>
    <div class="g-dn">↓ ない</div>
    <div class="g-s"><span class="g-q">かたまりが6つ以上？<small>ペンチャン → カンチャン → 3つ目の対子 → 両面 の順に崩す。端の牌から</small></span><span class="g-a">弱いターツを崩す</span></div>
    <div class="g-dn">↓ いいえ</div>
    <div class="g-s"><span class="g-q">切ったらテンパイになる牌<small>2つあれば両面が残るほう。なければ、かたまりに入らない余りの牌</small></span><span class="g-a">それを切る</span></div>
    <div class="g-dn">↓ 切る前に</div>
    <div class="g-s"><span class="g-q">切ったあとの13枚がテンパイ？<small>メンツ3つを隠して、残り4枚が「ターツ＋対子」か「対子＋対子」。メンツ4つなら残り1枚。宣言してから横向きに切る</small></span><span class="g-a g-r">「リーチ」</span></div>
  </div>
  <footer>リーチのあとは、待ちの牌が来たら「ツモ」、ほかの人が捨てたら「ロン」。それ以外はツモった牌をそのまま捨てる。</footer>
</section>

</div>
</div>`;

let cache = '';
export function guideHtml() {
  cache ||= BODY.replace(/<(div|span) class="([^"]*)" data-([htn])="([^"]*)"><\/\1>/g, (m, tag, cls, k, v) =>
    `<${tag} class="${cls}">${k === 'h' ? handHTML(v, cls.includes('g-nolab')) : k === 't' ? tileHTML({ code: v, mods: [] }) : lineHTML(Number(v))}</${tag}>`);
  return cache;
}
