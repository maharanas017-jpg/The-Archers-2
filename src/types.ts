export enum WeaponType {
  BOW = 'BOW',
  SPEAR = 'SPEAR',
  SHURIKEN = 'SHURIKEN',
}

export interface Weapon {
  id: string;
  name: string;
  type: WeaponType;
  damage: number;
  speedMultiplier: number;
  gravityMultiplier: number;
  cost: number;
  unlocked: boolean;
  description: string;
}

export interface Helmet {
  id: string;
  name: string;
  defense: number; // damage reduction multiplier (e.g. 0.5 = 50% damage taken)
  durability: number; // hits it can take before breaking
  cost: number;
  unlocked: boolean;
  visualType: 'viking' | 'gladiator' | 'wizard' | 'crown' | 'knight' | 'none';
  description: string;
}

export interface Armor {
  id: string;
  name: string;
  extraHealth: number;
  cost: number;
  unlocked: boolean;
  visualColor: string;
  description: string;
}

export enum SpellType {
  FIRE = 'FIRE',
  ICE = 'ICE',
  SHIELD = 'SHIELD',
  TRIPLE = 'TRIPLE',
}

export interface Spell {
  id: string;
  name: string;
  type: SpellType;
  cooldown: number; // in turns/seconds
  duration: number; // in seconds/effects
  cost: number;
  unlocked: boolean;
  description: string;
}

export interface UserProgress {
  coins: number;
  campaignLevel: number;
  equippedWeaponId: string;
  equippedHelmetId: string;
  equippedArmorId: string;
  equippedSpellId: string | null;
  unlockedWeaponIds: string[];
  unlockedHelmetIds: string[];
  unlockedArmorIds: string[];
  unlockedSpellIds: string[];
  highScore: number;
}

export enum GameMode {
  CAMPAIGN = 'CAMPAIGN',
  SURVIVAL = 'SURVIVAL',
  TWO_PLAYER = 'TWO_PLAYER',
}

export enum EnvironmentType {
  GREEN_FIELDS = 'GREEN_FIELDS',
  ORCS_WOODS = 'ORCS_WOODS',
  LAVA_LANDS = 'LAVA_LANDS',
}

export interface LevelConfig {
  id: number;
  name: string;
  environment: EnvironmentType;
  enemyCount: number;
  enemyTypes: Array<'archer' | 'spearman' | 'shieldman' | 'wizard' | 'boss'>;
  bossName?: string;
  rewardCoins: number;
  description: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  gravity?: number;
}

export interface FlyingHelmet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angularVelocity: number;
  angle: number;
  type: 'viking' | 'gladiator' | 'wizard' | 'crown' | 'knight';
}

export interface FlyingShield {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  angularVelocity: number;
}
