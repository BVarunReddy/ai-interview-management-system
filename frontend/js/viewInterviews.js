// viewInterviews.js
let allInterviews = [];

document.addEventListener("DOMContentLoaded", () => {
  if (!Auth.requireAuth()) return;
  initUI("viewInterviews.html", "");
  loadInterviews();

  let t;
  document.getElementById("searchInput").addEventListener("input", (e) => {
    clearTimeout(t); t = setTimeout(() => renderTable(), 300);
  });
  document.getElementById("roundFilter").addEventListener("change", renderTable);
  document.getElementById("statusFilter").addEventListener("change", renderTable);
});

async function loadInterviews() {
  const res = await API.getInterviews();
  if (!res || !res.ok) { Toast.error("Failed to load interviews."); return; }
  allInterviews = res.data.interviews;
  renderTable();
}

function renderTable() {
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  const round  = document.getElementById("roundFilter").value;
  const status = document.getElementById("statusFilter").value;

  let data = allInterviews;
  if (round  !== "All") data = data.filter(i => i.round_name === round);
  if (status !== "All") data = data.filter(i => i.status === status);
  if (search) data = data.filter(i =>
    i.candidate_name.toLowerCase().includes(search) ||
    i.interviewer.toLowerCase().includes(search)
  );

  const tbody = document.getElementById("interviewTable");
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="6">
      <div class="empty-state">
        <div class="empty-icon"><i class="fa fa-calendar"></i></div>
        <div class="empty-title">No interviews found</div>
        <div class="empty-desc"><a href="scheduleInterview.html" style="color:#4f46e5">Schedule one now</a></div>
      </div></td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(i => {
    const dt = new Date(`${i.interview_date}T${i.interview_time}`);
    const dateStr = dt.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
    const timeStr = dt.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", hour12: true });
    return `
      <tr>
        <td>
          <div class="cand-cell">
            <div class="cand-avatar">${initials(i.candidate_name)}</div>
            <div>
              <div class="cand-name">${i.candidate_name}</div>
              <div class="cand-email">${i.position || ''}</div>
            </div>
          </div>
        </td>
        <td>${statusBadge(i.round_name)}</td>
        <td style="font-size:13px">${i.interviewer}</td>
        <td>
          <div style="font-size:13px;font-weight:500">${dateStr}</div>
          <div style="font-size:12px;color:#64748b">${timeStr}</div>
        </td>
        <td>${statusBadge(i.status)}</td>
        <td>
          <div style="display:flex;gap:6px">
            ${i.status === 'Scheduled' ? `
              <button class="btn btn-sm btn-success" onclick="updateStatus(${i.id},'Completed')">
                <i class="fa fa-check"></i> Done
              </button>
              <button class="btn btn-sm btn-outline" onclick="updateStatus(${i.id},'Cancelled')">
                Cancel
              </button>` : ''}
            <button class="btn btn-icon btn-sm" onclick="deleteInterview(${i.id})" style="color:#ef4444" title="Delete">
              <i class="fa fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>`;
  }).join("");
}

async function updateStatus(id, status) {
  const res = await API.updateInterviewStatus(id, status);
  if (res && res.ok) { Toast.success(`Interview marked as ${status}.`); loadInterviews(); }
  else Toast.error("Update failed.");
}

async function deleteInterview(id) {
  if (!confirm("Delete this interview? This cannot be undone.")) return;
  const res = await API.deleteInterview(id);
  if (res && res.ok) { Toast.success("Interview deleted."); loadInterviews(); }
  else Toast.error("Delete failed.");
}
