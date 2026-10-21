/**
 * project.js - Project Detail Page Logic
 * M.Sc. Mathematics with AI & DS - Machine Learning Practical Assignment
 */
(function () {
  'use strict';

  // SVG Icons
  const ICONS = {
    externalLink: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`,
    github: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`,
    colab: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.07-10.127A2 2 0 0 1 14 9.527V2"></path><path d="M8.5 2h7"></path><path d="M7 16h10"></path></svg>`,
    youtube: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
    dataset: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>`,
    backArrow: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>`
  };

  // DOM Elements
  const projectDetailContainer = document.getElementById('projectDetailContainer');
  const breadcrumbProjectId = document.getElementById('breadcrumbProjectId');
  const headerLiveCount = document.getElementById('headerLiveCount');
  const headerLivePill = document.getElementById('headerLivePill');
  const menuToggle = document.getElementById('menuToggle');
  const navDrawer = document.getElementById('navDrawer');
  const navBackdrop = document.getElementById('navBackdrop');
  const drawerClose = document.getElementById('drawerClose');
  const loadingIndicator = document.getElementById('loadingIndicator');

  async function init() {
    setupNavDrawer();

    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('id');

    if (!projectId) {
      renderNotFound('No project ID was provided in the URL.');
      return;
    }

    if (breadcrumbProjectId) {
      breadcrumbProjectId.textContent = projectId.toUpperCase();
    }

    try {
      showLoading(true);
      const data = await window.DataService.fetchProjects();
      const project = window.DataService.getProjectById(projectId, data.projects);

      // Project data loaded; live visitor counter is independently driven by visitor-presence.js
      if (!project) {
        renderNotFound(`Project with ID "${escapeHtml(projectId)}" was not found in the registry.`);
        return;
      }

      // Update page title
      document.title = `${project.teamName || projectId} — Machine Learning Practical Assignment`;

      renderProjectDetail(project);
    } catch (err) {
      renderNotFound(`Error loading project details: ${escapeHtml(err.message)}`);
    } finally {
      showLoading(false);
    }
  }

  function renderProjectDetail(project) {
    if (!projectDetailContainer) return;

    const teamNumPadded = String(project.teamNumber || '1').padStart(2, '0');
    const teamId = project.id || `T${teamNumPadded}`;
    const isVerified = (project.verificationStatus || '').toLowerCase() === 'verified';
    const timestampFormatted = window.DataService.formatTimestamp(project.submittedAt);
    const memberCount = Array.isArray(project.members) ? project.members.length : 0;
    const teamName = escapeHtml(project.teamName || 'Untitled Team');
    const fullDesc = escapeHtml(project.fullDescription || project.problemStatement || 'No objective or problem statement details provided.');

    // Dataset info
    const dataset = project.dataset || {};
    const dsName = dataset.name ? escapeHtml(dataset.name) : 'Not specified';
    const dsUrl = dataset.sourceUrl && isValidUrl(dataset.sourceUrl) ? dataset.sourceUrl : null;
    const targetVar = dataset.targetVariable ? escapeHtml(dataset.targetVariable) : null;

    // Links
    const links = project.links || {};

    let html = `
      <!-- Team Header Card -->
      <section class="detail-main-card">
        <div class="detail-header-top">
          <div class="detail-badges-group">
            <span class="team-badge">TEAM #${teamNumPadded} // ${escapeHtml(teamId)}</span>
            ${isVerified ? `
              <span class="badge-verified-pill">
                <span class="verify-dot"></span>
                Verified Submission
              </span>
            ` : `
              <span class="badge-pending-pill">
                <span class="verify-dot"></span>
                Pending Verification
              </span>
            `}
          </div>
          <time class="submission-timestamp" datetime="${project.submittedAt || ''}">${timestampFormatted}</time>
        </div>

        <h1 class="detail-team-title">${teamName}</h1>
        <p class="detail-contributors-count">${memberCount} Team Contributor${memberCount === 1 ? '' : 's'}</p>
      </section>

      <!-- Problem Statement & Objective -->
      <section class="detail-section-block">
        <span class="detail-section-label">PROBLEM STATEMENT &amp; OBJECTIVE</span>
        <div class="detail-content-card">
          <p class="detail-text-paragraph">${fullDesc}</p>
        </div>
      </section>

      <!-- Dataset Section -->
      <section class="detail-section-block">
        <span class="detail-section-label">DATASET</span>
        <div class="detail-content-card detail-dataset-card">
          <div class="detail-dataset-title">${dsName}</div>
          ${dsUrl ? `
            <a href="${escapeHtml(dsUrl)}" target="_blank" rel="noopener noreferrer" class="detail-dataset-link">
              <span>View Dataset</span>
              ${ICONS.externalLink}
            </a>
          ` : `
            <span class="detail-target-subtitle">Dataset file: ${escapeHtml(dataset.fileName || 'Provided in project')}</span>
          `}
        </div>
      </section>

      <!-- Target Variable -->
      ${targetVar ? `
        <section class="detail-section-block">
          <span class="detail-section-label">TARGET VARIABLE</span>
          <div class="detail-content-card">
            <div class="detail-target-title">${targetVar}</div>
            <div class="detail-target-subtitle">Supervised Learning Target</div>
          </div>
        </section>
      ` : ''}

      <!-- Team Members Table -->
      <section class="detail-section-block">
        <span class="detail-section-label">TEAM MEMBERS (${memberCount})</span>
        <div class="detail-table-card">
          <table class="members-table">
            <thead>
              <tr>
                <th scope="col">NAME</th>
                <th scope="col">ROLL NO</th>
              </tr>
            </thead>
            <tbody>
              ${Array.isArray(project.members) && project.members.length > 0 ? project.members.map(m => `
                <tr>
                  <td class="member-table-name">${escapeHtml(m.name || 'Member')}</td>
                  <td class="member-table-roll">${escapeHtml(m.enrollmentNumber || '—')}</td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="2" style="text-align: center; color: var(--color-text-muted);">No members registered.</td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </section>

      <!-- Action Resource Buttons -->
      <section class="detail-actions-grid">
        ${links.github && isValidUrl(links.github) ? `
          <a href="${escapeHtml(links.github)}" target="_blank" rel="noopener noreferrer" class="btn-detail-resource btn-detail-github">
            ${ICONS.github}
            <span>GitHub Repository</span>
          </a>
        ` : ''}

        ${links.colab && isValidUrl(links.colab) ? `
          <a href="${escapeHtml(links.colab)}" target="_blank" rel="noopener noreferrer" class="btn-detail-resource btn-detail-colab">
            ${ICONS.colab}
            <span>Google Colab</span>
          </a>
        ` : ''}

        ${links.youtube && isValidUrl(links.youtube) ? `
          <a href="${escapeHtml(links.youtube)}" target="_blank" rel="noopener noreferrer" class="btn-detail-resource btn-detail-youtube">
            ${ICONS.youtube}
            <span>YouTube Video</span>
          </a>
        ` : ''}

        ${links.dataset && isValidUrl(links.dataset) ? `
          <a href="${escapeHtml(links.dataset)}" target="_blank" rel="noopener noreferrer" class="btn-detail-resource btn-detail-dataset">
            ${ICONS.dataset}
            <span>Dataset Source</span>
          </a>
        ` : ''}

        ${!(links.github && isValidUrl(links.github)) &&
          !(links.colab && isValidUrl(links.colab)) &&
          !(links.youtube && isValidUrl(links.youtube)) &&
          !(links.dataset && isValidUrl(links.dataset)) ? `
          <div style="grid-column: 1 / -1; text-align: center; color: var(--color-text-muted); font-style: italic; padding: 1rem; background-color: var(--color-bg-subtle); border-radius: var(--radius-md); border: 1px dashed var(--color-border-subtle);">
            No external submission links provided for this team yet.
          </div>
        ` : ''}
      </section>

      <!-- Back to all projects -->
      <div style="text-align: center; margin-top: 1rem;">
        <a href="index.html" class="btn-back-primary">
          ${ICONS.backArrow}
          <span>Back to all projects</span>
        </a>
      </div>
    `;

    projectDetailContainer.innerHTML = html;
  }

  function renderNotFound(message) {
    if (!projectDetailContainer) return;
    projectDetailContainer.innerHTML = `
      <div class="empty-state" style="margin-top: 2rem;">
        <div class="empty-state-icon">⚠️</div>
        <h2 class="empty-state-title">Project Not Found</h2>
        <p class="empty-state-text">${escapeHtml(message)}</p>
        <a href="index.html" class="btn-back-primary" style="margin: 0 auto; width: auto; padding: 0.75rem 1.75rem;">
          ${ICONS.backArrow}
          <span>Back to All Projects</span>
        </a>
      </div>
    `;
  }

  function setupNavDrawer() {
    if (menuToggle) menuToggle.addEventListener('click', openDrawer);
    if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
    if (navBackdrop) navBackdrop.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeDrawer();
      }
    });
  }

  function openDrawer() {
    if (navDrawer && navBackdrop) {
      navDrawer.classList.add('is-open');
      navBackdrop.classList.add('is-open');
      if (menuToggle) menuToggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      if (drawerClose) {
        setTimeout(() => drawerClose.focus(), 50);
      }
    }
  }

  function closeDrawer() {
    if (navDrawer && navBackdrop) {
      navDrawer.classList.remove('is-open');
      navBackdrop.classList.remove('is-open');
      if (menuToggle) {
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.focus();
      }
      document.body.style.overflow = '';
    }
  }

  function showLoading(show) {
    if (loadingIndicator) loadingIndicator.style.display = show ? 'flex' : 'none';
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isValidUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    return trimmed.startsWith('http://') || trimmed.startsWith('https://');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
