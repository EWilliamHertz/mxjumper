# MXJumper - 6-Month MMORPG Development Roadmap

## Vision
Transform MXJumper from a single-map platformer RPG into a fully-featured 2D MMORPG with persistent multiplayer worlds, deep progression systems, guild warfare, and a player-driven economy.

---

## Month 1: Core Foundation & Server Architecture (Weeks 1-4)

### Week 1-2: Scalable Backend Infrastructure
- **Migrate to proper WebSocket rooms** — Zone-based channels so only nearby players communicate
- **Redis integration** for session caching, real-time player state, and pub/sub messaging
- **Connection pooling & rate limiting** — Handle 100+ concurrent players without DB bottleneck
- **Player data sharding** — Partition by zone to reduce query load

### Week 3-4: Persistent World & Map System
- **Expand to 12+ maps** — Forest Path, Deep Forest, Crystal Cave, Lava Cave, Snow Mountain, Desert, Swamp, Ruined City, Sky Islands, Underwater Temple, Dark Realm, Capital City
- **Map instancing** — Private instances for dungeons, shared instances for overworld
- **Smooth map transitions** — Edge-scroll loading, no loading screens
- **Dynamic spawn system** — Monster spawn points with respawn timers, rare spawn events

### Deliverables
- 12 explorable maps with unique tilesets
- WebSocket rooms per zone
- Redis-backed real-time state
- 50+ concurrent player capacity

---

## Month 2: Combat & Class System (Weeks 5-8)

### Week 5-6: Class System
- **4 Base Classes**: Warrior (STR/VIT), Mage (INT), Ranger (AGI), Healer (INT/VIT)
- **Class advancement at Lv15**: Warrior → Knight or Berserker, Mage → Sorcerer or Enchanter, etc.
- **Class-specific ability trees** — 15 abilities per class, 3 branches each
- **Class-locked equipment** — Only Warriors can equip heavy armor, etc.

### Week 7-8: Advanced Combat
- **Boss encounters** — Multi-phase fights with unique mechanics (dodge zones, enrage timers)
- **Party sync combat** — All 4 party members (real players) take turns in the same CTB timeline
- **Aggro system** — Tanks draw enemy attention, DPS manages threat
- **Status effects** — Burn, freeze, poison, stun, bleed, haste, protect, reflect
- **Combo system** — Certain ability sequences deal bonus damage

### Deliverables
- 4 base classes with advancement
- 60+ total abilities across classes
- 5 boss encounters
- Full status effect system

---

## Month 3: Economy & Equipment (Weeks 9-12)

### Week 9-10: Equipment System
- **Equipment slots**: Weapon, Armor, Helmet, Boots, Accessory (x2), Ring
- **Equipment rarity tiers**: Common (white), Uncommon (green), Rare (blue), Epic (purple), Legendary (orange)
- **Random stat rolls** on dropped equipment (Diablo-style affixes)
- **Equipment enhancement** — Use materials to upgrade equipment level (+1 to +15)
- **Set bonuses** — Wearing multiple pieces of the same set grants extra stats

### Week 11-12: Player Economy
- **Player-to-player trading** — Direct trade window with gold and items
- **Auction House** — List items for sale, search/filter, bidding system
- **Crafting system** — Combine monster drops + materials to create equipment
- **Resource gathering** — Mining, herbalism, fishing (mini-game skill nodes on maps)
- **Daily login rewards & achievement system**

### Deliverables
- Full equipment system with 100+ items
- Auction house with search/filter
- Crafting with 50+ recipes
- 3 gathering professions

---

## Month 4: Social & Guild Systems (Weeks 13-16)

### Week 13-14: Guild System
- **Guild creation** — Name, emblem, description, ranks
- **Guild ranks & permissions** — Leader, Officer, Member, Recruit
- **Guild storage** — Shared item/gold bank
- **Guild leveling** — Earn guild XP from member activities, unlock perks
- **Guild chat channel** — Persistent chat for guild members

### Week 15-16: Social Features
- **Party finder / LFG** — Queue for dungeons by role
- **Friend system enhancements** — Online status, whisper chat, friend notes
- **Player profiles** — View equipment, stats, achievements, guild
- **Emotes & cosmetics** — Expression system, purchasable outfits (non-P2W)
- **Mail system** — Send items and messages between players
- **Leaderboards** — Level, PvP rating, boss clears, speedruns

### Deliverables
- Full guild system with bank/perks
- Party finder with role matching
- Player profiles and leaderboards
- Mail and whisper system

---

## Month 5: Endgame & PvP (Weeks 17-20)

### Week 17-18: Endgame PvE
- **Raid dungeons** — 8-player content with 3 bosses, weekly lockout
- **World bosses** — Open-world bosses requiring 10+ players, spawn on schedule
- **Challenge modes** — Timed dungeon runs with leaderboards and exclusive rewards
- **Daily/Weekly quests** — Repeatable content with currency for endgame gear
- **Monster hunter bounties** — Special contracts for rare monsters with unique drops

### Week 19-20: PvP System
- **Arena PvP** — 1v1 and 2v2 ranked matches with seasonal rewards
- **Guild War** — Scheduled territory control battles between guilds
- **PvP zones** — Certain maps flagged as PvP where players can attack each other
- **Battle Royale event** — 20-player last-man-standing weekly event
- **PvP rankings & seasons** — Elo-based matchmaking, seasonal resets with rewards

### Deliverables
- 2 raid dungeons with 6 boss encounters
- Ranked PvP with matchmaking
- Guild territory wars
- Weekly event system

---

## Month 6: Polish, Monetization & Launch (Weeks 21-24)

### Week 21-22: Quality of Life & Polish
- **Tutorial/onboarding** — Guided first-time experience with narrative
- **Minimap** — Always-visible map showing nearby players, NPCs, objectives
- **Auto-path** — Click a destination on the minimap to walk there automatically
- **Inventory management** — Sort, search, lock items, quick-sell
- **Settings** — Music/SFX volume, keybinds, UI scaling, chat filters
- **Mobile-responsive** — Touch controls for mobile browser play
- **Performance optimization** — Lazy loading, sprite sheets, render culling

### Week 23-24: Monetization & Soft Launch
- **Cosmetic shop** — Outfits, mount skins, name colors, emotes (NO pay-to-win)
- **Battle Pass** — Monthly pass with free/premium tracks, cosmetic rewards
- **Premium currency** — Diamonds for cosmetic-only purchases
- **Anti-cheat** — Server-side validation for all actions, damage verification
- **Analytics** — Track retention, DAU/MAU, session length, monetization metrics
- **Soft launch** — Limited player count, gather feedback, iterate

### Deliverables
- Full tutorial flow
- Monetization system (cosmetic-only)
- Mobile-responsive UI
- Anti-cheat and analytics
- Soft launch with 200 player capacity

---

## Technical Stack Evolution

| Component | Current | Month 6 Target |
|-----------|---------|----------------|
| Backend | FastAPI (single file) | FastAPI microservices (auth, game, chat, guild, pvp) |
| Database | NeonDB (PostgreSQL) | NeonDB + Redis (caching) + S3 (assets) |
| Real-time | WebSocket (basic) | WebSocket rooms + Redis pub/sub |
| Frontend | React + Canvas 2D | React + PixiJS (hardware-accelerated 2D) |
| Auth | JWT | JWT + OAuth2 (Google/Discord) |
| Hosting | Single server | Kubernetes with auto-scaling |
| CDN | None | CloudFront for static assets |
| Monitoring | Console logs | Grafana + Prometheus + Sentry |

---

## Key Metrics for Success

| Metric | Month 1 | Month 3 | Month 6 |
|--------|---------|---------|---------|
| Concurrent Players | 50 | 200 | 500+ |
| Maps | 12 | 20 | 30+ |
| Monsters | 20 | 60 | 100+ |
| Items/Equipment | 0 | 100 | 300+ |
| Abilities | 10 | 60 | 100+ |
| Average Session | 15 min | 30 min | 45+ min |
| Day-1 Retention | 20% | 35% | 50%+ |

---

## Risk Mitigation

1. **Scalability**: Start with Redis early (Month 1) to avoid costly rewrites later
2. **Content pacing**: Each month adds a major progression milestone to keep players engaged
3. **Monetization**: Cosmetic-only model avoids P2W backlash while still generating revenue
4. **Technical debt**: Month 1 refactoring sets the architecture for all future features
5. **Player retention**: Daily/weekly content loops established by Month 5 keep players coming back
