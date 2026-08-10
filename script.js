// ---- data: swap this for your live donor counts / API response ----
const departments = [
  { label: "AIDS", value: 28 },
  { label: "AIML", value: 77 },
  { label: "COMPS", value: 91 },
  { label: "CSEDS", value: 89 },
  { label: "EXTC", value: 78 },
  { label: "ICB", value: 35 },
  { label: "IT", value: 86 },
  { label: "MECH", value: 120 },
  { label: "OTHER", value: 75 },
];

const GOAL = 150;

const row = document.getElementById("row");
const hub = document.getElementById("hub");
const pipesSvg = document.getElementById("pipes");
const tubeFills = [];
let tubeEls = [];

// ---- build tube DOM elements ----
tubeEls = departments.map((dept, i) => {
  const pct = Math.min(100, (dept.value / GOAL) * 100);

  const wrap = document.createElement("div");
  wrap.className = "tube-wrap";

  const tube = document.createElement("div");
  tube.className = "tube";

  const glass = document.createElement("div");
  glass.className = "tube-glass";

  const fill = document.createElement("div");
  fill.className = "tube-fill";
  fill.style.height = "0%";

  const idleDuration = (2.6 + Math.random() * 1.0).toFixed(2) + "s";
  const idleDelay = (-(Math.random() * 3)).toFixed(2) + "s";
  fill.style.setProperty("--idle-duration", idleDuration);
  fill.style.setProperty("--idle-delay", idleDelay);

  for (let b = 0; b < 3; b++) {
    const bubble = document.createElement("span");
    bubble.className = "bubble";
    bubble.style.left = (20 + Math.random() * 60) + "%";
    bubble.style.width = bubble.style.height = (3 + Math.random() * 4) + "px";
    bubble.style.animationDelay = (Math.random() * 3.2).toFixed(2) + "s";
    bubble.style.animationDuration = (2.6 + Math.random() * 1.4).toFixed(2) + "s";
    fill.appendChild(bubble);
  }

  const liquidSurface = document.createElement("div");
  liquidSurface.className = "liquid-surface";
  fill.appendChild(liquidSurface);

  tube.appendChild(glass);
  tube.appendChild(fill);
  tubeFills.push(fill);

  const badge = document.createElement("span");
  badge.className = "value-badge";
  badge.textContent = dept.value;

  const label = document.createElement("span");
  label.className = "dept-label";
  label.textContent = dept.label;

  wrap.appendChild(tube);
  wrap.appendChild(badge);
  wrap.appendChild(label);
  row.appendChild(wrap);

  setTimeout(() => { fill.style.height = pct + "%"; }, 150 + i * 60);

  return tube;
});

// ---- heartbeat helper: bends a pipe path into a P-Q-R-S-T spike ----
function pulsePathAt(pathEl, centerT, width, amp) {
  const len = pathEl.getTotalLength();
  const steps = 26;
  const pts = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = pathEl.getPointAtLength(t * len);
    let x = p.x;
    let y = p.y;
    const d = (t - centerT) / width;

    if (Math.abs(d) < 1) {
      const before = pathEl.getPointAtLength(Math.max(0, t * len - 2));
      const after = pathEl.getPointAtLength(Math.min(len, t * len + 2));
      const dx = after.x - before.x;
      const dy = after.y - before.y;
      const mag = Math.hypot(dx, dy) || 1;
      const nx = -dy / mag;
      const ny = dx / mag;
      const ad = Math.abs(d);
      let profile = 0;

      if (ad < 0.15) profile = -0.5;
      else if (ad < 0.35) profile = 1;
      else if (ad < 0.55) profile = -1.6;
      else if (ad < 0.75) profile = 0.4;

      x += nx * amp * profile;
      y += ny * amp * profile;
    }

    pts.push(x.toFixed(1) + "," + y.toFixed(1));
  }

  return "M " + pts.join(" L ");
}

function triggerSplash(index) {
  const fill = tubeFills[index];
  if (!fill) return;

  fill.classList.remove("splash");
  void fill.offsetWidth;
  fill.classList.add("splash");
  setTimeout(() => fill.classList.remove("splash"), 700);
}

// ---- responsive pipe routing ----
// The pipes stay visible at every breakpoint. When the tubes wrap into a grid,
// each pipe gets a smooth two-stage curve so it can reach its own row without
// crossing through the tubes themselves.
let rafIds = [];
let rebuildTimer = null;

function stopPipeAnimation() {
  rafIds.forEach(cancelAnimationFrame);
  rafIds = [];
  pipesSvg.innerHTML = "";
}

function makePipePath(hubX, hubY, tubeX, tubeY, index) {
  const width = row.clientWidth;
  const isMobile = window.innerWidth < 600;
  const isTablet = window.innerWidth >= 600 && window.innerWidth < 900;

  if (!isMobile && !isTablet) {
    const midY = hubY + (tubeY - hubY) * 0.55;
    return `M ${hubX},${hubY} C ${hubX},${midY} ${tubeX},${midY} ${tubeX},${tubeY}`;
  }

  // On wrapped layouts, keep the fan-out compact near the hub and then let
  // each line descend toward its own tube. This preserves the desktop idea
  // without producing a tangled spider-web on small screens.
  const dx = tubeX - hubX;
  const rowIndex = isMobile ? Math.floor(index / 3) : Math.floor(index / 5);
  const rowHeight = isMobile ? 245 : 270;
  const bendY = Math.max(42, Math.min(tubeY - 34, 55 + rowIndex * rowHeight * 0.55));
  const spread = Math.max(28, Math.min(width * 0.24, Math.abs(dx) * 0.55 + 18));
  const firstX = hubX + Math.sign(dx || 1) * Math.min(spread, Math.abs(dx));
  const secondX = tubeX - Math.sign(dx || 1) * Math.min(spread * 0.7, Math.abs(dx));

  return `M ${hubX},${hubY}
    C ${hubX},${hubY + 18} ${firstX},${bendY - 20} ${firstX},${bendY}
    C ${firstX},${tubeY - 70} ${secondX},${tubeY - 50} ${secondX},${tubeY - 25}
    C ${secondX},${tubeY - 10} ${tubeX},${tubeY - 8} ${tubeX},${tubeY}`;
}

function buildPipes() {
  stopPipeAnimation();

  const rowBox = row.getBoundingClientRect();
  const hubBox = hub.getBoundingClientRect();
  const hubX = hubBox.left + hubBox.width / 2 - rowBox.left;
  const hubY = hubBox.bottom - rowBox.top;
  const pipeEls = [];

  departments.forEach((dept, i) => {
    const tubeBox = tubeEls[i].getBoundingClientRect();
    const tubeX = tubeBox.left + tubeBox.width / 2 - rowBox.left;
    const tubeY = tubeBox.top - rowBox.top;
    const d = makePipePath(hubX, hubY, tubeX, tubeY, i);

    const pipe = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pipe.setAttribute("d", d);
    pipe.setAttribute("stroke", "#a89f8f");
    pipe.setAttribute("stroke-width", window.innerWidth < 600 ? "2.4" : "3");
    pipe.setAttribute("fill", "none");
    pipe.setAttribute("stroke-linecap", "round");
    pipe.setAttribute("stroke-linejoin", "round");
    pipe.setAttribute("opacity", window.innerWidth < 600 ? "0.48" : "0.55");
    pipesSvg.appendChild(pipe);
    pipeEls.push(pipe);
  });

  const pulse = document.createElementNS("http://www.w3.org/2000/svg", "path");
  pulse.setAttribute("stroke", "#e02840");
  pulse.setAttribute("stroke-width", window.innerWidth < 600 ? "2" : "2.5");
  pulse.setAttribute("fill", "none");
  pulse.setAttribute("stroke-linecap", "round");
  pulse.setAttribute("stroke-linejoin", "round");
  pulse.setAttribute("stroke-opacity", "0.65");
  pipesSvg.appendChild(pulse);

  const CYCLE = 3.2;
  const TRAVEL = 0.9;
  let start = null;
  let currentCycle = -1;
  let activeIndex = Math.floor(Math.random() * pipeEls.length);
  let splashed = false;

  function frame(ts) {
    if (start === null) start = ts;

    const totalElapsed = (ts - start) / 1000;
    const cycleCount = Math.floor(totalElapsed / CYCLE);

    if (cycleCount !== currentCycle) {
      currentCycle = cycleCount;
      activeIndex = Math.floor(Math.random() * pipeEls.length);
      splashed = false;
    }

    const elapsed = totalElapsed % CYCLE;

    if (elapsed < TRAVEL) {
      const t = elapsed / TRAVEL;
      pulse.setAttribute("d", pulsePathAt(pipeEls[activeIndex], t, 0.14, window.innerWidth < 600 ? 5 : 7));
    } else {
      pulse.setAttribute("d", "");
      if (!splashed) {
        splashed = true;
        triggerSplash(activeIndex);
      }
    }

    rafIds.push(requestAnimationFrame(frame));
  }

  rafIds.push(requestAnimationFrame(frame));
}

function schedulePipeRebuild() {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(buildPipes, 160);
}

window.addEventListener("load", () => setTimeout(buildPipes, 300));
window.addEventListener("resize", schedulePipeRebuild);
