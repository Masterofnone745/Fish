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

//buttons
const startBtn = document.getElementById('startBtn');
const continueBtn = document.getElementById('continueBtn');


// Physics Tuning Values
let reelVelocity = 0;  // Tracks momentum metrics for line mechanics
const gravityPull = 0.5; // Upward-resisting gravitational downward drag

// SVG Vector Trajectory Elements
const trajectorySvg = document.getElementById('trajectorySvg');
const aimArc = document.getElementById('aimArc');
const aimTarget = document.getElementById('aimTarget');

//Fish inventory variables
let caughtFishInventory=[]; 
let currentInventoryIndex=1;
let slotsPerPage=12; // 3x4 grid layout

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
let playerMoney = 0;

//fish stats
let fishSpeed = 2; // Base speed for fish movement
let fishWeight = 1; // Base weight for catch difficulty 


// Time and Life Tracker Parameters
let gameTimer = 30; 
let countdownInterval = null;
let activeFishes = []; 

// --- NEW SPAWNING SYSTEM SETTINGS ---
const MAX_FISH_CAP = 8;        // The absolute limit of fish allowed on screen at once
let BaitNum=0;

const spawnTimerMax = 420;    // Base number of frames between spawn checks (7 seconds at 60fps)
const spawnTimerMin = 180;    // Minimum frames between spawns (3 seconds)

let spawnCountdown = 250; // Initial countdown value (4+ seconds) to give player time to get ready before first spawn


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
    
    //starting spawn count 
    const randomSpawnCount = Math.floor(Math.random() * 4)+BaitNum; 

    for (let i = 0; i < randomSpawnCount; i++) {
        const fishElement = document.createElement('div');
        fishElement.className = 'fish'; 
        fishElement.innerText = 'fish';
        
        // 🌟 NEW: Roll a random weight between 1.0 and 5.0 kg
        const rolledWeight = parseFloat((Math.random() * 4 + 1).toFixed(1));
        
        // 🌟 NEW: Calculate speed penalty based on weight (heavier = slower)
        // Base random speed is divided by a fraction of the weight
        const weightSpeedModifier = Math.max(0.4, 2 / rolledWeight);
        const baseSpeedX = (Math.random() * 1.5 + 1) * (Math.random() > 0.5 ? 1 : -1);

        // 🌟 NEW: Scale the visual size of the div based on weight so players see it!
        const visualScale = 1 + (rolledWeight - 1) * 0.2; // scales from 1x up to 1.8x size
        fishElement.style.transformOrigin = 'center';


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
    if (!isGameActive) return;

    spawnCountdown--;
    if (spawnCountdown <= 0) {
        spawnCountdown = spawnTimerMax;

        // Strict hard ceiling check
        if (activeFishes.length >= MAX_FISH_CAP) return;

        // --- INVERTED POPULATION PROBABILITY MATH ---
        // Base starting spawn probability
        let spawnChance = 0.30; 

        // Calculate how empty the lake is relative to its absolute capacity
        const remainingSlots = MAX_FISH_CAP - activeFishes.length;

        if (activeFishes.length <= 1) {
            // DESPERATION RESTOCK: If the lake is empty or has 1 lonely fish, force an 80% spawn rate
            spawnChance = 0.80;
        } else {
            // GRADUAL BALANCING: Add a scaling 10% bonus for every missing slot below the cap
            spawnChance += (remainingSlots * 0.08);
        }

        // Keep bounds comfortable between a 20% minimum and 85% maximum chance
        spawnChance = Math.max(0.20, Math.min(spawnChance, 0.85));

        // Roll the virtual dice!
        if (Math.random() < spawnChance) {
            const currentWaterWidth = waterArea.clientWidth || window.innerWidth * 0.6;
            
            const randomDataIndex = Math.floor(Math.random() * fishData.length);
            const chosenDepth = fishData[randomDataIndex].top;

            const fishElement = document.createElement('div');
            fishElement.className = 'fish'; 
            fishElement.innerText = 'fish';

            const rolledWeight = parseFloat((Math.random() * 4 + 1).toFixed(1));
            const weightSpeedModifier = Math.max(0.4, 2 / rolledWeight);
            const visualScale = 1 + (rolledWeight - 1) * 0.2;
            
            const startLeft = Math.random() > 0.5;
            const initialX = startLeft ? -80 : currentWaterWidth + 80;
            
            fishElement.style.top = `${chosenDepth}px`;
            fishElement.style.left = `${initialX}px`;
            waterArea.appendChild(fishElement);

            activeFishes.push({
                element: fishElement,
                x: initialX,
                y: chosenDepth,
                 
                weight: rolledWeight, // Store weight for catch resolution
                visualScale: visualScale, // Store visual scale for rendering

                speedX: (Math.random() * 1.5 + 1) * (startLeft ? 1 : -1), 
                speedY: (Math.random() * 0.8 - 0.4),
                changeDirectionTimer: Math.random() * 60 + 30,
                width: 85 
            });

            console.log(`Lake dynamic population check: ${activeFishes.length}/${MAX_FISH_CAP}. Spawn chance automatically adjusted to ${Math.round(spawnChance * 100)}%`);
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
    gameCreated = false; // Ensures continue button drops to map logic

    // Pull the all-time high score from browser memory (defaults to 0 if first time playing)
    let currentHighScore = parseInt(localStorage.getItem('fishingHighScore')) || 0;

    // Check if the player just broke their record!
    if (score > currentHighScore) {
        currentHighScore = score;
        localStorage.setItem('fishingHighScore', currentHighScore); // Lock it into memory
    }

    // Update the layout elements inside our new game over panel
    const finalScoreSpan = document.getElementById('finalScore');
    const highScoreSpan = document.getElementById('highScoreDisplay');
    
    if (finalScoreSpan) finalScoreSpan.innerText = score;
    if (highScoreSpan) highScoreSpan.innerText = currentHighScore;

    // Toggle panel visibility: Hide main menu buttons, display Game Over stats
    const startMenuBox = document.getElementById('startMenuBox');
    const gameOverBox = document.getElementById('gameOverBox');
    
    if (startMenuBox) startMenuBox.style.display = 'none';
    if (gameOverBox) gameOverBox.style.display = 'block';

    // Bring up the overlay screen wrapper
    if (mainMenu) mainMenu.style.display = 'flex'; 
    gameContainer.className = 'state-menu';
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
        let activeGravity = gravityPull;
        let caughtFishData = null;

        if (caughtFishElement) {
            caughtFishData = activeFishes.find(f => f.element === caughtFishElement);
            if (caughtFishData) {
                // Safeguard against weight being a string or undefined
                let fishWeightNum = parseFloat(caughtFishData.weight);
                if (isNaN(fishWeightNum)) fishWeightNum = 1.0;
                
                // Each kg adds baseline gravity pull
                activeGravity += (fishWeightNum * 0.15); 

                // Date.now() / 400 creates a smooth, oscillating rhythm of fighting and resting
                const fightCycle = Math.sin(Date.now() / 400); 
                
                if (fightCycle > 0) {
                    // Fish is actively thrashing! Apply its weight drag
                    activeGravity += (fishWeightNum * 0.18) * fightCycle;
                    
                    // Visual cue: make the stuck fish shake slightly while fighting
                    caughtFishElement.style.transform = `scale(${caughtFishData.visualScale || 1}) translateX(${(Math.random() * 4 - 2)}px)`;
                } else {
                    // Fish is tired out and resting! Weight drag drops to almost nothing
                    activeGravity += (fishWeightNum * 0.02);
                }
            }  
        }

        reelVelocity += activeGravity; 
        reelVelocity *= 0.95; 
        hookY += reelVelocity; 

        if (hookY >= waterHeight - 20) {
            hookY = waterHeight - 20;
            if(reelVelocity > 0){
            reelVelocity = 0; 
            }
        }

        if (fishingLine) fishingLine.style.height = `${hookY}px`;

        if (caughtFishElement) {
            caughtFishElement.style.top = `${hookY - 15}px`;

            const fishDataInstance = activeFishes.find(f => f.element === caughtFishElement);
            if (fishDataInstance) {
                fishDataInstance.y = hookY - 15;
            }
        }

        if (hookY <= 0) {
            hookState = 'IDLE';
            isFishing = false;
            
            if (fishingLine) fishingLine.style.display = 'none';
            if (rod) rod.style.transform = 'rotate(-15deg)';
            reelVelocity = 0; 

            // Explicitly clear your UI state tracking parameters here
            if (chargeBar) {
                chargeBar.style.width = '0%';
            }

            if (caughtFishElement) { 
                const finalFishData = activeFishes.find(f => f.element === caughtFishElement);
                let finalWeight = 1.0;
                if (finalFishData && finalFishData.weight) {
                    finalWeight = parseFloat(finalFishData.weight);
                    if (isNaN(finalWeight)) finalWeight = 1.0;
                }

                activeFishes = activeFishes.filter(f => f.element !== caughtFishElement);

                // Save caught fish metrics
                caughtFishInventory.push({
                    name: `${finalWeight}kg fish`,
                    caughtAt: Date.now(),
                    weight: finalWeight
                });
                
                // Clean rounding prevents decimal wallet values
                const fishPayout = Math.round(finalWeight * 10); 
                playerMoney += fishPayout;

                renderInventoryGrid();
                saveGameProgress();

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
                fishDataInstance.speedX = 0; 
                fishDataInstance.speedY = 0;
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
        fish.element.style.transform = `scale(${fish.visualScale}, ${fish.visualScale}) scaleX(1)`; 
        } else {
            fish.element.style.transform = `scale(${fish.visualScale}, ${fish.visualScale}) scaleX(-1)`; 
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

function renderInventoryGrid() {
    const gridContainer = document.getElementById('inventoryGrid');
    const pageIndicator = document.getElementById('invPageIndicator');
    if (!gridContainer) return;

    // Reset current UI elements completely
    gridContainer.innerHTML = '';

    // Calculate pagination rules
    const totalPages = Math.max(1, Math.ceil(caughtFishInventory.length / slotsPerPage));
    
    // Bounds check to ensure user doesn't end up on an empty page index
    if (currentInventoryIndex > totalPages) currentInventoryIndex = totalPages;

    if (pageIndicator) {
        pageIndicator.innerText = `${currentInventoryIndex}/${totalPages}`;
    }

    // Determine slice points for the active viewing block
    const startIndex = (currentInventoryIndex - 1) * slotsPerPage;
    
    // Generate exactly 12 grid boxes regardless of whether they have a fish or not
    for (let i = 0; i < slotsPerPage; i++) {
        const itemIndex = startIndex + i;
        const slotDiv = document.createElement('div');
        slotDiv.className = 'inventory-slot';

        // Check if an item exists at this position in our collection array
        if (itemIndex < caughtFishInventory.length) {
            const fishData = caughtFishInventory[itemIndex];
            
            const badgeDiv = document.createElement('div');
            badgeDiv.className = 'fish-badge';
            badgeDiv.innerText = fishData.name; // Displays the "fish" string
            
            slotDiv.appendChild(badgeDiv);
        }

        gridContainer.appendChild(slotDiv);
    }
}

// Open / Close Window Triggers
function openInventory() {
    isGameActive = false; // Freezes any backgrounds
    const invMenu = document.getElementById('inventoryMenu');
    if (invMenu) {
        invMenu.style.display = 'flex';
        currentInventoryIndex = 1;
        renderInventoryGrid();
    }
}

// --- SAVE & LOAD SYSTEM ---

// Saves current player state to localStorage
function saveGameProgress() {
    const gameState = {
        playerMoney: playerMoney,
        BaitNum: BaitNum,
        slotsPerPage: slotsPerPage,
        caughtFishInventory: caughtFishInventory,
        score: score
    };
    localStorage.setItem('fishingGameSave', JSON.stringify(gameState));
    console.log("Progress saved completely.");
}

// Loads player state from localStorage
function loadGameProgress() {
    const savedData = localStorage.getItem('fishingGameSave');
    if (savedData) {
        const gameState = JSON.parse(savedData);
        
        // Restore variables safely
        playerMoney = gameState.playerMoney ?? 0;
        BaitNum = gameState.BaitNum ?? 0;
        slotsPerPage = gameState.slotsPerPage ?? 12;
        caughtFishInventory = gameState.caughtFishInventory ?? [];
        score = gameState.score ?? 0;

        // Sync UI displays immediately
        if (scoreDisplay) scoreDisplay.innerText = score;
        updateShopUI();
        renderInventoryGrid();
        
        return true; // Save successfully loaded
    }
    return false; // No save data found
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

function resetGame() {
    hookState = 'IDLE';
    isFishing = false;
    reelVelocity = 0;
    spacebarPressed = false; // Reset input flag
    caughtFishElement = null;
    
    score = 0;
    if (scoreDisplay) scoreDisplay.innerText = score;
    if (chargeBar) chargeBar.style.width = '0%';
    if (rod) rod.style.transform = 'rotate(-15deg)';
    if (fishingLine) fishingLine.style.display = 'none';

    spawnCountdown = 250; 
    spawnFishSchool();
    startTimer();
    
    // FORCE ACTIVE STATE: Tells the physics loop to start processing engine variables
    isGameActive = true; 
}



// --- SHOP INTERACTIVE LOGIC MODULE ---

function updateShopUI() {
    const moneyDisplay = document.getElementById('moneyDisplay');
    if (moneyDisplay) {
        moneyDisplay.innerText = `Money: ${playerMoney}`;
    }
}

// 1. Navigation Routing: Hook Up Shop Button on Map
const shopBtn = document.querySelector('.shop-btn');
if (shopBtn) {
    shopBtn.addEventListener('click', () => {
        isGameActive = false; // Freeze live game tickers
    
        const shopMenu = document.getElementById('shopMenu');
        if (shopMenu) {
            shopMenu.style.display = 'flex';
            updateShopUI();
        }
    });
}

// 2. Navigation Routing: Exit Shop Back to Map
const shopBackToMapBtn = document.getElementById('shopBackToMapBtn');
if (shopBackToMapBtn) {
    shopBackToMapBtn.addEventListener('click', () => {
        const shopMenu = document.getElementById('shopMenu');
        if (shopMenu) shopMenu.style.display = 'none';
        gameContainer.className = 'state-map';
    });
}

// 3. Economics: Sell Caught Inventory 
const sellFishBtn = document.getElementById('sellFishBtn');
if (sellFishBtn) {
    sellFishBtn.addEventListener('click', () => {
        if (caughtFishInventory.length === 0) {
            alert("No fish available to sell!");
            return;
        }

        // Each fish caught converts into 10 Gold coins
        const earnings = caughtFishInventory.length * 10;
        playerMoney += earnings;
        
        // Empty inventory array entirely
        caughtFishInventory = [];
        
        updateShopUI();
        saveGameProgress();
        console.log(`Sold catch for $${earnings}. Wallet: $${playerMoney}`);
    });
}

// 4. Upgrades: Purchase Bait item
const buyBaitBtn = document.getElementById('buyBaitBtn');
if (buyBaitBtn) {
    buyBaitBtn.addEventListener('click', () => {
        const baitCost = 15;
        if (playerMoney >= baitCost) {
            playerMoney -= baitCost;
            BaitNum += 1; // Direct update to your procedural spawning arithmetic
            
            updateShopUI();
            saveGameProgress();
            alert(`Purchased 1 Bait! Current modifier: +${BaitNum} fish`);
        } else {
            alert(`Insufficient funds! Bait costs $${baitCost}.`);
        }
    });
}

// 5. Upgrades: Expand Grid Slot Size
const upgradeInvBtn = document.getElementById('upgradeInvBtn');
if (upgradeInvBtn) {
    upgradeInvBtn.addEventListener('click', () => {
        const upgradeCost = 50;
        if (playerMoney >= upgradeCost) {
            playerMoney -= upgradeCost;
            
            // Increment inventory slot grid size page thresholds
            slotsPerPage += 4; 
            
            updateShopUI();
            saveGameProgress();
            alert(`Inventory upgraded! Max view size per page increased to ${slotsPerPage} slots.`);
        } else {
            alert(`Insufficient funds! Upgrades cost $${upgradeCost}.`);
        }
    });
}

// --- FIXED SCREEN SYSTEM MENU CONTROLLERS ---

// 1. NEW GAME BUTTON
if (startBtn) {
    startBtn.addEventListener('click', () => {
        // Confirmation dialog so players don't accidentally wipe their hard work
        const confirmNew = confirm("Are you sure you want to start a New Game? This will reset all your Money, Bait, and Inventory upgrades!");
        
        if (confirmNew) {
            // Wipe data from local storage memory completely
            localStorage.removeItem('fishingGameSave');

            // Reset variables back to clean state
            caughtFishInventory = [];
            playerMoney = 0;
            BaitNum = 0;
            slotsPerPage = 12;
            score = 0;

            // Update user interfaces
            if (scoreDisplay) scoreDisplay.innerText = score;
            updateShopUI();
            renderInventoryGrid();

            // Send player straight to the map screen map
            gameContainer.className = 'state-map'; 
            if (mainMenu) mainMenu.style.display = 'none';

            const startMenuBox = document.getElementById('startMenuBox');
            const gameOverBox = document.getElementById('gameOverBox');
            if (startMenuBox) startMenuBox.style.display = 'block';
            if (gameOverBox) gameOverBox.style.display = 'none';
        }
    });
}

// 2. CONTINUE BUTTON
if (continueBtn) {
    continueBtn.addEventListener('click', () => {
        // Try to load an existing save file
        const hasSave = loadGameProgress();

        if (hasSave) {
            // An old save exists! Take them safely straight back to the map screen
            if (mainMenu) mainMenu.style.display = 'none';
            gameContainer.className = 'state-map';
            console.log("Welcome back! Save file loaded successfully.");
        } else {
            // No save file found in browser cache
            alert("No existing save file found! Starting a fresh profile instead.");
            
            // Trigger standard fresh setup parameters instead
            caughtFishInventory = [];
            playerMoney = 0;
            BaitNum = 0;
            slotsPerPage = 12;
            score = 0;
            
            if (mainMenu) mainMenu.style.display = 'none';
            gameContainer.className = 'state-map';
        }
    });
}
// --- SCREEN SYSTEM CONTROL MAPS ---

const inventoryBtn = document.getElementById('inventoryBtn');
if (inventoryBtn) {
    inventoryBtn.addEventListener('click', () => {
        openInventory();
    });
}

const backToMapBtn = document.getElementById('backToMapBtn');
if (backToMapBtn) {
    backToMapBtn.addEventListener('click', () => {
        // Drop the overlay completely
        if (mainMenu) mainMenu.style.display = 'none';
        
        // Route the application container back to your green layout map
        gameContainer.className = 'state-map';
    });
}

// Navigation Back To Map Controller
const invBackToMapBtn = document.getElementById('invBackToMapBtn');
if (invBackToMapBtn) {
    invBackToMapBtn.addEventListener('click', () => {
        const invMenu = document.getElementById('inventoryMenu');
        if (invMenu) invMenu.style.display = 'none';
        
        // Return visibility back onto the main map overlay layer
        gameContainer.className = 'state-map';
    });
}

// Next Page Arrow Handler
const invNextPageBtn = document.getElementById('invNextPageBtn');
if (invNextPageBtn) {
    invNextPageBtn.addEventListener('click', () => {
        const totalPages = Math.max(1, Math.ceil(caughtFishInventory.length / slotsPerPage));
        
        if (currentInventoryIndex < totalPages) {
            currentInventoryIndex++;
        } else {
            currentInventoryIndex = 1; // Loops right back around to page 1
        }
        renderInventoryGrid();
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
});

document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 't') {
        gameTimer=0; // Force timer to zero, triggering game over sequence immediately
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
               { 
                reelVelocity -= 9.5; 
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
        reelVelocity -= 0.3;  //low passive assist to the player 
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
