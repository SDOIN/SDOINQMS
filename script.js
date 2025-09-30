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

    document.getElementById('datetime').textContent = `${dateString} | ${timeString}`;
}
setInterval(updateDateTime, 1000);
updateDateTime();

// =============================
// Form functionality
// =============================
document.getElementById('queueForm').addEventListener('submit', function(e) {
    e.preventDefault();

    if (!validateForm()) return;

    const queueNumber = document.getElementById('queueNumber').value.trim();
    const dtsNumber = document.getElementById('dtsNumber').value.trim();

    // Queue number submitted successfully - no alert needed

    // Clear inputs
    document.getElementById('queueNumber').value = '';
    document.getElementById('dtsNumber').value = '';

    // Button feedback
    const submitBtn = document.querySelector('.add-to-queue-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '✔ ADDED!';
    submitBtn.style.background = '#1e7e34';

    setTimeout(() => {
        submitBtn.textContent = originalText;
        submitBtn.style.background = '#28a745';
    }, 2000);
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
window.addEventListener('load', () => {
    document.getElementById('queueNumber').focus();
});

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
