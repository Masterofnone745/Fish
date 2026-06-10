// --- STATE MANAGEMENT AND GLOBAL CONSTANTS ---
let isGameActive = false;
let gameCreated = false;
let currentLocation = "B"; // Track chosen fishing location (A, B, or C)

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

const startBtn = document.getElementById('startBtn');
const continueBtn = document.getElementById('continueBtn');

// Physics Tuning Values
let reelVelocity = 0;
const gravityPull = 0.5;

// SVG Vector Trajectory Elements
const trajectorySvg = document.getElementById('trajectorySvg');
const aimArc = document.getElementById('aimArc');
const aimTarget = document.getElementById('aimTarget');

// Fish inventory variables
let caughtFishInventory = [];
let currentInventoryIndex = 1;
let slotsPerPage = 12;

// Structural Hook Properties
let hookState = 'IDLE';
let hookX = 0;
let hookY = 0;
let targetX = 0;
let caughtFishElement = null;

const hookSpeed = 6;
let score = 0;
let isFishing = false;
let playerMoney = 0;
let spacebarPressed = false;

// Time and Life Tracker Parameters
let gameTimer = 30;
let countdownInterval = null;
let activeFishes = [];

// Spawning System Settings
const MAX_FISH_CAP = 12; // Increased slightly to accommodate Point A cluster rushes
let BaitNum = 0;

const spawnTimerMax = 420;
let spawnCountdown = 250;

const fishData = [
  { id: 1, top: 60 },
  { id: 2, top: 120 },
  { id: 3, top: 180 },
  { id: 4, top: 240 },
  { id: 5, top: 300 }
];

// --- CORE PROCEDURAL GAME LOOPS ---

function spawnFishSchool() {
  activeFishes = [];
  document.querySelectorAll('.fish').forEach(f => f.remove());

  const currentWaterWidth = waterArea.clientWidth || window.innerWidth * 0.6;
  
  // Base spawn count configuration based on location profiles
  let baseSpawnCount = Math.floor(Math.random() * 4) + BaitNum;
  if (currentLocation === 'A') {
    baseSpawnCount = Math.floor(Math.random() * 5) + 4 + BaitNum; // Point A: High initial counts
  } else if (currentLocation === 'C') {
    baseSpawnCount = Math.floor(Math.random() * 2) + 1 + BaitNum; // Point C: Sparse initial counts
  }

  for (let i = 0; i < baseSpawnCount; i++) {
    const fishElement = document.createElement('div');
    fishElement.className = 'fish';
    fishElement.innerText = 'fish';

    // Rolling distinct weights per location profile
    let rolledWeight = 1.0;
    if (currentLocation === 'A') {
      rolledWeight = parseFloat((Math.random() * 1.2 + 0.6).toFixed(1)); // Point A: Small fish (0.6kg - 1.8kg)
    } else if (currentLocation === 'C') {
      rolledWeight = parseFloat((Math.random() * 3.5 + 3.5).toFixed(1)); // Point C: Giant fish (3.5kg - 7.0kg)
    } else {
      rolledWeight = parseFloat((Math.random() * 4 + 1).toFixed(1));      // Point B: Neutral (1.0kg - 5.0kg)
    }

    const visualScale = 1 + (rolledWeight - 1) * 0.2;
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
      speedY: Math.random() * 0.8 - 0.4,
      changeDirectionTimer: Math.random() * 60 + 30,
      weight: rolledWeight,
      visualScale: visualScale,
      width: 85,
      height: 30
    });
  }
}

function manageMidGameSpawning() {
  if (!isGameActive) return;

  spawnCountdown--;
  if (spawnCountdown <= 0) {
    // Point A resets its spawn countdown faster for rapid pacing
    spawnCountdown = (currentLocation === 'A') ? spawnTimerMax * 0.5 : spawnTimerMax;

    if (activeFishes.length >= MAX_FISH_CAP) return;

    // Baseline calculation rules
    let spawnChance = 0.30;
    const remainingSlots = MAX_FISH_CAP - activeFishes.length;

    if (activeFishes.length <= 1) {
      spawnChance = 0.80;
    } else {
      spawnChance += remainingSlots * 0.08;
    }

    // Location Profile Spawn Chance Modifiers
    if (currentLocation === 'A') {
      spawnChance += 0.30; // Highly boosted spawn frequency
    } else if (currentLocation === 'C') {
      spawnChance -= 0.15; // Low spawn frequency
    }

    spawnChance = Math.max(0.10, Math.min(spawnChance, 0.95));

    if (Math.random() < spawnChance) {
      const currentWaterWidth = waterArea.clientWidth || window.innerWidth * 0.6;
      
      // Dynamic Cluster Size Limits
      let maxClusterSize = 3;
      if (currentLocation === 'A') maxClusterSize = 5; // Point A can spawn a whole school at once
      if (currentLocation === 'C') maxClusterSize = 1; // Point C spawns strictly singular targets

      const maxPossibleSpawn = Math.min(maxClusterSize, MAX_FISH_CAP - activeFishes.length);
      const spawnCount = Math.floor(Math.random() * maxPossibleSpawn) + 1;

      for (let i = 0; i < spawnCount; i++) {
        let rolledWeight = 1.0;
        if (currentLocation === 'A') {
          rolledWeight = parseFloat((Math.random() * 1.2 + 0.6).toFixed(1)); 
        } else if (currentLocation === 'C') {
          rolledWeight = parseFloat((Math.random() * 3.5 + 3.5).toFixed(1)); 
        } else {
          rolledWeight = parseFloat((Math.random() * 4 + 1).toFixed(1));      
        }

        const visualScale = 1 + (rolledWeight - 1) * 0.2;
        
        // Depth tier distributions based on weight calculations
        let chosenDepth;
        if (rolledWeight < 2.0) {
          chosenDepth = fishData[Math.floor(Math.random() * 2)].top; 
        } else if (rolledWeight < 3.5) {
          chosenDepth = fishData[2].top; 
        } else {
          chosenDepth = fishData[Math.floor(Math.random() * 2) + 3].top; 
        }

        const startLeft = Math.random() > 0.5;
        const initialX = startLeft ? -80 : currentWaterWidth + 80;

        const fishElement = document.createElement('div');
        fishElement.className = 'fish';
        fishElement.innerText = 'fish';
        fishElement.style.top = `${chosenDepth}px`;
        fishElement.style.left = `${initialX}px`;
        waterArea.appendChild(fishElement);

        activeFishes.push({
          element: fishElement,
          x: initialX,
          y: chosenDepth,
          weight: rolledWeight,
          visualScale: visualScale,
          speedX: (Math.random() * 1.5 + 1) * (startLeft ? 1 : -1),
          speedY: Math.random() * 0.4 - 0.2, 
          changeDirectionTimer: Math.random() * 60 + 30,
          width: 85,
          height: 30
        });
      }
    }
  }
}

function startTimer() {
  clearInterval(countdownInterval);
  gameTimer = 30;
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
  gameCreated = false;

  let currentHighScore = parseInt(localStorage.getItem('fishingHighScore')) || 0;

  if (score > currentHighScore) {
    currentHighScore = score;
    localStorage.setItem('fishingHighScore', currentHighScore);
  }

  const finalScoreSpan = document.getElementById('finalScore');
  const highScoreSpan = document.getElementById('highScoreDisplay');

  if (finalScoreSpan) finalScoreSpan.innerText = score;
  if (highScoreSpan) highScoreSpan.innerText = currentHighScore;

  const startMenuBox = document.getElementById('startMenuBox');
  const gameOverBox = document.getElementById('gameOverBox');

  if (startMenuBox) startMenuBox.style.display = 'none';
  if (gameOverBox) gameOverBox.style.display = 'block';

  if (mainMenu) mainMenu.style.display = 'flex';
  gameContainer.className = 'state-menu';
}

// --- REAL-TIME RUNTIME PHYSICS LOOP ---
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

    if (caughtFishElement) {
      const caughtFishData = activeFishes.find(f => f.element === caughtFishElement);
      if (caughtFishData) {
        let fishWeightNum = parseFloat(caughtFishData.weight) || 1.0;
        
        // Balanced physics parameters to handle bigger fish at point C comfortably
        activeGravity += fishWeightNum * 0.05;

        // HIGH INTENSITY FIGHT STRUGGLE MECHANIC
        const rapidFightCycle = Math.sin(Date.now() / 100);
        if (Math.abs(rapidFightCycle) > 0.3) {
          activeGravity += (fishWeightNum * 0.12) * Math.abs(rapidFightCycle);
          const thrashOffset = (Math.random() * 10 - 5) * (fishWeightNum * 0.5);
          caughtFishElement.style.transform = `scale(${caughtFishData.visualScale || 1}) translateX(${thrashOffset}px) rotate(${rapidFightCycle * 10}deg)`;
        } else {
          caughtFishElement.style.transform = `scale(${caughtFishData.visualScale || 1}) translateX(0px) rotate(0deg)`;
        }
      }
    }

    // Apply integrated physical acceleration variables
    reelVelocity += activeGravity; 

    reelVelocity *= 0.90; 
    hookY += reelVelocity; 

    // Hard ground boundaries enforcement
    if (hookY >= waterHeight - 20) {
      hookY = waterHeight - 20;
      if (reelVelocity > 0) reelVelocity = 0;
    }

    if (fishingLine) fishingLine.style.height = `${hookY}px`;

    if (caughtFishElement) {
      const fishDataInstance = activeFishes.find(f => f.element === caughtFishElement);
      if (fishDataInstance) {
        fishDataInstance.y = hookY - 15;
        fishDataInstance.element.style.top = `${fishDataInstance.y}px`;
      }
    }

    if (hookY <= 0) {
      hookY = 0;
      hookState = 'IDLE';
      isFishing = false;

      if (fishingLine) fishingLine.style.display = 'none';
      if (rod) rod.style.transform = 'rotate(-15deg)';
      reelVelocity = 0;

      if (chargeBar) chargeBar.style.width = '0%';

      if (caughtFishElement) {
        const finalFishData = activeFishes.find(f => f.element === caughtFishElement);
        let finalWeight = 1.0;

        if (finalFishData && finalFishData.weight) {
          finalWeight = parseFloat(finalFishData.weight) || 1.0;
        }
        const fishPayout = Math.round(finalWeight * 10);

        activeFishes = activeFishes.filter(f => f.element !== caughtFishElement);
        
        caughtFishInventory.push({
          name: `${finalWeight}kg fish`,
          caughtAt: Date.now(),
          weight: finalWeight,
          price: fishPayout
        });

        renderInventoryGrid();
        saveGameProgress();

        caughtFishElement.remove();
        caughtFishElement = null;

        score++;
        if(scoreDisplay) scoreDisplay.innerText = score;

        gameTimer += Math.round(finalWeight * 0.5); // Reward extra time for successful catch

       if(timerDisplay) {
        timerDisplay.innerText = `Time: ${gameTimer}`;
      }
    }
   }
  }

  // --- PROGRAMMATIC COLLISION MODULE AND INSTANT FIGHT ENTRY ---
  if (hookState === 'REEL' && !caughtFishElement && hookY < (waterHeight - 22)) {
    const currentHit = checkFishCollisions();
    if (currentHit) {
      caughtFishElement = currentHit;
      
      const fishDataInstance = activeFishes.find(f => f.element === caughtFishElement);
      if (fishDataInstance) {
        fishDataInstance.speedX = 0; 
        fishDataInstance.speedY = 0;
        
        const fishWeightNum = parseFloat(fishDataInstance.weight) || 1.0;
        reelVelocity = fishWeightNum * 4; // Instant downward dynamic line snap!
        
        const dynamicWidth = fishDataInstance.width * fishDataInstance.visualScale;
        fishDataInstance.x = hookX - (dynamicWidth / 2);
        
        const instantJerkX = Math.random() > 0.5 ? 8 : -8;
        fishDataInstance.element.style.left = `${fishDataInstance.x + instantJerkX}px`;
        fishDataInstance.element.style.top = `${hookY - 15}px`;
      }
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
    if (caughtFishElement && fish.element === caughtFishElement) {
      fish.speedX = 0;
      fish.speedY = 0;
      return;
    }

    fish.changeDirectionTimer--;
    if (fish.changeDirectionTimer <= 0) {
      const weightSpeedModifier = Math.max(0.3, 2 / (fish.weight || 1));
      
      fish.speedX += (Math.random() * 1 - 0.5) * weightSpeedModifier;
      fish.speedY = (Math.random() * 1.2 - 0.6) * weightSpeedModifier;

      fish.speedX = Math.max(Math.min(fish.speedX, 3), -3);
      fish.speedY = Math.max(Math.min(fish.speedY, 0.8), -0.8);

      fish.changeDirectionTimer = Math.random() * 90 + 40;
    }

    fish.x += fish.speedX;
    fish.y += fish.speedY;

    if (fish.speedX > 0 && fish.x > screenWidth + 40) {
      fish.speedX *= -1;
    } else if (fish.speedX < 0 && fish.x < -90) {
      fish.speedX *= -1;
    }

    // Apply strict depth clamping ranges based on weight metrics
    let minY = 30;
    let maxY = screenHeight - 50;

    if (fish.weight < 2.0) {
      maxY = 150; // Light fish stay shallow
    } else if (fish.weight >= 3.5) {
      minY = 200; // Heavy fish stay deep
    }

    if (fish.y < minY) {
      fish.y = minY;
      fish.speedY *= -1;
    } else if (fish.y > maxY) {
      fish.y = maxY;
      fish.speedY *= -1;
    }

    fish.element.style.left = `${fish.x}px`;
    fish.element.style.top = `${fish.y}px`;

    const scaleX = fish.speedX > 0 ? 1 : -1;
    fish.element.style.transform = `scale(${fish.visualScale}, ${fish.visualScale}) scaleX(${scaleX})`;
  });
}

function checkFishCollisions() {
  const lineTolerance = 10; 

  for (let fish of activeFishes) {
    if (caughtFishElement && fish.element === caughtFishElement) continue;

    const fishCenterX = fish.x + (fish.width * fish.visualScale) / 2;
    const matchX = Math.abs(hookX - fishCenterX) < ((fish.width * fish.visualScale) / 2 + lineTolerance);
    const matchY = hookY >= fish.y && hookY <= (fish.y + (fish.height * fish.visualScale));

    if (matchX && matchY) {
      return fish.element;
    }
  }
  return null;
}

function drawTrajectory(targetX, targetY) {
  const pivotElement = document.querySelector('.rod-pivot');
  if (!pivotElement) return;

  const rodPivot = pivotElement.getBoundingClientRect();
  const pivotX = rodPivot.left + rodPivot.width / 2;
  const pivotY = rodPivot.top + rodPivot.height / 2;

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
  const controlX = startX + distanceX * 0.5;
  const controlY = Math.min(startY, targetY) - arcPeakHeight;

  if (aimArc) aimArc.setAttribute('d', `M ${startX} ${startY} Q ${controlX} ${controlY} ${targetX} ${targetY}`);
  if (aimTarget) {
    aimTarget.setAttribute('cx', targetX);
    aimTarget.setAttribute('cy', targetY);
  }
}

function renderInventoryGrid() {
  const gridContainer = document.getElementById('inventoryGrid');
  if (!gridContainer) return;

  // Clear previous icons/badges completely
  gridContainer.innerHTML = '';

  // Loop through absolutely every single caught fish in the list
  caughtFishInventory.forEach(fishDataItem => {
    // Create the uniform slot wrapper
    const slotDiv = document.createElement('div');
    slotDiv.className = 'inventory-slot';

    // Create the visual text badge inside that slot
    const badgeDiv = document.createElement('div');
    badgeDiv.className = 'fish-badge';
    badgeDiv.innerText = fishDataItem.name;
    
    slotDiv.appendChild(badgeDiv);
    gridContainer.appendChild(slotDiv);
  });

  // Optional: If you have an empty/placeholder view state you want to show when empty
  if (caughtFishInventory.length === 0) {
    gridContainer.innerHTML = '<div style="color: #aaa; padding: 20px;">No catches yet! Go fish!</div>';
  }
}

// --- OPERATIONS REGISTRATION AND INPUTS ---
function openInventory() {
  isGameActive = false;
  const invMenu = document.getElementById('inventoryMenu');
  if (invMenu) {
    invMenu.style.display = 'flex';
    currentInventoryIndex = 1;
    renderInventoryGrid();
  }
}

function saveGameProgress() {
  const gameState = {
    playerMoney,
    BaitNum,
    slotsPerPage,
    caughtFishInventory,
    score
  };
  localStorage.setItem('fishingGameSave', JSON.stringify(gameState));
}

function loadGameProgress() {
  const savedData = localStorage.getItem('fishingGameSave');
  if (savedData) {
    const gameState = JSON.parse(savedData);

    playerMoney = gameState.playerMoney ?? 0;
    BaitNum = gameState.BaitNum ?? 0;
    slotsPerPage = gameState.slotsPerPage ?? 12;
    score = gameState.score ?? 0;

    const rawInventory = gameState.caughtFishInventory ?? [];
    caughtFishInventory = rawInventory.map(fish => {
      const wt = fish.weight ? parseFloat(fish.weight) : 1.0;
      return {
        name: fish.name,
        caughtAt: fish.caughtAt,
        weight: wt,
        price: fish.price ?? Math.round(wt * 10)
      };
    });

    if (scoreDisplay) scoreDisplay.innerText = score;
    updateShopUI();
    renderInventoryGrid();

    return true;
  }
  return false;
}

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

  hookX = targetX - waterRect.left;
  hookY = 0;
  reelVelocity = 0;

  hookState = 'DROP';
  caughtFishElement = null;

  if (fishingLine) {
    fishingLine.style.left = `${hookX}px`;
    fishingLine.style.top = '0px';
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
  spacebarPressed = false;
  caughtFishElement = null;

  score = 0;
  if (scoreDisplay) scoreDisplay.innerText = score;
  if (chargeBar) chargeBar.style.width = '0%';
  if (rod) rod.style.transform = 'rotate(-15deg)';
  if (fishingLine) fishingLine.style.display = 'none';

  spawnCountdown = 250;
  spawnFishSchool();
  startTimer();

  isGameActive = true;
}

function updateShopUI() {
  const moneyDisplay = document.getElementById('moneyDisplay');
  if (moneyDisplay) {
    moneyDisplay.innerText = `Money: $${playerMoney}`;
  }
}

const shopBtn = document.querySelector('.shop-btn');
if (shopBtn) {
  shopBtn.addEventListener('click', () => {
    isGameActive = false;
    const shopMenu = document.getElementById('shopMenu');
    if (shopMenu) {
      shopMenu.style.display = 'flex';
      updateShopUI();
    }
  });
}

const shopBackToMapBtn = document.getElementById('shopBackToMapBtn');
if (shopBackToMapBtn) {
  shopBackToMapBtn.addEventListener('click', () => {
    const shopMenu = document.getElementById('shopMenu');
    if (shopMenu) shopMenu.style.display = 'none';
    gameContainer.className = 'state-map';
  });
}

const sellFishBtn = document.getElementById('sellFishBtn');
if (sellFishBtn) {
  sellFishBtn.addEventListener('click', () => {
    if (caughtFishInventory.length === 0) {
      alert('No fish available to sell!');
      return;
    }

    let earnings = 0;
    caughtFishInventory.forEach(f => {
      earnings += f.price || 0;
    });

    playerMoney += earnings;
    caughtFishInventory = []; 

    updateShopUI();
    saveGameProgress();
    renderInventoryGrid();
    alert(`Sold catches for $${earnings}!`);
  });
}

const buyBaitBtn = document.getElementById('buyBaitBtn');
if (buyBaitBtn) {
  buyBaitBtn.addEventListener('click', () => {
    const baitCost = 15;
    if (playerMoney >= baitCost) {
      playerMoney -= baitCost;
      BaitNum += 1;

      updateShopUI();
      saveGameProgress();
      alert(`Purchased 1 Bait! Current modifier: +${BaitNum} fish`);
    } else {
      alert(`Insufficient funds! Bait costs $${baitCost}.`);
    }
  });
}

const upgradeInvBtn = document.getElementById('upgradeInvBtn');
if (upgradeInvBtn) {
  upgradeInvBtn.addEventListener('click', () => {
    const upgradeCost = 50;
    if (playerMoney >= upgradeCost) {
      playerMoney -= upgradeCost;
      slotsPerPage += 4;

      updateShopUI();
      saveGameProgress();
      alert(`Inventory upgraded! Max view size per page increased to ${slotsPerPage} slots.`);
    } else {
      alert(`Insufficient funds! Upgrades cost $${upgradeCost}.`);
    }
  });
}

if (startBtn) {
  startBtn.addEventListener('click', () => {
    const confirmNew = confirm('Are you sure you want to start a New Game? This will completely wipe out your highscore, money, and structural upgrades!');

    if (confirmNew) {
      localStorage.removeItem('fishingGameSave');
      localStorage.removeItem('fishingHighScore');

      caughtFishInventory = [];
      playerMoney = 0;
      BaitNum = 0;
      slotsPerPage = 12;
      score = 0;

      if (scoreDisplay) scoreDisplay.innerText = score;
      
      const highScoreSpan = document.getElementById('highScoreDisplay');
      if (highScoreSpan) highScoreSpan.innerText = '0';
      
      updateShopUI();
      renderInventoryGrid();

      gameContainer.className = 'state-map';
      if (mainMenu) mainMenu.style.display = 'none';

      const startMenuBox = document.getElementById('startMenuBox');
      const gameOverBox = document.getElementById('gameOverBox');
      if (startMenuBox) startMenuBox.style.display = 'block';
      if (gameOverBox) gameOverBox.style.display = 'none';
    }
  });
}

if (continueBtn) {
  continueBtn.addEventListener('click', () => {
    const hasSave = loadGameProgress();

    if (hasSave) {
      if (mainMenu) mainMenu.style.display = 'none';
      gameContainer.className = 'state-map';
    } else {
      alert('No existing save file found! Starting a fresh profile instead.');

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

const inventoryBtn = document.getElementById('inventoryBtn');
if (inventoryBtn) {
  inventoryBtn.addEventListener('click', () => {
    openInventory();
  });
}

const backToMapBtn = document.getElementById('backToMapBtn');
if (backToMapBtn) {
  backToMapBtn.addEventListener('click', () => {
    if (mainMenu) mainMenu.style.display = 'none';
    gameContainer.className = 'state-map';
  });
}

const invBackToMapBtn = document.getElementById('invBackToMapBtn');
if (invBackToMapBtn) {
  invBackToMapBtn.addEventListener('click', () => {
    const invMenu = document.getElementById('inventoryMenu');
    if (invMenu) invMenu.style.display = 'none';
    gameContainer.className = 'state-map';
  });
}

const invNextPageBtn = document.getElementById('invNextPageBtn');
if (invNextPageBtn) {
  invNextPageBtn.addEventListener('click', () => {
    const totalPages = Math.max(1, Math.ceil(caughtFishInventory.length / slotsPerPage));

    if (currentInventoryIndex < totalPages) {
      currentInventoryIndex++;
    } else {
      currentInventoryIndex = 1;
    }
    renderInventoryGrid();
  });
}

// Map Node click setup that updates currentLocation dynamically
document.querySelectorAll('.map-node').forEach(node => {
  node.addEventListener('click', (event) => {
    const chosenLocationId = event.target.getAttribute('data-location') || 'B';
    currentLocation = chosenLocationId.toUpperCase();
    console.log(`Loading fishing spot: ${currentLocation}`);

    gameContainer.className = 'state-gameplay';
    isGameActive = true;
    gameCreated = true;

    setTimeout(() => {
      resetGame();
    }, 30);
  });
});

// --- INPUT KEY MAPPER MECHANICS ---
document.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();

  if (key === 'r') {
    resetGame();
  } else if (key === 't') {
    gameTimer = 0;
  } else if (key === 'tab') {
    event.preventDefault();
    
    // GUARD: Only open the menu if the game is NOT already showing it
    if (gameContainer.className !== 'state-menu') {
      // 1. Halt active gameplay engines
      isGameActive = false;
      isFishing = false;
      hookState = 'IDLE';
      
      // 2. Clear out ongoing visual rendering components
      if (trajectorySvg) trajectorySvg.style.display = 'none';
      if (fishingLine) fishingLine.style.display = 'none';
      if (rod) rod.style.transform = 'rotate(-15deg)';
      
      // 3. Toggle Menu Displays
      const startMenuBox = document.getElementById('startMenuBox');
      const gameOverBox = document.getElementById('gameOverBox');
      
      if (startMenuBox) startMenuBox.style.display = 'block'; 
      if (gameOverBox) gameOverBox.style.display = 'none';
      if (mainMenu) mainMenu.style.display = 'flex';          
      
      gameContainer.className = 'state-menu';

      const menuTitle = document.querySelector('.menu-title');
      if (menuTitle) menuTitle.innerText = 'GAME PAUSED';
    }
    
  } else if (event.code === 'Space') { // <-- FIX: Properly separated out from Tab
    event.preventDefault();
    if (hookState === 'DROP') {
      hookState = 'REEL';
    }

    if (hookState === 'REEL') {
      reelVelocity -= 11.0; 
      spacebarPressed = true;
    }
  }
});

// --- FRAME RATE LOOP MANAGEMENT TICKERS ---
function tickFishAnimation() {
  if (isGameActive) {
    updateFishMovement();
    manageMidGameSpawning();
  }
  requestAnimationFrame(tickFishAnimation);
}
requestAnimationFrame(tickFishAnimation);

function handlePassiveReel() {
  if (isGameActive && hookState === 'REEL' && spacebarPressed && caughtFishElement) {
    reelVelocity -= 0.45;
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
