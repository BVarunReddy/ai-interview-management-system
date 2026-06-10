// viewCandidates.js
let allCandidates = [];
let activeStatus = "All";
let selectedCandId = null;

document.addEventListener("DOMContentLoaded", () => {
  if (!Auth.requireAuth()) return;
  initUI("viewCandidates.html", "Search candidates...");
  loadCandidates();

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    let searchTimer;
    searchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => renderTable(e.target.value.trim()), 300);
    });
  }
});

async function loadCandidates() {
  const res = await API.getCandidates({ limit: 200 });
  if (!res || !res.ok) {
    Toast.error("Failed to load candidates.");
    return;
  }
  allCandidates = res.data.candidates;
  updatePipelineCounts();
  renderTable();
}

function updatePipelineCounts() {
  const counts = {};
  allCandidates.forEach((c) => {
    counts[c.status] = (counts[c.status] || 0) + 1;
  });
  const allEl = document.getElementById("cnt-all");
  if (allEl) allEl.textContent = allCandidates.length;
  [
    "Pending",
    "Screening",
    "Interview",
    "Offer",
    "Selected",
    "Rejected",
  ].forEach((s) => {
    const el = document.getElementById(`cnt-${s.toLowerCase()}`);
    if (el) el.textContent = counts[s] || 0;
  });
}

function filterByStage(el) {
  document
    .querySelectorAll(".pipeline-stage")
    .forEach((s) => s.classList.remove("active"));
  el.classList.add("active");
  activeStatus = el.dataset.status;
  const searchInput = document.getElementById("searchInput");
  renderTable(searchInput ? searchInput.value.trim() : "");
}

function renderTable(search = "") {
  let data = allCandidates;
  if (activeStatus !== "All")
    data = data.filter((c) => c.status === activeStatus);
  if (search) {
    const q = search.toLowerCase();
    data = data.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.position.toLowerCase().includes(q),
    );
  }

  const tbody = document.getElementById("candidateTable");
  if (!tbody) return;

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="7">
      <div class="empty-state">
        <div class="empty-icon"><i class="fa fa-users"></i></div>
        <div class="empty-title">No candidates found</div>
        <div class="empty-desc">Try a different filter or <a href="addCandidate.html" style="color:#4f46e5">add a new one</a></div>
      </div></td></tr>`;
    return;
  }

  tbody.innerHTML = data
    .map(
      (c) => `
    <tr>
      <td>
        <div class="cand-cell">
          <div class="cand-avatar">${initials(c.name)}</div>
          <div>
            <div class="cand-name">${c.name}</div>
            <div class="cand-email">${c.email}</div>
          </div>
        </div>
      </td>
      <td style="font-size:13px">${c.position}</td>
      <td style="font-size:13px">${c.experience || 0} yr${c.experience !== 1 ? "s" : ""}</td>
      <td>${aiScorePill(c.ai_score)}</td>
      <td>${statusBadge(c.status)}</td>
      <td style="font-size:12px;color:#64748b">${formatDate(c.created_at)}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-icon btn-sm" title="Update Status" onclick="openStatusModal(${c.id},'${c.name}','${c.status}')">
            <i class="fa fa-edit"></i>
          </button>
          <button class="btn btn-icon btn-sm" title="Delete" onclick="deleteCandidate(${c.id},'${c.name}')" style="color:#ef4444">
            <i class="fa fa-trash"></i>
          </button>
          ${c.resume_path ? `<a class="btn btn-icon btn-sm" href="https://ai-interview-management-system.onrender.com/uploads/${c.resume_path}" target="_blank" title="View Resume"><i class="fa fa-file-pdf"></i></a>` : ""}
        </div>
      </td>
    </tr>`,
    )
    .join("");
}

function openStatusModal(id, name, currentStatus) {
  selectedCandId = id;
  const modalName = document.getElementById("modalCandName");
  const modalStatus = document.getElementById("modalStatus");
  const modal = document.getElementById("statusModal");
  if (modalName) modalName.textContent = name;
  if (modalStatus) modalStatus.value = currentStatus;
  if (modal) modal.style.display = "flex";
}

function closeModal() {
  const modal = document.getElementById("statusModal");
  if (modal) modal.style.display = "none";
  selectedCandId = null;
}

async function confirmStatusUpdate() {
  const modalStatus = document.getElementById("modalStatus");
  if (!modalStatus) return;
  const status = modalStatus.value;
  const res = await API.updateStatus(selectedCandId, status);
  if (res && res.ok) {
    Toast.success("Status updated successfully.");
    closeModal();
    loadCandidates();
  } else {
    Toast.error(res?.data?.message || "Update failed.");
  }
}

async function deleteCandidate(id, name) {
  if (!confirm(`Delete candidate "${name}"? This cannot be undone.`)) return;
  const res = await API.deleteCandidate(id);
  if (res && res.ok) {
    Toast.success("Candidate deleted.");
    loadCandidates();
  } else Toast.error("Delete failed.");
}
