// Config & Constants
const GROWTH_RATE = 0.045; // Controls how fast the multiplier grows
const FPS = 60;
const INITIAL_BALANCE = 1000.00;
const COUNTDOWN_DURATION = 5; // Seconds

// Game State
let state = 'IDLE'; // IDLE, COUNTDOWN, IN_GAME, CRASHED
let balance = INITIAL_BALANCE;
let currentMultiplier = 1.00;
let crashPoint = 0;
let startTime = 0;
let betAmount = 0;
let hasBetted = false;
let hasCashedOut = false;
let history = [];

// DOM Elements
const elMultiplier = document.getElementById('multiplier');
const elStatus = document.getElementById('statusMessage');
const elTimer = document.getElementById('roundTimer');
const elMainBtn = document.getElementById('mainBtn');
const elBetInput = document.getElementById('betInput');
const elBalance = document.getElementById('userBalance');
const elHistory = document.getElementById('historyBar');
const elWinCard = document.getElementById('winCard');
const elWinDisplay = document.getElementById('winDisplay');
const elPlane = document.getElementById('planeGroup');
const elPath = document.getElementById('flightPath');

// Initialization
function init() {
    updateBalance(0);
    startNewRoundCycle();
}

// --- Game Logic ---

function startNewRoundCycle() {
    state = 'COUNTDOWN';
    currentMultiplier = 1.00;
    hasBetted = false;
    hasCashedOut = false;

    // Reset UI
    document.body.classList.remove('crashed');
    elWinCard.classList.remove('visible');
    elMultiplier.textContent = "1.00x";
    elMultiplier.style.transform = "scale(1)";
    elStatus.textContent = "PRÓXIMA RODADA EM";
    elTimer.style.display = "block";

    updateButtonState();
    resetPlane();

    let countdown = COUNTDOWN_DURATION;
    const interval = setInterval(() => {
        countdown--;
        elTimer.textContent = countdown > 0 ? countdown : "DECOLANDO!";

        if (countdown <= 0) {
            clearInterval(interval);
            setTimeout(launchFlight, 1000);
        }
    }, 1000);
    elTimer.textContent = countdown;
}

function generateCrashPoint() {
    // Formula for crash distribution: 
    // Higher probability for low numbers, lower for high.
    // House edge included (approx 3% instant crash at 1.00x)
    const instantCrash = Math.random() < 0.03;
    if (instantCrash) return 1.00;

    const r = Math.random();
    return Math.max(1.01, (0.99 / (1 - r)));
}

function launchFlight() {
    state = 'IN_GAME';
    crashPoint = generateCrashPoint();
    startTime = Date.now();

    elTimer.style.display = "none";
    elStatus.textContent = "AVIÃO EM VOO";
    updateButtonState();

    requestAnimationFrame(gameLoop);
}

function gameLoop() {
    if (state !== 'IN_GAME') return;

    const elapsed = (Date.now() - startTime) / 1000; // in seconds

    // Exponential Growth Formula
    currentMultiplier = Math.pow(Math.E, GROWTH_RATE * elapsed);

    // Update UI
    elMultiplier.textContent = currentMultiplier.toFixed(2) + "x";

    // Dynamic scaling of multiplier font
    const scale = 1 + (currentMultiplier - 1) * 0.05;
    elMultiplier.style.transform = `scale(${Math.min(scale, 1.5)})`;

    updatePlanePosition(elapsed);

    // Check for Crash
    if (currentMultiplier >= crashPoint) {
        doCrash();
    } else {
        requestAnimationFrame(gameLoop);
    }
}

function doCrash() {
    state = 'CRASHED';
    currentMultiplier = crashPoint;
    elMultiplier.textContent = currentMultiplier.toFixed(2) + "x";
    document.body.classList.add('crashed');
    elStatus.textContent = "VOOU PARA LONGE!";

    addToHistory(crashPoint);

    if (hasBetted && !hasCashedOut) {
        // Player lost
        elMainBtn.classList.add('shake');
        setTimeout(() => elMainBtn.classList.remove('shake'), 500);
    }

    updateButtonState();

    // Restart cycle after 3 seconds
    setTimeout(startNewRoundCycle, 3000);
}

// --- Actions ---

window.setBet = (amount) => {
    elBetInput.value = amount.toFixed(2);
};

elMainBtn.addEventListener('click', () => {
    const inputVal = parseFloat(elBetInput.value);

    if (state === 'COUNTDOWN' || state === 'IDLE') {
        if (inputVal > 0 && inputVal <= balance) {
            betAmount = inputVal;
            updateBalance(-betAmount);
            hasBetted = true;
            updateButtonState();
        }
    } else if (state === 'IN_GAME' && hasBetted && !hasCashedOut) {
        // Cash Out!
        hasCashedOut = true;
        const winAmount = betAmount * currentMultiplier;
        updateBalance(winAmount);

        elWinDisplay.textContent = "R$ " + winAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        elWinCard.classList.add('visible');

        updateButtonState();
    }
});

function updateBalance(change) {
    balance += change;
    elBalance.textContent = "R$ " + balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function updateButtonState() {
    if (state === 'COUNTDOWN' || state === 'IDLE') {
        elMainBtn.disabled = hasBetted;
        elMainBtn.className = "action-btn bet";
        elMainBtn.querySelector('.top').textContent = hasBetted ? "APOSTADO" : "APOSTAR";
        elMainBtn.querySelector('.bottom').textContent = hasBetted ? "Aguardando voo..." : "Próxima rodada";
    }
    else if (state === 'IN_GAME') {
        if (!hasBetted) {
            elMainBtn.disabled = true;
            elMainBtn.className = "action-btn bet";
            elMainBtn.querySelector('.top').textContent = "APOSTAR";
            elMainBtn.querySelector('.bottom').textContent = "Voo em curso";
        } else if (hasCashedOut) {
            elMainBtn.disabled = true;
            elMainBtn.className = "action-btn cashout";
            elMainBtn.querySelector('.top').textContent = "SACADO";
            elMainBtn.querySelector('.bottom').textContent = "Sucesso!";
        } else {
            elMainBtn.disabled = false;
            elMainBtn.className = "action-btn cashout";
            elMainBtn.querySelector('.top').textContent = "CASH OUT";
            elMainBtn.querySelector('.bottom').textContent = "R$ " + (betAmount * currentMultiplier).toFixed(2);
        }
    }
    else if (state === 'CRASHED') {
        elMainBtn.disabled = true;
        elMainBtn.querySelector('.bottom').textContent = "Flew Away!";
    }
}

function addToHistory(value) {
    history.unshift(value);
    if (history.length > 10) history.pop();

    elHistory.innerHTML = history.map(val => `
        <div class="history-item ${val >= 2 ? 'high' : 'low'}">${val.toFixed(2)}x</div>
    `).join('');
}

// --- Animation Utils ---

function updatePlanePosition(time) {
    const width = 800;
    const height = 400;

    // Calculate progress (0 to 1) based on a parabolic arc
    let progress = Math.min(time / 15, 1);

    const x = progress * width;
    const y = height - (Math.pow(progress, 1.5) * height * 0.8);

    // Calculate rotation angle based on slope
    const rotation = -20 * Math.pow(progress, 0.5);
    elPlane.setAttribute('transform', `translate(${x}, ${y}) rotate(${rotation})`);

    // Update path string (Quadratic Bezier)
    const pathD = `M 0 400 Q ${x / 2} 400 ${x} ${y}`;
    elPath.setAttribute('d', pathD);
}

function resetPlane() {
    elPlane.setAttribute('transform', `translate(0, 400)`);
    elPath.setAttribute('d', 'M 0 400 Q 400 400 800 400');
    elPath.style.opacity = "1";
    elPlane.style.opacity = "1";
}

// Helper for mobile responsive canvas
window.addEventListener('resize', () => {
    // We use fixed viewBox in SVG, so it handles scaling automatically
});

// Start the app
init();
