// ===== Game State Variables =====
let gameState = {
    mode: 'single', // 'single', 'local', or 'online'
    difficulty: 4, // 4 or 6
    cards: [],
    flippedCards: [],
    matchedPairs: 0,
    moves: 0,
    timer: 0,
    timerInterval: null,
    currentPlayer: 1,
    player1Score: 0,
    player2Score: 0,
    canFlip: true,
    gameId: null,
    playerNumber: null, // 1 or 2 for online games
    gameListener: null
};

// ===== Card Emojis =====
const cardEmojis = ['🍎', '🍌', '🍒', '🍇', '🍓', '🍊', '🍋', '🍉', '🥝', '🍑', '🥭', '🍍', '🥥', '🫐', '🍈', '🍐', '🥑', '🍅'];

// ===== DOM Elements =====
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const gameoverScreen = document.getElementById('gameover-screen');

const modeBtns = document.querySelectorAll('.mode-btn');
const difficultyBtns = document.querySelectorAll('.difficulty-btn');
const startGameBtn = document.getElementById('start-game-btn');

const onlineOptions = document.getElementById('online-options');
const createGameBtn = document.getElementById('create-game-btn');
const joinGameBtn = document.getElementById('join-game-btn');
const gameIdInput = document.getElementById('game-id-input');
const gameIdDisplay = document.getElementById('game-id-display');
const gameIdText = document.getElementById('game-id-text');
const copyGameIdBtn = document.getElementById('copy-game-id-btn');

const cardGrid = document.getElementById('card-grid');
const timerDisplay = document.getElementById('timer');
const movesDisplay = document.getElementById('moves');
const turnIndicator = document.getElementById('turn-indicator');
const currentTurnText = document.getElementById('current-turn-text');
const connectionStatus = document.getElementById('connection-status');

const timerContainer = document.getElementById('timer-container');
const movesContainer = document.getElementById('moves-container');
const player1Container = document.getElementById('player1-container');
const player2Container = document.getElementById('player2-container');
const player1ScoreDisplay = document.getElementById('player1-score');
const player2ScoreDisplay = document.getElementById('player2-score');

const restartBtn = document.getElementById('restart-btn');
const quitBtn = document.getElementById('quit-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const menuBtn = document.getElementById('menu-btn');

const finalStats = document.getElementById('final-stats');

// ===== Event Listeners =====
modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        gameState.mode = btn.dataset.mode;

        // Show/hide online options
        if (gameState.mode === 'online') {
            onlineOptions.style.display = 'block';
            startGameBtn.style.display = 'none';
        } else {
            onlineOptions.style.display = 'none';
            gameIdDisplay.style.display = 'none';
            startGameBtn.style.display = 'block';
        }
    });
});

difficultyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        difficultyBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameState.difficulty = parseInt(btn.dataset.grid);
    });
});

startGameBtn.addEventListener('click', startGame);
createGameBtn.addEventListener('click', createOnlineGame);
joinGameBtn.addEventListener('click', joinOnlineGame);
copyGameIdBtn.addEventListener('click', copyGameId);
restartBtn.addEventListener('click', restartGame);
quitBtn.addEventListener('click', quitToMenu);
playAgainBtn.addEventListener('click', restartGame);
menuBtn.addEventListener('click', quitToMenu);

// ===== Firebase: Create Online Game =====
async function createOnlineGame() {
    try {
        // Check if Firebase is available
        if (!window.db || !window.dbRef || !window.dbSet) {
            alert('⚠️ Firebase is not initialized.\n\nOnline multiplayer requires HTTPS hosting (like GitHub Pages).\n\nLocal file:// protocol blocks Firebase connections.\n\nPlease deploy to GitHub Pages to use online multiplayer!');
            return;
        }

        const gameId = generateGameId();
        gameState.gameId = gameId;
        gameState.playerNumber = 1;

        // Generate board
        const totalPairs = (gameState.difficulty * gameState.difficulty) / 2;
        const selectedEmojis = cardEmojis.slice(0, totalPairs);
        const board = shuffleArray([...selectedEmojis, ...selectedEmojis]);

        // Create game in Firebase with timeout
        const gameRef = window.dbRef(window.db, `games/${gameId}`);
        const player1Ref = window.dbRef(window.db, `games/${gameId}/players/player1`);

        // Show loading state
        createGameBtn.textContent = 'Creating...';
        createGameBtn.disabled = true;

        // Set timeout to detect hanging connection
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout')), 5000)
        );

        const setPromise = window.dbSet(gameRef, {
            board: board,
            flippedCards: [],
            matchedCards: [],
            currentPlayer: 1,
            players: {
                player1: { score: 0, connected: true, lastSeen: Date.now() },
                player2: { score: 0, connected: false, lastSeen: null }
            },
            status: 'waiting',
            difficulty: gameState.difficulty,
            createdAt: Date.now()
        });

        await Promise.race([setPromise, timeoutPromise]);

        // Setup presence detection for player 1
        setupPresenceDetection(gameId, 1);

        // Show game ID
        gameIdText.textContent = gameId;
        gameIdDisplay.style.display = 'block';

        // Update button state to show waiting
        createGameBtn.textContent = 'Waiting for Player 2...';
        createGameBtn.disabled = true;
        createGameBtn.style.opacity = '0.6';
        createGameBtn.style.cursor = 'not-allowed';

        // Listen for player 2 joining
        listenToGame(gameId);
    } catch (error) {
        console.error('Firebase error:', error);

        // Reset button state
        createGameBtn.textContent = 'CREATE NEW GAME';
        createGameBtn.disabled = false;
        createGameBtn.style.opacity = '1';
        createGameBtn.style.cursor = 'pointer';

        if (error.message === 'Connection timeout') {
            alert('❌ Database Connection Failed\n\n⚠️ The Firebase Realtime Database has not been created yet.\n\nPlease:\n1. Go to Firebase Console\n2. Click "Realtime Database"\n3. Click "Create Database"\n4. Choose location and start in test mode\n5. Try again\n\nURL: https://console.firebase.google.com/project/memory-game-f25ab/database');
        } else {
            alert('⚠️ Failed to create game.\n\nError: ' + error.message + '\n\nPlease ensure:\n1. You have internet connection\n2. Firebase Realtime Database is created\n3. Database rules allow writes');
        }
    }
}

// ===== Firebase Presence Detection =====
function setupPresenceDetection(gameId, playerNumber) {
    if (!window.db || !window.dbRef || !window.dbOnDisconnect || !window.dbUpdate) {
        console.warn('Firebase presence features not available');
        return;
    }

    const playerRef = window.dbRef(window.db, `games/${gameId}/players/player${playerNumber}`);
    const connectedRef = window.dbRef(window.db, '.info/connected');

    // Listen for connection state changes
    window.dbOnValue(connectedRef, (snapshot) => {
        if (snapshot.val() === true) {
            // We're connected (or reconnected)
            // Set up disconnect handler
            const disconnectRef = window.dbOnDisconnect(playerRef);
            disconnectRef.update({
                connected: false,
                lastSeen: Date.now()
            });

            // Set ourselves as online
            window.dbUpdate(playerRef, {
                connected: true,
                lastSeen: Date.now()
            });

            // Update lastSeen every 5 seconds to show we're still active
            if (gameState.presenceInterval) {
                clearInterval(gameState.presenceInterval);
            }
            gameState.presenceInterval = setInterval(() => {
                window.dbUpdate(playerRef, { lastSeen: Date.now() });
            }, 5000);
        }
    });
}

// ===== Firebase: Join Online Game =====
async function joinOnlineGame() {
    try {
        // Check if Firebase is available
        if (!window.db || !window.dbRef || !window.dbGet || !window.dbUpdate) {
            alert('⚠️ Firebase is not initialized.\n\nPlease use HTTPS hosting to access Firebase.');
            return;
        }

        const gameId = gameIdInput.value.trim().toUpperCase();
        if (!gameId) {
            alert('⚠️ Please enter a Game ID');
            return;
        }

        const gameRef = window.dbRef(window.db, `games/${gameId}`);
        const snapshot = await window.dbGet(gameRef);

        if (!snapshot.exists()) {
            alert('⚠️ Game not found! Please check the Game ID.');
            return;
        }

        const gameData = snapshot.val();
        if (gameData.status !== 'waiting') {
            alert('⚠️ This game is already in progress or finished.');
            return;
        }

        // Join as player 2
        gameState.gameId = gameId;
        gameState.playerNumber = 2;

        // Setup presence detection for player 2
        setupPresenceDetection(gameId, 2);

        await window.dbUpdate(gameRef, {
            'players/player2/connected': true,
            'players/player2/lastSeen': Date.now(),
            'status': 'playing'
        });

        gameState.difficulty = gameData.difficulty;

        // Start game
        listenToGame(gameId);
        startGame();
    } catch (error) {
        console.error('Failed to join game:', error);
        alert('\u26a0\ufe0f Failed to join game: ' + error.message);
    }
}

// ===== Firebase: Listen to Game Updates =====
function listenToGame(gameId) {
    const gameRef = window.dbRef(window.db, `games/${gameId}`);

    gameState.gameListener = window.dbOnValue(gameRef, (snapshot) => {
        if (!snapshot.exists()) return;

        const gameData = snapshot.val();

        // If we're player 1 and player 2 joins, start the game
        if (gameState.playerNumber === 1 && gameData.players.player2.connected && gameData.status === 'playing') {
            startGame();
        }

        // Update game state from Firebase
        if (gameData.status === 'playing') {
            syncGameState(gameData);
        }

        // Check for game over
        if (gameData.status === 'finished') {
            gameState.player1Score = gameData.players.player1.score;
            gameState.player2Score = gameData.players.player2.score;
            showGameOver();
        }
    });
}

// ===== Firebase: Sync Game State =====
function syncGameState(gameData) {
    // Update scores
    gameState.player1Score = gameData.players.player1.score;
    gameState.player2Score = gameData.players.player2.score;

    // Only update turn if we're not currently in the middle of a turn
    // This prevents Firebase from overwriting local state during active play
    if (gameState.canFlip) {
        gameState.currentPlayer = gameData.currentPlayer;
    }

    // Check opponent connection status
    if (gameState.mode === 'online') {
        const opponentNumber = gameState.playerNumber === 1 ? 2 : 1;
        const opponent = gameData.players[`player${opponentNumber}`];

        // Update connection status
        const statusIcon = document.getElementById('status-icon');
        const statusText = document.getElementById('status-text');
        const opponentStatus = document.getElementById('opponent-status');

        if (opponent && opponent.connected) {
            if (statusIcon) statusIcon.textContent = '🟢';
            if (statusText) statusText.textContent = 'Connected';
            if (opponentStatus) opponentStatus.textContent = '';
        } else {
            if (statusIcon) statusIcon.textContent = '🔴';
            if (statusText) statusText.textContent = 'Opponent Disconnected';
            if (opponentStatus) opponentStatus.textContent = '⚠️ Waiting for reconnection...';

            // Show toast notification once
            if (!gameState.disconnectToastShown) {
                showToast('Opponent disconnected. Waiting for reconnection...', 'warning');
                gameState.disconnectToastShown = true;
            }
        }
    }

    // Update UI
    updateDisplay();
    updateTurnIndicator();

    // Sync card states
    const flippedIndices = gameData.flippedCards || [];
    const matchedIndices = gameData.matchedCards || [];

    // Only sync cards if it's NOT our turn or we haven't flipped any cards yet
    // This prevents removing the "flipped" class from cards we just clicked
    const isOurTurn = gameState.currentPlayer === gameState.playerNumber;
    const hasLocalFlips = gameState.flippedCards.length > 0;

    document.querySelectorAll('.card').forEach((card, index) => {
        const isFlipped = flippedIndices.includes(index);
        const isMatched = matchedIndices.includes(index);

        if (isMatched) {
            card.classList.add('matched');
            card.classList.add('flipped');
        } else if (isFlipped) {
            card.classList.add('flipped');
        } else if (!isOurTurn || !hasLocalFlips) {
            // Only remove flipped class if it's not our turn or we have no local flips
            // This prevents race condition where Firebase removes our just-clicked card
            card.classList.remove('flipped');
        }

        // Disable cards if not current player's turn
        if (gameState.mode === 'online' && gameState.currentPlayer !== gameState.playerNumber) {
            card.classList.add('disabled');
        } else {
            card.classList.remove('disabled');
        }
    });

    // Update matched pairs count
    gameState.matchedPairs = matchedIndices.length / 2;
}

// ===== Toast Notification System =====
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== Firebase: Update Game State =====
async function updateFirebaseGame(updates) {
    if (!gameState.gameId) return;

    const gameRef = window.dbRef(window.db, `games/${gameState.gameId}`);
    await window.dbUpdate(gameRef, updates);
}

// ===== Initialize Game =====
function startGame() {
    // Reset game state
    gameState.flippedCards = [];
    gameState.matchedPairs = 0;
    gameState.moves = 0;
    gameState.timer = 0;
    if (gameState.mode !== 'online') {
        gameState.currentPlayer = 1;
        gameState.player1Score = 0;
        gameState.player2Score = 0;
    }
    gameState.canFlip = true;

    // Show/hide appropriate UI elements based on mode
    if (gameState.mode === 'single') {
        timerContainer.style.display = 'flex';
        movesContainer.style.display = 'flex';
        player1Container.style.display = 'none';
        player2Container.style.display = 'none';
        turnIndicator.style.display = 'none';
        connectionStatus.style.display = 'none';
        startTimer();
    } else if (gameState.mode === 'local') {
        timerContainer.style.display = 'none';
        movesContainer.style.display = 'none';
        player1Container.style.display = 'flex';
        player2Container.style.display = 'flex';
        turnIndicator.style.display = 'block';
        connectionStatus.style.display = 'none';
        updateTurnIndicator();
    } else if (gameState.mode === 'online') {
        timerContainer.style.display = 'none';
        movesContainer.style.display = 'none';
        player1Container.style.display = 'flex';
        player2Container.style.display = 'flex';
        turnIndicator.style.display = 'block';
        connectionStatus.style.display = 'block';
        updateTurnIndicator();
    }

    // Update displays
    updateDisplay();

    // Generate cards
    generateCards();

    // Switch to game screen
    setupScreen.classList.remove('active');
    gameScreen.classList.add('active');
}

// ===== Generate Cards =====
async function generateCards() {
    cardGrid.className = `card-grid grid-${gameState.difficulty}`;
    cardGrid.innerHTML = '';

    // For online games, use board from Firebase
    if (gameState.mode === 'online' && gameState.gameId) {
        const gameRef = window.dbRef(window.db, `games/${gameState.gameId}`);
        const snapshot = await window.dbGet(gameRef);
        if (snapshot.exists()) {
            gameState.cards = snapshot.val().board;
        }
    } else {
        // For single/local games, generate new board
        const totalPairs = (gameState.difficulty * gameState.difficulty) / 2;
        const selectedEmojis = cardEmojis.slice(0, totalPairs);
        gameState.cards = shuffleArray([...selectedEmojis, ...selectedEmojis]);
    }

    // Create card elements
    gameState.cards.forEach((emoji, index) => {
        const card = createCardElement(emoji, index);
        cardGrid.appendChild(card);
    });
}

// ===== Create Card Element =====
function createCardElement(emoji, index) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.index = index;
    card.dataset.emoji = emoji;

    card.innerHTML = `
        <div class="card-inner">
            <div class="card-front">❓</div>
            <div class="card-back">${emoji}</div>
        </div>
    `;

    card.addEventListener('click', () => handleCardClick(card, index));
    return card;
}

// ===== Handle Card Click =====
async function handleCardClick(card, index) {
    // Prevent clicking if not current player in online mode
    if (gameState.mode === 'online' && gameState.currentPlayer !== gameState.playerNumber) {
        // Visual feedback: shake animation
        card.classList.add('shake');
        setTimeout(() => card.classList.remove('shake'), 500);

        // Show toast notification
        showToast('\u26a0\ufe0f Wait for your turn!', 'warning');
        return;
    }

    // Prevent clicking if card is already flipped or matched
    if (!gameState.canFlip ||
        card.classList.contains('flipped') ||
        card.classList.contains('matched') ||
        gameState.flippedCards.length >= 2) {
        // Gentle shake for invalid click
        if (card.classList.contains('flipped') || card.classList.contains('matched')) {
            card.classList.add('shake');
            setTimeout(() => card.classList.remove('shake'), 500);
        }
        return;
    }

    // Flip the card
    card.classList.add('flipped');
    gameState.flippedCards.push({ card, index });

    // Check for match when two cards are flipped
    if (gameState.flippedCards.length === 2) {
        gameState.canFlip = false;

        // For online games, update Firebase ONCE with both cards
        // This prevents race condition where rapid clicks only record one card
        if (gameState.mode === 'online') {
            const flippedIndices = gameState.flippedCards.map(f => f.index);
            await updateFirebaseGame({
                flippedCards: flippedIndices
            });
        }

        if (gameState.mode === 'single') {
            gameState.moves++;
            updateDisplay();
        }

        await checkForMatch();
    }
}

// ===== Check For Match =====
async function checkForMatch() {
    const [flip1, flip2] = gameState.flippedCards;
    const emoji1 = flip1.card.dataset.emoji;
    const emoji2 = flip2.card.dataset.emoji;

    if (emoji1 === emoji2) {
        // Match found!
        setTimeout(async () => {
            flip1.card.classList.add('matched');
            flip2.card.classList.add('matched');
            gameState.matchedPairs++;

            // Update score in multiplayer
            if (gameState.mode === 'local') {
                if (gameState.currentPlayer === 1) {
                    gameState.player1Score++;
                } else {
                    gameState.player2Score++;
                }
                updateDisplay();
            } else if (gameState.mode === 'online') {
                // Update local score first
                if (gameState.currentPlayer === 1) {
                    gameState.player1Score++;
                } else {
                    gameState.player2Score++;
                }

                const playerKey = `players/player${gameState.playerNumber}/score`;
                const newScore = gameState.playerNumber === 1 ? gameState.player1Score : gameState.player2Score;

                // Get current matched cards from Firebase
                const gameRef = window.dbRef(window.db, `games/${gameState.gameId}`);
                const snapshot = await window.dbGet(gameRef);
                const currentMatched = snapshot.val().matchedCards || [];

                await updateFirebaseGame({
                    [playerKey]: newScore,
                    matchedCards: [...currentMatched, flip1.index, flip2.index],
                    flippedCards: []
                });
            }

            gameState.flippedCards = [];
            gameState.canFlip = true;

            // Check if game is complete
            await checkGameComplete();
        }, 600);
    } else {
        // No match
        setTimeout(async () => {
            flip1.card.classList.remove('flipped');
            flip2.card.classList.remove('flipped');
            gameState.flippedCards = [];

            // Switch turn in multiplayer only if no match
            if (gameState.mode === 'local') {
                switchTurn();
            } else if (gameState.mode === 'online') {
                const newTurn = gameState.currentPlayer === 1 ? 2 : 1;
                // Update local state before Firebase
                gameState.currentPlayer = newTurn;
                await updateFirebaseGame({
                    currentPlayer: newTurn,
                    flippedCards: []
                });
            }

            gameState.canFlip = true;
        }, 1000);
    }
}

// ===== Switch Turn (Local Multiplayer) =====
function switchTurn() {
    gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
    updateTurnIndicator();
}

// ===== Update Turn Indicator =====
function updateTurnIndicator() {
    if (gameState.mode === 'online') {
        if (gameState.currentPlayer === gameState.playerNumber) {
            currentTurnText.textContent = 'YOUR TURN';
            turnIndicator.style.background = '#000000';
            turnIndicator.style.color = '#ffffff';
        } else {
            currentTurnText.textContent = "OPPONENT'S TURN";
            turnIndicator.style.background = '#666666';
            turnIndicator.style.color = '#ffffff';
        }
    } else {
        currentTurnText.textContent = `PLAYER ${gameState.currentPlayer}'S TURN`;

        if (gameState.currentPlayer === 1) {
            turnIndicator.style.background = '#000000';
            turnIndicator.style.color = '#ffffff';
        } else {
            turnIndicator.style.background = '#444444';
            turnIndicator.style.color = '#ffffff';
        }
    }
}

// ===== Check Game Complete =====
async function checkGameComplete() {
    const totalPairs = (gameState.difficulty * gameState.difficulty) / 2;

    if (gameState.matchedPairs === totalPairs) {
        stopTimer();

        // For online games, update status
        if (gameState.mode === 'online') {
            await updateFirebaseGame({
                status: 'finished'
            });
        }

        setTimeout(() => showGameOver(), 500);
    }
}

// ===== Timer Functions =====
function startTimer() {
    gameState.timerInterval = setInterval(() => {
        gameState.timer++;
        updateDisplay();
    }, 1000);
}

function stopTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
}

// ===== Update Display =====
function updateDisplay() {
    // Update timer
    const minutes = Math.floor(gameState.timer / 60).toString().padStart(2, '0');
    const seconds = (gameState.timer % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `${minutes}:${seconds}`;

    // Update moves
    movesDisplay.textContent = gameState.moves;

    // Update player scores
    player1ScoreDisplay.textContent = gameState.player1Score;
    player2ScoreDisplay.textContent = gameState.player2Score;
}

// ===== Show Game Over =====
function showGameOver() {
    gameScreen.classList.remove('active');
    gameoverScreen.classList.add('active');

    let statsHTML = '';

    if (gameState.mode === 'single') {
        const minutes = Math.floor(gameState.timer / 60);
        const seconds = gameState.timer % 60;

        statsHTML = `
            <p>⏱️ Time: <span class="highlight">${minutes}m ${seconds}s</span></p>
            <p>🎯 Moves: <span class="highlight">${gameState.moves}</span></p>
            <p>⭐ Score: <span class="highlight">${calculateScore()}</span></p>
        `;
    } else {
        const winner = gameState.player1Score > gameState.player2Score ? 'Player 1' :
            gameState.player2Score > gameState.player1Score ? 'Player 2' : 'Tie';

        statsHTML = `
            <p>🏆 Winner: <span class="highlight">${winner}</span></p>
            <p>👤 Player 1 Score: <span class="highlight">${gameState.player1Score}</span></p>
            <p>👥 Player 2 Score: <span class="highlight">${gameState.player2Score}</span></p>
        `;

        if (gameState.mode === 'online') {
            statsHTML += `<p class="mt-3">Thanks for playing online!</p>`;
        }
    }

    finalStats.innerHTML = statsHTML;
}

// ===== Calculate Score (Single Player) =====
function calculateScore() {
    const totalPairs = (gameState.difficulty * gameState.difficulty) / 2;
    const perfectMoves = totalPairs;
    const timeBonus = Math.max(0, 300 - gameState.timer);
    const movesPenalty = Math.max(0, (gameState.moves - perfectMoves) * 10);

    return Math.max(0, 1000 + timeBonus - movesPenalty);
}

// ===== Restart Game =====
async function restartGame() {
    stopTimer();

    // For online games, clean up
    if (gameState.mode === 'online' && gameState.gameId) {
        if (gameState.gameListener) {
            // Note: Can't easily unsubscribe with current pattern, would need to refactor
        }
        await cleanupOnlineGame();
    }

    gameoverScreen.classList.remove('active');
    startGame();
}

// ===== Quit to Menu =====
async function quitToMenu() {
    stopTimer();

    // For online games, clean up
    if (gameState.mode === 'online' && gameState.gameId) {
        await cleanupOnlineGame();
    }

    gameScreen.classList.remove('active');
    gameoverScreen.classList.remove('active');
    setupScreen.classList.add('active');

    // Reset selections
    modeBtns[0].classList.add('selected');
    modeBtns[1].classList.remove('selected');
    modeBtns[2]?.classList.remove('selected');
    gameState.mode = 'single';

    onlineOptions.style.display = 'none';
    gameIdDisplay.style.display = 'none';
    startGameBtn.style.display = 'block';
    createGameBtn.disabled = false;
    gameIdInput.value = '';
}

// ===== Cleanup Online Game =====
async function cleanupOnlineGame() {
    if (gameState.gameId && gameState.playerNumber) {
        const gameRef = window.dbRef(window.db, `games/${gameState.gameId}`);

        // Mark player as disconnected
        await window.dbUpdate(gameRef, {
            [`players/player${gameState.playerNumber}/connected`]: false
        });

        // If both players disconnected, delete game after 1 hour (cleanup)
        // For now, just reset local state
        gameState.gameId = null;
        gameState.playerNumber = null;
    }
}

// ===== Utility Functions =====
function generateGameId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
    let id = '';
    for (let i = 0; i < 6; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

async function copyGameId() {
    const gameId = gameIdText.textContent;
    try {
        await navigator.clipboard.writeText(gameId);
        copyGameIdBtn.textContent = '✅ Copied!';
        setTimeout(() => {
            copyGameIdBtn.textContent = '📋 Copy';
        }, 2000);
    } catch (err) {
        alert(`Game ID: ${gameId}\n\nCopy this manually.`);
    }
}
