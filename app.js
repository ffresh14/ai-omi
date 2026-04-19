const mainArea = document.getElementById("main-area");
const topRow = document.getElementById("top-row");
const ecgPanel = document.getElementById("ecg-panel");
const predictionPanel = document.getElementById("prediction-panel");
const resizer = document.getElementById("panel-resizer");

const IS_GITHUB_PAGES = window.location.hostname.endsWith("github.io");
const STATIC_DATA_BASE = "./static-data";
const API_BASE = window.ECG_API_BASE || (IS_GITHUB_PAGES ? "" : "http://127.0.0.1:8000");

const previousTestsListEl = document.getElementById("previous-tests-list");

const patientPidEl = document.getElementById("patient-pid");
const patientNameEl = document.getElementById("patient-name");
const patientSexEl = document.getElementById("patient-sex");
const patientAgeEl = document.getElementById("patient-age");
const ecgSvgEl = document.getElementById("ecg-cabrera-svg");
const ecgOverlayLabelEl = document.querySelector(".ecg-overlay-label");
const ecgSpeedEl = document.getElementById("ecg-speed");
const ecgGainEl = document.getElementById("ecg-gain");
const ecgFilterEl = document.getElementById("ecg-filter");
const ecgPaceToggleEl = document.getElementById("ecg-pace-toggle");

const stWarningNodeEl = document.querySelector(".st-warning-node");

const nodeValueEls = {
  control: document.getElementById("node-control"),
  mi: document.getElementById("node-mi"),
  omi: document.getElementById("node-omi"),
  nomi: document.getElementById("node-nomi"),
  omi_lm_lad: document.getElementById("node-omi-lm-lad"),
  omi_lcx: document.getElementById("node-omi-lcx"),
  omi_rca: document.getElementById("node-omi-rca"),
};

const SVG_NS = "http://www.w3.org/2000/svg";
const CABRERA_ORDER = [
  "aVL",
  "I",
  "-aVR",
  "II",
  "aVF",
  "III",
  "V1",
  "V2",
  "V3",
  "V4",
  "V5",
  "V6",
];
const CABRERA_PAIR_LAYOUT = [
  ["aVL", "V1"],
  ["I", "V2"],
  ["-aVR", "V3"],
  ["II", "V4"],
  ["aVF", "V5"],
  ["III", "V6"],
];

const treeRootEl = document.getElementById("tree-root");
const treeLinesSvg = treeRootEl?.querySelector(".tree-lines-svg");

const treeNodes = {
  outcomes: document.querySelector('[data-outcome-key="outcomes"]'),
  control: document.querySelector('[data-outcome-key="control"]'),
  mi: document.querySelector('[data-outcome-key="mi"]'),
  omi: document.querySelector('[data-outcome-key="omi"]'),
  nomi: document.querySelector('[data-outcome-key="nomi"]'),
  omi_lm_lad: document.querySelector('[data-outcome-key="omi_lm_lad"]'),
  omi_lcx: document.querySelector('[data-outcome-key="omi_lcx"]'),
  omi_rca: document.querySelector('[data-outcome-key="omi_rca"]'),
};

const treeBranches = {
  outcomes: document.querySelector('[data-branch="outcomes"]'),
  control: document.querySelector('[data-branch="control"]'),
  mi: document.querySelector('[data-branch="mi"]'),
  omi: document.querySelector('[data-branch="omi"]'),
  nomi: document.querySelector('[data-branch="nomi"]'),
  omi_lm_lad: document.querySelector('[data-branch="omi_lm_lad"]'),
  omi_lcx: document.querySelector('[data-branch="omi_lcx"]'),
  omi_rca: document.querySelector('[data-branch="omi_rca"]'),
};
const miChildrenGroupEl = document.querySelector('[data-branch="mi"] > .tree-children');

const treeEdges = {
  outcomes_control: document.querySelector('[data-edge-key="outcomes-control"]'),
  outcomes_mi: document.querySelector('[data-edge-key="outcomes-mi"]'),
  mi_split: document.querySelector('[data-edge-key="mi-split"]'),
  mi_omi: document.querySelector('[data-edge-key="mi-omi"]'),
  mi_nomi: document.querySelector('[data-edge-key="mi-nomi"]'),
  omi_omi_lm_lad: document.querySelector('[data-edge-key="omi-omi_lm_lad"]'),
  omi_omi_lcx: document.querySelector('[data-edge-key="omi-omi_lcx"]'),
  omi_omi_rca: document.querySelector('[data-edge-key="omi-omi_rca"]'),
};

const EDGE_PAIRS = [
  ["outcomes_control", "outcomes", "control"],
  ["outcomes_mi", "outcomes", "mi"],
  ["mi_omi", "mi", "omi"],
  ["mi_nomi", "mi", "nomi"],
  ["omi_omi_lm_lad", "omi", "omi_lm_lad"],
  ["omi_omi_lcx", "omi", "omi_lcx"],
  ["omi_omi_rca", "omi", "omi_rca"],
];

const setEdgePath = (edgeEl, fromNode, toNode) => {
  if (!edgeEl || !fromNode || !toNode || !treeLinesSvg) return;

  const svgRect = treeLinesSvg.getBoundingClientRect();
  const fromRect = fromNode.getBoundingClientRect();
  const toRect = toNode.getBoundingClientRect();

  const x1 = fromRect.right - svgRect.left;
  const y1 = fromRect.top + fromRect.height / 2 - svgRect.top;
  const x2 = toRect.left - svgRect.left;
  const y2 = toRect.top + toRect.height / 2 - svgRect.top;
  const midX = (x1 + x2) / 2;

  const d = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
  edgeEl.setAttribute("d", d);
};

const alignMiSubtreeToMi = () => {
  const miNode = treeNodes.mi;
  const omiNode = treeNodes.omi;
  const nomiNode = treeNodes.nomi;
  if (!miChildrenGroupEl || !miNode || !omiNode || !nomiNode) return;

  miChildrenGroupEl.style.transform = "translateY(0px)";

  const miRect = miNode.getBoundingClientRect();
  const omiRect = omiNode.getBoundingClientRect();
  const nomiRect = nomiNode.getBoundingClientRect();

  const miY = miRect.top + miRect.height / 2;
  const subtreeMidY = (omiRect.top + omiRect.height / 2 + nomiRect.top + nomiRect.height / 2) / 2;
  const deltaY = miY - subtreeMidY;

  miChildrenGroupEl.style.transform = `translateY(${deltaY}px)`;
};

const setMiSplitPaths = () => {
  if (!treeLinesSvg) return;
  const splitEdge = treeEdges.mi_split;
  const miEdge = treeEdges.mi_omi;
  const nomiEdge = treeEdges.mi_nomi;
  const miNode = treeNodes.mi;
  const omiNode = treeNodes.omi;
  const nomiNode = treeNodes.nomi;
  if (!splitEdge || !miEdge || !nomiEdge || !miNode || !omiNode || !nomiNode) return;

  const svgRect = treeLinesSvg.getBoundingClientRect();
  const miRect = miNode.getBoundingClientRect();
  const omiRect = omiNode.getBoundingClientRect();
  const nomiRect = nomiNode.getBoundingClientRect();

  const x1 = miRect.right - svgRect.left;
  const yMi = miRect.top + miRect.height / 2 - svgRect.top;

  const x2Omi = omiRect.left - svgRect.left;
  const yOmi = omiRect.top + omiRect.height / 2 - svgRect.top;

  const x2Nomi = nomiRect.left - svgRect.left;
  const yNomi = nomiRect.top + nomiRect.height / 2 - svgRect.top;

  const splitY = yMi;
  const splitX = Math.min((x1 + Math.min(x2Omi, x2Nomi)) / 2, x1 + 120);
  const topY = Math.min(yOmi, yNomi);
  const bottomY = Math.max(yOmi, yNomi);

  const dSplit = `M ${x1} ${yMi} L ${splitX} ${yMi} M ${splitX} ${topY} L ${splitX} ${bottomY}`;
  const dOmi = `M ${splitX} ${yOmi} L ${x2Omi} ${yOmi}`;
  const dNomi = `M ${splitX} ${yNomi} L ${x2Nomi} ${yNomi}`;

  splitEdge.setAttribute("d", dSplit);
  miEdge.setAttribute("d", dOmi);
  nomiEdge.setAttribute("d", dNomi);
};

const layoutTreeEdges = () => {
  alignMiSubtreeToMi();

  for (const [edgeKey, fromKey, toKey] of EDGE_PAIRS) {
    if (edgeKey === "mi_omi" || edgeKey === "mi_nomi") continue;
    setEdgePath(treeEdges[edgeKey], treeNodes[fromKey], treeNodes[toKey]);
  }
  setMiSplitPaths();
};

if (treeRootEl && window.ResizeObserver) {
  const ro = new ResizeObserver(() => layoutTreeEdges());
  ro.observe(treeRootEl);
}

let ecgLeads = [];
let ecgDataSampleRate = 300;
let ecgLoadToken = 0;
const ecgDisplaySettings = {
  speed: 25,
  gain: 10,
  filterHz: 100,
  paceDetection: false,
};

const decodeBase64Int16 = (base64) => {
  const binary = atob(base64 || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const view = new DataView(bytes.buffer);
  const samples = new Int16Array(Math.floor(bytes.length / 2));
  for (let i = 0; i < samples.length; i += 1) {
    samples[i] = view.getInt16(i * 2, true);
  }
  return samples;
};

const toMillivoltSamples = (waveform) => {
  const digital = decodeBase64Int16(waveform?.samples || "");
  const lsbUv = Number(waveform?.LSB ?? 1);
  const scale = lsbUv / 1000;
  const mv = new Float32Array(digital.length);
  for (let i = 0; i < digital.length; i += 1) {
    mv[i] = digital[i] * scale;
  }
  return mv;
};

const buildCabreraLeads = (payload) => {
  const leads = payload?.waveforms || [];
  const direct = new Map();

  for (const lead of leads) {
    direct.set(lead.leadId, toMillivoltSamples(lead));
  }

  const leadI = direct.get("I");
  const leadII = direct.get("II");
  if (!leadI || !leadII) return [];

  const precordials = ["V1", "V2", "V3", "V4", "V5", "V6"].map((id) => direct.get(id));
  const minLen = Math.min(
    leadI.length,
    leadII.length,
    ...precordials.filter(Boolean).map((arr) => arr.length)
  );
  if (!Number.isFinite(minLen) || minLen < 2) return [];

  const i = leadI.subarray(0, minLen);
  const ii = leadII.subarray(0, minLen);

  const iii = new Float32Array(minLen);
  const avr = new Float32Array(minLen);
  const avl = new Float32Array(minLen);
  const avf = new Float32Array(minLen);
  const negAvr = new Float32Array(minLen);

  for (let idx = 0; idx < minLen; idx += 1) {
    iii[idx] = ii[idx] - i[idx];
    avr[idx] = -(i[idx] + ii[idx]) * 0.5;
    avl[idx] = i[idx] - ii[idx] * 0.5;
    avf[idx] = ii[idx] - i[idx] * 0.5;
    negAvr[idx] = -avr[idx];
  }

  const leadMap = {
    aVL: avl,
    I: i,
    "-aVR": negAvr,
    II: ii,
    aVF: avf,
    III: iii,
    V1: (direct.get("V1") || new Float32Array(minLen)).subarray(0, minLen),
    V2: (direct.get("V2") || new Float32Array(minLen)).subarray(0, minLen),
    V3: (direct.get("V3") || new Float32Array(minLen)).subarray(0, minLen),
    V4: (direct.get("V4") || new Float32Array(minLen)).subarray(0, minLen),
    V5: (direct.get("V5") || new Float32Array(minLen)).subarray(0, minLen),
    V6: (direct.get("V6") || new Float32Array(minLen)).subarray(0, minLen),
  };

  return CABRERA_ORDER.map((id, idx) => ({
    leadId: id,
    samples: leadMap[id],
    isLimb: idx < 6,
  }));
};

const applyLowPassFilter = (samples, cutoffHz, sampleRate) => {
  if (!samples || samples.length < 2) return samples;
  if (!Number.isFinite(cutoffHz) || cutoffHz <= 0) return samples;
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) return samples;

  const nyquist = sampleRate * 0.5;
  if (cutoffHz >= nyquist) return samples;

  const dt = 1 / sampleRate;
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const alpha = dt / (rc + dt);

  const out = new Float32Array(samples.length);
  out[0] = samples[0];
  for (let i = 1; i < samples.length; i += 1) {
    out[i] = out[i - 1] + alpha * (samples[i] - out[i - 1]);
  }
  return out;
};

const detectPaceSpikes = (samples, sampleRate) => {
  if (!samples || samples.length < 3) return [];

  let meanAbsDiff = 0;
  for (let i = 1; i < samples.length; i += 1) {
    meanAbsDiff += Math.abs(samples[i] - samples[i - 1]);
  }
  meanAbsDiff /= Math.max(1, samples.length - 1);

  const threshold = Math.max(0.35, meanAbsDiff * 8);
  const refractory = Math.max(2, Math.floor((sampleRate || 300) * 0.02));
  let lastSpike = -refractory;
  const spikes = [];

  for (let i = 1; i < samples.length; i += 1) {
    const jump = Math.abs(samples[i] - samples[i - 1]);
    if (jump > threshold && i - lastSpike >= refractory) {
      spikes.push(i);
      lastSpike = i;
    }
  }

  return spikes;
};

const fetchJson = async (url, options) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Unable to fetch ${url} (${response.status})`);
  }
  return response.json();
};

const fetchFromApiOrStatic = async ({ apiPath, staticPath, apiOptions }) => {
  if (API_BASE) {
    try {
      return await fetchJson(`${API_BASE}${apiPath}`, apiOptions);
    } catch (error) {
      console.warn(`API request failed for ${apiPath}, falling back to static data.`, error);
    }
  }

  return fetchJson(`${STATIC_DATA_BASE}${staticPath}`);
};

const appendLeadTrace = (svgEl, samples, laneX, laneY, laneW, laneH, className) => {
  if (!samples || samples.length < 2) return;

  const sampleRate = Math.max(1, ecgDataSampleRate || 300);
  const secondsAt25 = 2.4;
  const speedFactor = 25 / Math.max(1, ecgDisplaySettings.speed);
  const visibleSamples = Math.max(
    60,
    Math.min(samples.length, Math.round(secondsAt25 * speedFactor * sampleRate))
  );
  const segment = samples.subarray(0, visibleSamples);
  const filtered = applyLowPassFilter(segment, ecgDisplaySettings.filterHz, sampleRate);

  const innerPadX = 6;
  const usableW = Math.max(12, laneW - innerPadX * 2);
  const usableH = Math.max(10, laneH - 6);
  const baseline = laneY + usableH * 0.5 + 3;
  const targetPoints = Math.max(40, Math.floor(usableW));
  const step = Math.max(1, Math.floor(filtered.length / targetPoints));

  let maxAbs = 0.15;
  for (let i = 0; i < filtered.length; i += step) {
    const v = Math.abs(filtered[i]);
    if (v > maxAbs) maxAbs = v;
  }
  const gainScale = Math.max(0.25, ecgDisplaySettings.gain / 10);
  const yScale = ((usableH * 0.4) / maxAbs) * gainScale;

  const pointCount = Math.max(2, Math.ceil(filtered.length / step));
  let pointIdx = 0;
  let d = "";
  for (let i = 0; i < filtered.length; i += step) {
    const px = laneX + innerPadX + (pointIdx / (pointCount - 1)) * usableW;
    const py = baseline - filtered[i] * yScale;
    d += pointIdx === 0 ? `M ${px.toFixed(2)} ${py.toFixed(2)}` : ` L ${px.toFixed(2)} ${py.toFixed(2)}`;
    pointIdx += 1;
  }

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", d);
  path.setAttribute("class", className);
  svgEl.appendChild(path);

  if (!ecgDisplaySettings.paceDetection) return;

  const spikes = detectPaceSpikes(filtered, sampleRate);
  for (const spikeIdx of spikes) {
    const ratio = spikeIdx / Math.max(1, filtered.length - 1);
    const px = laneX + innerPadX + ratio * usableW;
    const marker = document.createElementNS(SVG_NS, "line");
    marker.setAttribute("x1", `${px.toFixed(2)}`);
    marker.setAttribute("x2", `${px.toFixed(2)}`);
    marker.setAttribute("y1", `${(laneY + 2).toFixed(2)}`);
    marker.setAttribute("y2", `${(laneY + laneH - 2).toFixed(2)}`);
    marker.setAttribute("class", "ecg-pace-marker");
    svgEl.appendChild(marker);
  }
};

const renderEcgCabrera = () => {
  if (!ecgSvgEl) return;
  const width = ecgSvgEl.clientWidth;
  const height = ecgSvgEl.clientHeight;
  if (width < 80 || height < 80) return;

  ecgSvgEl.innerHTML = "";
  ecgSvgEl.setAttribute("viewBox", `0 0 ${width} ${height}`);

  if (!ecgLeads.length) {
    const empty = document.createElementNS(SVG_NS, "text");
    empty.setAttribute("x", `${Math.round(width * 0.5)}`);
    empty.setAttribute("y", `${Math.round(height * 0.5)}`);
    empty.setAttribute("text-anchor", "middle");
    empty.setAttribute("fill", "rgba(148,163,184,0.8)");
    empty.setAttribute("font-size", "14");
    empty.textContent = "Select a test to load ECG traces";
    ecgSvgEl.appendChild(empty);
    return;
  }

  const leadById = new Map(ecgLeads.map((lead) => [lead.leadId, lead]));

  const rows = 6;
  const cols = 1;
  const gapX = 12;
  const gapY = 8;
  const cellW = (width - gapX * (cols + 1)) / cols;
  const cellH = (height - gapY * (rows + 1)) / rows;

  CABRERA_PAIR_LAYOUT.forEach((pair, idx) => {
    const [topLeadId, bottomLeadId] = pair;
    const topLead = leadById.get(topLeadId);
    const bottomLead = leadById.get(bottomLeadId);

    const row = Math.floor(idx / cols);
    const col = idx % cols;
    const x = gapX + col * (cellW + gapX);
    const y = gapY + row * (cellH + gapY);

    const box = document.createElementNS(SVG_NS, "rect");
    box.setAttribute("x", `${x}`);
    box.setAttribute("y", `${y}`);
    box.setAttribute("width", `${cellW}`);
    box.setAttribute("height", `${cellH}`);
    box.setAttribute("rx", "8");
    box.setAttribute("class", "ecg-cell-box");
    ecgSvgEl.appendChild(box);

    const laneGap = 10;
    const laneTop = y + 4;
    const laneHeight = Math.max(10, cellH - 8);
    const laneWidth = Math.max(20, (cellW - 16 - laneGap) / 2);
    const leftLaneX = x + 8;
    const rightLaneX = leftLaneX + laneWidth + laneGap;
    const dividerX = leftLaneX + laneWidth + laneGap * 0.5;

    const divider = document.createElementNS(SVG_NS, "line");
    divider.setAttribute("x1", `${dividerX}`);
    divider.setAttribute("x2", `${dividerX}`);
    divider.setAttribute("y1", `${y + 4}`);
    divider.setAttribute("y2", `${y + cellH - 4}`);
    divider.setAttribute("class", "ecg-lane-divider");
    ecgSvgEl.appendChild(divider);

    const topLabel = document.createElementNS(SVG_NS, "text");
    topLabel.setAttribute("x", `${leftLaneX + 4}`);
    topLabel.setAttribute("y", `${y + 12}`);
    topLabel.setAttribute("class", "ecg-cell-label");
    topLabel.textContent = topLeadId;
    ecgSvgEl.appendChild(topLabel);

    const bottomLabel = document.createElementNS(SVG_NS, "text");
    bottomLabel.setAttribute("x", `${rightLaneX + 4}`);
    bottomLabel.setAttribute("y", `${y + 12}`);
    bottomLabel.setAttribute("class", "ecg-cell-label ecg-cell-label-secondary");
    bottomLabel.textContent = bottomLeadId;
    ecgSvgEl.appendChild(bottomLabel);

    appendLeadTrace(
      ecgSvgEl,
      topLead?.samples,
      leftLaneX,
      laneTop,
      laneWidth,
      laneHeight,
      `ecg-trace${topLead?.isLimb ? " is-limb" : " is-precordial"}`
    );
    appendLeadTrace(
      ecgSvgEl,
      bottomLead?.samples,
      rightLaneX,
      laneTop,
      laneWidth,
      laneHeight,
      `ecg-trace${bottomLead?.isLimb ? " is-limb" : " is-precordial"}`
    );
  });
};

const fetchWaveforms = async (recordId) => {
  return fetchFromApiOrStatic({
    apiPath: `/tests/${recordId}/waveforms`,
    staticPath: `/waveforms/${recordId}.json`,
  });
};

const loadEcgForRecord = async (recordId) => {
  if (!recordId) return;
  const token = ++ecgLoadToken;

  try {
    const payload = await fetchWaveforms(recordId);
    if (token !== ecgLoadToken) return;

    ecgDataSampleRate = Number(payload?.sample_rate || 300);
    ecgLeads = buildCabreraLeads(payload);
    if (ecgOverlayLabelEl) {
      ecgOverlayLabelEl.textContent = "300 Hz";
    }
  } catch (error) {
    if (token !== ecgLoadToken) return;
    console.error("Failed to load ECG waveforms", error);
    ecgLeads = [];
    if (ecgOverlayLabelEl) {
      ecgOverlayLabelEl.textContent = "300 Hz";
    }
  }

  renderEcgCabrera();
};

let tests = [];
let currentTest = null;

const formatProbability = (value) => `${(Math.max(0, value) * 100).toFixed(1)}%`;

const isStemiCase = (label) => /(^|_)stemi(_|$)/i.test(String(label || ""));

const updateStElevationWarning = (rawOutcomes, selectedForClass = "") => {
  if (!stWarningNodeEl) return;

  const showWarning = isStemiCase(selectedForClass);

  stWarningNodeEl.classList.toggle("is-hidden", !showWarning);
  stWarningNodeEl.setAttribute("aria-hidden", showWarning ? "false" : "true");
};

const setTreeValues = (treeOutcomes) => {
  for (const [key, el] of Object.entries(nodeValueEls)) {
    if (!el) continue;
    const value = Number(treeOutcomes?.[key] ?? 0);
    el.textContent = formatProbability(value);
  }

  Object.values(treeNodes).forEach((el) => el?.classList.remove("active"));
  Object.values(treeEdges).forEach((el) => el?.classList.remove("active"));
  Object.values(treeBranches).forEach((el) => el?.classList.remove("active"));
  treeNodes.outcomes?.classList.add("active");
  treeBranches.outcomes?.classList.add("active");

  if (!treeOutcomes) return;

  const activatePath = (...keys) => {
    for (const k of keys) {
      treeNodes[k]?.classList.add("active");
      treeBranches[k]?.classList.add("active");
    }
  };
  const activateEdge = (edgeKey) => treeEdges[edgeKey]?.classList.add("active");

  const control = Number(treeOutcomes.control ?? 0);
  const mi = Number(treeOutcomes.mi ?? 0);
  const omi = Number(treeOutcomes.omi ?? 0);
  const nomi = Number(treeOutcomes.nomi ?? 0);
  const omiLmLad = Number(treeOutcomes.omi_lm_lad ?? 0);
  const omiLcx = Number(treeOutcomes.omi_lcx ?? 0);
  const omiRca = Number(treeOutcomes.omi_rca ?? 0);

  if (control >= mi) {
    activatePath("control");
    activateEdge("outcomes_control");
  } else {
    activatePath("mi");
    activateEdge("outcomes_mi");
    activateEdge("mi_split");
    if (omi >= nomi) {
      activatePath("omi");
      activateEdge("mi_omi");
      const maxBranch = Math.max(omiLmLad, omiLcx, omiRca);
      if (maxBranch === omiLmLad) {
        activatePath("omi_lm_lad");
        activateEdge("omi_omi_lm_lad");
      } else if (maxBranch === omiLcx) {
        activatePath("omi_lcx");
        activateEdge("omi_omi_lcx");
      } else if (maxBranch === omiRca) {
        activatePath("omi_rca");
        activateEdge("omi_omi_rca");
      }
    } else {
      activatePath("nomi");
      activateEdge("mi_nomi");
    }
  }
};

const setCurrentDetails = (test) => {
  if (!test) return;

  patientPidEl.textContent = test.record_id;
  patientNameEl.textContent = `Record ${test.record_id}`;
  patientSexEl.textContent = test.sex ?? "-";
  patientAgeEl.textContent = test.age ?? "-";
};

const selectTest = (test) => {
  if (!test) return;
  currentTest = test;
  setCurrentDetails(test);
  setActiveTestButton();
  loadEcgForRecord(test.record_id);
  analyzeCurrentTest();
};

const setActiveTestButton = () => {
  document.querySelectorAll(".test-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.recordId === currentTest?.record_id);
  });
};

const renderTestsList = (items) => {
  if (!previousTestsListEl) return;
  previousTestsListEl.innerHTML = "";

  items.forEach((test) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "test-item";
    button.dataset.recordId = test.record_id;
    button.draggable = true;
    button.innerHTML = `<strong>ID ${test.record_id}</strong><span>${test.selected_for_class || "Unlabeled"}</span>`;
    button.addEventListener("click", () => selectTest(test));
    button.addEventListener("dragstart", (event) => {
      event.dataTransfer?.setData("text/plain", test.record_id);
      event.dataTransfer?.setData("application/x-ecg-record-id", test.record_id);
      event.dataTransfer?.setData("application/json", JSON.stringify({ record_id: test.record_id }));
      button.classList.add("dragging");
    });
    button.addEventListener("dragend", () => {
      button.classList.remove("dragging");
    });
    previousTestsListEl.appendChild(button);
  });

  setActiveTestButton();
};

const fetchTests = async () => {
  return fetchFromApiOrStatic({
    apiPath: "/tests?limit=400",
    staticPath: "/tests.json",
  });
};

const fetchPrediction = async (recordId) => {
  return fetchFromApiOrStatic({
    apiPath: `/tests/${recordId}/predict`,
    staticPath: `/predict/${recordId}.json`,
    apiOptions: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
  });
};

const analyzeCurrentTest = async () => {
  if (!currentTest) return;
  const selectedRecordId = String(currentTest.record_id);

  try {
    const payload = await fetchPrediction(selectedRecordId);
    if (payload.status !== "success") {
      throw new Error(payload.status || "Prediction status is not success");
    }

    if (!currentTest || String(currentTest.record_id) !== selectedRecordId) {
      return;
    }

    updateStElevationWarning(payload.raw_outcomes || {}, currentTest?.selected_for_class || "");
    setTreeValues(payload.tree_outcomes || {});
  } catch (error) {
    console.error(error);
  }
};

const initializeDataUi = async () => {
  try {
    tests = await fetchTests();
    if (!tests.length) return;

    currentTest = tests[0];
    renderTestsList(tests);
    selectTest(currentTest);
    requestAnimationFrame(layoutTreeEdges);
  } catch (error) {
    console.error("Failed to initialize ECG tests", error);
  }
};

const syncEcgControlState = () => {
  ecgDisplaySettings.speed = Number(ecgSpeedEl?.value || 25);
  ecgDisplaySettings.gain = Number(ecgGainEl?.value || 10);
  ecgDisplaySettings.filterHz = Number(ecgFilterEl?.value || 100);
  if (ecgPaceToggleEl) {
    ecgPaceToggleEl.setAttribute("aria-pressed", ecgDisplaySettings.paceDetection ? "true" : "false");
    ecgPaceToggleEl.textContent = `Pace: ${ecgDisplaySettings.paceDetection ? "On" : "Off"}`;
  }
  renderEcgCabrera();
};

ecgSpeedEl?.addEventListener("change", syncEcgControlState);
ecgGainEl?.addEventListener("change", syncEcgControlState);
ecgFilterEl?.addEventListener("change", syncEcgControlState);
ecgPaceToggleEl?.addEventListener("click", () => {
  ecgDisplaySettings.paceDetection = !ecgDisplaySettings.paceDetection;
  syncEcgControlState();
});
syncEcgControlState();

initializeDataUi();
window.addEventListener("resize", () => {
  requestAnimationFrame(layoutTreeEdges);
  requestAnimationFrame(renderEcgCabrera);
});

if (mainArea && topRow && ecgPanel && predictionPanel && resizer) {
  let isDragging = false;
  let startY = 0;
  let startTopHeight = 0;

  const minPanelHeight = 140;

  const getAvailableHeight = () => {
    const styles = getComputedStyle(mainArea);
    const rowGap = parseFloat(styles.rowGap) || 0;
    const paddingTop = parseFloat(styles.paddingTop) || 0;
    const paddingBottom = parseFloat(styles.paddingBottom) || 0;
    return mainArea.clientHeight - paddingTop - paddingBottom - rowGap;
  };

  const setHeights = (topHeight) => {
    const availableHeight = getAvailableHeight();

    const boundedTopHeight = Math.max(
      minPanelHeight,
      Math.min(topHeight, availableHeight - minPanelHeight)
    );

    const bottomHeight = availableHeight - boundedTopHeight;

    topRow.style.height = `${boundedTopHeight}px`;
    ecgPanel.style.height = `${boundedTopHeight}px`;
    predictionPanel.style.height = `${bottomHeight}px`;
    mainArea.style.gridTemplateRows = `${boundedTopHeight}px ${bottomHeight}px`;
    requestAnimationFrame(renderEcgCabrera);
  };

  const beginDrag = (clientY) => {
    isDragging = true;
    startY = clientY;
    startTopHeight = ecgPanel.getBoundingClientRect().height;
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
    resizer.classList.add("is-dragging");
  };

  const stopDrag = () => {
    isDragging = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    resizer.classList.remove("is-dragging");
  };

  resizer.addEventListener("pointerdown", (event) => {
    resizer.setPointerCapture(event.pointerId);
    beginDrag(event.clientY);
  });

  window.addEventListener("pointermove", (event) => {
    if (!isDragging) return;
    const delta = event.clientY - startY;
    setHeights(startTopHeight + delta);
  });

  window.addEventListener("pointerup", () => {
    if (isDragging) stopDrag();
  });

  resizer.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const currentTopHeight = ecgPanel.getBoundingClientRect().height;
    const step = event.key === "ArrowDown" ? 20 : -20;
    setHeights(currentTopHeight + step);
  });

  window.addEventListener("resize", () => {
    const currentTopHeight = ecgPanel.getBoundingClientRect().height;
    setHeights(currentTopHeight);
    requestAnimationFrame(layoutTreeEdges);
  });

  const initialize = () => {
    const availableHeight = getAvailableHeight();
    setHeights(minPanelHeight);
    requestAnimationFrame(layoutTreeEdges);
  };

  initialize();
}
