import json
import logging

logger = logging.getLogger(__name__)

class InventoryManager:
    @staticmethod
    async def add_item(conn, player_id, item_data):
        """Adds an item to the player's JSONB inventory or increments quantity."""
        # Ensure item_data has a quantity
        if 'quantity' not in item_data:
            item_data['quantity'] = 1
            
        # Get current inventory
        inventory_json = await conn.fetchval('SELECT inventory FROM players WHERE id = $1', player_id)
        inventory = inventory_json if isinstance(inventory_json, list) else json.loads(inventory_json) if inventory_json else []
        
        # Check if item exists (by name)
        found = False
        for item in inventory:
            if item.get('name') == item_data['name']:
                item['quantity'] = item.get('quantity', 0) + item_data.get('quantity', 1)
                found = True
                break
        
        if not found:
            inventory.append(item_data)
            
        # Save back to DB
        await conn.execute('UPDATE players SET inventory = $1::jsonb WHERE id = $2', json.dumps(inventory), player_id)
        return inventory

class AbilityManager:
    @staticmethod
    async def upgrade_ability(conn, player_id, ability_id):
        """Handles Diablo-style skill leveling with prerequisites and level caps (1-5)."""
        # 1. Get player and ability info
        player = await conn.fetchrow('SELECT skill_points, level FROM players WHERE id = $1', player_id)
        ability = await conn.fetchrow('SELECT * FROM abilities WHERE id = $1', ability_id)
        
        if not player or not ability:
            return {"success": False, "error": "Player or Ability not found"}
            
        if player['skill_points'] <= 0:
            return {"success": False, "error": "No skill points available"}

        if player['level'] < ability['required_level']:
            return {"success": False, "error": f"Requires Level {ability['required_level']}"}

        # 2. Check current rank
        current_rank_row = await conn.fetchrow('''
            SELECT level FROM entity_abilities 
            WHERE player_id = $1 AND ability_id = $2
        ''', player_id, ability_id)
        
        current_rank = current_rank_row['level'] if current_rank_row else 0
        
        if current_rank >= 5:
            return {"success": False, "error": "Ability already at max rank (5)"}

        # 3. Check Prerequisite (If ability has a 'prerequisite_id' column)
        # Assuming you add a 'prerequisite_id' column to your abilities table
        if 'prerequisite_id' in ability and ability['prerequisite_id']:
            prereq_rank = await conn.fetchval('''
                SELECT level FROM entity_abilities 
                WHERE player_id = $1 AND ability_id = $2
            ''', player_id, ability['prerequisite_id'])
            
            if not prereq_rank or prereq_rank < 1:
                return {"success": False, "error": "Must unlock prerequisite skill first"}

        # 4. Perform Upgrade
        if current_rank == 0:
            await conn.execute('''
                INSERT INTO entity_abilities (player_id, ability_id, level) 
                VALUES ($1, $2, 1)
            ''', player_id, ability_id)
        else:
            await conn.execute('''
                UPDATE entity_abilities SET level = level + 1 
                WHERE player_id = $1 AND ability_id = $2
            ''', player_id, ability_id)

        # 5. Deduct Skill Point
        await conn.execute('UPDATE players SET skill_points = skill_points - 1 WHERE id = $1', player_id)
        
        return {"success": True, "new_level": current_rank + 1}