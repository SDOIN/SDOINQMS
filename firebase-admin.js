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
        <button class="action-btn view-btn" onclick="viewQueueDetails('${item.firebaseKey}', '${stationType}')">👁</button>
        <button class="action-btn done-btn" onclick="markAsDone('${item.firebaseKey}', '${stationType}')">✓</button>
        <button class="action-btn cancel-btn" onclick="cancelQueue('${item.firebaseKey}', '${stationType}')">✗</button>
      </div>
    `;
    queueList.appendChild(div);
  });
  
  if (pending.length === 0) {
    queueList.innerHTML = '<div style="text-align:center; color:#999; padding:40px;">No pending queues</div>';
  }
}

// View queue details
window.viewQueueDetails = async function(firebaseKey, stationType) {
  const queueRef = ref(database, `${stationType}_queue/${firebaseKey}`);
  
  onValue(queueRef, (snapshot) => {
    if (snapshot.exists()) {
      const item = snapshot.val();
      showQueueModal(item);
    }
  }, { onlyOnce: true });
};

// Show modal with queue details
function showQueueModal(item) {
  const modal = document.getElementById('detailsModal');
  if (!modal) return;
  
  document.getElementById('detailQueueNumber').textContent = item.number || 'N/A';
  document.getElementById('detailDTS').textContent = item.dts || 'N/A';
  document.getElementById('detailStatus').textContent = (item.status || 'pending').toUpperCase();
  document.getElementById('detailTimestamp').textContent = item.createdAt ? 
    new Date(item.createdAt).toLocaleString() : 'N/A';
  
  modal.classList.add('show');
}

// Mark queue as done
window.markAsDone = async function(firebaseKey, stationType) {
  if (!confirm('Mark this queue as done?')) return;
  
  try {
    const queueItemRef = ref(database, `${stationType}_queue/${firebaseKey}`);
    await remove(queueItemRef);
    console.log('Queue marked as done and removed');
  } catch (error) {
    console.error('Error marking as done:', error);
    alert('Failed to mark as done. Please try again.');
  }
};

// Cancel queue
window.cancelQueue = async function(firebaseKey, stationType) {
  if (!confirm('Cancel this queue?')) return;
  
  try {
    const queueItemRef = ref(database, `${stationType}_queue/${firebaseKey}`);
    await remove(queueItemRef);
    console.log('Queue cancelled and removed');
  } catch (error) {
    console.error('Error cancelling queue:', error);
    alert('Failed to cancel queue. Please try again.');
  }
};

// Close modal
window.closeDetailsModal = function() {
  const modal = document.getElementById('detailsModal');
  if (modal) {
    modal.classList.remove('show');
  }
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
  // Close modal when clicking outside
  const modal = document.getElementById('detailsModal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === this) {
        closeDetailsModal();
      }
    });
  }
});

