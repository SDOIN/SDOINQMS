// =============================
// Firebase Admin Panel Integration
// Handles real-time queue management for admin pages
// =============================
import { database, ref, onValue, update, remove } from './firebase-config.js';

// Initialize Firebase listeners for queue management
window.initializeFirebaseAdmin = function(stationType) {
  const queueRef = ref(database, `${stationType}_queue`);
  
  // Real-time listener for queue updates
  onValue(queueRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const queueArray = Object.keys(data).map(key => ({
        firebaseKey: key,
        ...data[key]
      }));
      renderQueueList(queueArray, stationType);
    } else {
      renderQueueList([], stationType);
    }
  });
};

// Render queue list from Firebase data
function renderQueueList(queueArray, stationType) {
  const queueList = document.getElementById('queueList');
  if (!queueList) return;
  
  queueList.innerHTML = '';
  
  // Filter and sort pending items by creation time (FIFO)
  const pending = queueArray
    .filter(i => i.status === 'pending')
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  
  // Update current and next queue displays
  const current = pending[0]?.number || '00';
  const next = pending[1]?.number || '00';
  
  const currentQueueEl = document.getElementById('currentQueue');
  const nextQueueEl = document.getElementById('nextQueue');
  if (currentQueueEl) currentQueueEl.textContent = current;
  if (nextQueueEl) nextQueueEl.textContent = next;
  
  // Render each queue item
  pending.forEach((item, idx) => {
    let statusLabel = 'Pending';
    let dataStatus = 'pending';
    
    if (idx === 0) {
      statusLabel = 'On Queue';
      dataStatus = 'on-queue';
    } else if (idx === 1) {
      statusLabel = 'Next Queue';
      dataStatus = 'next-queue';
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
      </div>
    `;
    queueList.appendChild(div);
  });
  
  if (pending.length === 0) {
    queueList.innerHTML = '<div style="text-align:center; color:#999; padding:40px;">No pending queues</div>';
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
    const queueItemRef = ref(database, `${window.currentStationType}_queue/${window.currentQueueKey}`);
    await remove(queueItemRef);
    closeModal('doneModal');
    closeModal('viewModal');
    console.log('Queue marked as done and removed');
  } catch (error) {
    console.error('Error marking as done:', error);
    alert('Failed to mark as done. Please try again.');
  }
};

// Cancel queue (called from modal)
window.confirmCancelQueue = async function() {
  try {
    const queueItemRef = ref(database, `${window.currentStationType}_queue/${window.currentQueueKey}`);
    await remove(queueItemRef);
    closeModal('cancelModal');
    closeModal('viewModal');
    console.log('Queue cancelled and removed');
  } catch (error) {
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

