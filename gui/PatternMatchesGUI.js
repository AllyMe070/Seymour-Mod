/// <reference types="../CTAutocomplete" />
/// <reference lib="es2015" />

import PogObject from "PogData";

export class PatternMatchesGUI {
    constructor() {
        this.collection = new PogObject("SeymourAnalyzer", {}, "Collection.json");
        this.scrollOffset = 0;
        this.isOpen = false;
        this.patternMatches = [];
        this.gui = null;
        this.contextMenu = null;
        this.sortColumn = null;
        this.sortDirection = "asc";
        this.cachedPatternCounts = null;
        this.isSwitchingGui = false;
    }

    open() {
        this.isOpen = true;
        this.scrollOffset = 0;
        
        // Build pattern matches from collection
        this.patternMatches = [];
        
        try {
            const collectionKeys = Object.keys(this.collection);
            
            let loadIndex = 0;
            while (loadIndex < collectionKeys.length) {
                const uuid = collectionKeys[loadIndex];
                const piece = this.collection[uuid];
                
                if (!piece || typeof piece !== 'object') {
                    loadIndex = loadIndex + 1;
                    continue;
                }
                if (!piece.pieceName || !piece.hexcode || !piece.specialPattern) {
                    loadIndex = loadIndex + 1;
                    continue;
                }
                
                // Store values in SEPARATE variables first
                const storedUuid = "" + uuid;
                const storedPieceName = "" + piece.pieceName;
                const storedHexcode = ("" + piece.hexcode).toUpperCase();
                // Normalize specialPattern: accept strings or objects.
                let storedPattern = "";
                if (piece.specialPattern && typeof piece.specialPattern === 'object') {
                    // Try common property names that might hold the pattern identifier
                    storedPattern = piece.specialPattern.type || piece.specialPattern.name || piece.specialPattern.pattern || JSON.stringify(piece.specialPattern);
                } else {
                    storedPattern = "" + piece.specialPattern;
                }
                // Normalize to lower-case for consistent comparisons later
                storedPattern = ("" + storedPattern).toLowerCase();
                
                // If it's an AxBxCx pattern, make it more specific based on the hex code
                if (storedPattern.indexOf("axbxcx") === 0 || storedPattern === "axbxcx") {
                    const hexUpper = storedHexcode.toUpperCase();
                    if (hexUpper.length === 6) {
                        const char0 = hexUpper.charAt(0);
                        const char2 = hexUpper.charAt(2);
                        const char4 = hexUpper.charAt(4);
                        
                        // Check if positions 0, 2, 4 are the same
                        if (char0 === char2 && char2 === char4) {
                            // Make the pattern specific: "axbxcx_6" for 6x6x6x
                            storedPattern = "axbxcx_" + char0.toLowerCase();
                        } else {
                            // Not a repeating pattern, keep as generic axbxcx
                            storedPattern = "axbxcx";
                        }
                    }
                }
                
                // Check if this pattern already exists in patternMatches array
                let existingPatternIndex = -1;
                let checkIdx = 0;
                while (checkIdx < this.patternMatches.length) {
                    if (this.patternMatches[checkIdx].type === storedPattern) {
                        existingPatternIndex = checkIdx;
                        break;
                    }
                    checkIdx = checkIdx + 1;
                }
                
                // Create piece object using stored variables
                const newPiece = {};
                newPiece.name = storedPieceName;
                newPiece.hex = storedHexcode;
                newPiece.uuid = storedUuid;
                
                // If pattern doesn't exist, create it
                if (existingPatternIndex === -1) {
                    const newPatternEntry = {};
                    // store normalized type (lower-case string)
                    newPatternEntry.type = storedPattern;
                    newPatternEntry.pieces = [];
                    newPatternEntry.pieces.push(newPiece);
                    
                    this.patternMatches.push(newPatternEntry);
                } else {
                    // Pattern exists, add piece to it
                    this.patternMatches[existingPatternIndex].pieces.push(newPiece);
                }
                
                loadIndex = loadIndex + 1;
            }
            
            ChatLib.chat("§a[Pattern Matches] §7Found §e" + this.patternMatches.length + " §7pattern types with matches");
            
            // Calculate pattern counts - access array directly by index
            this.cachedPatternCounts = {};
            
            // Populate cachedPatternCounts from patternMatches
            let pmIdx = 0;
            while (pmIdx < this.patternMatches.length) {
                const pm = this.patternMatches[pmIdx];
                if (pm && pm.type) {
                    this.cachedPatternCounts[pm.type] = pm.pieces ? pm.pieces.length : 0;
                }
                pmIdx = pmIdx + 1;
            }
            // Pre-sort patterns for display
            this.sortedAxBxCx = [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];
            this.sortedPaired = null;
            this.sortedRepeating = null;
            this.sortedPalindrome = null;
            
            const allPatternTypes = Object.keys(this.cachedPatternCounts);
            let sortIdx = 0;
            while (sortIdx < allPatternTypes.length) {
                const pType = "" + allPatternTypes[sortIdx];
                
                if (pType === "paired") {
                    this.sortedPaired = pType;
                } else if (pType === "repeating") {
                    this.sortedRepeating = pType;
                } else if (pType === "palindrome") {
                    this.sortedPalindrome = pType;
                } else if (pType.indexOf("axbxcx_") === 0 && pType.length >= 8) {
                    // Map hex character (0-f) to index 0-15 and assign directly
                    const hexChar = pType.charAt(7).toLowerCase();
                    const idx = parseInt(hexChar, 16);
                    if (!isNaN(idx) && idx >= 0 && idx < 16) {
                        this.sortedAxBxCx[idx] = pType;
                    }
                }
                
                sortIdx = sortIdx + 1;
            }
            
            // Set default sort to pattern type A-Z
            this.sortColumn = "pattern";
            this.sortDirection = "asc";
            
        } catch (e) {
            ChatLib.chat("§c[Pattern Matches] Error loading: " + e);
        }
        
        // Store the original GUI scale
        const mc = Client.getMinecraft();
        this.originalGuiScale = mc.field_71474_y.field_74335_Z;
        
        const self = this;
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
            if (self.originalGuiScale !== undefined) {
                mc.field_71474_y.field_74335_Z = self.originalGuiScale;
                mc.func_71373_a(new (Java.type("net.minecraft.client.gui.ScaledResolution"))(mc));
            }
        });
        
        this.gui.registerDraw(() => {
            if (self.isOpen) {
                self.drawScreen();
            }
        });
        
        this.gui.registerKeyTyped((char, keyCode) => {
            if (keyCode === 1) { // ESC
                self.close();
            }
        });
        
        this.gui.registerScrolled((x, y, direction) => {
            // Build flat rows to calculate max scroll
            let totalRows = 0;
            let scrollIdx = 0;
            while (scrollIdx < self.patternMatches.length) {
                totalRows += self.patternMatches[scrollIdx].pieces.length;
                scrollIdx = scrollIdx + 1;
            }
            
            const height = Renderer.screen.getHeight();
            const maxVisible = Math.floor((height - 110) / 20);
            const maxScroll = Math.max(0, totalRows - maxVisible);
            
            if (direction === 1) {
                self.scrollOffset = Math.max(0, self.scrollOffset - 1);
            } else {
                self.scrollOffset = Math.min(maxScroll, self.scrollOffset + 1);
            }
        });
        
        this.gui.registerClicked((mouseX, mouseY, button) => {
            const Mouse = Java.type("org.lwjgl.input.Mouse");
            const mc = Client.getMinecraft();
            const scaledRes = new (Java.type("net.minecraft.client.gui.ScaledResolution"))(mc);
            const scale = scaledRes.func_78325_e();
            const actualMouseX = Mouse.getX() / scale;
            const actualMouseY = (mc.field_71440_d - Mouse.getY()) / scale;
            
            // Check for RIGHT CLICK
            if (button === 1) {
                self.handleRightClick(actualMouseX, actualMouseY);
                return;
            }
            
            // Check for LEFT CLICK
            if (button === 0) {
                // Check context menu first
                if (self.contextMenu) {
                    self.handleContextMenuClick(actualMouseX, actualMouseY);
                    return;
                }
                
                // Check back button
                const backButtonWidth = 150;
                const backButtonX = 20;
                const backButtonY = 10;
                
                if (actualMouseX >= backButtonX && actualMouseX <= backButtonX + backButtonWidth &&
                    actualMouseY >= backButtonY && actualMouseY <= backButtonY + 20) {
                    self.isSwitchingGui = true;
                    self.close();
                    ChatLib.command("seymour db", true);
                    return;
                }
            }
            // Check header clicks for sorting
            const headerY = 50;
            if (actualMouseY >= headerY && actualMouseY <= headerY + 12) {
                let clickedColumn = null;
                
                if (actualMouseX >= 20 && actualMouseX <= 180) {
                    clickedColumn = "pattern";
                } else if (actualMouseX >= 180 && actualMouseX <= 370) {
                    clickedColumn = "description";
                } else if (actualMouseX >= 370 && actualMouseX <= 580) {
                    clickedColumn = "name";
                } else if (actualMouseX >= 580 && actualMouseX <= 665) {
                    clickedColumn = "hex";
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
        });
        
        this.gui.open();
    }

    close() {
        this.isOpen = false;
        this.patternMatches = [];
        this.scrollOffset = 0;
        Client.currentGui.close();

        // Restore GUI scale AFTER closing (so it happens after registerClosed)
        const mc = Client.getMinecraft();
        if (this.originalGuiScale !== undefined && !this.isSwitchingGui) {
            mc.field_71474_y.field_74335_Z = this.originalGuiScale;
            mc.func_71373_a(new (Java.type("net.minecraft.client.gui.ScaledResolution"))(mc));
        }
    }

    drawScreen() {
        const width = Renderer.screen.getWidth();
        const height = Renderer.screen.getHeight();
        
        Renderer.drawRect(Renderer.color(20, 20, 20, 180), 0, 0, width, height);
        
        // Title
        const title = "§l§nPattern Matches";
        const titleWidth = Renderer.getStringWidth(title);
        Renderer.drawStringWithShadow(title, width / 2 - titleWidth / 2, 10);
        
        // Back button
        this.drawBackButton(width, 10);
        // Draw pattern counter
        this.drawPatternCounter(width, height);
        
        // Count total pieces
        let totalPieces = 0;
        let countIdx = 0;
        while (countIdx < this.patternMatches.length) {
            totalPieces += this.patternMatches[countIdx].pieces.length;
            countIdx = countIdx + 1;
        }
        
        // Info
        const info = "§7Total: §e" + this.patternMatches.length + " §7pattern types | §e" + totalPieces + " §7pieces | Scroll: §e" + this.scrollOffset;
        const infoWidth = Renderer.getStringWidth(info);
        Renderer.drawStringWithShadow(info, width / 2 - infoWidth / 2, 30);
        
        if (this.patternMatches.length === 0) {
            Renderer.drawStringWithShadow("§7No pattern matches found!", width / 2 - 90, height / 2);
            Renderer.drawStringWithShadow("§7Press §eESC §7to go back", width / 2 - 70, height - 10);
            return;
        }
        
        // Headers
        const headerY = 50;
        const patternArrow = this.sortColumn === "pattern" ? (this.sortDirection === "asc" ? " §e↓" : " §e↑") : "";
        const descArrow = this.sortColumn === "description" ? (this.sortDirection === "asc" ? " §e↓" : " §e↑") : "";
        const nameArrow = this.sortColumn === "name" ? (this.sortDirection === "asc" ? " §e↓" : " §e↑") : "";
        const hexArrow = this.sortColumn === "hex" ? (this.sortDirection === "asc" ? " §e↓" : " §e↑") : "";
        
        Renderer.drawStringWithShadow("§l§7Pattern Type" + patternArrow, 20, headerY);
        Renderer.drawStringWithShadow("§l§7Description" + descArrow, 180, headerY);
        Renderer.drawStringWithShadow("§l§7Piece Name" + nameArrow, 370, headerY);
        Renderer.drawStringWithShadow("§l§7Hex" + hexArrow, 580, headerY);
        
        // Separator
        Renderer.drawRect(Renderer.color(100, 100, 100), 20, headerY + 12, width - 40, 1);
        
        // Build flat list - Helper function approach
        const flatRows = [];
        
        const createRow = function(patternObj, pieceObj, isFirst) {
            const row = {};
            row.patternType = (patternObj && patternObj.type) ? ("" + patternObj.type).toLowerCase() : "";
            row.pieceName = "" + pieceObj.name;
            row.pieceHex = "" + pieceObj.hex;
            row.pieceUuid = "" + pieceObj.uuid;
            row.isFirstPieceOfPattern = isFirst;
            
            // Calculate description from hex code
            const hexCode = row.pieceHex.replace("#", "").toUpperCase();
            if (row.patternType.indexOf("axbxcx") === 0 && hexCode.length === 6) {
                const char0 = hexCode.charAt(0);
                const char2 = hexCode.charAt(2);
                const char4 = hexCode.charAt(4);
                if (char0 === char2 && char2 === char4) {
                    row.description = char0 + "x" + char0 + "x" + char0 + "x";
                } else {
                    row.description = "AxBxCx";
                }
            } else if (row.patternType === "paired") {
                row.description = "AABBCC";
            } else if (row.patternType === "repeating") {
                row.description = "ABCABC";
            } else if (row.patternType === "palindrome") {
                row.description = "ABCCBA";
            } else {
                row.description = "";
            }
            
            return row;
        };
        
        let patternIdx = 0;
        while (patternIdx < this.patternMatches.length) {
            const pattern = this.patternMatches[patternIdx];
            
            let pieceIdx = 0;
            while (pieceIdx < pattern.pieces.length) {
                const piece = pattern.pieces[pieceIdx];
                flatRows.push(createRow(pattern, piece, pieceIdx === 0));
                pieceIdx = pieceIdx + 1;
            }
            
            patternIdx = patternIdx + 1;
        }
        
        // Sort flatRows if needed
        if (this.sortColumn) {
            const self = this;
            flatRows.sort(function(a, b) {
                let comparison = 0;
                
                if (self.sortColumn === "pattern") {
                    const aPattern = a.patternType.toLowerCase();
                    const bPattern = b.patternType.toLowerCase();
                    comparison = aPattern < bPattern ? -1 : (aPattern > bPattern ? 1 : 0);
                } else if (self.sortColumn === "description") {
                    const aDesc = a.description.toLowerCase();
                    const bDesc = b.description.toLowerCase();
                    comparison = aDesc < bDesc ? -1 : (aDesc > bDesc ? 1 : 0);
                } else if (self.sortColumn === "name") {
                    const aName = a.pieceName.toLowerCase();
                    const bName = b.pieceName.toLowerCase();
                    comparison = aName < bName ? -1 : (aName > bName ? 1 : 0);
                } else if (self.sortColumn === "hex") {
                    const aHex = a.pieceHex.toLowerCase();
                    const bHex = b.pieceHex.toLowerCase();
                    comparison = aHex < bHex ? -1 : (aHex > bHex ? 1 : 0);
                }
                
                return self.sortDirection === "asc" ? comparison : -comparison;
            });
        }
        
        // Draw rows
        const startY = headerY + 20;
        const rowHeight = 20;
        const maxVisible = Math.floor((height - startY - 40) / rowHeight);
        
        const startIndex = this.scrollOffset;
        const endIndex = Math.min(startIndex + maxVisible, flatRows.length);
        
        let currentY = startY;
        const numToRender = endIndex - startIndex;

        // Draw rows (cap at 30 rows max)
        const maxRowsToRender = Math.min(numToRender, 30);
        for (let i = 0; i < maxRowsToRender; i++) {
            this.drawRow(flatRows[startIndex + i], currentY, width);
            currentY = currentY + rowHeight;
        }
        
        // Draw context menu
        this.drawContextMenu();
        
        // Footer
        Renderer.drawStringWithShadow("§7Showing " + (startIndex + 1) + "-" + endIndex + " of " + flatRows.length, width / 2 - 80, height - 25);
        Renderer.drawStringWithShadow("§7Press §eESC §7to go back", width / 2 - 70, height - 10);
    }

    drawRow(row, y, screenWidth) {
        // Always show pattern type and description (removed the isFirstPieceOfPattern check)
        let patternName = "UNKNOWN";
        const pType = (row.patternType || "").toLowerCase();
        
        if (pType === "paired") {
            patternName = "PAIRED";
        } else if (pType === "repeating") {
            patternName = "REPEATING";
        } else if (pType === "palindrome") {
            patternName = "PALINDROME";
        } else if (pType.indexOf("axbxcx") === 0) {
            patternName = "AxBxCx";
        }
        
        Renderer.drawStringWithShadow("§5§l" + patternName, 20, y + 4);
        Renderer.drawStringWithShadow("§f" + row.description, 180, y + 4);
        
        // Piece name
        let displayName = row.pieceName;
        if (displayName.length > 30) {
            displayName = displayName.substring(0, 30) + "...";
        }
        Renderer.drawStringWithShadow("§7" + displayName, 370, y + 4);
        
        // Hex box
        const rgb = this.hexToRgb(row.pieceHex);
        Renderer.drawRect(Renderer.color(rgb.r, rgb.g, rgb.b), 580, y, 85, 16);
        
        // Use shadow for white text on dark colors, draw black text for light colors
        if (this.isColorDark(row.pieceHex)) {
            Renderer.drawStringWithShadow("§f" + row.pieceHex, 582, y + 4);
        } else {
            Renderer.drawString("§0" + row.pieceHex, 582, y + 4);
            Renderer.drawString("§0" + row.pieceHex, 582.5, y + 4.5);
        }
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

    drawBackButton(screenWidth, yPos) {
        const buttonWidth = 150;
        const buttonHeight = 20;
        const buttonX = 20;
        
        const Mouse = Java.type("org.lwjgl.input.Mouse");
        const mc = Client.getMinecraft();
        const scaledRes = new (Java.type("net.minecraft.client.gui.ScaledResolution"))(mc);
        const scale = scaledRes.func_78325_e();
        const mouseX = Mouse.getX() / scale;
        const mouseY = (mc.field_71440_d - Mouse.getY()) / scale;
        
        const isHovered = mouseX >= buttonX && mouseX <= buttonX + buttonWidth &&
                          mouseY >= yPos && mouseY <= yPos + buttonHeight;
        
        const bgColor = Renderer.color(40, 80, 120, 200);
        const hoverColor = Renderer.color(60, 100, 140, 220);
        
        Renderer.drawRect(isHovered ? hoverColor : bgColor, buttonX, yPos, buttonWidth, buttonHeight);
        
        const borderColor = Renderer.color(100, 150, 200, 255);
        Renderer.drawRect(borderColor, buttonX, yPos, buttonWidth, 2);
        Renderer.drawRect(borderColor, buttonX, yPos + buttonHeight - 2, buttonWidth, 2);
        Renderer.drawRect(borderColor, buttonX, yPos, 2, buttonHeight);
        Renderer.drawRect(borderColor, buttonX + buttonWidth - 2, yPos, 2, buttonHeight);
        
        const text = "§f← Back to Database";
        const textWidth = Renderer.getStringWidth(text);
        const textX = buttonX + (buttonWidth - textWidth) / 2;
        
        Renderer.drawStringWithShadow(text, textX, yPos + 6);
    }

    drawPatternCounter(screenWidth, screenHeight) {
        if (!this.cachedPatternCounts) {
            return;
        }
        
        const boxWidth = 150;
        const boxX = screenWidth - boxWidth - 20;
        const boxY = 70;
        
        // Count total rows
        let totalRows = 0;
        if (this.sortedAxBxCx && this.sortedAxBxCx.length) {
            for (let i = 0; i < this.sortedAxBxCx.length; i++) {
                if (this.sortedAxBxCx[i]) totalRows = totalRows + 1;
            }
        }
        if (this.sortedPaired) totalRows = totalRows + 1;
        if (this.sortedRepeating) totalRows = totalRows + 1;
        if (this.sortedPalindrome) totalRows = totalRows + 1;
        
        const rowHeight = 12;
        const boxHeight = (totalRows * rowHeight) + 20;
        
        // Background
        Renderer.drawRect(Renderer.color(40, 40, 40, 200), boxX, boxY, boxWidth, boxHeight);
        
        // Border
        const borderColor = Renderer.color(100, 100, 100, 200);
        Renderer.drawRect(borderColor, boxX, boxY, boxWidth, 2);
        Renderer.drawRect(borderColor, boxX, boxY + boxHeight - 2, boxWidth, 2);
        Renderer.drawRect(borderColor, boxX, boxY, 2, boxHeight);
        Renderer.drawRect(borderColor, boxX + boxWidth - 2, boxY, 2, boxHeight);
        
        // Title
        Renderer.drawStringWithShadow("§l§7Pattern Counts", boxX + 5, boxY + 5);
        
        let currentY = boxY + 18;
        
        // Helper to draw pattern with color box
        const self = this;
        const drawPatternRow = function(patternType, label, count, x, y) {
            if (patternType.indexOf("axbxcx_") === 0) {
                const char = patternType.charAt(7);
                const hex = char + char + char + char + char + char;
                const rgb = self.hexToRgb(hex);
                
                // Draw colored box
                Renderer.drawRect(Renderer.color(rgb.r, rgb.g, rgb.b), x, y, 45, 10);
                
                // Determine if we need white or black text based on brightness
                const brightness = (rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114) / 255;
                const textColor = brightness > 0.5 ? "§0" : "§f";
                
                // Draw label on the colored box
                Renderer.drawString(textColor + label + ":", x + 2, y + 1);
                
                // Draw count in white after the box
                Renderer.drawStringWithShadow("§f" + count, x + 50, y + 1);
            } else {
                Renderer.drawStringWithShadow("§5" + label + ": §f" + count, x, y);
            }
        };
        
        // Draw in order 0-F with colored backgrounds
        if (this.sortedAxBxCx && this.sortedAxBxCx.length) {
            for (let i = 0; i < this.sortedAxBxCx.length; i++) {
                const pType = this.sortedAxBxCx[i];
                if (pType) {
                    drawPatternRow(pType, this.getPatternLabel(pType), this.cachedPatternCounts[pType], boxX + 10, currentY);
                    currentY = currentY + rowHeight;
                }
            }
        }
        
        // Then paired, repeating, palindrome (purple text, no box)
        if (this.sortedPaired) {
            Renderer.drawStringWithShadow("§5Paired: §f" + this.cachedPatternCounts[this.sortedPaired], boxX + 10, currentY);
            currentY = currentY + rowHeight;
        }
        if (this.sortedRepeating) {
            Renderer.drawStringWithShadow("§5Repeating: §f" + this.cachedPatternCounts[this.sortedRepeating], boxX + 10, currentY);
            currentY = currentY + rowHeight;
        }
        if (this.sortedPalindrome) {
            Renderer.drawStringWithShadow("§5Palindrome: §f" + this.cachedPatternCounts[this.sortedPalindrome], boxX + 10, currentY);
            currentY = currentY + rowHeight;
        }
    }
    
    getPatternLabel(patternType) {
        const pType = ("" + patternType).toLowerCase();
        
        if (pType === "paired") return "Paired";
        if (pType === "repeating") return "Repeating";
        if (pType === "palindrome") return "Palindrome";
        
        if (pType.indexOf("axbxcx_") === 0) {
            const char = pType.charAt(7).toUpperCase();
            return char + "x" + char + "x" + char + "x";
        }
        
        if (pType === "axbxcx") return "AxBxCx";
        
        return "Unknown";
    }

    handleRightClick(mouseX, mouseY) {
        const headerY = 50;
        const startY = headerY + 20;
        const rowHeight = 20;
        
        // Build flat rows using the same helper function
        const flatRows = [];
        const createRow = function(patternObj, pieceObj, isFirst) {
            const row = {};
            row.patternType = (patternObj && patternObj.type) ? ("" + patternObj.type).toLowerCase() : "";
            row.pieceName = "" + pieceObj.name;
            row.pieceHex = "" + pieceObj.hex;
            row.pieceUuid = "" + pieceObj.uuid;
            row.isFirstPieceOfPattern = isFirst;
            
            // Calculate description from hex code
            const hexCode = row.pieceHex.replace("#", "").toUpperCase();
            if (row.patternType.indexOf("axbxcx") === 0 && hexCode.length === 6) {
                const char0 = hexCode.charAt(0);
                const char2 = hexCode.charAt(2);
                const char4 = hexCode.charAt(4);
                if (char0 === char2 && char2 === char4) {
                    row.description = char0 + "x" + char0 + "x" + char0 + "x";
                } else {
                    row.description = "AxBxCx";
                }
            } else if (row.patternType === "paired") {
                row.description = "AABBCC";
            } else if (row.patternType === "repeating") {
                row.description = "ABCABC";
            } else if (row.patternType === "palindrome") {
                row.description = "ABCCBA";
            } else {
                row.description = "";
            }
            
            return row;
        };
        
        let patternIdx = 0;
        while (patternIdx < this.patternMatches.length) {
            const pattern = this.patternMatches[patternIdx];
            let pieceIdx = 0;
            while (pieceIdx < pattern.pieces.length) {
                const piece = pattern.pieces[pieceIdx];
                flatRows.push(createRow(pattern, piece, pieceIdx === 0));
                pieceIdx = pieceIdx + 1;
            }
            patternIdx = patternIdx + 1;
        }
        
        // Calculate which row was clicked
        const relativeY = mouseY - startY;
        const rowIndex = Math.floor(relativeY / rowHeight);
        const actualIndex = this.scrollOffset + rowIndex;
        
        if (actualIndex >= 0 && actualIndex < flatRows.length) {
            const row = flatRows[actualIndex];
            this.showContextMenu(row, mouseX, mouseY);
        }
    }

    showContextMenu(row, x, y) {
        const options = [];
        
        const option1 = {};
        option1.label = "Find in Database";
        option1.action = "database";
        option1.hex = row.pieceHex;
        options[0] = option1;
        
        this.contextMenu = {};
        this.contextMenu.row = row;
        this.contextMenu.x = x;
        this.contextMenu.y = y;
        this.contextMenu.width = 120;
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
        
        // Draw option
        if (menu.options.length > 0) {
            const option0 = menu.options[0];
            const optionY0 = menu.y + (0 * optionHeight);
            
            // Highlight on hover
            const Mouse = Java.type("org.lwjgl.input.Mouse");
            const mc = Client.getMinecraft();
            const scaledRes = new (Java.type("net.minecraft.client.gui.ScaledResolution"))(mc);
            const scale = scaledRes.func_78325_e();
            const mouseX = Mouse.getX() / scale;
            const mouseY = (mc.field_71440_d - Mouse.getY()) / scale;
            
            if (mouseX >= menu.x && mouseX <= menu.x + menu.width &&
                mouseY >= optionY0 && mouseY < optionY0 + optionHeight) {
                Renderer.drawRect(Renderer.color(80, 80, 80, 200), menu.x, optionY0, menu.width, optionHeight);
            }
            
            Renderer.drawStringWithShadow("§f" + option0.label, menu.x + 5, optionY0 + 6);
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
        
        // Check which option was clicked
        if (menu.options.length > 0) {
            const optionY0 = menu.y + (0 * optionHeight);
            
            if (mouseY >= optionY0 && mouseY < optionY0 + optionHeight) {
                const option = menu.options[0];
                
                if (option.action === "database") {
                    // Store the hex we want to search for
                    const searchHex = option.hex;
                    
                    // Pass the hex via global variable
                    global.pendingDatabaseHexSearch = searchHex;
                    
                    // Close current GUI
                    this.isSwitchingGui = true;
                    this.close();
                    
                    // Small delay then open database
                    setTimeout(() => {
                        ChatLib.command("seymour db", true);
                    }, 50);
                }
                
                this.contextMenu = null;
                return true;
            }
        }
        
        this.contextMenu = null;
        return false;
    }
}
