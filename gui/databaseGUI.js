/// <reference types="../CTAutocomplete" />
/// <reference lib="es2015" />

import PogObject from "PogData";

export class DatabaseGUI {
    constructor() {
        // Load the collection
        this.collection = new PogObject("SeymourAnalyzer", {}, "Collection.json");
        this.scrollOffset = 0;
        this.isSwitchingGui = false;
        this.isOpen = false;
        this.allPieces = [];
        this.gui = null;
        this.contextMenu = null;
        this.searchText = "";
        this.searchBoxActive = false;
        this.searchTextSelected = false;
        this.hexSearchText = "";
        this.hexSearchBoxActive = false;
        this.hexSearchTextSelected = false;
        this.sortColumn = null;
        this.sortDirection = "asc";
        this.expandedPieceUuid = null;
        this.cachedHexSearch = null;
        this.cachedFilteredPieces = null;
        this.lastSearchText = "";
        this.lastHexSearchText = "";
        this.lastSortColumn = null;
        this.lastSortDirection = "asc";
        this.cachedSortedPieces = null;
        this.showDupesOnly = false;
        this.showFades = true;
        this.lastShowDupesOnly = false;
        this.cachedTierCounts = null;
    }

    open(hexSearchText = null, searchText = null) {
        this.isOpen = true;
        this.scrollOffset = 0;
        this.searchText = "" + (searchText || "");
        this.searchBoxActive = false;
        this.hexSearchText = "" + (hexSearchText || "");
        this.hexSearchBoxActive = false;
        
        // Convert PogObject to array
        this.allPieces = [];
        
        try {
            const keys = Object.keys(this.collection);
            
            let loadIndex = 0;
            while (loadIndex < keys.length) {
                const uuid = keys[loadIndex];
                const piece = this.collection[uuid];
                
                // Skip if not a valid piece
                if (!piece || typeof piece !== 'object') {
                    loadIndex = loadIndex + 1;
                    continue;
                }
                if (!piece.pieceName || !piece.hexcode) {
                    loadIndex = loadIndex + 1;
                    continue;
                }
                
                // Store values in SEPARATE variables first
                const storedUuid = "" + uuid;
                const storedName = "" + piece.pieceName;
                const storedHex = "" + piece.hexcode;
                const storedMatchName = piece.bestMatch ? ("" + piece.bestMatch.colorName) : "Unknown";
                const storedMatchHex = piece.bestMatch ? ("" + piece.bestMatch.targetHex) : "000000";
                const storedDeltaE = piece.bestMatch ? (piece.bestMatch.deltaE + 0) : 999;
                const storedAbsDist = piece.bestMatch ? (piece.bestMatch.absoluteDistance + 0) : 999;
                const storedTier = piece.bestMatch ? (piece.bestMatch.tier + 0) : 4;
                const storedIsCustom = this.checkCustomColor(storedMatchName);
                
                // Create object using stored variables
                const newPiece = {};
                newPiece.uuid = storedUuid;
                newPiece.name = storedName;
                newPiece.hex = storedHex;
                newPiece.closestMatch = storedMatchName;
                newPiece.closestHex = storedMatchHex;
                newPiece.deltaE = storedDeltaE;
                newPiece.absoluteDistance = storedAbsDist;
                newPiece.tier = storedTier;
                newPiece.isCustomColor = storedIsCustom;
                newPiece.nameLower = storedName.toLowerCase();
                newPiece.matchLower = storedMatchName.toLowerCase();
                newPiece.hexLower = storedHex.toLowerCase();
                newPiece.deltaString = storedDeltaE.toFixed(2);

                // Push to array instead of indexing
                this.allPieces.push(newPiece);

                loadIndex = loadIndex + 1;
            }
            
            ChatLib.chat("§a[Seymour GUI] §7Loaded " + this.allPieces.length + " pieces");
            
            // Sort by deltaE on first load (best to worst)
            this.allPieces.sort(function(a, b) {
                const deltaA = a.deltaE + 0;
                const deltaB = b.deltaE + 0;
                return deltaA - deltaB;
            });
            
            // Calculate tier counts
            this.cachedTierCounts = { t1Normal: 0, t1Fade: 0, t2Normal: 0, t2Fade: 0, dupes: 0 };
            const hexCountMap = {};
            
            // Count hex occurrences
            let hexIdx = 0;
            while (hexIdx < this.allPieces.length) {
                const hexVal = this.allPieces[hexIdx].hex;
                hexCountMap[hexVal] = (hexCountMap[hexVal] || 0) + 1;
                hexIdx = hexIdx + 1;
            }
            
            // Count tiers
            let idx = 0;
            while (idx < this.allPieces.length) {
                const p = this.allPieces[idx];
                
                if (hexCountMap[p.hex] > 1) {
                    this.cachedTierCounts.dupes = this.cachedTierCounts.dupes + 1;
                }
                
                if (p.deltaE <= 2) {
                    if (p.isCustomColor || !p.isFadeDye) {
                        this.cachedTierCounts.t1Normal = this.cachedTierCounts.t1Normal + 1;
                    } else {
                        this.cachedTierCounts.t1Fade = this.cachedTierCounts.t1Fade + 1;
                    }
                } else if (p.deltaE <= 5) {
                    if (p.isFadeDye && !p.isCustomColor) {
                        this.cachedTierCounts.t2Fade = this.cachedTierCounts.t2Fade + 1;
                    } else {
                        this.cachedTierCounts.t2Normal = this.cachedTierCounts.t2Normal + 1;
                    }
                }
                
                idx = idx + 1;
            }
        } catch (e) {
            ChatLib.chat("§c[Seymour GUI] Error loading: " + e);
        }
        
        // Use ChatTriggers Gui instead of JavaAdapter
        const self = this;
        
        // Store the original GUI scale
        const mc = Client.getMinecraft();
        self.originalGuiScale = mc.field_71474_y.field_74335_Z;
        
        this.gui = new Gui();
        
        this.gui.registerOpened(() => {
            // Force GUI scale to 2 when opening
            const mc = Client.getMinecraft();
            mc.field_71474_y.field_74335_Z = 2;
            mc.func_71373_a(new (Java.type("net.minecraft.client.gui.ScaledResolution"))(mc));
        });
        
        this.gui.registerClosed(() => {
            // Restore original GUI scale when closing
            const mc = Client.getMinecraft();
            mc.field_71474_y.field_74335_Z = self.originalGuiScale;
            mc.func_71373_a(new (Java.type("net.minecraft.client.gui.ScaledResolution"))(mc));
        });
        
        this.gui.registerDraw(() => {
            if (self.isOpen) {
                // Check if shift is held and get mouse position
                const Keyboard = Java.type("org.lwjgl.input.Keyboard");
                const shiftHeld = Keyboard.isKeyDown(42) || Keyboard.isKeyDown(54);
                
                if (shiftHeld) {
                    // Get mouse position
                    const Mouse = Java.type("org.lwjgl.input.Mouse");
                    const mc = Client.getMinecraft();
                    const scale = 2;
                    const mouseX = Mouse.getX() / scale;
                    const mouseY = (mc.field_71440_d - Mouse.getY()) / scale;
                    
                    const headerY = 50;
                    const startY = headerY + 20;
                    const rowHeight = 20;
                    
                    const filteredPieces = self.filterPiecesBySearch();
                    const displayPieces = self.sortPieces(filteredPieces);
                    const startIndex = self.scrollOffset;
                    const totalPieces = displayPieces.length;
                    
                    // Helper to calculate actual row height
                    const getRowHeight = function(piece) {
                        if (self.expandedPieceUuid !== piece.uuid) return rowHeight;
                        
                        const originalPiece = self.collection[piece.uuid];
                        if (!originalPiece || !originalPiece.allMatches) return rowHeight;
                        
                        const numMatches = Math.min(3, originalPiece.allMatches.length);
                        let visibleLines = 0;
                        
                        if (numMatches > 0 && (self.showFades || !self.checkFadeDye(originalPiece.allMatches[0].colorName))) {
                            visibleLines = visibleLines + 1;
                        }
                        if (numMatches > 1 && (self.showFades || !self.checkFadeDye(originalPiece.allMatches[1].colorName))) {
                            visibleLines = visibleLines + 1;
                        }
                        if (numMatches > 2 && (self.showFades || !self.checkFadeDye(originalPiece.allMatches[2].colorName))) {
                            visibleLines = visibleLines + 1;
                        }
                        
                        const calculatedHeight = 20 + (visibleLines * 20);
                        return calculatedHeight;
                       };
                    
                    // Walk through rows accounting for actual heights
                    let currentY = startY;
                    let foundIndex = -1;
                    
                    let checkIndex = 0;
                    while (checkIndex < 30 && (startIndex + checkIndex) < totalPieces) {
                        const piece = displayPieces[startIndex + checkIndex];
                        const thisRowHeight = getRowHeight(piece);
                        
                        if (mouseY >= currentY && mouseY < currentY + thisRowHeight) {
                            foundIndex = startIndex + checkIndex;
                            break;
                        }
                        
                        currentY = currentY + thisRowHeight;
                        checkIndex = checkIndex + 1;
                    }
                    
                    if (foundIndex >= 0 && foundIndex < totalPieces) {
                        const piece = displayPieces[foundIndex];
                        self.expandedPieceUuid = piece.uuid;
                    } else {
                        self.expandedPieceUuid = null;
                    }
                } else {
                    // Not holding shift, clear expanded
                    self.expandedPieceUuid = null;
                }
                
                self.drawScreen(0, 0, 0);
            }
        });
        
        this.gui.registerKeyTyped((char, keyCode) => {
    if (keyCode === 1) { // ESC
        if (self.searchBoxActive) {
            self.searchBoxActive = false;
            self.searchText = "";
        } else if (self.hexSearchBoxActive) {
            self.hexSearchBoxActive = false;
            self.hexSearchText = "";
        } else {
            // NOT switching to another GUI when pressing ESC, so restore scale
            self.isSwitchingGui = false;
            self.close();
        }
    } else if (keyCode === 14) { // Backspace
        if (self.searchBoxActive) {
            if (self.searchTextSelected) {
                self.searchText = "";
                self.searchTextSelected = false;
            } else if (self.searchText.length > 0) {
                self.searchText = self.searchText.substring(0, self.searchText.length - 1);
            }
            self.scrollOffset = 0;
            self.cachedFilteredPieces = null;
            self.cachedSortedPieces = null;
            self.lastSearchText = "";
            self.lastHexSearchText = "";
        } else if (self.hexSearchBoxActive) {
            if (self.hexSearchTextSelected) {
                self.hexSearchText = "";
                self.hexSearchTextSelected = false;
            } else if (self.hexSearchText.length > 0) {
                self.hexSearchText = self.hexSearchText.substring(0, self.hexSearchText.length - 1);
            }
            self.scrollOffset = 0;
            self.cachedFilteredPieces = null;
            self.cachedSortedPieces = null;
            self.lastSearchText = "";
            self.lastHexSearchText = "";
        }
    } else if (self.searchBoxActive || self.hexSearchBoxActive) {
        const Keyboard = Java.type("org.lwjgl.input.Keyboard");
        const isCtrlHeld = Keyboard.isKeyDown(29) || Keyboard.isKeyDown(157);
        
        const activeBox = self.searchBoxActive ? "search" : "hexSearch";
        const currentText = activeBox === "search" ? self.searchText : self.hexSearchText;
        const isSelected = activeBox === "search" ? self.searchTextSelected : self.hexSearchTextSelected;
        
        // Handle Ctrl+A (Select All)
        if (isCtrlHeld && keyCode === 30) { // A key
            if (activeBox === "search") {
                self.searchTextSelected = true;
            } else {
                self.hexSearchTextSelected = true;
            }
            const Toolkit = Java.type("java.awt.Toolkit");
            const StringSelection = Java.type("java.awt.datatransfer.StringSelection");
            const clipboard = Toolkit.getDefaultToolkit().getSystemClipboard();
            const selection = new StringSelection(currentText);
            clipboard.setContents(selection, null);
            return;
        }
        
        // Handle Ctrl+C (Copy)
        if (isCtrlHeld && keyCode === 46) { // C key
            const Toolkit = Java.type("java.awt.Toolkit");
            const StringSelection = Java.type("java.awt.datatransfer.StringSelection");
            const clipboard = Toolkit.getDefaultToolkit().getSystemClipboard();
            const selection = new StringSelection(currentText);
            clipboard.setContents(selection, null);
            return;
        }
        
        // Handle Ctrl+V (Paste)
        if (isCtrlHeld && keyCode === 47) { // V key
            const Toolkit = Java.type("java.awt.Toolkit");
            const clipboard = Toolkit.getDefaultToolkit().getSystemClipboard();
            const contents = clipboard.getContents(null);
            const DataFlavor = Java.type("java.awt.datatransfer.DataFlavor");
            if (contents && contents.isDataFlavorSupported(DataFlavor.stringFlavor)) {
                const pastedText = contents.getTransferData(DataFlavor.stringFlavor);
                if (activeBox === "search") {
                    self.searchText = self.searchText + pastedText;
                } else {
                    self.hexSearchText = self.hexSearchText + pastedText;
                }
                self.scrollOffset = 0;
                self.scrollOffset = 0;
                self.cachedFilteredPieces = null;
                self.cachedSortedPieces = null;
                self.lastSearchText = "";
                self.lastHexSearchText = "";
            }
            return;
        }
        
        // Normal character input
        if (char) {
            if (keyCode !== 42 && keyCode !== 54 && keyCode !== 29 && keyCode !== 157 && keyCode !== 56 && keyCode !== 184 && keyCode !== 60) {
                if (activeBox === "search") {
                    if (self.searchTextSelected) {
                        self.searchText = char;
                        self.searchTextSelected = false;
                    } else {
                        self.searchText = self.searchText + char;
                    }
                } else {
                    if (self.hexSearchTextSelected) {
                        self.hexSearchText = char;
                        self.hexSearchTextSelected = false;
                    } else {
                        self.hexSearchText = self.hexSearchText + char;
                    }
                }
                self.scrollOffset = 0;
                self.cachedFilteredPieces = null;
                self.cachedSortedPieces = null;
                self.lastSearchText = "";
                self.lastHexSearchText = "";
            }
        }
    }
});
        
        this.gui.registerScrolled((x, y, direction) => {
            const mc = Client.getMinecraft();
            const height = (mc.field_71440_d) / 2;
            const maxVisibleRows = Math.floor((height - 90) / 20);
            const displayPieces = self.filterPiecesBySearch();
            const maxScroll = Math.max(0, displayPieces.length - maxVisibleRows);
            
            if (direction === 1) {
                self.scrollOffset = Math.max(0, self.scrollOffset - 1);
            } else {
                self.scrollOffset = Math.min(maxScroll, self.scrollOffset + 1);
            }
        });
        
        this.gui.registerClicked((mouseX, mouseY, button) => {
    // Get actual mouse coordinates
    const Mouse = Java.type("org.lwjgl.input.Mouse");
    const mc = Client.getMinecraft();
    const scale = 2;
    const actualMouseX = Mouse.getX() / scale;
    const actualMouseY = (mc.field_71440_d - Mouse.getY()) / scale;

    // Get screen dimensions (use fixed scale)
    const widthCalcMc = Client.getMinecraft();
    const width = widthCalcMc.field_71443_c / 2;
    const height = widthCalcMc.field_71440_d / 2;
    
    // Check for RIGHT CLICK
    if (button === 1) {
        self.handleRightClick(actualMouseX, actualMouseY);
        return;
    }
    
    // Check dupes button (left click)
    if (button === 0) {
    const dupesButtonWidth = 85;
    const dupesButtonX = 20;
    const dupesButtonY = height - 35;
        
        if (actualMouseX >= dupesButtonX && actualMouseX <= dupesButtonX + dupesButtonWidth &&
            actualMouseY >= dupesButtonY && actualMouseY <= dupesButtonY + 20) {
            self.toggleDupesFilter();
            return;
        }
    }

    // Check fades button (left click)
    if (button === 0) {
    const fadesButtonWidth = 85;
    const fadesButtonX = 110;
    const fadesButtonY = height - 35;

        if (actualMouseX >= fadesButtonX && actualMouseX <= fadesButtonX + fadesButtonWidth &&
            actualMouseY >= fadesButtonY && actualMouseY <= fadesButtonY + 20) {
            self.toggleFadesFilter();
            return;
        }
    }

// Check checklist button click FIRST
    if (button === 0) {
        const clButtonWidth = 150;
        const clButtonX = 20;
        const clButtonY = 10;
// Check word button
const wordButtonWidth = 120;
const wordButtonX = width - wordButtonWidth - 20;
const wordButtonY = height - 60;

if (actualMouseX >= wordButtonX && actualMouseX <= wordButtonX + wordButtonWidth &&
    actualMouseY >= wordButtonY && actualMouseY <= wordButtonY + 20) {
    self.isSwitchingGui = true;
    self.close();
    ChatLib.command("seymourwords", true);
    return;
}

// Check pattern button
const patternButtonWidth = 120;
const patternButtonX = width - patternButtonWidth - 20;
const patternButtonY = height - 35;

if (actualMouseX >= patternButtonX && actualMouseX <= patternButtonX + patternButtonWidth &&
    actualMouseY >= patternButtonY && actualMouseY <= patternButtonY + 20) {
    self.isSwitchingGui = true;
    self.close();
    ChatLib.command("seymourpatterns", true);
    return;
}  
        if (actualMouseX >= clButtonX && actualMouseX <= clButtonX + clButtonWidth &&
    actualMouseY >= clButtonY && actualMouseY <= clButtonY + 20) {
    self.isSwitchingGui = true;
    self.close();
    ChatLib.command("seymour sets", true);
    return;
}
    }

    // Check search box (left click)
if (button === 0) {
    if (self.handleSearchBoxClick(actualMouseX, actualMouseY)) {
        return;
    }
    if (self.handleHexSearchBoxClick(actualMouseX, actualMouseY)) {
        return;
    }
}
            
            // Check header clicks for sorting (left click)
            if (button === 0) {
                const headerY = 50;
                if (actualMouseY >= headerY && actualMouseY <= headerY + 12) {
                    let clickedColumn = null;
                    
                    if (actualMouseX >= 20 && actualMouseX <= 180) {
    clickedColumn = "name";
    } else if (actualMouseX >= 200 && actualMouseX <= 285) {
    clickedColumn = "hex";
    } else if (actualMouseX >= 300 && actualMouseX <= 540) {
    clickedColumn = "match";
    } else if (actualMouseX >= 550 && actualMouseX <= 620) {
    clickedColumn = "deltaE";
    } else if (actualMouseX >= 630 && actualMouseX <= 710) {
    clickedColumn = "absolute";
    } else if (actualMouseX >= 710 && actualMouseX <= 800) {
    clickedColumn = "distance";
}
                    
                    if (clickedColumn) {
                        if (self.sortColumn === clickedColumn) {
                            // Toggle direction
                            self.sortDirection = self.sortDirection === "asc" ? "desc" : "asc";
                        } else {
                            // New column
                            self.sortColumn = clickedColumn;
                            self.sortDirection = "asc";
                        }
                        self.scrollOffset = 0;
                        return;
                    }
                }
            }
            
            // Check context menu
            if (self.contextMenu) {
                self.handleContextMenuClick(actualMouseX, actualMouseY);
                return;
            }
        });
        
        // Check if there's a pending hex search from ArmorChecklistGUI
    if (global.pendingDatabaseHexSearch) {
    this.hexSearchText = global.pendingDatabaseHexSearch;
    this.hexSearchBoxActive = true;
    this.scrollOffset = 0;
    this.sortColumn = null; // Clear any existing sort so auto-sort kicks in
    this.cachedSortedPieces = null; // Clear sort cache
    ChatLib.chat("§a[Seymour GUI] §7Searching for: §f#" + this.hexSearchText);
    global.pendingDatabaseHexSearch = null; // Clear it
}

this.gui.open();
ChatLib.chat("§a[Seymour GUI] §7GUI opened!");
    }

    close() {
        this.isOpen = false;
        this.allPieces = [];
        this.contextMenu = null;
        this.searchText = "";
        this.searchBoxActive = false;
        this.hexSearchText = "";
        this.hexSearchBoxActive = false;
        this.cachedFilteredPieces = null;
        this.cachedSortedPieces = null;
        this.cachedHexSearch = null;
        this.lastSearchText = "";
        this.lastHexSearchText = "";
        
        // Restore GUI scale BEFORE closing if not switching
        const mc = Client.getMinecraft();
        if (this.originalGuiScale !== undefined && !this.isSwitchingGui) {
            mc.field_71474_y.field_74335_Z = this.originalGuiScale;
            mc.func_71373_a(new (Java.type("net.minecraft.client.gui.ScaledResolution"))(mc));
        }
        
        // Reset the flag for next time
        this.isSwitchingGui = false;
        
        Client.currentGui.close();
    }

    checkFadeDye(colorName) {
            const fadeDyes = ["Aurora", "Black Ice", "Frog", "Lava", "Lucky", "Marine", "Oasis", "Ocean", "Pastel Sky", "Portal", "Red Tulip", "Rose", "Snowflake", "Spooky", "Sunflower", "Sunset", "Warden"];
            for (let i = 0; i < fadeDyes.length; i++) {
                if (colorName.indexOf(fadeDyes[i] + " - Stage") === 0) {
                    return true;
                }
            }
            return false;
        }

        calculateColorDistance(hex1, hex2) {
        const rgb1 = this.hexToRgb(hex1);
        const rgb2 = this.hexToRgb(hex2);
        
        const rDiff = rgb1.r - rgb2.r;
        const gDiff = rgb1.g - rgb2.g;
        const bDiff = rgb1.b - rgb2.b;
        
        // Return Manhattan distance (sum of absolute differences)
        return Math.abs(rDiff) + Math.abs(gDiff) + Math.abs(bDiff);
    }

    rgbToXyz(rgb) {
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

    xyzToLab(xyz) {
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

    hexToLab(hex) {
        const rgb = this.hexToRgb(hex);
        const xyz = this.rgbToXyz(rgb);
        return this.xyzToLab(xyz);
    }

    calculateDeltaE(hex1, hex2) {
        const lab1 = this.hexToLab(hex1);
        const lab2 = this.hexToLab(hex2);
        
        return Math.sqrt(
            Math.pow(lab1.L - lab2.L, 2) + 
            Math.pow(lab1.a - lab2.a, 2) + 
            Math.pow(lab1.b - lab2.b, 2)
        );
    }

    checkCustomColor(colorName) {
        const customColors = new PogObject("SeymourAnalyzer", {}, "CustomColors.json");
        return customColors[colorName] !== undefined;
    }

    hexToRgb(hex) {
        hex = hex.replace("#", "").toUpperCase();
        if (hex.length !== 6) return { r: 0, g: 0, b: 0 };
        return {
            r: parseInt(hex.substr(0, 2), 16),
            g: parseInt(hex.substr(2, 2), 16),
            b: parseInt(hex.substr(4, 2), 16)
        };
    }

    isColorDark(hex) {
        const rgb = this.hexToRgb(hex);
        const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
        return luminance < 0.5;
    }

    getTierColor(tier, isFadeDye, isCustomColor) {
        // Custom colors have HIGHEST priority
        if (isCustomColor) {
            if (tier === 0 || tier === 1) return { r: 0, g: 100, b: 0 };  // Dark green for T1< and T1
            if (tier === 2) return { r: 85, g: 107, b: 47 };  // Olive green for T2
            if (tier === 3) return { r: 128, g: 128, b: 0 };  // Yellow-green for T2+
        }
        
        // Tier 0 (perfect match) - check if fade dye
        if (tier === 0) {
            if (isFadeDye) {
                return { r: 0, g: 0, b: 255 };  // Dark blue for perfect fade match
            }
            return { r: 255, g: 0, b: 0 };  // Red for perfect normal match
        }
        
        // Normal dyes have priority
        if (!isFadeDye) {
            if (tier === 1) return { r: 255, g: 0, b: 0 };      // T1 red
            if (tier === 2) return { r: 255, g: 105, b: 180 };  // T1 pink (deltaE 1-2)
            if (tier === 3) return { r: 255, g: 165, b: 0 };    // T2 orange
        } else {
            // Fade dyes only if not a normal dye
            if (tier === 1) return { r: 0, g: 0, b: 255 };      // T1< blue
            if (tier === 2) return { r: 135, g: 206, b: 250 };  // T2 light blue
            if (tier === 3) return { r: 255, g: 255, b: 0 };    // T2 yellow
        }
        
        return { r: 128, g: 128, b: 128 };
    }

    filterPiecesBySearch() {
        // Check if we can use cached results
        if (this.cachedFilteredPieces && 
            this.lastSearchText === this.searchText && 
            this.lastHexSearchText === this.hexSearchText &&
            this.lastShowDupesOnly === this.showDupesOnly) {
            return this.cachedFilteredPieces;
        }
        
        // Update cache keys
        this.lastSearchText = this.searchText;
        this.lastHexSearchText = this.hexSearchText;
        this.lastShowDupesOnly = this.showDupesOnly;
        
        let filtered = this.allPieces;
        
        // First apply dupes filter if active
        if (this.showDupesOnly) {
            const hexCounts = {};
            
            // Count occurrences of each hex
            let countIndex = 0;
            while (countIndex < this.allPieces.length) {
                const hex = this.allPieces[countIndex].hex;
                hexCounts[hex] = (hexCounts[hex] || 0) + 1;
                countIndex = countIndex + 1;
            }
            
            // Filter to only show pieces with duplicate hexes
            const dupesArray = [];
            let filterIndex = 0;
            while (filterIndex < filtered.length) {
                const piece = filtered[filterIndex];
                if (hexCounts[piece.hex] > 1) {
                    dupesArray.push(piece);
                }
                filterIndex = filterIndex + 1;
            }
            filtered = dupesArray;
        }
        
        if (!this.showFades) {
    const self = this;
    const filteredFades = [];
    
    let fadeIdx = 0;
    while (fadeIdx < filtered.length) {
        const piece = filtered[fadeIdx];
        const matchIsFade = self.checkFadeDye(piece.closestMatch);
        
        if (matchIsFade) {
            const originalPiece = self.collection[piece.uuid];
            if (originalPiece && originalPiece.allMatches) {
                let found = false;
                let matchIdx = 0;
                while (matchIdx < originalPiece.allMatches.length && matchIdx < 3) {
                    const match = originalPiece.allMatches[matchIdx];
                    if (!self.checkFadeDye(match.colorName)) {
                        piece.closestMatch = match.colorName;
                        piece.closestHex = match.targetHex;
                        piece.deltaE = match.deltaE;
                        piece.absoluteDistance = match.absoluteDistance;
                        piece.tier = match.tier;
                        piece.matchLower = match.colorName.toLowerCase();
                        piece.deltaString = match.deltaE.toFixed(2);
                        piece.isShowingAlternateMatch = true;
                        filteredFades.push(piece);
                        found = true;
                        break;
                    }
                    matchIdx = matchIdx + 1;
                }
                if (!found) {
                    // No non-fade alternative, skip this piece
                }
            }
        } else {
            filteredFades.push(piece);
        }
        
        fadeIdx = fadeIdx + 1;
    }
    filtered = filteredFades;
} else {
    // Restore original best matches when showing fades again
    const self = this;
    let restoreIdx = 0;
    while (restoreIdx < filtered.length) {
        const piece = filtered[restoreIdx];
        if (piece.isShowingAlternateMatch) {
            const originalPiece = self.collection[piece.uuid];
            if (originalPiece && originalPiece.bestMatch) {
                piece.closestMatch = originalPiece.bestMatch.colorName;
                piece.closestHex = originalPiece.bestMatch.targetHex;
                piece.deltaE = originalPiece.bestMatch.deltaE;
                piece.absoluteDistance = originalPiece.bestMatch.absoluteDistance;
                piece.tier = originalPiece.bestMatch.tier;
                piece.matchLower = originalPiece.bestMatch.colorName.toLowerCase();
                piece.deltaString = originalPiece.bestMatch.deltaE.toFixed(2);
                piece.isShowingAlternateMatch = false;
            }
        }
        restoreIdx = restoreIdx + 1;
    }
}

        // First apply text search filter
        if (this.searchText && this.searchText.length > 0) {
            const searchLower = this.searchText.toLowerCase();
            const self = this;
            
            filtered = filtered.filter(function(piece) {
                if (!piece) return false;
                
                // Check if search contains X wildcards for hex matching (case insensitive X)
                const searchUpper = self.searchText.toUpperCase();
                const hasWildcard = searchUpper.indexOf('X') !== -1;
                
                if (hasWildcard && searchUpper.length === 6 && /^[0-9A-FX]+$/.test(searchUpper)) {
                    // This is a hex pattern with wildcards - build regex
                    let regexPattern = "^";
                    
                    const char0 = searchUpper.charAt(0);
                    regexPattern = regexPattern + (char0 === 'X' ? "[0-9A-F]" : char0);
                    
                    const char1 = searchUpper.charAt(1);
                    regexPattern = regexPattern + (char1 === 'X' ? "[0-9A-F]" : char1);
                    
                    const char2 = searchUpper.charAt(2);
                    regexPattern = regexPattern + (char2 === 'X' ? "[0-9A-F]" : char2);
                    
                    const char3 = searchUpper.charAt(3);
                    regexPattern = regexPattern + (char3 === 'X' ? "[0-9A-F]" : char3);
                    
                    const char4 = searchUpper.charAt(4);
                    regexPattern = regexPattern + (char4 === 'X' ? "[0-9A-F]" : char4);
                    
                    const char5 = searchUpper.charAt(5);
                    regexPattern = regexPattern + (char5 === 'X' ? "[0-9A-F]" : char5);
                    
                    regexPattern = regexPattern + "$";
                    
                    const hexRegex = new RegExp(regexPattern);
                    const pieceHexClean = piece.hex.replace("#", "").toUpperCase();
                    
                    return hexRegex.test(pieceHexClean);
                }
                
                // Normal search
                const nameMatch = piece.nameLower.indexOf(searchLower) !== -1;
                const hexMatch = piece.hexLower.indexOf(searchLower) !== -1;
                const deltaMatch = piece.deltaString.indexOf(searchLower) !== -1;
                
                if (nameMatch || hexMatch || deltaMatch) {
                    return true;
                }
                
                const matchMatch = piece.matchLower.indexOf(searchLower) !== -1;
                if (matchMatch) {
                    return true;
                }
                
                const originalPiece = self.collection[piece.uuid];
                if (originalPiece && originalPiece.allMatches) {
                    const numMatches = Math.min(3, originalPiece.allMatches.length);
                    
                    if (numMatches > 0) {
                        const match0Name = originalPiece.allMatches[0].colorName.toLowerCase();
                        if (match0Name.indexOf(searchLower) !== -1) {
                            return true;
                        }
                    }
                    
                    if (numMatches > 1) {
                        const match1Name = originalPiece.allMatches[1].colorName.toLowerCase();
                        if (match1Name.indexOf(searchLower) !== -1) {
                            return true;
                        }
                    }
                    
                    if (numMatches > 2) {
                        const match2Name = originalPiece.allMatches[2].colorName.toLowerCase();
                        if (match2Name.indexOf(searchLower) !== -1) {
                            return true;
                        }
                    }
                }
                
                return false;
            });
        }
        
        // Then apply hex search filter - ONLY if we have exactly 6 characters (full hex code)
        if (this.hexSearchText && this.hexSearchText.length > 0) {
            const searchHex = this.hexSearchText.replace("#", "").toUpperCase();
            
            // Only filter if we have exactly 6 hex digits (not more, not less)
            if (searchHex.length === 6 && /^[0-9A-F]{6}$/i.test(searchHex)) {
                const self = this;
                
                // Check if search hex changed - clear old cache
                if (!this.cachedHexSearch || this.cachedHexSearch.searchHex !== searchHex) {
                    this.cachedHexSearch = { searchHex: searchHex };
                }
                
                // Filter and calculate deltaE only for pieces that pass text filter
                filtered = filtered.filter(function(piece) {
                    if (!piece) return false;
                    
                    // Calculate and cache deltaE for this piece if not already cached for this search
                    if (piece.cachedSearchHex !== searchHex) {
                        piece.cachedSearchHex = searchHex;
                        piece.cachedSearchDeltaE = self.calculateDeltaE(searchHex, piece.hex);
                        piece.cachedSearchDistance = self.calculateColorDistance(searchHex, piece.hex);
                    }
                    
                    return piece.cachedSearchDeltaE <= 5;
                });
            }
        }
        
        // Cache the result
        this.cachedFilteredPieces = filtered;
        return filtered;
    }

    drawChecklistButton(screenWidth, yPos) {
        const buttonWidth = 150;
        const buttonHeight = 20;
        const buttonX = 20; // Top left corner
        
        const Mouse = Java.type("org.lwjgl.input.Mouse");
        const mc = Client.getMinecraft();
        const scale = 2;
        const mouseX = Mouse.getX() / scale;
        const mouseY = (mc.field_71440_d - Mouse.getY()) / scale;
        
        const isHovered = mouseX >= buttonX && mouseX <= buttonX + buttonWidth &&
                        mouseY >= yPos && mouseY <= yPos + buttonHeight;
        
        const bgColor = Renderer.color(80, 120, 40, 200);
        const hoverColor = Renderer.color(100, 140, 60, 220);
        
        Renderer.drawRect(isHovered ? hoverColor : bgColor, buttonX, yPos, buttonWidth, buttonHeight);
        
        const borderColor = Renderer.color(150, 200, 100, 255);
        Renderer.drawRect(borderColor, buttonX, yPos, buttonWidth, 2);
        Renderer.drawRect(borderColor, buttonX, yPos + buttonHeight - 2, buttonWidth, 2);
        Renderer.drawRect(borderColor, buttonX, yPos, 2, buttonHeight);
        Renderer.drawRect(borderColor, buttonX + buttonWidth - 2, yPos, 2, buttonHeight);
        
        const text = "§fOpen Checklist GUI";
        const textWidth = Renderer.getStringWidth(text);
        const textX = buttonX + (buttonWidth - textWidth) / 2;
        
        Renderer.drawStringWithShadow(text, textX, yPos + 6);
    }

    drawSearchBox() {
        const mc = Client.getMinecraft();
        const width = mc.field_71443_c / 2;
        const boxWidth = 235; // Changed from 250 to 235 - a bit narrower
        const boxHeight = 25;
        const boxX = width - boxWidth - 20;
        const boxY = 8; // Changed from 10 to 8 - 2 pixels higher
        
        // Draw search box background
        const bgColor = this.searchBoxActive ? Renderer.color(60, 60, 60, 240) : Renderer.color(40, 40, 40, 240);
        Renderer.drawRect(bgColor, boxX, boxY, boxWidth, boxHeight);
        
        // Draw border
        const borderColor = this.searchBoxActive ? Renderer.color(100, 200, 255) : Renderer.color(100, 100, 100);
        Renderer.drawRect(borderColor, boxX, boxY, boxWidth, 2);
        Renderer.drawRect(borderColor, boxX, boxY + boxHeight - 2, boxWidth, 2);
        Renderer.drawRect(borderColor, boxX, boxY, 2, boxHeight);
        Renderer.drawRect(borderColor, boxX + boxWidth - 2, boxY, 2, boxHeight);
        
        // Draw search text or placeholder
        if (this.searchText.length > 0) {
            // If text is selected, draw highlight behind it
            if (this.searchTextSelected) {
                const textWidth = Renderer.getStringWidth(this.searchText);
                // Very dull light blue highlight (30, 60, 90 with low alpha)
                Renderer.drawRect(Renderer.color(30, 60, 90, 120), boxX + 5, boxY + 6, textWidth, 12);
            }
            
            const cursor = "";
            Renderer.drawStringWithShadow("§f" + this.searchText + cursor, boxX + 5, boxY + 8);
        } else {
            Renderer.drawStringWithShadow("§7:Search hex/match/delta...", boxX + 5, boxY + 8);
        }
    }

    drawHexSearchBox() {
        const mc = Client.getMinecraft();
        const width = mc.field_71443_c / 2;
        const boxWidth = 125; // Changed from 135 to 125 - a bit narrower
        const boxHeight = 25;
        const boxX = width - boxWidth - 20;
        const boxY = 35; // Changed from 37 to 35 - 2 pixels higher
        
        // Draw search box background
        const bgColor = this.hexSearchBoxActive ? Renderer.color(60, 60, 60, 240) : Renderer.color(40, 40, 40, 240);
        Renderer.drawRect(bgColor, boxX, boxY, boxWidth, boxHeight);
        
        // Draw border
        const borderColor = this.hexSearchBoxActive ? Renderer.color(255, 200, 100) : Renderer.color(100, 100, 100);
        Renderer.drawRect(borderColor, boxX, boxY, boxWidth, 2);
        Renderer.drawRect(borderColor, boxX, boxY + boxHeight - 2, boxWidth, 2);
        Renderer.drawRect(borderColor, boxX, boxY, 2, boxHeight);
        Renderer.drawRect(borderColor, boxX + boxWidth - 2, boxY, 2, boxHeight);
        
        // Draw search text or placeholder
        if (this.hexSearchText.length > 0) {
            // If text is selected, draw highlight behind it
            if (this.hexSearchTextSelected) {
                const textWidth = Renderer.getStringWidth(this.hexSearchText);
                Renderer.drawRect(Renderer.color(90, 60, 30, 120), boxX + 5, boxY + 6, textWidth, 12);
            }
            
            const cursor = "";
            Renderer.drawStringWithShadow("§f" + this.hexSearchText + cursor, boxX + 5, boxY + 8);
        } else {
            Renderer.drawStringWithShadow("§7Hex search (ΔE<5)...", boxX + 5, boxY + 8);
        }
    }

    handleSearchBoxClick(mouseX, mouseY) {
        const mc = Client.getMinecraft();
        const width = mc.field_71443_c / 2;
        const boxWidth = 235; // Changed from 250 to 235
        const boxHeight = 25;
        const boxX = width - boxWidth - 20;
        const boxY = 8; // Changed from 10 to 8
        
        // Check if click is within search box
        if (mouseX >= boxX && mouseX <= boxX + boxWidth &&
            mouseY >= boxY && mouseY <= boxY + boxHeight) {
            this.searchBoxActive = true;
            this.searchTextSelected = false;
            return true;
        } else {
            this.searchBoxActive = false;
            this.searchTextSelected = false;
            return false;
        }
    }

    handleHexSearchBoxClick(mouseX, mouseY) {
        const mc = Client.getMinecraft();
        const width = mc.field_71443_c / 2;
        const boxWidth = 125; // Changed from 135 to 125
        const boxHeight = 25;
        const boxX = width - boxWidth - 20;
        const boxY = 35; // Changed from 37 to 35
        
        // Check if click is within hex search box
        if (mouseX >= boxX && mouseX <= boxX + boxWidth &&
            mouseY >= boxY && mouseY <= boxY + boxHeight) {
            this.hexSearchBoxActive = true;
            this.hexSearchTextSelected = false;
            this.searchBoxActive = false; // Deactivate the other box
            return true;
        } else {
            this.hexSearchBoxActive = false;
            this.hexSearchTextSelected = false;
            return false;
        }
    }

    drawScreen(mouseX, mouseY, partialTicks) {
    
        const mc = Client.getMinecraft();
        const width = mc.field_71443_c / 2;
        const height = mc.field_71440_d / 2;

        // Darker grey background for entire GUI
        Renderer.drawRect(Renderer.color(20, 20, 20, 180), 0, 0, width, height);
        
        // Title
        const title = "§l§nSeymour Database";
        const titleWidth = Renderer.getStringWidth(title);
        Renderer.drawStringWithShadow(title, width / 2 - titleWidth / 2, 5);
        
        // Draw search box
        this.drawSearchBox();
        this.drawChecklistButton(width, 10);
        this.drawWordButton(width, height);
        this.drawPatternButton(width, height);
        this.drawDupesButton(width, height);
        this.drawFadesButton(width, height);
        this.drawHexSearchBox();

        // Get filtered and sorted pieces
        const filteredPieces = this.filterPiecesBySearch();
        const displayPieces = this.sortPieces(filteredPieces);
        const totalCount = displayPieces.length;
        const allCount = this.allPieces.length;
        
        // Draw total pieces count
        const totalInfo = "§7Total: §e" + allCount + " §7pieces" + (displayPieces.length !== allCount ? " §7(Filtered: §e" + displayPieces.length + "§7)" : "");
        const totalWidth = Renderer.getStringWidth(totalInfo);
        Renderer.drawStringWithShadow(totalInfo, width / 2 - totalWidth / 2, 19);
        
        // Draw tier counter using cached counts - TWO ROWS
        const tc = this.cachedTierCounts || { t1Normal: 0, t1Fade: 0, t2Normal: 0, t2Fade: 0, dupes: 0 };
        
        // First row: T1 and T2 (normal)
        const row1Text = "§7T1: §c" + tc.t1Normal + "     §7T2: §6" + tc.t2Normal + "     §7Dupes: §d" + tc.dupes;
        const row1Width = Renderer.getStringWidth(row1Text);
        Renderer.drawStringWithShadow(row1Text, width / 2 - row1Width / 2, 30);
        
        // Second row: T1 Fade and T2 Fade
        const row2Text = "§7T1 Fade: §9" + tc.t1Fade + "     §7T2 Fade: §e" + tc.t2Fade;
        const row2Width = Renderer.getStringWidth(row2Text);
        Renderer.drawStringWithShadow(row2Text, width / 2 - row2Width / 2, 40);
        
        if (totalCount === 0) {
            const noResultsMsg = this.searchText.length > 0 ? "§7No results for: §e" + this.searchText : "§7No pieces. Use §e/seymour scan start";
            Renderer.drawStringWithShadow(noResultsMsg, width / 2 - 100, height / 2);
            return;
        }
        
        // Headers
        const headerY = 50;
        const nameArrow = this.sortColumn === "name" ? (this.sortDirection === "asc" ? " §e↓" : " §e↑") : "";
        const hexArrow = this.sortColumn === "hex" ? (this.sortDirection === "asc" ? " §e↓" : " §e↑") : "";
        const matchArrow = this.sortColumn === "match" ? (this.sortDirection === "asc" ? " §e↓" : " §e↑") : "";
        const deltaArrow = this.sortColumn === "deltaE" ? (this.sortDirection === "asc" ? " §e↓" : " §e↑") : "";
        const absArrow = this.sortColumn === "absolute" ? (this.sortDirection === "asc" ? " §e↓" : " §e↑") : "";
        
        Renderer.drawStringWithShadow("§l§7Name" + nameArrow, 20, headerY);
        Renderer.drawStringWithShadow("§l§7Hex" + hexArrow, 200, headerY);
        Renderer.drawStringWithShadow("§l§7Match" + matchArrow, 300, headerY);
        
        Renderer.drawStringWithShadow("§l§7ΔE" + deltaArrow, 550, headerY);
        Renderer.drawStringWithShadow("§l§7Absolute" + absArrow, 630, headerY);
        
        // Only show Distance header when hex search is active with 6 digits
        const showDistance = this.hexSearchText && this.hexSearchText.replace("#", "").length === 6;

        if (showDistance) {
            const distanceArrow = this.sortColumn === "distance" ? (this.sortDirection === "asc" ? " §e↓" : " §e↑") : "";
            Renderer.drawStringWithShadow("§l§7Distance" + distanceArrow, 720, headerY);
        }
        
        // Separator line
        Renderer.drawRect(Renderer.color(100, 100, 100), 20, headerY + 12, width - 40, 1);
        
        // Calculate visible rows
        const rowHeight = 20;
        const startY = headerY + 20;
        const availableHeight = height - startY - 20;
        const maxVisibleRows = Math.floor(availableHeight / rowHeight);
        
        const startIndex = this.scrollOffset;
        const endIndex = Math.min(startIndex + maxVisibleRows, totalCount);
        
        // Draw each visible row - MANUAL UNROLL for up to 30 rows
        const numToRender = endIndex - startIndex;
        
        let currentY = startY;
        
        // Helper function to get actual row height
        const getActualRowHeight = (piece) => {
            if (this.expandedPieceUuid !== piece.uuid) return rowHeight;
            
            const originalPiece = this.collection[piece.uuid];
            if (!originalPiece || !originalPiece.allMatches) return rowHeight;
            
            const numMatches = Math.min(3, originalPiece.allMatches.length);
            let visibleLines = 0;
            
            if (numMatches > 0 && (this.showFades || !this.checkFadeDye(originalPiece.allMatches[0].colorName))) {
                visibleLines = visibleLines + 1;
            }
            if (numMatches > 1 && (this.showFades || !this.checkFadeDye(originalPiece.allMatches[1].colorName))) {
                visibleLines = visibleLines + 1;
            }
            if (numMatches > 2 && (this.showFades || !this.checkFadeDye(originalPiece.allMatches[2].colorName))) {
                visibleLines = visibleLines + 1;
            }
            
            const calculatedHeight = 20 + (visibleLines * 20);
            return calculatedHeight;
        };
        
        // Batch 1 (0-4)
        if (numToRender > 0) {
            this.drawRow(displayPieces[startIndex + 0], currentY, width, rowHeight);
            currentY = currentY + getActualRowHeight(displayPieces[startIndex + 0]);
        }
        if (numToRender > 1) {
            this.drawRow(displayPieces[startIndex + 1], currentY, width, rowHeight);
            currentY = currentY + getActualRowHeight(displayPieces[startIndex + 1]);
        }
        if (numToRender > 2) {
            this.drawRow(displayPieces[startIndex + 2], currentY, width, rowHeight);
            currentY = currentY + getActualRowHeight(displayPieces[startIndex + 2]);
        }
        if (numToRender > 3) {
            this.drawRow(displayPieces[startIndex + 3], currentY, width, rowHeight);
            currentY = currentY + getActualRowHeight(displayPieces[startIndex + 3]);
        }
        if (numToRender > 4) {
            this.drawRow(displayPieces[startIndex + 4], currentY, width, rowHeight);
            currentY = currentY + getActualRowHeight(displayPieces[startIndex + 4]);
        }
        
        // Batch 2 (5-9)
        if (numToRender > 5) {
            this.drawRow(displayPieces[startIndex + 5], currentY, width, rowHeight);
            currentY = currentY + getActualRowHeight(displayPieces[startIndex + 5]);
        }
        if (numToRender > 6) {
            this.drawRow(displayPieces[startIndex + 6], currentY, width, rowHeight);
            currentY = currentY + getActualRowHeight(displayPieces[startIndex + 6]);
        }
        if (numToRender > 7) {
            this.drawRow(displayPieces[startIndex + 7], currentY, width, rowHeight);
            currentY = currentY + getActualRowHeight(displayPieces[startIndex + 7]);
        }
        if (numToRender > 8) {
            this.drawRow(displayPieces[startIndex + 8], currentY, width, rowHeight);
            currentY = currentY + getActualRowHeight(displayPieces[startIndex + 8]);
        }
        if (numToRender > 9) {
            this.drawRow(displayPieces[startIndex + 9], currentY, width, rowHeight);
            currentY = currentY + getActualRowHeight(displayPieces[startIndex + 9]);
        }
        
        // Batch 3 (10-14)
        if (numToRender > 10) {
            this.drawRow(displayPieces[startIndex + 10], currentY, width, rowHeight);
            currentY = currentY + getActualRowHeight(displayPieces[startIndex + 10]);
        }
        if (numToRender > 11) {
            this.drawRow(displayPieces[startIndex + 11], currentY, width, rowHeight);
            currentY = currentY + getActualRowHeight(displayPieces[startIndex + 11]);
        }
        if (numToRender > 12) {
            this.drawRow(displayPieces[startIndex + 12], currentY, width, rowHeight);
            currentY = currentY + getActualRowHeight(displayPieces[startIndex + 12]);
        }
        if (numToRender > 13) {
            this.drawRow(displayPieces[startIndex + 13], currentY, width, rowHeight);
            currentY = currentY + getActualRowHeight(displayPieces[startIndex + 13]);
        }
        if (numToRender > 14) {
            this.drawRow(displayPieces[startIndex + 14], currentY, width, rowHeight);
            currentY = currentY + getActualRowHeight(displayPieces[startIndex + 14]);
        }
        
        // Batch 4 (15-19)
        if (numToRender > 15) {
            this.drawRow(displayPieces[startIndex + 15], currentY, width, rowHeight);
            currentY = currentY + getActualRowHeight(displayPieces[startIndex + 15]);
        }
        if (numToRender > 16) {
            this.drawRow(displayPieces[startIndex + 16], currentY, width, rowHeight);
            currentY = currentY + getActualRowHeight(displayPieces[startIndex + 16]);
        }
        if (numToRender > 17) {
            this.drawRow(displayPieces[startIndex + 17], currentY, width, rowHeight);
            currentY = currentY + getActualRowHeight(displayPieces[startIndex + 17]);
        }
        if (numToRender > 18) {
            this.drawRow(displayPieces[startIndex + 18], currentY, width, rowHeight);
            currentY = currentY + getActualRowHeight(displayPieces[startIndex + 18]);
        }
        if (numToRender > 19) {
            this.drawRow(displayPieces[startIndex + 19], currentY, width, rowHeight);
            currentY = currentY + getActualRowHeight(displayPieces[startIndex + 19]);
        }
        
        // Batch 5 (20-24)
        if (numToRender > 20) {
            this.drawRow(displayPieces[startIndex + 20], currentY, width, rowHeight);
            currentY = currentY + getActualRowHeight(displayPieces[startIndex + 20]);
        }
        if (numToRender > 21) {
            this.drawRow(displayPieces[startIndex + 21], currentY, width, rowHeight);
            currentY = currentY + getActualRowHeight(displayPieces[startIndex + 21]);
        }
        if (numToRender > 22) {
            this.drawRow(displayPieces[startIndex + 22], currentY, width, rowHeight);
            currentY = currentY + getActualRowHeight(displayPieces[startIndex + 22]);
        }
        if (numToRender > 23) {
            this.drawRow(displayPieces[startIndex + 23], currentY, width, rowHeight);
            currentY = currentY + getActualRowHeight(displayPieces[startIndex + 23]);
        }
        if (numToRender > 24) {
            this.drawRow(displayPieces[startIndex + 24], currentY, width, rowHeight);
            currentY = currentY + getActualRowHeight(displayPieces[startIndex + 24]);
        }
        
        // Batch 6 (25-29)
        if (numToRender > 25) {
            this.drawRow(displayPieces[startIndex + 25], currentY, width, rowHeight);
            currentY = currentY + getActualRowHeight(displayPieces[startIndex + 25]);
        }
        if (numToRender > 26) {
            this.drawRow(displayPieces[startIndex + 26], currentY, width, rowHeight);
            currentY = currentY + getActualRowHeight(displayPieces[startIndex + 26]);
        }
        if (numToRender > 27) {
            this.drawRow(displayPieces[startIndex + 27], currentY, width, rowHeight);
            currentY = currentY + getActualRowHeight(displayPieces[startIndex + 27]);
        }
        if (numToRender > 28) {
            this.drawRow(displayPieces[startIndex + 28], currentY, width, rowHeight);
            currentY = currentY + getActualRowHeight(displayPieces[startIndex + 28]);
        }
        if (numToRender > 29) {
            this.drawRow(displayPieces[startIndex + 29], currentY, width, rowHeight);
            currentY = currentY + getActualRowHeight(displayPieces[startIndex + 29]);
        }

        // Draw context menu
        this.drawContextMenu();
        
        // Footer
        const footer = "§7Showing " + (startIndex + 1) + "-" + endIndex + " of " + totalCount;
        Renderer.drawStringWithShadow(footer, width / 2 - 80, height - 25);
        Renderer.drawStringWithShadow("§7Press §eESC §7to close", width / 2 - 65, height - 10);
    }

    drawRow(piece, y, screenWidth, rowHeight) {
    const isExpanded = this.expandedPieceUuid === piece.uuid;
    
    // Calculate height based on how many lines will actually be shown
    let actualRowHeight = 20;
    if (isExpanded) {
        const originalPiece = this.collection[piece.uuid];
        if (originalPiece && originalPiece.allMatches) {
            const numMatches = Math.min(3, originalPiece.allMatches.length);
            let visibleLines = 0;
            
            if (numMatches > 0 && (this.showFades || !this.checkFadeDye(originalPiece.allMatches[0].colorName))) {
                visibleLines = visibleLines + 1;
            }
            if (numMatches > 1 && (this.showFades || !this.checkFadeDye(originalPiece.allMatches[1].colorName))) {
                visibleLines = visibleLines + 1;
            }
            if (numMatches > 2 && (this.showFades || !this.checkFadeDye(originalPiece.allMatches[2].colorName))) {
                visibleLines = visibleLines + 1;
            }
            
            actualRowHeight = 20 + (visibleLines * 20);
        }
    }
        
        // Background with tier color - ONLY on ΔE and Absolute columns based on deltaE
// Always show main highlight for the main piece row
const shouldDrawMainHighlight = true;

const matchIsFade = this.checkFadeDye(piece.closestMatch);
const matchIsCustom = piece.isCustomColor || false;
let shouldHighlight = false;
let tc = null;

// Custom colors have HIGHEST priority
if (matchIsCustom) {
    if (piece.deltaE <= 2) {
        shouldHighlight = true;
        tc = { r: 0, g: 100, b: 0 };  // Dark green for T1/T1
    } else if (piece.deltaE <= 5) {
        shouldHighlight = true;
        tc = { r: 85, g: 107, b: 47 };  // Olive green for T2
    }
} else if (!matchIsFade) {
    // Normal dyes - priority order
    if (piece.deltaE <= 1) {
        shouldHighlight = true;
        tc = { r: 255, g: 0, b: 0 };  // Red
    } else if (piece.deltaE <= 2) {
        shouldHighlight = true;
        tc = { r: 255, g: 105, b: 180 };  // Pink
    } else if (piece.deltaE <= 5) {
        shouldHighlight = true;
        tc = { r: 255, g: 165, b: 0 };  // Orange
    }
} else {
    // Fade dyes - priority order
    if (piece.deltaE <= 1) {
        shouldHighlight = true;
        tc = { r: 0, g: 0, b: 255 };  // Dark blue
    } else if (piece.deltaE <= 2) {
        shouldHighlight = true;
        tc = { r: 135, g: 206, b: 250 };  // Light blue
    } else if (piece.deltaE <= 5) {
        shouldHighlight = true;
        tc = { r: 255, g: 255, b: 0 };  // Yellow
    }
}

if (shouldHighlight && tc && shouldDrawMainHighlight) {
    // Only highlight the main row (20px), not the expanded section
    const highlightHeight = isExpanded ? 20 : actualRowHeight;
    Renderer.drawRect(Renderer.color(tc.r, tc.g, tc.b, 72), 540, y, 140, highlightHeight);
}
            
        // Name
        let displayName = piece.name;
        if (displayName.length > 25) {
            displayName = displayName.substring(0, 25) + "...";
        }
        Renderer.drawStringWithShadow(displayName, 20, y + 4);
        
        // Hex box
        const rgb = this.hexToRgb(piece.hex);
        Renderer.drawRect(Renderer.color(rgb.r, rgb.g, rgb.b), 200, y, 85, 16);

        // Use shadow for white text on dark colors, draw black text with diagonal offset for thickness
        if (this.isColorDark(piece.hex)) {
            Renderer.drawStringWithShadow("§f" + piece.hex, 202, y + 4);
        } else {
            Renderer.drawString("§0" + piece.hex, 202, y + 4);
            Renderer.drawString("§0" + piece.hex, 202.5, y + 4.5);
        }
            
        // Match
        let displayMatch = piece.closestMatch;
        if (displayMatch.length > 35) {
            displayMatch = displayMatch.substring(0, 35) + "...";
        }
        Renderer.drawStringWithShadow("§b" + displayMatch, 300, y + 4);
        
        // DeltaE
        let deColor;
        if (matchIsCustom) {
            // Custom colors: dark green for good matches
            if (piece.deltaE < 2) {
                deColor = "§2";  // Dark green
            } else if (piece.deltaE < 5) {
                deColor = "§a";  // Light green
            } else {
                deColor = "§7";
            }
        } else if (piece.deltaE < 1) {
            deColor = matchIsFade ? "§9" : "§c";  // Changed from piece.isFadeDye to matchIsFade
        } else if (piece.deltaE < 2) {
            deColor = matchIsFade ? "§b" : "§d";  // Changed from piece.isFadeDye to matchIsFade
        } else if (piece.deltaE < 5) {
            deColor = matchIsFade ? "§e" : "§6";  // Changed from piece.isFadeDye to matchIsFade
        } else {
            deColor = "§7";
        }
        Renderer.drawStringWithShadow(deColor + piece.deltaE.toFixed(2), 550, y + 4);
        
        // Absolute Distance
        Renderer.drawStringWithShadow("§7" + piece.absoluteDistance, 630, y + 4);
        
        // Distance from search target (only when hex search is active)
        const showDistance = this.hexSearchText && this.hexSearchText.replace("#", "").length === 6;

        if (showDistance) {
            const rgbDistance = piece.cachedSearchDistance || 0;
            const approximateDelta = piece.cachedSearchDeltaE || 0;
            
            // Determine highlight color based on deltaE
            let distanceHighlight = null;
            if (approximateDelta <= 1) {
                distanceHighlight = { r: 255, g: 0, b: 0 };  // Red
            } else if (approximateDelta <= 2) {
                distanceHighlight = { r: 255, g: 105, b: 180 };  // Pink
            } else if (approximateDelta <= 5) {
                distanceHighlight = { r: 255, g: 165, b: 0 };  // Orange
            }
            
            // Draw highlight behind distance if applicable
            if (distanceHighlight) {
                Renderer.drawRect(Renderer.color(distanceHighlight.r, distanceHighlight.g, distanceHighlight.b, 80), 710, y, 90, actualRowHeight);
            }
            
            const distanceText = "§7Δ" + approximateDelta.toFixed(2) + " - " + rgbDistance.toFixed(0);
            Renderer.drawStringWithShadow(distanceText, 720, y + 4);
        }
            
        if (isExpanded) {
    this.drawExpandedMatches(piece, y + 24);
}
    }
    
    handleRightClick(mouseX, mouseY) {
        const startY = 70;
        const rowHeight = 20;
        
        const filteredPieces = this.filterPiecesBySearch();
        const displayPieces = this.sortPieces(filteredPieces);
        const startIndex = this.scrollOffset;
        const totalPieces = displayPieces.length;
        
        // Check which row was clicked
        let offset = 0;
        
        while (offset < 30 && (startIndex + offset) < totalPieces) {
            // Calculate rowY
            let rowY = 70;
            let i = 0;
            while (i < offset) {
                rowY = rowY + 20;
                i = i + 1;
            }
            
            // Calculate rowYEnd
            let rowYEnd = 70;
            let j = 0;
            while (j < offset) {
                rowYEnd = rowYEnd + 20;
                j = j + 1;
            }
            rowYEnd = rowYEnd + 20;
            
            // Check if click is within this row
            if (mouseY >= rowY && mouseY < rowYEnd) {
                // Get the actual piece
                const actualIndex = startIndex + offset;
                const piece = displayPieces[actualIndex];
                
                this.showContextMenu(piece, mouseX, mouseY);
                return;
            }
            
            offset = offset + 1;
        }
    }

    showContextMenu(piece, x, y) {
        const options = [];
        
        const option1 = {};
        option1.label = "Find Piece";
        option1.action = "find";
        options[0] = option1;
        
        const option2 = {};
        option2.label = "Remove Piece";
        option2.action = "remove";
        options[1] = option2;
        
        this.contextMenu = {};
        this.contextMenu.piece = piece;
        this.contextMenu.x = x;
        this.contextMenu.y = y;
        this.contextMenu.width = 150;
        this.contextMenu.options = options;
    }

    drawContextMenu() {
        if (!this.contextMenu) return;
        
        const menu = this.contextMenu;
        const optionHeight = 20;
        const menuHeight = menu.options.length * optionHeight;
        
        // Draw background
        Renderer.drawRect(Renderer.color(40, 40, 40, 240), menu.x, menu.y, menu.width, menuHeight);
        
        // Draw border
        Renderer.drawRect(Renderer.color(100, 100, 100), menu.x, menu.y, menu.width, 2);
        Renderer.drawRect(Renderer.color(100, 100, 100), menu.x, menu.y + menuHeight - 2, menu.width, 2);
        Renderer.drawRect(Renderer.color(100, 100, 100), menu.x, menu.y, 2, menuHeight);
        Renderer.drawRect(Renderer.color(100, 100, 100), menu.x + menu.width - 2, menu.y, 2, menuHeight);
        
        // Draw options - UNROLLED
        if (menu.options.length > 0) {
            const option0 = menu.options[0];
            const optionY0 = menu.y + (0 * optionHeight);
            
            // Highlight on hover
            const Mouse = Java.type("org.lwjgl.input.Mouse");
            const mc = Client.getMinecraft();
            const scale = 2;
            const mouseX = Mouse.getX() / scale;
            const mouseY = (mc.field_71440_d - Mouse.getY()) / scale;
            
            if (mouseX >= menu.x && mouseX <= menu.x + menu.width &&
                mouseY >= optionY0 && mouseY < optionY0 + optionHeight) {
                Renderer.drawRect(Renderer.color(80, 80, 80, 200), menu.x, optionY0, menu.width, optionHeight);
            }
            
            Renderer.drawStringWithShadow("§f" + option0.label, menu.x + 5, optionY0 + 6);
        }
        
        if (menu.options.length > 1) {
            const option1 = menu.options[1];
            const optionY1 = menu.y + (1 * optionHeight);
            
            const Mouse = Java.type("org.lwjgl.input.Mouse");
            const mc = Client.getMinecraft();
            const scale = 2;
            const mouseX = Mouse.getX() / scale;
            const mouseY = (mc.field_71440_d - Mouse.getY()) / scale;
            
            if (mouseX >= menu.x && mouseX <= menu.x + menu.width &&
                mouseY >= optionY1 && mouseY < optionY1 + optionHeight) {
                Renderer.drawRect(Renderer.color(80, 80, 80, 200), menu.x, optionY1, menu.width, optionHeight);
            }
            
            Renderer.drawStringWithShadow("§f" + option1.label, menu.x + 5, optionY1 + 6);
        }
    }

    handleContextMenuClick(mouseX, mouseY) {
        if (!this.contextMenu) return false;
        
        const menu = this.contextMenu;
        const optionHeight = 20;
        const menuHeight = menu.options.length * optionHeight;
        
        // Check if click is outside menu - close it
        if (mouseX < menu.x || mouseX > menu.x + menu.width ||
            mouseY < menu.y || mouseY > menu.y + menuHeight) {
            this.contextMenu = null;
            return false;
        }
        
        // Check which option was clicked - UNROLLED
        let optionClicked = false;
        
        // Check option 0
        if (menu.options.length > 0 && !optionClicked) {
            const optionY0 = menu.y + (0 * optionHeight);
            
            if (mouseY >= optionY0 && mouseY < optionY0 + optionHeight) {
                const option = menu.options[0];
                const piece = menu.piece;
                
                if (option.action === "find") {
                    // Run search command for this hex
                    ChatLib.command("seymour search " + piece.hex, true);
                    ChatLib.chat("§a[Seymour GUI] §7Searching for piece: §f" + piece.name);
                } else if (option.action === "remove") {  
                    // Remove from collection
                    delete this.collection[piece.uuid];
                    this.collection.save();
                    
                    
                    // Rebuild the allPieces array without this piece
                    const newAllPieces = [];
                    let newIndex = 0;
                    
                    // Manual unroll to avoid loop bug
                    if (this.allPieces.length > 0 && this.allPieces[0].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[0]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 1 && this.allPieces[1].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[1]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 2 && this.allPieces[2].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[2]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 3 && this.allPieces[3].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[3]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 4 && this.allPieces[4].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[4]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 5 && this.allPieces[5].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[5]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 6 && this.allPieces[6].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[6]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 7 && this.allPieces[7].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[7]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 8 && this.allPieces[8].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[8]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 9 && this.allPieces[9].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[9]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 10 && this.allPieces[10].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[10]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 11 && this.allPieces[11].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[11]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 12 && this.allPieces[12].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[12]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 13 && this.allPieces[13].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[13]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 14 && this.allPieces[14].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[14]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 15 && this.allPieces[15].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[15]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 16 && this.allPieces[16].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[16]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 17 && this.allPieces[17].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[17]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 18 && this.allPieces[18].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[18]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 19 && this.allPieces[19].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[19]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 20 && this.allPieces[20].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[20]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 21 && this.allPieces[21].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[21]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 22 && this.allPieces[22].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[22]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 23 && this.allPieces[23].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[23]; newIndex = newIndex + 1; }
                    
                    this.allPieces = newAllPieces;
                    
                    ChatLib.chat("§a[Seymour GUI] §7Removed piece: §f" + piece.name + " §7(" + piece.hex + ")");
                    ChatLib.chat("§a[Seymour GUI] §7New piece count: §e" + this.allPieces.length);
                }
                
                this.contextMenu = null;
                optionClicked = true;
            }
        }
        
        // Check option 1
        if (menu.options.length > 1 && !optionClicked) {
            const optionY1 = menu.y + (1 * optionHeight);
            
            if (mouseY >= optionY1 && mouseY < optionY1 + optionHeight) {
                const option = menu.options[1];
                const piece = menu.piece;
                
                if (option.action === "find") {
                    // Run search command for this hex
                    ChatLib.command("seymour search " + piece.hex, true);
                    ChatLib.chat("§a[Seymour GUI] §7Searching for piece: §f" + piece.name);
                } else if (option.action === "remove") {
                    // Remove from collection
                    delete this.collection[piece.uuid];
                    this.collection.save();
                    
                    // Rebuild the allPieces array without this piece
                    const newAllPieces = [];
                    let newIndex = 0;
                    
                    // Manual unroll to avoid loop bug
                    if (this.allPieces.length > 0 && this.allPieces[0].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[0]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 1 && this.allPieces[1].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[1]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 2 && this.allPieces[2].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[2]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 3 && this.allPieces[3].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[3]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 4 && this.allPieces[4].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[4]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 5 && this.allPieces[5].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[5]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 6 && this.allPieces[6].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[6]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 7 && this.allPieces[7].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[7]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 8 && this.allPieces[8].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[8]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 9 && this.allPieces[9].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[9]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 10 && this.allPieces[10].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[10]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 11 && this.allPieces[11].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[11]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 12 && this.allPieces[12].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[12]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 13 && this.allPieces[13].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[13]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 14 && this.allPieces[14].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[14]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 15 && this.allPieces[15].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[15]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 16 && this.allPieces[16].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[16]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 17 && this.allPieces[17].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[17]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 18 && this.allPieces[18].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[18]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 19 && this.allPieces[19].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[19]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 20 && this.allPieces[20].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[20]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 21 && this.allPieces[21].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[21]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 22 && this.allPieces[22].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[22]; newIndex = newIndex + 1; }
                    if (this.allPieces.length > 23 && this.allPieces[23].uuid !== piece.uuid) { newAllPieces[newIndex] = this.allPieces[23]; newIndex = newIndex + 1; }
                    
                    this.allPieces = newAllPieces;
                    
                    ChatLib.chat("§a[Seymour GUI] §7Removed piece: §f" + piece.name + " §7(" + piece.hex + ")");
                }
                
                this.contextMenu = null;
                optionClicked = true;
            }
        }
        
        // If no option was clicked, just close menu
        if (!optionClicked) {
            this.contextMenu = null;
        }
        
        return optionClicked;
    }

    sortPieces(pieces) {
        // Check if we can use cached sorted results
        if (this.cachedSortedPieces && 
            this.lastSortColumn === this.sortColumn && 
            this.lastSortDirection === this.sortDirection &&
            this.lastSearchText === this.searchText &&
            this.lastHexSearchText === this.hexSearchText) {
            return this.cachedSortedPieces;
        }
        
        // Update cache keys
        this.lastSortColumn = this.sortColumn;
        this.lastSortDirection = this.sortDirection;
        
        // Check if hex search is active with valid data
        const hexSearchActive = this.hexSearchText && this.hexSearchText.replace("#", "").length === 6;
        
        // If no sort column is set AND hex search is active, auto-sort by distance
        if (!this.sortColumn && hexSearchActive) {
            const sorted = pieces.slice();
            sorted.sort(function(a, b) {
                const deltaA = a.cachedSearchDeltaE !== undefined ? a.cachedSearchDeltaE : 999;
                const deltaB = b.cachedSearchDeltaE !== undefined ? b.cachedSearchDeltaE : 999;
                
                // Sort ascending: smallest deltaE first (0.00 at top)
                if (deltaA < deltaB) return -1;
                if (deltaA > deltaB) return 1;
                return 0;
            });
            this.cachedSortedPieces = sorted;
            return sorted;
        }
        
        if (!this.sortColumn) {
            this.cachedSortedPieces = pieces;
            return pieces;
        }
        
        // Just use the native sort directly on a slice of the array
        // slice() creates a new array, so we won't modify the original
        const sorted = pieces.slice();
        
        const self = this;
        sorted.sort(function(a, b) {
            let comparison = 0;
            
            if (self.sortColumn === "name") {
            comparison = a.nameLower < b.nameLower ? -1 : (a.nameLower > b.nameLower ? 1 : 0);
            } else if (self.sortColumn === "hex") {
            comparison = a.hex < b.hex ? -1 : (a.hex > b.hex ? 1 : 0);
            } else if (self.sortColumn === "match") {
            comparison = a.matchLower < b.matchLower ? -1 : (a.matchLower > b.matchLower ? 1 : 0);
            } else if (self.sortColumn === "deltaE") {
            comparison = a.deltaE < b.deltaE ? -1 : (a.deltaE > b.deltaE ? 1 : 0);
            } else if (self.sortColumn === "absolute") {
            comparison = a.absoluteDistance < b.absoluteDistance ? -1 : (a.absoluteDistance > b.absoluteDistance ? 1 : 0);
            } else if (self.sortColumn === "distance") {
            // Use cached deltaE values
            const deltaA = a.cachedSearchDeltaE || 0;
            const deltaB = b.cachedSearchDeltaE || 0;
            comparison = deltaA < deltaB ? -1 : (deltaA > deltaB ? 1 : 0);
            }
            
            return self.sortDirection === "asc" ? comparison : -comparison;
        });
        
        // Cache the result
        this.cachedSortedPieces = sorted;
        return sorted;
    }
    
    handleRightClick(mouseX, mouseY) {
        const headerY = 50;
        const startY = headerY + 20;
        const rowHeight = 20;
        
        const filteredPieces = this.filterPiecesBySearch();
        const displayPieces = this.sortPieces(filteredPieces);
        const startIndex = this.scrollOffset;
        const totalPieces = displayPieces.length;
        
        // Calculate which ROW INDEX (ignoring expansion) based on simple row height
        const relativeY = mouseY - startY;
        const rowIndex = Math.floor(relativeY / rowHeight);
        const actualIndex = startIndex + rowIndex;
        
        if (actualIndex >= 0 && actualIndex < totalPieces) {
            const piece = displayPieces[actualIndex];
            this.showContextMenu(piece, mouseX, mouseY);
        }
    }

    drawExpandedMatches(piece, startY) {
    const originalPiece = this.collection[piece.uuid];
    if (!originalPiece || !originalPiece.allMatches) {
        Renderer.drawStringWithShadow("§7No match data available", 30, startY + 2);
        return;
    }
    
    const matches = originalPiece.allMatches;
    const numMatches = Math.min(3, matches.length);
    
    let currentY = startY;
    let displayNum = 1;
    
    if (numMatches > 0) {
        const match = matches[0];
        const isFade1 = this.checkFadeDye(match.colorName);
        
        if (this.showFades || !isFade1) {
            const matchRgb = this.hexToRgb(match.targetHex);
            
            let tc1 = null;
            if (!isFade1 && match.deltaE <= 1) tc1 = { r: 255, g: 0, b: 0 };
            else if (!isFade1 && match.deltaE <= 2) tc1 = { r: 255, g: 105, b: 180 };
            else if (!isFade1 && match.deltaE <= 5) tc1 = { r: 255, g: 165, b: 0 };
            else if (isFade1 && match.deltaE <= 1) tc1 = { r: 0, g: 0, b: 255 };
            else if (isFade1 && match.deltaE <= 2) tc1 = { r: 135, g: 206, b: 250 };
            else if (isFade1 && match.deltaE <= 5) tc1 = { r: 255, g: 255, b: 0 };
            
            if (tc1) {
                Renderer.drawRect(Renderer.color(tc1.r, tc1.g, tc1.b, 72), 540, currentY, 140, 16);
            }
            
            Renderer.drawRect(Renderer.color(matchRgb.r, matchRgb.g, matchRgb.b), 30, currentY, 60, 14);
            let matchName = match.colorName;
            if (matchName.length > 30) matchName = matchName.substring(0, 30) + "...";
            Renderer.drawStringWithShadow("§7" + displayNum + ". §b" + matchName, 95, currentY + 3);
            const deColor1 = match.deltaE < 1 ? (isFade1 ? "§9" : "§c") : (match.deltaE < 2 ? (isFade1 ? "§b" : "§d") : (match.deltaE < 5 ? (isFade1 ? "§e" : "§6") : "§7"));
            Renderer.drawStringWithShadow(deColor1 + match.deltaE.toFixed(2), 550, currentY + 3);
            Renderer.drawStringWithShadow("§7" + match.absoluteDistance, 630, currentY + 3);
            currentY = currentY + 20;
            displayNum = displayNum + 1;
        }
    }
    
    if (numMatches > 1) {
        const match = matches[1];
        const isFade2 = this.checkFadeDye(match.colorName);
        
        if (this.showFades || !isFade2) {
            const matchRgb = this.hexToRgb(match.targetHex);
            
            let tc2 = null;
            if (!isFade2 && match.deltaE <= 1) tc2 = { r: 255, g: 0, b: 0 };
            else if (!isFade2 && match.deltaE <= 2) tc2 = { r: 255, g: 105, b: 180 };
            else if (!isFade2 && match.deltaE <= 5) tc2 = { r: 255, g: 165, b: 0 };
            else if (isFade2 && match.deltaE <= 1) tc2 = { r: 0, g: 0, b: 255 };
            else if (isFade2 && match.deltaE <= 2) tc2 = { r: 135, g: 206, b: 250 };
            else if (isFade2 && match.deltaE <= 5) tc2 = { r: 255, g: 255, b: 0 };
            
            if (tc2) {
                Renderer.drawRect(Renderer.color(tc2.r, tc2.g, tc2.b, 72), 540, currentY, 140, 16);
            }
            
            Renderer.drawRect(Renderer.color(matchRgb.r, matchRgb.g, matchRgb.b), 30, currentY, 60, 14);
            let matchName = match.colorName;
            if (matchName.length > 30) matchName = matchName.substring(0, 30) + "...";
            Renderer.drawStringWithShadow("§7" + displayNum + ". §b" + matchName, 95, currentY + 3);
            const deColor2 = match.deltaE < 1 ? (isFade2 ? "§9" : "§c") : (match.deltaE < 2 ? (isFade2 ? "§b" : "§d") : (match.deltaE < 5 ? (isFade2 ? "§e" : "§6") : "§7"));
            Renderer.drawStringWithShadow(deColor2 + match.deltaE.toFixed(2), 550, currentY + 3);
            Renderer.drawStringWithShadow("§7" + match.absoluteDistance, 630, currentY + 3);
            currentY = currentY + 20;
            displayNum = displayNum + 1;
        }
    }
    
    if (numMatches > 2) {
        const match = matches[2];
        const isFade3 = this.checkFadeDye(match.colorName);
        
        if (this.showFades || !isFade3) {
            const matchRgb = this.hexToRgb(match.targetHex);
            
            let tc3 = null;
            if (!isFade3 && match.deltaE <= 1) tc3 = { r: 255, g: 0, b: 0 };
            else if (!isFade3 && match.deltaE <= 2) tc3 = { r: 255, g: 105, b: 180 };
            else if (!isFade3 && match.deltaE <= 5) tc3 = { r: 255, g: 165, b: 0 };
            else if (isFade3 && match.deltaE <= 1) tc3 = { r: 0, g: 0, b: 255 };
            else if (isFade3 && match.deltaE <= 2) tc3 = { r: 135, g: 206, b: 250 };
            else if (isFade3 && match.deltaE <= 5) tc3 = { r: 255, g: 255, b: 0 };
            
            if (tc3) {
                Renderer.drawRect(Renderer.color(tc3.r, tc3.g, tc3.b, 72), 540, currentY, 140, 16);
            }
            
            Renderer.drawRect(Renderer.color(matchRgb.r, matchRgb.g, matchRgb.b), 30, currentY, 60, 14);
            let matchName = match.colorName;
            if (matchName.length > 30) matchName = matchName.substring(0, 30) + "...";
            Renderer.drawStringWithShadow("§7" + displayNum + ". §b" + matchName, 95, currentY + 3);
            const deColor3 = match.deltaE < 1 ? (isFade3 ? "§9" : "§c") : (match.deltaE < 2 ? (isFade3 ? "§b" : "§d") : (match.deltaE < 5 ? (isFade3 ? "§e" : "§6") : "§7"));
            Renderer.drawStringWithShadow(deColor3 + match.deltaE.toFixed(2), 550, currentY + 3);
            Renderer.drawStringWithShadow("§7" + match.absoluteDistance, 630, currentY + 3);
        }
    }
}

    handleShiftClick(mouseX, mouseY) {
        const headerY = 50;
        const startY = headerY + 20;
        const rowHeight = 20;
        
        const filteredPieces = this.filterPiecesBySearch();
        const displayPieces = this.sortPieces(filteredPieces);
        const startIndex = this.scrollOffset;
        const totalPieces = displayPieces.length;
        
        let currentY = startY;
        let offset = 0;
        
        ChatLib.chat("§e[DEBUG] Shift-click at Y: " + mouseY + ", startY: " + startY);
        
        while (offset < 30 && (startIndex + offset) < totalPieces) {
            const piece = displayPieces[startIndex + offset];
            const isExpanded = this.expandedPieceUuid === piece.uuid;
            const actualRowHeight = isExpanded ? 20 : rowHeight;
            
            ChatLib.chat("§e[DEBUG] Row " + offset + " Y range: " + currentY + "-" + (currentY + actualRowHeight));
            
            if (mouseY >= currentY && mouseY < currentY + actualRowHeight) {
                // Toggle expanded state
                if (this.expandedPieceUuid === piece.uuid) {
                    this.expandedPieceUuid = null;
                    ChatLib.chat("§a[DEBUG] Collapsed piece: " + piece.name);
                } else {
                    this.expandedPieceUuid = piece.uuid;
                    ChatLib.chat("§a[DEBUG] Expanded piece: " + piece.name);
                }
                return;
            }
            
            currentY = currentY + actualRowHeight;
            offset = offset + 1;
        }
        
        ChatLib.chat("§c[DEBUG] No row clicked");
    }

    drawWordButton(screenWidth, screenHeight) {
        const buttonWidth = 120;
        const buttonHeight = 20;
        const buttonX = screenWidth - buttonWidth - 20;
        const buttonY = screenHeight - 60;
        
        const Mouse = Java.type("org.lwjgl.input.Mouse");
        const mc = Client.getMinecraft();
        const scale = 2;
        const mouseX = Mouse.getX() / scale;
        const mouseY = (mc.field_71440_d - Mouse.getY()) / scale;
        
        const isHovered = mouseX >= buttonX && mouseX <= buttonX + buttonWidth &&
                        mouseY >= buttonY && mouseY <= buttonY + buttonHeight;
        
        const bgColor = Renderer.color(139, 69, 19, 200);
        const hoverColor = Renderer.color(160, 82, 45, 220);
        
        Renderer.drawRect(isHovered ? hoverColor : bgColor, buttonX, buttonY, buttonWidth, buttonHeight);
        
        const borderColor = Renderer.color(205, 133, 63, 255);
        Renderer.drawRect(borderColor, buttonX, buttonY, buttonWidth, 2);
        Renderer.drawRect(borderColor, buttonX, buttonY + buttonHeight - 2, buttonWidth, 2);
        Renderer.drawRect(borderColor, buttonX, buttonY, 2, buttonHeight);
        Renderer.drawRect(borderColor, buttonX + buttonWidth - 2, buttonY, 2, buttonHeight);
        
        const text = "§f§lWord Matches";
        const textWidth = Renderer.getStringWidth(text);
        const textX = buttonX + (buttonWidth - textWidth) / 2;
        
        Renderer.drawStringWithShadow(text, textX, buttonY + 6);
    }

    drawPatternButton(screenWidth, screenHeight) {
        const buttonWidth = 120;
        const buttonHeight = 20;
        const buttonX = screenWidth - buttonWidth - 20;
        const buttonY = screenHeight - 35;
        
        const Mouse = Java.type("org.lwjgl.input.Mouse");
        const mc = Client.getMinecraft();
        const scale = 2;
        const mouseX = Mouse.getX() / scale;
        const mouseY = (mc.field_71440_d - Mouse.getY()) / scale;
        
        const isHovered = mouseX >= buttonX && mouseX <= buttonX + buttonWidth &&
                        mouseY >= buttonY && mouseY <= buttonY + buttonHeight;
        
        const bgColor = Renderer.color(147, 51, 234, 200);
        const hoverColor = Renderer.color(167, 71, 254, 220);
        
        Renderer.drawRect(isHovered ? hoverColor : bgColor, buttonX, buttonY, buttonWidth, buttonHeight);
        
        const borderColor = Renderer.color(186, 85, 211, 255);
        Renderer.drawRect(borderColor, buttonX, buttonY, buttonWidth, 2);
        Renderer.drawRect(borderColor, buttonX, buttonY + buttonHeight - 2, buttonWidth, 2);
        Renderer.drawRect(borderColor, buttonX, buttonY, 2, buttonHeight);
        Renderer.drawRect(borderColor, buttonX + buttonWidth - 2, buttonY, 2, buttonHeight);
        
        const text = "§f§lPattern Matches";
        const textWidth = Renderer.getStringWidth(text);
        const textX = buttonX + (buttonWidth - textWidth) / 2;
        
        Renderer.drawStringWithShadow(text, textX, buttonY + 6);
    }

    toggleDupesFilter() {
        this.showDupesOnly = !this.showDupesOnly;
        this.scrollOffset = 0;
        this.cachedFilteredPieces = null;
        this.cachedSortedPieces = null;
        
        if (this.showDupesOnly) {
            ChatLib.chat("§a[Seymour GUI] §7Showing §eduplicates only");
        } else {
            ChatLib.chat("§a[Seymour GUI] §7Showing §eall pieces");
        }
    }

    toggleFadesFilter() {
    this.showFades = !this.showFades;
    this.scrollOffset = 0;
    this.cachedFilteredPieces = null;
    this.cachedSortedPieces = null;
    this.lastShowDupesOnly = null;
    this.lastSearchText = "";
    this.lastHexSearchText = "";
    
    // Always sort by deltaE when toggling fades
    this.sortColumn = "deltaE";
    this.sortDirection = "asc";
    this.lastSortColumn = null;
    this.lastSortDirection = "asc";

    if (this.showFades) {
        ChatLib.chat("§a[Seymour GUI] §7Showing §efade dyes");
    } else {
        ChatLib.chat("§a[Seymour GUI] §7Hiding §efade dyes");
    }
}

    drawDupesButton(screenWidth, screenHeight) {
        const buttonWidth = 85;
        const buttonHeight = 20;
        const buttonX = 20;
        const buttonY = screenHeight - 35;
        
        const Mouse = Java.type("org.lwjgl.input.Mouse");
        const mc = Client.getMinecraft();
        const scale = 2;
        const mouseX = Mouse.getX() / scale;
        const mouseY = (mc.field_71440_d - Mouse.getY()) / scale;
        
        const isHovered = mouseX >= buttonX && mouseX <= buttonX + buttonWidth &&
                          mouseY >= buttonY && mouseY <= buttonY + buttonHeight;
        
        const bgColor = this.showDupesOnly ? 
            Renderer.color(220, 20, 60, 200) : 
            Renderer.color(169, 169, 169, 200);
        const hoverColor = this.showDupesOnly ? 
            Renderer.color(240, 40, 80, 220) : 
            Renderer.color(189, 189, 189, 220);
        
        Renderer.drawRect(isHovered ? hoverColor : bgColor, buttonX, buttonY, buttonWidth, buttonHeight);
        
        const borderColor = this.showDupesOnly ?
            Renderer.color(255, 99, 71, 255) :
            Renderer.color(211, 211, 211, 255);
        Renderer.drawRect(borderColor, buttonX, buttonY, buttonWidth, 2);
        Renderer.drawRect(borderColor, buttonX, buttonY + buttonHeight - 2, buttonWidth, 2);
        Renderer.drawRect(borderColor, buttonX, buttonY, 2, buttonHeight);
        Renderer.drawRect(borderColor, buttonX + buttonWidth - 2, buttonY, 2, buttonHeight);
        
        const text = this.showDupesOnly ? "§fDupes" : "§fShow Dupes";
        const textWidth = Renderer.getStringWidth(text);
        const textX = buttonX + (buttonWidth - textWidth) / 2;
        
        Renderer.drawStringWithShadow(text, textX, buttonY + 6);
    }

    drawFadesButton(screenWidth, screenHeight) {
        const buttonWidth = 85;
        const buttonHeight = 20;
        const buttonX = 110;
        const buttonY = screenHeight - 35;
        const Mouse = Java.type("org.lwjgl.input.Mouse");
        const mc = Client.getMinecraft();
        const scale = 2;
        const mouseX = Mouse.getX() / scale;
        const mouseY = (mc.field_71440_d - Mouse.getY()) / scale;
        const isHovered = mouseX >= buttonX && mouseX <= buttonX + buttonWidth &&
                            mouseY >= buttonY && mouseY <= buttonY + buttonHeight;
        const bgColor = this.showFades ? 
            Renderer.color(60, 179, 113, 200) : 
            Renderer.color(169, 169, 169, 200);
        const hoverColor = this.showFades ?
            Renderer.color(80, 199, 133, 220) :
            Renderer.color(189, 189, 189, 220);
        Renderer.drawRect(isHovered ? hoverColor : bgColor, buttonX, buttonY, buttonWidth, buttonHeight);
        const borderColor = this.showFades ?
            Renderer.color(144, 238, 144, 255) :
            Renderer.color(211, 211, 211, 255);
        Renderer.drawRect(borderColor, buttonX, buttonY, buttonWidth, 2);
        Renderer.drawRect(borderColor, buttonX, buttonY + buttonHeight - 2, buttonWidth, 2);
        Renderer.drawRect(borderColor, buttonX, buttonY, 2, buttonHeight);
        Renderer.drawRect(borderColor, buttonX + buttonWidth - 2, buttonY, 2, buttonHeight);
        const text = "§fShow Fades";
        const textWidth = Renderer.getStringWidth(text);
        const textX = buttonX + (buttonWidth - textWidth) / 2;
        
        Renderer.drawStringWithShadow(text, textX, buttonY + 6);
    }
}
