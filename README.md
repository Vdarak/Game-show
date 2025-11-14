# Family Feud Game Show - PWA Edition

A production-ready Progressive Web App (PWA) for running a Family Feud-style game show with multi-screen support, offline capabilities, and room-based multiplayer.

## 🎯 Features

### ✅ Progressive Web App (PWA)
- **Offline Support**: Full functionality without internet connection
- **Installable**: Add to desktop/home screen for native app experience
- **Auto-detection**: Seamless online/offline mode switching
- **Visual Indicators**: Clear status display for network connectivity

### 🎮 Room-Based Multiplayer
- **Room Codes**: 6-character room codes for easy joining
- **Offline Mode**: Local network sync when offline
- **Online Mode**: Internet-based multiplayer (infrastructure ready)
- **Persistent State**: Room sessions saved locally

### 🎨 Theme System
- **Halloween**: Orange & purple spooky theme with Creepster font
- **Christmas**: Red & green festive theme with Mountains of Christmas font
- **Thanksgiving**: Warm autumn theme with Lobster font
- **Per-Team Themes**: Each team can have a different theme

### 📺 Multi-Screen Display
- **Game Board**: Shows questions and answers (no scores/strikes)
- **Unified Team Display**: 4-quadrant split screen showing all teams
  - Auto-splits into 4 sections when fullscreen
  - Individual team scores
  - Per-team strikes display
  - Theme-specific styling
- **Controller**: Master control panel for game management

### 🎯 Game Features
- 4 teams with individual scores and strikes
- Per-team strike tracking (moved from global)
- Theme customization per team
- Score management and tracking
- Question/answer reveal system
- Round-based gameplay

## 🚀 Getting Started

### Installation

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

### First Time Setup

1. Navigate to the home page
2. Click "Create New Game Room" to generate a room code
3. Share the room code with other devices
4. Others can join using "Enter Room Code"
5. Navigate to the controller to manage the game

### Display Setup

#### Option 1: Two-Screen Setup (Recommended)
1. Open controller on your main device
2. Click "Open All Displays" button
3. Game Board opens on left half of screen
4. Team Scores (4-quadrant) opens on right half

#### Option 2: Manual Setup
1. Open `/display/game-board` for questions/answers
2. Open `/display/teams` for team scores (auto-splits into 4 quadrants)

### Making it Fullscreen
- Team display automatically requests fullscreen after 1 second
- Press F11 or use browser fullscreen for game board
- ESC to exit fullscreen

## 📱 Installing as Desktop App

### Chrome/Edge
1. Click the install icon in the address bar (➕)
2. Or use the install prompt that appears
3. App appears in your applications folder

### Safari (iOS/macOS)
1. Tap Share button
2. Select "Add to Home Screen"
3. Follow prompts

## 🎮 Controller Features

### Header
- Network status indicator (Online/Offline)
- Room code display with copy button
- Round counter
- Elapsed time tracker

### Team Management
- Edit team names
- Choose team colors
- Select per-team themes (Halloween, Christmas, Thanksgiving)
- Manage per-team strikes (+/- controls)
- View current scores and round scores

### Question Control
- Load/navigate questions
- Reveal/hide individual answers
- Reveal/hide all answers
- Clear current question

### Score Control
- Select multiple teams
- Add/subtract points
- Quick point buttons (5, 10, 20, 50)
- Reset team scores

### Strike Management
- Global strikes (legacy feature)
- Per-team strikes (new feature)

### Round Control
- Award round points to winning team
- Reset strikes
- Clear question board

## 🎨 Theme Customization

### Available Themes

#### Halloween 🎃
- **Colors**: Orange (#FF6B00) & Purple (#8B00FF)
- **Background**: Dark purple (#1a0a1e)
- **Font**: Creepster/Nosifer
- **Style**: Spooky with radial gradient effects

#### Christmas 🎄
- **Colors**: Red (#C41E3A) & Green (#0F7939)
- **Background**: Dark green (#0d3b1f)
- **Font**: Mountains of Christmas
- **Style**: Festive with gold accents

#### Thanksgiving 🦃
- **Colors**: Chocolate (#D2691E) & Brown (#8B4513)
- **Background**: Dark brown (#2c1810)
- **Font**: Lobster/Pacifico
- **Style**: Warm autumn tones

#### Default
- **Colors**: Blue (#3B82F6) & Red (#EF4444)
- **Background**: Dark gray (#111827)
- **Font**: System fonts
- **Style**: Clean modern design

### How Themes Work
- Each team can have its own theme
- Themes apply to the team's quadrant in the unified display
- Background patterns, colors, and fonts change dynamically
- Controller allows real-time theme switching

## 🏗️ Architecture

### File Structure
```
app/
├── page.tsx                    # Home - Room code entry
├── layout.tsx                  # Root layout with PWA setup
├── controller/page.tsx         # Game controller
└── display/
    ├── game-board/page.tsx    # Questions/answers only
    └── teams/page.tsx         # 4-quadrant team display

components/
├── pwa/
│   ├── install-prompt.tsx     # PWA install button
│   ├── network-indicator.tsx  # Online/offline status
│   └── pwa-register.tsx       # Service worker registration
└── game/
    ├── answer-card.tsx        # Answer display component
    ├── animated-number.tsx    # Score animation
    ├── strike-indicator.tsx   # Strike display
    └── team-badge.tsx         # Team identifier

hooks/
├── use-game-state.ts          # Game state management
├── use-room-sync.ts           # Room code & sync logic
└── use-network-status.ts      # Network detection

lib/
├── themes.ts                  # Theme definitions
└── game-utils.ts              # Utility functions

public/
├── manifest.json              # PWA manifest
├── sw.js                      # Service worker
├── offline.html               # Offline fallback page
└── icon-*.png                 # App icons
```

### State Management
- **BroadcastChannel**: Real-time sync across tabs/windows
- **IndexedDB**: Persistent storage for offline use with large quota
- **Game State**: Centralized in `use-game-state` hook
- **Room State**: Managed by `use-room-sync` hook

### Offline Strategy
1. **Service Worker**: Caches essential resources
2. **BroadcastChannel**: Local sync without internet
3. **IndexedDB**: Persistent data storage (large quota, no size limits like localStorage)
4. **Graceful Degradation**: Full functionality offline

## 🔧 Configuration

### Environment Variables
No environment variables required for basic operation.

For future online multiplayer:
```env
NEXT_PUBLIC_SOCKET_URL=your-socket-server-url
```

### PWA Configuration
Edit `public/manifest.json` to customize:
- App name and description
- Theme colors
- Icon sizes
- Display mode

### Theme Customization
Edit `lib/themes.ts` to add new themes or modify existing ones:
```typescript
export const themes: Record<string, Theme> = {
  yourTheme: {
    name: "Your Theme",
    id: "yourtheme",
    primaryColor: "#FF0000",
    secondaryColor: "#00FF00",
    backgroundColor: "#000000",
    textColor: "#FFFFFF",
    accentColor: "#FFFF00",
    fontFamily: "'Your Font', sans-serif",
    backgroundPattern: "your-css-pattern",
  },
}
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
vercel
```

### Other Platforms
1. Build: `pnpm build`
2. Deploy `.next` directory
3. Ensure service worker is served at root

### Production Checklist
- [ ] Update manifest.json with production URLs
- [ ] Replace placeholder icons with real ones
- [ ] Configure CORS for online multiplayer (if enabled)
- [ ] Test offline functionality
- [ ] Test multi-device sync
- [ ] Test PWA installation

## 📝 Usage Tips

### Best Practices
1. **Create Room First**: Always create a room before starting
2. **Share Room Code**: Use the copy button to share with others
3. **Open Displays Last**: Set up game first, then open display screens
4. **Fullscreen Mode**: Use fullscreen for best experience
5. **Test Offline**: Try airplane mode to ensure offline works

### Troubleshooting

**Display windows not syncing:**
- Check that all windows are in the same room
- Verify IndexedDB is enabled (localStorage fallback for room codes)
- Try refreshing all windows

**PWA not installing:**
- Must be served over HTTPS (or localhost)
- Check browser console for errors
- Try different browser (Chrome/Edge recommended)

**Themes not applying:**
- Verify theme fonts loaded (check Network tab)
- Clear browser cache
- Check console for font loading errors

**Offline mode not working:**
- Service worker must be registered
- Check Application tab in DevTools
- Ensure manifest.json is accessible

## 🎯 Future Enhancements

- [ ] Socket.io server for true online multiplayer
- [ ] WebRTC peer-to-peer connections
- [ ] Sound effects integration
- [ ] Custom question editor
- [ ] Game history/statistics
- [ ] Timer/buzzer system
- [ ] More theme options
- [ ] Mobile-optimized controller
- [ ] Team photo uploads
- [ ] Leaderboard system

## 📄 License

MIT License - Feel free to use and modify for your needs.

## 🙏 Credits

Built with:
- Next.js 16
- React 19
- Tailwind CSS
- Framer Motion
- Radix UI
- Socket.io Client (ready for future use)

---

**Enjoy your game show! 🎉**
