from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Depends, Request, Response
from starlette.middleware.cors import CORSMiddleware
import os
import logging
import json
import asyncio
import secrets
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager
import asyncpg

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

db_pool: Optional[asyncpg.Pool] = None

DATABASE_URL = os.environ.get('DATABASE_URL')
JWT_SECRET = os.environ.get('JWT_SECRET', 'default-secret-change-me')
JWT_ALGORITHM = "HS256"
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

# ==================== DATABASE SETUP ====================

async def init_db():
    global db_pool
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
    
    async with db_pool.acquire() as conn:
        # Users table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                username VARCHAR(100) NOT NULL,
                role VARCHAR(50) DEFAULT 'player',
                created_at TIMESTAMP DEFAULT NOW()
            )
        ''')
        
        # Players table with current_map
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS players (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                level INTEGER DEFAULT 1,
                xp INTEGER DEFAULT 0,
                xp_to_next INTEGER DEFAULT 100,
                hp INTEGER DEFAULT 100,
                max_hp INTEGER DEFAULT 100,
                mp INTEGER DEFAULT 50,
                max_mp INTEGER DEFAULT 50,
                strength INTEGER DEFAULT 10,
                agility INTEGER DEFAULT 10,
                intelligence INTEGER DEFAULT 10,
                vitality INTEGER DEFAULT 10,
                stat_points INTEGER DEFAULT 0,
                position_x FLOAT DEFAULT 100,
                position_y FLOAT DEFAULT 400,
                current_map VARCHAR(50) DEFAULT 'forest',
                gold INTEGER DEFAULT 100,
                sprite VARCHAR(100) DEFAULT 'player',
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(user_id)
            )
        ''')
        
        # Add current_map column if it doesn't exist
        try:
            await conn.execute('ALTER TABLE players ADD COLUMN IF NOT EXISTS current_map VARCHAR(50) DEFAULT \'forest\'')
            await conn.execute('ALTER TABLE players ADD COLUMN IF NOT EXISTS gold INTEGER DEFAULT 100')
        except:
            pass
        
        # Monsters table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS monsters (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                base_hp INTEGER DEFAULT 50,
                base_mp INTEGER DEFAULT 20,
                base_strength INTEGER DEFAULT 8,
                base_agility INTEGER DEFAULT 8,
                base_intelligence INTEGER DEFAULT 5,
                base_vitality INTEGER DEFAULT 8,
                sprite VARCHAR(100) NOT NULL,
                capture_rate FLOAT DEFAULT 0.3,
                xp_reward INTEGER DEFAULT 25,
                zone VARCHAR(50) DEFAULT 'forest',
                description TEXT
            )
        ''')
        
        # Add zone column
        try:
            await conn.execute('ALTER TABLE monsters ADD COLUMN IF NOT EXISTS zone VARCHAR(50) DEFAULT \'forest\'')
        except:
            pass
        
        # Captured allies
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS captured_allies (
                id SERIAL PRIMARY KEY,
                player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
                monster_id INTEGER REFERENCES monsters(id),
                name VARCHAR(100) NOT NULL,
                level INTEGER DEFAULT 1,
                xp INTEGER DEFAULT 0,
                xp_to_next INTEGER DEFAULT 100,
                hp INTEGER NOT NULL,
                max_hp INTEGER NOT NULL,
                mp INTEGER NOT NULL,
                max_mp INTEGER NOT NULL,
                strength INTEGER NOT NULL,
                agility INTEGER NOT NULL,
                intelligence INTEGER NOT NULL,
                vitality INTEGER NOT NULL,
                stat_points INTEGER DEFAULT 0,
                in_party BOOLEAN DEFAULT FALSE,
                party_slot INTEGER,
                captured_at TIMESTAMP DEFAULT NOW()
            )
        ''')
        
        # Abilities table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS abilities (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                description TEXT,
                mp_cost INTEGER DEFAULT 10,
                damage_multiplier FLOAT DEFAULT 1.5,
                ability_type VARCHAR(50) DEFAULT 'damage',
                element VARCHAR(50),
                required_level INTEGER DEFAULT 1,
                sprite VARCHAR(100)
            )
        ''')
        
        # Entity abilities
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS entity_abilities (
                id SERIAL PRIMARY KEY,
                player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
                ally_id INTEGER REFERENCES captured_allies(id) ON DELETE CASCADE,
                ability_id INTEGER REFERENCES abilities(id),
                unlocked_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(player_id, ability_id),
                UNIQUE(ally_id, ability_id)
            )
        ''')
        
        # Friends table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS friends (
                id SERIAL PRIMARY KEY,
                player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
                friend_player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(player_id, friend_player_id)
            )
        ''')
        
        # Chat messages table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS chat_messages (
                id SERIAL PRIMARY KEY,
                player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
                message TEXT NOT NULL,
                channel VARCHAR(50) DEFAULT 'global',
                created_at TIMESTAMP DEFAULT NOW()
            )
        ''')
        
        # Trade requests
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS trade_requests (
                id SERIAL PRIMARY KEY,
                from_player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
                to_player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
                status VARCHAR(20) DEFAULT 'pending',
                offer_gold INTEGER DEFAULT 0,
                offer_ally_id INTEGER REFERENCES captured_allies(id),
                request_gold INTEGER DEFAULT 0,
                request_ally_id INTEGER REFERENCES captured_allies(id),
                created_at TIMESTAMP DEFAULT NOW()
            )
        ''')
        
        # Duel requests
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS duel_requests (
                id SERIAL PRIMARY KEY,
                challenger_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
                opponent_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
                status VARCHAR(20) DEFAULT 'pending',
                winner_id INTEGER REFERENCES players(id),
                created_at TIMESTAMP DEFAULT NOW()
            )
        ''')

        # NEW: Guilds Table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS guilds (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                leader_id INTEGER REFERENCES players(id),
                bank_balance INTEGER DEFAULT 0,
                total_tax_collected INTEGER DEFAULT 0,
                claimed_zone VARCHAR(50),
                active_buff VARCHAR(50),
                buff_expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            )
        ''')

        # Add guild_id and skill_points to players if not exists
        try:
            await conn.execute('ALTER TABLE players ADD COLUMN IF NOT EXISTS guild_id INTEGER REFERENCES guilds(id)')
            await conn.execute('ALTER TABLE players ADD COLUMN IF NOT EXISTS skill_points INTEGER DEFAULT 0')
        except:
            pass
        
        # NPCs table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS npcs (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                npc_type VARCHAR(50) NOT NULL,
                zone VARCHAR(50) NOT NULL,
                position_x FLOAT NOT NULL,
                position_y FLOAT NOT NULL,
                dialogue TEXT,
                shop_items JSONB
            )
        ''')
        
        # Quests table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS quests (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                npc_id INTEGER REFERENCES npcs(id),
                required_monster_id INTEGER REFERENCES monsters(id),
                required_count INTEGER DEFAULT 1,
                reward_gold INTEGER DEFAULT 50,
                reward_xp INTEGER DEFAULT 100
            )
        ''')
        
        # Player quests
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS player_quests (
                id SERIAL PRIMARY KEY,
                player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
                quest_id INTEGER REFERENCES quests(id),
                progress INTEGER DEFAULT 0,
                completed BOOLEAN DEFAULT FALSE,
                accepted_at TIMESTAMP DEFAULT NOW()
            )
        ''')
        
        # Login attempts
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS login_attempts (
                id SERIAL PRIMARY KEY,
                identifier VARCHAR(255) NOT NULL,
                attempts INTEGER DEFAULT 1,
                last_attempt TIMESTAMP DEFAULT NOW()
            )
        ''')
        
        # Player bestiary (monster collection tracking)
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS player_bestiary (
                id SERIAL PRIMARY KEY,
                player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
                monster_id INTEGER REFERENCES monsters(id),
                encountered BOOLEAN DEFAULT TRUE,
                captured BOOLEAN DEFAULT FALSE,
                times_defeated INTEGER DEFAULT 0,
                first_seen TIMESTAMP DEFAULT NOW(),
                UNIQUE(player_id, monster_id)
            )
        ''')
        
        logger.info("Database tables created successfully")

async def seed_data():
    async with db_pool.acquire() as conn:
        # Seed monsters with zones - use upsert to handle existing data
        monsters = [
            ('Slime', 40, 10, 6, 5, 3, 8, 'slime', 0.5, 20, 'forest', 'A bouncy green slime.'),
            ('Mushroom', 50, 30, 7, 6, 12, 10, 'mushroom', 0.45, 30, 'forest', 'A magical forest mushroom.'),
            ('Wolf', 70, 10, 12, 15, 4, 9, 'wolf', 0.3, 40, 'forest', 'A fierce gray wolf.'),
            ('Bat', 35, 20, 5, 18, 8, 4, 'bat', 0.4, 25, 'cave', 'A swift cave bat.'),
            ('Skeleton', 55, 25, 11, 10, 10, 6, 'skeleton', 0.25, 45, 'cave', 'An undead skeleton warrior.'),
            ('Spider', 45, 15, 9, 16, 6, 5, 'spider', 0.35, 35, 'cave', 'A giant cave spider.'),
            ('Goblin', 60, 15, 10, 12, 5, 7, 'goblin', 0.35, 35, 'mountain', 'A mischievous goblin.'),
            ('Golem', 120, 5, 18, 3, 2, 20, 'golem', 0.15, 70, 'mountain', 'A powerful stone golem.'),
            ('Harpy', 50, 35, 8, 20, 12, 6, 'harpy', 0.25, 50, 'mountain', 'A winged harpy.'),
            ('Ghost', 45, 40, 6, 14, 15, 5, 'ghost', 0.2, 55, 'cave', 'A spooky ethereal ghost.'),
            ('Dragon', 200, 100, 25, 12, 20, 25, 'dragon', 0.05, 200, 'mountain', 'A fearsome dragon.'),
            ('Phoenix', 150, 80, 20, 22, 25, 15, 'phoenix', 0.08, 180, 'mountain', 'A majestic fire bird.'),
        ]
        for m in monsters:
            await conn.execute('''
                INSERT INTO monsters (name, base_hp, base_mp, base_strength, base_agility, base_intelligence, base_vitality, sprite, capture_rate, xp_reward, zone, description)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (name) DO UPDATE SET zone = $11
            ''', *m)
        logger.info(f"Seeded/updated {len(monsters)} monsters")
        
        # Seed abilities
        count = await conn.fetchval('SELECT COUNT(*) FROM abilities')
        if count == 0:
            abilities = [
                ('Fire Strike', 'A blazing attack dealing fire damage', 15, 1.8, 'damage', 'fire', 1, 'fire'),
                ('Ice Shard', 'Launches sharp ice projectiles', 12, 1.5, 'damage', 'ice', 1, 'ice'),
                ('Thunder Bolt', 'Calls down lightning on enemies', 20, 2.0, 'damage', 'lightning', 3, 'lightning'),
                ('Heal', 'Restores HP to an ally', 10, 0.0, 'heal', None, 1, 'heal'),
                ('Power Up', 'Increases strength temporarily', 8, 0.0, 'buff', None, 2, 'buff'),
                ('Quick Step', 'Increases agility temporarily', 8, 0.0, 'buff', None, 2, 'buff'),
                ('Poison Bite', 'Poisons the enemy over time', 10, 1.2, 'dot', 'poison', 2, 'poison'),
                ('Guard', 'Reduces incoming damage', 5, 0.0, 'buff', None, 1, 'guard'),
                ('Mega Slash', 'A powerful physical attack', 25, 2.5, 'damage', None, 5, 'slash'),
                ('Cure All', 'Heals all party members', 30, 0.0, 'heal_all', None, 7, 'heal')
            ]
            await conn.executemany('''
                INSERT INTO abilities (name, description, mp_cost, damage_multiplier, ability_type, element, required_level, sprite)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ''', abilities)
            logger.info("Seeded 10 abilities")
        
        # Seed NPCs
        count = await conn.fetchval('SELECT COUNT(*) FROM npcs')
        if count == 0:
            npcs = [
                ('Elder Oak', 'quest_giver', 'village', 250, 460, 'Welcome, adventurer! I have tasks for brave souls.', None),
                ('Merchant Mari', 'shop', 'village', 550, 460, 'Looking to buy or sell? I have the finest wares!', 
                 json.dumps([
                     {"name": "Health Potion", "price": 50, "effect": "heal", "value": 50},
                     {"name": "Mana Potion", "price": 40, "effect": "mp", "value": 30},
                     {"name": "Capture Orb", "price": 100, "effect": "capture_boost", "value": 0.1}
                 ])),
                ('Blacksmith Bron', 'shop', 'village', 800, 460, 'Need equipment? I forge the best!',
                 json.dumps([
                     {"name": "Iron Sword", "price": 200, "effect": "strength", "value": 5},
                     {"name": "Steel Armor", "price": 300, "effect": "vitality", "value": 5}
                 ])),
                ('Healer Luna', 'healer', 'village', 400, 460, 'Rest here and restore your strength.', None),
            ]
            await conn.executemany('''
                INSERT INTO npcs (name, npc_type, zone, position_x, position_y, dialogue, shop_items)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            ''', npcs)
            logger.info("Seeded 4 NPCs")
        
        # Seed quests
        count = await conn.fetchval('SELECT COUNT(*) FROM quests')
        if count == 0:
            elder_id = await conn.fetchval("SELECT id FROM npcs WHERE name = 'Elder Oak'")
            slime_id = await conn.fetchval("SELECT id FROM monsters WHERE name = 'Slime'")
            wolf_id = await conn.fetchval("SELECT id FROM monsters WHERE name = 'Wolf'")
            skeleton_id = await conn.fetchval("SELECT id FROM monsters WHERE name = 'Skeleton'")
            
            if elder_id and slime_id:
                quests = [
                    ('Slime Cleanup', 'Defeat 3 slimes in the forest.', elder_id, slime_id, 3, 100, 150),
                    ('Wolf Hunt', 'Hunt down 2 wolves.', elder_id, wolf_id, 2, 150, 200),
                    ('Skeleton Purge', 'Clear 5 skeletons from the cave.', elder_id, skeleton_id, 5, 250, 350),
                ]
                await conn.executemany('''
                    INSERT INTO quests (name, description, npc_id, required_monster_id, required_count, reward_gold, reward_xp)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                ''', quests)
                logger.info("Seeded 3 quests")
        
        # Seed admin
        admin_email = os.environ.get('ADMIN_EMAIL', 'admin@game.com')
        admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')
        existing = await conn.fetchrow('SELECT id FROM users WHERE email = $1', admin_email)
        if not existing:
            hashed = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            await conn.execute('''
                INSERT INTO users (email, password_hash, username, role) VALUES ($1, $2, $3, $4)
            ''', admin_email, hashed, 'Admin', 'admin')
            logger.info(f"Seeded admin user")

async def close_db():
    global db_pool
    if db_pool:
        await db_pool.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await seed_data()
    os.makedirs('/app/memory', exist_ok=True)
    with open('/app/memory/test_credentials.md', 'w') as f:
        f.write(f"# Test Credentials\n\n")
        f.write(f"## Admin: admin@game.com / admin123\n")
        f.write(f"## Test: test@game.com / test123\n")
    yield
    await close_db()

app = FastAPI(lifespan=lifespan)
api_router = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        FRONTEND_URL, 
        "https://frontend-production-86c4.up.railway.app",
        "http://localhost:3000"
    ],
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.up\.railway\.app",
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== PYDANTIC MODELS ====================

class UserRegister(BaseModel):
    email: str
    password: str
    username: str

class UserLogin(BaseModel):
    email: str
    password: str

class PlayerCreate(BaseModel):
    name: str

class StatAllocation(BaseModel):
    strength: int = 0
    agility: int = 0
    intelligence: int = 0
    vitality: int = 0

class CaptureRequest(BaseModel):
    monster_id: int
    name: str

class PositionUpdate(BaseModel):
    x: float
    y: float
    current_map: Optional[str] = None

class ChatMessage(BaseModel):
    message: str
    channel: str = 'global'

class FriendRequest(BaseModel):
    target_player_id: int

class TradeOffer(BaseModel):
    to_player_id: int
    offer_gold: int = 0
    offer_ally_id: Optional[int] = None

class DuelRequest(BaseModel):
    opponent_id: int

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(user_id: int, email: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        async with db_pool.acquire() as conn:
            user = await conn.fetchrow('SELECT id, email, username, role FROM users WHERE id = $1', int(payload["sub"]))
            if not user:
                raise HTTPException(status_code=401, detail="User not found")
            return dict(user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register")
async def register(data: UserRegister, response: Response):
    email = data.email.lower().strip()
    async with db_pool.acquire() as conn:
        existing = await conn.fetchrow('SELECT id FROM users WHERE email = $1', email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        hashed = hash_password(data.password)
        user = await conn.fetchrow('''
            INSERT INTO users (email, password_hash, username) VALUES ($1, $2, $3)
            RETURNING id, email, username, role
        ''', email, hashed, data.username)
        
        user_dict = dict(user)
        access_token = create_access_token(user_dict['id'], user_dict['email'])
        refresh_token = create_refresh_token(user_dict['id'])
        
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
        response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
        
        return {"user": user_dict, "token": access_token}

@api_router.post("/auth/login")
async def login(data: UserLogin, response: Response, request: Request):
    email = data.email.lower().strip()
    client_ip = request.client.host if request.client else "unknown"
    identifier = f"{client_ip}:{email}"
    
    async with db_pool.acquire() as conn:
        attempt = await conn.fetchrow('SELECT attempts, last_attempt FROM login_attempts WHERE identifier = $1', identifier)
        if attempt and attempt['attempts'] >= 5:
            if datetime.now(timezone.utc) - attempt['last_attempt'].replace(tzinfo=timezone.utc) < timedelta(minutes=15):
                raise HTTPException(status_code=429, detail="Too many attempts. Try again in 15 minutes.")
        
        user = await conn.fetchrow('SELECT id, email, username, role, password_hash FROM users WHERE email = $1', email)
        if not user or not verify_password(data.password, user['password_hash']):
            if attempt:
                await conn.execute('UPDATE login_attempts SET attempts = attempts + 1, last_attempt = NOW() WHERE identifier = $1', identifier)
            else:
                await conn.execute('INSERT INTO login_attempts (identifier) VALUES ($1)', identifier)
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        await conn.execute('DELETE FROM login_attempts WHERE identifier = $1', identifier)
        
        user_dict = {"id": user['id'], "email": user['email'], "username": user['username'], "role": user['role']}
        access_token = create_access_token(user_dict['id'], user_dict['email'])
        refresh_token = create_refresh_token(user_dict['id'])
        
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
        response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
        
        return {"user": user_dict, "token": access_token}

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return {"user": user}

# ==================== PLAYER ENDPOINTS ====================

@api_router.post("/player")
async def create_player(data: PlayerCreate, request: Request):
    user = await get_current_user(request)
    async with db_pool.acquire() as conn:
        existing = await conn.fetchrow('SELECT id FROM players WHERE user_id = $1', user['id'])
        if existing:
            raise HTTPException(status_code=400, detail="Player already exists")
        
        player = await conn.fetchrow('''
            INSERT INTO players (user_id, name, current_map, position_x, position_y) VALUES ($1, $2, 'forest', 100, 400)
            RETURNING id, user_id, name, level, xp, xp_to_next, hp, max_hp, mp, max_mp, 
                      strength, agility, intelligence, vitality, stat_points, position_x, position_y, current_map, gold, sprite
        ''', user['id'], data.name)
        
        await conn.execute('''
            INSERT INTO entity_abilities (player_id, ability_id)
            SELECT $1, id FROM abilities WHERE required_level <= 1
        ''', player['id'])
        
        return dict(player)

@api_router.get("/player")
async def get_player(request: Request):
    user = await get_current_user(request)
    async with db_pool.acquire() as conn:
        player = await conn.fetchrow('''
            SELECT id, user_id, name, level, xp, xp_to_next, hp, max_hp, mp, max_mp,
                   strength, agility, intelligence, vitality, stat_points, position_x, position_y, 
                   COALESCE(current_map, 'forest') as current_map, COALESCE(gold, 100) as gold, sprite
            FROM players WHERE user_id = $1
        ''', user['id'])
        if not player:
            raise HTTPException(status_code=404, detail="Player not found")
        return dict(player)

@api_router.put("/player/position")
async def update_position(data: PositionUpdate, request: Request):
    user = await get_current_user(request)
    async with db_pool.acquire() as conn:
        if data.current_map:
            await conn.execute('''
                UPDATE players SET position_x = $1, position_y = $2, current_map = $3 WHERE user_id = $4
            ''', data.x, data.y, data.current_map, user['id'])
        else:
            await conn.execute('''
                UPDATE players SET position_x = $1, position_y = $2 WHERE user_id = $3
            ''', data.x, data.y, user['id'])
        return {"success": True}

@api_router.put("/player/stats")
async def allocate_stats(data: StatAllocation, request: Request):
    user = await get_current_user(request)
    total = data.strength + data.agility + data.intelligence + data.vitality
    
    async with db_pool.acquire() as conn:
        player = await conn.fetchrow('SELECT stat_points, max_hp, max_mp, vitality FROM players WHERE user_id = $1', user['id'])
        if not player or player['stat_points'] < total:
            raise HTTPException(status_code=400, detail="Not enough stat points")
        
        hp_bonus = data.vitality * 10
        mp_bonus = data.intelligence * 5
        
        await conn.execute('''
            UPDATE players SET
                strength = strength + $1,
                agility = agility + $2,
                intelligence = intelligence + $3,
                vitality = vitality + $4,
                max_hp = max_hp + $5,
                max_mp = max_mp + $6,
                stat_points = stat_points - $7
            WHERE user_id = $8
        ''', data.strength, data.agility, data.intelligence, data.vitality, hp_bonus, mp_bonus, total, user['id'])
        
        return {"success": True}

@api_router.post("/player/heal")
async def heal_player(request: Request):
    user = await get_current_user(request)
    async with db_pool.acquire() as conn:
        await conn.execute('UPDATE players SET hp = max_hp, mp = max_mp WHERE user_id = $1', user['id'])
        player = await conn.fetchrow('SELECT id FROM players WHERE user_id = $1', user['id'])
        if player:
            await conn.execute('UPDATE captured_allies SET hp = max_hp, mp = max_mp WHERE player_id = $1', player['id'])
        return {"success": True}

# ==================== MONSTER ENDPOINTS ====================

@api_router.get("/monsters")
async def get_monsters():
    async with db_pool.acquire() as conn:
        monsters = await conn.fetch('SELECT * FROM monsters')
        return [dict(m) for m in monsters]

@api_router.get("/monsters/random")
async def get_random_encounter(zone: str = 'forest'):
    import random
    async with db_pool.acquire() as conn:
        monsters = await conn.fetch('SELECT * FROM monsters WHERE zone = $1 ORDER BY RANDOM() LIMIT $2', zone, random.randint(1, 3))
        if not monsters:
            monsters = await conn.fetch('SELECT * FROM monsters ORDER BY RANDOM() LIMIT $1', random.randint(1, 3))
        
        # Difficulty scaling based on zone
        difficulty_map = {
            "forest": 0.4,    # 40% power (Easy starter)
            "cave": 0.8,      # 80% power
            "mountain": 1.0,  # 100% power
            "wasteland": 1.5, # 150% power
            "tundra": 2.0     # 200% power (Hard)
        }
        scale = difficulty_map.get(zone, 1.0)
        
        encounter = []
        for i, m in enumerate(monsters):
            monster = dict(m)
            monster['encounter_id'] = f"enemy_{i}_{monster['id']}"
            
            # Apply map-based scaling to stats
            scaled_hp = int(monster['base_hp'] * scale)
            monster['base_hp'] = scaled_hp
            monster['current_hp'] = scaled_hp
            monster['base_strength'] = int(monster['base_strength'] * scale)
            monster['base_vitality'] = int(monster['base_vitality'] * scale)
            monster['xp_reward'] = int(monster['xp_reward'] * scale)
            monster['current_mp'] = monster['base_mp']
            
            encounter.append(monster)
        return encounter

async def record_bestiary_encounter(player_id: int, monster_ids: list):
    """Track that a player has encountered specific monsters."""
    async with db_pool.acquire() as conn:
        for mid in monster_ids:
            await conn.execute('''
                INSERT INTO player_bestiary (player_id, monster_id, encountered)
                VALUES ($1, $2, TRUE)
                ON CONFLICT (player_id, monster_id) DO NOTHING
            ''', player_id, mid)

# ==================== ALLY/CAPTURE ENDPOINTS ====================

@api_router.get("/allies")
async def get_allies(request: Request):
    user = await get_current_user(request)
    async with db_pool.acquire() as conn:
        player = await conn.fetchrow('SELECT id FROM players WHERE user_id = $1', user['id'])
        if not player:
            return []
        allies = await conn.fetch('''
            SELECT ca.*, m.sprite FROM captured_allies ca 
            JOIN monsters m ON ca.monster_id = m.id 
            WHERE ca.player_id = $1 ORDER BY ca.captured_at
        ''', player['id'])
        return [dict(a) for a in allies]

@api_router.post("/allies/capture")
async def capture_monster(data: CaptureRequest, request: Request):
    import random
    user = await get_current_user(request)
    
    async with db_pool.acquire() as conn:
        player = await conn.fetchrow('SELECT id FROM players WHERE user_id = $1', user['id'])
        if not player:
            raise HTTPException(status_code=404, detail="Player not found")
        
        monster = await conn.fetchrow('SELECT * FROM monsters WHERE id = $1', data.monster_id)
        if not monster:
            raise HTTPException(status_code=404, detail="Monster not found")
        
        if random.random() > monster['capture_rate']:
            return {"success": False, "message": f"{monster['name']} escaped!"}
        
        ally = await conn.fetchrow('''
            INSERT INTO captured_allies (player_id, monster_id, name, hp, max_hp, mp, max_mp, strength, agility, intelligence, vitality)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, player_id, monster_id, name, level, xp, xp_to_next, hp, max_hp, mp, max_mp, strength, agility, intelligence, vitality, stat_points, in_party, party_slot
        ''', player['id'], monster['id'], data.name, monster['base_hp'], monster['base_hp'], 
            monster['base_mp'], monster['base_mp'], monster['base_strength'], monster['base_agility'],
            monster['base_intelligence'], monster['base_vitality'])
        
        ally_dict = dict(ally)
        ally_dict['sprite'] = monster['sprite']
        
        # Update bestiary - mark as captured
        await conn.execute('''
            INSERT INTO player_bestiary (player_id, monster_id, encountered, captured)
            VALUES ($1, $2, TRUE, TRUE)
            ON CONFLICT (player_id, monster_id) DO UPDATE SET captured = TRUE
        ''', player['id'], monster['id'])
        
        return {"success": True, "ally": ally_dict, "message": f"Captured {data.name}!"}

@api_router.put("/allies/{ally_id}/party")
async def toggle_party(ally_id: int, request: Request):
    user = await get_current_user(request)
    async with db_pool.acquire() as conn:
        player = await conn.fetchrow('SELECT id FROM players WHERE user_id = $1', user['id'])
        ally = await conn.fetchrow('SELECT * FROM captured_allies WHERE id = $1 AND player_id = $2', ally_id, player['id'])
        if not ally:
            raise HTTPException(status_code=404, detail="Ally not found")
        
        party_count = await conn.fetchval('SELECT COUNT(*) FROM captured_allies WHERE player_id = $1 AND in_party = TRUE', player['id'])
        
        if ally['in_party']:
            await conn.execute('UPDATE captured_allies SET in_party = FALSE, party_slot = NULL WHERE id = $1', ally_id)
            return {"success": True, "in_party": False}
        else:
            if party_count >= 3:
                raise HTTPException(status_code=400, detail="Party is full (max 3 allies)")
            next_slot = await conn.fetchval('''
                SELECT COALESCE(MAX(party_slot), 0) + 1 FROM captured_allies WHERE player_id = $1 AND in_party = TRUE
            ''', player['id'])
            await conn.execute('UPDATE captured_allies SET in_party = TRUE, party_slot = $1 WHERE id = $2', next_slot, ally_id)
            return {"success": True, "in_party": True}

@api_router.get("/party")
async def get_party(request: Request):
    user = await get_current_user(request)
    async with db_pool.acquire() as conn:
        player = await conn.fetchrow('''
            SELECT id, name, level, hp, max_hp, mp, max_mp, strength, agility, intelligence, vitality, sprite
            FROM players WHERE user_id = $1
        ''', user['id'])
        if not player:
            raise HTTPException(status_code=404, detail="Player not found")
        
        allies = await conn.fetch('''
            SELECT ca.id, ca.name, ca.level, ca.hp, ca.max_hp, ca.mp, ca.max_mp, 
                   ca.strength, ca.agility, ca.intelligence, ca.vitality, m.sprite, ca.party_slot
            FROM captured_allies ca
            JOIN monsters m ON ca.monster_id = m.id
            WHERE ca.player_id = $1 AND ca.in_party = TRUE
            ORDER BY ca.party_slot
        ''', player['id'])
        
        party = [{"type": "player", **dict(player)}]
        for ally in allies:
            party.append({"type": "ally", **dict(ally)})
        
        return party

# ==================== ABILITY ENDPOINTS ====================

@api_router.get("/abilities")
async def get_all_abilities():
    async with db_pool.acquire() as conn:
        abilities = await conn.fetch('SELECT * FROM abilities ORDER BY required_level')
        return [dict(a) for a in abilities]

@api_router.get("/player/abilities")
async def get_player_abilities(request: Request):
    user = await get_current_user(request)
    async with db_pool.acquire() as conn:
        player = await conn.fetchrow('SELECT id, level FROM players WHERE user_id = $1', user['id'])
        if not player:
            return {"unlocked": [], "available": []}
        
        abilities = await conn.fetch('''
            SELECT a.* FROM abilities a
            JOIN entity_abilities ea ON a.id = ea.ability_id
            WHERE ea.player_id = $1
        ''', player['id'])
        
        available = await conn.fetch('''
            SELECT * FROM abilities 
            WHERE required_level <= $1 
            AND id NOT IN (SELECT ability_id FROM entity_abilities WHERE player_id = $2)
        ''', player['level'], player['id'])
        
        # Get all locked abilities (above player level)
        locked = await conn.fetch('''
            SELECT * FROM abilities 
            WHERE required_level > $1
            AND id NOT IN (SELECT ability_id FROM entity_abilities WHERE player_id = $2)
            ORDER BY required_level
        ''', player['level'], player['id'])
        
        return {
            "unlocked": [dict(a) for a in abilities],
            "available": [dict(a) for a in available],
            "locked": [dict(a) for a in locked]
        }

@api_router.post("/player/abilities/{ability_id}/unlock")
async def unlock_ability(ability_id: int, request: Request):
    user = await get_current_user(request)
    async with db_pool.acquire() as conn:
        player = await conn.fetchrow('SELECT id, level FROM players WHERE user_id = $1', user['id'])
        ability = await conn.fetchrow('SELECT * FROM abilities WHERE id = $1', ability_id)
        
        if not ability:
            raise HTTPException(status_code=404, detail="Ability not found")
        if player['level'] < ability['required_level']:
            raise HTTPException(status_code=400, detail=f"Requires level {ability['required_level']}")
        
        existing = await conn.fetchrow('SELECT id FROM entity_abilities WHERE player_id = $1 AND ability_id = $2', player['id'], ability_id)
        if existing:
            raise HTTPException(status_code=400, detail="Already unlocked")
        
        await conn.execute('INSERT INTO entity_abilities (player_id, ability_id) VALUES ($1, $2)', player['id'], ability_id)
        return {"success": True, "ability": dict(ability)}

# ==================== COMBAT ENDPOINTS ====================

@api_router.post("/combat/victory")
async def combat_victory(request: Request):
    body = await request.json()
    xp_gained = body.get('xp', 0)
    defeated_monsters = body.get('defeated_monsters', [])
    current_map = body.get('current_map', 'forest')
    
    user = await get_current_user(request)
    async with db_pool.acquire() as conn:
        player = await conn.fetchrow('SELECT * FROM players WHERE user_id = $1', user['id'])
        if not player:
            raise HTTPException(status_code=404, detail="Player not found")
        
        # 1. Level up and SKILL POINTS
        new_xp = player['xp'] + xp_gained
        level_ups = 0
        stat_points_gained = 0
        skill_points_gained = 0
        new_level = player['level']
        xp_to_next = player['xp_to_next']
        
        while new_xp >= xp_to_next:
            new_xp -= xp_to_next
            new_level += 1
            level_ups += 1
            stat_points_gained += 5
            skill_points_gained += 1 # NEW: 1 Skill Point per level
            xp_to_next = int(xp_to_next * 1.5)
        
        # 2. GUILD TAX LOGIC
        base_gold_per_kill = 20
        total_gold = len(defeated_monsters) * base_gold_per_kill
        tax_paid = 0
        
        # Check if map is claimed
        zone_owner = await conn.fetchrow('SELECT id, name FROM guilds WHERE claimed_zone = $1', current_map)
        if zone_owner and player['guild_id'] != zone_owner['id']:
            tax_paid = int(total_gold * 0.05) # 5% Intercepted
            await conn.execute('''
                UPDATE guilds SET bank_balance = bank_balance + $1, 
                total_tax_collected = total_tax_collected + $1 WHERE id = $2
            ''', tax_paid, zone_owner['id'])

        gold_earned = total_gold - tax_paid
        hp_bonus = level_ups * 10
        mp_bonus = level_ups * 5

        await conn.execute('''
            UPDATE players SET 
                xp = $1, level = $2, xp_to_next = $3, 
                stat_points = stat_points + $4,
                skill_points = skill_points + $5,
                gold = gold + $6,
                max_hp = max_hp + $7, hp = LEAST(hp + $7, max_hp + $7),
                max_mp = max_mp + $8, mp = LEAST(mp + $8, max_mp + $8)
            WHERE id = $9
        ''', new_xp, new_level, xp_to_next, stat_points_gained, skill_points_gained, gold_earned, hp_bonus, mp_bonus, player['id'])
        
        # Update quest progress and bestiary for defeated monsters
        for monster_id in defeated_monsters:
            await conn.execute('''
                UPDATE player_quests pq SET progress = progress + 1
                FROM quests q
                WHERE pq.quest_id = q.id AND pq.player_id = $1 AND q.required_monster_id = $2 AND pq.completed = FALSE
            ''', player['id'], monster_id)
            
            # Update bestiary - increment times_defeated
            await conn.execute('''
                INSERT INTO player_bestiary (player_id, monster_id, encountered, times_defeated)
                VALUES ($1, $2, TRUE, 1)
                ON CONFLICT (player_id, monster_id) DO UPDATE SET times_defeated = player_bestiary.times_defeated + 1
            ''', player['id'], monster_id)
        
        # Give XP to party allies
        allies = await conn.fetch('SELECT * FROM captured_allies WHERE player_id = $1 AND in_party = TRUE', player['id'])
        ally_level_ups = []
        for ally in allies:
            ally_xp = ally['xp'] + xp_gained
            ally_level = ally['level']
            ally_xp_to_next = ally['xp_to_next']
            ally_stat_points = 0
            
            while ally_xp >= ally_xp_to_next:
                ally_xp -= ally_xp_to_next
                ally_level += 1
                ally_stat_points += 3
                ally_xp_to_next = int(ally_xp_to_next * 1.5)
                ally_level_ups.append({"id": ally['id'], "name": ally['name'], "new_level": ally_level})
            
            await conn.execute('''
                UPDATE captured_allies SET xp = $1, level = $2, xp_to_next = $3, stat_points = stat_points + $4
                WHERE id = $5
            ''', ally_xp, ally_level, ally_xp_to_next, ally_stat_points, ally['id'])
        
        if level_ups > 0:
            await conn.execute('''
                INSERT INTO entity_abilities (player_id, ability_id)
                SELECT $1, id FROM abilities 
                WHERE required_level <= $2 
                AND id NOT IN (SELECT ability_id FROM entity_abilities WHERE player_id = $1)
            ''', player['id'], new_level)
        
        return {
            "xp_gained": xp_gained,
            "new_xp": new_xp,
            "new_level": new_level,
            "level_ups": level_ups,
            "stat_points_gained": stat_points_gained,
            "ally_level_ups": ally_level_ups
        }

@api_router.post("/combat/save-state")
async def save_combat_state(request: Request):
    body = await request.json()
    party_state = body.get('party', [])
    
    user = await get_current_user(request)
    async with db_pool.acquire() as conn:
        player = await conn.fetchrow('SELECT id FROM players WHERE user_id = $1', user['id'])
        
        for member in party_state:
            if member.get('type') == 'player':
                await conn.execute('UPDATE players SET hp = $1, mp = $2 WHERE id = $3', 
                    max(0, member['hp']), max(0, member['mp']), player['id'])
            elif member.get('type') == 'ally':
                await conn.execute('UPDATE captured_allies SET hp = $1, mp = $2 WHERE id = $3',
                    max(0, member['hp']), max(0, member['mp']), member['id'])
        
        return {"success": True}

# ==================== FRIEND ENDPOINTS ====================

@api_router.get("/friends")
async def get_friends(request: Request):
    user = await get_current_user(request)
    async with db_pool.acquire() as conn:
        player = await conn.fetchrow('SELECT id FROM players WHERE user_id = $1', user['id'])
        if not player:
            return {"friends": [], "pending": [], "requests": []}
        
        friends = await conn.fetch('''
            SELECT p.id, p.name, p.level, f.status FROM friends f
            JOIN players p ON f.friend_player_id = p.id
            WHERE f.player_id = $1 AND f.status = 'accepted'
        ''', player['id'])
        
        pending = await conn.fetch('''
            SELECT p.id, p.name, p.level FROM friends f
            JOIN players p ON f.friend_player_id = p.id
            WHERE f.player_id = $1 AND f.status = 'pending'
        ''', player['id'])
        
        requests = await conn.fetch('''
            SELECT p.id, p.name, p.level, f.id as request_id FROM friends f
            JOIN players p ON f.player_id = p.id
            WHERE f.friend_player_id = $1 AND f.status = 'pending'
        ''', player['id'])
        
        return {
            "friends": [dict(f) for f in friends],
            "pending": [dict(p) for p in pending],
            "requests": [dict(r) for r in requests]
        }

@api_router.post("/friends/request")
async def send_friend_request(data: FriendRequest, request: Request):
    user = await get_current_user(request)
    async with db_pool.acquire() as conn:
        player = await conn.fetchrow('SELECT id FROM players WHERE user_id = $1', user['id'])
        target = await conn.fetchrow('SELECT id, name FROM players WHERE id = $1', data.target_player_id)
        
        if not target:
            raise HTTPException(status_code=404, detail="Player not found")
        if player['id'] == target['id']:
            raise HTTPException(status_code=400, detail="Cannot friend yourself")
        
        existing = await conn.fetchrow('''
            SELECT id FROM friends WHERE player_id = $1 AND friend_player_id = $2
        ''', player['id'], target['id'])
        
        if existing:
            raise HTTPException(status_code=400, detail="Request already exists")
        
        await conn.execute('''
            INSERT INTO friends (player_id, friend_player_id, status) VALUES ($1, $2, 'pending')
        ''', player['id'], target['id'])
        
        return {"success": True, "message": f"Friend request sent to {target['name']}!"}

@api_router.post("/friends/accept/{request_id}")
async def accept_friend(request_id: int, request: Request):
    user = await get_current_user(request)
    async with db_pool.acquire() as conn:
        player = await conn.fetchrow('SELECT id FROM players WHERE user_id = $1', user['id'])
        
        friend_req = await conn.fetchrow('''
            SELECT * FROM friends WHERE id = $1 AND friend_player_id = $2 AND status = 'pending'
        ''', request_id, player['id'])
        
        if not friend_req:
            raise HTTPException(status_code=404, detail="Request not found")
        
        await conn.execute("UPDATE friends SET status = 'accepted' WHERE id = $1", request_id)
        
        # Create reverse friendship
        await conn.execute('''
            INSERT INTO friends (player_id, friend_player_id, status) VALUES ($1, $2, 'accepted')
            ON CONFLICT DO NOTHING
        ''', player['id'], friend_req['player_id'])
        
        return {"success": True}

# ==================== CHAT ENDPOINTS ====================

@api_router.get("/chat/messages")
async def get_chat_messages(channel: str = 'global', limit: int = 50):
    async with db_pool.acquire() as conn:
        messages = await conn.fetch('''
            SELECT cm.id, cm.message, cm.channel, cm.created_at, p.name as sender_name
            FROM chat_messages cm
            JOIN players p ON cm.player_id = p.id
            WHERE cm.channel = $1
            ORDER BY cm.created_at DESC
            LIMIT $2
        ''', channel, limit)
        return [dict(m) for m in reversed(messages)]

@api_router.post("/chat/send")
async def send_chat_message(data: ChatMessage, request: Request):
    user = await get_current_user(request)
    async with db_pool.acquire() as conn:
        player = await conn.fetchrow('SELECT id, name FROM players WHERE user_id = $1', user['id'])
        if not player:
            raise HTTPException(status_code=404, detail="Player not found")
        
        msg = await conn.fetchrow('''
            INSERT INTO chat_messages (player_id, message, channel) VALUES ($1, $2, $3)
            RETURNING id, message, channel, created_at
        ''', player['id'], data.message, data.channel)
        
        return {"success": True, "message": {**dict(msg), "sender_name": player['name']}}

# ==================== NPC ENDPOINTS ====================

@api_router.get("/npcs")
async def get_npcs(zone: str = None):
    async with db_pool.acquire() as conn:
        if zone:
            npcs = await conn.fetch('SELECT * FROM npcs WHERE zone = $1', zone)
        else:
            npcs = await conn.fetch('SELECT * FROM npcs')
        
        result = []
        for npc in npcs:
            npc_dict = dict(npc)
            if npc_dict.get('shop_items') and isinstance(npc_dict['shop_items'], str):
                npc_dict['shop_items'] = json.loads(npc_dict['shop_items'])
            result.append(npc_dict)
        return result

@api_router.post("/npcs/{npc_id}/interact")
async def interact_npc(npc_id: int, request: Request):
    user = await get_current_user(request)
    async with db_pool.acquire() as conn:
        player = await conn.fetchrow('SELECT id, gold FROM players WHERE user_id = $1', user['id'])
        npc = await conn.fetchrow('SELECT * FROM npcs WHERE id = $1', npc_id)
        
        if not npc:
            raise HTTPException(status_code=404, detail="NPC not found")
        
        npc_dict = dict(npc)
        if npc_dict.get('shop_items') and isinstance(npc_dict['shop_items'], str):
            npc_dict['shop_items'] = json.loads(npc_dict['shop_items'])
        
        if npc['npc_type'] == 'healer':
            await conn.execute('UPDATE players SET hp = max_hp, mp = max_mp WHERE id = $1', player['id'])
            await conn.execute('UPDATE captured_allies SET hp = max_hp, mp = max_mp WHERE player_id = $1', player['id'])
            return {"success": True, "type": "healer", "message": "Your party has been fully healed!", "npc": npc_dict}
        
        return {"success": True, "type": npc['npc_type'], "npc": npc_dict}

@api_router.post("/npcs/{npc_id}/buy")
async def buy_from_npc(npc_id: int, request: Request):
    body = await request.json()
    item_index = body.get('item_index', 0)
    
    user = await get_current_user(request)
    async with db_pool.acquire() as conn:
        player = await conn.fetchrow('SELECT id, gold, strength, vitality FROM players WHERE user_id = $1', user['id'])
        npc = await conn.fetchrow('SELECT * FROM npcs WHERE id = $1', npc_id)
        
        if not npc or npc['npc_type'] != 'shop':
            raise HTTPException(status_code=404, detail="Shop not found")
        
        shop_items = json.loads(npc['shop_items']) if isinstance(npc['shop_items'], str) else npc['shop_items']
        
        if item_index >= len(shop_items):
            raise HTTPException(status_code=400, detail="Invalid item")
        
        item = shop_items[item_index]
        if player['gold'] < item['price']:
            raise HTTPException(status_code=400, detail="Not enough gold")
        
        await conn.execute('UPDATE players SET gold = gold - $1 WHERE id = $2', item['price'], player['id'])
        
        if item['effect'] == 'heal':
            await conn.execute('UPDATE players SET hp = LEAST(hp + $1, max_hp) WHERE id = $2', item['value'], player['id'])
        elif item['effect'] == 'mp':
            await conn.execute('UPDATE players SET mp = LEAST(mp + $1, max_mp) WHERE id = $2', item['value'], player['id'])
        elif item['effect'] == 'strength':
            await conn.execute('UPDATE players SET strength = strength + $1 WHERE id = $2', item['value'], player['id'])
        elif item['effect'] == 'vitality':
            await conn.execute('UPDATE players SET vitality = vitality + $1, max_hp = max_hp + $2 WHERE id = $3', item['value'], item['value'] * 10, player['id'])
        
        return {"success": True, "message": f"Purchased {item['name']}!"}

# ==================== QUEST ENDPOINTS ====================

@api_router.get("/quests")
async def get_quests(request: Request):
    user = await get_current_user(request)
    async with db_pool.acquire() as conn:
        player = await conn.fetchrow('SELECT id FROM players WHERE user_id = $1', user['id'])
        
        available = await conn.fetch('''
            SELECT q.*, n.name as npc_name, m.name as monster_name FROM quests q
            JOIN npcs n ON q.npc_id = n.id
            JOIN monsters m ON q.required_monster_id = m.id
            WHERE q.id NOT IN (SELECT quest_id FROM player_quests WHERE player_id = $1)
        ''', player['id'])
        
        active = await conn.fetch('''
            SELECT q.*, pq.progress, pq.completed, n.name as npc_name, m.name as monster_name FROM player_quests pq
            JOIN quests q ON pq.quest_id = q.id
            JOIN npcs n ON q.npc_id = n.id
            JOIN monsters m ON q.required_monster_id = m.id
            WHERE pq.player_id = $1 AND pq.completed = FALSE
        ''', player['id'])
        
        completed = await conn.fetch('''
            SELECT q.*, n.name as npc_name, m.name as monster_name FROM player_quests pq
            JOIN quests q ON pq.quest_id = q.id
            JOIN npcs n ON q.npc_id = n.id
            JOIN monsters m ON q.required_monster_id = m.id
            WHERE pq.player_id = $1 AND pq.completed = TRUE
        ''', player['id'])
        
        return {
            "available": [dict(q) for q in available],
            "active": [dict(q) for q in active],
            "completed": [dict(q) for q in completed]
        }

@api_router.post("/quests/{quest_id}/accept")
async def accept_quest(quest_id: int, request: Request):
    user = await get_current_user(request)
    async with db_pool.acquire() as conn:
        player = await conn.fetchrow('SELECT id FROM players WHERE user_id = $1', user['id'])
        
        existing = await conn.fetchrow('SELECT id FROM player_quests WHERE player_id = $1 AND quest_id = $2', player['id'], quest_id)
        if existing:
            raise HTTPException(status_code=400, detail="Quest already accepted")
        
        await conn.execute('INSERT INTO player_quests (player_id, quest_id) VALUES ($1, $2)', player['id'], quest_id)
        return {"success": True}

@api_router.post("/quests/{quest_id}/complete")
async def complete_quest(quest_id: int, request: Request):
    user = await get_current_user(request)
    async with db_pool.acquire() as conn:
        player = await conn.fetchrow('SELECT id FROM players WHERE user_id = $1', user['id'])
        
        pq = await conn.fetchrow('''
            SELECT pq.*, q.required_count, q.reward_gold, q.reward_xp FROM player_quests pq
            JOIN quests q ON pq.quest_id = q.id
            WHERE pq.player_id = $1 AND pq.quest_id = $2 AND pq.completed = FALSE
        ''', player['id'], quest_id)
        
        if not pq:
            raise HTTPException(status_code=404, detail="Quest not found")
        
        if pq['progress'] < pq['required_count']:
            raise HTTPException(status_code=400, detail="Quest not complete yet")
        
        await conn.execute('UPDATE player_quests SET completed = TRUE WHERE id = $1', pq['id'])
        await conn.execute('UPDATE players SET gold = gold + $1, xp = xp + $2 WHERE id = $3', pq['reward_gold'], pq['reward_xp'], player['id'])
        
        return {"success": True, "reward_gold": pq['reward_gold'], "reward_xp": pq['reward_xp']}

# ==================== BESTIARY ENDPOINTS ====================

@api_router.get("/bestiary")
async def get_bestiary(request: Request):
    user = await get_current_user(request)
    async with db_pool.acquire() as conn:
        player = await conn.fetchrow('SELECT id FROM players WHERE user_id = $1', user['id'])
        if not player:
            return {"monsters": [], "total": 0, "discovered": 0, "captured_count": 0}
        
        # Get all monsters
        all_monsters = await conn.fetch('SELECT id, name, base_hp, base_mp, base_strength, base_agility, base_intelligence, base_vitality, sprite, zone, description, capture_rate, xp_reward FROM monsters ORDER BY id')
        
        # Get player's bestiary entries
        bestiary = await conn.fetch('SELECT monster_id, encountered, captured, times_defeated, first_seen FROM player_bestiary WHERE player_id = $1', player['id'])
        bestiary_map = {b['monster_id']: dict(b) for b in bestiary}
        
        result = []
        discovered = 0
        captured_count = 0
        for m in all_monsters:
            entry = dict(m)
            b = bestiary_map.get(m['id'])
            if b:
                entry['encountered'] = True
                entry['captured'] = b['captured']
                entry['times_defeated'] = b['times_defeated']
                entry['first_seen'] = b['first_seen'].isoformat() if b['first_seen'] else None
                discovered += 1
                if b['captured']:
                    captured_count += 1
            else:
                entry['encountered'] = False
                entry['captured'] = False
                entry['times_defeated'] = 0
                entry['first_seen'] = None
            result.append(entry)
        
        return {
            "monsters": result,
            "total": len(all_monsters),
            "discovered": discovered,
            "captured_count": captured_count
        }

@api_router.post("/bestiary/encounter")
async def record_encounter(request: Request):
    body = await request.json()
    monster_ids = body.get('monster_ids', [])
    
    user = await get_current_user(request)
    async with db_pool.acquire() as conn:
        player = await conn.fetchrow('SELECT id FROM players WHERE user_id = $1', user['id'])
        if player:
            await record_bestiary_encounter(player['id'], monster_ids)
    return {"success": True}


# ==================== WEBSOCKET ====================

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}
        self.player_data: Dict[int, dict] = {}
    
    async def connect(self, websocket: WebSocket, player_id: int):
        await websocket.accept()
        self.active_connections[player_id] = websocket
        logger.info(f"Player {player_id} connected. Total: {len(self.active_connections)}")
    
    def disconnect(self, player_id: int):
        if player_id in self.active_connections:
            del self.active_connections[player_id]
        if player_id in self.player_data:
            del self.player_data[player_id]
        logger.info(f"Player {player_id} disconnected")
    
    async def broadcast(self, message: dict):
        disconnected = []
        for player_id, ws in self.active_connections.items():
            try:
                await ws.send_text(json.dumps(message))
            except:
                disconnected.append(player_id)
        for pid in disconnected:
            self.disconnect(pid)
    
    async def send_to(self, player_id: int, message: dict):
        if player_id in self.active_connections:
            try:
                await self.active_connections[player_id].send_text(json.dumps(message))
            except:
                self.disconnect(player_id)

manager = ConnectionManager()

@app.websocket("/api/ws/{player_id}")
async def websocket_endpoint(websocket: WebSocket, player_id: int):
    await manager.connect(websocket, player_id)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            
            if msg.get('type') == 'position':
                manager.player_data[player_id] = {
                    'id': player_id,
                    'name': msg.get('name', ''),
                    'x': msg.get('x', 0),
                    'y': msg.get('y', 0),
                    'current_map': msg.get('current_map', 'forest'),
                    'sprite': msg.get('sprite', 'player'),
                    'facing': msg.get('facing', 'right')
                }
                await manager.broadcast({"type": "positions", "players": manager.player_data})
            
            elif msg.get('type') == 'chat':
                await manager.broadcast({
                    "type": "chat",
                    "sender_id": player_id,
                    "sender_name": msg.get('name', 'Unknown'),
                    "message": msg.get('message', ''),
                    "channel": msg.get('channel', 'global')
                })
            
            elif msg.get('type') == 'friend_request':
                target_id = msg.get('target_id')
                await manager.send_to(target_id, {
                    "type": "friend_request",
                    "from_id": player_id,
                    "from_name": msg.get('name', 'Unknown')
                })
            
            elif msg.get('type') == 'duel_request':
                target_id = msg.get('target_id')
                await manager.send_to(target_id, {
                    "type": "duel_request",
                    "from_id": player_id,
                    "from_name": msg.get('name', 'Unknown')
                })
            
            elif msg.get('type') == 'trade_request':
                target_id = msg.get('target_id')
                await manager.send_to(target_id, {
                    "type": "trade_request",
                    "from_id": player_id,
                    "from_name": msg.get('name', 'Unknown')
                })
                
    except WebSocketDisconnect:
        manager.disconnect(player_id)
        await manager.broadcast({"type": "positions", "players": manager.player_data})
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(player_id)

# ==================== ROOT ====================

@api_router.get("/")
async def root():
    return {"message": "Game Engine API", "version": "2.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "database": db_pool is not None}

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    # Railway provides the port via an environment variable
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
@api_router.post("/guilds/create")
async def create_guild(name: str, request: Request):
    user = await get_current_user(request)
    async with db_pool.acquire() as conn:
        player = await conn.fetchrow('SELECT id, gold, guild_id FROM players WHERE user_id = $1', user['id'])
        if player['guild_id']: raise HTTPException(status_code=400, detail="Already in a guild")
        if player['gold'] < 10000: raise HTTPException(status_code=400, detail="Need 10,000G")
        
        guild_id = await conn.fetchval('INSERT INTO guilds (name, leader_id) VALUES ($1, $2) RETURNING id', name, player['id'])
        await conn.execute('UPDATE players SET gold = gold - 10000, guild_id = $1 WHERE id = $2', guild_id, player['id'])
        return {"success": True, "guild_id": guild_id}

@api_router.post("/guilds/buy-buff")
async def buy_guild_buff(buff_type: str, request: Request):
    user = await get_current_user(request)
    async with db_pool.acquire() as conn:
        player = await conn.fetchrow('SELECT id, guild_id FROM players WHERE user_id = $1', user['id'])
        guild = await conn.fetchrow('SELECT * FROM guilds WHERE id = $1 AND leader_id = $2', player['guild_id'], player['id'])
        if not guild: raise HTTPException(status_code=403, detail="Only leaders can buy buffs")
        
        cost = 5000
        if guild['bank_balance'] < cost: raise HTTPException(status_code=400, detail="Insufficient guild funds")
        
        expiry = datetime.now() + timedelta(hours=2)
        await conn.execute('''
            UPDATE guilds SET bank_balance = bank_balance - $1, 
            active_buff = $2, buff_expires_at = $3 WHERE id = $4
        ''', cost, buff_type, expiry, guild['id'])
        return {"success": True, "expires_at": expiry}