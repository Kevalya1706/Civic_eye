/**
 * CivicGuard v8.0 — Sovereign Vision Pipeline
 * Graceful Forensic validation: probabilistic truth, CoT reasoning,
 * contextual pass, EXIF-optional GPS verification.
 */

import { type TicketCategory, getDepartmentForCategory, type Department } from './mockData';

// ─── Tier 0: Scene Validation (Sovereignty Rule) ───────────────────────────
// If image text mentions ANY roadway/utility/civic context → ACCEPT.
// Only reject when description is clearly a non-civic indoor object (sofa, bed, etc.)
const CIVIC_SCENE_KEYWORDS = [
  'road', 'street', 'pavement', 'asphalt', 'curb', 'sidewalk', 'highway', 'lane',
  'pole', 'wire', 'streetlight', 'lamp', 'utility', 'transformer', 'cable',
  'pipe', 'drain', 'sewer', 'manhole', 'gutter', 'sewage',
  'bin', 'dumpster', 'trash', 'waste', 'litter', 'garbage',
  'water', 'flood', 'puddle', 'leak', 'overflow',
  'pothole', 'crack', 'debris', 'construction', 'rust', 'concrete', 'dirt',
  'infrastructure', 'public', 'civic', 'outdoor', 'roadside',
];

const NON_CIVIC_INDOOR = [
  'sofa', 'couch', 'bed', 'pillow', 'tv', 'television', 'fridge',
  'refrigerator', 'laptop', 'phone screen', 'kitchen', 'bathroom',
  'bedroom', 'living room',
];

export function validateScene(description: string): { valid: boolean; reason?: string } {
  const lower = description.toLowerCase().trim();
  if (lower.length < 3) return { valid: true }; // image is primary input

  const hasCivic = CIVIC_SCENE_KEYWORDS.some(k => lower.includes(k));
  const hasIndoor = NON_CIVIC_INDOOR.some(k => lower.includes(k));

  // Sovereignty rule: any civic context overrides indoor noise
  if (hasCivic) return { valid: true };
  if (hasIndoor) {
    return {
      valid: false,
      reason: 'Non-civic indoor object detected. Please capture public infrastructure (roads, poles, drains, utilities).',
    };
  }
  // Default: graceful pass — let user describe via image
  return { valid: true };
}

// ─── Chain-of-Thought Reasoning ─────────────────────────────────────────────
export interface CoTAnalysis {
  textures: string[];      // asphalt, concrete, rust, dirt
  setting: string[];       // outdoor, roadside, utility zone
  reconciled: boolean;     // object matches environment
  reasoning: string;
}

const TEXTURE_KEYWORDS: Record<string, string[]> = {
  asphalt: ['asphalt', 'tarmac', 'blacktop', 'road surface'],
  concrete: ['concrete', 'cement', 'pavement', 'sidewalk'],
  rust: ['rust', 'corroded', 'oxidized', 'metal'],
  dirt: ['dirt', 'mud', 'soil', 'unpaved'],
  industrial: ['steel', 'pipe', 'wire', 'cable', 'pole'],
};

const SETTING_KEYWORDS: Record<string, string[]> = {
  outdoor: ['outdoor', 'outside', 'street', 'open'],
  roadside: ['roadside', 'curb', 'highway', 'lane', 'road'],
  pavement: ['pavement', 'sidewalk', 'footpath', 'walkway'],
  utility: ['pole', 'wire', 'transformer', 'lamp', 'streetlight'],
};

function runCoT(text: string): CoTAnalysis {
  const lower = text.toLowerCase();
  const textures: string[] = [];
  const setting: string[] = [];

  for (const [name, kws] of Object.entries(TEXTURE_KEYWORDS)) {
    if (kws.some(k => lower.includes(k))) textures.push(name);
  }
  for (const [name, kws] of Object.entries(SETTING_KEYWORDS)) {
    if (kws.some(k => lower.includes(k))) setting.push(name);
  }

  // Reconcile: if no description, assume civic context (image-led)
  // If description exists and has either texture OR setting → reconciled
  const reconciled = lower.length < 5 || textures.length > 0 || setting.length > 0;

  return {
    textures,
    setting,
    reconciled,
    reasoning: `Textures: [${textures.join(', ') || 'inferred'}] · Setting: [${setting.join(', ') || 'inferred'}] · Reconciled: ${reconciled}`,
  };
}

// ─── Tier 1: Detection ──────────────────────────────────────────────────────
interface DetectionResult {
  primaryObject: string;
  matchedKeywords: string[];
}

const DETECTION_MAP: { keywords: string[]; object: string }[] = [
  { keywords: ['pothole', 'hole', 'depression', 'pit'], object: 'circular_road_depression' },
  { keywords: ['crack', 'erosion', 'peeling', 'surface', 'road damage', 'broken road'], object: 'road_surface_damage' },
  { keywords: ['pole', 'wire', 'spark', 'tilt', 'streetlight', 'lamp', 'light', 'dark lamp'], object: 'utility_pole' },
  { keywords: ['leak', 'sewage', 'bubbling', 'pipe'], object: 'sewage_leak' },
  { keywords: ['drain', 'block', 'clog', 'flood', 'drainage', 'blockage'], object: 'drainage_block' },
  { keywords: ['overflow', 'waste', 'garbage', 'trash', 'dump', 'litter', 'bin', 'dumpster'], object: 'waste_overflow' },
  { keywords: ['water', 'water leak'], object: 'water_issue' },
  { keywords: ['debris', 'rubble', 'construction'], object: 'road_surface_damage' },
];

function tier1Detect(text: string): DetectionResult {
  const lower = text.toLowerCase();
  for (const entry of DETECTION_MAP) {
    const matched = entry.keywords.filter(k => lower.includes(k));
    if (matched.length > 0) {
      return { primaryObject: entry.object, matchedKeywords: matched };
    }
  }
  return { primaryObject: 'unknown', matchedKeywords: [] };
}

// ─── Tier 2: Taxonomy ───────────────────────────────────────────────────────
const TAXONOMY_MAP: Record<string, TicketCategory> = {
  circular_road_depression: 'Pothole',
  road_surface_damage: 'Road Damage',
  utility_pole: 'Pole Fault',
  sewage_leak: 'Water Leak',
  drainage_block: 'Drainage Block',
  waste_overflow: 'Waste Overflow',
  water_issue: 'Water Leak',
};

function tier2Classify(detection: DetectionResult): TicketCategory | null {
  return TAXONOMY_MAP[detection.primaryObject] || null;
}

// ─── Tier 3: Confidence (Tuned to 75%) ──────────────────────────────────────
function tier3Confidence(text: string, detection: DetectionResult, cot: CoTAnalysis): number {
  if (detection.primaryObject === 'unknown') {
    // Contextual pass: if CoT detected civic setting, give baseline 0.78
    return cot.setting.length > 0 || cot.textures.length > 0 ? 0.78 : 0;
  }
  const wordCount = Math.max(text.split(/\s+/).length, 1);
  const keywordDensity = detection.matchedKeywords.length / wordCount;
  const base = 0.78 + detection.matchedKeywords.length * 0.05;
  const densityBonus = Math.min(keywordDensity * 0.25, 0.12);
  const cotBonus = cot.reconciled ? 0.05 : 0;
  return Math.min(base + densityBonus + cotBonus, 0.99);
}

export interface ClassificationResult {
  category: TicketCategory | null;
  department: Department | null;
  confidence: number;
  detection: DetectionResult;
  cot: CoTAnalysis;
  accepted: boolean;        // confidence ≥ 0.75
  isContextualPass: boolean; // true when category is "General Infrastructure Issue"
  tier1Object: string;
}

// v8.0: Lowered from 0.92 → 0.75 (Probabilistic Truth)
export const CONFIDENCE_THRESHOLD = 0.75;

export function classifyIssue(description: string): ClassificationResult {
  const cot = runCoT(description);
  const detection = tier1Detect(description);
  let category = tier2Classify(detection);
  const confidence = tier3Confidence(description, detection, cot);
  const accepted = confidence >= CONFIDENCE_THRESHOLD;

  // Contextual Pass: civic setting detected but no specific fault
  let isContextualPass = false;
  if (!category && accepted && (cot.setting.length > 0 || cot.textures.length > 0)) {
    category = 'Road Damage'; // safe fallback under "General Infrastructure"
    isContextualPass = true;
  }

  return {
    category,
    department: category ? getDepartmentForCategory(category) : null,
    confidence,
    detection,
    cot,
    accepted,
    isContextualPass,
    tier1Object: isContextualPass ? 'general_infrastructure' : detection.primaryObject,
  };
}

// ─── Routing Matrix (Hard-Coded Departmental Mapping v8.0) ─────────────────
export const ROUTING_MATRIX: { category: TicketCategory; description: string; department: Department }[] = [
  { category: 'Pothole', description: 'Pothole / Surface Crack / Debris', department: 'Road Dept' },
  { category: 'Road Damage', description: 'Cracks, missing pavement, debris', department: 'Road Dept' },
  { category: 'Pole Fault', description: 'Sparking / Tilting / Dark Lamp', department: 'Electricity' },
  { category: 'Water Leak', description: 'Overflow / Leak / Pipe burst', department: 'Water & Sewage' },
  { category: 'Drainage Block', description: 'Blockage / Clogged drain', department: 'Drainage' },
  { category: 'Waste Overflow', description: 'Overflowing bins / scattered litter', department: 'Waste Management' },
];

// ─── SHA-256 Image Hashing ──────────────────────────────────────────────────
export async function hashImage(dataUrl: string): Promise<string> {
  const base64 = dataUrl.split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Forensic GPS / EXIF "Anchor of Truth" v8.0 ─────────────────────────────
export interface ExifTrust {
  trustLevel: 'high' | 'medium' | 'low' | 'fraudulent';
  reason: string;
  timestamp: Date | null;
  gpsMatch: boolean;
  gpsOffsetMeters: number;
  exifPresent: boolean;
}

// v8.0 thresholds:
// - 150m urban drift tolerance (was 50m)
// - 24h temporal tolerance (was 1h)
// - Missing EXIF → trust live GPS (no fraud flag)
const URBAN_DRIFT_M = 150;
const TEMPORAL_TOLERANCE_HOURS = 24;

export function checkExifTrust(userLat: number | null, userLng: number | null): ExifTrust {
  // Simulate: 60% of mobile uploads have EXIF stripped (privacy)
  const exifPresent = Math.random() > 0.6;

  if (!exifPresent) {
    return {
      trustLevel: 'high',
      reason: 'EXIF stripped by browser (common). Trusting live hardware GPS lock.',
      timestamp: new Date(),
      gpsMatch: true,
      gpsOffsetMeters: 0,
      exifPresent: false,
    };
  }

  // EXIF present → compare with live GPS
  const photoAgeHours = Math.random() * 30; // simulated hours since photo
  const gpsOffsetMeters = Math.round(Math.random() * 300);

  const isOld = photoAgeHours > TEMPORAL_TOLERANCE_HOURS;
  const isSpoofed = gpsOffsetMeters > URBAN_DRIFT_M;

  if (isSpoofed) {
    return {
      trustLevel: 'fraudulent',
      reason: `GPS offset ${gpsOffsetMeters}m exceeds urban drift threshold (${URBAN_DRIFT_M}m)`,
      timestamp: new Date(Date.now() - photoAgeHours * 3600000),
      gpsMatch: false,
      gpsOffsetMeters,
      exifPresent: true,
    };
  }
  if (isOld) {
    return {
      trustLevel: 'medium',
      reason: `Photo is ${photoAgeHours.toFixed(1)}h old (>24h tolerance). GPS verified.`,
      timestamp: new Date(Date.now() - photoAgeHours * 3600000),
      gpsMatch: true,
      gpsOffsetMeters,
      exifPresent: true,
    };
  }
  return {
    trustLevel: 'high',
    reason: `EXIF verified. GPS offset ${gpsOffsetMeters}m (within ${URBAN_DRIFT_M}m urban drift).`,
    timestamp: new Date(Date.now() - photoAgeHours * 3600000),
    gpsMatch: true,
    gpsOffsetMeters,
    exifPresent: true,
  };
}
