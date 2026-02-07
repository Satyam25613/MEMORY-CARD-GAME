# 🎮 Card Flip Memory Game

A fun and engaging memory card game with **single-player**, **local multiplayer**, and **online multiplayer** modes. Built with vanilla HTML, CSS, and JavaScript + Firebase Realtime Database.

## 🎯 Game Modes

### 1️⃣ Single Player
- Track your moves and time
- Challenge yourself to get the best score
- Perfect for practicing memory skills

### 2️⃣ Local Multiplayer (2 Players, Same Device)
- Turn-based gameplay on one device
- Each player tries to find matching pairs
- Match cards to score points and keep your turn
- Most matches wins!

### 3️⃣ Online Multiplayer (2 Players, Remote)
- Play with anyone, anywhere in real-time
- Share a 6-character Game ID to invite a friend
- Real-time synchronization via Firebase
- Turn-based gameplay with live updates

## 🎨 Features

✅ **Three Game Modes**: Single, Local, and Online multiplayer  
✅ **Two Difficulty Levels**: 4x4 (Easy) and 6x6 (Hard) grids  
✅ **Real-time Sync**: Firebase Realtime Database for online play  
✅ **Smooth Animations**: Beautiful 3D card flip effects  
✅ **Responsive Design**: Works on mobile, tablet, and desktop  
✅ **No Frameworks**: Pure vanilla JavaScript  
✅ **GitHub Pages Ready**: Deploy instantly  

## 🕹️ How to Play

### Single Player
1. Select **Single Player** mode
2. Choose difficulty (Easy or Hard)
3. Click **Start Game**
4. Flip cards to find matching pairs
5. Complete in fewest moves and fastest time

### Local Multiplayer
1. Select **Local 2P** mode
2. Choose difficulty
3. Click **Start Game**
4. Players alternate turns
5. Match pairs to score and keep your turn
6. Player with most matches wins

### Online Multiplayer
1. Select **Online 2P** mode
2. Choose difficulty

**To Create a Game:**
- Click **Create New Game**
- Share the 6-character Game ID with your friend
- Wait for them to join
- Game starts automatically!

**To Join a Game:**
- Get the Game ID from your friend
- Enter it in the input field
- Click **Join Game**
- Start playing!

## 🚀 Deploy to GitHub Pages

### Step 1: Create a GitHub Repository
1. Go to [github.com](https://github.com) and sign in
2. Click **+** → **New repository**
3. Name it (e.g., `memory-card-game`)
4. Make it **Public**
5. Click **Create repository**

### Step 2: Push Your Code
```bash
cd /Users/satyyy/GAME

git init
git add .
git commit -m "Card flip memory game with Firebase multiplayer"

# Replace YOUR-USERNAME with your GitHub username
git remote add origin https://github.com/YOUR-USERNAME/memory-card-game.git

git branch -M main
git push -u origin main
```

### Step 3: Enable GitHub Pages
1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (left sidebar)
3. Under **Source**, select **main** branch
4. Click **Save**
5. Wait 1-2 minutes

Your game will be live at:
```
https://YOUR-USERNAME.github.io/memory-card-game/
```

## 🔥 Firebase Setup (Already Configured)

The game uses Firebase Realtime Database for online multiplayer. The Firebase project is already configured in the code with the following setup:

- **Project**: memory-game-f25ab
- **Database**: Real-time synchronization
- **CDN Import**: No npm or build tools needed

### Firebase Data Structure
```javascript
games: {
  gameId: {
    board: [...],              // Shuffled card emojis
    flippedCards: [],          // Currently flipped card indices
    matchedCards: [],          // Matched card indices
    currentPlayer: 1,          // 1 or 2
    players: {
      player1: { score: 0, connected: true },
      player2: { score: 0, connected: false }
    },
    status: "playing",         // waiting, playing, or finished
    difficulty: 4              // 4 or 6
  }
}
```

## 📁 Project Structure

```
memory-card-game/
│
├── index.html      # HTML structure + Firebase SDK
├── style.css       # Styles and animations
├── script.js       # Game logic + Firebase integration
└── README.md       # This file
```

## 🎮 Tech Stack

- **HTML5** - Structure
- **CSS3** - Styling and 3D animations
- **Vanilla JavaScript** - Game logic
- **Firebase Realtime Database** - Online multiplayer sync (CDN)

## 🌐 Browser Compatibility

- ✅ Chrome, Edge, Safari, Firefox (latest versions)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)
- ✅ No external dependencies or frameworks

## 🎯 Game Features Breakdown

### Single Player
- Move counter
- Real-time timer
- Score calculation (based on time + moves)
- Restart option

### Multiplayer (Local & Online)
- Turn-based gameplay
- Individual player scores
- Clear turn indicators
- Match = Keep your turn
- No match = Switch turns

### Online Multiplayer Specific
- Game room creation with unique ID
- Easy game joining via 6-character code
- Real-time board synchronization
- Automatic turn management
- Connection status display
- Clean game state cleanup

## 🔒 Firebase Security

The current Firebase configuration is set for development/demo purposes. For production:

1. Go to Firebase Console → Database → Rules
2. Update security rules to prevent abuse
3. Consider adding authentication

**Basic Security Rules:**
```json
{
  "rules": {
    "games": {
      "$gameId": {
        ".read": true,
        ".write": "!data.exists() || data.child('players/player1/connected').val() === true || data.child('players/player2/connected').val() === true",
        ".validate": "newData.hasChildren(['board', 'players', 'status'])"
      }
    }
  }
}
```

## 🎨 Card Emojis Used

🍎 🍌 🍒 🍇 🍓 🍊 🍋 🍉 🥝 🍑 🥭 🍍 🥥 🫐 🍈 🍐 🥑 🍅

## 🐛 Troubleshooting

**Online mode not working?**
- Check your internet connection
- Make sure Firebase is not blocked by firewall/ad-blocker
- Try refreshing the page

**Game ID not working?**
- Ensure it's exactly 6 characters
- Check for typos (O vs 0, I vs 1)
- Game might have expired (create a new one)

## 📝 License

Open source - free to use and modify!

---

**Built with ❤️ using vanilla JavaScript and Firebase**

Enjoy the game! 🎉
