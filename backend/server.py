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

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Database connection pool
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
        
        # Players table (game character data)
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
                position_y FLOAT DEFAULT 300,
                sprite VARCHAR(100) DEFAULT 'player',
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(user_id)
            )
        ''')
        
        # Monsters table (definitions)
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
                description TEXT
            )
        ''')
        
        # Captured allies (player's monster collection)
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
        
        # Player/Ally abilities (unlocked abilities)
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
        
        # Login attempts for brute force protection
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS login_attempts (
                id SERIAL PRIMARY KEY,
                identifier VARCHAR(255) NOT NULL,
                attempts INTEGER DEFAULT 1,
                last_attempt TIMESTAMP DEFAULT NOW()
            )
        ''')
        
        logger.info("Database tables created successfully")

async def seed_data():
    """Seed initial monsters and abilities"""
    async with db_pool.acquire() as conn:
        # Check if monsters already seeded
        count = await conn.fetchval('SELECT COUNT(*) FROM monsters')
        if count == 0:
            monsters = [
                ('Slime', 40, 10, 6, 5, 3, 8, 'slime', 0.5, 20, 'A bouncy green slime. Easy to capture.'),
                ('Goblin', 60, 15, 10, 12, 5, 7, 'goblin', 0.35, 35, 'A mischievous goblin warrior.'),
                ('Wolf', 70, 10, 12, 15, 4, 9, 'wolf', 0.3, 40, 'A fierce gray wolf.'),
                ('Bat', 35, 20, 5, 18, 8, 4, 'bat', 0.4, 25, 'A swift cave bat.'),
                ('Skeleton', 55, 25, 11, 10, 10, 6, 'skeleton', 0.25, 45, 'An undead skeleton warrior.'),
                ('Mushroom', 50, 30, 7, 6, 12, 10, 'mushroom', 0.45, 30, 'A magical forest mushroom.'),
                ('Ghost', 45, 40, 6, 14, 15, 5, 'ghost', 0.2, 55, 'A spooky ethereal ghost.'),
                ('Golem', 120, 5, 18, 3, 2, 20, 'golem', 0.15, 70, 'A powerful stone golem.')
            ]
            await conn.executemany('''
                INSERT INTO monsters (name, base_hp, base_mp, base_strength, base_agility, base_intelligence, base_vitality, sprite, capture_rate, xp_reward, description)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ''', monsters)
            logger.info("Seeded 8 monsters")
        
        # Check if abilities already seeded
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
        
        # Seed admin user
        admin_email = os.environ.get('ADMIN_EMAIL', 'admin@game.com')
        admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')
        existing = await conn.fetchrow('SELECT id FROM users WHERE email = $1', admin_email)
        if not existing:
            hashed = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            await conn.execute('''
                INSERT INTO users (email, password_hash, username, role) VALUES ($1, $2, $3, $4)
            ''', admin_email, hashed, 'Admin', 'admin')
            logger.info(f"Seeded admin user: {admin_email}")

async def close_db():
    global db_pool
    if db_pool:
        await db_pool.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await seed_data()
    # Write test credentials
    os.makedirs('/app/memory', exist_ok=True)
    with open('/app/memory/test_credentials.md', 'w') as f:
        f.write(f"# Test Credentials\n\n")
        f.write(f"## Admin Account\n")
        f.write(f"- Email: {os.environ.get('ADMIN_EMAIL', 'admin@game.com')}\n")
        f.write(f"- Password: {os.environ.get('ADMIN_PASSWORD', 'admin123')}\n")
        f.write(f"- Role: admin\n\n")
        f.write(f"## Auth Endpoints\n")
        f.write(f"- POST /api/auth/register\n")
        f.write(f"- POST /api/auth/login\n")
        f.write(f"- POST /api/auth/logout\n")
        f.write(f"- GET /api/auth/me\n")
    yield
    await close_db()

# Create app
app = FastAPI(lifespan=lifespan)
api_router = APIRouter(prefix="/api")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
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

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    role: str

class PlayerCreate(BaseModel):
    name: str

class PlayerResponse(BaseModel):
    id: int
    user_id: int
    name: str
    level: int
    xp: int
    xp_to_next: int
    hp: int
    max_hp: int
    mp: int
    max_mp: int
    strength: int
    agility: int
    intelligence: int
    vitality: int
    stat_points: int
    position_x: float
    position_y: float
    sprite: str

class StatAllocation(BaseModel):
    strength: int = 0
    agility: int = 0
    intelligence: int = 0
    vitality: int = 0

class MonsterResponse(BaseModel):
    id: int
    name: str
    base_hp: int
    base_mp: int
    base_strength: int
    base_agility: int
    base_intelligence: int
    base_vitality: int
    sprite: str
    capture_rate: float
    xp_reward: int
    description: Optional[str]

class AllyResponse(BaseModel):
    id: int
    player_id: int
    monster_id: int
    name: str
    level: int
    xp: int
    xp_to_next: int
    hp: int
    max_hp: int
    mp: int
    max_mp: int
    strength: int
    agility: int
    intelligence: int
    vitality: int
    stat_points: int
    in_party: bool
    party_slot: Optional[int]

class AbilityResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    mp_cost: int
    damage_multiplier: float
    ability_type: str
    element: Optional[str]
    required_level: int
    sprite: Optional[str]

class CaptureRequest(BaseModel):
    monster_id: int
    name: str

class PartyUpdate(BaseModel):
    ally_ids: List[int]

class PositionUpdate(BaseModel):
    x: float
    y: float

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
        # Check brute force
        attempt = await conn.fetchrow('SELECT attempts, last_attempt FROM login_attempts WHERE identifier = $1', identifier)
        if attempt and attempt['attempts'] >= 5:
            if datetime.now(timezone.utc) - attempt['last_attempt'].replace(tzinfo=timezone.utc) < timedelta(minutes=15):
                raise HTTPException(status_code=429, detail="Too many attempts. Try again in 15 minutes.")
        
        user = await conn.fetchrow('SELECT id, email, username, role, password_hash FROM users WHERE email = $1', email)
        if not user or not verify_password(data.password, user['password_hash']):
            # Record failed attempt
            if attempt:
                await conn.execute('UPDATE login_attempts SET attempts = attempts + 1, last_attempt = NOW() WHERE identifier = $1', identifier)
            else:
                await conn.execute('INSERT INTO login_attempts (identifier) VALUES ($1)', identifier)
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Clear attempts on success
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

@api_router.post("/player", response_model=PlayerResponse)
async def create_player(data: PlayerCreate, request: Request):
    user = await get_current_user(request)
    async with db_pool.acquire() as conn:
        existing = await conn.fetchrow('SELECT id FROM players WHERE user_id = $1', user['id'])
        if existing:
            raise HTTPException(status_code=400, detail="Player already exists")
        
        player = await conn.fetchrow('''
            INSERT INTO players (user_id, name) VALUES ($1, $2)
            RETURNING id, user_id, name, level, xp, xp_to_next, hp, max_hp, mp, max_mp, 
                      strength, agility, intelligence, vitality, stat_points, position_x, position_y, sprite
        ''', user['id'], data.name)
        
        # Grant starting abilities
        await conn.execute('''
            INSERT INTO entity_abilities (player_id, ability_id)
            SELECT $1, id FROM abilities WHERE required_level <= 1
        ''', player['id'])
        
        return dict(player)

@api_router.get("/player", response_model=PlayerResponse)
async def get_player(request: Request):
    user = await get_current_user(request)
    async with db_pool.acquire() as conn:
        player = await conn.fetchrow('''
            SELECT id, user_id, name, level, xp, xp_to_next, hp, max_hp, mp, max_mp,
                   strength, agility, intelligence, vitality, stat_points, position_x, position_y, sprite
            FROM players WHERE user_id = $1
        ''', user['id'])
        if not player:
            raise HTTPException(status_code=404, detail="Player not found. Create one first.")
        return dict(player)

@api_router.put("/player/position")
async def update_position(data: PositionUpdate, request: Request):
    user = await get_current_user(request)
    async with db_pool.acquire() as conn:
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
        
        # Update stats
        new_vitality = player['vitality'] + data.vitality
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
    """Fully heal player and party"""
    user = await get_current_user(request)
    async with db_pool.acquire() as conn:
        await conn.execute('UPDATE players SET hp = max_hp, mp = max_mp WHERE user_id = $1', user['id'])
        player = await conn.fetchrow('SELECT id FROM players WHERE user_id = $1', user['id'])
        if player:
            await conn.execute('UPDATE captured_allies SET hp = max_hp, mp = max_mp WHERE player_id = $1', player['id'])
        return {"success": True}

# ==================== MONSTER ENDPOINTS ====================

@api_router.get("/monsters", response_model=List[MonsterResponse])
async def get_monsters():
    async with db_pool.acquire() as conn:
        monsters = await conn.fetch('SELECT * FROM monsters')
        return [dict(m) for m in monsters]

@api_router.get("/monsters/random")
async def get_random_encounter():
    """Get random monsters for an encounter (1-3 monsters)"""
    import random
    async with db_pool.acquire() as conn:
        monsters = await conn.fetch('SELECT * FROM monsters ORDER BY RANDOM() LIMIT $1', random.randint(1, 3))
        # Create encounter instances with unique IDs
        encounter = []
        for i, m in enumerate(monsters):
            monster = dict(m)
            monster['encounter_id'] = f"enemy_{i}_{monster['id']}"
            monster['current_hp'] = monster['base_hp']
            monster['current_mp'] = monster['base_mp']
            encounter.append(monster)
        return encounter

# ==================== ALLY/CAPTURE ENDPOINTS ====================

@api_router.get("/allies", response_model=List[AllyResponse])
async def get_allies(request: Request):
    user = await get_current_user(request)
    async with db_pool.acquire() as conn:
        player = await conn.fetchrow('SELECT id FROM players WHERE user_id = $1', user['id'])
        if not player:
            return []
        allies = await conn.fetch('SELECT * FROM captured_allies WHERE player_id = $1 ORDER BY captured_at', player['id'])
        return [dict(a) for a in allies]

@api_router.post("/allies/capture")
async def capture_monster(data: CaptureRequest, request: Request):
    """Capture a monster and add to collection"""
    import random
    user = await get_current_user(request)
    
    async with db_pool.acquire() as conn:
        player = await conn.fetchrow('SELECT id FROM players WHERE user_id = $1', user['id'])
        if not player:
            raise HTTPException(status_code=404, detail="Player not found")
        
        monster = await conn.fetchrow('SELECT * FROM monsters WHERE id = $1', data.monster_id)
        if not monster:
            raise HTTPException(status_code=404, detail="Monster not found")
        
        # Check capture success
        if random.random() > monster['capture_rate']:
            return {"success": False, "message": f"{monster['name']} escaped!"}
        
        # Create captured ally
        ally = await conn.fetchrow('''
            INSERT INTO captured_allies (player_id, monster_id, name, hp, max_hp, mp, max_mp, strength, agility, intelligence, vitality)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        ''', player['id'], monster['id'], data.name, monster['base_hp'], monster['base_hp'], 
            monster['base_mp'], monster['base_mp'], monster['base_strength'], monster['base_agility'],
            monster['base_intelligence'], monster['base_vitality'])
        
        return {"success": True, "ally": dict(ally), "message": f"Captured {data.name}!"}

@api_router.put("/allies/{ally_id}/party")
async def toggle_party(ally_id: int, request: Request):
    user = await get_current_user(request)
    async with db_pool.acquire() as conn:
        player = await conn.fetchrow('SELECT id FROM players WHERE user_id = $1', user['id'])
        ally = await conn.fetchrow('SELECT * FROM captured_allies WHERE id = $1 AND player_id = $2', ally_id, player['id'])
        if not ally:
            raise HTTPException(status_code=404, detail="Ally not found")
        
        # Count current party members
        party_count = await conn.fetchval('SELECT COUNT(*) FROM captured_allies WHERE player_id = $1 AND in_party = TRUE', player['id'])
        
        if ally['in_party']:
            # Remove from party
            await conn.execute('UPDATE captured_allies SET in_party = FALSE, party_slot = NULL WHERE id = $1', ally_id)
            return {"success": True, "in_party": False}
        else:
            # Add to party (max 3 allies + player = 4 total)
            if party_count >= 3:
                raise HTTPException(status_code=400, detail="Party is full (max 3 allies)")
            next_slot = await conn.fetchval('''
                SELECT COALESCE(MAX(party_slot), 0) + 1 FROM captured_allies WHERE player_id = $1 AND in_party = TRUE
            ''', player['id'])
            await conn.execute('UPDATE captured_allies SET in_party = TRUE, party_slot = $1 WHERE id = $2', next_slot, ally_id)
            return {"success": True, "in_party": True}

@api_router.get("/party")
async def get_party(request: Request):
    """Get player and all party allies for combat"""
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

@api_router.get("/abilities", response_model=List[AbilityResponse])
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
            return []
        
        abilities = await conn.fetch('''
            SELECT a.* FROM abilities a
            JOIN entity_abilities ea ON a.id = ea.ability_id
            WHERE ea.player_id = $1
        ''', player['id'])
        
        # Also get abilities that can be unlocked
        available = await conn.fetch('''
            SELECT * FROM abilities 
            WHERE required_level <= $1 
            AND id NOT IN (SELECT ability_id FROM entity_abilities WHERE player_id = $2)
        ''', player['level'], player['id'])
        
        return {
            "unlocked": [dict(a) for a in abilities],
            "available": [dict(a) for a in available]
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
        
        # Check if already unlocked
        existing = await conn.fetchrow('SELECT id FROM entity_abilities WHERE player_id = $1 AND ability_id = $2', player['id'], ability_id)
        if existing:
            raise HTTPException(status_code=400, detail="Already unlocked")
        
        await conn.execute('INSERT INTO entity_abilities (player_id, ability_id) VALUES ($1, $2)', player['id'], ability_id)
        return {"success": True, "ability": dict(ability)}

# ==================== COMBAT/XP ENDPOINTS ====================

@api_router.post("/combat/victory")
async def combat_victory(request: Request):
    """Process victory rewards - XP and potential level ups"""
    body = await request.json()
    xp_gained = body.get('xp', 0)
    
    user = await get_current_user(request)
    async with db_pool.acquire() as conn:
        player = await conn.fetchrow('SELECT * FROM players WHERE user_id = $1', user['id'])
        if not player:
            raise HTTPException(status_code=404, detail="Player not found")
        
        new_xp = player['xp'] + xp_gained
        level_ups = 0
        stat_points_gained = 0
        new_level = player['level']
        xp_to_next = player['xp_to_next']
        
        # Check for level ups
        while new_xp >= xp_to_next:
            new_xp -= xp_to_next
            new_level += 1
            level_ups += 1
            stat_points_gained += 5
            xp_to_next = int(xp_to_next * 1.5)
        
        # Update player
        hp_bonus = level_ups * 10
        mp_bonus = level_ups * 5
        await conn.execute('''
            UPDATE players SET 
                xp = $1, level = $2, xp_to_next = $3, 
                stat_points = stat_points + $4,
                max_hp = max_hp + $5, hp = LEAST(hp + $5, max_hp + $5),
                max_mp = max_mp + $6, mp = LEAST(mp + $6, max_mp + $6)
            WHERE id = $7
        ''', new_xp, new_level, xp_to_next, stat_points_gained, hp_bonus, mp_bonus, player['id'])
        
        # Also give XP to party allies
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
        
        # Check for new abilities to unlock
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
    """Save HP/MP after combat"""
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

# ==================== WEBSOCKET MULTIPLAYER ====================

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}
        self.player_positions: Dict[int, dict] = {}
    
    async def connect(self, websocket: WebSocket, player_id: int):
        await websocket.accept()
        self.active_connections[player_id] = websocket
        logger.info(f"Player {player_id} connected. Total: {len(self.active_connections)}")
    
    def disconnect(self, player_id: int):
        if player_id in self.active_connections:
            del self.active_connections[player_id]
        if player_id in self.player_positions:
            del self.player_positions[player_id]
        logger.info(f"Player {player_id} disconnected. Total: {len(self.active_connections)}")
    
    async def broadcast_positions(self):
        if not self.active_connections:
            return
        message = json.dumps({"type": "positions", "players": self.player_positions})
        disconnected = []
        for player_id, ws in self.active_connections.items():
            try:
                await ws.send_text(message)
            except:
                disconnected.append(player_id)
        for pid in disconnected:
            self.disconnect(pid)
    
    def update_position(self, player_id: int, data: dict):
        self.player_positions[player_id] = data

manager = ConnectionManager()

@app.websocket("/ws/{player_id}")
async def websocket_endpoint(websocket: WebSocket, player_id: int):
    await manager.connect(websocket, player_id)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            
            if msg.get('type') == 'position':
                manager.update_position(player_id, {
                    'id': player_id,
                    'name': msg.get('name', ''),
                    'x': msg.get('x', 0),
                    'y': msg.get('y', 0),
                    'sprite': msg.get('sprite', 'player'),
                    'facing': msg.get('facing', 'right')
                })
                await manager.broadcast_positions()
    except WebSocketDisconnect:
        manager.disconnect(player_id)
        await manager.broadcast_positions()
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(player_id)

# ==================== ROOT ====================

@api_router.get("/")
async def root():
    return {"message": "Game Engine API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "database": db_pool is not None}

app.include_router(api_router)
