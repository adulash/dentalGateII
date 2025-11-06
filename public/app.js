// CorpGate - Complete PostgreSQL Backend Frontend

(function () {
  const state = {
    accessToken: null,
    refreshToken: null,
    user: null,
    pages: [],
    currentPage: null,
  };

  // Use API_BASE from config.js or fallback
  const API_BASE = window.API_BASE || "/api";

  // Load tokens from localStorage
  function loadTokens() {
    state.accessToken = localStorage.getItem("accessToken");
    state.refreshToken = localStorage.getItem("refreshToken");
  }

  // Save tokens to localStorage
  function saveTokens(accessToken, refreshToken) {
    state.accessToken = accessToken;
    state.refreshToken = refreshToken;
    if (accessToken) localStorage.setItem("accessToken", accessToken);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
  }

  // Clear tokens
  function clearTokens() {
    state.accessToken = null;
    state.refreshToken = null;
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }

  // Helper to make API calls with automatic token refresh
  async function apiCall(endpoint, payload = {}) {
    try {
      const response = await fetch(`${API_BASE}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: state.accessToken ? `Bearer ${state.accessToken}` : "",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      // If token expired, try to refresh
      if (response.status === 401 && state.refreshToken && !endpoint.includes("auth/refresh")) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          // Retry original request with new token
          return apiCall(endpoint, payload);
        }
      }

      return data;
    } catch (error) {
      console.error("API call error:", error);
      return { ok: false, message: error.message };
    }
  }

  // Refresh access token
  async function refreshAccessToken() {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: state.refreshToken }),
      });

      const data = await response.json();

      if (data.ok && data.accessToken) {
        saveTokens(data.accessToken, state.refreshToken);
        return true;
      }

      // Refresh failed, logout
      clearTokens();
      showLogin();
      return false;
    } catch (error) {
      console.error("Token refresh error:", error);
      clearTokens();
      showLogin();
      return false;
    }
  }

  const el = (id) => document.getElementById(id);

  function showLoading() {
    const overlay = el("loading-overlay");
    if (overlay) overlay.style.display = "flex";
  }

  function hideLoading() {
    const overlay = el("loading-overlay");
    if (overlay) overlay.style.display = "none";
  }

  function init() {
    console.log("App initialized");
    loadTokens();
    bindLogin();
    bindLogout();
    bindPasswordSetup();
    bindBackToLogin();
    bindSidebarToggle();

    // Check if already logged in
    if (state.accessToken) {
      // Try to restore session
      apiCall("auth/me").then((res) => {
        if (res.ok && res.user) {
          state.user = res.user;
          state.pages = res.pages || [];
          showDashboard();
          buildNav();
          // Navigate to first allowed page (not Profile)
          const firstPage = state.pages[0];
          if (firstPage) navigate(firstPage);
        } else {
          showLogin();
        }
      });
    } else {
      showLogin();
    }
  }

  function bindLogin() {
    const form = el("login-form");
    if (!form) return;

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const email = el("login-email").value.trim();
      const password = el("login-password").value;
      const errorEl = el("login-error");
      if (errorEl) errorEl.style.display = "none";
      showLoading();

      try {
        const res = await apiCall("auth/login", { email, password });

        hideLoading();

        if (!res || !res.ok) {
          if (errorEl) {
            errorEl.textContent = res?.message || "Login failed";
            errorEl.style.display = "";
          }
          return;
        }

        // Save tokens
        saveTokens(res.accessToken, res.refreshToken);

        state.user = res.user;
        state.pages = res.pages || [];

        if (res.needsPasswordSetup) {
          showPasswordSetup();
          return;
        }

        if (!showDashboard()) {
          console.error("Failed to show dashboard");
          return;
        }

        buildNav();

        // Navigate to first allowed page (not Profile)
        const firstPage = state.pages?.[0];
        if (firstPage) {
          setTimeout(() => {
            if (state.currentPage !== firstPage) {
              navigate(firstPage);
            }
          }, 100);
        }
      } catch (error) {
        hideLoading();
        console.error("Login error:", error);
        if (errorEl) {
          errorEl.textContent = "Login error: " + (error.message || error);
          errorEl.style.display = "";
        }
      }
    });
  }

  function bindLogout() {
    el("btn-logout")?.addEventListener("click", async function () {
      showLoading();
      try {
        await apiCall("auth/logout");
      } catch (e) {}
      hideLoading();
      clearTokens();
      state.user = null;
      state.pages = [];
      showLogin();
    });
  }

  function buildNav() {
    const nav = el("nav-pages");
    if (!nav) return;
    nav.innerHTML = "";
    // Filter out "Profile" from sidebar (accessible via email click)
    const pages = (state.pages || []).slice().filter(p => p !== "Profile");
    if (state.user && String(state.user.role).toLowerCase() === "admin") {
      pages.push("Admin");
    }
    Array.from(new Set(pages)).forEach((p) => {
      const li = document.createElement("li");
      li.className = "sidebar-menu-item";
      const a = document.createElement("a");
      a.className = "sidebar-menu-link";
      a.href = "#";
      a.textContent = p;
      a.addEventListener("click", (e) => {
        e.preventDefault();
        navigate(p);
      });
      li.appendChild(a);
      nav.appendChild(li);
    });
    const navUserEmail = el("nav-user-email");
    if (navUserEmail) {
      navUserEmail.textContent = state.user ? state.user.email : "";
    }
    const navUser = el("nav-user");
    if (navUser) {
      navUser.style.cursor = state.user ? "pointer" : "default";
      if (state.user) {
        navUser.onclick = () => openProfileModal();
      } else {
        navUser.onclick = null;
      }
    }
    const btnLogout = el("btn-logout");
    if (btnLogout) {
      btnLogout.style.display = state.user ? "" : "none";
    }
  }

  function navigate(page) {
    if (!page || state.currentPage === page) return;

    state.currentPage = page;
    showDashboard();
    hideLoading();

    const pageTitle = el("page-title");
    const pageContent = el("page-content");
    if (pageTitle) pageTitle.textContent = page;
    if (pageContent) pageContent.innerHTML = '<div class="text-muted">Loading...</div>';

    if (page === "Profile") {
      renderProfile();
      return;
    }
    if (page === "Admin") {
      renderAdmin();
      return;
    }

    showLoading();
    apiCall("list", { table: page, page: 1, pageSize: 25, filters: {} })
      .then((res) => {
        hideLoading();
        renderTable(res);
      })
      .catch(() => {
        hideLoading();
        el("page-content").innerHTML = '<div class="text-danger">Failed to load.</div>';
      });
  }

  function renderProfile() {
    showLoading();
    const root = el("page-content");
    if (!root) {
      hideLoading();
      return;
    }

    // Fetch both profile and options
    Promise.all([apiCall("profile/get"), apiCall("profile/getOptions")]).then(
      ([profileRes, optionsRes]) => {
        hideLoading();

        if (!profileRes || !profileRes.ok) {
          root.innerHTML = `<div class="text-danger">Error loading profile: ${
            profileRes?.message || "Unknown error"
          }</div>`;
          return;
        }

        const profile = profileRes.profile || {};
        const options = optionsRes?.ok
          ? optionsRes.options
          : { networks: [], facilities: [], supervisors: [] };

        const escapeHtml = (text) => {
          const div = document.createElement("div");
          div.textContent = text;
          return div.innerHTML;
        };

        const renderField = (name, value) => {
          const label = name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

          // Dropdown fields
          if (name === "network_id") {
            const opts = options.networks
              .map(
                (o) =>
                  `<option value="${o.value}" ${o.value == value ? "selected" : ""}>${escapeHtml(
                    o.label
                  )}</option>`
              )
              .join("");
            return `<div class="mb-2"><label class="form-label">${label}</label><select class="form-select" id="prof-${name}"><option value="">Select Network</option>${opts}</select></div>`;
          }

          if (name === "facility_id") {
            const opts = options.facilities
              .map(
                (o) =>
                  `<option value="${escapeHtml(o.value)}" ${
                    o.value == value ? "selected" : ""
                  }>${escapeHtml(o.label)}</option>`
              )
              .join("");
            return `<div class="mb-2"><label class="form-label">${label}</label><select class="form-select" id="prof-${name}"><option value="">Select Facility</option>${opts}</select></div>`;
          }

          if (name === "supervisor_id") {
            const opts = options.supervisors
              .map(
                (o) =>
                  `<option value="${o.value}" ${o.value == value ? "selected" : ""}>${escapeHtml(
                    o.label
                  )}</option>`
              )
              .join("");
            return `<div class="mb-2"><label class="form-label">${label}</label><select class="form-select" id="prof-${name}"><option value="">Select Supervisor</option>${opts}</select></div>`;
          }

          if (name === "gender") {
            return `<div class="mb-2"><label class="form-label">${label}</label><select class="form-select" id="prof-${name}">
            <option value="">Select Gender</option>
            <option value="male" ${value === "male" ? "selected" : ""}>Male</option>
            <option value="female" ${value === "female" ? "selected" : ""}>Female</option>
          </select></div>`;
          }

          if (name === "dob") {
            return `<div class="mb-2"><label class="form-label">${label}</label><input type="date" class="form-control" id="prof-${name}" value="${escapeHtml(
              String(value || "")
            )}"></div>`;
          }

          if (name === "comments") {
            return `<div class="mb-2"><label class="form-label">${label}</label><textarea class="form-control" id="prof-${name}" rows="3">${escapeHtml(
              String(value || "")
            )}</textarea></div>`;
          }

          // Regular text input
          return `<div class="mb-2"><label class="form-label">${label}</label><input class="form-control" id="prof-${name}" value="${escapeHtml(
            String(value || "")
          )}"></div>`;
        };

        const fields = [
          "employee_id",
          "national_id",
          "dob",
          "gender",
          "job_title",
          "specialty",
          "network_id",
          "supervisor_id",
          "fullname_ar",
          "fullname_en",
          "facility_id",
          "phone",
          "address",
          "comments",
        ];

        const isIncomplete = fields.some((f) => !profile[f]);
        const warningMsg = isIncomplete
          ? '<div class="alert alert-warning mb-3">Please complete your profile information.</div>'
          : "";

        const form = fields.map((name) => renderField(name, profile[name])).join("");

        root.innerHTML = `<div class="card"><div class="card-body"><h6 class="mb-3">My Profile</h6>${warningMsg}${form}<button class="btn btn-primary" id="btn-save-profile">Save</button><div class="text-danger small mt-2" id="profile-error" style="display:none"></div></div></div>`;

        el("btn-save-profile").onclick = () => {
          const data = {};
          fields.forEach((n) => {
            const elem = document.getElementById(`prof-${n}`);
            data[n] = elem.value || "";
          });
          const errorEl = document.getElementById("profile-error");
          const saveBtn = document.getElementById("btn-save-profile");
          errorEl.style.display = "none";

          const originalText = saveBtn.textContent;
          saveBtn.disabled = true;
          saveBtn.textContent = "Saving...";

          apiCall("profile/upsert", { data }).then((res) => {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;

            if (!res || !res.ok) {
              const errorMsg = res?.message || "Save failed";
              const errorDetail = res?.error ? ` - ${res.error}` : "";
              const errorDbDetail = res?.detail ? ` (${res.detail})` : "";
              errorEl.textContent = errorMsg + errorDetail + errorDbDetail;
              errorEl.style.display = "";
              console.error("Profile save error:", res);
              return;
            }

            const successMsg = document.createElement("div");
            successMsg.className = "alert alert-success alert-dismissible fade show mt-2";
            successMsg.innerHTML =
              '<strong>Saved!</strong> Profile updated successfully. <button type="button" class="btn-close" data-bs-dismiss="alert"></button>';
            errorEl.parentElement.insertBefore(successMsg, errorEl);
            setTimeout(() => successMsg.remove(), 3000);

            // Refresh navbar to show updated info
            buildNav();
          });
        };
      }
    );
  }

  function renderAdmin() {
    const root = el("page-content");
    showLoading();

    apiCall("admin/listUsers").then((res) => {
      hideLoading();
      const users = res?.users || [];

      const header =
        '<div class="d-flex justify-content-between align-items-center mb-3"><h6 class="mb-0">Users</h6><button class="btn btn-sm btn-success" id="btn-add-user">Add User</button></div>';

      const escapeHtml = (text) => {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
      };

      const table = [
        '<div class="table-responsive"><table class="table table-striped table-sm"><thead><tr><th>Email</th><th>Role</th><th>Status</th><th>Allowed Pages</th><th>Action</th></tr></thead><tbody>',
        ...users.map((u) => {
          return `<tr>
            <td>${escapeHtml(String(u.email || ""))}</td>
            <td>${escapeHtml(String(u.role || ""))}</td>
            <td>
              <select class="form-select form-select-sm" data-status-email="${escapeHtml(
                String(u.email || "")
              )}">
                <option value="Active" ${
                  String(u.status || "Active") === "Active" ? "selected" : ""
                }>Active</option>
                <option value="Inactive" ${
                  String(u.status || "Active") === "Inactive" ? "selected" : ""
                }>Inactive</option>
              </select>
            </td>
            <td><input class="form-control form-control-sm" value="${escapeHtml(
              String((u.allowed_pages || []).join(", "))
            )}" data-pages-email="${escapeHtml(String(u.email || ""))}"></td>
            <td><button class="btn btn-sm btn-primary" data-save="${escapeHtml(
              String(u.email || "")
            )}">Save</button></td>
          </tr>`;
        }),
        "</tbody></table></div>",
      ].join("");

      root.innerHTML = header + table;

      el("btn-add-user")?.addEventListener("click", openAddUserModal);

      root.querySelectorAll("button[data-save]").forEach((btn) => {
        btn.onclick = () => {
          const email = btn.getAttribute("data-save");
          const pagesInput = root.querySelector(`input[data-pages-email="${email}"]`);
          const statusSelect = root.querySelector(`select[data-status-email="${email}"]`);
          const pages = (pagesInput.value || "")
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean);
          const status = statusSelect.value;

          const originalText = btn.textContent;
          btn.disabled = true;
          btn.textContent = "Saving...";

          apiCall("admin/setAllowedPages", { email, pages }).then((res1) => {
            if (!res1?.ok) {
              btn.disabled = false;
              btn.textContent = originalText;
              alert(res1?.message || "Save pages failed");
              return;
            }

            apiCall("admin/setUserStatus", { email, status }).then((res2) => {
              btn.disabled = false;
              if (!res2?.ok) {
                btn.textContent = originalText;
                alert(res2?.message || "Save status failed");
                return;
              }
              btn.textContent = "Saved!";
              btn.classList.remove("btn-primary");
              btn.classList.add("btn-success");
              setTimeout(() => {
                btn.textContent = originalText;
                btn.classList.remove("btn-success");
                btn.classList.add("btn-primary");
              }, 2000);
            });
          });
        };
      });
    });
  }

  function openAddUserModal() {
    const modalEl = el("addUserModal");
    const form = el("add-user-form");
    const errorEl = el("add-user-error");
    const resultEl = el("add-user-result");

    form.reset();
    errorEl.style.display = "none";
    resultEl.style.display = "none";

    const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    bsModal.show();

    const submitBtn = el("btn-submit-user");
    const newSubmitBtn = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
    newSubmitBtn.addEventListener("click", submitAddUser);
  }

  function submitAddUser() {
    const email = el("new-user-email").value.trim();
    const role = el("new-user-role").value.trim();
    const errorEl = el("add-user-error");
    const resultEl = el("add-user-result");
    const submitBtn = el("btn-submit-user");

    errorEl.style.display = "none";
    resultEl.style.display = "none";

    if (!email || !role) {
      errorEl.textContent = "Email and Role are required";
      errorEl.style.display = "";
      return;
    }

    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Creating...";

    apiCall("admin/createUser", { email, role }).then((res) => {
      submitBtn.disabled = false;

      if (!res?.ok) {
        submitBtn.textContent = originalText;
        errorEl.textContent = res?.message || "Create failed";
        errorEl.style.display = "";
        return;
      }

      resultEl.innerHTML = `<strong>User created!</strong><br>Temporary password: <code style="user-select: all; background: #f0f0f0; padding: 2px 6px; border-radius: 3px;">${res.tempPassword}</code><br><small class="text-muted">Copy this password and send it to the user. They will be asked to change it on first login.</small>`;
      resultEl.style.display = "";

      submitBtn.textContent = "Done";
      submitBtn.onclick = () => {
        const bsModal = bootstrap.Modal.getInstance(el("addUserModal"));
        if (bsModal) bsModal.hide();
        renderAdmin();
      };
    });
  }

  function openProfileModal() {
    const modalEl = el("profileModal");
    const modalBody = el("profile-modal-body");
    const saveBtn = el("btn-save-profile-modal");

    modalBody.innerHTML = '<div class="text-muted">Loading profile...</div>';
    saveBtn.style.display = "none";

    const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    bsModal.show();

    Promise.all([apiCall("profile/get"), apiCall("profile/getOptions")]).then(
      ([res, optionsRes]) => {
        if (!res?.ok) {
          modalBody.innerHTML = `<div class="text-danger">Error loading profile: ${
            res?.message || "Unknown error"
          }</div>`;
          return;
        }

        const profile = res.profile || {};
        const options = optionsRes?.ok
          ? optionsRes.options
          : { networks: [], facilities: [], supervisors: [] };

        const escapeHtml = (text) => {
          const div = document.createElement("div");
          div.textContent = text;
          return div.innerHTML;
        };

        const renderModalField = (name, value) => {
          const label = name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

          if (name === "network_id") {
            const opts = options.networks
              .map(
                (o) =>
                  `<option value="${o.value}" ${o.value == value ? "selected" : ""}>${escapeHtml(
                    o.label
                  )}</option>`
              )
              .join("");
            return `<div class="mb-2"><label class="form-label">${label}</label><select class="form-select form-select-sm" id="prof-modal-${name}"><option value="">Select Network</option>${opts}</select></div>`;
          }

          if (name === "facility_id") {
            const opts = options.facilities
              .map(
                (o) =>
                  `<option value="${escapeHtml(o.value)}" ${
                    o.value == value ? "selected" : ""
                  }>${escapeHtml(o.label)}</option>`
              )
              .join("");
            return `<div class="mb-2"><label class="form-label">${label}</label><select class="form-select form-select-sm" id="prof-modal-${name}"><option value="">Select Facility</option>${opts}</select></div>`;
          }

          if (name === "supervisor_id") {
            const opts = options.supervisors
              .map(
                (o) =>
                  `<option value="${o.value}" ${o.value == value ? "selected" : ""}>${escapeHtml(
                    o.label
                  )}</option>`
              )
              .join("");
            return `<div class="mb-2"><label class="form-label">${label}</label><select class="form-select form-select-sm" id="prof-modal-${name}"><option value="">Select Supervisor</option>${opts}</select></div>`;
          }

          if (name === "gender") {
            return `<div class="mb-2"><label class="form-label">${label}</label><select class="form-select form-select-sm" id="prof-modal-${name}">
            <option value="">Select Gender</option>
            <option value="male" ${value === "male" ? "selected" : ""}>Male</option>
            <option value="female" ${value === "female" ? "selected" : ""}>Female</option>
          </select></div>`;
          }

          if (name === "dob") {
            return `<div class="mb-2"><label class="form-label">${label}</label><input type="date" class="form-control form-control-sm" id="prof-modal-${name}" value="${escapeHtml(
              String(value || "")
            )}"></div>`;
          }

          if (name === "comments") {
            return `<div class="mb-2"><label class="form-label">${label}</label><textarea class="form-control form-control-sm" id="prof-modal-${name}" rows="2">${escapeHtml(
              String(value || "")
            )}</textarea></div>`;
          }

          return `<div class="mb-2"><label class="form-label">${label}</label><input class="form-control form-control-sm" id="prof-modal-${name}" value="${escapeHtml(
            String(value || "")
          )}"></div>`;
        };

        const fields = [
          "employee_id",
          "national_id",
          "dob",
          "gender",
          "job_title",
          "specialty",
          "network_id",
          "supervisor_id",
          "fullname_ar",
          "fullname_en",
          "facility_id",
          "phone",
          "address",
          "comments",
        ];

        const isIncomplete = fields.some((f) => !profile[f]);
        const warningMsg = isIncomplete
          ? '<div class="alert alert-warning mb-3 small">Please complete your profile information.</div>'
          : "";

        const form = fields.map((name) => renderModalField(name, profile[name])).join("");

        const passwordSection = `
          <hr class="my-3">
          <h6 class="mb-3">Change Password</h6>
          <div class="mb-2">
            <label class="form-label">Current Password</label>
            <input type="password" class="form-control form-control-sm" id="modal-current-password" placeholder="Required to change password">
          </div>
          <div class="mb-2">
            <label class="form-label">New Password</label>
            <input type="password" class="form-control form-control-sm" id="modal-new-password" placeholder="Leave blank to keep current">
          </div>
          <div class="mb-2">
            <label class="form-label">Confirm New Password</label>
            <input type="password" class="form-control form-control-sm" id="modal-confirm-password" placeholder="Leave blank to keep current">
          </div>
        `;

        modalBody.innerHTML =
          warningMsg +
          form +
          passwordSection +
          '<div class="text-danger small mt-2" id="profile-modal-error" style="display:none"></div>';
        saveBtn.style.display = "";

        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        newSaveBtn.addEventListener("click", () => {
          const data = {};
          fields.forEach((n) => {
            const input = document.getElementById(`prof-modal-${n}`);
            if (input) data[n] = input.value || "";
          });

          const errorEl = document.getElementById("profile-modal-error");
          errorEl.style.display = "none";

          // Check password fields
          const currentPassword = document.getElementById("modal-current-password")?.value || "";
          const newPassword = document.getElementById("modal-new-password")?.value || "";
          const confirmPassword = document.getElementById("modal-confirm-password")?.value || "";

          if (newPassword || confirmPassword || currentPassword) {
            if (!currentPassword) {
              errorEl.textContent = "Current password is required to change password";
              errorEl.style.display = "";
              return;
            }
            if (!newPassword) {
              errorEl.textContent = "New password is required";
              errorEl.style.display = "";
              return;
            }
            if (newPassword !== confirmPassword) {
              errorEl.textContent = "Passwords do not match";
              errorEl.style.display = "";
              return;
            }
            if (newPassword.length < 4) {
              errorEl.textContent = "Password must be at least 4 characters";
              errorEl.style.display = "";
              return;
            }
          }

          const originalText = newSaveBtn.textContent;
          newSaveBtn.disabled = true;
          newSaveBtn.textContent = "Saving...";

          // Save profile first
          apiCall("profile/upsert", { data }).then((saveRes) => {
            if (!saveRes?.ok) {
              newSaveBtn.disabled = false;
              newSaveBtn.textContent = originalText;
              const errorMsg = saveRes?.message || "Save failed";
              const errorDetail = saveRes?.error ? ` - ${saveRes.error}` : "";
              const errorDbDetail = saveRes?.detail ? ` (${saveRes.detail})` : "";
              errorEl.textContent = errorMsg + errorDetail + errorDbDetail;
              errorEl.style.display = "";
              console.error("Profile save error:", saveRes);
              return;
            }

            // If password change requested, handle it
            if (newPassword && currentPassword) {
              apiCall("auth/change-password", { currentPassword, newPassword }).then((pwRes) => {
                newSaveBtn.disabled = false;
                newSaveBtn.textContent = originalText;

                if (!pwRes?.ok) {
                  errorEl.textContent = `Profile saved, but password change failed: ${
                    pwRes?.message || "Unknown error"
                  }`;
                  errorEl.style.display = "";
                  return;
                }

                const successMsg = document.createElement("div");
                successMsg.className = "alert alert-success mt-2 small";
                successMsg.textContent = "Profile and password updated successfully!";
                modalBody.appendChild(successMsg);

                // Refresh navbar to show updated info
                buildNav();

                setTimeout(() => {
                  const modal = bootstrap.Modal.getInstance(modalEl);
                  if (modal) modal.hide();
                }, 1000);
              });
            } else {
              newSaveBtn.disabled = false;
              newSaveBtn.textContent = originalText;

              const successMsg = document.createElement("div");
              successMsg.className = "alert alert-success mt-2 small";
              successMsg.textContent = "Profile saved successfully!";
              modalBody.appendChild(successMsg);

              // Refresh navbar to show updated info
              buildNav();

              setTimeout(() => {
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
              }, 1000);
            }
          });
        });
      }
    );
  }

  function renderDashboardCards(rows, tableName) {
    if (tableName !== "Issues" && tableName !== "Orders") return "";

    const totalCount = rows.length;
    let statusCounts = {};

    rows.forEach((row) => {
      const status = row.status || row.Status || "Unknown";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const statusCards = Object.entries(statusCounts)
      .map(([status, count]) => {
        const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
        return `
          <div class="col-md-3 col-sm-6 mb-3">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-body">
                <h6 class="text-muted text-uppercase small mb-2">${status}</h6>
                <div class="h3 mb-0">${count}</div>
                <small class="text-muted">${percentage}% of total</small>
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    return `
      <div class="row mb-4">
        <div class="col-md-3 col-sm-6 mb-3">
          <div class="card border-0 shadow-sm h-100 bg-primary text-white">
            <div class="card-body">
              <h6 class="text-uppercase small mb-2 opacity-75">Total ${tableName}</h6>
              <div class="h3 mb-0">${totalCount}</div>
              <small class="opacity-75">All records</small>
            </div>
          </div>
        </div>
        ${statusCards}
      </div>
    `;
  }

  function renderTable(data) {
    const root = el("page-content");
    if (!data || !data.ok) {
      const errorMsg = data?.message || "Error loading data";
      root.innerHTML = `<div class="text-danger">${errorMsg}</div>`;
      return;
    }

    const allCols = data.columns || [];
    const rows = data.rows || [];
    const cols = allCols.filter((c) => c !== "order_id" && c !== "issue_id");

    const dashboardCards = renderDashboardCards(rows, state.currentPage);

    const addBtn = `<button class="btn btn-sm btn-primary" id="btn-add-record">Add</button>`;
    const table = [
      dashboardCards,
      `<div class="d-flex justify-content-between align-items-center mb-2"><div></div>${addBtn}</div>`,
      '<div class="table-responsive"><table class="table table-striped table-sm table-hover">',
      "<thead><tr>",
      ...cols.map((c) => `<th>${c}</th>`),
      "</tr></thead><tbody>",
      ...rows.map(
        (r, idx) =>
          `<tr data-row-index="${idx}" style="cursor: pointer;">${cols
            .map((c) => `<td>${r[c] ?? ""}</td>`)
            .join("")}</tr>`
      ),
      "</tbody></table></div>",
    ].join("");

    root.innerHTML = table;

    el("btn-add-record")?.addEventListener("click", () => openCreateForm());

    root.querySelectorAll("tbody tr").forEach((tr, idx) => {
      tr.addEventListener("click", () => openRowDetail(rows[idx], allCols));
    });
  }

  function openRowDetail(row, cols) {
    const modalEl = el("detailModal");
    const label = el("detailModalLabel");
    const content = el("detail-content");

    label.textContent = `${state.currentPage} Details`;

    const escapeHtml = (text) => {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    };

    const detailHtml = cols
      .map((col) => {
        const value = row[col] ?? "";
        return `
        <div class="row mb-2">
          <div class="col-4 fw-bold text-end">${escapeHtml(col)}:</div>
          <div class="col-8">${escapeHtml(String(value))}</div>
        </div>
      `;
      })
      .join("");

    const isCommentable = state.currentPage === "Issues" || state.currentPage === "Orders";
    const recordIdField = state.currentPage === "Issues" ? "issue_id" : "order_id";
    const recordId = row[recordIdField];

    let commentsSection = "";
    if (isCommentable && recordId) {
      commentsSection = `
        <hr class="my-4">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h6 class="mb-0">Comments</h6>
          <button class="btn btn-sm btn-outline-secondary" id="btn-load-comments">Show Comments</button>
        </div>
        <div id="comments-list" class="mb-3" style="display:none;">
          <div class="text-muted small">Loading comments...</div>
        </div>
        <div class="input-group" id="comment-form" style="display:none;">
          <textarea class="form-control" id="new-comment" rows="2" placeholder="Add a comment..."></textarea>
          <button class="btn btn-primary" type="button" id="btn-add-comment">Add</button>
        </div>
      `;
    }

    content.innerHTML = detailHtml + commentsSection;

    const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    bsModal.show();

    if (isCommentable && recordId) {
      let commentsLoaded = false;
      const loadBtn = el("btn-load-comments");
      const commentsList = el("comments-list");
      const commentForm = el("comment-form");

      if (loadBtn) {
        loadBtn.addEventListener("click", () => {
          if (!commentsLoaded) {
            loadBtn.disabled = true;
            loadBtn.textContent = "Loading...";
            commentsList.style.display = "block";
            commentForm.style.display = "flex";
            loadComments(state.currentPage, recordId);
            commentsLoaded = true;
            loadBtn.style.display = "none";
          }
        });
      }

      el("btn-add-comment")?.addEventListener("click", () => {
        addComment(state.currentPage, recordId);
      });
    }
  }

  function loadComments(table, recordId) {
    const commentsList = el("comments-list");
    if (!commentsList) return;

    showLoading();
    apiCall("comments/list", { table, recordId }).then((res) => {
      hideLoading();
      if (!res?.ok) {
        commentsList.innerHTML = '<div class="text-danger small">Failed to load comments</div>';
        return;
      }

      const comments = res.comments || [];
      if (comments.length === 0) {
        commentsList.innerHTML = '<div class="text-muted small">No comments yet</div>';
        return;
      }

      const escapeHtml = (text) => {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
      };

      const commentsHtml = comments
        .map((c) => {
          return `
          <div class="card mb-2">
            <div class="card-body p-2">
              <div class="small text-muted mb-1">
                <strong>${escapeHtml(c.created_by || "Unknown")}</strong> • ${escapeHtml(
            c.created_at || ""
          )}
              </div>
              <div>${escapeHtml(c.comment || "")}</div>
            </div>
          </div>
        `;
        })
        .join("");

      commentsList.innerHTML = commentsHtml;
    });
  }

  function addComment(table, recordId) {
    const textarea = el("new-comment");
    if (!textarea) return;

    const comment = textarea.value.trim();
    if (!comment) {
      alert("Please enter a comment");
      return;
    }

    showLoading();
    apiCall("comments/add", { table, recordId, comment }).then((res) => {
      hideLoading();
      if (!res?.ok) {
        alert(res?.message || "Failed to add comment");
        return;
      }

      textarea.value = "";
      loadComments(table, recordId);
    });
  }

  function openCreateForm() {
    const modalEl = el("formModal");
    const label = el("formModalLabel");
    const form = el("generic-form");
    label.textContent = `Create ${state.currentPage}`;

    showLoading();
    apiCall("formMeta", { table: state.currentPage }).then((res) => {
      hideLoading();
      if (!res?.ok) {
        alert(res?.message || "Failed to load form");
        return;
      }

      form.innerHTML = res.fields.map(renderField).join("");

      const saveBtn = el("btn-save-form");
      saveBtn.onclick = () => submitCreate(res.fields);

      const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
      bsModal.show();
    });
  }

  function renderField(f) {
    if (f.readonly) return "";
    if (f.type === "select") {
      return `<div class="mb-3"><label class="form-label">${
        f.label
      }</label><select class="form-select" data-field="${f.name}">${(f.options || [])
        .map((o) => `<option value="${o.value}">${o.label}</option>`)
        .join("")}</select></div>`;
    }
    return `<div class="mb-3"><label class="form-label">${
      f.label
    }</label><input class="form-control" data-field="${f.name}" type="${
      f.inputType || "text"
    }" /></div>`;
  }

  function submitCreate(fields) {
    const data = {};
    fields.forEach((f) => {
      const el = document.querySelector(`[data-field="${f.name}"]`);
      if (el) data[f.name] = el.value;
    });

    const saveBtn = el("btn-save-form");
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = "Creating...";

    apiCall("create", { table: state.currentPage, data }).then((res) => {
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;

      if (!res?.ok) {
        alert(res?.message || "Create failed");
        return;
      }

      const bsModal = bootstrap.Modal.getInstance(el("formModal"));
      if (bsModal) bsModal.hide();

      refreshCurrentTable();
    });
  }

  function refreshCurrentTable() {
    const pageContent = el("page-content");
    if (!pageContent) return;

    pageContent.innerHTML = '<div class="text-muted">Refreshing...</div>';

    apiCall("list", { table: state.currentPage, page: 1, pageSize: 25, filters: {} }).then(
      (res) => {
        renderTable(res);
      }
    );
  }

  function showLogin() {
    hideLoading();
    const viewLogin = el("view-login");
    const viewDashboard = el("view-dashboard");
    const passwordSetupView = el("view-password-setup");
    const waitingView = el("view-waiting-approval");
    const btnLogout = el("btn-logout");
    const navPages = el("nav-pages");
    const navUser = el("nav-user");

    if (viewLogin) viewLogin.style.display = "";
    if (viewDashboard) viewDashboard.style.display = "none";
    if (passwordSetupView) passwordSetupView.style.display = "none";
    if (waitingView) waitingView.style.display = "none";
    if (btnLogout) btnLogout.style.display = "none";
    if (navPages) navPages.innerHTML = "";
    if (navUser) navUser.textContent = "";
  }

  function showDashboard() {
    const loginView = el("view-login");
    const dashboardView = el("view-dashboard");
    const passwordSetupView = el("view-password-setup");
    const waitingView = el("view-waiting-approval");

    if (!loginView || !dashboardView) {
      console.error("Critical elements missing");
      return false;
    }

    loginView.style.display = "none";
    if (passwordSetupView) passwordSetupView.style.display = "none";
    if (waitingView) waitingView.style.display = "none";
    dashboardView.style.display = "block";
    return true;
  }

  function showPasswordSetup() {
    hideLoading();
    const loginView = el("view-login");
    const dashboardView = el("view-dashboard");
    const passwordSetupView = el("view-password-setup");
    const waitingView = el("view-waiting-approval");

    if (loginView) loginView.style.display = "none";
    if (dashboardView) dashboardView.style.display = "none";
    if (waitingView) waitingView.style.display = "none";
    if (passwordSetupView) passwordSetupView.style.display = "block";
  }

  function showWaitingApproval() {
    hideLoading();
    const loginView = el("view-login");
    const dashboardView = el("view-dashboard");
    const passwordSetupView = el("view-password-setup");
    const waitingView = el("view-waiting-approval");

    if (loginView) loginView.style.display = "none";
    if (dashboardView) dashboardView.style.display = "none";
    if (passwordSetupView) passwordSetupView.style.display = "none";
    if (waitingView) waitingView.style.display = "block";
  }

  function bindPasswordSetup() {
    const form = el("password-setup-form");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const newPassword = el("new-password").value;
      const confirmPassword = el("confirm-password").value;
      const errorEl = el("password-setup-error");

      if (errorEl) errorEl.style.display = "none";

      if (newPassword !== confirmPassword) {
        if (errorEl) {
          errorEl.textContent = "Passwords do not match";
          errorEl.style.display = "";
        }
        return;
      }

      if (newPassword.length < 4) {
        if (errorEl) {
          errorEl.textContent = "Password must be at least 4 characters";
          errorEl.style.display = "";
        }
        return;
      }

      showLoading();
      apiCall("user/setInitialPassword", { newPassword }).then((res) => {
        hideLoading();
        if (!res?.ok) {
          if (errorEl) {
            errorEl.textContent = res?.message || "Password setup failed";
            errorEl.style.display = "";
          }
          return;
        }

        showWaitingApproval();
      });
    });
  }

  function bindBackToLogin() {
    const btn = el("btn-back-to-login");
    if (!btn) return;

    btn.addEventListener("click", function () {
      clearTokens();
      state.user = null;
      state.pages = [];
      state.currentPage = null;
      showLogin();
    });
  }

  function bindSidebarToggle() {
    const btn = el("btn-toggle-sidebar");
    const sidebar = el("sidebar");
    const mainContent = el("main-content");

    if (!btn) return;

    btn.addEventListener("click", function () {
      if (sidebar) sidebar.classList.toggle("collapsed");
      if (mainContent) mainContent.classList.toggle("expanded");
    });
  }

  window.addEventListener("load", init);
})();
