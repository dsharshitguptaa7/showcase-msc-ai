/**
 * visitor-presence.js - Secure Real-time Visitor Presence Tracking
 * Uses Firebase Anonymous Authentication & Realtime Database with strict Security Rules.
 */
(function () {
  'use strict';

  // DOM Elements
  const headerLiveCount = document.getElementById('headerLiveCount');
  const headerLivePill = document.getElementById('headerLivePill');

  const STALE_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes threshold for stale sessions
  const HEARTBEAT_INTERVAL_MS = 45 * 1000; // 45 seconds heartbeat

  let firebaseApp = null;
  let database = null;
  let auth = null;
  let currentUser = null;
  let currentSessionRef = null;
  let heartbeatTimer = null;
  let isMonitoringActive = false;
  let serverTimeOffset = 0;

  /**
   * Set UI counter display status safely
   */
  function setStatus(displayCount, tooltipText) {
    if (headerLiveCount) {
      headerLiveCount.textContent = displayCount;
    }
    if (headerLivePill) {
      headerLivePill.setAttribute('title', tooltipText || '');
    }
  }

  /**
   * Validate Firebase Configuration
   */
  function isConfigured(config) {
    if (!config || typeof config !== 'object') return false;
    const requiredKeys = ['apiKey', 'databaseURL', 'projectId'];
    for (const key of requiredKeys) {
      if (!config[key] || typeof config[key] !== 'string') return false;
      if (config[key].includes('YOUR_')) return false; // Contains default placeholder
    }
    return true;
  }

  /**
   * Initialize Real-time Presence with Anonymous Authentication
   */
  function initPresence() {
    const config = window.FIREBASE_CONFIG;

    if (!isConfigured(config)) {
      console.info(
        '[VisitorPresence] Firebase configuration is pending. Set credentials in js/firebase-config.js. Displaying offline indicator.'
      );
      setStatus('-- Live', 'Live visitor tracking requires Firebase configuration in js/firebase-config.js');
      return;
    }

    if (typeof firebase === 'undefined' || !firebase.database || !firebase.auth) {
      console.warn('[VisitorPresence] Firebase SDK (app, auth, database) is not fully loaded.');
      setStatus('-- Live', 'Live visitor presence service is currently unavailable.');
      return;
    }

    try {
      // Normalize databaseURL by trimming any trailing slash
      const normalizedConfig = Object.assign({}, config, {
        databaseURL: (config.databaseURL || '').replace(/\/+$/, '')
      });

      // Initialize Firebase App
      if (!firebase.apps || firebase.apps.length === 0) {
        firebaseApp = firebase.initializeApp(normalizedConfig);
      } else {
        firebaseApp = firebase.app();
      }

      database = firebase.database();
      auth = firebase.auth();

      // Listen for authentication state
      auth.onAuthStateChanged((user) => {
        if (user) {
          currentUser = user;
          if (!isMonitoringActive) {
            setupConnectionMonitoring(user);
          }
        } else {
          currentUser = null;
          // Sign in anonymously
          auth.signInAnonymously().catch((err) => {
            console.error('[VisitorPresence] Anonymous authentication error:', err.code, err.message);
            if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/admin-restricted-operation') {
              setStatus('-- Live', 'Enable Anonymous Auth in Firebase Console: Authentication > Sign-in method');
            } else {
              setStatus('-- Live', 'Auth failed: ' + err.message);
            }
          });
        }
      });
    } catch (err) {
      console.error('[VisitorPresence] Initialization error:', err.message);
      setStatus('-- Live', 'Error initializing Firebase visitor presence.');
    }
  }

  /**
   * Setup Firebase connection and session tracking for authenticated user
   */
  function setupConnectionMonitoring(user) {
    isMonitoringActive = true;
    const connectedRef = database.ref('.info/connected');
    const offsetRef = database.ref('.info/serverTimeOffset');
    const sessionsListRef = database.ref('presence/sessions');

    // Track clock skew between local machine and Firebase servers
    offsetRef.on('value', (snap) => {
      serverTimeOffset = snap.val() || 0;
    });

    // Monitor client connection state to Firebase servers
    connectedRef.on('value', (snap) => {
      const isConnected = snap.val() === true;

      if (!isConnected) {
        setStatus('-- Live', 'Connecting to real-time presence service...');
        stopHeartbeat();
        return;
      }

      // Clean up any existing session reference before registering a new one
      if (currentSessionRef) {
        currentSessionRef.remove();
      }

      // Tab session ref: unique node under presence/sessions
      currentSessionRef = sessionsListRef.push();

      // Register server-side disconnect cleanup
      currentSessionRef.onDisconnect().remove((err) => {
        if (err) {
          console.warn('[VisitorPresence] onDisconnect registration error:', err.message);
        }
      });

      // Write session presence payload matching security rules validation
      const sessionData = {
        uid: user.uid,
        joinedAt: firebase.database.ServerValue.TIMESTAMP,
        lastActive: firebase.database.ServerValue.TIMESTAMP
      };

      currentSessionRef.set(sessionData, (err) => {
        if (err) {
          console.error('[VisitorPresence] Failed to register session in database:', err.message);
          if (err.message.includes('permission_denied') || err.code === 'PERMISSION_DENIED') {
            setStatus('-- Live', 'Database permission denied. Check database.rules.json');
          } else {
            setStatus('-- Live', 'Presence error: ' + err.message);
          }
        } else {
          startHeartbeat();
        }
      });
    });

    // Listen for changes in active sessions to update live counter instantly
    sessionsListRef.on('value', (snapshot) => {
      if (!snapshot.exists()) {
        setStatus('0 Live', 'Active Visitors: 0');
        return;
      }

      let activeVisitorsCount = 0;
      const synchronizedNow = Date.now() + serverTimeOffset;

      snapshot.forEach((child) => {
        const val = child.val();
        // Strictly count valid non-stale sessions
        if (val && typeof val.lastActive === 'number') {
          if (synchronizedNow - val.lastActive < STALE_TIMEOUT_MS) {
            activeVisitorsCount++;
          }
        }
      });

      setStatus(
        `${activeVisitorsCount} Live`,
        `Real-time Active Visitors: ${activeVisitorsCount} across all tabs`
      );
    }, (error) => {
      console.error('[VisitorPresence] Realtime Database read error:', error.message);
      if (error.message.includes('permission_denied') || error.code === 'PERMISSION_DENIED') {
        setStatus('-- Live', 'Database locked. Apply database.rules.json in Firebase Console');
      } else {
        setStatus('-- Live', 'Live presence unavailable: ' + error.message);
      }
    });

    // Clean up immediately when tab is closed or navigated away
    window.addEventListener('beforeunload', cleanupSession);
    window.addEventListener('pagehide', cleanupSession);
  }

  /**
   * Periodic heartbeat to update session activity timestamp
   */
  function startHeartbeat() {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
      if (currentSessionRef && database && currentUser) {
        currentSessionRef.child('lastActive').set(firebase.database.ServerValue.TIMESTAMP);
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  /**
   * Fast cleanup on tab close
   */
  function cleanupSession() {
    stopHeartbeat();
    if (currentSessionRef) {
      currentSessionRef.remove();
    }
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPresence);
  } else {
    initPresence();
  }
})();
