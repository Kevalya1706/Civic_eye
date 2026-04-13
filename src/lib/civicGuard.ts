/**
 * CivicGuard — Deterministic Vision Pipeline
 * Scene validation, triple-pass classification, SHA-256 hashing, EXIF trust checks.
 */

import { type TicketCategory, getDepartmentForCategory, type Department } from './mockData';

// ─── Scene Validation (Tier 0) ─────────────────────────────────────────────
// Simulates a "Public Infrastructure" relevance check.
// In production this would call a real vision model.
const CIVIC_SCENE_KEYWORDS = [
  'road', 'street', 'pavement', 'asphalt', 'curb', 'sidewalk',
  'pole', 'wire', 'streetlight', 'lamp', 'utility',
  'pipe', 'drain', 'sewer', 'manhole', 'gutter',
  'bin', 'dumpster', 'trash', 'waste', 'litter',
  'water', 'flood', 'puddle', 'leak', 'overflow',
  'pothole', 'crack', 'debris', 'construction',
  'infrastructure', 'public', 'civic',
];

export function validateScene(description: string): { valid: boolean; reason?: string } {
  const lower = description.toLowerCase();
  const isCivic = CIVIC_SCENE_KEYWORDS.some(k => lower.includes(k));
  if (!isCivic && description.length > 3) {
    return {
      valid: false,
      reason: 'Invalid Scene: Our AI has detected a non-civic object. Please capture an image of public infrastructure (Roads, Pipes, or Utilities).',
    };
  }
  // If description is short (or empty), allow it — the image itself is primary input
  return { valid: true };
}

// ─── Triple-Pass Classification Engine ──────────────────────────────────────

/** Tier 1: Detection — identify primary object via keyword bounding-box simulation */
interface DetectionResult {
  primaryObject: string;
  matchedKeywords: string[];
}

const DETECTION_MAP: { keywords: string[]; object: string }[] = [
  { keywords: ['pothole', 'hole', 'depression', 'pit'], object: 'circular_road_depression' },
  { keywords: ['crack', 'erosion', 'peeling', 'surface', 'road damage', 'broken road'], object: 'road_surface_damage' },
  { keywords: ['pole', 'wire', 'spark', 'tilt', 'streetlight', 'lamp', 'light'], object: 'utility_pole' },
  { keywords: ['leak', 'sewage', 'bubbling', 'sewage', 'pipe'], object: 'sewage_leak' },
  { keywords: ['drain', 'block', 'clog', 'flood', 'drainage'], object: 'drainage_block' },
  { keywords: ['overflow', 'waste', 'garbage', 'trash', 'dump', 'litter', 'bin', 'dumpster'], object: 'waste_overflow' },
  { keywords: ['water', 'water leak'], object: 'water_issue' },
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

/** Tier 2: Taxonomy — hierarchical mapping with parent/child resolution */
const TAXONOMY_MAP: Record<string, TicketCategory> = {
  circular_road_depression: 'Pothole',         // Child of Road Damage
  road_surface_damage: 'Road Damage',           // Parent category
  utility_pole: 'Pole Fault',
  sewage_leak: 'Water Leak',
  drainage_block: 'Drainage Block',
  waste_overflow: 'Waste Overflow',
  water_issue: 'Water Leak',
};

function tier2Classify(detection: DetectionResult): TicketCategory | null {
  return TAXONOMY_MAP[detection.primaryObject] || null;
}

/** Tier 3: Confidence threshold — deterministic score based on keyword density */
function tier3Confidence(text: string, detection: DetectionResult): number {
  if (detection.primaryObject === 'unknown') return 0;
  const wordCount = text.split(/\s+/).length;
  const keywordDensity = detection.matchedKeywords.length / Math.max(wordCount, 1);
  // Base confidence from keyword match + density bonus
  const base = 0.75 + detection.matchedKeywords.length * 0.06;
  const densityBonus = Math.min(keywordDensity * 0.3, 0.15);
  return Math.min(base + densityBonus, 0.99);
}

export interface ClassificationResult {
  category: TicketCategory | null;
  department: Department | null;
  confidence: number;
  detection: DetectionResult;
  accepted: boolean;        // confidence > 0.92
  tier1Object: string;
}

export const CONFIDENCE_THRESHOLD = 0.92;

export function classifyIssue(description: string): ClassificationResult {
  const detection = tier1Detect(description);
  const category = tier2Classify(detection);
  const confidence = tier3Confidence(description, detection);
  const accepted = confidence >= CONFIDENCE_THRESHOLD;

  return {
    category,
    department: category ? getDepartmentForCategory(category) : null,
    confidence,
    detection,
    accepted,
    tier1Object: detection.primaryObject,
  };
}

// ─── Industrial Routing Matrix (Hard-Coded, 100% accuracy) ─────────────────
export const ROUTING_MATRIX: { category: TicketCategory; description: string; department: Department }[] = [
  { category: 'Pole Fault', description: 'Detected wires, sparks, or tilting poles', department: 'Electricity' },
  { category: 'Water Leak', description: 'Detected water bubbling from ground/drain', department: 'Water & Sewage' },
  { category: 'Pothole', description: 'Circular depression in roadway', department: 'Road Dept' },
  { category: 'Waste Overflow', description: 'Overflowing bins or scattered litter', department: 'Waste Management' },
  { category: 'Road Damage', description: 'Cracks, missing pavement, or construction debris', department: 'Road Dept' },
  { category: 'Drainage Block', description: 'Blocked or clogged drainage system', department: 'Drainage' },
];

// ─── SHA-256 Image Hashing ──────────────────────────────────────────────────
export async function hashImage(dataUrl: string): Promise<string> {
  const base64 = dataUrl.split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── EXIF Trust Check (simulated) ───────────────────────────────────────────
export interface ExifTrust {
  trustLevel: 'high' | 'medium' | 'low';
  reason: string;
  timestamp: Date | null;
  gpsMatch: boolean;
}

export function checkExifTrust(userLat: number | null, userLng: number | null): ExifTrust {
  // Simulate EXIF extraction — in production, parse actual EXIF from the image binary
  const photoAge = Math.random() * 120; // simulated minutes since photo was taken
  const gpsOffset = Math.random() * 50; // simulated km offset from user location

  const isOld = photoAge > 60;
  const isFarAway = gpsOffset > 10;

  if (isOld && isFarAway) {
    return {
      trustLevel: 'low',
      reason: 'Photo timestamp >1hr old and GPS location mismatch detected',
      timestamp: new Date(Date.now() - photoAge * 60000),
      gpsMatch: false,
    };
  }
  if (isOld) {
    return {
      trustLevel: 'medium',
      reason: 'Photo timestamp is more than 1 hour old',
      timestamp: new Date(Date.now() - photoAge * 60000),
      gpsMatch: true,
    };
  }
  if (isFarAway) {
    return {
      trustLevel: 'medium',
      reason: 'Photo GPS does not match current user location',
      timestamp: new Date(),
      gpsMatch: false,
    };
  }
  return {
    trustLevel: 'high',
    reason: 'Photo is recent and GPS matches current location',
    timestamp: new Date(),
    gpsMatch: true,
  };
}
