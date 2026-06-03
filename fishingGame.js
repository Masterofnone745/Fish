// --- STATE MANAGEMENT AND GLOBAL CONSTANTS ---
let isGameActive = false; // Prevents actions while in the menu system
let gameCreated = false;  // Tracks if the initial fish school has been spawned

// Core Screen and Interface Containers
const gameContainer = document.getElementById('gameContainer');
const mainMenu = document.getElementById('mainMenu'); 
const mapMenu = document.getElementById('mapMenu');
const waterArea = document.getElementById('waterArea');

// Interactive Hardware & UI Selectors
const rod = document.getElementById('rod');
const fishingLine = document.getElementById('fishingLine');
const chargeBar = document.getElementById('chargeBar');
const scoreDisplay = document.getElementById('score');
const timerDisplay = document.getElementById('timerDisplay');

// Physics Tuning Values
let reelVelocity = 0;  // Tracks momentum metrics for line mechanics
const gravityPull = 0.5; // Upward-resisting gravitational downward drag

// SVG Vector Trajectory Elements
const trajectorySvg = document.getElementById('trajectorySvg');
const aimArc = document.getElementById('aimArc');
const aimTarget = document.getElementById('aimTarget');

// Structural Hook Properties
let hookState = 'IDLE'; // States: 'IDLE', 'DROP', 'REEL'
let hookX = 0;
let hookY = 0;
let lineStartY = 0; 
let targetX = 0;
let caughtFishElement = null;

const hookSpeed = 6; 
let score = 0;
let isFishing = false;

// Time and Life Tracker Parameters
let gameTimer = 60; 
let countdownInterval = null;
let activeFishes = []; 

// --- NEW SPAWNING SYSTEM SETTINGS ---
const MAX_FISH_CAP = 8;        // The absolute limit of fish allowed on screen at once
let spawnTimerMax = 360;      // How many frames to wait between spawn checks (180 frames ≈ 3 seconds)
let spawnCountdown = spawnTimerMax;

const fishData = [
    { id: 1, top: 60,   duration: '12s'},
    { id: 2, top: 120,  duration: '8s' },
    { id: 3, top: 180,  duration: '15s' },
    { id: 4, top: 240,  duration: '10s' },
    { id: 5, top: 300,  duration: '6s' }
];

// --- CORE PROCEDURAL GAME LOOPS ---

function spawnFishSchool() {
    activeFishes = [];
    document.querySelectorAll('.fish').forEach(f => f.remove());

    const currentWaterWidth = waterArea.clientWidth || window.innerWidth * 0.6;
    
    // Feature 3 preview: Let's randomize the initial count between 3 and 6 for now
    const randomSpawnCount = Math.floor(Math.random() * 4) + 3; 

    for (let i = 0; i < randomSpawnCount; i++) {
        const fishElement = document.createElement('div');
        fishElement.className = 'fish'; 
        fishElement.innerText = 'fish';
        
        // Spawn them spread out across the water area randomly
        const initialX = Math.random() * (currentWaterWidth - 100) + 50;
        const initialY = Math.random() * (waterArea.clientHeight - 100) + 50;
        
        fishElement.style.top = `${initialY}px`;
        fishElement.style.left = `${initialX}px`;
        waterArea.appendChild(fishElement);

        activeFishes.push({
            element: fishElement,
            x: initialX,
            y: initialY,
            speedX: (Math.random() * 1.5 + 1) * (Math.random() > 0.5 ? 1 : -1), 
            speedY: (Math.random() * 0.8 - 0.4), // Small vertical drifting speed
            changeDirectionTimer: Math.random() * 60 + 30, // Frames before changing behavior
            width: 85 
        });
    }
}

function manageMidGameSpawning() {
    // Only run this system if the game is active and a line isn't currently reeling a catch
    if (!isGameActive) return;

    spawnCountdown--;
    if (spawnCountdown <= 0) {
        // Reset the timer clock
        spawnCountdown = spawnTimerMax;

        // Count how many fish are actively swimming right now
        if (activeFishes.length >= MAX_FISH_CAP) return;

        // --- SPAWN PROBABILITY CALCULATION (Change 4) ---
        // Base chance is 40%. Every fish caught (score) increases the chance by 10%.
        let spawnChance = 0.40 + (score * 0.10);
        // Cap the maximum chance at 70% so it's not completely guaranteed
        if (spawnChance > 0.70) spawnChance = 0.70;

        // Roll the virtual dice!
        if (Math.random() < spawnChance) {
            const currentWaterWidth = waterArea.clientWidth || window.innerWidth * 0.6;
            
            // Randomly select a row depth from your fishData template
            const randomDataIndex = Math.floor(Math.random() * fishData.length);
            const chosenDepth = fishData[randomDataIndex].top;

            const fishElement = document.createElement('div');
            fishElement.className = 'fish'; 
            fishElement.innerText = 'fish';
            
            // New mid-game fish always swim in from the far edges
            const startLeft = Math.random() > 0.5;
            const initialX = startLeft ? -80 : currentWaterWidth + 80;
            
            fishElement.style.top = `${chosenDepth}px`;
            fishElement.style.left = `${initialX}px`;
            waterArea.appendChild(fishElement);

            // Push the new swimmer into your live physics loop engine
            activeFishes.push({
                element: fishElement,
                x: initialX,
                y: chosenDepth,
                speedX: (Math.random() * 1.5 + 1) * (startLeft ? 1 : -1), 
                speedY: (Math.random() * 0.8 - 0.4),
                changeDirectionTimer: Math.random() * 60 + 30,
                width: 85 
            });

            console.log(`Dynamic spawn triggered! Success rate was ${Math.round(spawnChance * 100)}%. Total fish: ${activeFishes.length}`);
        }
    }
}

function startTimer() {
    clearInterval(countdownInterval); 
    gameTimer = 60; 
    if (timerDisplay) timerDisplay.innerText = `Time: ${gameTimer}`;

    countdownInterval = setInterval(() => {
        if (!isGameActive) return; 

        gameTimer--;
        if (timerDisplay) timerDisplay.innerText = `Time: ${gameTimer}`;

        if (gameTimer <= 0) {
            clearInterval(countdownInterval);
            handleGameOver(); 
        }
    }, 1000);
}

function handleGameOver() {
    isGameActive = false;
    hookState = 'IDLE';
    isFishing = false;
    
    gameCreated= false;

    if (mainMenu) mainMenu.style.display = 'flex'; 
    gameContainer.className = 'state-menu';
    
    const menuTitle = document.querySelector('.menu-title');
    if (menuTitle) {
        menuTitle.innerText = `TIME'S UP! SCORE: ${score}`;
    }
}

function resetGame(){
    hookState = 'IDLE';
    isFishing = false;
    reelVelocity = 0;
    
    score = 0;
    if (scoreDisplay) scoreDisplay.innerText = score;
    if (chargeBar) chargeBar.style.width = '0%';
    if (rod) rod.style.transform = 'rotate(-15deg)';
    if (fishingLine) fishingLine.style.display = 'none';

    spawnFishSchool();
    startTimer();
}

// --- REAL-TIME RUNTIME PHYSICS PHYSICS LOOP ---

function updatePhysicsLoop() {
    if (!isGameActive) return;

    const waterHeight = waterArea.clientHeight || 400;

    if (hookState === 'DROP') {
        hookY += hookSpeed;
        if (fishingLine) fishingLine.style.height = `${hookY}px`;

        if (hookY >= waterHeight - 20) {
            hookState = 'REEL';
        }
    } 
    else if (hookState === 'REEL') {
        reelVelocity += gravityPull; 
        reelVelocity *= 0.95; 
        hookY += reelVelocity; 

        if (hookY >= waterHeight - 20) {
            hookY = waterHeight - 20;
            reelVelocity = 0; 
        }

        if (fishingLine) fishingLine.style.height = `${hookY}px`;

        if (caughtFishElement) {
            if (chargeBar) chargeBar.style.width = '100%'; 
            caughtFishElement.style.top = `${hookY - 15}px`;

            // Updates our internal coordinate array tracking so the engine knows where it is
            const fishDataInstance = activeFishes.find(f => f.element === caughtFishElement);
            if (fishDataInstance) {
                fishDataInstance.y = hookY - 15;
            }
        }

        if (hookY <= 0) {
            hookState = 'IDLE';
            isFishing = false;
            if (fishingLine) fishingLine.style.display = 'none';
            if (chargeBar) chargeBar.style.width = '0%';
            if (rod) rod.style.transform = 'rotate(-15deg)';
            reelVelocity = 0; 

            if (caughtFishElement) {
                activeFishes = activeFishes.filter(f => f.element !== caughtFishElement);
                caughtFishElement.remove(); 
                caughtFishElement = null; 
                
                score++;
                if (scoreDisplay) scoreDisplay.innerText = score;
            }
        }
    }

    if (hookState !== 'IDLE' && !caughtFishElement) {
        const currentHit = checkFishCollisions();
        if (currentHit) {
            hookState = 'REEL';
            caughtFishElement = currentHit;
            
            const fishDataInstance = activeFishes.find(f => f.element === caughtFishElement);
            if (fishDataInstance) {
                fishDataInstance.speed = 0; 
            }
            if (fishingLine) caughtFishElement.style.left = window.getComputedStyle(fishingLine).left;
        }
    }

    if (hookState !== 'IDLE') {
        requestAnimationFrame(updatePhysicsLoop);
    }
}

function updateFishMovement() {
    const screenWidth = waterArea.clientWidth || window.innerWidth * 0.6;
    const screenHeight = waterArea.clientHeight || 400;

    activeFishes.forEach(fish => {
        // If the fish is caught, don't run regular swimming AI
        if(caughtFishElement && fish.element === caughtFishElement) {
            //keep internal speed track zero when on hook
            fish.speedX = 0;
            fish.speedY = 0;
            return; // Skip the rest of the movement logic for this fish 
        }
        // --- ERRATIC MOVEMENT GENERATOR (Change 2) ---
        fish.changeDirectionTimer--;
        if (fish.changeDirectionTimer <= 0) {
            // Randomly tweak speeds slightly to look erratic
            fish.speedX += (Math.random() * 1 - 0.5);
            fish.speedY = (Math.random() * 1.2 - 0.6); // Move up or down gently
            
            // Put speed caps so they don't accelerate into rockets
            fish.speedX = Math.max(Math.min(fish.speedX, 3), -3);
            fish.speedY = Math.max(Math.min(fish.speedY, 0.8), -0.8);

            // Reset the behavior timer
            fish.changeDirectionTimer = Math.random() * 90 + 40;
        }

        // Apply velocities to coordinates
        fish.x += fish.speedX;
        fish.y += fish.speedY;

        // --- EDGE BOUNDARY HANDLING (Change 1 & Vertical limits) ---
        
        // Horizontal: Turn around if moving off-screen (disappear buffer room included)
        if (fish.speedX > 0 && fish.x > screenWidth + 40) {
            fish.speedX *= -1; // Reverse vector direction back onto screen
        } else if (fish.speedX < 0 && fish.x < -90) {
            fish.speedX *= -1; 
        }

        // Vertical: Bounce away if hitting the surface or the lake floor
        if (fish.y < 30) {
            fish.y = 30;
            fish.speedY *= -1;
        } else if (fish.y > screenHeight - 50) {
            fish.y = screenHeight - 50;
            fish.speedY *= -1;
        }

        // --- DOM RENDER UPDATES ---
        fish.element.style.left = `${fish.x}px`;
        fish.element.style.top = `${fish.y}px`;
        
        // Flip visual graphic depending on horizontal moving vector direction
        if (fish.speedX > 0) {
            fish.element.style.transform = 'scaleX(1)'; 
        } else {
            fish.element.style.transform = 'scaleX(-1)'; 
        }
    });
}

function checkFishCollisions() {
    // The visual hook element offset parameters
    const hookElement = document.querySelector('.hook');
    if (!hookElement) return null;

    // Get the absolute position of the hook on the screen
    const hookRect = hookElement.getBoundingClientRect();
    
    // Create a precise, small target zone right around the actual hook tip
    const hookLeft = hookRect.left;
    const hookRight = hookRect.right;
    const hookTop = hookRect.top;
    const hookBottom = hookRect.bottom;

    let hitTarget = null;

    activeFishes.forEach(fish => {
        // Get the absolute position of this specific fish on the screen
        const fishRect = fish.element.getBoundingClientRect();

        // Strict Axis-Aligned Bounding Box (AABB) intersection check
        const matchX = hookLeft < fishRect.right && hookRight > fishRect.left;
        const matchY = hookTop < fishRect.bottom && hookBottom > fishRect.top;

        // The fish will ONLY get hooked if its body actively overlaps both the X and Y bounds of the hook
        if (matchX && matchY) {
            hitTarget = fish.element;
        }
    });

    return hitTarget;
}
function drawTrajectory(targetX, targetY) {
    const pivotElement = document.querySelector('.rod-pivot');
    if (!pivotElement) return;

    const rodPivot = pivotElement.getBoundingClientRect();
    const pivotX = rodPivot.left + (rodPivot.width / 2);
    const pivotY = rodPivot.top + (rodPivot.height / 2);

    let angle = Math.atan2(targetY - pivotY, targetX - pivotX) * (180 / Math.PI);
    
    if (angle > 65) angle = 65;
    if (angle < -20) angle = -20;
    if (rod) rod.style.transform = `rotate(${angle}deg)`;

    const rad = angle * (Math.PI / 180);
    const rodLength = 250; 
    const startX = pivotX + Math.cos(rad) * rodLength;
    const startY = pivotY + Math.sin(rad) * rodLength;

    const distanceX = targetX - startX;
    const arcPeakHeight = Math.max(40, Math.abs(distanceX) * 0.2); 
    const controlX = startX + (distanceX * 0.5);
    const controlY = Math.min(startY, targetY) - arcPeakHeight;

    if (aimArc) aimArc.setAttribute('d', `M ${startX} ${startY} Q ${controlX} ${controlY} ${targetX} ${targetY}`);
    if (aimTarget) {
        aimTarget.setAttribute('cx', targetX);
        aimTarget.setAttribute('cy', targetY);
    }
}

// --- INTERACTIVE EVENT INPUT TRACKERS ---

document.addEventListener('mousemove', (event) => {
    if (!isGameActive || isFishing) return; 

    const rect = waterArea.getBoundingClientRect();
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    
    const isOverWaterX = mouseX >= rect.left && mouseX <= rect.right;
    const isOverWaterY = mouseY >= rect.top && mouseY <= rect.bottom;

    if (isOverWaterX && isOverWaterY) {
        if (trajectorySvg) trajectorySvg.style.display = 'block';
        drawTrajectory(mouseX, rect.top); 
    } else {
        if (trajectorySvg) trajectorySvg.style.display = 'none';
        if (rod) rod.style.transform = 'rotate(-15deg)'; 
    }
});

waterArea.addEventListener('click', (event) => {
    if (!isGameActive || isFishing) return; 

    isFishing = true;
    if (trajectorySvg) trajectorySvg.style.display = 'none'; 
    targetX = event.clientX;
    
    const pivotElement = document.querySelector('.rod-pivot');
    const waterRect = waterArea.getBoundingClientRect();
    if (!pivotElement) return;

    const rodPivot = pivotElement.getBoundingClientRect();
    const rad = 45 * (Math.PI / 180);
    const rodLength = 250;
    const absoluteLineStartY = (rodPivot.top + rodPivot.height / 2) + Math.sin(rad) * rodLength;
    
    lineStartY = absoluteLineStartY - waterRect.top;
    hookX = targetX - waterRect.left;
    hookY = 0;

    hookState = 'DROP';
    caughtFishElement = null;

    if (fishingLine) {
        fishingLine.style.left = `${hookX}px`;
        fishingLine.style.top = `0px`;
        fishingLine.style.height = '0px';
        fishingLine.style.display = 'block';
    }

    if (rod) rod.style.transform = 'rotate(45deg)';

    requestAnimationFrame(updatePhysicsLoop);
});

// --- SCREEN SYSTEM CONTROL MAPS ---

const startBtn = document.getElementById('startBtn');
if (startBtn) {
    startBtn.addEventListener('click', () => {
        gameContainer.className = 'state-map'; 
        if (mainMenu) mainMenu.style.display = 'none';
    });
}

const continueBtn = document.getElementById('continueBtn');
if (continueBtn) {
    continueBtn.addEventListener('click', () => {
        if (mainMenu) mainMenu.style.display = 'none';
        if (gameCreated) {
            gameContainer.className = 'state-gameplay';
            isGameActive = true;
        } else {
            gameContainer.className = 'state-map';
        }
    });
}

document.querySelectorAll('.map-node').forEach(node => {
    node.addEventListener('click', (event) => {
        const chosenLocationId = event.target.getAttribute('data-location');
        console.log(`Loading fishing spot: ${chosenLocationId}`);
        
        gameContainer.className = 'state-gameplay';
        isGameActive = true;
        gameCreated = true;
        
        // Timeout wrapper prevents client layout reading from crashing on fast frames
        setTimeout(() => {
            resetGame();
        }, 30);
    });
});

// --- INPUT KEY MAPPER MECHANICS ---

document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'r') {
        resetGame();
    }
    
    if (event.key.toLowerCase() === 'tab') {
        event.preventDefault(); 
        if (isGameActive) {
            isGameActive = false;
            if (trajectorySvg) trajectorySvg.style.display = 'none'; 
            if (mainMenu) mainMenu.style.display = 'flex';
            gameContainer.className = 'state-menu'; 
            
            const menuTitle = document.querySelector('.menu-title');
            if (menuTitle) {
                menuTitle.innerText = "GAME PAUSED";
            }
        }
    }
});

let spacebarPressed = false; 

document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        event.preventDefault(); 
        if (hookState === 'DROP') {
            hookState = 'REEL';
        }
        
        if (hookState === 'REEL') {
            if (caughtFishElement) { 
               if (!spacebarPressed) { 
                reelVelocity -= 6.5; 
               }
            }
            spacebarPressed = true; 
        }
    }
});

document.addEventListener('keyup', (event) => {
    if (event.code === 'Space') {
       spacebarPressed = false; 
     }
});

// --- FRAME RATE LOOP MANAGEMENT TICKERS ---

function tickFishAnimation() {
    if (isGameActive) {
        updateFishMovement();

        //runs dynamic tracking clock alongside movement vectors 
        manageMidGameSpawning();
    }
    requestAnimationFrame(tickFishAnimation);
}
requestAnimationFrame(tickFishAnimation); 

function handlePassiveReel() {
    if (isGameActive && hookState === 'REEL' && spacebarPressed && !caughtFishElement) {
        reelVelocity -= 0.8; 
    }
    requestAnimationFrame(handlePassiveReel);
}
requestAnimationFrame(handlePassiveReel);

let resizeTimeout;
window.addEventListener('resize', () => {
    if (!isFishing && isGameActive) {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            spawnFishSchool();
        }, 150);
    }
});
