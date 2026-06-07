// mlPredict.js
let candidates = [];
let predHistory = [];

document.addEventListener("DOMContentLoaded", async () => {
  if (!Auth.requireAuth()) return;
  initUI("mlPredict.html", "");

  const res = await API.getCandidates({ limit: 200 });
  if (res && res.ok) {
    candidates = res.data.candidates;
    const sel = document.getElementById("candidateSelect");
    candidates.forEach(c => {
      const o = document.createElement("option");
      o.value = c.id;
      o.textContent = `${c.name} — ${c.position} (${c.experience || 0} yrs)`;
      sel.appendChild(o);
    });
  }

  document.getElementById("candidateSelect").addEventListener("change", function () {
    const c = candidates.find(x => x.id == this.value);
    if (!c) { document.getElementById("candPreview").style.display = "none"; return; }
    document.getElementById("fExp").textContent    = `${c.experience || 0} years`;
    document.getElementById("fPos").textContent    = c.position || "—";
    document.getElementById("fSkills").textContent = (c.skills || "").split(",").filter(Boolean).length || "—";
    document.getElementById("fTech").textContent   = "From latest feedback";
    document.getElementById("fComm").textContent   = "From latest feedback";
    document.getElementById("fProb").textContent   = "From latest feedback";
    document.getElementById("candPreview").style.display = "block";
  });

  // Load existing predictions
  loadHistory();
});

async function runPrediction() {
  const candidateId = document.getElementById("candidateSelect").value;
  if (!candidateId) { Toast.warning("Please select a candidate."); return; }

  const btn = document.getElementById("predictBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Predicting...';

  document.getElementById("emptyResult").style.display = "none";
  document.getElementById("predCard").className = "pred-card";
  document.getElementById("thinkingPanel").style.display = "block";

  const res = await fetch(`http://localhost:3000/api/ml/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Auth.getToken()}`
    },
    body: JSON.stringify({ candidate_id: parseInt(candidateId) })
  });
  const data = await res.json();

  document.getElementById("thinkingPanel").style.display = "none";
  btn.disabled = false;
  btn.innerHTML = '<i class="fa fa-magic"></i> Run ML Prediction';

  if (!data.success) {
    Toast.error(data.message || "Prediction failed.");
    document.getElementById("emptyResult").style.display = "block";
    return;
  }

  showResult(data);

  const c = candidates.find(x => x.id == candidateId);
  predHistory.unshift({ name: c?.name || "Candidate", ...data, time: new Date() });
  renderHistory();
  Toast.success(`Prediction complete: ${data.label}`);
}

function showResult(d) {
  const card = document.getElementById("predCard");
  card.className = `pred-card ${d.category} show`;

  const emojis = { high: "🟢", medium: "🟡", low: "🔴" };
  document.getElementById("predEmoji").textContent = emojis[d.category] || "🎯";
  document.getElementById("predProb").textContent  = `${d.probability}%`;
  document.getElementById("predLabel").textContent = d.label;
  document.getElementById("predName").textContent  = d.candidate_name || "—";

  setTimeout(() => {
    document.getElementById("probBarFill").style.width = `${d.probability}%`;
  }, 100);
}

async function loadHistory() {
  const res = await fetch(`http://localhost:3000/api/ml/predictions`, {
    headers: { "Authorization": `Bearer ${Auth.getToken()}` }
  });
  const data = await res.json();
  if (data.success && data.predictions.length) {
    predHistory = data.predictions.map(p => ({
      name: p.name,
      label: p.ml_prediction,
      probability: p.ml_probability,
      category: p.ml_probability >= 70 ? "high" : p.ml_probability >= 40 ? "medium" : "low"
    }));
    renderHistory();
  }
}

function renderHistory() {
  if (!predHistory.length) return;
  document.getElementById("predHistory").innerHTML = predHistory.slice(0, 8).map(p => `
    <div class="pred-history-row">
      <div>
        <div style="font-weight:600">${p.name}</div>
        <div style="font-size:11px;color:var(--text-muted)">${p.label || "—"}</div>
      </div>
      <span class="prob-pill ${p.category || 'medium'}">${p.probability || 0}%</span>
    </div>`).join("");
}
