/// <reference types="../CTAutocomplete" />
/// <reference lib="es2015" />

// Import color database
import { TARGET_COLORS, FADE_DYES } from "./colorDatabase";

// ===== CONFIG =====
const DEBUG = false;

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
  patternsEnabled: true
});

const collection = new PogObject("SeymourAnalyzer", {}, "Collection.json");
const customColors = new PogObject("SeymourAnalyzer", {}, "CustomColors.json");
const wordList = new PogObject("SeymourAnalyzer", {}, "Words.json");

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
  
  ChatLib.chat("§a[Seymour Analyzer] §7Initialized " + Object.keys(TARGET_COLORS_LAB).length + " color LAB values (" + customColorNames.length + " custom)");
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
  if (pieceType === "leggings" && lowerName.includes("leggings")) {
    return true;
  }
  if (pieceType === "boots" && lowerName.includes("boots")) {
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

// Get priority score for sorting (lower = higher priority)
function getPriorityScore(isFade, tier) {
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
    
    // Combine built-in and custom colors
    const allColorNames = Object.keys(TARGET_COLORS).concat(Object.keys(customColors));
    
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
        const tier = deltaE <= 1.0 ? 0 : (deltaE <= 2.0 ? 1 : (deltaE <= 5.0 ? 2 : 3));
        const priority = getPriorityScore(isFade, tier);
        
        matches.push({
          name: name,
          targetHex: targetHex,
          deltaE: deltaE,
          isFade: isFade,
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
  const wordMatch = (data.wordsEnabled && stored.wordMatch) ? { word: stored.wordMatch, pattern: stored.hexcode } : null;
  const specialPattern = (data.patternsEnabled && stored.specialPattern) ? { type: stored.specialPattern, pattern: stored.hexcode } : null;
  const fullAnalysis = analyzeSeymourArmor(stored.hexcode, "");
  
  return {
    tier: stored.bestMatch.tier,
    isFade: isFadeColor,
    alreadyProcessed: true,
    analysis: {
      bestMatch: {
        name: stored.bestMatch.colorName,
        targetHex: stored.bestMatch.targetHex,
        deltaE: stored.bestMatch.deltaE,
        isFade: isFadeColor,
        tier: stored.bestMatch.tier,
        priority: getPriorityScore(isFadeColor, stored.bestMatch.tier)
      },
      top3Matches: fullAnalysis ? fullAnalysis.top3Matches : [],
      tier: stored.bestMatch.tier,
      isFadeDye: isFadeColor
    },
    itemHex: stored.hexcode,
    wordMatch: wordMatch,
    specialPattern: specialPattern
  };
}

// ===== HELPER: SET HOVERED ITEM DATA =====
function setHoveredItemData(cacheData) {
  if (!cacheData || !cacheData.analysis) return;
  
  const best = cacheData.analysis.bestMatch;
  const itemRgb = hexToRgb(cacheData.itemHex);
  const targetRgb = hexToRgb(best.targetHex);
  
  const visualDist = best.deltaE;
  const absoluteDist = Math.abs(itemRgb.r - targetRgb.r) + 
                       Math.abs(itemRgb.g - targetRgb.g) + 
                       Math.abs(itemRgb.b - targetRgb.b);
  
  hoveredItemData = {
    name: best.name,
    hex: best.targetHex,
    deltaE: visualDist,
    absoluteDist: absoluteDist,
    tier: cacheData.tier,
    isFadeDye: cacheData.isFade,
    itemHex: cacheData.itemHex,
    top3: cacheData.analysis.top3Matches,
    wordMatch: cacheData.wordMatch,
    specialPattern: cacheData.specialPattern,
    timestamp: Date.now()
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
  hoveredItemData = null;
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
      const hex = extractHexFromLore(loreRaw);
      if (!hex) continue;
      
      const analysis = analyzeSeymourArmor(hex, itemName);
      if (!analysis) continue;
      
      const best = analysis.bestMatch;
      const itemRgb = hexToRgb(hex);
      const targetRgb = hexToRgb(best.targetHex);
      const absoluteDist = Math.abs(itemRgb.r - targetRgb.r) + 
                           Math.abs(itemRgb.g - targetRgb.g) + 
                           Math.abs(itemRgb.b - targetRgb.b);
      
      const wordMatch = matchesWordPattern(hex);
      const specialPattern = matchesSpecialPattern(hex);
      
      collection[uuid] = {
        pieceName: ChatLib.removeFormatting(itemName),
        uuid: uuid,
        hexcode: hex,
        specialPattern: specialPattern ? specialPattern.type : null,
        bestMatch: {
          colorName: best.name,
          targetHex: best.targetHex,
          deltaE: best.deltaE,
          absoluteDistance: absoluteDist,
          tier: analysis.tier
        },
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

register("guiOpened", function() {
  const now = Date.now();
  
  if (now - lastGuiOpenTime < 500) {
    return;
  }
  lastGuiOpenTime = now;
  
  isPrecaching = true;
  precacheComplete = false;
  
  // Precaching will handle all items
  
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

// ===== CACHE FOR ITEMS =====
const itemCache = new (Java.type('java.util.WeakHashMap'))();
let hoveredItemData = null;

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
  try {
    const container = Player.getContainer();
    if (!container) return;
    
    const items = container.getItems();
    if (!items) return;
    
    // Determine chest size (items before inventory)
    // Standard chest = 27 slots, Large chest = 54 slots, Ender chest = 27, etc.
    // Player inventory starts after the chest slots
    const containerSize = container.getSize();
    const chestSlots = containerSize > 54 ? 54 : (containerSize > 27 ? 27 : containerSize - 36);
    
    let needsAnalysis = [];
    
    // PHASE 1: Instant checks (no analysis) - ONLY for chest slots, not inventory
    for (let i = 0; i < items.length && i < chestSlots; i++) {
      const item = items[i];
      if (!item) continue;
      
      const stack = item.itemStack;
      if (itemCache.get(stack) !== null && itemCache.get(stack) !== undefined) {
        continue;
      }
      
      const name = item.getName();
      
      if (!isSeymourArmor(name)) {
        itemCache.put(stack, { tier: -1, isFade: false });
        continue;
      }
      
      const uuid = extractUuidFromItem(item);
      
      if (uuid && collection[uuid]) {
        const cacheData = getCacheDataFromCollection(uuid);
        if (cacheData) {
          itemCache.put(stack, cacheData);
          continue;
        }
      }
      
      needsAnalysis.push({ item: item, stack: stack, name: name });
    }
    
    // PHASE 2: Analyze remaining items
    const loreData = [];
    for (let i = 0; i < needsAnalysis.length; i++) {
      const entry = needsAnalysis[i];
      const loreRaw = entry.item.getLore();
      const hex = extractHexFromLore(loreRaw);
      loreData.push({ entry: entry, hex: hex });
    }
    
    for (let i = 0; i < loreData.length; i++) {
      const itemData = loreData[i];
      
      if (!itemData.hex) {
        itemCache.put(itemData.entry.stack, { tier: -1, isFade: false });
        continue;
      }
      
      const analysis = analyzeSeymourArmor(itemData.hex, itemData.entry.name);
      
      if (!analysis) {
        itemCache.put(itemData.entry.stack, { tier: -1, isFade: false });
        continue;
      }
      
      const wordMatch = data.wordsEnabled ? matchesWordPattern(itemData.hex) : null;
      const specialPattern = data.patternsEnabled ? matchesSpecialPattern(itemData.hex) : null;
      
      const cacheEntry = { 
        tier: analysis.tier, 
        isFade: analysis.isFadeDye,
        analysis: analysis,
        itemHex: itemData.hex,
        wordMatch: wordMatch,
        specialPattern: specialPattern
      };
      
      itemCache.put(itemData.entry.stack, cacheEntry);
      
      // ALSO cache in UUID cache for persistent lookup
      const uuid = extractUuidFromItem(itemData.entry.item);
      if (uuid) {
        uuidCache[uuid] = cacheEntry;
      }
    }
    
    precacheComplete = true;
    
  } catch (e) {
    if (DEBUG) ChatLib.chat("§c[Debug] Precache error: " + e);
  }
}

const uuidCache = {};

register('renderItemIntoGui', function(item, x, y) {
  if (!data.highlightsEnabled && !data.infoBoxEnabled) return;
  
  // Get UUID first to check if this is a known item
  const uuid = extractUuidFromItem(item);
  
  // If precaching, only render items we already know about (inventory items)
  if (isPrecaching || !precacheComplete) {
    // Allow rendering of cached items (inventory) during precache
    if (!uuid || !uuidCache[uuid]) {
      return; // Skip unknown items during precache
    }
    // Continue to render known items below
  }
  
  try {
    const name = item.getName();
    if (!isSeymourArmor(name)) return;
    
    // UUID already extracted at the top of the function
    // (no need to extract again)
    
    // Try UUID cache first (fastest path - for inventory items)
    let cacheData = uuid ? uuidCache[uuid] : null;
    
    // If not in UUID cache, check if it's in collection (never analyzed before)
    if (!cacheData && uuid && collection[uuid]) {
      cacheData = getCacheDataFromCollection(uuid);
      if (cacheData) {
        uuidCache[uuid] = cacheData;
      }
    }
    
    // If still not found, check itemCache (chest items from precache)
    if (!cacheData) {
      const stack = item.itemStack;
      cacheData = itemCache.get(stack);
      
      // If found in itemCache, also add to UUID cache
      if (cacheData && uuid) {
        uuidCache[uuid] = cacheData;
      }
      
      // If still nothing and NOT in precache, this is a new item - analyze it once
      if (!cacheData && !isPrecaching) {
        const loreRaw = item.getLore();
        const hex = extractHexFromLore(loreRaw);
        if (!hex) return;
        
        const analysis = analyzeSeymourArmor(hex, name);
        if (!analysis) return;
        
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
        
        // Cache it by UUID so it's never analyzed again
        if (uuid) {
          uuidCache[uuid] = cacheData;
        }
      }
    }
    
    if (!cacheData) return;
    
    // Skip non-Seymour or invalid items
    if (cacheData.tier === -1) return;
    
    // Handle hover for info box
    if (data.infoBoxEnabled && cacheData.analysis) {
      const Mouse = Java.type("org.lwjgl.input.Mouse");
      const mc = Client.getMinecraft();
      const scaledRes = new (Java.type("net.minecraft.client.gui.ScaledResolution"))(mc);
      const scale = scaledRes.func_78325_e();
      const mouseX = Mouse.getX() / scale;
      const mouseY = (mc.field_71440_d - Mouse.getY()) / scale;
      
      if (mouseX >= x && mouseX < x + 16 && mouseY >= y && mouseY < y + 16) {
        setHoveredItemData(cacheData);
        
        if (DEBUG) ChatLib.chat("§a[Debug] Hover at " + x + "," + y + ": " + cacheData.analysis.bestMatch.name);
      }
    }
    
    // Draw highlights (MUST run every frame - this is normal!)
    if (!data.highlightsEnabled) return;
    
    const GL11 = Java.type("org.lwjgl.opengl.GL11");
    GL11.glPushMatrix();
    GL11.glTranslatef(0, 0, 100);
    GL11.glDisable(GL11.GL_DEPTH_TEST);
    
    // Check for search match
    let isSearchMatch = false;
    if (searchHexes.length > 0 && cacheData.itemHex) {
      const itemHexUpper = cacheData.itemHex.toUpperCase();
      for (let i = 0; i < searchHexes.length; i++) {
        if (itemHexUpper === searchHexes[i]) {
          isSearchMatch = true;
          break;
        }
      }
    }
    
    const currentWordMatch = (data.wordsEnabled && cacheData.wordMatch) ? cacheData.wordMatch : null;
    const currentSpecialPattern = (data.patternsEnabled && cacheData.specialPattern) ? cacheData.specialPattern : null;

    if (isSearchMatch) {
      Renderer.drawRect(Renderer.color(0, 255, 0, 150), x, y, 16, 16);
    } else if (currentWordMatch && data.wordsEnabled) {
      Renderer.drawRect(Renderer.color(139, 69, 19, 150), x, y, 16, 16);
    } else if (currentSpecialPattern) {
      Renderer.drawRect(Renderer.color(147, 51, 234, 150), x, y, 16, 16);
    } else if (cacheData.tier !== 3) {
      if (cacheData.isFade) {
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
    if (DEBUG) ChatLib.chat("§c[Debug] renderItemIntoGui error: " + e);
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
        
        const specialPattern = matchesSpecialPattern(hex);
        cacheData = { 
          tier: analysis.tier, 
          isFade: analysis.isFadeDye,
          analysis: analysis,
          itemHex: hex,
          specialPattern: specialPattern
        };
        itemCache.put(stack, cacheData);
      }
    }
    
    if (!cacheData || !cacheData.analysis) return;
    
    setHoveredItemData(cacheData);
    
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
          const uuid = extractUuidFromItem(foundItem);
          
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
                const uuid = extractUuidFromItem(foundItem);
                const wordMatch = (uuid && collection[uuid]) ? collection[uuid].wordMatch : null;
                
                cacheData = { 
                  tier: analysis.tier, 
                  isFade: analysis.isFadeDye,
                  analysis: analysis,
                  itemHex: hex,
                  wordMatch: wordMatch
                };
                itemCache.put(stack, cacheData);
              }
            }
          }
        }
        
        if (cacheData && cacheData.analysis) {
          setHoveredItemData(cacheData);

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
    let boxHeight = isShiftHeld ? 110 : 80;
    if (data.wordsEnabled && infoData.wordMatch) boxHeight += 10;
    if (data.patternsEnabled && infoData.specialPattern) boxHeight += 10;
    
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
    if (infoData.isFadeDye) {
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
      const patternName = infoData.specialPattern.type === "paired" ? "PAIRED" : 
                          (infoData.specialPattern.type === "repeating" ? "REPEATING" : "PALINDROME");
      Renderer.drawStringWithShadow("§5§l★ PATTERN: " + patternName, boxX + 5, boxY + currentYOffset);
      currentYOffset += 10;
    }
    
    if (isShiftHeld) {
      Renderer.drawStringWithShadow("§7§lTop 3 Matches:", boxX + 5, boxY + currentYOffset);
      
      for (let i = 0; i < 3 && i < infoData.top3.length; i++) {
        const match = infoData.top3[i];
        const yPos = boxY + currentYOffset + 12 + (i * 25);
        
        let colorPrefix;
        if (match.isFade) {
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
      if (infoData.isFadeDye) {
        deltaColorPrefix = infoData.tier === 0 ? "§9" : (infoData.tier === 1 ? "§b" : (infoData.tier === 2 ? "§e" : "§7"));
      } else {
        deltaColorPrefix = infoData.tier === 0 ? "§c" : (infoData.tier === 1 ? "§d" : (infoData.tier === 2 ? "§6" : "§7"));
      }
      
      Renderer.drawStringWithShadow(deltaColorPrefix + "ΔE: §f" + infoData.deltaE.toFixed(2), boxX + 5, boxY + currentYOffset + 20);
      Renderer.drawStringWithShadow("§7Absolute: §f" + infoData.absoluteDist, boxX + 5, boxY + currentYOffset + 30);
      
      let tierText;
      if (infoData.isFadeDye) {
        tierText = infoData.tier === 0 ? "§9§lT1<" : (infoData.tier === 1 ? "§b§lT1" : (infoData.tier === 2 ? "§e§lT2" : "§7§l✗ T3+"));
      } else {
        tierText = infoData.tier === 0 ? "§c§lT1<" : (infoData.tier === 1 ? "§d§lT1" : (infoData.tier === 2 ? "§6§lT2" : "§7§l✗ T3+"));
      }
      
      Renderer.drawStringWithShadow(tierText, boxX + 5, boxY + currentYOffset + 40);
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
    }
    ChatLib.chat("§8§m----------------------------------------------------");
    return;
  }
  
  // Handle rebuild subcommand
  if (arg1 && arg1.toLowerCase() === "rebuild") {
    if (!arg2 || arg2.toLowerCase() !== "words") {
      ChatLib.chat("§a[Seymour Analyzer] §7Usage: /seymour rebuild words");
      return;
    }
    
    const collectionKeys = Object.keys(collection);
    let updatedCount = 0;
    
    for (let i = 0; i < collectionKeys.length; i++) {
      const uuid = collectionKeys[i];
      const piece = collection[uuid];
      if (piece && piece.hexcode) {
        const wordMatch = matchesWordPattern(piece.hexcode);
        piece.wordMatch = wordMatch ? wordMatch.word : null;
        updatedCount++;
      }
    }
    
    collection.save();
    clearAllCaches();
    
    ChatLib.chat("§a[Seymour Analyzer] §7Rebuilt word matches for §e" + updatedCount + " §7pieces!");
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
  if (arg1 && arg1.toLowerCase() === "toggle") {
    if (arg2 && arg2.toLowerCase() === "infobox") {
      data.infoBoxEnabled = !data.infoBoxEnabled;
      data.save();
      
      ChatLib.chat("§a[Seymour Analyzer] §7Info box " + (data.infoBoxEnabled ? "§aenabled" : "§cdisabled") + "§7!");
      return;
    } else if (arg2 && arg2.toLowerCase() === "highlights") {
      data.highlightsEnabled = !data.highlightsEnabled;
      data.save();
      
      itemCache.clear();
      hoveredItemData = null;
      
      ChatLib.chat("§a[Seymour Analyzer] §7Item highlights " + (data.highlightsEnabled ? "§aenabled" : "§cdisabled") + "§7!");
      return;
    } else if (arg2 && arg2.toLowerCase() === "sets") {
      data.pieceSpecificEnabled = !data.pieceSpecificEnabled;
      data.save();
      
      clearAllCaches();
      
      ChatLib.chat("§a[Seymour Analyzer] §7Piece-specific matching " + (data.pieceSpecificEnabled ? "§aenabled§7! (Colors only match their piece types)" : "§cdisabled§7! (Universal matching)"));
      return;
    } else if (arg2 && arg2.toLowerCase() === "fade") {
      data.fadeDyesEnabled = !data.fadeDyesEnabled;
      data.save();
      
      clearAllCaches();
      
      ChatLib.chat("§a[Seymour Analyzer] §7Fade dyes " + (data.fadeDyesEnabled ? "§aenabled" : "§cdisabled") + "§7!");
      return;
    } else if (arg2 && arg2.toLowerCase() === "3p") {
      data.threePieceSetsEnabled = !data.threePieceSetsEnabled;
      data.save();
      
      clearAllCaches();
      
      ChatLib.chat("§a[Seymour Analyzer] §73-piece sets filter " + (data.threePieceSetsEnabled ? "§aenabled§7! (Top Hats won't match 3p sets)" : "§cdisabled§7! (Top Hats can match 3p sets)"));
      return;
    } else if (arg2 && arg2.toLowerCase() === "words") {
      data.wordsEnabled = !data.wordsEnabled;
      data.save();
      
      itemCache.clear();
      hoveredItemData = null;
      
      ChatLib.chat("§a[Seymour Analyzer] §7Word highlights " + (data.wordsEnabled ? "§aenabled" : "§cdisabled") + "§7!");
      return;
    } else if (arg2 && arg2.toLowerCase() === "pattern") {
      data.patternsEnabled = !data.patternsEnabled;
      data.save();
      
      itemCache.clear();
      hoveredItemData = null;
      
      ChatLib.chat("§a[Seymour Analyzer] §7Pattern highlights " + (data.patternsEnabled ? "§aenabled" : "§cdisabled") + "§7!");
      return;
    } else {
      ChatLib.chat("§a[Seymour Analyzer] §7Usage: /seymour toggle <infobox|highlights|fade|3p|sets|words|pattern>");
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
  ChatLib.chat("§e/seymour §7- Show this help menu");
  ChatLib.chat("§e/seymour scan start §7- Start scanning pieces");
  ChatLib.chat("§e/seymour scan stop §7- Stop scanning pieces");
  ChatLib.chat("§e/seymour search <hexes> §7- Highlight chests with hex codes");
  ChatLib.chat("§e/seymour search clear §7- Clear search highlights");
  ChatLib.chat("§e/seymour clear §7- Clear all caches & collection");
  ChatLib.chat("§e/seymour rebuild words §7- Clears caches for words");
  ChatLib.chat("§e/seymour compare <hexes> §7- Compare multiple hex codes");
  ChatLib.chat("§e/seymour resetpos §7- Reset info box position");
  ChatLib.chat("§e/seymour add <name> <hex> §7- Add custom color");
  ChatLib.chat("§e/seymour remove <name> §7- Remove custom color");
  ChatLib.chat("§e/seymour list §7- List all custom colors");
  ChatLib.chat("§e/seymour word add <word> <pattern> §7- Add word pattern");
  ChatLib.chat("§e/seymour word remove <word> §7- Remove word pattern");
  ChatLib.chat("§e/seymour word list §7- List all word patterns");
  ChatLib.chat("§e/seymour toggle infobox §7- Toggle info box §8[" + (data.infoBoxEnabled ? "§a✓" : "§c✗") + "§8]");
  ChatLib.chat("§e/seymour toggle highlights §7- Toggle item highlights §8[" + (data.highlightsEnabled ? "§a✓" : "§c✗") + "§8]");
  ChatLib.chat("§e/seymour toggle fade §7- Toggle fade dyes §8[" + (data.fadeDyesEnabled ? "§a✓" : "§c✗") + "§8]");
  ChatLib.chat("§e/seymour toggle 3p §7- Toggle 3p sets filter §8[" + (data.threePieceSetsEnabled ? "§a✓" : "§c✗") + "§8]");
  ChatLib.chat("§e/seymour toggle sets §7- Toggle piece-specific matching §8[" + (data.pieceSpecificEnabled ? "§a✓" : "§c✗") + "§8]");
  ChatLib.chat("§e/seymour toggle words §7- Toggle word highlights §8[" + (data.wordsEnabled ? "§a✓" : "§c✗") + "§8]");
  ChatLib.chat("§e/seymour toggle pattern §7- Toggle pattern highlights §8[" + (data.patternsEnabled ? "§a✓" : "§c✗") + "§8]");
  ChatLib.chat("§7Collection: §e" + Object.keys(collection).length + " §7pieces");
  ChatLib.chat("§8§m----------------------------------------------------");
  } finally {
    commandExecuting = false;
  }
}).setName("seymour");

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
