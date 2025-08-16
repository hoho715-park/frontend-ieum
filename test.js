(async function () {
  // ① 경로 자동 계산(현재 test.html 기준 상대경로)
  const BASE = location.pathname.replace(/\/[^/]*$/, ""); // /.../test.html -> /.../
  const DATA_URL = `${BASE}/data/qsccII.json`;            // /.../data/qsccII.json
  const STORAGE_KEY = "qsccii_v1";
  // 체질별 포인트 컬러
  const TYPE_COLOR = {
    "태양인": "#FF7C9C",
    "소양인": "#F6D372",
    "태음인": "#66B4F1",
    "소음인": "#67D2C6"
    };

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

  /* ===== 체질별 빙고 데이터(예시 25칸) ===== */
const BINGO = {
  "태양인": [
    "비전·목표 먼저 세움","리더 맡는 편","의사결정 빠름","위기대응 강함","문제 해결 욕구 강함",
    "직설적 화법","효율 집착","성과지향","새로운 시도 좋아함","임기응변 능함",
    "데이터로 설득","도전 즐김","태양인", /* 중앙(12) 체질명은 자동 대체 */
    "책임감 강함","피드백 직접적",
    "속도 중시","질보다 양 아님(둘 다)","판단 기준 명확","주도권 선호","경쟁심 있음",
    "큰 그림 잘 봄","단호함","장기전략 수립","회의 진행 잘함","실행력 좋음"
  ],
  "태음인": [
    "끈기·지속성","신중한 결정","안정 선호","현실감각 좋음","리스크 관리",
    "관계 오래 유지","실무 꼼꼼","완성도 중시","체계화 잘함","상세 매뉴얼 선호",
    "팀워크 중시","검증·테스트 철저","태음인",
    "자료 수집 철저","과정 기록 습관",
    "루틴 유지","건강/생활 관리","꾸준한 개선","참을성 좋음","전통/규범 존중",
    "중장기 관점","돈 관리 탄탄","꾸준한 학습","책임감 무겁게","약속 지킴"
  ],
  "소양인": [
    "활동적 에너지","아이디어 풍부","대화 활발","적응 빠름","사교성 좋음",
    "새로움 선호","다양한 관심","즉흥 기획도 OK","동기부여 중요","감정 표현 솔직",
    "분위기 메이커","네트워킹 강점","소양인",
    "유연한 사고","변화 수용",
    "즐거움 추구","멀티태스킹 선호","실행 속도 빠름","트렌드 민감","직관 활용",
    "칭찬에 강함","설득/프레젠테이션","스몰토크 능숙","아이디어 시각화","분위기 주도"
  ],
  "소음인": [
    "분석 좋아함","세부 기준 명확","집중력 좋음","차분/신중","관찰력 세밀",
    "정리·정돈 습관","문서/노트 정리","원인 파고듦","논리 전개","사전 준비 철저",
    "차분한 소통","사실 기반 보고","소음인",
    "리스크 선제 차단","일관된 품질",
    "계획 → 실행 준수","혼자 일도 능숙","깊이 있는 탐구","감정 절제","깔끔한 마감",
    "문제 재발 방지책","데이터 비교","체크리스트 애용","디테일 검수","완벽주의 성향"
  ]
};

/* 5×5 빙고 HTML 생성 */
function renderBingo(type){
  const raw = (BINGO[type] || []).slice(0, 25);
  // 25칸 맞추기
  while (raw.length < 25) raw.push("");
  // 중앙(12번째) 칸은 체질명 표시
  const cells = raw.map((t, i) => {
    const isCenter = i === 12;
    const txt = isCenter ? type : t;
    const cls = "bingo-cell" + (isCenter ? " bingo-free" : "");
    return `<div class="${cls}">${txt || ""}</div>`;
  }).join("");
  return `
    <div class="qscc-bingo">
      <div class="bingo-head"><div class="bingo-title"><체질별 특징 빙고></div></div>
      <div class="bingo-grid">${cells}</div>
    </div>
  `;
}


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

  // ===== 팝업 유틸 =====
  function makeOverlay(id = "overlay") {
    const old = document.getElementById(id);
    if (old) old.remove();
    const overlay = document.createElement("div");
    overlay.id = id;
    overlay.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,.30);
      display:flex; align-items:center; justify-content:center; z-index:9999;
    `;
    return overlay;
  }
  function makeClose(onclick) {
    const close = document.createElement("button");
    close.textContent = "✕";
    close.setAttribute("aria-label","닫기");
    close.style.cssText = `
      position:absolute; top:18px; right:22px; border:none; background:transparent;
      font-size:24px; cursor:pointer; line-height:1;
    `;
    close.onclick = onclick;
    return close;
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
    const overlay = makeOverlay("ua-overlay");

    const modal = document.createElement("div");
    modal.style.cssText = `
      width:836px; height:463px; border-radius:52px; background:#B2B0E8;
      box-shadow:0 10px 40px rgba(0,0,0,.25);
      position:relative; padding:32px;
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      text-align:center;
    `;

    const icon = document.createElement("div");
    icon.textContent = "⚠️";
    icon.style.cssText = "font-size:48px; margin-bottom:8px;";

    const nums = document.createElement("div");
    nums.style.cssText = `
      display:flex; flex-wrap:wrap; gap:12px; justify-content:center; align-items:center;
      font-weight:800; font-size:22px; color:#D7263D; margin:6px 0 10px;
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
    line1.style.cssText = "font-weight:800; font-size:35px; color:#000;";

    const line2 = document.createElement("div");
    line2.textContent = "답변해주셔야 결과가 제공됩니다.";
    line2.style.cssText = "font-weight:800; font-size:35px; color:#000; margin-top:6px;";

    modal.appendChild(makeClose(() => overlay.remove()));
    modal.appendChild(icon);
    modal.appendChild(nums);
    modal.appendChild(line1);
    modal.appendChild(line2);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  // ✅ 완료 팝업(요청 디자인 반영: 버튼 436×99, r=49.5, #7ADAA5)
  function showCompleteModal() {
    const overlay = makeOverlay("done-overlay");

    const modal = document.createElement("div");
    modal.style.cssText = `
      width:836px; height:463px; border-radius:52px; background:#B2B0E8;
      box-shadow:0 10px 40px rgba(0,0,0,.25);
      position:relative; padding:32px;
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      text-align:center;
    `;

    const icon = document.createElement("div");
    icon.textContent = "🎉";
    icon.style.cssText = "font-size:56px; margin-bottom:16px;";

    const title = document.createElement("div");
    title.innerHTML = `모든 문제에 답변하셨습니다.<br/>결과를 확인하시겠습니까?`;
    title.style.cssText = "font-weight:900; font-size:28px; color:#000; line-height:1.4;";

    const btn = document.createElement("button");
    btn.textContent = "결과보기";
    btn.style.cssText = `
      width:436px; height:99px; border-radius:49.5px; background:#FEFFC4;
      border:none; cursor:pointer; margin-top:28px;
      font-size:32px; font-weight:900; color:#000;
      display:inline-flex; align-items:center; justify-content:center;
      box-shadow:0 8px 16px rgba(0,0,0,.12);
    `;
    btn.onclick = () => { overlay.remove(); renderResult(); };

    modal.appendChild(makeClose(() => overlay.remove()));
    modal.appendChild(icon);
    modal.appendChild(title);
    modal.appendChild(btn);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  function tryShowResult() {
    const missing = getUnansweredList();
    if (missing.length > 0) {
      showUnansweredModal(missing);
      return false;
    }
    // 모든 문항이 응답되었으면 완료 팝업 먼저 노출
    showCompleteModal();
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
      // === 선택 처리: 저장 → 진행도 갱신 → (완료 시) 팝업 or 자동 다음 ===
card.addEventListener("click", () => {
  state.answers[q.id] = opt.id;
  [...optsEl.children].forEach(c => c.classList.remove("selected"));
  card.classList.add("selected");
  save();         // 선택 저장(누적 점수 포함)
  renderPager();  // 진행도 색 즉시 반영

  // ✅ 모든 문항이 답변 완료된 순간, 어디서든 바로 '결과보기' 팝업 표시
  if (getUnansweredList().length === 0) {
    showCompleteModal();   // 팝업 띄우고
    return;                // 자동 다음 이동 중단
  }

  // 자동 다음(마지막이면 미응답 검사 → 경고/완료 팝업)
  setTimeout(() => {
    if (state.idx < total() - 1) {
      state.idx++;
      setHash();
      renderQuestion();
    } else {
      tryShowResult(); // 미응답 있으면 경고 팝업, 없으면 완료 팝업
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
  // 진행도 점 (10문항씩 페이징)
function renderPager() {
  const tot = total();
  const cur = state.idx + 1;

  // 현재 문항이 속한 10개 묶음 계산
  const group = Math.floor((cur - 1) / 10);
  const start = group * 10 + 1;              // 이 묶음의 시작 번호 (1, 11, 21, …)
  const end   = Math.min(start + 9, tot);    // 이 묶음의 끝 번호

  pager.innerHTML = "";

  // ◀ 이전 묶음
  const prevB = document.createElement("button");
  prevB.className = "page-arrow";
  prevB.textContent = "‹";
  prevB.disabled = start <= 1;               // 첫 묶음이면 비활성
  prevB.onclick = () => {
    if (start > 1) {
      const newStart = start - 10;           // 이전 묶음의 시작 번호
      state.idx = newStart - 1;              // 해당 묶음의 첫 문제로 이동
      setHash();
      renderQuestion();
    }
  };
  pager.appendChild(prevB);

  // ● 10개 점(해당 묶음 번호)
  for (let n = start; n <= end; n++) {
    const b = document.createElement("button");
    const isCurrent = (n === cur);
    const isDone = !!state.answers[n];
    b.className = "page-dot " + (isCurrent ? "dot-current" : isDone ? "dot-done" : "dot-todo");
    b.textContent = String(n);
    b.onclick = () => { state.idx = n - 1; setHash(); renderQuestion(); };
    pager.appendChild(b);
  }

  // ▶ 다음 묶음
  const nextB = document.createElement("button");
  nextB.className = "page-arrow";
  nextB.textContent = "›";
  nextB.disabled = end >= tot;               // 마지막 묶음이면 비활성
  nextB.onclick = () => {
    if (end < tot) {
      const newStart = start + 10;           // 다음 묶음의 시작 번호(11, 21, …)
      state.idx = newStart - 1;              // 그 묶음의 첫 문제로 이동
      setHash();
      renderQuestion();
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

  // === 결과 퍼센트 도넛 차트(SVG) ===
function donutChart(percentages) {
  // 표시 순서와 색
  const ORDER  = ["소음인", "태음인", "소양인", "태양인"];
  const COLOR  = {
    "소음인": "#67D2C6",  // teal
    "태음인": "#66B4F1",  // blue
    "소양인": "#F6D372",  // yellow
    "태양인": "#FF7C9C"   // pink
  };

  // 원형 파라미터
  const SIZE = 220;
  const R    = 80;
  const SW   = 28;
  const CX   = SIZE/2, CY = SIZE/2;
  const CIRC = 2*Math.PI*R;

  // 각 체질의 호 그리기
  let offset = 0;
  const arcs = ORDER.map(t => {
    const pct = Math.max(0, percentages[t] || 0);
    const len = (pct/100) * CIRC;
    const circle = `
      <circle r="${R}" cx="${CX}" cy="${CY}" fill="transparent"
              stroke="${COLOR[t]}" stroke-width="${SW}"
              stroke-dasharray="${len} ${CIRC}"
              stroke-dashoffset="${-offset}"
              stroke-linecap="butt"
              transform="rotate(-90 ${CX} ${CY})"></circle>`;
    offset += len;
    return circle;
  }).join("");

  // 가운데 구멍(도넛)
  const hole = `<circle r="${R - SW/2 - 2}" cx="${CX}" cy="${CY}" fill="#fff"></circle>`;

  // 범례
  const legend = ORDER.map(t => `
    <div style="display:flex;align-items:center;gap:10px;margin:6px 14px;">
      <span style="width:32px;height:12px;border-radius:6px;background:${COLOR[t]}"></span>
      <span style="font-weight:700">${t}</span>
      <span style="opacity:.8">&nbsp;${(percentages[t]||0)}%</span>
    </div>
  `).join("");

  return `
    <div style="display:flex;flex-direction:column;align-items:center;gap:16px;margin-top:16px">
      <svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
        ${arcs}
        ${hole}
      </svg>
      <div style="display:flex;flex-wrap:wrap;justify-content:center">${legend}</div>
    </div>
  `;
}

  // ===== 결과 표시 =====
function renderResult() {
  const { winner, totals, percentages } = computeResult();

  const types  = state.data.types || [];
  const sorted = [...types].sort((a, b) => (percentages[b] || 0) - (percentages[a] || 0));
  const pctLine = sorted.map(t => `${t}: ${percentages[t]}%`).join(" · ");

  // 도넛 차트 (네가 이미 추가한 함수 그대로 사용)
  const chart = donutChart(percentages);

  // ★ 체질명에 색 입히기
  const color = TYPE_COLOR[winner] || "#111";
  const winnerHTML = winner
    ? `<span style="color:${color}; font-weight:900;">“${winner}”</span>`
    : `“-”`;

  qcard.hidden = true; 
  result.hidden = false;
  result.innerHTML = `
    <div class="result-title" style="text-align:center">
      당신은 ${winnerHTML} 입니다.
    </div>

    ${chart}

    <div style="display:flex;gap:12px;justify-content:center;margin-top:16px">
      <a class="btn btn-prev" href="./test.html#q=1" data-reset="true" id="restartBtn"
         style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center">처음부터 다시</a>
      <a class="btn btn-next" href="./whatisqscc.html" data-reset="true"
         style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center">솔루션 보기</a>
    </div>
  `;

   //체질 빙고 HTML 생성
  const bingoHTML = renderBingo(winner);

  qcard.hidden = true; 
  result.hidden = false;
  result.innerHTML = `
    <div class="result-title" style="text-align:center">
      당신은 ${winnerHTML} 입니다.
    </div>

    ${chart}

    ${bingoHTML}   <!-- 도넛과 버튼 사이에 빙고 넣기 -->

    <div style="display:flex;gap:12px;justify-content:center;margin-top:18px">
      <a class="btn btn-prev" href="./test.html#q=1" data-reset="true" id="restartBtn"
         style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center">처음부터 다시</a>
      <a class="btn btn-next" href="./whatisqscc.html" data-reset="true"
         style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center">솔루션 보기</a>
    </div>
  `;
  
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
