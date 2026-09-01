import React, { useState } from 'react';
import { Trophy, Award, Star, ShieldAlert, Sparkles, Flame, CheckCircle2 } from 'lucide-react';
import { UserProgress } from '../types';
import { audio } from '../utils/audio';

interface AchievementsViewProps {
  progress: UserProgress;
  onBack: () => void;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  reward: number;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  weapon: string;
  isUser?: boolean;
}

export default function AchievementsView({ progress, onBack }: AchievementsViewProps) {
  // Define Achievements
  const achievementsList: Achievement[] = [
    {
      id: 'first_blood',
      title: 'First Blood',
      description: 'Defeat your first stickman archer in campaign.',
      icon: <Star className="text-amber-500" size={24} />,
      unlocked: progress.campaignLevel > 1,
      reward: 50,
    },
    {
      id: 'armored_up',
      title: 'Armored Up',
      description: 'Equip any defensive Helmet or chest plate.',
      icon: <ShieldAlert className="text-blue-500" size={24} />,
      unlocked: progress.unlockedHelmetIds.length > 1 || progress.unlockedArmorIds.length > 1,
      reward: 100,
    },
    {
      id: 'spellslinger',
      title: 'Sorcerer Apprentice',
      description: 'Unlock any magic elemental spell.',
      icon: <Sparkles className="text-purple-500" size={24} />,
      unlocked: progress.unlockedSpellIds.length > 0,
      reward: 100,
    },
    {
      id: 'grok_slayer',
      title: 'Grok Scriptor',
      description: 'Defeat Warlord Grok (Stage 5 Boss).',
      icon: <Award className="text-red-500" size={24} />,
      unlocked: progress.campaignLevel > 5,
      reward: 200,
    },
    {
      id: 'legendary_bow',
      title: 'Dragon Master',
      description: 'Purchase the Dragon Fire Bow.',
      icon: <Flame className="text-orange-500" size={24} />,
      unlocked: progress.unlockedWeaponIds.includes('w_dragon_bow'),
      reward: 300,
    },
    {
      id: 'golem_slayer',
      title: 'Cinder Smasher',
      description: 'Defeat Cinder, Lava Golem (Final Stage Boss).',
      icon: <Trophy className="text-yellow-500" size={24} />,
      unlocked: progress.campaignLevel > 8,
      reward: 500,
    },
  ];

  // Static simulated leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([
    { rank: 1, name: 'Legolas99', score: 9850, weapon: 'Long Elven Bow' },
    { rank: 2, name: 'Robin_Hood', score: 8400, weapon: 'Dragon Fire Bow' },
    { rank: 3, name: 'StickMasterX', score: 7150, weapon: 'Steel Barbarian Spear' },
    { rank: 4, name: 'Slayer_Archer', score: 6200, weapon: 'Training Wood Bow' },
    { rank: 5, name: progress.highScore > 0 ? 'You (Current Best)' : 'BowmanPro', score: Math.max(progress.highScore, 5000), weapon: 'Long Elven Bow', isUser: progress.highScore > 0 },
  ]);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 text-slate-800" id="achievements-container">
      {/* Header */}
      <div className="mb-8 border-b border-slate-200 pb-5">
        <button
          onClick={() => {
            audio.playClick();
            onBack();
          }}
          className="text-sm font-medium text-slate-500 hover:text-slate-800 transition mb-1 inline-flex items-center gap-1 cursor-pointer"
          id="back-to-menu-achievements"
        >
          ← Back to Main Menu
        </button>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900" id="achievements-title">
          RECORDS & LEADERBOARDS
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Review your high scores, battle milestones, and climb the halls of archery fame.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Achievements list */}
        <div className="lg:col-span-2 space-y-4" id="achievements-list">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
            <Award className="text-amber-500" size={20} />
            Stickman Milestones ({achievementsList.filter(a => a.unlocked).length} / {achievementsList.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievementsList.map((ach) => (
              <div
                key={ach.id}
                className={`p-4 rounded-xl border flex gap-4 items-start bg-white transition ${
                  ach.unlocked
                    ? 'border-emerald-200 bg-emerald-50/10'
                    : 'border-slate-200 opacity-65'
                }`}
                id={`achievement-card-${ach.id}`}
              >
                <div className={`p-3 rounded-lg ${ach.unlocked ? 'bg-amber-100/50' : 'bg-slate-100'}`}>
                  {ach.icon}
                </div>

                <div className="flex-1">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    {ach.title}
                    {ach.unlocked && (
                      <CheckCircle2 size={14} className="text-emerald-500 inline" />
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">{ach.description}</p>
                  <div className="text-[11px] font-bold text-amber-600 mt-2 flex items-center gap-1">
                    Reward: 🪙 {ach.reward}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Simulated Leaderboard */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6" id="leaderboard-card">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-5">
            <Trophy className="text-amber-500" size={20} />
            Hall of Bowmasters
          </h2>

          <div className="space-y-3">
            {leaderboard
              .sort((a, b) => b.score - a.score)
              .map((entry, idx) => {
                const isUserBest = entry.isUser || (entry.rank === 5 && progress.highScore > 0);
                const scoreValue = isUserBest ? progress.highScore : entry.score;

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      isUserBest
                        ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm'
                        : 'bg-white border-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                        isUserBest ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-bold text-sm block">
                          {isUserBest ? 'You (Best)' : entry.name}
                        </span>
                        <span className={`text-[10px] block ${isUserBest ? 'text-emerald-100' : 'text-slate-400'}`}>
                          {entry.weapon}
                        </span>
                      </div>
                    </div>

                    <span className="text-sm font-black tracking-tight font-mono">
                      {scoreValue} pts
                    </span>
                  </div>
                );
              })}
          </div>

          <div className="text-[11px] text-slate-400 text-center mt-5 leading-relaxed">
            *Play Survival Mode and clear successive waves of stickmen to climb the high scores leaderboard!
          </div>
        </div>
      </div>
    </div>
  );
}
