/**
 * app.js - Main Showcase Page Logic
 * M.Sc. Mathematics with AI & DS - Machine Learning Practical Assignment
 */
(function () {
  'use strict';

  // State
  let allProjects = [];
  let metadata = {};
  let currentSearch = '';
  let currentSort = 'latest';
  let currentVerification = 'all'; // 'all' | 'verified' | 'pending'
  let currentDataset = 'all';

  // DOM Elements
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const verifyFilterBtn = document.getElementById('verifyFilterBtn');
  const verifyBtnText = document.getElementById('verifyBtnText');
  const datasetChipsContainer = document.getElementById('datasetChipsContainer');
  const projectsGrid = document.getElementById('projectsGrid');
  const resultsCount = document.getElementById('resultsCount');
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');
  const headerLivePill = document.getElementById('headerLivePill');
  const headerLiveCount = document.getElementById('headerLiveCount');
  const lastUpdatedMeta = document.getElementById('lastUpdatedMeta');
  const menuToggle = document.getElementById('menuToggle');
  const navDrawer = document.getElementById('navDrawer');
  const navBackdrop = document.getElementById('navBackdrop');
  const drawerClose = document.getElementById('drawerClose');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const errorBanner = document.getElementById('errorBanner');
  const errorMessage = document.getElementById('errorMessage');
  const retryBtn = document.getElementById('retryBtn');

  // SVG Icons
  const ICONS = {
    dataset: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>`,
    target: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`,
    members: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
    github: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`,
    colab: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.07-10.127A2 2 0 0 1 14 9.527V2"></path><path d="M8.5 2h7"></path><path d="M7 16h10"></path></svg>`,
    youtube: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
    arrowRight: `<svg class="arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`
  };

  /**
   * Initialize App
   */
  async function init() {
    setupEventListeners();
    await loadData();
    setupPeriodicPolling();
  }

  /**
   * Setup UI Event Listeners
   */
  function setupEventListeners() {
    // Instant Search
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value.trim().toLowerCase();
        renderProjects();
      });
    }

    // Sort Dropdown
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderProjects();
      });
    }

    // Verification Filter Toggle
    if (verifyFilterBtn) {
      verifyFilterBtn.addEventListener('click', toggleVerificationFilter);
    }

    // Clear Filters
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', clearAllFilters);
    }

    // Retry Button
    if (retryBtn) {
      retryBtn.addEventListener('click', () => loadData(true));
    }

    // Navigation Drawer
    if (menuToggle) {
      menuToggle.addEventListener('click', openDrawer);
    }
    if (drawerClose) {
      drawerClose.addEventListener('click', closeDrawer);
    }
    if (navBackdrop) {
      navBackdrop.addEventListener('click', closeDrawer);
    }

    // Global Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      // Focus search with Cmd+K, Ctrl+K or '/'
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (searchInput) searchInput.focus();
      } else if (e.key === '/' && document.activeElement !== searchInput && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        if (searchInput) searchInput.focus();
      } else if (e.key === 'Escape') {
        closeDrawer();
        if (searchInput && document.activeElement === searchInput) {
          searchInput.value = '';
          currentSearch = '';
          renderProjects();
          searchInput.blur();
        }
      }
    });
  }

  /**
   * Load Data from DataService
   */
  async function loadData(force = false) {
    showLoading(true);
    hideError();

    try {
      const data = await window.DataService.fetchProjects(force);
      allProjects = data.projects || [];
      metadata = data.metadata || {};

      updateHeaderStats();
      renderDatasetChips();
      renderProjects();
      updateMetaTimestamp();
    } catch (err) {
      showError(err.message || 'Unable to load project listings. Please ensure data/projects.json is accessible.');
    } finally {
      showLoading(false);
    }
  }

  /**
   * Polling for updates every 60s
   */
  function setupPeriodicPolling() {
    window.DataService.startPolling(60000, (newData, isChanged) => {
      if (isChanged) {
        allProjects = newData.projects || [];
        metadata = newData.metadata || {};
        updateHeaderStats();
        renderDatasetChips();
        renderProjects();
        updateMetaTimestamp();
      }
    });
  }

  /**
   * Header live pill is driven by real-time Firebase visitor presence (visitor-presence.js)
   */
  function updateHeaderStats() {
    // Visitor counter is managed in real-time by visitor-presence.js
  }

  /**
   * Render Dynamic Dataset Filter Chips
   */
  function renderDatasetChips() {
    if (!datasetChipsContainer) return;

    const datasets = window.DataService.getDatasetChips(allProjects);
    const totalCount = allProjects.length;

    let html = `
      <button type="button" class="chip-btn ${currentDataset === 'all' ? 'active' : ''}" data-dataset="all">
        All (${totalCount})
      </button>
    `;

    datasets.forEach(ds => {
      const isActive = currentDataset.toLowerCase() === ds.name.toLowerCase();
      // Format display name if too long for chip
      const displayName = ds.name.length > 24 ? ds.name.substring(0, 22) + '...' : ds.name;
      html += `
        <button type="button" class="chip-btn ${isActive ? 'active' : ''}" data-dataset="${escapeHtml(ds.name)}" title="${escapeHtml(ds.name)} (${ds.count})">
          ${escapeHtml(displayName)}
        </button>
      `;
    });

    datasetChipsContainer.innerHTML = html;

    // Attach click handlers
    datasetChipsContainer.querySelectorAll('.chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentDataset = btn.getAttribute('data-dataset');
        datasetChipsContainer.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderProjects();
      });
    });
  }

  /**
   * Toggle Verification Status Filter Cycle: All -> Verified -> Pending -> All
   */
  function toggleVerificationFilter() {
    if (currentVerification === 'all') {
      currentVerification = 'verified';
    } else if (currentVerification === 'verified') {
      currentVerification = 'pending';
    } else {
      currentVerification = 'all';
    }
    updateVerificationUI();
    renderProjects();
  }

  function updateVerificationUI() {
    if (!verifyFilterBtn || !verifyBtnText) return;

    verifyFilterBtn.classList.remove('state-all', 'state-verified', 'state-pending');

    if (currentVerification === 'verified') {
      verifyFilterBtn.classList.add('state-verified');
      verifyBtnText.textContent = 'VERIFIED SUBMISSIONS';
    } else if (currentVerification === 'pending') {
      verifyFilterBtn.classList.add('state-pending');
      verifyBtnText.textContent = 'PENDING VERIFICATION';
    } else {
      verifyFilterBtn.classList.add('state-all');
      verifyBtnText.textContent = 'ALL SUBMISSIONS';
    }
  }

  /**
   * Filter and Sort Projects
   */
  function getFilteredProjects() {
    return allProjects.filter(project => {
      // 1. Verification filter
      const status = (project.verificationStatus || '').toLowerCase();
      if (currentVerification === 'verified' && status !== 'verified') {
        return false;
      }
      if (currentVerification === 'pending' && status === 'verified') {
        return false;
      }

      // 2. Dataset filter
      if (currentDataset !== 'all') {
        const dsName = (project.dataset && project.dataset.name) || '';
        if (dsName.toLowerCase() !== currentDataset.toLowerCase()) {
          return false;
        }
      }

      // 3. Search query
      if (currentSearch) {
        const teamName = (project.teamName || '').toLowerCase();
        const id = (project.id || '').toLowerCase();
        const teamNumber = String(project.teamNumber || '').toLowerCase();
        const problemStatement = (project.problemStatement || '').toLowerCase();
        const fullDescription = (project.fullDescription || '').toLowerCase();
        const dsName = (project.dataset && project.dataset.name ? project.dataset.name : '').toLowerCase();
        const targetVar = (project.dataset && project.dataset.targetVariable ? project.dataset.targetVariable : '').toLowerCase();

        // Check team members
        const memberMatch = Array.isArray(project.members) && project.members.some(m => {
          const name = (m.name || '').toLowerCase();
          const roll = (m.enrollmentNumber || '').toLowerCase();
          return name.includes(currentSearch) || roll.includes(currentSearch);
        });

        const queryMatch =
          teamName.includes(currentSearch) ||
          id.includes(currentSearch) ||
          teamNumber.includes(currentSearch) ||
          problemStatement.includes(currentSearch) ||
          fullDescription.includes(currentSearch) ||
          dsName.includes(currentSearch) ||
          targetVar.includes(currentSearch) ||
          memberMatch;

        if (!queryMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      // Sorting
      if (currentSort === 'latest') {
        const dateA = new Date(a.submittedAt || 0).getTime();
        const dateB = new Date(b.submittedAt || 0).getTime();
        return dateB - dateA;
      }
      if (currentSort === 'oldest') {
        const dateA = new Date(a.submittedAt || 0).getTime();
        const dateB = new Date(b.submittedAt || 0).getTime();
        return dateA - dateB;
      }
      if (currentSort === 'name-asc') {
        return (a.teamName || '').localeCompare(b.teamName || '');
      }
      if (currentSort === 'name-desc') {
        return (b.teamName || '').localeCompare(a.teamName || '');
      }
      if (currentSort === 'team-number') {
        return (a.teamNumber || 0) - (b.teamNumber || 0);
      }
      return 0;
    });
  }

  /**
   * Render Project Cards to Grid
   */
  function renderProjects() {
    if (!projectsGrid) return;

    const filtered = getFilteredProjects();

    // Update results count indicator
    if (resultsCount) {
      resultsCount.textContent = `Showing ${filtered.length} of ${allProjects.length} teams`;
    }

    // Toggle clear filters visibility
    const isFiltered = currentSearch !== '' || currentVerification !== 'all' || currentDataset !== 'all';
    if (clearFiltersBtn) {
      clearFiltersBtn.style.display = isFiltered ? 'inline-block' : 'none';
    }

    if (filtered.length === 0) {
      projectsGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">🔍</div>
          <h3 class="empty-state-title">No projects found.</h3>
          <p class="empty-state-text">Try changing your search keywords or clearing active filters to see available teams.</p>
          <button type="button" class="btn-back-primary" id="emptyClearBtn" style="margin: 0 auto; width: auto; padding: 0.65rem 1.5rem;">
            Clear Filters
          </button>
        </div>
      `;
      const emptyClearBtn = document.getElementById('emptyClearBtn');
      if (emptyClearBtn) {
        emptyClearBtn.addEventListener('click', clearAllFilters);
      }
      return;
    }

    let cardsHtml = '';
    filtered.forEach(project => {
      cardsHtml += createProjectCardHtml(project);
    });

    projectsGrid.innerHTML = cardsHtml;
  }

  /**
   * Build HTML for single project card matching reference design
   */
  function createProjectCardHtml(project) {
    const teamNumPadded = String(project.teamNumber || '1').padStart(2, '0');
    const teamId = project.id || `T${teamNumPadded}`;
    const teamName = escapeHtml(project.teamName || 'Untitled Team');
    const memberCount = Array.isArray(project.members) ? project.members.length : 0;
    const description = escapeHtml(project.problemStatement || project.fullDescription || 'No description provided.');
    
    // Dataset info
    const dsName = project.dataset && project.dataset.name ? escapeHtml(project.dataset.name) : 'Not specified';
    const dsUrl = project.dataset && project.dataset.sourceUrl ? project.dataset.sourceUrl : null;
    const targetVar = project.dataset && project.dataset.targetVariable ? escapeHtml(project.dataset.targetVariable) : null;

    // Members list
    let membersHtml = '';
    if (Array.isArray(project.members) && project.members.length > 0) {
      membersHtml = `
        <div class="card-members-section">
          <div class="members-section-label">TEAM MEMBERS</div>
          <div class="members-list">
            ${project.members.map(m => `
              <div class="member-row">
                <span class="member-name">${escapeHtml(m.name || 'Member')}</span>
                <span class="member-roll">${escapeHtml(m.enrollmentNumber || '')}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Resource action buttons
    const links = project.links || {};
    let resourceButtonsHtml = '';
    let hasAnyLink = false;

    if (links.github && isValidUrl(links.github)) {
      hasAnyLink = true;
      resourceButtonsHtml += `
        <a href="${escapeHtml(links.github)}" class="btn-resource btn-github" target="_blank" rel="noopener noreferrer" title="View GitHub Repository" aria-label="GitHub Repository">
          ${ICONS.github}
          <span>GitHub</span>
        </a>
      `;
    }

    if (links.colab && isValidUrl(links.colab)) {
      hasAnyLink = true;
      resourceButtonsHtml += `
        <a href="${escapeHtml(links.colab)}" class="btn-resource btn-colab" target="_blank" rel="noopener noreferrer" title="Open Google Colab Notebook" aria-label="Google Colab">
          ${ICONS.colab}
          <span>Colab</span>
        </a>
      `;
    }

    if (links.youtube && isValidUrl(links.youtube)) {
      hasAnyLink = true;
      resourceButtonsHtml += `
        <a href="${escapeHtml(links.youtube)}" class="btn-resource btn-youtube" target="_blank" rel="noopener noreferrer" title="Watch Video Walkthrough" aria-label="YouTube Video">
          ${ICONS.youtube}
          <span>YouTube</span>
        </a>
      `;
    }

    if (!hasAnyLink) {
      resourceButtonsHtml = `<span class="btn-unsubmitted">No links submitted yet</span>`;
    }

    return `
      <article class="project-card" data-project-id="${escapeHtml(teamId)}">
        <!-- Top Card Row -->
        <div class="card-header-row">
          <div class="team-badge-group">
            <span class="team-badge">TEAM #${teamNumPadded}</span>
            <span class="team-id-mono">${escapeHtml(teamId)}</span>
          </div>
          <div class="members-pill">
            ${ICONS.members}
            <span>${memberCount} members</span>
          </div>
        </div>

        <!-- Team Name -->
        <h2 class="card-team-name">${teamName}</h2>

        <!-- Problem Statement -->
        <p class="card-description">${description}</p>

        <!-- Dataset & Target -->
        <div class="card-info-list">
          <div class="card-info-item">
            <span class="card-info-icon">${ICONS.dataset}</span>
            <span class="card-info-label">DATASET:</span>
            ${dsUrl && isValidUrl(dsUrl)
              ? `<a href="${escapeHtml(dsUrl)}" target="_blank" rel="noopener noreferrer" class="card-dataset-link" title="${dsName}">${dsName}</a>`
              : `<span class="card-dataset-link" title="${dsName}">${dsName}</span>`
            }
          </div>
          ${targetVar ? `
            <div class="card-info-item">
              <span class="card-info-icon">${ICONS.target}</span>
              <span class="card-info-label">TARGET:</span>
              <span class="card-target-pill">${targetVar}</span>
            </div>
          ` : ''}
        </div>

        <!-- Members -->
        ${membersHtml}

        <!-- Card Actions Row -->
        <div class="card-actions-bar">
          <div class="resource-btns-group">
            ${resourceButtonsHtml}
          </div>
          <a href="project.html?id=${encodeURIComponent(teamId)}" class="btn-details" aria-label="View details for ${teamName}">
            <span>Details</span>
            ${ICONS.arrowRight}
          </a>
        </div>
      </article>
    `;
  }

  /**
   * Clear All Filters
   */
  function clearAllFilters() {
    currentSearch = '';
    currentVerification = 'all';
    currentDataset = 'all';
    currentSort = 'latest';

    if (searchInput) searchInput.value = '';
    if (sortSelect) sortSelect.value = 'latest';
    updateVerificationUI();

    if (datasetChipsContainer) {
      datasetChipsContainer.querySelectorAll('.chip-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-dataset') === 'all');
      });
    }

    renderProjects();
  }

  /**
   * Drawer Navigation Controls
   */
  function openDrawer() {
    if (navDrawer && navBackdrop) {
      navDrawer.classList.add('is-open');
      navBackdrop.classList.add('is-open');
      if (menuToggle) menuToggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeDrawer() {
    if (navDrawer && navBackdrop) {
      navDrawer.classList.remove('is-open');
      navBackdrop.classList.remove('is-open');
      if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  }

  /**
   * Subtle timestamp in footer
   */
  function updateMetaTimestamp() {
    if (!lastUpdatedMeta) return;
    const metaDate = metadata.lastUpdated || window.DataService.getLastFetchTimestamp();
    const formatted = window.DataService.formatTimestamp(metaDate);
    lastUpdatedMeta.textContent = `Session: ${metadata.academicSession || '2026-27'} • Last Data Sync: ${formatted}`;
  }

  /**
   * Loading and Error UI state helpers
   */
  function showLoading(show) {
    if (loadingIndicator) loadingIndicator.style.display = show ? 'flex' : 'none';
    if (projectsGrid && show) projectsGrid.style.display = 'none';
    if (projectsGrid && !show) projectsGrid.style.display = 'grid';
  }

  function showError(msg) {
    if (errorBanner && errorMessage) {
      errorMessage.textContent = msg;
      errorBanner.style.display = 'flex';
    }
  }

  function hideError() {
    if (errorBanner) errorBanner.style.display = 'none';
  }

  /**
   * Utilities
   */
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

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
