/**
 * Qatar Foundation Admin Portal — API Client
 * ============================================
 * Drop this file into your Qatar/ folder and include it BEFORE your existing
 * main JS file in every HTML page:
 *   <script src="api.js"></script>
 *
 * It exposes a single global `API` object with methods for every backend call.
 * The existing UI only needs to call these methods instead of using hardcoded
 * data or localStorage.
 */

const API = (() => {
  const BASE = "http://localhost:5000/api"; // adjust if Flask runs on a different port

  // ── Low-level fetch wrapper ─────────────────────────────────────────────────

  async function request(method, path, body = null) {
    const opts = {
      method,
      credentials: "include", // sends the session cookie
      headers: { "Content-Type": "application/json" },
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${BASE}${path}`, opts);
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data: json };
  }

  // ── Auth ─────────────────────────────────────────────────────────────────────

  /**
   * Sign up a new admin.
   * @param {{full_name, email, password, confirm_password}} fields
   * @returns {Promise<{ok, status, data}>}
   */
  async function signup(fields) {
    return request("POST", "/auth/signup", fields);
  }

  /**
   * Log in.
   * @param {{email, password, remember_me}} fields
   * @returns {Promise<{ok, status, data}>}
   */
  async function login(fields) {
    return request("POST", "/auth/login", fields);
  }

  /** Log out the current admin. */
  async function logout() {
    return request("POST", "/auth/logout");
  }

  /**
   * Get the currently logged-in admin info.
   * Returns 401 if not authenticated.
   */
  async function getMe() {
    return request("GET", "/auth/me");
  }

  /**
   * Request a password reset email (link is logged server-side for now).
   * @param {string} email
   */
  async function forgotPassword(email) {
    return request("POST", "/auth/forgot-password", { email });
  }

  /**
   * Complete a password reset using the token from the link.
   * @param {{token, password, confirm_password}} fields
   */
  async function resetPassword(fields) {
    return request("POST", "/auth/reset-password", fields);
  }

  // ── Opportunities ─────────────────────────────────────────────────────────

  /** Fetch all opportunities for the logged-in admin. */
  async function listOpportunities() {
    return request("GET", "/opportunities");
  }

  /**
   * Create a new opportunity.
   * @param {{name, duration, start_date, description, skills, category, future_opportunities, max_applicants?}} fields
   */
  async function createOpportunity(fields) {
    return request("POST", "/opportunities", fields);
  }

  /**
   * Get a single opportunity by ID.
   * @param {string} id
   */
  async function getOpportunity(id) {
    return request("GET", `/opportunities/${id}`);
  }

  /**
   * Update an existing opportunity.
   * @param {string} id
   * @param {object} fields
   */
  async function updateOpportunity(id, fields) {
    return request("PUT", `/opportunities/${id}`, fields);
  }

  /**
   * Delete an opportunity by ID.
   * @param {string} id
   */
  async function deleteOpportunity(id) {
    return request("DELETE", `/opportunities/${id}`);
  }

  // ── Public surface ────────────────────────────────────────────────────────

  return {
    signup,
    login,
    logout,
    getMe,
    forgotPassword,
    resetPassword,
    listOpportunities,
    createOpportunity,
    getOpportunity,
    updateOpportunity,
    deleteOpportunity,
  };
})();
