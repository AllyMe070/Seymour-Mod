/// <reference types="../CTAutocomplete" />
/// <reference lib="es2015" />

import PogObject from "PogData";

export class BestSetsGUI {
    constructor() {
        this.collection = global.collection;
        this.isOpen = false;
        this.gui = null;
        this.scrollOffset = 0;
        this.bestSets = [];
        this.isCalculating = false;
        this.calculationProgress = 0;
        this.contextMenu = null;
        this.clickableHexRegions = [];
        this.isSwitchingGui = false;
    }

    open() {
        this.isOpen = true;
        
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
        
        this.gui.registerScrolled((x, y, direction) => {
            const maxVisible = 5;
            const maxScroll = Math.max(0, self.bestSets.length - maxVisible);
            
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
            
            if (button === 1) {
                self.handleHexRightClick(actualMouseX, actualMouseY);
                return;
            }
            
            if (button === 0 && self.contextMenu) {
                self.handleContextMenuClick(actualMouseX, actualMouseY);
                return;
            }
            
            if (button !== 0) return;
            
            const width = Renderer.screen.getWidth();
            
            const calcButtonX = width / 2 - 75;
            const calcButtonY = 40;
            const calcButtonWidth = 150;
            const calcButtonHeight = 25;
            
            if (actualMouseX >= calcButtonX && actualMouseX <= calcButtonX + calcButtonWidth &&
                actualMouseY >= calcButtonY && actualMouseY <= calcButtonY + calcButtonHeight) {
                if (!self.isCalculating) {
                    self.calculateBestSets();
                }
            }
        });
        
        this.gui.open();
        ChatLib.chat("§a[Best Sets] §7GUI opened!");
    }

    close() {
        const mc = Client.getMinecraft();
        if (this.originalGuiScale !== undefined && !this.isSwitchingGui) {
            mc.field_71474_y.field_74335_Z = this.originalGuiScale;
            mc.func_71373_a(new (Java.type("net.minecraft.client.gui.ScaledResolution"))(mc));
        }
        
        this.isOpen = false;
        Client.currentGui.close();
    }

    calculateBestSets() {
        this.isCalculating = true;
        this.calculationProgress = 0;
        this.bestSets = [];
        
        ChatLib.chat("§a[Best Sets] §7Starting calculation...");
        
        const self = this;
        setTimeout(() => {
            self.performCalculation();
        }, 50);
    }

    performCalculation() {
        const startTime = Date.now();
        
        const helmets = [];
        const chestplates = [];
        const leggings = [];
        const boots = [];
        
        const keys = Object.keys(this.collection);
        
        const totalKeys = keys.length;
        let i = 0;
        while (i < keys.length) {
            this.calculationProgress = Math.floor((i / totalKeys) * 30);
            const uuid = keys[i];
            const piece = this.collection[uuid];
            
            if (piece && piece.hexcode && piece.pieceName) {
                const pieceType = this.getPieceType(piece.pieceName);
                
                const pieceData = {
                    uuid: uuid,
                    name: piece.pieceName,
                    hex: piece.hexcode.toUpperCase(),
                    lab: this.hexToLab(piece.hexcode)
                };
                
                if (pieceType === "helmet") helmets.push(pieceData);
                else if (pieceType === "chestplate") chestplates.push(pieceData);
                else if (pieceType === "leggings") leggings.push(pieceData);
                else if (pieceType === "boots") boots.push(pieceData);
            }
            
            i = i + 1;
        }
        
        ChatLib.chat("§a[Best Sets] §7Found: §e" + helmets.length + " §7helmets, §e" + chestplates.length + " §7chests, §e" + leggings.length + " §7legs, §e" + boots.length + " §7boots");
        
        const candidateSets = [];
        const MAX_DELTA = 5.0;
        const TARGET_SETS = 100;
        
        const usedHelmetUuids = {};
        const usedChestUuids = {};
        const usedLegsUuids = {};
        const usedBootsUuids = {};
        
        const totalHelmets = helmets.length;
        let h = 0;
        while (h < helmets.length && candidateSets.length < TARGET_SETS) {
            this.calculationProgress = 30 + Math.floor((h / totalHelmets) * 60);
            const helmet = helmets[h];
            
            if (usedHelmetUuids[helmet.uuid]) {
                h = h + 1;
                continue;
            }
            
            let bestChest = null;
            let bestChestDelta = 999;
            
            let c = 0;
            while (c < chestplates.length) {
                const chest = chestplates[c];
                
                if (!usedChestUuids[chest.uuid]) {
                    const delta = this.calculateDeltaE(helmet.lab, chest.lab);
                    
                    if (delta <= MAX_DELTA && delta < bestChestDelta) {
                        bestChest = chest;
                        bestChestDelta = delta;
                    }
                }
                
                c = c + 1;
            }
            
            if (!bestChest) {
                h = h + 1;
                continue;
            }
            
            let bestLegs = null;
            let bestLegsDelta = 999;
            
            let l = 0;
            while (l < leggings.length) {
                const legs = leggings[l];
                
                if (!usedLegsUuids[legs.uuid]) {
                    const deltaToHelmet = this.calculateDeltaE(helmet.lab, legs.lab);
                    const deltaToChest = this.calculateDeltaE(bestChest.lab, legs.lab);
                    const avgDelta = (deltaToHelmet + deltaToChest) / 2;
                    
                    if (deltaToHelmet <= MAX_DELTA && deltaToChest <= MAX_DELTA && avgDelta < bestLegsDelta) {
                        bestLegs = legs;
                        bestLegsDelta = avgDelta;
                    }
                }
                
                l = l + 1;
            }
            
            if (!bestLegs) {
                h = h + 1;
                continue;
            }
            
            let bestBoots = null;
            let bestBootsDelta = 999;
            
            let b = 0;
            while (b < boots.length) {
                const boot = boots[b];
                
                if (!usedBootsUuids[boot.uuid]) {
                    const deltaToHelmet = this.calculateDeltaE(helmet.lab, boot.lab);
                    const deltaToChest = this.calculateDeltaE(bestChest.lab, boot.lab);
                    const deltaToLegs = this.calculateDeltaE(bestLegs.lab, boot.lab);
                    const avgDelta = (deltaToHelmet + deltaToChest + deltaToLegs) / 3;
                    
                    if (deltaToHelmet <= MAX_DELTA && deltaToChest <= MAX_DELTA && deltaToLegs <= MAX_DELTA && avgDelta < bestBootsDelta) {
                        bestBoots = boot;
                        bestBootsDelta = avgDelta;
                    }
                }
                
                b = b + 1;
            }
            
            if (bestBoots) {
                const setData = this.calculateSetStats(helmet, bestChest, bestLegs, bestBoots);
                
                if (setData.avgDelta <= MAX_DELTA) {
                    candidateSets.push(setData);
                    
                    usedHelmetUuids[helmet.uuid] = true;
                    usedChestUuids[bestChest.uuid] = true;
                    usedLegsUuids[bestLegs.uuid] = true;
                    usedBootsUuids[bestBoots.uuid] = true;
                }
            }
            
            h = h + 1;
        }

        this.calculationProgress = 95;
        candidateSets.sort(function(a, b) {
            return a.avgDelta - b.avgDelta;
        });
        
        this.bestSets = candidateSets;
        
        const endTime = Date.now();
        const timeMs = endTime - startTime;
        
        ChatLib.chat("§a[Best Sets] §7Found §e" + this.bestSets.length + " §7unique sets in §e" + timeMs + "ms");
        
        this.isCalculating = false;
        this.calculationProgress = 100;
    }

    calculateSetStats(helmet, chest, legs, boots) {
        const deltas = [];
        
        deltas.push(this.calculateDeltaE(helmet.lab, chest.lab));
        deltas.push(this.calculateDeltaE(helmet.lab, legs.lab));
        deltas.push(this.calculateDeltaE(helmet.lab, boots.lab));
        deltas.push(this.calculateDeltaE(chest.lab, legs.lab));
        deltas.push(this.calculateDeltaE(chest.lab, boots.lab));
        deltas.push(this.calculateDeltaE(legs.lab, boots.lab));
        
        let deltaSum = 0;
        let d = 0;
        while (d < deltas.length) {
            deltaSum += deltas[d];
            d = d + 1;
        }
        const avgDelta = deltaSum / deltas.length;
        
        const pieceAvgs = [
            { type: "helmet", piece: helmet, avg: (deltas[0] + deltas[1] + deltas[2]) / 3 },
            { type: "chest", piece: chest, avg: (deltas[0] + deltas[3] + deltas[4]) / 3 },
            { type: "legs", piece: legs, avg: (deltas[1] + deltas[3] + deltas[5]) / 3 },
            { type: "boots", piece: boots, avg: (deltas[2] + deltas[4] + deltas[5]) / 3 }
        ];
        
        pieceAvgs.sort(function(a, b) {
            return b.avg - a.avg;
        });
        
        const without1 = [pieceAvgs[1], pieceAvgs[2], pieceAvgs[3]];
        const deltasWithout1 = [];
        deltasWithout1.push(this.calculateDeltaE(without1[0].piece.lab, without1[1].piece.lab));
        deltasWithout1.push(this.calculateDeltaE(without1[0].piece.lab, without1[2].piece.lab));
        deltasWithout1.push(this.calculateDeltaE(without1[1].piece.lab, without1[2].piece.lab));
        
        let sumWithout1 = 0;
        let w1 = 0;
        while (w1 < deltasWithout1.length) {
            sumWithout1 += deltasWithout1[w1];
            w1 = w1 + 1;
        }
        const avgWithout1 = sumWithout1 / deltasWithout1.length;
        
        const avgWithout2 = this.calculateDeltaE(pieceAvgs[2].piece.lab, pieceAvgs[3].piece.lab);
        
        return {
            helmet: helmet,
            chest: chest,
            legs: legs,
            boots: boots,
            avgDelta: avgDelta,
            avgWithout1: avgWithout1,
            avgWithout2: avgWithout2,
            worstPiece: pieceAvgs[0].type
        };
    }

    drawScreen() {
        
        const width = Renderer.screen.getWidth();
        const height = Renderer.screen.getHeight();
        
        Renderer.drawRect(Renderer.color(20, 20, 20, 180), 0, 0, width, height);
        
        const title = "§l§nBest Matching Sets";
        const titleWidth = Renderer.getStringWidth(title);
        Renderer.drawStringWithShadow(title, width / 2 - titleWidth / 2, 10);
        
        const calcButtonX = width / 2 - 75;
        const calcButtonY = 40;
        const calcButtonWidth = 150;
        const calcButtonHeight = 25;
        
        const Mouse = Java.type("org.lwjgl.input.Mouse");
        const mc = Client.getMinecraft();
        const scaledRes = new (Java.type("net.minecraft.client.gui.ScaledResolution"))(mc);
        const scale = scaledRes.func_78325_e();
        const mouseX = Mouse.getX() / scale;
        const mouseY = (mc.field_71440_d - Mouse.getY()) / scale;
        
        const isHovered = mouseX >= calcButtonX && mouseX <= calcButtonX + calcButtonWidth &&
                          mouseY >= calcButtonY && mouseY <= calcButtonY + calcButtonHeight;
        
        const buttonColor = this.isCalculating ? 
            Renderer.color(100, 100, 100, 200) : 
            (isHovered ? Renderer.color(0, 150, 0, 220) : Renderer.color(0, 100, 0, 200));
        
        Renderer.drawRect(buttonColor, calcButtonX, calcButtonY, calcButtonWidth, calcButtonHeight);
        
        const buttonText = this.isCalculating ? "§7Calculating..." : "§aCalculate Best Sets";
        const buttonTextWidth = Renderer.getStringWidth(buttonText);
        Renderer.drawStringWithShadow(buttonText, calcButtonX + (calcButtonWidth - buttonTextWidth) / 2, calcButtonY + 8);
        
        if (this.isCalculating && this.calculationProgress > 0) {
            const progressBarX = width / 2 - 100;
            const progressBarY = 70;
            const progressBarWidth = 200;
            const progressBarHeight = 8;
            
            Renderer.drawRect(Renderer.color(40, 40, 40, 200), progressBarX, progressBarY, progressBarWidth, progressBarHeight);
            
            const fillWidth = (progressBarWidth * this.calculationProgress) / 100;
            Renderer.drawRect(Renderer.color(0, 200, 0, 220), progressBarX, progressBarY, fillWidth, progressBarHeight);
            
            Renderer.drawRect(Renderer.color(255, 255, 255, 150), progressBarX - 1, progressBarY - 1, progressBarWidth + 2, 1);
            Renderer.drawRect(Renderer.color(255, 255, 255, 150), progressBarX - 1, progressBarY + progressBarHeight, progressBarWidth + 2, 1);
            Renderer.drawRect(Renderer.color(255, 255, 255, 150), progressBarX - 1, progressBarY, 1, progressBarHeight);
            Renderer.drawRect(Renderer.color(255, 255, 255, 150), progressBarX + progressBarWidth, progressBarY, 1, progressBarHeight);
            
            const percentText = "§e" + this.calculationProgress + "%";
            const percentWidth = Renderer.getStringWidth(percentText);
            Renderer.drawStringWithShadow(percentText, progressBarX + (progressBarWidth - percentWidth) / 2, progressBarY + 10);
        }
        
        // Draw sets
        if (this.bestSets.length === 0) {
            const line1 = "§7Click button to calculate best matching sets";
            const line1Width = Renderer.getStringWidth(line1);
            Renderer.drawStringWithShadow(line1, width / 2 - line1Width / 2, 100);
            
            const line2 = "§7This will find 4-piece sets with lowest color difference";
            const line2Width = Renderer.getStringWidth(line2);
            Renderer.drawStringWithShadow(line2, width / 2 - line2Width / 2, 115);
            
            const line3 = "§7Each piece is used only ONCE across all sets";
            const line3Width = Renderer.getStringWidth(line3);
            Renderer.drawStringWithShadow(line3, width / 2 - line3Width / 2, 130);
        } else {
            const startY = 90;
            const rowHeight = 80;
            
            Renderer.drawStringWithShadow("§7Top " + this.bestSets.length + " sets (ΔE ≤ 5.0) - Each piece used once", 20, startY - 10);
            
            const maxVisible = 5;
            const visibleSets = Math.min(this.bestSets.length - this.scrollOffset, maxVisible);
            
            if (visibleSets > 0) {
                const set = this.bestSets[this.scrollOffset + 0];
                const y = startY + (0 * rowHeight);
                this.drawSetRow(set, y, this.scrollOffset + 1);
            }
            if (visibleSets > 1) {
                const set = this.bestSets[this.scrollOffset + 1];
                const y = startY + (1 * rowHeight);
                this.drawSetRow(set, y, this.scrollOffset + 2);
            }
            if (visibleSets > 2) {
                const set = this.bestSets[this.scrollOffset + 2];
                const y = startY + (2 * rowHeight);
                this.drawSetRow(set, y, this.scrollOffset + 3);
            }
            if (visibleSets > 3) {
                const set = this.bestSets[this.scrollOffset + 3];
                const y = startY + (3 * rowHeight);
                this.drawSetRow(set, y, this.scrollOffset + 4);
            }
            if (visibleSets > 4) {
                const set = this.bestSets[this.scrollOffset + 4];
                const y = startY + (4 * rowHeight);
                this.drawSetRow(set, y, this.scrollOffset + 5);
            }
            
            if (this.bestSets.length > maxVisible) {
                const scrollText = "§7(" + (this.scrollOffset + 1) + "-" + Math.min(this.scrollOffset + maxVisible, this.bestSets.length) + " of " + this.bestSets.length + ") §eScroll for more";
                Renderer.drawStringWithShadow(scrollText, 20, startY + (maxVisible * rowHeight) + 10);
            }
        }
        
        this.drawContextMenu();
        
        Renderer.drawStringWithShadow("§7Press §eESC §7to close", width / 2 - 60, height - 10);
    }

    drawSetRow(set, rowY, rank) {
        Renderer.drawStringWithShadow("§e#" + rank, 20, rowY);
        
        const boxX = 20;
        const boxY = rowY + 15;
        const boxSize = 24;
        
        const helmetRgb = this.hexToRgb(set.helmet.hex);
        const chestRgb = this.hexToRgb(set.chest.hex);
        const legsRgb = this.hexToRgb(set.legs.hex);
        const bootsRgb = this.hexToRgb(set.boots.hex);
        
        Renderer.drawRect(Renderer.color(helmetRgb.r, helmetRgb.g, helmetRgb.b), boxX, boxY, boxSize, boxSize);
        Renderer.drawRect(Renderer.color(chestRgb.r, chestRgb.g, chestRgb.b), boxX + boxSize, boxY, boxSize, boxSize);
        Renderer.drawRect(Renderer.color(legsRgb.r, legsRgb.g, legsRgb.b), boxX, boxY + boxSize, boxSize, boxSize);
        Renderer.drawRect(Renderer.color(bootsRgb.r, bootsRgb.g, bootsRgb.b), boxX + boxSize, boxY + boxSize, boxSize, boxSize);
        
        const totalBoxWidth = boxSize * 2;
        const totalBoxHeight = boxSize * 2;
        Renderer.drawRect(Renderer.color(255, 255, 255, 150), boxX - 1, boxY - 1, totalBoxWidth + 2, 1);
        Renderer.drawRect(Renderer.color(255, 255, 255, 150), boxX - 1, boxY + totalBoxHeight, totalBoxWidth + 2, 1);
        Renderer.drawRect(Renderer.color(255, 255, 255, 150), boxX - 1, boxY - 1, 1, totalBoxHeight + 2);
        Renderer.drawRect(Renderer.color(255, 255, 255, 150), boxX + totalBoxWidth, boxY - 1, 1, totalBoxHeight + 2);
        
        Renderer.drawStringWithShadow("§8H", boxX + 3, boxY + 5);
        Renderer.drawStringWithShadow("§8C", boxX + boxSize + 3, boxY + 5);
        Renderer.drawStringWithShadow("§8L", boxX + 3, boxY + boxSize + 5);
        Renderer.drawStringWithShadow("§8B", boxX + boxSize + 3, boxY + boxSize + 5);
        
        Renderer.drawStringWithShadow("§7Helmet: §f" + set.helmet.name, 80, rowY);
        Renderer.drawStringWithShadow("§8  #" + set.helmet.hex, 80, rowY + 12);
        
        Renderer.drawStringWithShadow("§7Chest: §f" + set.chest.name, 80, rowY + 24);
        Renderer.drawStringWithShadow("§8  #" + set.chest.hex, 80, rowY + 36);
        
        Renderer.drawStringWithShadow("§7Legs: §f" + set.legs.name, 420, rowY);
        Renderer.drawStringWithShadow("§8  #" + set.legs.hex, 420, rowY + 12);
        
        Renderer.drawStringWithShadow("§7Boots: §f" + set.boots.name, 420, rowY + 24);
        Renderer.drawStringWithShadow("§8  #" + set.boots.hex, 420, rowY + 36);
        
        const avgColor = set.avgDelta <= 1 ? "§a" : (set.avgDelta <= 2 ? "§e" : "§6");
        Renderer.drawStringWithShadow("§7Avg ΔE: " + avgColor + set.avgDelta.toFixed(2), 770, rowY);
        Renderer.drawStringWithShadow("§7W/o worst: §b" + set.avgWithout1.toFixed(2), 770, rowY + 12);
        Renderer.drawStringWithShadow("§7W/o worst 2: §d" + set.avgWithout2.toFixed(2), 770, rowY + 24);
        Renderer.drawStringWithShadow("§7Worst: §c" + set.worstPiece, 770, rowY + 36);
        
        Renderer.drawRect(Renderer.color(60, 60, 60, 150), 20, rowY + 75, Renderer.screen.getWidth() - 40, 1);
    }

    getPieceType(pieceName) {
        if (!pieceName || typeof pieceName !== 'string') return null;
        
        const p = pieceName.toUpperCase();
        
        if (p.indexOf("HAT") !== -1 || p.indexOf("HELM") !== -1 || p.indexOf("CROWN") !== -1 || 
            p.indexOf("HOOD") !== -1 || p.indexOf("CAP") !== -1 || p.indexOf("MASK") !== -1) {
            return "helmet";
        }
        if (p.indexOf("JACKET") !== -1 || p.indexOf("CHEST") !== -1 || p.indexOf("TUNIC") !== -1 || 
            p.indexOf("SHIRT") !== -1 || p.indexOf("VEST") !== -1 || p.indexOf("ROBE") !== -1 || 
            p.indexOf("COAT") !== -1 || p.indexOf("PLATE") !== -1) {
            return "chestplate";
        }
        if (p.indexOf("TROUSERS") !== -1 || p.indexOf("LEGGINGS") !== -1 || p.indexOf("PANTS") !== -1 || 
            p.indexOf("LEGS") !== -1 || p.indexOf("SHORTS") !== -1) {
            return "leggings";
        }
        if (p.indexOf("SHOES") !== -1 || p.indexOf("BOOTS") !== -1 || p.indexOf("SNEAKERS") !== -1 || 
            p.indexOf("FEET") !== -1 || p.indexOf("SANDALS") !== -1) {
            return "boots";
        }
        return null;
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

    rgbToXyz(rgb) {
        let r = rgb.r / 255;
        let g = rgb.g / 255;
        let b = rgb.b / 255;
        
        r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
        g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
        b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
        
        const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
        const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
        const z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;
        
        return { x: x * 100, y: y * 100, z: z * 100 };
    }

    xyzToLab(xyz) {
        const xn = 95.047;
        const yn = 100.0;
        const zn = 108.883;
        
        let x = xyz.x / xn;
        let y = xyz.y / yn;
        let z = xyz.z / zn;
        
        x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x + 16/116);
        y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116);
        z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z + 16/116);
        
        const L = 116 * y - 16;
        const a = 500 * (x - y);
        const b = 200 * (y - z);
        
        return { L: L, a: a, b: b };
    }

    hexToLab(hex) {
        const rgb = this.hexToRgb(hex);
        const xyz = this.rgbToXyz(rgb);
        return this.xyzToLab(xyz);
    }

    calculateDeltaE(lab1, lab2) {
        return Math.sqrt(
            Math.pow(lab1.L - lab2.L, 2) + 
            Math.pow(lab1.a - lab2.a, 2) + 
            Math.pow(lab1.b - lab2.b, 2)
        );
    }

    handleHexRightClick(mouseX, mouseY) {
        if (this.bestSets.length === 0) return;
        
        const startY = 90;
        const maxVisible = 5;
        const visibleSets = Math.min(this.bestSets.length - this.scrollOffset, maxVisible);
        
        // Manually check each set row
        // Set 0
        if (visibleSets > 0) {
            const rowY = 90;
            if (mouseX >= 80 && mouseX <= 230 && mouseY >= rowY + 10 && mouseY <= rowY + 24) {
                this.showContextMenu(this.bestSets[this.scrollOffset + 0].helmet.hex, mouseX, mouseY);
                return;
            }
            if (mouseX >= 80 && mouseX <= 230 && mouseY >= rowY + 34 && mouseY <= rowY + 48) {
                this.showContextMenu(this.bestSets[this.scrollOffset + 0].chest.hex, mouseX, mouseY);
                return;
            }
            if (mouseX >= 420 && mouseX <= 570 && mouseY >= rowY + 10 && mouseY <= rowY + 24) {
                this.showContextMenu(this.bestSets[this.scrollOffset + 0].legs.hex, mouseX, mouseY);
                return;
            }
            if (mouseX >= 420 && mouseX <= 570 && mouseY >= rowY + 34 && mouseY <= rowY + 48) {
                this.showContextMenu(this.bestSets[this.scrollOffset + 0].boots.hex, mouseX, mouseY);
                return;
            }
        }
        
        // Set 1
        if (visibleSets > 1) {
            const rowY = 170;
            if (mouseX >= 80 && mouseX <= 230 && mouseY >= rowY + 10 && mouseY <= rowY + 24) {
                this.showContextMenu(this.bestSets[this.scrollOffset + 1].helmet.hex, mouseX, mouseY);
                return;
            }
            if (mouseX >= 80 && mouseX <= 230 && mouseY >= rowY + 34 && mouseY <= rowY + 48) {
                this.showContextMenu(this.bestSets[this.scrollOffset + 1].chest.hex, mouseX, mouseY);
                return;
            }
            if (mouseX >= 420 && mouseX <= 570 && mouseY >= rowY + 10 && mouseY <= rowY + 24) {
                this.showContextMenu(this.bestSets[this.scrollOffset + 1].legs.hex, mouseX, mouseY);
                return;
            }
            if (mouseX >= 420 && mouseX <= 570 && mouseY >= rowY + 34 && mouseY <= rowY + 48) {
                this.showContextMenu(this.bestSets[this.scrollOffset + 1].boots.hex, mouseX, mouseY);
                return;
            }
        }
        
        // Set 2
        if (visibleSets > 2) {
            const rowY = 250;
            if (mouseX >= 80 && mouseX <= 230 && mouseY >= rowY + 10 && mouseY <= rowY + 24) {
                this.showContextMenu(this.bestSets[this.scrollOffset + 2].helmet.hex, mouseX, mouseY);
                return;
            }
            if (mouseX >= 80 && mouseX <= 230 && mouseY >= rowY + 34 && mouseY <= rowY + 48) {
                this.showContextMenu(this.bestSets[this.scrollOffset + 2].chest.hex, mouseX, mouseY);
                return;
            }
            if (mouseX >= 420 && mouseX <= 570 && mouseY >= rowY + 10 && mouseY <= rowY + 24) {
                this.showContextMenu(this.bestSets[this.scrollOffset + 2].legs.hex, mouseX, mouseY);
                return;
            }
            if (mouseX >= 420 && mouseX <= 570 && mouseY >= rowY + 34 && mouseY <= rowY + 48) {
                this.showContextMenu(this.bestSets[this.scrollOffset + 2].boots.hex, mouseX, mouseY);
                return;
            }
        }
        
        // Set 3
        if (visibleSets > 3) {
            const rowY = 330;
            if (mouseX >= 80 && mouseX <= 230 && mouseY >= rowY + 10 && mouseY <= rowY + 24) {
                this.showContextMenu(this.bestSets[this.scrollOffset + 3].helmet.hex, mouseX, mouseY);
                return;
            }
            if (mouseX >= 80 && mouseX <= 230 && mouseY >= rowY + 34 && mouseY <= rowY + 48) {
                this.showContextMenu(this.bestSets[this.scrollOffset + 3].chest.hex, mouseX, mouseY);
                return;
            }
            if (mouseX >= 420 && mouseX <= 570 && mouseY >= rowY + 10 && mouseY <= rowY + 24) {
                this.showContextMenu(this.bestSets[this.scrollOffset + 3].legs.hex, mouseX, mouseY);
                return;
            }
            if (mouseX >= 420 && mouseX <= 570 && mouseY >= rowY + 34 && mouseY <= rowY + 48) {
                this.showContextMenu(this.bestSets[this.scrollOffset + 3].boots.hex, mouseX, mouseY);
                return;
            }
        }
        
        // Set 4
        if (visibleSets > 4) {
            const rowY = 410;
            if (mouseX >= 80 && mouseX <= 230 && mouseY >= rowY + 10 && mouseY <= rowY + 24) {
                this.showContextMenu(this.bestSets[this.scrollOffset + 4].helmet.hex, mouseX, mouseY);
                return;
            }
            if (mouseX >= 80 && mouseX <= 230 && mouseY >= rowY + 34 && mouseY <= rowY + 48) {
                this.showContextMenu(this.bestSets[this.scrollOffset + 4].chest.hex, mouseX, mouseY);
                return;
            }
            if (mouseX >= 420 && mouseX <= 570 && mouseY >= rowY + 10 && mouseY <= rowY + 24) {
                this.showContextMenu(this.bestSets[this.scrollOffset + 4].legs.hex, mouseX, mouseY);
                return;
            }
            if (mouseX >= 420 && mouseX <= 570 && mouseY >= rowY + 34 && mouseY <= rowY + 48) {
                this.showContextMenu(this.bestSets[this.scrollOffset + 4].boots.hex, mouseX, mouseY);
                return;
            }
        }
    }

    showContextMenu(hex, x, y) {
        const option = {};
        option.label = "Find in Database";
        option.action = "database";
        option.hex = hex;
        
        this.contextMenu = {};
        this.contextMenu.x = x;
        this.contextMenu.y = y;
        this.contextMenu.width = 120;
        this.contextMenu.options = [option];
    }

    drawContextMenu() {
        if (!this.contextMenu) return;
        
        const menu = this.contextMenu;
        const optionHeight = 20;
        const menuHeight = menu.options.length * optionHeight;
        
        Renderer.drawRect(Renderer.color(40, 40, 40, 240), menu.x, menu.y, menu.width, menuHeight);
        
        Renderer.drawRect(Renderer.color(100, 100, 100), menu.x, menu.y, menu.width, 2);
        Renderer.drawRect(Renderer.color(100, 100, 100), menu.x, menu.y + menuHeight - 2, menu.width, 2);
        Renderer.drawRect(Renderer.color(100, 100, 100), menu.x, menu.y, 2, menuHeight);
        Renderer.drawRect(Renderer.color(100, 100, 100), menu.x + menu.width - 2, menu.y, 2, menuHeight);
        
        if (menu.options.length > 0) {
            const option0 = menu.options[0];
            const optionY0 = menu.y;
            
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
        
        if (mouseX < menu.x || mouseX > menu.x + menu.width ||
            mouseY < menu.y || mouseY > menu.y + menuHeight) {
            this.contextMenu = null;
            return false;
        }
        
        if (menu.options.length > 0) {
            const optionY0 = menu.y;
            
            if (mouseY >= optionY0 && mouseY < optionY0 + optionHeight) {
                const option = menu.options[0];
                
                if (option.action === "database") {
                    const searchHex = option.hex;
                    global.pendingDatabaseHexSearch = searchHex;
                    this.isSwitchingGui = true;
                    this.close();
                    
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
