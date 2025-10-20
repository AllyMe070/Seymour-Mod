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
  infoBoxEnabled: true
});

const collection = new PogObject("SeymourAnalyzer", {}, "Collection.json");
const customColors = new PogObject("SeymourAnalyzer", {}, "CustomColors.json");

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
    // Check if it starts with the fade name AND contains "Stage" or ends with the fade name followed by " - "
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

// ===== EXTRACT HEX FROM ITEM (FIXED TO HANDLE SHORT HEX CODES) =====
function extractHexFromLore(loreArray) {
  try {
    if (!loreArray || loreArray.length === 0) return null;
    
    for (let i = 0; i < loreArray.length; i++) {
      const line = loreArray[i];
      
      if (line && line.includes("Color:") && line.includes("#")) {
        const cleaned = line.replace(/§./g, '');
        // Match hex codes with 1-6 characters after the #
        const match = cleaned.match(/#([0-9A-Fa-f]{1,6})/);
        if (match) {
          // Pad with leading zeros to make it 6 characters
          return match[1].toUpperCase().padStart(6, '0');
        }
      }
      
      const text = ChatLib.removeFormatting(line || "");
      if (text && text.includes("Color:")) {
        // Match hex codes with 1-6 characters
        const match = text.match(/([0-9A-Fa-f]{1,6})/);
        if (match) {
          // Pad with leading zeros to make it 6 characters
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
    
    // Get player's eye position (standing eye height is 1.62 blocks above feet)
    const eyeY = playerY + 1.62;
    
    // Get player's rotation (yaw and pitch in degrees)
    const yaw = player.field_70177_z;
    const pitch = player.field_70125_A;
    
    // Convert to radians
    const yawRad = yaw * Math.PI / 180;
    const pitchRad = pitch * Math.PI / 180;
    
    // Calculate looking direction vector
    const dirX = -Math.sin(yawRad) * Math.cos(pitchRad);
    const dirY = -Math.sin(pitchRad);
    const dirZ = Math.cos(yawRad) * Math.cos(pitchRad);
    
    if (DEBUG) {
      ChatLib.chat("§b[Debug] Player eye at: " + playerX.toFixed(2) + ", " + eyeY.toFixed(2) + ", " + playerZ.toFixed(2));
      ChatLib.chat("§b[Debug] Looking direction: " + dirX.toFixed(3) + ", " + dirY.toFixed(3) + ", " + dirZ.toFixed(3));
    }
    
    // Raycast up to 6 blocks away
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
      
      // Check for chest blocks by ID or name
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
    const isTopHat = isVelvetTopHat(itemName);
    
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
      
      // Skip 3p sets for helmets (Velvet Top Hats) if 3p sets filter is enabled
      if (data.threePieceSetsEnabled && pieceType === "helmet" && isThreePieceSet(name)) {
        continue;
      }
      
      // Skip colors that don't match piece type if piece-specific mode is enabled
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
      
      collection[uuid] = {
        pieceName: ChatLib.removeFormatting(itemName),
        uuid: uuid,
        hexcode: hex,
        bestMatch: {
          colorName: best.name,
          targetHex: best.targetHex,
          deltaE: best.deltaE,
          absoluteDistance: absoluteDist,
          tier: analysis.tier
        },
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

register("guiOpened", function() {
  if (!scanningEnabled) return;
  
  setTimeout(function() {
    scanChestContents();
  }, 100);
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

// Don't auto-clear hover data anymore - let it persist in GUIs
let lastGuiRenderTime = 0;
let lastDetectedItem = null;

// ===== HIGHLIGHT ITEMS =====
register('renderItemIntoGui', function(item, x, y) {
  if (!data.highlightsEnabled && !data.infoBoxEnabled) return;
  
  try {
    const stack = item.itemStack;
    let cacheData = itemCache.get(stack);
    
    if (cacheData === null || cacheData === undefined) {
      const name = item.getName();
      
      if (!isSeymourArmor(name)) {
        itemCache.put(stack, { tier: -1, isFade: false });
        return;
      }
      
      const uuid = extractUuidFromItem(item);
      
      // Check if we have this piece in collection database first
      if (uuid && collection[uuid]) {
        // Rebuild analysis from stored data
        const stored = collection[uuid];
        const storedAnalysis = analyzeSeymourArmor(stored.hexcode, name);
        
        if (storedAnalysis) {
          cacheData = {
            tier: storedAnalysis.tier,
            isFade: storedAnalysis.isFadeDye,
            analysis: storedAnalysis,
            itemHex: stored.hexcode
          };
          itemCache.put(stack, cacheData);
        } else {
          itemCache.put(stack, { tier: -1, isFade: false });
          return;
        }
      } else {
        // Need to analyze
        const loreRaw = item.getLore();
        const hex = extractHexFromLore(loreRaw);
        
        if (!hex) {
          itemCache.put(stack, { tier: -1, isFade: false });
          return;
        }
        
        const analysis = analyzeSeymourArmor(hex, name);
        
        if (!analysis) {
          itemCache.put(stack, { tier: -1, isFade: false });
          return;
        }
        
        cacheData = { 
          tier: analysis.tier, 
          isFade: analysis.isFadeDye,
          analysis: analysis,
          itemHex: hex
        };
        itemCache.put(stack, cacheData);
      }
    }
    
    // NEW: Check if mouse is over this item and update hoveredItemData for info box
    if (data.infoBoxEnabled && cacheData.analysis) {
      const Mouse = Java.type("org.lwjgl.input.Mouse");
      const mc = Client.getMinecraft();
      const scaledRes = new (Java.type("net.minecraft.client.gui.ScaledResolution"))(mc);
      const scale = scaledRes.func_78325_e();
      const mouseX = Mouse.getX() / scale;
      const mouseY = (mc.field_71440_d - Mouse.getY()) / scale;
      
      // Check if mouse is EXACTLY over this item (strict bounds checking)
      if (mouseX >= x && mouseX < x + 16 && mouseY >= y && mouseY < y + 16) {
        const best = cacheData.analysis.bestMatch;
        const itemRgb = hexToRgb(cacheData.itemHex);
        const targetRgb = hexToRgb(best.targetHex);
        
        const visualDist = best.deltaE;
        const absoluteDist = Math.abs(itemRgb.r - targetRgb.r) + 
                             Math.abs(itemRgb.g - targetRgb.g) + 
                             Math.abs(itemRgb.b - targetRgb.b);
        
        // ALWAYS update when mouse is over this item - this ensures the most recent hover wins
        hoveredItemData = {
          name: best.name,
          hex: best.targetHex,
          deltaE: visualDist,
          absoluteDist: absoluteDist,
          tier: cacheData.tier,
          isFadeDye: cacheData.isFade,
          itemHex: cacheData.itemHex,
          top3: cacheData.analysis.top3Matches,
          renderX: x,  // Track where this was rendered
          renderY: y,
          timestamp: Date.now()  // Track when this was set
        };
        
        if (DEBUG) ChatLib.chat("§a[Debug] Hover at " + x + "," + y + ": " + best.name);
      }
    }
    
    // Draw highlights (if enabled)
    if (data.highlightsEnabled) {
      // Use GL11 to properly manage the matrix stack
      const GL11 = Java.type("org.lwjgl.opengl.GL11");
      GL11.glPushMatrix();
      GL11.glTranslatef(0, 0, 100);
      GL11.glDisable(GL11.GL_DEPTH_TEST);
      
      // CHECK IF THIS IS A SEARCH MATCH (HIGHEST PRIORITY - GREEN)
      let isSearchMatch = false;
      if (searchHexes.length > 0 && cacheData.itemHex) {
        for (let i = 0; i < searchHexes.length; i++) {
          if (cacheData.itemHex.toUpperCase() === searchHexes[i].toUpperCase()) {
            isSearchMatch = true;
            break;
          }
        }
      }
      
      if (isSearchMatch) {
        // Bright green highlight for search matches
        Renderer.drawRect(Renderer.color(0, 255, 0, 150), x, y, 16, 16);
      } else if (cacheData.tier !== -1 && cacheData.tier !== 3) {
        // Regular tier-based highlights
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
    }
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
        const stored = collection[uuid];
        const storedAnalysis = analyzeSeymourArmor(stored.hexcode, itemName);
        
        if (storedAnalysis) {
          cacheData = {
            tier: storedAnalysis.tier,
            isFade: storedAnalysis.isFadeDye,
            analysis: storedAnalysis,
            itemHex: stored.hexcode
          };
          itemCache.put(stack, cacheData);
        } else {
          return;
        }
      } else {
        const hex = extractHexFromLore(lore);
        if (!hex) return;
        
        const analysis = analyzeSeymourArmor(hex, itemName);
        if (!analysis) return;
        
        cacheData = { 
          tier: analysis.tier, 
          isFade: analysis.isFadeDye,
          analysis: analysis,
          itemHex: hex
        };
        itemCache.put(stack, cacheData);
      }
    }
    
    if (!cacheData.analysis) return;
    
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
      top3: cacheData.analysis.top3Matches
    };
    
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
    
    // Get properly scaled mouse coordinates
    const Mouse = Java.type("org.lwjgl.input.Mouse");
    const mc = Client.getMinecraft();
    const scaledRes = new (Java.type("net.minecraft.client.gui.ScaledResolution"))(mc);
    const scale = scaledRes.func_78325_e();
    const actualMouseX = Mouse.getX() / scale;
    const actualMouseY = (mc.field_71440_d - Mouse.getY()) / scale;
    
    const GuiContainer = Java.type("net.minecraft.client.gui.inventory.GuiContainer");
    const isContainer = gui instanceof GuiContainer;
    
    // ITEM DETECTION - Try to find hovered item
    let foundItem = null;
    
    // Method 1: For GuiContainers (chests, trades, etc)
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
          const mcContainer = gui.field_147002_h;
          const slots = mcContainer.field_75151_b;
          
          // Get the slot the GUI thinks is hovered (most reliable)
          const theSlot = gui.field_147006_u; // theSlot / slotUnderMouse
          
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
    
    // Method 2: For NEU and other GUIs - scan all rendered items from cache
    if (!foundItem && !isContainer) {
      if (DEBUG) ChatLib.chat("§b[Debug] Trying NEU item detection...");
      
      // Try to get from itemTooltip cache (hoveredItemData should be set)
      if (hoveredItemData) {
        if (DEBUG) ChatLib.chat("§a[Debug] Using cached hoveredItemData from tooltip");
        // Don't clear hoveredItemData, just use it
      } else {
        if (DEBUG) ChatLib.chat("§c[Debug] No hoveredItemData from tooltip");
      }
    }
    
    // If we found an item in a container, analyze it and UPDATE hoveredItemData
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
            const stored = collection[uuid];
            const storedAnalysis = analyzeSeymourArmor(stored.hexcode, itemName);
            
            if (storedAnalysis) {
              cacheData = {
                tier: storedAnalysis.tier,
                isFade: storedAnalysis.isFadeDye,
                analysis: storedAnalysis,
                itemHex: stored.hexcode
              };
              itemCache.put(stack, cacheData);
            }
          } else {
            const loreRaw = foundItem.getLore();
            const hex = extractHexFromLore(loreRaw);
            if (hex) {
              const analysis = analyzeSeymourArmor(hex, itemName);
              if (analysis) {
                cacheData = { 
                  tier: analysis.tier, 
                  isFade: analysis.isFadeDye,
                  analysis: analysis,
                  itemHex: hex
                };
                itemCache.put(stack, cacheData);
              }
            }
          }
        }
        
        if (cacheData && cacheData.analysis) {
          const best = cacheData.analysis.bestMatch;
          const itemRgb = hexToRgb(cacheData.itemHex);
          const targetRgb = hexToRgb(best.targetHex);
          
          const visualDist = best.deltaE;
          const absoluteDist = Math.abs(itemRgb.r - targetRgb.r) + 
                               Math.abs(itemRgb.g - targetRgb.g) + 
                               Math.abs(itemRgb.b - targetRgb.b);
          
          // ALWAYS UPDATE when we detect a Seymour item - this fixes trade menu issues
          hoveredItemData = {
            name: best.name,
            hex: best.targetHex,
            deltaE: visualDist,
            absoluteDist: absoluteDist,
            tier: cacheData.tier,
            isFadeDye: cacheData.isFade,
            itemHex: cacheData.itemHex,
            top3: cacheData.analysis.top3Matches,
            timestamp: Date.now() // Track when updated
          };

          if (DEBUG) ChatLib.chat("§a[Debug] hoveredItemData FORCE UPDATED from container!");
        }
      }
      // If NOT Seymour armor, don't update hoveredItemData (keep previous data)
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
    
    // Calculate dynamic width based on content
    let maxTextWidth = 170; // minimum width
    
    if (isShiftHeld) {
      // Check top 3 matches for longest text
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
      // Check regular info for longest text
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
    
    const boxWidth = Math.max(170, Math.min(maxTextWidth, 400)); // max width 400
    const boxHeight = isShiftHeld ? 110 : 70;
    
    const isMouseOver = actualMouseX >= boxX && actualMouseX <= boxX + boxWidth &&
                        actualMouseY >= boxY && actualMouseY <= boxY + boxHeight;
    
    // Disable depth test and ensure proper blending
    const GL11 = Java.type("org.lwjgl.opengl.GL11");
    GL11.glPushMatrix();
    GL11.glDisable(GL11.GL_DEPTH_TEST);
    GL11.glDisable(GL11.GL_LIGHTING);
    GL11.glEnable(GL11.GL_BLEND);
    GL11.glBlendFunc(GL11.GL_SRC_ALPHA, GL11.GL_ONE_MINUS_SRC_ALPHA);
    GL11.glColor4f(1.0, 1.0, 1.0, 1.0);
    GL11.glTranslatef(0, 0, 500); // Move to higher Z-index

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
    
// Display piece hex at the top
Renderer.drawStringWithShadow("§7Piece: §f#" + infoData.itemHex, boxX + 5, boxY + 18);

if (isShiftHeld) {
  Renderer.drawStringWithShadow("§7§lTop 3 Matches:", boxX + 5, boxY + 28);
  
  for (let i = 0; i < 3 && i < infoData.top3.length; i++) {
    const match = infoData.top3[i];
    const yPos = boxY + 40 + (i * 25);
    
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
  Renderer.drawStringWithShadow("§7Closest: §f" + infoData.name, boxX + 5, boxY + 28);
  Renderer.drawStringWithShadow("§7Target: §7#" + infoData.hex, boxX + 5, boxY + 38);
  
  let deltaColorPrefix;
  if (infoData.isFadeDye) {
    deltaColorPrefix = infoData.tier === 0 ? "§9" : (infoData.tier === 1 ? "§b" : (infoData.tier === 2 ? "§e" : "§7"));
  } else {
    deltaColorPrefix = infoData.tier === 0 ? "§c" : (infoData.tier === 1 ? "§d" : (infoData.tier === 2 ? "§6" : "§7"));
  }
  
  Renderer.drawStringWithShadow(deltaColorPrefix + "ΔE: §f" + infoData.deltaE.toFixed(2), boxX + 5, boxY + 48);
  Renderer.drawStringWithShadow("§7Absolute: §f" + infoData.absoluteDist, boxX + 5, boxY + 58);
  
  let tierText;
  if (infoData.isFadeDye) {
    tierText = infoData.tier === 0 ? "§9§lT1<" : (infoData.tier === 1 ? "§b§lT1" : (infoData.tier === 2 ? "§e§lT2" : "§7§l✗ T3+"));
  } else {
    tierText = infoData.tier === 0 ? "§c§lT1<" : (infoData.tier === 1 ? "§d§lT1" : (infoData.tier === 2 ? "§6§lT2" : "§7§l✗ T3+"));
  }
  
  Renderer.drawStringWithShadow(tierText, boxX + 5, boxY + 68);
}
    
    // Restore GL state
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
  
  // Get properly scaled mouse coordinates
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

// Fallback dragging handler for trade menus and other GUIs
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
  
  // Check if we should start dragging
  if (isMouseDown && !lastMouseDown && !isDragging) {
    if (mouseX >= boxPosition.x && mouseX <= boxPosition.x + boxWidth &&
        mouseY >= boxPosition.y && mouseY <= boxPosition.y + boxHeight) {
      isDragging = true;
      dragOffset.x = mouseX - boxPosition.x;
      dragOffset.y = mouseY - boxPosition.y;
    }
  }
  
  // Stop dragging
  if (!isMouseDown && lastMouseDown && isDragging) {
    saveBoxPosition();
    ChatLib.chat("§a[Seymour Analyzer] §7Position saved!");
    isDragging = false;
  }
  
  lastMouseDown = isMouseDown;
});

register("guiClosed", function() {
  itemCache.clear();
  hoveredItemData = null;
  isDragging = false;
});

// ===== RENDER CHEST HIGHLIGHTS (DEBUG) =====
register("renderWorld", function(partialTicks) {
  if (highlightedChests.length === 0) return;
  
  try {
    const Tessellator = Java.type("net.minecraft.client.renderer.Tessellator");
    const WorldRenderer = Java.type("net.minecraft.client.renderer.WorldRenderer");
    const DefaultVertexFormats = Java.type("net.minecraft.client.renderer.vertex.DefaultVertexFormats");
    const GL11 = Java.type("org.lwjgl.opengl.GL11");
    
    const tessellator = Tessellator.func_178181_a();
    const worldRenderer = tessellator.func_178180_c();
    
    // Get player's interpolated position
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
      
      // Green color with alpha
      const r = 0.0, g = 1.0, b = 0.0, a = 0.8;
      
      // Bottom face
      worldRenderer.func_181668_a(3, DefaultVertexFormats.field_181706_f); // GL_LINE_LOOP
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
      worldRenderer.func_181668_a(1, DefaultVertexFormats.field_181706_f); // GL_LINES
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
  
  // Prevent multiple simultaneous executions
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
    itemCache.clear();
    const keys = Object.keys(hexAnalysisCache);
    for (let i = 0; i < keys.length; i++) {
      delete hexAnalysisCache[keys[i]];
    }
    hoveredItemData = null;
    
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
  
  // Check for clear command
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
    
    // Rebuild caches
    rebuildLabCache();
    itemCache.clear();
    const cacheKeys = Object.keys(hexAnalysisCache);
    for (let i = 0; i < cacheKeys.length; i++) {
      delete hexAnalysisCache[cacheKeys[i]];
    }
    
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
    
    // Rebuild caches
    rebuildLabCache();
    itemCache.clear();
    const cacheKeys = Object.keys(hexAnalysisCache);
    for (let i = 0; i < cacheKeys.length; i++) {
      delete hexAnalysisCache[cacheKeys[i]];
    }
    
    ChatLib.chat("§a[Seymour Analyzer] §7Removed custom color: §f" + colorName + " §7(#" + hex + ")");
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
      
      if (data.infoBoxEnabled) {
        ChatLib.chat("§a[Seymour Analyzer] §7Info box §aenabled§7!");
      } else {
        ChatLib.chat("§a[Seymour Analyzer] §7Info box §cdisabled§7!");
      }
      return;
    } else if (arg2 && arg2.toLowerCase() === "highlights") {
      data.highlightsEnabled = !data.highlightsEnabled;
      data.save();
      
      itemCache.clear();
      hoveredItemData = null;
      
      if (data.highlightsEnabled) {
        ChatLib.chat("§a[Seymour Analyzer] §7Item highlights §aenabled§7!");
      } else {
        ChatLib.chat("§a[Seymour Analyzer] §7Item highlights §cdisabled§7!");
      }
      return;
    } else if (arg2 && arg2.toLowerCase() === "sets") {
      data.pieceSpecificEnabled = !data.pieceSpecificEnabled;
      data.save();
      
      itemCache.clear();
      const keys = Object.keys(hexAnalysisCache);
      for (let i = 0; i < keys.length; i++) {
        delete hexAnalysisCache[keys[i]];
      }
      hoveredItemData = null;
      
      if (data.pieceSpecificEnabled) {
        ChatLib.chat("§a[Seymour Analyzer] §7Piece-specific matching §aenabled§7! (Colors only match their piece types)");
      } else {
        ChatLib.chat("§a[Seymour Analyzer] §7Piece-specific matching §cdisabled§7! (Universal matching)");
      }
      return;
    } else if (arg2 && arg2.toLowerCase() === "fade") {
      data.fadeDyesEnabled = !data.fadeDyesEnabled;
      data.save();
      
      itemCache.clear();
      const keys = Object.keys(hexAnalysisCache);
      for (let i = 0; i < keys.length; i++) {
        delete hexAnalysisCache[keys[i]];
      }
      hoveredItemData = null;
      
      if (data.fadeDyesEnabled) {
        ChatLib.chat("§a[Seymour Analyzer] §7Fade dyes §aenabled§7!");
      } else {
        ChatLib.chat("§a[Seymour Analyzer] §7Fade dyes §cdisabled§7!");
      }
      return;
    } else if (arg2 && arg2.toLowerCase() === "3p") {
      data.threePieceSetsEnabled = !data.threePieceSetsEnabled;
      data.save();
      
      itemCache.clear();
      const keys = Object.keys(hexAnalysisCache);
      for (let i = 0; i < keys.length; i++) {
        delete hexAnalysisCache[keys[i]];
      }
      hoveredItemData = null; // Clear when GUI closes
      
      if (data.threePieceSetsEnabled) {
        ChatLib.chat("§a[Seymour Analyzer] §73-piece sets filter §aenabled§7! (Top Hats won't match 3p sets)");
      } else {
        ChatLib.chat("§a[Seymour Analyzer] §73-piece sets filter §cdisabled§7! (Top Hats can match 3p sets)");
      }
      return;
    } else {
      ChatLib.chat("§a[Seymour Analyzer] §7Usage: /seymour toggle <infobox|highlights|fade|3p|sets>");
      return;
    }
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
  ChatLib.chat("§e/seymour compare <hexes> §7- Compare multiple hex codes");
  ChatLib.chat("§e/seymour resetpos §7- Reset info box position");
  ChatLib.chat("§e/seymour add <name> <hex> §7- Add custom color");
  ChatLib.chat("§e/seymour remove <name> §7- Remove custom color");
  ChatLib.chat("§e/seymour list §7- List all custom colors")
  ChatLib.chat("§e/seymour toggle infobox §7- Toggle info box §8[" + (data.infoBoxEnabled ? "§a✓" : "§c✗") + "§8]");
  ChatLib.chat("§e/seymour toggle highlights §7- Toggle item highlights §8[" + (data.highlightsEnabled ? "§a✓" : "§c✗") + "§8]");
  ChatLib.chat("§e/seymour toggle fade §7- Toggle fade dyes §8[" + (data.fadeDyesEnabled ? "§a✓" : "§c✗") + "§8]");
  ChatLib.chat("§e/seymour toggle 3p §7- Toggle 3p sets filter §8[" + (data.threePieceSetsEnabled ? "§a✓" : "§c✗") + "§8]");
  ChatLib.chat("§e/seymour toggle sets §7- Toggle piece-specific matching §8[" + (data.pieceSpecificEnabled ? "§a✓" : "§c✗") + "§8]");
  ChatLib.chat("§7Collection: §e" + Object.keys(collection).length + " §7pieces");
  ChatLib.chat("§8§m----------------------------------------------------");
  } finally {
    commandExecuting = false;
  }
}).setName("seymour");

// ===== SEARCH AND HIGHLIGHT CHESTS (FIXED) =====
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
