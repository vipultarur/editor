export interface MatchItem {
  id: string;
  name: string;
  targetImageUrl?: string; // Optional custom target image override
  revealImageUrl?: string; // Optional custom reveal image override
  isMatch: boolean;        // true => Match; false => No Match
  matchSoundUrl?: string;  // Custom SFX URL for this match result
  emoji: string;           // E.g. '😃', '🤩', '🔥', '😢', '😭', '🦁', '😱'
}

export interface MatchGroup {
  id: string;
  name: string;
  description?: string;
  backgroundType: 'preset' | 'custom' | 'gradient';
  backgroundValue: string; // Preset ID, image blob URL, or CSS gradient string
  
  // The 4 Global Group Images (GIF, PNG, JPG)
  matchImageUrl: string;      // 1. Product image when item matches (e.g. KitKat)
  matchCheckImageUrl: string; // 2. Checkmark / Success sticker / GIF image
  noMatchImageUrl: string;    // 3. Mismatch image / Character (e.g. Lion)
  crossImageUrl: string;       // 4. Cross ❌ / Error sticker / GIF image

  // Global Group Sounds
  bgSoundUrl?: string;      // Continuous background music URL for this group
  matchSoundUrl?: string;   // Global Match sound URL
  noMatchSoundUrl?: string; // Global No Match sound URL
  victorySoundUrl?: string; // Global Victory sound URL
  
  videoDuration: number;    // Video duration in seconds: 10, 15, 20, or custom
  isGenerated?: boolean;    // true if video has been generated/previewed
  items: MatchItem[];       // Dynamic array of 3 or 4 rounds
}

export interface SoundLibraryItem {
  id: string;
  name: string;
  url: string;
  category: 'match' | 'nomatch' | 'background' | 'finish';
  isPreset?: boolean;
}

export interface RenderProgress {
  isRendering: boolean;
  progress: number; // 0 to 100
  message: string;
  downloadUrl?: string;
}
