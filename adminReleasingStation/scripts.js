// Protect page - require auth token
(function enforceAuth(){
  try {
    const token = localStorage.getItem('admin_auth_token');
    const exp = parseInt(localStorage.getItem('admin_auth_exp') || '0', 10);
    if (!token || Date.now() >= exp) {
      window.location.href = '../';
    }
  } catch (e) {
    window.location.href = '../';
  }
})();

// Read from releasing queue storage
function renderFromStorage() {
  const queueList = document.getElementById('queueList');
  queueList.innerHTML = '';
  const list = JSON.parse(localStorage.getItem('releasing_queue') || '[]');
  const pending = list.filter(i => i.status === 'pending');
  const current = pending[0]?.number || '00';
  const next = pending[1]?.number || '00';
  document.getElementById('currentQueue').textContent = String(current).padStart(2,'0');
  document.getElementById('nextQueue').textContent = String(next).padStart(2,'0');
  pending.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'queue-item';
    row.setAttribute('data-id', item.id);
    const status = idx === 0 ? 'on-queue' : (idx === 1 ? 'next-queue' : 'pending');
    const statusText = idx === 0 ? 'ON QUEUE' : (idx === 1 ? 'NEXT' : 'PENDING');
    
    row.innerHTML = `
      <div class="queue-item-number">${String(item.number).padStart(2,'0')}</div>
      <div class="queue-item-content">
        <div class="queue-item-title">DOCUMENT TRACKING NUMBER</div>
        <div class="queue-item-tracking">${item.dts ? item.dts : '—'}</div>
      </div>
      <div class="queue-item-status">${statusText}</div>`;
    row.setAttribute('data-status', status);
    row.addEventListener('click', () => openItemModal(item));
    queueList.appendChild(row);
  });
}

window.addEventListener('storage', function(e){ 
  if (e.key==='releasing_queue' || e.key==='releasing_last_update') {
    renderFromStorage();
  }
});

function updateDateTime(){
  const now = new Date();
  const months=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const month=months[now.getMonth()]; 
  const day=String(now.getDate()).padStart(2,'0'); 
  const year=now.getFullYear();
  let h=now.getHours(); 
  const m=String(now.getMinutes()).padStart(2,'0'); 
  const s=String(now.getSeconds()).padStart(2,'0'); 
  const ap=h>=12?'PM':'AM'; 
  h=String(h%12||12).padStart(2,'0');
  document.getElementById('datetime').textContent=`${month} ${day}, ${year} | ${h}:${m}:${s} ${ap}`;
}
setInterval(updateDateTime,1000); 
updateDateTime();

// Logout handler
document.getElementById('logoutBtn').addEventListener('click', function(){
  try {
    localStorage.removeItem('admin_auth_token');
    localStorage.removeItem('admin_auth_exp');
  } catch (e) {}
  window.location.href = '../';
});

document.addEventListener('DOMContentLoaded', renderFromStorage);

// Modal for item details
function openItemModal(item) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.innerHTML = `
    <div class="queue-modal">
      <button class="modal-close-btn" id="closeModal">&times;</button>
      <div class="queue-header">QUEUE DETAILS</div>
      <div class="modal-main-content">
        <div class="modal-queue-number">${String(item.number).padStart(2,'0')}</div>
        <div class="modal-message-section">
          <div class="modal-greeting">Document Tracking</div>
          <div class="modal-instructions">${item.dts ? item.dts : 'Not provided'}</div>
        </div>
      </div>
      <div class="modal-button-group">
        <button class="modal-return-button" id="markDone">DONE</button>
        <button class="modal-cancel-button" id="cancelModal">CANCEL</button>
      </div>
      <div class="modal-countdown" style="display:none"></div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  
  // Close button (X)
  document.getElementById('closeModal').addEventListener('click', () => {
    overlay.remove();
  });
  
  // Cancel button - deletes the queue
  document.getElementById('cancelModal').addEventListener('click', () => {
    try {
      const list = JSON.parse(localStorage.getItem('releasing_queue') || '[]');
      const filtered = list.filter(x => x.id !== item.id);
      localStorage.setItem('releasing_queue', JSON.stringify(filtered));
      localStorage.setItem('releasing_last_update', String(Date.now()));
    } catch (e) {}
    overlay.remove();
    renderFromStorage();
  });
  
  // Done button
  document.getElementById('markDone').addEventListener('click', () => {
    try {
      const list = JSON.parse(localStorage.getItem('releasing_queue') || '[]');
      const idx = list.findIndex(x => x.id === item.id);
      if (idx !== -1) {
        list[idx].status = 'done';
        localStorage.setItem('releasing_queue', JSON.stringify(list));
        localStorage.setItem('releasing_last_update', String(Date.now()));
      }
    } catch (e) {}
    overlay.remove();
    renderFromStorage();
  });
}

// Initialize Firebase for this admin page
window.addEventListener('load', function() {
  if (typeof window.initializeFirebaseAdmin === 'function') {
    window.initializeFirebaseAdmin('releasing');
  }
});

