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
                const storedPattern = "" + piece.specialPattern;
                
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
            
        } catch (e) {
            ChatLib.chat("§c[Pattern Matches] Error loading: " + e);
        }
        
        const self = this;
        this.gui = new Gui();
        
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
                    self.close();
                    ChatLib.command("seymour db", true);
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
        Renderer.drawStringWithShadow("§l§7Pattern Type", 20, headerY);
        Renderer.drawStringWithShadow("§l§7Description", 180, headerY);
        Renderer.drawStringWithShadow("§l§7Piece Name", 370, headerY);
        Renderer.drawStringWithShadow("§l§7Hex", 580, headerY);
        
        // Separator
        Renderer.drawRect(Renderer.color(100, 100, 100), 20, headerY + 12, width - 40, 1);
        
        // Build flat list - Helper function approach
        const flatRows = [];
        
        const createRow = function(patternObj, pieceObj, isFirst) {
            const row = {};
            row.patternType = "" + patternObj.type;
            row.pieceName = "" + pieceObj.name;
            row.pieceHex = "" + pieceObj.hex;
            row.pieceUuid = "" + pieceObj.uuid;
            row.isFirstPieceOfPattern = isFirst;
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
        
        // Draw rows
        const startY = headerY + 20;
        const rowHeight = 20;
        const maxVisible = Math.floor((height - startY - 40) / rowHeight);
        
        const startIndex = this.scrollOffset;
        const endIndex = Math.min(startIndex + maxVisible, flatRows.length);
        
        let currentY = startY;
        const numToRender = endIndex - startIndex;
        
        // Manual unroll (30 rows max)
        if (numToRender > 0) {
            this.drawRow(flatRows[startIndex + 0], currentY, width);
            currentY = currentY + rowHeight;
        }
        if (numToRender > 1) {
            this.drawRow(flatRows[startIndex + 1], currentY, width);
            currentY = currentY + rowHeight;
        }
        if (numToRender > 2) {
            this.drawRow(flatRows[startIndex + 2], currentY, width);
            currentY = currentY + rowHeight;
        }
        if (numToRender > 3) {
            this.drawRow(flatRows[startIndex + 3], currentY, width);
            currentY = currentY + rowHeight;
        }
        if (numToRender > 4) {
            this.drawRow(flatRows[startIndex + 4], currentY, width);
            currentY = currentY + rowHeight;
        }
        if (numToRender > 5) {
            this.drawRow(flatRows[startIndex + 5], currentY, width);
            currentY = currentY + rowHeight;
        }
        if (numToRender > 6) {
            this.drawRow(flatRows[startIndex + 6], currentY, width);
            currentY = currentY + rowHeight;
        }
        if (numToRender > 7) {
            this.drawRow(flatRows[startIndex + 7], currentY, width);
            currentY = currentY + rowHeight;
        }
        if (numToRender > 8) {
            this.drawRow(flatRows[startIndex + 8], currentY, width);
            currentY = currentY + rowHeight;
        }
        if (numToRender > 9) {
            this.drawRow(flatRows[startIndex + 9], currentY, width);
            currentY = currentY + rowHeight;
        }
        if (numToRender > 10) {
            this.drawRow(flatRows[startIndex + 10], currentY, width);
            currentY = currentY + rowHeight;
        }
        if (numToRender > 11) {
            this.drawRow(flatRows[startIndex + 11], currentY, width);
            currentY = currentY + rowHeight;
        }
        if (numToRender > 12) {
            this.drawRow(flatRows[startIndex + 12], currentY, width);
            currentY = currentY + rowHeight;
        }
        if (numToRender > 13) {
            this.drawRow(flatRows[startIndex + 13], currentY, width);
            currentY = currentY + rowHeight;
        }
        if (numToRender > 14) {
            this.drawRow(flatRows[startIndex + 14], currentY, width);
            currentY = currentY + rowHeight;
        }
        if (numToRender > 15) {
            this.drawRow(flatRows[startIndex + 15], currentY, width);
            currentY = currentY + rowHeight;
        }
        if (numToRender > 16) {
            this.drawRow(flatRows[startIndex + 16], currentY, width);
            currentY = currentY + rowHeight;
        }
        if (numToRender > 17) {
            this.drawRow(flatRows[startIndex + 17], currentY, width);
            currentY = currentY + rowHeight;
        }
        if (numToRender > 18) {
            this.drawRow(flatRows[startIndex + 18], currentY, width);
            currentY = currentY + rowHeight;
        }
        if (numToRender > 19) {
            this.drawRow(flatRows[startIndex + 19], currentY, width);
            currentY = currentY + rowHeight;
        }
        if (numToRender > 20) {
            this.drawRow(flatRows[startIndex + 20], currentY, width);
            currentY = currentY + rowHeight;
        }
        if (numToRender > 21) {
            this.drawRow(flatRows[startIndex + 21], currentY, width);
            currentY = currentY + rowHeight;
        }
        if (numToRender > 22) {
            this.drawRow(flatRows[startIndex + 22], currentY, width);
            currentY = currentY + rowHeight;
        }
        if (numToRender > 23) {
            this.drawRow(flatRows[startIndex + 23], currentY, width);
            currentY = currentY + rowHeight;
        }
        if (numToRender > 24) {
            this.drawRow(flatRows[startIndex + 24], currentY, width);
            currentY = currentY + rowHeight;
        }
        if (numToRender > 25) {
            this.drawRow(flatRows[startIndex + 25], currentY, width);
            currentY = currentY + rowHeight;
        }
        if (numToRender > 26) {
            this.drawRow(flatRows[startIndex + 26], currentY, width);
            currentY = currentY + rowHeight;
        }
        if (numToRender > 27) {
            this.drawRow(flatRows[startIndex + 27], currentY, width);
            currentY = currentY + rowHeight;
        }
        if (numToRender > 28) {
            this.drawRow(flatRows[startIndex + 28], currentY, width);
            currentY = currentY + rowHeight;
        }
        if (numToRender > 29) {
            this.drawRow(flatRows[startIndex + 29], currentY, width);
            currentY = currentY + rowHeight;
        }
        
        // Draw context menu
        this.drawContextMenu();
        
        // Footer
        Renderer.drawStringWithShadow("§7Showing " + (startIndex + 1) + "-" + endIndex + " of " + flatRows.length, width / 2 - 80, height - 25);
        Renderer.drawStringWithShadow("§7Press §eESC §7to go back", width / 2 - 70, height - 10);
    }

    drawRow(row, y, screenWidth) {
        // Only show pattern type and description on first piece of each pattern
        if (row.isFirstPieceOfPattern) {
            let patternName = "UNKNOWN";
            if (row.patternType === "paired") patternName = "PAIRED";
            else if (row.patternType === "repeating") patternName = "REPEATING";
            else if (row.patternType === "palindrome") patternName = "PALINDROME";
            
            Renderer.drawStringWithShadow("§5§l" + patternName, 20, y + 4);
            
            // Description
            let desc = "";
            if (row.patternType === "paired") desc = "AABBCC";
            else if (row.patternType === "repeating") desc = "ABCABC";
            else if (row.patternType === "palindrome") desc = "ABCCBA";
            
            Renderer.drawStringWithShadow("§f" + desc, 180, y + 4);
        } else {
            // Draw continuation indicator
            Renderer.drawStringWithShadow("§8└─", 20, y + 4);
        }
        
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

    handleRightClick(mouseX, mouseY) {
        const headerY = 50;
        const startY = headerY + 20;
        const rowHeight = 20;
        
        // Build flat rows using the same helper function
        const flatRows = [];
        const createRow = function(patternObj, pieceObj, isFirst) {
            const row = {};
            row.patternType = "" + patternObj.type;
            row.pieceName = "" + pieceObj.name;
            row.pieceHex = "" + pieceObj.hex;
            row.pieceUuid = "" + pieceObj.uuid;
            row.isFirstPieceOfPattern = isFirst;
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