(async function () {
  // ① 경로 자동 계산(현재 test.html 기준 상대경로)
  const BASE = location.pathname.replace(/\/[^/]*$/, ""); // /.../test.html -> /.../
  const DATA_URL = `${BASE}/data/qsccII.json`;            // /.../data/qsccII.json
  const STORAGE_KEY = "qsccii_v1";

  // ② 로드 실패 대비 샘플(2문항)
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

  // ===== 기록 삭제(초기화) =====
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

  // 체질 키, 합계, 저장
  const TYPES = () => (state.data && state.data.types) ? state.data.types : [];
  function calcTotals() {
    const totals = Object.fromEntries(TYPES().map(t => [t, 0]));
    (state.data.questions || []).forEach(q => {
      const chosen = state.answers[q.id];
      if (!chosen) return;
      const opt = (q.options || []).find(o => o.id === chosen);
      if (!opt || !opt.scores) return;
      TYPES().forEach(t => totals[t] += Number(opt.scores[t] || 0));
    });
    return totals;
  }
  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      answers: state.answers,
      totals: calcTotals()
    }));
  }

  // ===== 미응답 검사 → 결과 전환 제어 =====
  function getUnansweredList() {
    const arr = [];
    (state.data.questions || []).forEach((q, i) => {
      const id = (typeof q.id === "number" || typeof q.id === "string") ? q.id : (i + 1);
      if (!state.answers[q.id]) arr.push(Number(id));
    });
    return arr.sort((a, b) => a - b);
  }

  function showUnansweredModal(missing) {
    // 기존 오버레이 제거
    const old = document.getElementById("ua-overlay");
    if (old) old.remove();

    const overlay = document.createElement("div");
    overlay.id = "ua-overlay";
    overlay.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,.30);
      display:flex; align-items:center; justify-content:center; z-index:9999;
    `;

    const modal = document.createElement("div");
    modal.style.cssText = `
      width:836px; height:463px; border-radius:52px; background:#A294F9;
      box-shadow:0 10px 40px rgba(0,0,0,.25);
      position:relative; padding:32px;
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      text-align:center;
    `;

    // 닫기 버튼
    const close = document.createElement("button");
    close.textContent = "✕";
    close.setAttribute("aria-label","닫기");
    close.style.cssText = `
      position:absolute; top:18px; right:22px; border:none; background:transparent;
      font-size:24px; cursor:pointer; line-height:1;
    `;
    close.onclick = () => overlay.remove();

    // 경고 아이콘
    const icon = document.createElement("div");
    icon.textContent = "⚠️";
    icon.style.cssText = "font-size:48px; margin-bottom:8px;";

    // 미응답 문항 번호 리스트(클릭 이동)
    const listWrap = document.createElement("div");
    listWrap.style.cssText = "margin:8px 0 6px;";

    const nums = document.createElement("div");
    nums.style.cssText = `
      display:flex; flex-wrap:wrap; gap:12px; justify-content:center; align-items:center;
      font-weight:800; font-size:22px; color:#D7263D;
    `;
    missing.forEach(n => {
      const btn = document.createElement("button");
      btn.textContent = `${n}번`;
      btn.style.cssText = `
        background:transparent; border:none; cursor:pointer;
        color:#D7263D; text-decoration:underline; font-weight:800; font-size:22px;
      `;
      btn.onclick = () => {
        overlay.remove();
        state.idx = Number(n) - 1;
        setHash();
        renderQuestion();
      };
      nums.appendChild(btn);
    });

    const line1 = document.createElement("div");
    line1.textContent = "문제를 답변하지 않았습니다.";
    line1.style.cssText = "font-weight:800; font-size:20px; color:#000; margin-top:10px;";

    const line2 = document.createElement("div");
    line2.textContent = "답변해주셔야 결과가 제공됩니다.";
    line2.style.cssText = "font-weight:800; font-size:20px; color:#000; margin-top:6px;";

    listWrap.appendChild(nums);
    modal.appendChild(close);
    modal.appendChild(icon);
    modal.appendChild(listWrap);
    modal.appendChild(line1);
    modal.appendChild(line2);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  function tryShowResult() {
    const missing = getUnansweredList();
    if (missing.length > 0) {
      showUnansweredModal(missing);
      return false;
    }
    renderResult();
    return true;
  }

  // 옵션(카드 190×453)
  function renderOptions(q){
    const cols = (q.options || []).length || 1;
    optsEl.style.setProperty('--cols', cols);  // 2/3/4 보기 열 수 전달
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
      mark.textContent = `${String.fromCharCode(97 + i)}.`;  // a. b. c. d.
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
        save();         // 선택 저장(누적 점수 포함)
        renderPager();  // 진행도 색 즉시 반영

        // 자동 다음(마지막이면 결과/검증)
        setTimeout(() => {
          if (state.idx < total() - 1) {
            state.idx++;
            setHash();
            renderQuestion();
          } else {
            tryShowResult();
          }
        }, 120);
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
      const isDone = !!state.answers[n]; // 답변이 있으면 완료로 간주
      b.className = "page-dot " + (isCurrent ? "dot-current" : isDone ? "dot-done" : "dot-todo");
      b.textContent = String(n);
      b.onclick = () => { state.idx = n - 1; setHash(); renderQuestion(); };
      pager.appendChild(b);
    }

    const nextB = document.createElement("button");
    nextB.className = "page-arrow"; nextB.textContent = "›";
    nextB.disabled = cur === tot;
    nextB.onclick = () => { 
      if (state.idx < tot - 1) { 
        state.idx++; setHash(); renderQuestion(); 
      } else { 
        tryShowResult(); 
      } 
    };
    pager.appendChild(nextB);
  }

  // ===== 결과 계산(최다 득점 + 백분율) =====
  function computeResult() {
    const types = state.data.types || []; // ["태양인","태음인","소양인","소음인"]
    const totals = Object.fromEntries(types.map(t => [t, 0]));

    // 선택된 선지들의 점수 합산
    (state.data.questions || []).forEach(q => {
      const chosen = state.answers[q.id];
      if (!chosen) return;
      const opt = (q.options || []).find(o => o.id === chosen);
      if (!opt || !opt.scores) return;
      types.forEach(t => { totals[t] += Number(opt.scores[t] || 0); });
    });

    // 최다 득점 체질
    const max = types.length ? Math.max(...types.map(t => totals[t])) : 0;
    const ties = types.filter(t => totals[t] === max);
    const pref = state.data.scoring?.tieBreaker || types;
    const winner = ties.length
      ? (ties.length > 1 ? (pref.find(t => ties.includes(t)) || ties[0]) : ties[0])
      : null;

    // 백분율(정수 반올림)
    const sum = Object.values(totals).reduce((a, b) => a + b, 0);
    const percentages = Object.fromEntries(
      types.map(t => [t, sum > 0 ? Math.round((totals[t] / sum) * 100) : 0])
    );

    return { winner, totals, percentages };
  }

  // ===== 결과 표시 =====
  function renderResult() {
    const { winner, totals, percentages } = computeResult();

    // 퍼센트 내림차순으로 표시
    const types = state.data.types || [];
    const sorted = [...types].sort((a, b) => (percentages[b] || 0) - (percentages[a] || 0));
    const pctLine = sorted.map(t => `${t}: ${percentages[t]}%`).join(" · ");

    qcard.hidden = true; result.hidden = false;
    result.innerHTML = `
      <div class="result-title" style="text-align:center">
        당신은 "<strong>${winner || "-"}</strong>" 입니다.
      </div>
      <div class="result-desc" style="text-align:center">
        ${pctLine}
      </div>
      <div style="display:flex;gap:12px;justify-content:center;margin-top:16px">
        <a class="btn btn-prev" href="./test.html#q=1" data-reset="true" id="restartBtn"
           style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center">처음부터 다시</a>
        <a class="btn btn-next" href="./whatisqscc.html" data-reset="true"
           style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center">설명 다시 보기</a>
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

  // 문항 렌더
  function renderQuestion() {
    const q = state.data.questions[state.idx];
    if (!q) {
      console.error("[QSCC] 질문이 없습니다. JSON을 확인하세요:", DATA_URL);
      return;
    }
    qcard.hidden = false; result.hidden = true;

    qtitle.textContent = q.title || `Q${q.id}.`;
    qtext.textContent  = q.text || "";

    renderOptions(q);
    renderPager();

    // prev/next 버튼은 CSS로 숨겨둔 상태지만 로직은 유지
    prev.disabled = state.idx === 0;
    next.textContent = state.idx === total() - 1 ? "결과 보기" : "다음";
    next.disabled = !state.answers[q.id];
  }

  prev.addEventListener("click", () => { 
    if (state.idx > 0) { state.idx--; setHash(); renderQuestion(); } 
  });
  next.addEventListener("click", () => { 
    if (state.idx < total() - 1) { 
      state.idx++; setHash(); renderQuestion(); 
    } else { 
      tryShowResult(); 
    } 
  });
  window.addEventListener("hashchange", () => { state.idx = parseHash(); renderQuestion(); });

  // ===== 전역: 로고/메인/리셋 링크 클릭 시 기록 삭제 =====
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    const href = a.getAttribute("href") || "";
    const isLogo = a.classList.contains("logo");
    const toMain = /(^|\/)index\.html(?:$|[?#])/.test(href);
    const isReset = a.dataset && a.dataset.reset === "true";

    if (isLogo || toMain || isReset) {
      clearProgressStorage();
      // data-reset=true + test.html → 위에서 별도 처리(restartBtn)
      // 메인으로 이동하는 경우는 기본 네비게이션 진행(초기화만 수행)
    }
  });

  // 시작
  state.idx = parseHash();
  if (!location.hash) location.hash = "#q=1";
  renderQuestion();
})();
