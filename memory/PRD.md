# MXJumper - 2D Platformer RPG

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
      GameMenu.js (Stats, party, abilities, allies, bestiary)
```

## Implemented Features

### Core Systems
- JWT Auth with registration, login, brute-force protection
- Character creation with starter abilities
- NeonDB persistence for all game data

### Overworld (MapleStory-style)
- 4 maps: Emerald Forest, Dark Cave, Rocky Mountain, Peaceful Village
- WASD movement with gravity physics and platform collision
- Map exits connecting all 4 areas
- Auto-save position + map every 5 seconds
- Map persistence on page refresh (FIXED April 2026)

### Combat (FFX-style CTB) — FIXED April 2026
- Conditional Turn-Based combat with visual turn timeline
- 12 zone-specific monsters (3 forest, 4 cave, 5 mountain)
- SVG cartoon sprites for all monsters and player
- Attack, Abilities (MP-cost spells), Capture, Flee actions
- **Multi-ally combat**: Party members (player + captured allies) all take turns
- **Enemy AI fixed**: Uses ref-based guard to prevent effect self-cancellation
- Party HP/MP tracking during combat with battlefield HP bars
- XP distribution on victory (player + allies)
- Level-up with automatic stat bonuses and ability unlocks

### Capture & Party System
- Capture weakened enemies (<50% HP) with capture rate rolls
- Name captured monsters
- Party management: up to 3 allies + player leader
- Allies gain XP and level up alongside player

### Monster Bestiary (NEW April 2026)
- Pokédex-style catalog tracking encountered/captured monsters
- Shows all 12 monsters with discovered/undiscovered status
- Detailed stat view: HP, MP, STR, AGI, INT, VIT, capture rate, XP reward
- Tracks times defeated, first seen date
- Collection progress: discovered/total, captured/total, completion %
- Auto-records encounters and captures

### Progression (Diablo-style) — Enhanced April 2026
- Manual stat allocation (STR/AGI/INT/VIT) with descriptions
- Stat effect descriptions (+2 damage per STR, +5 HP per VIT, etc.)
- Visual stat progress bars
- 5-tier Ability Tree: Lv1, Lv2, Lv3, Lv5, Lv7
- 10 abilities: Fire Strike, Ice Shard, Heal, Guard, Power Up, Quick Step, Poison Bite, Thunder Bolt, Mega Slash, Cure All
- Element-coded visual tree (fire=red, ice=blue, lightning=yellow, poison=green)
- Shows locked future tiers so players can plan

### Multiplayer
- WebSocket player presence (see other players on same map)
- Real-time chat (global channel, persisted to DB)
- Friend request/accept system
- Duel/Trade request via WebSocket

### Village NPCs
- Elder Oak (quest giver) - shows available/active quests
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
- npcs, quests, player_quests, login_attempts, player_bestiary

## Key API Endpoints
- Auth: POST /api/auth/register, /api/auth/login
- Player: GET/POST /api/player, PUT /api/player/position, /api/player/stats
- Combat: GET /api/monsters/random, POST /api/combat/victory
- Allies: POST /api/allies/capture, PUT /api/allies/{id}/party, GET /api/party
- Bestiary: GET /api/bestiary, POST /api/bestiary/encounter
- NPCs: GET /api/npcs, POST /api/npcs/{id}/interact
- Quests: GET /api/quests, POST /api/quests/{id}/accept
- Chat: GET /api/chat/messages, POST /api/chat/send
- WS: /api/ws/{player_id}

## P1 Backlog
- Equipment/inventory system
- More quest types and storyline
- Class system (Warrior/Mage/Ranger/Healer)

## P2 Backlog
- Trade system UI, Duel PvP
- Guild system
- Boss monsters and dungeon maps
- See ROADMAP.md for 6-month MMORPG plan
