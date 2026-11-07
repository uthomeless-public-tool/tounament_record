'use strict';

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const KEY = 'taikai.v1';
const CLSN = { 1: 'エルフ', 2: 'ロイヤル', 3: 'ウィッチ', 4: 'ドラゴン', 5: 'ナイトメア', 6: 'ビショップ', 7: 'ネメシス' };
const BUILTIN = {
  1: ['ダストデイズエルフ', 'テンポエルフ'],
  2: ['証拠ロイヤル', '海賊ロイヤル', '連携ロイヤル'],
  3: ['秘術ウィッチ', '実験体ウィッチ', 'スペルウィッチ', '魔手ウィッチ'],
  4: ['ランプドラゴン', 'フェイスドラゴン'],
  5: ['ミッドレンジナイトメア', 'ミルティオナイトメア', 'アグロナイトメア'],
  6: ['兎ビショップ', 'アミュレットビショップ', 'アズヴォルトビショップ', 'クキシロビショップ'],
  7: ['融合ネメシス', 'アーティファクトネメシス', 'カットスロートネメシス'],
};

const P = { data: null, tf: null, editName: false };

/* ---------------- 保存（このブラウザの中だけ） ---------------- */

function initial() {
  const decks = [];
  for (const [k, list] of Object.entries(BUILTIN)) for (const n of list) decks.push({ id: uid(), cls: k, name: n });
  return { decks, tours: [], sel: '', memo: false };
}
function load() {
  try { const t = localStorage.getItem(KEY); if (t) return JSON.parse(t); } catch (e) {  }
  return initial();
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(P.data)); return true; }
  catch (e) { toast('このブラウザでは保存できませんでした', 'err'); return false; }
}
function commit(msg) { save(); render(); if (msg) toast(msg); }
function toast(msg, kind = 'ok') {
  const el = $('#toast'); el.textContent = msg; el.className = 'toast ' + kind; el.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 2500);
}

/* ---------------- デッキ ---------------- */

const liveDecks = () => P.data.decks.filter(d => !d.hidden);
const deckName = id => (P.data.decks.find(d => d.id === id) || {}).name || '';
function deckOpts(sel, cls) {
  const ds = liveDecks();
  const opt = d => `<option value="${d.id}" ${sel === d.id ? 'selected' : ''}>${esc(d.name)}</option>`;
  if (cls) return '<option value=""></option>' + ds.filter(d => String(d.cls) === String(cls)).map(opt).join('');
  return '<option value=""></option>' + Object.entries(CLSN).map(([k, n]) => {
    const xs = ds.filter(d => String(d.cls) === k); return xs.length ? `<optgroup label="${n}">${xs.map(opt).join('')}</optgroup>` : '';
  }).join('');
}
const clsOpts = sel => '<option value=""></option>' + Object.entries(CLSN).map(([k, n]) => `<option value="${k}" ${sel === k ? 'selected' : ''}>${n}</option>`).join('');

/* ---------------- 画面 ---------------- */

const curTour = () => P.data.tours.find(t => t.id === P.data.sel) || null;
const blankTF = () => ({ id: '', o1: '', o2: '', op: '', ot: '', my: '', turn: '', result: '', memo: '' });
const pickedCls = g => g.op === '1' ? g.o1 : g.op === '2' ? g.o2 : '';

function render() {
  const t = curTour();
  $('#app').innerHTML = `
    <section>
      ${P.data.tours.length ? `<div class="tours">${P.data.tours.map(x => `<button class="tour-tab ${x.id === P.data.sel ? 'on' : ''}" data-act="sel" data-id="${x.id}">${esc(x.name)}</button>`).join('')}</div>` : ''}
      <div class="inline add-tour"><input class="text" id="new-name" placeholder="大会名"><button class="btn" data-act="add-tour">大会を追加</button></div>
    </section>
    ${t ? `<section>${tourHtml(t)}</section>` : ''}
    <section>${decksHtml()}</section>`;
}

function tourHtml(t) {
  const f = P.tf || blankTF();
  const seg = (k, opts) => `<span class="seg">${opts.map(([v, l]) => `<button data-act="tf-seg" data-k="${k}" data-v="${v}" class="${f[k] === v ? 'on' : ''}">${esc(l)}</button>`).join('')}</span>`;
  const mine = v => deckName(t[v]) || (v === 'a' ? '1つ目' : '2つ目');
  const oppCell = g => [['1', g.o1], ['2', g.o2]].filter(x => x[1]).map(([k, c]) => g.op === k ? `<b>${esc(CLSN[c] || '')}</b>` : `<span class="muted">${esc(CLSN[c] || '')}</span>`).join('・');
  const rows = t.games.map((g, i) => `<tr>
      <td class="num">${i + 1}</td>
      <td>${oppCell(g)}</td>
      <td>${esc(deckName(g.ot))}</td>
      <td>${g.my ? esc(mine(g.my)) : ''}</td>
      <td>${{ first: '先攻', second: '後攻' }[g.turn] || ''}</td>
      <td class="${g.result === 'win' ? 'win' : g.result === 'lose' ? 'lose' : ''}">${{ win: '勝ち', lose: '負け' }[g.result] || ''}</td>
      <td><button class="link-btn" data-act="tf-edit" data-g="${g.id}">編集</button><button class="link-btn" data-act="tf-del" data-g="${g.id}">削除</button></td></tr>
      ${g.memo ? `<tr class="memo-row"><td></td><td colspan="6">${esc(g.memo)}</td></tr>` : ''}`).join('');
  const hasMemo = t.games.some(g => g.memo);
  return `<div class="tour">
    <div class="tour-head">
      ${P.editName ? `<span class="inline"><input class="text" id="tour-name" value="${esc(t.name)}"><button class="btn" data-act="name-save">保存</button><button class="btn" data-act="name-cancel">キャンセル</button></span>`
        : `<h2>${esc(t.name)}</h2><span class="inline"><button class="link-btn" data-act="name-edit">名前を変更</button><button class="link-btn" data-act="tour-del">大会を削除</button></span>`}
    </div>
    <div class="row"><label>持ち込み</label><span class="inline"><select class="mine" data-k="a">${deckOpts(t.a)}</select><select class="mine" data-k="b">${deckOpts(t.b)}</select>${t.games.length ? '<button class="btn save-img" data-act="img">画像で保存</button>' : ''}</span></div>
    ${rows ? `<div class="wrap"><table class="games ${P.data.memo ? 'show-memo' : ''}"><thead><tr><th></th><th>相手のクラス</th><th>相手の使用デッキ</th><th>自分の選出</th><th>先後</th><th>結果</th><th class="r">${hasMemo ? `<button class="link-btn" data-act="memo">${P.data.memo ? 'メモを隠す' : 'メモを表示'}</button>` : ''}</th></tr></thead><tbody>${rows}</tbody></table></div>` : ''}
    <div class="form">
      <h3>${f.id ? `${t.games.findIndex(g => g.id === f.id) + 1}戦目を編集` : `${t.games.length + 1}戦目`}</h3>
      <div class="row"><label>相手の2クラス</label><span class="inline"><select id="tf-o1">${clsOpts(f.o1)}</select><select id="tf-o2">${clsOpts(f.o2)}</select></span></div>
      <div class="row"><label>相手の選出</label>${seg('op', [['1', CLSN[f.o1] || '1つ目'], ['2', CLSN[f.o2] || '2つ目']])}</div>
      <div class="row"><label>相手の使用デッキ</label><span class="inline"><select id="tf-ot" ${pickedCls(f) ? '' : 'disabled'}>${pickedCls(f) ? deckOpts(f.ot, pickedCls(f)) : '<option value=""></option>'}</select></span></div>
      <div class="row"><label>自分の選出</label>${seg('my', [['a', mine('a')], ['b', mine('b')]])}</div>
      <div class="row"><label>先後</label>${seg('turn', [['first', '先攻'], ['second', '後攻']])}</div>
      <div class="row"><label>結果</label>${seg('result', [['win', '勝ち'], ['lose', '負け']])}</div>
      <div class="row"><label>メモ</label><textarea id="tf-memo">${esc(f.memo)}</textarea></div>
      <div class="actions">${f.id ? '<button class="btn" data-act="tf-cancel">キャンセル</button>' : ''}<button class="btn primary" data-act="tf-save">${f.id ? '保存' : '追加'}</button></div>
    </div>
  </div>`;
}

function decksHtml() {
  const ds = liveDecks();
  return `<details class="decks" ${P.decksOpen ? 'open' : ''}><summary>デッキタイプ</summary>
    ${Object.entries(CLSN).map(([k, n]) => {
      const xs = ds.filter(d => String(d.cls) === k);
      return `<div class="deck-cls"><h4>${n}</h4><div class="deck-list">${xs.length ? xs.map(d => `<span>${esc(d.name)}<button class="link-btn" data-act="deck-del" data-id="${d.id}">削除</button></span>`).join('') : '<span class="muted">なし</span>'}</div></div>`;
    }).join('')}
    <div class="inline"><select id="nd-cls">${clsOpts('')}</select><input class="text" id="nd-name" placeholder="デッキ名"><button class="btn" data-act="deck-add">追加</button></div>
  </details>`;
}

/* ---------------- 入力 ---------------- */

function readTF() {
  const f = P.tf || blankTF();
  if ($('#tf-o1')) { f.o1 = $('#tf-o1').value; f.o2 = $('#tf-o2').value; f.ot = $('#tf-ot').value; f.memo = $('#tf-memo').value.replace(/\s+$/, ''); }
  P.tf = f; return f;
}
function fixType(f) {
  if (f.op === '1' && !f.o1) f.op = ''; if (f.op === '2' && !f.o2) f.op = '';
  const d = f.ot && P.data.decks.find(x => x.id === f.ot);
  if (f.ot && (!d || String(d.cls) !== String(pickedCls(f)))) f.ot = '';
}
function twoStep(btn, label, fn) {
  if (btn.dataset.armed) { delete btn.dataset.armed; fn(); return; }
  const o = btn.textContent; btn.dataset.armed = '1'; btn.textContent = label;
  setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.textContent = o; } }, 6000);
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const t = curTour(), ds = b.dataset;
  switch (ds.act) {
    case 'sel': P.data.sel = ds.id; P.tf = null; P.editName = false; commit(); break;
    case 'add-tour': {
      const n = $('#new-name').value.trim(); if (!n) { toast('大会名を入れてください', 'err'); $('#new-name').focus(); return; }
      const x = { id: uid(), name: n, a: '', b: '', games: [] }; P.data.tours.push(x); P.data.sel = x.id; P.tf = null; P.editName = false; commit('追加しました'); break;
    }
    case 'name-edit': P.editName = true; render(); $('#tour-name').focus(); break;
    case 'name-cancel': P.editName = false; render(); break;
    case 'name-save': { const n = $('#tour-name').value.trim(); if (!n) { toast('大会名を入れてください', 'err'); return; } t.name = n; P.editName = false; commit('保存しました'); break; }
    case 'tour-del': twoStep(b, '本当に削除', () => {
      P.data.tours = P.data.tours.filter(x => x.id !== t.id); P.data.sel = (P.data.tours[P.data.tours.length - 1] || {}).id || ''; P.tf = null; commit('削除しました');
    }); break;
    case 'tf-seg': { const f = readTF(); f[ds.k] = f[ds.k] === ds.v ? '' : ds.v; fixType(f); render(); break; }
    case 'tf-edit': { const g = t.games.find(x => x.id === ds.g); if (!g) return; P.tf = { ...blankTF(), ...g }; render(); $('.form').scrollIntoView({ block: 'center' }); break; }
    case 'tf-cancel': P.tf = null; render(); break;
    case 'tf-save': {
      const f = readTF();
      if (!f.o1 && !f.o2 && !f.result) { toast('相手のクラスか結果を入れてください', 'err'); return; }
      const g = { id: f.id || uid(), o1: f.o1, o2: f.o2, op: f.op, ot: pickedCls(f) ? f.ot : '', my: f.my, turn: f.turn, result: f.result, memo: f.memo };
      const i = t.games.findIndex(x => x.id === g.id);
      if (i >= 0) t.games[i] = g; else t.games.push(g);
      P.tf = null; commit(i >= 0 ? '保存しました' : '追加しました'); break;
    }
    case 'tf-del': twoStep(b, '本当に削除', () => {
      t.games = t.games.filter(x => x.id !== ds.g); if (P.tf && P.tf.id === ds.g) P.tf = null; commit('削除しました');
    }); break;
    case 'memo': { P.data.memo = !P.data.memo; save(); const tb = b.closest('table'); tb.classList.toggle('show-memo', P.data.memo); b.textContent = P.data.memo ? 'メモを隠す' : 'メモを表示'; break; }
    case 'img': saveImage(t); break;
    case 'deck-add': {
      readTF(); const c = $('#nd-cls').value, n = $('#nd-name').value.trim();
      if (!c || !n) { toast('クラスとデッキ名を入れてください', 'err'); return; }
      if (liveDecks().some(d => String(d.cls) === c && d.name === n)) { toast('同じデッキがあります', 'err'); return; }
      P.data.decks.push({ id: uid(), cls: c, name: n }); P.decksOpen = true; commit('追加しました'); break;
    }
    case 'deck-del': twoStep(b, '本当に削除', () => {
      readTF(); const d = P.data.decks.find(x => x.id === ds.id); if (d) d.hidden = true; P.decksOpen = true; commit('削除しました');
    }); break;
  }
});
document.addEventListener('change', e => {
  const t = curTour();
  if (e.target.matches('#tf-o1, #tf-o2')) { const f = readTF(); fixType(f); render(); return; }
  if (e.target.matches('select.mine') && t) { readTF(); t[e.target.dataset.k] = e.target.value; commit(); }
});
document.addEventListener('toggle', e => { if (e.target.matches && e.target.matches('details.decks')) P.decksOpen = e.target.open; }, true);
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.isComposing) return;
  if (e.target.id === 'new-name') $('[data-act="add-tour"]').click();
  else if (e.target.id === 'nd-name') $('[data-act="deck-add"]').click();
  else if (e.target.id === 'tour-name') $('[data-act="name-save"]').click();
});

/* ---------------- 画像で保存 ---------------- */

function saveImage(t) {
  const font = getComputedStyle(document.body).fontFamily, S = 2, pad = 24, cp = 8;
  const C = { text: '#202122', sub: '#6b6b68', line: '#e3e3e0', strong: '#c9c9c4', win: '#1e7a46', lose: '#b3261e' };
  const cv = document.createElement('canvas'), x = cv.getContext('2d');
  const F = (sz, w) => `${w || 400} ${sz}px ${font}`;
  const W = (s, f) => { x.font = f; return x.measureText(s).width; };
  const mine = v => deckName(t[v]);
  const heads = ['', '相手のクラス', '相手の使用デッキ', '自分の選出', '先後', '結果'];
  const rows = t.games.map((g, i) => {
    const cls = [['1', g.o1], ['2', g.o2]].filter(q => q[1]).map(([k, c]) => ({ s: CLSN[c] || '', b: g.op === k }));
    return [{ s: String(i + 1), r: 1 }, { cls }, { s: deckName(g.ot) }, { s: g.my ? mine(g.my) : '' }, { s: { first: '先攻', second: '後攻' }[g.turn] || '' },
      { s: { win: '勝ち', lose: '負け' }[g.result] || '', b: 1, c: g.result === 'win' ? C.win : g.result === 'lose' ? C.lose : C.text }];
  });
  const sep = '・';
  const cellW = c => c.cls ? c.cls.reduce((a, q, i) => a + W(q.s, F(15, q.b ? 700 : 400)) + (i ? W(sep, F(15, 700)) : 0), 0) : W(c.s, F(15, c.b ? 700 : 400));
  const cw = heads.map((h, j) => Math.max(W(h, F(12, 600)), ...rows.map(r => cellW(r[j]))) + cp * 2);
  const tw = cw.reduce((a, b) => a + b, 0);
  const lab = '持ち込み', labW = W(lab, F(15)), da = mine('a'), db = mine('b');
  const mineW = labW + 32 + W(da, F(15, 700)) + 24 + W(db, F(15, 700));
  const title = t.name, titleW = W(title, F(18, 700));
  const width = Math.ceil(pad * 2 + Math.max(tw, mineW, titleW)), headH = 34, rowH = 42;
  const height = Math.ceil(pad + 30 + 16 + 28 + 18 + headH + rowH * rows.length + pad);
  cv.width = width * S; cv.height = height * S; x.scale(S, S);
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, width, height); x.textBaseline = 'middle';
  let y = pad + 15;
  x.fillStyle = C.text; x.font = F(18, 700); x.fillText(title, pad, y);
  y += 15 + 16 + 14;
  x.font = F(15); x.fillText(lab, pad, y);
  let px = pad + labW + 32; x.font = F(15, 700); x.fillText(da, px, y); px += W(da, F(15, 700)) + 24; x.font = F(15, 700); x.fillText(db, px, y);
  y += 14 + 18;
  const line = (yy, c) => { x.fillStyle = c; x.fillRect(pad, yy, tw, 1); };
  let cx = pad; heads.forEach((h, j) => { x.fillStyle = C.sub; x.font = F(12, 600); x.fillText(h, cx + cp, y + headH / 2); cx += cw[j]; });
  y += headH; line(y - 1, C.strong);
  for (const r of rows) {
    const my = y + rowH / 2; cx = pad;
    r.forEach((c, j) => {
      if (c.cls) {
        let qx = cx + cp;
        c.cls.forEach((q, i) => {
          if (i) { x.font = F(15, 700); x.fillStyle = C.text; x.fillText(sep, qx, my); qx += W(sep, F(15, 700)); }
          x.font = F(15, q.b ? 700 : 400); x.fillStyle = q.b ? C.text : C.sub; x.fillText(q.s, qx, my); qx += W(q.s, F(15, q.b ? 700 : 400));
        });
      } else { x.font = F(15, c.b ? 700 : 400); x.fillStyle = c.c || C.text; const w = W(c.s, x.font); x.fillText(c.s, c.r ? cx + cw[j] - cp - w : cx + cp, my); }
      cx += cw[j];
    });
    y += rowH; line(y - 1, C.line);
  }
  const a = document.createElement('a'); a.href = cv.toDataURL('image/png');
  a.download = `${title.replace(/[\\/:*?"<>|]/g, '_')}.png`; a.click();
}

P.data = load();
P.data.decks = P.data.decks || []; P.data.tours = P.data.tours || [];
render();
