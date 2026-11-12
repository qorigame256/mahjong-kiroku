# 麻雀記録

実際の卓の麻雀の点数管理・戦績記録用ウェブアプリ。ビルド工程なし・外部ライブラリなしの素の HTML/CSS/JavaScript（ES モジュール）。
決定事項と理由は `仕様書.md`（「本人の決定」と「Claude が置いた初期値」を分けてある。後者を確定扱いしない）。

## ファイル

- `app/` … 公開する対象はこのフォルダだけ。
  - `app/js/score.js` … 点数計算・局の進行・精算。画面に依存しない純粋な関数だけを置く（テストが直接読む）。
  - `app/js/app.js` … 画面と保存。状態を変えたら `render()` で `#main` を作り直す方式。
  - `app/style.css`
- `tests/score.test.mjs` … `node --test tests/score.test.mjs`（フォルダ指定 `tests/` は Node 24 で動かない）。
- `.claude/launch.json` … 確認用サーバー（quiet-serve、port 8765）。ES モジュールのため `file://` では動かない。

## 公開

- GitHub Pages。リポジトリ `qorigame256/mahjong-kiroku`（公開）。main への push で `.github/workflows/pages.yml` が `app/` だけを公開する。
- リポジトリ全体が公開される。秘密・個人情報・絶対パス（ユーザー名を含む）をどのファイルにも書かない。

## 注意

- 保存先は localStorage のキー `mahjong-kiroku-v1`、形は `{version:1, players, games, rules}`。形を変えるときは `version` を上げ、`load()` に旧版からの変換を足す（利用者の端末に旧データが残るため）。
- 対局は `rounds`（入力そのもの）だけを保存し、点数・局・本場・供託は毎回 `replay()` で計算し直す。「1つ戻す」は `rounds.pop()`。計算結果を保存する形に変えない。
- 終わった対局の `result` と `rule` は開始時・終了時の写し。設定のルール変更を過去の対局へ波及させない。
- 取り返しのつかない操作（消す・終える・読み込みで置き換え）は `cbtn()` の2回押し。`confirm()`/`prompt()` は使わない。
- 入力欄のある画面で `input` イベントのたびに `render()` を呼ばない（フォーカスが外れる）。値は `draft`/`ui.f` に持ち、必要な部分だけ書き換える。
