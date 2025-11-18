// =============================
// Real-time clock with seconds
// =============================
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

    const datetimeEl = document.getElementById('datetime');
    if (datetimeEl) {
        datetimeEl.textContent = `${dateString} | ${timeString}`;
    }
}

// =============================
// Form functionality (User Stations only)
// =============================
document.addEventListener('DOMContentLoaded', function() {
    const queueForm = document.getElementById('queueForm');
    if (!queueForm) return; // Exit if not on a user station page
    
    // Initialize datetime for user stations
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    queueForm.addEventListener('submit', function(e) {
    e.preventDefault();

    if (!validateForm()) return;

    const queueNumber = document.getElementById('queueNumber').value.trim();
    const dtsNumber = document.getElementById('dtsNumber').value.trim();

    // Queue number submitted successfully - no alert needed

    // Clear inputs
    document.getElementById('queueNumber').value = '';
    document.getElementById('dtsNumber').value = '';
    });

    // =============================
    // Station button functionality
    // =============================
    document.querySelectorAll('.station-btn').forEach(button => {
        button.addEventListener('click', function() {
            const stationType = this.textContent;

            // Update panel title
            document.querySelector('.form-panel h3').textContent = stationType;

            // Button highlight effect
            document.querySelectorAll('.station-btn').forEach(btn => {
                btn.style.background = '#2c2c2c';
            });
            this.style.background = '#444';

            // Instruction message
            document.querySelector('.form-instruction').textContent =
                'Kindly fill out the following fields below. Please disregard the DTS Number if NONE.';
        });
    });

    // =============================
    // Input focus styling
    // =============================
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('focus', function() {
            this.style.background = '#fff';
            this.style.boxShadow = '0 0 5px rgba(40,167,69,0.8)';
        });

        input.addEventListener('blur', function() {
            this.style.background = '#f9f9f9';
            this.style.boxShadow = 'none';
        });
    });

    // =============================
    // Auto-focus on load
    // =============================
    const queueNumberInput = document.getElementById('queueNumber');
    if (queueNumberInput) {
        queueNumberInput.focus();
    }

    // =============================
    // Keyboard shortcuts
    // =============================
    document.addEventListener('keydown', function(e) {
        // Enter submits when in DTS field
        if (e.key === 'Enter' && e.target.id === 'dtsNumber') {
            document.getElementById('queueForm').dispatchEvent(new Event('submit'));
        }

        // Tab moves focus to button at the end
        if (e.key === 'Tab') {
            const inputs = document.querySelectorAll('input');
            const currentIndex = Array.from(inputs).indexOf(e.target);

            if (currentIndex === inputs.length - 1 && !e.shiftKey) {
                e.preventDefault();
                document.querySelector('.add-to-queue-btn').focus();
            }
        }
    });

    // =============================
    // Step animation
    // =============================
    document.querySelectorAll('.step').forEach((step, index) => {
        step.style.opacity = '0';
        step.style.transform = 'translateY(20px)';

        setTimeout(() => {
            step.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            step.style.opacity = '1';
            step.style.transform = 'translateY(0)';
        }, index * 200);
    });
}); // End of DOMContentLoaded for user stations

// =============================
// Validation (only numbers allowed)
// =============================
function validateForm() {
    const queueInput = document.getElementById('queueNumber');
    const dtsInput = document.getElementById('dtsNumber');

    const queueNumber = queueInput.value.trim();
    const dtsNumber = dtsInput.value.trim();

    // Must not be empty
    if (!queueNumber) {
        showError(queueInput, 'Queue number is required and must be numeric.');
        return false;
    }

    // Must be numeric
    if (!/^\d+$/.test(queueNumber)) {
        showError(queueInput, 'Queue number must contain only numbers.');
        return false;
    }

    // DTS can be empty, but if entered must be numeric
    if (dtsNumber && !/^\d+$/.test(dtsNumber)) {
        showError(dtsInput, 'DTS number must contain only numbers.');
        return false;
    }

    // Clear error styles
    queueInput.style.boxShadow = 'none';
    dtsInput.style.boxShadow = 'none';
    return true;
}

function showError(input, message) {
    // Show error styling without alert
    input.style.boxShadow = '0 0 5px rgba(220,53,69,0.9)'; // red glow
    input.focus();
}

// =============================
// Main Dashboard Functions (index.html)
// =============================

// Note: updateDateTime() is already defined above and works for both dashboard and user stations

// Shared custom error modal (matches RFID error style)
function showCustomError(title, message) {
  const existingError = document.getElementById('customError');
  if (existingError) {
    existingError.remove();
  }

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

  setTimeout(() => {
    if (errorDiv.parentElement) {
      errorDiv.remove();
    }
  }, 6000);
}

const STORED_CREDENTIALS = {
  // For HTTPS/localhost (real SHA-256)
  usernameHash: '32959cc29459cf4402a68c6dfb614940a5ec003c59fa1702b207e3b89ccbb45a',
  passwordHash: '5af0a592eda366038eb7e9160c56e53e30463edfcbb3328dfc808e75de5f1796',
  // For file:// protocol (fallback hash)
  usernameFallback: '4621851446218514462185144621851446218514462185144621851446218514',
  passwordFallback: '7f3823537f3823537f3823537f3823537f3823537f3823537f3823537f382353'
};
const AUTH_KEY = 'admin_auth_token';
const AUTH_EXP_KEY = 'admin_auth_exp';

async function sha256(text){
  // Check if crypto.subtle is available (HTTPS or localhost)
  if (window.crypto && window.crypto.subtle) {
    const data = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
  } else {
    // Fallback: Use a simple hash for file:// protocol (less secure but works)
    console.warn('crypto.subtle not available. Using fallback hash. Please use HTTPS or localhost.');
    return await simpleSHA256(text);
  }
}

// Fallback SHA-256 implementation for file:// protocol
async function simpleSHA256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  let hash = 0;
  for (let i = 0; i < msgBuffer.length; i++) {
    hash = ((hash << 5) - hash) + msgBuffer[i];
    hash = hash & hash;
  }
  // Convert to hex and pad to 64 chars
  let hexHash = Math.abs(hash).toString(16);
  while (hexHash.length < 64) {
    hexHash = hexHash + hexHash;
  }
  return hexHash.substring(0, 64);
}

function isAuthValid() {
  try {
    const token = localStorage.getItem(AUTH_KEY);
    const exp = parseInt(localStorage.getItem(AUTH_EXP_KEY) || '0', 10);
    return !!token && Date.now() < exp;
  } catch (e) { return false; }
}

function setAuth() {
  // Set token valid for 8 hours
  const exp = Date.now() + (8 * 60 * 60 * 1000);
  localStorage.setItem(AUTH_KEY, btoa('authorized'));
  localStorage.setItem(AUTH_EXP_KEY, String(exp));
}

function openAdminLoginModal() {
  const overlay = document.getElementById('adminLoginOverlay');
  if (overlay) {
    overlay.style.display = 'flex';
    const usernameInput = document.getElementById('adminUsername');
    if (usernameInput) {
      usernameInput.focus();
    }
  }
}

function closeAdminLoginModal() {
  const overlay = document.getElementById('adminLoginOverlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
  const form = document.getElementById('adminLoginForm');
  if (form) {
    form.reset();
  }
}

// Show branded splash screen
function showSplashScreen() {
  const splashOverlay = document.createElement('div');
  splashOverlay.id = 'splashScreen';
  splashOverlay.className = 'splash-screen';
  
  splashOverlay.innerHTML = `
    <div class="splash-content">
      <div class="splash-logo-container">
        <img src="images/SDOINLogo.png" alt="SDOIN Logo" class="splash-logo">
        <img src="images/DEPEDLogo.png" alt="DEPED Logo" class="splash-logo">
      </div>
      <div class="splash-title">SDOIN Queuing Management System</div>
      <div class="splash-subtitle">Schools Division Office of Ilocos Norte</div>
      <div class="splash-spinner">
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
      </div>
      <div class="splash-message">Initializing system...</div>
    </div>
  `;
  
  document.body.appendChild(splashOverlay);
  
  // Hide splash screen after 2.5 seconds
  setTimeout(() => {
    const splash = document.getElementById('splashScreen');
    if (splash) {
      splash.style.opacity = '0';
      splash.style.transition = 'opacity 0.5s ease-out';
      setTimeout(() => {
        splash.remove();
      }, 500);
    }
  }, 2500);
}

const SPLASH_STORAGE_KEY = 'qmsSplashShown';

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

// Initialize dashboard on DOM load
document.addEventListener('DOMContentLoaded', function() {
  // Only run dashboard initialization if we're on the main dashboard page
  const isDashboard = document.getElementById('openAdminLogin') !== null;
  
  if (isDashboard) {
    const startRealtimeClock = () => {
      updateDateTime();
      setInterval(updateDateTime, 1000);
    };

    const hasSeenSplash = sessionStorage.getItem(SPLASH_STORAGE_KEY) === 'true';

    if (!hasSeenSplash) {
      showSplashScreen();
      sessionStorage.setItem(SPLASH_STORAGE_KEY, 'true');
      setTimeout(startRealtimeClock, 500);
    } else {
      startRealtimeClock();
    }

    // Wire up admin login
    const openAdminBtn = document.getElementById('openAdminLogin');
    if (openAdminBtn) {
      openAdminBtn.addEventListener('click', function() {
        if (isAuthValid()) {
          window.location.href = 'adminReceivingStation/';
          return;
        }
        openAdminLoginModal();
      });
    }

    const closeAdminBtn = document.getElementById('closeAdminLogin');
    if (closeAdminBtn) {
      closeAdminBtn.addEventListener('click', closeAdminLoginModal);
    }

    const cancelAdminBtn = document.getElementById('cancelAdminLogin');
    if (cancelAdminBtn) {
      cancelAdminBtn.addEventListener('click', closeAdminLoginModal);
    }

    const adminOverlay = document.getElementById('adminLoginOverlay');
    if (adminOverlay) {
      adminOverlay.addEventListener('click', function(e){ 
        if (e.target === this) closeAdminLoginModal(); 
      });
    }

    const adminForm = document.getElementById('adminLoginForm');
    if (adminForm) {
      adminForm.addEventListener('submit', async function(e){
        e.preventDefault();
        console.log('Login form submitted');
        
        const username = document.getElementById('adminUsername').value.trim();
        const password = document.getElementById('adminPassword').value;
        
        if (!username || !password) {
          showCustomError('Missing Credentials', 'Please enter both username and password.');
          return;
        }

        // Show loading
        showFullscreenLoading('Authenticating...');
        
        try {
          // Hash the entered credentials
          const [usernameHash, passwordHash] = await Promise.all([sha256(username), sha256(password)]);
          console.log('Credentials hashed successfully');
          
          // Determine which hash to use based on crypto.subtle availability
          const usingFallback = !(window.crypto && window.crypto.subtle);
          const storedUserHash = usingFallback ? STORED_CREDENTIALS.usernameFallback : STORED_CREDENTIALS.usernameHash;
          const storedPassHash = usingFallback ? STORED_CREDENTIALS.passwordFallback : STORED_CREDENTIALS.passwordHash;
          
          // Compare with stored hashes
          if (usernameHash === storedUserHash && passwordHash === storedPassHash) {
            console.log('Login successful!');
            setAuth();
            closeAdminLoginModal();
            hideFullscreenLoading();
            window.location.href = 'adminReceivingStation/';
          } else {
            console.log('Invalid credentials');
            hideFullscreenLoading();
            showCustomError('Login Failed', 'Invalid username or password. Please try again.');
          }
        } catch (error) {
          hideFullscreenLoading();
          console.error('Login error:', error);
          showCustomError('Login Error', 'Something went wrong while signing in. Please try again.');
        }
      });
    }

    // Show/Hide password toggle
    const toggleBtn = document.getElementById('togglePassword');
    const pwd = document.getElementById('adminPassword');
    if (toggleBtn && pwd) {
      toggleBtn.addEventListener('click', function(){
        const showing = pwd.type === 'text';
        pwd.type = showing ? 'password' : 'text';
        toggleBtn.textContent = showing ? 'Show' : 'Hide';
        toggleBtn.setAttribute('title', showing ? 'Show password' : 'Hide password');
        toggleBtn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
      });
    }
  }
});
