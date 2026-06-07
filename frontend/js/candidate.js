// candidate.js
document.addEventListener("DOMContentLoaded", () => {
  if (!Auth.requireAuth()) return;
  initUI("addCandidate.html", "");

  // File drag & drop
  const drop = document.getElementById("fileDrop");
  const fileInput = document.getElementById("resumeFile");

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    document.getElementById("fileName").textContent = file ? `📎 ${file.name}` : "";
  });

  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("drag"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("drag"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault(); drop.classList.remove("drag");
    fileInput.files = e.dataTransfer.files;
    const file = fileInput.files[0];
    document.getElementById("fileName").textContent = file ? `📎 ${file.name}` : "";
  });

  // Form submit
  document.getElementById("candidateForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("submitBtn");
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Adding...';
    btn.disabled = true;

    const fd = new FormData();
    fd.append("name",       document.getElementById("name").value.trim());
    fd.append("email",      document.getElementById("email").value.trim());
    fd.append("phone",      document.getElementById("phone").value.trim());
    fd.append("position",   document.getElementById("position").value.trim());
    fd.append("experience", document.getElementById("experience").value || 0);
    fd.append("skills",     document.getElementById("skills").value.trim());
    fd.append("status",     document.getElementById("status").value);
    if (fileInput.files[0]) fd.append("resume", fileInput.files[0]);

    const res = await API.addCandidate(fd);

    if (res && res.ok) {
      Toast.success("Candidate added successfully!");
      document.getElementById("candidateForm").reset();
      document.getElementById("fileName").textContent = "";
    } else {
      Toast.error(res?.data?.message || "Failed to add candidate.");
    }

    btn.innerHTML = '<i class="fa fa-user-plus"></i> Add Candidate';
    btn.disabled = false;
  });
});
