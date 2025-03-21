// Helper function to escape HTML special characters
function escapeHtml(text) {
  if (!text) return "";
  return text
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\//g, "&#x2F;")
    .replace(/`/g, "&#x60;");
}
//tiles animation state
let isAnimating = false;
// Game state
const gameState = (function () {
  // Create a private state object with default values
  const state = {
    score: 0,
    previousScore: 0,
    letters: [],
    placedTiles: [],
    selectedTile: null,
    boardSize: 5, // Changed from 7 to 5
    isCenterOccupied: false,
    isFirstMove: true,
    gameCompleted: false,
    validationErrors: [],
    wordList: null,
    wordData: {
      foundWords: [],
      invalidWords: [],
    },
    // For wildcard selection
    currentWildcardTile: null,
    currentWildcardPos: { row: null, col: null },
    // Letter values (Scrabble-like)
    letterValues: {
      A: 1,
      B: 3,
      C: 3,
      D: 2,
      E: 1,
      F: 4,
      G: 2,
      H: 4,
      I: 1,
      J: 8,
      K: 5,
      L: 1,
      M: 3,
      N: 1,
      O: 1,
      P: 3,
      Q: 10,
      R: 1,
      S: 1,
      T: 1,
      U: 1,
      V: 4,
      W: 4,
      X: 8,
      Y: 4,
      Z: 10,
      "*": 0, // Wildcard
    },
    // For mobile detection
    isMobileDevice: false,
    // Stats tracking
    stats: {
      gamesPlayed: 0,
      highestScore: 0,
      totalTilesPlaced: 0,
      wordsFormed: 0,
      longestWord: "",
      highestScoringWord: { word: "", score: 0 },
    },
    // Achievements
    achievements: {
      firstGame: {
        unlocked: false,
        icon: "🎮",
        name: "First Game",
        description: "Complete your first game",
        displayOrder: 1,
      },
      scoreBreaker: {
        unlocked: false,
        icon: "🏆",
        name: "Score Breaker",
        description: "Score over 200 points",
        displayOrder: 2,
      },
      wordMaster: {
        unlocked: false,
        icon: "📚",
        name: "Word Master",
        description: "Form at least 8 words in one game",
        displayOrder: 3,
      },
      longWord: {
        unlocked: false,
        icon: "📏",
        name: "Logophile",
        description: "Form a word with 5+ letters",
        displayOrder: 4,
      },
      perfectBoard: {
        unlocked: false,
        icon: "✨",
        name: "Perfect Board",
        description: "Use all your tiles",
        displayOrder: 5,
      },
      highScorer: {
        unlocked: false,
        icon: "🌟",
        name: "High Scorer",
        description: "Score 30+ points in a single word",
        displayOrder: 6,
      },
      allSpecials: {
        unlocked: false,
        icon: "🎯",
        name: "Bonus Hunter",
        description: "Use all special squares",
        displayOrder: 7,
      },
      wildMaster: {
        unlocked: false,
        icon: "🃏",
        name: "Wild Master",
        description: "Use all wildcards",
        displayOrder: 8,
      },
    },
  };

  // Create a proxy with validation to prevent direct manipulation
  return new Proxy(state, {
    set(target, property, value) {
      // Allow certain properties to be changed normally
      const allowedDirectProperties = [
        "score",
        "previousScore",
        "selectedTile",
        "isCenterOccupied",
        "isFirstMove",
        "gameCompleted",
        "validationErrors",
        "wordList",
        "currentWildcardTile",
        "currentWildcardPos",
        "isMobileDevice",
        "needBonusAnimation",
        "mobileTileRack",
        "touchedTile",
        "touchMode",
        "targetCell",
        "lastTouchEvent",
        "currentDraggedTile",
      ];

      // Only allow basic values to be set directly
      if (allowedDirectProperties.includes(property)) {
        target[property] = value;
        return true;
      }

      // Protect critical properties from direct assignment
      if (property === "letterValues") {
        console.warn("Attempt to manipulate letter values prevented");
        return true; // Return true to prevent error but don't change the values
      }

      if (property === "specialSquares") {
        // Only allow setting specialSquares during game initialization
        if (!target.specialSquares) {
          target[property] = value;
        } else {
          console.warn("Attempt to manipulate special squares prevented");
        }
        return true;
      }

      if (property === "letters") {
        // Only allow array operations on letters through the proper game functions
        if (Array.isArray(value) && value.length === 0) {
          // Allow clearing the array (which happens in placeTileOnBoard)
          target[property] = value;
        } else if (!target.gameCompleted && target.letters.length === 0) {
          // Allow initial assignment when the array is empty (during initialization)
          target[property] = value;
        } else if (Array.isArray(value) && target.letters !== value) {
          // For other cases, we deep clone and validate any incoming array to prevent manipulation
          // This ensures shuffle, pop and other legitimate operations work while preventing direct assignment
          console.warn(
            "Letters array manipulation should happen through game functions"
          );
          // Allow the change through normal methods but log the warning
          target[property] = value;
        }
        return true;
      }

      if (property === "placedTiles") {
        // Only allow array operations on placedTiles through the proper game functions
        if (Array.isArray(value)) {
          target[property] = value;
        }
        return true;
      }

      if (property === "wordData") {
        // Allow changes to word data object
        target[property] = value;
        return true;
      }

      // For other properties, allow setting normally
      target[property] = value;
      return true;
    },

    get(target, property) {
      // Return a copy of arrays to prevent direct manipulation
      if (property === "letters" && Array.isArray(target[property])) {
        return target[property]; // Return the reference directly to allow legitimate operations
      }

      if (property === "letterValues") {
        // Return a copy of the letterValues to prevent direct modification
        return { ...target[property] };
      }

      // For other properties, return normally
      return target[property];
    },
  });
})();

// Fake leaderboard data (will be combined with real user score)
const leaderboardData = [
  { name: "WordWizard", score: 285 },
  { name: "LetterMaster", score: 267 },
  { name: "TileKing", score: 254 },
  { name: "ScrabblePro", score: 239 },
  { name: "WordSmith", score: 226 },
  { name: "AlphabetSoup", score: 215 },
  { name: "VowelVoyager", score: 202 },
  { name: "TileTitan", score: 186 },
  { name: "WordNinja", score: 173 },
  { name: "LexiconLord", score: 154 },
];

// Initialize the game
document.addEventListener("DOMContentLoaded", async () => {
  // Detect mobile device
  detectMobileDevice();

  // For testing: Clear previous game state
  if (location.search.includes("test=true")) {
    localStorage.removeItem("wordcraftGame");
    localStorage.removeItem("wordcraftStats");
    localStorage.removeItem("wordcraftAchievements");
    localStorage.removeItem("tutorialCompleted");
  }

  // Load saved stats and achievements
  loadPlayerData();
  if (gameState.isMobileDevice && screen.width <= 768) {
    document.getElementById("tileAreaDesktop").remove();
  } else if (gameState.isMobileDevice && screen.width > 768) {
    document.getElementById("tileAreaMobile").remove();
  } else {
    document.getElementById("tileAreaMobile").remove();
  }

  // Load the word list
  await loadWordList();

  // Check if game was completed today
  checkGameStatus();

  createGameBoard();
  initializeTiles();
  setupEventListeners();

  // Setup mobile-specific gestures if on mobile
  if (gameState.isMobileDevice) {
    setupMobileGestures();

    // IMPORTANT FIX: Prevent Safari/iOS from handling touch events in ways we don't want
    // This makes tap-select and tap-place more reliable by preventing browser tap behaviors
    document.addEventListener(
      "touchstart",
      function (e) {
        if (e.target.closest(".tile") || e.target.closest(".board-cell")) {
          e.preventDefault(); // Prevent Safari from handling the touch event
        }
      },
      { passive: false }
    );

    // Extra mobile-specific setup
    setupExtraMobileHandlers();
  }

  // Always show welcome modal first, tutorial only shown by button click
  showWelcomeModal();

  // Start the live score calculation
  validateBoard();
});

// Load player stats and achievements from localStorage
function loadPlayerData() {
  // Load stats
  const savedStats = localStorage.getItem("wordcraftStats");
  if (savedStats) {
    gameState.stats = JSON.parse(savedStats);
  }

  // Load achievements
  const savedAchievements = localStorage.getItem("wordcraftAchievements");
  if (savedAchievements) {
    gameState.achievements = JSON.parse(savedAchievements);
  }
}

// Save player stats and achievements to localStorage
function savePlayerData() {
  localStorage.setItem("wordcraftStats", JSON.stringify(gameState.stats));
  localStorage.setItem(
    "wordcraftAchievements",
    JSON.stringify(gameState.achievements)
  );
}

// Detect if the user is on a mobile device
function detectMobileDevice() {
  gameState.isMobileDevice =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth <= 768;

  // Add a mobile class to the body for CSS targeting if needed
  if (gameState.isMobileDevice) {
    document.body.classList.add("mobile-device");
  }

  console.log("Mobile device detected:", gameState.isMobileDevice);
}

// Load the word list
async function loadWordList() {
  try {
    const response = await fetch("wordcraft_dictionary.json");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const wordData = await response.json();

    // Create a Set for each word length for efficient lookup
    gameState.wordList = {};
    for (const length in wordData) {
      if (wordData.hasOwnProperty(length)) {
        gameState.wordList[length] = new Set(wordData[length]);
      }
    }

    console.log(
      "Dictionary loaded successfully with",
      Object.keys(gameState.wordList).length,
      "length categories"
    );

    // Test a few common words for verification
    console.log("Dictionary verification:");
    const testWords = ["at", "the", "cat", "game", "board"];
    testWords.forEach((word) => {
      const lengthKey = word.length.toString();
      const exists = gameState.wordList[lengthKey]
        ? gameState.wordList[lengthKey].has(word)
        : false;
      console.log(`Word "${word}": ${exists}`);
    });
  } catch (error) {
    console.error("Error loading dictionary:", error);
    showToast(
      "Couldn't load dictionary. Using simplified word validation.",
      "error"
    );
  }
}

// Check if a word is valid
function isValidWord(word) {
  // If dictionary isn't loaded, consider all words valid
  if (!gameState.wordList) return true;

  // Words must be at least 2 letters long
  if (word.length < 2) return false;

  // Get the appropriate word length category
  const lengthKey = word.length.toString();
  if (!gameState.wordList[lengthKey]) {
    return false; // No words of this length in the dictionary
  }

  // Convert word to lowercase
  const wordToCheck = word.toLowerCase();

  // Direct lookup in the Set (already lowercase from our dictionary)
  return gameState.wordList[lengthKey].has(wordToCheck);
}

// Check if game was already completed today
function checkGameStatus() {
  // For testing: Always allow new games and reset score submission flag
  if (location.search.includes("test=true")) {
    gameState.gameCompleted = false;
    localStorage.removeItem("scoreSubmittedToday");
    console.log("TEST MODE: Reset game completion and score submission flags");
    return;
  }

  const savedData = localStorage.getItem("wordcraftGame");
  if (savedData) {
    const gameData = JSON.parse(savedData);
    const lastPlayed = new Date(gameData.date);
    const today = new Date();

    // If game was completed today
    if (lastPlayed.toDateString() === today.toDateString()) {
      gameState.gameCompleted = true;
      gameState.score = gameData.score;

      // Also restore player stats and achievements
      loadPlayerData();

      // Check if we're returning from a previous visit where modal was closed
      const modalWasClosed = localStorage.getItem("modalClosed");
      if (modalWasClosed && modalWasClosed === today.toDateString()) {
        // Show post-game message with countdown instead of modal
        document.getElementById("postGameMessage").style.display = "flex";
        updatePostGameCountdown();
        disableGameInteractions();
      } else {
        // Show leaderboard directly with a slight delay
        setTimeout(() => {
          showFinishGameModal(gameData.score);
        }, 500);
      }
    } else {
      // It's a new day, reset the score submission flag
      localStorage.removeItem("scoreSubmittedToday");
    }
  }
}

// Create the game board
function createGameBoard() {
  const boardElement = document.getElementById("gameBoard");
  const centerPosition = Math.floor(gameState.boardSize / 2);

  // Generate a seed based on the current date for consistent daily layout
  const today = new Date();
  const seed =
    today.getFullYear() * 10000 +
    (today.getMonth() + 1) * 100 +
    today.getDate();

  // Generate random special squares based on the daily seed
  const specialSquares = generateRandomSpecialSquares(seed);

  // Track whether we need to run the animation
  gameState.needBonusAnimation = !gameState.gameCompleted;
  gameState.specialSquares = specialSquares;

  // Create the 5x5 grid
  for (let row = 0; row < gameState.boardSize; row++) {
    for (let col = 0; col < gameState.boardSize; col++) {
      const cell = document.createElement("div");
      cell.className = "board-cell";
      cell.dataset.row = row;
      cell.dataset.col = col;

      // Center square
      if (row === centerPosition && col === centerPosition) {
        cell.classList.add("center");
        cell.classList.add("empty");

        // No more toast specifically about center square requirement
      }

      // Apply special squares immediately if game is already completed
      if (gameState.gameCompleted) {
        const specialSquare = specialSquares.find(
          (sq) => sq.row === row && sq.col === col
        );
        if (specialSquare) {
          cell.classList.add(specialSquare.type);
          cell.dataset.bonus = specialSquare.label;
        }
      }

      boardElement.appendChild(cell);
    }
  }

  console.log("Board created, cells: ", boardElement.children.length);
}

// Generate random special squares based on a seed
function generateRandomSpecialSquares(seed) {
  // Set up the seedable random function
  const random = Math.seedrandom(seed);

  const specialSquares = [];
  const centerPosition = Math.floor(gameState.boardSize / 2);
  const occupiedPositions = new Set();

  // Reserve the center position
  occupiedPositions.add(`${centerPosition},${centerPosition}`);

  // Define the bonus types and counts
  const bonusTypes = [
    { type: "tw", label: "TW", count: 4 }, // Triple Word
    { type: "tl", label: "TL", count: 4 }, // Triple Letter
    { type: "dw", label: "DW", count: 4 }, // Double Word
    { type: "dl", label: "DL", count: 4 }, // Double Letter
  ];

  // Place bonus tiles randomly
  bonusTypes.forEach((bonusType) => {
    for (let i = 0; i < bonusType.count; i++) {
      let row, col, posKey;

      // Find an unoccupied position
      do {
        row = Math.floor(random() * gameState.boardSize);
        col = Math.floor(random() * gameState.boardSize);
        posKey = `${row},${col}`;
      } while (occupiedPositions.has(posKey));

      // Mark this position as occupied
      occupiedPositions.add(posKey);

      // Add to special squares
      specialSquares.push({
        row: row,
        col: col,
        type: bonusType.type,
        label: bonusType.label,
      });
    }
  });

  return specialSquares;
}

// Initialize letter tiles with daily seeded randomization
function initializeTiles() {
  if (gameState.gameCompleted) {
    // Hide the letter rack if game is completed
    document.getElementById("letterRack").style.display = "none";
    return;
  }

  // Generate a seed based on the current date
  const today = new Date();
  const seed =
    today.getFullYear() * 10000 +
    (today.getMonth() + 1) * 100 +
    today.getDate();

  // Use the seed to generate a deterministic set of letters
  const letters = generateDailyLetters(seed);
  gameState.letters = letters;

  renderTilesInRack();
}

// Generate daily letters based on a seed
function generateDailyLetters(seed) {
  // Seed the random number generator
  Math.seedrandom = function (seed) {
    let m = 0x80000000; // 2^31
    let a = 1103515245;
    let c = 12345;
    let z = seed;
    return function () {
      z = (a * z + c) % m;
      return z / m;
    };
  };

  const random = Math.seedrandom(seed);

  // Frequency distribution roughly based on Scrabble
  const letterPool = [
    "A",
    "A",
    "A",
    "A",
    "A",
    "A",
    "A",
    "A",
    "A",
    "B",
    "B",
    "C",
    "C",
    "D",
    "D",
    "D",
    "D",
    "E",
    "E",
    "E",
    "E",
    "E",
    "E",
    "E",
    "E",
    "E",
    "E",
    "E",
    "E",
    "F",
    "F",
    "G",
    "G",
    "G",
    "H",
    "H",
    "I",
    "I",
    "I",
    "I",
    "I",
    "I",
    "I",
    "I",
    "I",
    "J",
    "K",
    "L",
    "L",
    "L",
    "L",
    "M",
    "M",
    "M",
    "N",
    "N",
    "N",
    "N",
    "N",
    "N",
    "O",
    "O",
    "O",
    "O",
    "O",
    "O",
    "O",
    "O",
    "P",
    "P",
    "Q",
    "R",
    "R",
    "R",
    "R",
    "R",
    "R",
    "S",
    "S",
    "S",
    "S",
    "T",
    "T",
    "T",
    "T",
    "T",
    "T",
    "U",
    "U",
    "U",
    "U",
    "V",
    "V",
    "W",
    "W",
    "X",
    "Y",
    "Y",
    "Z",
  ];

  // Pick 18 random letters from the pool
  let selectedLetters = [];
  for (let i = 0; i < 18; i++) {
    const index = Math.floor(random() * letterPool.length);
    selectedLetters.push(letterPool[index]);
    letterPool.splice(index, 1); // Remove the selected letter from the pool
  }

  // Add 1-2 wildcards
  const wildcardCount = Math.floor(random() * 2) + 1;
  for (let i = 0; i < wildcardCount; i++) {
    selectedLetters.push("*");
  }

  // Add 1 bonus tile
  const bonusIndex = Math.floor(random() * selectedLetters.length);
  selectedLetters[bonusIndex] = {
    letter: selectedLetters[bonusIndex],
    bonus: "powerup",
  };

  return selectedLetters;
}

// Render tiles in the letter rack
function renderTilesInRack() {
  const rackElement = document.getElementById("letterRack");
  rackElement.innerHTML = "";

  gameState.letters.forEach((item, index) => {
    let letter, bonus;

    // Check if the item is an object with bonus
    if (typeof item === "object" && item !== null) {
      letter = item.letter;
      bonus = item.bonus;
    } else {
      letter = item;
      bonus = null;
    }

    const tile = createTileElement(letter, index, bonus);
    rackElement.appendChild(tile);
    makeTileDraggable(tile);
  });

  console.log("Tiles rendered: ", rackElement.children.length);

  // Update mobile tile rack pagination if on mobile
  if (gameState.isMobileDevice && gameState.mobileTileRack) {
    // Reset to first page when re-rendering
    gameState.mobileTileRack.currentPage = 0;
    updateMobileTileRack();
  }
}

// Create a tile element
function createTileElement(letter, index, bonus) {
  const tile = document.createElement("div");
  tile.className = "tile";

  // Add special classes for wild and powerup tiles
  if (letter === "*") {
    tile.classList.add("wild");
    tile.textContent = "*";
  } else {
    tile.textContent = letter;
  }

  if (bonus === "powerup") {
    tile.classList.add("powerup");
    const powerIndicator = document.createElement("div");
    powerIndicator.className = "power-indicator";
    powerIndicator.textContent = "2x";
    tile.appendChild(powerIndicator);
  }

  tile.dataset.letter = letter;
  tile.dataset.index = index;
  if (bonus) tile.dataset.bonus = bonus;

  // Add the letter value
  const valueSpan = document.createElement("span");
  valueSpan.className = "tile-value";
  valueSpan.textContent = gameState.letterValues[letter] || 0;
  tile.appendChild(valueSpan);

  // Add direct touch handlers for mobile
  if (gameState.isMobileDevice) {
    tile.addEventListener("touchend", function (e) {
      // Only handle tap selection in tap mode
      if (interactionMode.mode !== "tap") {
        return; // Exit early if not in tap mode
      }

      e.preventDefault(); // Prevent default tap behavior
      e.stopPropagation(); // Stop event bubbling

      console.log("DIRECT TILE TAP (from createTileElement) - TAP MODE");

      // If this tile is already selected, deselect it
      if (gameState.selectedTile === tile) {
        tile.classList.remove("selected");
        gameState.selectedTile = null;
      } else {
        // Deselect any previously selected tile
        if (gameState.selectedTile) {
          gameState.selectedTile.classList.remove("selected");
        }

        // Select this tile
        tile.classList.add("selected");
        gameState.selectedTile = tile;

        // Show toast message
        if (tile.classList.contains("placed")) {
          showToast("Tap the rack to return this tile");
        } else {
          showToast("Tap a board cell to place this tile");
        }

        // Provide haptic feedback
        if (navigator.vibrate) navigator.vibrate(20);
      }

      return false;
    });
  }

  return tile;
}

// Make a tile draggable
function makeTileDraggable(tile) {
  tile.setAttribute("draggable", "true");
}

// Set up event listeners
function setupEventListeners() {
  setupTileMovement();
  setupButtons();

  // Only use tooltips on desktop, use toasts on mobile
  if (!gameState.isMobileDevice) {
    setupTooltips();
  } else {
    setupMobileInfoHelpers();
  }

  setupWildcardModal();

  // Show tutorial button in rules modal (only kept this one)
  document
    .getElementById("showTutorialFromRulesBtn")
    ?.addEventListener("click", () => {
      document.getElementById("rulesModal").classList.remove("active");
      showTutorial();
    });
}

// Set up mobile gesture controls
function setupMobileGestures() {
  // Add improved tile rack navigation for mobile
  setupPaginatedTileRack();

  // Keep the pinch-to-zoom capability for the game board for better precision
  const gameBoard = document.getElementById("gameBoard");
  let initialPinchDistance = 0;
  let currentScale = 1;

  gameBoard.addEventListener(
    "touchstart",
    function (e) {
      if (e.touches.length === 2) {
        // Calculate initial distance between two fingers
        initialPinchDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    },
    { passive: false }
  );

  gameBoard.addEventListener(
    "touchmove",
    function (e) {
      if (initialPinchDistance > 0 && e.touches.length === 2) {
        // Calculate new distance
        const currentDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );

        // Calculate scale factor (limit to reasonable range)
        const newScale = Math.min(
          Math.max(
            (currentDistance / initialPinchDistance) * currentScale,
            0.8
          ),
          1.5
        );

        // Apply scale transform
        gameBoard.style.transform = `scale(${newScale})`;

        // Prevent default to avoid page zooming
        e.preventDefault();
      }
    },
    { passive: false }
  );

  gameBoard.addEventListener(
    "touchend",
    function (e) {
      if (e.touches.length < 2) {
        // Store current scale for next pinch gesture
        const transform = gameBoard.style.transform;
        if (transform) {
          const match = transform.match(/scale\(([0-9.]+)\)/);
          if (match) {
            currentScale = parseFloat(match[1]);
          }
        }
        initialPinchDistance = 0;
      }
    },
    { passive: true }
  );
}

// Extra handlers specifically for mobile tap/place
function setupExtraMobileHandlers() {
  console.log("Setting up extra mobile handlers for tap and place");

  // Show the interaction mode toggle for mobile users
  const mobileToggle = document.getElementById("mobileInteractionToggle");
  if (gameState.isMobileDevice && window.innerWidth > 768) {
    mobileToggle.style.display = "flex"; //display from flex to none for now according to design
  } else {
    mobileToggle.style.display = "none";
  }

  // Load previous mode preference
  const savedMode = localStorage.getItem("interactionMode") || "tap";
  interactionMode.updateMode(savedMode);

  // Set up toggle functionality
  document.getElementById("tapModeBtn").addEventListener("click", function () {
    interactionMode.updateMode("tap");
  });

  document.getElementById("dragModeBtn").addEventListener("click", function () {
    interactionMode.updateMode("drag");
  });
  document.getElementById("tapModeBtnL").addEventListener("click", function () {
    interactionMode.updateMode("tap");
  });

  document
    .getElementById("dragModeBtnL")
    .addEventListener("click", function () {
      interactionMode.updateMode("drag");
    });

  // COMPLETELY NEW APPROACH USING GLOBAL EVENT CAPTURING

  // Set up touch tracking - but don't interfere with standard touch behavior yet
  document.addEventListener(
    "touchstart",
    function (e) {
      // Mark that we're in touch mode
      gameState.touchMode = true;

      // Store the starting touch position
      touchData.startX = e.touches[0].clientX;
      touchData.startY = e.touches[0].clientY;
      touchData.currentX = touchData.startX;
      touchData.currentY = touchData.startY;
      touchData.isDragging = false;
      touchData.touchStartTime = Date.now();

      // IMPORTANT: Don't establish any touchedTile or selection yet
      // We'll wait to see if this is a drag or a tap

      // Check if we tapped on a board cell
      const cellElement = e.target.closest(".board-cell");
      if (
        cellElement &&
        gameState.selectedTile &&
        !cellElement.querySelector(".tile")
      ) {
        // If we have a selected tile and tapped an empty cell, remember this cell
        gameState.targetCell = cellElement;
      }

      // Check if we're touching a tile (for visual feedback only)
      const tileElement = e.target.closest(".tile");
      if (tileElement) {
        // Add visual feedback
        tileElement.classList.add("touch-active");

        // DON'T set gameState.touchedTile here - we'll do that in touchmove
        // if this becomes a drag operation
      }

      // Remember the event for handling in touchend if needed
      gameState.lastTouchEvent = e;
    },
    false
  ); // Allow standard event flow for drag and drop

  // Handle touch move for drag and drop
  document.addEventListener(
    "touchmove",
    function (e) {
      // Update current touch position
      touchData.currentX = e.touches[0].clientX;
      touchData.currentY = e.touches[0].clientY;

      // ONLY HANDLE DRAGGING IN DRAG MODE
      if (interactionMode.mode !== "drag") {
        return; // Exit early if not in drag mode
      }

      // Calculate distance moved
      const deltaX = touchData.currentX - touchData.startX;
      const deltaY = touchData.currentY - touchData.startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // If there's no touched tile yet, try to find one under the initial touch point
      if (!gameState.touchedTile) {
        const elementAtStart = document.elementFromPoint(
          touchData.startX,
          touchData.startY
        );
        if (elementAtStart) {
          const tileElement = elementAtStart.closest(".tile");
          if (tileElement) {
            gameState.touchedTile = tileElement;
            console.log("Found tile for dragging", tileElement);
          }
        }
      }

      // If moved beyond threshold, consider it a drag
      if (
        distance > touchData.dragThreshold &&
        gameState.touchedTile &&
        !touchData.isDragging
      ) {
        // IMPORTANT: Flag as dragging mode - this prevents tap actions in touchend
        touchData.isDragging = true;

        // Cancel any existing tile selection
        if (gameState.selectedTile) {
          gameState.selectedTile.classList.remove("selected");
          gameState.selectedTile = null;
        }

        // Add visual dragging effect
        gameState.touchedTile.classList.add("dragging");
        gameState.touchedTile.classList.remove("touch-active");

        console.log("DRAG STARTED - DISTANCE:", distance);

        // Prevent scrolling when dragging tiles
        e.preventDefault();
      }

      if (touchData.isDragging && gameState.touchedTile) {
        // Find the element under the current touch point
        const elementsUnderTouch = document.elementsFromPoint(
          touchData.currentX,
          touchData.currentY
        );
        const cellUnderTouch = elementsUnderTouch.find((el) =>
          el.classList.contains("board-cell")
        );

        // Clear all highlights
        document.querySelectorAll(".board-cell").forEach((cell) => {
          cell.classList.remove("drop-hover");
        });
        document.getElementById("letterRack").classList.remove("rack-hover");

        // Highlight valid drop targets
        if (cellUnderTouch && !cellUnderTouch.querySelector(".tile")) {
          cellUnderTouch.classList.add("drop-hover");
        } else if (
          elementsUnderTouch.find((el) => el.id === "letterRack") &&
          gameState.touchedTile.classList.contains("placed")
        ) {
          document.getElementById("letterRack").classList.add("rack-hover");
        }

        e.preventDefault(); // Prevent scrolling
      }
    },
    { passive: false }
  );

  // Handle touch end
  document.addEventListener(
    "touchend",
    function (e) {
      try {
        console.log(
          "Touch End - Mode:",
          interactionMode.mode,
          "isDragging:",
          touchData.isDragging
        );

        // Find what element was under the touch when it ended
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const elementAtTouchEnd = document.elementFromPoint(endX, endY);

        // Clean up visual effects for any touched elements
        const allTiles = document.querySelectorAll(
          ".tile.touch-active, .tile.dragging"
        );
        allTiles.forEach((tile) => {
          tile.classList.remove("touch-active");
          tile.classList.remove("dragging");
        });

        // CASE 1: DRAG MODE - HANDLING DRAG END
        if (
          interactionMode.mode === "drag" &&
          touchData.isDragging &&
          gameState.touchedTile
        ) {
          console.log("DRAG MODE: FINISHING DRAG OPERATION");

          // Find elements at the touch end position
          const elementsUnderTouch = document.elementsFromPoint(endX, endY);
          const cellUnderTouch = elementsUnderTouch.find((el) =>
            el.classList.contains("board-cell")
          );
          const rackUnderTouch = elementsUnderTouch.find(
            (el) => el.id === "letterRack"
          );

          // If released over an empty cell, place the tile
          if (cellUnderTouch && !cellUnderTouch.querySelector(".tile")) {
            const row = parseInt(cellUnderTouch.dataset.row);
            const col = parseInt(cellUnderTouch.dataset.col);

            console.log("DRAG PLACING TILE AT", row, col);
            handleTilePlacement(gameState.touchedTile, row, col);

            // Provide haptic feedback
            if (navigator.vibrate) navigator.vibrate(30);
          }
          // If released over the rack and it's a placed tile, return it
          else if (
            rackUnderTouch &&
            gameState.touchedTile.classList.contains("placed")
          ) {
            console.log("DRAG RETURNING TILE TO RACK");
            handleTileReturn(gameState.touchedTile);

            // Provide haptic feedback
            if (navigator.vibrate) navigator.vibrate(30);
          }

          // Prevent default behavior
          e.preventDefault();
        }
        // CASE 2: TAP MODE - HANDLING TAP INTERACTIONS
        else if (interactionMode.mode === "tap" && !touchData.isDragging) {
          console.log("TAP MODE: HANDLING TAP");

          // This was a genuine tap, not a drag - handle it for tap-select-place
          const distance = Math.sqrt(
            Math.pow(touchData.currentX - touchData.startX, 2) +
              Math.pow(touchData.currentY - touchData.startY, 2)
          );

          // Only process as a tap if it barely moved
          if (distance < 5) {
            const tileAtEnd = elementAtTouchEnd
              ? elementAtTouchEnd.closest(".tile")
              : null;
            const cellAtEnd = elementAtTouchEnd
              ? elementAtTouchEnd.closest(".board-cell")
              : null;
            const rackAtEnd = elementAtTouchEnd
              ? elementAtTouchEnd.closest("#letterRack")
              : null;

            // Case 1: Tapped on a tile - select/deselect
            if (tileAtEnd) {
              console.log("TAP ON TILE:", tileAtEnd);

              // Toggle selection
              if (gameState.selectedTile === tileAtEnd) {
                tileAtEnd.classList.remove("selected");
                gameState.selectedTile = null;
              } else {
                if (gameState.selectedTile) {
                  gameState.selectedTile.classList.remove("selected");
                }
                tileAtEnd.classList.add("selected");
                gameState.selectedTile = tileAtEnd;

                // Show guidance
                if (tileAtEnd.classList.contains("placed")) {
                  showToast("Tap the rack to return this tile");
                } else {
                  showToast("Tap a board cell to place this tile");
                }
              }

              // Provide feedback
              if (navigator.vibrate) navigator.vibrate(20);

              // Prevent default to avoid confusion
              e.preventDefault();
            }
            // Case 2: Tapped on an empty cell with a selected tile - place tile
            else if (
              cellAtEnd &&
              !cellAtEnd.querySelector(".tile") &&
              gameState.selectedTile
            ) {
              console.log("TAP ON EMPTY CELL WITH SELECTED TILE");

              const row = parseInt(cellAtEnd.dataset.row);
              const col = parseInt(cellAtEnd.dataset.col);

              // Place the tile
              handleTilePlacement(gameState.selectedTile, row, col);

              // Deselect the tile
              gameState.selectedTile.classList.remove("selected");
              gameState.selectedTile = null;

              // Provide feedback
              if (navigator.vibrate) navigator.vibrate([20, 30]);

              // Prevent default
              e.preventDefault();
            }
            // Case 3: Tapped on the rack with a board tile selected - return tile
            else if (
              rackAtEnd &&
              gameState.selectedTile &&
              gameState.selectedTile.classList.contains("placed")
            ) {
              console.log("TAP ON RACK WITH BOARD TILE SELECTED");

              // Return the tile
              handleTileReturn(gameState.selectedTile);

              // Deselect the tile
              gameState.selectedTile.classList.remove("selected");
              gameState.selectedTile = null;

              // Provide feedback
              if (navigator.vibrate) navigator.vibrate([20, 30]);

              // Prevent default
              e.preventDefault();
            }
          }
        }

        // Clean up - clear state for next touch
        touchData.isDragging = false;
        gameState.touchedTile = null;

        // Clear all highlights
        document.querySelectorAll(".board-cell").forEach((cell) => {
          cell.classList.remove("drop-hover");
        });
        document.getElementById("letterRack").classList.remove("rack-hover");
      } catch (err) {
        console.error("Error in touch handler:", err);
      }
    },
    false
  ); // Don't use capture phase for drags

  // Extra hack for Safari: make board cells directly clickable
  document.querySelectorAll(".board-cell").forEach((cell) => {
    cell.addEventListener(
      "click",
      function () {
        // Only handle clicks in tap mode
        if (interactionMode.mode !== "tap") return;

        if (gameState.selectedTile && !cell.querySelector(".tile")) {
          const row = parseInt(cell.dataset.row);
          const col = parseInt(cell.dataset.col);

          handleTilePlacement(gameState.selectedTile, row, col);

          gameState.selectedTile.classList.remove("selected");
          gameState.selectedTile = null;
        }
      },
      true
    );
  });
}

// Setup paginated tile rack for mobile
function setupPaginatedTileRack() {
  if (!gameState.isMobileDevice) return;

  // setup screen width
  const screenWidth = screen.width;
  // Store pagination state in gameState

  if (screenWidth > 768) {
    gameState.mobileTileRack = {
      currentPage: 0,
      tilesPerPage: 19, // Show all at screen bigger than 768
      totalPages: 0,
    };
  } else {
    gameState.mobileTileRack = {
      currentPage: 0,
      tilesPerPage: 10, // Show max 10 tiles at once (2 rows of 4)
      totalPages: 0,
    };
  }

  // Add navigation buttons to the tile rack
  const letterRack = document.getElementById("letterRack");

  // Create navigation wrapper

  const navNextRack = document.createElement("div");
  navNextRack.className = "next-rack-nav";

  const navPrevRack = document.createElement("div");
  navPrevRack.className = "prev-rack-nav";

  const navWrapper = document.createElement("div");
  navWrapper.className = "tile-rack-nav";

  // Previous page button
  const prevBtn = document.createElement("button");
  prevBtn.className = "tile-nav-btn prev-btn";
  prevBtn.id - "prevBtn";

  prevBtn.addEventListener("click", function () {
    navigateTileRack(-1);
  });

  // add arrow icon to previous button
  let svgElementArrow = `
  <svg  viewBox="0 0 8 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7.54801 1.57999L6.48701 0.519991L0.708013 6.29699C0.614858 6.38956 0.54093 6.49963 0.490482 6.62088C0.440034 6.74213 0.414062 6.87216 0.414062 7.00349C0.414062 7.13482 0.440034 7.26485 0.490482 7.3861C0.54093 7.50735 0.614858 7.61742 0.708013 7.70999L6.48701 13.49L7.54701 12.43L2.12301 7.00499L7.54801 1.57999Z" fill="white"/>
  </svg>
  `;
  prevBtn.innerHTML = svgElementArrow;

  // Next page button
  const nextBtn = document.createElement("button");
  nextBtn.className = "tile-nav-btn next-btn";
  nextBtn.id = "nextBtn";
  nextBtn.addEventListener("click", function () {
    navigateTileRack(1);
  });

  // add arrow icon to next button
  svgElementArrow = `
  <svg  viewBox="0 0 8 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M0.451987 1.57999L1.51299 0.519991L7.29199 6.29699C7.38514 6.38956 7.45907 6.49963 7.50952 6.62088C7.55997 6.74213 7.58594 6.87216 7.58594 7.00349C7.58594 7.13482 7.55997 7.26485 7.50952 7.3861C7.45907 7.50735 7.38514 7.61742 7.29199 7.70999L1.51299 13.49L0.452987 12.43L5.87699 7.00499L0.451987 1.57999Z" fill="white"/>
</svg>
  `;
  nextBtn.innerHTML = svgElementArrow;
  // Page indicator
  const pageIndicator = document.createElement("div");
  pageIndicator.className = "tile-page-indicator";
  pageIndicator.id = "tilePageIndicator";

  // Add elements to the DOM
  //****  here wirawan disable the code to create new structure element ****

  // navWrapper.appendChild(prevBtn);
  // navWrapper.appendChild(pageIndicator);
  // navWrapper.appendChild(nextBtn);

  // **** here wirawan add new navigation rack beside the letter rack
  navPrevRack.appendChild(prevBtn);
  navWrapper.appendChild(pageIndicator);
  navNextRack.appendChild(nextBtn);
  // Add to page before the letterRack instead of after
  letterRack.parentNode.insertBefore(navWrapper, letterRack);
  letterRack.parentNode.insertBefore(navNextRack, letterRack);
  letterRack.parentNode.insertBefore(navPrevRack, letterRack);

  // Add swipe gesture support for the tile rack
  let touchStartX = 0;
  let touchEndX = 0;

  letterRack.addEventListener(
    "touchstart",
    function (e) {
      touchStartX = e.touches[0].clientX;
    },
    { passive: true }
  );

  letterRack.addEventListener(
    "touchend",
    function (e) {
      touchEndX = e.changedTouches[0].clientX;
      const diffX = touchEndX - touchStartX;

      // If significant horizontal swipe detected
      if (Math.abs(diffX) > 50) {
        // Swipe right (previous page)
        if (diffX > 0) {
          navigateTileRack(-1);
        }
        // Swipe left (next page)
        else {
          navigateTileRack(1);
        }
      }
    },
    { passive: true }
  );

  // Initial update of the rack
  updateMobileTileRack();

  // Show a one-time instruction for swiping
  if (gameState.isMobileDevice && !localStorage.getItem("shownSwipeHint")) {
    setTimeout(() => {
      showToast("Swipe left/right to see more tiles");
      localStorage.setItem("shownSwipeHint", "true");
    }, 1500);
  }
}

// Navigate between pages of tiles
function navigateTileRack(direction) {
  if (!gameState.isMobileDevice) return;

  // Update current page
  gameState.mobileTileRack.currentPage += direction;

  // Ensure we stay within bounds
  if (gameState.mobileTileRack.currentPage < 0) {
    gameState.mobileTileRack.currentPage =
      gameState.mobileTileRack.totalPages - 1;
  } else if (
    gameState.mobileTileRack.currentPage >= gameState.mobileTileRack.totalPages
  ) {
    gameState.mobileTileRack.currentPage = 0;
  }

  // Update the display
  updateMobileTileRack(direction);

  // Provide haptic feedback
  if (navigator.vibrate) {
    navigator.vibrate(20);
  }
}

// Update the tile rack display based on current page
// wirawan add direction to tell which posiotion tile to slide in
function updateMobileTileRack(direction) {
  if (!gameState.isMobileDevice) return;

  // Calculate total pages
  const tilesPerPage = gameState.mobileTileRack.tilesPerPage;
  gameState.mobileTileRack.totalPages = Math.ceil(
    gameState.letters.length / tilesPerPage
  );

  // If empty or a single page, hide navigation
  const navElement = document.querySelector(".tile-rack-nav");
  if (
    gameState.letters.length <= tilesPerPage ||
    gameState.mobileTileRack.totalPages <= 1
  ) {
    if (navElement) navElement.style.display = "none";
    return;
  } else {
    if (navElement) navElement.style.display = "flex";
  }

  // Update page indicator
  // wirawan change this code to remake the pagination looks
  const pageIndicator = document.getElementById("tilePageIndicator");
  const pageBulletInactive = `<div class="page-indicator" > </div>`;
  //below is belong to  bullet indicator that active has different color and radius page
  // const pageBulletActive = `<div class="page-indicator active" > </div>`;

  const pageBulletList = [];
  if (pageIndicator) {
    const start = gameState.mobileTileRack.currentPage * tilesPerPage + 1;
    const end = Math.min(start + tilesPerPage - 1, gameState.letters.length);
    const total = gameState.letters.length;
    const totalPages = Math.ceil(total / tilesPerPage);

    for (let index = 0; index < totalPages; index++) {
      if (pageBulletList.length < totalPages) {
        pageBulletList.push(pageBulletInactive);
      }
    }

    //change the radius here from 0.5rem into 0.75 rem

    pageIndicator.innerHTML = pageBulletList.join("");
    // pageIndicator.textContent = `Tiles ${start}-${end} of ${total}`; // change from text based pagination indicator to bullet circle

    const pageBullets = document.querySelectorAll(
      "#tilePageIndicator .page-indicator"
    );

    pageBullets.forEach((bullet, index) => {
      setTimeout(() => {
        if (index == gameState.mobileTileRack.currentPage) {
          bullet.classList.add("active");
        }
      }, 330);
    });
  }

  // Show only tiles for the current page
  const startIdx = gameState.mobileTileRack.currentPage * tilesPerPage;
  const endIdx = startIdx + tilesPerPage;

  // Get all tiles in the rack
  const tiles = document.querySelectorAll("#letterRack .tile");

  // Hide/show tiles based on current page

  tiles.forEach((tile, index) => {
    if (index >= startIdx && index < endIdx) {
      // add animation class when direction to right
      if (direction > 0) {
        setTimeout(() => {
          tile.classList.add("animate-next");
          setTimeout(() => {
            tile.classList.remove("animate-next");
            tile.classList.add("animate-o");
          }, 400); // Adjust the delay as needed
        }, 100); // Adjust the delay as needed
      }
      // add animation class when direction to left
      if (direction < 0) {
        setTimeout(() => {
          tile.classList.add("animate-prev");
          setTimeout(() => {
            tile.classList.remove("animate-prev");
            tile.classList.add("animate-o");
          }, 400); // Adjust the delay as needed
        }, 100); // Adjust the delay as needed
      }
      setTimeout(() => {
        tile.style.display = "flex";
      }, 400);
    } else {
      if (direction > 0) {
        console.log("direct here", direction);
        setTimeout(() => {
          tile.classList.add("animate-o");
          setTimeout(() => {
            tile.classList.remove("animate-o");
            tile.classList.add("animate-prev");
          }, 10); // Adjust the delay as needed
        }, 275); // Adjust the delay as needed
      }
      // add animation class when direction to left
      else if (direction < 0) {
        setTimeout(() => {
          tile.classList.add("animate-o");
          setTimeout(() => {
            tile.classList.remove("animate-next", "animate-o");
            tile.classList.add("animate-next");
          }, 10); // Adjust the delay as needed
        }, 275); // Adjust the delay as needed
      } else {
        tile.style.display = "none";
      }
      setTimeout(() => {
        tile.style.display = "none";
      }, 380);
    }
    setTimeout(() => {
      tile.classList.remove("animate-o");
      tile.classList.remove("animate-prev");
      tile.classList.remove("animate-next");
    }, 900);
  });
}

// Set up mobile-specific information helpers
function setupMobileInfoHelpers() {
  // Special tiles info
  document.addEventListener("click", function (e) {
    if (gameState.gameCompleted) return;

    let tile = null;
    if (e.target && e.target.classList) {
      tile = e.target.closest(".tile");
    }

    if (tile && !gameState.selectedTile) {
      // Only show info if the tile isn't already selected
      if (tile.classList.contains("wild")) {
        showToast("Wild Card: Can represent any letter");
      } else if (tile.classList.contains("powerup")) {
        showToast("Bonus Tile: Doubles the word score");
      } else if (tile.classList.contains("invalid-word")) {
        const row = parseInt(tile.dataset.row);
        const col = parseInt(tile.dataset.col);
        const invalidWord = gameState.wordData.invalidWords.find((w) =>
          w.tiles.some((t) => t.row === row && t.col === col)
        );

        const wordText = invalidWord ? invalidWord.word : "";
        showToast(
          `Invalid Word: "${wordText}" not found in dictionary`,
          "error"
        );
      }
    }
  });

  // Special square info via long press
  let pressTimer;

  document.querySelectorAll(".board-cell").forEach((cell) => {
    if (
      cell.classList.contains("dl") ||
      cell.classList.contains("tl") ||
      cell.classList.contains("dw") ||
      cell.classList.contains("tw")
    ) {
      let infoText = "";
      if (cell.classList.contains("dl")) infoText = "Double Letter Score";
      if (cell.classList.contains("tl")) infoText = "Triple Letter Score";
      if (cell.classList.contains("dw")) infoText = "Double Word Score";
      if (cell.classList.contains("tw")) infoText = "Triple Word Score";

      // Set up long press detection for bonus cells
      cell.addEventListener("touchstart", function (e) {
        if (cell.querySelector(".tile")) return; // Don't show if cell has a tile

        pressTimer = setTimeout(function () {
          showToast(infoText);
        }, 800); // Long press threshold
      });

      cell.addEventListener("touchend", function () {
        clearTimeout(pressTimer);
      });

      cell.addEventListener("touchmove", function () {
        clearTimeout(pressTimer);
      });
    }
  });
}

// Global touch data for mobile interactions
const touchData = {
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  isDragging: false,
  dragThreshold: 10, // Minimum pixels to move before considering it a drag
  touchStartTime: 0,
};

// Mobile interaction mode state
const interactionMode = {
  mode: "tap", // 'tap' or 'drag'
  updateMode: function (newMode) {
    this.mode = newMode;

    // Update button states
    if (newMode === "tap") {
      document.getElementById("tapModeBtn").classList.add("active");
      document.getElementById("dragModeBtn").classList.remove("active");
      document.getElementById("tapModeBtnL").classList.add("active");
      document.getElementById("dragModeBtnL").classList.remove("active");
      showToast("Tap Mode: Select a tile, then tap a cell to place it");
    } else {
      document.getElementById("tapModeBtn").classList.remove("active");
      document.getElementById("dragModeBtn").classList.add("active");
      document.getElementById("tapModeBtnL").classList.remove("active");
      document.getElementById("dragModeBtnL").classList.add("active");
      showToast("Drag Mode: Drag tiles directly to place them");
    }

    // Save preference
    localStorage.setItem("interactionMode", newMode);
  },
};

// Set up tile movement functionality
function setupTileMovement() {
  // Setup drag and drop for desktop
  document.addEventListener("dragstart", function (e) {
    if (gameState.gameCompleted) return; // Don't use drag if game completed

    const tile = e.target.closest(".tile");
    if (!tile) return;

    e.dataTransfer.setData("text/plain", ""); // Required for Firefox
    tile.classList.add("dragging");

    // Store reference to dragged tile
    gameState.currentDraggedTile = tile;
  });

  document.addEventListener("dragend", function (e) {
    if (gameState.gameCompleted) return;

    const tile = e.target.closest(".tile");
    if (!tile) return;

    tile.classList.remove("dragging");
    gameState.currentDraggedTile = null;

    // Clear all highlights
    document.querySelectorAll(".board-cell").forEach((el) => {
      el.classList.remove("drop-hover");
    });
    document.getElementById("letterRack").classList.remove("rack-hover");
  });

  // We now use the global touch handling system

  // Board cells as drop targets
  document.querySelectorAll(".board-cell").forEach((cell) => {
    cell.addEventListener("dragover", function (e) {
      if (gameState.gameCompleted) return;

      // Only allow dropping if cell is empty and we have a dragged tile
      if (!gameState.currentDraggedTile || cell.querySelector(".tile")) return;

      // Allow dropping on any cell, including non-center cells for first move
      e.preventDefault(); // Allow dropping
      cell.classList.add("drop-hover");
    });

    cell.addEventListener("dragleave", function () {
      if (gameState.gameCompleted) return;
      this.classList.remove("drop-hover");
    });

    cell.addEventListener("drop", function (e) {
      if (gameState.gameCompleted) return;

      e.preventDefault();
      this.classList.remove("drop-hover");

      // Safety checks
      if (!gameState.currentDraggedTile || this.querySelector(".tile")) return;

      const tile = gameState.currentDraggedTile;
      const row = parseInt(this.dataset.row);
      const col = parseInt(this.dataset.col);

      // Allow placement on any cell, including for first move
      handleTilePlacement(tile, row, col);
    });

    // REMOVED: We now use a single document-level click handler for all tile placement
  });

  // Letter rack as drop target
  const letterRack = document.getElementById("letterRack");

  // Prevent draggable behavior when dragging starts on the rack background (not on a tile)
  letterRack.addEventListener("dragstart", function (e) {
    // If the drag didn't start on a tile, cancel the drag
    if (!e.target.closest(".tile")) {
      e.preventDefault();
      return false;
    }
  });

  letterRack.addEventListener("dragover", function (e) {
    if (gameState.gameCompleted) return;

    // Only allow dropping if tile is from the board
    if (
      !gameState.currentDraggedTile ||
      !gameState.currentDraggedTile.classList.contains("placed")
    )
      return;

    e.preventDefault();
    this.classList.add("rack-hover");
  });

  letterRack.addEventListener("dragleave", function () {
    if (gameState.gameCompleted) return;
    this.classList.remove("rack-hover");
  });

  letterRack.addEventListener("drop", function (e) {
    if (gameState.gameCompleted) return;

    e.preventDefault();
    this.classList.remove("rack-hover");

    // Safety checks
    if (
      !gameState.currentDraggedTile ||
      !gameState.currentDraggedTile.classList.contains("placed")
    )
      return;

    handleTileReturn(gameState.currentDraggedTile);
  });

  // For click/tap mode
  letterRack.addEventListener("click", function () {
    if (gameState.gameCompleted) return;

    // Only handle click returns in tap mode
    if (interactionMode.mode !== "tap") return;

    // If a placed tile is selected
    if (
      gameState.selectedTile &&
      gameState.selectedTile.classList.contains("placed")
    ) {
      handleTileReturn(gameState.selectedTile);

      // Deselect the tile
      gameState.selectedTile.classList.remove("selected");
      gameState.selectedTile = null;
    }
  });

  // COMPLETELY REWRITTEN TILE SELECTION AND PLACEMENT SYSTEM
  // We're using both click and touch events to ensure it works on all devices

  // Define our core tile interaction function
  function handleTileInteraction(event) {
    if (gameState.gameCompleted) return;

    // Only handle interactions in tap mode
    if (interactionMode.mode !== "tap") return;

    console.log("INTERACTION EVENT (TAP MODE):", event.type);

    // For touch events, we need to get the element at the touch point
    let targetElement;
    if (event.type.startsWith("touch")) {
      // For touchend, we need to use changedTouches
      const touchPoint =
        event.type === "touchend" ? event.changedTouches[0] : event.touches[0];

      // Get the element at the touch point
      targetElement = document.elementFromPoint(
        touchPoint.clientX,
        touchPoint.clientY
      );
      console.log("Touch target element:", targetElement);
    } else {
      targetElement = event.target;
      console.log("Click target element:", targetElement);
    }

    if (!targetElement) {
      console.log("No target element found");
      return;
    }

    // First check: Did we click/tap on a TILE?
    const clickedTile = targetElement.closest(".tile");

    if (clickedTile) {
      console.log("Clicked on tile:", clickedTile);

      // If a tile is already selected and we clicked a different tile
      if (gameState.selectedTile && gameState.selectedTile !== clickedTile) {
        // Deselect the previously selected tile
        gameState.selectedTile.classList.remove("selected");
      }

      // Toggle the selection status of the clicked tile
      if (gameState.selectedTile === clickedTile) {
        // Deselect if already selected
        clickedTile.classList.remove("selected");
        gameState.selectedTile = null;
        console.log("Tile deselected");

        // Remove highlighted container class from any board cells
        document
          .querySelectorAll(".board-cell.selected-tile-container")
          .forEach((cell) => {
            cell.classList.remove("selected-tile-container");
          });
      } else {
        // Select if not already selected
        clickedTile.classList.add("selected");
        gameState.selectedTile = clickedTile;
        console.log("Tile selected:", clickedTile);

        // Clear any previous highlighted containers
        document
          .querySelectorAll(".board-cell.selected-tile-container")
          .forEach((cell) => {
            cell.classList.remove("selected-tile-container");
          });

        // If this is a placed tile, highlight its container cell
        if (clickedTile.classList.contains("placed")) {
          const parentCell = clickedTile.closest(".board-cell");
          if (parentCell) {
            parentCell.classList.add("selected-tile-container");
          }
        }

        // Show guidance toast
        if (gameState.isMobileDevice) {
          if (clickedTile.classList.contains("placed")) {
            showToast("Tap the rack to return this tile");
          } else {
            showToast("Tap a board cell to place this tile");
          }
        }
      }

      // Stop event propagation
      if (event.stopPropagation) event.stopPropagation();
      return;
    }

    // Second check: Did we click/tap on an EMPTY CELL while a tile is selected?
    const clickedCell = targetElement.closest(".board-cell");
    console.log(
      "Clicked cell:",
      clickedCell,
      "Selected tile:",
      gameState.selectedTile
    );

    if (
      clickedCell &&
      !clickedCell.querySelector(".tile") &&
      gameState.selectedTile
    ) {
      // We have a selected tile and clicked an empty cell - place the tile
      console.log("PLACING TILE IN CELL");

      const row = parseInt(clickedCell.dataset.row);
      const col = parseInt(clickedCell.dataset.col);

      handleTilePlacement(gameState.selectedTile, row, col);

      // Deselect after placement
      gameState.selectedTile.classList.remove("selected");
      gameState.selectedTile = null;

      // Clear any container highlighting
      document
        .querySelectorAll(".board-cell.selected-tile-container")
        .forEach((cell) => {
          cell.classList.remove("selected-tile-container");
        });

      // Stop event propagation
      if (event.stopPropagation) event.stopPropagation();
      return;
    }

    // Third check: Did we click/tap on the LETTER RACK with a placed tile selected?
    const clickedRack = targetElement.closest("#letterRack");

    if (
      clickedRack &&
      gameState.selectedTile &&
      gameState.selectedTile.classList.contains("placed")
    ) {
      // We have a placed tile selected and clicked the rack - return the tile
      console.log("Returning selected tile to rack");

      handleTileReturn(gameState.selectedTile);

      // Deselect after returning
      gameState.selectedTile.classList.remove("selected");
      gameState.selectedTile = null;

      // Clear any container highlighting
      document
        .querySelectorAll(".board-cell.selected-tile-container")
        .forEach((cell) => {
          cell.classList.remove("selected-tile-container");
        });

      // We handled the interaction, so stop here
      event.stopPropagation();
      return;
    }

    // Final case: We clicked/tapped elsewhere - just deselect any selected tile
    if (gameState.selectedTile) {
      console.log("Clicked elsewhere, deselecting tile");
      gameState.selectedTile.classList.remove("selected");
      gameState.selectedTile = null;

      // Remove any cell highlighting
      document
        .querySelectorAll(".board-cell.selected-tile-container")
        .forEach((cell) => {
          cell.classList.remove("selected-tile-container");
        });
    }
  }

  // Add the mouse click handler
  document.addEventListener("click", handleTileInteraction);

  // For mobile specifically, add touch handlers
  if (gameState.isMobileDevice) {
    // Add global touch tracking for tap vs drag detection
    document.addEventListener(
      "touchstart",
      function (e) {
        touchData.startX = e.touches[0].clientX;
        touchData.startY = e.touches[0].clientY;
        touchData.currentX = touchData.startX;
        touchData.currentY = touchData.startY;
        touchData.isDragging = false;
        touchData.touchStartTime = Date.now();
      },
      { passive: true }
    );

    document.addEventListener(
      "touchmove",
      function (e) {
        touchData.currentX = e.touches[0].clientX;
        touchData.currentY = e.touches[0].clientY;

        // Calculate distance moved
        const deltaX = touchData.currentX - touchData.startX;
        const deltaY = touchData.currentY - touchData.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // If moved beyond threshold, consider it a drag
        if (distance > touchData.dragThreshold) {
          touchData.isDragging = true;

          // Check if we started the touch on a tile
          const touchedElement = document.elementFromPoint(
            touchData.startX,
            touchData.startY
          );
          const tileElement = touchedElement.closest(".tile");

          if (tileElement) {
            // Add visual feedback
            tileElement.classList.add("dragging");

            // Check if we're over a valid drop target
            const elementsUnderTouch = document.elementsFromPoint(
              touchData.currentX,
              touchData.currentY
            );
            const cellUnderTouch = elementsUnderTouch.find((el) =>
              el.classList.contains("board-cell")
            );

            // Clear previous highlights
            document.querySelectorAll(".board-cell").forEach((el) => {
              el.classList.remove("drop-hover");
            });
            document
              .getElementById("letterRack")
              .classList.remove("rack-hover");

            // Highlight valid drop targets
            if (cellUnderTouch && !cellUnderTouch.querySelector(".tile")) {
              cellUnderTouch.classList.add("drop-hover");
            } else if (
              elementsUnderTouch.find((el) => el.id === "letterRack") &&
              tileElement.classList.contains("placed")
            ) {
              document.getElementById("letterRack").classList.add("rack-hover");
            }

            // Store reference to dragged tile
            gameState.touchedTile = tileElement;

            // Prevent page scrolling when dragging tiles
            e.preventDefault();
          }
        }
      },
      { passive: false }
    );

    // BACKUP direct cell click listener on each board cell
    document.querySelectorAll(".board-cell").forEach((cell) => {
      cell.addEventListener(
        "click",
        function (e) {
          if (gameState.gameCompleted) return;
          if (!gameState.selectedTile) return;
          if (cell.querySelector(".tile")) return; // Not an empty cell

          console.log("CELL DIRECT CLICK: Trying to place tile");

          const row = parseInt(cell.dataset.row);
          const col = parseInt(cell.dataset.col);

          // Place the selected tile
          handleTilePlacement(gameState.selectedTile, row, col);

          // Deselect the tile
          gameState.selectedTile.classList.remove("selected");
          gameState.selectedTile = null;

          // Provide haptic feedback
          if (navigator.vibrate) navigator.vibrate(20);

          e.stopPropagation();
        },
        true
      );
    });

    // SUPER SIMPLE touchend handler - just forward all touch taps directly
    document.addEventListener("touchend", function (e) {
      console.log("Touch ended");

      // For very short taps without much movement, handle as tap interactions
      const touchDuration = Date.now() - touchData.touchStartTime;
      const isQuickTap = touchDuration < 300;

      if (!touchData.isDragging) {
        console.log("DIRECT tap handling!!!");

        // Get the touch coordinates
        const touchX = e.changedTouches[0].clientX;
        const touchY = e.changedTouches[0].clientY;

        // Find the element under the touch point
        const elementAtPoint = document.elementFromPoint(touchX, touchY);
        console.log("Element at touch point:", elementAtPoint);

        // If we have a selected tile and tapped on a cell, try to place the tile
        if (gameState.selectedTile) {
          const cellElement = elementAtPoint.closest(".board-cell");
          if (cellElement && !cellElement.querySelector(".tile")) {
            console.log("PLACING TILE VIA DIRECT TOUCH!!!");

            const row = parseInt(cellElement.dataset.row);
            const col = parseInt(cellElement.dataset.col);

            // Place the selected tile
            handleTilePlacement(gameState.selectedTile, row, col);

            // Deselect the tile
            gameState.selectedTile.classList.remove("selected");
            gameState.selectedTile = null;

            // Provide haptic feedback
            if (navigator.vibrate) navigator.vibrate(20);

            // Force a touch end
            e.preventDefault();
          }
        } else {
          // Otherwise handle normally through our interaction function
          handleTileInteraction(e);
        }
      }
      // Handle drag completion if we have a touched tile
      else if (touchData.isDragging && gameState.touchedTile) {
        console.log("Finishing drag");

        // Find out where the drag ended
        const touchX = e.changedTouches[0].clientX;
        const touchY = e.changedTouches[0].clientY;
        const elementAtPoint = document.elementFromPoint(touchX, touchY);

        // Check for cell or rack
        const cellUnderTouch = elementAtPoint.closest(".board-cell");
        const rackUnderTouch = elementAtPoint.closest("#letterRack");

        // If released over an empty cell, place the tile
        if (cellUnderTouch && !cellUnderTouch.querySelector(".tile")) {
          const row = parseInt(cellUnderTouch.dataset.row);
          const col = parseInt(cellUnderTouch.dataset.col);
          handleTilePlacement(gameState.touchedTile, row, col);
        }
        // If released over the rack and it's a placed tile, return it
        else if (
          rackUnderTouch &&
          gameState.touchedTile.classList.contains("placed")
        ) {
          handleTileReturn(gameState.touchedTile);
        }

        // Remove any visual effects
        gameState.touchedTile.classList.remove("dragging");

        // Clear touched tile reference
        gameState.touchedTile = null;
      }

      // Clear all highlights
      document.querySelectorAll(".board-cell").forEach((el) => {
        el.classList.remove("drop-hover");
      });
      document.getElementById("letterRack").classList.remove("rack-hover");

      // Reset drag state
      touchData.isDragging = false;
    });
  }

  // Hover effects for click mode (desktop only)
  if (!gameState.isMobileDevice) {
    document.addEventListener("mouseover", function (e) {
      if (gameState.gameCompleted || !gameState.selectedTile) return;

      let cell = null;
      if (e.target && e.target.classList) {
        cell = e.target.closest(".board-cell");
      }

      // Clear all highlights
      document.querySelectorAll(".board-cell").forEach((el) => {
        el.classList.remove("drop-hover");
      });
      letterRack.classList.remove("rack-hover");

      // Highlight potential drop targets
      if (cell && !cell.querySelector(".tile")) {
        // All cells can be dropped on
        cell.classList.add("drop-hover");
      } else if (
        e.target.closest("#letterRack") &&
        gameState.selectedTile.classList.contains("placed")
      ) {
        letterRack.classList.add("rack-hover");
      }
    });

    // Clear highlights when mouse leaves a potential drop target
    document.addEventListener("mouseout", function (e) {
      if (gameState.gameCompleted || !gameState.selectedTile) return;

      let cell = null;
      if (e.target && e.target.classList) {
        cell = e.target.closest(".board-cell");
      }

      if (cell) {
        cell.classList.remove("drop-hover");
      } else if (e.target.closest("#letterRack")) {
        letterRack.classList.remove("rack-hover");
      }
    });
  }
}

// Handle tile placement on the board
function handleTilePlacement(tile, row, col) {
  if (tile.classList.contains("placed")) {
    // Moving from board to board
    const oldRow = parseInt(tile.dataset.row);
    const oldCol = parseInt(tile.dataset.col);

    // Update in game state
    updateTilePosition(oldRow, oldCol, row, col);

    // Move the DOM element
    const cell = document.querySelector(
      `.board-cell[data-row="${row}"][data-col="${col}"]`
    );
    cell.appendChild(tile);
    tile.dataset.row = row;
    tile.dataset.col = col;

    // Animation
    tile.classList.add("tile-placed-animation");
    setTimeout(() => {
      tile.classList.remove("tile-placed-animation");
    }, 300);

    // Provide haptic feedback on mobile
    if (gameState.isMobileDevice && navigator.vibrate) {
      navigator.vibrate(20); // Short vibration for successful placement
    }

    // Recalculate score and validate board
    validateBoard();
  } else {
    // Place from rack to board
    let letter = tile.dataset.letter;
    const tileIndex = parseInt(tile.dataset.index);
    const bonus = tile.dataset.bonus;

    // Place tile on board
    placeTileOnBoard(letter, tileIndex, row, col, bonus);

    // Update center visual state if needed
    const centerPosition = Math.floor(gameState.boardSize / 2);
    if (row === centerPosition && col === centerPosition) {
      gameState.isFirstMove = false;
      document.querySelector(".board-cell.center").classList.remove("empty");
    }

    // Update stats - increment total tiles placed
    gameState.stats.totalTilesPlaced++;

    // Provide haptic feedback on mobile
    if (gameState.isMobileDevice && navigator.vibrate) {
      navigator.vibrate(20); // Short vibration for successful placement
    }

    // If it's a wildcard, show the letter selection modal
    if (letter === "*") {
      // Get the placed tile element
      const placedTile = document.querySelector(
        `.board-cell[data-row="${row}"][data-col="${col}"] .tile`
      );

      // Show wildcard selection modal
      showWildcardModal(placedTile, row, col);
    } else {
      // Recalculate score and validate board
      validateBoard();
    }

    // Check for the "Perfect Board" achievement
    if (gameState.letters.length === 0) {
      unlockAchievement("perfectBoard");
    }
  }
}

// Setup wildcard modal
function setupWildcardModal() {
  const modal = document.getElementById("wildcardModal");
  const letterGrid = document.getElementById("wildcardLetterGrid");

  // Create letter options A-Z
  letterGrid.innerHTML = "";
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i); // A-Z
    const letterOption = document.createElement("div");
    letterOption.className = "letter-option";
    letterOption.textContent = letter;
    letterOption.dataset.letter = letter;
    letterGrid.appendChild(letterOption);
  }

  // Attach click events to letter options
  letterGrid.addEventListener("click", function (e) {
    const letterOption = e.target.closest(".letter-option");
    if (!letterOption) return;

    const selectedLetter = letterOption.dataset.letter;
    if (gameState.currentWildcardTile && selectedLetter) {
      // Apply the selected letter to the wildcard
      completeWildcardPlacement(gameState.currentWildcardTile, selectedLetter);

      // Close the modal
      modal.classList.remove("active");

      // Clear the current wildcard reference
      gameState.currentWildcardTile = null;

      // Check for Wild Master achievement (used all wildcards)
      checkWildMasterAchievement();
    }
  });

  // Cancel button
  document
    .getElementById("cancelWildcardBtn")
    .addEventListener("click", function () {
      if (gameState.currentWildcardTile) {
        // Return the tile to the rack
        handleTileReturn(gameState.currentWildcardTile);

        // Close the modal
        modal.classList.remove("active");

        // Clear the current wildcard reference
        gameState.currentWildcardTile = null;
      }
    });
}

// Show wildcard selection modal
function showWildcardModal(tile, row, col) {
  // Store reference to the wildcard tile
  gameState.currentWildcardTile = tile;

  // Activate the modal
  document.getElementById("wildcardModal").classList.add("active");

  // On mobile, add instructions
  if (gameState.isMobileDevice) {
    showToast("Choose a letter for your wildcard");
  }
}

// Complete wildcard placement with selected letter
function completeWildcardPlacement(tile, selectedLetter) {
  // Store the selected letter
  tile.dataset.wildValue = selectedLetter;

  // Create a visual indicator of the selected letter
  const letterIndicator = document.createElement("div");
  letterIndicator.className = "wildcard-value";
  letterIndicator.textContent = selectedLetter;
  tile.appendChild(letterIndicator);
  const wildTileElement = document.querySelector(".tile.wild.placed");
  wildTileElement.childNodes.forEach((node) => {
    // Check if the node is a text node (nodeType === 3)
    if (node.nodeType === 3 && node.nodeValue.trim() === "*") {
      // Remove the asterisk text node
      node.parentNode.removeChild(node);
    }
  });
  // Find and update the tile in the placed tiles array
  const row = parseInt(tile.dataset.row);
  const col = parseInt(tile.dataset.col);

  for (let i = 0; i < gameState.placedTiles.length; i++) {
    if (
      gameState.placedTiles[i].row === row &&
      gameState.placedTiles[i].col === col
    ) {
      gameState.placedTiles[i].wildValue = selectedLetter;
      break;
    }
  }

  // Recalculate score and validate board
  validateBoard();
}

// Check if all wildcards have been used
function checkWildMasterAchievement() {
  // Count wildcards in the game
  let totalWildcards = 0;
  let usedWildcards = 0;

  // Check placed tiles for wildcards
  gameState.placedTiles.forEach((tile) => {
    if (tile.letter === "*") {
      totalWildcards++;
      // Check if it has a value assigned
      const tileElement = document.querySelector(
        `.board-cell[data-row="${tile.row}"][data-col="${tile.col}"] .tile`
      );
      if (tileElement && tileElement.dataset.wildValue) {
        usedWildcards++;
      }
    }
  });

  // Check remaining tiles in rack for wildcards
  gameState.letters.forEach((item) => {
    if (typeof item === "object" && item.letter === "*") {
      totalWildcards++;
    } else if (item === "*") {
      totalWildcards++;
    }
  });

  // If all wildcards are used and we have at least one
  if (usedWildcards > 0 && usedWildcards === totalWildcards) {
    unlockAchievement("wildMaster");
  }
}

// Check if all special squares are used
function checkSpecialSquaresAchievement() {
  const specialTypes = ["dl", "tl", "dw", "tw"];
  const usedSpecials = new Set();

  // Check each placed tile
  gameState.placedTiles.forEach((tile) => {
    const cell = document.querySelector(
      `.board-cell[data-row="${tile.row}"][data-col="${tile.col}"]`
    );

    if (cell) {
      specialTypes.forEach((type) => {
        if (cell.classList.contains(type)) {
          usedSpecials.add(type);
        }
      });
    }
  });

  // If all special square types are used
  if (usedSpecials.size === specialTypes.length) {
    unlockAchievement("allSpecials");
  }
}

// Handle returning a tile to the rack
function handleTileReturn(tile) {
  const letter = tile.dataset.letter;
  const originalIndex = parseInt(tile.dataset.index);
  const row = parseInt(tile.dataset.row);
  const col = parseInt(tile.dataset.col);
  const bonus = tile.dataset.bonus;

  // Check if it's the center tile
  const centerPosition = Math.floor(gameState.boardSize / 2);
  if (row === centerPosition && col === centerPosition) {
    document.querySelector(".board-cell.center").classList.add("empty");

    // If it's the only tile on the board, reset first move
    if (gameState.placedTiles.length === 1) {
      gameState.isFirstMove = true;
    }
  }

  // Return the tile to the rack
  returnTileToRack(letter, originalIndex, row, col, bonus);

  // Update stats - decrement total tiles placed
  gameState.stats.totalTilesPlaced--;

  // Recalculate score and validate board
  validateBoard();
}

// Place a tile on the board
function placeTileOnBoard(letter, tileIndex, row, col, bonus) {
  // Find the item in the letters array
  let item;
  const index = gameState.letters.findIndex((l, i) => i === tileIndex);
  if (index !== -1) {
    item = gameState.letters[index];
    // Remove from rack
    gameState.letters.splice(index, 1);
  }

  // Add to placed tiles
  gameState.placedTiles.push({
    letter,
    row,
    col,
    originalIndex: tileIndex,
    bonus,
  });

  // Update the UI
  renderTilesInRack();

  // Create and place the tile on the board
  const tile = createTileElement(letter, tileIndex, bonus);
  tile.classList.add("placed");
  tile.dataset.row = row;
  tile.dataset.col = col;
  makeTileDraggable(tile);

  // Get the board cell and add the tile
  const cell = document.querySelector(
    `.board-cell[data-row="${row}"][data-col="${col}"]`
  );
  cell.appendChild(tile);

  // Animation
  tile.classList.add("tile-placed-animation");
  setTimeout(() => {
    tile.classList.remove("tile-placed-animation");
  }, 300);
}

// Return a tile to the rack
function returnTileToRack(letter, originalIndex, row, col, bonus) {
  // Find the tile in the placed tiles array
  const tileIndex = gameState.placedTiles.findIndex(
    (tile) => tile.letter === letter && tile.row === row && tile.col === col
  );

  if (tileIndex !== -1) {
    // Remove the tile element from the board
    const cell = document.querySelector(
      `.board-cell[data-row="${row}"][data-col="${col}"]`
    );
    cell.innerHTML = "";

    // Add back to letters array
    const tile = gameState.placedTiles[tileIndex];

    if (bonus) {
      gameState.letters.push({
        letter: letter,
        bonus: bonus,
      });
    } else {
      gameState.letters.push(letter);
    }

    // Remove from placed tiles
    gameState.placedTiles.splice(tileIndex, 1);

    // Re-render the rack
    renderTilesInRack();
  }
}

// Update a tile's position on the board
function updateTilePosition(oldRow, oldCol, newRow, newCol) {
  // Find the tile in the placed tiles array
  const tileIndex = gameState.placedTiles.findIndex(
    (tile) => tile.row === oldRow && tile.col === oldCol
  );

  if (tileIndex !== -1) {
    // Update its position
    gameState.placedTiles[tileIndex].row = newRow;
    gameState.placedTiles[tileIndex].col = newCol;
  }
}

// Validate the board and check for errors
function validateBoard() {
  gameState.validationErrors = [];
  let isValid = true;

  // Reset invalid cell markers
  document.querySelectorAll(".board-cell.invalid").forEach((cell) => {
    cell.classList.remove("invalid");
  });

  // Remove any existing invalid word markers
  document.querySelectorAll(".invalid-word-marker").forEach((marker) => {
    marker.remove();
  });

  // Remove word score indicators
  document.querySelectorAll(".word-score").forEach((scoreIndicator) => {
    scoreIndicator.remove();
  });

  // Remove invalid word classes from tiles
  document.querySelectorAll(".tile.invalid-word").forEach((tile) => {
    tile.classList.remove("invalid-word");
  });

  // Clear word borders
  document.querySelectorAll(".board-cell").forEach((cell) => {
    cell.classList.remove("valid-word-cell", "invalid-word-cell");
    // Remove any border classes
    cell.classList.remove(
      "word-start-h",
      "word-middle-h",
      "word-end-h",
      "word-start-v",
      "word-middle-v",
      "word-end-v"
    );
  });

  // Check if center tile is occupied - required for submission
  const centerPosition = Math.floor(gameState.boardSize / 2);
  const centerCell = document.querySelector(
    `.board-cell[data-row="${centerPosition}"][data-col="${centerPosition}"]`
  );
  const hasCenterTile = centerCell && centerCell.querySelector(".tile");

  if (gameState.placedTiles.length > 0 && !hasCenterTile) {
    gameState.validationErrors.push(
      "The center star square must be occupied before submitting"
    );
    isValid = false;
  }

  // Check if all tiles are connected (no isolated groups)
  if (gameState.placedTiles.length > 1) {
    const groups = findConnectedGroups();
    if (groups.length > 1) {
      gameState.validationErrors.push(
        "All tiles must be connected - no isolated words"
      );

      // Mark isolated tiles as invalid
      for (let i = 1; i < groups.length; i++) {
        groups[i].forEach((tileIndex) => {
          const tile = gameState.placedTiles[tileIndex];
          const cell = document.querySelector(
            `.board-cell[data-row="${tile.row}"][data-col="${tile.col}"]`
          );
          if (cell) cell.classList.add("invalid");
        });
      }

      isValid = false;
    }
  }

  // Find and validate words
  const { foundWords, invalidWords } = findWords();
  gameState.wordData.foundWords = foundWords;
  gameState.wordData.invalidWords = invalidWords;

  // Update stats - track total words formed
  gameState.stats.wordsFormed = foundWords.length;

  // Track longest word
  if (foundWords.length > 0) {
    const longestWord = foundWords.reduce(
      (longest, current) =>
        current.word.length > longest.length ? current.word : longest,
      ""
    );

    if (longestWord.length > gameState.stats.longestWord.length) {
      gameState.stats.longestWord = longestWord;
      // Check for Logophile achievement (long word)
      if (longestWord.length >= 5) {
        unlockAchievement("longWord");
      }
    }
  }

  // Check for Word Master achievement (8+ words)
  if (foundWords.length >= 8) {
    unlockAchievement("wordMaster");
  }

  // Mark invalid words
  invalidWords.forEach((wordInfo) => {
    // Add a class to each cell in the invalid word
    wordInfo.tiles.forEach((tile, index) => {
      const cell = document.querySelector(
        `.board-cell[data-row="${tile.row}"][data-col="${tile.col}"]`
      );

      if (cell) {
        cell.classList.add("invalid-word-cell");

        // Add position-specific classes for border styling
        if (wordInfo.direction === "horizontal") {
          if (index === 0) cell.classList.add("word-start-h");
          else if (index === wordInfo.tiles.length - 1)
            cell.classList.add("word-end-h");
          else cell.classList.add("word-middle-h");
        } else {
          if (index === 0) cell.classList.add("word-start-v");
          else if (index === wordInfo.tiles.length - 1)
            cell.classList.add("word-end-v");
          else cell.classList.add("word-middle-v");
        }

        // Add invalid class to the tile
        const tileElement = cell.querySelector(".tile");
        if (tileElement) {
          tileElement.classList.add("invalid-word");
        }
      }
    });

    // Add a marker to the last tile of invalid words
    const lastTile = wordInfo.tiles[wordInfo.tiles.length - 1];
    const tileElement = document.querySelector(
      `.board-cell[data-row="${lastTile.row}"][data-col="${lastTile.col}"] .tile`
    );

    if (tileElement) {
      const marker = document.createElement("div");
      marker.className = "invalid-word-marker";
      marker.title = `Invalid Word: "${wordInfo.word}" not found in dictionary`;
      tileElement.appendChild(marker);
    }
  });

  // Mark valid words
  foundWords.forEach((wordInfo) => {
    // Add a class to each cell in the valid word
    wordInfo.tiles.forEach((tile, index) => {
      const cell = document.querySelector(
        `.board-cell[data-row="${tile.row}"][data-col="${tile.col}"]`
      );

      if (cell) {
        cell.classList.add("valid-word-cell");

        // Add position-specific classes for border styling
        if (wordInfo.direction === "horizontal") {
          if (index === 0) cell.classList.add("word-start-h");
          else if (index === wordInfo.tiles.length - 1)
            cell.classList.add("word-end-h");
          else cell.classList.add("word-middle-h");
        } else {
          if (index === 0) cell.classList.add("word-start-v");
          else if (index === wordInfo.tiles.length - 1)
            cell.classList.add("word-end-v");
          else cell.classList.add("word-middle-v");
        }
      }
    });

    // Add score indicator to the last tile of each word
    const wordScore = calculateWordScore(wordInfo.tiles);
    const lastTile = wordInfo.tiles[wordInfo.tiles.length - 1];
    const tileElement = document.querySelector(
      `.board-cell[data-row="${lastTile.row}"][data-col="${lastTile.col}"] .tile`
    );

    if (tileElement) {
      // Only add score indicator if score is greater than 0
      if (wordScore > 0) {
        const scoreIndicator = document.createElement("div");
        scoreIndicator.className = "word-score";
        scoreIndicator.textContent = wordScore;
        tileElement.appendChild(scoreIndicator);

        // Check for high score word achievement
        if (wordScore >= 30) {
          unlockAchievement("highScorer");
        }

        // Update highest scoring word
        if (wordScore > gameState.stats.highestScoringWord.score) {
          gameState.stats.highestScoringWord = {
            word: wordInfo.word,
            score: wordScore,
          };
        }
      }
    }
  });

  // Check for special square achievement
  checkSpecialSquaresAchievement();

  // Update validation errors display
  const validationErrorsElement = document.getElementById("validationErrors");
  // wirawan custom validation error
  const warningSign = `<svg width="20" height="18" viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12.8 1.61286L19.501 12.7739C20.464 14.3769 19.991 16.4859 18.444 17.4839C17.9251 17.8207 17.3197 18 16.701 17.9999H3.298C1.477 17.9999 0 16.4699 0 14.5809C0 13.9419 0.173 13.3169 0.498 12.7739L7.2 1.61286C8.162 0.00985837 10.196 -0.481142 11.743 0.516858C12.171 0.792858 12.533 1.16786 12.8 1.61286ZM10 13.9999C10.2652 13.9999 10.5196 13.8945 10.7071 13.707C10.8946 13.5194 11 13.2651 11 12.9999C11 12.7346 10.8946 12.4803 10.7071 12.2928C10.5196 12.1052 10.2652 11.9999 10 11.9999C9.73478 11.9999 9.48043 12.1052 9.29289 12.2928C9.10536 12.4803 9 12.7346 9 12.9999C9 13.2651 9.10536 13.5194 9.29289 13.707C9.48043 13.8945 9.73478 13.9999 10 13.9999ZM10 4.99986C9.73478 4.99986 9.48043 5.10522 9.29289 5.29275C9.10536 5.48029 9 5.73464 9 5.99986V9.99986C9 10.2651 9.10536 10.5194 9.29289 10.707C9.48043 10.8945 9.73478 10.9999 10 10.9999C10.2652 10.9999 10.5196 10.8945 10.7071 10.707C10.8946 10.5194 11 10.2651 11 9.99986V5.99986C11 5.73464 10.8946 5.48029 10.7071 5.29275C10.5196 5.10522 10.2652 4.99986 10 4.99986Z" fill="#FFC641"/>
</svg>`;
  if (gameState.validationErrors.length > 0) {
    validationErrorsElement.innerHTML = gameState.validationErrors
      .map(
        (error) =>
          `<div><div class="warning-icon">${warningSign}</div>  <div class="validation-error-text">${error}</div></div>`
      )
      .join("");

    // Disable the submit button if there are errors
    document.getElementById("submitBtn").disabled = !isValid;
  } else {
    validationErrorsElement.innerHTML = "";
    document.getElementById("submitBtn").disabled = invalidWords.length > 0;
  }

  // Calculate the score
  const newScore = calculateScore();

  // Check for Score Breaker achievement
  if (newScore >= 200) {
    unlockAchievement("scoreBreaker");
  }

  // Update the score display
  updateScoreDisplay(newScore);

  return isValid && invalidWords.length === 0;
}

// Find connected groups of tiles on the board
function findConnectedGroups() {
  if (gameState.placedTiles.length === 0) return [];

  const visited = new Array(gameState.placedTiles.length).fill(false);
  const groups = [];

  // DFS to find connected components
  function dfs(tileIndex, group) {
    visited[tileIndex] = true;
    group.push(tileIndex);

    const tile = gameState.placedTiles[tileIndex];

    // Check all 4 adjacent positions
    const directions = [
      { row: -1, col: 0 }, // up
      { row: 1, col: 0 }, // down
      { row: 0, col: -1 }, // left
      { row: 0, col: 1 }, // right
    ];

    for (const dir of directions) {
      const newRow = tile.row + dir.row;
      const newCol = tile.col + dir.col;

      // Find if there's a tile at this position
      const adjacentTileIndex = gameState.placedTiles.findIndex(
        (t) => t.row === newRow && t.col === newCol
      );

      if (adjacentTileIndex !== -1 && !visited[adjacentTileIndex]) {
        dfs(adjacentTileIndex, group);
      }
    }
  }

  // Find all connected components
  for (let i = 0; i < gameState.placedTiles.length; i++) {
    if (!visited[i]) {
      const group = [];
      dfs(i, group);
      groups.push(group);
    }
  }

  return groups;
}

// Find all words on the board
function findWords() {
  const foundWords = [];
  const invalidWords = [];

  // Create a board representation for easy lookup
  const board = Array(gameState.boardSize)
    .fill()
    .map(() => Array(gameState.boardSize).fill(null));

  // Fill the board with placed tiles
  gameState.placedTiles.forEach((tile) => {
    board[tile.row][tile.col] = tile;
  });

  // Check horizontal words
  for (let row = 0; row < gameState.boardSize; row++) {
    let currentWord = [];

    for (let col = 0; col < gameState.boardSize; col++) {
      if (board[row][col]) {
        currentWord.push(board[row][col]);
      } else if (currentWord.length > 0) {
        // We've reached the end of a potential word
        if (currentWord.length > 1) {
          processWord(currentWord, "horizontal");
        }
        currentWord = [];
      }
    }

    // Check if we have a word at the end of the row
    if (currentWord.length > 1) {
      processWord(currentWord, "horizontal");
    }
  }

  // Check vertical words
  for (let col = 0; col < gameState.boardSize; col++) {
    let currentWord = [];

    for (let row = 0; row < gameState.boardSize; row++) {
      if (board[row][col]) {
        currentWord.push(board[row][col]);
      } else if (currentWord.length > 0) {
        // We've reached the end of a potential word
        if (currentWord.length > 1) {
          processWord(currentWord, "vertical");
        }
        currentWord = [];
      }
    }

    // Check if we have a word at the end of the column
    if (currentWord.length > 1) {
      processWord(currentWord, "vertical");
    }
  }

  function processWord(tiles, direction) {
    // Get the letters for this word, using wildcard value if available
    const letters = tiles.map((tile) => {
      if (tile.letter === "*") {
        // Get the wildcard value if set
        const tileElement = document.querySelector(
          `.board-cell[data-row="${tile.row}"][data-col="${tile.col}"] .tile`
        );
        if (tileElement && tileElement.dataset.wildValue) {
          return tileElement.dataset.wildValue;
        }
        return "?"; // If no wild value set yet
      }
      return tile.letter;
    });

    const word = letters.join("");

    // Skip words with unresolved wildcards
    if (word.includes("?")) return;

    const wordInfo = {
      word,
      tiles,
      direction,
    };

    // Validate the word against the dictionary
    if (isValidWord(word)) {
      foundWords.push(wordInfo);
    } else {
      invalidWords.push(wordInfo);
    }
  }

  return { foundWords, invalidWords };
}

// Unlock an achievement
function unlockAchievement(achievementId) {
  // Check if achievement exists and isn't already unlocked
  if (
    gameState.achievements[achievementId] &&
    !gameState.achievements[achievementId].unlocked
  ) {
    gameState.achievements[achievementId].unlocked = true;
    const achievement = gameState.achievements[achievementId];

    // Save achievements to localStorage
    savePlayerData();

    // Show achievement notification
    showAchievementToast(achievement);
  }
}

// Display achievement notification
function showAchievementToast(achievement) {
  const toast = document.getElementById("achievementToast");
  toast.innerHTML = `
        <div class="achievement-toast-icon">${achievement.icon}</div>
        <div class="achievement-toast-content">
            <div class="achievement-toast-title">Achievement Unlocked!</div>
            <div class="achievement-toast-desc">${achievement.name}: ${achievement.description}</div>
        </div>
    `;

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 4000);
}

// Animate bonus tiles and apply them to the board
function animateBonusTiles() {
  if (!gameState.needBonusAnimation || !gameState.specialSquares) return;

  const boardContainer = document.querySelector(".board-container");
  const gameBoard = document.querySelector(".game-board");
  const bonusTiles = [];

  // Create floating bonus indicators
  gameState.specialSquares.forEach((square) => {
    // Create a visual element for the bonus
    const bonusElement = document.createElement("div");
    bonusElement.className = `bonus-indicator ${square.type}`;
    bonusElement.textContent = square.label;
    bonusElement.style.position = "absolute";
    bonusElement.style.zIndex = "10";
    bonusElement.style.width = "40px";
    bonusElement.style.height = "40px";
    bonusElement.style.borderRadius = "50%";
    bonusElement.style.display = "flex";
    bonusElement.style.alignItems = "center";
    bonusElement.style.justifyContent = "center";
    bonusElement.style.fontWeight = "bold";
    bonusElement.style.color = "#333";
    bonusElement.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.2)";

    // Set color based on type
    switch (square.type) {
      case "tw":
        bonusElement.style.backgroundColor = "var(--special-tw)";
        break;
      case "tl":
        bonusElement.style.backgroundColor = "var(--special-tl)";
        break;
      case "dw":
        bonusElement.style.backgroundColor = "var(--special-dw)";
        break;
      case "dl":
        bonusElement.style.backgroundColor = "var(--special-dl)";
        break;
    }

    // Place randomly on the board
    const boardRect = gameBoard.getBoundingClientRect();
    bonusElement.style.left = Math.random() * (boardRect.width - 40) + "px";
    bonusElement.style.top = Math.random() * (boardRect.height - 40) + "px";
    bonusElement.style.transition = "all 1.5s cubic-bezier(0.25, 1, 0.5, 1.25)";

    boardContainer.appendChild(bonusElement);

    // Store for later
    bonusTiles.push({
      element: bonusElement,
      square: square,
    });
  });

  // Let them be visible for a moment before animating
  setTimeout(() => {
    // Find target positions for each bonus tile
    bonusTiles.forEach((bonusTile) => {
      const targetCell = document.querySelector(
        `.board-cell[data-row="${bonusTile.square.row}"][data-col="${bonusTile.square.col}"]`
      );
      const cellRect = targetCell.getBoundingClientRect();
      const boardContainerRect = boardContainer.getBoundingClientRect();

      // Calculate position relative to the board container
      const left =
        cellRect.left - boardContainerRect.left + (cellRect.width - 40) / 2;
      const top =
        cellRect.top - boardContainerRect.top + (cellRect.height - 40) / 2;

      // Animate to the target position
      bonusTile.element.style.left = left + "px";
      bonusTile.element.style.top = top + "px";
    });

    // When animation is done, apply the classes to the actual cells
    setTimeout(() => {
      // Apply the special square classes
      gameState.specialSquares.forEach((square) => {
        const cell = document.querySelector(
          `.board-cell[data-row="${square.row}"][data-col="${square.col}"]`
        );
        if (cell) {
          cell.classList.add(square.type);
          cell.dataset.bonus = square.label;
          cell.classList.add("highlight");
        }
      });

      // Fade out and remove the animated elements
      bonusTiles.forEach((bonusTile) => {
        bonusTile.element.style.opacity = "0";
        bonusTile.element.style.transform = "scale(0.5)";
        setTimeout(() => bonusTile.element.remove(), 500);
      });

      // Animation is done
      gameState.needBonusAnimation = false;
    }, 1500); // Time for the movement animation
  }, 200); // Small delay before starting animation
}

// Setup buttons
function setupButtons() {
  // Start game button
  let parent = document.getElementById("welcomeModal");
  let child = parent.querySelector(".modal-content");
  parent.addEventListener("click", () => {
    document.getElementById("welcomeModal").classList.remove("active");

    // Start the bonus tile animation
    if (gameState.needBonusAnimation) {
      animateBonusTiles();
    }
  });
  child.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.getElementById("startGameBtn").addEventListener("click", () => {
    document.getElementById("welcomeModal").classList.remove("active");

    // Start the bonus tile animation
    if (gameState.needBonusAnimation) {
      animateBonusTiles();
    }
  });

  // Rules button

  document.getElementById("rulesBtn").addEventListener("click", () => {
    document.getElementById("rulesModal").classList.add("active");
  });
  document.getElementById("rulesBtnL").addEventListener("click", () => {
    document.getElementById("rulesModal").classList.add("active");
  });

  // Close rules button

  parent = document.getElementById("rulesModal");
  child = parent.querySelector(".modal-content");

  parent.addEventListener("click", () => {
    document.getElementById("rulesModal").classList.remove("active");
  });
  child.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  document.getElementById("closeRulesBtn").addEventListener("click", () => {
    document.getElementById("rulesModal").classList.remove("active");
  });

  // Submit button
  document.getElementById("submitBtn").addEventListener("click", () => {
    if (gameState.placedTiles.length === 0) {
      showToast("Place some tiles on the board first!", "error");
      return;
    }

    if (!validateBoard()) {
      showToast("Fix the errors before submitting!", "error");
      return;
    }

    // Check if any words are invalid
    if (gameState.wordData.invalidWords.length > 0) {
      const invalidWords = gameState.wordData.invalidWords
        .map((w) => w.word)
        .join(", ");
      showToast(`Invalid word(s): ${invalidWords}`, "error");
      return;
    }

    // Show the confirmation modal
    document.getElementById("confirmSubmitModal").classList.add("active");
  });

  // Cancel submit button
  document.getElementById("cancelSubmitBtn").addEventListener("click", () => {
    document.getElementById("confirmSubmitModal").classList.remove("active");
  });

  // Confirm submit button
  document.getElementById("confirmSubmitBtn").addEventListener("click", () => {
    document.getElementById("confirmSubmitModal").classList.remove("active");

    // Update stats before completing
    updateStatsForGameCompletion();

    // Unlock first game achievement
    unlockAchievement("firstGame");

    // Mark the game as completed
    gameState.gameCompleted = true;

    // Save the completion data
    saveGameCompletion();

    // Save player stats and achievements
    savePlayerData();

    // Show the finish game modal
    showFinishGameModal(gameState.score);
  });

  // Close leaderboard button
  document
    .getElementById("closeLeaderboardBtn")
    .addEventListener("click", () => {
      // Remember that we closed the modal today
      localStorage.setItem("modalClosed", new Date().toDateString());

      document.getElementById("finishGameModal").classList.remove("active");
      // Show post-game message with countdown
      document.getElementById("postGameMessage").style.display = "flex";
      // Start the countdown in the post-game message
      updatePostGameCountdown();
      // Disable all interactions after the game is complete
      disableGameInteractions();
    });

  // Reopen leaderboard button
  document
    .getElementById("reopenLeaderboardBtn")
    .addEventListener("click", () => {
      document.getElementById("postGameMessage").style.display = "none";

      // Properly re-initialize the leaderboard with the saved score
      const score = gameState.score;
      showFinishGameModal(score);
    });

  // Clear board button
  document.getElementById("clearBtn").addEventListener("click", () => {
    clearBoard();
  });

  // Shuffle tiles button
  document.getElementById("shuffleBtn").addEventListener("click", () => {
    shuffleTiles();
  });

  // Share score button
  document.getElementById("shareScoreBtn").addEventListener("click", () => {
    const score = document.getElementById("finalScore").textContent;
    const shareText = `I scored ${score} points in today's Letter Links challenge! Can you beat my score? Play at [game URL]`;

    // Copy to clipboard
    navigator.clipboard
      .writeText(shareText)
      .then(() => {
        showToast("Score copied to clipboard!", "success");
      })
      .catch((err) => {
        console.error("Could not copy text: ", err);
        showToast("Couldn't copy to clipboard", "error");
      });
  });
}

// Update player stats at the end of the game
function updateStatsForGameCompletion() {
  // Increment games played
  gameState.stats.gamesPlayed++;

  // Update highest score
  if (gameState.score > gameState.stats.highestScore) {
    gameState.stats.highestScore = gameState.score;
  }
}

// Save game completion data
function saveGameCompletion() {
  const gameData = {
    score: gameState.score,
    date: new Date().toISOString(),
    letters: gameState.letters.concat(gameState.placedTiles),
  };

  localStorage.setItem("wordcraftGame", JSON.stringify(gameData));
}

// Validate score to prevent tampering
function validateFinalScore(score) {
  // Check if score is a reasonable number
  if (typeof score !== "number" || isNaN(score) || !isFinite(score)) {
    console.error("Invalid score detected:", score);
    return 0;
  }

  // Check if the placed tiles and score make sense
  const placedTilesCount = gameState.placedTiles
    ? gameState.placedTiles.length
    : 0;

  // Only validate completely empty boards with non-zero scores
  // This catches the most obvious cases of tampering
  if (placedTilesCount === 0 && score > 0) {
    console.error(
      "Invalid score detected - score with no tiles placed:",
      score
    );
    return 0;
  }

  // Verify score matches calculated score
  const calculatedScore = calculateScore();
  if (score > calculatedScore * 1.1) {
    // Allow for small variations due to timing issues
    console.error(
      "Score tampering detected:",
      score,
      "calculated:",
      calculatedScore
    );
    return calculatedScore;
  }

  return score;
}

// Show the finish game modal with leaderboard
function showFinishGameModal(score) {
  // Validate the score to prevent tampering
  const validatedScore = validateFinalScore(score);

  // Update game state with validated score
  gameState.score = validatedScore;

  // Fill in the final score
  document.getElementById("finalScore").textContent = validatedScore + " pts";

  // Initialize the leaderboard UI
  initializeLeaderboard();

  // Check if we've already saved a score today
  const hasSubmittedScore = localStorage.getItem("scoreSubmittedToday");
  const today = new Date().toDateString();

  if (hasSubmittedScore === today) {
    // If score was already submitted today, hide the form
    document.getElementById("nicknameForm").style.display = "none";
    document.getElementById("saveScoreMessage").textContent =
      "You have already submitted your score today.";
    document.getElementById("saveScoreMessage").className =
      "save-score-message";
  } else {
    // Reset nickname form
    document.getElementById("nicknameForm").style.display = "block";
    document.getElementById("nicknameInput").value = "";
    document.getElementById("saveScoreMessage").textContent = "";
  }

  // Load daily leaderboard by default
  loadLeaderboard("daily");

  // Fill in player stats
  renderPlayerStats();

  // Fill in achievements
  renderPlayerAchievements();

  // Update the countdown in the leaderboard
  updateLeaderboardCountdown();

  // Show the modal
  document.getElementById("finishGameModal").classList.add("active");
}

// Render player statistics in the modal
function renderPlayerStats() {
  const statsContainer = document.getElementById("playerStats");
  statsContainer.innerHTML = "";

  // Define the stats to display
  const statsToDisplay = [
    { label: "Highest Score", value: gameState.stats.highestScore },
    { label: "Games Played", value: gameState.stats.gamesPlayed },
    { label: "Longest Word", value: gameState.stats.longestWord || "None" },
    { label: "Tiles Placed", value: gameState.stats.totalTilesPlaced },
  ];

  // Create stat elements
  statsToDisplay.forEach((stat) => {
    const statItem = document.createElement("div");
    statItem.className = "stat-item";
    statItem.innerHTML = `
            <div class="stat-value">${stat.value}</div>
            <div class="stat-label">${stat.label}</div>
        `;
    statsContainer.appendChild(statItem);
  });
}

// Render player achievements in the modal
function renderPlayerAchievements() {
  const achievementsContainer = document.getElementById("playerAchievements");
  achievementsContainer.innerHTML = "";

  // Sort achievements by display order
  const sortedAchievements = Object.entries(gameState.achievements)
    .map(([id, achievement]) => ({ id, ...achievement }))
    .sort((a, b) => a.displayOrder - b.displayOrder);

  // Create achievement elements
  sortedAchievements.forEach((achievement) => {
    const achievementItem = document.createElement("div");
    achievementItem.className = `achievement-item ${
      achievement.unlocked ? "unlocked" : "locked"
    }`;
    achievementItem.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-name">${achievement.name}</div>
            <div class="achievement-desc">${achievement.description}</div>
        `;
    achievementsContainer.appendChild(achievementItem);
  });
}

// Initialize Firebase leaderboard functionality
function initializeLeaderboard() {
  // Set up tab switching
  const tabButtons = document.querySelectorAll(".tab-btn");
  tabButtons.forEach((button) => {
    button.addEventListener("click", function () {
      // Update active tab
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      this.classList.add("active");

      // Load appropriate leaderboard data
      const tabType = this.dataset.tab;
      // Reset pagination when changing tabs
      localStorage.setItem("leaderboardPage", "1");
      loadLeaderboard(tabType);
    });
  });

  // Set up refresh button
  const refreshButton = document.getElementById("refreshLeaderboardBtn");
  if (refreshButton) {
    refreshButton.addEventListener("click", function () {
      // Visual feedback - add spinning animation
      this.classList.add("spinning");

      // Show loading indicator
      const leaderboardLoading = document.getElementById("leaderboardLoading");
      if (leaderboardLoading) {
        leaderboardLoading.textContent = "Refreshing scores...";
        leaderboardLoading.style.display = "block";
      }

      // Get the current active tab
      const activeTab = document.querySelector(".tab-btn.active").dataset.tab;

      // Force refresh Firebase data
      if (window.firebaseDB) {
        // Don't try to clear persistence as it can only be done before initialization
        // Just use { source: 'server' } when getting data (handled in loadLeaderboard with forceRefresh=true)

        // Force a hard refresh of the leaderboard
        loadLeaderboard(activeTab, true);

        // Remove spinning animation after a delay
        setTimeout(() => {
          refreshButton.classList.remove("spinning");
        }, 1500);
      } else {
        // If Firebase isn't available, just reload what we have
        loadLeaderboard(activeTab);
        refreshButton.classList.remove("spinning");
      }
    });
  }

  // Set up save score button
  const saveScoreBtn = document.getElementById("saveScoreBtn");
  saveScoreBtn.addEventListener("click", function () {
    let nickname = document.getElementById("nicknameInput").value.trim();
    // Validate the score again before submission to prevent console tampering
    const score = validateFinalScore(gameState.score);

    if (!nickname) {
      showSaveScoreMessage("Please enter a nickname", "error");
      return;
    }

    // Sanitize nickname - only allow safe characters
    if (!/^[A-Za-z0-9 _-]+$/.test(nickname)) {
      // If it contains invalid chars, strip them
      nickname = nickname.replace(/[^A-Za-z0-9 _-]/g, "");
    }

    nickname = nickname.substring(0, 15); // Limit length

    // Make sure there's still a name after sanitization
    if (!nickname) {
      showSaveScoreMessage("Please enter a valid nickname", "error");
      return;
    }

    saveScoreToFirebase(nickname, score);
  });
}

// Save score to Firebase
async function saveScoreToFirebase(nickname, score) {
  const saveScoreMessage = document.getElementById("saveScoreMessage");

  // Show loading state
  saveScoreMessage.textContent = "Saving your score...";
  saveScoreMessage.className = "save-score-message";

  // Check if we've already submitted a score today
  const today = new Date().toDateString();
  if (localStorage.getItem("scoreSubmittedToday") === today) {
    showSaveScoreMessage(
      "You have already submitted your score today.",
      "error"
    );
    return;
  }

  // Check if we're in test mode (add test indicator to nickname if so)
  const isTestMode = location.search.includes("test=true");
  const actualNickname = isTestMode ? `${nickname} (Test)` : nickname;

  // Log if we're in test mode
  if (isTestMode) {
    console.log(
      "Saving score in TEST MODE - scores will be marked as test scores"
    );
  }

  try {
    // Check if window.firebaseDB is available
    if (!window.firebaseDB) {
      throw new Error("Firebase is not initialized");
    }

    // Set a timeout to ensure we don't hang indefinitely
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timed out")), 8000);
    });

    // Try to save to Firebase
    const success = await Promise.race([
      window.firebaseDB.saveScore(actualNickname, score),
      timeoutPromise,
    ]);

    // Firebase save successful (note: local storage is also saved in the Firebase backend)
    if (success) {
      // Record that we've submitted a score today
      localStorage.setItem("scoreSubmittedToday", today);

      // Hide nickname form
      document.getElementById("nicknameForm").style.display = "none";

      // Show success message
      showSaveScoreMessage("Score saved successfully!", "success");

      // Make multiple attempts to get an up-to-date leaderboard
      const activeTab = document.querySelector(".tab-btn.active").dataset.tab;

      // Give immediate visual feedback
      const leaderboardBody = document.getElementById("leaderboardBody");
      if (leaderboardBody) {
        leaderboardBody.innerHTML =
          '<tr><td colspan="3" style="text-align: center; padding: 20px;">Refreshing leaderboard with your new score...</td></tr>';
      }

      // Use a staggered approach with multiple attempts to get the latest data

      // First try immediately
      setTimeout(() => {
        loadLeaderboard(activeTab, true);
      }, 100);

      // Try again after a short delay
      setTimeout(() => {
        if (
          document.querySelector(".tab-btn.active")?.dataset.tab === activeTab
        ) {
          loadLeaderboard(activeTab, true);
        }
      }, 1000);

      // Try again after a medium delay
      setTimeout(() => {
        if (
          document.querySelector(".tab-btn.active")?.dataset.tab === activeTab
        ) {
          loadLeaderboard(activeTab, true);
        }
      }, 3000);

      // One final attempt after a longer delay
      setTimeout(() => {
        if (
          document.querySelector(".tab-btn.active")?.dataset.tab === activeTab
        ) {
          loadLeaderboard(activeTab, true);
        }
      }, 5000);
    } else {
      // Should never get here since firebaseDB.saveScore always returns true now
      // (even for offline/pending saves), but just in case
      showSaveScoreMessage(
        "Score saved. Waiting for network to sync.",
        "success"
      );

      // Record that we've submitted a score today
      localStorage.setItem("scoreSubmittedToday", today);

      // Hide the form
      document.getElementById("nicknameForm").style.display = "none";

      // Try to display what we have in localStorage
      const activeTab = document.querySelector(".tab-btn.active").dataset.tab;
      loadLeaderboard(activeTab);
    }
  } catch (error) {
    console.error("Error saving score:", error);

    // Try the save again but with fallback version
    try {
      // The backend functions should handle offline mode and save locally
      if (window.firebaseDB) {
        await window.firebaseDB.saveScore(actualNickname, score);

        // Record that we've submitted a score today
        localStorage.setItem("scoreSubmittedToday", today);

        showSaveScoreMessage(
          "Score saved locally. Will sync when online.",
          "success"
        );

        // Hide the form
        document.getElementById("nicknameForm").style.display = "none";
      } else {
        throw new Error("Firebase not available");
      }
    } catch (e) {
      console.error("Complete failure saving score:", e);
      showSaveScoreMessage("Unable to save score. Please try again.", "error");
      // Don't hide the form so they can try again
      return;
    }

    // Load what we have locally
    const activeTab = document.querySelector(".tab-btn.active").dataset.tab;
    loadLeaderboard(activeTab);
  }
}

// Save locally without Firebase
function saveLocalScore(nickname, score) {
  console.log("Saving score locally:", nickname, score);

  // Create score data with proper date tracking
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const scoreData = {
    id: Date.now().toString(),
    nickname: nickname,
    score: score,
    date: now,
    dateStr: now.toISOString(),
    day: today,
    dayStr: today.toISOString(),
    // Add unique identifier to prevent duplication issues
    uniqueId: `${nickname}-${score}-${now.getTime()}`,
  };

  // Add to local storage session scores
  let localScores = JSON.parse(
    localStorage.getItem("wordcraftLocalScores") || '{"daily":[],"allTime":[]}'
  );

  // Clean old daily scores that aren't from today
  const todayString = today.toDateString();
  localScores.daily = localScores.daily.filter((score) => {
    // If score has day object, convert and check
    if (score.day && typeof score.day === "object") {
      return new Date(score.day).toDateString() === todayString;
    }
    // If score has dayStr string, convert and check
    else if (score.dayStr) {
      return new Date(score.dayStr).toDateString() === todayString;
    }
    // If score has only date, convert and check
    else if (score.date) {
      const scoreDate = new Date(score.date);
      return scoreDate.toDateString() === todayString;
    }
    // If no date information, remove it
    return false;
  });

  // Add to daily scores
  localScores.daily.push(scoreData);
  localScores.daily.sort((a, b) => b.score - a.score);

  // Add to all-time scores, but check for duplicates with same uniqueId
  const isDuplicate = localScores.allTime.some(
    (score) => score.uniqueId === scoreData.uniqueId
  );
  if (!isDuplicate) {
    localScores.allTime.push(scoreData);
    localScores.allTime.sort((a, b) => b.score - a.score);
  }

  // Limit total number of stored scores to prevent localStorage bloat
  if (localScores.allTime.length > 100) {
    localScores.allTime = localScores.allTime.slice(0, 100);
  }

  // Save back to localStorage
  localStorage.setItem("wordcraftLocalScores", JSON.stringify(localScores));

  return true;
}

// Show save score message
function showSaveScoreMessage(message, type) {
  const messageElement = document.getElementById("saveScoreMessage");
  messageElement.textContent = message;
  messageElement.className = "save-score-message";
  if (type) {
    messageElement.classList.add(type);
  }
}

// Load leaderboard data
async function loadLeaderboard(type = "daily", forceRefresh = false) {
  // Show loading indicator
  const leaderboardLoading = document.getElementById("leaderboardLoading");
  const leaderboardBody = document.getElementById("leaderboardBody");
  const scoreLeaderboard = document.getElementById("scoreLeaderboard");
  const yesterdayBestContainer = document.getElementById(
    "yesterdayBestContainer"
  );

  // Set visibility based on tab type
  if (type === "yesterdayBest") {
    scoreLeaderboard.style.display = "none";
    yesterdayBestContainer.style.display = "flex";

    // Load yesterday's best board
    try {
      await loadYesterdayBestBoard(forceRefresh);
      leaderboardLoading.style.display = "none";

      // Set up the toggle button for yesterday's best board
      setupYesterdayBestToggle();
    } catch (error) {
      console.error("Error loading yesterday's best board:", error);
      leaderboardLoading.style.display = "none";
      yesterdayBestContainer.innerHTML = `
                <div class="yesterday-best-message">
                    <p>Unable to load yesterday's best board. Please try again later.</p>
                </div>
            `;
    }
    return;
  } else {
    // Regular leaderboard tabs (daily or all-time)
    scoreLeaderboard.style.display = "table";
    yesterdayBestContainer.style.display = "none";
  }

  leaderboardLoading.style.display = "block";
  leaderboardLoading.textContent = "Loading leaderboard...";
  leaderboardBody.innerHTML = "";

  try {
    // Check if Firebase is available
    if (!window.firebaseDB) {
      throw new Error("Firebase is not initialized");
    }

    // Show loading state while fetching data directly from server
    if (forceRefresh) {
      leaderboardBody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px;">Refreshing from server...</td></tr>`;
    }

    // Get scores from Firebase (which now forces server fetch when forceRefresh=true)
    const scores =
      type === "daily"
        ? await window.firebaseDB.getDailyLeaderboard()
        : await window.firebaseDB.getAllTimeLeaderboard();

    if (scores && scores.length > 0) {
      // Hide loading indicator
      leaderboardLoading.style.display = "none";

      // Display the scores
      displayLeaderboardData(scores);
      console.log(`Leaderboard (${type}) loaded with ${scores.length} entries`);
    } else {
      // If no scores, show message
      leaderboardLoading.style.display = "none";
      leaderboardBody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px;">No scores available yet</td></tr>`;
    }
  } catch (error) {
    console.error("Error loading leaderboard:", error);

    // Hide loading indicator and show error message
    leaderboardLoading.style.display = "none";
    leaderboardBody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px;">
            Unable to load scores. Check your network connection.
        </td></tr>`;

    // Add a retry button
    const retryBtn = document.createElement("button");
    retryBtn.className = "btn btn-primary";
    retryBtn.textContent = "Retry";
    retryBtn.style.margin = "10px auto";
    retryBtn.style.display = "block";
    retryBtn.onclick = () => loadLeaderboard(type, true);
    leaderboardBody.appendChild(retryBtn);
  }

  // Always make a second request after a delay to ensure we have the latest data
  setTimeout(() => {
    // Only update if still on the same tab and if modal is still visible
    const tabType = document.querySelector(".tab-btn.active")?.dataset.tab;
    const modalVisible = document
      .getElementById("finishGameModal")
      .classList.contains("active");

    if (modalVisible && tabType === type && window.firebaseDB) {
      // Only do the background refresh if we haven't just done a forced refresh
      if (!forceRefresh) {
        // Don't display loading indicators for this background refresh
        if (type === "daily") {
          window.firebaseDB
            .getDailyLeaderboard()
            .then((newScores) => {
              if (newScores && newScores.length > 0) {
                // Make sure we're still on the same tab
                if (
                  document.querySelector(".tab-btn.active")?.dataset.tab ===
                  type
                ) {
                  displayLeaderboardData(newScores);
                  console.log(
                    `Leaderboard (${type}) updated in background with ${newScores.length} entries`
                  );
                }
              }
            })
            .catch((err) => console.log("Background refresh failed:", err));
        } else {
          window.firebaseDB
            .getAllTimeLeaderboard()
            .then((newScores) => {
              if (newScores && newScores.length > 0) {
                // Make sure we're still on the same tab
                if (
                  document.querySelector(".tab-btn.active")?.dataset.tab ===
                  type
                ) {
                  displayLeaderboardData(newScores);
                  console.log(
                    `Leaderboard (${type}) updated in background with ${newScores.length} entries`
                  );
                }
              }
            })
            .catch((err) => console.log("Background refresh failed:", err));
        }
      }
    }
  }, 5000); // Wait 5 seconds before background refresh
}

// Display leaderboard data from Firebase with pagination
function displayLeaderboardData(scores) {
  // Clear the leaderboard body
  const leaderboardBody = document.getElementById("leaderboardBody");
  leaderboardBody.innerHTML = "";

  // Remove any existing pagination controls
  const existingPagination = document.querySelectorAll(".pagination-controls");
  existingPagination.forEach((element) => element.remove());

  // Get current user's score and nickname
  const userScore = gameState.score;
  const nicknameInput = document.getElementById("nicknameInput");
  const userNickname = nicknameInput ? nicknameInput.value.trim() : "";

  // Get device ID (used to identify scores from this device)
  const deviceId = localStorage.getItem("wordcraftDeviceId") || "";

  // Get locally hidden entries in test mode
  let hiddenEntries = [];
  if (location.search.includes("test=true")) {
    hiddenEntries = JSON.parse(
      localStorage.getItem("wordcraftHiddenEntries") || "[]"
    );
    console.log(`Filtering out ${hiddenEntries.length} hidden entries`);
  }

  // Filter out locally hidden entries
  const visibleScores = scores.filter(
    (entry) => !hiddenEntries.includes(entry.id)
  );

  // Pagination setup
  const currentPage = parseInt(localStorage.getItem("leaderboardPage") || "1");
  const entriesPerPage = 10;
  const totalPages = Math.ceil(visibleScores.length / entriesPerPage);

  // Ensure current page is valid
  const validatedPage = Math.min(
    Math.max(1, currentPage),
    Math.max(1, totalPages)
  );
  if (validatedPage !== currentPage) {
    localStorage.setItem("leaderboardPage", validatedPage.toString());
  }

  // Calculate slice for current page
  const startIndex = (validatedPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const currentPageScores = visibleScores.slice(startIndex, endIndex);

  // Display current page scores
  currentPageScores.forEach((entry, index) => {
    // Calculate the actual leaderboard position
    const globalIndex = startIndex + index;
    const row = document.createElement("tr");

    // Highlight current user's score:
    // 1. Check for explicit isUser flag
    // 2. Check for exact score match with current game score (if score is non-zero)
    // 3. Check for matching nickname (case insensitive)
    // 4. Check for matching device ID
    const isThisUser =
      entry.isUser ||
      (entry.score === userScore && userScore > 0) ||
      (userNickname &&
        entry.nickname &&
        entry.nickname.toLowerCase() === userNickname.toLowerCase()) ||
      (deviceId && entry.deviceId === deviceId);

    if (isThisUser) {
      row.classList.add("current-user");
      console.log(`Highlighted user score: ${entry.nickname} - ${entry.score}`);
    }

    // Add admin buttons in test mode
    const isTestMode = location.search.includes("test=true");
    let adminButtons = "";

    if (isTestMode) {
      adminButtons = `
                <button class="view-board-btn" data-entry-id="${entry.id}" title="View Board">👁️</button>
                <button class="delete-entry-btn" data-entry-id="${entry.id}" title="Hide Entry (on this device only)" style="color: #d32f2f; background-color: rgba(211, 47, 47, 0.1);">🗑️</button>
            `;
    }

    row.innerHTML = `
            <td>${globalIndex + 1}</td>
            <td>${escapeHtml(
              entry.nickname || entry.name || "Unknown"
            )} ${adminButtons}</td>
            <td>${entry.score}</td>
        `;

    leaderboardBody.appendChild(row);
  });

  // If no entries were found, show a message
  if (visibleScores.length === 0) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = `<td colspan="3" style="text-align: center; padding: 20px;">No scores available yet</td>`;
    leaderboardBody.appendChild(emptyRow);
  }

  // Add pagination controls if there are multiple pages
  if (totalPages > 1) {
    // Create pagination container
    const paginationContainer = document.createElement("div");
    paginationContainer.className = "pagination-controls";
    paginationContainer.style.textAlign = "center";
    paginationContainer.style.margin = "15px 0";
    paginationContainer.style.display = "flex";
    paginationContainer.style.justifyContent = "center";
    paginationContainer.style.gap = "5px";

    // Add page info
    const pageInfo = document.createElement("div");
    pageInfo.style.margin = "0 10px";
    pageInfo.style.padding = "5px 10px";
    pageInfo.style.fontSize = "14px";
    pageInfo.textContent = `Page ${validatedPage} of ${totalPages}`;

    // Previous button
    const prevButton = document.createElement("button");
    prevButton.className = "btn btn-small";
    prevButton.textContent = "« Previous";
    prevButton.disabled = validatedPage <= 1;
    prevButton.addEventListener("click", () => {
      if (validatedPage > 1) {
        localStorage.setItem("leaderboardPage", (validatedPage - 1).toString());
        // Reload the current tab
        const activeTab =
          document.querySelector(".tab-btn.active")?.dataset.tab;
        if (activeTab) {
          loadLeaderboard(activeTab);
        }
      }
    });

    // Next button
    const nextButton = document.createElement("button");
    nextButton.className = "btn btn-small";
    nextButton.textContent = "Next »";
    nextButton.disabled = validatedPage >= totalPages;
    nextButton.addEventListener("click", () => {
      if (validatedPage < totalPages) {
        localStorage.setItem("leaderboardPage", (validatedPage + 1).toString());
        // Reload the current tab
        const activeTab =
          document.querySelector(".tab-btn.active")?.dataset.tab;
        if (activeTab) {
          loadLeaderboard(activeTab);
        }
      }
    });

    // First page button
    const firstButton = document.createElement("button");
    firstButton.className = "btn btn-small";
    firstButton.textContent = "« First";
    firstButton.disabled = validatedPage <= 1;
    firstButton.addEventListener("click", () => {
      localStorage.setItem("leaderboardPage", "1");
      // Reload the current tab
      const activeTab = document.querySelector(".tab-btn.active")?.dataset.tab;
      if (activeTab) {
        loadLeaderboard(activeTab);
      }
    });

    // Last page button
    const lastButton = document.createElement("button");
    lastButton.className = "btn btn-small";
    lastButton.textContent = "Last »";
    lastButton.disabled = validatedPage >= totalPages;
    lastButton.addEventListener("click", () => {
      localStorage.setItem("leaderboardPage", totalPages.toString());
      // Reload the current tab
      const activeTab = document.querySelector(".tab-btn.active")?.dataset.tab;
      if (activeTab) {
        loadLeaderboard(activeTab);
      }
    });

    // Add buttons to container
    paginationContainer.appendChild(firstButton);
    paginationContainer.appendChild(prevButton);
    paginationContainer.appendChild(pageInfo);
    paginationContainer.appendChild(nextButton);
    paginationContainer.appendChild(lastButton);

    // Add to the table
    const leaderboardContainer = document.getElementById(
      "leaderboardContainer"
    );
    // Find where to insert pagination - after the table
    const table = document.getElementById("scoreLeaderboard");
    leaderboardContainer.insertBefore(paginationContainer, table.nextSibling);
  }

  // In test mode, add a button to manage hidden entries if there are any
  if (location.search.includes("test=true") && hiddenEntries.length > 0) {
    const hiddenInfo = document.createElement("div");
    hiddenInfo.className = "hidden-entries-info";
    hiddenInfo.style.padding = "10px";
    hiddenInfo.style.margin = "10px 0";
    hiddenInfo.style.backgroundColor = "#f8f9fa";
    hiddenInfo.style.borderRadius = "4px";
    hiddenInfo.style.fontSize = "14px";

    hiddenInfo.innerHTML = `
            <p><strong>Personal Filter:</strong> ${hiddenEntries.length} entries are hidden on this device only.</p>
            <div style="color: #666; font-size: 12px; margin-bottom: 8px;">
                Note: Hiding entries is device-specific. Other users and other devices will still see these entries.
                To permanently remove entries, contact the site administrator.
            </div>
            <button id="viewHiddenEntriesBtn" class="btn btn-small">Show Hidden Entries</button>
            <button id="clearHiddenEntriesBtn" class="btn btn-small" style="margin-left: 8px;">Reset Hidden Entries</button>
        `;

    leaderboardBody.parentNode.insertBefore(
      hiddenInfo,
      leaderboardBody.nextSibling
    );

    // Add event handlers for the buttons
    document
      .getElementById("viewHiddenEntriesBtn")
      .addEventListener("click", function () {
        // Toggle the button text
        if (this.textContent === "Show Hidden Entries") {
          this.textContent = "Hide Hidden Entries";

          // Add rows for hidden entries
          const hiddenRows = scores.filter((entry) =>
            hiddenEntries.includes(entry.id)
          );

          if (hiddenRows.length > 0) {
            const hiddenSection = document.createElement("tbody");
            hiddenSection.id = "hiddenEntriesSection";
            hiddenSection.style.opacity = "0.6";

            // Add header
            const headerRow = document.createElement("tr");
            headerRow.innerHTML = `<td colspan="3" style="text-align: center; padding: 10px; background-color: #f1f1f1;">Hidden Entries</td>`;
            hiddenSection.appendChild(headerRow);

            // Add each hidden entry
            hiddenRows.forEach((entry, i) => {
              const row = document.createElement("tr");
              row.style.textDecoration = "line-through";

              row.innerHTML = `
                            <td>H${i + 1}</td>
                            <td>${escapeHtml(
                              entry.nickname || entry.name || "Unknown"
                            )} 
                                <button class="unhide-btn" data-entry-id="${
                                  entry.id
                                }" title="Unhide Entry" style="color: #2196F3; background-color: rgba(33, 150, 243, 0.1);">🔄</button>
                            </td>
                            <td>${entry.score}</td>
                        `;

              hiddenSection.appendChild(row);
            });

            // Add to the table
            document
              .getElementById("scoreLeaderboard")
              .appendChild(hiddenSection);

            // Add unhide functionality
            document.querySelectorAll(".unhide-btn").forEach((btn) => {
              btn.addEventListener("click", function () {
                const entryId = this.dataset.entryId;
                let hiddenEntries = JSON.parse(
                  localStorage.getItem("wordcraftHiddenEntries") || "[]"
                );

                // Remove this ID from hidden entries
                hiddenEntries = hiddenEntries.filter((id) => id !== entryId);
                localStorage.setItem(
                  "wordcraftHiddenEntries",
                  JSON.stringify(hiddenEntries)
                );

                // Refresh the leaderboard
                const activeTab =
                  document.querySelector(".tab-btn.active")?.dataset.tab;
                loadLeaderboard(activeTab, true);
              });
            });
          }
        } else {
          this.textContent = "Show Hidden Entries";
          // Remove the hidden entries section
          const hiddenSection = document.getElementById("hiddenEntriesSection");
          if (hiddenSection) {
            hiddenSection.remove();
          }
        }
      });

    document
      .getElementById("clearHiddenEntriesBtn")
      .addEventListener("click", function () {
        if (
          confirm(
            "Are you sure you want to unhide all hidden entries? This will make them visible again."
          )
        ) {
          localStorage.removeItem("wordcraftHiddenEntries");
          // Refresh the leaderboard
          const activeTab =
            document.querySelector(".tab-btn.active")?.dataset.tab;
          loadLeaderboard(activeTab, true);
        }
      });
  }

  // Add event listeners for admin buttons (in test mode)
  if (location.search.includes("test=true")) {
    // View board buttons
    document.querySelectorAll(".view-board-btn").forEach((btn) => {
      btn.addEventListener("click", async function (e) {
        e.stopPropagation();
        const entryId = this.dataset.entryId;

        try {
          // Show loading state
          this.textContent = "⌛";
          this.disabled = true;

          // Fetch the entry from Firestore
          const db = firebase.firestore();
          const doc = await db.collection("scores").doc(entryId).get();

          if (doc.exists) {
            const data = doc.data();

            if (data.boardData && Array.isArray(data.boardData.placedTiles)) {
              // Create a modal to show the board
              showViewBoardModal(data);
              this.textContent = "👁️";
              this.disabled = false;
            } else {
              console.error("No valid board data found");
              this.textContent = "❌";
              setTimeout(() => {
                this.textContent = "👁️";
                this.disabled = false;
              }, 2000);
            }
          } else {
            console.error("No document found with ID:", entryId);
            this.textContent = "❌";
            setTimeout(() => {
              this.textContent = "👁️";
              this.disabled = false;
            }, 2000);
          }
        } catch (error) {
          console.error("Error fetching board data:", error);
          this.textContent = "❌";
          setTimeout(() => {
            this.textContent = "👁️";
            this.disabled = false;
          }, 2000);
        }
      });
    });

    // Delete entry buttons
    document.querySelectorAll(".delete-entry-btn").forEach((btn) => {
      btn.addEventListener("click", async function (e) {
        e.stopPropagation();
        const entryId = this.dataset.entryId;

        if (
          !confirm(
            `Are you sure you want to hide entry ${entryId}?\n\nNote: This will only hide the entry on your current device.\nOther users will still see this entry.`
          )
        ) {
          return;
        }

        try {
          // Show loading state
          this.textContent = "⌛";
          this.disabled = true;

          // Since we don't have write permissions, we'll use a local approach:
          // 1. Store hidden entries in localStorage
          // 2. Filter them out when displaying the leaderboard

          // Get existing hidden entries
          let hiddenEntries = JSON.parse(
            localStorage.getItem("wordcraftHiddenEntries") || "[]"
          );

          // Add this entry to the hidden list if not already there
          if (!hiddenEntries.includes(entryId)) {
            hiddenEntries.push(entryId);
            localStorage.setItem(
              "wordcraftHiddenEntries",
              JSON.stringify(hiddenEntries)
            );
          }

          console.log(
            `Entry ${entryId} marked as hidden locally. Total hidden entries: ${hiddenEntries.length}`
          );

          // Success - remove the row from the table
          const row = this.closest("tr");
          if (row) {
            row.style.transition = "all 0.3s";
            row.style.backgroundColor = "#ffebee";
            row.style.opacity = "0";

            setTimeout(() => {
              row.remove();

              // Show confirmation
              showToast("Entry hidden successfully", "success");

              // Refresh the leaderboard
              const activeTab =
                document.querySelector(".tab-btn.active")?.dataset.tab;
              if (activeTab) {
                loadLeaderboard(activeTab, true);
              }
            }, 300);
          }
        } catch (error) {
          console.error("Error deleting entry:", error);
          this.textContent = "❌";
          setTimeout(() => {
            this.textContent = "🗑️";
            this.disabled = false;
          }, 2000);

          showToast("Error deleting entry", "error");
        }
      });
    });
  }
}

// Function to show a modal with another player's board
function showViewBoardModal(data) {
  // Check if modal already exists, if not create it
  let viewBoardModal = document.getElementById("viewBoardModal");
  if (!viewBoardModal) {
    viewBoardModal = document.createElement("div");
    viewBoardModal.id = "viewBoardModal";
    viewBoardModal.className = "modal";

    const modalContent = document.createElement("div");
    modalContent.className = "modal-content";

    modalContent.innerHTML = `
            <h2 class="modal-title">Player's Board</h2>
            <div class="view-board-container">
                <div class="view-board-header">
                    <div class="view-board-player"></div>
                    <div class="view-board-score"></div>
                    <div class="view-board-date"></div>
                </div>
                <div class="view-board-grid"></div>
                <div class="view-board-word-list"></div>
            </div>
            <button class="btn btn-primary" id="closeViewBoardBtn">Close</button>
        `;

    viewBoardModal.appendChild(modalContent);
    document.body.appendChild(viewBoardModal);

    // Add event listener to close button
    document
      .getElementById("closeViewBoardBtn")
      .addEventListener("click", function () {
        viewBoardModal.classList.remove("active");
      });

    // Add some CSS rules
    const style = document.createElement("style");
    style.textContent = `
            .view-board-btn {
                margin-left: 8px;
                background: none;
                border: none;
                cursor: pointer;
                font-size: 14px;
                padding: 2px 6px;
                border-radius: 3px;
                transition: all 0.2s;
                color: #4285f4;
                background-color: rgba(66, 133, 244, 0.1);
            }
            .view-board-btn:hover {
                background-color: rgba(66, 133, 244, 0.2);
            }
            .view-board-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            .view-board-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 15px;
                max-width: 500px;
                margin: 0 auto;
            }
            .view-board-header {
                display: flex;
                justify-content: space-between;
                width: 100%;
                padding: 0 10px;
            }
            .view-board-player {
                font-weight: bold;
                font-size: 18px;
            }
            .view-board-score {
                font-weight: bold;
                color: #4caf50;
            }
            .view-board-date {
                color: #666;
                font-size: 14px;
            }
            .view-board-grid {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 2px;
                width: 300px;
                height: 300px;
                background-color: #f5f5f5;
                padding: 5px;
                border-radius: 5px;
            }
            .view-board-cell {
                position: static;
                background-color: #fff;
                border: 1px solid #ddd;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .view-board-cell.center {
                background-color: #ffecb3;
            }
            .view-board-cell.dl {
                background-color: #e3f2fd;
            }
            .view-board-cell.tl {
                background-color: #bbdefb;
            }
            .view-board-cell.dw {
                background-color: #ffcdd2;
            }
            .view-board-cell.tw {
                background-color: #ef9a9a;
            }
            .view-board-cell:after {
                position: absolute;
                bottom: 2px;
                right: 2px;
                font-size: 8px;
                opacity: 0.7;
                content: attr(data-bonus);
            }
            .view-board-tile {
                width: 90%;
                height: 90%;
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: #f8df73;
                border-radius: 4px;
                font-weight: bold;
                position: relative;
                box-shadow: 0 2px 3px rgba(0,0,0,0.1);
            }
            .view-board-word-list {
                margin-top: 10px;
                max-height: 150px;
                overflow-y: auto;
                width: 100%;
                padding: 10px;
                background-color: #f9f9f9;
                border-radius: 5px;
            }
            .view-board-words {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            .view-board-word {
                padding: 3px 8px;
                background-color: #e9f5ff;
                border-radius: 3px;
                font-size: 14px;
            }
        `;
    document.head.appendChild(style);
  }

  // Populate the modal with the data
  const playerElement = viewBoardModal.querySelector(".view-board-player");
  const scoreElement = viewBoardModal.querySelector(".view-board-score");
  const dateElement = viewBoardModal.querySelector(".view-board-date");
  const gridElement = viewBoardModal.querySelector(".view-board-grid");
  const wordListElement = viewBoardModal.querySelector(".view-board-word-list");

  // Clear previous content
  gridElement.innerHTML = "";
  wordListElement.innerHTML = "";

  // Set player info (with sanitization)
  playerElement.textContent = escapeHtml(data.nickname) || "Unknown Player";
  scoreElement.textContent = `Score: ${data.score}`;

  // Format date
  let dateStr = "Unknown date";
  try {
    if (data.dateStr) {
      const date = new Date(data.dateStr);
      dateStr = date.toLocaleString();
    } else if (data.date && data.date.toDate) {
      const date = data.date.toDate();
      dateStr = date.toLocaleString();
    }
  } catch (e) {
    console.error("Error formatting date:", e);
  }
  dateElement.textContent = dateStr;

  // Create the board
  const boardSize = 5; // We know it's a 5x5 board

  // First create an empty grid
  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      const cell = document.createElement("div");
      cell.className = "view-board-cell";
      cell.dataset.row = row;
      cell.dataset.col = col;

      // Check if this is the center cell
      const centerPosition = Math.floor(boardSize / 2);
      if (row === centerPosition && col === centerPosition) {
        cell.classList.add("center");
      }

      // Check if this cell has a special square
      if (data.boardData.specialSquares) {
        const specialSquare = data.boardData.specialSquares.find(
          (sq) => sq.row === row && sq.col === col
        );
        if (specialSquare) {
          cell.classList.add(specialSquare.type);
          cell.dataset.bonus = specialSquare.label;
        }
      }

      gridElement.appendChild(cell);
    }
  }

  // Now place tiles
  if (data.boardData.placedTiles && data.boardData.placedTiles.length > 0) {
    data.boardData.placedTiles.forEach((tileData) => {
      if (
        typeof tileData.row !== "number" ||
        typeof tileData.col !== "number" ||
        !tileData.letter
      ) {
        return; // Skip invalid tiles
      }

      const cell = gridElement.querySelector(
        `.view-board-cell[data-row="${tileData.row}"][data-col="${tileData.col}"]`
      );
      if (!cell) return;

      const tile = document.createElement("div");
      tile.className = "view-board-tile";
      tile.textContent = tileData.letter;

      cell.appendChild(tile);
    });
  }

  // Show the modal
  viewBoardModal.classList.add("active");

  // Add words list if available
  if (data.boardData.words && data.boardData.words.length > 0) {
    const wordsContainer = document.createElement("div");
    wordsContainer.className = "view-board-words";

    data.boardData.words.forEach((word) => {
      const wordElement = document.createElement("div");
      wordElement.className = "view-board-word";
      wordElement.textContent = word;
      wordsContainer.appendChild(wordElement);
    });

    wordListElement.innerHTML = "<h4>Words Formed:</h4>";
    wordListElement.appendChild(wordsContainer);
  } else {
    wordListElement.innerHTML = "<p>No words data available</p>";
  }
}

// Generate local leaderboard with user score integrated (fallback)
function generateLocalLeaderboard(userScore, nickname = "You") {
  // Add the user's score to the list and sort
  const allScores = [
    ...leaderboardData,
    { name: nickname, score: userScore, isUser: true },
  ];
  allScores.sort((a, b) => b.score - a.score);

  // Get the leaderboard body element
  const leaderboardBody = document.getElementById("leaderboardBody");
  leaderboardBody.innerHTML = "";

  // Hide loading indicator if it's visible
  const leaderboardLoading = document.getElementById("leaderboardLoading");
  if (leaderboardLoading) {
    leaderboardLoading.style.display = "none";
  }

  // Fill the leaderboard
  allScores.slice(0, 10).forEach((entry, index) => {
    const row = document.createElement("tr");
    if (entry.isUser) {
      row.classList.add("current-user");
    }

    row.innerHTML = `
            <td>${index + 1}</td>
            <td>${escapeHtml(entry.name)}</td>
            <td>${entry.score}</td>
        `;

    leaderboardBody.appendChild(row);
  });
}

// Disable all game interactions after completion
function disableGameInteractions() {
  // Disable board interactions
  document.querySelectorAll(".board-cell").forEach((cell) => {
    cell.style.cursor = "default";
  });

  // Disable all tiles
  document.querySelectorAll(".tile").forEach((tile) => {
    tile.draggable = false;
    tile.style.cursor = "default";
  });

  // Hide the letter rack completely and show only post-game message
  const letterRack = document.getElementById("letterRack");
  letterRack.style.display = "none";

  // Disable game control buttons
  document.getElementById("submitBtn").disabled = true;
  document.getElementById("clearBtn").disabled = true;
  document.getElementById("shuffleBtn").disabled = true;
}

// Show the tutorial using IntroJS
function showTutorial() {
  // First, scroll to top
  window.scrollTo(0, 0);

  // Make sure the tutorial modal is NOT shown (using the old system)
  const oldTutorialModal = document.getElementById("tutorialModal");
  if (oldTutorialModal) {
    oldTutorialModal.classList.remove("active");
  }

  // Check if IntroJS is loaded
  if (typeof introJs === "undefined") {
    console.error("IntroJS not loaded! Attempting to load it now...");

    // Try to load IntroJS dynamically
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/intro.js@7.2.0/minified/intro.min.js";
    script.onload = function () {
      console.log("IntroJS loaded successfully!");
      initIntroJS();
    };
    script.onerror = function () {
      console.error("Failed to load IntroJS!");
      showToast("Unable to load tutorial. Please try again later.", "error");
    };
    document.head.appendChild(script);
    return;
  }

  initIntroJS();
}

// Initialize IntroJS tutorial
function initIntroJS() {
  // Configure IntroJS
  const intro = introJs();

  // Set options
  intro.setOptions({
    steps: [
      {
        element: document.querySelector(".game-container"),
        intro:
          "Welcome to Letter Links! This word-building game gives you a daily challenge to create words on a game board, similar to Scrabble. You'll receive a set of letter tiles and need to arrange them strategically to score points.",
        position: "right",
      },
      {
        element: document.getElementById("letterRack"),
        intro: gameState.isMobileDevice
          ? "At the bottom of the screen, you'll find your letter tiles. Each letter has a point value (shown in the corner). To play, either drag a tile or tap to select it, then tap a board position to place it."
          : "Here you'll find your letter tiles. Each letter has a point value (shown in the corner). To play, either drag a tile or tap to select it, then tap a board position to place it.",
        position: "top",
      },
      // Mobile-specific step about pagination
      ...(gameState.isMobileDevice && document.querySelector(".tile-rack-nav")
        ? [
            {
              element: document.querySelector(".tile-rack-nav"),
              intro:
                "You can navigate through your tiles by tapping these arrows or swiping left/right on the tile rack. This allows you to see all your tiles when they don't fit on one screen.",
              position: "top",
            },
          ]
        : []),
      {
        element: document.getElementById("gameBoard"),
        intro:
          "The game board is where you'll place your tiles. To maximize points, use special squares: DL (Double Letter), TL (Triple Letter), DW (Double Word), and TW (Triple Word). Important: The center star square must have a tile placed on it before you can submit your score.",
        position: "left",
      },
      {
        element: document.getElementById("gameBoard"),
        intro:
          "Form valid dictionary words by placing tiles adjacent to each other, reading left-to-right or top-to-bottom. All tiles must connect to each other - no isolated groups allowed. Words must be at least two letters long.",
        position: "bottom",
      },
      {
        element: document.getElementById("letterRack"),
        intro:
          "Look for special tiles in your rack! Wild cards (with a * symbol) can represent any letter - tap to select which letter you want. Some days, you might also get bonus tiles that double the score of the entire word they're part of.",
        position: "top",
      },
      {
        element: document.getElementById("submitBtn"),
        intro:
          "Once you've arranged your tiles, tap 'Submit Words' to score them. Invalid words will be highlighted in red. Your goal is to score as many points as possible with the available tiles. Try to use all your tiles for maximum points!",
        position: "bottom",
      },
      {
        element: document.querySelector(".game-container"),
        intro:
          "After submitting, you'll see your final score and can enter your name for the daily leaderboard. Each day brings a new challenge with the same tiles for everyone, so you can compare your skill with others. Have fun!",
        position: "bottom",
      },
    ],
    showBullets: true,
    showProgress: true,
    exitOnOverlayClick: false,
    exitOnEsc: true,
    scrollToElement: true,
    disableInteraction: false,
    doneLabel: "Start Playing",
  });

  // Event listeners
  intro.onbeforeexit(function () {
    // Mark tutorial as completed when user finishes
    localStorage.setItem("tutorialCompleted", "true");

    // Make sure we stay at the top of the page
    window.scrollTo(0, 0);
  });

  // Start the tutorial
  intro.start();
}

// No longer needed - IntroJS handles this

// Show welcome modal
function showWelcomeModal() {
  if (!gameState.gameCompleted) {
    document.getElementById("welcomeModal").classList.add("active");
  }
}

// Define tutorial steps with UI highlights and animations
const tutorialSteps = [
  {
    text: "Welcome to Letter Links! This word-building game gives you a daily challenge to create words on a game board, similar to Scrabble. You'll receive a set of letter tiles and need to arrange them strategically to score points.",
    highlights: [],
  },
  {
    text: "At the bottom of the screen, you'll find your letter tiles. Each letter has a point value (shown in the corner). To play, either drag a tile or tap to select it, then tap a board position to place it.",
    highlights: ["#letterRack"],
    mobileHighlights: ["#letterRack", ".tile-rack-nav"],
    animation: "scrollTiles",
  },
  {
    text: "The game board is where you'll place your tiles. To maximize points, use special squares: DL (Double Letter), TL (Triple Letter), DW (Double Word), and TW (Triple Word). Important: The center star square must have a tile placed on it before you can submit your score.",
    highlights: ["#gameBoard", ".board-cell.center"],
    demo: "highlightBonusSquares",
  },
  {
    text: "Form valid dictionary words by placing tiles adjacent to each other, reading left-to-right or top-to-bottom. All tiles must connect to each other - no isolated groups allowed. Words must be at least two letters long.",
    highlights: ["#gameBoard"],
    demo: "wordFormation",
  },
  {
    text: "Look for special tiles in your rack! Wild cards (with a * symbol) can represent any letter - tap to select which letter you want. Some days, you might also get bonus tiles that double the score of the entire word they're part of.",
    highlights: [".tile.wild", ".tile.powerup"],
    demo: "specialTiles",
  },
  {
    text: 'Once you\'ve arranged your tiles, tap "Submit Words" to score them. Invalid words will be highlighted in red. Your goal is to score as many points as possible with the available tiles. Try to use all your tiles for maximum points!',
    highlights: ["#submitBtn", "#validationErrors"],
    demo: "submitWords",
  },
  {
    text: "After submitting, you'll see your final score and can enter your name for the daily leaderboard. Each day brings a new challenge with the same tiles for everyone, so you can compare your skill with others. Have fun!",
    highlights: ["#finishGameModal"],
  },
];

// Remove existing highlight elements
function clearHighlights() {
  // Remove existing highlight classes from elements
  document.querySelectorAll(".highlight-element").forEach((el) => {
    el.classList.remove("highlight-element");
  });

  // Stop any ongoing demo animations
  if (window.currentTutorialDemo) {
    clearTimeout(window.currentTutorialDemo);
    window.currentTutorialDemo = null;
  }
}

// Highlight specified elements
function highlightElements(selectors) {
  if (!selectors || selectors.length === 0) return;

  clearHighlights();

  selectors.forEach((selector) => {
    try {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        elements.forEach((el) => {
          // Add highlight class to elements that exist
          el.classList.add("highlight-element");

          // If the element is off-screen, scroll it into view
          const rect = el.getBoundingClientRect();
          if (rect.top < 0 || rect.bottom > window.innerHeight) {
            el.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }
        });
      }
    } catch (err) {
      console.log(`Error highlighting ${selector}:`, err);
    }
  });

  // Make sure the tutorial modal stays visible
  const tutorialContent = document.querySelector(".tutorial-content");
  if (tutorialContent) {
    tutorialContent.scrollTop = 0;
  }
}

// Run demo animations based on step
function runDemoAnimation(demoName) {
  if (!demoName) return;

  switch (demoName) {
    case "scrollTiles":
      // Simplified version - just highlight the letter rack
      const letterRack = document.getElementById("letterRack");
      if (letterRack) {
        letterRack.classList.add("highlight-element");

        // If on mobile, also highlight navigation buttons if present
        if (gameState.isMobileDevice) {
          const tileRackNav = document.querySelector(".tile-rack-nav");
          if (tileRackNav && tileRackNav.style.display !== "none") {
            tileRackNav.classList.add("highlight-element");
          }
        }
      }
      break;

    case "highlightBonusSquares":
      // Just highlight the center star first
      const centerCell = document.querySelector(".board-cell.center");
      if (centerCell) {
        centerCell.classList.add("highlight-element");
      }
      break;

    case "wordFormation":
      // Simply highlight the board
      const gameBoard = document.getElementById("gameBoard");
      if (gameBoard) {
        gameBoard.classList.add("highlight-element");
      }
      break;

    case "specialTiles":
      // Just highlight the shuffle button as a consistent element
      const shuffleBtn = document.getElementById("shuffleBtn");
      if (shuffleBtn) {
        shuffleBtn.classList.add("highlight-element");
      }
      break;

    case "submitWords":
      // Highlight submit button
      const submitBtn = document.getElementById("submitBtn");
      if (submitBtn) {
        submitBtn.classList.add("highlight-element");
      }
      break;
  }
}

// Initialize the tutorial
function initTutorial() {
  const steps = document.querySelectorAll(".tutorial-step");
  const progressContainer = document.querySelector(".tutorial-progress");
  const nextBtn = document.getElementById("tutorialNextBtn");
  const backBtn = document.getElementById("tutorialBackBtn");
  const skipBtn = document.getElementById("tutorialSkipBtn");

  let currentStep = 1;

  // Clear any existing progress dots to prevent duplicates
  progressContainer.innerHTML = "";

  // Create progress dots
  steps.forEach((step, index) => {
    const dot = document.createElement("div");
    dot.className = "progress-dot";
    if (index === 0) dot.classList.add("active");
    progressContainer.appendChild(dot);

    // Set the step text from our tutorialSteps array
    if (tutorialSteps[index]) {
      const textElement = step.querySelector(".tutorial-text");
      if (textElement) {
        textElement.textContent = tutorialSteps[index].text;
      }
    }
  });

  // Update the buttons based on current step
  function updateButtons() {
    backBtn.style.visibility = currentStep === 1 ? "hidden" : "visible";

    if (currentStep === steps.length) {
      nextBtn.textContent = "Start Playing";
      nextBtn.className = "tutorial-btn tutorial-btn-done";
    } else {
      nextBtn.textContent = "Next";
      nextBtn.className = "tutorial-btn tutorial-btn-next";
    }
  }

  // Function to get yesterday's date as YYYY-MM-DD
  function getYesterdayDateStr() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split("T")[0];
  }

  // Show a specific step
  function showStep(stepNumber) {
    // Clear any existing highlights
    clearHighlights();

    // Hide all steps
    steps.forEach((step) => step.classList.remove("active"));

    // Show the current step
    document
      .querySelector(`.tutorial-step[data-step="${stepNumber}"]`)
      .classList.add("active");

    // Update progress dots
    const dots = document.querySelectorAll(".progress-dot");
    dots.forEach((dot, index) => {
      dot.classList.toggle("active", index < stepNumber);
    });

    currentStep = stepNumber;
    updateButtons();

    // Apply appropriate highlights for this step
    const stepInfo = tutorialSteps[stepNumber - 1]; // -1 because steps are 1-indexed
    if (stepInfo) {
      // Use mobile-specific highlights if available and on mobile
      if (gameState.isMobileDevice && stepInfo.mobileHighlights) {
        highlightElements(stepInfo.mobileHighlights);
      } else {
        highlightElements(stepInfo.highlights);
      }

      // Run demo animation if specified
      if (stepInfo.demo) {
        runDemoAnimation(stepInfo.demo);
      } else if (stepInfo.animation) {
        runDemoAnimation(stepInfo.animation);
      }
    }

    // Ensure the tutorial content is scrolled to see the controls
    setTimeout(() => {
      const tutorialContent = document.querySelector(".tutorial-content");
      const tutorialControls = document.querySelector(".tutorial-controls");
      if (tutorialContent && tutorialControls) {
        // Calculate if the controls are visible
        const contentRect = tutorialContent.getBoundingClientRect();
        const controlsRect = tutorialControls.getBoundingClientRect();

        // If controls are below view, scroll to show them
        if (controlsRect.bottom > contentRect.bottom) {
          tutorialContent.scrollTo({
            top: tutorialContent.scrollHeight,
            behavior: "smooth",
          });
        }

        // Special handling for step 3 (game board explanation) on mobile
        if (stepNumber === 3 && gameState.isMobileDevice) {
          // Force tutorial content to be visible with higher stacking context
          tutorialContent.style.visibility = "visible";
          tutorialContent.style.zIndex = "200000";
          tutorialContent.style.transform = "translateZ(0)";

          // Also ensure the modal background is above everything
          const tutorialModal = document.getElementById("tutorialModal");
          if (tutorialModal) {
            tutorialModal.style.zIndex = "199999";
          }
        }
      }
    }, 100);
  }

  // Event handlers
  nextBtn.addEventListener("click", (e) => {
    e.preventDefault(); // Prevent any default behavior

    if (currentStep < steps.length) {
      // Not the last step - show next step
      showStep(currentStep + 1);
    } else {
      // No longer used - IntroJS handles this
    }
  });

  backBtn.addEventListener("click", () => {
    if (currentStep > 1) {
      showStep(currentStep - 1);
    }
  });

  skipBtn.addEventListener("click", () => {
    // No longer used - IntroJS handles this
  });

  // Removed emergency reset button - now the tutorial will reset itself automatically

  // Show first step with highlights
  showStep(1);
}

// No longer needed - IntroJS handles this with onbeforeexit

// Calculate the score for the current board
function calculateScore() {
  // Reset score
  let totalScore = 0;

  // Only score valid words
  const validWords = gameState.wordData.foundWords;

  validWords.forEach((wordInfo) => {
    const wordScore = calculateWordScore(wordInfo.tiles);
    totalScore += wordScore;
  });

  // Add points for single placed tiles (if there's only one on the board)
  if (gameState.placedTiles.length === 1) {
    const tile = gameState.placedTiles[0];
    const letterValue =
      tile.letter === "*" ? 0 : gameState.letterValues[tile.letter];
    totalScore += letterValue;
  }

  // Bonus for using all tiles
  if (gameState.letters.length === 0 && gameState.placedTiles.length >= 18) {
    totalScore += 50;
  }

  return totalScore;
}

// Calculate score for a word
function calculateWordScore(tiles) {
  let wordMultiplier = 1;
  let wordScore = 0;
  let hasPowerupTile = false;

  tiles.forEach((tile) => {
    let letterValue;

    // Check if it's a wildcard with a value
    if (tile.letter === "*") {
      // Get the element to check for wildcard value
      const tileElement = document.querySelector(
        `.board-cell[data-row="${tile.row}"][data-col="${tile.col}"] .tile`
      );

      // Wildcards are worth 0 points
      letterValue = 0;
    } else {
      letterValue = gameState.letterValues[tile.letter];
    }

    let letterMultiplier = 1;

    // Get the cell to check for bonuses
    const cell = document.querySelector(
      `.board-cell[data-row="${tile.row}"][data-col="${tile.col}"]`
    );

    if (!cell) return;

    // Apply letter multipliers
    if (cell.classList.contains("dl")) {
      letterMultiplier = 2;
    } else if (cell.classList.contains("tl")) {
      letterMultiplier = 3;
    }

    // Apply word multipliers
    if (cell.classList.contains("dw")) {
      wordMultiplier *= 2;
    } else if (cell.classList.contains("tw")) {
      wordMultiplier *= 3;
    }

    // Check for powerup tile
    if (tile.bonus === "powerup") {
      hasPowerupTile = true;
    }

    wordScore += letterValue * letterMultiplier;
  });

  // Apply word multiplier
  wordScore *= wordMultiplier;

  // Apply powerup tile bonus if present (after all other multipliers)
  if (hasPowerupTile) {
    wordScore *= 2;
  }

  return wordScore;
}

// Update the score display
function updateScoreDisplay(newScore) {
  const scoreElement = document.querySelector(".score-value");
  const scoreDiff = newScore - gameState.previousScore;

  // Only update display if score changed
  if (newScore !== gameState.previousScore) {
    // Show the score change animation
    const scoreChangeElement = document.createElement("div");
    scoreChangeElement.className = "score-change";

    if (scoreDiff > 0) {
      scoreChangeElement.classList.add("positive");
      scoreChangeElement.textContent = `+${scoreDiff}`;
    } else {
      scoreChangeElement.classList.add("negative");
      scoreChangeElement.textContent = scoreDiff;
    }

    document.querySelector(".score-display").appendChild(scoreChangeElement);

    // Update the score value
    gameState.score = newScore;
    gameState.previousScore = newScore;
    scoreElement.textContent = newScore;

    // Animation
    scoreElement.classList.add("score-pulse");
    setTimeout(() => {
      scoreElement.classList.remove("score-pulse");
    }, 500);
  }
}

// Show toast notification
function showToast(message, type = "") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "toast";

  if (type) {
    toast.classList.add(type);
  }

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// Clear the board and return all tiles to the rack
function clearBoard() {
  if (gameState.gameCompleted) return;

  if (gameState.placedTiles.length === 0) {
    showToast("Board is already empty!", "error");
    return;
  }

  while (gameState.placedTiles.length > 0) {
    const tile = gameState.placedTiles[0];
    returnTileToRack(
      tile.letter,
      tile.originalIndex,
      tile.row,
      tile.col,
      tile.bonus
    );
  }

  // Reset board state markers
  gameState.isFirstMove = true;
  document.querySelector(".board-cell.center").classList.add("empty");

  showToast("Board cleared!");

  // Validate the board
  validateBoard();
}

// Shuffle the tiles in the rack
function shuffleTiles() {
  if (gameState.gameCompleted) return;

  if (gameState.letters.length <= 1) {
    showToast("Not enough tiles to shuffle!", "error");
    return;
  }

  // Fisher-Yates shuffle algorithm
  for (let i = gameState.letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [gameState.letters[i], gameState.letters[j]] = [
      gameState.letters[j],
      gameState.letters[i],
    ];
  }

  renderTilesInRack();
  showToast("Tiles shuffled!");
}

// Update the countdown timer in the leaderboard
function updateLeaderboardCountdown() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const diff = tomorrow - now;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const timeString = `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  const countdownElement = document.getElementById("leaderboardCountdown");
  const hourCountdown = document.getElementById("hourCountDown");
  const minuteCountdown = document.getElementById("minuteCountDown");
  const secondrCountdown = document.getElementById("secondCountDown");

  if (countdownElement) {
    // countdownElement.textContent = timeString;
    hourCountdown.textContent = hours.toString().padStart(2, "0");
    minuteCountdown.textContent = minutes.toString().padStart(2, "0");
    secondrCountdown.textContent = seconds.toString().padStart(2, "0");
  }

  // Only schedule next update if the leaderboard is visible
  if (document.getElementById("finishGameModal").classList.contains("active")) {
    setTimeout(updateLeaderboardCountdown, 1000);
  }
}

// Update countdown timer in the post-game message
function updatePostGameCountdown() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const diff = tomorrow - now;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const timeString = `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  const countdownElement = document.getElementById("postGameCountdown");
  if (countdownElement) {
    countdownElement.textContent = timeString;
  }

  // Only schedule next update if the post-game message is visible
  const postGameMessage = document.getElementById("postGameMessage");
  if (postGameMessage && postGameMessage.style.display === "flex") {
    setTimeout(updatePostGameCountdown, 1000);
  }
}

// Setup tooltips
function setupTooltips() {
  const tooltip = document.getElementById("tooltip");

  // Special square tooltips
  document.querySelectorAll(".board-cell").forEach((cell) => {
    if (
      cell.classList.contains("dl") ||
      cell.classList.contains("tl") ||
      cell.classList.contains("dw") ||
      cell.classList.contains("tw")
    ) {
      let tooltipText = "";
      if (cell.classList.contains("dl")) tooltipText = "Double Letter Score";
      if (cell.classList.contains("tl")) tooltipText = "Triple Letter Score";
      if (cell.classList.contains("dw")) tooltipText = "Double Word Score";
      if (cell.classList.contains("tw")) tooltipText = "Triple Word Score";

      cell.addEventListener("mouseenter", function (e) {
        tooltip.textContent = tooltipText;
        tooltip.style.opacity = "1";
        positionTooltip(e);
      });

      cell.addEventListener("mousemove", positionTooltip);

      cell.addEventListener("mouseleave", function () {
        tooltip.style.opacity = "0";
      });
    } else if (cell.classList.contains("center")) {
      cell.addEventListener("mouseenter", function (e) {
        tooltip.textContent = "Center Square - First move must start here";
        tooltip.style.opacity = "1";
        positionTooltip(e);
      });

      cell.addEventListener("mousemove", positionTooltip);

      cell.addEventListener("mouseleave", function () {
        tooltip.style.opacity = "0";
      });
    }
  });

  // Special tile tooltips
  document.addEventListener("mouseover", function (e) {
    if (!e.target || !e.target.classList) return;

    let tile = null;
    try {
      tile = e.target.closest(".tile");
    } catch (err) {
      return;
    }

    if (tile) {
      if (tile.classList.contains("wild")) {
        tooltip.textContent = "Wild Card: Can represent any letter";
        tooltip.style.opacity = "1";
        positionTooltip(e);
      } else if (tile.classList.contains("powerup")) {
        tooltip.textContent = "Bonus Tile: Doubles the word score";
        tooltip.style.opacity = "1";
        positionTooltip(e);
      } else if (tile.classList.contains("invalid-word")) {
        // Find the word info for this tile
        const row = parseInt(tile.dataset.row);
        const col = parseInt(tile.dataset.col);
        const invalidWord = gameState.wordData.invalidWords.find((w) =>
          w.tiles.some((t) => t.row === row && t.col === col)
        );

        const wordText = invalidWord ? invalidWord.word : "";
        tooltip.textContent = `Invalid Word: "${wordText}" not found in dictionary`;
        tooltip.style.opacity = "1";
        positionTooltip(e);
      }
    }
  });

  document.addEventListener("mouseout", function (e) {
    if (!e.target || !e.target.classList) return;

    let tile = null;
    try {
      tile = e.target.closest(".tile");
    } catch (err) {
      return;
    }

    if (tile) {
      tooltip.style.opacity = "0";
    }
  });

  function positionTooltip(e) {
    const windowWidth = window.innerWidth;
    const tooltipWidth = tooltip.offsetWidth;

    // Determine if tooltip would go off the right edge
    let leftPos = e.pageX + 10;
    if (leftPos + tooltipWidth > windowWidth - 20) {
      leftPos = e.pageX - tooltipWidth - 10;
    }

    tooltip.style.left = Math.max(10, leftPos) + "px";
    tooltip.style.top = e.pageY + 10 + "px";
  }
}

// Create confetti effect
function createConfetti() {
  const container = document.querySelector(".game-container");
  const colors = ["#3a86ff", "#ff006e", "#fb5607", "#ffbe0b", "#8338ec"];

  for (let i = 0; i < 100; i++) {
    const confetti = document.createElement("div");
    confetti.className = "confetti";
    confetti.style.left = Math.random() * 100 + "%";
    confetti.style.top = "-10px";
    confetti.style.backgroundColor =
      colors[Math.floor(Math.random() * colors.length)];
    confetti.style.transform = `rotate(${Math.random() * 360}deg)`;

    container.appendChild(confetti);

    // Animation
    setTimeout(() => {
      confetti.style.transition = `all ${Math.random() * 2 + 1}s ease`;
      confetti.style.top = "100%";
      confetti.style.left =
        parseInt(confetti.style.left) + Math.random() * 40 - 20 + "%";
      confetti.style.opacity = "1";

      setTimeout(() => {
        confetti.remove();
      }, 3000);
    }, Math.random() * 500);
  }
}

// Add seedrandom function for deterministic random letters
Math.seedrandom = function (seed) {
  let m = 0x80000000; // 2^31
  let a = 1103515245;
  let c = 12345;
  let z = seed;
  return function () {
    z = (a * z + c) % m;
    return z / m;
  };
};

// Function to get yesterday's date as YYYY-MM-DD
function getYesterdayDateStr() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split("T")[0];
}

// Setup toggle tiles button for yesterday's best board
function setupYesterdayBestToggle() {
  const toggleBtn = document.getElementById("toggleTilesBtn");
  const boardContainer = document.getElementById("yesterdayBestBoard");

  if (!toggleBtn || !boardContainer) return;

  toggleBtn.addEventListener("click", function () {
    boardContainer.classList.toggle("hidden-tiles");

    // Update button text
    if (boardContainer.classList.contains("hidden-tiles")) {
      toggleBtn.textContent = "Show Tiles";
    } else {
      toggleBtn.textContent = "Hide Tiles";
    }
  });
}

// Function to load yesterday's best board
async function loadYesterdayBestBoard(forceRefresh = false) {
  const boardContainer = document.getElementById("yesterdayBestBoard");
  const playerNameElement = document.getElementById("yesterdayBestPlayer");
  const scoreElement = document.getElementById("yesterdayBestScore");

  // Check if elements exist before trying to update them
  if (!boardContainer || !playerNameElement || !scoreElement) {
    console.error("Missing required elements for yesterday's best board");
    return;
  }

  // Clear the container first
  boardContainer.innerHTML = "";

  const yesterdayDateStr = getYesterdayDateStr();

  try {
    if (!window.firebaseDB) {
      throw new Error("Firebase is not initialized");
    }

    // Get yesterday's date in normalized format for querying
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    // Create yesterday's timestamp for Firestore
    const yesterdayTimestamp = firebase.firestore.Timestamp.fromDate(yesterday);
    const tomorrowDate = new Date(yesterday);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowTimestamp =
      firebase.firestore.Timestamp.fromDate(tomorrowDate);

    // Get the Firestore database
    const db = firebase.firestore();

    console.log(
      "Fetching yesterday's best board data for:",
      yesterday.toISOString()
    );

    // Query for yesterday's scores, ordered by score (highest first)
    let snapshot;
    try {
      snapshot = await db
        .collection("scores")
        .where("day", ">=", yesterdayTimestamp)
        .where("day", "<", tomorrowTimestamp)
        .orderBy("day")
        .orderBy("score", "desc")
        .limit(1) // We just need the top score
        .get({ source: forceRefresh ? "server" : "default" });
    } catch (queryError) {
      console.error("Query error:", queryError);
      throw queryError;
    }

    // Check if we have a result
    if (snapshot.empty) {
      console.log("No top board found for yesterday, using fallback");
      // Use generated board as fallback
      const seed =
        yesterday.getFullYear() * 10000 +
        (yesterday.getMonth() + 1) * 100 +
        yesterday.getDate();
      const mockBestBoard = generateMockBestBoard(seed);
      displayYesterdayBestBoard(mockBestBoard);
      return mockBestBoard;
    }

    // Get the best score data
    const bestScoreDoc = snapshot.docs[0];
    const bestScoreData = bestScoreDoc.data();

    console.log("Got yesterday's best board:", bestScoreData);

    // Check if it has board data
    if (
      !bestScoreData.boardData ||
      !bestScoreData.boardData.placedTiles ||
      bestScoreData.boardData.placedTiles.length === 0
    ) {
      console.log("Best score doesn't have valid board data, using fallback");
      const seed =
        yesterday.getFullYear() * 10000 +
        (yesterday.getMonth() + 1) * 100 +
        yesterday.getDate();
      const mockBestBoard = generateMockBestBoard(seed);
      displayYesterdayBestBoard(mockBestBoard);
      return mockBestBoard;
    }

    // Create the board data object from the Firestore document
    const boardData = {
      date: yesterdayDateStr,
      score: bestScoreData.score,
      nickname: bestScoreData.nickname,
      placedTiles: bestScoreData.boardData.placedTiles,
      specialSquares:
        bestScoreData.boardData.specialSquares ||
        generateSpecialSquaresForSeed(
          yesterday.getFullYear() * 10000 +
            (yesterday.getMonth() + 1) * 100 +
            yesterday.getDate()
        ),
    };

    // Display the board
    displayYesterdayBestBoard(boardData);
    return boardData;
  } catch (error) {
    console.error("Error loading yesterday's best board:", error);
    boardContainer.innerHTML = `<div class="error-message">Failed to load yesterday's best board</div>`;

    // Fall back to generated board
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const seed =
      yesterday.getFullYear() * 10000 +
      (yesterday.getMonth() + 1) * 100 +
      yesterday.getDate();
    const mockBestBoard = generateMockBestBoard(seed);
    displayYesterdayBestBoard(mockBestBoard);
    return mockBestBoard;
  }
}

// Generate a mock best board for demonstration purposes
function generateMockBestBoard(seed) {
  // We're using the seed to generate consistent "best boards" based on date
  const random = Math.seedrandom(seed);

  // Generate special squares based on yesterday's seed (same as the game would have had)
  const specialSquares = generateSpecialSquaresForSeed(seed);

  // Generate a mock layout - in real implementation this would come from Firebase
  const score = 150 + Math.floor(random() * 150); // Random score between 150-300
  const playerNames = [
    "WordWizard",
    "LetterMaster",
    "TileKing",
    "ScrabblePro",
    "WordSmith",
  ];
  const playerIndex = Math.floor(random() * playerNames.length);

  // Generate some random placed tiles
  const placedTiles = [];
  const usedPositions = new Set();

  // Ensure center tile is placed
  const centerPos = Math.floor(gameState.boardSize / 2);
  placedTiles.push({
    row: centerPos,
    col: centerPos,
    letter: "S",
  });
  usedPositions.add(`${centerPos},${centerPos}`);

  // Create a horizontal word
  const letters = ["T", "A", "R", "T"];
  for (let i = 0; i < letters.length; i++) {
    const pos = `${centerPos},${centerPos + i + 1}`;
    if (!usedPositions.has(pos)) {
      placedTiles.push({
        row: centerPos,
        col: centerPos + i + 1,
        letter: letters[i],
      });
      usedPositions.add(pos);
    }
  }

  // Create a vertical word
  const vLetters = ["P", "O", "T"];
  for (let i = 0; i < vLetters.length; i++) {
    const pos = `${centerPos + i + 1},${centerPos + 1}`;
    if (!usedPositions.has(pos)) {
      placedTiles.push({
        row: centerPos + i + 1,
        col: centerPos + 1,
        letter: vLetters[i],
      });
      usedPositions.add(pos);
    }
  }

  return {
    date: getYesterdayDateStr(),
    score: score,
    nickname: playerNames[playerIndex],
    placedTiles: placedTiles,
    specialSquares: specialSquares,
  };
}

// Generate special squares based on a seed (same function as the game uses)
function generateSpecialSquaresForSeed(seed) {
  const random = Math.seedrandom(seed);

  const specialSquares = [];
  const centerPosition = Math.floor(gameState.boardSize / 2);
  const occupiedPositions = new Set();

  // Reserve the center position
  occupiedPositions.add(`${centerPosition},${centerPosition}`);

  // Define the bonus types and counts
  const bonusTypes = [
    { type: "tw", label: "TW", count: 4 }, // Triple Word
    { type: "tl", label: "TL", count: 4 }, // Triple Letter
    { type: "dw", label: "DW", count: 4 }, // Double Word
    { type: "dl", label: "DL", count: 4 }, // Double Letter
  ];

  // Place bonus tiles randomly
  bonusTypes.forEach((bonusType) => {
    for (let i = 0; i < bonusType.count; i++) {
      let row, col, posKey;

      // Find an unoccupied position
      do {
        row = Math.floor(random() * gameState.boardSize);
        col = Math.floor(random() * gameState.boardSize);
        posKey = `${row},${col}`;
      } while (occupiedPositions.has(posKey));

      // Mark this position as occupied
      occupiedPositions.add(posKey);

      // Add to special squares
      specialSquares.push({
        row: row,
        col: col,
        type: bonusType.type,
        label: bonusType.label,
      });
    }
  });

  return specialSquares;
}

// Display yesterday's best board
function displayYesterdayBestBoard(boardData) {
  const boardContainer = document.getElementById("yesterdayBestBoard");
  const playerNameElement = document.getElementById("yesterdayBestPlayer");
  const scoreElement = document.getElementById("yesterdayBestScore");

  // Check if elements exist before trying to update them
  if (!boardContainer || !playerNameElement || !scoreElement) {
    console.error("Missing required elements for yesterday's best board");
    return;
  }

  // Update player info
  playerNameElement.textContent = boardData.nickname;
  scoreElement.textContent = `Score: ${boardData.score}`;

  // Clear the container first
  boardContainer.innerHTML = "";

  // Create the board grid
  const centerPosition = Math.floor(gameState.boardSize / 2);

  // Create a 5x5 grid
  for (let row = 0; row < gameState.boardSize; row++) {
    for (let col = 0; col < gameState.boardSize; col++) {
      const cell = document.createElement("div");
      cell.className = "board-cell";

      // Check if this is the center cell
      if (row === centerPosition && col === centerPosition) {
        cell.classList.add("center");
      }

      // Check if this cell has a special square
      const specialSquare = boardData.specialSquares.find(
        (sq) => sq.row === row && sq.col === col
      );
      if (specialSquare) {
        cell.classList.add(specialSquare.type);
        cell.dataset.bonus = specialSquare.label;
      }

      // Check if this cell has a placed tile
      const placedTile = boardData.placedTiles.find(
        (t) => t.row === row && t.col === col
      );
      if (placedTile) {
        const tile = document.createElement("div");
        tile.className = "tile placed";
        tile.textContent = placedTile.letter;

        // Add letter value
        const valueSpan = document.createElement("span");
        valueSpan.className = "tile-value";
        valueSpan.textContent = gameState.letterValues[placedTile.letter] || 0;
        tile.appendChild(valueSpan);

        // Add the tile to the cell
        cell.appendChild(tile);
      }

      boardContainer.appendChild(cell);
    }
  }
}
