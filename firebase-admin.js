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

  const safeRender = () => {
    if (!hasLoadedData) {
      hasLoadedData = true;
    }
    renderQueueList(latestQueue, stationType, latestState);
    ensureInitialNext(stationType, latestQueue, latestState);
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

  const nextKey = currentState.next?.firebaseKey || currentState.next || null;
  if (!nextKey) return;

  // Promote next to serving
  await set(ref(database, `${stationType}_state/serving`), nextKey);

  // Choose new next from oldest waiting excluding the one now serving
  const newNext = waiting.find(p => p.firebaseKey !== nextKey) || null;
  await set(ref(database, `${stationType}_state/next`), newNext ? newNext.firebaseKey : null);
};

// Ensure initial NEXT is populated when empty and queue has items
async function ensureInitialNext(stationType, queueArray, controlState = {}) {
  const hasServing = !!(controlState.serving);
  const hasNext = !!(controlState.next);
  if (hasNext || hasServing) return;
  const waiting = queueArray
    .filter(i => (i.status || 'waiting') === 'waiting')
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  if (waiting.length === 0) return;
  const first = waiting[0];
  try {
    await set(ref(database, `${stationType}_state/next`), first.firebaseKey);
  } catch {}
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
  const stateServingKey = controlState.serving?.firebaseKey || controlState.serving || null;
  const stateNextKey = controlState.next?.firebaseKey || controlState.next || null;

  // Filter and sort waiting items by creation time (FIFO)
  const waiting = queueArray
    .filter(i => (i.status || 'waiting') === 'waiting')
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  const servingItem = stateServingKey ? waiting.find(p => p.firebaseKey === stateServingKey) : null;
  const nextItem = stateNextKey ? waiting.find(p => p.firebaseKey === stateNextKey) : null;

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
    callNextBtn.disabled = !nextItem;
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
    queueList.innerHTML = '<div style="text-align:center; color:#999; padding:40px;">No waiting queues</div>';
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
    const queueItemRef = ref(database, `${window.currentStationType}_queue/${window.currentQueueKey}`);
    await remove(queueItemRef);
    
    // Auto-advance first waiting to next if no next/serving customer
    const stateRef = ref(database, `${window.currentStationType}_state`);
    const queueRef = ref(database, `${window.currentStationType}_queue`);
    
    // Read current state
    const stateSnapshot = await new Promise(resolve => onValue(stateRef, resolve, { onlyOnce: true }));
    const currentState = stateSnapshot.exists() ? stateSnapshot.val() : {};
    
    // Read waiting queues
    const queueSnapshot = await new Promise(resolve => onValue(queueRef, resolve, { onlyOnce: true }));
    let waiting = [];
    if (queueSnapshot.exists()) {
      const data = queueSnapshot.val();
      waiting = Object.keys(data)
        .map(k => ({ firebaseKey: k, ...data[k] }))
        .filter(i => (i.status || 'waiting') === 'waiting')
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    }
    
    // If no next customer and there are waiting customers, advance first waiting to next
    if (!currentState.next && waiting.length > 0) {
      await set(ref(database, `${window.currentStationType}_state/next`), waiting[0].firebaseKey);
    }
    
    closeModal('doneModal');
    closeModal('viewModal');
    hideFullscreenLoading();
    console.log('Queue marked as done and removed');
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
    const queueItemRef = ref(database, `${window.currentStationType}_queue/${window.currentQueueKey}`);
    await remove(queueItemRef);
    
    // Auto-advance first waiting to next if no next/serving customer
    const stateRef = ref(database, `${window.currentStationType}_state`);
    const queueRef = ref(database, `${window.currentStationType}_queue`);
    
    // Read current state
    const stateSnapshot = await new Promise(resolve => onValue(stateRef, resolve, { onlyOnce: true }));
    const currentState = stateSnapshot.exists() ? stateSnapshot.val() : {};
    
    // Read waiting queues
    const queueSnapshot = await new Promise(resolve => onValue(queueRef, resolve, { onlyOnce: true }));
    let waiting = [];
    if (queueSnapshot.exists()) {
      const data = queueSnapshot.val();
      waiting = Object.keys(data)
        .map(k => ({ firebaseKey: k, ...data[k] }))
        .filter(i => (i.status || 'waiting') === 'waiting')
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    }
    
    // If no next customer and there are waiting customers, advance first waiting to next
    if (!currentState.next && waiting.length > 0) {
      await set(ref(database, `${window.currentStationType}_state/next`), waiting[0].firebaseKey);
    }
    
    closeModal('cancelModal');
    closeModal('viewModal');
    hideFullscreenLoading();
    console.log('Queue cancelled and removed');
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

