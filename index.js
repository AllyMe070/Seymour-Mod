/// <reference types="../CTAutocomplete" />
/// <reference lib="es2015" />

// Import color database
import { TARGET_COLORS, FADE_DYES } from "./colorDatabase";

// Import GUIs
import { DatabaseGUI } from "./gui/databaseGUI";
import { ArmorChecklistGUI } from "./gui/ArmorChecklistGUI";
import { BestSetsGUI } from "./gui/BestSetsGUI";
import { WordMatchesGUI } from "./gui/WordMatchesGUI";
import { PatternMatchesGUI } from "./gui/PatternMatchesGUI";

global.pendingDatabaseHexSearch = null;

// Performance tracking
let perfLog = [];

function logPerf(label) {
  perfLog.push({ label: label, time: Date.now() });
}

function printPerf() {
  if (perfLog.length < 2) return;
  
  ChatLib.chat("§e=== Performance Log ===");
  for (let i = 1; i < perfLog.length; i++) {
    const diff = perfLog[i].time - perfLog[i-1].time;
    ChatLib.chat("§7" + perfLog[i].label + ": §c" + diff + "ms");
  }
  ChatLib.chat("§7Total: §c" + (perfLog[perfLog.length-1].time - perfLog[0].time) + "ms");
  perfLog = [];
}

// ===== CONFIG =====
const DEBUG = false;
const HIGHLIGHT_DEBUG = false;

// ===== PERSISTENT DATA =====
import PogObject from "PogData";
const data = new PogObject("SeymourAnalyzer", {
  boxX: 50,
  boxY: 80,
  fadeDyesEnabled: true,
  threePieceSetsEnabled: true,
  pieceSpecificEnabled: false,
  highlightsEnabled: true,
  infoBoxEnabled: true,
  wordsEnabled: true,
  patternsEnabled: true,
  customColorsEnabled: true,
  dupesEnabled: true,
  showHighFades: false
});

const collection = new PogObject("SeymourAnalyzer", {}, "Collection.json");
// Ensure PogObject files exist but don't overwrite non-empty files
(function() {
  const File = Java.type("java.io.File");
  const FileReader = Java.type("java.io.FileReader");
  const BufferedReader = Java.type("java.io.BufferedReader");

  function ensurePogObject(filename) {
    const filePath = "config/ChatTriggers/modules/SeymourAnalyzer/" + filename;
    const f = new File(filePath);

    // If file doesn't exist, create parent dirs and save an empty PogObject
    if (!f.exists()) {
      const parent = f.getParentFile();
      if (parent && !parent.exists()) parent.mkdirs();
      const obj = new PogObject("SeymourAnalyzer", {}, filename);
      try { obj.save(); } catch (e) {}
      return obj;
    }

    // Read existing file contents
    let content = "";
    try {
      const reader = new BufferedReader(new FileReader(f));
      let line;
      while ((line = reader.readLine()) !== null) content += line;
      reader.close();
    } catch (e) {
      content = "";
    }

    const trimmed = (content || "").trim();

    // If file is empty or exactly "{}", treat as empty and ensure PogObject writes default {}
    if (trimmed === "" || trimmed === "{}") {
      const obj = new PogObject("SeymourAnalyzer", {}, filename);
      try { obj.save(); } catch (e) {}
      return obj;
    }

    // Otherwise leave existing content intact; just load it via PogObject (do NOT call save)
    return new PogObject("SeymourAnalyzer", {}, filename);
  }

  const wordList = ensurePogObject("Words.json");
  const customColors = ensurePogObject("CustomColors.json");

  // Expose to module scope
  this.wordList = wordList;
  this.customColors = customColors;
})();

// Force reload collection from disk WITHOUT FileLib
try {
  const File = Java.type("java.io.File");
  const FileReader = Java.type("java.io.FileReader");
  const BufferedReader = Java.type("java.io.BufferedReader");
  
  const collectionFile = new File("config/ChatTriggers/modules/SeymourAnalyzer/Collection.json");
  
  if (collectionFile.exists()) {
    const reader = new BufferedReader(new FileReader(collectionFile));
    let line;
    let jsonString = "";
    
    while ((line = reader.readLine()) !== null) {
      jsonString += line;
    }
    reader.close();
    
    if (jsonString) {
      const parsed = JSON.parse(jsonString);
      
      // Clear existing collection data
      for (const key in collection) {
        if (collection.hasOwnProperty(key) && key !== "save" && key !== "_data") {
          delete collection[key];
        }
      }
      
      // Load fresh data with deep copy to avoid reference issues
      for (const key in parsed) {
        if (parsed.hasOwnProperty(key)) {
          const piece = parsed[key];
          // Deep copy the piece to avoid any reference issues
          collection[key] = {
            pieceName: piece.pieceName,
            uuid: piece.uuid,
            hexcode: piece.hexcode,
            specialPattern: piece.specialPattern,
            bestMatch: piece.bestMatch ? {
              colorName: piece.bestMatch.colorName,
              targetHex: piece.bestMatch.targetHex,
              deltaE: piece.bestMatch.deltaE,
              absoluteDistance: piece.bestMatch.absoluteDistance,
              tier: piece.bestMatch.tier
            } : null,
            allMatches: piece.allMatches ? piece.allMatches.map(function(m) {
              return {
                colorName: m.colorName,
                targetHex: m.targetHex,
                deltaE: m.deltaE,
                absoluteDistance: m.absoluteDistance,
                tier: m.tier
              };
            }) : [],
            wordMatch: piece.wordMatch,
            chestLocation: piece.chestLocation,
            timestamp: piece.timestamp
          };
        }
      }
      
      // ChatLib.chat("§a[Seymour] Reloaded " + Object.keys(parsed).length + " pieces from disk");
    }
  }
} catch (e) {
  ChatLib.chat("§c[Seymour] Failed to reload collection: " + e);
}

// UUID cache for fast lookups - MOVED HERE so we can populate it early
const uuidCache = {};

// PRE-POPULATE uuidCache from collection at startup (this makes scanned chests instant!)
setTimeout(function() {
  try {
    const collectionKeys = Object.keys(collection);
    let cachedCount = 0;
    
    for (let i = 0; i < collectionKeys.length; i++) {
      const uuid = collectionKeys[i];
      const piece = collection[uuid];
      
      if (!piece || !piece.bestMatch || !piece.hexcode) continue;
      
      // Check if it's a fade dye
      let isFadeColor = false;
      for (let f = 0; f < FADE_DYES.length; f++) {
        if (piece.bestMatch.colorName.indexOf(FADE_DYES[f] + " - Stage") === 0) {
          isFadeColor = true;
          break;
        }
      }
      
      // Check if it's a custom color
      const isCustom = customColors[piece.bestMatch.colorName] !== undefined;
      
      // Build top3Matches from stored allMatches
      const top3Matches = [];
      if (piece.allMatches && piece.allMatches.length > 0) {
        const matchesArray = piece.allMatches;
        // Process match 0
        if (matchesArray.length > 0) {
          const match0 = matchesArray[0];
          const colorName0 = match0.colorName;
          const matchIsFade0 = isFadeDye(colorName0);
          const matchIsCustom0 = isCustomColor(colorName0);
          
          top3Matches.push({
            name: colorName0,
            targetHex: match0.targetHex,
            deltaE: match0.deltaE,
            isFade: matchIsFade0,
            isCustom: matchIsCustom0,
            tier: match0.tier,
            priority: getPriorityScore(matchIsFade0, match0.tier, matchIsCustom0)
          });
        }
        
        // Process match 1
        if (matchesArray.length > 1) {
          const match1 = matchesArray[1];
          const colorName1 = match1.colorName;
          const matchIsFade1 = isFadeDye(colorName1);
          const matchIsCustom1 = isCustomColor(colorName1);
          
          top3Matches.push({
            name: colorName1,
            targetHex: match1.targetHex,
            deltaE: match1.deltaE,
            isFade: matchIsFade1,
            isCustom: matchIsCustom1,
            tier: match1.tier,
            priority: getPriorityScore(matchIsFade1, match1.tier, matchIsCustom1)
          });
        }
        
        // Process match 2
        if (matchesArray.length > 2) {
          const match2 = matchesArray[2];
          const colorName2 = match2.colorName;
          const matchIsFade2 = isFadeDye(colorName2);
          const matchIsCustom2 = isCustomColor(colorName2);
          
          top3Matches.push({
            name: colorName2,
            targetHex: match2.targetHex,
            deltaE: match2.deltaE,
            isFade: matchIsFade2,
            isCustom: matchIsCustom2,
            tier: match2.tier,
            priority: getPriorityScore(matchIsFade2, match2.tier, matchIsCustom2)
          });
        }
      }
      
      // If we don't have stored matches, at least include the best match
      if (top3Matches.length === 0) {
        const bestIsFade = isFadeDye(piece.bestMatch.colorName);
        const bestIsCustom = isCustomColor(piece.bestMatch.colorName);
        top3Matches.push({
          name: piece.bestMatch.colorName,
          targetHex: piece.bestMatch.targetHex,
          deltaE: piece.bestMatch.deltaE,
          isFade: bestIsFade,
          isCustom: bestIsCustom,
          tier: piece.bestMatch.tier,
          priority: getPriorityScore(bestIsFade, piece.bestMatch.tier, bestIsCustom)
        });
      }
      
      // Pre-build the cache entry with ALL necessary flags INCLUDING top3Matches
      uuidCache[uuid] = {
        tier: piece.bestMatch.tier,
        isFade: isFadeColor,
        isCustom: isCustom,
        alreadyProcessed: true,
        collectionUuid: uuid,
        itemHex: piece.hexcode,
        wordMatch: piece.wordMatch ? { word: piece.wordMatch, pattern: piece.hexcode } : null,
        specialPattern: piece.specialPattern ? { type: piece.specialPattern, pattern: piece.hexcode } : null,
        // Pre-calculate highlight states (will be updated when needed)
        isSearchMatch: false,
        isDupe: false,
        // Store FULL analysis data including top3Matches
        analysis: {
          bestMatch: {
            name: piece.bestMatch.colorName,
            targetHex: piece.bestMatch.targetHex,
            deltaE: piece.bestMatch.deltaE,
            isFade: isFadeColor,
            isCustom: isCustom,
            tier: piece.bestMatch.tier
          },
          top3Matches: top3Matches,
          tier: piece.bestMatch.tier,
          isFadeDye: isFadeColor
        }
      };
      
      cachedCount++;
    }
    
    if (cachedCount > 0) {
      ChatLib.chat("§a[Seymour] Pre-cached §e" + cachedCount + "§a pieces for instant loading!");
    }
  } catch (e) {
    ChatLib.chat("§c[Seymour] Failed to pre-cache: " + e);
  }
}, 500);

let scanningEnabled = false;

// ===== COLOR MATH =====
function hexToRgb(hex) {
  hex = hex.replace("#", "").toUpperCase();
  if (hex.length !== 6) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(hex.substr(0, 2), 16),
    g: parseInt(hex.substr(2, 2), 16),
    b: parseInt(hex.substr(4, 2), 16)
  };
}

function rgbToXyz(rgb) {
  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;
  
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
  
  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) * 100;
  const y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750) * 100;
  const z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) * 100;
  
  return { x, y, z };
}

function xyzToLab(xyz) {
  const xn = 95.047, yn = 100.0, zn = 108.883;
  
  let x = xyz.x / xn;
  let y = xyz.y / yn;
  let z = xyz.z / zn;
  
  x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x + 16/116);
  y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116);
  z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z + 16/116);
  
  const L = 116 * y - 16;
  const a = 500 * (x - y);
  const b = 200 * (y - z);
  
  return { L, a, b };
}

function hexToLab(hex) {
  const rgb = hexToRgb(hex);
  const xyz = rgbToXyz(rgb);
  return xyzToLab(xyz);
}

function calculateDeltaEWithLab(lab1, lab2) {
  return Math.sqrt(
    Math.pow(lab1.L - lab2.L, 2) + 
    Math.pow(lab1.a - lab2.a, 2) + 
    Math.pow(lab1.b - lab2.b, 2)
  );
}

// ===== PRE-CALCULATE LAB VALUES =====
const TARGET_COLORS_LAB = {};

function rebuildLabCache() {
  // Clear existing cache
  const keys = Object.keys(TARGET_COLORS_LAB);
  for (let i = 0; i < keys.length; i++) {
    delete TARGET_COLORS_LAB[keys[i]];
  }
  
  // Add built-in colors
  const colorNames = Object.keys(TARGET_COLORS);
  for (let i = 0; i < colorNames.length; i++) {
    const name = colorNames[i];
    try {
      TARGET_COLORS_LAB[name] = hexToLab(TARGET_COLORS[name]);
    } catch (e) {
      // Silent fail for invalid colors
    }
  }
  
  // Add custom colors
  const customColorNames = Object.keys(customColors);
  for (let i = 0; i < customColorNames.length; i++) {
    const name = customColorNames[i];
    try {
      TARGET_COLORS_LAB[name] = hexToLab(customColors[name]);
    } catch (e) {
      // Silent fail for invalid colors
    }
  }
  
  // ChatLib.chat("§a[Seymour Analyzer] §7Initialized " + Object.keys(TARGET_COLORS_LAB).length + " color LAB values (" + customColorNames.length + " custom)");
}

rebuildLabCache();

// Check if a color name is a fade dye
function isFadeDye(colorName) {
  for (let i = 0; i < FADE_DYES.length; i++) {
    if (colorName.indexOf(FADE_DYES[i] + " - Stage") === 0) {
      return true;
    }
  }
  return false;
}

// Check if a color name is a 3p set
function isThreePieceSet(colorName) {
  return colorName.indexOf(" 3p") !== -1 || colorName.endsWith(" 3p");
}

// Check if hex matches special patterns
function matchesSpecialPattern(hex) {
  if (!hex || hex.length !== 6) return null;
  
  const hexUpper = hex.toUpperCase();
  
  // Extract RGB pairs
  const r = hexUpper.substr(0, 2);
  const g = hexUpper.substr(2, 2);
  const b = hexUpper.substr(4, 2);
  
  // Pattern 1: AABBCC (same character repeated in each pair)
  if (r[0] === r[1] && g[0] === g[1] && b[0] === b[1]) {
    return { type: "paired", pattern: hexUpper };
  }
  
  // Pattern 2: ABCABC (repeating half)
  const firstHalf = hexUpper.substr(0, 3);
  const secondHalf = hexUpper.substr(3, 3);
  if (firstHalf === secondHalf) {
    return { type: "repeating", pattern: hexUpper };
  }
  
  // Pattern 3: ABCCBA (palindrome)
  if (hexUpper[0] === hexUpper[5] && 
      hexUpper[1] === hexUpper[4] && 
      hexUpper[2] === hexUpper[3]) {
    return { type: "palindrome", pattern: hexUpper };
  }
  
  // Pattern 4: AxBxCx (same first character in each pair)
  if (r[0] === g[0] && g[0] === b[0]) {
    return { type: "AxBxCx", pattern: hexUpper };
  }

  return null;
}

// Cache for word matches to avoid repeated lookups
const wordMatchCache = {};

// Check if hex matches any word patterns
function matchesWordPattern(hex) {
  if (!hex || hex.length !== 6) return null;
  
  // Check cache first
  if (wordMatchCache[hex] !== undefined) {
    return wordMatchCache[hex];
  }
  
  const hexUpper = hex.toUpperCase();
  
  // Get keys directly from the PogObject
  const wordKeys = [];
  try {
    const rawData = wordList._data || wordList;
    for (const key in rawData) {
      if (key !== "_data" && key !== "save" && rawData.hasOwnProperty(key)) {
        wordKeys.push(key);
      }
    }
  } catch (e) {
    if (DEBUG) ChatLib.chat("§c[Debug] Error getting word keys: " + e);
  }
  
  if (DEBUG) {
    ChatLib.chat("§b[Debug] Checking hex " + hexUpper + " against " + wordKeys.length + " words");
    for (let i = 0; i < wordKeys.length; i++) {
      const word = wordKeys[i];
      const pattern = wordList[word];
      ChatLib.chat("§b[Debug] Word " + (i+1) + ": '" + word + "' -> pattern: '" + pattern + "'");
    }
  }
  
  // Simple substring search for each word
  for (let i = 0; i < wordKeys.length; i++) {
    const word = wordKeys[i];
    const hexWord = String(wordList[word]).toUpperCase();
    
    if (DEBUG) {
      ChatLib.chat("§b[Debug] Checking if '" + hexUpper + "' contains pattern '" + hexWord + "' for word '" + word + "'");
    }
    
    if (hexUpper.indexOf(hexWord) !== -1) {
      if (DEBUG) {
        ChatLib.chat("§a[Debug] ✓✓✓ WORD MATCH! " + hexUpper + " contains " + hexWord + " (word: " + word + ")");
      }
      const result = { word: word, pattern: hexUpper };
      wordMatchCache[hex] = result;
      return result;
    }
  }
  
  if (DEBUG) {
    ChatLib.chat("§c[Debug] No word matches found for " + hexUpper);
  }
  
  wordMatchCache[hex] = null;
  return null;
}

// Check if item is a Velvet Top Hat
function isVelvetTopHat(itemName) {
  const name = ChatLib.removeFormatting(itemName);
  return name.includes("Velvet Top Hat");
}

// Extract piece type from item name
function getPieceType(itemName) {
  const name = ChatLib.removeFormatting(itemName).toLowerCase();
  
  if (name.includes("helmet") || name.includes("helm") || name.includes("hat") || name.includes("cap")) {
    return "helmet";
  }
  if (name.includes("chestplate") || name.includes("jacket") || name.includes("tunic") || name.includes("shirt")) {
    return "chestplate";
  }
  if (name.includes("leggings") || name.includes("trousers") || name.includes("pants")) {
    return "leggings";
  }
  if (name.includes("boots") || name.includes("shoes") || name.includes("sneakers")) {
    return "boots";
  }
  
  return "universal";
}

// Check if color name matches piece type
function colorMatchesPieceType(colorName, pieceType) {
  if (pieceType === "universal") return true;
  
  const lowerName = colorName.toLowerCase();
  
  // Check if it's a set (contains " set" or "/")
  if (lowerName.includes(" set") || lowerName.includes("/")) {
    return true;
  }
  
  // Check if it's a 3p set - these match chestplate, leggings, and boots (not helmets)
  if (lowerName.includes("3p")) {
    return pieceType !== "helmet";
  }
  
  // Check if it's a universal color (no piece-specific naming)
  if (!lowerName.includes("helmet") && !lowerName.includes("helm") && 
      !lowerName.includes("chestplate") && !lowerName.includes("leggings") && 
      !lowerName.includes("boots")) {
    return true;
  }
  
  // Check for explicit piece type matches
if (pieceType === "helmet" && (lowerName.includes("helmet") || lowerName.includes("helm"))) {
  return true;
}
if (pieceType === "chestplate" && lowerName.includes("chestplate")) {
  return true;
}
if (pieceType === "leggings" && (lowerName.includes("leggings") || lowerName.includes("trousers"))) {
  return true;
}
if (pieceType === "boots" && (lowerName.includes("boots") || lowerName.includes("shoes") || lowerName.includes("sneakers"))) {
  return true;
}
  
  // Check for combined pieces (e.g., "Chestplate+Boots")
  if (lowerName.includes("+")) {
    if (pieceType === "helmet" && lowerName.includes("helm")) return true;
    if (pieceType === "chestplate" && lowerName.includes("chestplate")) return true;
    if (pieceType === "leggings" && lowerName.includes("leggings")) return true;
    if (pieceType === "boots" && lowerName.includes("boots")) return true;
  }
  
  return false;
}

// Check if a color is a custom color
function isCustomColor(colorName) {
  return customColors[colorName] !== undefined;
}

// Get priority score for sorting (lower = higher priority)
function getPriorityScore(isFade, tier, isCustom) {
  // Custom colors have HIGHEST priority (even above T1<)
  if (isCustom) {
    if (tier === 0) return -3;  // Highest priority
    if (tier === 1) return -2;
    if (tier === 2) return -1;
    return 6;
  }
  
  if (isFade) {
    if (tier === 0) return 3;
    if (tier === 1) return 4;
    if (tier === 2) return 5;
    return 6;
  } else {
    if (tier === 0) return 0;
    if (tier === 1) return 1;
    if (tier === 2) return 2;
    return 6;
  }
}

// ===== EXTRACT HEX FROM ITEM =====
function extractHexFromLore(loreArray) {
  try {
    if (!loreArray || loreArray.length === 0) return null;
    
    for (let i = 0; i < loreArray.length; i++) {
      const line = loreArray[i];
      
      if (line && line.includes("Color:") && line.includes("#")) {
        const cleaned = line.replace(/§./g, '');
        const match = cleaned.match(/#([0-9A-Fa-f]{1,6})/);
        if (match) {
          return match[1].toUpperCase().padStart(6, '0');
        }
      }
      
      const text = ChatLib.removeFormatting(line || "");
      if (text && text.includes("Color:")) {
        const match = text.match(/([0-9A-Fa-f]{1,6})/);
        if (match) {
          return match[1].toUpperCase().padStart(6, '0');
        }
      }
    }
  } catch (e) {
    // Silent fail
  }
  
  return null;
}

// ===== EXTRACT UUID FROM ITEM =====
function extractUuidFromItem(item) {
  try {
    const nbt = item.getNBT();
    if (!nbt) return null;
    
    const extraAttributes = nbt.getCompoundTag("tag").getCompoundTag("ExtraAttributes");
    if (!extraAttributes) return null;
    
    const uuid = extraAttributes.getString("uuid");
    return uuid || null;
  } catch (e) {
    return null;
  }
}

// ===== GET CHEST LOCATION FROM LOOKING DIRECTION =====
function getChestLocationFromLooking() {
  try {
    const playerX = Player.getX();
    const playerY = Player.getY();
    const playerZ = Player.getZ();
    const player = Player.getPlayer();
    
    const eyeY = playerY + 1.62;
    
    const yaw = player.field_70177_z;
    const pitch = player.field_70125_A;
    
    const yawRad = yaw * Math.PI / 180;
    const pitchRad = pitch * Math.PI / 180;
    
    const dirX = -Math.sin(yawRad) * Math.cos(pitchRad);
    const dirY = -Math.sin(pitchRad);
    const dirZ = Math.cos(yawRad) * Math.cos(pitchRad);
    
    if (DEBUG) {
      ChatLib.chat("§b[Debug] Player eye at: " + playerX.toFixed(2) + ", " + eyeY.toFixed(2) + ", " + playerZ.toFixed(2));
      ChatLib.chat("§b[Debug] Looking direction: " + dirX.toFixed(3) + ", " + dirY.toFixed(3) + ", " + dirZ.toFixed(3));
    }
    
    const maxDistance = 6.0;
    const stepSize = 0.1;
    
    for (let dist = 0; dist < maxDistance; dist += stepSize) {
      const checkX = Math.floor(playerX + dirX * dist);
      const checkY = Math.floor(eyeY + dirY * dist);
      const checkZ = Math.floor(playerZ + dirZ * dist);
      
      const block = World.getBlockAt(checkX, checkY, checkZ);
      if (!block) continue;
      
      const blockName = block.type.getName().toLowerCase();
      const blockID = block.type.getID();
      
      const isChest = blockID === 54 || blockID === 146 || 
                      blockName.includes("chest") || 
                      blockName.includes("trapped_chest");
      
      if (isChest) {
        if (DEBUG) {
          ChatLib.chat("§a[Debug] Found chest via raycast at: " + checkX + ", " + checkY + ", " + checkZ + " (distance: " + dist.toFixed(2) + ")");
        }
        return { x: checkX, y: checkY, z: checkZ };
      }
    }
    
    if (DEBUG) {
      ChatLib.chat("§c[Debug] No chest found via raycast!");
    }
    
    return null;
  } catch (e) {
    if (DEBUG) ChatLib.chat("§c[Debug] getChestLocationFromLooking error: " + e);
    return null;
  }
}

// ===== CHECK SEYMOUR =====
function isSeymourArmor(itemName) {
  const name = ChatLib.removeFormatting(itemName);
  return name.includes("Velvet Top Hat") || 
         name.includes("Cashmere Jacket") || 
         name.includes("Satin Trousers") || 
         name.includes("Oxford Shoes");
}

// ===== HEX ANALYSIS CACHE =====
const hexAnalysisCache = {};

// ===== ANALYZE =====
function analyzeSeymourArmor(itemHex, itemName) {
  try {
    if (!itemHex || itemHex.length !== 6) {
      return null;
    }
    
    const pieceType = data.pieceSpecificEnabled ? getPieceType(itemName) : "universal";
    const cacheKey = itemHex + "|" + pieceType + "|" + data.pieceSpecificEnabled;
    
    if (hexAnalysisCache[cacheKey]) {
      return hexAnalysisCache[cacheKey];
    }
    
    const matches = [];
    const itemLab = hexToLab(itemHex);
    
    // Combine built-in colors and optionally custom colors
    let allColorNames = Object.keys(TARGET_COLORS);
    if (data.customColorsEnabled) {
      allColorNames = allColorNames.concat(Object.keys(customColors));
    }
    
    for (let i = 0; i < allColorNames.length; i++) {
      const name = allColorNames[i];
      const targetHex = TARGET_COLORS[name] || customColors[name];
      const targetLab = TARGET_COLORS_LAB[name];
      
      if (!targetLab) continue;
      
      if (!data.fadeDyesEnabled && isFadeDye(name)) {
        continue;
      }
      
      if (data.threePieceSetsEnabled && pieceType === "helmet" && isThreePieceSet(name)) {
        continue;
      }
      
      if (data.pieceSpecificEnabled && !colorMatchesPieceType(name, pieceType)) {
        continue;
      }
      
      try {
        const deltaE = calculateDeltaEWithLab(itemLab, targetLab);
        const isFade = isFadeDye(name);
        const isCustom = isCustomColor(name);
        const tier = deltaE <= 1.0 ? 0 : (deltaE <= 2.0 ? 1 : (deltaE <= 5.0 ? 2 : 3));
        const priority = getPriorityScore(isFade, tier, isCustom);
        
        // High fades toggle logic:
        // OFF (showHighFades = false): Show T1 AND T2 fades (tier 0, 1, and 2) - DEFAULT BEHAVIOR
        // ON (showHighFades = true): Show ONLY T1 fades (tier 0 and 1)
        if (isFade && data.showHighFades && tier > 1) {
          // When high fades ON, skip T2+ (only show T1< and T1)
          continue;
        }
        if (isFade && !data.showHighFades && tier > 2) {
          // When high fades OFF (default), skip T3+ (show T1<, T1, and T2)
          continue;
        }

        matches.push({
          name: name,
          targetHex: targetHex,
          deltaE: deltaE,
          isFade: isFade,
          isCustom: isCustom,
          tier: tier,
          priority: priority
        });
      } catch (e) {
        // Silent fail
      }
    }
    
    if (matches.length === 0) {
      return null;
    }
    
    matches.sort(function(a, b) {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.deltaE - b.deltaE;
    });
    
    const best = matches[0];
    
    const result = {
      bestMatch: best,
      top3Matches: [matches[0], matches[1], matches[2]],
      tier: best.tier,
      isFadeDye: best.isFade
    };
    
    hexAnalysisCache[cacheKey] = result;
    
    return result;
  } catch (e) {
    return null;
  }
}

// ===== HELPER: GET CACHE DATA FROM COLLECTION =====
function getCacheDataFromCollection(uuid) {
  if (!uuid || !collection[uuid]) return null;
  
  const stored = collection[uuid];
  const isFadeColor = isFadeDye(stored.bestMatch.colorName);
  const isCustom = isCustomColor(stored.bestMatch.colorName);
  const wordMatch = (data.wordsEnabled && stored.wordMatch) ? { word: stored.wordMatch, pattern: stored.hexcode } : null;
  const specialPattern = (data.patternsEnabled && stored.specialPattern) ? { type: stored.specialPattern, pattern: stored.hexcode } : null;
  
  // Build top3Matches from stored allMatches
  const top3Matches = [];
  if (stored.allMatches && stored.allMatches.length > 0) {
    // FIXED: Manually access each index to avoid loop variable caching bug
    const matchesArray = stored.allMatches;
    
    // Process match 0
    if (matchesArray.length > 0) {
      const match0 = matchesArray[0];
      const colorName0 = match0.colorName;
      const matchIsFade0 = isFadeDye(colorName0);
      const matchIsCustom0 = isCustomColor(colorName0);
      
      top3Matches.push({
        name: colorName0,
        targetHex: match0.targetHex,
        deltaE: match0.deltaE,
        isFade: matchIsFade0,
        isCustom: matchIsCustom0,
        tier: match0.tier,
        priority: getPriorityScore(matchIsFade0, match0.tier, matchIsCustom0)
      });
    }
    
    // Process match 1
    if (matchesArray.length > 1) {
      const match1 = matchesArray[1];
      const colorName1 = match1.colorName;
      const matchIsFade1 = isFadeDye(colorName1);
      const matchIsCustom1 = isCustomColor(colorName1);
      
      top3Matches.push({
        name: colorName1,
        targetHex: match1.targetHex,
        deltaE: match1.deltaE,
        isFade: matchIsFade1,
        isCustom: matchIsCustom1,
        tier: match1.tier,
        priority: getPriorityScore(matchIsFade1, match1.tier, matchIsCustom1)
      });
    }
    
    // Process match 2
    if (matchesArray.length > 2) {
      const match2 = matchesArray[2];
      const colorName2 = match2.colorName;
      const matchIsFade2 = isFadeDye(colorName2);
      const matchIsCustom2 = isCustomColor(colorName2);
      
      top3Matches.push({
        name: colorName2,
        targetHex: match2.targetHex,
        deltaE: match2.deltaE,
        isFade: matchIsFade2,
        isCustom: matchIsCustom2,
        tier: match2.tier,
        priority: getPriorityScore(matchIsFade2, match2.tier, matchIsCustom2)
      });
    }
  }
  
  // If we don't have stored matches, at least include the best match
  if (top3Matches.length === 0) {
    const bestIsFade = isFadeDye(stored.bestMatch.colorName);
    const bestIsCustom = isCustomColor(stored.bestMatch.colorName);
    top3Matches.push({
      name: stored.bestMatch.colorName,
      targetHex: stored.bestMatch.targetHex,
      deltaE: stored.bestMatch.deltaE,
      isFade: bestIsFade,
      isCustom: bestIsCustom,
      tier: stored.bestMatch.tier,
      priority: getPriorityScore(bestIsFade, stored.bestMatch.tier, bestIsCustom)
    });
  }
  
  return {
    tier: stored.bestMatch.tier,
    isFade: isFadeColor,
    isCustom: isCustom,
    alreadyProcessed: true,
    collectionUuid: uuid,
    analysis: {
      bestMatch: {
        name: stored.bestMatch.colorName,
        targetHex: stored.bestMatch.targetHex,
        deltaE: stored.bestMatch.deltaE,
        isFade: isFadeColor,
        isCustom: isCustom,
        tier: stored.bestMatch.tier,
        priority: getPriorityScore(isFadeColor, stored.bestMatch.tier, isCustom)
      },
      top3Matches: top3Matches,
      tier: stored.bestMatch.tier,
      isFadeDye: isFadeColor
    },
    itemHex: stored.hexcode,
    wordMatch: wordMatch,
    specialPattern: specialPattern
  };
}

// ===== HELPER: SET HOVERED ITEM DATA =====
function setHoveredItemData(cacheData, uuid, itemName) {
  if (!cacheData || !cacheData.analysis) return;
  
  // Use passed UUID, or fallback to UUID stored in cacheData (from collection)
  const actualUuid = uuid || cacheData.collectionUuid || null;
  
  const analysis = cacheData.analysis;
  let best = analysis.bestMatch;

  const itemRgb = hexToRgb(cacheData.itemHex);
  const targetRgb = hexToRgb(best.targetHex);
  
  const visualDist = best.deltaE;
  const absoluteDist = Math.abs(itemRgb.r - targetRgb.r) + 
                       Math.abs(itemRgb.g - targetRgb.g) + 
                       Math.abs(itemRgb.b - targetRgb.b);
  
  // PRE-CALCULATE ownership and dupe checks HERE (only once when hovering)
  const ownedPieceData = checkIfPieceOwnedByMatch(best.name, cacheData.itemHex, cacheData.analysis.top3Matches || [], itemName);
  const dupeData = data.dupesEnabled ? checkForDupeHex(cacheData.itemHex, actualUuid) : null;
  
  hoveredItemData = {
    name: best.name,
    hex: best.targetHex,
    deltaE: visualDist,
    absoluteDist: absoluteDist,
    tier: cacheData.tier,
    isFadeDye: cacheData.isFade,
    isCustom: cacheData.isCustom || false,
    itemHex: cacheData.itemHex,
    top3: cacheData.analysis.top3Matches || [],
    wordMatch: cacheData.wordMatch,
    specialPattern: cacheData.specialPattern,
    uuid: actualUuid,
    itemName: itemName || null,
    timestamp: Date.now(),
    // Store pre-calculated results
    ownedPiece: ownedPieceData,
    dupeCheck: dupeData
  };
}

// ===== HELPER: CLEAR ALL CACHES =====
function clearAllCaches() {
  itemCache.clear();
  const hexKeys = Object.keys(hexAnalysisCache);
  for (let i = 0; i < hexKeys.length; i++) {
    delete hexAnalysisCache[hexKeys[i]];
  }
  const wordKeys = Object.keys(wordMatchCache);
  for (let i = 0; i < wordKeys.length; i++) {
    delete wordMatchCache[wordKeys[i]];
  }
  // Clear UUID cache too
  const uuidKeys = Object.keys(uuidCache);
  for (let i = 0; i < uuidKeys.length; i++) {
    delete uuidCache[uuidKeys[i]];
  }
  // Clear ownership cache
const ownerKeys = Object.keys(ownershipCache);
for (let i = 0; i < ownerKeys.length; i++) {
  delete ownershipCache[ownerKeys[i]];
}
// Clear dupe hex cache
const dupeKeys = Object.keys(dupeHexCache);
for (let i = 0; i < dupeKeys.length; i++) {
  delete dupeHexCache[dupeKeys[i]];
}
hoveredItemData = null;
}

// Replace the entire checkIfPieceOwnedByMatch function in index.js (around line 800-900)

// ===== CHECK IF PIECE IS OWNED IN COLLECTION =====
function checkIfPieceOwnedByMatch(bestMatchName, itemHex, top3Matches, itemName) {
  if (!bestMatchName) return null;
  
  // Detect the piece type of the item we're hovering over
  const hoveredPieceType = getPieceType(itemName);
  if (!hoveredPieceType || hoveredPieceType === "universal") return null;
  
  const cacheKey = bestMatchName + "|" + itemHex + "|" + hoveredPieceType;
  
  // Return cached result if available
  if (ownershipCache[cacheKey] !== undefined) {
    return ownershipCache[cacheKey];
  }
  
  try {
    // Normalize the color name by removing common suffixes/prefixes
    const normalizeColorName = function(name) {
      let normalized = name;
      // Remove piece type indicators in parentheses
      normalized = normalized.replace(/\s*\(Helmet\)/gi, "");
      normalized = normalized.replace(/\s*\(Chestplate\)/gi, "");
      normalized = normalized.replace(/\s*\(Leggings\)/gi, "");
      normalized = normalized.replace(/\s*\(Boots\)/gi, "");
      // Remove location indicators
      normalized = normalized.replace(/\s*\(Rift\)/gi, "");
      normalized = normalized.replace(/\s*\(Dungeon\)/gi, "");
      // Remove combined piece indicators
      normalized = normalized.replace(/\s*\+Boots/gi, "");
      normalized = normalized.replace(/\s*\+Leggings/gi, "");
      normalized = normalized.replace(/\s*\+Chestplate/gi, "");
      normalized = normalized.replace(/\s*\+Helm/gi, "");
      // Trim whitespace
      normalized = normalized.trim();
      return normalized;
    };
    
    // NEW: Extract all possible color names from compound names
    const extractColorVariants = function(name) {
      const variants = [];
      
      // Always add the normalized base name
      const normalized = normalizeColorName(name);
      variants.push(normalized);
      
      // Handle "Name1+Name2" format (e.g., "Salmon Helm+Boots")
      if (normalized.indexOf("+") !== -1) {
        const parts = normalized.split("+");
        const baseName = parts[0].trim();
        
        // Add piece-specific variants based on what pieces are in the compound name
        if (normalized.toLowerCase().indexOf("helm") !== -1 && hoveredPieceType === "helmet") {
          variants.push(baseName);
        }
        if (normalized.toLowerCase().indexOf("boots") !== -1 && hoveredPieceType === "boots") {
          variants.push(baseName);
        }
        if (normalized.toLowerCase().indexOf("chestplate") !== -1 && hoveredPieceType === "chestplate") {
          variants.push(baseName);
        }
        if (normalized.toLowerCase().indexOf("leggings") !== -1 && hoveredPieceType === "leggings") {
          variants.push(baseName);
        }
      }
      
      // Handle "Name1 & Name2" format (e.g., "Shadow Assassin & Wither Armor")
      if (normalized.indexOf("&") !== -1) {
        const parts = normalized.split("&");
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i].trim();
          if (part.length > 0) {
            variants.push(part);
          }
        }
      }
      
      // Handle "Name1/Name2/Name3" format (e.g., "Stone/Metal/Steel Chestplate")
      if (normalized.indexOf("/") !== -1) {
        const parts = normalized.split("/");
        const lastPart = parts[parts.length - 1].trim();
        
        // Extract the piece type from the last part (e.g., "Steel Chestplate" -> "Chestplate")
        let pieceTypeSuffix = "";
        const lowerLast = lastPart.toLowerCase();
        if (lowerLast.indexOf("chestplate") !== -1) pieceTypeSuffix = "Chestplate";
        else if (lowerLast.indexOf("leggings") !== -1) pieceTypeSuffix = "Leggings";
        else if (lowerLast.indexOf("boots") !== -1) pieceTypeSuffix = "Boots";
        else if (lowerLast.indexOf("helm") !== -1) pieceTypeSuffix = "Helm";
        
        // Add each variant with the piece type suffix
        for (let i = 0; i < parts.length; i++) {
          let part = parts[i].trim();
          
          // Remove piece type from part if it exists
          part = part.replace(/\s*(Chestplate|Leggings|Boots|Helm|Helmet)$/gi, "").trim();
          
          // Add the piece type suffix back if we found one
          if (pieceTypeSuffix) {
            variants.push(part + " " + pieceTypeSuffix);
          } else {
            variants.push(part);
          }
        }
      }
      
      return variants;
    };
    
    const colorVariants = extractColorVariants(bestMatchName);
    
    // Check if this color is ACTUALLY filled in the ArmorChecklist
    const isFade = isFadeDye(bestMatchName);
    const cache = isFade ? armorGui.fadeDyeOptimalCache : armorGui.normalColorCache;
    
    if (!cache) {
      ownershipCache[cacheKey] = null;
      return null;
    }
    
    // Find which category this color belongs to (with normalized name matching)
    let foundInCategory = null;
    let stageIndex = -1;
    const categoryNames = Object.keys(armorGui.categories);
    
    // Try each color variant
    for (let v = 0; v < colorVariants.length; v++) {
      const variant = colorVariants[v];
      
      for (let c = 0; c < categoryNames.length; c++) {
        const categoryName = categoryNames[c];
        const stages = armorGui.categories[categoryName];
        
        for (let s = 0; s < stages.length; s++) {
          const stageName = stages[s].name;
          const normalizedStageName = normalizeColorName(stageName);
          
          // Compare normalized names
          if (normalizedStageName === variant || normalizedStageName.indexOf(variant) !== -1 || variant.indexOf(normalizedStageName) !== -1) {
            foundInCategory = categoryName;
            stageIndex = s;
            break;
          }
        }
        
        if (foundInCategory) break;
      }
      
      if (foundInCategory) break;
    }
    
    if (!foundInCategory) {
      ownershipCache[cacheKey] = null;
      return null;
    }
    
    // Check if category cache exists
    const categoryCache = cache[foundInCategory];
    if (!categoryCache) {
      ownershipCache[cacheKey] = null;
      return null;
    }
    
    // For FADE DYES: use stage index
    if (isFade) {
      if (!categoryCache.matchesByIndex || !categoryCache.matchesByIndex[stageIndex]) {
        ownershipCache[cacheKey] = null;
        return null;
      }
      
      const matchData = categoryCache.matchesByIndex[stageIndex];
      const pieceData = matchData[hoveredPieceType];
      
      if (pieceData && pieceData !== null && pieceData.deltaE !== undefined) {
        const tier = pieceData.deltaE <= 1.0 ? 0 : (pieceData.deltaE <= 2.0 ? 1 : 2);
        const result = { tier: tier };
        ownershipCache[cacheKey] = result;
        return result;
      }
    } else {
      // For NORMAL COLORS: use hex
      const targetHex = armorGui.categories[foundInCategory][stageIndex].hex;
      
      if (!categoryCache.matches || !categoryCache.matches[targetHex]) {
        ownershipCache[cacheKey] = null;
        return null;
      }
      
      const matchData = categoryCache.matches[targetHex];
      const pieceData = matchData[hoveredPieceType];
      
      if (pieceData && pieceData !== null && pieceData.deltaE !== undefined) {
        const tier = pieceData.deltaE <= 1.0 ? 0 : (pieceData.deltaE <= 2.0 ? 1 : 2);
        const result = { tier: tier };
        ownershipCache[cacheKey] = result;
        return result;
      }
    }
    
    // Cache null result
    ownershipCache[cacheKey] = null;
  } catch (e) {
    // Silent fail
  }
  
  return null;
}

// ===== CHECK FOR DUPLICATE HEX IN COLLECTION =====
const dupeHexCache = {};

function checkForDupeHex(itemHex, itemUuid) {
  if (!itemHex) return null;
  
  const hexUpper = itemHex.toUpperCase();
  
  // Create cache key that includes UUID to differentiate scanned vs unscanned items
  const cacheKey = hexUpper + "|" + (itemUuid || "unscanned");
  
  // Return cached result if available
  if (dupeHexCache[cacheKey] !== undefined) {
    return dupeHexCache[cacheKey];
  }
  
  try {
    const collectionKeys = Object.keys(collection);
    let dupeCount = 0;
    let isThisItemInCollection = false;
    
    for (let i = 0; i < collectionKeys.length; i++) {
      const uuid = collectionKeys[i];
      const piece = collection[uuid];
      
      if (!piece || !piece.hexcode) continue;
      
      if (piece.hexcode.toUpperCase() === hexUpper) {
        dupeCount++;
        
        // Check if the hovered item IS this collection piece
        if (itemUuid && uuid === itemUuid) {
          isThisItemInCollection = true;
        }
      }
    }
    
    // For items IN collection: show dupe if there are 2+ pieces with this hex
    if (isThisItemInCollection && dupeCount >= 2) {
      const result = { count: dupeCount };
      dupeHexCache[cacheKey] = result;
      return result;
    }
    
    // For items NOT in collection (unscanned): show dupe if there's even 1 piece with this hex
    if (!isThisItemInCollection && dupeCount >= 1) {
      const result = { count: dupeCount + 1 }; // +1 to include the hovered piece
      dupeHexCache[cacheKey] = result;
      return result;
    }
    
    // Cache null result
    dupeHexCache[cacheKey] = null;
  } catch (e) {
    // Silent fail
  }
  
  return null;
}

// ===== SCAN CHEST CONTENTS =====
function scanChestContents() {
  if (!scanningEnabled) return;
  
  try {
    const container = Player.getContainer();
    if (!container) return;
    
    const chestLoc = getChestLocationFromLooking();
    const items = container.getItems();
    if (!items) return;
    
    let scannedCount = 0;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item) continue;
      
      const itemName = item.getName();
      if (!isSeymourArmor(itemName)) continue;
      
      const uuid = extractUuidFromItem(item);
      if (!uuid) continue;
      
      if (collection[uuid]) continue;
      
      const loreRaw = item.getLore();
      const itemHex = extractHexFromLore(loreRaw);
      if (!itemHex) continue;
      
      // Store hex in a unique variable name to avoid any reference issues
      const storedHex = "" + itemHex;
      
      const analysis = analyzeSeymourArmor(storedHex, itemName);
      if (!analysis) continue;
      
      const best = analysis.bestMatch;
      const itemRgb = hexToRgb(storedHex);
      const targetRgb = hexToRgb(best.targetHex);
      const absoluteDist = Math.abs(itemRgb.r - targetRgb.r) + 
                           Math.abs(itemRgb.g - targetRgb.g) + 
                           Math.abs(itemRgb.b - targetRgb.b);
      
      const wordMatch = matchesWordPattern(storedHex);
      const specialPattern = matchesSpecialPattern(storedHex);
      
      // Store top 3 matches
const top3Matches = [];
for (let m = 0; m < 3 && m < analysis.top3Matches.length; m++) {
  const match = analysis.top3Matches[m];
  const matchRgb = hexToRgb(match.targetHex);
  const matchAbsoluteDist = Math.abs(itemRgb.r - matchRgb.r) + 
                            Math.abs(itemRgb.g - matchRgb.g) + 
                            Math.abs(itemRgb.b - matchRgb.b);
  
  top3Matches[m] = {
    colorName: match.name,
    targetHex: match.targetHex,
    deltaE: match.deltaE,
    absoluteDistance: matchAbsoluteDist,
    tier: match.tier
  };
}

collection[uuid] = {
  pieceName: ChatLib.removeFormatting(itemName),
  uuid: uuid,
  hexcode: storedHex,
  specialPattern: specialPattern ? specialPattern.type : null,
  bestMatch: {
    colorName: best.name,
    targetHex: best.targetHex,
    deltaE: best.deltaE,
    absoluteDistance: absoluteDist,
    tier: analysis.tier
  },
  allMatches: top3Matches,
  wordMatch: wordMatch ? wordMatch.word : null,
  chestLocation: chestLoc,
  timestamp: Date.now()
};
      
      scannedCount++;
    }
    
    if (scannedCount > 0) {
      collection.save();
      ChatLib.chat("§a[Seymour Analyzer] §7Scanned §e" + scannedCount + "§7 new piece" + (scannedCount === 1 ? "" : "s") + "! Total: §e" + Object.keys(collection).length);
    }
    
  } catch (e) {
    // Silent fail
  }
}

let scanTimeout = null;
let isPrecaching = false;
let lastGuiOpenTime = 0;
let needsRecache = false;

register("guiOpened", function() {
  const now = Date.now();
  
  if (now - lastGuiOpenTime < 500) {
    return;
  }
  lastGuiOpenTime = now;
  
  isPrecaching = true;
  precacheComplete = false;
  
  setTimeout(function() {
    precacheChestItems();
    isPrecaching = false;
  }, 20);
  
  if (!scanningEnabled) return;
  
  if (scanTimeout) clearTimeout(scanTimeout);
  
  scanTimeout = setTimeout(function() {
    scanChestContents();
  }, 250);
});

// Add tick handler to recache when needed
register("tick", function() {
  if (needsRecache && !isPrecaching) {
    const container = Player.getContainer();
    if (container) {
      isPrecaching = true;
      precacheComplete = false;
      setTimeout(function() {
        precacheChestItems();
        isPrecaching = false;
        needsRecache = false;
      }, 20);
    }
  }
});

// ===== CACHE FOR ITEMS =====
const itemCache = new (Java.type('java.util.HashMap'))();
let hoveredItemData = null;

// Cache for ownership checks
const ownershipCache = {};
let lastOwnershipCacheTime = 0;

// ===== SEARCH FEATURE =====
let searchHexes = [];
let highlightedChests = [];

// ===== BOX POSITION =====
let boxPosition = {
  x: data.boxX,
  y: data.boxY
};

let isDragging = false;
let dragOffset = { x: 0, y: 0 };

function saveBoxPosition() {
  data.boxX = boxPosition.x;
  data.boxY = boxPosition.y;
  data.save();
}

let lastGuiRenderTime = 0;
let lastDetectedItem = null;

// ===== HIGHLIGHT ITEMS =====
let lastChestOpenTime = 0;
let precacheComplete = false;

function precacheChestItems() {
  perfLog = [];
  logPerf("Start precache");
  if (DEBUG || HIGHLIGHT_DEBUG) ChatLib.chat("§b[Debug] precacheChestItems() called");

  try {
    const container = Player.getContainer();
    if (!container) {
      if (DEBUG || HIGHLIGHT_DEBUG) ChatLib.chat("§c[Debug] Precache aborted: Player.getContainer() returned null");
      return;
    }
    
    const items = container.getItems();
    if (!items) {
      if (DEBUG || HIGHLIGHT_DEBUG) ChatLib.chat("§c[Debug] Precache aborted: container.getItems() returned null");
      return;
    }
    
    logPerf("Got container items");
    
    // FIXED: Better chest slot detection
    const containerSize = container.getSize();
    let chestSlots;
    
    // Determine actual chest slots based on container type
    if (containerSize === 90) {
      // Large chest (54) + player inventory (36) = 90
      chestSlots = 54;
    } else if (containerSize === 63) {
      // Standard chest (27) + player inventory (36) = 63
      chestSlots = 27;
    } else if (containerSize > 54) {
      // Other large containers
      chestSlots = Math.min(54, containerSize - 36);
    } else if (containerSize > 27) {
      // Other standard containers
      chestSlots = Math.min(27, containerSize - 36);
    } else {
      // Small containers or special GUIs - process all slots
      chestSlots = Math.max(0, containerSize - 36);
    }
    
    // Safety check: don't process more slots than exist
    chestSlots = Math.min(chestSlots, items.length);
    
    let needsUuidExtraction = [];
    
    // PHASE 1: Ultra-fast checks - NO UUID extraction at all!
    for (let i = 0; i < chestSlots; i++) {
      const item = items[i];
      if (!item) continue;
      
      const stack = item.itemStack;
      const name = item.getName();
      
      if (!isSeymourArmor(name)) {
        itemCache.put(stack, { tier: -1, isFade: false });
        continue;
      }
      
      const cachedData = itemCache.get(stack);
      if (cachedData !== null && cachedData !== undefined) {
        continue;
      }
      
      const loreRaw = item.getLore();
      const hex = extractHexFromLore(loreRaw);
      
      if (!hex) {
        itemCache.put(stack, { tier: -1, isFade: false });
        continue;
      }
      
      let foundInCache = false;
      const hexUpper = hex.toUpperCase();
      
      // Search uuidCache by hex (no UUID extraction needed!)
      const uuidKeys = Object.keys(uuidCache);
      for (let j = 0; j < uuidKeys.length; j++) {
        const cacheEntry = uuidCache[uuidKeys[j]];
        if (cacheEntry && cacheEntry.itemHex && cacheEntry.itemHex.toUpperCase() === hexUpper) {
          if (HIGHLIGHT_DEBUG) ChatLib.chat("§b[Debug] Precache: Found item by hex in uuidCache: " + hexUpper +" , recalculating flags.");
          // ALWAYS recalculate search/dupe flags (they may have changed!)
          cacheEntry.isSearchMatch = false;
          if (searchHexes.length > 0) {
            for (let s = 0; s < searchHexes.length; s++) {
              if (hexUpper === searchHexes[s]) {
                cacheEntry.isSearchMatch = true;
                break;
              }
            }
          }
          
          // Recalculate dupe flag if enabled
          if (data.dupesEnabled) {
            // We matched by hex and do not have the actual chest item's UUID here,
            // so treat the item as "unscanned" for dupe detection to correctly highlight dupes.
            try {
              const dupeResult = checkForDupeHex(hexUpper, null);
              // Only spam the debug message when DEBUG is enabled, but always ensure failures are visible
              if (HIGHLIGHT_DEBUG) ChatLib.chat("§b[Debug] Dupe check for hex " + hexUpper + ": " + (dupeResult ? "found" : "not found"));
              cacheEntry.isDupe = dupeResult ? true : false;
            } catch (e) {
              // If dupe checking throws, log the error only when debug enabled and don't break precaching
              if (DEBUG || HIGHLIGHT_DEBUG) ChatLib.chat("§c[Debug] Dupe check failed for hex " + hexUpper + ": " + e);
              cacheEntry.isDupe = false;
            }
          } else {
            cacheEntry.isDupe = false;
          }
          
          itemCache.put(stack, cacheEntry);
          foundInCache = true;
          break;
        }
      }
      
      if (foundInCache) {
        continue;
      }
      
      needsUuidExtraction.push({ item: item, stack: stack, name: name, hex: hex });
    }
    
    logPerf("Phase 1 complete (found " + needsUuidExtraction.length + " items needing UUID)");
    
    // PHASE 2: Extract UUIDs only for items not found by hex
    for (let i = 0; i < needsUuidExtraction.length; i++) {
      const entry = needsUuidExtraction[i];
      const uuid = extractUuidFromItem(entry.item);
      
      if (uuid && uuidCache[uuid]) {
        itemCache.put(entry.stack, uuidCache[uuid]);
        continue;
      }
      
      if (uuid && collection[uuid]) {
        const cacheData = getCacheDataFromCollection(uuid);
        if (cacheData) {
          itemCache.put(entry.stack, cacheData);
          uuidCache[uuid] = cacheData;
          continue;
        }
      }
      
      const analysis = analyzeSeymourArmor(entry.hex, entry.name);
      
      if (!analysis) {
        itemCache.put(entry.stack, { tier: -1, isFade: false });
        continue;
      }
      
      const wordMatch = data.wordsEnabled ? matchesWordPattern(entry.hex) : null;
      const specialPattern = data.patternsEnabled ? matchesSpecialPattern(entry.hex) : null;
      
      const cacheEntry = { 
        tier: analysis.tier, 
        isFade: analysis.isFadeDye,
        isCustom: analysis.bestMatch.isCustom,
        analysis: analysis,
        itemHex: entry.hex,
        wordMatch: wordMatch,
        specialPattern: specialPattern,
        // Pre-calculate highlight states
        isSearchMatch: false,
        isDupe: false
      };
      
      // Calculate search match
      if (searchHexes.length > 0) {
        const hexUpper = entry.hex.toUpperCase();
        for (let s = 0; s < searchHexes.length; s++) {
          if (hexUpper === searchHexes[s]) {
            cacheEntry.isSearchMatch = true;
            break;
          }
        }
      }
      
      // Calculate dupe (only if enabled and we have UUID)
      if (data.dupesEnabled && uuid) {
        const dupeResult = checkForDupeHex(entry.hex, uuid);
        if (dupeResult) {
          cacheEntry.isDupe = true;
        }
      }
      
      itemCache.put(entry.stack, cacheEntry);
      
      if (uuid) {
        uuidCache[uuid] = cacheEntry;
      }
    }
    
    logPerf("Phase 2 complete");
    
    // PHASE 3: Ensure dupe detection for chest items — even those that matched uuidCache
    try {
      if (data.dupesEnabled) {
        if (HIGHLIGHT_DEBUG) ChatLib.chat("§b[Debug] Precache: Running post-pass dupe recalculation for chest items");
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (!item) continue;
          const stack = item.itemStack;
          const cacheEntry = itemCache.get(stack);
          if (!cacheEntry || !cacheEntry.itemHex) continue;

          try {
            const itemUuid = extractUuidFromItem(item);
            const dupeResult = checkForDupeHex(cacheEntry.itemHex, itemUuid);
            cacheEntry.isDupe = dupeResult ? true : false;
            itemCache.put(stack, cacheEntry);
            if (HIGHLIGHT_DEBUG) ChatLib.chat("§b[Debug] Precache post-pass: Hex #" + cacheEntry.itemHex + " UUID:" + (itemUuid || 'null') + " dupe=" + (cacheEntry.isDupe ? 'true' : 'false'));
          } catch (e) {
            if (HIGHLIGHT_DEBUG) ChatLib.chat("§c[Debug] Precache post-pass dupe check failed: " + e);
          }
        }
      }
    } catch (e) {
      if (DEBUG) ChatLib.chat("§c[Debug] Precache post-pass error: " + e);
    }

    precacheComplete = true;
    
  } catch (e) {
    if (DEBUG) ChatLib.chat("§c[Debug] Precache error: " + e);
  }
}

register('renderItemIntoGui', function(item, x, y) {
  if (!data.highlightsEnabled && !data.infoBoxEnabled) return;
  
  try {
    const name = item.getName();
    if (!isSeymourArmor(name)) return;
    
    const stack = item.itemStack;
    
    // Try itemCache first (from precache)
    let cacheData = itemCache.get(stack);
    
    // If not in itemCache, try uuidCache (for persistent items)
    if (!cacheData || cacheData.tier === -1) {
      const uuid = extractUuidFromItem(item);
      if (uuid && uuidCache[uuid]) {
        cacheData = uuidCache[uuid];
        // Store in itemCache for next frame
        itemCache.put(stack, cacheData);
      }
      
      // If STILL no cache data AND not currently precaching, analyze it now
      if (!cacheData && !isPrecaching) {
        // Check if it's in collection first
        if (uuid && collection[uuid]) {
          cacheData = getCacheDataFromCollection(uuid);
          if (cacheData) {
            itemCache.put(stack, cacheData);
            if (uuid) uuidCache[uuid] = cacheData;
          }
        }
        
        // If still nothing, do a live analysis
        if (!cacheData) {
          const loreRaw = item.getLore();
          const hex = extractHexFromLore(loreRaw);
          if (hex) {
            const analysis = analyzeSeymourArmor(hex, name);
            if (analysis) {
              const wordMatch = data.wordsEnabled ? matchesWordPattern(hex) : null;
              const specialPattern = data.patternsEnabled ? matchesSpecialPattern(hex) : null;
              
              cacheData = { 
                tier: analysis.tier, 
                isFade: analysis.isFadeDye,
                isCustom: analysis.bestMatch.isCustom,
                analysis: analysis,
                itemHex: hex,
                wordMatch: wordMatch,
                specialPattern: specialPattern,
                // Pre-calculate highlight states
                isSearchMatch: false,
                isDupe: false
              };
              
              // Calculate search match
              if (searchHexes.length > 0) {
                const hexUpper = hex.toUpperCase();
                for (let s = 0; s < searchHexes.length; s++) {
                  if (hexUpper === searchHexes[s]) {
                    cacheData.isSearchMatch = true;
                    break;
                  }
                }
              }
              
              // Calculate dupe (only if enabled and we have UUID)
              if (data.dupesEnabled && uuid) {
                const dupeResult = checkForDupeHex(hex, uuid);
                if (dupeResult) {
                  cacheData.isDupe = true;
                }
              }
              
              itemCache.put(stack, cacheData);
              if (uuid) uuidCache[uuid] = cacheData;
            }
          }
        }
      }
    }
    
    // If still no cache data, skip
    if (!cacheData || cacheData.tier === -1) return;
    
    // Handle hover for info box (only when hovering, not every frame)
    if (data.infoBoxEnabled && cacheData.analysis) {
      const Mouse = Java.type("org.lwjgl.input.Mouse");
      const mc = Client.getMinecraft();
      const scaledRes = new (Java.type("net.minecraft.client.gui.ScaledResolution"))(mc);
      const scale = scaledRes.func_78325_e();
      const mouseX = Mouse.getX() / scale;
      const mouseY = (mc.field_71440_d - Mouse.getY()) / scale;
      
      if (mouseX >= x && mouseX < x + 16 && mouseY >= y && mouseY < y + 16) {
        // Only extract UUID when actually hovering
        const uuid = extractUuidFromItem(item);
        setHoveredItemData(cacheData, uuid, name);
      }
    }
    
    // Draw highlights
    if (!data.highlightsEnabled) return;
    
    const GL11 = Java.type("org.lwjgl.opengl.GL11");
    GL11.glPushMatrix();
    GL11.glTranslatef(0, 0, 100);
    GL11.glDisable(GL11.GL_DEPTH_TEST);
    
    // Use pre-calculated highlight states (calculated during precache or live analysis)
    const currentWordMatch = (data.wordsEnabled && cacheData.wordMatch) ? cacheData.wordMatch : null;
    const currentSpecialPattern = (data.patternsEnabled && cacheData.specialPattern) ? cacheData.specialPattern : null;

    // Priority order: Dupe > Search > Word > Pattern > Tier
    if (cacheData.isDupe) {
      Renderer.drawRect(Renderer.color(0, 0, 0, 200), x, y, 16, 16);
    } else if (cacheData.isSearchMatch) {
      Renderer.drawRect(Renderer.color(0, 255, 0, 150), x, y, 16, 16);
    } else if (currentWordMatch) {
      Renderer.drawRect(Renderer.color(139, 69, 19, 150), x, y, 16, 16);
    } else if (currentSpecialPattern) {
      Renderer.drawRect(Renderer.color(147, 51, 234, 150), x, y, 16, 16);
    } else if (cacheData.tier !== 3) {
      const isCurrentlyCustom = cacheData.isCustom;
      
      if (isCurrentlyCustom) {
        if (cacheData.tier === 0) {
          Renderer.drawRect(Renderer.color(0, 100, 0, 150), x, y, 16, 16);
        } else if (cacheData.tier === 1) {
          Renderer.drawRect(Renderer.color(85, 107, 47, 150), x, y, 16, 16);
        } else if (cacheData.tier === 2) {
          Renderer.drawRect(Renderer.color(128, 128, 0, 120), x, y, 16, 16);
        }
      } else if (cacheData.isFade) {
        if (cacheData.tier === 0) {
          Renderer.drawRect(Renderer.color(0, 0, 255, 120), x, y, 16, 16);
        } else if (cacheData.tier === 1) {
          Renderer.drawRect(Renderer.color(135, 206, 250, 120), x, y, 16, 16);
        } else if (cacheData.tier === 2) {
          Renderer.drawRect(Renderer.color(255, 255, 0, 120), x, y, 16, 16);
        }
      } else {
        if (cacheData.tier === 0) {
          Renderer.drawRect(Renderer.color(255, 0, 0, 120), x, y, 16, 16);
        } else if (cacheData.tier === 1) {
          Renderer.drawRect(Renderer.color(255, 105, 180, 120), x, y, 16, 16);
        } else if (cacheData.tier === 2) {
          Renderer.drawRect(Renderer.color(255, 165, 0, 120), x, y, 16, 16);
        }
      }
    }
    
    GL11.glEnable(GL11.GL_DEPTH_TEST);
    GL11.glPopMatrix();
  } catch (e) {
    // Silent fail
  }
});

// ===== TRACK HOVERED ITEM =====
register("itemTooltip", function(lore, item, event) {
  if (DEBUG) ChatLib.chat("§b[Debug] Tooltip event fired!");
  try {
    if (!item) return;
    
    const itemName = item.getName ? item.getName() : (item.displayName ? item.displayName : "");
    
    if (DEBUG) ChatLib.chat("§b[Debug] Tooltip item: " + ChatLib.removeFormatting(itemName));
    
    if (!isSeymourArmor(itemName)) return;
    
    if (DEBUG) ChatLib.chat("§a[Debug] Tooltip is Seymour armor!");
    
    const stack = item.itemStack;
    let cacheData = itemCache.get(stack);
    
    if (!cacheData) {
      const uuid = extractUuidFromItem(item);
      
      if (uuid && collection[uuid]) {
        cacheData = getCacheDataFromCollection(uuid);
        if (cacheData) {
          itemCache.put(stack, cacheData);
        }
      } else {
        const hex = extractHexFromLore(lore);
        if (!hex) return;
        
        const analysis = analyzeSeymourArmor(hex, itemName);
        if (!analysis) return;
        
        const wordMatch = data.wordsEnabled ? matchesWordPattern(hex) : null;
        const specialPattern = data.patternsEnabled ? matchesSpecialPattern(hex) : null;
        
        cacheData = { 
          tier: analysis.tier, 
          isFade: analysis.isFadeDye,
          isCustom: analysis.bestMatch.isCustom,
          analysis: analysis,
          itemHex: hex,
          wordMatch: wordMatch,
          specialPattern: specialPattern
        };
        itemCache.put(stack, cacheData);
      }
    }
    
    if (!cacheData || !cacheData.analysis) return;
    
    const uuid = extractUuidFromItem(item);
    setHoveredItemData(cacheData, uuid, itemName);
    
    if (DEBUG) ChatLib.chat("§a[Debug] Tooltip hoveredItemData set!");
    
  } catch (e) {
    if (DEBUG) ChatLib.chat("§c[Debug] Tooltip error: " + e);
  }
});

// ===== DETECT HOVERED ITEM AND RENDER INFO BOX =====
register("postGuiRender", function(mouseX, mouseY, gui) {
  try {
    if (!gui) return;
    
    const guiClassName = gui.getClass().getName();
    if (DEBUG) ChatLib.chat("§b[DEBUG] postGuiRender - GUI Class: " + guiClassName);
    
    const Mouse = Java.type("org.lwjgl.input.Mouse");
    const mc = Client.getMinecraft();
    const scaledRes = new (Java.type("net.minecraft.client.gui.ScaledResolution"))(mc);
    const scale = scaledRes.func_78325_e();
    const actualMouseX = Mouse.getX() / scale;
    const actualMouseY = (mc.field_71440_d - Mouse.getY()) / scale;
    
    const GuiContainer = Java.type("net.minecraft.client.gui.inventory.GuiContainer");
    const isContainer = gui instanceof GuiContainer;
    
    let foundItem = null;
    let foundUuid = null;
    
    if (isContainer) {
      try {
        let guiLeft, guiTop;
        
        try {
          guiLeft = gui.field_147003_i;
          guiTop = gui.field_147009_r;
        } catch (e) {}
        
        if (guiLeft === undefined || guiLeft === null) {
          try {
            guiLeft = gui.getGuiLeft ? gui.getGuiLeft() : gui.guiLeft;
            guiTop = gui.getGuiTop ? gui.getGuiTop() : gui.guiTop;
          } catch (e) {}
        }
        
        if (guiLeft === undefined || guiLeft === null) {
          const screenWidth = scaledRes.func_78326_a();
          const screenHeight = scaledRes.func_78328_b();
          const xSize = gui.field_146999_f || gui.xSize || 176;
          const ySize = gui.field_147000_g || gui.ySize || 166;
          guiLeft = (screenWidth - xSize) / 2;
          guiTop = (screenHeight - ySize) / 2;
        }
        
        const container = Player.getContainer();
        if (container) {
          const theSlot = gui.field_147006_u;
          
          if (theSlot && theSlot.func_75216_d()) {
            const mcStack = theSlot.func_75211_c();
            foundItem = new Item(mcStack);
            foundUuid = extractUuidFromItem(foundItem);
            if (DEBUG) ChatLib.chat("§a[Debug] Found item using theSlot: " + foundItem.getName());
          }
        }
      } catch (e) {
        if (DEBUG) ChatLib.chat("§c[Debug] Container detection error: " + e);
      }
    }
    
    if (foundItem) {
      const itemName = foundItem.getName();
      
      if (DEBUG) ChatLib.chat("§a[Debug] Item: " + ChatLib.removeFormatting(itemName));
      
      if (isSeymourArmor(itemName)) {
        if (DEBUG) ChatLib.chat("§a[Debug] IS Seymour armor!");
        
        const stack = foundItem.itemStack;
        let cacheData = itemCache.get(stack);
        
        if (!cacheData) {
          const uuid = foundUuid;
          
          if (uuid && collection[uuid]) {
            cacheData = getCacheDataFromCollection(uuid);
            if (cacheData) {
              itemCache.put(stack, cacheData);
            }
          } else {
            const loreRaw = foundItem.getLore();
            const hex = extractHexFromLore(loreRaw);
            if (hex) {
              const analysis = analyzeSeymourArmor(hex, itemName);
              if (analysis) {
                const wordMatch = data.wordsEnabled ? matchesWordPattern(hex) : null;
                const specialPattern = data.patternsEnabled ? matchesSpecialPattern(hex) : null;
                
                cacheData = { 
                  tier: analysis.tier, 
                  isFade: analysis.isFadeDye,
                  analysis: analysis,
                  itemHex: hex,
                  wordMatch: wordMatch,
                  specialPattern: specialPattern
                };
                itemCache.put(stack, cacheData);
              }
            }
          }
        }
        
        if (cacheData && cacheData.analysis) {
          setHoveredItemData(cacheData, foundUuid, itemName);

          if (DEBUG) ChatLib.chat("§a[Debug] hoveredItemData FORCE UPDATED from container!");
        }
      }
    }
    
    // RENDER INFO BOX
    if (!hoveredItemData || !data.infoBoxEnabled) {
      if (DEBUG && !hoveredItemData) ChatLib.chat("§c[Debug] No hoveredItemData to render");
      return;
    }
    
    if (DEBUG) ChatLib.chat("§a[Debug] Rendering info box!");
    
    const infoData = hoveredItemData;
    const Keyboard = Java.type("org.lwjgl.input.Keyboard");
    const isShiftHeld = Keyboard.isKeyDown(Keyboard.KEY_LSHIFT) || Keyboard.isKeyDown(Keyboard.KEY_RSHIFT);
    
    if (isDragging && Mouse.isButtonDown(0)) {
      boxPosition.x = actualMouseX - dragOffset.x;
      boxPosition.y = actualMouseY - dragOffset.y;
    } else if (isDragging && !Mouse.isButtonDown(0)) {
      isDragging = false;
    }
    
    const boxX = boxPosition.x;
    const boxY = boxPosition.y;
    
    // Calculate dynamic width
    let maxTextWidth = 170;
    
    if (isShiftHeld) {
      for (let i = 0; i < 3 && i < infoData.top3.length; i++) {
        const match = infoData.top3[i];
        const line1 = (i + 1) + ". " + match.name;
        const line2 = "  ΔE: " + match.deltaE.toFixed(2) + " #" + match.targetHex;
        
        const width1 = Renderer.getStringWidth(line1) + 10;
        const width2 = Renderer.getStringWidth(line2) + 10;
        
        if (width1 > maxTextWidth) maxTextWidth = width1;
        if (width2 > maxTextWidth) maxTextWidth = width2;
      }
    } else {
      const texts = [
        "Closest: " + infoData.name,
        "Target: #" + infoData.hex,
        "ΔE: " + infoData.deltaE.toFixed(2),
        "Absolute: " + infoData.absoluteDist
      ];
      
      for (let i = 0; i < texts.length; i++) {
        const width = Renderer.getStringWidth(texts[i]) + 10;
        if (width > maxTextWidth) maxTextWidth = width;
      }
    }
    
    const boxWidth = Math.max(170, Math.min(maxTextWidth, 400));
    let boxHeight = isShiftHeld ? 120 : 90;
    if (data.wordsEnabled && infoData.wordMatch) boxHeight += 10;
    if (data.patternsEnabled && infoData.specialPattern) boxHeight += 10;

    // ONLY add space for dupe warning if dupes enabled AND we actually found a dupe
    if (data.dupesEnabled) {
      const hoveredUuid = hoveredItemData.uuid || null;
      const dupeCheck = checkForDupeHex(infoData.itemHex, hoveredUuid);
      if (dupeCheck) boxHeight += 10;
    }
    
    const isMouseOver = actualMouseX >= boxX && actualMouseX <= boxX + boxWidth &&
                        actualMouseY >= boxY && actualMouseY <= boxY + boxHeight;
    
    const GL11 = Java.type("org.lwjgl.opengl.GL11");
    GL11.glPushMatrix();
    GL11.glDisable(GL11.GL_DEPTH_TEST);
    GL11.glDisable(GL11.GL_LIGHTING);
    GL11.glEnable(GL11.GL_BLEND);
    GL11.glBlendFunc(GL11.GL_SRC_ALPHA, GL11.GL_ONE_MINUS_SRC_ALPHA);
    GL11.glColor4f(1.0, 1.0, 1.0, 1.0);
    GL11.glTranslatef(0, 0, 500);

    const bgAlpha = 255;
    Renderer.drawRect(Renderer.color(0, 0, 0, bgAlpha), boxX, boxY, boxWidth, boxHeight);
    
    let borderColor;
    if (infoData.isCustom) {
      // Custom color borders
      if (infoData.tier === 0) {
        borderColor = Renderer.color(0, 150, 0, 255); // Bright dark green
      } else if (infoData.tier === 1) {
        borderColor = Renderer.color(107, 142, 35, 255); // Olive drab
      } else if (infoData.tier === 2) {
        borderColor = Renderer.color(154, 205, 50, 255); // Yellow green
      } else {
        borderColor = Renderer.color(128, 128, 128, 255);
      }
    } else if (infoData.isFadeDye) {
      if (infoData.tier === 0) {
        borderColor = Renderer.color(0, 0, 255, 255);
      } else if (infoData.tier === 1) {
        borderColor = Renderer.color(135, 206, 250, 255);
      } else if (infoData.tier === 2) {
        borderColor = Renderer.color(255, 255, 0, 255);
      } else {
        borderColor = Renderer.color(128, 128, 128, 255);
      }
    } else {
      if (infoData.tier === 0) {
        borderColor = Renderer.color(255, 0, 0, 255);
      } else if (infoData.tier === 1) {
        borderColor = Renderer.color(255, 105, 180, 255);
      } else if (infoData.tier === 2) {
        borderColor = Renderer.color(255, 165, 0, 255);
      } else {
        borderColor = Renderer.color(128, 128, 128, 255);
      }
    }
    
    Renderer.drawRect(borderColor, boxX, boxY, boxWidth, 2);
    Renderer.drawRect(borderColor, boxX, boxY + boxHeight - 2, boxWidth, 2);
    Renderer.drawRect(borderColor, boxX, boxY, 2, boxHeight);
    Renderer.drawRect(borderColor, boxX + boxWidth - 2, boxY, 2, boxHeight);
    
    if (isShiftHeld && isMouseOver) {
      Renderer.drawStringWithShadow("§l§nSeymour §7[DRAG]", boxX + 5, boxY + 5);
    } else {
      Renderer.drawStringWithShadow("§l§nSeymour Analysis", boxX + 5, boxY + 5);
    }
    
    Renderer.drawStringWithShadow("§7Piece: §f#" + infoData.itemHex, boxX + 5, boxY + 18);

    let currentYOffset = 28;
    if (data.wordsEnabled && infoData.wordMatch) {
      Renderer.drawStringWithShadow("§d§l✦ WORD: " + infoData.wordMatch.word, boxX + 5, boxY + currentYOffset);
      currentYOffset += 10;
    }
    if (data.patternsEnabled && infoData.specialPattern) {
      const rawType = infoData.specialPattern?.type;
      const type = (typeof rawType === "string") ? rawType : (rawType && rawType.type) || "";

      const patternName = type === "paired" ? "PAIRED" :
                          (type === "repeating" ? "REPEATING" :
                          (type === "palindrome" ? "PALINDROME" : "AxBxCx"));

      Renderer.drawStringWithShadow("§5§l★ PATTERN: " + patternName, boxX + 5, boxY + currentYOffset);
      currentYOffset += 10;
    }
    
    if (isShiftHeld) {
      Renderer.drawStringWithShadow("§7§lTop 3 Matches:", boxX + 5, boxY + currentYOffset);
      
      for (let i = 0; i < 3 && i < infoData.top3.length; i++) {
        const match = infoData.top3[i];
        const yPos = boxY + currentYOffset + 12 + (i * 25);
        
        let colorPrefix;
        if (match.isCustom) {
          colorPrefix = match.tier === 0 ? "§2" : (match.tier === 1 ? "§a" : (match.tier === 2 ? "§e" : "§7"));
        } else if (match.isFade) {
          colorPrefix = match.tier === 0 ? "§9" : (match.tier === 1 ? "§b" : (match.tier === 2 ? "§e" : "§7"));
        } else {
          colorPrefix = match.tier === 0 ? "§c" : (match.tier === 1 ? "§d" : (match.tier === 2 ? "§6" : "§7"));
        }
        
        Renderer.drawStringWithShadow(colorPrefix + (i + 1) + ". §f" + match.name, boxX + 5, yPos);
        Renderer.drawStringWithShadow("§7  ΔE: " + colorPrefix + match.deltaE.toFixed(2) + " §7#" + match.targetHex, boxX + 5, yPos + 10);
      }
    } else {
      Renderer.drawStringWithShadow("§7Closest: §f" + infoData.name, boxX + 5, boxY + currentYOffset);
      Renderer.drawStringWithShadow("§7Target: §7#" + infoData.hex, boxX + 5, boxY + currentYOffset + 10);
      
      let deltaColorPrefix;
      if (infoData.isCustom) {
        deltaColorPrefix = infoData.tier === 0 ? "§2" : (infoData.tier === 1 ? "§a" : (infoData.tier === 2 ? "§e" : "§7"));
      } else if (infoData.isFadeDye) {
        deltaColorPrefix = infoData.tier === 0 ? "§9" : (infoData.tier === 1 ? "§b" : (infoData.tier === 2 ? "§e" : "§7"));
      } else {
        deltaColorPrefix = infoData.tier === 0 ? "§c" : (infoData.tier === 1 ? "§d" : (infoData.tier === 2 ? "§6" : "§7"));
      }
      
      Renderer.drawStringWithShadow(deltaColorPrefix + "ΔE: §f" + infoData.deltaE.toFixed(2), boxX + 5, boxY + currentYOffset + 20);
      Renderer.drawStringWithShadow("§7Absolute: §f" + infoData.absoluteDist, boxX + 5, boxY + currentYOffset + 30);
      
      let tierText;
      if (infoData.isCustom) {
        tierText = infoData.tier === 0 || infoData.tier === 1 ? "§2§l★ CUSTOM T1" : (infoData.tier === 2 ? "§a§l★ CUSTOM T2" : "§7§l✗ T3+");
      } else if (infoData.isFadeDye) {
        tierText = infoData.tier === 0 ? "§9§lT1<" : (infoData.tier === 1 ? "§b§lT1" : (infoData.tier === 2 ? "§e§lT2" : "§7§l✗ T3+"));
      } else {
        tierText = infoData.tier === 0 ? "§c§lT1<" : (infoData.tier === 1 ? "§d§lT1" : (infoData.tier === 2 ? "§6§lT2" : "§7§l✗ T3+"));
      }
      
      Renderer.drawStringWithShadow(tierText, boxX + 5, boxY + currentYOffset + 40);
      
      // Check if piece is owned in collection (at the bottom) - USE CACHED DATA
    if (infoData.ownedPiece) {
    let ownershipText;
    // Show the tier that's ACTUALLY in the checklist
    const checklistTier = infoData.ownedPiece.tier;
    if (checklistTier === 0 || checklistTier === 1) {
        ownershipText = "§a§l✓ Checklist";
    } else if (checklistTier === 2) {
        ownershipText = "§e§l✓ Checklist";
    } else {
        ownershipText = "§7§l✓ Checklist";
    }
    Renderer.drawStringWithShadow(ownershipText, boxX + 5, boxY + currentYOffset + 50);
    } else {
    Renderer.drawStringWithShadow("§c§l✗ Checklist", boxX + 5, boxY + currentYOffset + 50);
    }

      // Check for exact dupe hex - USE CACHED DATA
      if (infoData.dupeCheck) {
          Renderer.drawStringWithShadow("§c§l⚠ DUPE HEX §7(x" + infoData.dupeCheck.count + ")", boxX + 5, boxY + currentYOffset + 60);
      }
    }

    GL11.glEnable(GL11.GL_DEPTH_TEST);
    GL11.glPopMatrix();
    
  } catch (e) {
    if (DEBUG) ChatLib.chat("§c[Debug] postGuiRender error: " + e);
  }
});

// ===== MOUSE HANDLERS =====
let lastMouseDown = false;

register("guiMouseClick", function(mouseX, mouseY, button, gui, event) {
  if (!hoveredItemData || button !== 0) return;
  
  const Keyboard = Java.type("org.lwjgl.input.Keyboard");
  if (!Keyboard.isKeyDown(Keyboard.KEY_LSHIFT) && !Keyboard.isKeyDown(Keyboard.KEY_RSHIFT)) return;
  
  const Mouse = Java.type("org.lwjgl.input.Mouse");
  const mc = Client.getMinecraft();
  const scaledRes = new (Java.type("net.minecraft.client.gui.ScaledResolution"))(mc);
  const scale = scaledRes.func_78325_e();
  const actualMouseX = Mouse.getX() / scale;
  const actualMouseY = (mc.field_71440_d - Mouse.getY()) / scale;
  
  const boxWidth = 170;
  const boxHeight = 110;
  
  if (actualMouseX >= boxPosition.x && actualMouseX <= boxPosition.x + boxWidth &&
      actualMouseY >= boxPosition.y && actualMouseY <= boxPosition.y + boxHeight) {
    isDragging = true;
    dragOffset.x = actualMouseX - boxPosition.x;
    dragOffset.y = actualMouseY - boxPosition.y;
    lastMouseDown = true;
  }
});

register("guiMouseRelease", function(mouseX, mouseY, button, gui, event) {
  if (button === 0) {
    if (isDragging) {
      saveBoxPosition();
      ChatLib.chat("§a[Seymour Analyzer] §7Position saved!");
    }
    isDragging = false;
    lastMouseDown = false;
  }
});

register("renderOverlay", function() {
  if (!hoveredItemData) return;
  
  const Keyboard = Java.type("org.lwjgl.input.Keyboard");
  if (!Keyboard.isKeyDown(Keyboard.KEY_LSHIFT) && !Keyboard.isKeyDown(Keyboard.KEY_RSHIFT)) return;
  
  const Mouse = Java.type("org.lwjgl.input.Mouse");
  const mc = Client.getMinecraft();
  const scaledRes = new (Java.type("net.minecraft.client.gui.ScaledResolution"))(mc);
  const scale = scaledRes.func_78325_e();
  const mouseX = Mouse.getX() / scale;
  const mouseY = (mc.field_71440_d - Mouse.getY()) / scale;
  
  const isMouseDown = Mouse.isButtonDown(0);
  const boxWidth = 170;
  const boxHeight = 110;
  
  if (isMouseDown && !lastMouseDown && !isDragging) {
    if (mouseX >= boxPosition.x && mouseX <= boxPosition.x + boxWidth &&
        mouseY >= boxPosition.y && mouseY <= boxPosition.y + boxHeight) {
      isDragging = true;
      dragOffset.x = mouseX - boxPosition.x;
      dragOffset.y = mouseY - boxPosition.y;
    }
  }
  
  if (!isMouseDown && lastMouseDown && isDragging) {
    saveBoxPosition();
    ChatLib.chat("§a[Seymour Analyzer] §7Position saved!");
    isDragging = false;
  }
  
  lastMouseDown = isMouseDown;
});

register("guiClosed", function() {
  hoveredItemData = null;
  isDragging = false;
});

// ===== RENDER CHEST HIGHLIGHTS =====
register("renderWorld", function(partialTicks) {
  if (highlightedChests.length === 0) return;
  
  try {
    const Tessellator = Java.type("net.minecraft.client.renderer.Tessellator");
    const WorldRenderer = Java.type("net.minecraft.client.renderer.WorldRenderer");
    const DefaultVertexFormats = Java.type("net.minecraft.client.renderer.vertex.DefaultVertexFormats");
    const GL11 = Java.type("org.lwjgl.opengl.GL11");
    
    const tessellator = Tessellator.func_178181_a();
    const worldRenderer = tessellator.func_178180_c();
    
    const player = Player.getPlayer();
    const x = player.field_70142_S + (player.field_70165_t - player.field_70142_S) * partialTicks;
    const y = player.field_70137_T + (player.field_70163_u - player.field_70137_T) * partialTicks;
    const z = player.field_70136_U + (player.field_70161_v - player.field_70136_U) * partialTicks;
    
    GL11.glPushMatrix();
    GL11.glTranslated(-x, -y, -z);
    GL11.glDisable(GL11.GL_TEXTURE_2D);
    GL11.glDisable(GL11.GL_DEPTH_TEST);
    GL11.glEnable(GL11.GL_BLEND);
    GL11.glBlendFunc(GL11.GL_SRC_ALPHA, GL11.GL_ONE_MINUS_SRC_ALPHA);
    GL11.glLineWidth(3.0);
    
    for (let i = 0; i < highlightedChests.length; i++) {
      const chest = highlightedChests[i];
      
      const r = 0.0, g = 1.0, b = 0.0, a = 0.8;
      
      // Bottom face
      worldRenderer.func_181668_a(3, DefaultVertexFormats.field_181706_f);
      worldRenderer.func_181662_b(chest.x, chest.y, chest.z).func_181666_a(r, g, b, a).func_181675_d();
      worldRenderer.func_181662_b(chest.x + 1, chest.y, chest.z).func_181666_a(r, g, b, a).func_181675_d();
      worldRenderer.func_181662_b(chest.x + 1, chest.y, chest.z + 1).func_181666_a(r, g, b, a).func_181675_d();
      worldRenderer.func_181662_b(chest.x, chest.y, chest.z + 1).func_181666_a(r, g, b, a).func_181675_d();
      tessellator.func_78381_a();
      
      // Top face
      worldRenderer.func_181668_a(3, DefaultVertexFormats.field_181706_f);
      worldRenderer.func_181662_b(chest.x, chest.y + 1, chest.z).func_181666_a(r, g, b, a).func_181675_d();
      worldRenderer.func_181662_b(chest.x + 1, chest.y + 1, chest.z).func_181666_a(r, g, b, a).func_181675_d();
      worldRenderer.func_181662_b(chest.x + 1, chest.y + 1, chest.z + 1).func_181666_a(r, g, b, a).func_181675_d();
      worldRenderer.func_181662_b(chest.x, chest.y + 1, chest.z + 1).func_181666_a(r, g, b, a).func_181675_d();
      tessellator.func_78381_a();
      
      // Vertical lines
      worldRenderer.func_181668_a(1, DefaultVertexFormats.field_181706_f);
      worldRenderer.func_181662_b(chest.x, chest.y, chest.z).func_181666_a(r, g, b, a).func_181675_d();
      worldRenderer.func_181662_b(chest.x, chest.y + 1, chest.z).func_181666_a(r, g, b, a).func_181675_d();
      
      worldRenderer.func_181662_b(chest.x + 1, chest.y, chest.z).func_181666_a(r, g, b, a).func_181675_d();
      worldRenderer.func_181662_b(chest.x + 1, chest.y + 1, chest.z).func_181666_a(r, g, b, a).func_181675_d();
      
      worldRenderer.func_181662_b(chest.x + 1, chest.y, chest.z + 1).func_181666_a(r, g, b, a).func_181675_d();
      worldRenderer.func_181662_b(chest.x + 1, chest.y + 1, chest.z + 1).func_181666_a(r, g, b, a).func_181675_d();
      
      worldRenderer.func_181662_b(chest.x, chest.y, chest.z + 1).func_181666_a(r, g, b, a).func_181675_d();
      worldRenderer.func_181662_b(chest.x, chest.y + 1, chest.z + 1).func_181666_a(r, g, b, a).func_181675_d();
      tessellator.func_78381_a();
    }
    
    GL11.glEnable(GL11.GL_DEPTH_TEST);
    GL11.glEnable(GL11.GL_TEXTURE_2D);
    GL11.glDisable(GL11.GL_BLEND);
    GL11.glPopMatrix();
  } catch (e) {
    ChatLib.chat("§c[Seymour] Render error: " + e);
  }
});

// ===== COMMANDS =====
let commandExecuting = false;
let executionCount = 0;

register("command", function() {
  executionCount++;
  
  if (commandExecuting) {
    return;
  }
  commandExecuting = true;
  
  try {
    const args = Array.prototype.slice.call(arguments);
    const arg1 = args[0];
    const arg2 = args[1];

// Handle database/db subcommand
  if (arg1 && (arg1.toLowerCase() === "database" || arg1.toLowerCase() === "db")) {
    dbGui.open(hexSearchText = arg2 ? arg2.toUpperCase() : null);
    return;
  }
  
  // Handle sets/checklist subcommand
  if (arg1 && (arg1.toLowerCase() === "sets" || arg1.toLowerCase() === "checklist")) {
    armorGui.open();
    return;
  }

  // Handle bestsets subcommand
  if (arg1 && (arg1.toLowerCase() === "bestsets" || arg1.toLowerCase() === "best")) {
    bestSetsGui.open();
    return;
  }
  
  // Handle scan subcommand
  if (arg1 && arg1.toLowerCase() === "scan") {
    if (!arg2) {
      ChatLib.chat("§a[Seymour Analyzer] §7Usage: /seymour scan <start|stop>");
      return;
    }
    
    if (arg2.toLowerCase() === "start") {
      scanningEnabled = true;
      ChatLib.chat("§a[Seymour Analyzer] §7Scanning §aenabled§7! Open chests to automatically scan Seymour pieces.");
      return;
    } else if (arg2.toLowerCase() === "stop") {
      scanningEnabled = false;
      const count = Object.keys(collection).length;
      ChatLib.chat("§a[Seymour Analyzer] §7Scanning §cdisabled§7! Collection has §e" + count + " §7pieces.");
      return;
    } else {
      ChatLib.chat("§a[Seymour Analyzer] §cInvalid action! Use 'start' or 'stop'.");
      return;
    }
  }
  
  // Handle clear subcommand
if (arg1 && arg1.toLowerCase() === "clear") {
  if (!arg2 || arg2.toLowerCase() !== "yes") {
    const count = Object.keys(collection).length;
    ChatLib.chat("§c§l[WARNING] §cAre you sure you want to clear your collection?");
    ChatLib.chat("§7This will delete §e" + count + " §7scanned pieces!");
    ChatLib.chat("§7Type §e/seymour clear yes §7to confirm");
    return;
  }
  
  clearAllCaches();
  
  const collectionKeys = Object.keys(collection);
  for (let i = 0; i < collectionKeys.length; i++) {
    delete collection[collectionKeys[i]];
  }
  collection.save();
  
  ChatLib.chat("§a[Seymour Analyzer] §7Cache and collection cleared!");
  return;
}
  
  // Handle search subcommand
  if (arg1 && arg1.toLowerCase() === "search") {
    const hexArgs = args.slice(1);
    const argString = hexArgs.join(" ");
    
    if (arg2 && arg2.toLowerCase() === "clear") {
      highlightedChests = [];
      searchHexes = [];
      updateSearchMatchesInCache();  // <-- ADD THIS LINE
      ChatLib.chat("§a[Seymour Analyzer] §7Search cleared!");
      return;
    }
    
    if (!argString || argString.trim() === "") {
      ChatLib.chat("§a[Seymour Analyzer] §7Usage: /seymour search <hexcodes> or /seymour search clear");
      return;
    }
    
    const hexCodes = argString.split(/\s+/).filter(function(s) { return s.length > 0; });
    const validHexes = [];
    const invalidHexes = [];
    
    for (let i = 0; i < hexCodes.length; i++) {
      let hex = hexCodes[i].replace(/#/g, "").toUpperCase().trim();
      if (hex.length === 6 && /^[0-9A-F]{6}$/.test(hex)) {
        validHexes.push(hex);
      } else if (hex.length > 0) {
        invalidHexes.push(hexCodes[i]);
      }
    }
    
    if (invalidHexes.length > 0) {
      ChatLib.chat("§a§l[Seymour Analyzer] - §cInvalid hex codes:");
      for (let i = 0; i < invalidHexes.length; i++) {
        ChatLib.chat("  §c" + invalidHexes[i]);
      }
    }
    
    if (validHexes.length === 0) {
      ChatLib.chat("§a§l[Seymour Analyzer] - §cNo valid hex codes provided!");
      return;
    }
    
    searchHexes = validHexes;
    updateSearchMatchesInCache();
    const foundPieces = searchForHexes(validHexes);
    
    ChatLib.chat("§8§m----------------------------------------------------");
    ChatLib.chat("§a§l[Seymour Analyzer] §7- Search Results");
    ChatLib.chat("§7Searching for §e" + validHexes.length + " §7hex code" + (validHexes.length === 1 ? "" : "s"));
    
    if (foundPieces.length === 0) {
      ChatLib.chat("§c§lNo pieces found!");
    } else {
      ChatLib.chat("§a§lFound " + foundPieces.length + " piece" + (foundPieces.length === 1 ? "" : "s") + ":");
      for (let i = 0; i < foundPieces.length; i++) {
        const piece = foundPieces[i];
        ChatLib.chat("  §7" + piece.name + " §f#" + piece.hex);
        ChatLib.chat("    §7at §e" + piece.location);
      }
      ChatLib.chat("§a§lHighlighting " + highlightedChests.length + " chest" + (highlightedChests.length === 1 ? "" : "s") + "!");
      var message = new TextComponent("§4[Stop highlighting]");
      message.setClick("run_command", "/seymour search clear");
      ChatLib.chat(message)
    }
    ChatLib.chat("§8§m----------------------------------------------------");
    return;
  }
  
  // Handle rebuild subcommand
  if (arg1 && arg1.toLowerCase() === "rebuild") {
    if (!arg2) {
      ChatLib.chat("§8§m----------------------------------------------------");
      ChatLib.chat("§a§l[Seymour Analyzer] §7- Rebuild Commands:");
      ChatLib.chat("§e/seymour rebuild words §7- Rebuild word matches");
      ChatLib.chat("§e/seymour rebuild analysis §7- Rebuild analysis with current toggles");
      ChatLib.chat("§e/seymour rebuild matches §7- Rebuild top 3 match data");
      ChatLib.chat("§e/seymour rebuild pattern §7- Rebuild pattern data");
      ChatLib.chat("§8§m----------------------------------------------------");
      return;
    }

    if (arg2.toLowerCase() === "words") {
    
    ChatLib.chat("§a[Seymour Analyzer] §7Preparing word rebuild...");
    
    setTimeout(function() {
      const collectionKeys = Object.keys(collection);
      let updatedCount = 0;
      
      ChatLib.chat("§a[Seymour Analyzer] §7Starting word rebuild for §e" + collectionKeys.length + " §7pieces...");
      
      function processWordBatch(startIndex) {
        const batchSize = 50;
        const endIndex = Math.min(startIndex + batchSize, collectionKeys.length);
        
        for (let i = startIndex; i < endIndex; i++) {
          const uuid = collectionKeys[i];
          const piece = collection[uuid];
          if (piece && piece.hexcode) {
            const wordMatch = matchesWordPattern(piece.hexcode);
            piece.wordMatch = wordMatch ? wordMatch.word : null;
            updatedCount++;
          }
        }
        
        if (endIndex < collectionKeys.length) {
          if (endIndex % 500 === 0 || endIndex < 500) {
            ChatLib.chat("§7Progress: §e" + endIndex + "§7/§e" + collectionKeys.length + " §7(§a" + Math.floor(endIndex/collectionKeys.length*100) + "%§7)");
          }
          setTimeout(function() { processWordBatch(endIndex); }, 10);
        } else {
          ChatLib.chat("§7Saving and clearing caches...");
          setTimeout(function() {
            collection.save();
            clearAllCaches();
            ChatLib.chat("§a[Seymour Analyzer] §7Rebuilt word matches for §e" + updatedCount + " §7pieces!");
          }, 10);
        }
      }
      
      processWordBatch(0);
    }, 10);
      return;
    }
    
    if (arg2.toLowerCase() === "analysis") {
    
    ChatLib.chat("§a[Seymour Analyzer] §7Preparing analysis rebuild...");
    
    setTimeout(function() {
      const collectionKeys = Object.keys(collection);
      let updatedCount = 0;
      
      ChatLib.chat("§a[Seymour Analyzer] §7Starting analysis rebuild for §e" + collectionKeys.length + " §7pieces...");
      
      function processAnalysisBatch(startIndex) {
        const batchSize = 50;
        const endIndex = Math.min(startIndex + batchSize, collectionKeys.length);
        
        for (let i = startIndex; i < endIndex; i++) {
          const uuid = collectionKeys[i];
          const piece = collection[uuid];
          if (piece && piece.hexcode && piece.pieceName) {
            const analysis = analyzeSeymourArmor(piece.hexcode, piece.pieceName);
            if (analysis) {
              const best = analysis.bestMatch;
              const itemRgb = hexToRgb(piece.hexcode);
              const targetRgb = hexToRgb(best.targetHex);
              const absoluteDist = Math.abs(itemRgb.r - targetRgb.r) + 
                                   Math.abs(itemRgb.g - targetRgb.g) + 
                                   Math.abs(itemRgb.b - targetRgb.b);
              
              piece.bestMatch = {
                colorName: best.name,
                targetHex: best.targetHex,
                deltaE: best.deltaE,
                absoluteDistance: absoluteDist,
                tier: analysis.tier
              };
              updatedCount++;
            }
          }
        }
        
        if (endIndex < collectionKeys.length) {
          if (endIndex % 500 === 0 || endIndex < 500) {
            ChatLib.chat("§7Progress: §e" + endIndex + "§7/§e" + collectionKeys.length + " §7(§a" + Math.floor(endIndex/collectionKeys.length*100) + "%§7)");
          }
          setTimeout(function() { processAnalysisBatch(endIndex); }, 10);
        } else {
          ChatLib.chat("§7Saving and clearing caches...");
          setTimeout(function() {
            collection.save();
            clearAllCaches();
            ChatLib.chat("§a[Seymour Analyzer] §7Rebuilt analysis for §e" + updatedCount + " §7pieces!");
            ChatLib.chat("§7This applied current toggle settings (fade/3p/sets/custom)");
          }, 10);
        }
      }
      
      processAnalysisBatch(0);
    }, 10);
      return;
    }
    
    if (arg2.toLowerCase() === "matches") {
      
      ChatLib.chat("§a[Seymour Analyzer] §7Preparing matches rebuild...");
      
      setTimeout(function() {
        const collectionKeys = Object.keys(collection);
        let updatedCount = 0;
        
        ChatLib.chat("§a[Seymour Analyzer] §7Starting matches rebuild for §e" + collectionKeys.length + " §7pieces...");
        
        function processMatchesBatch(startIndex) {
          const batchSize = 50;
          const endIndex = Math.min(startIndex + batchSize, collectionKeys.length);
          
          for (let i = startIndex; i < endIndex; i++) {
            const uuid = collectionKeys[i];
            const piece = collection[uuid];
            if (piece && piece.hexcode && piece.pieceName) {
              const analysis = analyzeSeymourArmor(piece.hexcode, piece.pieceName);
              if (analysis && analysis.top3Matches) {
                const itemRgb = hexToRgb(piece.hexcode);
                const top3Matches = [];
                
                for (let m = 0; m < 3 && m < analysis.top3Matches.length; m++) {
                  const match = analysis.top3Matches[m];
                  const matchRgb = hexToRgb(match.targetHex);
                  const matchAbsoluteDist = Math.abs(itemRgb.r - matchRgb.r) + 
                                            Math.abs(itemRgb.g - matchRgb.g) + 
                                            Math.abs(itemRgb.b - matchRgb.b);
                  
                  top3Matches[m] = {
                    colorName: match.name,
                    targetHex: match.targetHex,
                    deltaE: match.deltaE,
                    absoluteDistance: matchAbsoluteDist,
                    tier: match.tier
                  };
                }
                
                piece.allMatches = top3Matches;
                updatedCount++;
              }
            }
          }
          
          if (endIndex < collectionKeys.length) {
            if (endIndex % 500 === 0 || endIndex < 500) {
              ChatLib.chat("§7Progress: §e" + endIndex + "§7/§e" + collectionKeys.length + " §7(§a" + Math.floor(endIndex/collectionKeys.length*100) + "%§7)");
            }
            setTimeout(function() { processMatchesBatch(endIndex); }, 10);
          } else {
            ChatLib.chat("§7Saving and clearing caches...");
            setTimeout(function() {
              collection.save();
              clearAllCaches();
              ChatLib.chat("§a[Seymour Analyzer] §7Rebuilt match data for §e" + updatedCount + " §7pieces!");
            }, 10);
          }
        }
        
        processMatchesBatch(0);
      }, 10);
      return;
    }

    if (arg2.toLowerCase() === "pattern") {
      ChatLib.chat("§a[Seymour Analyzer] §7Preparing pattern rebuild...");
      setTimeout(function() {
        const collectionKeys = Object.keys(collection);
        let updatedCount = 0;

        ChatLib.chat("§a[Seymour Analyzer] §7Starting pattern rebuild for §e" + collectionKeys.length + " §7pieces...");

        function processPatternBatch(startIndex) {
          const batchSize = 50;
          const endIndex = Math.min(startIndex + batchSize, collectionKeys.length);
          for (let i = startIndex; i < endIndex; i++) {
            const uuid = collectionKeys[i];
            const piece = collection[uuid];
            if (piece && piece.hexcode) {
              const patternInfo = matchesSpecialPattern(piece.hexcode);
              piece.specialPattern = patternInfo;
              updatedCount++;
            }
          }

          if (endIndex < collectionKeys.length) {
            if (endIndex % 500 === 0 || endIndex < 500) {
              ChatLib.chat("§7Progress: §e" + endIndex + "§7/§e" + collectionKeys.length + " §7(§a" + Math.floor(endIndex/collectionKeys.length*100) + "%§7)");
            }
            setTimeout(function() { processPatternBatch(endIndex); }, 10);
          } else {
            ChatLib.chat("§7Saving and clearing caches...");
            setTimeout(function() {
              collection.save();
              clearAllCaches();
              ChatLib.chat("§a[Seymour Analyzer] §7Rebuilt pattern data for §e" + updatedCount + " §7pieces!");
            }, 10);
          }
        }

        processPatternBatch(0);
      }, 10);
      return;
    }

    ChatLib.chat("§a[Seymour Analyzer] §cInvalid rebuild option! Use 'words', 'analysis', or 'matches'");
    return;
  }

  // Handle compare subcommand
  if (arg1 && arg1.toLowerCase() === "compare") {
    const hexArgs = args.slice(1);
    const argString = hexArgs.join(" ");
    
    if (!argString || argString.trim() === "") {
      ChatLib.chat("§8§m----------------------------------------------------");
      ChatLib.chat("§a§lSeymour Analyzer - §cUsage");
      ChatLib.chat("§e/seymour compare §7<hex1> <hex2> <hex3> ...");
      ChatLib.chat("§8§m----------------------------------------------------");
      return;
    }
    
    const hexCodes = argString.split(/\s+/).filter(function(s) { return s.length > 0; });
    const validHexes = [];
    const invalidHexes = [];
    
    for (let i = 0; i < hexCodes.length; i++) {
      let hex = hexCodes[i].replace(/#/g, "").toUpperCase().trim();
      if (hex.length === 6 && /^[0-9A-F]{6}$/.test(hex)) {
        validHexes.push(hex);
      } else if (hex.length > 0) {
        invalidHexes.push(hexCodes[i]);
      }
    }
    
    if (invalidHexes.length > 0) {
      ChatLib.chat("§a§lSeymour Analyzer - §cInvalid hex codes:");
      for (let i = 0; i < invalidHexes.length; i++) {
        ChatLib.chat("  §c" + invalidHexes[i]);
      }
    }
    
    if (validHexes.length < 2) {
      ChatLib.chat("§a§lSeymour Analyzer - §cNeed at least 2 valid hex codes!");
      ChatLib.chat("§7Found: §e" + validHexes.length + " §7valid hex codes");
      return;
    }
    
    let totalR = 0, totalG = 0, totalB = 0;
    const rgbValues = [];
    
    for (let i = 0; i < validHexes.length; i++) {
      const rgb = hexToRgb(validHexes[i]);
      rgbValues.push(rgb);
      totalR += rgb.r;
      totalG += rgb.g;
      totalB += rgb.b;
    }
    
    const avgR = Math.floor(totalR / validHexes.length);
    const avgG = Math.floor(totalG / validHexes.length);
    const avgB = Math.floor(totalB / validHexes.length);
    
    const rHex = avgR.toString(16).toUpperCase().padStart(2, '0');
    const gHex = avgG.toString(16).toUpperCase().padStart(2, '0');
    const bHex = avgB.toString(16).toUpperCase().padStart(2, '0');
    const avgHex = rHex + gHex + bHex;
    
    let totalAbsoluteDiff = 0;
    let pairCount = 0;
    for (let i = 0; i < rgbValues.length; i++) {
      for (let j = i + 1; j < rgbValues.length; j++) {
        const rgb1 = rgbValues[i];
        const rgb2 = rgbValues[j];
        totalAbsoluteDiff += Math.abs(rgb1.r - rgb2.r) + Math.abs(rgb1.g - rgb2.g) + Math.abs(rgb1.b - rgb2.b);
        pairCount++;
      }
    }
    const avgAbsoluteDiff = pairCount > 0 ? totalAbsoluteDiff / pairCount : 0;
    
    let totalDeltaE = 0;
    pairCount = 0;
    for (let i = 0; i < validHexes.length; i++) {
      for (let j = i + 1; j < validHexes.length; j++) {
        const lab1 = hexToLab(validHexes[i]);
        const lab2 = hexToLab(validHexes[j]);
        totalDeltaE += calculateDeltaEWithLab(lab1, lab2);
        pairCount++;
      }
    }
    const avgDeltaE = pairCount > 0 ? totalDeltaE / pairCount : 0;
    
    ChatLib.chat("§8§m----------------------------------------------------");
    ChatLib.chat("§a§lSeymour Analyzer §7- Color Comparison");
    ChatLib.chat("§7Comparing §e" + validHexes.length + " §7colors");
    for (let i = 0; i < validHexes.length; i++) {
      ChatLib.chat("  §7" + (i + 1) + ". §f#" + validHexes[i]);
    }
    ChatLib.chat("");
    ChatLib.chat("§e§lAverage Color");
    ChatLib.chat("  §7Hex: §f#" + avgHex);
    ChatLib.chat("  §7Red=" + avgR + " §7Green=" + avgG + " §7Blue=" + avgB);
    ChatLib.chat("");
    ChatLib.chat("§e§lAverage Differences");
    ChatLib.chat("  §7Absolute Distance: §f" + avgAbsoluteDiff.toFixed(2));
    ChatLib.chat("  §7Visual Distance: §f" + avgDeltaE.toFixed(2));
    ChatLib.chat("§8§m----------------------------------------------------");
    return;
  }
  
  // Handle add subcommand
  if (arg1 && arg1.toLowerCase() === "add") {
    if (!arg2 || !args[2]) {
      ChatLib.chat("§a[Seymour Analyzer] §7Usage: /seymour add <ColorName> <hex>");
      return;
    }
    
    const colorName = args.slice(1, args.length - 1).join(" ");
    let hex = args[args.length - 1].replace(/#/g, "").toUpperCase().trim();
    
    if (hex.length !== 6 || !/^[0-9A-F]{6}$/.test(hex)) {
      ChatLib.chat("§a[Seymour Analyzer] §cInvalid hex code! Must be 6 characters (0-9, A-F)");
      return;
    }
    
    customColors[colorName] = hex;
    customColors.save();
    
    rebuildLabCache();
    clearAllCaches();
    
    ChatLib.chat("§a[Seymour Analyzer] §7Added custom color: §f" + colorName + " §7(#" + hex + ")");
    return;
  }
  
  // Handle remove subcommand
  if (arg1 && arg1.toLowerCase() === "remove") {
    if (!arg2) {
      ChatLib.chat("§a[Seymour Analyzer] §7Usage: /seymour remove <ColorName>");
      return;
    }
    
    const colorName = args.slice(1).join(" ");
    
    if (!customColors[colorName]) {
      ChatLib.chat("§a[Seymour Analyzer] §cCustom color not found: §f" + colorName);
      ChatLib.chat("§7Use §e/seymour list §7to see all custom colors");
      return;
    }
    
    const hex = customColors[colorName];
    delete customColors[colorName];
    customColors.save();
    
    rebuildLabCache();
    clearAllCaches();
    
    ChatLib.chat("§a[Seymour Analyzer] §7Removed custom color: §f" + colorName + " §7(#" + hex + ")");
    return;
  }
  
  // Handle word subcommand
  if (arg1 && arg1.toLowerCase() === "word") {
    if (!arg2) {
      ChatLib.chat("§a[Seymour Analyzer] §7Usage:");
      ChatLib.chat("  §e/seymour word add <word> <pattern>");
      ChatLib.chat("  §e/seymour word remove <word>");
      ChatLib.chat("  §e/seymour word list");
      return;
    }
    
    if (arg2.toLowerCase() === "add") {
      if (DEBUG) {
        ChatLib.chat("§b[Debug] Word add args: " + JSON.stringify(args));
      }
      
      if (!args[2] || !args[3]) {
        ChatLib.chat("§a[Seymour Analyzer] §7Usage: /seymour word add <word> <hexword>");
        ChatLib.chat("§7Example: /seymour word add BOOB B00B");
        ChatLib.chat("§7This will match any hex containing 'B00B'");
        return;
      }
      
      const word = args[2].toUpperCase();
      const hexWord = args[3].replace(/#/g, "").toUpperCase().trim();
      
      if (DEBUG) {
        ChatLib.chat("§b[Debug] Parsed - word: '" + word + "', hexWord: '" + hexWord + "'");
      }
      
      if (!/^[0-9A-F]+$/.test(hexWord)) {
        ChatLib.chat("§a[Seymour Analyzer] §cWord must only contain 0-9 and A-F!");
        return;
      }
      
      if (hexWord.length < 1 || hexWord.length > 6) {
        ChatLib.chat("§a[Seymour Analyzer] §cWord must be 1-6 characters long!");
        return;
      }
      
      wordList[word] = hexWord;
      wordList.save();
      
      clearAllCaches();
      
      ChatLib.chat("§a[Seymour Analyzer] §7Added word: §d" + word + " §7(matches hex containing: §f" + hexWord + "§7)");
      return;
    }
    
    if (arg2.toLowerCase() === "remove") {
      if (!args[2]) {
        ChatLib.chat("§a[Seymour Analyzer] §7Usage: /seymour word remove <word>");
        return;
      }
      
      const word = args[2].toUpperCase();
      
      if (!wordList[word]) {
        ChatLib.chat("§a[Seymour Analyzer] §cWord not found: §f" + word);
        return;
      }
      
      const pattern = wordList[word];
      delete wordList[word];
      wordList.save();
      
      clearAllCaches();
      
      ChatLib.chat("§a[Seymour Analyzer] §7Removed word: §d" + word + " §7(" + pattern + ")");
      return;
    }
    
    if (arg2.toLowerCase() === "list") {
      const words = Object.keys(wordList);
      
      if (words.length === 0) {
        ChatLib.chat("§a[Seymour Analyzer] §7No words added yet!");
        return;
      }
      
      ChatLib.chat("§8§m----------------------------------------------------");
      ChatLib.chat("§a§l[Seymour Analyzer] §7- Word List (§e" + words.length + "§7)");
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const hexWord = wordList[word];
        ChatLib.chat("  §d" + word + " §7→ §f" + hexWord);
      }
      ChatLib.chat("§8§m----------------------------------------------------");
      return;
    }
    
    ChatLib.chat("§a[Seymour Analyzer] §cInvalid subcommand!");
    return;
  }

  // Handle list subcommand
  if (arg1 && arg1.toLowerCase() === "list") {
    const customColorNames = Object.keys(customColors);
    
    if (customColorNames.length === 0) {
      ChatLib.chat("§a[Seymour Analyzer] §7No custom colors added yet!");
      ChatLib.chat("§7Use §e/seymour add <name> <hex> §7to add one");
      return;
    }
    
    ChatLib.chat("§8§m----------------------------------------------------");
    ChatLib.chat("§a§l[Seymour Analyzer] §7- Custom Colors (§e" + customColorNames.length + "§7)");
    for (let i = 0; i < customColorNames.length; i++) {
      const name = customColorNames[i];
      const hex = customColors[name];
      ChatLib.chat("  §7" + name + " §f#" + hex);
    }
    ChatLib.chat("§8§m----------------------------------------------------");
    return;
  }
  
  // Handle toggle subcommands
  if (arg1 && (arg1.toLowerCase() === "toggle" || arg1.toLowerCase() === "toggles")) {
    if (!arg2) {
      // Show all toggles when no argument provided
      ChatLib.chat("§8§m----------------------------------------------------");
      ChatLib.chat("§a§l[Seymour Analyzer] §7- Toggles:");
      ChatLib.chat("§e/seymour toggle infobox §7- Toggle info box §8[" + (data.infoBoxEnabled ? "§a✓" : "§c✗") + "§8]");
      ChatLib.chat("§e/seymour toggle highlights §7- Toggle item highlights §8[" + (data.highlightsEnabled ? "§a✓" : "§c✗") + "§8]");
      ChatLib.chat("§e/seymour toggle fade §7- Toggle fade dyes §8[" + (data.fadeDyesEnabled ? "§a✓" : "§c✗") + "§8]");
      ChatLib.chat("§e/seymour toggle 3p §7- Toggle 3p sets filter §8[" + (data.threePieceSetsEnabled ? "§a✓" : "§c✗") + "§8]");
      ChatLib.chat("§e/seymour toggle sets §7- Toggle piece-specific matching §8[" + (data.pieceSpecificEnabled ? "§a✓" : "§c✗") + "§8]");
      ChatLib.chat("§e/seymour toggle words §7- Toggle word highlights §8[" + (data.wordsEnabled ? "§a✓" : "§c✗") + "§8]");
      ChatLib.chat("§e/seymour toggle pattern §7- Toggle pattern highlights §8[" + (data.patternsEnabled ? "§a✓" : "§c✗") + "§8]");
      ChatLib.chat("§e/seymour toggle custom §7- Toggle custom colors §8[" + (data.customColorsEnabled ? "§a✓" : "§c✗") + "§8]");
      ChatLib.chat("§e/seymour toggle dupes §7- Toggle dupe highlights §8[" + (data.dupesEnabled ? "§a✓" : "§c✗") + "§8]");
      ChatLib.chat("§e/seymour toggle highfades §7- Toggle high fades §8[" + (data.showHighFades ? "§a✓" : "§c✗") + "§8]");
      ChatLib.chat("§8§m----------------------------------------------------");
      return;
    } else if (arg2.toLowerCase() === "infobox") {
      data.infoBoxEnabled = !data.infoBoxEnabled;
      data.save();
      
      ChatLib.chat("§a[Seymour Analyzer] §7Info box " + (data.infoBoxEnabled ? "§aenabled" : "§cdisabled") + "§7!");
      return;
    } else if (arg2.toLowerCase() === "highlights") {
      data.highlightsEnabled = !data.highlightsEnabled;
      data.save();
      
      itemCache.clear();
      hoveredItemData = null;
      
      ChatLib.chat("§a[Seymour Analyzer] §7Item highlights " + (data.highlightsEnabled ? "§aenabled" : "§cdisabled") + "§7!");
      return;
    } else if (arg2.toLowerCase() === "sets") {
      data.pieceSpecificEnabled = !data.pieceSpecificEnabled;
      data.save();
      
      clearAllCaches();
      
      ChatLib.chat("§a[Seymour Analyzer] §7Piece-specific matching " + (data.pieceSpecificEnabled ? "§aenabled§7! (Colors only match their piece types)" : "§cdisabled§7! (Universal matching)"));
      return;
    } else if (arg2.toLowerCase() === "fade") {
      data.fadeDyesEnabled = !data.fadeDyesEnabled;
      data.save();
      
      clearAllCaches();
      
      ChatLib.chat("§a[Seymour Analyzer] §7Fade dyes " + (data.fadeDyesEnabled ? "§aenabled" : "§cdisabled") + "§7!");
      return;
    } else if (arg2.toLowerCase() === "3p") {
      data.threePieceSetsEnabled = !data.threePieceSetsEnabled;
      data.save();
      
      clearAllCaches();
      
      ChatLib.chat("§a[Seymour Analyzer] §73-piece sets filter " + (data.threePieceSetsEnabled ? "§aenabled§7! (Top Hats won't match 3p sets)" : "§cdisabled§7! (Top Hats can match 3p sets)"));
      return;
    } else if (arg2.toLowerCase() === "words") {
      data.wordsEnabled = !data.wordsEnabled;
      data.save();
      
      itemCache.clear();
      hoveredItemData = null;
      
      ChatLib.chat("§a[Seymour Analyzer] §7Word highlights " + (data.wordsEnabled ? "§aenabled" : "§cdisabled") + "§7!");
      return;
    } else if (arg2.toLowerCase() === "pattern") {
      data.patternsEnabled = !data.patternsEnabled;
      data.save();
      
      itemCache.clear();
      hoveredItemData = null;
      
      ChatLib.chat("§a[Seymour Analyzer] §7Pattern highlights " + (data.patternsEnabled ? "§aenabled" : "§cdisabled") + "§7!");
      return;
    } else if (arg2.toLowerCase() === "custom") {
      data.customColorsEnabled = !data.customColorsEnabled;
      data.save();
      
      clearAllCaches();
      
      ChatLib.chat("§a[Seymour Analyzer] §7Custom colors " + (data.customColorsEnabled ? "§aenabled" : "§cdisabled") + "§7!");
      return;
    } else if (arg2.toLowerCase() === "dupes") {
      data.dupesEnabled = !data.dupesEnabled;
      data.save();
      
      clearAllCaches();
      
      ChatLib.chat("§a[Seymour Analyzer] §7Dupe highlights " + (data.dupesEnabled ? "§aenabled" : "§cdisabled") + "§7!");
      return;
    } else if (arg2.toLowerCase() === "highfades") {
      data.showHighFades = !data.showHighFades;
      data.save();

      clearAllCaches();

      ChatLib.chat("§a[Seymour Analyzer] §7High fades will now " + (data.showHighFades ? "§anot show up" : "§cshow up") + "§7!");
      return;
    } else {
      ChatLib.chat("§a[Seymour Analyzer] §cInvalid toggle option! §7(Available: infobox, highlights, fade, 3p, sets, words, pattern, custom, dupes, highfades)");
      return;
    }
  }
  
  // Handle resetpos subcommand
  if (arg1 && arg1.toLowerCase() === "resetpos") {
    boxPosition.x = 50;
    boxPosition.y = 80;
    saveBoxPosition();
    ChatLib.chat("§a[Seymour Analyzer] §7Info box position reset!");
    return;
  }
  
  // Show help menu (default)
  ChatLib.chat("§8§m----------------------------------------------------");
  ChatLib.chat("§a§l[Seymour Analyzer] §7Commands:");
  ChatLib.chat("§f/seymour §7- Show this help menu");
  ChatLib.chat("§e/seymour database §7- Open database");
  ChatLib.chat("§e/seymour checklist §7- Open armor checklist");
  ChatLib.chat("§e/seymour bestsets §7- Find best matching 4-piece sets");
  ChatLib.chat("§a/seymour scan start §7- Start scanning pieces");
  ChatLib.chat("§a/seymour scan stop §7- Stop scanning pieces");
  ChatLib.chat("§c/seymour rebuild §7- Show all rebuild commands");
  ChatLib.chat("§2/seymour search <hexes> §7- Highlight chests with hex codes");
  ChatLib.chat("§2/seymour search clear §7- Clear search highlights");
  ChatLib.chat("§4/seymour clear §7- Clear all caches & collection");
  ChatLib.chat("§c/seymour resetpos §7- Reset info box position");
  ChatLib.chat("§6/seymour add <name> <hex> §7- Add custom color");
  ChatLib.chat("§6/seymour remove <name> §7- Remove custom color");
  ChatLib.chat("§6/seymour list §7- List all custom colors");
  ChatLib.chat("§5/seymour word add <word> <pattern> §7- Add word pattern");
  ChatLib.chat("§5/seymour word remove <word> §7- Remove word pattern");
  ChatLib.chat("§5/seymour word list §7- List all word patterns");
  ChatLib.chat("§e/seymour compare <hexes> §7- Compare multiple hex codes");
  ChatLib.chat("§e/seymour toggle §7- Show all toggles and their status");
  ChatLib.chat("§7Collection: §e" + Object.keys(collection).length + " §7pieces");
  ChatLib.chat("§8§m----------------------------------------------------");
  } finally {
    commandExecuting = false;
  }
}).setName("seymour");

// ===== GUI INSTANCES =====
const dbGui = new DatabaseGUI();
const armorGui = new ArmorChecklistGUI(collection);
const bestSetsGui = new BestSetsGUI(collection);

// Commands to open GUIs
register("command", () => {
  dbGui.open();
}).setName("seymourdb").setAliases("sdb");

register("command", () => {
  bestSetsGui.open();
}).setName("seymoursets").setAliases("bestsets");

register("command", () => {
  armorGui.open();
}).setName("armorsets").setAliases("checklist");

// ===== WORD MATCHES GUI =====
const wordMatchesGui = new WordMatchesGUI();

register("command", () => {
    wordMatchesGui.open();
}).setName("seymourwords").setAliases("words");

// ===== PATTERN MATCHES GUI =====
const patternMatchesGui = new PatternMatchesGUI();

register("command", () => {
    patternMatchesGui.open();
}).setName("seymourpatterns").setAliases("patterns");

// ===== SEARCH AND HIGHLIGHT CHESTS =====
function searchForHexes(hexes) {
  highlightedChests = [];
  const foundPieces = [];
  const addedUUIDs = {};
  
  // Get all keys from collection
  let collectionKeys = [];
  try {
    collectionKeys = Object.keys(collection);
  } catch (e) {
    for (const key in collection) {
      if (collection.hasOwnProperty(key)) {
        collectionKeys.push(key);
      }
    }
  }
  
  for (let i = 0; i < collectionKeys.length; i++) {
    const uuid = collectionKeys[i];
    
    if (addedUUIDs[uuid]) continue;
    
    const piece = collection[uuid];
    if (!piece || !piece.hexcode || !piece.chestLocation) continue;
    
    // Check all search hexes
    for (let j = 0; j < hexes.length; j++) {
      const searchHex = hexes[j].toUpperCase();
      const pieceHex = piece.hexcode.toUpperCase();
      
      if (pieceHex === searchHex) {
        const chestKey = piece.chestLocation.x + "," + piece.chestLocation.y + "," + piece.chestLocation.z;
        
        foundPieces.push({
          name: piece.pieceName,
          hex: piece.hexcode,
          location: chestKey
        });
        
        addedUUIDs[uuid] = true;
        
        // Check if chest already in list
        let chestExists = false;
        for (let k = 0; k < highlightedChests.length; k++) {
          if (highlightedChests[k].key === chestKey) {
            chestExists = true;
            break;
          }
        }
        
        if (!chestExists) {
          highlightedChests.push({
            key: chestKey,
            x: piece.chestLocation.x,
            y: piece.chestLocation.y,
            z: piece.chestLocation.z
          });
        }
        break;
      }
    }
  }
  
  return foundPieces;
}

// ===== UPDATE SEARCH MATCHES IN CACHE =====
function updateSearchMatchesInCache() {
  // Update all uuidCache entries
  const uuidKeys = Object.keys(uuidCache);
  for (let i = 0; i < uuidKeys.length; i++) {
    const cacheEntry = uuidCache[uuidKeys[i]];
    if (!cacheEntry || !cacheEntry.itemHex) continue;
    
    cacheEntry.isSearchMatch = false;
    if (searchHexes.length > 0) {
      const hexUpper = cacheEntry.itemHex.toUpperCase();
      for (let s = 0; s < searchHexes.length; s++) {
        if (hexUpper === searchHexes[s]) {
          cacheEntry.isSearchMatch = true;
          break;
        }
      }
    }
  }
  
  // CRITICAL: Must clear itemCache to force items to re-render with updated search states
  itemCache.clear();
  
  // Also clear hoveredItemData if it exists
  hoveredItemData = null;
  
  // Force immediate recache if GUI is open
  const container = Player.getContainer();
  if (container) {
    precacheComplete = false;
    isPrecaching = true;
    setTimeout(function() {
      precacheChestItems();
      isPrecaching = false;
    }, 50);
  } else {
    precacheComplete = false;
    needsRecache = true;
  }
}
