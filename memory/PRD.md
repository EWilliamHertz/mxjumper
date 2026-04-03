# Pixel Quest - 2D Platformer RPG

## Original Problem Statement
Build a 2D side-scrolling platformer hub (MapleStory style) with basic physics. Implement a Multi-Ally Combat System (Final Fantasy X style) with a dynamic CTB turn timeline, supporting 1 to 4 party members (player + captured allies). Implement a capture mechanic to add enemies to the party. Create a Diablo-style Progression System (stat allocation for Strength/Agility/Intelligence/Vitality and a modular ability tree). Use NeonDB for all persistence. Implement WebSocket networking for a multiplayer environment where players can see each other.

## Tech Stack
- **Frontend**: React, Canvas 2D, Tailwind CSS, Axios
- **Backend**: FastAPI, asyncpg, NeonDB (PostgreSQL)
- **Real-time**: WebSocket (FastAPI native)
- **Auth**: JWT (bcrypt, access/refresh tokens)

## Architecture
```
/app/
  backend/
    server.py (All API routes, WebSocket, DB schema, seed data)
    .env (DATABASE_URL, JWT_SECRET, etc.)
  frontend/src/
    App.js (Router, auth flow)
    contexts/
      AuthContext.js (JWT auth state)
      GameContext.js (Game state, API calls, WebSocket)
    components/
      LoginScreen.js (Login/register UI)
      CharacterCreation.js (New player setup)
      Overworld.js (Canvas game, movement, NPCs, chat)
      CombatScreen.js (CTB combat, sprites, capture)
      GameMenu.js (Stats, party, abilities, allies)
```

## Implemented Features (as of April 2026)

### Core Systems
- JWT Auth with registration, login, brute-force protection
- Character creation with starter abilities
- NeonDB persistence for all game data

### Overworld (MapleStory-style)
- 4 maps: Emerald Forest, Dark Cave, Rocky Mountain, Peaceful Village
- WASD movement with gravity physics and platform collision
- Map exits connecting all 4 areas
- Auto-save position + map every 5 seconds
- Map persistence on page refresh

### Combat (FFX-style CTB)
- Conditional Turn-Based combat with visual turn timeline
- 12 zone-specific monsters (3 forest, 4 cave, 5 mountain)
- SVG cartoon sprites for all monsters and player
- Attack, Abilities (MP-cost spells), Capture, Flee actions
- Party HP/MP tracking during combat
- XP distribution on victory (player + allies)
- Level-up with automatic stat bonuses and ability unlocks

### Capture & Party System
- Capture weakened enemies (<50% HP) with capture rate rolls
- Name captured monsters
- Party management: up to 3 allies + player leader
- Allies gain XP and level up alongside player

### Progression (Diablo-style)
- Manual stat allocation (STR/AGI/INT/VIT) on level-up
- Ability tree with 10 abilities, level-gated unlocking
- Stats affect combat damage, HP/MP pools, turn speed

### Multiplayer
- WebSocket player presence (see other players on same map)
- Real-time chat (global channel, persisted to DB)
- Friend request/accept system
- Duel/Trade request via WebSocket
- Click on other players to interact

### Village NPCs
- Elder Oak (quest giver) - shows and accepts quests
- Merchant Mari (shop) - sell potions and capture orbs
- Blacksmith Bron (shop) - sell weapons and armor
- Healer Luna - fully heals party

### Quest System
- 3 quests: Slime Cleanup, Wolf Hunt, Skeleton Purge
- Quest progress tracking (defeated monster counting)
- Gold + XP rewards on completion

## Database Schema
- users, players, monsters, captured_allies, abilities, entity_abilities
- friends, chat_messages, trade_requests, duel_requests
- npcs, quests, player_quests, login_attempts

## Key API Endpoints
- POST /api/auth/register, /api/auth/login, /api/auth/logout
- GET/POST /api/player, PUT /api/player/position, /api/player/stats
- GET /api/monsters, /api/monsters/random?zone=X
- POST /api/allies/capture, PUT /api/allies/{id}/party
- GET /api/party, /api/abilities, /api/player/abilities
- POST /api/combat/victory, /api/combat/save-state
- GET/POST /api/chat/messages, /api/chat/send
- GET /api/friends, POST /api/friends/request, /api/friends/accept/{id}
- GET /api/npcs, POST /api/npcs/{id}/interact, /api/npcs/{id}/buy
- GET /api/quests, POST /api/quests/{id}/accept, /api/quests/{id}/complete
- WS /api/ws/{player_id}

## P1 Backlog (Upcoming)
- Multi-Ally Combat UI enhancement (show all party members attacking in combat with individual turns)
- More advanced stat allocation feedback
- Modular ability tree UI with visual branches

## P2 Backlog (Future)
- Trade system UI with item exchange
- Duel system with actual PvP combat
- More quest types and storyline
- Equipment/inventory system
- Boss monsters and dungeon maps
