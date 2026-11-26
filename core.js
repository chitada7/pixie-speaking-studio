/* Pixie Speaking Studio — storage, recorder, AI, speech */
(function () {
'use strict';

/* ---------- IndexedDB ---------- */
const DBN = 'pixie-speaking-studio';
let dbp = null;
function idb() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    let r;
    try { r = indexedDB.open(DBN, 1); } catch (e) { rej(e); return; }
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
      if (!d.objectStoreNames.contains('audio')) d.createObjectStore('audio');
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
async function tx(store, mode, fn) {
  const d = await idb();
  return new Promise((res, rej) => {
    const t = d.transaction(store, mode);
    const s = t.objectStore(store);
    let out;
    const q = fn(s);
    if (q) q.onsuccess = () => { out = q.result; };
    t.oncomplete = () => res(out);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  });
}
const Store = {
  get: (k) => tx('kv', 'readonly', s => s.get(k)),
  set: (k, v) => tx('kv', 'readwrite', s => s.put(v, k)),
  audioPut: (id, rec) => tx('audio', 'readwrite', s => s.put(rec, id)),
  audioGet: (id) => tx('audio', 'readonly', s => s.get(id)),
  audioDel: (id) => tx('audio', 'readwrite', s => s.delete(id)),
  audioKeys: () => tx('audio', 'readonly', s => s.getAllKeys()),
  audioClear: () => tx('audio', 'readwrite', s => s.clear())
};

/* ---------- Recorder: mic + voice activity + speech recognition ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
function pickMime() {
  if (!window.MediaRecorder) return '';
  const c = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'];
  for (const m of c) { try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (e) {} }
  return '';
}

const Rec = {
  supported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder),
  sttSupported: !!SR,
  active: false,
  async start(opts) {
    opts = opts || {};
    const st = this.st = {
      t0: performance.now(), first: null, lastVoice: null, silence: 0, longPauses: 0,
      chunks: [], finals: [], interim: '', level: 0, stt: !!SR, sttError: '', curSilence: 0
    };
    // start recognition first, while still inside the tap (iOS needs the user gesture)
    this.active = true;
    if (SR) this._startSR(opts);
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      this.active = false; st.stopping = true; try { st.sr && st.sr.abort(); } catch (x) {}
      throw Object.assign(new Error('mic'), { code: e && e.name === 'NotAllowedError' ? 'denied' : 'nomic' });
    }
    st.stream = stream;
    const mime = pickMime();
    try { st.mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream); }
    catch (e) { st.mr = new MediaRecorder(stream); }
    st.mime = st.mr.mimeType || mime || 'audio/webm';
    st.mr.ondataavailable = (e) => { if (e.data && e.data.size) st.chunks.push(e.data); };
    st.mr.start(1000);

    // voice activity
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      st.ac = new AC();
      if (st.ac.state === 'suspended') { try { st.ac.resume(); } catch (x) {} }
      const src = st.ac.createMediaStreamSource(stream);
      const an = st.ac.createAnalyser(); an.fftSize = 1024; src.connect(an);
      const buf = new Float32Array(an.fftSize);
      let last = performance.now();
      st.iv = setInterval(() => {
        an.getFloatTimeDomainData(buf);
        let sum = 0; for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);
        st.level = Math.min(1, rms * 9);
        const now = performance.now(); const dt = now - last; last = now;
        const voiced = rms > 0.018;
        if (voiced) {
          if (st.first == null) st.first = now;
          if (st.curSilence > 1500) st.longPauses++;
          st.curSilence = 0; st.lastVoice = now;
        } else if (st.first != null) {
          st.curSilence += dt;
          st.silence += dt;
        }
        opts.onLevel && opts.onLevel(st.level);
      }, 80);
    } catch (e) { /* level meter optional */ }

  },
  _startSR(opts) {
    const st = this.st;
    let r;
    try { r = new SR(); } catch (e) { st.stt = false; return; }
    st.sr = r;
    r.lang = 'en-US'; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
    r.onresult = (ev) => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        if (res.isFinal) st.finals.push(res[0].transcript.trim());
        else interim += res[0].transcript;
      }
      st.interim = interim;
      opts.onText && opts.onText(this.text());
    };
    r.onerror = (e) => { st.sttError = e.error || 'error'; if (e.error === 'not-allowed' || e.error === 'service-not-allowed') st.stt = false; };
    r.onend = () => {
      if (st.interim) { st.finals.push(st.interim.trim()); st.interim = ''; }
      if (this.active && st.stt && !st.stopping) { try { r.start(); } catch (e) {} }
    };
    try { r.start(); } catch (e) { st.stt = false; st.sttError = 'start'; }
  },
  text() {
    const st = this.st; if (!st) return '';
    return (st.finals.join(' ') + ' ' + (st.interim || '')).replace(/\s+/g, ' ').trim();
  },
  async stop() {
    const st = this.st; if (!st) return null;
    st.stopping = true; this.active = false;
    const end = performance.now();
    clearInterval(st.iv);
    if (st.sr) { try { st.sr.stop(); } catch (e) {} await new Promise(r => setTimeout(r, 700)); }
    const blob = await new Promise((res) => {
      if (!st.mr || st.mr.state === 'inactive') { res(new Blob(st.chunks, { type: st.mime })); return; }
      st.mr.onstop = () => res(new Blob(st.chunks, { type: st.mime }));
      try { st.mr.stop(); } catch (e) { res(new Blob(st.chunks, { type: st.mime })); }
    });
    try { st.stream.getTracks().forEach(t => t.stop()); } catch (e) {}
    try { st.ac && st.ac.close(); } catch (e) {}
    const firstMs = st.first != null ? Math.round(st.first - st.t0) : null;
    const speakEnd = st.lastVoice || end;
    const out = {
      blob, mime: st.mime,
      transcript: this.text(),
      sttUsed: st.stt, sttError: st.sttError,
      firstMs,
      durMs: st.first != null ? Math.round(speakEnd - st.first) : 0,
      totalMs: Math.round(end - st.t0),
      silenceMs: Math.max(0, Math.round(st.silence - (end - speakEnd))),
      longPauses: st.longPauses
    };
    this.st = null;
    return out;
  },
  cancel() {
    const st = this.st; if (!st) return;
    st.stopping = true; this.active = false; clearInterval(st.iv);
    try { st.sr && st.sr.abort(); } catch (e) {}
    try { st.mr && st.mr.state !== 'inactive' && st.mr.stop(); } catch (e) {}
    try { st.stream.getTracks().forEach(t => t.stop()); } catch (e) {}
    try { st.ac && st.ac.close(); } catch (e) {}
    this.st = null;
  }
};

/* ---------- Text to speech ---------- */
const Speech = {
  ok: 'speechSynthesis' in window,
  voice: null,
  pick() {
    if (!this.ok) return null;
    const vs = speechSynthesis.getVoices().filter(v => /^en[-_]/i.test(v.lang));
    const pref = ['Samantha', 'Ava', 'Allison', 'Google US English', 'Microsoft Aria', 'Karen', 'Daniel'];
    for (const p of pref) { const v = vs.find(x => x.name.indexOf(p) >= 0); if (v) return (this.voice = v); }
    this.voice = vs.find(v => /en-US/i.test(v.lang)) || vs[0] || null;
    return this.voice;
  },
  speak(text, rate) {
    return new Promise((res) => {
      if (!this.ok || !text) { res(false); return; }
      try { speechSynthesis.cancel(); } catch (e) {}
      const u = new SpeechSynthesisUtterance(text);
      const v = this.voice || this.pick(); if (v) u.voice = v;
      u.lang = (v && v.lang) || 'en-US'; u.rate = rate || 0.95;
      u.onend = () => res(true); u.onerror = () => res(false);
      speechSynthesis.speak(u);
    });
  },
  stop() { try { this.ok && speechSynthesis.cancel(); } catch (e) {} }
};
if (Speech.ok) { try { speechSynthesis.onvoiceschanged = () => Speech.pick(); } catch (e) {} }

/* ---------- Claude API ---------- */
const AI = {
  key: '', evalModel: 'claude-sonnet-5-5', chatModel: 'claude-haiku-5-5',
  async call({ system, messages, model, maxTokens, temperature }) {
    if (!this.key) throw Object.assign(new Error('API 키가 없어요'), { code: 'nokey' });
    let r;
    try {
      r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({ model: model || this.evalModel, max_tokens: maxTokens || 1500, system, messages, temperature: temperature == null ? 0.4 : temperature })
      });
    } catch (e) { throw Object.assign(new Error('인터넷 연결을 확인해 주세요'), { code: 'network' }); }
    let j = null; try { j = await r.json(); } catch (e) {}
    if (!r.ok) {
      const m = (j && j.error && j.error.message) || ('HTTP ' + r.status);
      let code = 'api', msg = 'AI 요청이 실패했어요: ' + m;
      if (r.status === 401) { code = 'auth'; msg = 'API 키가 올바르지 않아요. 설정에서 키를 확인해 주세요.'; }
      else if (r.status === 429) { code = 'rate'; msg = '요청이 많아서 잠시 막혔어요. 1분 뒤 다시 시도해 주세요.'; }
      else if (r.status === 400 && /credit|balance/i.test(m)) { code = 'credit'; msg = '크레딧이 부족해요. 콘솔에서 충전해 주세요.'; }
      else if (r.status === 404 || /model/i.test(m) && r.status === 400) { code = 'model'; msg = '모델 이름을 찾을 수 없어요. 설정에서 모델을 바꿔 주세요. (' + m + ')'; }
      else if (r.status === 529 || r.status >= 500) { code = 'server'; msg = 'AI 서버가 바빠요. 잠시 뒤 다시 시도해 주세요.'; }
      throw Object.assign(new Error(msg), { code });
    }
    const text = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    return { text, usage: j.usage };
  },
  async json(opts) {
    const { text } = await this.call(opts);
    return parseJSON(text);
  }
};
function parseJSON(text) {
  try { return JSON.parse(text); } catch (e) {}
  const s = text.indexOf('{'), e2 = text.lastIndexOf('}');
  if (s >= 0 && e2 > s) { try { return JSON.parse(text.slice(s, e2 + 1)); } catch (e) {} }
  throw Object.assign(new Error('AI 답변을 읽지 못했어요. 다시 시도해 주세요.'), { code: 'parse' });
}

window.PSS = { Store, Rec, Speech, AI, parseJSON };
})();
