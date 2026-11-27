/* Pixie Speaking Studio — Expression Memory Loop & pattern library */
(window.PSS_EXT = window.PSS_EXT || []).push(function (A) {
'use strict';
const { S, D, P, AI, Speech, esc, uid, today, addDays, catOf, toast, openSheet, closeSheet, go, render, save, runAI, errBox, topBar, speakUI } = A;

const FUNCS = ['요청', '거절 대응', '이유 설명', '조건 제시', '불만 제기', '사과·양해', '확인 질문', '의견 말하기', '경험 서술', '연결어', '기타'];
const PRESETS = { base: { ko: '기본 (1·3·7·14·30일)', iv: [1, 3, 7, 14, 30] }, tight: { ko: '촘촘하게 (1·2·4·7·14일)', iv: [1, 2, 4, 7, 14] }, loose: { ko: '느슨하게 (2·5·10·20·40일)', iv: [2, 5, 10, 20, 40] } };
const ST = { new: '새 표현', learning: '학습 중', practicing: '연습 중', due: '복습 예정', mastered: '숙달' };
const RES = { independent: '독립 회상 성공', hint: '힌트 후 성공', fail: '회상 실패' };

/* ---------- data ---------- */
const X = () => S.data.exprs;
const setv = () => S.data.settings;
const norm = (s) => String(s || '').toLowerCase().replace(/[…~]|\.\.\./g, ' ').replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();
const byId = (id) => X().find(e => e.id === id);
const findExpr = (en) => { const n = norm(en); return n ? X().find(e => norm(e.en) === n) : null; };
const iv = () => (PRESETS[setv().srsPreset] || PRESETS.base).iv;
const isDue = (e) => e.status !== 'new' && e.nextReview && e.nextReview <= today();
const stKey = (e) => isDue(e) ? 'due' : e.status;
const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);

function migrate(data) {
  data.settings.newLimit = data.settings.newLimit || 2;
  data.settings.reviewCap = data.settings.reviewCap || 10;
  data.settings.srsPreset = data.settings.srsPreset || 'base';
  (data.exprs || []).forEach(e => {
    if (e.v === 2) return;
    e.v = 2;
    e.createdAt = e.createdAt || e.date || today();
    e.examples = e.examples || [];
    e.attempts = e.attempts || [];
    (e.drills || []).forEach(d => { if (d.res) e.attempts.push({ id: uid(), type: 'apply', day: e.createdAt, situation: d.ko, text: d.text, hints: 0, comm: !!d.res.pass, used: d.res.used ? 'exact' : 'none', result: d.res.pass ? 'independent' : 'fail', fixed: d.res.fixed, feedback: d.res.feedback }); });
    delete e.drills;
    if (e.reviewAt) { e.nextReview = e.reviewAt; delete e.reviewAt; }
    e.status = e.status === 'mastered' ? 'mastered' : (e.attempts.length ? 'practicing' : 'new');
    if (e.status !== 'new' && !e.nextReview) e.nextReview = addDays(1);
    e.stage = e.stage || 0; e.history = e.history || [];
    e.scenario = e.scenario || ''; e.star = !!e.star;
  });
}

function addExpr(o) {
  const ex = findExpr(o.en);
  if (ex) {
    if (o.example && !ex.examples.some(x => norm(x.en) === norm(o.example))) ex.examples.push({ en: o.example, ko: o.example_ko || '', context: o.cat ? catOf(o.cat).ko : '' });
    ex.history.push({ day: today(), scenario: o.scenario || '', orig: o.orig || '' });
    save(); toast('이미 표현장에 있어서, 새 예문과 사용 이력을 그 카드에 더했어요.');
    return { e: ex, dup: true };
  }
  const e = {
    v: 2, id: uid(), en: o.en.trim(), ko: o.ko || '', kind: o.kind || '', func: FUNCS.includes(o.func) ? o.func : '', usage: o.context || '', why: o.why || '',
    examples: o.example ? [{ en: o.example, ko: o.example_ko || '', context: '내 답변에서' }] : [],
    cat: o.cat || '', scenario: o.scenario || '', orig: o.orig || '', fixed: o.fixed || '', natural: o.natural || '', fromKo: !!o.fromKo,
    status: 'new', stage: 0, createdAt: today(), lastReviewed: null, nextReview: null, star: false, attempts: [], history: [], detail: null
  };
  X().push(e); save();
  return { e, dup: false };
}
const learnStartsToday = () => X().filter(e => e.learnStartedAt === today()).length;

/* ---------- SRS ---------- */
function srs(e, result) {
  const I = iv(); const t = today();
  e.lastReviewed = t;
  if (result === 'independent') { e.stage = Math.min((e.stage || 0) + 1, I.length - 1); e.nextReview = addDays(I[e.stage]); }
  else if (result === 'hint') { e.nextReview = addDays(Math.max(1, Math.round(I[e.stage || 0] / 2))); }
  else { e.stage = Math.max(0, (e.stage || 0) - 1); e.nextReview = addDays(1); if (e.status === 'mastered') e.status = 'practicing'; }
  const indepDays = new Set(e.attempts.filter(a => a.result === 'independent' && (a.type === 'review' || a.type === 'used')).map(a => a.day));
  if (e.status !== 'mastered' && indepDays.size >= 3 && e.stage >= 2) { e.status = 'mastered'; e.masteredAt = t; e.nextReview = addDays(30); toast('🎉 "' + e.en + '" 숙달! 힌트 없이 여러 날 성공했어요.'); }
}
function resultOf(chk, hints) {
  const recalled = chk && (chk.used === 'exact') && chk.structure_ok !== false;
  if (!recalled) return 'fail';
  return hints > 0 ? 'hint' : 'independent';
}

/* ---------- AI ---------- */
async function ensureDetail(e, key) {
  if (e.detail) return true;
  const src = { en: e.en, ko: e.ko, kind: e.kind, scenario: e.scenario, orig: e.orig, examples: e.examples.map(x => x.en) };
  const d = await runAI(key || 'xd' + e.id, () => AI.json(Object.assign(P.exprDetail(src, FUNCS), { model: AI.evalModel })));
  if (!d) return false;
  e.detail = d;
  if (d.ko && !e.ko) e.ko = d.ko;
  if (d.kind) e.kind = d.kind;
  if (d.func && FUNCS.includes(d.func) && !e.func) e.func = d.func;
  if (d.usage && !e.usage) e.usage = d.usage;
  (d.examples || []).forEach(x => { if (x && x.en && !e.examples.some(y => norm(y.en) === norm(x.en))) e.examples.push({ en: x.en, ko: x.ko || '', context: x.context || '' }); });
  if (!e.scenario && d.recall_situation) e.scenario = d.recall_situation;
  save();
  return true;
}
async function checkUse(e, situation, text, hints, key) {
  return runAI(key, () => AI.json(P.exprCheck({ en: e.en, kind: e.kind, structure: e.detail && e.detail.structure, situation, text, hints })));
}

/* ---------- key expressions on feedback ---------- */
function kxList(ev) {
  const out = [];
  (ev.key_expressions || []).forEach((k, i) => { if (k && k.en) out.push(Object.assign({ src: 'k', i }, k)); });
  (ev.bridges || []).forEach((b, i) => { if (b && b.en && !out.some(x => norm(x.en) === norm(b.en))) out.push({ src: 'b', i, en: b.en, ko: b.ko, why: b.note, fromKo: true, context: '모르는 부분을 한국어로 썼던 표현' }); });
  return out;
}
function keyExprHTML(ev, ctx) {
  if (!ev) return '';
  const list = kxList(ev).filter(k => !(k.src === 'k' ? ev.key_expressions[k.i] : ev.bridges[k.i]).skip);
  if (!list.length) return '';
  return `<div style="margin-top:14px"><p class="lbl" style="color:var(--indigo)">KEY EXPRESSIONS · 이번 답변에서 익힐 표현</p>${list.map(k => {
    const raw = k.src === 'k' ? ev.key_expressions[k.i] : ev.bridges[k.i];
    const have = raw.saved && byId(raw.saved) || findExpr(k.en);
    return `<div class="bridge">
      ${k.fromKo ? `<div class="note" style="margin:0 0 4px"><b>${esc(k.ko)}</b> → 영어로는</div>` : ''}
      <div style="font-weight:800;font-size:16px">${esc(k.en)} <span class="tag">${k.kind === 'pattern' ? '패턴' : k.kind === 'fixed' ? '고정 표현' : '표현'}</span></div>
      ${k.ko && !k.fromKo ? `<div class="note" style="margin-top:2px">${esc(k.ko)}</div>` : ''}
      ${k.context ? `<div class="note">📍 ${esc(k.context)}</div>` : ''}
      ${k.example ? `<div class="hintbox" style="margin-top:6px">${esc(k.example)}${k.example_ko ? `<div class="note" style="margin:2px 0 0">${esc(k.example_ko)}</div>` : ''}</div>` : ''}
      ${k.why ? `<div class="note">💡 ${esc(k.why)}</div>` : ''}
      ${have ? `<div class="row"><button class="btn sm ghost" data-act="xOpen" data-id="${have.id}">✓ 표현장에 있어요 · 보기</button></div>`
        : `<div class="row"><button class="btn sm ghost" data-act="kxSkip" data-ctx="${esc(ctx)}" data-src="${k.src}" data-i="${k.i}">이번엔 넘어가기</button><button class="btn sm indigo" data-act="kxAdd" data-ctx="${esc(ctx)}" data-src="${k.src}" data-i="${k.i}">내 표현장에 추가</button></div>`}
    </div>`;
  }).join('')}</div>`;
}
function myExprList() {
  return X().filter(e => e.status !== 'new').sort((a, b) => (isDue(b) - isDue(a)) || ((b.status === 'practicing') - (a.status === 'practicing'))).slice(0, 25).map(e => e.en);
}
function rpTargets() {
  return X().filter(e => e.status === 'practicing' || isDue(e)).sort((a, b) => (isDue(b) - isDue(a))).slice(0, 3).map(e => e.en);
}
function recordUsage(list, info) {
  if (!Array.isArray(list) || !list.length) return;
  const hit = [];
  list.forEach(en => {
    const e = findExpr(en); if (!e || e.status === 'new') return;
    if (e.attempts.some(a => a.type === 'used' && a.ref === info.ref)) return;
    e.attempts.push({ id: uid(), type: 'used', day: today(), at: Date.now(), situation: info.situation || '', text: info.text || '', where: info.where || '', ref: info.ref, hints: 0, comm: true, used: 'exact', result: 'independent' });
    if (isDue(e)) srs(e, 'independent');
    hit.push(e.en);
  });
  if (hit.length) { save(); toast('표현장 표현을 실제로 썼어요: ' + hit.join(', ')); }
}

/* ---------- views ---------- */
function stBadge(e) { const k = stKey(e); return `<span class="st st-${k}">${ST[k]}</span>`; }
function vBank() {
  const p = S.p; const f = p.f || 'all'; const q = norm(p.q || '');
  let list = X().filter(e => (f === 'all' || stKey(e) === f || (f === 'star' && e.star) || (f === 'ko' && e.fromKo)) && (!p.cat || e.cat === p.cat) && (!p.fn || e.func === p.fn) && (!q || norm(e.en + ' ' + e.ko).includes(q)));
  list = list.slice().sort((a, b) => (b.star - a.star) || (b.createdAt > a.createdAt ? 1 : -1));
  const due = X().filter(isDue);
  const cnt = (k) => X().filter(e => stKey(e) === k).length;
  let h = topBar('My Expression Library', X().length + '개', true);
  h += `<div class="card"><div class="stats"><div class="stat"><b>${cnt('new')}</b><span>새 표현</span></div><div class="stat"><b style="${due.length ? 'color:var(--accent)' : ''}">${due.length}</b><span>복습 예정</span></div><div class="stat"><b>${cnt('mastered')}</b><span>숙달</span></div></div>
    <div class="row"><button class="btn accent" data-act="xReview" data-v="due" ${due.length ? '' : 'disabled'}>오늘 복습 ${due.length}</button><button class="btn ghost" data-act="xReview" data-v="random" ${X().some(e => e.status !== 'new') ? '' : 'disabled'}>무작위 복습</button></div>
    <div class="row" style="margin-top:8px"><button class="btn line sm" data-act="xFlash">가리고 회상하기</button><button class="btn line sm" data-act="xReview" data-v="mastered" ${cnt('mastered') ? '' : 'disabled'}>숙달 재시험</button><button class="btn line sm" data-act="xAddOpen">+ 직접 추가</button></div></div>`;
  h += `<input type="text" id="xq" placeholder="표현이나 뜻 검색" value="${esc(p.q || '')}" style="margin-bottom:10px">`;
  h += `<div class="chips" style="margin-bottom:8px">${[['all', '전체'], ['new', '새 표현'], ['learning', '학습 중'], ['practicing', '연습 중'], ['due', '복습 예정'], ['mastered', '숙달'], ['star', '⭐ 중요'], ['ko', '한국어로 썼던']].map(([k, v]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="xF" data-k="f" data-v="${k}">${v}</button>`).join('')}</div>`;
  h += `<details style="margin-bottom:10px" ${p.cat || p.fn ? 'open' : ''}><summary>상황별 · 기능별 ${p.cat || p.fn ? '(필터 적용 중)' : ''}</summary>
    <div class="chips" style="margin-top:6px">${[['', '모든 상황']].concat(D.categories.map(c => [c.id, c.ko])).map(([k, v]) => `<button class="chip ${(p.cat || '') === k ? 'on' : ''}" data-act="xF" data-k="cat" data-v="${k}">${esc(v)}</button>`).join('')}</div>
    <div class="chips" style="margin-top:8px">${[['', '모든 기능']].concat(FUNCS.map(x => [x, x])).map(([k, v]) => `<button class="chip ${(p.fn || '') === k ? 'on' : ''}" data-act="xF" data-k="fn" data-v="${esc(k)}">${esc(v)}</button>`).join('')}</div></details>`;
  h += `<div style="display:flex;align-items:center;margin:0 4px 8px"><span class="hint" style="flex:1;margin:0">${list.length}개</span><button class="chip ${p.card ? '' : 'on'}" data-act="xF" data-k="card" data-v="">리스트</button>&nbsp;<button class="chip ${p.card ? 'on' : ''}" data-act="xF" data-k="card" data-v="1">카드</button></div>`;
  if (!list.length) h += `<div class="card"><p class="hint" style="margin:0">${X().length ? '조건에 맞는 표현이 없어요.' : '아직 표현이 없어요. 말하기 평가의 <b>KEY EXPRESSIONS</b>에서 추가하거나 직접 추가해요.'}</p></div>`;
  h += list.map(e => p.card ? `<button class="expr" data-act="xOpen" data-id="${e.id}">
      <div style="display:flex;gap:8px;align-items:center"><span class="en" style="flex:1">${e.star ? '⭐ ' : ''}${esc(e.en)}</span>${stBadge(e)}</div>
      <div class="ko">${esc(e.ko)}</div>
      ${e.examples[0] ? `<div class="hintbox" style="margin-top:6px;font-size:14px">${esc(e.examples[0].en)}</div>` : ''}
      <div class="meta" style="margin-top:6px;font-size:12px"><span>학습 ${esc(e.createdAt)}</span><span>마지막 복습 ${esc(e.lastReviewed || '–')}</span><span>다음 복습 ${esc(e.nextReview || '–')}</span></div></button>`
    : `<button class="expr" data-act="xOpen" data-id="${e.id}"><div style="display:flex;gap:8px;align-items:center"><span class="en" style="flex:1">${e.star ? '⭐ ' : ''}${esc(e.en)}</span>${stBadge(e)}</div><div class="ko">${e.fromKo ? '🇰🇷 ' : ''}${esc(e.ko)}${e.nextReview ? ' · 다음 ' + esc(e.nextReview.slice(5)) : ''}</div></button>`).join('');
  return h;
}

function sayBtn(t) { return Speech.ok ? `<button class="say" data-act="xSay" data-t="${esc(t)}">🔊</button>` : ''; }
function vExpr() {
  const e = byId(S.p.id); if (!e) return topBar('표현') + '<div class="card">표현을 찾을 수 없어요.</div>';
  const d = e.detail || {};
  const mine = e.attempts.filter(a => a.text);
  const indep = e.attempts.filter(a => a.result === 'independent').length, hinted = e.attempts.filter(a => a.result === 'hint').length, failed = e.attempts.filter(a => a.result === 'fail').length;
  let h = topBar('패턴 상세', ST[stKey(e)]);
  h += `<div class="card"><div style="display:flex;gap:8px;align-items:flex-start"><p class="situ" style="flex:1;margin:0;font-size:21px">${esc(e.en)} ${sayBtn(e.en)}</p><button class="chip ${e.star ? 'on' : ''}" data-act="xStar" data-id="${e.id}">⭐</button></div>
    <p style="margin:6px 0 0;font-weight:600">① ${esc(e.ko || d.ko || '')}</p>
    <div class="meta" style="margin-top:6px">${e.kind ? `<span class="tag">${e.kind === 'pattern' ? '패턴' : '고정 표현'}</span>` : ''}${e.func ? `<span class="tag">${esc(e.func)}</span>` : ''}${e.cat ? `<span class="tag">${esc(catOf(e.cat).ko)}</span>` : ''}</div>
    <div class="row">${e.status === 'new' || e.status === 'learning' ? `<button class="btn accent" data-act="xLearn" data-id="${e.id}">익히기 시작</button>` : `<button class="btn accent" data-act="xReviewOne" data-id="${e.id}">지금 복습</button>`}<button class="btn ghost" data-act="xEdit" data-id="${e.id}">수정·삭제</button></div></div>`;
  if (!e.detail) {
    h += `<div class="card"><p class="hint" style="margin:0 0 8px">사용 상황, 뉘앙스 차이, 문장 구조, 다양한 예문, 흔한 오류를 AI가 정리해 줘요.</p><button class="btn wide" data-act="xDetail" data-id="${e.id}" ${S.busy['xd' + e.id] ? 'disabled' : ''}>${S.busy['xd' + e.id] ? '정리하는 중…' : '자세한 설명 불러오기'}</button>${errBox('xd' + e.id)}</div>`;
  }
  if (e.usage || d.usage) h += `<div class="card"><h3>② 언제 쓰나요</h3><p style="margin:0">${esc(d.usage || e.usage)}</p>${e.why ? `<p class="note">💡 ${esc(e.why)}</p>` : ''}</div>`;
  if ((d.nuance || []).length) h += `<div class="card"><h3>③ 비슷한 표현과 차이</h3><ul class="fixlist">${d.nuance.map(n => `<li><b>${esc(n.vs)}</b><div class="note">${esc(n.note)}</div></li>`).join('')}</ul></div>`;
  if (d.structure || (d.collocations || []).length || (d.related || []).length) h += `<div class="card"><h3>④ 구조와 단어 조합</h3>${d.structure ? `<div class="hintbox"><b>${esc(d.structure)}</b></div>` : ''}${d.pattern_note ? `<p class="note">${esc(d.pattern_note)}</p>` : ''}${(d.collocations || []).length ? `<p class="lbl" style="margin-top:10px">자주 쓰는 조합</p><div class="chips">${d.collocations.map(c => `<span class="tag">${esc(c)}</span>`).join('')}</div>` : ''}${(d.related || []).length ? `<p class="lbl" style="margin-top:10px">같은 패턴 표현</p><div class="chips">${d.related.map(c => `<span class="tag">${esc(c)}</span>`).join('')}</div>` : ''}</div>`;
  if (e.examples.length) h += `<div class="card"><h3>⑤ 예문</h3><ul class="fixlist">${e.examples.map(x => `<li>${x.context ? `<span class="lbl">${esc(x.context)}</span><br>` : ''}<b>${esc(x.en)}</b> ${sayBtn(x.en)}${x.ko ? `<div class="note" style="margin:2px 0 0">${esc(x.ko)}</div>` : ''}</li>`).join('')}</ul></div>`;
  if ((d.mistakes || []).length) h += `<div class="card"><h3>⑥ 흔한 오류</h3><ul class="fixlist">${d.mistakes.map(m => `<li><s>${esc(m.wrong)}</s><br><span class="b">${esc(m.right)}</span>${m.why ? `<div class="note">${esc(m.why)}</div>` : ''}</li>`).join('')}</ul></div>`;
  h += `<div class="card"><h3>⑦ 처음 만난 상황</h3>${e.scenario ? `<p style="margin:0 0 6px">${esc(e.scenario)}</p>` : '<p class="hint" style="margin:0">직접 추가한 표현이에요.</p>'}${e.orig ? `<div class="cmp"><div><div class="k">내가 했던 말</div><div class="v">${esc(e.orig)}</div></div>${e.fixed && e.fixed !== e.orig ? `<div><div class="k">교정</div><div class="v">${esc(e.fixed)}</div></div>` : ''}${e.natural ? `<div class="nat"><div class="k">NATURAL</div><div class="v">${esc(e.natural)}</div></div>` : ''}</div>` : ''}
    ${e.history.length ? `<p class="hint">다른 상황에서도 ${e.history.length}번 더 나왔어요.</p>` : ''}</div>`;
  h += `<div class="card"><h3>⑧ 내가 만든 응용 문장 ${mine.length}</h3>${mine.length ? mine.slice().reverse().map(a => `<div style="padding:8px 0;border-top:1px solid var(--line)"><div class="meta"><span class="tag">${esc({ recall: '즉시 회상', apply: '응용', review: '복습', used: '실전 사용', flash: '셀프 회상' }[a.type] || a.type)}</span>${a.result ? `<span class="st st-${a.result === 'independent' ? 'mastered' : a.result === 'hint' ? 'learning' : 'review'}">${RES[a.result]}</span>` : ''}${a.hints ? `<span>힌트 ${a.hints}</span>` : ''}<span>${esc(a.day)}</span></div>${a.situation ? `<div class="note">${esc(a.situation)}</div>` : ''}<div style="font-size:14.5px;margin-top:2px">${esc(a.text)}</div>${a.fixed && a.fixed !== a.text ? `<div class="note" style="color:var(--good)">→ ${esc(a.fixed)}</div>` : ''}${a.audioId ? `<audio controls preload="none" data-aid="${esc(a.audioId)}"></audio>` : ''}</div>`).join('') : '<p class="hint" style="margin:0">익히기를 시작하면 여기에 쌓여요.</p>'}</div>`;
  h += `<div class="card"><h3>⑨ 복습 기록</h3><dl class="kv"><dt>상태</dt><dd>${ST[stKey(e)]}</dd><dt>처음 학습</dt><dd>${esc(e.createdAt)}</dd><dt>마지막 복습</dt><dd>${esc(e.lastReviewed || '–')}</dd><dt>다음 복습</dt><dd>${esc(e.nextReview || '–')}</dd><dt>회상 결과</dt><dd>독립 ${indep} · 힌트 후 ${hinted} · 실패 ${failed}</dd></dl>
    <p class="hint">힌트 없이 서로 다른 날 3번 이상 성공하면 숙달이에요.</p></div>`;
  return h;
}

/* learn flow: understand → recall → apply ×2 */
function hintBlock(e, lv, key) {
  const d = e.detail || {};
  const first = d.structure || (e.en.split(' ').slice(0, 2).join(' ') + ' …');
  let out = '';
  if (lv >= 1) out += `<div class="hintbox"><b>뜻</b> ${esc(e.ko)}</div>`;
  if (lv >= 2) out += `<div class="hintbox"><b>구조</b> ${esc(first)}</div>`;
  if (lv >= 3) out += `<div class="hintbox"><b>표현</b> ${esc(e.en)}</div>`;
  if (lv < 3) out += `<div class="row"><button class="btn sm ghost" data-act="xHint" data-k="${esc(key)}">막혔어요 · 힌트 ${lv + 1}</button></div>`;
  return out;
}
function resultCard(r) {
  if (!r) return '';
  const c = r.chk || {};
  return `<div class="card"><div class="verdict ${c.comm_pass ? 'v-PASS' : 'v-RETRY'}"><div>${c.comm_pass ? 'Communication PASS' : 'Communication RETRY'}<small>${esc(c.feedback || '')}</small></div></div>
    <div class="verdict ${r.result === 'independent' ? 'v-PASS' : r.result === 'hint' ? 'v-PASS_FIX' : 'v-RETRY'}" style="margin-top:8px;font-size:15px"><div>표현: ${RES[r.result]}<small>${c.used === 'exact' ? '목표 표현을 썼어요' : c.used === 'equivalent' ? '뜻은 통했지만 목표 표현은 아직이에요' : '목표 표현을 쓰지 않았어요'}${c.structure_ok === false ? ' · 핵심 구조를 다시 봐요' : ''}</small></div></div>
    <div class="cmp"><div><div class="k">MY ANSWER</div><div class="v">${esc(r.text)}</div></div>${c.essential && c.essential !== r.text ? `<div><div class="k">ESSENTIAL</div><div class="v">${esc(c.essential)}</div></div>` : ''}${c.natural ? `<div class="nat"><div class="k">NATURAL</div><div class="v">${esc(c.natural)}</div></div>` : ''}</div></div>`;
}
function vLearn() {
  const e = byId(S.p.id); if (!e) return topBar('익히기') + '<div class="card">표현이 없어요.</div>';
  const step = S.p.step || 'understand'; const d = e.detail;
  const steps = ['understand', 'recall', 'apply0', 'apply1', 'done']; const si = steps.indexOf(step);
  let h = topBar('표현 익히기', (si + 1) + ' / 4');
  h += `<div class="progress"><i style="width:${Math.round(si / 4 * 100)}%"></i></div>`;
  if (step === 'understand') {
    if (!d) return h + `<div class="card"><p class="situ" style="margin:0">${esc(e.en)}</p><p class="hint">${S.busy['xl' + e.id] ? '설명과 예문을 정리하는 중이에요…' : '설명을 불러오지 못했어요.'}</p>${errBox('xl' + e.id)}${S.busy['xl' + e.id] ? '' : `<button class="btn wide" data-act="xLearn" data-id="${e.id}">다시 시도</button>`}</div>`;
    h += `<div class="card"><p class="lbl">STEP 1 · 표현 이해</p><p class="situ" style="margin:0;font-size:22px">${esc(e.en)} ${sayBtn(e.en)}</p><p style="margin:6px 0 0;font-weight:600">${esc(e.ko)}</p>
      ${d.usage ? `<p class="note">📍 ${esc(d.usage)}</p>` : ''}${d.structure ? `<div class="hintbox"><b>구조</b> ${esc(d.structure)}</div>` : ''}${d.pattern_note ? `<p class="note">${esc(d.pattern_note)}</p>` : ''}</div>`;
    h += `<div class="card"><p class="lbl">STEP 2 · 다양한 예문</p><ul class="fixlist">${e.examples.slice(0, 5).map(x => `<li>${x.context ? `<span class="lbl">${esc(x.context)}</span><br>` : ''}<b>${esc(x.en)}</b> ${sayBtn(x.en)}<div class="note" style="margin:2px 0 0">${esc(x.ko || '')}</div></li>`).join('')}</ul>
      ${(d.mistakes || []).length ? `<p class="lbl" style="margin-top:12px">주의</p><ul class="fixlist">${d.mistakes.map(m => `<li><s>${esc(m.wrong)}</s> → <span class="b">${esc(m.right)}</span></li>`).join('')}</ul>` : ''}</div>`;
    h += `<div class="row" style="margin-bottom:12px"><button class="btn accent wide" data-act="xStep" data-v="recall">예문 가리고 직접 말해보기</button></div>`;
    return h;
  }
  if (step === 'done') {
    const at = e.attempts.filter(a => a.day === today() && (a.type === 'recall' || a.type === 'apply'));
    h += `<div class="card"><h2>오늘 학습 끝!</h2><p>${at.filter(a => a.result === 'independent').length}개는 힌트 없이, ${at.filter(a => a.result === 'hint').length}개는 힌트 후에 성공했어요.</p><p class="hint">다음 복습: <b>${esc(e.nextReview)}</b>. 그날은 영어 없이 한국어 상황만 보고 떠올려요. 읽기만 하거나 오늘 한 번 성공한 것으로는 숙달이 되지 않아요.</p>
      <div class="row"><button class="btn" data-act="go" data-v="bank">표현장으로</button></div></div>`;
    return h;
  }
  const sit = step === 'recall' ? (e.scenario || (d && d.recall_situation) || '') : ((d && d.apply_situations || [])[step === 'apply0' ? 0 : 1] || '');
  const key = 'xl' + step + e.id;
  const st = S.xs[key] || (S.xs[key] = { hints: 0 });
  h += `<div class="card"><p class="lbl">${step === 'recall' ? 'STEP 3 · 원래 상황에서 회상' : 'STEP 4 · 새로운 상황 ' + (step === 'apply0' ? '1' : '2') + ' / 2'}</p><p class="situ">${esc(sit)}</p><p class="hint">영어 표현은 숨겼어요. 외운 문장을 그대로 말하지 않아도 돼요. 이 상황에 맞게 말해요.</p>${st.r ? '' : hintBlock(e, st.hints, key)}</div>`;
  if (!st.r) {
    h += `<div class="card">${speakUI(key, { readyLabel: '눌러서 말하기', onSubmit: (a) => learnSubmit(e, step, sit, a, key) })}</div>`;
  } else {
    h += resultCard(st.r);
    const next = { recall: 'apply0', apply0: 'apply1', apply1: 'done' }[step];
    h += `<div class="row" style="margin-bottom:12px"><button class="btn line" data-act="xRetry" data-k="${esc(key)}">다시 말하기</button><button class="btn" data-act="xStep" data-v="${next}">${next === 'done' ? '마치기' : '다음'}</button></div>`;
  }
  return h;
}
async function learnSubmit(e, step, sit, a, key) {
  const st = S.xs[key];
  const chk = await checkUse(e, sit, a.transcript, st.hints, key);
  if (!chk) return;
  const result = resultOf(chk, st.hints);
  e.attempts.push({ id: uid(), type: step === 'recall' ? 'recall' : 'apply', day: today(), at: Date.now(), situation: sit, text: a.transcript, audioId: a.audioId, hints: st.hints, comm: !!chk.comm_pass, used: chk.used, result, fixed: chk.essential, feedback: chk.feedback });
  st.r = { chk, result, text: a.transcript };
  S.rec = null; save(); render();
}
function finishLearn(e) {
  if (e.status === 'new' || e.status === 'learning') e.status = 'practicing';
  e.stage = 0; e.lastReviewed = today(); e.nextReview = addDays(iv()[0]);
  save();
}

/* review flow */
function buildQueue(mode, ids) {
  let list;
  if (ids) list = ids.map(byId).filter(Boolean);
  else if (mode === 'mastered') list = X().filter(e => e.status === 'mastered');
  else if (mode === 'random') list = X().filter(e => e.status !== 'new');
  else list = X().filter(isDue);
  if (mode === 'random' || mode === 'mastered') list = list.sort(() => Math.random() - 0.5);
  else list = list.sort((a, b) => (b.star - a.star) || ((a.nextReview || '') < (b.nextReview || '') ? -1 : 1) || (b.attempts.filter(x => x.result === 'fail').length - a.attempts.filter(x => x.result === 'fail').length));
  const cap = setv().reviewCap || 10;
  return { ids: list.slice(0, cap).map(e => e.id), rest: Math.max(0, list.length - cap) };
}
async function startReview(mode, ids) {
  const q = buildQueue(mode, ids);
  if (!q.ids.length) { toast('복습할 표현이 없어요.'); return; }
  go('xrev', { mode, q: q.ids, rest: q.rest, i: 0, done: [] });
  const need = q.ids.map(byId).filter(e => !e.pendingSit || e.pendingSit.day !== today());
  if (!need.length) return;
  const j = await runAI('xsit', () => AI.json(Object.assign(P.reviewSituations({ items: need.map(e => ({ id: e.id, en: e.en, ko: e.ko, used: e.attempts.map(a => a.situation).filter(Boolean).slice(-4).concat(e.scenario ? [e.scenario] : []) })) }), { model: AI.chatModel })));
  (j && j.items || []).forEach(it => { const e = byId(it.id); if (e && it.ko) e.pendingSit = { day: today(), ko: String(it.ko) }; });
  need.forEach(e => { if (!e.pendingSit || e.pendingSit.day !== today()) { const ap = e.detail && e.detail.apply_situations || []; e.pendingSit = { day: today(), ko: ap[Math.floor(Math.random() * ap.length)] || e.scenario || (e.examples[0] && e.examples[0].ko) || e.ko + ' — 이 뜻으로 상황을 하나 떠올려 말해 보세요.' }; } });
  save(); render();
}
function vRev() {
  const p = S.p; const q = p.q || [];
  const title = { due: '오늘 복습', random: '무작위 복습', mastered: '숙달 재시험', one: '복습' }[p.mode] || '복습';
  let h = topBar(title, q.length ? Math.min(p.i + 1, q.length) + ' / ' + q.length : '');
  if (p.i >= q.length) {
    const r = p.done; const c = (k) => r.filter(x => x === k).length;
    h += `<div class="card"><h2>복습 완료 ${r.length}개</h2><div class="stats"><div class="stat"><b>${c('independent')}</b><span>독립 회상</span></div><div class="stat"><b>${c('hint')}</b><span>힌트 후</span></div><div class="stat"><b>${c('fail')}</b><span>회상 실패</span></div></div>
      ${p.rest ? `<p class="hint">복습할 표현이 ${p.rest}개 더 있어요. 한 번에 너무 많으면 기억이 흐려져서 나눠서 해요.</p>` : ''}
      <div class="row">${p.rest ? `<button class="btn ghost" data-act="xReview" data-v="${esc(p.mode)}">이어서 더 하기</button>` : ''}<button class="btn" data-act="go" data-v="bank">표현장으로</button></div></div>`;
    return h;
  }
  h += `<div class="progress"><i style="width:${Math.round(p.i / q.length * 100)}%"></i></div>`;
  const e = byId(q[p.i]); if (!e) { p.i++; return vRev(); }
  if (S.busy.xsit && !e.pendingSit) return h + '<div class="card">복습할 새 상황을 만드는 중이에요…</div>' + errBox('xsit');
  const sit = e.pendingSit ? e.pendingSit.ko : '';
  const key = 'xr' + e.id + p.i;
  const st = S.xs[key] || (S.xs[key] = { hints: 0 });
  h += `<div class="card"><p class="lbl">한국어 상황만 보고 말해요 · ${esc(e.func || catOf(e.cat).ko || '')}</p><p class="situ">${esc(sit)}</p>${errBox('xsit')}${st.r ? '' : hintBlock(e, st.hints, key)}</div>`;
  if (!st.r) h += `<div class="card">${speakUI(key, { readyLabel: '눌러서 말하기', onSubmit: (a) => reviewSubmit(e, sit, a, key) })}</div>`;
  else {
    h += resultCard(st.r);
    h += `<div class="card"><p class="lbl">목표 표현</p><b>${esc(e.en)}</b> ${sayBtn(e.en)}<p class="hint">${esc(e.ko)} · 다음 복습 ${esc(e.nextReview)}</p></div>`;
    h += `<div class="row" style="margin-bottom:12px"><button class="btn" data-act="xRevNext">다음</button></div>`;
  }
  return h;
}
async function reviewSubmit(e, sit, a, key) {
  const st = S.xs[key];
  const chk = await checkUse(e, sit, a.transcript, st.hints, key);
  if (!chk) return;
  const result = resultOf(chk, st.hints);
  e.attempts.push({ id: uid(), type: 'review', day: today(), at: Date.now(), situation: sit, text: a.transcript, audioId: a.audioId, hints: st.hints, comm: !!chk.comm_pass, used: chk.used, result, fixed: chk.essential, feedback: chk.feedback });
  srs(e, result); e.pendingSit = null;
  st.r = { chk, result, text: a.transcript };
  S.p.done.push(result);
  S.rec = null; save(); render();
}

/* flash: cover & recall (self check, no AI, does not count toward mastery) */
function vFlash() {
  const p = S.p;
  if (!p.q) { const pool = X().filter(e => e.status !== 'new' || e.examples.length).sort(() => Math.random() - 0.5).slice(0, 10); p.q = pool.map(e => e.id); p.i = 0; }
  let h = topBar('가리고 회상하기', p.q.length ? Math.min(p.i + 1, p.q.length) + ' / ' + p.q.length : '');
  if (!p.q.length) return h + '<div class="card"><p class="hint" style="margin:0">표현장에 표현을 먼저 모아 주세요.</p></div>';
  if (p.i >= p.q.length) return h + `<div class="card"><h2>한 바퀴 끝!</h2><p class="hint">셀프 회상은 기억을 깨우는 연습이라 숙달에는 반영하지 않아요. 숙달은 복습에서 힌트 없이 말했을 때 올라가요.</p><div class="row"><button class="btn" data-act="go" data-v="bank">표현장으로</button></div></div>`;
  const e = byId(p.q[p.i]); const ex = e.examples[(p.i + e.en.length) % Math.max(1, e.examples.length)];
  h += `<div class="card" style="text-align:center"><p class="lbl">이 뜻의 영어 표현은?</p><p class="situ" style="font-size:20px">${esc(e.ko)}</p>${ex && ex.ko ? `<div class="hintbox">${esc(ex.ko)}<div class="note">↑ 이 문장을 영어로 소리 내어 말해 보세요</div></div>` : ''}
    ${p.show ? `<div class="divider"></div><p class="situ" style="font-size:20px;margin:0">${esc(e.en)} ${sayBtn(e.en)}</p>${ex ? `<p style="margin:6px 0 0">${esc(ex.en)} ${sayBtn(ex.en)}</p>` : ''}
      <div class="row"><button class="btn ghost" data-act="xFlashMark" data-v="0">헷갈렸어요</button><button class="btn" data-act="xFlashMark" data-v="1">기억났어요</button></div>`
    : `<div class="row"><button class="btn wide" data-act="xFlashShow">정답 보기</button></div>`}</div>`;
  return h;
}

/* home card + day */
function homeCard() {
  const t = today(); const ex = X();
  const newToday = ex.filter(e => e.createdAt === t).length;
  const due = ex.filter(isDue).length;
  const revToday = ex.reduce((s, e) => s + e.attempts.filter(a => a.day === t && a.type === 'review').length, 0);
  const indepToday = ex.reduce((s, e) => s + e.attempts.filter(a => a.day === t && a.result === 'independent' && a.type !== 'flash').length, 0);
  return `<div class="card"><div style="display:flex;align-items:center"><h2 style="flex:1;margin:0">표현 복습</h2><button class="link" data-act="go" data-v="bank">표현장 ›</button></div>
    <div class="stats" style="margin-top:10px;grid-template-columns:repeat(4,minmax(0,1fr))"><div class="stat"><b>${newToday}</b><span>오늘 새 표현</span></div><div class="stat"><b style="${due ? 'color:var(--accent)' : ''}">${due}</b><span>복습할 것</span></div><div class="stat"><b>${revToday}</b><span>복습 완료</span></div><div class="stat"><b>${indepToday}</b><span>힌트 없이</span></div></div>
    ${due ? `<div class="row"><button class="btn accent wide" data-act="xReview" data-v="due">오늘 복습 시작 · ${due}개</button></div>` : `<p class="hint">오늘 복습할 표현이 없어요. ${ex.filter(e => e.status === 'new').length ? '새 표현을 익혀 볼까요?' : ''}</p>`}
    <p class="hint">시간이 없으면 복습만 해도 돼요.</p></div>`;
}
function dayHTML(k) {
  const rows = [];
  X().forEach(e => e.attempts.filter(a => a.day === k && a.type !== 'flash').forEach(a => rows.push({ e, a })));
  const mastered = X().filter(e => e.masteredAt === k);
  if (!rows.length && !mastered.length) return '';
  return `<div class="sec-title" style="margin-left:0">표현 학습</div><div class="card">${rows.map(({ e, a }) => `<div style="padding:6px 0;border-top:1px solid var(--line)"><div class="meta"><b>${esc(e.en)}</b>${a.result ? `<span class="tag">${RES[a.result]}</span>` : ''}</div><div style="font-size:14px">${esc(a.text)}</div>${a.audioId ? `<audio controls preload="none" data-aid="${esc(a.audioId)}"></audio>` : ''}</div>`).join('')}${mastered.length ? `<p class="note">🎉 숙달: ${mastered.map(e => esc(e.en)).join(', ')}</p>` : ''}</div>`;
}
function settingsHTML() {
  const s = setv();
  return `<div class="card"><h2>표현 복습</h2><p class="lbl">하루 새 표현 집중 학습</p><div class="chips">${[1, 2, 3].map(n => `<button class="chip ${s.newLimit === n ? 'on' : ''}" data-act="xSet" data-k="newLimit" data-v="${n}">${n}개</button>`).join('')}</div>
    <p class="lbl" style="margin-top:12px">복습 간격</p><div class="chips">${Object.keys(PRESETS).map(k => `<button class="chip ${s.srsPreset === k ? 'on' : ''}" data-act="xSet" data-k="srsPreset" data-v="${k}">${PRESETS[k].ko}</button>`).join('')}</div>
    <p class="lbl" style="margin-top:12px">한 번에 복습할 최대 개수</p><div class="chips">${[5, 10, 20].map(n => `<button class="chip ${s.reviewCap === n ? 'on' : ''}" data-act="xSet" data-k="reviewCap" data-v="${n}">${n}개</button>`).join('')}</div>
    <p class="hint">힌트 없이 성공하면 간격이 늘고, 힌트를 쓰면 같은 간격 반 정도로, 실패하면 다음 날 다시 나와요.</p></div>`;
}

/* ---------- actions ---------- */
function evByCtx(ctx) { return A.findEvalByCtx(ctx); }
const ACT = {
  kxSkip(el) { const ev = evByCtx(el.dataset.ctx); if (!ev) return; const arr = el.dataset.src === 'k' ? ev.key_expressions : ev.bridges; if (arr && arr[+el.dataset.i]) arr[+el.dataset.i].skip = true; save(); render(); },
  kxAdd(el) {
    const ctx = el.dataset.ctx; const ev = evByCtx(ctx); if (!ev) return;
    const k = kxList(ev).find(x => x.src === el.dataset.src && x.i === +el.dataset.i); if (!k) return;
    const src = A.findSrcByCtx(ctx) || {};
    const r = addExpr({ en: k.en, ko: k.ko, kind: k.kind, context: k.context, example: k.example, example_ko: k.example_ko, why: k.why, func: k.func, fromKo: k.fromKo, cat: src.cat || '', scenario: src.ko || src.situation || src.q || '', orig: ev.original || '', fixed: ev.essential || '', natural: ev.natural || ev.upgrade || '' });
    const raw = el.dataset.src === 'k' ? ev.key_expressions[k.i] : ev.bridges[k.i]; raw.saved = r.e.id; save(); render();
    if (r.dup) return;
    if (learnStartsToday() < (setv().newLimit || 2)) openSheet(`<h2 style="margin:0 0 6px">표현장에 추가했어요</h2><p style="margin:0;font-weight:800">${esc(r.e.en)}</p><p class="hint">지금 바로 익히면 기억에 훨씬 잘 남아요. 예문을 보고, 가린 채로 직접 말해 봐요. (3분 정도)</p><div class="row"><button class="btn ghost" data-act="closeSheet">나중에</button><button class="btn accent" data-act="xLearn" data-id="${r.e.id}">지금 익히기</button></div>`);
    else toast('오늘 집중할 새 표현 ' + setv().newLimit + '개를 다 채웠어요. 이 표현은 "새 표현"에 담아 뒀어요.');
  },
  xOpen(el) { closeSheet(); go('expr', { id: el.dataset.id }); },
  xF(el) { S.p[el.dataset.k] = el.dataset.v; render(); },
  xStar(el) { const e = byId(el.dataset.id); if (e) { e.star = !e.star; save(); render(); } },
  xSay(el) { Speech.speak(el.dataset.t, setv().rate); },
  async xDetail(el) { const e = byId(el.dataset.id); if (e) { await ensureDetail(e); render(); } },
  async xLearn(el) {
    closeSheet(); const e = byId(el.dataset.id); if (!e) return;
    if (e.status === 'new' && learnStartsToday() >= (setv().newLimit || 2) && !el.dataset.force) {
      openSheet(`<h2 style="margin:0 0 6px">오늘 새 표현 ${setv().newLimit}개를 이미 익혔어요</h2><p class="hint">하루에 너무 많이 익히면 복습이 쌓여서 기억에 덜 남아요. 그래도 지금 할까요?</p><div class="row"><button class="btn ghost" data-act="closeSheet">내일 할게요</button><button class="btn" data-act="xLearn" data-id="${e.id}" data-force="1">그래도 하기</button></div>`);
      return;
    }
    if (e.status === 'new') { e.status = 'learning'; e.learnStartedAt = today(); save(); }
    A.timerAuto();
    Object.keys(S.xs).forEach(k => { if (k.indexOf(e.id) >= 0 && k.startsWith('xl')) delete S.xs[k]; });
    go('xlearn', { id: e.id, step: 'understand' });
    await ensureDetail(e, 'xl' + e.id); render();
  },
  xStep(el) {
    const e = byId(S.p.id); const v = el.dataset.v;
    if (v === 'done' && e) finishLearn(e);
    S.p.step = v; S.rec = null; S.shownAt = performance.now(); render(); window.scrollTo(0, 0);
  },
  xHint(el) { const st = S.xs[el.dataset.k]; if (st) { st.hints = Math.min(3, st.hints + 1); render(); } },
  xRetry(el) { const st = S.xs[el.dataset.k]; if (st) { st.r = null; S.rec = null; S.shownAt = performance.now(); render(); } },
  async xReview(el) { closeSheet(); A.timerAuto(); await startReview(el.dataset.v || 'due'); },
  async xReviewOne(el) { A.timerAuto(); await startReview('one', [el.dataset.id]); },
  xRevNext() { S.p.i++; S.rec = null; S.shownAt = performance.now(); render(); window.scrollTo(0, 0); },
  xFlash() { go('xflash', {}); },
  xFlashShow() { S.p.show = true; render(); const e = byId(S.p.q[S.p.i]); if (e) Speech.speak(e.en, setv().rate); },
  xFlashMark(el) { const e = byId(S.p.q[S.p.i]); if (e) { e.attempts.push({ id: uid(), type: 'flash', day: today(), at: Date.now(), self: el.dataset.v === '1' }); save(); } S.p.i++; S.p.show = false; render(); },
  xAddOpen() { openSheet(`<h2 style="margin:0 0 8px">표현 직접 추가</h2><input type="text" id="xa-en" placeholder="영어 표현 (예: I had no way of knowing…)"><input type="text" id="xa-ko" placeholder="한국어 뜻" style="margin-top:8px"><select id="xa-fn" style="margin-top:8px"><option value="">기능 선택 (선택)</option>${FUNCS.map(f => `<option>${esc(f)}</option>`).join('')}</select><div class="row"><button class="btn ghost" data-act="closeSheet">취소</button><button class="btn" data-act="xAdd">추가</button></div>`); },
  xAdd() {
    const en = (document.getElementById('xa-en').value || '').trim(); if (!en) { toast('영어 표현을 적어 주세요.'); return; }
    const r = addExpr({ en, ko: (document.getElementById('xa-ko').value || '').trim(), func: document.getElementById('xa-fn').value });
    closeSheet(); if (!r.dup) go('expr', { id: r.e.id });
  },
  xEdit(el) {
    const e = byId(el.dataset.id); if (!e) return;
    openSheet(`<h2 style="margin:0 0 8px">수정</h2><p class="lbl">영어 표현</p><input type="text" id="xe-en" value="${esc(e.en)}"><p class="lbl" style="margin-top:8px">한국어 뜻</p><input type="text" id="xe-ko" value="${esc(e.ko)}">
      <p class="lbl" style="margin-top:8px">기능</p><select id="xe-fn"><option value="">–</option>${FUNCS.map(f => `<option ${e.func === f ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select>
      <p class="lbl" style="margin-top:8px">상황</p><select id="xe-cat"><option value="">–</option>${D.categories.map(c => `<option value="${c.id}" ${e.cat === c.id ? 'selected' : ''}>${esc(c.ko)}</option>`).join('')}</select>
      <div class="row"><button class="btn" data-act="xEditSave" data-id="${e.id}">저장</button></div><div class="divider"></div>
      <button class="btn sm ghost" style="color:var(--work)" data-act="xDelAsk" data-id="${e.id}">이 표현 삭제</button>`);
  },
  xEditSave(el) { const e = byId(el.dataset.id); if (!e) return; const v = (id) => (document.getElementById(id).value || '').trim(); e.en = v('xe-en') || e.en; e.ko = v('xe-ko'); e.func = v('xe-fn'); e.cat = v('xe-cat'); save(); closeSheet(); render(); },
  xDelAsk(el) { openSheet(`<h2 style="margin:0 0 8px">이 표현을 삭제할까요?</h2><p class="hint">설명, 예문, 응용 기록이 모두 지워지고 되돌릴 수 없어요.</p><div class="row"><button class="btn ghost" data-act="closeSheet">취소</button><button class="btn" style="background:var(--work)" data-act="xDel" data-id="${el.dataset.id}">삭제</button></div>`); },
  xDel(el) { S.data.exprs = X().filter(e => e.id !== el.dataset.id); save(); closeSheet(); go('bank', {}, false); },
  xSet(el) { const k = el.dataset.k; setv()[k] = k === 'srsPreset' ? el.dataset.v : Number(el.dataset.v); save(); render(); }
};
document.addEventListener('input', (ev) => { if (ev.target.id === 'xq') { S.p.q = ev.target.value; clearTimeout(S._xq); S._xq = setTimeout(() => { const pos = ev.target.selectionStart; render(); const el = document.getElementById('xq'); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (x) {} } }, 250); } });

S.xs = S.xs || {};
A.register({
  views: { bank: vBank, expr: vExpr, xlearn: vLearn, xrev: vRev, xflash: vFlash },
  tabs: { bank: 'bank', expr: 'bank', xlearn: 'bank', xrev: 'bank', xflash: 'bank' },
  modes: { xlearn: 'common', xrev: 'common' },
  actions: ACT,
  migrate, keyExprHTML, myExprList, rpTargets, recordUsage, homeCard, dayHTML, settingsHTML,
  dueCount: () => X().filter(isDue).length
});
});
