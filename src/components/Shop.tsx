import React, { useState } from 'react';
import { Shield, Sparkles, Sword, Trophy } from 'lucide-react';
import { DEFAULT_WEAPONS, DEFAULT_HELMETS, DEFAULT_ARMORS, DEFAULT_SPELLS } from '../constants';
import { Weapon, Helmet, Armor, Spell, UserProgress } from '../types';
import { audio } from '../utils/audio';

interface ShopProps {
  progress: UserProgress;
  onUpdateProgress: (updated: Partial<UserProgress>) => void;
  onBack: () => void;
}

export default function Shop({ progress, onUpdateProgress, onBack }: ShopProps) {
  const [activeTab, setActiveTab] = useState<'weapons' | 'helmets' | 'armor' | 'spells'>('weapons');

  const buyWeapon = (weapon: Weapon) => {
    if (progress.coins >= weapon.cost) {
      const updatedCoins = progress.coins - weapon.cost;
      const updatedUnlocked = [...progress.unlockedWeaponIds, weapon.id];
      onUpdateProgress({
        coins: updatedCoins,
        unlockedWeaponIds: updatedUnlocked,
        equippedWeaponId: weapon.id,
      });
      audio.playCoin();
    } else {
      audio.playHit(); // buzz error
    }
  };

  const equipWeapon = (weapon: Weapon) => {
    onUpdateProgress({ equippedWeaponId: weapon.id });
    audio.playClick();
  };

  const buyHelmet = (helmet: Helmet) => {
    if (progress.coins >= helmet.cost) {
      const updatedCoins = progress.coins - helmet.cost;
      const updatedUnlocked = [...progress.unlockedHelmetIds, helmet.id];
      onUpdateProgress({
        coins: updatedCoins,
        unlockedHelmetIds: updatedUnlocked,
        equippedHelmetId: helmet.id,
      });
      audio.playCoin();
    } else {
      audio.playHit();
    }
  };

  const equipHelmet = (helmet: Helmet) => {
    onUpdateProgress({ equippedHelmetId: helmet.id });
    audio.playClick();
  };

  const buyArmor = (armor: Armor) => {
    if (progress.coins >= armor.cost) {
      const updatedCoins = progress.coins - armor.cost;
      const updatedUnlocked = [...progress.unlockedArmorIds, armor.id];
      onUpdateProgress({
        coins: updatedCoins,
        unlockedArmorIds: updatedUnlocked,
        equippedArmorId: armor.id,
      });
      audio.playCoin();
    } else {
      audio.playHit();
    }
  };

  const equipArmor = (armor: Armor) => {
    onUpdateProgress({ equippedArmorId: armor.id });
    audio.playClick();
  };

  const buySpell = (spell: Spell) => {
    if (progress.coins >= spell.cost) {
      const updatedCoins = progress.coins - spell.cost;
      const updatedUnlocked = [...progress.unlockedSpellIds, spell.id];
      onUpdateProgress({
        coins: updatedCoins,
        unlockedSpellIds: updatedUnlocked,
        equippedSpellId: spell.id,
      });
      audio.playCoin();
    } else {
      audio.playHit();
    }
  };

  const equipSpell = (spell: Spell | null) => {
    onUpdateProgress({ equippedSpellId: spell ? spell.id : null });
    audio.playClick();
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 text-slate-800" id="shop-container">
      {/* Back & Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 border-b border-slate-200 pb-5 gap-4">
        <div>
          <button
            onClick={() => {
              audio.playClick();
              onBack();
            }}
            className="text-sm font-medium text-slate-500 hover:text-slate-800 transition mb-1 inline-flex items-center gap-1 cursor-pointer"
            id="back-to-menu-btn"
          >
            ← Back to Main Menu
          </button>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900" id="shop-title">
            ARMORY & LOCKER
          </h1>
        </div>

        {/* Currency Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3 shadow-sm" id="coins-display-box">
          <span className="text-2xl text-amber-500 font-bold">🪙</span>
          <div>
            <div className="text-xs text-amber-700 font-semibold tracking-wider uppercase">Your Coins</div>
            <div className="text-2xl font-black text-amber-900">{progress.coins}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-xl mb-8 max-w-2xl mx-auto border border-slate-200" id="shop-tabs">
        <button
          onClick={() => { audio.playClick(); setActiveTab('weapons'); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition cursor-pointer ${
            activeTab === 'weapons'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          id="tab-weapons"
        >
          <Sword size={16} />
          Weapons
        </button>
        <button
          onClick={() => { audio.playClick(); setActiveTab('helmets'); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition cursor-pointer ${
            activeTab === 'helmets'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          id="tab-helmets"
        >
          <Shield size={16} />
          Helmets
        </button>
        <button
          onClick={() => { audio.playClick(); setActiveTab('armor'); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition cursor-pointer ${
            activeTab === 'armor'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          id="tab-armor"
        >
          <Shield size={16} className="rotate-45" />
          Chest Armor
        </button>
        <button
          onClick={() => { audio.playClick(); setActiveTab('spells'); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition cursor-pointer ${
            activeTab === 'spells'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          id="tab-spells"
        >
          <Sparkles size={16} />
          Spells
        </button>
      </div>

      {/* Grid of items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="items-grid">
        {activeTab === 'weapons' &&
          DEFAULT_WEAPONS.map((weapon) => {
            const isUnlocked = progress.unlockedWeaponIds.includes(weapon.id);
            const isEquipped = progress.equippedWeaponId === weapon.id;
            const canAfford = progress.coins >= weapon.cost;

            return (
              <div
                key={weapon.id}
                className={`flex flex-col justify-between p-6 rounded-2xl border transition bg-white ${
                  isEquipped
                    ? 'border-emerald-500 ring-2 ring-emerald-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                id={`weapon-card-${weapon.id}`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold text-slate-900">{weapon.name}</h3>
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
                      {weapon.type}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mb-5">{weapon.description}</p>
                  
                  {/* Weapon Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600">
                    <div>
                      <span className="block text-slate-400 font-medium">DAMAGE</span>
                      <span className="text-sm font-bold text-slate-800">{weapon.damage}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 font-medium">VELOCITY</span>
                      <span className="text-sm font-bold text-slate-800">x{weapon.speedMultiplier.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 font-medium">GRAVITY</span>
                      <span className="text-sm font-bold text-slate-800">x{weapon.gravityMultiplier.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Purchase / Equip Action */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">
                  {isUnlocked ? (
                    isEquipped ? (
                      <span className="text-emerald-600 font-bold text-sm flex items-center gap-1.5" id={`equipped-badge-${weapon.id}`}>
                        ✓ Equipped
                      </span>
                    ) : (
                      <button
                        onClick={() => equipWeapon(weapon)}
                        className="w-full bg-slate-800 hover:bg-slate-950 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition cursor-pointer"
                        id={`equip-btn-${weapon.id}`}
                      >
                        Equip Weapon
                      </button>
                    )
                  ) : (
                    <div className="flex items-center justify-between w-full gap-4">
                      <span className="text-amber-600 font-black text-lg flex items-center gap-1" id={`price-${weapon.id}`}>
                        🪙 {weapon.cost}
                      </span>
                      <button
                        onClick={() => buyWeapon(weapon)}
                        disabled={!canAfford}
                        className={`py-2.5 px-6 rounded-xl font-bold text-sm transition cursor-pointer ${
                          canAfford
                            ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                        id={`buy-btn-${weapon.id}`}
                      >
                        Buy & Equip
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

        {activeTab === 'helmets' &&
          DEFAULT_HELMETS.map((helmet) => {
            const isUnlocked = progress.unlockedHelmetIds.includes(helmet.id);
            const isEquipped = progress.equippedHelmetId === helmet.id;
            const canAfford = progress.coins >= helmet.cost;

            return (
              <div
                key={helmet.id}
                className={`flex flex-col justify-between p-6 rounded-2xl border transition bg-white ${
                  isEquipped
                    ? 'border-emerald-500 ring-2 ring-emerald-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                id={`helmet-card-${helmet.id}`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold text-slate-900">{helmet.name}</h3>
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
                      HELMET
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mb-5">{helmet.description}</p>

                  <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600">
                    <div>
                      <span className="block text-slate-400 font-medium">DEFENSE BONUS</span>
                      <span className="text-sm font-bold text-slate-800">
                        {helmet.defense === 1.0 ? 'None' : `-${Math.round((1 - helmet.defense) * 100)}% DMG`}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-400 font-medium">DURABILITY (HITS)</span>
                      <span className="text-sm font-bold text-slate-800">
                        {helmet.durability === 0 ? 'Fragile' : `${helmet.durability} Hits`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">
                  {isUnlocked ? (
                    isEquipped ? (
                      <span className="text-emerald-600 font-bold text-sm flex items-center gap-1.5" id={`equipped-helmet-${helmet.id}`}>
                        ✓ Equipped
                      </span>
                    ) : (
                      <button
                        onClick={() => equipHelmet(helmet)}
                        className="w-full bg-slate-800 hover:bg-slate-950 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition cursor-pointer"
                        id={`equip-helmet-${helmet.id}`}
                      >
                        Equip Helmet
                      </button>
                    )
                  ) : (
                    <div className="flex items-center justify-between w-full gap-4">
                      <span className="text-amber-600 font-black text-lg flex items-center gap-1">
                        🪙 {helmet.cost}
                      </span>
                      <button
                        onClick={() => buyHelmet(helmet)}
                        disabled={!canAfford}
                        className={`py-2.5 px-6 rounded-xl font-bold text-sm transition cursor-pointer ${
                          canAfford
                            ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                        id={`buy-helmet-${helmet.id}`}
                      >
                        Buy & Equip
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

        {activeTab === 'armor' &&
          DEFAULT_ARMORS.map((armor) => {
            const isUnlocked = progress.unlockedArmorIds.includes(armor.id);
            const isEquipped = progress.equippedArmorId === armor.id;
            const canAfford = progress.coins >= armor.cost;

            return (
              <div
                key={armor.id}
                className={`flex flex-col justify-between p-6 rounded-2xl border transition bg-white ${
                  isEquipped
                    ? 'border-emerald-500 ring-2 ring-emerald-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                id={`armor-card-${armor.id}`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold text-slate-900">{armor.name}</h3>
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
                      ARMOR
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mb-5">{armor.description}</p>

                  <div className="mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600 flex justify-between items-center">
                    <div>
                      <span className="block text-slate-400 font-medium">MAX HP BONUS</span>
                      <span className="text-sm font-bold text-slate-800">+{armor.extraHealth} HP</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Preview:</span>
                      <span
                        className="w-5 h-5 rounded border border-slate-300 inline-block shadow-inner"
                        style={{ backgroundColor: armor.visualColor }}
                      ></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">
                  {isUnlocked ? (
                    isEquipped ? (
                      <span className="text-emerald-600 font-bold text-sm flex items-center gap-1.5" id={`equipped-armor-${armor.id}`}>
                        ✓ Equipped
                      </span>
                    ) : (
                      <button
                        onClick={() => equipArmor(armor)}
                        className="w-full bg-slate-800 hover:bg-slate-950 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition cursor-pointer"
                        id={`equip-armor-${armor.id}`}
                      >
                        Equip Armor
                      </button>
                    )
                  ) : (
                    <div className="flex items-center justify-between w-full gap-4">
                      <span className="text-amber-600 font-black text-lg flex items-center gap-1">
                        🪙 {armor.cost}
                      </span>
                      <button
                        onClick={() => buyArmor(armor)}
                        disabled={!canAfford}
                        className={`py-2.5 px-6 rounded-xl font-bold text-sm transition cursor-pointer ${
                          canAfford
                            ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                        id={`buy-armor-${armor.id}`}
                      >
                        Buy & Equip
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

        {activeTab === 'spells' && (
          <>
            {/* Unequip spell utility */}
            <div className="flex flex-col justify-between p-6 rounded-2xl border border-dashed border-slate-300 transition bg-slate-50 md:col-span-2">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Quick-Equip Magic Spells</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Spells let you imbue your arrows or deploy shields. You can equip one active spell.
                  </p>
                </div>
                {progress.equippedSpellId && (
                  <button
                    onClick={() => equipSpell(null)}
                    className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 hover:text-red-700 font-bold py-2 px-4 rounded-xl text-xs transition cursor-pointer"
                    id="unequip-spell-btn"
                  >
                    Unequip Current Spell
                  </button>
                )}
              </div>
            </div>

            {DEFAULT_SPELLS.map((spell) => {
              const isUnlocked = progress.unlockedSpellIds.includes(spell.id);
              const isEquipped = progress.equippedSpellId === spell.id;
              const canAfford = progress.coins >= spell.cost;

              return (
                <div
                  key={spell.id}
                  className={`flex flex-col justify-between p-6 rounded-2xl border transition bg-white ${
                    isEquipped
                      ? 'border-emerald-500 ring-2 ring-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  id={`spell-card-${spell.id}`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-bold text-slate-900">{spell.name}</h3>
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
                        SPELL
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mb-5">{spell.description}</p>

                    <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600">
                      <div>
                        <span className="block text-slate-400 font-medium">COOLDOWN</span>
                        <span className="text-sm font-bold text-slate-800">{spell.cooldown} Turns</span>
                      </div>
                      <div>
                        <span className="block text-slate-400 font-medium">EFFECT DURATION</span>
                        <span className="text-sm font-bold text-slate-800">
                          {spell.duration === 1 ? 'Instant' : `${spell.duration} Turns`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">
                    {isUnlocked ? (
                      isEquipped ? (
                        <span className="text-emerald-600 font-bold text-sm flex items-center gap-1.5" id={`equipped-spell-${spell.id}`}>
                          ✓ Equipped Active
                        </span>
                      ) : (
                        <button
                          onClick={() => equipSpell(spell)}
                          className="w-full bg-slate-800 hover:bg-slate-950 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition cursor-pointer"
                          id={`equip-spell-${spell.id}`}
                        >
                          Equip Spell
                        </button>
                      )
                    ) : (
                      <div className="flex items-center justify-between w-full gap-4">
                        <span className="text-amber-600 font-black text-lg flex items-center gap-1">
                          🪙 {spell.cost}
                        </span>
                        <button
                          onClick={() => buySpell(spell)}
                          disabled={!canAfford}
                          className={`py-2.5 px-6 rounded-xl font-bold text-sm transition cursor-pointer ${
                            canAfford
                              ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                          id={`buy-spell-${spell.id}`}
                        >
                          Buy & Equip
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
