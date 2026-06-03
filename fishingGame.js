let  isGameActive = false; // prevents actions while in the menu
let  gameCreated =false; // tracks if the initial fish school has been created

const waterArea = document.getElementById('waterArea');
const rod = document.getElementById('rod');
const fishingLine = document.getElementById('fishingLine');
const chargeBar = document.getElementById('chargeBar');
const scoreDisplay = document.getElementById('score');

//gravity variables
let reelVelocity=0;  //Tracks how fast the hook is moving up or down 
const gravityPull=0.5; //constant force pulling the hook down when a fish is caught 

// Svg Trajectory elements 
const trajectorySvg = document.getElementById('trajectorySvg');
const aimArc = document.getElementById('aimArc');
const aimTarget = document.getElementById('aimTarget');

// Hook state variables
let hookState = 'IDLE'; // Possible states: 'IDLE', 'DROP', 'REEL'
let hookX = 0;
let hookY = 0;
let lineStartY = 0; 
let targetX = 0;
let caughtFishElement = null;

const hookSpeed = 6; 
let score = 0;
let isFishing = false;

//timer variables
let gameTimer= 60; // game duration in seconds
let countdownInterval = null;
const timerDisplay = document.getElementById('timerDisplay');


const fishData = [
    { id: 1, top: 60,   duration: '12s'},
    { id: 2, top: 120,  duration: '8s' },
    { id: 3, top: 180,  duration: '15s' },
    { id: 4, top: 240,  duration: '10s' },
    { id: 5, top: 300,  duration: '6s' }
];

function createFish() {
    waterArea.innerHTML = `
    <div class="fishing-line" id="fishingLine">
        <div class="hook"></div>
    </div>  
    `;
    const maxSwimDistance = waterArea.clientWidth - 95; 

    fishData.forEach(data => {
        const fish = document.createElement('div');
        fish.className = 'fish swimming';
        fish.innerText = 'fish';
        fish.style.top = `${data.top}px`;
        fish.style.left = `0px`; 

        const randomDelay = (Math.random() * -10).toFixed(2);
        fish.style.animationDelay = `${randomDelay}s`;
        fish.style.setProperty('--swim-distance', `${maxSwimDistance}px`);
        fish.style.setProperty('--swim-duration', data.duration);

        waterArea.appendChild(fish);
    });
}

// Track mouse movement over water area
  document.addEventListener('mousemove', (event) => {
    if (!isGameActive || isFishing) return; // Added !isGameActive
       

    const rect = waterArea.getBoundingClientRect();
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    
    const isOverWaterX = mouseX >= rect.left && mouseX <= rect.right;
    const isOverWaterY = mouseY >= rect.top && mouseY <= rect.bottom;

    if (isOverWaterX && isOverWaterY) {
        trajectorySvg.style.display = 'block';
        
        // ISSUE 3 FIX: Force the aim trajectory target to clip exactly to the water's surface line (rect.top)
        drawTrajectory(mouseX, rect.top); 
    } else {
        trajectorySvg.style.display = 'none';
        rod.style.transform = 'rotate(-15deg)'; 
    }
});


function drawTrajectory(targetX, targetY) {
    const rodPivot = document.querySelector('.rod-pivot').getBoundingClientRect();
    const pivotX = rodPivot.left + (rodPivot.width / 2);
    const pivotY = rodPivot.top + (rodPivot.height / 2);

    let angle = Math.atan2(targetY - pivotY, targetX - pivotX) * (180 / Math.PI);
    
    if (angle > 65) angle = 65;
    if (angle < -20) angle = -20;
    rod.style.transform = `rotate(${angle}deg)`;

    const rad = angle * (Math.PI / 180);
    const rodLength = 250; 
    const startX = pivotX + Math.cos(rad) * rodLength;
    const startY = pivotY + Math.sin(rad) * rodLength;

    const distanceX = targetX - startX;
    const arcPeakHeight = Math.max(40, Math.abs(distanceX) * 0.2); 
    const controlX = startX + (distanceX * 0.5);
    const controlY = Math.min(startY, targetY) - arcPeakHeight;

    aimArc.setAttribute('d', `M ${startX} ${startY} Q ${controlX} ${controlY} ${targetX} ${targetY}`);
    aimTarget.setAttribute('cx', targetX);
    aimTarget.setAttribute('cy', targetY);
}

// Click to drop hook sequence 
 waterArea.addEventListener('click', (event) => {
 if (!isGameActive || isFishing) return; // Added !isGameActive

    isFishing = true;
    trajectorySvg.style.display = 'none'; 

    
    targetX=event.clientX;
    
    const fishingLine = document.getElementById('fishingLine');
    const rodPivot = document.querySelector('.rod-pivot').getBoundingClientRect();
    const waterRect = waterArea.getBoundingClientRect();
    
    //Calculate line start positions relative to the water viewport bounds 
    const rad = 45 * (Math.PI / 180);
    const rodLength = 250;
    const absoluteLineStartY = (rodPivot.top + rodPivot.height / 2) + Math.sin(rad) * rodLength;
    
    

    // Convert absolute screen coordinates to relative positions inside the blue water grid
    lineStartY = absoluteLineStartY - waterRect.top;
    hookX = targetX - waterRect.left;
    hookY = 0;

    hookState = 'DROP';
    caughtFishElement = null;

    // Position the hook inside the blue water boundary system
    fishingLine.style.left = `${hookX}px`;
    fishingLine.style.top = `0px`;
    fishingLine.style.height = '0px';
    fishingLine.style.display = 'block';

    rod.style.transform = 'rotate(45deg)';

    requestAnimationFrame(updatePhysicsLoop);
});


// Real-time Physics Engine Loop
function updatePhysicsLoop() {
    const waterHeight = waterArea.clientHeight;
    const fishingLine = document.getElementById('fishingLine');

    if (hookState === 'DROP') {
        hookY += hookSpeed;
        fishingLine.style.height = `${hookY}px`;

        // Checks if hook hits the bottom of the water container bounds
        if (hookY >= waterHeight - 20) {
            hookState = 'REEL';
        }
    } 
    else if (hookState === 'REEL') {
        // Apply physics
        reelVelocity += gravityPull; 
        reelVelocity *= 0.95; // Smooth friction
        hookY += reelVelocity; 

        if (hookY >= waterHeight - 20) {
            hookY = waterHeight - 20;
            reelVelocity = 0; 
        }

        fishingLine.style.height = `${hookY}px`;

        if (caughtFishElement) {
            chargeBar.style.width = '100%'; 
            caughtFishElement.style.top = `${hookY - 15}px`;
        }

        // WIN CONDITION
        if (hookY <= 0) {
            hookState = 'IDLE';
            isFishing = false;
            fishingLine.style.display = 'none';
            chargeBar.style.width = '0%';
            rod.style.transform = 'rotate(-15deg)';
            reelVelocity = 0; 

            if (caughtFishElement) {
                caughtFishElement.remove(); 
                score++;
                scoreDisplay.innerText = score;
            }
        }
    }

    // FIX 1: Run collision check every single frame regardless of hook state
    // Only check if we haven't caught a fish yet
    if (hookState !== 'IDLE' && !caughtFishElement) {
        const currentHit = checkFishCollisions();
        if (currentHit) {
            hookState = 'REEL';
            caughtFishElement = currentHit;
            
            const computedStyle = window.getComputedStyle(caughtFishElement);
            const matrix = new WebKitCSSMatrix(computedStyle.transform);
            caughtFishElement.style.animation = 'none';
            caughtFishElement.style.left = `${matrix.m41}px`;
        }
    }

    if (hookState !== 'IDLE') {
        requestAnimationFrame(updatePhysicsLoop);
    }
}

// Accurate fish collision checks using element layout dimensions
function checkFishCollisions() {
    const fishes = document.querySelectorAll('.fish');
    const hookRect = document.querySelector('.hook').getBoundingClientRect();
    let hitTarget = null;

    fishes.forEach(fish => {
        const fishRect = fish.getBoundingClientRect();
        
        // Standard AABB bounding box collision checks
        const matchX = hookRect.left < fishRect.right && hookRect.right > fishRect.left;
        const matchY = hookRect.top < fishRect.bottom && hookRect.bottom > fishRect.top;

        if (matchX && matchY) {
            hitTarget = fish;
        }
    });

    return hitTarget;
}

function startTimer() {
    // Clear any old running timers first just to be safe
    clearInterval(countdownInterval); 
    gameTimer = 60; 
    timerDisplay.innerText = `Time: ${gameTimer}`;

    countdownInterval = setInterval(() => {
        if (!isGameActive) return; // Pause timer if user hits 'Tab' to menu

        gameTimer--;
        timerDisplay.innerText = `Time: ${gameTimer}`;

        if (gameTimer <= 0) {
            clearInterval(countdownInterval);
            handleGameOver(); 
        }
    }, 1000); // Runs exactly once per second
}

function handleGameOver() {
    isGameActive = false;
    hookState = 'IDLE';
    isFishing = false;
    
    // Bring up the main menu overlay and change the title to show they finished
    const mainMenu = document.getElementById('mainMenu');
    const menuTitle = document.querySelector('.menu-title');
    
    menuTitle.innerText = `TIME'S UP! SCORE: ${score}`;
    mainMenu.style.display = 'flex';
}

let resizeTimeout;
window.addEventListener('resize', () => {
    if (!isFishing) {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            createFish();
        }, 150);
    }
});

function resetGame(){
    hookState = 'IDLE';
    isFishing = false;
    reelVelocity = 0;
    
    score = 0;
    scoreDisplay.innerText = score;
    chargeBar.style.width = '0%';
    rod.style.transform = 'rotate(-15deg)';
    
    createFish();
    startTimer();
}

//Menu buttons 
const startBtn = document.getElementById('startBtn');
const mainMenu = document.getElementById('mainMenu');


startBtn.addEventListener('click', () => {
    resetGame(); // Resets all game state variables and starts fresh
    isGameActive = true;
    mainMenu.style.display = 'none'; // Hides the menu completely
});

continueBtn.addEventListener('click', () => {
    if(gameCreated==0){ //if game has not been created yet create it 
    resetGame(); // Resets all game state variables and starts fresh
    isGameActive = true;
    mainMenu.style.display = 'none'; // Hides the menu completely
    } else{
        isGameActive = true;
        mainMenu.style.display = 'none'; // Hides the menu completely
    }
});

//Key inputs
document.addEventListener('keydown', (event) => {
    // Check if the lowercase key or uppercase key matches 'r'
    if (event.key.toLowerCase() === 'r') {
        resetGame(); // Resets all game state variables and starts fresh
        console.log("Game reset successfully via hotkey.");
    }
});

document.addEventListener('keydown', (event) => {
    // Check if the lowercase key or uppercase key matches 'tab'
    if (event.key.toLowerCase() === 'tab') {
        if(isGameActive===false) return; // Prevents tabbing back to menu if game is already inactive
        isGameActive=false 
        mainMenu.style.display = 'flex'; // Show the menu again
    }
});

let spacebarPressed = false; // Track if Spacebar is currently held down

document.addEventListener('keydown', (event) => {
    // Check if the pressed key is the Spacebar
    if (event.code === 'Space') {
        // Prevent the page from scrolling down when pressing Space
        event.preventDefault(); 
        if(hookState === 'DROP') {
            hookState = 'REEL';
        }
        
        // Only allow mashing if a fish is hooked or the line is reeling in
        if (hookState === 'REEL') {
            if(caughtFishElement){ 
               if(!spacebarPressed){ //changes upward movement to based on mashing instead of automatic reel velocity when a fish is caught
                reelVelocity -= 6.5; // Negative value moves the hook UP towards 0
               }
            }
         spacebarPressed = true; // Set the flag to indicate Spacebar is being held down
                 
        }
    }
});
document.addEventListener('keyup', (event) => {
    // Check if the pressed key is the Spacebar
    if (event.code === 'Space') {
       spacebarPressed = false; // Reset the flag when Spacebar is released
     }
});
//Continuously pull the hook up if space is held down and NO fish is caught
function handlePassiveReel() {
    if (isGameActive && hookState === 'REEL' && spacebarPressed && !caughtFishElement) {
        reelVelocity -= 0.8; // Steady upward lift force while holding down
    }
    requestAnimationFrame(handlePassiveReel);
}
requestAnimationFrame(handlePassiveReel); // Start tracking passive holds
