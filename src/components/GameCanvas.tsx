import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Shield, Play, RotateCcw, Award } from 'lucide-react';
import { LevelConfig, GameMode, EnvironmentType, WeaponType, UserProgress, Particle, FlyingHelmet, FlyingShield } from '../types';
import { CAMPAIGN_LEVELS, DEFAULT_WEAPONS, DEFAULT_HELMETS, DEFAULT_ARMORS, DEFAULT_SPELLS } from '../constants';
import { audio } from '../utils/audio';

interface GameCanvasProps {
  mode: GameMode;
  progress: UserProgress;
  selectedCampaignLevel: LevelConfig | null;
  onUpdateProgress: (updated: Partial<UserProgress>) => void;
  onGameOver: (result: { victory: boolean; earnedCoins: number; score?: number }) => void;
  onBack: () => void;
}

// Logical coordinates
const LOGICAL_WIDTH = 1000;
const LOGICAL_HEIGHT = 550;

interface Character {
  id: string;
  isPlayer: boolean;
  playerIndex?: 1 | 2; // For 2-player mode
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  armorColor: string;
  hasHelmet: boolean;
  helmetType: 'viking' | 'gladiator' | 'wizard' | 'crown' | 'knight' | 'none';
  helmetDurability: number;
  hasShield: boolean;
  shieldHp: number;
  isDead: boolean;
  aimAngle: number;
  aimStrength: number;
  isPulling: boolean;
  isBurning: boolean;
  burnTicks: number;
  isFrozen: boolean;
  freezeDuration: number;
  activeShieldBubble: boolean;
  shamanShieldActive: boolean;
  // Ragdoll fields
  ragdollActive: boolean;
  ragdollTime: number;
  ragdollParts: {
    [key: string]: { x: number; y: number; vx: number; vy: number; angle: number; av: number; length: number; color?: string; size?: number };
  };
  // AI targeting
  aiLastTargetX?: number;
  aiLastTargetY?: number;
  aiAimOffset: number; // For learning/zeroing-in aim
  aiCooldown: number;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: string;
  type: WeaponType;
  damage: number;
  gravityMult: number;
  trail: Array<{ x: number; y: number }>;
  isSpellFire: boolean;
  isSpellIce: boolean;
  stuckInShieldOf?: string;
  stuckRelativeX?: number;
  stuckRelativeY?: number;
  stuckAngle?: number;
}

interface ShieldObstacle {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  ownerId: string;
}

export default function GameCanvas({
  mode,
  progress,
  selectedCampaignLevel,
  onUpdateProgress,
  onGameOver,
  onBack,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sound and UI controls
  const [isMuted, setIsMuted] = useState(audio.getMuteStatus());
  const [wind, setWind] = useState({ speed: 0, direction: 1 }); // Wind speed (0-3), dir (-1 left, 1 right)
  const [turn, setTurn] = useState<1 | 2>(1); // 1 = Player 1, 2 = Player 2 (Local 2P)
  const [activeSpellCooldown, setActiveSpellCooldown] = useState(0);
  const [spellReady, setSpellReady] = useState(true);
  const [gameState, setGameState] = useState<'countdown' | 'playing' | 'ended'>('countdown');
  const [countdown, setCountdown] = useState(3);
  const [headshotAlert, setHeadshotAlert] = useState<{ x: number; y: number; text: string; timer: number } | null>(null);

  // High performance game state stored in refs for the loop
  const stateRef = useRef<{
    characters: Character[];
    projectiles: Projectile[];
    particles: Particle[];
    flyingHelmets: FlyingHelmet[];
    flyingShields: FlyingShield[];
    aimStart: { x: number; y: number } | null;
    aimCurrent: { x: number; y: number } | null;
    spellActive: 'FIRE' | 'ICE' | 'SHIELD' | 'TRIPLE' | null;
    cameraShake: number;
    gameEnded: boolean;
    victory: boolean;
    coinsEarned: number;
    survivalWave: number;
    score: number;
    levelId: number;
  }>({
    characters: [],
    projectiles: [],
    particles: [],
    flyingHelmets: [],
    flyingShields: [],
    aimStart: null,
    aimCurrent: null,
    spellActive: null,
    cameraShake: 0,
    gameEnded: false,
    victory: false,
    coinsEarned: 0,
    survivalWave: 1,
    score: 0,
    levelId: selectedCampaignLevel?.id || 1,
  });

  // Sound toggle helper
  const handleToggleMute = () => {
    const status = audio.toggleMute();
    setIsMuted(status);
  };

  // Generate current player & enemy characters
  const initGame = () => {
    stateRef.current.projectiles = [];
    stateRef.current.particles = [];
    stateRef.current.flyingHelmets = [];
    stateRef.current.flyingShields = [];
    stateRef.current.cameraShake = 0;
    stateRef.current.gameEnded = false;
    stateRef.current.victory = false;
    stateRef.current.coinsEarned = 0;
    stateRef.current.spellActive = null;

    // Wind generation
    const speed = Math.floor(Math.random() * 4);
    const direction = Math.random() > 0.5 ? 1 : -1;
    setWind({ speed, direction });

    const selectedWeapon = DEFAULT_WEAPONS.find((w) => w.id === progress.equippedWeaponId) || DEFAULT_WEAPONS[0];
    const selectedHelmet = DEFAULT_HELMETS.find((h) => h.id === progress.equippedHelmetId) || DEFAULT_HELMETS[0];
    const selectedArmor = DEFAULT_ARMORS.find((a) => a.id === progress.equippedArmorId) || DEFAULT_ARMORS[0];

    const playerMaxHp = 100 + selectedArmor.extraHealth;

    const characters: Character[] = [];

    if (mode === GameMode.TWO_PLAYER) {
      // Local 2 Player Setup
      // Player 1 on left, Player 2 on right
      characters.push({
        id: 'p1',
        isPlayer: true,
        playerIndex: 1,
        x: 180,
        y: 430,
        hp: playerMaxHp,
        maxHp: playerMaxHp,
        armorColor: selectedArmor.visualColor,
        hasHelmet: selectedHelmet.visualType !== 'none',
        helmetType: selectedHelmet.visualType,
        helmetDurability: selectedHelmet.durability,
        hasShield: false,
        shieldHp: 0,
        isDead: false,
        aimAngle: 0,
        aimStrength: 0,
        isPulling: false,
        isBurning: false,
        burnTicks: 0,
        isFrozen: false,
        freezeDuration: 0,
        activeShieldBubble: false,
        shamanShieldActive: false,
        ragdollActive: false,
        ragdollTime: 0,
        ragdollParts: {},
        aiAimOffset: 0,
        aiCooldown: 0,
      });

      characters.push({
        id: 'p2',
        isPlayer: true,
        playerIndex: 2,
        x: 820,
        y: 430,
        hp: playerMaxHp, // Symmetrical HP
        maxHp: playerMaxHp,
        armorColor: '#3a6fa5', // Custom 2P blue armor color
        hasHelmet: selectedHelmet.visualType !== 'none',
        helmetType: selectedHelmet.visualType,
        helmetDurability: selectedHelmet.durability,
        hasShield: false,
        shieldHp: 0,
        isDead: false,
        aimAngle: Math.PI, // Face left
        aimStrength: 0,
        isPulling: false,
        isBurning: false,
        burnTicks: 0,
        isFrozen: false,
        freezeDuration: 0,
        activeShieldBubble: false,
        shamanShieldActive: false,
        ragdollActive: false,
        ragdollTime: 0,
        ragdollParts: {},
        aiAimOffset: 0,
        aiCooldown: 0,
      });

      setTurn(1);
    } else {
      // Campaign or Survival Setup
      // Player
      characters.push({
        id: 'player',
        isPlayer: true,
        x: 150,
        y: 430,
        hp: playerMaxHp,
        maxHp: playerMaxHp,
        armorColor: selectedArmor.visualColor,
        hasHelmet: selectedHelmet.visualType !== 'none',
        helmetType: selectedHelmet.visualType,
        helmetDurability: selectedHelmet.durability,
        hasShield: false,
        shieldHp: 0,
        isDead: false,
        aimAngle: 0,
        aimStrength: 0,
        isPulling: false,
        isBurning: false,
        burnTicks: 0,
        isFrozen: false,
        freezeDuration: 0,
        activeShieldBubble: false,
        shamanShieldActive: false,
        ragdollActive: false,
        ragdollTime: 0,
        ragdollParts: {},
        aiAimOffset: 0,
        aiCooldown: 0,
      });

      if (mode === GameMode.CAMPAIGN && selectedCampaignLevel) {
        // Render current campaign enemies
        selectedCampaignLevel.enemyTypes.forEach((type, index) => {
          // Stagger enemy spacing along the right side
          const xPos = 650 + index * 100 + (Math.random() * 30);
          const yPos = 430 - (index % 2) * 50; // Some on tiny dynamic platforms!

          const isBoss = type === 'boss';
          const hpValue = isBoss ? (selectedCampaignLevel.id === 8 ? 500 : 250) : (type === 'shieldman' ? 120 : 80);

          characters.push({
            id: `enemy_${index}_${type}`,
            isPlayer: false,
            x: Math.min(xPos, 920),
            y: yPos,
            hp: hpValue,
            maxHp: hpValue,
            armorColor: isBoss ? '#900000' : (type === 'wizard' ? '#6b21a8' : '#2d3748'),
            hasHelmet: isBoss || type === 'shieldman' || Math.random() > 0.5,
            helmetType: isBoss ? 'viking' : (type === 'shieldman' ? 'knight' : (Math.random() > 0.5 ? 'viking' : 'none')),
            helmetDurability: isBoss ? 3 : 1,
            hasShield: type === 'shieldman',
            shieldHp: type === 'shieldman' ? 100 : 0,
            isDead: false,
            aimAngle: Math.PI,
            aimStrength: 0,
            isPulling: false,
            isBurning: false,
            burnTicks: 0,
            isFrozen: false,
            freezeDuration: 0,
            activeShieldBubble: false,
            shamanShieldActive: false,
            ragdollActive: false,
            ragdollTime: 0,
            ragdollParts: {},
            aiAimOffset: 8 + Math.random() * 12, // Offset starts high (representing poor initial aim)
            aiCooldown: 100 + index * 40, // Stagger initial shoot intervals
          });
        });
      } else {
        // Survival Mode setup wave 1
        spawnSurvivalWave(characters);
      }
    }

    stateRef.current.characters = characters;
    setGameState('playing');
  };

  const spawnSurvivalWave = (chars: Character[]) => {
    const wave = stateRef.current.survivalWave;
    const enemyCount = 1 + Math.ceil(wave / 2);
    for (let i = 0; i < enemyCount; i++) {
      const type = i === 0 && wave % 4 === 0 ? 'boss' : (Math.random() > 0.6 ? 'shieldman' : (Math.random() > 0.7 ? 'spearman' : 'archer'));
      const isBoss = type === 'boss';
      const hpValue = isBoss ? 200 + wave * 15 : 60 + wave * 10;
      chars.push({
        id: `survival_${wave}_${i}_${type}`,
        isPlayer: false,
        x: 600 + i * 110 + Math.random() * 40,
        y: 430 - (i % 2) * 45,
        hp: hpValue,
        maxHp: hpValue,
        armorColor: isBoss ? '#c2410c' : '#2e3d30',
        hasHelmet: isBoss || Math.random() > 0.4,
        helmetType: isBoss ? 'crown' : (Math.random() > 0.5 ? 'viking' : 'knight'),
        helmetDurability: isBoss ? 3 : 1,
        hasShield: type === 'shieldman',
        shieldHp: type === 'shieldman' ? 80 + wave * 5 : 0,
        isDead: false,
        aimAngle: Math.PI,
        aimStrength: 0,
        isPulling: false,
        isBurning: false,
        burnTicks: 0,
        isFrozen: false,
        freezeDuration: 0,
        activeShieldBubble: false,
        shamanShieldActive: false,
        ragdollActive: false,
        ragdollTime: 0,
        ragdollParts: {},
        aiAimOffset: 12 - Math.min(8, wave * 0.5) + Math.random() * 8, // Waves get more precise!
        aiCooldown: 120 + i * 50,
      });
    }
  };

  // Turn on/off individual spells
  const activateSpell = (type: 'FIRE' | 'ICE' | 'SHIELD' | 'TRIPLE') => {
    if (!spellReady || activeSpellCooldown > 0) return;
    
    audio.playSpell();
    if (type === 'SHIELD') {
      // Shield is applied instantly
      const player = stateRef.current.characters.find(c => c.isPlayer && c.id === (mode === GameMode.TWO_PLAYER ? `p${turn}` : 'player'));
      if (player) {
        player.activeShieldBubble = true;
        // spawn shield energy particles
        spawnImpactParticles(player.x, player.y - 30, '#06b6d4', 25);
      }
      setActiveSpellCooldown(5); // 5 turns cooldown
    } else {
      // Applied to next shot
      stateRef.current.spellActive = type;
    }
  };

  // Spawns dust, block splinters, blood particles
  const spawnImpactParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 6;
      stateRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        color,
        size: 2 + Math.random() * 4,
        alpha: 1,
        life: 0,
        maxLife: 30 + Math.random() * 40,
        gravity: 0.15,
      });
    }
  };

  // Initializing dynamic bones for kinematic/ragdoll collapses
  const triggerRagdoll = (char: Character, hitX: number, hitY: number) => {
    char.ragdollActive = true;
    char.ragdollTime = 0;
    
    // Decompose characters into joints: head, torso, upperArmL, lowerArmL, upperArmR, lowerArmR, upperLegL, lowerLegL, upperLegR, lowerLegR
    // Give them velocity outwards from hit location
    const dir = char.x < hitX ? -1 : 1;
    const forceX = dir * (2 + Math.random() * 4);
    const forceY = -(1 + Math.random() * 5);

    char.ragdollParts = {
      head: { x: char.x, y: char.y - 95, vx: forceX, vy: forceY - 1, angle: 0, av: (Math.random() - 0.5) * 0.2, length: 16, size: 16 },
      torso: { x: char.x, y: char.y - 55, vx: forceX * 0.8, vy: forceY, angle: 0, av: (Math.random() - 0.5) * 0.1, length: 47 },
      leftArm: { x: char.x - 14, y: char.y - 68, vx: forceX + (Math.random() - 0.5), vy: forceY - 1, angle: 1, av: (Math.random() - 0.5) * 0.3, length: 30 },
      rightArm: { x: char.x + 14, y: char.y - 68, vx: forceX + (Math.random() - 0.5), vy: forceY - 1, angle: -1, av: (Math.random() - 0.5) * 0.3, length: 30 },
      leftLeg: { x: char.x - 7, y: char.y - 20, vx: forceX * 0.6, vy: forceY * 0.8, angle: 0.3, av: (Math.random() - 0.5) * 0.15, length: 34 },
      rightLeg: { x: char.x + 7, y: char.y - 20, vx: forceX * 0.6, vy: forceY * 0.8, angle: -0.3, av: (Math.random() - 0.5) * 0.15, length: 34 },
    };
  };

  // Launch projectile (arrows/spears/shurikens)
  const launchProjectile = (owner: Character, angle: number, strength: number) => {
    const isPlayer = owner.isPlayer;
    let weapon = DEFAULT_WEAPONS[0];

    if (isPlayer) {
      if (mode === GameMode.TWO_PLAYER) {
        // For Local 2P, both can have customized weapons, but let's default to training/equipped
        weapon = DEFAULT_WEAPONS.find((w) => w.id === progress.equippedWeaponId) || DEFAULT_WEAPONS[0];
      } else {
        weapon = DEFAULT_WEAPONS.find((w) => w.id === progress.equippedWeaponId) || DEFAULT_WEAPONS[0];
      }
    } else {
      // Enemy weapon based on ID type
      if (owner.id.includes('spear')) {
        weapon = DEFAULT_WEAPONS.find((w) => w.type === WeaponType.SPEAR) || DEFAULT_WEAPONS[3];
      } else if (owner.id.includes('shuriken')) {
        weapon = DEFAULT_WEAPONS.find((w) => w.type === WeaponType.SHURIKEN) || DEFAULT_WEAPONS[5];
      } else if (owner.id.includes('boss')) {
        // Boss heavier stats
        weapon = { ...DEFAULT_WEAPONS[0], damage: 50, speedMultiplier: 1.1, gravityMultiplier: 1.1 };
      }
    }

    const baseVelocity = strength * 0.22 * weapon.speedMultiplier;
    const finalAngle = angle;

    const isTriple = isPlayer && stateRef.current.spellActive === 'TRIPLE';
    const isSpellFire = isPlayer && stateRef.current.spellActive === 'FIRE';
    const isSpellIce = isPlayer && stateRef.current.spellActive === 'ICE';

    // Spawn point offset in front of character torso (scaled up)
    const startX = owner.x + Math.cos(finalAngle) * 40;
    const startY = owner.y - 60 + Math.sin(finalAngle) * 40;

    const addProj = (a: number) => {
      stateRef.current.projectiles.push({
        x: startX,
        y: startY,
        vx: Math.cos(a) * baseVelocity,
        vy: Math.sin(a) * baseVelocity,
        ownerId: owner.id,
        type: weapon.type,
        damage: weapon.damage,
        gravityMult: weapon.gravityMultiplier,
        trail: [],
        isSpellFire,
        isSpellIce,
      });
    };

    if (isTriple) {
      addProj(finalAngle);
      addProj(finalAngle - 0.12);
      addProj(finalAngle + 0.12);
    } else {
      addProj(finalAngle);
    }

    // Spend spell charge
    if (isPlayer) {
      if (stateRef.current.spellActive) {
        const matchingSpell = DEFAULT_SPELLS.find(s => s.type === stateRef.current.spellActive);
        if (matchingSpell) {
          setActiveSpellCooldown(matchingSpell.cooldown);
        }
        stateRef.current.spellActive = null;
      }
    }

    audio.playShoot(weapon.type);
  };

  // Main game logic loop
  useEffect(() => {
    let animFrame: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Countdown timer ticks
    let lastTime = Date.now();

    const loop = () => {
      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Handle countdown
      if (gameState === 'countdown') {
        // ticks handled in surrounding react states
      }

      // Update Camera Shake
      if (stateRef.current.cameraShake > 0) {
        stateRef.current.cameraShake -= 0.5;
        if (stateRef.current.cameraShake < 0) stateRef.current.cameraShake = 0;
      }

      ctx.save();
      // Apply Camera Shake
      if (stateRef.current.cameraShake > 0) {
        const dx = (Math.random() - 0.5) * stateRef.current.cameraShake;
        const dy = (Math.random() - 0.5) * stateRef.current.cameraShake;
        ctx.translate(dx, dy);
      }

      // Background Rendering based on current land environment
      const env = selectedCampaignLevel?.environment || EnvironmentType.GREEN_FIELDS;
      drawBackground(ctx, env);

      // Render Floor
      drawFloor(ctx, env);

      // Render Platforms
      drawPlatforms(ctx, env);

      // Handle game logic when active
      if (gameState === 'playing' && !stateRef.current.gameEnded) {
        updateGameLogic();
      }

      // Render Characters
      stateRef.current.characters.forEach((char) => {
        drawCharacter(ctx, char);
      });

      // Render Projectiles
      stateRef.current.projectiles.forEach((proj) => {
        drawProjectile(ctx, proj);
      });

      // Render Flying Helmets & Shields
      stateRef.current.flyingHelmets.forEach((fh) => {
        drawFlyingHelmet(ctx, fh);
      });
      stateRef.current.flyingShields.forEach((fs) => {
        drawFlyingShield(ctx, fs);
      });

      // Render Particles
      stateRef.current.particles.forEach((part) => {
        drawParticle(ctx, part);
      });

      // Render Aim HUD for Player Pull
      drawAimLine(ctx);

      // Headshot float text overlay
      if (headshotAlert && headshotAlert.timer > 0) {
        headshotAlert.timer -= 1;
        ctx.fillStyle = '#ff3333';
        ctx.font = 'black 22px system-ui';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fillText(headshotAlert.text, headshotAlert.x, headshotAlert.y - (30 - headshotAlert.timer / 2));
        ctx.shadowBlur = 0;
        if (headshotAlert.timer <= 0) {
          setHeadshotAlert(null);
        }
      }

      ctx.restore();

      animFrame = requestAnimationFrame(loop);
    };

    // Environment background drawings
    const drawBackground = (c: CanvasRenderingContext2D, environment: EnvironmentType) => {
      if (environment === EnvironmentType.GREEN_FIELDS) {
        // Bright friendly green chalkboard gradient
        const grad = c.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
        grad.addColorStop(0, '#109a70');
        grad.addColorStop(1, '#0b7353');
        c.fillStyle = grad;
        c.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

        // Subtle mountain layers
        c.fillStyle = '#1e8463';
        c.beginPath();
        c.moveTo(0, 350);
        c.quadraticCurveTo(200, 280, 450, 360);
        c.quadraticCurveTo(700, 310, LOGICAL_WIDTH, 380);
        c.lineTo(LOGICAL_WIDTH, LOGICAL_HEIGHT);
        c.lineTo(0, LOGICAL_HEIGHT);
        c.fill();
      } else if (environment === EnvironmentType.ORCS_WOODS) {
        // Deep teal woodland gradient
        const grad = c.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
        grad.addColorStop(0, '#123024');
        grad.addColorStop(1, '#061711');
        c.fillStyle = grad;
        c.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

        // Spooky dense trees
        c.fillStyle = '#0a231a';
        c.beginPath();
        c.moveTo(0, 420);
        c.lineTo(80, 200);
        c.lineTo(160, 420);
        c.moveTo(300, 420);
        c.lineTo(400, 150);
        c.lineTo(500, 420);
        c.moveTo(700, 420);
        c.lineTo(780, 180);
        c.lineTo(860, 420);
        c.fill();
      } else {
        // Lava Lands - Scorched volcanic atmosphere
        const grad = c.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
        grad.addColorStop(0, '#1e1010');
        grad.addColorStop(0.7, '#2f1212');
        grad.addColorStop(1, '#ff3700');
        c.fillStyle = grad;
        c.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

        // Glowing magma bursts in background
        if (Math.random() > 0.985) {
          stateRef.current.particles.push({
            x: Math.random() * LOGICAL_WIDTH,
            y: LOGICAL_HEIGHT - 60,
            vx: (Math.random() - 0.5) * 2,
            vy: -4 - Math.random() * 6,
            color: '#ff9900',
            size: 4 + Math.random() * 6,
            alpha: 1,
            life: 0,
            maxLife: 60 + Math.random() * 40,
            gravity: 0.1,
          });
        }
      }
    };

    const drawFloor = (c: CanvasRenderingContext2D, environment: EnvironmentType) => {
      const now = Date.now();
      // Basic ground plane lines
      c.strokeStyle = '#ffffff';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(0, 430);
      c.lineTo(LOGICAL_WIDTH, 430);
      c.stroke();

      if (environment === EnvironmentType.LAVA_LANDS) {
        // molten pool visual below floor line
        c.fillStyle = '#ff3c00';
        c.fillRect(0, 434, LOGICAL_WIDTH, 120);

        // draw lava glow particles rising
        c.fillStyle = 'rgba(255, 230, 0, 0.4)';
        for (let i = 0; i < 6; i++) {
          const x = (now + i * 15000) % LOGICAL_WIDTH;
          const y = 434 + (Math.sin(now / 300 + i) * 10);
          c.beginPath();
          c.arc(x, y, 10 + i, 0, Math.PI * 2);
          c.fill();
        }
      } else {
        // Clean soil/moss base
        c.fillStyle = environment === EnvironmentType.ORCS_WOODS ? '#040d0a' : '#084f39';
        c.fillRect(0, 432, LOGICAL_WIDTH, 120);
      }
    };

    const drawPlatforms = (c: CanvasRenderingContext2D, environment: EnvironmentType) => {
      // Generate some nice high standoffs for strategic targeting
      c.strokeStyle = '#ffffff';
      c.lineWidth = 3;

      if (environment === EnvironmentType.ORCS_WOODS) {
        // Left platform
        c.fillStyle = '#0b241b';
        c.fillRect(100, 350, 100, 12);
        c.strokeRect(100, 350, 100, 12);

        // Right platform
        c.fillRect(750, 280, 120, 12);
        c.strokeRect(750, 280, 120, 12);
      } else if (environment === EnvironmentType.LAVA_LANDS) {
        // Floating blocks
        c.fillStyle = '#221111';
        c.fillRect(120, 320, 90, 15);
        c.strokeRect(120, 320, 90, 15);

        c.fillRect(450, 260, 110, 15);
        c.strokeRect(450, 260, 110, 15);

        c.fillRect(780, 320, 90, 15);
        c.strokeRect(780, 320, 90, 15);
      } else {
        // Green Fields standard high shelf
        c.fillStyle = '#0e694f';
        c.fillRect(450, 330, 120, 10);
        c.strokeRect(450, 330, 120, 10);
      }
    };

    const drawCharacter = (c: CanvasRenderingContext2D, char: Character) => {
      const now = Date.now();
      if (char.isDead && !char.ragdollActive) return;

      c.save();
      c.strokeStyle = '#ffffff';
      c.fillStyle = '#ffffff';
      c.lineCap = 'round';

      if (char.ragdollActive) {
        // RAGDOLL DRAWING - dynamically render individual physical segments
        const parts = char.ragdollParts;
        if (!parts.head) { c.restore(); return; }

        // Head
        c.beginPath();
        c.arc(parts.head.x, parts.head.y, parts.head.length, 0, Math.PI * 2);
        c.fillStyle = '#111111';
        c.fill();
        c.lineWidth = 4;
        c.stroke();

        // Helmet on flying ragdoll?
        if (char.hasHelmet && char.helmetDurability > 0) {
          drawHelmetOnHead(c, parts.head.x, parts.head.y, parts.head.angle, char.helmetType);
        }

        // Torso
        const tx = parts.torso.x;
        const ty = parts.torso.y;
        const ta = parts.torso.angle;
        const tl = parts.torso.length;
        const tEndX = tx + Math.cos(ta + Math.PI/2) * tl;
        const tEndY = ty + Math.sin(ta + Math.PI/2) * tl;
        c.lineWidth = 7.5;
        c.strokeStyle = char.armorColor === '#3a3a3a' ? '#ffffff' : char.armorColor;
        c.beginPath();
        c.moveTo(tx, ty);
        c.lineTo(tEndX, tEndY);
        c.stroke();

        // Arms
        c.strokeStyle = '#ffffff';
        c.lineWidth = 4;
        // Left arm
        c.beginPath();
        c.moveTo(tx, ty + 6);
        c.lineTo(parts.leftArm.x, parts.leftArm.y);
        c.stroke();
        // Right arm
        c.beginPath();
        c.moveTo(tx, ty + 6);
        c.lineTo(parts.rightArm.x, parts.rightArm.y);
        c.stroke();

        // Legs
        // Left leg
        c.beginPath();
        c.moveTo(tEndX, tEndY);
        c.lineTo(parts.leftLeg.x, parts.leftLeg.y);
        c.stroke();
        // Right leg
        c.beginPath();
        c.moveTo(tEndX, tEndY);
        c.lineTo(parts.rightLeg.x, parts.rightLeg.y);
        c.stroke();

        c.restore();
        return;
      }

      // STANDARD ALIVE STICKMAN RENDERING
      const hX = char.x;
      const hY = char.y - 95;
      
      // Face indicator line
      const facingLeft = char.aimAngle < -Math.PI / 2 || char.aimAngle > Math.PI / 2;

      // Professional Soft Dynamic Ground Drop Shadow (provides structural depth)
      c.save();
      c.fillStyle = 'rgba(15, 23, 42, 0.22)';
      c.beginPath();
      c.ellipse(char.x, char.y, 22, 5.5, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();

      // 1. Health Bar overhead
      const barW = 55;
      const barH = 6;
      const barX = char.x - barW / 2;
      const barY = char.y - 125;
      c.fillStyle = 'rgba(0, 0, 0, 0.4)';
      c.fillRect(barX, barY, barW, barH);
      const hpRatio = Math.max(0, char.hp / char.maxHp);
      c.fillStyle = hpRatio > 0.5 ? '#10b981' : hpRatio > 0.25 ? '#f59e0b' : '#ef4444';
      c.fillRect(barX, barY, barW * hpRatio, barH);
      c.strokeStyle = '#ffffff';
      c.lineWidth = 1.2;
      c.strokeRect(barX, barY, barW, barH);

      // Name label / level above bar
      c.fillStyle = '#ffffff';
      c.font = 'bold 9.5px system-ui';
      c.textAlign = 'center';
      if (char.isPlayer) {
        c.fillText(`P${char.playerIndex || 1}`, char.x, barY - 7);
      } else {
        const title = char.id.includes('boss') ? selectedCampaignLevel?.bossName || 'BOSS' : char.id.split('_')[2];
        c.fillText(title ? title.toUpperCase() : 'ORC', char.x, barY - 7);
      }

      // Professional Dynamic Fluid Ninja Scarf/Bandana Tails
      c.save();
      c.lineWidth = 3.5;
      c.lineCap = 'round';
      let scarfColor = '#ef4444'; // Red for standard enemies
      if (char.isPlayer) {
        scarfColor = '#10b981'; // Green for player
      } else if (char.id.includes('boss')) {
        scarfColor = '#a855f7'; // Purple for Bosses
      }
      c.strokeStyle = scarfColor;

      const scarfAnchorX = hX + (facingLeft ? 11 : -11);
      const scarfAnchorY = hY + 6;
      const directionMultiplier = facingLeft ? 1 : -1;

      // Top ribbon tail waving
      c.beginPath();
      c.moveTo(scarfAnchorX, scarfAnchorY);
      const waveOffset1 = Math.sin(now * 0.015 + hX * 0.04) * 6;
      c.bezierCurveTo(
        scarfAnchorX + directionMultiplier * 10, scarfAnchorY + 2 + waveOffset1 * 0.5,
        scarfAnchorX + directionMultiplier * 20, scarfAnchorY - 3 + waveOffset1,
        scarfAnchorX + directionMultiplier * 30, scarfAnchorY + waveOffset1
      );
      c.stroke();

      // Bottom ribbon tail waving
      c.beginPath();
      c.moveTo(scarfAnchorX, scarfAnchorY + 2);
      const waveOffset2 = Math.cos(now * 0.012 + hX * 0.03) * 5;
      c.bezierCurveTo(
        scarfAnchorX + directionMultiplier * 8, scarfAnchorY + 6 + waveOffset2 * 0.5,
        scarfAnchorX + directionMultiplier * 18, scarfAnchorY + waveOffset2,
        scarfAnchorX + directionMultiplier * 26, scarfAnchorY + 4 + waveOffset2
      );
      c.stroke();
      c.restore();

      // 2. Head (black filled circle with white outline)
      c.beginPath();
      c.arc(hX, hY, 15, 0, Math.PI * 2);
      c.fillStyle = '#111111';
      c.fill();
      c.lineWidth = 4.5;
      c.strokeStyle = '#ffffff';
      c.stroke();

      // Professional Feature: Sleek Glowing Neon Eye slit
      c.save();
      const eyeColor = char.isPlayer ? '#06b6d4' : char.id.includes('boss') ? '#fbbf24' : '#ef4444';
      c.fillStyle = eyeColor;
      c.shadowColor = eyeColor;
      c.shadowBlur = 8;
      const eyeX = hX + (facingLeft ? -5.5 : 5.5);
      const eyeY = hY - 1;

      c.beginPath();
      if (facingLeft) {
        c.moveTo(eyeX - 4, eyeY);
        c.lineTo(eyeX + 2, eyeY - 2);
        c.lineTo(eyeX + 1, eyeY + 1);
      } else {
        c.moveTo(eyeX - 2, eyeY - 2);
        c.lineTo(eyeX + 4, eyeY);
        c.lineTo(eyeX - 1, eyeY + 1);
      }
      c.closePath();
      c.fill();

      // Cool trailing laser indicator line in direction of view
      c.strokeStyle = eyeColor;
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(eyeX, eyeY);
      c.lineTo(eyeX + (facingLeft ? -10 : 10), eyeY - 0.5 + Math.sin(now * 0.01) * 1);
      c.globalAlpha = 0.35;
      c.stroke();
      c.restore();

      // 3. Helmet
      if (char.hasHelmet && char.helmetDurability > 0) {
        drawHelmetOnHead(c, hX, hY, facingLeft ? Math.PI : 0, char.helmetType);
      }

      // 4. Torso
      const spineY = char.y - 48;
      c.strokeStyle = char.armorColor === '#3a3a3a' ? '#ffffff' : char.armorColor;
      c.lineWidth = 7.5;
      c.beginPath();
      c.moveTo(char.x, hY + 14);
      c.lineTo(char.x, spineY);
      c.stroke();

      // Professional Feature: Elegant Crossed Combat Harness / Belt Plate
      c.save();
      c.strokeStyle = char.isPlayer ? '#b45309' : '#451a03'; // leather harness straps
      c.lineWidth = 2.2;
      // Shoulder Strap 1
      c.beginPath();
      c.moveTo(char.x - 3.5, hY + 18);
      c.lineTo(char.x + 3.5, spineY - 8);
      c.stroke();
      // Shoulder Strap 2
      c.beginPath();
      c.moveTo(char.x + 3.5, hY + 18);
      c.lineTo(char.x - 3.5, spineY - 8);
      c.stroke();

      // Golden Center Medallion on Chest Harness
      c.fillStyle = '#fbbf24'; 
      c.strokeStyle = '#ffffff';
      c.lineWidth = 0.8;
      c.beginPath();
      c.arc(char.x, hY + 31, 3.5, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.restore();

      // 5. Weapon holding pose (Bows, Spear, Shurikens)
      c.strokeStyle = '#ffffff';
      c.lineWidth = 4;

      const angle = char.aimAngle;
      const holdLength = 30;
      const weaponEndX = char.x + Math.cos(angle) * holdLength;
      const weaponEndY = (char.y - 60) + Math.sin(angle) * holdLength;

      // Arm holding weapon
      c.beginPath();
      c.moveTo(char.x, char.y - 68);
      c.lineTo(weaponEndX, weaponEndY);
      c.stroke();

      // Drawing actual Bow / Spear / Star
      let weaponType = WeaponType.BOW;
      if (char.isPlayer) {
        weaponType = (DEFAULT_WEAPONS.find((w) => w.id === progress.equippedWeaponId) || DEFAULT_WEAPONS[0]).type;
      } else {
        if (char.id.includes('spear')) weaponType = WeaponType.SPEAR;
        else if (char.id.includes('shuriken')) weaponType = WeaponType.SHURIKEN;
      }

      const bowRadius = 22;
      const centerOffsetX = -18;
      const tipX = centerOffsetX + bowRadius * Math.cos(-Math.PI / 2.2);
      const tipY = bowRadius * Math.sin(-Math.PI / 2.2);
      const bottomTipX = centerOffsetX + bowRadius * Math.cos(Math.PI / 2.2);
      const bottomTipY = bowRadius * Math.sin(Math.PI / 2.2);
      const bowStringPull = char.isPulling ? Math.min(22, char.aimStrength * 0.22) : 0;

      if (weaponType === WeaponType.BOW) {
        // Draw elegant bow arc centered at weaponEndX, weaponEndY
        c.save();
        c.translate(weaponEndX, weaponEndY);
        c.rotate(angle);

        c.strokeStyle = '#d97706'; // Wooden brown
        c.lineWidth = 3.5;
        c.beginPath();
        c.arc(centerOffsetX, 0, bowRadius, -Math.PI / 2.2, Math.PI / 2.2);
        c.stroke();

        // Draw bowstring
        c.strokeStyle = 'rgba(255,255,255,0.85)';
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(tipX, tipY);
        c.lineTo(tipX - bowStringPull, 0);
        c.lineTo(bottomTipX, bottomTipY);
        c.stroke();

        // Draw arrow loaded in string
        if (char.isPulling) {
          c.strokeStyle = '#ffffff';
          c.lineWidth = 2.5;
          c.beginPath();
          c.moveTo(tipX - bowStringPull - 6, 0);
          c.lineTo(26, 0);
          c.stroke();
          // Arrow tip
          c.fillStyle = '#06b6d4';
          c.beginPath();
          c.moveTo(26, -4);
          c.lineTo(33, 0);
          c.lineTo(26, 4);
          c.fill();
        }

        c.restore();
      } else if (weaponType === WeaponType.SPEAR) {
        // Draw heavy throw spear
        c.save();
        c.translate(weaponEndX, weaponEndY);
        c.rotate(angle);
        c.strokeStyle = '#d97706';
        c.lineWidth = 4.2;
        c.beginPath();
        c.moveTo(-28, 0);
        c.lineTo(42, 0);
        c.stroke();

        // Steel Tip
        c.fillStyle = '#7a8b99';
        c.beginPath();
        c.moveTo(42, -5.5);
        c.lineTo(58, 0);
        c.lineTo(42, 5.5);
        c.fill();
        c.restore();
      } else {
        // Shuriken star rotating slightly with time
        c.save();
        c.translate(weaponEndX, weaponEndY);
        c.rotate(now / 150);
        c.fillStyle = '#94a3b8';
        c.beginPath();
        for (let i = 0; i < 4; i++) {
          c.rotate(Math.PI / 2);
          c.moveTo(0, 0);
          c.lineTo(-5.5, -5.5);
          c.lineTo(0, -16.5);
          c.lineTo(5.5, -5.5);
        }
        c.fill();
        c.restore();
      }

      // Drawing arm pulling bow (if pulling)
      if (char.isPulling && weaponType === WeaponType.BOW) {
        const pullAmount = tipX - bowStringPull;
        const pullX = weaponEndX + Math.cos(angle) * pullAmount;
        const pullY = weaponEndY + Math.sin(angle) * pullAmount;
        c.strokeStyle = '#ffffff';
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(char.x, char.y - 68);
        c.lineTo(pullX, pullY);
        c.stroke();
      } else {
        // Relaxed other arm
        c.beginPath();
        c.moveTo(char.x, char.y - 68);
        c.lineTo(char.x + (facingLeft ? 16 : -16), char.y - 40);
        c.stroke();
      }

      // 6. Draw Shield in front
      if (char.hasShield && char.shieldHp > 0) {
        const shieldX = char.x + (facingLeft ? -25 : 25);
        const shieldY = char.y - 55;
        
        // Draw beautiful circular wooden shield
        c.save();
        c.fillStyle = '#8B5A2B';
        c.strokeStyle = '#5c3a1c';
        c.lineWidth = 4;
        c.beginPath();
        c.arc(shieldX, shieldY, 20, 0, Math.PI * 2);
        c.fill();
        c.stroke();

        // Steel center stud
        c.fillStyle = '#cbd5e1';
        c.beginPath();
        c.arc(shieldX, shieldY, 5.5, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }

      // 7. Legs (Standing position)
      c.strokeStyle = '#ffffff';
      c.lineWidth = 4.8;
      // Left leg
      c.beginPath();
      c.moveTo(char.x, spineY);
      c.lineTo(char.x - 14, char.y - 24);
      c.lineTo(char.x - 11, char.y);
      c.stroke();
      // Right leg
      c.beginPath();
      c.moveTo(char.x, spineY);
      c.lineTo(char.x + 14, char.y - 24);
      c.lineTo(char.x + 16, char.y);
      c.stroke();

      // 8. Active Spell effects overlays
      if (char.activeShieldBubble) {
        c.save();
        const bubbleGrad = c.createRadialGradient(char.x, char.y - 55, 25, char.x, char.y - 55, 65);
        bubbleGrad.addColorStop(0, 'rgba(6, 182, 212, 0.05)');
        bubbleGrad.addColorStop(0.8, 'rgba(6, 182, 212, 0.25)');
        bubbleGrad.addColorStop(1, 'rgba(6, 182, 212, 0.6)');
        c.fillStyle = bubbleGrad;
        c.beginPath();
        c.arc(char.x, char.y - 55, 65, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }

      // Frozen state overlay
      if (char.isFrozen) {
        c.fillStyle = 'rgba(147, 197, 253, 0.35)';
        c.strokeStyle = '#60a5fa';
        c.lineWidth = 2.5;
        c.beginPath();
        c.arc(char.x, char.y - 55, 65, 0, Math.PI * 2);
        c.fill();
        c.stroke();
      }

      // Burning state fire sparks
      if (char.isBurning && Math.random() > 0.6) {
        stateRef.current.particles.push({
          x: char.x + (Math.random() - 0.5) * 40,
          y: char.y - 25 - Math.random() * 65,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -2 - Math.random() * 3,
          color: '#ef4444',
          size: 4 + Math.random() * 4,
          alpha: 1,
          life: 0,
          maxLife: 20 + Math.random() * 20,
          gravity: -0.05,
        });
      }

      c.restore();
    };

    const drawHelmetOnHead = (c: CanvasRenderingContext2D, hX: number, hY: number, angle: number, helmetType: string) => {
      c.save();
      c.translate(hX, hY);
      c.rotate(angle);
      c.scale(1.35, 1.35); // Scale the helmet drawing automatically to match 1.35x larger heads!

      if (helmetType === 'viking') {
        // Draw horns + cap
        c.fillStyle = '#cbd5e1';
        c.strokeStyle = '#ffffff';
        c.lineWidth = 1.5;

        // Cap dome
        c.beginPath();
        c.arc(0, -9, 11, Math.PI, 0);
        c.fill();
        c.stroke();

        // Left Horn
        c.fillStyle = '#ffffff';
        c.beginPath();
        c.moveTo(-9, -11);
        c.quadraticCurveTo(-18, -18, -14, -26);
        c.quadraticCurveTo(-11, -16, -5, -13);
        c.fill();
        c.stroke();

        // Right Horn
        c.beginPath();
        c.moveTo(9, -11);
        c.quadraticCurveTo(18, -18, 14, -26);
        c.quadraticCurveTo(11, -16, 5, -13);
        c.fill();
        c.stroke();
      } else if (helmetType === 'knight') {
        // Full iron visor
        c.fillStyle = '#64748b';
        c.strokeStyle = '#ffffff';
        c.lineWidth = 2;

        c.beginPath();
        c.arc(0, -9, 12, Math.PI * 1.1, Math.PI * 1.9);
        c.lineTo(11, -2);
        c.lineTo(-11, -2);
        c.closePath();
        c.fill();
        c.stroke();

        // Visor slit
        c.fillStyle = '#111111';
        c.fillRect(-6, -10, 12, 2.5);
      } else if (helmetType === 'wizard') {
        // Pointy hat
        c.fillStyle = '#4338ca';
        c.strokeStyle = '#ffffff';
        c.lineWidth = 1.5;

        // Brim
        c.beginPath();
        c.ellipse(0, -8, 16, 4, 0, 0, Math.PI * 2);
        c.fill();
        c.stroke();

        // Cone
        c.beginPath();
        c.moveTo(-10, -10);
        c.lineTo(0, -32);
        c.lineTo(10, -10);
        c.closePath();
        c.fill();
        c.stroke();

        // Star accent
        c.fillStyle = '#fbbf24';
        c.beginPath();
        c.arc(0, -33, 2, 0, Math.PI * 2);
        c.fill();
      } else if (helmetType === 'crown') {
        // Gold Crown
        c.fillStyle = '#f59e0b';
        c.strokeStyle = '#ffffff';
        c.lineWidth = 1.8;

        c.beginPath();
        c.moveTo(-11, -10);
        c.lineTo(-11, -18);
        c.lineTo(-5, -12);
        c.lineTo(0, -22);
        c.lineTo(5, -12);
        c.lineTo(11, -18);
        c.lineTo(11, -10);
        c.closePath();
        c.fill();
        c.stroke();

        // Jewels
        c.fillStyle = '#ef4444';
        c.beginPath();
        c.arc(0, -14, 2, 0, Math.PI * 2);
        c.fill();
      }

      c.restore();
    };

    const drawProjectile = (c: CanvasRenderingContext2D, proj: Projectile) => {
      const now = Date.now();
      c.save();
      c.translate(proj.x, proj.y);
      const angle = Math.atan2(proj.vy, proj.vx);
      c.rotate(angle);

      // Draw particle trails
      if (proj.isSpellFire) {
        c.shadowColor = '#f97316';
        c.shadowBlur = 8;
        c.strokeStyle = '#ea580c';
      } else if (proj.isSpellIce) {
        c.shadowColor = '#60a5fa';
        c.shadowBlur = 8;
        c.strokeStyle = '#2563eb';
      } else {
        c.strokeStyle = '#ffffff';
      }

      if (proj.type === WeaponType.BOW) {
        // Draw clean standard arrow
        c.lineWidth = 2.5;
        c.beginPath();
        c.moveTo(-15, 0);
        c.lineTo(12, 0);
        c.stroke();

        // Arrow feathers
        c.strokeStyle = 'rgba(255,255,255,0.6)';
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(-15, 0);
        c.lineTo(-19, -4);
        c.moveTo(-12, 0);
        c.lineTo(-16, -4);
        c.moveTo(-15, 0);
        c.lineTo(-19, 4);
        c.moveTo(-12, 0);
        c.lineTo(-16, 4);
        c.stroke();

        // Sharp point
        c.fillStyle = '#cbd5e1';
        c.beginPath();
        c.moveTo(12, -3);
        c.lineTo(19, 0);
        c.lineTo(12, 3);
        c.fill();
      } else if (proj.type === WeaponType.SPEAR) {
        // Heavy wood spear
        c.strokeStyle = '#b45309';
        c.lineWidth = 3.5;
        c.beginPath();
        c.moveTo(-25, 0);
        c.lineTo(20, 0);
        c.stroke();

        // Big blade tip
        c.fillStyle = '#94a3b8';
        c.beginPath();
        c.moveTo(20, -5);
        c.lineTo(34, 0);
        c.lineTo(20, 5);
        c.fill();
      } else {
        // Rotating Shuriken Star
        c.restore();
        c.save();
        c.translate(proj.x, proj.y);
        c.rotate(now / 40); // Fast spinning flight!
        c.fillStyle = '#cbd5e1';
        c.beginPath();
        for (let i = 0; i < 4; i++) {
          c.rotate(Math.PI / 2);
          c.moveTo(0, 0);
          c.lineTo(-3, -3);
          c.lineTo(0, -11);
          c.lineTo(3, -3);
        }
        c.fill();
      }

      c.restore();
    };

    const drawFlyingHelmet = (c: CanvasRenderingContext2D, fh: FlyingHelmet) => {
      drawHelmetOnHead(c, fh.x, fh.y, fh.angle, fh.type);
    };

    const drawFlyingShield = (c: CanvasRenderingContext2D, fs: FlyingShield) => {
      c.save();
      c.translate(fs.x, fs.y);
      c.rotate(fs.angle);
      c.fillStyle = '#8B5A2B';
      c.strokeStyle = '#5c3a1c';
      c.lineWidth = 4;
      c.beginPath();
      c.arc(0, 0, 20, 0, Math.PI * 2); // Larger flying shields
      c.fill();
      c.stroke();
      c.restore();
    };

    const drawParticle = (c: CanvasRenderingContext2D, part: Particle) => {
      c.save();
      c.fillStyle = part.color;
      c.globalAlpha = part.alpha;
      c.beginPath();
      c.arc(part.x, part.y, part.size, 0, Math.PI * 2);
      c.fill();
      c.restore();
    };

    // Draw active prediction dotted trajectory line when pulling
    const drawAimLine = (c: CanvasRenderingContext2D) => {
      const state = stateRef.current;
      const actChar = state.characters.find(char => char.isPlayer && char.id === (mode === GameMode.TWO_PLAYER ? `p${turn}` : 'player'));
      if (!actChar || !actChar.isPulling || !state.aimStart || !state.aimCurrent) return;

      const angle = actChar.aimAngle;
      const strength = actChar.aimStrength;

      let weapon = DEFAULT_WEAPONS[0];
      if (actChar.isPlayer) {
        weapon = DEFAULT_WEAPONS.find((w) => w.id === progress.equippedWeaponId) || DEFAULT_WEAPONS[0];
      }

      // Start predicting parabolic steps (scaled up)
      const startX = actChar.x + Math.cos(angle) * 40;
      const startY = actChar.y - 60 + Math.sin(angle) * 40;
      const baseVel = strength * 0.22 * weapon.speedMultiplier;
      let px = startX;
      let py = startY;
      let pvx = Math.cos(angle) * baseVel;
      let pvy = Math.sin(angle) * baseVel;

      c.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      c.lineWidth = 2.5;
      c.setLineDash([4, 6]);
      c.beginPath();
      c.moveTo(px, py);

      // Simulate 16 steps of flight trajectory prediction
      for (let i = 0; i < 16; i++) {
        px += pvx;
        py += pvy;
        pvy += 0.25 * weapon.gravityMultiplier; // apply simulated gravity step

        // Wind drag impact
        pvx += (wind.speed * wind.direction * 0.005);

        c.lineTo(px, py);
      }
      c.stroke();
      c.setLineDash([]); // clear dash
    };

    // Core Frame Logic updates (Physics, Collisions, Splatters, AI Aiming)
    const updateGameLogic = () => {
      const state = stateRef.current;

      // 1. Update Projectiles
      for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const proj = state.projectiles[i];

        // Apply velocities
        proj.x += proj.vx;
        proj.y += proj.vy;
        proj.vy += 0.25 * proj.gravityMult; // apply gravity drop

        // Wind effect
        proj.vx += (wind.speed * wind.direction * 0.005);

        // Record projectile trail for glowing streak effect
        proj.trail.push({ x: proj.x, y: proj.y });
        if (proj.trail.length > 8) proj.trail.shift();

        // Trail particles
        if (Math.random() > 0.5) {
          state.particles.push({
            x: proj.x,
            y: proj.y,
            vx: -proj.vx * 0.2,
            vy: -proj.vy * 0.2,
            color: proj.isSpellFire ? '#f97316' : proj.isSpellIce ? '#60a5fa' : 'rgba(255,255,255,0.4)',
            size: 1.5 + Math.random() * 2,
            alpha: 0.8,
            life: 0,
            maxLife: 15,
            gravity: 0.02,
          });
        }

        // Boundary check (offscreen boundaries)
        if (proj.y > 430) {
          // Hit standard Floor
          spawnImpactParticles(proj.x, 430, '#cbd5e1', 12);
          state.projectiles.splice(i, 1);
          audio.playClick();
          continue;
        }

        if (proj.x < 0 || proj.x > LOGICAL_WIDTH || proj.y < -300) {
          state.projectiles.splice(i, 1);
          continue;
        }

        // Check platform collisions
        const onPlatform = checkPlatformHit(proj.x, proj.y);
        if (onPlatform) {
          spawnImpactParticles(proj.x, proj.y, '#7c2d12', 10);
          state.projectiles.splice(i, 1);
          audio.playClick();
          continue;
        }

        // Check character collision
        let hitSomething = false;
        for (let j = 0; j < state.characters.length; j++) {
          const char = state.characters[j];
          if (char.isDead || char.id === proj.ownerId) continue;

          // Check Shield Deflection first
          if (char.hasShield && char.shieldHp > 0) {
            const facingLeft = char.aimAngle < -Math.PI / 2 || char.aimAngle > Math.PI / 2;
            const shieldX = char.x + (facingLeft ? -25 : 25);
            const shieldY = char.y - 55;
            const distToShield = Math.hypot(proj.x - shieldX, proj.y - shieldY);

            if (distToShield < 24) {
              // Shield Block!
              char.shieldHp -= proj.damage * 0.5;
              audio.playShieldDeflect();
              spawnImpactParticles(proj.x, proj.y, '#8B5A2B', 14);

              // If shield breaks, spin shield away
              if (char.shieldHp <= 0) {
                state.flyingShields.push({
                  x: shieldX,
                  y: shieldY,
                  vx: proj.vx * 0.4,
                  vy: -3 - Math.random() * 3,
                  angle: 0,
                  angularVelocity: 0.2,
                });
                char.hasShield = false;
              }

              state.projectiles.splice(i, 1);
              hitSomething = true;
              break;
            }
          }

          // Check active Aegis shield spell
          if (char.activeShieldBubble) {
            const bubbleDist = Math.hypot(proj.x - char.x, proj.y - (char.y - 55));
            if (bubbleDist < 65) {
              char.activeShieldBubble = false;
              spawnImpactParticles(proj.x, proj.y, '#06b6d4', 30);
              audio.playHeadshot(true); // metallic shatter
              state.projectiles.splice(i, 1);
              hitSomething = true;
              break;
            }
          }

          // Check regular limbs colliders (Head, Torso, Legs)
          // 1. Headshot
          const headX = char.x;
          const headY = char.y - 95;
          const distToHead = Math.hypot(proj.x - headX, proj.y - headY);
          if (distToHead < 20) {
            // HEADSHOT HIT!
            hitSomething = true;
            if (char.hasHelmet && char.helmetDurability > 0) {
              // Helmet absorbing hit
              char.helmetDurability -= 1;
              audio.playHeadshot(true);
              spawnImpactParticles(proj.x, proj.y, '#94a3b8', 15);

              // spawn flying helmet
              state.flyingHelmets.push({
                x: headX,
                y: headY - 10,
                vx: proj.vx * 0.3 + (Math.random() - 0.5) * 2,
                vy: -4 - Math.random() * 4,
                angularVelocity: 0.1 + Math.random() * 0.2,
                angle: 0,
                type: char.helmetType as any,
              });

              char.hasHelmet = false; // helmet flies off
            } else {
              // Devastating clean headshot (3.0x damage)
              const finalDamage = proj.damage * 3.0;
              char.hp -= finalDamage;
              setHeadshotAlert({ x: char.x, y: char.y - 100, text: 'HEADSHOT!', timer: 30 });
              audio.playHeadshot(false);
              spawnImpactParticles(proj.x, proj.y, '#990000', 35); // blood explosion

              // Score progression
              if (proj.ownerId === 'player' || proj.ownerId.startsWith('p1')) {
                state.score += 200;
              }
            }

            applyProjectSpellEffects(char, proj);
            checkDeath(char, proj.x, proj.y);
            state.projectiles.splice(i, 1);
            break;
          }

          // 2. Torso hit
          const torsoX = char.x;
          const torsoTopY = char.y - 81;
          const torsoBottomY = char.y - 28;
          // Approximate segment distance
          const distToTorso = distanceToSegment(proj.x, proj.y, torsoX, torsoTopY, torsoX, torsoBottomY);
          if (distToTorso < 16) {
            // Torso Hit!
            char.hp -= proj.damage;
            audio.playHit();
            spawnImpactParticles(proj.x, proj.y, '#aa1111', 15);

            if (proj.ownerId === 'player' || proj.ownerId.startsWith('p1')) {
              state.score += 80;
            }

            applyProjectSpellEffects(char, proj);
            checkDeath(char, proj.x, proj.y);
            state.projectiles.splice(i, 1);
            hitSomething = true;
            break;
          }

          // 3. Legs hit (reduced damage)
          const legBottomY = char.y;
          const distToLegs = distanceToSegment(proj.x, proj.y, char.x, torsoBottomY, char.x, legBottomY);
          if (distToLegs < 16) {
            // Legs hit (0.6x damage)
            char.hp -= proj.damage * 0.6;
            audio.playHit();
            spawnImpactParticles(proj.x, proj.y, '#991111', 10);

            if (proj.ownerId === 'player' || proj.ownerId.startsWith('p1')) {
              state.score += 50;
            }

            applyProjectSpellEffects(char, proj);
            checkDeath(char, proj.x, proj.y);
            state.projectiles.splice(i, 1);
            hitSomething = true;
            break;
          }
        }

        if (hitSomething) {
          state.cameraShake = 5;
          break;
        }
      }

      // 2. Apply DOT effects (Burning, Freezing, Shaman healing shields, etc.)
      state.characters.forEach((char) => {
        if (char.isDead) {
          // If dead, tick ragdoll kinematics physics
          if (char.ragdollActive) {
            char.ragdollTime += 1;
            // Update physical limbs
            Object.keys(char.ragdollParts).forEach((key) => {
              const part = char.ragdollParts[key];
              part.x += part.vx;
              part.y += part.vy;
              part.vy += 0.3; // standard gravity fall
              part.vx *= 0.98; // air drag
              part.angle += part.av;

              // Collision with ground plane H = 430
              if (part.y > 430) {
                part.y = 430;
                part.vy = -part.vy * 0.35; // bounce absorption
                part.vx *= 0.7; // high ground friction
                part.av *= 0.5;
              }
            });

            // Stop simulation after 180 frames to optimize
            if (char.ragdollTime > 180) {
              char.ragdollActive = false;
            }
          }
          return;
        }

        // Ticking states
        if (char.isBurning) {
          if (Math.random() > 0.9) {
            char.hp -= 4; // periodic ticks
            char.burnTicks--;
            if (char.burnTicks <= 0) char.isBurning = false;
            checkDeath(char, char.x, char.y);
          }
        }

        if (char.isFrozen) {
          char.freezeDuration -= 0.016; // around 60fps
          if (char.freezeDuration <= 0) {
            char.isFrozen = false;
          }
        }

        // 3. Enemy AI Shoot loops (Only tick for Campaign/Survival)
        if (!char.isPlayer && mode !== GameMode.TWO_PLAYER) {
          if (char.aiCooldown > 0) {
            // If frozen, cooldown ticks slower!
            char.aiCooldown -= char.isFrozen ? 0.4 : 1.0;
          } else {
            // Trigger AI aim & shoot
            executeEnemyAIShot(char);
          }
        }
      });

      // 4. Update Flying Equipment
      for (let i = state.flyingHelmets.length - 1; i >= 0; i--) {
        const fh = state.flyingHelmets[i];
        fh.x += fh.vx;
        fh.y += fh.vy;
        fh.vy += 0.25; // gravity
        fh.angle += fh.angularVelocity;
        if (fh.y > 430) {
          state.flyingHelmets.splice(i, 1); // remove on hitting ground
        }
      }

      for (let i = state.flyingShields.length - 1; i >= 0; i--) {
        const fs = state.flyingShields[i];
        fs.x += fs.vx;
        fs.y += fs.vy;
        fs.vy += 0.28;
        fs.angle += fs.angularVelocity;
        if (fs.y > 430) {
          state.flyingShields.splice(i, 1);
        }
      }

      // 5. Update Particles
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const part = state.particles[i];
        part.life++;
        part.x += part.vx;
        part.y += part.vy;
        if (part.gravity) part.vy += part.gravity;
        part.alpha = 1 - part.life / part.maxLife;

        if (part.life >= part.maxLife || part.y > 430) {
          state.particles.splice(i, 1);
        }
      }

      // 6. Check Match Victory/Defeat Conditions
      evaluateGameConditions();
    };

    const checkPlatformHit = (px: number, py: number): boolean => {
      // Check collision against current platform definitions
      const env = selectedCampaignLevel?.environment || EnvironmentType.GREEN_FIELDS;
      if (env === EnvironmentType.ORCS_WOODS) {
        if (px >= 100 && px <= 200 && py >= 350 && py <= 362) return true;
        if (px >= 750 && px <= 870 && py >= 280 && py <= 292) return true;
      } else if (env === EnvironmentType.LAVA_LANDS) {
        if (px >= 120 && px <= 210 && py >= 320 && py <= 335) return true;
        if (px >= 450 && px <= 560 && py >= 260 && py <= 275) return true;
        if (px >= 780 && px <= 870 && py >= 320 && py <= 335) return true;
      } else {
        if (px >= 450 && px <= 570 && py >= 330 && py <= 340) return true;
      }
      return false;
    };

    const distanceToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
      const l2 = (x1 - x2) ** 2 + (y1 - y2) ** 2;
      if (l2 === 0) return Math.hypot(px - x1, py - y1);
      let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
    };

    const applyProjectSpellEffects = (target: Character, proj: Projectile) => {
      if (proj.isSpellFire) {
        target.isBurning = true;
        target.burnTicks = 5;
      }
      if (proj.isSpellIce) {
        target.isFrozen = true;
        target.freezeDuration = 3.5; // Freeze for 3.5 seconds
      }
    };

    const checkDeath = (char: Character, hX: number, hY: number) => {
      if (char.hp <= 0 && !char.isDead) {
        char.hp = 0;
        char.isDead = true;
        triggerRagdoll(char, hX, hY);

        if (!char.isPlayer) {
          // Earn standard kill rewards
          stateRef.current.coinsEarned += 10;
        }
      }
    };

    const executeEnemyAIShot = (enemy: Character) => {
      const state = stateRef.current;
      const target = state.characters.find(c => c.isPlayer && !c.isDead);
      if (!target) return;

      // Enemy AI Aiming with dynamic learn/offset logic:
      // The AI calculates the correct baseline angle towards the player
      const dx = target.x - enemy.x;
      const dy = (target.y - 45) - (enemy.y - 45);
      const dist = Math.hypot(dx, dy);

      // Parabolic estimation
      const gravity = 0.25;
      // Angle estimation
      let baselineAngle = Math.atan2(dy, dx);

      // AI "Aim Offset" is applied. This offsets the shot to make the AI miss on early attempts.
      // Every turn, the AI reduces its offset, simulating a "zeroing in" learning effect!
      const finalOffset = (Math.random() - 0.5) * enemy.aiAimOffset;
      baselineAngle += (finalOffset * Math.PI / 180);

      // Speed selection
      const launchStrength = Math.min(100, Math.max(40, dist * 0.15 + (Math.random() - 0.5) * 10));

      // Update AI posture visually
      enemy.aimAngle = baselineAngle;
      enemy.isPulling = true;
      enemy.aimStrength = launchStrength;

      // Delayed launch so the player sees the AI aiming at them!
      setTimeout(() => {
        if (enemy.isDead) return;
        enemy.isPulling = false;
        launchProjectile(enemy, baselineAngle, launchStrength);

        // Learn/Zero-In: reduce aim offset for next shots
        enemy.aiAimOffset = Math.max(1.5, enemy.aiAimOffset * 0.7);
        enemy.aiCooldown = 150 + Math.random() * 120; // reset shoot timer
      }, 700);
    };

    const evaluateGameConditions = () => {
      const state = stateRef.current;

      if (mode === GameMode.TWO_PLAYER) {
        // Local 2 Player Duel check
        const p1 = state.characters.find(c => c.id === 'p1');
        const p2 = state.characters.find(c => c.id === 'p2');

        if (p1?.isDead && !state.gameEnded) {
          state.gameEnded = true;
          audio.playGameOver();
          onGameOver({ victory: false, earnedCoins: 0 }); // Player 2 Wins
        } else if (p2?.isDead && !state.gameEnded) {
          state.gameEnded = true;
          audio.playLevelUp();
          onGameOver({ victory: true, earnedCoins: 0 }); // Player 1 Wins
        }
      } else {
        // Campaign / Survival Single Player check
        const player = state.characters.find(c => c.id === 'player');
        const aliveEnemies = state.characters.filter(c => !c.isPlayer && !c.isDead);

        if (player?.isDead && !state.gameEnded) {
          state.gameEnded = true;
          audio.playGameOver();
          onGameOver({
            victory: false,
            earnedCoins: Math.floor(state.coinsEarned / 2),
            score: state.score,
          });
        } else if (aliveEnemies.length === 0 && !state.gameEnded) {
          state.gameEnded = true;
          audio.playLevelUp();

          let reward = 0;
          if (mode === GameMode.CAMPAIGN && selectedCampaignLevel) {
            reward = selectedCampaignLevel.rewardCoins;
            // Unlock next stage
            const nextLevel = Math.max(progress.campaignLevel, selectedCampaignLevel.id + 1);
            onUpdateProgress({
              coins: progress.coins + reward + state.coinsEarned,
              campaignLevel: nextLevel,
            });
          } else {
            // Survival mode survival wave bonus
            reward = state.survivalWave * 25;
            onUpdateProgress({
              coins: progress.coins + reward + state.coinsEarned,
              highScore: Math.max(progress.highScore, state.score),
            });
          }

          onGameOver({
            victory: true,
            earnedCoins: reward + state.coinsEarned,
            score: state.score,
          });
        }
      }
    };

    // Begin looping
    loop();

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [gameState, mode, selectedCampaignLevel, turn]);

  // Touch and Mouse pulling event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing' || stateRef.current.gameEnded) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * LOGICAL_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * LOGICAL_HEIGHT;

    // Check which character's turn/player is drawing
    const player = stateRef.current.characters.find(
      (c) => c.isPlayer && c.id === (mode === GameMode.TWO_PLAYER ? `p${turn}` : 'player')
    );
    if (!player || player.isDead) return;

    // If click is near the player, initiate pulling
    const dist = Math.hypot(x - player.x, y - (player.y - 45));
    if (dist < 100) {
      stateRef.current.aimStart = { x, y };
      stateRef.current.aimCurrent = { x, y };
      player.isPulling = true;
      audio.playStretch();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const state = stateRef.current;
    if (!state.aimStart) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * LOGICAL_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * LOGICAL_HEIGHT;

    state.aimCurrent = { x, y };

    const player = state.characters.find(
      (c) => c.isPlayer && c.id === (mode === GameMode.TWO_PLAYER ? `p${turn}` : 'player')
    );
    if (!player) return;

    // Calculate pull dx/dy
    const dx = state.aimStart.x - x;
    const dy = state.aimStart.y - y;
    
    // Set Aim Parameters
    player.aimAngle = Math.atan2(dy, dx);
    player.aimStrength = Math.min(100, Math.sqrt(dx * dx + dy * dy));

    if (Math.random() > 0.8) {
      audio.playStretch(); // Creak string sound on continuous pull
    }
  };

  const handlePointerUp = () => {
    const state = stateRef.current;
    if (!state.aimStart) return;

    const player = state.characters.find(
      (c) => c.isPlayer && c.id === (mode === GameMode.TWO_PLAYER ? `p${turn}` : 'player')
    );

    if (player && player.isPulling) {
      player.isPulling = false;
      // Launch projectile!
      launchProjectile(player, player.aimAngle, player.aimStrength);

      // In Local 2 Player Mode, alternate turn after shot
      if (mode === GameMode.TWO_PLAYER) {
        setTimeout(() => {
          setTurn((prev) => (prev === 1 ? 2 : 1));
        }, 1200); // Small transition buffer for arrow tracking
      }
    }

    state.aimStart = null;
    state.aimCurrent = null;
  };

  // Start sequence
  useEffect(() => {
    initGame();
  }, [mode, selectedCampaignLevel]);

  return (
    <div className="w-full flex flex-col items-center select-none" ref={containerRef} id="battle-view">
      {/* Upper HUD Header */}
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 text-white rounded-t-2xl p-4 flex flex-wrap justify-between items-center gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              audio.playClick();
              onBack();
            }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
            id="forfeit-battle-btn"
          >
            ← Forfeit
          </button>
          <div>
            <div className="text-xs text-slate-400 font-bold tracking-widest uppercase">
              {mode === GameMode.TWO_PLAYER ? 'Local 2 Players' : selectedCampaignLevel ? `Campaign: ${selectedCampaignLevel.name}` : 'Survival Wave'}
            </div>
            <div className="text-sm font-black text-amber-400 flex items-center gap-1.5">
              Score: {stateRef.current.score}
              {mode === GameMode.SURVIVAL && (
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded ml-2">
                  Wave {stateRef.current.survivalWave}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Wind Indicator */}
        <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-400 font-semibold uppercase">Wind:</span>
          <div className="flex items-center gap-1">
            {wind.speed === 0 ? (
              <span className="text-slate-500 font-bold">Calm</span>
            ) : (
              <>
                <span className="text-cyan-400 font-black">
                  {wind.direction === 1 ? '→' : '←'} {wind.speed} m/s
                </span>
                <span className="text-slate-500">
                  {wind.speed === 3 ? '💨 Strong' : '🍃 Light'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Local 2P Turn Overlay */}
        {mode === GameMode.TWO_PLAYER && (
          <div className="bg-emerald-950/40 border border-emerald-800/40 px-4 py-2 rounded-xl text-center">
            <span className="text-xs text-emerald-400 font-bold block uppercase tracking-wider">Active Archer</span>
            <span className="text-sm font-extrabold text-white">Player {turn}</span>
          </div>
        )}

        {/* Game Sound control */}
        <button
          onClick={handleToggleMute}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
          id="toggle-battle-mute-btn"
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>

      {/* Main interactive Canvas */}
      <div className="w-full max-w-5xl relative overflow-hidden bg-emerald-900 border-x border-slate-900" id="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={LOGICAL_WIDTH}
          height={LOGICAL_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-auto block aspect-[1000/550] touch-none cursor-crosshair bg-slate-900 shadow-inner"
          id="game-physics-canvas"
        />

        {/* Local Spell casting interface */}
        {mode !== GameMode.TWO_PLAYER && progress.equippedSpellId && (
          <div className="absolute bottom-5 left-5 bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col gap-2 shadow-lg backdrop-blur-sm">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block text-center">Magic Spell</span>
            {DEFAULT_SPELLS.filter(s => s.id === progress.equippedSpellId).map(spell => (
              <button
                key={spell.id}
                onClick={() => activateSpell(spell.type)}
                disabled={activeSpellCooldown > 0}
                className={`py-2 px-4 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-between gap-3 shadow-md ${
                  activeSpellCooldown > 0
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white'
                }`}
              >
                <span>{spell.name}</span>
                <span className="bg-slate-950/60 py-0.5 px-2 rounded text-[10px] font-mono">
                  {activeSpellCooldown > 0 ? `${activeSpellCooldown} CD` : 'Ready'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Control Help Tip Panel */}
      <div className="w-full max-w-5xl bg-slate-50 border border-t-0 border-slate-200 rounded-b-2xl p-4 text-xs text-slate-500 text-center flex flex-col sm:flex-row justify-center items-center gap-3">
        <span className="font-bold text-slate-700">🎯 Controls:</span>
        <span>Tap/Click & Pull near your Stickman Archer to draw bow. Drag to change angle/strength, and Release to shoot!</span>
        <span className="text-slate-300">|</span>
        <span className="text-red-500 font-bold">💥 Headshots deal 3x damage!</span>
      </div>
    </div>
  );
}
