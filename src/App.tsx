import React, { useState, useEffect } from 'react';
import { Award, ShieldAlert, Sparkles, Sword, Trophy, Volume2, VolumeX, Play, HelpCircle, Flame, Target } from 'lucide-react';
import { GameMode, LevelConfig, UserProgress } from './types';
import { audio } from './utils/audio';
import Shop from './components/Shop';
import CampaignView from './components/CampaignView';
import AchievementsView from './components/AchievementsView';
import GameCanvas from './components/GameCanvas';

const LOCAL_STORAGE_KEY = 'the_archers_2_progress_v1';

const DEFAULT_PROGRESS: UserProgress = {
  coins: 100, // start with some pocket change!
  campaignLevel: 1,
  equippedWeaponId: 'w_basic_bow',
  equippedHelmetId: 'h_none',
  equippedArmorId: 'a_none',
  equippedSpellId: null,
  unlockedWeaponIds: ['w_basic_bow'],
  unlockedHelmetIds: ['h_none'],
  unlockedArmorIds: ['a_none'],
  unlockedSpellIds: [],
  highScore: 0,
};

export default function App() {
  const [progress, setProgress] = useState<UserProgress>(DEFAULT_PROGRESS);
  const [activeScreen, setActiveScreen] = useState<'menu' | 'campaign' | 'shop' | 'achievements' | 'playing'>('menu');
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.CAMPAIGN);
  const [selectedLevel, setSelectedLevel] = useState<LevelConfig | null>(null);
  const [isMuted, setIsMuted] = useState(audio.getMuteStatus());
  
  // Game results state
  const [showResults, setShowResults] = useState(false);
  const [resultsData, setResultsData] = useState<{ victory: boolean; earnedCoins: number; score?: number } | null>(null);
  const [showHowTo, setShowHowTo] = useState(false);
  const [showAboutPrivacy, setShowAboutPrivacy] = useState(false);

  // Load progress from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        setProgress(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Could not load user progress', e);
    }
  }, []);

  // Sync state helper
  const updateProgress = (updated: Partial<UserProgress>) => {
    setProgress((prev) => {
      const next = { ...prev, ...updated };
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn('Could not save user progress', e);
      }
      return next;
    });
  };

  const handleToggleMute = () => {
    const status = audio.toggleMute();
    setIsMuted(status);
  };

  const startSurvival = () => {
    audio.playLevelUp();
    setGameMode(GameMode.SURVIVAL);
    setSelectedLevel(null);
    setActiveScreen('playing');
  };

  const startTwoPlayer = () => {
    audio.playLevelUp();
    setGameMode(GameMode.TWO_PLAYER);
    setSelectedLevel(null);
    setActiveScreen('playing');
  };

  const handleGameOver = (results: { victory: boolean; earnedCoins: number; score?: number }) => {
    setResultsData(results);
    setShowResults(true);

    // Give coins from results (accumulate)
    if (results.earnedCoins > 0) {
      updateProgress({
        coins: progress.coins + results.earnedCoins,
        highScore: results.score ? Math.max(progress.highScore, results.score) : progress.highScore,
      });
    }
  };

  const closeResults = () => {
    audio.playClick();
    setShowResults(false);
    setResultsData(null);
    setActiveScreen('menu');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-emerald-100" id="app-root">
      {/* Top Navigation HUD */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40" id="main-header">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex justify-between items-center">
          {/* Logo */}
          <div
            onClick={() => {
              audio.playClick();
              setActiveScreen('menu');
            }}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <span className="text-2xl">🏹</span>
            <div>
              <span className="text-lg font-black tracking-tighter text-slate-900 group-hover:text-emerald-600 transition">
                THE ARCHERS 2
              </span>
              <span className="text-[10px] font-bold text-emerald-600 block leading-tight tracking-widest uppercase">
                Stickman Bow Master
              </span>
            </div>
          </div>

          {/* Quick Stats & Controls */}
          <div className="flex items-center gap-4">
            {/* Coins */}
            <div className="bg-amber-50 border border-amber-100 rounded-lg py-1 px-3 flex items-center gap-2">
              <span className="text-sm">🪙</span>
              <span className="font-extrabold text-sm text-amber-800 font-mono">{progress.coins}</span>
            </div>

            {/* High Score */}
            {progress.highScore > 0 && (
              <div className="hidden sm:flex bg-emerald-50 border border-emerald-100 rounded-lg py-1 px-3 items-center gap-2 text-xs">
                <Trophy size={14} className="text-amber-500" />
                <span className="font-bold text-emerald-800">Best: {progress.highScore}</span>
              </div>
            )}

            {/* Sound Mute Toggle */}
            <button
              onClick={handleToggleMute}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer"
              title="Toggle Audio Effects"
              id="global-mute-btn"
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center py-8" id="main-content-canvas">
        {activeScreen === 'menu' && (
          <div className="w-full max-w-4xl mx-auto px-4" id="home-screen">
            {/* Decorative banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-8 text-white mb-8 shadow-md relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="relative z-10 space-y-3 max-w-lg text-center md:text-left">
                <span className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/20 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase">
                  Casual Game Archery Champion
                </span>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
                  Slay Stickman Armies with Bow & Spear!
                </h1>
                <p className="text-emerald-100 text-sm leading-relaxed">
                  Defend your casual hero warrior in 2D physics environments. Earn legendary gold, equip horns, custom knight armor, cast magic spells, or duel friends!
                </p>
                <div className="pt-2 flex flex-wrap gap-2 justify-center md:justify-start">
                  <button
                    onClick={() => {
                      audio.playClick();
                      setShowHowTo(true);
                    }}
                    className="bg-white/10 hover:bg-white/15 border border-white/20 py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    id="open-guide-btn"
                  >
                    <HelpCircle size={14} /> How to Play
                  </button>
                </div>
              </div>

              {/* Graphical stickman mascot illustration */}
              <div className="w-44 h-44 relative hidden md:flex items-center justify-center opacity-90 select-none">
                <svg viewBox="0 0 100 100" className="w-full h-full stroke-white fill-none stroke-[4]">
                  {/* Head */}
                  <circle cx="50" cy="30" r="10" strokeWidth="5" fill="#111" />
                  {/* Spine */}
                  <line x1="50" y1="40" x2="50" y2="70" strokeWidth="6" />
                  {/* Left Arm holding bow */}
                  <line x1="50" y1="45" x2="72" y2="45" />
                  {/* Bow */}
                  <path d="M 72 25 A 25 25 0 0 1 72 65" stroke="#d97706" strokeWidth="4" />
                  <line x1="72" y1="25" x2="63" y2="45" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
                  <line x1="72" y1="65" x2="63" y2="45" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
                  {/* Legs */}
                  <line x1="50" y1="70" x2="40" y2="90" strokeWidth="5" />
                  <line x1="50" y1="70" x2="60" y2="90" strokeWidth="5" />
                </svg>
              </div>
            </div>

            {/* Main Action buttons Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="modes-grid">
              {/* Campaign Mode Card */}
              <div
                onClick={() => {
                  audio.playClick();
                  setGameMode(GameMode.CAMPAIGN);
                  setActiveScreen('campaign');
                }}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition cursor-pointer flex gap-5 group"
                id="mode-campaign-card"
              >
                <div className="bg-emerald-50 rounded-xl p-4 text-emerald-600 flex items-center justify-center shrink-0">
                  <Target size={32} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 group-hover:text-emerald-600 transition flex items-center gap-2">
                    Campaign Adventure
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      Stage 0{progress.campaignLevel}
                    </span>
                  </h3>
                  <p className="text-slate-500 text-sm mt-1.5 leading-relaxed">
                    Battle enemy orcs, dangerous bosses, and shamans through Green Fields, Orcs Woods, and Lava Lands.
                  </p>
                </div>
              </div>

              {/* Survival Mode Card */}
              <div
                onClick={startSurvival}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition cursor-pointer flex gap-5 group"
                id="mode-survival-card"
              >
                <div className="bg-red-50 rounded-xl p-4 text-red-600 flex items-center justify-center shrink-0">
                  <Flame size={32} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 group-hover:text-red-600 transition">
                    Survival Mode
                  </h3>
                  <p className="text-slate-500 text-sm mt-1.5 leading-relaxed">
                    Endless waves of falling stickman warriors. Face increasing numbers, earn rapid gold, and climb high scores.
                  </p>
                </div>
              </div>

              {/* 2 Player local mode Card */}
              <div
                onClick={startTwoPlayer}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition cursor-pointer flex gap-5 group"
                id="mode-2p-card"
              >
                <div className="bg-indigo-50 rounded-xl p-4 text-indigo-600 flex items-center justify-center shrink-0">
                  <Sword size={32} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 group-hover:text-indigo-600 transition flex items-center gap-2">
                    Local 2 Players Duel
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                      Fun VS
                    </span>
                  </h3>
                  <p className="text-slate-500 text-sm mt-1.5 leading-relaxed">
                    Challenge your friend or sibling on a single screen! Alternate turns to aim and shoot each other down.
                  </p>
                </div>
              </div>

              {/* Armory & Locker Customizer */}
              <div
                onClick={() => {
                  audio.playClick();
                  setActiveScreen('shop');
                }}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition cursor-pointer flex gap-5 group"
                id="mode-shop-card"
              >
                <div className="bg-amber-50 rounded-xl p-4 text-amber-600 flex items-center justify-center shrink-0">
                  <ShieldAlert size={32} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 group-hover:text-amber-600 transition">
                    Armory & Upgrades
                  </h3>
                  <p className="text-slate-500 text-sm mt-1.5 leading-relaxed">
                    Spend coins to buy spears, fast shurikens, wizard hats, knight armor, or Triple fire spells. Customize your hero!
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom mini actions */}
            <div className="mt-8 flex justify-center gap-4">
              <button
                onClick={() => {
                  audio.playClick();
                  setActiveScreen('achievements');
                }}
                className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
                id="open-achievements-btn"
              >
                <Award size={14} /> Achievements & Records
              </button>
            </div>
          </div>
        )}

        {activeScreen === 'campaign' && (
          <CampaignView
            progress={progress}
            onSelectLevel={(level) => {
              setSelectedLevel(level);
              setGameMode(GameMode.CAMPAIGN);
              setActiveScreen('playing');
            }}
            onBack={() => setActiveScreen('menu')}
          />
        )}

        {activeScreen === 'shop' && (
          <Shop
            progress={progress}
            onUpdateProgress={updateProgress}
            onBack={() => setActiveScreen('menu')}
          />
        )}

        {activeScreen === 'achievements' && (
          <AchievementsView progress={progress} onBack={() => setActiveScreen('menu')} />
        )}

        {activeScreen === 'playing' && (
          <GameCanvas
            mode={gameMode}
            progress={progress}
            selectedCampaignLevel={selectedLevel}
            onUpdateProgress={updateProgress}
            onGameOver={handleGameOver}
            onBack={() => {
              audio.playClick();
              setActiveScreen('menu');
            }}
          />
        )}
      </main>

      {/* Post Match Rewards Popover Modal */}
      {showResults && resultsData && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div>
              <span className="text-5xl inline-block mb-3">
                {resultsData.victory ? '🏆' : '💀'}
              </span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {resultsData.victory ? 'VICTORY!' : 'DEFEAT'}
              </h2>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                {resultsData.victory
                  ? 'You successfully defeated the enemy stickmen army!'
                  : 'Your warrior fell in combat. Equip better gear to survive!'}
              </p>
            </div>

            {/* Rewards Card */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Bounty Earned</span>
                <span className="text-lg font-black text-amber-600 flex items-center gap-1">
                  🪙 {resultsData.earnedCoins}
                </span>
              </div>
              {resultsData.score && (
                <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                  <span className="text-slate-400 font-medium">Final Score</span>
                  <span className="text-lg font-bold text-slate-800 font-mono">
                    {resultsData.score} pts
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={closeResults}
              className="w-full bg-slate-900 hover:bg-slate-950 text-white font-bold py-3.5 px-6 rounded-2xl text-sm transition cursor-pointer"
            >
              Continue to Lobby
            </button>
          </div>
        </div>
      )}

      {/* How to Play Manual Modal */}
      {showHowTo && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-lg w-full space-y-6 shadow-2xl relative">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">How to Play The Archers 2</h2>
              <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-wider">Gameplay Guidelines</p>
            </div>

            <div className="space-y-4 text-sm text-slate-600">
              <div className="flex gap-3 items-start">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">1</span>
                <div>
                  <h4 className="font-bold text-slate-800">Aim & Charge</h4>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Tap near your stickman and pull back to extend the bow string. Drag up or down to adjust your launch angle and pull strength.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">2</span>
                <div>
                  <h4 className="font-bold text-slate-800">Hit Zones & Armor</h4>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Headshots deal 3.0x catastrophic damage! However, enemies holding a wooden shield will block torso impacts. Aim for their heads or legs to bypass shields!
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">3</span>
                <div>
                  <h4 className="font-bold text-slate-800">Shop Customization</h4>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Spend your earned coins to unlock advanced weapons (heavy throwing spears, rapid-fire ninja shurikens), helmets that deflect headshots, and spells!
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                audio.playClick();
                setShowHowTo(false);
              }}
              className="w-full bg-slate-900 hover:bg-slate-950 text-white font-bold py-3 px-6 rounded-xl text-xs transition cursor-pointer"
            >
              Let's Play!
            </button>
          </div>
        </div>
      )}

      {/* About & Privacy Policy Modal */}
      {showAboutPrivacy && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-6 shadow-2xl relative animate-in fade-in zoom-in duration-200" id="about-privacy-modal">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">About & Privacy Policy</h2>
              <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-wider">The Archers 2 — Stickman Bow Master</p>
            </div>

            <div className="space-y-6 text-sm text-slate-600 leading-relaxed">
              {/* About Section */}
              <section className="space-y-2">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  🛡️ About The Game
                </h3>
                <p>
                  <strong>The Archers 2: Stickman Bow Master</strong> is a high-octane, physics-simulated archery duel game. Take control of a legendary stickman warrior, pull back the bow string, calculate custom wind and gravity trajectories, and annihilate rival tribal factions.
                </p>
                <p>
                  This project utilizes cutting-edge <strong>HTML5 Canvas rendering</strong>, simulated <strong>kinematic ragdoll physical collisions</strong>, and real-time custom <strong>procedural audio wave synthesis nodes</strong> to deliver arcade-perfect fluid animation without lag.
                </p>
              </section>

              {/* Privacy Policy Section */}
              <section className="space-y-2 border-t border-slate-100 pt-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  🔒 Privacy Policy & Data
                </h3>
                <p>
                  Your privacy is our absolute priority. This application operates entirely as a local single-player/local-coop client tool:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-2 text-xs text-slate-500">
                  <li><strong>Zero Tracking:</strong> We do not track your location, device data, or capture telemetry.</li>
                  <li><strong>No Cookies:</strong> The web app uses standard secure <code>localStorage</code> purely to persist your unlocked coins, high scores, purchased bows, shields, and active campaign levels.</li>
                  <li><strong>GDPR & CCPA Compliant:</strong> No personally identifiable information (PII) is ever collected, transmitted, or shared with third-party networks or cloud services.</li>
                  <li><strong>Fully Offline Capable:</strong> All game logic, mathematical models, and sound wave generators run locally inside your browser container.</li>
                </ul>
              </section>

              {/* Support & Contact */}
              <section className="space-y-2 border-t border-slate-100 pt-4 bg-slate-50 p-4 rounded-2xl">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Credits & Developer Notice</h4>
                <p className="text-xs text-slate-500">
                  Built with React 18, Vite, Tailwind CSS, Lucide icons, and mathematical motion equations. For issues, contact security or clear your browser cache to completely reset local profiles.
                </p>
              </section>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  audio.playClick();
                  localStorage.removeItem(LOCAL_STORAGE_KEY);
                  window.location.reload();
                }}
                className="py-3 px-5 border border-red-200 text-red-600 hover:bg-red-50 font-bold rounded-2xl text-xs transition cursor-pointer"
                title="Clears all coins and inventory progress"
              >
                Reset Save File
              </button>
              <button
                onClick={() => {
                  audio.playClick();
                  setShowAboutPrivacy(false);
                }}
                className="flex-1 bg-slate-900 hover:bg-slate-950 text-white font-bold py-3 px-6 rounded-2xl text-xs transition cursor-pointer"
              >
                Accept & Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 mt-auto">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 The Archers 2. Casual Stickman Physics Archery Masterpiece.</p>
          <div className="flex gap-4 items-center">
            <button 
              onClick={() => { audio.playClick(); setShowAboutPrivacy(true); }}
              className="hover:text-slate-800 font-semibold cursor-pointer transition"
            >
              About / Privacy Policy
            </button>
            <span className="text-slate-200">|</span>
            <span>Green Fields</span>
            <span>Orcs Woods</span>
            <span>Lava Lands</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
