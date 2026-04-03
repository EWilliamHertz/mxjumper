#!/usr/bin/env python3

import requests
import sys
import json
import time
from datetime import datetime

class GameEngineAPITester:
    def __init__(self, base_url="https://platformer-party-sys.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.player_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make API request with proper headers"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            return success, response.json() if response.content else {}, response.status_code

        except Exception as e:
            return False, {"error": str(e)}, 0

    def test_health_check(self):
        """Test basic API health"""
        success, data, status = self.make_request('GET', '', expected_status=200)
        self.log_test("API Health Check", success, f"Status: {status}")
        return success

    def test_health_endpoint(self):
        """Test health endpoint"""
        success, data, status = self.make_request('GET', 'health', expected_status=200)
        self.log_test("Health Endpoint", success and data.get('status') == 'healthy', 
                     f"Status: {status}, Response: {data}")
        return success

    def test_register_user(self):
        """Test user registration"""
        test_user = {
            "email": f"test_{int(time.time())}@example.com",
            "password": "TestPass123!",
            "username": f"TestUser{int(time.time())}"
        }
        
        success, data, status = self.make_request('POST', 'auth/register', test_user, expected_status=200)
        
        if success and 'token' in data:
            self.token = data['token']
            self.user_id = data['user']['id']
            self.log_test("User Registration", True, f"User ID: {self.user_id}")
            return True
        else:
            self.log_test("User Registration", False, f"Status: {status}, Data: {data}")
            return False

    def test_admin_login(self):
        """Test admin login with provided credentials"""
        admin_creds = {
            "email": "admin@game.com",
            "password": "admin123"
        }
        
        success, data, status = self.make_request('POST', 'auth/login', admin_creds, expected_status=200)
        
        if success and 'token' in data:
            self.token = data['token']
            self.user_id = data['user']['id']
            self.log_test("Admin Login", True, f"Admin ID: {self.user_id}")
            return True
        else:
            self.log_test("Admin Login", False, f"Status: {status}, Data: {data}")
            return False

    def test_auth_me(self):
        """Test getting current user info"""
        success, data, status = self.make_request('GET', 'auth/me', expected_status=200)
        self.log_test("Auth Me Endpoint", success and 'user' in data, 
                     f"Status: {status}, User: {data.get('user', {}).get('email', 'N/A')}")
        return success

    def test_create_player(self):
        """Test player creation"""
        player_data = {"name": f"TestHero{int(time.time())}"}
        success, data, status = self.make_request('POST', 'player', player_data, expected_status=200)
        
        if success and 'id' in data:
            self.player_id = data['id']
            self.log_test("Player Creation", True, f"Player ID: {self.player_id}, Name: {data.get('name')}")
            return True
        else:
            self.log_test("Player Creation", False, f"Status: {status}, Data: {data}")
            return False

    def test_get_player(self):
        """Test getting player data"""
        success, data, status = self.make_request('GET', 'player', expected_status=200)
        self.log_test("Get Player", success and 'name' in data, 
                     f"Status: {status}, Level: {data.get('level', 'N/A')}")
        return success

    def test_get_monsters(self):
        """Test getting monster list"""
        success, data, status = self.make_request('GET', 'monsters', expected_status=200)
        monster_count = len(data) if isinstance(data, list) else 0
        self.log_test("Get Monsters", success and monster_count >= 8, 
                     f"Status: {status}, Monster count: {monster_count}")
        return success and monster_count >= 8

    def test_random_encounter(self):
        """Test random encounter generation"""
        success, data, status = self.make_request('GET', 'monsters/random', expected_status=200)
        encounter_size = len(data) if isinstance(data, list) else 0
        self.log_test("Random Encounter", success and 1 <= encounter_size <= 3, 
                     f"Status: {status}, Encounter size: {encounter_size}")
        return success

    def test_get_abilities(self):
        """Test getting abilities list"""
        success, data, status = self.make_request('GET', 'abilities', expected_status=200)
        ability_count = len(data) if isinstance(data, list) else 0
        self.log_test("Get Abilities", success and ability_count > 0, 
                     f"Status: {status}, Ability count: {ability_count}")
        return success

    def test_player_abilities(self):
        """Test getting player abilities"""
        success, data, status = self.make_request('GET', 'player/abilities', expected_status=200)
        has_unlocked = 'unlocked' in data and isinstance(data['unlocked'], list)
        has_available = 'available' in data and isinstance(data['available'], list)
        self.log_test("Player Abilities", success and has_unlocked and has_available, 
                     f"Status: {status}, Unlocked: {len(data.get('unlocked', []))}, Available: {len(data.get('available', []))}")
        return success

    def test_get_party(self):
        """Test getting party data"""
        success, data, status = self.make_request('GET', 'party', expected_status=200)
        party_size = len(data) if isinstance(data, list) else 0
        self.log_test("Get Party", success and party_size >= 1, 
                     f"Status: {status}, Party size: {party_size}")
        return success

    def test_get_allies(self):
        """Test getting captured allies"""
        success, data, status = self.make_request('GET', 'allies', expected_status=200)
        ally_count = len(data) if isinstance(data, list) else 0
        self.log_test("Get Allies", success, 
                     f"Status: {status}, Ally count: {ally_count}")
        return success

    def test_stat_allocation(self):
        """Test stat allocation"""
        # First get current player to check stat points
        success, player_data, _ = self.make_request('GET', 'player')
        if not success or player_data.get('stat_points', 0) == 0:
            self.log_test("Stat Allocation", True, "No stat points to allocate (expected)")
            return True
        
        # Try to allocate 1 point to strength
        stat_data = {"strength": 1, "agility": 0, "intelligence": 0, "vitality": 0}
        success, data, status = self.make_request('PUT', 'player/stats', stat_data, expected_status=200)
        self.log_test("Stat Allocation", success, f"Status: {status}")
        return success

    def test_heal_player(self):
        """Test player healing"""
        success, data, status = self.make_request('POST', 'player/heal', expected_status=200)
        self.log_test("Heal Player", success, f"Status: {status}")
        return success

    def test_position_update(self):
        """Test position update"""
        position_data = {"x": 150.0, "y": 350.0}
        success, data, status = self.make_request('PUT', 'player/position', position_data, expected_status=200)
        self.log_test("Position Update", success, f"Status: {status}")
        return success

    def test_combat_victory(self):
        """Test combat victory processing"""
        victory_data = {"xp": 50}
        success, data, status = self.make_request('POST', 'combat/victory', victory_data, expected_status=200)
        self.log_test("Combat Victory", success and 'xp_gained' in data, 
                     f"Status: {status}, XP gained: {data.get('xp_gained', 'N/A')}")
        return success

    def test_brute_force_protection(self):
        """Test brute force protection"""
        # Try multiple failed logins
        bad_creds = {"email": "admin@game.com", "password": "wrongpassword"}
        
        failed_attempts = 0
        for i in range(6):  # Try 6 times to trigger lockout
            success, data, status = self.make_request('POST', 'auth/login', bad_creds, expected_status=401)
            if status == 429:  # Rate limited
                self.log_test("Brute Force Protection", True, f"Locked out after {i+1} attempts")
                return True
            failed_attempts += 1
        
        self.log_test("Brute Force Protection", False, f"No lockout after {failed_attempts} attempts")
        return False

    def test_logout(self):
        """Test logout"""
        success, data, status = self.make_request('POST', 'auth/logout', expected_status=200)
        self.log_test("Logout", success, f"Status: {status}")
        return success

    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting Game Engine API Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)

        # Basic connectivity
        if not self.test_health_check():
            print("❌ Basic connectivity failed. Stopping tests.")
            return False

        self.test_health_endpoint()

        # Authentication flow
        print("\n🔐 Testing Authentication...")
        if not self.test_admin_login():
            print("❌ Admin login failed. Trying user registration...")
            if not self.test_register_user():
                print("❌ Authentication completely failed. Stopping tests.")
                return False

        self.test_auth_me()

        # Player management
        print("\n👤 Testing Player Management...")
        if not self.test_create_player():
            print("❌ Player creation failed. Some tests may fail.")
        
        self.test_get_player()

        # Game data
        print("\n🎮 Testing Game Data...")
        self.test_get_monsters()
        self.test_random_encounter()
        self.test_get_abilities()
        self.test_player_abilities()
        self.test_get_party()
        self.test_get_allies()

        # Game mechanics
        print("\n⚔️ Testing Game Mechanics...")
        self.test_stat_allocation()
        self.test_heal_player()
        self.test_position_update()
        self.test_combat_victory()

        # Security
        print("\n🔒 Testing Security...")
        self.test_brute_force_protection()
        self.test_logout()

        # Results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"Success Rate: {success_rate:.1f}%")
        
        return success_rate >= 80  # Consider 80%+ as passing

def main():
    tester = GameEngineAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/test_reports/backend_api_results.json', 'w') as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "total_tests": tester.tests_run,
            "passed_tests": tester.tests_passed,
            "success_rate": (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0,
            "results": tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())