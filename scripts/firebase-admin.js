// =============================
// Firebase Admin Panel Integration
// Handles real-time queue management for admin pages
// =============================
import { database, ref, onValue, update, remove, set } from './firebase-config.js';

// Initialize Firebase listeners for queue management
window.initializeFirebaseAdmin = function(stationType) {
  const queueRef = ref(database, `${stationType}_queue`);
  const stateRef = ref(database, `${stationType}_state`);

  let latestQueue = [];
  let latestState = { serving: null, next: null };
  let hasLoadedData = false;

  // Show skeleton loading initially
  showSkeletonLoading();

  // Debounce ensureInitialNext to prevent excessive calls
  let ensureNextTimeout = null;
  
  const safeRender = () => {
    if (!hasLoadedData) {
      hasLoadedData = true;
    }
    renderQueueList(latestQueue, stationType, latestState);
    
    // Debounce ensureInitialNext to prevent race conditions
    // Only call it after a short delay to ensure state is stable
    if (ensureNextTimeout) {
      clearTimeout(ensureNextTimeout);
    }
    ensureNextTimeout = setTimeout(() => {
      ensureInitialNext(stationType, latestQueue, latestState);
    }, 300); // Wait 300ms for state to stabilize
  };

  // Real-time listener for queue updates
  onValue(queueRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      latestQueue = Object.keys(data).map(key => ({ firebaseKey: key, ...data[key] }));
    } else {
      latestQueue = [];
    }
    safeRender();
  });

  // Real-time listener for admin control state
  onValue(stateRef, (snapshot) => {
    latestState = snapshot.exists() ? (snapshot.val() || {}) : {};
    latestState.serving = latestState.serving || null;
    latestState.next = latestState.next || null;
    safeRender();
  });
};

// Admin: Call Next Customer → promote next to serving; fill next from oldest pending
window.adminCallNext = async function(stationType) {
  const queueRef = ref(database, `${stationType}_queue`);
  const stateRef = ref(database, `${stationType}_state`);

  // Read queue once
  let waiting = [];
  await new Promise(resolve => onValue(queueRef, (snap) => {
    if (snap.exists()) {
      const data = snap.val();
      waiting = Object.keys(data)
        .map(k => ({ firebaseKey: k, ...data[k] }))
        .filter(i => (i.status || 'waiting') === 'waiting')
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    }
    resolve();
  }, { onlyOnce: true }));

  // Read state once
  let currentState = {};
  await new Promise(resolve => onValue(stateRef, (snap) => { currentState = snap.val() || {}; resolve(); }, { onlyOnce: true }));

  // Safety check: Do not proceed if there's already an ON QUEUE item
  const hasOnQueue = !!(currentState.serving?.firebaseKey || currentState.serving);
  if (hasOnQueue) {
    console.warn('⚠️ Cannot call next customer: There is already an item in ON QUEUE');
    return;
  }

  const nextKey = currentState.next?.firebaseKey || currentState.next || null;
  if (!nextKey) {
    console.warn('⚠️ Cannot call next customer: No next queue available');
    return;
  }

  // Choose new next from oldest waiting excluding the one that will be serving
  // CRITICAL: Make sure newNext is NOT the same as nextKey (the one being promoted)
  const newNext = waiting.find(p => p.firebaseKey !== nextKey) || null;
  
  // Double-check: Ensure newNext is not the same as nextKey (should never happen, but safety check)
  if (newNext && newNext.firebaseKey === nextKey) {
    console.error('❌ CRITICAL: newNext is the same as nextKey! This should never happen.');
    return;
  }
  
  // Use lock to prevent concurrent state updates
  if (isUpdatingState) {
    console.warn('⚠️ State update already in progress, skipping...');
    return;
  }
  
  isUpdatingState = true;
  try {
    // Use atomic update to set both serving and next at the same time
    // CRITICAL: Ensure next is NEVER the same as serving
    const updates = {
      serving: nextKey,
      next: (newNext && newNext.firebaseKey !== nextKey) ? newNext.firebaseKey : null
    };
    
    // Final safety check: serving and next should NEVER be the same
    if (updates.serving && updates.next && updates.serving === updates.next) {
      console.error('❌ CRITICAL ERROR: Attempted to set serving and next to the same key!', updates);
      updates.next = null; // Force next to null if they're the same
    }
    
    await update(stateRef, updates);
    console.log('✅ State updated atomically:', updates);
    
    // Verify the update was successful
    const verifyState = await new Promise(resolve => onValue(stateRef, (snap) => {
      resolve(snap.exists() ? snap.val() : {});
    }, { onlyOnce: true }));
    
    // If verification shows they're still the same, force fix it
    const verifyServing = verifyState.serving?.firebaseKey || verifyState.serving || null;
    const verifyNext = verifyState.next?.firebaseKey || verifyState.next || null;
    
    if (verifyServing && verifyNext && verifyServing === verifyNext) {
      console.error('❌ CRITICAL: After update, serving and next are still the same! Fixing...');
      await update(stateRef, { next: null });
      console.log('✅ Forced next to null to prevent duplication');
    }
  } catch (error) {
    console.error('❌ Error updating state:', error);
    throw error;
  } finally {
    isUpdatingState = false;
  }
};

// Ensure initial NEXT is populated when empty and queue has items
let isSettingNext = false;
let isUpdatingState = false; // Lock to prevent concurrent state updates

async function ensureInitialNext(stationType, queueArray, controlState = {}) {
  // Prevent concurrent calls
  if (isSettingNext || isUpdatingState) return;
  
  // Extract keys properly (handle both object and string formats)
  const servingKey = controlState.serving?.firebaseKey || controlState.serving || null;
  const nextKey = controlState.next?.firebaseKey || controlState.next || null;
  
  // CRITICAL: If next and serving are the same, clear next immediately
  if (servingKey && nextKey && servingKey === nextKey) {
    console.error('❌ CRITICAL: next and serving are the same! Clearing next...');
    isSettingNext = true;
    try {
      await set(ref(database, `${stationType}_state/next`), null);
      console.log('✅ Cleared duplicate next value');
    } catch (error) {
      console.error('❌ Error clearing duplicate next:', error);
    } finally {
      isSettingNext = false;
    }
    return; // Don't set a new next if we just cleared a duplicate
  }
  
  // CRITICAL: If there's already a valid next queue, preserve it - do nothing
  // This prevents clearing next when page refreshes
  if (nextKey) {
    // Verify the next key actually exists in the queue
    const nextExists = queueArray.some(q => q.firebaseKey === nextKey);
    if (nextExists) {
      // Next is valid and exists - preserve it, don't touch anything
      return;
    } else {
      // Next key doesn't exist in queue anymore - clear it
      console.warn('⚠️ Next key does not exist in queue, clearing...');
      isSettingNext = true;
      try {
        await set(ref(database, `${stationType}_state/next`), null);
      } catch (error) {
        console.error('❌ Error clearing invalid next:', error);
      } finally {
        isSettingNext = false;
      }
      return;
    }
  }
  
  // If there's already a serving queue but no next, don't auto-assign next
  // (admin should manually call next customer to promote from waiting)
  if (servingKey) {
    // Don't auto-assign next when there's already a serving item
    // The admin needs to manually call next customer
    return;
  }
  
  const waiting = queueArray
    .filter(i => (i.status || 'waiting') === 'waiting')
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  
  // No waiting queues, nothing to do
  if (waiting.length === 0) return;
  
  // Find first queue that's not currently serving
  const first = waiting.find(q => q.firebaseKey !== servingKey);
  
  if (!first) return;
  
  // CRITICAL: Double-check that first is not the same as serving
  if (first.firebaseKey === servingKey) {
    console.error('❌ CRITICAL: Attempted to set next to the same key as serving!');
    return;
  }
  
  isSettingNext = true;
  try {
    console.log(`🔄 Auto-assigning NEXT queue: ${first.number} (${first.firebaseKey})`);
    await set(ref(database, `${stationType}_state/next`), first.firebaseKey);
    console.log(`✅ Successfully set NEXT queue to: ${first.number}`);
    
    // Verify the update
    const verifyState = await new Promise(resolve => onValue(ref(database, `${stationType}_state`), (snap) => {
      resolve(snap.exists() ? snap.val() : {});
    }, { onlyOnce: true }));
    
    const verifyServing = verifyState.serving?.firebaseKey || verifyState.serving || null;
    const verifyNext = verifyState.next?.firebaseKey || verifyState.next || null;
    
    if (verifyServing && verifyNext && verifyServing === verifyNext) {
      console.error('❌ CRITICAL: After setting next, it matches serving! Clearing...');
      await set(ref(database, `${stationType}_state/next`), null);
    }
  } catch (error) {
    console.error('❌ Error setting initial next:', error);
  } finally {
    isSettingNext = false;
  }
}

// Show fullscreen loading with circular spinner
function showFullscreenLoading(message = 'Loading...') {
  // Remove existing loading if any
  const existingLoading = document.getElementById('fullscreenLoading');
  if (existingLoading) {
    existingLoading.remove();
  }

  const loadingOverlay = document.createElement('div');
  loadingOverlay.id = 'fullscreenLoading';
  loadingOverlay.className = 'fullscreen-loading';
  
  loadingOverlay.innerHTML = `
    <div class="loading-content">
      <div class="circular-spinner">
        <div class="spinner-dot"></div>
        <div class="spinner-dot"></div>
        <div class="spinner-dot"></div>
        <div class="spinner-dot"></div>
        <div class="spinner-dot"></div>
        <div class="spinner-dot"></div>
        <div class="spinner-dot"></div>
        <div class="spinner-dot"></div>
        <div class="spinner-dot"></div>
        <div class="spinner-dot"></div>
        <div class="spinner-dot"></div>
        <div class="spinner-dot"></div>
      </div>
      <div class="loading-message">${message}</div>
    </div>
  `;
  
  document.body.appendChild(loadingOverlay);
}

// Hide fullscreen loading
function hideFullscreenLoading() {
  const loadingOverlay = document.getElementById('fullscreenLoading');
  if (loadingOverlay) {
    loadingOverlay.remove();
  }
}

// Show skeleton loading
function showSkeletonLoading() {
  const queueList = document.getElementById('queueList');
  if (!queueList) return;
  
  queueList.innerHTML = `
    <div class="skeleton-control">
      <div class="skeleton-button"></div>
    </div>
    <div class="skeleton-item">
      <div class="skeleton-number"></div>
      <div class="skeleton-content">
        <div class="skeleton-title"></div>
        <div class="skeleton-dts"></div>
        <div class="skeleton-status"></div>
      </div>
      <div class="skeleton-actions">
        <div class="skeleton-btn"></div>
        <div class="skeleton-btn"></div>
        <div class="skeleton-btn"></div>
      </div>
    </div>
    <div class="skeleton-item">
      <div class="skeleton-number"></div>
      <div class="skeleton-content">
        <div class="skeleton-title"></div>
        <div class="skeleton-dts"></div>
        <div class="skeleton-status"></div>
      </div>
      <div class="skeleton-actions">
        <div class="skeleton-btn"></div>
        <div class="skeleton-btn"></div>
        <div class="skeleton-btn"></div>
      </div>
    </div>
    <div class="skeleton-item">
      <div class="skeleton-number"></div>
      <div class="skeleton-content">
        <div class="skeleton-title"></div>
        <div class="skeleton-dts"></div>
        <div class="skeleton-status"></div>
      </div>
      <div class="skeleton-actions">
        <div class="skeleton-btn"></div>
        <div class="skeleton-btn"></div>
        <div class="skeleton-btn"></div>
      </div>
    </div>
  `;
}

// Render queue list from Firebase data
function renderQueueList(queueArray, stationType, controlState = {}) {
  const queueList = document.getElementById('queueList');
  if (!queueList) return;
  
  queueList.innerHTML = '';
  let stateServingKey = controlState.serving?.firebaseKey || controlState.serving || null;
  let stateNextKey = controlState.next?.firebaseKey || controlState.next || null;

  // CRITICAL: If serving and next are the same, clear next to prevent duplication
  if (stateServingKey && stateNextKey && stateServingKey === stateNextKey) {
    console.error('❌ CRITICAL: serving and next are the same in render! Clearing next...');
    // Clear next asynchronously to prevent blocking render
    setTimeout(async () => {
      try {
        await set(ref(database, `${stationType}_state/next`), null);
        console.log('✅ Cleared duplicate next value in render');
      } catch (error) {
        console.error('❌ Error clearing duplicate next in render:', error);
      }
    }, 100);
    // Force next to null to prevent showing duplicate
    stateNextKey = null;
  }

  // Filter and sort waiting items by creation time (FIFO)
  const waiting = queueArray
    .filter(i => (i.status || 'waiting') === 'waiting')
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  const servingItem = stateServingKey ? waiting.find(p => p.firebaseKey === stateServingKey) : null;
  const nextItem = stateNextKey ? waiting.find(p => p.firebaseKey === stateNextKey) : null;

  // Debug logging
  console.log('📊 Queue State:', {
    stateServingKey,
    stateNextKey,
    servingItem: servingItem ? servingItem.number : 'none',
    nextItem: nextItem ? nextItem.number : 'none',
    waitingCount: waiting.length,
    waitingKeys: waiting.map(w => w.firebaseKey)
  });

  // Update current and next queue displays
  const current = servingItem?.number || '00';
  const next = nextItem?.number || '00';
  
  const currentQueueEl = document.getElementById('currentQueue');
  const nextQueueEl = document.getElementById('nextQueue');
  if (currentQueueEl) currentQueueEl.textContent = current;
  if (nextQueueEl) nextQueueEl.textContent = next;
  
  // Minimal control button (no style change)
  const control = document.createElement('div');
  control.innerHTML = `
    <div class="queue-control">
      <button id="callNextBtn" class="control-btn next-customer-btn" title="Call Next Customer">
        <span class="btn-icon">📢</span>
        <span class="btn-text">Call Next Customer</span>
      </button>
    </div>
  `;
  queueList.appendChild(control);
  const callNextBtn = control.querySelector('#callNextBtn');
  if (callNextBtn) {
    // Button should be enabled ONLY when:
    // 1. There's NO item in ON QUEUE (serving is null/empty)
    // 2. AND there's a next queue available
    // 3. AND there are waiting items
    const hasOnQueue = !!stateServingKey;
    const shouldEnable = !hasOnQueue && !!stateNextKey && waiting.length > 0;
    callNextBtn.disabled = !shouldEnable;
    console.log('🔘 Call Next Button:', shouldEnable ? 'ENABLED' : 'DISABLED', { 
      hasOnQueue, 
      hasNextKey: !!stateNextKey, 
      waitingCount: waiting.length 
    });
    callNextBtn.addEventListener('click', () => window.adminCallNext && window.adminCallNext(stationType));
  }

  // Render each queue item
  waiting.forEach((item, idx) => {
    let statusLabel = 'Waiting';
    let dataStatus = 'waiting';
    let isOnQueue = false;
    let isNextQueue = false;
    
    if (servingItem && item.firebaseKey === servingItem.firebaseKey) {
      statusLabel = 'On Queue';
      dataStatus = 'on-queue';
      isOnQueue = true;
    } else if (nextItem && item.firebaseKey === nextItem.firebaseKey) {
      statusLabel = 'Next Queue';
      dataStatus = 'next-queue';
      isNextQueue = true;
    }
    
    // Determine which buttons to show based on status
    let actionButtons = '';
    
    if (isOnQueue) {
      // ON QUEUE: Show View, Mark as Done, and Cancel buttons
      actionButtons = `
        <button class="action-btn view-btn" onclick="viewQueueDetails('${item.firebaseKey}', '${item.number}', '${item.dts || 'N/A'}', '${statusLabel}', ${item.createdAt || 0}, '${stationType}')" title="View Details">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
        <button class="action-btn done-btn" onclick="showDoneModal('${item.firebaseKey}', '${item.number}', '${stationType}')" title="Mark as Done">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
        <button class="action-btn cancel-btn" onclick="showCancelModal('${item.firebaseKey}', '${item.number}', '${stationType}')" title="Cancel Queue">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;
    } else {
      // NEXT QUEUE and WAITING: Show only View and Cancel buttons
      actionButtons = `
        <button class="action-btn view-btn" onclick="viewQueueDetails('${item.firebaseKey}', '${item.number}', '${item.dts || 'N/A'}', '${statusLabel}', ${item.createdAt || 0}, '${stationType}')" title="View Details">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
        <button class="action-btn cancel-btn" onclick="showCancelModal('${item.firebaseKey}', '${item.number}', '${stationType}')" title="Cancel Queue">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;
    }
    
    const div = document.createElement('div');
    div.className = 'queue-item';
    div.setAttribute('data-status', dataStatus);
    div.innerHTML = `
      <div class="queue-item-number">${item.number}</div>
      <div class="queue-item-content">
        <div class="queue-item-title">Queue #${item.number}</div>
        <div class="queue-item-tracking">DTS: ${item.dts || 'N/A'}</div>
        <div class="queue-item-status">${statusLabel}</div>
      </div>
      <div class="queue-item-actions">
        ${actionButtons}
      </div>
    `;
    queueList.appendChild(div);
  });
  
  if (waiting.length === 0) {
    queueList.innerHTML = `
      <div class="empty-queue-state">
        <div class="empty-queue-icon">
          <svg width="56" height="56" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="8" y="18" width="48" height="30" rx="6" />
            <path d="M16 18v-4c0-2.2 1.8-4 4-4h24c2.2 0 4 1.8 4 4v4" />
            <path d="M22 50c0 3.3-2.7 6-6 6" />
            <path d="M42 50c0 3.3 2.7 6 6 6" />
            <path d="M24 30h16" />
            <path d="M24 38h10" />
          </svg>
        </div>
        <div class="empty-queue-title">No waiting queues</div>
        <p class="empty-queue-message">You're all caught up. New queues will appear here automatically.</p>
      </div>
    `;
  }
}

// View queue details - Show modal with all information
window.viewQueueDetails = function(firebaseKey, queueNumber, dtsNumber, status, createdAt, stationType) {
  const modal = document.getElementById('viewModal');
  if (!modal) return;
  
  // Populate modal with queue details
  document.getElementById('viewQueueNumber').textContent = queueNumber;
  document.getElementById('viewDTS').textContent = dtsNumber;
  document.getElementById('viewStatus').textContent = status;
  document.getElementById('viewTimestamp').textContent = createdAt ? 
    new Date(createdAt).toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: '2-digit',
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    }) : 'N/A';
  
  // Show/hide Mark as Done button based on status
  const markDoneBtn = modal.querySelector('.modal-btn-success');
  if (markDoneBtn) {
    if (status === 'On Queue') {
      markDoneBtn.style.display = 'inline-flex';
    } else {
      markDoneBtn.style.display = 'none';
    }
  }
  
  // Store current queue info for actions
  window.currentQueueKey = firebaseKey;
  window.currentQueueNumber = queueNumber;
  window.currentStationType = stationType;
  
  modal.classList.add('show');
};

// Show Done Confirmation Modal
window.showDoneModal = function(firebaseKey, queueNumber, stationType) {
  const modal = document.getElementById('doneModal');
  if (!modal) return;
  
  document.getElementById('doneQueueNumber').textContent = queueNumber;
  
  window.currentQueueKey = firebaseKey;
  window.currentStationType = stationType;
  
  modal.classList.add('show');
};

// Show Cancel Confirmation Modal
window.showCancelModal = function(firebaseKey, queueNumber, stationType) {
  const modal = document.getElementById('cancelModal');
  if (!modal) return;
  
  document.getElementById('cancelQueueNumber').textContent = queueNumber;
  
  window.currentQueueKey = firebaseKey;
  window.currentStationType = stationType;
  
  modal.classList.add('show');
};

// Mark queue as done (called from modal)
window.confirmMarkDone = async function() {
  try {
    showFullscreenLoading('Processing...');
    const completedKey = window.currentQueueKey;
    const queueItemRef = ref(database, `${window.currentStationType}_queue/${completedKey}`);
    
    // Read current state BEFORE removing
    const stateRef = ref(database, `${window.currentStationType}_state`);
    const stateSnapshot = await new Promise(resolve => onValue(stateRef, resolve, { onlyOnce: true }));
    const currentState = stateSnapshot.exists() ? stateSnapshot.val() : {};
    
    // Remove the queue item
    await remove(queueItemRef);
    
    // Read remaining waiting queues
    const queueRef = ref(database, `${window.currentStationType}_queue`);
    const queueSnapshot = await new Promise(resolve => onValue(queueRef, resolve, { onlyOnce: true }));
    let waiting = [];
    if (queueSnapshot.exists()) {
      const data = queueSnapshot.val();
      waiting = Object.keys(data)
        .map(k => ({ firebaseKey: k, ...data[k] }))
        .filter(i => (i.status || 'waiting') === 'waiting')
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    }
    
    // Extract keys properly (handle both object and string formats)
    const currentServingKey = currentState.serving?.firebaseKey || currentState.serving || null;
    const currentNextKey = currentState.next?.firebaseKey || currentState.next || null;
    
    // Prepare atomic update
    const stateUpdates = {};
    
    // Clear serving
    stateUpdates.serving = null;
    
    // If next was the one we just removed, get a new next from waiting
    if (currentNextKey === completedKey) {
      stateUpdates.next = waiting.length > 0 ? waiting[0].firebaseKey : null;
    }
    // Otherwise, keep the existing next queue unchanged (don't include in update)
    
    // Use atomic update to prevent race conditions
    if (isUpdatingState) {
      console.warn('⚠️ State update already in progress, retrying...');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    isUpdatingState = true;
    try {
      await update(stateRef, stateUpdates);
      console.log('✅ State updated atomically after marking done:', stateUpdates);
    } finally {
      isUpdatingState = false;
    }
    
    closeModal('doneModal');
    closeModal('viewModal');
    hideFullscreenLoading();
    console.log('✅ Queue marked as done. Next queue remains in position.');
  } catch (error) {
    hideFullscreenLoading();
    console.error('Error marking as done:', error);
    alert('Failed to mark as done. Please try again.');
  }
};

// Cancel queue (called from modal)
window.confirmCancelQueue = async function() {
  try {
    showFullscreenLoading('Cancelling...');
    const cancelledKey = window.currentQueueKey;
    const queueItemRef = ref(database, `${window.currentStationType}_queue/${cancelledKey}`);
    
    // Read current state BEFORE removing
    const stateRef = ref(database, `${window.currentStationType}_state`);
    const stateSnapshot = await new Promise(resolve => onValue(stateRef, resolve, { onlyOnce: true }));
    const currentState = stateSnapshot.exists() ? stateSnapshot.val() : {};
    
    // Extract keys properly (handle both object and string formats)
    const currentServingKey = currentState.serving?.firebaseKey || currentState.serving || null;
    const currentNextKey = currentState.next?.firebaseKey || currentState.next || null;
    
    const wasServing = currentServingKey === cancelledKey;
    const wasNext = currentNextKey === cancelledKey;
    
    // Remove the queue item
    await remove(queueItemRef);
    
    // Read remaining waiting queues
    const queueRef = ref(database, `${window.currentStationType}_queue`);
    const queueSnapshot = await new Promise(resolve => onValue(queueRef, resolve, { onlyOnce: true }));
    let waiting = [];
    if (queueSnapshot.exists()) {
      const data = queueSnapshot.val();
      waiting = Object.keys(data)
        .map(k => ({ firebaseKey: k, ...data[k] }))
        .filter(i => (i.status || 'waiting') === 'waiting')
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    }
    
    // Prepare atomic update
    const stateUpdates = {};
    
    // Update state based on what was cancelled
    if (wasServing) {
      // Cancelled the serving queue (ON QUEUE)
      // Clear serving but KEEP next queue in place
      stateUpdates.serving = null;
      console.log('✅ Cancelled ON QUEUE. Next queue remains in position.');
    } else if (wasNext) {
      // Cancelled the next queue - get new next from waiting
      const newNext = waiting.find(q => q.firebaseKey !== currentServingKey);
      stateUpdates.next = newNext ? newNext.firebaseKey : null;
      console.log('✅ Cancelled NEXT QUEUE. New next assigned from waiting list.');
    } else {
      // Cancelled a regular waiting queue
      // Check if we need to assign next (if it was empty)
      if (!currentNextKey && waiting.length > 0) {
        const newNext = waiting.find(q => q.firebaseKey !== currentServingKey);
        if (newNext) {
          stateUpdates.next = newNext.firebaseKey;
        }
      }
      console.log('✅ Cancelled waiting queue.');
    }
    
    // Use atomic update to prevent race conditions
    if (Object.keys(stateUpdates).length > 0) {
      if (isUpdatingState) {
        console.warn('⚠️ State update already in progress, retrying...');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      isUpdatingState = true;
      try {
        await update(stateRef, stateUpdates);
        console.log('✅ State updated atomically after cancelling:', stateUpdates);
      } finally {
        isUpdatingState = false;
      }
    }
    
    closeModal('cancelModal');
    closeModal('viewModal');
    hideFullscreenLoading();
  } catch (error) {
    hideFullscreenLoading();
    console.error('Error cancelling queue:', error);
    alert('Failed to cancel queue. Please try again.');
  }
};

// Close any modal
window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
  }
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
  // Close modals when clicking outside
  const modals = ['viewModal', 'doneModal', 'cancelModal'];
  modals.forEach(modalId => {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === this) {
          closeModal(modalId);
        }
      });
    }
  });
});

