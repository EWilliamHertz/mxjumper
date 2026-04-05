import React, { useState } from 'react';

const EQUIPMENT_SLOTS = [
  { slot: 'head', label: 'Head', icon: '👑' },
  { slot: 'chest', label: 'Chest', icon: '🔷' },
  { slot: 'legs', label: 'Legs', icon: '👖' },
  { slot: 'feet', label: 'Feet', icon: '👟' },
  { slot: 'hands', label: 'Hands', icon: '🧤' },
  { slot: 'back', label: 'Back', icon: '🎒' }
];

// Sample gear database with stats
const GEAR_DATABASE = {
  // Common gear
  1: { id: 1, name: 'Iron Helmet', slot: 'head', rarity: 'common', def: 5, hp: 10 },
  2: { id: 2, name: 'Iron Chest', slot: 'chest', rarity: 'common', def: 10, hp: 20 },
  3: { id: 3, name: 'Iron Legs', slot: 'legs', rarity: 'common', def: 8, hp: 15 },
  4: { id: 4, name: 'Iron Boots', slot: 'feet', rarity: 'common', def: 4, hp: 5 },
  5: { id: 5, name: 'Leather Gloves', slot: 'hands', rarity: 'common', def: 3, hp: 5 },
  // Rare gear
  10: { id: 10, name: 'Dragon Scale Helmet', slot: 'head', rarity: 'rare', def: 15, hp: 30 },
  11: { id: 11, name: 'Dragon Scale Chest', slot: 'chest', rarity: 'rare', def: 25, hp: 50 },
  12: { id: 12, name: 'Dragon Scale Legs', slot: 'legs', rarity: 'rare', def: 20, hp: 40 },
  // Epic gear
  20: { id: 20, name: 'Legendary Crown', slot: 'head', rarity: 'epic', def: 30, hp: 60, atk: 20 },
};

const getRarityColor = (rarity) => {
  switch (rarity) {
    case 'common': return 'bg-gray-400';
    case 'rare': return 'bg-blue-400';
    case 'epic': return 'bg-purple-500';
    case 'legendary': return 'bg-yellow-500';
    default: return 'bg-gray-300';
  }
};

export default function Equipment({ equipment = {}, inventory = [], onEquip, onUnequip }) {
  const [showInventory, setShowInventory] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const inventoryBySlot = (slot) => {
    return inventory.filter(item => GEAR_DATABASE[item.id]?.slot === slot);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="grid grid-cols-2 gap-6">
        {/* Equipment Display */}
        <div>
          <h3 className="text-lg font-bold mb-4 text-white">Equipment</h3>
          <div className="space-y-2">
            {EQUIPMENT_SLOTS.map(({ slot, label, icon }) => {
              const equippedItem = equipment[slot] ? GEAR_DATABASE[equipment[slot]] : null;
              return (
                <div 
                  key={slot}
                  onClick={() => {
                    setSelectedSlot(slot);
                    setShowInventory(true);
                  }}
                  className="bg-gray-700 p-3 rounded cursor-pointer hover:bg-gray-600 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-300">
                      {icon} {label}
                    </span>
                    {equippedItem && (
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${getRarityColor(equippedItem.rarity)} text-white`}>
                          {equippedItem.name}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUnequip(slot);
                          }}
                          className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-white"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    {!equippedItem && (
                      <span className="text-xs text-gray-500">Empty - Click to equip</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats Display */}
        <div>
          <h3 className="text-lg font-bold mb-4 text-white">Total Stats from Gear</h3>
          <div className="bg-gray-700 p-4 rounded space-y-2">
            {(() => {
              let totalDef = 0, totalHp = 0, totalAtk = 0;
              Object.values(equipment).forEach(itemId => {
                if (itemId) {
                  const item = GEAR_DATABASE[itemId];
                  if (item) {
                    totalDef += item.def || 0;
                    totalHp += item.hp || 0;
                    totalAtk += item.atk || 0;
                  }
                }
              });
              return (
                <>
                  <div className="flex justify-between text-white">
                    <span>Defense Bonus:</span>
                    <span className="font-bold text-green-400">+{totalDef}</span>
                  </div>
                  <div className="flex justify-between text-white">
                    <span>HP Bonus:</span>
                    <span className="font-bold text-green-400">+{totalHp}</span>
                  </div>
                  {totalAtk > 0 && (
                    <div className="flex justify-between text-white">
                      <span>Attack Bonus:</span>
                      <span className="font-bold text-green-400">+{totalAtk}</span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Inventory Panel */}
      {showInventory && selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-white font-bold">
                Select {EQUIPMENT_SLOTS.find(s => s.slot === selectedSlot)?.label} Gear
              </h4>
              <button
                onClick={() => setShowInventory(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {inventoryBySlot(selectedSlot).length > 0 ? (
                inventoryBySlot(selectedSlot).map(item => {
                  const gearData = GEAR_DATABASE[item.id];
                  return (
                    <div
                      key={`${item.id}-${item.instance_id}`}
                      className={`${getRarityColor(gearData.rarity)} p-3 rounded cursor-pointer hover:opacity-80 transition`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-white">{gearData.name}</p>
                          <p className="text-xs text-gray-100">
                            {gearData.def && `Def: +${gearData.def}`}
                            {gearData.hp && ` | HP: +${gearData.hp}`}
                            {gearData.atk && ` | Atk: +${gearData.atk}`}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            onEquip(item.id, selectedSlot);
                            setShowInventory(false);
                          }}
                          className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-white text-sm font-bold"
                        >
                          Equip
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-400 text-center py-8">No gear available for this slot</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
