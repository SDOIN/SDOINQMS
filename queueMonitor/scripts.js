// Import Firebase modules
import { database, ref, onValue } from '../scripts/firebase-config.js';

// Function to update date/time
function updateDateTime() {
  const now = new Date();
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const month = months[now.getMonth()];
  const day = now.getDate().toString().padStart(2, '0');
  const year = now.getFullYear();

  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = (hours % 12 || 12).toString().padStart(2, '0');

  const dateString = `${month} ${day}, ${year}`;
  const timeString = `${hours}:${minutes}:${seconds} ${ampm}`;

  document.getElementById('headerDateTime').textContent = `${dateString} | ${timeString}`;
}

// Render queue numbers from Firebase (excluding serving/next)
function renderTickets(containerId, queueData, currentNumber, nextNumber) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  
  if (!queueData || queueData.length === 0) {
    return;
  }

  // Filter out current and next queue numbers from pending display
  const pendingQueue = queueData.filter(item => {
    const itemNumber = item.number || item.queueNumber;
    return itemNumber !== currentNumber && itemNumber !== nextNumber;
  });

  // Calculate dynamic sizing based on number of items
  const itemCount = pendingQueue.length;
  let fontSize = '28px';
  let padding = '15px 10px';
  let minHeight = '60px';
  
  if (itemCount > 20) {
    fontSize = '18px';
    padding = '8px 6px';
    minHeight = '40px';
  } else if (itemCount > 15) {
    fontSize = '20px';
    padding = '10px 8px';
    minHeight = '45px';
  } else if (itemCount > 10) {
    fontSize = '24px';
    padding = '12px 8px';
    minHeight = '50px';
  }

  pendingQueue.forEach(item => {
    const queueBox = document.createElement('div');
    queueBox.className = 'queue-number';
    queueBox.style.fontSize = fontSize;
    queueBox.style.padding = padding;
    queueBox.style.minHeight = minHeight;
    queueBox.textContent = item.number || item.queueNumber;
    container.appendChild(queueBox);
  });
}

// Manual-control aware monitor: reads <station>_queue and <station>_state
const caches = {
  receiving: { list: [], byKey: {}, state: { serving: null, next: null } },
  releasing: { list: [], byKey: {}, state: { serving: null, next: null } }
};

function renderStation(station) {
  const { list, byKey, state } = caches[station];
  const servingKey = state.serving?.firebaseKey || state.serving || null;
  const nextKey = state.next?.firebaseKey || state.next || null;

  const servingItem = servingKey ? byKey[servingKey] : null;
  const nextItem = nextKey ? byKey[nextKey] : null;

  const currentNum = servingItem?.number || servingItem?.queueNumber || '--';
  const nextNum = nextItem?.number || nextItem?.queueNumber || '--';

  if (station === 'receiving') {
    document.getElementById('recvOnQueue').textContent = currentNum || '--';
    document.getElementById('recvNext').textContent = nextNum || '--';
    const pending = list.filter(i => i.firebaseKey !== servingKey && i.firebaseKey !== nextKey);
    renderTickets('receivingTickets', pending, currentNum, nextNum);
  } else {
    document.getElementById('relOnQueue').textContent = currentNum || '--';
    document.getElementById('relNext').textContent = nextNum || '--';
    const pending = list.filter(i => i.firebaseKey !== servingKey && i.firebaseKey !== nextKey);
    renderTickets('releasingTickets', pending, currentNum, nextNum);
  }
}

function initializeFirebaseListeners() {
  ['receiving', 'releasing'].forEach((station) => {
    const qRef = ref(database, `${station}_queue`);
    const sRef = ref(database, `${station}_state`);

    onValue(qRef, (snapshot) => {
      const list = [];
      const map = {};
      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.keys(data).forEach(key => {
          const item = { ...data[key], firebaseKey: key };
          if ((item.status || 'waiting') === 'waiting') {
            list.push(item);
            map[key] = item;
          }
        });
        list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      }
      caches[station].list = list;
      caches[station].byKey = map;
      renderStation(station);
    });

    onValue(sRef, (snapshot) => {
      const st = snapshot.exists() ? (snapshot.val() || {}) : {};
      caches[station].state = { serving: st.serving || null, next: st.next || null };
      renderStation(station);
    });
  });
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
  updateDateTime();
  setInterval(updateDateTime, 1000);
  
  // Initialize Firebase real-time listeners
  initializeFirebaseListeners();
});

