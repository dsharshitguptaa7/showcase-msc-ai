/**
 * DataService - Shared data management for CSJMU ML Practical Assignment Showcase
 * Handles fetching, caching, periodic polling, validation, and calculations.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DataService = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DATA_PATH = 'data/projects.json';
  const POLLING_INTERVAL_MS = 60000; // 60 seconds periodic refresh

  let cachedData = null;
  let pollingTimer = null;
  let subscribers = [];
  let isFetching = false;
  let lastFetchTimestamp = null;
  let lastFetchError = null;

  /**
   * Fetch projects data from JSON file with cache-busting
   */
  async function fetchProjects(forceRefresh = false) {
    if (isFetching && !forceRefresh) return cachedData;
    isFetching = true;

    try {
      // Append cache-busting query param
      const url = `${DATA_PATH}?_t=${Date.now()}`;
      const response = await fetch(url, {
        cache: 'no-cache',
        headers: {
          'Accept': 'application/json',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load projects: HTTP ${response.status} (${response.statusText})`);
      }

      const rawJson = await response.json();
      validateSchema(rawJson);

      const previousJsonString = cachedData ? JSON.stringify(cachedData) : null;
      const newJsonString = JSON.stringify(rawJson);
      const hasChanged = previousJsonString !== newJsonString;

      cachedData = rawJson;
      lastFetchTimestamp = new Date();
      lastFetchError = null;

      if (hasChanged && previousJsonString !== null) {
        notifySubscribers(cachedData, true);
      }

      return cachedData;
    } catch (error) {
      lastFetchError = error;
      console.warn('[DataService] Error fetching project data:', error.message);
      // If we already have cached data, keep it alive
      if (cachedData) {
        return cachedData;
      }
      throw error;
    } finally {
      isFetching = false;
    }
  }

  /**
   * Basic validation to ensure schema contract is respected
   */
  function validateSchema(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid JSON structure: Root must be an object.');
    }
    if (!Array.isArray(data.projects)) {
      throw new Error('Invalid JSON structure: "projects" property must be an array.');
    }
  }

  /**
   * Calculate submission counts
   * Rule:
   * - Total: total published project records
   * - Verified: projects with verificationStatus === "verified"
   * - Pending: projects with verificationStatus === "pending" or other non-verified status
   */
  function getCounts(projectsList) {
    const list = projectsList || (cachedData && cachedData.projects) || [];
    const total = list.length;
    let verified = 0;
    let pending = 0;

    list.forEach(item => {
      const status = (item.verificationStatus || '').toLowerCase();
      if (status === 'verified') {
        verified++;
      } else {
        pending++;
      }
    });

    return {
      total,
      verified,
      pending
    };
  }

  /**
   * Get single project by ID (case-insensitive)
   */
  function getProjectById(id, projectsList) {
    if (!id) return null;
    const cleanId = String(id).trim().toUpperCase();
    const list = projectsList || (cachedData && cachedData.projects) || [];
    return list.find(p => String(p.id).trim().toUpperCase() === cleanId) || null;
  }

  /**
   * Extract distinct dataset names with counts
   */
  function getDatasetChips(projectsList) {
    const list = projectsList || (cachedData && cachedData.projects) || [];
    const map = new Map();

    list.forEach(project => {
      const ds = project.dataset && project.dataset.name ? project.dataset.name.trim() : null;
      if (ds) {
        map.set(ds, (map.get(ds) || 0) + 1);
      }
    });

    const datasets = Array.from(map.entries()).map(([name, count]) => ({
      name,
      count
    }));

    // Sort alphabetically by dataset name
    datasets.sort((a, b) => a.name.localeCompare(b.name));
    return datasets;
  }

  /**
   * Subscribe to updates (triggered when polling detects changes)
   */
  function subscribe(callback) {
    if (typeof callback === 'function' && !subscribers.includes(callback)) {
      subscribers.push(callback);
    }
    return () => {
      subscribers = subscribers.filter(fn => fn !== callback);
    };
  }

  function notifySubscribers(data, isChanged) {
    subscribers.forEach(fn => {
      try {
        fn(data, isChanged);
      } catch (err) {
        console.error('[DataService] Subscriber notification error:', err);
      }
    });
  }

  /**
   * Start polling every intervalMs (default 60s)
   */
  function startPolling(intervalMs = POLLING_INTERVAL_MS, onUpdate = null) {
    if (onUpdate) {
      subscribe(onUpdate);
    }
    if (pollingTimer) return;

    pollingTimer = setInterval(async () => {
      try {
        await fetchProjects(true);
      } catch (e) {
        // Handled internally in fetchProjects, retains cached data
      }
    }, intervalMs);
  }

  /**
   * Stop polling
   */
  function stopPolling() {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  }

  /**
   * Format ISO date string into readable academic format
   * e.g., "9/2/2026 17:31:33" or "02 Sep 2026, 17:31"
   */
  function formatTimestamp(isoString, includeTime = true) {
    if (!isoString) return 'Pending timestamp';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;

      const day = d.getDate();
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      const secs = String(d.getSeconds()).padStart(2, '0');

      if (includeTime) {
        return `${day}/${month}/${year} ${hours}:${mins}:${secs}`;
      }
      return `${day}/${month}/${year}`;
    } catch {
      return isoString;
    }
  }

  return {
    fetchProjects,
    getCounts,
    getProjectById,
    getDatasetChips,
    subscribe,
    startPolling,
    stopPolling,
    formatTimestamp,
    getCachedData: () => cachedData,
    getLastFetchTimestamp: () => lastFetchTimestamp,
    getLastFetchError: () => lastFetchError
  };
});
