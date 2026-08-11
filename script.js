// ============================================================
// CONFIGURATION
// ============================================================

// API endpoint
const API_URL =
  "https://nss-backend-5zin.onrender.com/api/donations/departments";

// Refresh interval
// Change this value in the future if required.
//
// 10 * 1000 = 10 seconds
// 30 * 1000 = 30 seconds
// 60 * 1000 = 1 minute
const API_REFRESH_INTERVAL_MS = 10 * 1000;

// Maximum value represented by a completely filled tube
// Change this whenever you want.
const GOAL = 150;


// ============================================================
// DEPARTMENT ORDER
// ============================================================
//
// This controls the order in which departments appear.
// You can change the order or add/remove departments here.
//
// The API can return departments in any order.
// The dashboard will always follow this order.
//

const DEPARTMENT_ORDER = [
  "AIDS",
  "AIML",
  "COMPS",
  "CSEDS",
  "EXTC",
  "ICB",
  "IT",
  "MECH",
  "Outsider"
];


// ============================================================
// DATA
// ============================================================

let departments = [];


// ============================================================
// DOM ELEMENTS
// ============================================================

const row = document.getElementById("row");
const hub = document.getElementById("hub");
const pipesSvg = document.getElementById("pipes");

const tubeFills = [];

let tubeEls = [];


// ============================================================
// PIPE ANIMATION VARIABLES
// ============================================================

let rafIds = [];
let rebuildTimer = null;


// ============================================================
// FETCH DEPARTMENT DATA
// ============================================================

async function fetchDepartments() {

  try {

    console.log("Fetching department data...");

    const response = await fetch(API_URL, {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        `API Error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    console.log("API response:", data);


    // --------------------------------------------------------
    // Always create all departments.
    //
    // If a department exists in the API:
    //     use its value
    //
    // If a department does NOT exist:
    //     use 0
    // --------------------------------------------------------

    departments = DEPARTMENT_ORDER.map((department) => ({
      label: department,
      value: Number(data[department] ?? 0)
    }));


    console.log(
      "Processed departments:",
      departments
    );


    // Render dashboard
    renderDashboard();


  } catch (error) {

    console.error(
      "Failed to fetch department data:",
      error
    );


    // Keep existing data on screen if refresh fails
    if (departments.length === 0) {

      row.innerHTML = `
        <div style="
          grid-column: 1 / -1;
          color: white;
          text-align: center;
          padding: 30px;
          font-size: 16px;
        ">
          Unable to load department data.
          <br>
          <small>Retrying automatically...</small>
        </div>
      `;

    }

  }

}


// ============================================================
// RENDER DASHBOARD
// ============================================================

function renderDashboard() {

  // Stop previous pipe animation
  stopPipeAnimation();


  // Clear existing tubes
  row.innerHTML = "";


  // Put SVG pipes back
  row.appendChild(pipesSvg);


  // Reset arrays
  tubeFills.length = 0;
  tubeEls = [];


  // ----------------------------------------------------------
  // Create tubes
  // ----------------------------------------------------------

  tubeEls = departments.map((dept, i) => {

    // Calculate percentage of goal
    const pct = Math.min(
      100,
      (dept.value / GOAL) * 100
    );


    // Tube wrapper
    const wrap =
      document.createElement("div");

    wrap.className =
      "tube-wrap";


    // Tube
    const tube =
      document.createElement("div");

    tube.className =
      "tube";


    // Glass highlight
    const glass =
      document.createElement("div");

    glass.className =
      "tube-glass";


    // Blood fill
    const fill =
      document.createElement("div");

    fill.className =
      "tube-fill";

    fill.style.height =
      "0%";


    // Random animation timing
    const idleDuration =
      (2.6 + Math.random() * 1.0)
        .toFixed(2) + "s";

    const idleDelay =
      (-(Math.random() * 3))
        .toFixed(2) + "s";


    fill.style.setProperty(
      "--idle-duration",
      idleDuration
    );

    fill.style.setProperty(
      "--idle-delay",
      idleDelay
    );


    // --------------------------------------------------------
    // Bubbles
    // --------------------------------------------------------

    for (let b = 0; b < 3; b++) {

      const bubble =
        document.createElement("span");

      bubble.className =
        "bubble";


      bubble.style.left =
        (20 + Math.random() * 60) + "%";


      bubble.style.width =
        bubble.style.height =
        (3 + Math.random() * 4) + "px";


      bubble.style.animationDelay =
        (Math.random() * 3.2)
          .toFixed(2) + "s";


      bubble.style.animationDuration =
        (2.6 + Math.random() * 1.4)
          .toFixed(2) + "s";


      fill.appendChild(bubble);

    }


    // --------------------------------------------------------
    // Liquid surface
    // --------------------------------------------------------

    const liquidSurface =
      document.createElement("div");

    liquidSurface.className =
      "liquid-surface";

    fill.appendChild(
      liquidSurface
    );


    // Build tube
    tube.appendChild(glass);
    tube.appendChild(fill);


    // Store fill reference
    tubeFills.push(fill);


    // --------------------------------------------------------
    // Value badge
    // --------------------------------------------------------

    const badge =
      document.createElement("span");

    badge.className =
      "value-badge";

    badge.textContent =
      dept.value;


    // --------------------------------------------------------
    // Department label
    // --------------------------------------------------------

    const label =
      document.createElement("span");

    label.className =
      "dept-label";

    label.textContent =
      dept.label;


    // Add everything to wrapper
    wrap.appendChild(tube);
    wrap.appendChild(badge);
    wrap.appendChild(label);

    row.appendChild(wrap);


    // Animate blood filling
    setTimeout(() => {

      fill.style.height =
        pct + "%";

    }, 150 + i * 60);


    return tube;

  });


  // Build pipes after tubes exist
  setTimeout(() => {

    buildPipes();

  }, 200);

}


// ============================================================
// SPLASH EFFECT
// ============================================================

function triggerSplash(index) {

  const fill =
    tubeFills[index];

  if (!fill) return;


  fill.classList.remove(
    "splash"
  );


  void fill.offsetWidth;


  fill.classList.add(
    "splash"
  );


  setTimeout(() => {

    fill.classList.remove(
      "splash"
    );

  }, 700);

}


// ============================================================
// PIPE PATH ANIMATION
// ============================================================

function pulsePathAt(
  pathEl,
  centerT,
  width,
  amp
) {

  const len =
    pathEl.getTotalLength();

  const steps = 26;

  const pts = [];


  for (let i = 0; i <= steps; i++) {

    const t =
      i / steps;


    const p =
      pathEl.getPointAtLength(
        t * len
      );


    let x = p.x;
    let y = p.y;


    const d =
      (t - centerT) / width;


    if (Math.abs(d) < 1) {

      const before =
        pathEl.getPointAtLength(
          Math.max(
            0,
            t * len - 2
          )
        );


      const after =
        pathEl.getPointAtLength(
          Math.min(
            len,
            t * len + 2
          )
        );


      const dx =
        after.x - before.x;

      const dy =
        after.y - before.y;


      const mag =
        Math.hypot(dx, dy) || 1;


      const nx =
        -dy / mag;

      const ny =
        dx / mag;


      const ad =
        Math.abs(d);


      let profile = 0;


      if (ad < 0.15) {
        profile = -0.5;
      }

      else if (ad < 0.35) {
        profile = 1;
      }

      else if (ad < 0.55) {
        profile = -1.6;
      }

      else if (ad < 0.75) {
        profile = 0.4;
      }


      x +=
        nx * amp * profile;

      y +=
        ny * amp * profile;

    }


    pts.push(
      x.toFixed(1) +
      "," +
      y.toFixed(1)
    );

  }


  return "M " +
    pts.join(" L ");

}


// ============================================================
// STOP PIPE ANIMATION
// ============================================================

function stopPipeAnimation() {

  rafIds.forEach(
    cancelAnimationFrame
  );

  rafIds = [];

  pipesSvg.innerHTML = "";

}


// ============================================================
// CREATE PIPE PATH
// ============================================================

function makePipePath(
  hubX,
  hubY,
  tubeX,
  tubeY,
  index
) {

  const width =
    row.clientWidth;


  const isMobile =
    window.innerWidth < 600;


  const isTablet =
    window.innerWidth >= 600 &&
    window.innerWidth < 900;


  // Desktop
  if (!isMobile && !isTablet) {

    const midY =
      hubY +
      (tubeY - hubY) * 0.55;


    return `
      M ${hubX},${hubY}
      C ${hubX},${midY}
        ${tubeX},${midY}
        ${tubeX},${tubeY}
    `;

  }


  // Mobile / Tablet
  const dx =
    tubeX - hubX;


  const rowIndex =
    isMobile
      ? Math.floor(index / 3)
      : Math.floor(index / 5);


  const rowHeight =
    isMobile
      ? 245
      : 270;


  const bendY =
    Math.max(
      42,
      Math.min(
        tubeY - 34,
        55 +
        rowIndex *
        rowHeight *
        0.55
      )
    );


  const spread =
    Math.max(
      28,
      Math.min(
        width * 0.24,
        Math.abs(dx) * 0.55 + 18
      )
    );


  const firstX =
    hubX +
    Math.sign(dx || 1) *
    Math.min(
      spread,
      Math.abs(dx)
    );


  const secondX =
    tubeX -
    Math.sign(dx || 1) *
    Math.min(
      spread * 0.7,
      Math.abs(dx)
    );


  return `
    M ${hubX},${hubY}

    C ${hubX},${hubY + 18}
      ${firstX},${bendY - 20}
      ${firstX},${bendY}

    C ${firstX},${tubeY - 70}
      ${secondX},${tubeY - 50}
      ${secondX},${tubeY - 25}

    C ${secondX},${tubeY - 10}
      ${tubeX},${tubeY - 8}
      ${tubeX},${tubeY}
  `;

}


// ============================================================
// BUILD PIPES
// ============================================================

function buildPipes() {

  stopPipeAnimation();


  if (
    !departments.length ||
    !tubeEls.length
  ) {
    return;
  }


  const rowBox =
    row.getBoundingClientRect();


  const hubBox =
    hub.getBoundingClientRect();


  const hubX =
    hubBox.left +
    hubBox.width / 2 -
    rowBox.left;


  const hubY =
    hubBox.bottom -
    rowBox.top;


  const pipeEls = [];


  departments.forEach(
    (dept, i) => {

      const tubeBox =
        tubeEls[i]
          .getBoundingClientRect();


      const tubeX =
        tubeBox.left +
        tubeBox.width / 2 -
        rowBox.left;


      const tubeY =
        tubeBox.top -
        rowBox.top;


      const d =
        makePipePath(
          hubX,
          hubY,
          tubeX,
          tubeY,
          i
        );


      const pipe =
        document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );


      pipe.setAttribute(
        "d",
        d
      );


      pipe.setAttribute(
        "stroke",
        "#a89f8f"
      );


      pipe.setAttribute(
        "stroke-width",
        window.innerWidth < 600
          ? "2.4"
          : "3"
      );


      pipe.setAttribute(
        "fill",
        "none"
      );


      pipe.setAttribute(
        "stroke-linecap",
        "round"
      );


      pipe.setAttribute(
        "stroke-linejoin",
        "round"
      );


      pipe.setAttribute(
        "opacity",
        window.innerWidth < 600
          ? "0.48"
          : "0.55"
      );


      pipesSvg.appendChild(
        pipe
      );


      pipeEls.push(
        pipe
      );

    }
  );


  // ECG pulse
  const pulse =
    document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );


  pulse.setAttribute(
    "stroke",
    "#e02840"
  );


  pulse.setAttribute(
    "stroke-width",
    window.innerWidth < 600
      ? "2"
      : "2.5"
  );


  pulse.setAttribute(
    "fill",
    "none"
  );


  pulse.setAttribute(
    "stroke-linecap",
    "round"
  );


  pulse.setAttribute(
    "stroke-linejoin",
    "round"
  );


  pulse.setAttribute(
    "stroke-opacity",
    "0.65"
  );


  pipesSvg.appendChild(
    pulse
  );


  // Animation timing
  const CYCLE = 3.2;
  const TRAVEL = 0.9;


  let start = null;

  let currentCycle = -1;


  let activeIndex =
    Math.floor(
      Math.random() *
      pipeEls.length
    );


  let splashed = false;


  function frame(ts) {

    if (start === null) {
      start = ts;
    }


    const totalElapsed =
      (ts - start) / 1000;


    const cycleCount =
      Math.floor(
        totalElapsed / CYCLE
      );


    if (
      cycleCount !==
      currentCycle
    ) {

      currentCycle =
        cycleCount;


      activeIndex =
        Math.floor(
          Math.random() *
          pipeEls.length
        );


      splashed = false;

    }


    const elapsed =
      totalElapsed % CYCLE;


    if (elapsed < TRAVEL) {

      const t =
        elapsed / TRAVEL;


      pulse.setAttribute(
        "d",
        pulsePathAt(
          pipeEls[activeIndex],
          t,
          0.14,
          window.innerWidth < 600
            ? 5
            : 7
        )
      );


    } else {

      pulse.setAttribute(
        "d",
        ""
      );


      if (!splashed) {

        splashed = true;

        triggerSplash(
          activeIndex
        );

      }

    }


    rafIds.push(
      requestAnimationFrame(
        frame
      )
    );

  }


  rafIds.push(
    requestAnimationFrame(
      frame
    )
  );

}


// ============================================================
// RESPONSIVE REBUILD
// ============================================================

function schedulePipeRebuild() {

  clearTimeout(
    rebuildTimer
  );


  rebuildTimer =
    setTimeout(
      buildPipes,
      160
    );

}


// ============================================================
// INITIAL LOAD + AUTO REFRESH
// ============================================================

window.addEventListener(
  "load",
  () => {

    // Fetch immediately
    fetchDepartments();


    // Fetch again every 30 seconds
    setInterval(
      fetchDepartments,
      API_REFRESH_INTERVAL_MS
    );

  }
);


// ============================================================
// WINDOW RESIZE
// ============================================================

window.addEventListener(
  "resize",
  schedulePipeRebuild
);