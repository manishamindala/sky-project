/* ============================================================
   NEXORA ADMIN PORTAL — admin.js
   Full backend integration + UI logic
   ============================================================ */

const API_BASE = 'http://localhost:5000/api';

// ── Low-level fetch ──────────────────────────────────────────
async function apiFetch(method, path, body = null) {
    const opts = {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);
    try {
        const res = await fetch(API_BASE + path, opts);
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, status: res.status, data };
    } catch (err) {
        return { ok: false, status: 0, data: { error: 'Network error. Is the server running?' } };
    }
}

// ── Captcha ──────────────────────────────────────────────────
const captchas = { login: '', signup: '', forgot: '' };
function generateCaptcha(type) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let code = '';
    for (let i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    captchas[type] = code;
    document.getElementById(type + 'CaptchaText').textContent = code;
}
generateCaptcha('login');
generateCaptcha('signup');
generateCaptcha('forgot');

// ── Page navigation ──────────────────────────────────────────
function showPage(pageId) {
    document.querySelectorAll('.form-page').forEach(p => p.classList.remove('active'));
    setTimeout(() => document.getElementById(pageId).classList.add('active'), 50);
    document.querySelectorAll('.error-msg').forEach(e => e.classList.remove('show'));
    document.querySelectorAll('input').forEach(i => i.classList.remove('error'));
}

function togglePass(inputId, btn) {
    const input = document.getElementById(inputId);
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    btn.innerHTML = isPass
        ? '<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
        : '<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
}

// ── Helpers ──────────────────────────────────────────────────
function showError(id, msg) {
    const el = document.getElementById(id);
    if (msg) el.querySelector('span').textContent = msg;
    el.classList.add('show');
}
function clearAllErrors(formId) {
    document.querySelectorAll('#' + formId + ' .error-msg').forEach(e => e.classList.remove('show'));
    document.querySelectorAll('#' + formId + ' input').forEach(i => i.classList.remove('error'));
}
function shakeForm(formId) {
    const form = document.getElementById(formId);
    form.classList.add('shake');
    setTimeout(() => form.classList.remove('shake'), 400);
}
function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function showToast(msg, isError = false) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    toast.style.background = isError ? '#EF4444' : '#F97316';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
}
function checkStrength(val) {
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    const labels = ['', 'Weak', 'Medium', 'Strong', 'Very Strong'];
    const classes = ['', 'weak', 'medium', 'strong', 'very-strong'];
    for (let i = 1; i <= 4; i++) {
        const bar = document.getElementById('str' + i);
        bar.className = 'strength-bar';
        if (i <= score) bar.classList.add(classes[score]);
    }
    document.getElementById('strengthLabel').textContent = val.length > 0 ? labels[score] : '';
}
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Dashboard ────────────────────────────────────────────────
function showDashboard(adminName) {
    document.getElementById('authWrapper').style.display = 'none';
    document.getElementById('dashboardWrapper').classList.add('active');
    document.body.style.alignItems = 'stretch';

    const displayName = adminName || 'Admin';
    document.getElementById('dashName').textContent = displayName;
    document.getElementById('dashAvatar').textContent = displayName.substring(0, 2).toUpperCase();

    if (window.innerWidth <= 768) {
        document.getElementById('menuToggle').style.display = 'flex';
    }
    loadOpportunities();
}

async function handleLogout() {
    await apiFetch('POST', '/auth/logout');
    document.getElementById('dashboardWrapper').classList.remove('active');
    document.getElementById('authWrapper').style.display = 'flex';
    document.body.style.alignItems = '';
    showToast('Signed out successfully');
    showPage('loginPage');
    generateCaptcha('login');
}

// ── Check session on page load ───────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
    const result = await apiFetch('GET', '/auth/me');
    if (result.ok) {
        showDashboard(result.data.admin.full_name);
    }
});

// ── Nav items ────────────────────────────────────────────────
document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', function () {
        const page = this.getAttribute('data-page');
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
        const map = {
            dashboard: ['dashboardSection', 'Dashboard'],
            learner: ['learnerSection', 'Learner Management'],
            verifier: ['verifierSection', 'Verifier Management'],
            collaborator: ['collaboratorSection', 'Collaborator Management'],
            opportunity: ['opportunitySection', 'Opportunity Management'],
            reports: ['reportsSection', 'Reports and Analytics'],
        };
        if (map[page]) {
            document.getElementById(map[page][0]).classList.add('active');
            document.getElementById('pageTitle').textContent = map[page][1];
        }
        if (page === 'opportunity') loadOpportunities();
    });
});

// ── Chart tabs ───────────────────────────────────────────────
function changeChartPeriod(period) {
    document.querySelectorAll('.tabs .tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase() === period);
    });
    const chartData = {
        daily: 'M0,120 Q50,110 100,90 T200,70 T300,50 T400,40',
        weekly: 'M0,110 Q50,95 100,85 T200,65 T300,45 T400,35',
        monthly: 'M0,100 Q50,85 100,75 T200,55 T300,40 T400,30',
        quarterly: 'M0,90 Q50,75 100,65 T200,50 T300,35 T400,25',
        yearly: 'M0,80 Q50,65 100,55 T200,40 T300,30 T400,20',
    };
    const path = chartData[period];
    document.getElementById('linePath').setAttribute('d', path);
    document.getElementById('lineArea').setAttribute('d', path + ' L400,150 L0,150 Z');
}

// ── Notifications ────────────────────────────────────────────
function toggleNotifications() {
    document.getElementById('notificationDropdown').classList.toggle('active');
}
function markAllRead() {
    document.querySelectorAll('.notif-item.unread').forEach(i => i.classList.remove('unread'));
    document.querySelector('.notif-badge').textContent = '0';
    showToast('All notifications marked as read');
}
document.addEventListener('click', function (e) {
    const dropdown = document.getElementById('notificationDropdown');
    const btn = document.getElementById('notifBtn');
    if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});

// ── Theme ────────────────────────────────────────────────────
function toggleTheme() {
    const html = document.documentElement;
    const newTheme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    const icon = document.getElementById('themeIcon');
    icon.innerHTML = newTheme === 'dark'
        ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
        : '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>';
}

// ── Search ───────────────────────────────────────────────────
function openSearch() {
    document.getElementById('searchContainer').classList.add('active');
    document.getElementById('searchInput').focus();
}
function closeSearch() { document.getElementById('searchContainer').classList.remove('active'); }
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeSearch(); closeCourseModal(); closeOpportunityModal();
        closeOpportunityDetailsModal(); closeCollaboratorCoursesModal();
        closeQuickAddModal(); closeBulkUploadModal();
        closeQuickAddVerifierModal(); closeBulkUploadVerifierModal();
        closeVerifierDetailsModal();
    }
});
document.getElementById('searchContainer').addEventListener('click', function (e) {
    if (e.target === this) closeSearch();
});

// ── LOGIN ────────────────────────────────────────────────────
document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    clearAllErrors('loginForm');
    let valid = true;

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const captchaInput = document.getElementById('loginCaptchaInput').value.trim();
    const rememberMe = document.querySelector('#loginForm .remember-me input').checked;

    if (!email || !isValidEmail(email)) {
        showError('loginEmailErr', 'Please enter a valid email address');
        document.getElementById('loginEmail').classList.add('error'); valid = false;
    }
    if (!password) {
        showError('loginPasswordErr', 'Please enter your password');
        document.getElementById('loginPassword').classList.add('error'); valid = false;
    }
    if (!captchaInput) {
        showError('loginCaptchaErr', 'Please enter the captcha code'); valid = false;
    } else if (captchaInput !== captchas.login) {
        showError('loginCaptchaErr', 'Captcha does not match. Please try again.');
        valid = false; generateCaptcha('login');
    }
    if (!valid) { shakeForm('loginForm'); return; }

    const btn = this.querySelector('.btn-primary');
    btn.textContent = 'Signing in...'; btn.disabled = true;

    const result = await apiFetch('POST', '/auth/login', { email, password, remember_me: rememberMe });

    btn.textContent = 'Sign In'; btn.disabled = false;

    if (result.ok) {
        showToast('Login successful! Welcome back.');
        generateCaptcha('login');
        setTimeout(() => showDashboard(result.data.admin.full_name), 800);
    } else {
        showError('loginPasswordErr', result.data.error || 'Invalid email or password');
        shakeForm('loginForm');
        generateCaptcha('login');
    }
});

// ── SIGNUP ───────────────────────────────────────────────────
document.getElementById('signupForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    clearAllErrors('signupForm');
    let valid = true;

    const full_name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirm_password = document.getElementById('signupConfirmPassword').value;
    const captchaInput = document.getElementById('signupCaptchaInput').value.trim();

    if (!full_name) { showError('signupNameErr', 'Please enter your full name'); document.getElementById('signupName').classList.add('error'); valid = false; }
    if (!email || !isValidEmail(email)) { showError('signupEmailErr', 'Please enter a valid email address'); document.getElementById('signupEmail').classList.add('error'); valid = false; }
    if (!password || password.length < 8) { showError('signupPasswordErr', 'Password must be at least 8 characters'); document.getElementById('signupPassword').classList.add('error'); valid = false; }
    if (!confirm_password || password !== confirm_password) { showError('signupConfirmPasswordErr', 'Passwords do not match'); document.getElementById('signupConfirmPassword').classList.add('error'); valid = false; }
    if (!captchaInput) { showError('signupCaptchaErr', 'Please enter the captcha code'); valid = false; }
    else if (captchaInput !== captchas.signup) { showError('signupCaptchaErr', 'Captcha does not match.'); valid = false; generateCaptcha('signup'); }

    if (!valid) { shakeForm('signupForm'); return; }

    const btn = this.querySelector('.btn-primary');
    btn.textContent = 'Creating account...'; btn.disabled = true;

    const result = await apiFetch('POST', '/auth/signup', { full_name, email, password, confirm_password });

    btn.textContent = 'Create Account'; btn.disabled = false;

    if (result.ok) {
        showToast('Account created successfully! Please sign in.');
        generateCaptcha('signup');
        this.reset(); checkStrength('');
        setTimeout(() => showPage('loginPage'), 1500);
    } else {
        const msg = result.data.error || 'Signup failed. Please try again.';
        if (msg.toLowerCase().includes('email')) {
            showError('signupEmailErr', msg);
            document.getElementById('signupEmail').classList.add('error');
        } else {
            showToast(msg, true);
        }
        shakeForm('signupForm');
    }
});

// ── FORGOT PASSWORD ──────────────────────────────────────────
document.getElementById('forgotForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    clearAllErrors('forgotForm');
    let valid = true;

    const email = document.getElementById('forgotEmail').value.trim();
    const captchaInput = document.getElementById('forgotCaptchaInput').value.trim();

    if (!email || !isValidEmail(email)) { showError('forgotEmailErr', 'Please enter a valid email address'); document.getElementById('forgotEmail').classList.add('error'); valid = false; }
    if (!captchaInput) { showError('forgotCaptchaErr', 'Please enter the captcha code'); valid = false; }
    else if (captchaInput !== captchas.forgot) { showError('forgotCaptchaErr', 'Captcha does not match.'); valid = false; generateCaptcha('forgot'); }

    if (!valid) { shakeForm('forgotForm'); return; }

    const btn = this.querySelector('.btn-primary');
    btn.textContent = 'Sending...'; btn.disabled = true;

    await apiFetch('POST', '/auth/forgot-password', { email });

    btn.textContent = 'Send Reset Link'; btn.disabled = false;
    // Always show success for privacy
    showToast('If that email is registered, a reset link has been sent.');
    generateCaptcha('forgot');
    this.reset();
});

// ── OPPORTUNITIES ─────────────────────────────────────────────

let editingOpportunityId = null;

async function loadOpportunities() {
    const grid = document.querySelector('.opportunities-grid');
    if (!grid) return;
    grid.innerHTML = '<p style="color:var(--qf-text-muted);padding:20px;">Loading...</p>';

    const result = await apiFetch('GET', '/opportunities');
    if (!result.ok) {
        grid.innerHTML = '<p style="color:var(--qf-danger);padding:20px;">Failed to load opportunities.</p>';
        return;
    }

    const opps = result.data.opportunities;
    grid.innerHTML = '';

    if (opps.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1">
                <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <h4>No opportunities yet</h4>
                <p>Click "Add New Opportunity" to create your first one.</p>
            </div>`;
        return;
    }

    opps.forEach(opp => grid.appendChild(buildOpportunityCard(opp)));
}

function buildOpportunityCard(opp) {
    const skills = opp.skills.split(',').map(s => s.trim()).filter(Boolean);
    const card = document.createElement('div');
    card.className = 'opportunity-card';
    card.dataset.id = opp.id;

    card.innerHTML = `
        <div class="opportunity-card-header">
            <h5>${escapeHtml(opp.name)}</h5>
            <div class="opportunity-meta">
                <span><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${escapeHtml(opp.duration)}</span>
                <span><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${escapeHtml(opp.start_date)}</span>
            </div>
        </div>
        <p class="opportunity-description">${escapeHtml(opp.description)}</p>
        <div class="opportunity-skills">
            <div class="opportunity-skills-label">Skills You'll Gain</div>
            <div class="skills-tags">${skills.map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join('')}</div>
        </div>
        <div class="opportunity-footer">
            <span class="applicants-count">${opp.max_applicants ? opp.max_applicants + ' max applicants' : 'Open applications'}</span>
            <div class="opp-actions">
                <button class="view-course-btn" style="width:auto;padding:7px 13px;" onclick="openOpportunityDetails_db('${opp.id}')">View</button>
                <button class="view-course-btn" style="width:auto;padding:7px 13px;border-color:var(--qf-info);color:var(--qf-info);" onclick="openEditOpportunity('${opp.id}')">Edit</button>
                <button class="view-course-btn" style="width:auto;padding:7px 13px;border-color:var(--qf-danger);color:var(--qf-danger);" onclick="confirmDeleteOpportunity('${opp.id}')">Delete</button>
            </div>
        </div>`;
    return card;
}

async function openOpportunityDetails_db(id) {
    const result = await apiFetch('GET', '/opportunities/' + id);
    if (!result.ok) { showToast('Failed to load details.', true); return; }
    const opp = result.data.opportunity;
    const skills = opp.skills.split(',').map(s => s.trim()).filter(Boolean);
    openOpportunityDetails(opp.name, {
        duration: opp.duration,
        startDate: opp.start_date,
        description: opp.description,
        skills,
        applicants: opp.max_applicants || 'Open',
        futureOpportunities: opp.future_opportunities,
        prerequisites: opp.category,
    });
}

async function openEditOpportunity(id) {
    const result = await apiFetch('GET', '/opportunities/' + id);
    if (!result.ok) { showToast('Failed to load opportunity.', true); return; }
    const opp = result.data.opportunity;

    editingOpportunityId = id;
    document.querySelector('#opportunityModal .modal-header h3').textContent = 'Edit Opportunity';
    document.querySelector('#opportunityForm .btn-primary').textContent = 'Save Changes';

    document.getElementById('oppName').value = opp.name;
    document.getElementById('oppDuration').value = opp.duration;
    document.getElementById('oppStartDate').value = opp.start_date;
    document.getElementById('oppDescription').value = opp.description;
    document.getElementById('oppSkills').value = opp.skills;
    document.getElementById('oppFuture').value = opp.future_opportunities;
    document.getElementById('oppMaxApplicants').value = opp.max_applicants || '';

    // Set category
    const catSelect = document.getElementById('oppCategory');
    const catMap = { 'Technology': 'technology', 'Business': 'business', 'Design': 'design', 'Marketing': 'marketing', 'Data Science': 'data', 'Other': 'other' };
    catSelect.value = catMap[opp.category] || '';

    openOpportunityModal();
}

async function confirmDeleteOpportunity(id) {
    const confirmed = confirm('Are you sure you want to delete this opportunity? This cannot be undone.');
    if (!confirmed) return;

    const result = await apiFetch('DELETE', '/opportunities/' + id);
    if (result.ok) {
        showToast('Opportunity deleted successfully.');
        const card = document.querySelector(`.opportunity-card[data-id="${id}"]`);
        if (card) card.remove();
        // Check if grid is now empty
        const grid = document.querySelector('.opportunities-grid');
        if (grid && grid.children.length === 0) loadOpportunities();
    } else {
        showToast(result.data.error || 'Failed to delete.', true);
    }
}

function openOpportunityModal() {
    document.getElementById('opportunityModal').classList.add('active');
}
function closeOpportunityModal() {
    document.getElementById('opportunityModal').classList.remove('active');
    document.getElementById('opportunityForm').reset();
    editingOpportunityId = null;
    document.querySelector('#opportunityModal .modal-header h3').textContent = 'Add New Opportunity';
    document.querySelector('#opportunityForm .btn-primary').textContent = 'Create Opportunity';
}
document.getElementById('opportunityModal').addEventListener('click', function (e) {
    if (e.target === this) closeOpportunityModal();
});

// Category value mapping
const catValueMap = { technology: 'Technology', business: 'Business', design: 'Design', marketing: 'Marketing', data: 'Data Science', other: 'Other' };

document.getElementById('opportunityForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const name = document.getElementById('oppName').value.trim();
    const duration = document.getElementById('oppDuration').value.trim();
    const start_date = document.getElementById('oppStartDate').value.trim();
    const description = document.getElementById('oppDescription').value.trim();
    const skills = document.getElementById('oppSkills').value.trim();
    const catRaw = document.getElementById('oppCategory').value;
    const category = catValueMap[catRaw] || '';
    const future_opportunities = document.getElementById('oppFuture').value.trim();
    const max_applicants = document.getElementById('oppMaxApplicants').value.trim() || null;

    if (!name || !duration || !start_date || !description || !skills || !category || !future_opportunities) {
        showToast('Please fill in all required fields.', true); return;
    }

    const btn = this.querySelector('.btn-primary');
    btn.disabled = true; btn.textContent = 'Saving...';

    const payload = { name, duration, start_date, description, skills, category, future_opportunities, max_applicants };

    let result;
    if (editingOpportunityId) {
        result = await apiFetch('PUT', '/opportunities/' + editingOpportunityId, payload);
    } else {
        result = await apiFetch('POST', '/opportunities', payload);
    }

    btn.disabled = false;
    btn.textContent = editingOpportunityId ? 'Save Changes' : 'Create Opportunity';

    if (result.ok) {
        showToast(editingOpportunityId ? 'Opportunity updated!' : 'Opportunity created!');
        closeOpportunityModal();
        loadOpportunities();
    } else {
        showToast(result.data.error || 'Failed to save opportunity.', true);
    }
});

// ── Opportunity details modal (static/view) ──────────────────
function openOpportunityDetails(title, details) {
    document.getElementById('opportunityDetailTitle').textContent = title;
    document.getElementById('opportunityDetailDuration').textContent = details.duration;
    document.getElementById('opportunityDetailStartDate').textContent = details.startDate;
    document.getElementById('opportunityDetailApplicants').textContent = details.applicants;
    document.getElementById('opportunityDetailDescription').textContent = details.description;
    document.getElementById('opportunityDetailFuture').textContent = details.futureOpportunities;
    document.getElementById('opportunityDetailPrereqs').textContent = details.prerequisites;

    const skillsContainer = document.getElementById('opportunityDetailSkills');
    skillsContainer.innerHTML = '';
    details.skills.forEach(skill => {
        const tag = document.createElement('span');
        tag.className = 'skill-tag';
        tag.textContent = skill;
        skillsContainer.appendChild(tag);
    });
    document.getElementById('opportunityDetailsModal').classList.add('active');
}
function closeOpportunityDetailsModal() { document.getElementById('opportunityDetailsModal').classList.remove('active'); }
document.getElementById('opportunityDetailsModal').addEventListener('click', function (e) { if (e.target === this) closeOpportunityDetailsModal(); });

// ── Course modal ─────────────────────────────────────────────
function openCourseDetails(courseName, stats) {
    document.getElementById('modalCourseTitle').textContent = courseName;
    document.getElementById('modalEnrolled').textContent = stats.enrolled;
    document.getElementById('modalCompleted').textContent = stats.completed;
    document.getElementById('modalInProgress').textContent = stats.inProgress;
    document.getElementById('modalHalfDone').textContent = stats.halfDone;
    document.getElementById('courseModal').classList.add('active');
}
function closeCourseModal() { document.getElementById('courseModal').classList.remove('active'); }
document.getElementById('courseModal').addEventListener('click', function (e) { if (e.target === this) closeCourseModal(); });

// ── Collaborator modal ───────────────────────────────────────
function openCollaboratorCourses(name, role) {
    document.getElementById('collaboratorName').textContent = name + "'s Submitted Courses";
    document.getElementById('collaboratorRole').textContent = 'Role: ' + role;
    document.getElementById('collaboratorCoursesModal').classList.add('active');
}
function closeCollaboratorCoursesModal() { document.getElementById('collaboratorCoursesModal').classList.remove('active'); }
document.getElementById('collaboratorCoursesModal').addEventListener('click', function (e) { if (e.target === this) closeCollaboratorCoursesModal(); });
function approveCourse(name) { showToast(name + ' has been approved!'); }
function rejectCourse(name) { showToast(name + ' has been rejected.'); }

// ── Student modals ───────────────────────────────────────────
function openQuickAddModal() { document.getElementById('quickAddModal').classList.add('active'); }
function closeQuickAddModal() { document.getElementById('quickAddModal').classList.remove('active'); }
document.getElementById('quickAddModal').addEventListener('click', function (e) { if (e.target === this) closeQuickAddModal(); });
document.getElementById('quickAddForm').addEventListener('submit', function (e) {
    e.preventDefault(); showToast('Student added successfully!'); closeQuickAddModal(); this.reset();
});

function openBulkUploadModal() { document.getElementById('bulkUploadModal').classList.add('active'); }
function closeBulkUploadModal() { document.getElementById('bulkUploadModal').classList.remove('active'); }
document.getElementById('bulkUploadModal').addEventListener('click', function (e) { if (e.target === this) closeBulkUploadModal(); });
document.getElementById('bulkUploadForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!document.getElementById('csvFileInput').files.length) { showToast('Please select a CSV file', true); return; }
    showToast('Students uploaded successfully!'); closeBulkUploadModal(); this.reset();
    document.getElementById('fileName').textContent = '';
});
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) document.getElementById('fileName').textContent = '✓ Selected: ' + file.name;
}
function downloadSampleCSV() {
    const csv = 'First Name,Last Name,Email\nJohn,Doe,john.doe@example.com';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'sample_students.csv'; a.click();
}

// ── Verifier modals ──────────────────────────────────────────
function openQuickAddVerifierModal() { document.getElementById('quickAddVerifierModal').classList.add('active'); }
function closeQuickAddVerifierModal() { document.getElementById('quickAddVerifierModal').classList.remove('active'); }
document.getElementById('quickAddVerifierModal').addEventListener('click', function (e) { if (e.target === this) closeQuickAddVerifierModal(); });
document.getElementById('quickAddVerifierForm').addEventListener('submit', function (e) {
    e.preventDefault(); showToast('Verifier added successfully!'); closeQuickAddVerifierModal(); this.reset();
});

function openBulkUploadVerifierModal() { document.getElementById('bulkUploadVerifierModal').classList.add('active'); }
function closeBulkUploadVerifierModal() { document.getElementById('bulkUploadVerifierModal').classList.remove('active'); }
document.getElementById('bulkUploadVerifierModal').addEventListener('click', function (e) { if (e.target === this) closeBulkUploadVerifierModal(); });
document.getElementById('bulkUploadVerifierForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!document.getElementById('csvVerifierFileInput').files.length) { showToast('Please select a CSV file', true); return; }
    showToast('Verifiers uploaded successfully!'); closeBulkUploadVerifierModal(); this.reset();
    document.getElementById('verifierFileName').textContent = '';
});
function handleVerifierFileSelect(event) {
    const file = event.target.files[0];
    if (file) document.getElementById('verifierFileName').textContent = '✓ Selected: ' + file.name;
}
function downloadSampleVerifierCSV() {
    const csv = 'First Name,Last Name,Email,Subject\nDr. John,Doe,john@example.com,Mathematics';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'sample_verifiers.csv'; a.click();
}

function openVerifierDetails(name, stats) {
    document.getElementById('verifierName').textContent = name;
    document.getElementById('verifierTotalStudents').textContent = stats.totalStudents;
    document.getElementById('verifierCertified').textContent = stats.certified;
    document.getElementById('verifierInProgress').textContent = stats.inProgress;
    const container = document.getElementById('subjectsContainer');
    container.innerHTML = '';
    stats.subjects.forEach(subject => {
        const div = document.createElement('div');
        div.className = 'subject-item';
        div.innerHTML = `<span class="subject-name">${subject.name}</span><span class="subject-students">${subject.students} students</span>`;
        container.appendChild(div);
    });
    document.getElementById('verifierDetailsModal').classList.add('active');
}
function closeVerifierDetailsModal() { document.getElementById('verifierDetailsModal').classList.remove('active'); }
document.getElementById('verifierDetailsModal').addEventListener('click', function (e) { if (e.target === this) closeVerifierDetailsModal(); });

// ── Filters ──────────────────────────────────────────────────
function filterStudents() {
    const status = document.getElementById('statusFilter').value;
    document.querySelectorAll('#studentsTableBody tr').forEach(row => {
        row.style.display = (status === 'all' || row.dataset.status === status) ? '' : 'none';
    });
}
function filterVerifiers() {
    const status = document.getElementById('verifierStatusFilter').value;
    document.querySelectorAll('#verifiersTableBody tr').forEach(row => {
        row.style.display = (status === 'all' || row.dataset.status === status) ? '' : 'none';
    });
}

// ── Clear errors on input ────────────────────────────────────
document.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', function () {
        this.classList.remove('error');
        const err = this.closest('.form-group')?.querySelector('.error-msg');
        if (err) err.classList.remove('show');
    });
});

// ── Responsive ───────────────────────────────────────────────
window.addEventListener('resize', () => {
    const toggle = document.getElementById('menuToggle');
    if (toggle) toggle.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
});
