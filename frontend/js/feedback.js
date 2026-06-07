// feedback.js
document.addEventListener("DOMContentLoaded", async () => {
  if (!Auth.requireAuth()) return;
  initUI("feedback.html", "");

  // Load candidates
  const cRes = await API.getCandidates({ limit: 200 });
  if (cRes && cRes.ok) {
    const sel = document.getElementById("candidate_id");
    cRes.data.candidates.forEach(c => {
      const o = document.createElement("option");
      o.value = c.id; o.textContent = `${c.name} — ${c.position}`;
      sel.appendChild(o);
    });
  }

  // Live overall score
  ["technical","communication","problem_solving"].forEach(id => {
    document.getElementById(id).addEventListener("input", updateOverall);
  });

  loadFeedbackInsights();

  document.getElementById("feedbackForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("submitBtn");
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Submitting...';
    btn.disabled = true;

    const res = await API.submitFeedback({
      candidate_id:         parseInt(document.getElementById("candidate_id").value),
      technical_score:      parseInt(document.getElementById("technical").value),
      communication_score:  parseInt(document.getElementById("communication").value),
      problem_solving_score:parseInt(document.getElementById("problem_solving").value),
      recommendation:       document.getElementById("recommendation").value,
      remarks:              document.getElementById("remarks").value.trim(),
    });

    if (res && res.ok) {
      Toast.success("Feedback submitted successfully!");
      document.getElementById("feedbackForm").reset();
      document.getElementById("techVal").textContent = 5;
      document.getElementById("commVal").textContent = 5;
      document.getElementById("probVal").textContent = 5;
      document.getElementById("overallScore").textContent = "5.0";
      loadFeedbackInsights();
    } else {
      Toast.error(res?.data?.message || "Submission failed.");
    }

    btn.innerHTML = '<i class="fa fa-paper-plane"></i> Submit Feedback';
    btn.disabled = false;
  });
});

function updateOverall() {
  const t = parseInt(document.getElementById("technical").value);
  const c = parseInt(document.getElementById("communication").value);
  const p = parseInt(document.getElementById("problem_solving").value);
  document.getElementById("overallScore").textContent = ((t + c + p) / 3).toFixed(1);
}

async function loadFeedbackInsights() {
  const res = await API.getFeedback();
  if (!res || !res.ok) return;
  const fb = res.data.feedbacks;

  if (fb.length) {
    const avg = (key) => (fb.reduce((s, f) => s + (f[key] || 0), 0) / fb.length).toFixed(1);
    document.getElementById("avgTech").textContent    = avg("technical_score");
    document.getElementById("avgComm").textContent    = avg("communication_score");
    document.getElementById("avgProb").textContent    = avg("problem_solving_score");
    document.getElementById("avgOverall").textContent = avg("overall_score");

    document.getElementById("recentFeedback").innerHTML = fb.slice(0,5).map(f => `
      <div class="activity-item">
        <div class="activity-dot"></div>
        <div>
          <div style="font-size:13px;font-weight:500">${f.candidate_name}</div>
          <div style="display:flex;gap:8px;margin-top:4px;align-items:center">
            ${statusBadge(f.recommendation)}
            <span style="font-size:11px;color:#94a3b8">Score: ${parseFloat(f.overall_score).toFixed(1)}/10</span>
          </div>
        </div>
      </div>`).join("");
  } else {
    document.getElementById("recentFeedback").innerHTML = '<div class="empty-state" style="padding:20px"><div class="empty-desc">No feedback yet</div></div>';
  }
}
