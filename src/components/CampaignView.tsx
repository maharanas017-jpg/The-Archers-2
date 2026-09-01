import React from 'react';
import { CAMPAIGN_LEVELS } from '../constants';
import { LevelConfig, UserProgress, EnvironmentType } from '../types';
import { audio } from '../utils/audio';

interface CampaignViewProps {
  progress: UserProgress;
  onSelectLevel: (level: LevelConfig) => void;
  onBack: () => void;
}

export default function CampaignView({ progress, onSelectLevel, onBack }: CampaignViewProps) {
  const getEnvironmentColor = (env: EnvironmentType) => {
    switch (env) {
      case EnvironmentType.GREEN_FIELDS:
        return {
          bg: 'bg-emerald-50 border-emerald-100',
          text: 'text-emerald-700',
          badge: 'bg-emerald-100 text-emerald-800',
        };
      case EnvironmentType.ORCS_WOODS:
        return {
          bg: 'bg-amber-50 border-amber-100',
          text: 'text-amber-800',
          badge: 'bg-amber-100 text-amber-900',
        };
      case EnvironmentType.LAVA_LANDS:
        return {
          bg: 'bg-red-50 border-red-100',
          text: 'text-red-700',
          badge: 'bg-red-100 text-red-800',
        };
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 text-slate-800" id="campaign-container">
      {/* Header */}
      <div className="mb-8 border-b border-slate-200 pb-5">
        <button
          onClick={() => {
            audio.playClick();
            onBack();
          }}
          className="text-sm font-medium text-slate-500 hover:text-slate-800 transition mb-1 inline-flex items-center gap-1 cursor-pointer"
          id="back-to-menu-campaign"
        >
          ← Back to Main Menu
        </button>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900" id="campaign-title">
          CAMPAIGN CHAPTERS
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Defend your kingdom, defeat stickman conquerors, and unlock new dangerous lands!
        </p>
      </div>

      {/* Grid of levels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="levels-grid">
        {CAMPAIGN_LEVELS.map((level) => {
          const isUnlocked = level.id <= progress.campaignLevel;
          const isCompleted = level.id < progress.campaignLevel;
          const envStyles = getEnvironmentColor(level.environment);

          return (
            <div
              key={level.id}
              className={`flex flex-col justify-between p-6 rounded-2xl border transition ${
                isUnlocked
                  ? 'bg-white border-slate-200 shadow-sm hover:shadow-md'
                  : 'bg-slate-50 border-slate-100 opacity-60'
              }`}
              id={`level-card-${level.id}`}
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-3">
                  <div>
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-0.5">
                      Stage 0{level.id}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      {level.name}
                      {isCompleted && (
                        <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                          ✓ Clear
                        </span>
                      )}
                    </h3>
                  </div>

                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${envStyles.badge}`}>
                    {level.environment.replace('_', ' ')}
                  </span>
                </div>

                <p className="text-sm text-slate-500 mb-5">{level.description}</p>

                {/* Level parameters */}
                <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="block text-slate-400 font-medium uppercase mb-0.5">Enemies</span>
                    <span className="text-sm font-bold text-slate-800">
                      {level.enemyCount} x {level.enemyTypes.includes('boss') ? 'BOSS FIGHT' : 'Stickmen'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-medium uppercase mb-0.5">Victory Reward</span>
                    <span className="text-sm font-black text-amber-600 flex items-center gap-1">
                      🪙 {level.rewardCoins}
                    </span>
                  </div>
                </div>

                {/* Enemy Roster Preview */}
                <div className="mb-6">
                  <span className="block text-xs font-semibold text-slate-400 uppercase mb-2">Forces Present</span>
                  <div className="flex flex-wrap gap-1.5">
                    {level.enemyTypes.map((type, i) => (
                      <span
                        key={i}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold border capitalize ${
                          type === 'boss'
                            ? 'bg-red-100 text-red-800 border-red-200'
                            : type === 'wizard'
                            ? 'bg-purple-100 text-purple-800 border-purple-200'
                            : type === 'shieldman'
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : type === 'spearman'
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                {isUnlocked ? (
                  <button
                    onClick={() => {
                      audio.playLevelUp();
                      onSelectLevel(level);
                    }}
                    className={`w-full py-3 px-4 rounded-xl text-sm font-bold transition cursor-pointer text-center flex justify-center items-center gap-1 shadow-sm ${
                      level.environment === EnvironmentType.LAVA_LANDS
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : level.environment === EnvironmentType.ORCS_WOODS
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                    id={`play-stage-btn-${level.id}`}
                  >
                    Enter Battle →
                  </button>
                ) : (
                  <div className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-slate-100 text-slate-400 border border-slate-200 text-center flex justify-center items-center gap-1.5">
                    🔒 Locked (Clear Previous Stage)
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
