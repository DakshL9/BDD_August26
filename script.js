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

// ---- build tube DOM elements ----
const tubeEls = departments.map((dept, i) => {
  const pct = Math.min(100, (dept.value / GOAL) * 100);

  const wrap = document.createElement("div");
  wrap.className = "flex w-20 flex-col items-center gap-2.5";

  const tube = document.createElement("div");
  tube.className = "relative h-64 w-14 rounded-b-full rounded-t-md border-2 border-white/50 bg-black/20 overflow-hidden shadow-inner";

  const glass = document.createElement("div");
  glass.className = "absolute left-2 top-2.5 h-[85%] w-1.5 rounded-full bg-white/25";

  const fill = document.createElement("div");
  fill.className = "tube-fill absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#d12a41] to-[#7d1120] transition-[height] ease-[cubic-bezier(.22,1,.36,1)] duration-[1800ms] overflow-hidden";
  fill.style.height = "0%";

  // desync each tube's idle slosh so they don't all wobble in unison
  const idleDuration = (2.6 + Math.random() * 1.0).toFixed(2) + "s";
  const idleDelay = (-(Math.random() * 3)).toFixed(2) + "s";
  fill.style.setProperty("--idle-duration", idleDuration);
  fill.style.setProperty("--idle-delay", idleDelay);

  // rising bubbles inside the fill for a "filling" feel
  for (let b = 0; b < 3; b++) {
    const bubble = document.createElement("span");
    bubble.className = "bubble";
    bubble.style.left = (20 + Math.random() * 60) + "%";
    bubble.style.width = bubble.style.height = (3 + Math.random() * 4) + "px";
    bubble.style.animationDelay = (Math.random() * 3.2).toFixed(2) + "s";
    bubble.style.animationDuration = (2.6 + Math.random() * 1.4).toFixed(2) + "s";
    fill.appendChild(bubble);
  }

  // rounded liquid surface with depth shading, sits at the top of the fill
  const liquidSurface = document.createElement("div");
  liquidSurface.className = "liquid-surface";
  fill.appendChild(liquidSurface);

  tube.appendChild(glass);
  tube.appendChild(fill);
  tubeFills.push(fill);

  const badge = document.createElement("span");
  badge.className = "rounded-full bg-[#c41f36] px-3.5 py-1.5 text-base font-bold text-white shadow -mt-1";
  badge.textContent = dept.value;

  const label = document.createElement("span");
  label.className = "rounded-md bg-[#c41f36] px-3 py-1.5 text-sm font-bold tracking-wide text-white";
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
    let x = p.x, y = p.y;
    const d = (t - centerT) / width;
    if (Math.abs(d) < 1) {
      const before = pathEl.getPointAtLength(Math.max(0, t * len - 2));
      const after = pathEl.getPointAtLength(Math.min(len, t * len + 2));
      const dx = after.x - before.x, dy = after.y - before.y;
      const mag = Math.hypot(dx, dy) || 1;
      const nx = -dy / mag, ny = dx / mag;
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

// ---- splash: quick sloshing wobble on a tube's liquid when the pulse arrives ----
function triggerSplash(index) {
  const fill = tubeFills[index];
  if (!fill) return;
  fill.classList.remove("splash");
  void fill.offsetWidth; // force reflow so the animation restarts cleanly
  fill.classList.add("splash");
  setTimeout(() => fill.classList.remove("splash"), 700);
}

// ---- build + animate the pipes once layout has settled ----
let rafIds = [];
function buildPipes() {
  pipesSvg.innerHTML = "";
  rafIds.forEach(cancelAnimationFrame);
  rafIds = [];

  const rowBox = row.getBoundingClientRect();
  const hubBox = hub.getBoundingClientRect();
  const hubX = hubBox.left + hubBox.width / 2 - rowBox.left;
  const hubY = hubBox.bottom - rowBox.top;

  const pipeEls = [];

  departments.forEach((dept, i) => {
    const tubeBox = tubeEls[i].getBoundingClientRect();
    const tubeX = tubeBox.left + tubeBox.width / 2 - rowBox.left;
    const tubeY = tubeBox.top - rowBox.top;
    const midY = hubY + (tubeY - hubY) * 0.55;
    const d = `M ${hubX},${hubY} C ${hubX},${midY} ${tubeX},${midY} ${tubeX},${tubeY}`;

    const pipe = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pipe.setAttribute("d", d);
    pipe.setAttribute("stroke", "#a89f8f");
    pipe.setAttribute("stroke-width", "3");
    pipe.setAttribute("fill", "none");
    pipe.setAttribute("stroke-linecap", "round");
    pipe.setAttribute("opacity", "0.55");
    pipesSvg.appendChild(pipe);
    pipeEls.push(pipe);
  });

  // one shared pulse, reassigned to a random department's pipe every cycle
  const pulse = document.createElementNS("http://www.w3.org/2000/svg", "path");
  pulse.setAttribute("stroke", "#e02840");
  pulse.setAttribute("stroke-width", "2.5");
  pulse.setAttribute("fill", "none");
  pulse.setAttribute("stroke-linecap", "round");
  pulse.setAttribute("stroke-linejoin", "round");
  pulse.setAttribute("stroke-opacity", "0.6");
  pipesSvg.appendChild(pulse);

  const CYCLE = 3.2;   // seconds between heartbeats
  const TRAVEL = 0.9;  // how long the single blip takes to travel the pipe
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
      pulse.setAttribute("d", pulsePathAt(pipeEls[activeIndex], t, 0.14, 7));
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

window.addEventListener("load", () => setTimeout(buildPipes, 200));
window.addEventListener("resize", () => setTimeout(buildPipes, 100));