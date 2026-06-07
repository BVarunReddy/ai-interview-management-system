// ============================================================
// toast.js — Toast Notifications + Shared UI Helpers
// ============================================================

const Toast = (() => {
  let container;
  function getContainer() {
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    return container;
  }
  const icons = {
    success: "fa-check-circle",
    error: "fa-times-circle",
    warning: "fa-exclamation-triangle",
    info: "fa-info-circle",
  };
  const titles = {
    success: "Success",
    error: "Error",
    warning: "Warning",
    info: "Info",
  };

  function show(type, message, duration = 4000) {
    const c = getContainer();
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="fa ${icons[type]} toast-icon"></i>
      <div class="toast-body">
        <div class="toast-title">${titles[type]}</div>
        <div class="toast-msg">${message}</div>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()"><i class="fa fa-times"></i></button>`;
    c.appendChild(toast);
    if (duration > 0) {
      setTimeout(() => {
        toast.style.animation = "slideOut .25s ease forwards";
        setTimeout(() => toast.remove(), 250);
      }, duration);
    }
  }
  return {
    success: (msg, d) => show("success", msg, d),
    error: (msg, d) => show("error", msg, d),
    warning: (msg, d) => show("warning", msg, d),
    info: (msg, d) => show("info", msg, d),
  };
})();

// ── Sidebar Builder ───────────────────────────────────────
function buildSidebar(activePage) {
  const links = [
    { href: "dashboard.html", icon: "fa-chart-line", label: "Dashboard" },
    { href: "addCandidate.html", icon: "fa-user-plus", label: "Add Candidate" },
    { href: "viewCandidates.html", icon: "fa-users", label: "Candidates" },
    {
      href: "scheduleInterview.html",
      icon: "fa-calendar-alt",
      label: "Schedule Interview",
    },
    { href: "viewInterviews.html", icon: "fa-clock", label: "View Interviews" },
    { href: "feedback.html", icon: "fa-comment-alt", label: "Feedback" },
    { href: "analytics.html", icon: "fa-chart-bar", label: "Analytics" },
    { href: "aiScore.html", icon: "fa-robot", label: "AI Scoring" },
    { href: "mlPredict.html", icon: "fa-tree", label: "ML Prediction" },
  ];
  const nav = links
    .map(
      (l) => `
    <a href="${l.href}" class="${activePage === l.href ? "active" : ""}">
      <i class="fa ${l.icon}"></i>${l.label}
    </a>`,
    )
    .join("");
  return `
    <div class="logo"><span class="logo-dot"></span>InterviewPro</div>
    <nav>${nav}</nav>
    <div class="sidebar-footer">
      <a href="profile.html" class="${activePage === "profile.html" ? "active" : ""}">
        <i class="fa fa-user"></i>Profile
      </a>
      <a href="#" class="logout" onclick="logout()">
        <i class="fa fa-sign-out-alt"></i>Logout
      </a>
    </div>`;
}

// ── Navbar Builder ────────────────────────────────────────
function buildNavbar(searchPlaceholder = "Search...") {
  const user = Auth.getUser() || {};
  const ini = (user.name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return `
    ${
      searchPlaceholder
        ? `
  <div class="search-wrap">
    <i class="fa fa-search"></i>
    <input type="text" id="globalSearch" placeholder="${searchPlaceholder}" />
  </div>`
        : `<div></div>`
    }
    <div class="nav-right">
      <div class="relative">
        <button class="notif-btn" id="notifBtn">
          <i class="fa fa-bell"></i>
          <span class="notif-badge" id="notifBadge"></span>
        </button>
        <div class="notif-dropdown" id="notifDropdown">
          <div class="notif-header">
            <span>Notifications</span>
            <button onclick="clearAllNotifs()">Clear all</button>
          </div>
          <div id="notifList"><div class="notif-item">Loading...</div></div>
        </div>
      </div>
      <div class="relative">
        <button class="profile-btn" id="profileBtn">
          <div class="profile-avatar">${ini}</div>
          <div>
            <div class="profile-name">${user.name || "User"}</div>
            <div class="profile-role-label">${user.role || "HR"}</div>
          </div>
        </button>
        <div class="profile-dropdown" id="profileDropdown">
          <div class="pd-header">
            <strong>${user.name || "User"}</strong>
            <span>${user.email || ""}</span>
          </div>
          <a href="profile.html" class="pd-link"><i class="fa fa-user"></i>View Profile</a>
          <button class="pd-link danger" onclick="logout()"><i class="fa fa-sign-out-alt"></i>Logout</button>
        </div>
      </div>
    </div>`;
}

// ── Init UI ───────────────────────────────────────────────
function initUI(activePage, searchPlaceholder) {
  const sb = document.getElementById("sidebar");
  if (sb) sb.innerHTML = buildSidebar(activePage);

  const nb = document.getElementById("navbar");
  if (nb) nb.innerHTML = buildNavbar(searchPlaceholder);

  // Dropdowns
  document.addEventListener("click", (e) => {
    const notifBtn = document.getElementById("notifBtn");
    const notifDrop = document.getElementById("notifDropdown");
    const profBtn = document.getElementById("profileBtn");
    const profDrop = document.getElementById("profileDropdown");

    if (notifBtn && notifBtn.contains(e.target)) {
      notifDrop.classList.toggle("open");
      profDrop && profDrop.classList.remove("open");
      if (notifDrop.classList.contains("open")) loadNotifications();
    } else if (notifDrop && !notifDrop.contains(e.target)) {
      notifDrop.classList.remove("open");
    }

    if (profBtn && profBtn.contains(e.target)) {
      profDrop.classList.toggle("open");
      notifDrop && notifDrop.classList.remove("open");
    } else if (profDrop && !profDrop.contains(e.target)) {
      profDrop.classList.remove("open");
    }
  });

  // Load notification count on page load
  fetchNotifCount();
}

// ── Fetch notification count ──────────────────────────────
async function fetchNotifCount() {
  try {
    const res = await fetch("http://localhost:3000/api/notifications", {
      headers: { Authorization: `Bearer ${Auth.getToken()}` },
    });
    const data = await res.json();
    if (data.success) {
      const badge = document.getElementById("notifBadge");
      if (badge) {
        if (data.unread > 0) {
          badge.classList.add("show");
          badge.setAttribute("data-count", data.unread);
        } else {
          badge.classList.remove("show");
        }
      }
    }
  } catch (e) {}
}

// ── Load notifications into dropdown ─────────────────────
async function loadNotifications() {
  try {
    const res = await fetch("http://localhost:3000/api/notifications", {
      headers: { Authorization: `Bearer ${Auth.getToken()}` },
    });
    const data = await res.json();
    const list = document.getElementById("notifList");
    if (!list) return;

    if (!data.success || !data.notifications.length) {
      list.innerHTML = '<div class="notif-item">No notifications yet</div>';
      return;
    }

    const typeIcons = {
      success: "fa-check-circle",
      error: "fa-times-circle",
      warning: "fa-exclamation-triangle",
      info: "fa-info-circle",
    };
    const typeColors = {
      success: "#10b981",
      error: "#ef4444",
      warning: "#f59e0b",
      info: "#3b82f6",
    };

    list.innerHTML = data.notifications
      .map(
        (n) => `
      <div class="notif-item ${n.is_read ? "" : "unread"}" onclick="markRead(${n.id}, this)">
        <div style="display:flex;align-items:flex-start;gap:10px">
          <i class="fa ${typeIcons[n.type] || "fa-bell"}" style="color:${typeColors[n.type] || "#3b82f6"};margin-top:2px;font-size:13px;flex-shrink:0"></i>
          <div>
            <div style="font-weight:600;font-size:13px">${n.title}</div>
            <div style="font-size:12px;color:#475569;margin-top:2px">${n.message}</div>
            <div class="notif-time">${timeAgo(new Date(n.created_at))}</div>
          </div>
        </div>
      </div>`,
      )
      .join("");

    // Update badge
    const badge = document.getElementById("notifBadge");
    if (badge) {
      if (data.unread > 0) badge.classList.add("show");
      else badge.classList.remove("show");
    }
  } catch (e) {
    const list = document.getElementById("notifList");
    if (list)
      list.innerHTML =
        '<div class="notif-item">Could not load notifications</div>';
  }
}

// ── Mark one as read ──────────────────────────────────────
async function markRead(id, el) {
  try {
    await fetch(`http://localhost:3000/api/notifications/${id}/read`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${Auth.getToken()}` },
    });
    el.classList.remove("unread");
    fetchNotifCount();
  } catch (e) {}
}

// ── Clear all ─────────────────────────────────────────────
async function clearAllNotifs() {
  try {
    await fetch("http://localhost:3000/api/notifications/clear", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${Auth.getToken()}` },
    });
    const list = document.getElementById("notifList");
    if (list)
      list.innerHTML = '<div class="notif-item">No notifications yet</div>';
    const badge = document.getElementById("notifBadge");
    if (badge) badge.classList.remove("show");
  } catch (e) {}
}

// ── Time ago helper ───────────────────────────────────────
function timeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ── Logout ────────────────────────────────────────────────
function logout() {
  Auth.clearSession();
  window.location.href = "login.html";
}

// ── Shared helpers ────────────────────────────────────────
function statusBadge(status) {
  const map = {
    Pending: "badge-pending",
    Screening: "badge-screening",
    Interview: "badge-interview",
    Offer: "badge-offer",
    Selected: "badge-selected",
    Rejected: "badge-rejected",
    Scheduled: "badge-scheduled",
    Completed: "badge-completed",
    Cancelled: "badge-cancelled",
    Technical: "badge-technical",
    HR: "badge-hr",
    Managerial: "badge-managerial",
    Final: "badge-final",
    "Strong Hire": "badge-selected",
    Hire: "badge-offer",
    Maybe: "badge-screening",
    "No Hire": "badge-rejected",
  };
  return `<span class="badge ${map[status] || "badge-pending"}">${status}</span>`;
}

function aiScorePill(score) {
  if (score === null || score === undefined)
    return `<span class="ai-score none">—</span>`;
  const cls = score >= 75 ? "high" : score >= 50 ? "mid" : "low";
  return `<span class="ai-score ${cls}"><i class="fa fa-robot"></i>${score}%</span>`;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function initials(name) {
  return (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function skeletonRows(cols = 5, rows = 5) {
  return Array(rows)
    .fill("")
    .map(
      () =>
        `<tr>${Array(cols)
          .fill("")
          .map(() => `<td><div class="skeleton skeleton-text"></div></td>`)
          .join("")}</tr>`,
    )
    .join("");
}
