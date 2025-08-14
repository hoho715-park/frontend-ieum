(async function () {
  // ① 경로 자동 계산(현재 test.html 기준 상대경로)
  const BASE = location.pathname.replace(/\/[^/]*$/, ""); // /.../test.html -> /.../
  const DATA_URL = `${BASE}/data/qsccII.json`; // /.../data/qsccII.json
  const STORAGE_KEY = "qsccii_v1";

  // ② 로드 실패 대비 샘플(2문항) — 실제에선 qsccii.json 사용
  const FALLBACK = {
    title: "QSCC-II",
    types: ["태양인", "태음인", "소양인", "소음인"],
    scoring: { method: "sum", tieBreaker: ["태양인", "태음인", "소양인", "소음인"] },
    questions: [
      {
        id: 1, title: "Q1.", text: "당신의 체격은 어떻습니까?",
        options: [
          { id: "A", label: "큰 편이다", image: { src: `${BASE}/public/images/test/q1_A.png` }, scores: {"태양인":2,"태음인":2} },
          { id: "B", label: "보통이다", image: { src: `${BASE}/public/images/test/q1_B.png` }, scores: {"태양인":1,"태음인":1,"소양인":1,"소음인":1} },
          { id: "C", label: "작은 편이다", image: { src: `${BASE}/public/images/test/q1_C.png` }, scores: {"소양인":2,"소음인":2} }
        ],
        required: true
      },
      {
        id: 2, title: "Q2.", text: "당신의 체형은 어떻습니까?",
        options: [
          { id: "A", label: "뚱뚱한 편이다", image: { src: `${BASE}/public/images/test/q2_A.png` }, scores: {"태음인":2} },
          { id: "B", label: "보통이다",     image: { src: `${BASE}/public/images/test/q2_B.png` }, scores: {"소양인":1,"소음인":1} },
          { id: "C", label: "마른 편이다",   image: { src: `${BASE}/public/images/test/q2_C.png` }, scores: {"소양인":2,"소음인":2} }
        ],
        required: true
      }
    ]
  };

  const state = { data: null, idx: 0, answers: {} };

  // DOM
  const qcard  = document.getElementById("qcard");
  const qtitle = document.getElementById("qtitle");
  const qtext  = document.getElementById("qtext");
  const optsEl = document.getElementById("opts");
  const prev   = document.getElementById("prev");
  const next   = document.getElementById("next");
  const pager  = document.getElementById("pager");
  const result = document.getElementById("result");

  // ===== 초기화(기록 삭제) 함수 =====
  function clearProgressStorage() {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    state.answers = {};
  }

  // 데이터 로드(에러 안전)
  try {
    const res = await fetch(DATA_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.data = await res.json();
  } catch (e) {
    console.warn("[QSCC] 질문 JSON 로드 실패 → 샘플 데이터로 진행:", e?.message || e);
    state.data = FALLBACK;
  }

  // 저장 복구
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (saved.answers) state.answers = saved.answers;
  } catch {}

  // 유틸
  const total = () => state.data.questions.length;
  const parseHash = () => {
    const m = location.hash.match(/q=(\d+)/);
    return m ? Math.min(Math.max(+m[1], 1), total()) - 1 : 0;
  };
  const setHash = () => { location.hash = `#q=${state.idx + 1}`; };
  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers: state.answers }));

  // 옵션(190×453)
  function renderOptions(q){
  const cols = (q.options || []).length || 1;
  optsEl.style.setProperty('--cols', cols);  // 보기 개수(2/3/4)에 맞춰 열 수 전달
  optsEl.innerHTML = "";

  (q.options || []).forEach((opt, i) => {
    const card = document.createElement("div");
    card.className = "opt-card" + (state.answers[q.id] === opt.id ? " selected" : "");

    // 1) 이미지
    const imgWrap = document.createElement("div");
    imgWrap.className = "opt-img";
    const img = document.createElement("img");
    img.src = opt.image?.src || "";
    img.alt = opt.image?.alt || opt.label;
    imgWrap.appendChild(img);

    // 2) 라벨/제목
    const meta = document.createElement("div");
    meta.className = "opt-meta";
    const mark = document.createElement("div");
    mark.className = "opt-mark";
    mark.textContent = `${String.fromCharCode(97 + i)}.`;  // a. b. c.
    const title = document.createElement("div");
    title.className = "opt-title";
    title.textContent = opt.label || "";
    meta.appendChild(mark);
    meta.appendChild(title);

    // 3) 설명(배열/문자열 모두 지원)
    const descWrap = document.createElement("ul");
    descWrap.className = "opt-desc";
    const lines = Array.isArray(opt.desc) ? opt.desc
                 : typeof opt.desc === "string" ? opt.desc.split(/\n+/) : [];
    lines.forEach(t => {
      if (!t) return;
      const li = document.createElement("li");
      li.textContent = t;
      descWrap.appendChild(li);
    });

    // === 선택 처리: 저장 → 진행도 갱신 → 자동 다음 ===
    card.addEventListener("click", () => {
      state.answers[q.id] = opt.id;
      [...optsEl.children].forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      save();         // 선택 저장
      renderPager();  // 하단 원 색 즉시 반영

      // ★ 자동 다음(마지막이면 결과로)
      setTimeout(() => {
        if (state.idx < total() - 1) {
          state.idx++;
          setHash();
          renderQuestion();
        } else {
          renderResult();
        }
      }, 120); // 살짝 딜레이로 선택 강조 효과 보장
    });

    // 조립
    card.appendChild(imgWrap);
    card.appendChild(meta);
    card.appendChild(descWrap);
    optsEl.appendChild(card);
  });
}

  // 진행도 점
  function renderPager() {
    const tot = total();
    const cur = state.idx + 1;
    const group = Math.floor((cur - 1) / 10);
    const start = group * 10 + 1;
    const end   = Math.min(start + 9, tot);

    pager.innerHTML = "";

    const prevB = document.createElement("button");
    prevB.className = "page-arrow"; prevB.textContent = "‹";
    prevB.disabled = cur === 1;
    prevB.onclick = () => { if (state.idx > 0) { state.idx--; setHash(); renderQuestion(); } };
    pager.appendChild(prevB);

    for (let n = start; n <= end; n++) {
      const b = document.createElement("button");
      const isCurrent = (n === cur);
      const isDone = !!state.answers[n];
      b.className = "page-dot " + (isCurrent ? "dot-current" : isDone ? "dot-done" : "dot-todo");
      b.textContent = String(n);
      b.onclick = () => { state.idx = n - 1; setHash(); renderQuestion(); };
      pager.appendChild(b);
    }

    const nextB = document.createElement("button");
    nextB.className = "page-arrow"; nextB.textContent = "›";
    nextB.disabled = cur === tot;
    nextB.onclick = () => { if (state.idx < tot - 1) { state.idx++; setHash(); renderQuestion(); } };
    pager.appendChild(nextB);
  }

  function computeResult() {
    const types = state.data.types || [];
    const scores = Object.fromEntries(types.map(t => [t, 0]));
    state.data.questions.forEach(q => {
      const chosen = state.answers[q.id];
      if (!chosen) return;
      const opt = q.options.find(o => o.id === chosen);
      if (!opt || !opt.scores) return;
      types.forEach(t => { scores[t] += (opt.scores[t] || 0); });
    });
    const max = Math.max(...types.map(t => scores[t]));
    const ties = types.filter(t => scores[t] === max);
    const pref = state.data.scoring?.tieBreaker || types;
    const winner = ties.length > 1 ? (pref.find(t => ties.includes(t)) || ties[0]) : ties[0];
    return { winner, scores };
  }

  function renderResult() {
    const { winner, scores } = computeResult();
    qcard.hidden = true; result.hidden = false;
    const breakdown = Object.entries(scores).map(([k, v]) => `${k}: ${v}`).join(" · ");
    result.innerHTML = `
      <div class="result-title">당신의 체질: ${winner || "-"}</div>
      <div class="result-desc">${breakdown}</div>
      <div style="display:flex;gap:12px;justify-content:center;margin-top:16px">
        <a class="btn btn-prev" href="./test.html#q=1" data-reset="true" id="restartBtn" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center">처음부터 다시</a>
        <a class="btn btn-next" href="./whatisqscc.html" data-reset="true" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center">설명 다시 보기</a>
      </div>
    `;

    // "처음부터 다시"는 페이지 내에서 초기화 후 1번으로 이동
    const restartBtn = document.getElementById("restartBtn");
    if (restartBtn) {
      restartBtn.addEventListener("click", (e) => {
        e.preventDefault();
        clearProgressStorage();
        state.idx = 0;
        setHash();
        renderQuestion();
      });
    }
  }

  function renderQuestion() {
    const q = state.data.questions[state.idx];
    if (!q) {
      console.error("[QSCC] 질문이 없습니다. JSON을 확인하세요:", DATA_URL);
      return;
    }
    qcard.hidden = false; result.hidden = true;

    qtitle.textContent = q.title || `Q${q.id}.`;
    qtext.textContent  = q.text;

    renderOptions(q);
    renderPager();

    prev.disabled = state.idx === 0;
    next.textContent = state.idx === total() - 1 ? "결과 보기" : "다음";
    next.disabled = !state.answers[q.id];
  }

  prev.addEventListener("click", () => { if (state.idx > 0) { state.idx--; setHash(); renderQuestion(); } });
  next.addEventListener("click", () => { if (state.idx < total() - 1) { state.idx++; setHash(); renderQuestion(); } else { renderResult(); } });
  window.addEventListener("hashchange", () => { state.idx = parseHash(); renderQuestion(); });

  // ===== 전역: 로고/메인 링크/리셋 링크 클릭 시 기록 삭제 =====
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    const href = a.getAttribute("href") || "";
    const isLogo = a.classList.contains("logo");
    const toMain = /(^|\/)index\.html(?:$|[?#])/.test(href);
    const isReset = a.dataset && a.dataset.reset === "true";

    if (isLogo || toMain || isReset) {
      clearProgressStorage();
      // data-reset=true 이면서 test.html로 가는 경우는 위에서 별도 처리(restartBtn)
      // 메인으로 이동하는 경우는 기본 네비게이션 진행(초기화만 수행)
    }
  });

  // 시작
  state.idx = parseHash();
  if (!location.hash) location.hash = "#q=1";
  renderQuestion();
})();
