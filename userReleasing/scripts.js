// Import Firebase modules
import { database, ref, push, onValue, set, query, orderByChild } from '../scripts/firebase-config.js';

// =============================
// RFID Card Detection System
// =============================
let rfidBuffer = '';
let rfidTimeout;
let isProcessingRFID = false;

// Function to show error message
function showRFIDError(message) {
  showCustomError('RFID Card Not Recognized', message);
}

// Function to show custom error modal (replaces alert)
function showCustomError(title, message) {
  // Remove existing error if any
  const existingError = document.getElementById('customError');
  if (existingError) {
    existingError.remove();
  }

  // Create error message
  const errorDiv = document.createElement('div');
  errorDiv.id = 'customError';
  errorDiv.className = 'custom-error-modal';
  errorDiv.innerHTML = `
    <div class="custom-error-content">
      <span class="custom-error-icon">⚠️</span>
      <div class="custom-error-text">
        <strong>${title}</strong>
        <p>${message}</p>
      </div>
      <button class="custom-error-close" onclick="this.parentElement.parentElement.remove()">✕</button>
    </div>
  `;
  
  document.body.appendChild(errorDiv);
  
  // Auto-remove after 6 seconds
  setTimeout(() => {
    if (errorDiv.parentElement) {
      errorDiv.remove();
    }
  }, 6000);
}

// Function to look up RFID card and get queue number
async function lookupRFIDCard(rfidId) {
  if (isProcessingRFID) return;
  isProcessingRFID = true;
  
  console.log('🏷️ RFID detected:', rfidId);
  
  const rfidRef = ref(database, `rfid_cards/${rfidId}`);
  
  onValue(rfidRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const queueNumber = data.queueNumber;
      
      // Auto-fill the queue number (readonly field allows programmatic updates)
      const queueInput = document.getElementById('queueNumber');
      if (queueInput) {
        // Set value directly - no flash because field is readonly
        queueInput.value = queueNumber;
        queueInput.classList.add('rfid-success');
        
        // Remove success class after animation
        setTimeout(() => {
          queueInput.classList.remove('rfid-success');
        }, 600);
        
        // Show success feedback
        console.log(`✅ RFID ${rfidId} → Queue #${queueNumber}`);
        
        // Don't auto-focus DTS - let user manually click it if needed
        // This prevents double-tap issues where second RFID goes to DTS
      }
    } else {
      // RFID card not found - show error
      showRFIDError(`This RFID card is not registered in the system. Please contact staff for assistance.`);
      console.error('❌ RFID not found:', rfidId);
      
      // Keep focus on queue number field for retry
      const queueInput = document.getElementById('queueNumber');
      if (queueInput) {
        setTimeout(() => queueInput.focus(), 500);
      }
    }
    
    isProcessingRFID = false;
  }, { onlyOnce: true });
}

// Fullscreen loading functions
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

function hideFullscreenLoading() {
  const loadingOverlay = document.getElementById('fullscreenLoading');
  if (loadingOverlay) {
    loadingOverlay.remove();
  }
}

// Make functions globally available
window.submitQueue = async function(event) {
  event.preventDefault();
  
  const queueNumber = document.getElementById('queueNumber').value.trim();
  let dtsNumber = (document.getElementById('dtsNumber') && document.getElementById('dtsNumber').value.trim()) || '';
  
  // Final safeguard: If DTS number looks like RFID (8+ digits, all numeric), clear it
  if (dtsNumber && dtsNumber.length >= 8 && /^\d+$/.test(dtsNumber)) {
    console.warn('⚠️ RFID value detected in DTS field during submit - clearing it');
    dtsNumber = '';
    const dtsInput = document.getElementById('dtsNumber');
    if (dtsInput) {
      dtsInput.value = '';
    }
  }
  
  // Silent validation - just return without alert if empty
  if (!queueNumber) {
    return;
  }
  
  if (!dtsNumber) {
    showCustomError('DTS Number Required', 'DTS Number is required for releasing station.');
    document.getElementById('dtsNumber').focus();
    return;
  }
  
  // Show loading
  showFullscreenLoading('Adding to queue...');
  
  try {
    // Check if queue number already exists
    const queueRef = ref(database, 'releasing_queue');
    const snapshot = await new Promise((resolve) => {
      onValue(queueRef, resolve, { onlyOnce: true });
    });
    
    let existsActive = false;
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.values(data).forEach(item => {
        if (item.number === String(queueNumber) && item.status !== 'done') {
          existsActive = true;
        }
      });
    }
    
    if (existsActive) {
      hideFullscreenLoading();
      showCustomError('This Number is Already in Queue', 'Please get another number.');
      return;
    }
    
    // Add new queue item to Firebase
    const newQueueRef = push(queueRef);
    await set(newQueueRef, {
      id: newQueueRef.key,
      number: String(queueNumber),
      dts: String(dtsNumber || ''),
      status: 'waiting',
      createdAt: Date.now()
    });
    
    // Auto-set as "next" if no serving and no next queue exists
    const stateRef = ref(database, 'releasing_state');
    const stateSnapshot = await new Promise((resolve) => {
      onValue(stateRef, resolve, { onlyOnce: true });
    });
    
    const currentState = stateSnapshot.exists() ? stateSnapshot.val() : {};
    
    console.log('📝 Current State:', currentState);
    console.log('🆕 New Queue Key:', newQueueRef.key);
    
    // If both serving and next are empty, set this as next
    if (!currentState.serving && !currentState.next) {
      await set(ref(database, 'releasing_state/next'), newQueueRef.key);
      console.log('✅ Auto-assigned Queue #' + queueNumber + ' as NEXT QUEUE (Key: ' + newQueueRef.key + ')');
    } else {
      console.log('ℹ️ State already has serving or next:', { 
        serving: currentState.serving, 
        next: currentState.next 
      });
    }
    
    // Show modal with queue number
    document.getElementById('modalQueueNumber').textContent = queueNumber;
    showModal();
    
    // Clear form
    document.getElementById('queueNumber').value = '';
    document.getElementById('dtsNumber').value = '';
    
    hideFullscreenLoading();
  } catch (error) {
    hideFullscreenLoading();
    console.error('Error adding queue:', error);
    showCustomError('Error', 'Failed to add queue. Please try again.');
  }
}

// Store timer ID to clear it when needed
let modalTimerId = null;
let modalCountdownTimerId = null;

window.showModal = function() {
  const modal = document.getElementById('queueModal');
  modal.classList.add('show');
  
  // Clear any existing timers from previous modal
  if (modalTimerId) {
    clearTimeout(modalTimerId);
    modalTimerId = null;
  }
  if (modalCountdownTimerId) {
    clearTimeout(modalCountdownTimerId);
    modalCountdownTimerId = null;
  }
  
  // Reset countdown opacity
  const countdownElement = document.getElementById('modalCountdown');
  if (countdownElement) {
    countdownElement.style.opacity = '1';
  }
  
  // Start fresh countdown
  let timeLeft = 10;
  const timerElement = document.getElementById('modalTimer');
  
  function updateTimer() {
    timerElement.textContent = timeLeft;
    if (timeLeft <= 0) {
      closeModal();
    } else {
      timeLeft--;
      modalTimerId = setTimeout(updateTimer, 1000);
    }
  }
  
  updateTimer();
  
  // Hide countdown after 2 seconds
  modalCountdownTimerId = setTimeout(() => {
    if (countdownElement) {
      countdownElement.style.opacity = '0.7';
    }
  }, 2000);
}

window.closeModal = function() {
  const modal = document.getElementById('queueModal');
  modal.classList.remove('show');
  
  // Clear any running timers
  if (modalTimerId) {
    clearTimeout(modalTimerId);
    modalTimerId = null;
  }
  if (modalCountdownTimerId) {
    clearTimeout(modalCountdownTimerId);
    modalCountdownTimerId = null;
  }
}

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
  // Close modal when clicking outside
  document.getElementById('queueModal').addEventListener('click', function(e) {
    if (e.target === this) {
      closeModal();
    }
  });

  // Queue Number field is readonly - only accepts RFID input
  // No manual typing allowed, only programmatic updates

  // =============================
  // RFID Scan Detection Listener
  // =============================
  let lastKeypressTime = Date.now();
  const queueInput = document.getElementById('queueNumber');
  const dtsInput = document.getElementById('dtsNumber');
  
  // Protect DTS field from RFID input - MULTIPLE LAYERS
  let dtsInputBuffer = '';
  let dtsLastKeyTime = 0; // Initialize to 0 so first keypress isn't blocked
  let dtsBufferTimeout = null;
  let dtsLastValue = '';
  let dtsKeyCount = 0; // Track number of fast keystrokes
  
  // Layer 1: Block fast input (RFID) in DTS field using keydown
  // Block immediately on fast typing - RFID scanners type < 50ms between characters
  dtsInput.addEventListener('keydown', function(e) {
    // Allow special keys (backspace, delete, tab, etc.)
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab' || 
        e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
        (e.ctrlKey && (e.key === 'a' || e.key === 'c' || e.key === 'v' || e.key === 'x'))) {
      dtsInputBuffer = '';
      dtsKeyCount = 0;
      return; // Allow these keys
    }
    
    const currentTime = Date.now();
    const timeDiff = dtsLastKeyTime > 0 ? currentTime - dtsLastKeyTime : 999; // First keypress gets large diff
    dtsLastKeyTime = currentTime;
    
    // RFID scanners type VERY fast (< 50ms between characters)
    // Normal typing is usually > 100ms, so we use 50ms threshold
    if (e.key.length === 1) {
      if (timeDiff < 50) {
        // Very fast typing detected - BLOCK IMMEDIATELY (this is RFID)
        e.preventDefault();
        e.stopPropagation();
        dtsInputBuffer += e.key;
        dtsKeyCount++;
        rfidBuffer = ''; // Clear global buffer
        console.warn('⚠️ RFID input blocked in DTS field (keydown) - very fast typing detected');
        
        // Clear any numeric characters that might have gotten through
        if (this.value && /^\d+$/.test(this.value)) {
          this.value = '';
        }
        
        // Show error message
        const originalPlaceholder = this.placeholder;
        this.placeholder = 'RFID not allowed - Type manually';
        setTimeout(() => {
          this.placeholder = originalPlaceholder;
        }, 2000);
        
        return false;
      } else {
        // Normal typing speed - reset counters and allow
        dtsInputBuffer = '';
        dtsKeyCount = 0;
      }
    } else if (e.key === 'Enter') {
      // If Enter comes after very fast typing (RFID pattern), block it
      if (dtsInputBuffer.length >= 2 || dtsKeyCount >= 2 || timeDiff < 50) {
        e.preventDefault();
        e.stopPropagation();
        dtsInputBuffer = '';
        dtsKeyCount = 0;
        rfidBuffer = '';
        
        // Clear if it's a pure numeric RFID pattern
        if (/^\d+$/.test(this.value) && this.value.length >= 7) {
          this.value = '';
          const originalPlaceholder = this.placeholder;
          this.placeholder = 'RFID not allowed - Type manually';
          setTimeout(() => {
            this.placeholder = originalPlaceholder;
          }, 2000);
        }
        console.warn('⚠️ RFID Enter blocked in DTS field');
        return false;
      }
      // Reset on Enter if not RFID
      dtsInputBuffer = '';
      dtsKeyCount = 0;
    }
    
    // Clear buffer after delay (normal typing resets it)
    if (dtsBufferTimeout) clearTimeout(dtsBufferTimeout);
    dtsBufferTimeout = setTimeout(() => {
      dtsInputBuffer = '';
      dtsKeyCount = 0;
    }, 300);
  }, true); // Use capture phase
  
  // Layer 3: Detect and remove RFID values that slip through (input event)
  dtsInput.addEventListener('input', function(e) {
    const currentValue = this.value;
    const timeSinceLastKey = Date.now() - dtsLastKeyTime;
    
    // Block pure numeric strings (7+ digits, no hyphens) that appear very quickly
    // This allows DTS numbers like "101425-343014" which contain hyphens
    // Lowered to 7 digits because RFID might be 7-8 digits
    if (currentValue.length >= 7 && /^\d+$/.test(currentValue) && timeSinceLastKey < 500) {
      // Pure numeric, 7+ digits, appeared very fast - it's RFID
      this.value = '';
      console.warn('⚠️ RFID value removed from DTS field (long pure numeric)');
      
      // Show warning message
      const originalPlaceholder = this.placeholder;
      this.placeholder = 'RFID not allowed - Type manually';
      setTimeout(() => {
        this.placeholder = originalPlaceholder;
      }, 2000);
      return;
    }
    
    // Also check if value grew too fast (more than 2 chars in < 200ms) and is all numeric
    if (currentValue.length > dtsLastValue.length + 2 && timeSinceLastKey < 200 && /^\d+$/.test(currentValue)) {
      // Too fast growth of numeric value - likely RFID
      this.value = dtsLastValue; // Revert
      console.warn('⚠️ Fast numeric input blocked in DTS field');
      
      const originalPlaceholder = this.placeholder;
      this.placeholder = 'RFID not allowed - Type manually';
      setTimeout(() => {
        this.placeholder = originalPlaceholder;
      }, 2000);
      return;
    }
    
    // Allow normal typing - don't block if value contains hyphens or other characters
    // DTS numbers can be like "101425-343014"
    dtsLastValue = currentValue;
  });
  
  // Layer 4: Block paste events (in case RFID is pasted)
  dtsInput.addEventListener('paste', function(e) {
    const pastedText = (e.clipboardData || window.clipboardData).getData('text');
    // If pasted text is a long number, it might be RFID - block it
    if (pastedText.length >= 8 && /^\d+$/.test(pastedText)) {
      e.preventDefault();
      e.stopPropagation();
      console.warn('⚠️ RFID paste blocked in DTS field');
      return false;
    }
  });
  
  // Layer 5: Prevent form submission if DTS contains RFID value
  const queueForm = document.getElementById('queueForm');
  queueForm.addEventListener('submit', function(e) {
    const dtsValue = dtsInput.value.trim();
    
    // Check if DTS contains RFID-like value (7+ digits, all numeric) - BLOCK ALL
    // Lowered to 7 digits because RFID might be 7-8 digits
    if (dtsValue && dtsValue.length >= 7 && /^\d+$/.test(dtsValue)) {
      e.preventDefault();
      e.stopPropagation();
      console.warn('⚠️ Form submission blocked - DTS contains RFID value (pure numeric)');
      
      // Clear the DTS field
      dtsInput.value = '';
      
      // Show error message
      const originalPlaceholder = dtsInput.placeholder;
      dtsInput.placeholder = 'RFID not allowed - Type manually';
      showCustomError('Invalid DTS Number', 'RFID cards are not allowed in DTS field. Please type the DTS number manually.');
      
      setTimeout(() => {
        dtsInput.placeholder = originalPlaceholder;
      }, 3000);
      
      // Focus on DTS field
      setTimeout(() => {
        dtsInput.focus();
      }, 500);
      
      return false;
    }
  }, true); // Use capture phase to catch it early
  
  document.addEventListener('keydown', function(e) {
    const activeElement = document.activeElement;
    const isDTSFocused = activeElement === dtsInput;
    const isQueueFocused = activeElement === queueInput;
    const isNoFieldFocused = activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA';
    
    // CRITICAL: If DTS is focused, completely ignore RFID - don't even build buffer
    if (isDTSFocused) {
      // Clear any existing RFID buffer when DTS is focused
      rfidBuffer = '';
      return; // Allow normal typing in DTS field
    }
    
    // Only process RFID when Queue Number field is focused OR no field is focused
    if (!isQueueFocused && !isNoFieldFocused) {
      // Some other field is focused - ignore RFID
      rfidBuffer = '';
      return;
    }
    
    const currentTime = Date.now();
    const timeDiff = currentTime - lastKeypressTime;
    lastKeypressTime = currentTime;
    
    // RFID scanners type very fast (< 50ms between characters)
    const isFastTyping = timeDiff < 50;
    
    if (e.key === 'Enter') {
      // RFID readers send Enter after card number
      if (rfidBuffer.length >= 8 && (isQueueFocused || isNoFieldFocused)) {
        e.preventDefault();
        e.stopPropagation();
        
        // Process as RFID scan - ONLY fill the field, don't submit
        lookupRFIDCard(rfidBuffer.trim());
        
        // Clear buffer
        rfidBuffer = '';
        
        // Don't auto-submit - let user press Enter again or click button
        return false;
      }
    } else if (e.key.length === 1) { // Only single characters
      // Only process RFID if Queue Number is focused or no field is focused
      if (isQueueFocused || isNoFieldFocused) {
        // Build up the RFID buffer
        rfidBuffer += e.key;
        
        // If typing fast, it's likely an RFID scan - prevent default immediately
        if (isFastTyping && rfidBuffer.length > 3) {
          e.preventDefault();
          e.stopPropagation();
        } else if (rfidBuffer.length > 3) {
          // Even if not super fast, prevent if we're building an RFID buffer
          // This prevents the flash of RFID value
          e.preventDefault();
          e.stopPropagation();
        }
        
        // Clear buffer after 200ms of no input
        clearTimeout(rfidTimeout);
        rfidTimeout = setTimeout(() => {
          rfidBuffer = '';
        }, 200);
      }
    }
  });
  
  // Focus queue number field on page load for RFID scanning
  queueInput.focus();
  
  console.log('🏷️ RFID detection system active - Ready to scan cards');
});

