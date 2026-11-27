/* Pixie Speaking Studio — UI */
(function () {
'use strict';
const D = window.PSS_DATA, P = window.PSS_PROMPTS;
const { Store, Rec, Speech, AI } = window.PSS;

/* ---------- helpers ---------- */
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = (n) => String(n).padStart(2, '0');
const dkey = (d) => { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const today = () => dkey();
const catOf = (id) => D.categories.find(c => c.id === id) || { ko: id, icon: '•' };
const typeKo = (id) => (D.opicTypes.find(t => t.id === id) || { ko: id === 'intro' ? '자기소개' : id }).ko;
const sec = (ms) => ms == null ? '–' : (ms / 1000).toFixed(1) + '초';
const fmtMin = (s) => { s = Math.round(s || 0); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? h + '시간 ' + m + '분' : m + '분'; };
const clock = (s) => { s = Math.floor(s || 0); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + pad(m) : m) + ':' + pad(x); };
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const hasHangul = (t) => /[가-힣]/.test(t || '');
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return dkey(d); };

const ICON = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>',
  cap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z"/><path d="M4 17a3 3 0 0 1 3-3h11"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2.5"/></svg>'
};

/* ---------- state ---------- */
const DEFAULT = () => ({
  v: 1,
  settings: { apiKey: '', evalModel: 'claude-sonnet-5-5', chatModel: 'claude-haiku-5-5', examDate: '', topics: ['home', 'running', 'travel', 'cafe', 'tech'], rate: 0.95, keepAudio: null, setupDone: false },
  days: {}, exprs: [], drafts: {}, catCursor: 0, recent: [],
  timer: { running: false }
});
const S = { view: 'home', p: {}, data: DEFAULT(), rec: null, busy: {}, err: {}, calMonth: null, sheet: null, shownAt: performance.now(), stack: [] };
const speakHandlers = {};
const EXT = { actions: {}, keyExprHTML: () => '', myExprList: () => [], rpTargets: () => [], recordUsage: () => {}, homeCard: () => '', dayHTML: () => '', settingsHTML: () => '', migrate: () => {}, dueCount: () => 0 };

let saveT = null;
function save(now) {
  clearTimeout(saveT);
  const run = () => Store.set('data', JSON.parse(JSON.stringify(S.data))).catch(() => toast('저장에 실패했어요. 저장공간을 확인해 주세요.'));
  if (now) return run();
  saveT = setTimeout(run, 400);
}
function day(k) {
  k = k || today();
  const d = S.data.days[k] || (S.data.days[k] = { date: k, secs: { real: 0, opic: 0, common: 0 }, problems: [], log: [] });
  d.secs = d.secs || { real: 0, opic: 0, common: 0 };
  return d;
}
function syncAI() {
  const s = S.data.settings;
  AI.key = (s.apiKey || '').trim(); AI.evalModel = s.evalModel || 'claude-sonnet-5-5'; AI.chatModel = s.chatModel || 'claude-haiku-5-5';
}

/* ---------- navigation ---------- */
const MODE_OF = { real: 'real', prob: 'real', spont: 'real', finish: 'real', rp: 'real', review: 'real', opic: 'opic', oq: 'opic', mock: 'opic' };
function go(view, p, push) {
  if (S.rec && S.rec.phase === 'rec') { toast('녹음을 먼저 끝내 주세요.'); return; }
  if (push !== false && S.view !== view) S.stack.push({ view: S.view, p: S.p });
  if (S.stack.length > 30) S.stack.shift();
  S.view = view; S.p = p || {}; S.rec = null; S.shownAt = performance.now(); Speech.stop();
  render(); window.scrollTo(0, 0);
}
function back(fallback) {
  const prev = S.stack.pop();
  if (prev) go(prev.view, prev.p, false); else go(fallback || 'home', {}, false);
}

/* ---------- toast / sheet ---------- */
let toastT;
function toast(msg) {
  let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.style.display = 'block';
  clearTimeout(toastT); toastT = setTimeout(() => { t.style.display = 'none'; }, 2600);
}
function openSheet(html) { S.sheet = html; renderSheet(); }
function closeSheet() { S.sheet = null; renderSheet(); }
function renderSheet() {
  let el = $('#sheet');
  if (!S.sheet) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'sheet'; document.body.appendChild(el); }
  el.innerHTML = `<div class="dim-bg" data-act="sheetBg"><div class="sheet" role="dialog"><div class="sheet-top"><div class="grab"></div><button class="sheet-x" data-act="closeSheet" aria-label="닫기">✕</button></div>${S.sheet}</div></div>`;
  hydrate(el);
}

/* ---------- timer ---------- */
let lastTick = Date.now();
setInterval(() => {
  const now = Date.now(), dt = Math.min(5, (now - lastTick) / 1000); lastTick = now;
  const t = S.data.timer;
  if (!t.running || document.hidden) return;
  const d = day(); const m = MODE_OF[S.view] || 'common';
  d.secs[m] = (d.secs[m] || 0) + dt;
  const el = $('#clock'); if (el) el.firstChild.nodeValue = clock(totalSecs(d));
  if (Math.random() < 0.1) save();
}, 1000);
const totalSecs = (d) => d ? (d.secs.real || 0) + (d.secs.opic || 0) + (d.secs.common || 0) : 0;
function timerAuto() { if (!S.data.timer.running && !S.data.timer.paused) { S.data.timer.running = true; save(); } }

/* ---------- AI wrapper ---------- */
async function runAI(key, fn) {
  if (S.busy[key]) return null;
  S.busy[key] = true; S.err[key] = null; render();
  try { return await fn(); }
  catch (e) { S.err[key] = e.code === 'nokey' ? 'nokey' : (e.message || '오류가 났어요'); return null; }
  finally { S.busy[key] = false; render(); }
}
function errBox(key, copyText) {
  const e = S.err[key]; if (!e) return '';
  if (e === 'nokey') return `<div class="warn">AI 평가는 <b>설정에서 API 키</b>를 넣어야 쓸 수 있어요. ${copyText ? 'Claude 앱에 붙여넣어 평가받을 수도 있어요.' : ''}<div class="row"><button class="btn sm" data-act="go" data-v="settings">API 키 넣기</button>${copyText ? `<button class="btn sm ghost" data-act="copyPrompt" data-k="${esc(key)}">Claude 앱용 복사</button>` : ''}</div></div>`;
  return `<div class="err">${esc(e)}</div>`;
}
const copyStore = {};
function promptText(p) { return (p.system ? p.system + '\n\n' : '') + p.messages.map(m => m.content).join('\n\n'); }

/* ---------- daily problems ---------- */
function pickCats() {
  const n = D.categories.length; const c = S.data.catCursor || 0;
  const cats = []; for (let i = 0; i < 5; i++) cats.push(D.categories[(c + i) % n]);
  return cats;
}
function seedFor(cats) {
  return cats.map((c, i) => {
    const kind = i < 3 ? 'general' : 'tricky';
    const s = D.seedProblems.find(x => x.cat === c.id && x.kind === kind) || D.seedProblems.find(x => x.cat === c.id);
    return { id: uid(), cat: c.id, kind, ko: s.ko, role: s.role, write: null, speaks: [], status: 'todo', src: 'seed' };
  });
}
async function makeToday(force) {
  const d = day();
  if (d.problems.length && !force) return;
  const cats = pickCats();
  let probs = null;
  if (AI.key) {
    probs = await runAI('gen', async () => {
      const j = await AI.json(Object.assign(P.dailyProblems({ cats, recent: S.data.recent }), { model: AI.chatModel }));
      const arr = (j.problems || []).filter(p => p && p.ko).slice(0, 5);
      if (arr.length < 5) throw new Error('문제를 다 만들지 못했어요');
      return arr.map((p, i) => ({ id: uid(), cat: cats[i] ? cats[i].id : p.cat, kind: i < 3 ? 'general' : 'tricky', ko: String(p.ko), role: String(p.role || 'staff member'), write: null, speaks: [], status: 'todo', src: 'ai' }));
    });
  }
  if (!probs) probs = seedFor(cats);
  d.problems = probs;
  S.data.catCursor = ((S.data.catCursor || 0) + 5) % D.categories.length;
  S.data.recent = probs.map(p => p.ko.slice(0, 40)).concat(S.data.recent || []).slice(0, 60);
  timerAuto(); save(); render();
}

/* ---------- stats ---------- */
function allAttempts(filterDays) {
  const out = [];
  for (const k in S.data.days) {
    if (filterDays && !filterDays(k)) continue;
    const d = S.data.days[k];
    (d.oldProblems || []).concat(d.problems).forEach(p => (p.speaks || []).forEach(a => out.push(Object.assign({ day: k, kind: 'real' }, a))));
    d.log.forEach(l => {
      (l.attempts || []).forEach(a => out.push(Object.assign({ day: k, kind: l.type }, a)));
      if (l.type === 'mock') (l.items || []).forEach(it => it.attempt && out.push(Object.assign({ day: k, kind: 'mock' }, it.attempt)));
    });
  }
  return out;
}
function weekRange(offset) { const d = new Date(); d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1) - 7 * offset); const s = dkey(d); d.setDate(d.getDate() + 6); return [s, dkey(d)]; }
function weekStats(offset) {
  const [a, b] = weekRange(offset);
  const at = allAttempts(k => k >= a && k <= b).filter(x => x.eval);
  const comp = at.filter(x => x.eval.completed != null || (x.eval.dims && x.eval.dims.ending));
  const done = comp.filter(x => x.eval.completed === true || (x.eval.dims && x.eval.dims.ending === 'good')).length;
  const re = at.filter(x => x.firstMs != null);
  const react = re.length ? re.reduce((s, x) => s + (x.thinkMs || 0) + x.firstMs, 0) / re.length : null;
  let secs = 0; for (const k in S.data.days) if (k >= a && k <= b) secs += totalSecs(S.data.days[k]);
  return { n: at.length, compRate: comp.length ? Math.round(done / comp.length * 100) : null, react, secs };
}
function weakCounts() {
  const c = {}; const from = addDays(-30);
  allAttempts(k => k >= from).forEach(a => (a.eval && a.eval.weak_tags || []).forEach(t => { c[t] = (c[t] || 0) + 1; }));
  for (const k in S.data.days) if (k >= from) S.data.days[k].log.forEach(l => { if (l.feedback) (l.feedback.weak_tags || []).forEach(t => { c[t] = (c[t] || 0) + 1; }); if (l.report) (l.report.weak_tags || []).forEach(t => { c[t] = (c[t] || 0) + 1; }); });
  return Object.entries(c).sort((a, b) => b[1] - a[1]);
}
function streak() {
  let n = 0; const d = new Date();
  for (;;) { const k = dkey(d); const x = S.data.days[k]; const act = x && (totalSecs(x) > 30 || x.problems.some(p => p.status === 'done') || x.log.length); if (!act) { if (n === 0 && k === today()) { d.setDate(d.getDate() - 1); continue; } break; } n++; d.setDate(d.getDate() - 1); }
  return n;
}

function dday() { const e = S.data.settings.examDate; if (!e) return null; const a = new Date(e + 'T00:00:00'), b = new Date(today() + 'T00:00:00'); return Math.round((a - b) / 86400000); }

/* ---------- speak component ---------- */
function speakUI(key, opts) {
  opts = opts || {};
  speakHandlers[key] = opts;
  const r = S.rec && S.rec.key === key ? S.rec : null;
  const busy = S.busy[key];
  if (!r || r.phase === 'idle') {
    if (r && r.error === 'denied' || r && r.mode === 'type') return typeUI(key, opts, r);
    return `<div class="rec">
      <button class="micbtn" data-act="recStart" data-k="${esc(key)}" aria-label="녹음 시작">${ICON.mic}</button>
      <div class="recstat">${esc(opts.readyLabel || '준비되면 눌러서 말하기')}</div>
      ${Rec.supported ? '' : '<div class="warn">이 브라우저는 녹음을 지원하지 않아요. 키보드 마이크로 말하는 방식으로 바꿀게요.</div>'}
      <button class="link" data-act="typeMode" data-k="${esc(key)}">마이크 대신 키보드로 말하기</button>
    </div>`;
  }
  if (r.phase === 'rec') {
    return `<div class="rec">
      <div class="wave" id="wave">${'<i></i>'.repeat(18)}</div>
      <button class="micbtn stop" data-act="recStop" data-k="${esc(key)}" aria-label="말하기 끝">${ICON.stop}</button>
      <div class="recstat"><span class="dot on"></span><span id="rect">0:00</span> · 다 말했으면 눌러요</div>
      <div class="live" id="live">${esc(r.live || (Rec.sttSupported ? '듣고 있어요…' : '이 브라우저는 실시간 받아쓰기를 지원하지 않아요. 녹음은 되고 있어요.'))}</div>
      <p class="hint">잠깐 멈춰도 괜찮아요. 침묵으로 끝내지 않고, 버튼을 눌러야 끝나요. 녹음 중에 앱을 나가면 그 녹음은 복구되지 않을 수 있어요.</p>
    </div>`;
  }
  // done
  const a = r.result;
  return `<div>
    ${a.audioUrl ? `<p class="lbl">내 녹음</p><audio controls preload="metadata" src="${a.audioUrl}"></audio>` : ''}
    ${a.saved === false && a.audioUrl ? '<p class="hint">녹음 파일은 저장하지 않는 설정이라 이 화면을 벗어나면 사라져요.</p>' : ''}
    <p class="lbl" style="margin-top:10px">받아쓴 내용 <span class="muted">· 잘못 들린 단어만 고쳐 주세요 (영어 실수는 그대로)</span></p>
    <textarea id="tx-${esc(key)}" data-k="${esc(key)}" class="txedit" placeholder="${Rec.sttSupported ? '인식된 문장이 없어요. 녹음을 듣고 말한 그대로 적거나, 키보드 마이크로 다시 말해 주세요.' : '녹음을 듣고 말한 그대로 적거나, 키보드의 마이크 버튼으로 말해 주세요.'}">${esc(a.transcript)}</textarea>
    <div class="meta" style="margin-top:6px">반응 ${sec((a.thinkMs || 0) + (a.firstMs || 0))} · 말한 시간 ${sec(a.durMs)} · 중간 멈춤 ${sec(a.silenceMs)}</div>
    ${a.sttError && !a.transcript ? `<div class="warn">음성 인식이 동작하지 않았어요 (${esc(a.sttError)}). 녹음은 저장됐으니 들으면서 적어 주세요.</div>` : ''}
    <div class="row">
      <button class="btn ghost" data-act="recRedo" data-k="${esc(key)}">다시 말하기</button>
      <button class="btn accent" data-act="recSubmit" data-k="${esc(key)}" ${busy ? 'disabled' : ''}>${busy ? '평가 중…' : esc(opts.submitLabel || '평가받기')}</button>
    </div>
    ${errBox(key, true)}
  </div>`;
}
function typeUI(key, opts, r) {
  const started = r && r.typeStart;
  return `<div>
    ${r && r.error === 'denied' ? '<div class="warn">마이크 권한이 없어서 녹음을 할 수 없어요. 아이폰 설정 &gt; Safari &gt; 마이크에서 허용하면 녹음할 수 있어요. 지금은 키보드 마이크로 말해 주세요.</div>' : ''}
    <p class="lbl" style="margin-top:8px">키보드의 🎤 버튼을 눌러 영어로 말해요 (키보드 언어를 English로)</p>
    <textarea id="tx-${esc(key)}" data-k="${esc(key)}" class="typein" placeholder="여기를 누르고 키보드 마이크로 말하기">${esc(r && r.typed || '')}</textarea>
    <p class="hint">${started ? '말하기를 시작했어요.' : '준비 시간은 이 칸을 처음 누른 뒤 첫 글자가 나올 때까지로 재요.'} 이 방식은 녹음 파일이 남지 않아요.</p>
    <div class="row">
      <button class="btn ghost" data-act="micMode" data-k="${esc(key)}">녹음 방식으로</button>
      <button class="btn accent" data-act="typeSubmit" data-k="${esc(key)}" ${S.busy[key] ? 'disabled' : ''}>${S.busy[key] ? '평가 중…' : esc(opts.submitLabel || '다 말했어요 · 평가받기')}</button>
    </div>
    ${errBox(key, true)}
  </div>`;
}

let recTimer = null;
async function recStart(key) {
  const s = S.data.settings;
  if (s.keepAudio == null) { askConsent(() => recStart(key)); return; }
  Speech.stop();
  const thinkMs = Math.round(performance.now() - S.shownAt);
  S.rec = { key, phase: 'rec', live: '', thinkMs, t0: Date.now() };
  render();
  try {
    await Rec.start({
      onText: (t) => { if (S.rec && S.rec.key === key) { S.rec.live = t; const el = $('#live'); if (el) el.textContent = t || '듣고 있어요…'; } },
      onLevel: (lv) => { const w = $('#wave'); if (!w) return; const bars = w.children; for (let i = bars.length - 1; i > 0; i--) bars[i].style.height = bars[i - 1].style.height; bars[0].style.height = Math.max(6, Math.round(lv * 40)) + 'px'; }
    });
    timerAuto();
    clearInterval(recTimer);
    recTimer = setInterval(() => { const el = $('#rect'); if (el && S.rec) el.textContent = clock((Date.now() - S.rec.t0) / 1000); }, 500);
  } catch (e) {
    S.rec = { key, phase: 'idle', error: e.code === 'denied' ? 'denied' : 'nomic', mode: 'type' };
    render();
  }
}
async function recStop(key) {
  clearInterval(recTimer);
  const r = await Rec.stop();
  if (!S.rec || S.rec.key !== key || !r) return;
  const keep = S.data.settings.keepAudio === true;
  const id = 'a_' + uid();
  let saved = false;
  if (keep && r.blob && r.blob.size) {
    try { await Store.audioPut(id, { blob: r.blob, mime: r.mime, at: Date.now(), day: today() }); saved = true; }
    catch (e) { toast('녹음 저장에 실패했어요. 기기 저장공간을 확인해 주세요.'); }
  }
  const url = r.blob && r.blob.size ? URL.createObjectURL(r.blob) : null;
  S.rec.phase = 'done';
  S.rec.result = { id: uid(), at: Date.now(), audioId: saved ? id : null, audioUrl: url, saved, transcript: r.transcript, sttRaw: r.transcript, sttUsed: r.sttUsed, sttError: r.sttError, firstMs: r.firstMs, durMs: r.durMs, silenceMs: r.silenceMs, longPauses: r.longPauses, thinkMs: S.rec.thinkMs, retries: S.rec.retries || 0 };
  render();
}
function recRedo(key) {
  const n = S.rec && S.rec.key === key ? (S.rec.retries || 0) + 1 : 0;
  const r = S.rec && S.rec.result;
  if (r && r.audioId && !r.submitted) Store.audioDel(r.audioId).catch(() => {});
  S.rec = { key, phase: 'idle', retries: n }; S.shownAt = performance.now(); render();
}
async function recSubmit(key) {
  const h = speakHandlers[key]; if (!h || !S.rec) return;
  const a = S.rec.result; if (!a) return;
  const ta = document.getElementById('tx-' + key);
  a.transcript = (ta ? ta.value : a.transcript).trim();
  a.edited = a.transcript !== (a.sttRaw || '');
  if (!a.transcript) { toast('말한 내용이 비어 있어요. 녹음을 듣고 적거나 다시 말해 주세요.'); return; }
  a.submitted = true;
  const att = Object.assign({}, a); delete att.audioUrl;
  await h.onSubmit(att, key);
}
async function typeSubmit(key) {
  const h = speakHandlers[key]; if (!h) return;
  const ta = document.getElementById('tx-' + key);
  const text = (ta ? ta.value : '').trim();
  if (!text) { toast('말한 내용이 비어 있어요.'); return; }
  const r = S.rec || {};
  const now = performance.now();
  const att = { id: uid(), at: Date.now(), audioId: null, transcript: text, sttRaw: text, typed: true, thinkMs: r.focusAt ? Math.round(r.focusAt - S.shownAt) : null, firstMs: r.typeStart && r.focusAt ? Math.round(r.typeStart - r.focusAt) : null, durMs: r.typeStart ? Math.round(now - r.typeStart) : 0, silenceMs: 0, longPauses: 0, retries: 0 };
  S.rec.typed = text;
  await h.onSubmit(att, key);
}
function askConsent(then) {
  openSheet(`<h2 style="margin:0 0 8px">녹음 파일을 저장할까요?</h2>
    <p class="hint" style="font-size:14.5px">녹음은 <b>이 폰 안에만</b> 저장되고, 서버로 보내지 않아요. AI 평가에는 받아쓴 글자만 보내요. 저장해 두면 달력에서 날짜별로 다시 들을 수 있고, 설정에서 언제든 지울 수 있어요.</p>
    <div class="row"><button class="btn ghost" data-act="consent" data-v="no">저장 안 함</button><button class="btn accent" data-act="consent" data-v="yes">저장할게요</button></div>`);
  S.afterConsent = then;
}

/* ---------- eval cards ---------- */
const DIMK = { meaning: '의미 전달', situation: '상황 대응', completion: '문장 완결', clarity: '요청 명확', spontaneity: '즉흥 반응', fluency: '발화 흐름', relevance: '질문 적합', detail: '구체성', structure: '시작·전개·끝', tense: '시제', connectors: '연결어', recovery: '자기 수정 후 회복', ending: '마무리' };
const DIMV = { good: ['●', '좋아요'], ok: ['◐', '보통'], work: ['○', '연습 필요'] };
const VK = { PASS: ['PASS', '의도가 분명하게 전달돼요'], PASS_FIX: ['PASS + 교정', '전달은 되지만 고칠 부분이 있어요'], ALMOST: ['거의 됐어요', '주제는 맞지만 전개를 더 채워요'], RETRY: ['RETRY', '다시 말해 볼까요'] };
function dimsHTML(dims) {
  if (!dims) return '';
  return `<div class="dims">${Object.keys(dims).filter(k => dims[k] && DIMK[k]).map(k => { const v = DIMV[dims[k]] || ['·', dims[k]]; return `<div class="dim d-${esc(dims[k])}"><b>${v[0]}</b>${esc(DIMK[k])}</div>`; }).join('')}</div>`;
}
function verdictHTML(ev) {
  const v = VK[ev.verdict] || [ev.verdict, ''];
  return `<div class="verdict v-${esc(ev.verdict)}"><div>${esc(v[0])}<small>${esc(ev.verdict_reason || v[1])}</small></div></div>`;
}
function sttHTML(ev) {
  const s = (ev.stt_suspects || []).filter(x => x && x.heard);
  if (!s.length) return '';
  return `<p class="note">🎧 음성 인식 오류로 보이는 부분 (실력 감점 아님): ${s.map(x => `"${esc(x.heard)}" → "${esc(x.likely)}"`).join(', ')}</p>`;
}
function realEvalHTML(ev, ctx, opts) {
  opts = opts || {};
  if (!ev) return '';
  return `<div class="card">
    ${verdictHTML(ev)}
    ${dimsHTML(ev.dims)}
    ${ev.completion_note ? `<p class="note"><b>끝맺음</b> ${esc(ev.completion_note)}</p>` : ''}
    <div class="cmp">
      <div><div class="k">MY ORIGINAL</div><div class="v">${esc(ev.original)}</div></div>
      ${ev.essential && ev.essential !== ev.original ? `<div><div class="k">ESSENTIAL CORRECTION</div><div class="v">${esc(ev.essential)}</div></div>` : ''}
      ${opts.hideNatural ? `<div class="nat"><div class="k">NATURAL ALTERNATIVE</div><div class="v muted">숨김 · 내 말로 다시 말한 뒤에 보여요</div></div>` :
      `<details class="nat" ${opts.openNatural ? 'open' : ''}><summary class="k" style="color:var(--indigo)">NATURAL ALTERNATIVE · 눌러서 보기</summary><div class="v">${esc(ev.natural)}</div>${ev.natural_note ? `<p class="note">${esc(ev.natural_note)}</p>` : ''}</details>`}
    </div>
    ${sttHTML(ev)}
    ${ev.tip ? `<p class="note" style="margin-top:10px">👉 ${esc(ev.tip)}</p>` : ''}
    ${EXT.keyExprHTML(ev, ctx)}
  </div>`;
}
function opicEvalHTML(ev, ctx) {
  if (!ev) return '';
  return `<div class="card">
    ${verdictHTML(ev)}
    ${dimsHTML(ev.dims)}
    ${ev.length_note ? `<p class="note"><b>전개</b> ${esc(ev.length_note)}</p>` : ''}
    ${ev.strengths ? `<p class="note"><b>잘한 점</b> ${esc(ev.strengths)}</p>` : ''}
    ${(ev.fixes || []).length ? `<p class="lbl" style="margin-top:12px">핵심 교정</p><ul class="fixlist">${ev.fixes.map(f => `<li><s>${esc(f.original)}</s><br><span class="b">${esc(f.better)}</span>${f.why ? `<div class="note">${esc(f.why)}</div>` : ''}</li>`).join('')}</ul>` : ''}
    ${ev.upgrade ? `<details style="margin-top:10px"><summary>내 답변을 더 자연스럽게 (눌러서 보기)</summary><div class="hintbox">${esc(ev.upgrade)}</div></details>` : ''}
    ${sttHTML(ev)}
    ${ev.tip ? `<p class="note" style="margin-top:10px">👉 ${esc(ev.tip)}</p>` : ''}
    ${EXT.keyExprHTML(ev, ctx)}
    <p class="hint" style="margin-top:8px">연습용 평가예요. 실제 OPIc 등급과는 달라요.</p>
  </div>`;
}
function attemptLine(a, label) {
  return `<div style="padding:8px 0;border-top:1px solid var(--line)">
    <div class="meta"><b>${esc(label || '')}</b>${a.eval ? `<span class="tag">${esc((VK[a.eval.verdict] || [a.eval.verdict])[0])}</span>` : ''}<span>반응 ${sec((a.thinkMs || 0) + (a.firstMs || 0))}</span><span>말한 시간 ${sec(a.durMs)}</span></div>
    <div style="font-size:14.5px;margin-top:4px">${esc(a.transcript)}</div>
    ${a.audioId ? `<audio controls preload="none" data-aid="${esc(a.audioId)}"></audio>` : ''}
  </div>`;
}

/* ---------- views ---------- */
function topBar(title, sub, noBack) {
  return `<div class="top">${noBack ? '' : '<button class="back" data-act="back" aria-label="뒤로">‹</button>'}<h1>${esc(title)}</h1>${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</div>`;
}

function vHome() {
  const d = day(); const s = S.data.settings;
  const dd = dday();
  const probsDone = d.problems.filter(p => p.status === 'done').length;
  const w0 = weekStats(0), w1 = weekStats(1);
  const weak = weakCounts().slice(0, 5); const wmax = weak.length ? weak[0][1] : 1;
  const t = S.data.timer;
  let h = `<div class="top"><div style="flex:1"><div class="brand">Pixie Speaking Studio</div><h1>오늘도 끝까지 말해 봐요</h1></div></div>`;
  if (!s.apiKey && !s.setupDone) {
    h += `<div class="card" style="background:var(--indigoBg)"><h2>처음이에요?</h2><p class="hint" style="color:var(--ink)">AI 평가와 롤플레이는 Anthropic API 키가 있어야 돼요. 키 없이도 녹음과 받아쓰기, 기록은 쓸 수 있어요.</p>
      <div class="row"><button class="btn indigo" data-act="go" data-v="settings">API 키 넣기</button><button class="btn line" data-act="skipSetup">나중에</button></div></div>`;
  }
  h += `<div class="modes">
    <button class="mode real" data-act="go" data-v="real"><svg class="deco" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>
      <span class="s">MODE 1</span><span class="t">Real-Life<br>Speaking</span><span class="s">실전 상황 영어 · B2+</span>
      <span class="big">${probsDone}/5<small>오늘 문제</small></span></button>
    <button class="mode opic" data-act="go" data-v="opic"><svg class="deco" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/></svg>
      <span class="s">MODE 2</span><span class="t">OPIc AL<br>Studio</span><span class="s">오픽 발화 훈련</span>
      <span class="big">${dd == null ? '시험일<small>설정</small>' : dd >= 0 ? 'D-' + dd : '시험 끝'}${dd != null && dd >= 0 ? '<small>목표 AL</small>' : ''}</span></button>
  </div>`;
  h += `<div class="card"><div class="timer">
      <div class="clock" id="clock">${clock(totalSecs(d))}<small><span class="dot ${t.running ? 'on' : ''}"></span>${t.running ? '학습 중' : t.paused ? '일시정지' : '오늘 학습 시간'} · 실전 ${fmtMin(d.secs.real)} · OPIc ${fmtMin(d.secs.opic)}</small></div>
      ${t.running ? `<button class="btn sm ghost" data-act="timer" data-v="pause">일시정지</button><button class="btn sm" data-act="timer" data-v="end">종료</button>` : `<button class="btn sm accent" data-act="timer" data-v="start">${t.paused ? '다시 시작' : '학습 시작'}</button>`}
    </div><p class="hint">연습을 시작하면 자동으로 켜져요. 화면을 벗어나 있는 동안은 세지 않아요.</p></div>`;

  h += `<div class="card"><h2>이번 주 변화</h2><div class="stats">
    <div class="stat"><b>${w0.compRate == null ? '–' : w0.compRate + '%'}</b><span>문장 완결</span>${trend(w0.compRate, w1.compRate, true, '%p')}</div>
    <div class="stat"><b>${w0.react == null ? '–' : (w0.react / 1000).toFixed(1) + '초'}</b><span>평균 반응</span>${trend(w0.react && w0.react / 1000, w1.react && w1.react / 1000, false, '초')}</div>
    <div class="stat"><b>${fmtMin(w0.secs)}</b><span>학습 시간</span>${trend(w0.secs / 60, w1.secs / 60, true, '분')}</div>
  </div><p class="hint">지난주와 비교한 내 기록이에요. 빠른 것보다 끝까지 말하는 게 먼저예요.</p></div>`;

  h += calendarHTML();

  h += `<div class="card"><div style="display:flex;align-items:center"><h2 style="flex:1;margin:0">반복 약점</h2><span class="hint" style="margin:0">최근 30일</span></div>
    ${weak.length ? `<div class="bars">${weak.map(([k, v]) => `<div class="bar"><span>${esc(k)}</span><i style="width:${Math.max(8, Math.round(v / wmax * 100))}%;max-width:calc(100% - 140px)"></i><em>${v}회</em></div>`).join('')}</div>` : '<p class="hint">평가를 받으면 자주 나오는 약점이 여기에 쌓여요.</p>'}
  </div>`;
  h += EXT.homeCard();
  return h;
}
function trend(a, b, upGood, unit) {
  if (a == null || b == null || !isFinite(a) || !isFinite(b)) return '';
  const d = Math.round((a - b) * 10) / 10; if (!d) return '<div class="trend">지난주와 같아요</div>';
  const good = upGood ? d > 0 : d < 0;
  return `<div class="trend ${good ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${Math.abs(d)}${unit}</div>`;
}
function calendarHTML() {
  const m = S.calMonth || (S.calMonth = today().slice(0, 7));
  const [y, mo] = m.split('-').map(Number);
  const first = new Date(y, mo - 1, 1); const days = new Date(y, mo, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  let cells = '';
  for (let i = 0; i < lead; i++) cells += '<button class="empty" tabindex="-1"></button>';
  for (let i = 1; i <= days; i++) {
    const k = y + '-' + pad(mo) + '-' + pad(i); const d = S.data.days[k];
    const mins = d ? totalSecs(d) / 60 : 0;
    const act = d && (mins > 0.5 || d.log.length || d.problems.some(p => p.status === 'done'));
    const lv = !act ? '' : mins >= 30 ? 'l3' : mins >= 15 ? 'l2' : 'l1';
    const rp = d && d.log.some(l => l.type === 'roleplay' && l.feedback);
    cells += `<button class="${lv} ${k === today() ? 'today' : ''}" data-act="dayOpen" data-v="${k}" aria-label="${mo}월 ${i}일">${i}${rp ? '<span class="pd"></span>' : ''}</button>`;
  }
  return `<div class="card"><div class="cal-head"><button data-act="cal" data-v="-1" aria-label="이전 달">‹</button><b>${y}년 ${mo}월 학습 기록</b><button data-act="cal" data-v="1" aria-label="다음 달">›</button></div>
    <div class="cal">${['월', '화', '수', '목', '금', '토', '일'].map(w => `<div class="w">${w}</div>`).join('')}${cells}</div>
    <p class="hint">진할수록 오래 공부한 날 · 빨간 점은 롤플레이 완료 · 날짜를 누르면 그날 기록</p></div>`;
}

function vReal() {
  const d = day();
  let h = topBar('Real-Life Speaking', '실전 B2+');
  if (!d.problems.length) {
    h += `<div class="card"><h2>오늘의 5문제</h2><p class="hint">일반 상황 3문제 + 돌발 상황 2문제. 오늘 카테고리: ${pickCats().map(c => c.icon + ' ' + c.ko).join(', ')}</p>
      <div class="row"><button class="btn accent wide" data-act="makeToday" ${S.busy.gen ? 'disabled' : ''}>${S.busy.gen ? '문제 만드는 중…' : '오늘 문제 받기'}</button></div>${errBox('gen')}</div>`;
  } else {
    h += `<div class="sec-title">1 · 실전 영작 → 보지 않고 말하기</div><div class="steps">${d.problems.map((p, i) => {
      const c = catOf(p.cat); const last = (p.speaks || []).slice(-1)[0];
      return `<button class="step ${p.status === 'done' ? 'done' : ''}" data-act="go" data-v="prob" data-id="${p.id}"><span class="n">${p.status === 'done' ? '✓' : i + 1}</span><span class="tx"><b>${c.icon} ${esc(c.ko)} <span class="tag ${p.kind}">${p.kind === 'tricky' ? '돌발' : '일반'}</span></b><span>${esc(p.ko.slice(0, 46))}…</span>${last && last.eval ? `<br><span class="tag">${esc((VK[last.eval.verdict] || [''])[0])}</span>` : ''}</span><span class="ar">›</span></button>`;
    }).join('')}</div>`;
  }
  const L = d.log;
  const cnt = (t) => L.filter(l => l.type === t && (l.attempts || []).length).length;
  const rpDone = L.some(l => l.type === 'roleplay' && l.feedback);
  h += `<div class="sec-title">오늘의 훈련 · 순서는 자유롭게</div><div class="steps">
    <button class="step ${cnt('spont') ? 'done' : ''}" data-act="go" data-v="spont"><span class="n">${cnt('spont') ? '✓' : '2'}</span><span class="tx"><b>즉흥 발화</b><span>영작 없이 상황만 보고 바로 말하기 · 오늘 ${cnt('spont')}개</span></span><span class="ar">›</span></button>
    <button class="step ${cnt('finish') ? 'done' : ''}" data-act="go" data-v="finish"><span class="n">${cnt('finish') ? '✓' : '3'}</span><span class="tx"><b>끝맺음 훈련</b><span>Finish your thought · 오늘 ${cnt('finish')}개</span></span><span class="ar">›</span></button>
    <button class="step ${rpDone ? 'done' : ''}" data-act="go" data-v="rpPick"><span class="n">${rpDone ? '✓' : '4'}</span><span class="tx"><b>AI 롤플레이</b><span>직원과 실제로 대화하기 · 하루 1회</span></span><span class="ar">›</span></button>
    <button class="step" data-act="go" data-v="review"><span class="n">5</span><span class="tx"><b>오늘의 복습</b><span>핵심 오류 다시 보기 · 표현 복습 ${EXT.dueCount() ? EXT.dueCount() + '개' : ''}</span></span><span class="ar">›</span></button>
  </div>
  <p class="hint" style="margin:12px 4px">시간이 없으면 즉흥 발화와 롤플레이만 해도 돼요. 중간에 나가도 자동 저장돼요.</p>`;
  if (d.problems.length) h += `<div class="row"><button class="btn line sm" data-act="makeTodayAgain">오늘 문제 새로 받기</button></div>`;
  return h;
}

function findProblem(id) { for (const k in S.data.days) { const d = S.data.days[k]; const p = d.problems.find(x => x.id === id) || (d.oldProblems || []).find(x => x.id === id); if (p) return p; } return null; }
function vProb() {
  const p = findProblem(S.p.id); if (!p) return topBar('문제') + '<div class="card">문제를 찾을 수 없어요.</div>';
  const c = catOf(p.kind ? p.cat : p.cat); const d = day(); const idx = d.problems.indexOf(p);
  const stage = S.p.stage || ((p.speaks || []).length ? 'speak' : 'write');
  let h = topBar(`${idx >= 0 ? idx + 1 + ' / 5' : '문제'}`, c.icon + ' ' + c.ko);
  h += `<div class="card"><div class="meta"><span class="tag ${p.kind}">${p.kind === 'tricky' ? '돌발 상황' : '일반 상황'}</span><span>상대: ${esc(p.role)}</span></div><p class="situ">${esc(p.ko)}</p></div>`;
  if (stage === 'write') {
    const dk = 'w:' + p.id;
    h += `<div class="card"><h3>① 영작</h3><p class="hint">모르는 단어는 한국어로 써도 돼요. 예: I want to 환불 this.</p>
      <textarea class="draft" data-draft="${dk}" id="wtext" placeholder="영어로 써 보세요">${esc(S.data.drafts[dk] != null ? S.data.drafts[dk] : (p.write && p.write.text) || '')}</textarea>
      <div class="row"><button class="btn line" data-act="skipWrite" data-id="${p.id}">영작 없이 바로 말하기</button><button class="btn" data-act="evalWrite" data-id="${p.id}" ${S.busy['w' + p.id] ? 'disabled' : ''}>${S.busy['w' + p.id] ? '평가 중…' : '평가받기'}</button></div>
      ${errBox('w' + p.id, true)}</div>`;
  }
  if (p.write && p.write.eval) {
    h += `<details class="card" ${stage === 'write' ? 'open' : ''}><summary>영작 평가 ${esc((VK[p.write.eval.verdict] || [''])[0])} ${stage === 'speak' ? '· 말하기 전엔 접어 두세요' : ''}</summary>${realEvalHTML(p.write.eval, 'w:' + p.id)}</details>`;
    if (stage === 'write') h += `<div class="row" style="margin-bottom:12px"><button class="btn accent wide" data-act="toSpeak" data-id="${p.id}">② 내 문장 숨기고 말하기</button></div>`;
  }
  if (stage === 'speak') {
    const last = (p.speaks || []).slice(-1)[0];
    const retell = S.p.retell;
    h += `<div class="card"><h3>${retell ? '③ 같은 뜻을 내 말로 다시 말하기' : '② 보지 않고 말하기'}</h3><p class="hint">${retell ? '방금 본 대안을 외워서 말하지 말고, 이해한 구조로 내 말처럼 말해요.' : '써 둔 문장은 숨겼어요. 상황을 다시 읽고, 상대에게 말하듯 끝까지 말해요.'}</p>
      ${speakUI('p' + p.id, { submitLabel: '평가받기', onSubmit: (a, key) => submitProblemSpeech(p, a, key, retell) })}</div>`;
    if (last && last.eval && !(S.rec && S.rec.key === 'p' + p.id && S.rec.phase !== 'idle')) {
      h += realEvalHTML(last.eval, 's:' + p.id + ':' + last.id, { openNatural: !retell && last.mode !== 'retell' });
      h += `<div class="row" style="margin-bottom:12px">
        ${last.mode !== 'retell' && last.eval.natural ? `<button class="btn line" data-act="retell" data-id="${p.id}">내 말로 다시 말하기</button>` : ''}
        <button class="btn" data-act="nextProb" data-id="${p.id}">다음 문제</button></div>`;
    }
    if ((p.speaks || []).length > 1) h += `<details class="card"><summary>이 문제의 말하기 기록 ${p.speaks.length}회</summary>${p.speaks.map((a, i) => attemptLine(a, (i + 1) + '회' + (a.mode === 'retell' ? ' · 다시 표현' : ''))).join('')}</details>`;
  }
  return h;
}
async function submitProblemSpeech(p, a, key, retell) {
  const ev = await runAI(key, async () => {
    const pr = P.realEval({ myExprs: EXT.myExprList(), situation: p.ko, kind: p.kind, role: p.role, mode: retell ? 'retell' : 'speak', text: a.transcript, written: p.write && p.write.text, metrics: a, attempts: (p.speaks || []).length + 1, extra: retell ? 'Judge success by whether the learner rebuilt the idea with a natural structure in their own words; it need not match any model sentence.' : '' });
    copyStore[key] = promptText(pr);
    return AI.json(pr);
  });
  a.mode = retell ? 'retell' : 'speak';
  if (ev) { a.eval = ev; EXT.recordUsage(ev.used_expressions, { ref: a.id, situation: p.ko, text: a.transcript, where: '실전' }); }
  p.speaks = p.speaks || []; p.speaks.push(a);
  if (ev) { p.status = 'done'; S.rec = null; S.p.retell = false; }
  save(); render();
}

function vSpont() {
  const d = day();
  let cur = S.p.lid ? d.log.find(l => l.id === S.p.lid) : null;
  if (!cur) {
    const used = new Set(d.log.filter(l => l.type === 'spont').map(l => l.situation));
    const pool = shuffle(D.seedProblems.filter(s => !used.has(s.ko) && !d.problems.some(p => p.ko === s.ko)));
    const s = pool[0] || D.seedProblems[0];
    cur = { id: uid(), type: 'spont', at: Date.now(), situation: s.ko, cat: s.cat, kind: s.kind, role: s.role, attempts: [], hints: null, hintLv: 0 };
    d.log.push(cur); S.p.lid = cur.id; save();
  }
  const c = catOf(cur.cat); const last = cur.attempts.slice(-1)[0];
  let h = topBar('즉흥 발화', 'Spontaneous');
  h += `<div class="card"><div class="meta"><span>${c.icon} ${esc(c.ko)}</span><span class="tag ${cur.kind}">${cur.kind === 'tricky' ? '돌발' : '일반'}</span></div><p class="situ">${esc(cur.situation)}</p>
    <p class="hint">영작하지 않고 바로 말해요. 막히면 힌트를 하나씩 열어요.</p>
    ${hintHTML(cur)}</div>`;
  h += `<div class="card">${speakUI('sp' + cur.id, { readyLabel: '준비 완료 · 눌러서 말하기', onSubmit: (a, key) => submitGeneric(cur, a, key, 'spont') })}</div>`;
  if (last && last.eval && !(S.rec && S.rec.phase !== 'idle')) {
    h += realEvalHTML(last.eval, 'l:' + cur.id + ':' + last.id);
    h += `<div class="row" style="margin-bottom:12px"><button class="btn line" data-act="sameAgain">같은 상황 다시</button><button class="btn" data-act="newSpont">다른 상황</button></div>`;
  }
  if (cur.attempts.length > 1) h += `<details class="card"><summary>이 상황 기록 ${cur.attempts.length}회</summary>${cur.attempts.map((a, i) => attemptLine(a, (i + 1) + '회')).join('')}</details>`;
  return h;
}
const TYPE_HINT = {
  describe: '전체 한 줄 소개 → 눈에 띄는 특징 3가지 → 내 느낌이나 의미', routine: '언제 → 순서대로 (first, then, after that) → 왜 이렇게 하는지',
  past: '언제·어디서 → 무슨 일이 → 어떻게 대처 → 결과 → 느낀 점 (과거시제 유지)', compare: '예전 모습 → 지금 모습 → 달라진 이유 → 내 생각',
  prefer: '내 선택 → 이유 1 + 예시 → 이유 2 → 결론', problem: '배경 → 문제 발생 → 해결 과정 → 결과와 배운 점',
  roleplay: '인사와 상황 설명 → 질문 3~4개 또는 대안 2~3개 → 마무리 인사', opinion: '내 의견 → 이유와 예시 → 다른 입장 인정 → 결론', intro: '이름·하는 일 → 요즘 관심사 2가지 → 성격이나 목표'
};
function hintHTML(cur) {
  const lv = cur.hintLv || 0; const h = cur.hints;
  let out = '';
  if (lv >= 1 && h) out += `<div class="hintbox"><b>단어</b> ${esc(h.h1)}</div>`;
  if (lv >= 2 && h) out += `<div class="hintbox"><b>순서</b> ${esc(h.h2)}</div>`;
  if (lv >= 3 && h) out += `<div class="hintbox"><b>시작</b> ${esc(h.h3)}</div>`;
  if (lv >= 1 && !h) out += `<div class="hintbox"><b>순서</b> ${cur.kind === 'tricky' ? '지금 상황 → 이미 한 것 → 원하는 해결 → 질문이나 요청으로 마무리' : '인사 → 원하는 것 → 조건이나 이유 → 질문으로 마무리'}</div>`;
  const more = h ? lv < 3 : lv < 1;
  return out + (more ? `<div class="row"><button class="btn sm ghost" data-act="hint" data-id="${cur.id}" ${S.busy['h' + cur.id] ? 'disabled' : ''}>${S.busy['h' + cur.id] ? '힌트 만드는 중…' : '힌트 ' + (lv + 1) + ' 보기'}</button></div>` : '') + errBox('h' + cur.id);
}
async function submitGeneric(cur, a, key, mode) {
  const ev = await runAI(key, async () => {
    const pr = P.realEval({ myExprs: EXT.myExprList(), situation: cur.situation || cur.ko, kind: cur.kind, role: cur.role, mode, text: a.transcript, metrics: a, attempts: cur.attempts.length + 1, stem: cur.stem });
    copyStore[key] = promptText(pr);
    return AI.json(pr);
  });
  a.mode = mode; if (ev) { a.eval = ev; EXT.recordUsage(ev.used_expressions, { ref: a.id, situation: cur.situation || cur.stem, text: a.transcript, where: mode === 'finish' ? '끝맺음' : '즉흥 발화' }); }
  cur.attempts.push(a); if (ev) S.rec = null;
  save(); render();
}

function vFinish() {
  const d = day();
  let cur = S.p.lid ? d.log.find(l => l.id === S.p.lid) : null;
  if (!cur) {
    const used = new Set(d.log.filter(l => l.type === 'finish').map(l => l.stem));
    const st = shuffle(D.finishStems.filter(s => !used.has(s.stem)))[0] || D.finishStems[0];
    cur = { id: uid(), type: 'finish', at: Date.now(), stem: st.stem, situation: st.ko, focus: st.focus, kind: 'finish', attempts: [] };
    d.log.push(cur); S.p.lid = cur.id; save();
  }
  const last = cur.attempts.slice(-1)[0];
  const F = { request: '질문이나 요청으로 마무리', reason: '이유를 끝까지 설명', conclusion: '결론까지 말하기' };
  let h = topBar('끝맺음 훈련', 'Finish your thought');
  h += `<div class="card"><p class="lbl">${esc(cur.situation)} · 목표: ${esc(F[cur.focus] || '')}</p><p class="situ" style="font-size:22px">${esc(cur.stem)}</p>
    <p class="hint">이 말로 시작해서 내 생각으로 문장을 끝까지 완성해요. 정답은 하나가 아니에요.</p></div>`;
  h += `<div class="card">${speakUI('fi' + cur.id, { readyLabel: '시작 문장부터 소리 내어 말하기', onSubmit: (a, key) => submitGeneric(cur, a, key, 'finish') })}</div>`;
  if (last && last.eval && !(S.rec && S.rec.phase !== 'idle')) {
    h += realEvalHTML(last.eval, 'l:' + cur.id + ':' + last.id);
    h += `<div class="row" style="margin-bottom:12px"><button class="btn line" data-act="sameAgain">다시</button><button class="btn" data-act="newFinish">다음 문장</button></div>`;
  }
  return h;
}

/* roleplay */
function vRpPick() {
  const d = day();
  let h = topBar('AI 롤플레이', '상황 고르기');
  h += `<div class="card"><p class="hint" style="margin:0">AI 직원이 먼저 말을 걸어요. 소리로 듣고 마이크로 대답해요. 대화 중에는 고쳐주지 않고, 끝나면 피드백을 줘요.</p></div>`;
  const opts = d.problems.map(p => ({ ko: p.ko, role: p.role, kind: p.kind, cat: p.cat })).concat(shuffle(D.seedProblems).slice(0, 4));
  h += `<div class="steps">${opts.map((o, i) => { const c = catOf(o.cat); return `<button class="step" data-act="rpStart" data-i="${i}"><span class="n">${c.icon}</span><span class="tx"><b>${esc(c.ko)} <span class="tag ${o.kind}">${o.kind === 'tricky' ? '돌발' : '일반'}</span></b><span>${esc(o.ko)}</span></span><span class="ar">›</span></button>`; }).join('')}</div>`;
  S.rpOpts = opts;
  const prev = d.log.filter(l => l.type === 'roleplay');
  if (prev.length) h += `<div class="sec-title">오늘 한 롤플레이</div><div class="steps">${prev.map(l => `<button class="step ${l.feedback ? 'done' : ''}" data-act="go" data-v="rp" data-id="${l.id}"><span class="n">${l.feedback ? '✓' : '…'}</span><span class="tx"><b>${esc(catOf(l.cat).ko)}</b><span>${esc(l.situation.slice(0, 40))}…</span></span><span class="ar">›</span></button>`).join('')}</div>`;
  return h;
}
async function rpStart(o) {
  const d = day();
  const l = { id: uid(), type: 'roleplay', at: Date.now(), situation: o.ko, role: o.role, kind: o.kind, cat: o.cat, msgs: [], feedback: null, ended: false };
  d.log.push(l); save();
  go('rp', { id: l.id });
  await rpAI(l, true);
}
function rpApiMessages(l) {
  const m = [{ role: 'user', content: '(The learner has just walked up to you / called you. Start the conversation in character with one or two natural sentences.)' }];
  l.msgs.forEach(x => {
    const role = x.role === 'ai' ? 'assistant' : 'user';
    const last = m[m.length - 1];
    if (last.role === role) last.content += '\n' + x.text; else m.push({ role, content: x.text });
  });
  if (m[m.length - 1].role === 'assistant') m.push({ role: 'user', content: '(silence)' });
  return m;
}
async function rpAI(l) {
  const turns = l.msgs.filter(x => x.role === 'me').length;
  const r = await runAI('rp' + l.id, async () => AI.call({ system: P.rolePlaySystem({ situation: l.situation, role: l.role, kind: l.kind, turnsLeft: Math.max(0, 8 - turns), targets: l.targets || (l.targets = EXT.rpTargets()) }), messages: rpApiMessages(l), model: AI.chatModel, maxTokens: 300, temperature: 0.7 }));
  if (!r) return;
  let t = r.text.trim(); let end = false;
  if (/\[END\]/.test(t)) { end = true; t = t.replace(/\[END\]/g, '').trim(); }
  l.msgs.push({ role: 'ai', text: t }); if (end) l.ended = true;
  S.shownAt = performance.now();
  save(); render();
  Speech.speak(t, S.data.settings.rate);
}
function vRp() {
  const d = day(); let l = null;
  for (const k in S.data.days) { const x = S.data.days[k].log.find(y => y.id === S.p.id); if (x) { l = x; break; } }
  if (!l) return topBar('롤플레이') + '<div class="card">기록을 찾을 수 없어요.</div>';
  const c = catOf(l.cat);
  let h = topBar('AI 롤플레이', c.icon + ' ' + c.ko);
  h += `<details class="card"><summary>상황 보기</summary><p style="margin:6px 0 0">${esc(l.situation)}</p><p class="hint">상대: ${esc(l.role)}</p></details>`;
  h += `<div class="chat">${l.msgs.map((m, i) => m.role === 'ai'
    ? `<div class="msg ai">${esc(m.text)}<br><button class="say" data-act="say" data-i="${i}">🔊 다시 듣기</button></div>`
    : `<div class="msg me">${esc(m.text)}<span class="rt">반응 ${sec((m.thinkMs || 0) + (m.firstMs || 0))}</span>${m.audioId ? `<audio controls preload="none" data-aid="${esc(m.audioId)}"></audio>` : ''}</div>`).join('')}
    ${S.busy['rp' + l.id] ? '<div class="msg ai typing">…</div>' : ''}</div>`;
  h += errBox('rp' + l.id);
  if (l.feedback) {
    const f = l.feedback;
    h += `<div class="card"><div class="verdict ${f.resolved ? 'v-PASS' : 'v-PASS_FIX'}"><div>${f.resolved ? '스스로 해결했어요' : '아직 해결 전이에요'}<small>${esc(f.summary)}</small></div></div>
      ${f.good_moves ? `<p class="note"><b>잘한 대응</b> ${esc(f.good_moves)}</p>` : ''}
      ${f.completion_note ? `<p class="note"><b>끝맺음</b> ${esc(f.completion_note)}</p>` : ''}
      ${f.reaction_note ? `<p class="note"><b>반응</b> ${esc(f.reaction_note)}</p>` : ''}
      ${(f.key_errors || []).length ? `<p class="lbl" style="margin-top:12px">핵심 오류만</p><ul class="fixlist">${f.key_errors.map(x => `<li><s>${esc(x.original)}</s><br><span class="b">${esc(x.better)}</span>${x.why ? `<div class="note">${esc(x.why)}</div>` : ''}</li>`).join('')}</ul>` : ''}
    </div><div class="row"><button class="btn line" data-act="go" data-v="rpPick">다른 상황</button><button class="btn" data-act="go" data-v="real">실전 홈으로</button></div>`;
    return h;
  }
  if (S.busy['rpf' + l.id]) return h + '<div class="card">피드백 정리 중…</div>';
  if (l.ended) {
    h += `<div class="card"><p style="margin:0 0 8px">대화가 끝났어요.</p><button class="btn accent wide" data-act="rpFeedback" data-id="${l.id}">피드백 받기</button>${errBox('rpf' + l.id)}</div>`;
    return h;
  }
  if (!l.msgs.length) return h + (S.busy['rp' + l.id] ? '' : `<button class="btn wide" data-act="rpRetry" data-id="${l.id}">대화 시작하기</button>`);
  if (l.msgs[l.msgs.length - 1].role === 'ai' && !S.busy['rp' + l.id]) {
    h += `<div class="card">${speakUI('rpm' + l.id, { readyLabel: '눌러서 대답하기', submitLabel: '보내기', onSubmit: (a, key) => rpSend(l, a, key) })}</div>`;
  } else if (!S.busy['rp' + l.id]) {
    h += `<button class="btn wide" data-act="rpRetry" data-id="${l.id}">상대 답변 다시 받기</button>`;
  }
  h += `<div class="row"><button class="btn line" data-act="rpFeedback" data-id="${l.id}">대화 끝내고 피드백 받기</button></div>${errBox('rpf' + l.id)}`;
  return h;
}
async function rpSend(l, a) {
  l.msgs.push({ role: 'me', text: a.transcript, audioId: a.audioId, firstMs: a.firstMs, thinkMs: a.thinkMs, durMs: a.durMs, silenceMs: a.silenceMs });
  S.rec = null; save(); render();
  await rpAI(l);
}
async function rpFeedback(id) {
  let l = null; for (const k in S.data.days) { const x = S.data.days[k].log.find(y => y.id === id); if (x) { l = x; break; } }
  if (!l) return;
  if (!l.msgs.some(m => m.role === 'me')) { toast('한 번 이상 대답한 뒤 피드백을 받을 수 있어요.'); return; }
  Speech.stop(); S.rec = null; Rec.cancel();
  const f = await runAI('rpf' + l.id, async () => AI.json(P.rolePlayFeedback({ situation: l.situation, role: l.role, log: l.msgs, myExprs: EXT.myExprList() })));
  if (f) { l.feedback = f; l.ended = true; EXT.recordUsage(f.used_expressions, { ref: l.id, situation: l.situation, text: l.msgs.filter(m => m.role === 'me').map(m => m.text).join(' / '), where: '롤플레이' }); save(); render(); }
}

/* review */
function vReview() {
  const from = addDays(-7);
  const items = [];
  for (const k in S.data.days) if (k >= from) {
    const d = S.data.days[k];
    d.problems.forEach(p => { const a = (p.speaks || []).slice(-1)[0]; const ev = a && a.eval || p.write && p.write.eval; if (ev && ev.verdict !== 'PASS') items.push({ k, ko: p.ko, ev, written: p.write && p.write.eval && p.write.eval.verdict === 'PASS' && a && a.eval && a.eval.verdict !== 'PASS' }); });
    d.log.forEach(l => { const a = (l.attempts || []).slice(-1)[0]; if (a && a.eval && a.eval.verdict && a.eval.verdict !== 'PASS') items.push({ k, ko: l.situation || l.stem || l.q, ev: a.eval }); });
  }
  let h = topBar('오늘의 복습', '최근 7일');
  h += `<div class="card"><h2>표현 복습</h2><p class="hint" style="margin:0 0 8px">복습할 표현 ${EXT.dueCount()}개 · 한국어 상황만 보고 떠올려요</p><div class="row"><button class="btn accent" data-act="xReview" data-v="due" ${EXT.dueCount() ? '' : 'disabled'}>표현 복습 시작</button><button class="btn ghost" data-act="go" data-v="bank">표현장</button></div></div>`;
  h += `<div class="sec-title">다시 볼 문장 ${items.length}개</div>`;
  if (!items.length) h += '<div class="card"><p class="hint" style="margin:0">최근 7일 동안 PASS 아닌 문장이 없어요.</p></div>';
  items.slice(-10).reverse().forEach(it => {
    h += `<div class="card"><p class="lbl">${esc(it.k)}${it.written ? ' · 영작은 PASS였는데 말하기는 어려웠던 문장' : ''}</p><p style="margin:0 0 8px;font-weight:600">${esc(it.ko)}</p>
      <div class="cmp"><div><div class="k">MY ORIGINAL</div><div class="v">${esc(it.ev.original || '')}</div></div>${it.ev.essential ? `<div><div class="k">ESSENTIAL</div><div class="v">${esc(it.ev.essential)}</div></div>` : ''}${it.ev.natural ? `<details class="nat"><summary class="k" style="color:var(--indigo)">NATURAL · 눌러서 보기</summary><div class="v">${esc(it.ev.natural)}</div></details>` : (it.ev.upgrade ? `<details class="nat"><summary class="k" style="color:var(--indigo)">UPGRADE · 눌러서 보기</summary><div class="v">${esc(it.ev.upgrade)}</div></details>` : '')}</div></div>`;
  });
  return h;
}

/* OPIc */
function vOpic() {
  const s = S.data.settings; const dd = dday();
  const ft = S.p.t || ''; const fto = S.p.topic || '';
  let h = topBar('OPIc AL Studio', dd != null && dd >= 0 ? 'D-' + dd : '');
  h += `<div class="card"><h2>모의시험</h2><p class="hint">15문항 · 약 40분 · 힌트 없음 · 질문은 두 번까지 들을 수 있어요. 끝난 뒤 종합 피드백을 줘요.</p>
    <p class="hint">출제 주제: ${s.topics.map(t => esc((D.opicTopics.find(x => x.id === t) || { ko: t }).ko)).join(', ')} · <button class="link" data-act="go" data-v="settings">바꾸기</button></p>
    <div class="row"><button class="btn accent wide" data-act="mockStart">모의시험 시작</button></div></div>`;
  h += `<div class="card"><h2>유형별 연습</h2><p class="lbl">답변 유형</p><div class="chips">${[['', '전체']].concat(D.opicTypes.map(t => [t.id, t.ko])).map(([k, v]) => `<button class="chip ${ft === k ? 'on' : ''}" data-act="opicFilter" data-f="t" data-v="${k}">${esc(v)}</button>`).join('')}</div>
    <p class="lbl" style="margin-top:12px">주제</p><div class="chips">${[['', '전체']].concat(D.opicTopics.map(t => [t.id, t.ko])).map(([k, v]) => `<button class="chip ${fto === k ? 'on' : ''}" data-act="opicFilter" data-f="topic" data-v="${k}">${esc(v)}</button>`).join('')}</div>
    <div class="row"><button class="btn wide" data-act="opicGo">질문 받기</button></div></div>`;
  const hist = [];
  for (const k in S.data.days) S.data.days[k].log.forEach(l => { if (l.type === 'mock') hist.push(Object.assign({ k }, l)); });
  if (hist.length) h += `<div class="sec-title">모의시험 기록</div><div class="steps">${hist.sort((a, b) => b.at - a.at).slice(0, 5).map(l => `<button class="step ${l.report ? 'done' : ''}" data-act="go" data-v="mock" data-id="${l.id}"><span class="n">${l.report ? '✓' : (l.items.filter(i => i.attempt).length)}</span><span class="tx"><b>${esc(l.k)}</b><span>${l.report ? esc((l.report.unofficial || '').slice(0, 40)) : '진행 중 · ' + l.items.filter(i => i.attempt).length + '/15'}</span></span><span class="ar">›</span></button>`).join('')}</div>`;
  return h;
}
function opicPick(t, topic) {
  const pool = D.opicQuestions.filter(q => (!t || q.t === t) && (!topic || q.topic === topic));
  return pool.length ? shuffle(pool)[0] : null;
}
function vOq() {
  const d = day();
  let l = S.p.lid ? d.log.find(x => x.id === S.p.lid) : null;
  if (!l) {
    const q = opicPick(S.p.t, S.p.topic);
    if (!q) return topBar('OPIc 연습') + '<div class="card">이 조건에 맞는 질문이 아직 없어요. 다른 유형이나 주제를 골라 주세요.</div>';
    l = { id: uid(), type: 'opic', at: Date.now(), q: q.q, ko: q.ko, t: q.t, topic: q.topic, attempts: [], showEn: false, showKo: false, hintLv: 0 };
    d.log.push(l); S.p.lid = l.id; save();
  }
  const last = l.attempts.slice(-1)[0];
  let h = topBar('OPIc 연습', typeKo(l.t));
  h += `<div class="card"><div class="row" style="margin-top:0"><button class="btn indigo" data-act="opicSay" data-id="${l.id}">🔊 질문 듣기</button></div>
    <div class="row"><button class="btn sm ghost" data-act="opicShow" data-v="en" data-id="${l.id}">${l.showEn ? '영어 질문 숨기기' : '영어 질문 보기'}</button><button class="btn sm ghost" data-act="opicShow" data-v="ko" data-id="${l.id}">${l.showKo ? '해석 숨기기' : '한국어 해석'}</button><button class="btn sm ghost" data-act="opicShow" data-v="hint" data-id="${l.id}">힌트</button></div>
    ${l.showEn ? `<p class="situ" style="font-size:16.5px">${esc(l.q)}</p>` : ''}
    ${l.showKo ? `<div class="hintbox">${esc(l.ko)}</div>` : ''}
    ${l.hintLv ? `<div class="hintbox"><b>답변 순서</b> ${esc(TYPE_HINT[l.t] || '')}</div>` : ''}
    <p class="hint">실제 시험처럼 듣고 바로 말해요. 영어 모범답안은 먼저 보여주지 않아요. 1분 30초~2분 정도 말하는 걸 목표로 해요.</p></div>`;
  h += `<div class="card">${speakUI('oq' + l.id, { readyLabel: '눌러서 답변하기', onSubmit: (a, key) => submitOpic(l, a, key) })}</div>`;
  if (last && last.eval && !(S.rec && S.rec.phase !== 'idle')) {
    h += opicEvalHTML(last.eval, 'l:' + l.id + ':' + last.id);
    h += `<div class="row" style="margin-bottom:12px"><button class="btn line" data-act="sameAgain">다시 답변하기</button><button class="btn" data-act="opicNext">다음 질문</button></div>`;
  }
  // compare with previous answers to the same question across days
  const prev = [];
  for (const k in S.data.days) S.data.days[k].log.forEach(x => { if (x.type === 'opic' && x.q === l.q) (x.attempts || []).forEach(a => prev.push(Object.assign({ k }, a))); });
  if (prev.length > 1) h += `<details class="card"><summary>이 질문의 이전 답변 ${prev.length}개 비교</summary>${prev.sort((a, b) => a.at - b.at).map((a, i) => attemptLine(a, a.k + ' · ' + (i + 1) + '회')).join('')}</details>`;
  return h;
}
async function submitOpic(l, a, key) {
  const ev = await runAI(key, async () => {
    const pr = P.opicEval({ myExprs: EXT.myExprList(), q: l.q, type: typeKo(l.t), text: a.transcript, metrics: a, mode: 'practice' });
    copyStore[key] = promptText(pr);
    return AI.json(pr);
  });
  if (ev) { a.eval = ev; EXT.recordUsage(ev.used_expressions, { ref: a.id, situation: l.ko, text: a.transcript, where: 'OPIc' }); } a.mode = 'opic';
  l.attempts.push(a); if (ev) S.rec = null;
  save(); render();
}

/* mock exam */
function buildMock() {
  const s = S.data.settings; const Q = D.opicQuestions;
  const pick = (f) => shuffle(Q.filter(f))[0];
  const topics = shuffle(s.topics.filter(t => !['tech', 'weather', 'holiday'].includes(t)));
  const unexpected = shuffle(['tech', 'weather', 'holiday'])[0];
  const items = [Q.find(q => q.t === 'intro')];
  const set = (topic, types) => types.forEach(t => { const q = pick(x => x.topic === topic && x.t === t && !items.includes(x)) || pick(x => x.topic === topic && !items.includes(x) && x.t !== 'roleplay' && x.t !== 'opinion') || pick(x => x.t === t && !items.includes(x)); if (q) items.push(q); });
  set(topics[0] || 'home', ['describe', 'routine', 'past']);
  set(topics[1] || 'running', ['describe', 'compare', 'problem']);
  set(unexpected, ['describe', 'compare', 'problem']);
  const rpTopic = shuffle(['travel', 'gym', 'cafe'])[0];
  ['ask', 'solve', 'related'].forEach(st => { const q = Q.find(x => x.t === 'roleplay' && x.topic === rpTopic && x.step === st); if (q) items.push(q); });
  const cmp = pick(x => x.t === 'compare' && !items.includes(x)); if (cmp) items.push(cmp);
  const op = pick(x => x.t === 'opinion'); if (op) items.push(op);
  while (items.length < 15) { const q = pick(x => !items.includes(x) && x.t !== 'roleplay'); if (!q) break; items.push(q); }
  return items.slice(0, 15).map(q => ({ q: q.q, ko: q.ko, type: q.t, plays: 0, attempt: null }));
}
function vMock() {
  let l = null; for (const k in S.data.days) { const x = S.data.days[k].log.find(y => y.id === S.p.id); if (x) { l = x; break; } }
  if (!l) return topBar('모의시험') + '<div class="card">기록이 없어요.</div>';
  const i = l.items.findIndex(it => !it.attempt);
  const elapsed = Math.round(((l.endedAt || Date.now()) - l.startedAt) / 1000);
  let h = topBar('OPIc 모의시험', clock(elapsed) + ' / 40:00');
  if (i >= 0 && !l.endedAt) {
    const it = l.items[i];
    h += `<div class="mockbar"><span>Question ${i + 1} of 15</span><span>${esc(typeKo(it.type))}</span></div><div class="progress"><i style="width:${Math.round(i / 15 * 100)}%"></i></div>`;
    h += `<div class="card" style="text-align:center"><div style="font-size:15px;color:var(--ink2);margin-bottom:10px">질문은 소리로만 나와요 · ${2 - it.plays}번 더 들을 수 있어요</div>
      <button class="btn indigo" data-act="mockPlay" data-id="${l.id}" ${it.plays >= 2 ? 'disabled' : ''}>🔊 ${it.plays ? '다시 듣기' : '질문 듣기'}</button>
      ${!Speech.ok ? `<p class="situ" style="font-size:16px">${esc(it.q)}</p>` : ''}</div>`;
    h += `<div class="card">${speakUI('mk' + l.id + '_' + i, { readyLabel: '눌러서 답변하기', submitLabel: '저장하고 다음', onSubmit: (a) => { a.mode = 'mock'; it.attempt = a; S.rec = null; save(); if (l.items.every(x => x.attempt)) { l.endedAt = Date.now(); save(); mockReport(l); } render(); } })}</div>`;
    h += `<div class="row"><button class="btn line sm" data-act="mockSkip" data-id="${l.id}">이 문항 건너뛰기</button><button class="btn line sm" data-act="mockEnd" data-id="${l.id}">여기서 끝내고 피드백</button></div>`;
    h += `<p class="hint" style="margin:10px 4px">답변 중에는 교정하지 않아요. 모든 문항이 끝나면 종합 피드백을 줘요. 연습 평가이며 공식 등급이 아니에요.</p>`;
    return h;
  }
  const r = l.report;
  if (!r) {
    h += `<div class="card"><h2>모의시험 완료</h2><p class="hint">걸린 시간 ${clock(elapsed)}</p>${S.busy['mr' + l.id] ? '<p>종합 피드백을 만드는 중이에요… (30초 정도 걸려요)</p>' : `<button class="btn accent wide" data-act="mockReport" data-id="${l.id}">종합 피드백 받기</button>`}${errBox('mr' + l.id)}</div>`;
  } else {
    h += `<div class="card"><h2>종합 피드백</h2><div class="verdict v-PASS_FIX"><div>${esc(r.unofficial || '')}<small>연습용 추정이에요. 실제 OPIc 등급과 다를 수 있어요.</small></div></div>
      <p style="margin:12px 0 0">${esc(r.overall || '')}</p>
      ${(r.strengths || []).length ? `<p class="lbl" style="margin-top:12px">잘한 점</p><ul class="fixlist">${r.strengths.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${(r.issues || []).length ? `<p class="lbl" style="margin-top:12px">반복되는 문제</p><ul class="fixlist">${r.issues.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${(r.focus_next || []).length ? `<p class="lbl" style="margin-top:12px">다음 일주일 연습</p><ul class="fixlist">${r.focus_next.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>`;
  }
  h += `<div class="card"><h3>문항별 답변</h3>${l.items.map((it, n) => { const b = r && (r.by_q || []).find(x => +x.n === n + 1); return `<details style="border-top:1px solid var(--line);padding:6px 0"><summary>Q${n + 1} · ${esc(typeKo(it.type))} ${b ? '· ' + esc((VK[b.verdict] || [b.verdict])[0]) : ''}</summary><p class="hint" style="color:var(--ink)">${esc(it.q)}</p>${b ? `<p class="note">${esc(b.note)}</p>` : ''}${it.attempt ? attemptLine(it.attempt, '내 답변') : '<p class="hint">답변 없음</p>'}</details>`; }).join('')}</div>`;
  return h;
}
async function mockReport(l) {
  const items = l.items.map(it => ({ q: it.q, type: typeKo(it.type), text: it.attempt && it.attempt.transcript, metrics: it.attempt }));
  const r = await runAI('mr' + l.id, async () => AI.json(Object.assign(P.mockReport({ items }), { model: AI.evalModel })));
  if (r) { l.report = r; save(); render(); }
}

/* settings */
function vSettings() {
  const s = S.data.settings;
  let h = topBar('설정', '', true);
  h += `<div class="card"><h2>AI 연결 (Anthropic API)</h2>
    <p class="hint">키는 이 기기에만 저장돼요. 평가할 때 받아쓴 글자만 Anthropic으로 보내고, 녹음 파일은 보내지 않아요.</p>
    <p class="lbl" style="margin-top:10px">API 키</p><input type="password" id="set-key" value="${esc(s.apiKey)}" placeholder="sk-ant-…" autocomplete="off">
    <div class="row"><button class="btn sm" data-act="saveKey">저장</button><button class="btn sm ghost" data-act="testKey" ${S.busy.test ? 'disabled' : ''}>${S.busy.test ? '확인 중…' : '연결 테스트'}</button></div>${errBox('test')}${S.testOk ? '<div class="warn" style="background:var(--goodBg);color:#0A6B35">연결됐어요!</div>' : ''}
    <p class="lbl" style="margin-top:14px">평가용 모델</p><select id="set-em">${['claude-sonnet-5-5', 'claude-opus-5-5', 'claude-haiku-5-5'].map(m => `<option ${s.evalModel === m ? 'selected' : ''}>${m}</option>`).join('')}</select>
    <p class="lbl" style="margin-top:10px">롤플레이·문제 생성용 모델</p><select id="set-cm">${['claude-haiku-5-5', 'claude-sonnet-5-5'].map(m => `<option ${s.chatModel === m ? 'selected' : ''}>${m}</option>`).join('')}</select>
    <p class="hint">평가는 정교한 Sonnet, 대화는 빠르고 저렴한 Haiku를 추천해요.</p></div>`;
  h += `<div class="card"><h2>OPIc</h2><p class="lbl">시험일</p><input type="date" id="set-exam" value="${esc(s.examDate)}">
    <p class="lbl" style="margin-top:12px">Background Survey에서 고를 주제 (모의시험 출제용)</p><div class="chips">${D.opicTopics.map(t => `<button class="chip ${s.topics.includes(t.id) ? 'on' : ''}" data-act="topic" data-v="${t.id}">${esc(t.ko)}</button>`).join('')}</div></div>`;
  h += EXT.settingsHTML();
  h += `<div class="card"><h2>소리</h2><p class="lbl">AI 음성 속도</p><div class="chips">${[[0.8, '느리게'], [0.95, '보통'], [1.05, '빠르게']].map(([v, k]) => `<button class="chip ${s.rate === v ? 'on' : ''}" data-act="rate" data-v="${v}">${k}</button>`).join('')}</div>
    <div class="row"><button class="btn sm ghost" data-act="testVoice">목소리 들어보기</button></div>
    <p class="hint">${Speech.ok ? '아이폰 기본 영어 음성을 사용해요. 무음 모드면 소리가 안 날 수 있어요.' : '이 브라우저는 음성 재생을 지원하지 않아요. 질문이 글자로 보여요.'}</p></div>`;
  h += `<div class="card"><h2>녹음과 데이터</h2>
    <div style="display:flex;align-items:center;gap:10px"><div style="flex:1"><b>녹음 파일 저장</b><p class="hint" style="margin:0">이 폰 안에만 저장돼요</p></div><button class="chip ${s.keepAudio ? 'on' : ''}" data-act="keepAudio">${s.keepAudio ? '저장함' : '저장 안 함'}</button></div>
    <p class="hint" id="audio-count">저장된 녹음 확인 중…</p>
    <div class="row"><button class="btn sm ghost" data-act="delAudio" style="color:var(--work)">녹음 전체 삭제</button></div>
    <div class="divider"></div>
    <b>백업</b><p class="hint">폰을 바꾸거나 Safari 데이터를 지우면 기록이 사라질 수 있어요. 가끔 백업 파일을 저장해 두세요.</p>
    <div class="row"><button class="btn sm" data-act="export" data-v="0">기록 내보내기</button><button class="btn sm ghost" data-act="export" data-v="1">녹음 포함 내보내기</button></div>
    <div class="row"><label class="btn sm line" style="flex:1">백업 가져오기<input type="file" id="imp" accept="application/json,.json" style="display:none"></label></div>
    <div class="divider"></div>
    <details><summary>이 앱이 하는 것과 못 하는 것</summary><ul class="fixlist" style="margin-top:6px">
      <li>✅ 마이크 녹음·재생 (Safari·Chrome) · ✅ 브라우저 음성 인식 (영어) · ✅ AI 평가·롤플레이 (API 키 필요)</li>
      <li>⚠️ 음성 인식은 기기 기능이라 가끔 틀려요. 받아쓴 내용은 고칠 수 있고, AI가 인식 오류와 영어 실수를 구분해요.</li>
      <li>⚠️ 발음 자체는 채점하지 않아요. 의미 전달과 문장 완결을 평가해요.</li>
      <li>⚠️ 계정 동기화는 없어요. 기기를 바꿀 때는 백업 파일로 옮겨요.</li>
      <li>⚠️ 녹음 중 앱을 나가면 그 녹음은 복구되지 않을 수 있어요.</li>
      <li>⚠️ OPIc 평가는 연습용이며 공식 등급이 아니에요.</li></ul></details></div>`;
  h += `<p class="hint" style="text-align:center;margin:16px">Pixie Speaking Studio · v1.3</p>`;
  return h;
}

/* day detail */
function attemptFull(a, label) {
  const ev = a.eval;
  return attemptLine(a, label) + (ev ? `<div class="cmp" style="margin:0 0 8px">${ev.essential && ev.essential !== ev.original ? `<div><div class="k">교정</div><div class="v">${esc(ev.essential)}</div></div>` : ''}${ev.natural ? `<div class="nat"><div class="k">NATURAL</div><div class="v">${esc(ev.natural)}</div></div>` : ''}${ev.upgrade ? `<div class="nat"><div class="k">더 자연스럽게</div><div class="v">${esc(ev.upgrade)}</div></div>` : ''}${(ev.fixes || []).map(f => `<div><div class="k">교정</div><div class="v"><s style="color:var(--work)">${esc(f.original)}</s> → ${esc(f.better)}</div></div>`).join('')}${ev.completion_note ? `<p class="note" style="margin:0">끝맺음: ${esc(ev.completion_note)}</p>` : ''}</div>` : '');
}
function daySheet(k) {
  const d = S.data.days[k];
  const extra = EXT.dayHTML(k);
  if (!d && !extra) return `<h2 style="margin:0 0 6px">${esc(k)}</h2><p class="hint">이 날은 기록이 없어요.</p>`;
  if (!d) return `<h2 style="margin:0 0 6px">${esc(k)}</h2>` + extra;
  const probs = (d.oldProblems || []).concat(d.problems);
  const touched = probs.filter(p => p.write || (p.speaks || []).length);
  const untouched = d.problems.filter(p => !p.write && !(p.speaks || []).length);
  const all = allAttempts(x => x === k).filter(a => a.eval);
  const pass = all.filter(a => a.eval.verdict === 'PASS').length, retry = all.filter(a => a.eval.verdict === 'RETRY').length;
  let h = `<h2 style="margin:0 0 6px">${esc(k)}</h2><div class="stats"><div class="stat"><b>${fmtMin(totalSecs(d))}</b><span>학습 시간</span></div><div class="stat"><b>${pass}</b><span>PASS</span></div><div class="stat"><b>${retry}</b><span>RETRY</span></div></div>
    <p class="hint">실전 ${fmtMin(d.secs.real)} · OPIc ${fmtMin(d.secs.opic)}</p>`;
  if (touched.length) {
    h += `<div class="sec-title" style="margin-left:0">실전 문제</div>`;
    touched.forEach(p => {
      const w = p.write && p.write.eval;
      h += `<div class="card"><p class="lbl">${esc(catOf(p.cat).ko)} · ${p.kind === 'tricky' ? '돌발' : '일반'}</p><p style="margin:0 0 6px;font-size:14.5px">${esc(p.ko)}</p>
        ${p.write ? `<div class="cmp" style="margin:0 0 8px"><div><div class="k">영작 ${w ? '· ' + esc((VK[w.verdict] || [''])[0]) : ''}</div><div class="v">${esc(p.write.text)}</div></div>${w && w.essential && w.essential !== w.original ? `<div><div class="k">교정</div><div class="v">${esc(w.essential)}</div></div>` : ''}${w && w.natural ? `<div class="nat"><div class="k">NATURAL</div><div class="v">${esc(w.natural)}</div></div>` : ''}</div>` : ''}
        ${(p.speaks || []).map((a, j) => attemptFull(a, '말하기 ' + (j + 1) + (a.mode === 'retell' ? ' · 다시 표현' : ''))).join('')}</div>`;
    });
  }
  if (untouched.length) h += `<p class="hint">아직 안 한 오늘의 문제 ${untouched.length}개는 실전 탭에서 이어서 할 수 있어요.</p>`;
  const L = d.log.filter(l => (l.attempts || []).length || (l.msgs || []).length || (l.type === 'mock' && l.items.some(x => x.attempt)));
  if (L.length) {
    h += `<div class="sec-title" style="margin-left:0">훈련 기록</div>`;
    L.forEach(l => {
      const name = { spont: '즉흥 발화', finish: '끝맺음', opic: 'OPIc 연습', roleplay: '롤플레이', mock: 'OPIc 모의시험' }[l.type] || l.type;
      h += `<div class="card"><p class="lbl">${esc(name)}</p><p style="margin:0 0 6px;font-size:14.5px">${esc(l.situation || l.stem || l.q || '')}</p>`;
      if (l.type === 'roleplay') h += `<div class="chat">${l.msgs.map(m => `<div class="msg ${m.role === 'ai' ? 'ai' : 'me'}">${esc(m.text)}${m.audioId ? `<audio controls preload="none" data-aid="${esc(m.audioId)}"></audio>` : ''}</div>`).join('')}</div>${l.feedback ? `<p class="note">${esc(l.feedback.summary)}</p>${(l.feedback.key_errors || []).map(x => `<p class="note"><s>${esc(x.original)}</s> → <b>${esc(x.better)}</b></p>`).join('')}` : ''}`;
      else if (l.type === 'mock') h += `<p class="note">${esc(l.report ? l.report.overall : '피드백 전')}</p><button class="btn sm" data-act="mockOpen" data-id="${l.id}">자세히 보기</button>`;
      else h += (l.attempts || []).map((a, j) => attemptFull(a, (j + 1) + '회')).join('');
      h += `</div>`;
    });
  }
  h += extra;
  if (!touched.length && !L.length && !extra) h += `<p class="hint">이 날은 말하기 기록이 없어요.</p>`;
  return h;
}

/* ---------- render ---------- */
const VIEWS = { home: vHome, real: vReal, prob: vProb, spont: vSpont, finish: vFinish, rpPick: vRpPick, rp: vRp, review: vReview, opic: vOpic, oq: vOq, mock: vMock, settings: vSettings };
const TAB_OF = { home: 'home', real: 'real', prob: 'real', spont: 'real', finish: 'real', rpPick: 'real', rp: 'real', review: 'real', opic: 'opic', oq: 'opic', mock: 'opic', settings: 'settings' };
function render() {
  const app = $('#app');
  // keep typed text across re-render
  const keepIds = {}; document.querySelectorAll('textarea[id],input[type=text][id]').forEach(el => { keepIds[el.id] = [el.value, el === document.activeElement, el.selectionStart]; });
  let html;
  try { html = (VIEWS[S.view] || vHome)(); }
  catch (e) { console.error(e); html = `<div class="card err">화면을 그리다 오류가 났어요: ${esc(e.message)}<div class="row"><button class="btn sm" data-act="go" data-v="home">홈으로</button></div></div>`; }
  app.innerHTML = html;
  for (const id in keepIds) { const el = document.getElementById(id); if (el && el.tagName === 'TEXTAREA' && !el.classList.contains('txedit') || el && el.tagName === 'INPUT') { if (keepIds[id][0] !== undefined && el.value !== keepIds[id][0] && (el.classList.contains('typein') || el.id.startsWith('dt') || el.id.startsWith('nx-'))) el.value = keepIds[id][0]; if (keepIds[id][1]) { el.focus(); try { el.setSelectionRange(keepIds[id][2], keepIds[id][2]); } catch (e) {} } } }
  const tab = TAB_OF[S.view] || 'home';
  $('#tabs').innerHTML = `<div class="in">${[['home', '홈', ICON.home], ['real', '실전', ICON.globe], ['opic', 'OPIc', ICON.cap], ['bank', '표현장', ICON.book], ['settings', '설정', ICON.gear]].map(([k, l, ic]) => `<button class="tab ${tab === k ? 'on' : ''}" data-act="tab" data-v="${k}">${ic}${l}</button>`).join('')}</div>`;
  hydrate(app);
  if (S.view === 'settings') Store.audioKeys().then(k => { const el = $('#audio-count'); if (el) el.textContent = '저장된 녹음 ' + k.length + '개'; }).catch(() => {});
}
const urlCache = {};
function hydrate(root) {
  root.querySelectorAll('audio[data-aid]').forEach(async el => {
    const id = el.dataset.aid;
    if (urlCache[id]) { el.src = urlCache[id]; return; }
    try { const r = await Store.audioGet(id); if (r && r.blob) { urlCache[id] = URL.createObjectURL(r.blob); el.src = urlCache[id]; } else { el.replaceWith(Object.assign(document.createElement('p'), { className: 'hint', textContent: '녹음 파일이 삭제됐어요' })); } } catch (e) {}
  });
}

/* ---------- events ---------- */
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset && t.dataset.draft) { S.data.drafts[t.dataset.draft] = t.value; save(); }
  if (t.classList && t.classList.contains('typein')) {
    const r = S.rec || (S.rec = { key: t.dataset.k, phase: 'idle', mode: 'type' });
    if (!r.typeStart && t.value.trim()) { r.typeStart = performance.now(); timerAuto(); }
    r.typed = t.value;
  }
});
document.addEventListener('focusin', (e) => {
  const t = e.target;
  if (t.classList && t.classList.contains('typein')) { const r = S.rec || (S.rec = { key: t.dataset.k, phase: 'idle', mode: 'type' }); if (!r.focusAt) r.focusAt = performance.now(); }
});
document.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.id === 'imp' && t.files && t.files[0]) { await importFile(t.files[0]); t.value = ''; }
  if (t.id === 'set-em') { S.data.settings.evalModel = t.value; syncAI(); save(); }
  if (t.id === 'set-cm') { S.data.settings.chatModel = t.value; syncAI(); save(); }
  if (t.id === 'set-exam') { S.data.settings.examDate = t.value; save(); }
});
document.addEventListener('click', async (e) => {
  if (!S.ttsUnlocked && Speech.ok) { S.ttsUnlocked = true; try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch (x) {} } // iOS: unlock speech on first tap
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act, v = el.dataset.v, id = el.dataset.id, k = el.dataset.k;
  if (a === 'sheetBg') { if (e.target === el) closeSheet(); return; }
  switch (a) {
    case 'go': go(v, id ? { id } : {}); break;
    case 'tab': S.stack = []; go(v, {}, false); break;
    case 'back': back(); break;
    case 'skipSetup': S.data.settings.setupDone = true; save(); render(); break;
    case 'timer': {
      const t = S.data.timer;
      if (v === 'start') { t.running = true; t.paused = false; }
      if (v === 'pause') { t.running = false; t.paused = true; }
      if (v === 'end') { t.running = false; t.paused = false; toast('오늘 ' + fmtMin(totalSecs(day())) + ' 공부했어요'); }
      save(); render(); break;
    }
    case 'cal': { const [y, m] = S.calMonth.split('-').map(Number); const d = new Date(y, m - 1 + Number(v), 1); S.calMonth = d.getFullYear() + '-' + pad(d.getMonth() + 1); render(); break; }
    case 'dayOpen': openSheet(daySheet(v)); break;
    case 'mockOpen': closeSheet(); go('mock', { id }); break;
    case 'makeToday': await makeToday(); break;
    case 'makeTodayAgain': openSheet(`<h2 style="margin:0 0 8px">오늘 문제를 새로 받을까요?</h2><p class="hint">지금까지 푼 기록은 달력에 남지만, 오늘 목록은 새 문제로 바뀌어요.</p><div class="row"><button class="btn ghost" data-act="closeSheet">취소</button><button class="btn" data-act="makeTodayYes">새로 받기</button></div>`); break;
    case 'makeTodayYes': { closeSheet(); const d = day(); const old = d.problems.filter(p => p.write || (p.speaks || []).length); d.oldProblems = (d.oldProblems || []).concat(old); d.problems = []; await makeToday(true); break; }
    case 'closeSheet': closeSheet(); break;

    case 'recStart': recStart(k); break;
    case 'recStop': await recStop(k); break;
    case 'recRedo': recRedo(k); break;
    case 'recSubmit': await recSubmit(k); break;
    case 'typeMode': S.rec = { key: k, phase: 'idle', mode: 'type' }; render(); break;
    case 'micMode': S.rec = null; render(); break;
    case 'typeSubmit': await typeSubmit(k); break;
    case 'consent': { S.data.settings.keepAudio = v === 'yes'; save(); closeSheet(); const f = S.afterConsent; S.afterConsent = null; if (f) f(); break; }
    case 'copyPrompt': {
      const txt = copyStore[k] || '';
      const ta = document.getElementById('tx-' + k) || $('#wtext');
      const body = txt || ('아래 영어 답변을 평가해 줘. 의미 전달, 문장 완결성, 필수 교정, 자연스러운 대안 1개를 한국어로 알려줘.\n\n' + (ta ? ta.value : ''));
      try { await navigator.clipboard.writeText(body); toast('복사했어요. Claude 앱에 붙여넣어 주세요.'); } catch (er) { toast('복사가 안 돼요. 길게 눌러 직접 복사해 주세요.'); }
      break;
    }

    case 'evalWrite': {
      const p = findProblem(id); const text = ($('#wtext').value || '').trim();
      if (!text) { toast('영어 문장을 먼저 써 주세요.'); break; }
      timerAuto();
      const pr = P.realEval({ myExprs: EXT.myExprList(), situation: p.ko, kind: p.kind, role: p.role, mode: 'write', text });
      copyStore['w' + p.id] = promptText(pr);
      const ev = await runAI('w' + p.id, () => AI.json(pr));
      p.write = { text, eval: ev, at: Date.now() };
      if (hasHangul(text) && ev) (ev.bridges || []).forEach(b => b.fromKo = true);
      delete S.data.drafts['w:' + p.id];
      save(); render(); break;
    }
    case 'skipWrite': S.p.stage = 'speak'; S.shownAt = performance.now(); render(); break;
    case 'toSpeak': S.p.stage = 'speak'; S.rec = null; S.shownAt = performance.now(); render(); window.scrollTo(0, 0); break;
    case 'retell': S.p.stage = 'speak'; S.p.retell = true; S.rec = null; S.shownAt = performance.now(); render(); break;
    case 'nextProb': {
      const d = day(); const i = d.problems.findIndex(p => p.id === id);
      const nx = d.problems.slice(i + 1).concat(d.problems.slice(0, i)).find(p => p.status !== 'done');
      if (nx) go('prob', { id: nx.id }, false); else { toast('오늘 5문제를 다 했어요!'); go('real', {}, false); }
      break;
    }
    case 'hint': {
      const d = day(); const cur = d.log.find(l => l.id === id); if (!cur) break;
      if (!cur.hints && AI.key) { const h = await runAI('h' + id, () => AI.json(Object.assign(P.hints({ situation: cur.situation }), { model: AI.chatModel }))); if (h) cur.hints = h; else break; }
      cur.hintLv = (cur.hintLv || 0) + 1; save(); render(); break;
    }
    case 'sameAgain': S.rec = null; S.shownAt = performance.now(); render(); break;
    case 'newSpont': go('spont', {}, false); break;
    case 'newFinish': go('finish', {}, false); break;

    case 'rpStart': { const o = S.rpOpts && S.rpOpts[+el.dataset.i]; if (o) { timerAuto(); await rpStart(o); } break; }
    case 'rpRetry': { let l; for (const kk in S.data.days) { const x = S.data.days[kk].log.find(y => y.id === id); if (x) l = x; } if (l) await rpAI(l); break; }
    case 'rpFeedback': await rpFeedback(id); break;
    case 'say': { let l; for (const kk in S.data.days) { const x = S.data.days[kk].log.find(y => y.id === S.p.id); if (x) l = x; } const m = l && l.msgs[+el.dataset.i]; if (m) Speech.speak(m.text, S.data.settings.rate); break; }

    case 'opicFilter': S.p[el.dataset.f] = v; render(); break;
    case 'opicGo': timerAuto(); go('oq', { t: S.p.t, topic: S.p.topic }); break;
    case 'opicNext': go('oq', { t: S.p.t, topic: S.p.topic }, false); break;
    case 'opicSay': { const l = day().log.find(x => x.id === id); if (l) { S.shownAt = performance.now(); Speech.speak(l.q, S.data.settings.rate); } break; }
    case 'opicShow': { const l = day().log.find(x => x.id === id); if (!l) break; if (v === 'en') l.showEn = !l.showEn; if (v === 'ko') l.showKo = !l.showKo; if (v === 'hint') l.hintLv = l.hintLv ? 0 : 1; save(); render(); break; }
    case 'mockStart': {
      const l = { id: uid(), type: 'mock', at: Date.now(), startedAt: Date.now(), items: buildMock(), report: null };
      day().log.push(l); timerAuto(); save(); go('mock', { id: l.id }); break;
    }
    case 'mockPlay': {
      let l; for (const kk in S.data.days) { const x = S.data.days[kk].log.find(y => y.id === id); if (x) l = x; }
      const it = l && l.items.find(x => !x.attempt); if (!it || it.plays >= 2) break;
      it.plays++; save(); render(); S.shownAt = performance.now();
      Speech.speak(it.q, S.data.settings.rate).then(() => { S.shownAt = performance.now(); });
      break;
    }
    case 'mockSkip': { let l; for (const kk in S.data.days) { const x = S.data.days[kk].log.find(y => y.id === id); if (x) l = x; } const it = l && l.items.find(x => !x.attempt); if (it) { it.attempt = { id: uid(), at: Date.now(), transcript: '', skipped: true }; S.rec = null; if (l.items.every(x => x.attempt)) { l.endedAt = Date.now(); } save(); render(); } break; }
    case 'mockEnd': { let l; for (const kk in S.data.days) { const x = S.data.days[kk].log.find(y => y.id === id); if (x) l = x; } if (l) { Rec.cancel(); S.rec = null; l.endedAt = Date.now(); save(); render(); } break; }
    case 'mockReport': { let l; for (const kk in S.data.days) { const x = S.data.days[kk].log.find(y => y.id === id); if (x) l = x; } if (l) await mockReport(l); break; }

    case 'saveKey': { S.data.settings.apiKey = ($('#set-key').value || '').trim(); S.data.settings.setupDone = true; syncAI(); S.testOk = false; save(); toast('저장했어요'); render(); break; }
    case 'testKey': {
      S.data.settings.apiKey = ($('#set-key').value || '').trim(); syncAI(); save(); S.testOk = false;
      const r = await runAI('test', () => AI.call({ messages: [{ role: 'user', content: 'Reply with OK.' }], model: AI.chatModel, maxTokens: 5 }));
      if (r) { S.testOk = true; S.data.settings.setupDone = true; save(); render(); }
      break;
    }
    case 'topic': { const t = S.data.settings.topics; const i = t.indexOf(v); if (i >= 0) { if (t.length > 2) t.splice(i, 1); else toast('주제는 2개 이상 골라 주세요.'); } else t.push(v); save(); render(); break; }
    case 'rate': S.data.settings.rate = Number(v); save(); render(); break;
    case 'testVoice': Speech.speak("Hi, I'm your practice partner. Let's get started.", S.data.settings.rate); break;
    case 'keepAudio': S.data.settings.keepAudio = !S.data.settings.keepAudio; save(); render(); break;
    case 'delAudio': openSheet(`<h2 style="margin:0 0 8px">녹음을 모두 지울까요?</h2><p class="hint">글로 된 기록과 평가는 남고, 녹음 파일만 지워져요. 되돌릴 수 없어요.</p><div class="row"><button class="btn ghost" data-act="closeSheet">취소</button><button class="btn" style="background:var(--work)" data-act="delAudioYes">모두 삭제</button></div>`); break;
    case 'delAudioYes': await Store.audioClear().catch(() => {}); closeSheet(); toast('녹음을 모두 지웠어요'); render(); break;
    case 'export': await exportData(v === '1'); break;
    default: if (EXT.actions[a]) await EXT.actions[a](el, e);
  }
});
function findEvalByCtx(ctx) {
  const [t, a, b] = ctx.split(':');
  if (t === 'w') { const p = findProblem(a); return p && p.write && p.write.eval; }
  if (t === 's') { const p = findProblem(a); const at = p && (p.speaks || []).find(x => x.id === b); return at && at.eval; }
  if (t === 'l') { for (const k in S.data.days) { const l = S.data.days[k].log.find(x => x.id === a); if (l) { const at = (l.attempts || []).find(x => x.id === b); return at && at.eval; } } }
  return null;
}
function findSrcByCtx(ctx) {
  const [t, a] = ctx.split(':');
  if (t === 'w' || t === 's') return findProblem(a);
  for (const k in S.data.days) { const l = S.data.days[k].log.find(x => x.id === a); if (l) return l; }
  return null;
}

/* ---------- export / import ---------- */
function blobToB64(b) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(b); }); }
async function exportData(withAudio) {
  const out = { app: 'pixie-speaking-studio', exportedAt: new Date().toISOString(), data: JSON.parse(JSON.stringify(S.data)) };
  out.data.settings.apiKey = '';
  if (withAudio) {
    out.audio = {};
    try { const keys = await Store.audioKeys(); for (const k of keys) { const r = await Store.audioGet(k); if (r && r.blob) out.audio[k] = { mime: r.mime, at: r.at, day: r.day, b64: await blobToB64(r.blob) }; } } catch (e) { toast('녹음을 읽지 못했어요'); }
  }
  const blob = new Blob([JSON.stringify(out)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const aEl = document.createElement('a'); aEl.href = url; aEl.download = 'pixie-speaking-' + today() + (withAudio ? '-audio' : '') + '.json';
  document.body.appendChild(aEl); aEl.click(); aEl.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast('백업 파일을 만들었어요. (API 키는 빼고 저장해요)');
}
async function importFile(file) {
  try {
    const j = JSON.parse(await file.text());
    if (!j || j.app !== 'pixie-speaking-studio' || !j.data) throw new Error('형식');
    const key = S.data.settings.apiKey;
    S.data = Object.assign(DEFAULT(), j.data); S.data.settings = Object.assign(DEFAULT().settings, j.data.settings || {}); S.data.settings.apiKey = key;
    if (j.audio) for (const k in j.audio) { const x = j.audio[k]; const b = await (await fetch(x.b64)).blob(); await Store.audioPut(k, { blob: b, mime: x.mime, at: x.at, day: x.day }); }
    EXT.migrate(S.data); syncAI(); await save(true); toast('백업을 가져왔어요'); render();
  } catch (e) { toast('이 파일은 가져올 수 없어요. Pixie Speaking 백업 파일인지 확인해 주세요.'); }
}

/* ---------- lifecycle ---------- */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (S.rec && S.rec.phase === 'rec') { const key = S.rec.key; recStop(key).then(() => toast('앱을 벗어나서 녹음을 멈추고 지금까지 녹음된 부분을 남겼어요.')); }
    Speech.stop(); save(true);
  } else lastTick = Date.now();
});
window.addEventListener('pagehide', () => save(true));

async function init() {
  try {
    const d = await Store.get('data');
    if (d) { S.data = Object.assign(DEFAULT(), d); S.data.settings = Object.assign(DEFAULT().settings, d.settings || {}); S.data.timer = Object.assign({ running: false }, d.timer || {}); }
  } catch (e) { toast('저장공간을 열 수 없어요. 사파리 개인정보 보호 모드인지 확인해 주세요.'); }
  // a new day starts with the timer off
  if (S.data.timer.running && S.data.timer.day !== today()) S.data.timer.running = false;
  S.data.timer.day = today();
  EXT.migrate(S.data); syncAI(); Speech.pick();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  render();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
}
window.__PSS = S; // for tests
const API = { S, D, P, AI, Speech, esc, uid, today, addDays, catOf, toast, openSheet, closeSheet, go, render, save, runAI, errBox, topBar, speakUI, findEvalByCtx, findSrcByCtx, timerAuto,
  register(x) { Object.assign(VIEWS, x.views || {}); Object.assign(TAB_OF, x.tabs || {}); Object.assign(MODE_OF, x.modes || {}); Object.assign(EXT.actions, x.actions || {}); ['keyExprHTML', 'myExprList', 'rpTargets', 'recordUsage', 'homeCard', 'dayHTML', 'settingsHTML', 'migrate', 'dueCount'].forEach(k => { if (x[k]) EXT[k] = x[k]; }); } };
(window.PSS_EXT || []).forEach(f => { try { f(API); } catch (er) { console.error(er); } });
init();
})();
