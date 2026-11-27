/* Pixie Speaking Studio — prompts for Claude */
(function () {
'use strict';
const TAGS = window.PSS_DATA.weakTags;

const PHILOSOPHY = `The learner is a Korean adult at about CEFR B2 aiming for stable practical B2+ speaking, and ultimately "to think, speak, and express myself naturally and precisely in English".
Core principles:
- Judge meaning, clarity of the request, and fit to the situation. Never judge by string match with a model answer.
- Sentence completion is the key skill: did the learner start AND finish the thought (explanation -> request/question/conclusion)? A short complete message passes; a long unfinished one does not. Example: "I've already reported the issue twice, but..." (stops) = incomplete. "I've reported this twice. Could you help me?" = complete, PASS.
- Do NOT penalize fillers (um, well, I mean), restarts, self-corrections or paraphrasing around a missing word. Recovering and finishing the thought is a strength.
- Keep the learner's own words as much as possible. Essential correction fixes only what blocks meaning or is a clear grammar error.
- Natural alternative: ONE version, how a fluent speaker would say the same idea. Not longer or fancier unless that is more natural; shorter is fine.
- Point out Korean-style literal translation (직역) when present.
- Write all explanations in natural, concise Korean (해요체). English examples stay in English.`;

const KX = `"key_expressions": [{"en":"reusable form of the expression (use ~ for open slots, e.g. 'I had no way of knowing ~'; for grammar frames give a natural example form like 'get the difference refunded')","ko":"정확한 한국어 의미","kind":"pattern (reusable grammar frame) | fixed (fixed phrase/collocation)","context":"한국어: 실제로 언제 쓰는지","example":"one English example tied to the learner's own answer","example_ko":"그 예문의 한국어","why":"한국어: 왜 이 표현이 자연스러운지 한 줄","func":"one of 요청|거절 대응|이유 설명|조건 제시|불만 제기|사과·양해|확인 질문|의견 말하기|경험 서술|연결어|기타"}] (1-3 expressions genuinely worth learning from THIS answer, preferring ones the learner lacked or used awkwardly; [] if none),
 "used_expressions": [exact strings from MY EXPRESSIONS that the learner actually used appropriately in this answer; [] if none]`;
function myLine(list) { return list && list.length ? `MY EXPRESSIONS (the learner is practicing these; detect if any were used appropriately, small grammar slips are fine): ${JSON.stringify(list)}` : 'MY EXPRESSIONS: none'; }
const VERD = `"verdict": "PASS" (intent is clear and complete) | "PASS_FIX" (intent comes across but there is an important error) | "RETRY" (intent unclear, misleading, or the thought was not finished)`;

function realEval({ situation, kind, role, mode, text, written, metrics, attempts, stem, extra, myExprs }) {
  const speech = mode !== 'write';
  const lines = [];
  lines.push(`Situation (Korean, shown to learner): ${situation}`);
  if (role) lines.push(`Listener: ${role}`);
  lines.push(`Problem type: ${kind === 'tricky' ? 'tricky / unexpected problem to solve' : kind === 'general' ? 'everyday question or request' : kind || 'practice'}`);
  if (stem) lines.push(`Task: finish the sentence that starts with "${stem}". The learner must complete the reason / conclusion / request. Any ending that fits the situation and completes the meaning passes.`);
  lines.push(`Mode: ${({ write: 'written answer (typed)', speak: 'spoken without looking at their written answer', spont: 'spontaneous speech, no writing first', finish: 'spoken sentence completion drill', retell: 'retelling the same meaning in their own words after seeing a natural alternative', drill: 'expression drill' })[mode] || mode}`);
  if (extra) lines.push(extra);
  if (written) lines.push(`The learner's earlier written answer for the same situation: "${written}"`);
  if (speech) {
    lines.push(`The learner's words come from browser speech recognition (they may have edited it). Recognition can drop punctuation, mishear words or cut the end. Never call an answer incomplete just because punctuation is missing. If a word looks like a recognition error rather than an English error, list it in stt_suspects and do not count it against the learner.`);
    if (metrics) lines.push(`Measured: time to first speech ${metrics.firstMs == null ? 'unknown' : (metrics.firstMs / 1000).toFixed(1) + 's'}, speaking time ${(metrics.durMs / 1000).toFixed(1)}s, pauses within speech ${(metrics.silenceMs / 1000).toFixed(1)}s, long pauses (>1.5s) ${metrics.longPauses}, attempt #${attempts || 1}. Use these only as context for the spontaneity / fluency comment; speed is never more important than completion.`);
  }
  lines.push(`Korean words may appear inside the English (the learner wrote Korean where they did not know the English). Do not lower the verdict for that alone: judge the logic and meaning, put each Korean part in "bridges" with the most natural English for this context, and use the English in essential/natural.`);
  lines.push(myLine(myExprs));
  lines.push(`\nLearner's answer:\n"""${text}"""`);
  lines.push(`\nReturn ONLY JSON:
{
 ${VERD},
 "verdict_reason": "한국어 한 문장",
 "dims": {"meaning":"good|ok|work","situation":"good|ok|work","completion":"good|ok|work","clarity":"good|ok|work"${speech ? ',"spontaneity":"good|ok|work","fluency":"good|ok|work"' : ''}},
 "completed": true/false,
 "request_done": true/false,
 "completion_note": "한국어: 생각을 끝까지 말했는지, 어디서 끊기거나 구조가 무너졌는지 (짧게)",
 "original": "the learner's answer as given",
 "essential": "minimal correction keeping their words (same as original if nothing essential)",
 "natural": "one natural alternative",
 "natural_note": "한국어: 왜 더 영어다운지, 직역이 있었다면 무엇인지 (1-2문장)",
 "bridges": [{"ko":"한국어 부분","en":"natural English","note":"한국어 짧은 설명"}],
 "stt_suspects": [{"heard":"...","likely":"..."}],
 "weak_tags": [subset of ${JSON.stringify(TAGS)}],
 "tip": "한국어: 다음 시도에서 집중할 한 가지",
 ${KX}
}`);
  return { system: PHILOSOPHY, messages: [{ role: 'user', content: lines.join('\n') }], maxTokens: 2000 };
}

function opicEval({ q, type, text, metrics, mode, myExprs }) {
  const sys = `You are an OPIc speaking coach. The learner targets AL (Advanced Low). AL means: paragraph-length answers with a beginning, development and end; consistent control of past/present time frames when narrating; varied description; natural connectors creating cohesion; able to explain and resolve an unfamiliar complicated situation.
${PHILOSOPHY}
- This is practice feedback, never an official OPIc rating. Do not state an official grade.`;
  const lines = [
    `OPIc question (${type}): "${q}"`,
    `Mode: ${mode === 'mock' ? 'mock test' : 'practice'}`,
    `The answer comes from browser speech recognition (may be edited). Missing punctuation or misheard words are not the learner's fault; list suspicious words in stt_suspects.`,
    metrics ? `Measured: time to first speech ${metrics.firstMs == null ? 'unknown' : (metrics.firstMs / 1000).toFixed(1) + 's'}, speaking time ${(metrics.durMs / 1000).toFixed(0)}s, pauses ${(metrics.silenceMs / 1000).toFixed(0)}s, long pauses ${metrics.longPauses}.` : '',
    `Korean words may appear where the learner did not know the English: give the English in "bridges", don't lower the verdict for that alone.`,
    myLine(myExprs),
    `\nAnswer:\n"""${text}"""`,
    `\nReturn ONLY JSON:
{
 "verdict": "PASS" (answers the question with specific, coherent development) | "ALMOST" (on topic but thin, unstructured or time frame slips) | "RETRY" (off topic, too short, or not finished),
 "verdict_reason": "한국어 한 문장",
 "dims": {"relevance":"good|ok|work","detail":"good|ok|work","structure":"good|ok|work","tense":"good|ok|work","connectors":"good|ok|work","recovery":"good|ok|work","ending":"good|ok|work"},
 "length_note": "한국어: 분량과 전개에 대한 한 문장",
 "strengths": "한국어: 잘한 점 1-2개",
 "fixes": [{"original":"...","better":"...","why":"한국어"}] (max 3, most important first),
 "upgrade": "2-4 English sentences: the key part of THEIR answer, said more naturally, keeping their content",
 "bridges": [{"ko":"...","en":"...","note":"..."}],
 "stt_suspects": [{"heard":"...","likely":"..."}],
 "weak_tags": [subset of ${JSON.stringify(TAGS)}],
 "tip": "한국어: 다음 답변에서 집중할 한 가지",
 ${KX}
}`
  ];
  return { system: sys, messages: [{ role: 'user', content: lines.filter(Boolean).join('\n') }], maxTokens: 2200 };
}

function dailyProblems({ cats, recent }) {
  return {
    system: `You write realistic English-speaking practice situations for a Korean adult (B2) who wants to handle real problems abroad. Situations are written in natural Korean (해요체 지시문), concrete, with the specific details needed to speak (times, amounts, what already happened). Never include the English answer or English hints.`,
    messages: [{ role: 'user', content: `Make 5 situations for today.
- 3 "general": everyday questions or requests.
- 2 "tricky": unexpected problems where the learner must explain, negotiate, and push for a solution (the staff may refuse or give conditions).
Use these categories in this order: ${cats.map(c => c.id + ' (' + c.ko + ')').join(', ')}. The first three are general, the last two tricky.
Avoid repeating these recent situations: ${recent.slice(0, 30).join(' / ') || 'none'}
Return ONLY JSON: {"problems":[{"cat":"category id","kind":"general|tricky","ko":"Korean situation, 1-3 sentences, ends with what to say/ask","role":"English description of who the learner talks to"}]}` }],
    maxTokens: 1400, temperature: 0.9
  };
}

function hints({ situation }) {
  return {
    system: 'You help a Korean B2 English learner start speaking without giving away a full answer. Return only JSON.',
    messages: [{ role: 'user', content: `Situation: ${situation}
Give staged hints.
{"h1":"3-5 key English words or short phrases, comma separated",
 "h2":"한국어: 말하는 순서 (예: 상황 설명 → 이유 → 요청), 한 줄",
 "h3":"Only the first 3-6 words of a natural opening, ending with ..."}` }],
    maxTokens: 400
  };
}

function rolePlaySystem({ situation, role, kind, turnsLeft, targets }) {
  return `You are role-playing as: ${role}. Speak natural, spoken American English.
Scene (the learner's situation, written in Korean): ${situation}
Rules:
- Stay in character. Reply in 1-3 short spoken sentences. No lists, no stage directions, no emojis.
- ${kind === 'tricky' ? 'Make it realistic and a bit challenging: first refuse or state a policy, add a condition, or offer an imperfect alternative, so the learner has to explain and negotiate. Give in only when they make a clear, reasonable case.' : 'Be helpful but realistic: sometimes give a condition, an alternative, or ask a follow-up question.'}
- If the learner's turn is unclear or unfinished (e.g. trails off with "but..." or "so..."), do NOT guess: ask a natural clarifying question like "Sorry, so what would you like me to do?"
- Never correct the learner's English. Never switch to Korean.${targets && targets.length ? `\n- The learner is practicing these expressions: ${JSON.stringify(targets)}. When it fits naturally, steer the talk so they get a chance to use them, but never say them yourself first.` : ''}
- The learner presses a button when finished speaking, so long pauses are fine. Their text comes from speech recognition and may contain small recognition errors; interpret charitably unless the meaning is truly unclear.
- When the situation is resolved or clearly cannot go further${turnsLeft != null ? ` (about ${turnsLeft} learner turns left)` : ''}, close naturally in one sentence and append the token [END].`;
}

function rolePlayFeedback({ situation, role, log, myExprs }) {
  const convo = log.map(m => (m.role === 'ai' ? role.toUpperCase() : 'LEARNER') + ': ' + m.text + (m.role === 'me' && m.firstMs != null ? `   [started after ${(m.firstMs / 1000).toFixed(1)}s, spoke ${(m.durMs / 1000).toFixed(1)}s]` : '')).join('\n');
  return {
    system: PHILOSOPHY,
    messages: [{ role: 'user', content: `Role-play finished. Situation (Korean): ${situation}. Partner: ${role}.
Learner turns came from speech recognition; ignore punctuation and obvious misrecognitions.
Conversation:
${convo}

Give feedback AFTER the conversation. Focus only on the most important points.
Return ONLY JSON:
{"resolved": true/false,
 "summary":"한국어: 상황을 어떻게 풀어갔는지 2문장",
 "good_moves":"한국어: 잘한 대응 1-2개 (거절에도 대화를 이어간 점 등)",
 "completion_note":"한국어: 말을 끝까지 맺었는지, 끊긴 턴이 있었는지",
 "reaction_note":"한국어: 반응 시간과 말하기 흐름에 대한 한 문장 (속도보다 완결이 우선)",
 "key_errors":[{"original":"...","better":"...","why":"한국어"}] (max 4),
 "weak_tags":[subset of ${JSON.stringify(TAGS)}],
 "used_expressions":[exact strings from ${JSON.stringify(myExprs || [])} that the learner used appropriately; [] if none]}` }],
    maxTokens: 1700
  };
}

function drillMake({ en, ko }) {
  return {
    system: 'You create short practice situations for a Korean B2 English learner. Return only JSON.',
    messages: [{ role: 'user', content: `Target expression: "${en}" (${ko || ''}).
Write 3 different, realistic everyday situations in Korean where this expression fits naturally (different places/people from each other). Each: 1-2 sentences, ending with what the learner should say. Do not include English.
{"drills":[{"ko":"..."},{"ko":"..."},{"ko":"..."}]}` }],
    maxTokens: 600, temperature: 0.8
  };
}

function drillCheck({ en, situation, text }) {
  return {
    system: PHILOSOPHY,
    messages: [{ role: 'user', content: `Target expression: "${en}"
Situation (Korean): ${situation}
Learner: """${text}"""
Did the learner use the target expression (or a correct natural form of it) accurately and with a complete, situation-appropriate meaning?
Return ONLY JSON: {"pass":true/false,"used":true/false,"fixed":"corrected sentence","feedback":"한국어 한두 문장"}` }],
    maxTokens: 500
  };
}

function mockReport({ items }) {
  const body = items.map((it, i) => `Q${i + 1} [${it.type}] ${it.q}\nANSWER (${Math.round((it.metrics && it.metrics.durMs || 0) / 1000)}s, first speech ${it.metrics && it.metrics.firstMs != null ? (it.metrics.firstMs / 1000).toFixed(1) + 's' : '?'}): ${it.text || '(no answer)'}`).join('\n\n');
  return {
    system: `You are an OPIc coach reviewing a full 15-question practice mock test by a learner targeting AL. ${PHILOSOPHY}
This is NOT an official rating. If you mention a level, phrase it as an unofficial practice estimate range and explain it can differ from the real test.`,
    messages: [{ role: 'user', content: `Answers come from speech recognition; ignore punctuation and obvious misrecognitions.
${body}

Return ONLY JSON:
{"overall":"한국어 3문장 종합 평가",
 "unofficial":"한국어: 비공식 연습 추정 (예: 'IH~AL 사이로 보여요. 실제 등급과 다를 수 있어요')",
 "strengths":["한국어",...] (2-3),
 "issues":["한국어",...] (2-3, most important patterns, e.g. 시제 유지, 끝맺음, 고난도 문항에서 분량 감소),
 "by_q":[{"n":1,"verdict":"PASS|ALMOST|RETRY","note":"한국어 한 줄"}...] for every question,
 "focus_next":["한국어 다음 일주일 연습 포인트",...] (2-3),
 "weak_tags":[subset of ${JSON.stringify(TAGS)}]}` }],
    maxTokens: 3500
  };
}

function exprDetail(src, funcs) {
  return {
    system: `You are an English teacher explaining one useful expression to a Korean B2 learner, like a patient tutor. Explanations in natural Korean (해요체), short and clear. Return only JSON.`,
    messages: [{ role: 'user', content: `Expression: "${src.en}"${src.ko ? ` (${src.ko})` : ''}${src.kind ? `, kind: ${src.kind}` : ''}
Where the learner first met it (Korean situation): ${src.scenario || 'unknown'}
Learner's original sentence there: ${src.orig || 'unknown'}
Existing examples (do not repeat): ${JSON.stringify(src.examples || [])}

Return ONLY JSON:
{"en":"canonical form","ko":"정확한 한국어 의미","kind":"pattern|fixed",
 "usage":"한국어: 어떤 상황에서 쓰는지 (1-2문장)",
 "structure":"기본 문장 구조, e.g. 'I had no way of knowing + 명사/that절' or 'get + 목적어 + 과거분사'",
 "pattern_note":"한국어: 공통 문법 패턴인지, 덩어리로 외우는 고정 표현인지 구분해 한두 문장",
 "collocations":["자주 같이 쓰는 단어 조합"] (2-4),
 "related":["같은 패턴을 쓰는 다른 표현"] (pattern only, 2-3; [] for fixed),
 "nuance":[{"vs":"비슷한 영어 표현","note":"한국어: 뉘앙스 차이"}] (1-3),
 "examples":[{"en":"...","ko":"...","context":"한국어 상황 라벨 (예: 호텔 체크인)"}] (4, each a clearly different real-life situation; not the same sentence with swapped words),
 "mistakes":[{"wrong":"...","right":"...","why":"한국어"}] (1-2 mistakes Korean learners often make),
 "func":"one of ${funcs.join('|')}",
 "recall_situation":"Korean: restate the original situation (or invent one if unknown) so the learner must produce this expression; ends with what to say; NO English",
 "apply_situations":["Korean situation 1","Korean situation 2"] (two NEW contexts different from the original and from each other, each ends with what to say; NO English)}` }],
    maxTokens: 2200
  };
}
function exprCheck({ en, kind, structure, situation, text, hints }) {
  return {
    system: PHILOSOPHY + '\nYou judge two things separately: (1) did the message work in the situation, (2) did the learner actually recall and use the TARGET expression. Return only JSON.',
    messages: [{ role: 'user', content: `Target expression: "${en}"${kind ? ' (' + kind + ')' : ''}${structure ? `, core structure: ${structure}` : ''}
Situation (Korean): ${situation}
Hints used before answering: ${hints || 0} (3 means the full expression was shown)
Learner (speech recognition, may have small recognition errors): <<${text}>>

Rules:
- comm_pass: true if the intent is clear and fits the situation, even WITHOUT the target expression.
- used: "exact" if the learner used the target expression/pattern (inflection, tense, pronoun changes and small grammar slips are fine), "equivalent" if they expressed the same idea naturally another way, "none" otherwise.
- structure_ok: false only if they used the expression but broke its core structure.
Return ONLY JSON: {"comm_pass":true/false,"used":"exact|equivalent|none","structure_ok":true/false,"essential":"minimal correction keeping their words","natural":"one natural version that uses the target expression","feedback":"한국어 1-2문장"}` }],
    maxTokens: 600
  };
}
function reviewSituations({ items }) {
  return {
    system: 'You write short Korean practice situations for spaced-repetition review of English expressions. Return only JSON.',
    messages: [{ role: 'user', content: `For each expression, write ONE new realistic situation in Korean (1-2 sentences, ends with what the learner should say) where the expression is the natural thing to say. It must differ from the listed previous situations. Do NOT include any English.
${JSON.stringify(items.map(i => ({ id: i.id, expression: i.en, meaning: i.ko, previous: i.used })))}
Return ONLY JSON: {"items":[{"id":"...","ko":"..."}]}` }],
    maxTokens: 1500
  };
}

window.PSS_PROMPTS = { exprDetail, exprCheck, reviewSituations, realEval, opicEval, dailyProblems, hints, rolePlaySystem, rolePlayFeedback, drillMake, drillCheck, mockReport };
})();
