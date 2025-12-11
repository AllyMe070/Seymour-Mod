/// <reference types=".../CTAutocomplete" />
/// <reference lib="es2015" />

import PogObject from "PogData";
import { TARGET_COLORS, FADE_DYES } from "../colorDatabase.js";

export class ArmorChecklistGUI {
    constructor() {
        this.collection = global.collection;
        this.isOpen = false;
        this.gui = null;
        this.scrollOffset = 0;
        this.currentPage = 0;
        this.searchText = "";
        this.searchBoxActive = false;
        this.contextMenu = null;
        this.pieceToPieceMode = false;
        this.isCalculating = false;
        this.calculationProgress = 0;
        this.calculationTotal = 0;
        this.isSwitchingGui = false;
        
        // Persistent cache storage
        this.cacheStorage = new PogObject("ArmorChecklistModule", {
            matchCache: {},
            fadeDyeOptimalCache: {},
            collectionSize: 0,
            lastUpdated: 0
        }, "armorChecklistCache.json");
        
        // Load caches from disk
        this.matchCache = this.cacheStorage.matchCache;
        this.fadeDyeOptimalCache = this.cacheStorage.fadeDyeOptimalCache;
        this.normalColorCache = this.cacheStorage.normalColorCache || {};
        this.collectionSize = this.cacheStorage.collectionSize;
        this.cachedStats = null;
        
        // Cache for optimization (LAB conversions - don't need to persist)
        this.labCache = {};
        this.currentCachedCategory = null;
        
        this.categories = this.buildCategoriesFromDatabase();
            
        this.normalPageOrder = [
            "Farming",
            "Fishing",
            "Kuudra",
            "White-Black",
            "Great Spook",
            "Ghostly Boots",
            "Pure Colors",
            "Exo Pure Dyes",
            "Other In-Game Dyes",
            "Fairy",
            "Crystal",
            "Dragon Armor",
            "Dungeon Armor",
            "Rift Armor",
            "Other Armor"
        ];

        this.fadeDyePageOrder = [
            "Aurora",
            "Black Ice",
            "Frog",
            "Lava",
            "Lucky",
            "Marine",
            "Oasis",
            "Ocean",
            "Pastel Sky",
            "Portal",
            "Red Tulip",
            "Rose",
            "Snowflake",
            "Spooky",
            "Sunflower",
            "Sunset",
            "Warden"
        ];

        this.pageOrder = this.normalPageOrder; // Start with normal colors
    }

    buildCategoriesFromDatabase() {
        const categories = {
        "Farming": [],
        "Fishing": [],
        "Kuudra": [],
        "White-Black": [],
        "Great Spook": [],
        "Ghostly Boots": [],
        "Pure Colors": [],
        "Exo Pure Dyes": [],
        "Other In-Game Dyes": [],
        "Fairy": [],
        "Crystal": [],
        "Dragon Armor": [],
        "Dungeon Armor": [],
        "Rift Armor": [],
        "Other Armor": [],
        "Aurora": [],
        "Black Ice": [],
        "Frog": [],
        "Lava": [],
        "Lucky": [],
        "Marine": [],
        "Oasis": [],
        "Ocean": [],
        "Pastel Sky": [],
        "Portal": [],
        "Red Tulip": [],
        "Rose": [],
        "Snowflake": [],
        "Spooky": [],
        "Sunflower": [],
        "Sunset": [],
        "Warden": []
        };
    
        // === FARMING ===
        categories["Farming"].push({hex: "FFFF00", name: "Farm Suit", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Farming"].push({hex: "FFD700", name: "Farm Armor", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Farming"].push({hex: "E0FCF7", name: "Speedster", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Farming"].push({hex: "CBD2DB", name: "Rabbit Armour", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Farming"].push({hex: "899E20", name: "Melon Armour 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Farming"].push({hex: "7A2900", name: "Cropie Chestplate", pieces: ["chestplate"]});
        categories["Farming"].push({hex: "94451F", name: "Cropie Leggings", pieces: ["leggings"]});
        categories["Farming"].push({hex: "BB6535", name: "Cropie Boots", pieces: ["boots"]});
        categories["Farming"].push({hex: "03430E", name: "Squash Chestplate", pieces: ["chestplate"]});
        categories["Farming"].push({hex: "0C4A16", name: "Squash Leggings", pieces: ["leggings"]});
        categories["Farming"].push({hex: "13561E", name: "Squash Boots", pieces: ["boots"]});
        categories["Farming"].push({hex: "58890C", name: "Fermento Chestplate", pieces: ["chestplate"]});
        categories["Farming"].push({hex: "6A9C1B", name: "Fermento Leggings", pieces: ["leggings"]});
        categories["Farming"].push({hex: "83B03B", name: "Fermento Boots", pieces: ["boots"]});
        categories["Farming"].push({hex: "FF0000", name: "Mushroom", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Farming"].push({hex: "FFAC00", name: "Biohazard 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Farming"].push({hex: "EDAA36", name: "Pumpkin Armour", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Farming"].push({hex: "00FF00", name: "Cactus", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Farming"].push({hex: "CC5500", name: "Farmers Boots", pieces: ["boots"]});
        categories["Farming"].push({hex: "000000", name: "Ranchers", pieces: ["boots"]});
        
        // === FISHING ===
        categories["Fishing"].push({hex: "6F0F08", name: "Magma Lord 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Fishing"].push({hex: "0E666D", name: "Abyssal Armor 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Fishing"].push({hex: "24DDE5", name: "Thunder 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Fishing"].push({hex: "002CA6", name: "Shark Scale Armour 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Fishing"].push({hex: "FC2F3C", name: "Nutcracker Chestplate", pieces: ["chestplate"]});
        categories["Fishing"].push({hex: "FFF9EB", name: "Nutcracker Leggings", pieces: ["leggings"]});
        categories["Fishing"].push({hex: "46343A", name: "Nutcracker Boots", pieces: ["boots"]});
        categories["Fishing"].push({hex: "017D31", name: "Backwater 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Fishing"].push({hex: "0B004F", name: "Angler 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Fishing"].push({hex: "A06540", name: "Trophy Hunter", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Fishing"].push({hex: "FFDC51", name: "Sponge 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Fishing"].push({hex: "C13C0F", name: "Salmon Helm", pieces: ["helmet"]});
        categories["Fishing"].push({hex: "A82B76", name: "Salmon Chestplate", pieces: ["chestplate"]});
        categories["Fishing"].push({hex: "A82B76", name: "Salmon Leggings", pieces: ["leggings"]});
        categories["Fishing"].push({hex: "C13C0F", name: "Salmon Boots", pieces: ["boots"]});
        categories["Fishing"].push({hex: "ED6612", name: "Flaming Chestplate", pieces: ["chestplate"]});
        categories["Fishing"].push({hex: "CE2C2C", name: "Moogma Leggings", pieces: ["leggings"]});
        categories["Fishing"].push({hex: "276114", name: "Slug Boots", pieces: ["boots"]});
        categories["Fishing"].push({hex: "117391", name: "Guardian Chestplate", pieces: ["chestplate"]});
        categories["Fishing"].push({hex: "04CFD3", name: "Stereo Pants", pieces: ["leggings"]});
        categories["Fishing"].push({hex: "000000", name: "Squid Boots", pieces: ["boots"]});
        categories["Fishing"].push({hex: "10616E", name: "Sea Walker 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Fishing"].push({hex: "101555", name: "Water Hydra 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Fishing"].push({hex: "990D00", name: "Sea Emperor/Loch Emperor 3p", pieces: ["chestplate", "leggings", "boots"]});

        // === KUUDRA ===
        categories["Kuudra"].push({hex: "3E05AF", name: "Terror Chestplate", pieces: ["chestplate"]});
        categories["Kuudra"].push({hex: "5D23D1", name: "Terror Leggings", pieces: ["leggings"]});
        categories["Kuudra"].push({hex: "7C44EC", name: "Terror Boots", pieces: ["boots"]});
        categories["Kuudra"].push({hex: "2841F1", name: "Aurora Chestplate", pieces: ["chestplate"]});
        categories["Kuudra"].push({hex: "3F56FB", name: "Aurora Leggings", pieces: ["leggings"]});
        categories["Kuudra"].push({hex: "6184FC", name: "Aurora Boots", pieces: ["boots"]});
        categories["Kuudra"].push({hex: "FFCB0D", name: "Hollow Chestplate", pieces: ["chestplate"]});
        categories["Kuudra"].push({hex: "FFF6A3", name: "Hollow Leggings", pieces: ["leggings"]});
        categories["Kuudra"].push({hex: "E3FFFA", name: "Hollow Boots", pieces: ["boots"]});
        categories["Kuudra"].push({hex: "FF6F0C", name: "Crimson Chestplate", pieces: ["chestplate"]});
        categories["Kuudra"].push({hex: "E66105", name: "Crimson Leggings", pieces: ["leggings"]});
        categories["Kuudra"].push({hex: "E65300", name: "Crimson Boots", pieces: ["boots"]});
        categories["Kuudra"].push({hex: "F04729", name: "Fervor Chestplate", pieces: ["chestplate"]});
        categories["Kuudra"].push({hex: "17BF89", name: "Fervor Leggings", pieces: ["leggings"]});
        categories["Kuudra"].push({hex: "07A674", name: "Fervor Boots", pieces: ["boots"]});
        categories["Kuudra"].push({hex: "35530A", name: "Kuudra Follower 3p", pieces: ["chestplate", "leggings", "boots"]});

        // === WHITE-BLACK ===
        categories["White-Black"].push({hex: "000000", name: "Pure Black", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["White-Black"].push({hex: "111111", name: "Gray 1", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["White-Black"].push({hex: "222222", name: "Gray 2", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["White-Black"].push({hex: "333333", name: "Gray 3", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["White-Black"].push({hex: "444444", name: "Gray 4", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["White-Black"].push({hex: "555555", name: "Gray 5", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["White-Black"].push({hex: "666666", name: "Gray 6", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["White-Black"].push({hex: "777777", name: "Gray 7", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["White-Black"].push({hex: "888888", name: "Gray 8", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["White-Black"].push({hex: "999999", name: "Gray 9", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["White-Black"].push({hex: "AAAAAA", name: "Gray 10", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["White-Black"].push({hex: "BBBBBB", name: "Gray 11", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["White-Black"].push({hex: "CCCCCC", name: "Gray 12", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["White-Black"].push({hex: "DDDDDD", name: "Gray 13", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["White-Black"].push({hex: "EEEEEE", name: "Gray 14", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["White-Black"].push({hex: "FFFFFF", name: "Pure White", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        
        // === GREAT SPOOK ===
        categories["Great Spook"].push({hex: "9E00B2", name: "Great Spook - 9E00B2", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Great Spook"].push({hex: "9700AA", name: "Great Spook - 9700AA", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Great Spook"].push({hex: "9000A3", name: "Great Spook - 9000A3", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Great Spook"].push({hex: "89009B", name: "Great Spook - 89009B", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Great Spook"].push({hex: "830093", name: "Great Spook - 830093", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Great Spook"].push({hex: "7C008B", name: "Great Spook - 7C008B", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Great Spook"].push({hex: "750084", name: "Great Spook - 750084", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Great Spook"].push({hex: "6E007C", name: "Great Spook - 6E007C", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Great Spook"].push({hex: "670074", name: "Great Spook - 670074", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Great Spook"].push({hex: "60006C", name: "Great Spook - 60006C", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Great Spook"].push({hex: "590065", name: "Great Spook - 590065", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Great Spook"].push({hex: "52005D", name: "Great Spook - 52005D", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Great Spook"].push({hex: "4C0055", name: "Great Spook - 4C0055", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Great Spook"].push({hex: "45004D", name: "Great Spook - 45004D", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Great Spook"].push({hex: "3E0046", name: "Great Spook - 3E0046", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Great Spook"].push({hex: "37003E", name: "Great Spook - 37003E", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Great Spook"].push({hex: "300036", name: "Great Spook - 300036", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Great Spook"].push({hex: "29002E", name: "Great Spook - 29002E", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Great Spook"].push({hex: "220027", name: "Great Spook - 220027", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Great Spook"].push({hex: "1B001F", name: "Great Spook - 1B001F", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Great Spook"].push({hex: "150017", name: "Great Spook - 150017", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Great Spook"].push({hex: "0E000F", name: "Great Spook - 0E000F", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Great Spook"].push({hex: "070008", name: "Great Spook - 070008", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Great Spook"].push({hex: "000000", name: "Great Spook - 000000", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        
        // === GHOSTLY BOOTS ===
        categories["Ghostly Boots"].push({hex: "FFFFFF", name: "Ghostly Boots - FFFFFF", pieces: ["boots"]});
        categories["Ghostly Boots"].push({hex: "FCFCFC", name: "Ghostly Boots - FCFCFC", pieces: ["boots"]});
        categories["Ghostly Boots"].push({hex: "F5F5F5", name: "Ghostly Boots - F5F5F5", pieces: ["boots"]});
        categories["Ghostly Boots"].push({hex: "E9E9E9", name: "Ghostly Boots - E9E9E9", pieces: ["boots"]});
        categories["Ghostly Boots"].push({hex: "D9D9D9", name: "Ghostly Boots - D9D9D9", pieces: ["boots"]});
        categories["Ghostly Boots"].push({hex: "C6C6C6", name: "Ghostly Boots - C6C6C6", pieces: ["boots"]});
        categories["Ghostly Boots"].push({hex: "B0B0B0", name: "Ghostly Boots - B0B0B0", pieces: ["boots"]});
        categories["Ghostly Boots"].push({hex: "989898", name: "Ghostly Boots - 989898", pieces: ["boots"]});
        categories["Ghostly Boots"].push({hex: "808080", name: "Ghostly Boots - 808080", pieces: ["boots"]});
        categories["Ghostly Boots"].push({hex: "686868", name: "Ghostly Boots - 686868", pieces: ["boots"]});
        categories["Ghostly Boots"].push({hex: "505050", name: "Ghostly Boots - 505050", pieces: ["boots"]});
        categories["Ghostly Boots"].push({hex: "3A3A3A", name: "Ghostly Boots - 3A3A3A", pieces: ["boots"]});
        categories["Ghostly Boots"].push({hex: "272727", name: "Ghostly Boots - 272727", pieces: ["boots"]});
        categories["Ghostly Boots"].push({hex: "171717", name: "Ghostly Boots - 171717", pieces: ["boots"]});
        categories["Ghostly Boots"].push({hex: "0B0B0B", name: "Ghostly Boots - 0B0B0B", pieces: ["boots"]});
        categories["Ghostly Boots"].push({hex: "040404", name: "Ghostly Boots - 040404", pieces: ["boots"]});
        categories["Ghostly Boots"].push({hex: "010101", name: "Ghostly Boots - 010101", pieces: ["boots"]});
        
        // === PURE COLORS ===
        categories["Pure Colors"].push({hex: "00FF00", name: "Pure Green", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Pure Colors"].push({hex: "FFFF00", name: "Pure Yellow", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Pure Colors"].push({hex: "FF0000", name: "Pure Red", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Pure Colors"].push({hex: "0000FF", name: "Pure Blue", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Pure Colors"].push({hex: "FFFFFF", name: "Pure White", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Pure Colors"].push({hex: "000000", name: "Pure Black", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Pure Colors"].push({hex: "00FFFF", name: "Pure Cyan", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Pure Colors"].push({hex: "FF00FF", name: "Pure Pink", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        
        // === EXO PURE DYES ===
        categories["Exo Pure Dyes"].push({hex: "993333", name: "Exo pure red", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Exo Pure Dyes"].push({hex: "D87F33", name: "Exo pure orange", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Exo Pure Dyes"].push({hex: "E5E533", name: "Exo pure yellow", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Exo Pure Dyes"].push({hex: "7FCC19", name: "Exo pure green", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Exo Pure Dyes"].push({hex: "667F33", name: "Exo pure dark green", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Exo Pure Dyes"].push({hex: "6699D8", name: "Exo pure light blue", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Exo Pure Dyes"].push({hex: "4C7F99", name: "Exo pure cyan", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Exo Pure Dyes"].push({hex: "334CB2", name: "Exo pure blue", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Exo Pure Dyes"].push({hex: "F27FA5", name: "Exo pure pink", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Exo Pure Dyes"].push({hex: "7F3FB2", name: "Exo pure purple", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Exo Pure Dyes"].push({hex: "B24CD8", name: "Exo pure magenta", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Exo Pure Dyes"].push({hex: "664C33", name: "Exo pure brown", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Exo Pure Dyes"].push({hex: "FFFFFF", name: "Exo Pure White", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Exo Pure Dyes"].push({hex: "999999", name: "Exo pure light grey", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Exo Pure Dyes"].push({hex: "4C4C4C", name: "Exo pure grey", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Exo Pure Dyes"].push({hex: "191919", name: "Exo pure black", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        
        // === OTHER IN-GAME DYES ===
        categories["Other In-Game Dyes"].push({hex: "0013FF", name: "Pure Blue Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "FFF700", name: "Pure Yellow Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "7FFFD4", name: "Aquamarine Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "B80036", name: "Archfiend Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "002FA7", name: "Bingo Blue Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "E3DAC9", name: "Bone Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "CB4154", name: "Brick Red Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "702963", name: "Byzantium Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "960018", name: "Carmine Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "ACE1AF", name: "Celadon Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "B2FFFF", name: "Celeste Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "7B3F00", name: "Chocolate Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "B87333", name: "Copper Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "F56FA1", name: "Cyclamen Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "301934", name: "Dark Purple Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "4F2A2A", name: "Dung Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "50C878", name: "Emerald Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "E25822", name: "Flame Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "866F12", name: "Fossil Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "09D8EB", name: "Frostbitten Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "3C6746", name: "Holly Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "71A6D2", name: "Iceberg Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "00A86B", name: "Jade Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "CEB7AA", name: "Livid Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "FDBE02", name: "Mango Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "74A12E", name: "Matcha Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "50216C", name: "Midnight Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "967969", name: "Mocha Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "F6ADC6", name: "Nadeshiko Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "E9FFDB", name: "Nyanza Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "115555", name: "Pearlescent Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "50414C", name: "Pelt Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "CCCCFF", name: "Periwinkle Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "D40808", name: "Sangria Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "7D7D7D", name: "Secret Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "324D6C", name: "Tentacle Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "FF43A4", name: "Strawberry Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "FCD12A", name: "Treasure Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "A06540", name: "Bleached", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "6F6F0C", name: "Mythological Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other In-Game Dyes"].push({hex: "E7413C", name: "Necron Dye", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        
        // === FAIRY ===
        categories["Fairy"].push({hex: "330066", name: "Fairy - 330066", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Fairy"].push({hex: "4C0099", name: "Fairy - 4C0099", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Fairy"].push({hex: "6600CC", name: "Fairy - 6600CC", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Fairy"].push({hex: "7F00FF", name: "Fairy - 7F00FF", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Fairy"].push({hex: "9933FF", name: "Fairy - 9933FF", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Fairy"].push({hex: "B266FF", name: "Fairy - B266FF", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Fairy"].push({hex: "CC99FF", name: "Fairy - CC99FF", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Fairy"].push({hex: "E5CCFF", name: "Fairy - E5CCFF", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Fairy"].push({hex: "FFCCFF", name: "Fairy - FFCCFF", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Fairy"].push({hex: "FF99FF", name: "Fairy - FF99FF", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Fairy"].push({hex: "FF66FF", name: "Fairy - FF66FF", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Fairy"].push({hex: "FF33FF", name: "Fairy - FF33FF", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Fairy"].push({hex: "FF00FF", name: "Fairy - FF00FF", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Fairy"].push({hex: "CC00CC", name: "Fairy - CC00CC", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Fairy"].push({hex: "990099", name: "Fairy - 990099", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Fairy"].push({hex: "660066", name: "Fairy - 660066", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Fairy"].push({hex: "660033", name: "Fairy - 660033", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Fairy"].push({hex: "99004C", name: "Fairy - 99004C", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Fairy"].push({hex: "CC0066", name: "Fairy - CC0066", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Fairy"].push({hex: "FF007F", name: "Fairy - FF007F", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Fairy"].push({hex: "FF3399", name: "Fairy - FF3399", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Fairy"].push({hex: "FF66B2", name: "Fairy - FF66B2", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Fairy"].push({hex: "FF99CC", name: "Fairy - FF99CC", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Fairy"].push({hex: "FFCCE5", name: "Fairy - FFCCE5", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        
        // === CRYSTAL ===
        categories["Crystal"].push({hex: "FCF3FF", name: "Crystal - FCF3FF", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Crystal"].push({hex: "EFE1F5", name: "Crystal - EFE1F5", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Crystal"].push({hex: "E5D1ED", name: "Crystal - E5D1ED", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Crystal"].push({hex: "D9C1E3", name: "Crystal - D9C1E3", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Crystal"].push({hex: "C6A3D4", name: "Crystal - C6A3D4", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Crystal"].push({hex: "B88BC9", name: "Crystal - B88BC9", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Crystal"].push({hex: "A875BD", name: "Crystal - A875BD", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Crystal"].push({hex: "9C64B3", name: "Crystal - 9C64B3", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Crystal"].push({hex: "8E51A6", name: "Crystal - 8E51A6", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Crystal"].push({hex: "7E4196", name: "Crystal - 7E4196", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Crystal"].push({hex: "6A2C82", name: "Crystal - 6A2C82", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Crystal"].push({hex: "63237D", name: "Crystal - 63237D", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Crystal"].push({hex: "5D1C78", name: "Crystal - 5D1C78", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Crystal"].push({hex: "54146E", name: "Crystal - 54146E", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Crystal"].push({hex: "46085E", name: "Crystal - 46085E", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Crystal"].push({hex: "1F0030", name: "Crystal - 1F0030", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        
        // === DRAGON ARMOR ===
        categories["Dragon Armor"].push({hex: "D91E41", name: "Strong Dragon Chestplate", pieces: ["chestplate"]});
        categories["Dragon Armor"].push({hex: "E09419", name: "Strong Dragon Leggings", pieces: ["leggings"]});
        categories["Dragon Armor"].push({hex: "F0D124", name: "Strong Dragon Boots", pieces: ["boots"]});
        categories["Dragon Armor"].push({hex: "F2DF11", name: "Superior Dragon Chestplate", pieces: ["chestplate"]});
        categories["Dragon Armor"].push({hex: "F2DF11", name: "Superior Dragon Leggings", pieces: ["leggings"]});
        categories["Dragon Armor"].push({hex: "F25D18", name: "Superior Dragon Boots", pieces: ["boots"]});
        categories["Dragon Armor"].push({hex: "47D147", name: "Holy Dragon 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Dragon Armor"].push({hex: "F0E6AA", name: "Old Dragon 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Dragon Armor"].push({hex: "99978B", name: "Protector Dragon 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Dragon Armor"].push({hex: "B212E3", name: "Unstable Dragon 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Dragon Armor"].push({hex: "29F0E9", name: "Wise Dragon 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Dragon Armor"].push({hex: "DDE4F0", name: "Young Dragon 3p", pieces: ["chestplate", "leggings", "boots"]});
        
        // === DUNGEON ARMOR ===
        categories["Dungeon Armor"].push({hex: "9E7003", name: "Rotten Helm", pieces: ["helmet"]});
        categories["Dungeon Armor"].push({hex: "017D31", name: "Rotten Chestplate", pieces: ["chestplate"]});
        categories["Dungeon Armor"].push({hex: "017D31", name: "Rotten Leggings", pieces: ["leggings"]});
        categories["Dungeon Armor"].push({hex: "9E7003", name: "Rotten Boots", pieces: ["boots"]});
        categories["Dungeon Armor"].push({hex: "ADFF2F", name: "Bouncy Armour", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Dungeon Armor"].push({hex: "828282", name: "Heavy Chestplate", pieces: ["chestplate"]});
        categories["Dungeon Armor"].push({hex: "828282", name: "Heavy Leggings", pieces: ["leggings"]});
        categories["Dungeon Armor"].push({hex: "E1EB34", name: "Skeleton Grunt", pieces: ["chestplate", "leggings", "boots"]});
        categories["Dungeon Armor"].push({hex: "FF6B0B", name: "Skeleton Master", pieces: ["chestplate", "leggings", "boots"]});
        categories["Dungeon Armor"].push({hex: "FFBC0B", name: "Skeleton Soldier", pieces: ["chestplate", "leggings", "boots"]});
        categories["Dungeon Armor"].push({hex: "268105", name: "Skeleton Lord Armor 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Dungeon Armor"].push({hex: "D51230", name: "Zombie Commander", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Dungeon Armor"].push({hex: "D07F00", name: "Zombie Soldier", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Dungeon Armor"].push({hex: "9B01C1", name: "Zombie Lord Armour 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Dungeon Armor"].push({hex: "E6E6E6", name: "Super Heavy Helm", pieces: ["helmet"]});
        categories["Dungeon Armor"].push({hex: "5A6464", name: "Super Heavy Chestplate", pieces: ["chestplate"]});
        categories["Dungeon Armor"].push({hex: "5A6464", name: "Super Heavy Leggings", pieces: ["leggings"]});
        categories["Dungeon Armor"].push({hex: "E6E6E6", name: "Super Heavy Boots", pieces: ["boots"]});
        categories["Dungeon Armor"].push({hex: "BFBCB2", name: "Adaptive Armour (Outside Dungeon) 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Dungeon Armor"].push({hex: "3ABE78", name: "Adaptive Armour (Archer Chestplate)", pieces: ["chestplate"]});
        categories["Dungeon Armor"].push({hex: "169F57", name: "Adaptive Armour (Archer Leggings)", pieces: ["leggings",]});
        categories["Dungeon Armor"].push({hex: "169F57", name: "Adaptive Armour (Archer Boots)", pieces: ["boots"]});
        categories["Dungeon Armor"].push({hex: "82E3D8", name: "Adaptive Armour (Tank Chestplate)", pieces: ["chestplate"]});
        categories["Dungeon Armor"].push({hex: "2AB5A5", name: "Adaptive Armour (Tank Leggings)", pieces: ["leggings"]});
        categories["Dungeon Armor"].push({hex: "2AB5A5", name: "Adaptive Armour (Tank Boots)", pieces: ["boots"]});
        categories["Dungeon Armor"].push({hex: "D579FF", name: "Adaptive Armour (Mage Chestplate)", pieces: ["chestplate"]});
        categories["Dungeon Armor"].push({hex: "6E00A0", name: "Adaptive Armour (Mage Leggings)", pieces: ["leggings"]});
        categories["Dungeon Armor"].push({hex: "6E00A0", name: "Adaptive Armour (Mage Boots)", pieces: ["boots"]});
        categories["Dungeon Armor"].push({hex: "BB0000", name: "Adaptive Armour (Berserker Chestplate)", pieces: ["chestplate"]});
        categories["Dungeon Armor"].push({hex: "FF4242", name: "Adaptive Armour (Berserker Leggings)", pieces: ["leggings"]});
        categories["Dungeon Armor"].push({hex: "FF4242", name: "Adaptive Armour (Berserker Boots)", pieces: ["boots"]});
        categories["Dungeon Armor"].push({hex: "FFC234", name: "Adaptive Armour (Healer Chestplate)", pieces: ["chestplate"]});
        categories["Dungeon Armor"].push({hex: "FFF7E6", name: "Adaptive Armour (Healer Leggings)", pieces: ["leggings"]});
        categories["Dungeon Armor"].push({hex: "FFF7E6", name: "Adaptive Armour (Healer Boots)", pieces: ["boots"]});
        categories["Dungeon Armor"].push({hex: "000000", name: "Shadow Assassin 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Dungeon Armor"].push({hex: "000000", name: "Wither Armor 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Dungeon Armor"].push({hex: "370147", name: "Necromancer Lord Leggings", pieces: ["leggings"]});
        categories["Dungeon Armor"].push({hex: "400352", name: "Necromancer Lord Boots", pieces: ["boots"]});
        categories["Dungeon Armor"].push({hex: "45413C", name: "Goldor Chestplate", pieces: ["chestplate"]});
        categories["Dungeon Armor"].push({hex: "65605A", name: "Goldor Leggings", pieces: ["leggings"]});
        categories["Dungeon Armor"].push({hex: "88837E", name: "Goldor Boots", pieces: ["boots"]});
        categories["Dungeon Armor"].push({hex: "1793C4", name: "Storm Chestplate", pieces: ["chestplate"]});
        categories["Dungeon Armor"].push({hex: "17A8C4", name: "Storm Leggings", pieces: ["leggings"]});
        categories["Dungeon Armor"].push({hex: "1CD4E4", name: "Storm Boots", pieces: ["boots"]});
        categories["Dungeon Armor"].push({hex: "E7413C", name: "Necron Chestplate", pieces: ["chestplate"]});
        categories["Dungeon Armor"].push({hex: "E75C3C", name: "Necron Leggings", pieces: ["leggings"]});
        categories["Dungeon Armor"].push({hex: "E76E3C", name: "Necron Boots", pieces: ["boots"]});
        categories["Dungeon Armor"].push({hex: "4A14B7", name: "Maxor Chestplate", pieces: ["chestplate"]});
        categories["Dungeon Armor"].push({hex: "5D2FB9", name: "Maxor Leggings", pieces: ["leggings"]});
        categories["Dungeon Armor"].push({hex: "8969C8", name: "Maxor Boots", pieces: ["boots"]});
        
        // === RIFT ARMOR ===
        categories["Rift Armor"].push({hex: "35B73B", name: "Wyld Leggings", pieces: ["leggings"]});
        categories["Rift Armor"].push({hex: "154918", name: "Wyld Boots", pieces: ["boots"]});
        categories["Rift Armor"].push({hex: "FF4600", name: "Orange Chestplate", pieces: ["chestplate"]});
        categories["Rift Armor"].push({hex: "FFF200", name: "Chicken Leggings", pieces: ["leggings"]});
        categories["Rift Armor"].push({hex: "48FF00", name: "Femurgrowth Leggings", pieces: ["leggings"]});
        categories["Rift Armor"].push({hex: "0C0C96", name: "Burned Pants", pieces: ["leggings"]});
        categories["Rift Armor"].push({hex: "993333", name: "Leggings of the Coven", pieces: ["leggings"]});
        categories["Rift Armor"].push({hex: "993333", name: "Wizardman Leggings", pieces: ["leggings"]});
        categories["Rift Armor"].push({hex: "4F2886", name: "Gunthers Sneakers", pieces: ["boots"]});
        categories["Rift Armor"].push({hex: "380024", name: "Exceedingly Comfy Sneakers", pieces: ["boots"]});
        categories["Rift Armor"].push({hex: "1A004C", name: "Snake-in-a-boot", pieces: ["boots"]});
        categories["Rift Armor"].push({hex: "3333FF", name: "Ugly Boots", pieces: ["boots"]});
        categories["Rift Armor"].push({hex: "FFD700", name: "Eleanor's Set", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        
        // === OTHER ARMOR ===
        categories["Other Armor"].push({hex: "7C3756", name: "Challenger's Leggings", pieces: ["leggings"]});
        categories["Other Armor"].push({hex: "7C3756", name: "Challenger's Boots", pieces: ["boots"]});
        categories["Other Armor"].push({hex: "2A5B48", name: "Mythos Leggings", pieces: ["leggings"]});
        categories["Other Armor"].push({hex: "2A5B48", name: "Mythos Boots", pieces: ["boots"]});
        categories["Other Armor"].push({hex: "8D3592", name: "Melody Shoes", pieces: ["boots"]});
        categories["Other Armor"].push({hex: "586158", name: "Fallen Star 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Other Armor"].push({hex: "F6DE51", name: "Charlie's Trousers", pieces: ["leggings"]});
        categories["Other Armor"].push({hex: "450101", name: "Crypt Witherlord", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other Armor"].push({hex: "993399", name: "Great Spook", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other Armor"].push({hex: "C83200", name: "Yog Armour", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other Armor"].push({hex: "FF9300", name: "Armour of Magma", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other Armor"].push({hex: "006633", name: "Canopy Chestplate", pieces: ["chestplate"]});
        categories["Other Armor"].push({hex: "006600", name: "Canopy Leggings", pieces: ["leggings"]});
        categories["Other Armor"].push({hex: "331900", name: "Canopy Boots", pieces: ["boots"]});
        categories["Other Armor"].push({hex: "7AE82C", name: "Creeper Pants", pieces: ["leggings"]});
        categories["Other Armor"].push({hex: "FFA33B", name: "Berserker Chestplate", pieces: ["chestplate"]});
        categories["Other Armor"].push({hex: "FFB727", name: "Berserker Leggings", pieces: ["leggings"]});
        categories["Other Armor"].push({hex: "FFD427", name: "Berserker Boots", pieces: ["boots"]});
        categories["Other Armor"].push({hex: "C7C7C7", name: "Cheap Tux Leggings", pieces: ["leggings"]});
        categories["Other Armor"].push({hex: "383838", name: "Cheap Tux Chestplate", pieces: ["chestplate"]});
        categories["Other Armor"].push({hex: "383838", name: "Cheap Tux Boots", pieces: ["boots"]});
        categories["Other Armor"].push({hex: "DEBC15", name: "Rising Sun Leggings", pieces: ["leggings"]});
        categories["Other Armor"].push({hex: "9F8609", name: "Rising Sun Boots", pieces: ["boots"]});
        categories["Other Armor"].push({hex: "FEFDFC", name: "Elegant Tux Leggings", pieces: ["leggings"]});
        categories["Other Armor"].push({hex: "332A2A", name: "Fancy Tux Chestplate", pieces: ["chestplate"]});
        categories["Other Armor"].push({hex: "332A2A", name: "Fancy Tux Boots", pieces: ["boots"]});
        categories["Other Armor"].push({hex: "D4D4D4", name: "Fancy Tux Leggings", pieces: ["leggings"]});
        categories["Other Armor"].push({hex: "0A0011", name: "Final Destination Chestplate", pieces: ["chestplate"]});
        categories["Other Armor"].push({hex: "FF75FF", name: "Final Destination Leggings", pieces: ["leggings"]});
        categories["Other Armor"].push({hex: "0A0011", name: "Final Destination Boots", pieces: ["boots"]});
        categories["Other Armor"].push({hex: "D9D9D9", name: "Stone Chestplate", pieces: ["chestplate"]});
        categories["Other Armor"].push({hex: "D9D9D9", name: "Metal Chestplate", pieces: ["chestplate"]});
        categories["Other Armor"].push({hex: "D9D9D9", name: "Steel Chestplate", pieces: ["chestplate"]});
        categories["Other Armor"].push({hex: "BFBFBF", name: "Spirit Boots", pieces: ["boots"]});
        categories["Other Armor"].push({hex: "545454", name: "Squire Boots", pieces: ["boots"]});
        categories["Other Armor"].push({hex: "D48EF2", name: "Celeste Helm", pieces: ["helmet"]});
        categories["Other Armor"].push({hex: "FF8EDE", name: "Celeste Chestplate", pieces: ["chestplate"]});
        categories["Other Armor"].push({hex: "FF8ECA", name: "Celeste Leggings", pieces: ["leggings"]});
        categories["Other Armor"].push({hex: "FF8EB6", name: "Celeste Boots", pieces: ["boots"]});
        categories["Other Armor"].push({hex: "D400FF", name: "Starlight Chestplate", pieces: ["chestplate"]});
        categories["Other Armor"].push({hex: "D400FF", name: "Starlight Boots", pieces: ["boots"]});
        categories["Other Armor"].push({hex: "808080", name: "Ghostly Boots", pieces: ["boots"]});
        categories["Other Armor"].push({hex: "FF0A0A", name: "Minos Hunter Chestplate", pieces: ["chestplate"]});
        categories["Other Armor"].push({hex: "FF0A0A", name: "Minos Hunter Leggings", pieces: ["leggings"]});
        categories["Other Armor"].push({hex: "304B4E", name: "Minos Hunter Boots", pieces: ["boots"]});
        categories["Other Armor"].push({hex: "0E1736", name: "Primordial Armor 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Other Armor"].push({hex: "7A4120", name: "Kelly Quest Armor 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Other Armor"].push({hex: "1C9759", name: "Fig Armor 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Other Armor"].push({hex: "4DCC4D", name: "Leaflet 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Other Armor"].push({hex: "7A7964", name: "Miners Armour", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other Armor"].push({hex: "7A7964", name: "Prospecting Armour", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other Armor"].push({hex: "37B042", name: "Goblin 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Other Armor"].push({hex: "00BE00", name: "Growth Armour", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other Armor"].push({hex: "B3B3B3", name: "Heat Armour", pieces: ["helmet", "chestplate", "leggings", "boots"]});
        categories["Other Armor"].push({hex: "DF2E06", name: "Rampart 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Other Armor"].push({hex: "07031B", name: "Shimmering Light 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Other Armor"].push({hex: "8B0000", name: "Arachne Armour 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Other Armor"].push({hex: "F7DA33", name: "Blaze Armour 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Other Armor"].push({hex: "03FCF8", name: "Glacite 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Other Armor"].push({hex: "CCE5FF", name: "Mineral Armour 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Other Armor"].push({hex: "606060", name: "Spooky Armour 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Other Armor"].push({hex: "A0DAEF", name: "Frozen Blaze 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Other Armor"].push({hex: "5B0DAE", name: "Glossy Mineral Armour 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Other Armor"].push({hex: "1B1B1B", name: "Reaper Armour 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Other Armor"].push({hex: "FF0000", name: "Reaper Armour 3p (enraged)", pieces: ["chestplate", "leggings", "boots"]});
        categories["Other Armor"].push({hex: "1D1105", name: "Werewolf 3p", pieces: ["chestplate", "leggings", "boots"]});
        categories["Other Armor"].push({hex: "3588FF", name: "Vanguard 3p", pieces: ["chestplate", "leggings", "boots"]});

        // === FADE DYES ===
        
        // Aurora
        for (let colorName in TARGET_COLORS) {
            if (TARGET_COLORS.hasOwnProperty(colorName) && colorName.indexOf("Aurora - Stage") === 0) {
                categories["Aurora"].push({hex: TARGET_COLORS[colorName], name: colorName, pieces: ["helmet", "chestplate", "leggings", "boots"]});
            }
        }
        
        // Black Ice
        for (let colorName in TARGET_COLORS) {
            if (TARGET_COLORS.hasOwnProperty(colorName) && colorName.indexOf("Black Ice - Stage") === 0) {
                categories["Black Ice"].push({hex: TARGET_COLORS[colorName], name: colorName, pieces: ["helmet", "chestplate", "leggings", "boots"]});
            }
        }
        
        // Frog
        for (let colorName in TARGET_COLORS) {
            if (TARGET_COLORS.hasOwnProperty(colorName) && colorName.indexOf("Frog - Stage") === 0) {
                categories["Frog"].push({hex: TARGET_COLORS[colorName], name: colorName, pieces: ["helmet", "chestplate", "leggings", "boots"]});
            }
        }
        
        // Lava
        for (let colorName in TARGET_COLORS) {
            if (TARGET_COLORS.hasOwnProperty(colorName) && colorName.indexOf("Lava - Stage") === 0) {
                categories["Lava"].push({hex: TARGET_COLORS[colorName], name: colorName, pieces: ["helmet", "chestplate", "leggings", "boots"]});
            }
        }
        
        // Lucky
        for (let colorName in TARGET_COLORS) {
            if (TARGET_COLORS.hasOwnProperty(colorName) && colorName.indexOf("Lucky - Stage") === 0) {
                categories["Lucky"].push({hex: TARGET_COLORS[colorName], name: colorName, pieces: ["helmet", "chestplate", "leggings", "boots"]});
            }
        }
        
        // Marine
        for (let colorName in TARGET_COLORS) {
            if (TARGET_COLORS.hasOwnProperty(colorName) && colorName.indexOf("Marine - Stage") === 0) {
                categories["Marine"].push({hex: TARGET_COLORS[colorName], name: colorName, pieces: ["helmet", "chestplate", "leggings", "boots"]});
            }
        }
        
        // Oasis
        for (let colorName in TARGET_COLORS) {
            if (TARGET_COLORS.hasOwnProperty(colorName) && colorName.indexOf("Oasis - Stage") === 0) {
                categories["Oasis"].push({hex: TARGET_COLORS[colorName], name: colorName, pieces: ["helmet", "chestplate", "leggings", "boots"]});
            }
        }
        
        // Ocean
        for (let colorName in TARGET_COLORS) {
            if (TARGET_COLORS.hasOwnProperty(colorName) && colorName.indexOf("Ocean - Stage") === 0) {
                categories["Ocean"].push({hex: TARGET_COLORS[colorName], name: colorName, pieces: ["helmet", "chestplate", "leggings", "boots"]});
            }
        }
        
        // Pastel Sky
        for (let colorName in TARGET_COLORS) {
            if (TARGET_COLORS.hasOwnProperty(colorName) && colorName.indexOf("Pastel Sky - Stage") === 0) {
                categories["Pastel Sky"].push({hex: TARGET_COLORS[colorName], name: colorName, pieces: ["helmet", "chestplate", "leggings", "boots"]});
            }
        }
        
        // Portal
        for (let colorName in TARGET_COLORS) {
            if (TARGET_COLORS.hasOwnProperty(colorName) && colorName.indexOf("Portal - Stage") === 0) {
                categories["Portal"].push({hex: TARGET_COLORS[colorName], name: colorName, pieces: ["helmet", "chestplate", "leggings", "boots"]});
            }
        }
        
        // Red Tulip
        for (let colorName in TARGET_COLORS) {
            if (TARGET_COLORS.hasOwnProperty(colorName) && colorName.indexOf("Red Tulip - Stage") === 0) {
                categories["Red Tulip"].push({hex: TARGET_COLORS[colorName], name: colorName, pieces: ["helmet", "chestplate", "leggings", "boots"]});
            }
        }
        
        // Rose
        for (let colorName in TARGET_COLORS) {
            if (TARGET_COLORS.hasOwnProperty(colorName) && colorName.indexOf("Rose - Stage") === 0) {
                categories["Rose"].push({hex: TARGET_COLORS[colorName], name: colorName, pieces: ["helmet", "chestplate", "leggings", "boots"]});
            }
        }
        
        // Snowflake
        for (let colorName in TARGET_COLORS) {
            if (TARGET_COLORS.hasOwnProperty(colorName) && colorName.indexOf("Snowflake - Stage") === 0) {
                categories["Snowflake"].push({hex: TARGET_COLORS[colorName], name: colorName, pieces: ["helmet", "chestplate", "leggings", "boots"]});
            }
        }
        
        // Spooky
        for (let colorName in TARGET_COLORS) {
            if (TARGET_COLORS.hasOwnProperty(colorName) && colorName.indexOf("Spooky - Stage") === 0) {
                categories["Spooky"].push({hex: TARGET_COLORS[colorName], name: colorName, pieces: ["helmet", "chestplate", "leggings", "boots"]});
            }
        }
        
        // Sunflower
        for (let colorName in TARGET_COLORS) {
            if (TARGET_COLORS.hasOwnProperty(colorName) && colorName.indexOf("Sunflower - Stage") === 0) {
                categories["Sunflower"].push({hex: TARGET_COLORS[colorName], name: colorName, pieces: ["helmet", "chestplate", "leggings", "boots"]});
            }
        }
        
        // Sunset
        for (let colorName in TARGET_COLORS) {
            if (TARGET_COLORS.hasOwnProperty(colorName) && colorName.indexOf("Sunset - Stage") === 0) {
                categories["Sunset"].push({hex: TARGET_COLORS[colorName], name: colorName, pieces: ["helmet", "chestplate", "leggings", "boots"]});
            }
        }
        
        // Warden
        for (let colorName in TARGET_COLORS) {
            if (TARGET_COLORS.hasOwnProperty(colorName) && colorName.indexOf("Warden - Stage") === 0) {
                categories["Warden"].push({hex: TARGET_COLORS[colorName], name: colorName, pieces: ["helmet", "chestplate", "leggings", "boots"]});
            }
        }
        
        return categories;
    }

    isFadeDyeColor(colorName) {
        for (let i = 0; i < FADE_DYES.length; i++) {
            if (colorName.indexOf(FADE_DYES[i] + " - Stage") === 0) {
                return true;
            }
        }
        return false;
    }

    open() {
        this.isOpen = true;
        this.scrollOffset = 0;
        
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
            if (keyCode === 1) {
                if (self.searchBoxActive) {
                    self.searchBoxActive = false;
                    self.searchText = "";
                } else {
                    self.close();
                }
            } else if (keyCode === 14) {
                if (self.searchBoxActive && self.searchText.length > 0) {
                    self.searchText = self.searchText.substring(0, self.searchText.length - 1);
                }
            } else if (self.searchBoxActive && char) {
                if (keyCode !== 42 && keyCode !== 54 && keyCode !== 29 && keyCode !== 157) {
                    self.searchText = self.searchText + char;
                }
            }
        });
        
        this.gui.registerScrolled((x, y, direction) => {
            const currentCategory = self.pageOrder[self.currentPage];
            const stages = self.categories[currentCategory];
            const screenHeight = Renderer.screen.getHeight();
            const availableHeight = screenHeight - 140;
            const maxVisible = Math.max(12, Math.floor(availableHeight / 30));
            const maxScroll = Math.max(0, stages.length - maxVisible);

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
            const scaledRes = new (Java.type("net.minecraft.client.gui.ScaledResolution"))(mc);
            const scale = scaledRes.func_78325_e();
            const actualMouseX = Mouse.getX() / scale;
            const actualMouseY = (mc.field_71440_d - Mouse.getY()) / scale;
            
            // Check for RIGHT CLICK
            if (button === 1) {
                self.handleRightClick(actualMouseX, actualMouseY);
                return;
            }
            
            // Check for LEFT CLICK (existing button handling)
            if (button === 0) {
                // Check context menu first
                if (self.contextMenu) {
                    self.handleContextMenuClick(actualMouseX, actualMouseY);
                    return;
                }
                
                // Original button click handling
                self.handleClick(actualMouseX, actualMouseY, button);
            }
        });
            
        this.gui.open();
        ChatLib.chat("§a[Armor Checklist] §7GUI opened!");
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

    drawScreen() {
        const width = Renderer.screen.getWidth();
        const height = Renderer.screen.getHeight();
        
        Renderer.drawRect(Renderer.color(20, 20, 20, 180), 0, 0, width, height);
        
        const title = "§l§nArmor Set Checklist";
        const titleWidth = Renderer.getStringWidth(title);
        Renderer.drawStringWithShadow(title, width / 2 - titleWidth / 2, 10);
        
        // NEW: Draw filter toggle button
        this.drawFilterButton(width, 10);
        // NEW: Draw fade dye toggle button (moved to bottom right)
        this.drawFadeDyeButton(width, height);
        // Draw stats counter (always show)
        this.drawStatsCounter(width, height);
        
        const currentCategory = this.pageOrder[this.currentPage];
        const pageInfo = "§7Page " + (this.currentPage + 1) + "/" + this.pageOrder.length + " - §e" + currentCategory;
        const pageInfoWidth = Renderer.getStringWidth(pageInfo);
        Renderer.drawStringWithShadow(pageInfo, width / 2 - pageInfoWidth / 2, 30);
        
        this.drawDatabaseButton(width, 10);
        
        this.drawChecklist();
        
        this.drawPageButtons(height);
        
        this.drawContextMenu();

        Renderer.drawStringWithShadow("§7Press §eESC §7to close | Click pages below to switch", width / 2 - 120, height - 10);
    }

    drawLoadingScreen(width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Draw loading box
        const boxWidth = 300;
        const boxHeight = 80;
        const boxX = centerX - boxWidth / 2;
        const boxY = centerY - boxHeight / 2;
        
        Renderer.drawRect(Renderer.color(40, 40, 40, 240), boxX, boxY, boxWidth, boxHeight);
        Renderer.drawRect(Renderer.color(100, 100, 255, 255), boxX, boxY, boxWidth, 2);
        Renderer.drawRect(Renderer.color(100, 100, 255, 255), boxX, boxY + boxHeight - 2, boxWidth, 2);
        Renderer.drawRect(Renderer.color(100, 100, 255, 255), boxX, boxY, 2, boxHeight);
        Renderer.drawRect(Renderer.color(100, 100, 255, 255), boxX + boxWidth - 2, boxY, 2, boxHeight);
        
        // Draw text
        const loadingText = "§eCalculating Fade Dye Matches...";
        const textWidth = Renderer.getStringWidth(loadingText);
        Renderer.drawStringWithShadow(loadingText, centerX - textWidth / 2, boxY + 15);
        
        // Draw progress
        const progressText = "§7" + this.calculationProgress + " / " + this.calculationTotal;
        const progressWidth = Renderer.getStringWidth(progressText);
        Renderer.drawStringWithShadow(progressText, centerX - progressWidth / 2, boxY + 30);
        
        // Draw progress bar
        const barWidth = 260;
        const barHeight = 20;
        const barX = centerX - barWidth / 2;
        const barY = boxY + 45;
        
        Renderer.drawRect(Renderer.color(60, 60, 60, 255), barX, barY, barWidth, barHeight);
        
        if (this.calculationTotal > 0) {
            const fillWidth = (this.calculationProgress / this.calculationTotal) * barWidth;
            Renderer.drawRect(Renderer.color(0, 200, 0, 255), barX, barY, fillWidth, barHeight);
        }
    }

    drawPageButtons(screenHeight) {
        const buttonHeight = 20;
        const buttonWidth = 90;
        const screenWidth = Renderer.screen.getWidth();
        
        if (this.fadeDyeMode) {
            // 2 rows for fade dyes (17 total)
            const row1Y = screenHeight - 60;
            const row2Y = screenHeight - 35;
            
            const buttonsPerRow = 9;
            const totalButtonWidth = (buttonWidth * buttonsPerRow) + (10 * (buttonsPerRow - 1));
            const startX = (screenWidth - totalButtonWidth) / 2;
            
            const fadeNames = ["Aurora", "BIce", "Frog", "Lava", "Lucky", "Marine", "Oasis", "Ocean", "PSky", "Portal", "RTulip", "Rose", "Snowf", "Spooky", "Sunf", "Sunset", "Warden"];
            
            // Row 1: buttons 0-8
            let x = startX;
            this.drawSingleButton(x, row1Y, buttonWidth, buttonHeight, fadeNames[0], 0 === this.currentPage);
            x = x + 100;
            this.drawSingleButton(x, row1Y, buttonWidth, buttonHeight, fadeNames[1], 1 === this.currentPage);
            x = x + 100;
            this.drawSingleButton(x, row1Y, buttonWidth, buttonHeight, fadeNames[2], 2 === this.currentPage);
            x = x + 100;
            this.drawSingleButton(x, row1Y, buttonWidth, buttonHeight, fadeNames[3], 3 === this.currentPage);
            x = x + 100;
            this.drawSingleButton(x, row1Y, buttonWidth, buttonHeight, fadeNames[4], 4 === this.currentPage);
            x = x + 100;
            this.drawSingleButton(x, row1Y, buttonWidth, buttonHeight, fadeNames[5], 5 === this.currentPage);
            x = x + 100;
            this.drawSingleButton(x, row1Y, buttonWidth, buttonHeight, fadeNames[6], 6 === this.currentPage);
            x = x + 100;
            this.drawSingleButton(x, row1Y, buttonWidth, buttonHeight, fadeNames[7], 7 === this.currentPage);
            x = x + 100;
            this.drawSingleButton(x, row1Y, buttonWidth, buttonHeight, fadeNames[8], 8 === this.currentPage);
            
            // Row 2: buttons 9-16
            x = startX;
            this.drawSingleButton(x, row2Y, buttonWidth, buttonHeight, fadeNames[9], 9 === this.currentPage);
            x = x + 100;
            this.drawSingleButton(x, row2Y, buttonWidth, buttonHeight, fadeNames[10], 10 === this.currentPage);
            x = x + 100;
            this.drawSingleButton(x, row2Y, buttonWidth, buttonHeight, fadeNames[11], 11 === this.currentPage);
            x = x + 100;
            this.drawSingleButton(x, row2Y, buttonWidth, buttonHeight, fadeNames[12], 12 === this.currentPage);
            x = x + 100;
            this.drawSingleButton(x, row2Y, buttonWidth, buttonHeight, fadeNames[13], 13 === this.currentPage);
            x = x + 100;
            this.drawSingleButton(x, row2Y, buttonWidth, buttonHeight, fadeNames[14], 14 === this.currentPage);
            x = x + 100;
            this.drawSingleButton(x, row2Y, buttonWidth, buttonHeight, fadeNames[15], 15 === this.currentPage);
            x = x + 100;
            this.drawSingleButton(x, row2Y, buttonWidth, buttonHeight, fadeNames[16], 16 === this.currentPage);
        } else {
            // 2 rows for normal colors (1 + 9 total)
            const row1Y = screenHeight - 60;
            const row2Y = screenHeight - 35;
            const totalButtonWidth = (buttonWidth * 9) + (10 * 8);
            const startX = (screenWidth - totalButtonWidth) / 2;
            
            const buttonNames = ["Farming", "Fishing", "Kuudra", "Pure", "Exo Pure", "Dyes", "Fairy", "Crystal", "Dragon", "Dungeon", "Rift", "Other", "G.Spook"];
            
            // Row 1: Farming, Fishing, Kuudra, White-Black, Great Spook, and Ghostly Boots buttons (centered together)
            const sixButtonWidth = (buttonWidth * 6) + 50; // 6 buttons + gaps
            const row1StartX = (screenWidth - sixButtonWidth) / 2;
            this.drawSingleButton(row1StartX, row1Y, buttonWidth, buttonHeight, buttonNames[0], 0 === this.currentPage);
            this.drawSingleButton(row1StartX + buttonWidth + 10, row1Y, buttonWidth, buttonHeight, buttonNames[1], 1 === this.currentPage);
            this.drawSingleButton(row1StartX + (buttonWidth * 2) + 20, row1Y, buttonWidth, buttonHeight, buttonNames[2], 2 === this.currentPage);
            this.drawSingleButton(row1StartX + (buttonWidth * 3) + 30, row1Y, buttonWidth, buttonHeight, "B-White", 3 === this.currentPage);
            this.drawSingleButton(row1StartX + (buttonWidth * 4) + 40, row1Y, buttonWidth, buttonHeight, "G.Spook", 4 === this.currentPage);
            this.drawSingleButton(row1StartX + (buttonWidth * 5) + 50, row1Y, buttonWidth, buttonHeight, "G.Boots", 5 === this.currentPage);
            
            // Row 2: Other 9 buttons
            let x = startX;
            this.drawSingleButton(x, row2Y, buttonWidth, buttonHeight, buttonNames[3], 6 === this.currentPage);
            x = x + 100;
            this.drawSingleButton(x, row2Y, buttonWidth, buttonHeight, buttonNames[4], 7 === this.currentPage);
            x = x + 100;
            this.drawSingleButton(x, row2Y, buttonWidth, buttonHeight, buttonNames[5], 8 === this.currentPage);
            x = x + 100;
            this.drawSingleButton(x, row2Y, buttonWidth, buttonHeight, buttonNames[6], 9 === this.currentPage);
            x = x + 100;
            this.drawSingleButton(x, row2Y, buttonWidth, buttonHeight, buttonNames[7], 10 === this.currentPage);
            x = x + 100;
            this.drawSingleButton(x, row2Y, buttonWidth, buttonHeight, buttonNames[8], 11 === this.currentPage);
            x = x + 100;
            this.drawSingleButton(x, row2Y, buttonWidth, buttonHeight, buttonNames[9], 12 === this.currentPage);
            x = x + 100;
            this.drawSingleButton(x, row2Y, buttonWidth, buttonHeight, buttonNames[10], 13 === this.currentPage);
            x = x + 100;
            this.drawSingleButton(x, row2Y, buttonWidth, buttonHeight, buttonNames[11], 14 === this.currentPage);
        }
    }

    drawDatabaseButton(screenWidth, yPos) {
        const buttonWidth = 150;
        const buttonHeight = 20;
        const buttonX = 20; // Top left corner
        
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
        
        const text = "§fOpen Database GUI";
        const textWidth = Renderer.getStringWidth(text);
        const textX = buttonX + (buttonWidth - textWidth) / 2;
        
        Renderer.drawStringWithShadow(text, textX, yPos + 6);
    }

    drawFilterButton(screenWidth, yPos) {
        // Don't show filter button in fade dye mode
        if (this.fadeDyeMode) {
            return;
        }
        
        const buttonWidth = 180;
        const buttonHeight = 20;
        const buttonX = screenWidth - buttonWidth - 20;
        
        const Mouse = Java.type("org.lwjgl.input.Mouse");
        const mc = Client.getMinecraft();
        const scaledRes = new (Java.type("net.minecraft.client.gui.ScaledResolution"))(mc);
        const scale = scaledRes.func_78325_e();
        const mouseX = Mouse.getX() / scale;
        const mouseY = (mc.field_71440_d - Mouse.getY()) / scale;
        
        const isHovered = mouseX >= buttonX && mouseX <= buttonX + buttonWidth &&
                        mouseY >= yPos && mouseY <= yPos + buttonHeight;
        
        const bgColor = this.pieceToPieceMode ? 
            Renderer.color(0, 150, 0, 220) : 
            Renderer.color(40, 40, 40, 200);
        const hoverColor = this.pieceToPieceMode ?
            Renderer.color(0, 180, 0, 240) :
            Renderer.color(60, 60, 60, 220);
        
        Renderer.drawRect(isHovered ? hoverColor : bgColor, buttonX, yPos, buttonWidth, buttonHeight);
        
        const borderColor = this.pieceToPieceMode ?
            Renderer.color(0, 255, 0, 255) :
            Renderer.color(100, 100, 100, 200);
        Renderer.drawRect(borderColor, buttonX, yPos, buttonWidth, 2);
        Renderer.drawRect(borderColor, buttonX, yPos + buttonHeight - 2, buttonWidth, 2);
        Renderer.drawRect(borderColor, buttonX, yPos, 2, buttonHeight);
        Renderer.drawRect(borderColor, buttonX + buttonWidth - 2, yPos, 2, buttonHeight);
        
        const status = this.pieceToPieceMode ? "ON" : "OFF";
        const text = "§fPiece Filter: §" + (this.pieceToPieceMode ? "a" : "7") + status;
        const textWidth = Renderer.getStringWidth(text);
        const textX = buttonX + (buttonWidth - textWidth) / 2;
        
        Renderer.drawStringWithShadow(text, textX, yPos + 6);
    }

    drawFadeDyeButton(screenWidth, screenHeight) {
        const buttonWidth = 120;
        const buttonHeight = 20;
        const buttonX = screenWidth - buttonWidth - 20;
        const buttonY = screenHeight - 90;
        
        const Mouse = Java.type("org.lwjgl.input.Mouse");
        const mc = Client.getMinecraft();
        const scaledRes = new (Java.type("net.minecraft.client.gui.ScaledResolution"))(mc);
        const scale = scaledRes.func_78325_e();
        const mouseX = Mouse.getX() / scale;
        const mouseY = (mc.field_71440_d - Mouse.getY()) / scale;
        
        const isHovered = mouseX >= buttonX && mouseX <= buttonX + buttonWidth &&
                        mouseY >= buttonY && mouseY <= buttonY + buttonHeight;
        
        const bgColor = this.fadeDyeMode ? 
            Renderer.color(100, 0, 150, 220) : 
            Renderer.color(20, 40, 80, 200);
        const hoverColor = this.fadeDyeMode ?
            Renderer.color(120, 0, 180, 240) :
            Renderer.color(30, 60, 100, 220);
        
        Renderer.drawRect(isHovered ? hoverColor : bgColor, buttonX, buttonY, buttonWidth, buttonHeight);
        
        const borderColor = this.fadeDyeMode ?
            Renderer.color(150, 0, 255, 255) :
            Renderer.color(60, 120, 180, 255);
        Renderer.drawRect(borderColor, buttonX, buttonY, buttonWidth, 2);
        Renderer.drawRect(borderColor, buttonX, buttonY + buttonHeight - 2, buttonWidth, 2);
        Renderer.drawRect(borderColor, buttonX, buttonY, 2, buttonHeight);
        Renderer.drawRect(borderColor, buttonX + buttonWidth - 2, buttonY, 2, buttonHeight);
        
        const mode = this.fadeDyeMode ? "Fade Dyes" : "Normal";
        const text = "§fMode: §" + (this.fadeDyeMode ? "d" : "9") + mode;
        const textWidth = Renderer.getStringWidth(text);
        const textX = buttonX + (buttonWidth - textWidth) / 2;
        
        Renderer.drawStringWithShadow(text, textX, buttonY + 6);
    }

    drawSingleButton(buttonX, buttonY, buttonWidth, buttonHeight, displayText, isSelected) {
        // Button background
        const bgColor = isSelected ? 
            Renderer.color(80, 80, 80, 220) : 
            Renderer.color(40, 40, 40, 200);
        Renderer.drawRect(bgColor, buttonX, buttonY, buttonWidth, buttonHeight);
        
        // Button border
        const borderColor = isSelected ? 
            Renderer.color(255, 215, 0, 255) : 
            Renderer.color(100, 100, 100, 200);
        Renderer.drawRect(borderColor, buttonX, buttonY, buttonWidth, 2);
        Renderer.drawRect(borderColor, buttonX, buttonY + buttonHeight - 2, buttonWidth, 2);
        Renderer.drawRect(borderColor, buttonX, buttonY, 2, buttonHeight);
        Renderer.drawRect(borderColor, buttonX + buttonWidth - 2, buttonY, 2, buttonHeight);
        
        const textColor = isSelected ? "§e§l" : "§7";
        const textWidth = Renderer.getStringWidth(displayText);
        const textX = buttonX + (buttonWidth - textWidth) / 2;
        const textY = buttonY + 6;
        
        Renderer.drawStringWithShadow(textColor + displayText, textX, textY);
    }

    handleClick(mouseX, mouseY, button) {
        if (button !== 0) return;
        
        const Mouse = Java.type("org.lwjgl.input.Mouse");
        const mc = Client.getMinecraft();
        const scaledRes = new (Java.type("net.minecraft.client.gui.ScaledResolution"))(mc);
        const scale = scaledRes.func_78325_e();
        const actualMouseX = Mouse.getX() / scale;
        const actualMouseY = (mc.field_71440_d - Mouse.getY()) / scale;
        
        // Define width and height at the TOP
        const width = Renderer.screen.getWidth();
        const height = Renderer.screen.getHeight();
        
        // Check database button click FIRST
        const dbButtonWidth = 150;
        const dbButtonX = 20;
        const dbButtonY = 10;
        
        if (actualMouseX >= dbButtonX && actualMouseX <= dbButtonX + dbButtonWidth &&
            actualMouseY >= dbButtonY && actualMouseY <= dbButtonY + 20) {
            this.isSwitchingGui = true;
            this.close();
            ChatLib.command("seymour db", true);
            return;
        }

        // NEW: Check filter button click FIRST (only in normal mode)
        if (!this.fadeDyeMode) {
            const filterButtonWidth = 180;
            const filterButtonX = width - filterButtonWidth - 20;
            const filterButtonY = 10;

            if (actualMouseX >= filterButtonX && actualMouseX <= filterButtonX + filterButtonWidth &&
                actualMouseY >= filterButtonY && actualMouseY <= filterButtonY + 20) {
                this.pieceToPieceMode = !this.pieceToPieceMode;
                ChatLib.chat("§a[Armor Checklist] §7Piece-to-Piece Filter: §" + 
                            (this.pieceToPieceMode ? "aON" : "cOFF"));
                return;
            }
        }
        
        const fadeDyeButtonWidth = 120;
        const fadeDyeButtonX = width - fadeDyeButtonWidth - 20;
        const fadeDyeButtonY = height - 90; // Fixed position

        if (actualMouseX >= fadeDyeButtonX && actualMouseX <= fadeDyeButtonX + fadeDyeButtonWidth &&
            actualMouseY >= fadeDyeButtonY && actualMouseY <= fadeDyeButtonY + 20) {
            this.fadeDyeMode = !this.fadeDyeMode;
            
            if (this.fadeDyeMode) {
                this.pageOrder = this.fadeDyePageOrder;
            } else {
                this.pageOrder = this.normalPageOrder;
            }
            this.currentPage = 0;
            this.scrollOffset = 0;
            // DON'T clear caches when switching modes - they persist!
            this.currentCachedCategory = null;
            
            return;
        }
        
        const buttonWidth = 90;
        const buttonHeight = 20;

        if (this.fadeDyeMode) {
            // 2 rows for fade dyes
            const row1Y = height - 60;
            const row2Y = height - 35;
            const buttonsPerRow = 9;
            const totalButtonWidth = (buttonWidth * buttonsPerRow) + (10 * (buttonsPerRow - 1));
            const startX = (width - totalButtonWidth) / 2;
            
            // Row 1 clicks (0-8)
            let x = startX;
            if (actualMouseY >= row1Y && actualMouseY <= row1Y + buttonHeight) {
                if (actualMouseX >= x && actualMouseX <= x + buttonWidth) { this.currentPage = 0; this.scrollOffset = 0; return; }
                x = x + 100;
                if (actualMouseX >= x && actualMouseX <= x + buttonWidth) { this.currentPage = 1; this.scrollOffset = 0; return; }
                x = x + 100;
                if (actualMouseX >= x && actualMouseX <= x + buttonWidth) { this.currentPage = 2; this.scrollOffset = 0; return; }
                x = x + 100;
                if (actualMouseX >= x && actualMouseX <= x + buttonWidth) { this.currentPage = 3; this.scrollOffset = 0; return; }
                x = x + 100;
                if (actualMouseX >= x && actualMouseX <= x + buttonWidth) { this.currentPage = 4; this.scrollOffset = 0; return; }
                x = x + 100;
                if (actualMouseX >= x && actualMouseX <= x + buttonWidth) { this.currentPage = 5; this.scrollOffset = 0; return; }
                x = x + 100;
                if (actualMouseX >= x && actualMouseX <= x + buttonWidth) { this.currentPage = 6; this.scrollOffset = 0; return; }
                x = x + 100;
                if (actualMouseX >= x && actualMouseX <= x + buttonWidth) { this.currentPage = 7; this.scrollOffset = 0; return; }
                x = x + 100;
                if (actualMouseX >= x && actualMouseX <= x + buttonWidth) { this.currentPage = 8; this.scrollOffset = 0; return; }
            }
            
            // Row 2 clicks (9-16)
            x = startX;
            if (actualMouseY >= row2Y && actualMouseY <= row2Y + buttonHeight) {
                if (actualMouseX >= x && actualMouseX <= x + buttonWidth) { this.currentPage = 9; this.scrollOffset = 0; return; }
                x = x + 100;
                if (actualMouseX >= x && actualMouseX <= x + buttonWidth) { this.currentPage = 10; this.scrollOffset = 0; return; }
                x = x + 100;
                if (actualMouseX >= x && actualMouseX <= x + buttonWidth) { this.currentPage = 11; this.scrollOffset = 0; return; }
                x = x + 100;
                if (actualMouseX >= x && actualMouseX <= x + buttonWidth) { this.currentPage = 12; this.scrollOffset = 0; return; }
                x = x + 100;
                if (actualMouseX >= x && actualMouseX <= x + buttonWidth) { this.currentPage = 13; this.scrollOffset = 0; return; }
                x = x + 100;
                if (actualMouseX >= x && actualMouseX <= x + buttonWidth) { this.currentPage = 14; this.scrollOffset = 0; return; }
                x = x + 100;
                if (actualMouseX >= x && actualMouseX <= x + buttonWidth) { this.currentPage = 15; this.scrollOffset = 0; return; }
                x = x + 100;
                if (actualMouseX >= x && actualMouseX <= x + buttonWidth) { this.currentPage = 16; this.scrollOffset = 0; return; }
            }
        } else {
            // 2 rows for normal colors
            const row1Y = height - 60;
            const row2Y = height - 35;
            const totalButtonWidth = (buttonWidth * 9) + (10 * 8);
            const startX = (width - totalButtonWidth) / 2;
            
            // Row 1: Farming, Fishing, Kuudra, White-Black, Great Spook, and Ghostly Boots buttons (centered together)
            const sixButtonWidth = (buttonWidth * 6) + 50; // 6 buttons + gaps
            const row1StartX = (width - sixButtonWidth) / 2;
            if (actualMouseX >= row1StartX && actualMouseX <= row1StartX + buttonWidth && actualMouseY >= row1Y && actualMouseY <= row1Y + buttonHeight) { 
                this.currentPage = 0; this.scrollOffset = 0; return; 
            }
            if (actualMouseX >= row1StartX + buttonWidth + 10 && actualMouseX <= row1StartX + (buttonWidth * 2) + 10 && actualMouseY >= row1Y && actualMouseY <= row1Y + buttonHeight) { 
                this.currentPage = 1; this.scrollOffset = 0; return; 
            }
            if (actualMouseX >= row1StartX + (buttonWidth * 2) + 20 && actualMouseX <= row1StartX + (buttonWidth * 3) + 20 && actualMouseY >= row1Y && actualMouseY <= row1Y + buttonHeight) { 
            this.currentPage = 2; this.scrollOffset = 0; return; 
            }
            if (actualMouseX >= row1StartX + (buttonWidth * 3) + 30 && actualMouseX <= row1StartX + (buttonWidth * 4) + 30 && actualMouseY >= row1Y && actualMouseY <= row1Y + buttonHeight) { 
            this.currentPage = 3; this.scrollOffset = 0; return; 
            }
            if (actualMouseX >= row1StartX + (buttonWidth * 4) + 40 && actualMouseX <= row1StartX + (buttonWidth * 5) + 40 && actualMouseY >= row1Y && actualMouseY <= row1Y + buttonHeight) { 
            this.currentPage = 4; this.scrollOffset = 0; return; 
            }
            if (actualMouseX >= row1StartX + (buttonWidth * 5) + 50 && actualMouseX <= row1StartX + sixButtonWidth && actualMouseY >= row1Y && actualMouseY <= row1Y + buttonHeight) { 
            this.currentPage = 5; this.scrollOffset = 0; return; 
            }
            
            // Row 2: Other 9 buttons
            let x = startX;
            if (actualMouseX >= x && actualMouseX <= x + buttonWidth && actualMouseY >= row2Y && actualMouseY <= row2Y + buttonHeight) { this.currentPage = 6; this.scrollOffset = 0; return; }
            x = x + 100;
            if (actualMouseX >= x && actualMouseX <= x + buttonWidth && actualMouseY >= row2Y && actualMouseY <= row2Y + buttonHeight) { this.currentPage = 7; this.scrollOffset = 0; return; }
            x = x + 100;
            if (actualMouseX >= x && actualMouseX <= x + buttonWidth && actualMouseY >= row2Y && actualMouseY <= row2Y + buttonHeight) { this.currentPage = 8; this.scrollOffset = 0; return; }
            x = x + 100;
            if (actualMouseX >= x && actualMouseX <= x + buttonWidth && actualMouseY >= row2Y && actualMouseY <= row2Y + buttonHeight) { this.currentPage = 9; this.scrollOffset = 0; return; }
            x = x + 100;
            if (actualMouseX >= x && actualMouseX <= x + buttonWidth && actualMouseY >= row2Y && actualMouseY <= row2Y + buttonHeight) { this.currentPage = 10; this.scrollOffset = 0; return; }
            x = x + 100;
            if (actualMouseX >= x && actualMouseX <= x + buttonWidth && actualMouseY >= row2Y && actualMouseY <= row2Y + buttonHeight) { this.currentPage = 11; this.scrollOffset = 0; return; }
            x = x + 100;
            if (actualMouseX >= x && actualMouseX <= x + buttonWidth && actualMouseY >= row2Y && actualMouseY <= row2Y + buttonHeight) { this.currentPage = 12; this.scrollOffset = 0; return; }
            x = x + 100;
            if (actualMouseX >= x && actualMouseX <= x + buttonWidth && actualMouseY >= row2Y && actualMouseY <= row2Y + buttonHeight) { this.currentPage = 13; this.scrollOffset = 0; return; }
            x = x + 100;
            if (actualMouseX >= x && actualMouseX <= x + buttonWidth && actualMouseY >= row2Y && actualMouseY <= row2Y + buttonHeight) { this.currentPage = 14; this.scrollOffset = 0; return; }
        }
    }

    drawChecklist() {
        const currentCategory = this.pageOrder[this.currentPage];
        const stages = this.categories[currentCategory];
        const startY = 70;
        const rowHeight = 30;
        
        // Check if collection size changed (new pieces added)
        const currentSize = Object.keys(this.collection).length;

        if (currentSize !== this.collectionSize) {
            // Only clear cache if new pieces were added
            this.matchCache = {};
            this.fadeDyeOptimalCache = {}; // Clear ALL fade dye caches
            this.normalColorCache = {}; // Clear ALL normal color caches
                
            const diff = currentSize - this.collectionSize;
            this.collectionSize = currentSize;
            
            // Save to disk
            this.cacheStorage.matchCache = this.matchCache;
            this.cacheStorage.fadeDyeOptimalCache = this.fadeDyeOptimalCache;
            this.cacheStorage.collectionSize = this.collectionSize;
            this.cacheStorage.lastUpdated = Date.now();
            this.cacheStorage.save();
            
            if (diff > 0) {
                ChatLib.chat("§a[Armor Checklist] §7Recalculating matches for " + diff + " new pieces...");
            }
        }
        
        // Start calculation if needed (doesn't block rendering)
        if (this.fadeDyeMode && !this.fadeDyeOptimalCache[currentCategory]) {
            this.startFadeDyeCalculation(currentCategory);
        } else if (!this.fadeDyeMode && !this.normalColorCache[currentCategory]) {
            this.startNormalColorCalculation(currentCategory);
        }
        
        this.currentCachedCategory = currentCategory;
        
        // Title for the category
        Renderer.drawStringWithShadow("§l§e" + currentCategory, 20, startY - 30);
        
        // Headers
        Renderer.drawStringWithShadow("§l§7Target Color", 80, startY - 15);
        Renderer.drawStringWithShadow("§l§7Helmet", 250, startY - 15);
        Renderer.drawStringWithShadow("§l§7Chestplate", 370, startY - 15);
        Renderer.drawStringWithShadow("§l§7Leggings", 500, startY - 15);
        Renderer.drawStringWithShadow("§l§7Boots", 630, startY - 15);
        
        // Calculate how many we can show based on screen height
        const screenHeight = Renderer.screen.getHeight();
        const availableHeight = screenHeight - 140; // Total padding: 70 top + 70 bottom
        const maxVisible = Math.max(12, Math.floor(availableHeight / 30)); // At least 12, more if space allows
        const visibleStages = Math.min(stages.length - this.scrollOffset, maxVisible);

// Draw each visible stage - hardcoded to avoid scoping issues, extended for larger screens
if (visibleStages > 0) {
    const stage0 = stages[this.scrollOffset + 0];
    const y0 = startY + (0 * 30);
    this.drawChecklistRowCached(stage0, y0);
}
if (visibleStages > 1) {
    const stage1 = stages[this.scrollOffset + 1];
    const y1 = startY + (1 * 30);
    this.drawChecklistRowCached(stage1, y1);
}
if (visibleStages > 2) {
    const stage2 = stages[this.scrollOffset + 2];
    const y2 = startY + (2 * 30);
    this.drawChecklistRowCached(stage2, y2);
}
if (visibleStages > 3) {
    const stage3 = stages[this.scrollOffset + 3];
    const y3 = startY + (3 * 30);
    this.drawChecklistRowCached(stage3, y3);
}
if (visibleStages > 4) {
    const stage4 = stages[this.scrollOffset + 4];
    const y4 = startY + (4 * 30);
    this.drawChecklistRowCached(stage4, y4);
}
if (visibleStages > 5) {
    const stage5 = stages[this.scrollOffset + 5];
    const y5 = startY + (5 * 30);
    this.drawChecklistRowCached(stage5, y5);
}
if (visibleStages > 6) {
    const stage6 = stages[this.scrollOffset + 6];
    const y6 = startY + (6 * 30);
    this.drawChecklistRowCached(stage6, y6);
}
if (visibleStages > 7) {
    const stage7 = stages[this.scrollOffset + 7];
    const y7 = startY + (7 * 30);
    this.drawChecklistRowCached(stage7, y7);
}
if (visibleStages > 8) {
    const stage8 = stages[this.scrollOffset + 8];
    const y8 = startY + (8 * 30);
    this.drawChecklistRowCached(stage8, y8);
}
if (visibleStages > 9) {
    const stage9 = stages[this.scrollOffset + 9];
    const y9 = startY + (9 * 30);
    this.drawChecklistRowCached(stage9, y9);
}
if (visibleStages > 10) {
    const stage10 = stages[this.scrollOffset + 10];
    const y10 = startY + (10 * 30);
    this.drawChecklistRowCached(stage10, y10);
}
if (visibleStages > 11) {
    const stage11 = stages[this.scrollOffset + 11];
    const y11 = startY + (11 * 30);
    this.drawChecklistRowCached(stage11, y11);
}
if (visibleStages > 12) {
    const stage12 = stages[this.scrollOffset + 12];
    const y12 = startY + (12 * 30);
    this.drawChecklistRowCached(stage12, y12);
}
if (visibleStages > 13) {
    const stage13 = stages[this.scrollOffset + 13];
    const y13 = startY + (13 * 30);
    this.drawChecklistRowCached(stage13, y13);
}
if (visibleStages > 14) {
    const stage14 = stages[this.scrollOffset + 14];
    const y14 = startY + (14 * 30);
    this.drawChecklistRowCached(stage14, y14);
}
if (visibleStages > 15) {
    const stage15 = stages[this.scrollOffset + 15];
    const y15 = startY + (15 * 30);
    this.drawChecklistRowCached(stage15, y15);
}
if (visibleStages > 16) {
    const stage16 = stages[this.scrollOffset + 16];
    const y16 = startY + (16 * 30);
    this.drawChecklistRowCached(stage16, y16);
}
if (visibleStages > 17) {
    const stage17 = stages[this.scrollOffset + 17];
    const y17 = startY + (17 * 30);
    this.drawChecklistRowCached(stage17, y17);
}
if (visibleStages > 18) {
    const stage18 = stages[this.scrollOffset + 18];
    const y18 = startY + (18 * 30);
    this.drawChecklistRowCached(stage18, y18);
}
if (visibleStages > 19) {
    const stage19 = stages[this.scrollOffset + 19];
    const y19 = startY + (19 * 30);
    this.drawChecklistRowCached(stage19, y19);
}
        
        // Scroll indicator
        if (stages.length > maxVisible) {
            const scrollText = "§7(" + (this.scrollOffset + 1) + "-" + Math.min(this.scrollOffset + maxVisible, stages.length) + " of " + stages.length + ") §eScroll for more";
            Renderer.drawStringWithShadow(scrollText, 20, startY + (maxVisible * rowHeight) + 10);
        }
        
        // NEW: Show calculation progress at bottom if still calculating
        if (this.isCalculating) {
            const progressText = "§eCalculating... §7Stage " + (this.calculationProgress + 1) + "/" + stages.length;
            Renderer.drawStringWithShadow(progressText, 20, startY + (maxVisible * rowHeight) + -1);
        }
    }

    startFadeDyeCalculation(categoryName) {
        if (this.isCalculating) return; // Already calculating
        
        this.isCalculating = true;
        this.calculationProgress = 0;
        
        const stages = this.categories[categoryName];
        this.calculationTotal = stages.length;
        
        // Initialize cache immediately so rows can be drawn
        this.fadeDyeOptimalCache[categoryName] = {
            category: categoryName,
            matchesByIndex: {}  // Only use index-based storage
        };
        
        // Initialize empty matches for all stages BY INDEX ONLY
        let s = 0;
        while (s < stages.length) {
            const stage = stages[s];
            
            // Initialize by stage index
            this.fadeDyeOptimalCache[categoryName].matchesByIndex[s] = {
                helmet: null,
                chestplate: null,
                leggings: null,
                boots: null,
                calculated: false,
                stageHex: stage.hex
            };
            
            s = s + 1;
        }
        
        // Start async calculation stage by stage
        const self = this;
        setTimeout(function() {
            self.calculateNextFadeDyeStage(categoryName, 0);
        }, 10);
    }

    calculateNextFadeDyeStage(categoryName, stageIndex) {
        // Use a parallel worker pool to compute candidates for all stages asynchronously.
        // This function expects to be called with stageIndex === 0 (initial trigger).
        const stages = this.categories[categoryName];
        if (!stages || stages.length === 0) return;
        if (stageIndex !== 0) return; // Only start once

        const self = this;

        // Init state (some of this is already done by startFadeDyeCalculation, but keep safe)
        this.isCalculating = true;
        this.calculationProgress = 0;
        this.calculationTotal = stages.length;

        // Ensure matchesByIndex entries exist (startFadeDyeCalculation should have done this)
        if (!this.fadeDyeOptimalCache[categoryName].matchesByIndex) {
            this.fadeDyeOptimalCache[categoryName].matchesByIndex = {};
            let si = 0;
            while (si < stages.length) {
                this.fadeDyeOptimalCache[categoryName].matchesByIndex[si] = {
                    helmet: null,
                    chestplate: null,
                    leggings: null,
                    boots: null,
                    calculated: false,
                    stageHex: stages[si].hex
                };
                si = si + 1;
            }
        }

        // Per-stage worker will write a .candidates object into its own matchesByIndex[index]
        // to avoid concurrent modification of shared aggregated arrays.
        const JavaRuntime = Java.type("java.lang.Runtime");
        const Executors = Java.type("java.util.concurrent.Executors");
        const CountDownLatch = Java.type("java.util.concurrent.CountDownLatch");
        const AtomicInteger = Java.type("java.util.concurrent.atomic.AtomicInteger");

        // Use as many threads as possible: cap at number of CPU logical processors
        const cpus = Math.max(1, JavaRuntime.getRuntime().availableProcessors());
        const threadCount = Math.min(cpus, stages.length);
        const pool = Executors.newFixedThreadPool(threadCount);
        const latch = new CountDownLatch(stages.length);
        const completed = new AtomicInteger(0);

        // try { ChatLib.chat("§a[Armor Checklist] Starting parallel fade-dye calc: threads=" + threadCount + ", stages=" + stages.length + ", collection=" + Object.keys(self.collection).length); } catch (e) {}

        // Create a plain snapshot of the collection to avoid concurrent access to PogObject
        const collectionKeys = Object.keys(self.collection || {});
        const collectionSnapshot = [];
        let ck = 0;
        while (ck < collectionKeys.length) {
            try {
                const uuid = collectionKeys[ck];
                const piece = self.collection[uuid];
                if (piece && typeof piece === 'object' && piece.pieceName && piece.hexcode) {
                    const detectedType = self.getPieceType(piece.pieceName);
                    if (detectedType) {
                        // Precompute Lab to avoid concurrent writes to labCache from multiple threads
                        const pieceLab = self.hexToLab(piece.hexcode);
                        collectionSnapshot.push({ uuid: uuid, name: piece.pieceName, hex: piece.hexcode, type: detectedType, lab: pieceLab });
                    }
                }
            } catch (e) {}
            ck = ck + 1;
        }

        // try { ChatLib.chat("§a[Armor Checklist] collection snapshot size=" + collectionSnapshot.length); } catch (e) {}

        // Progress logging threshold: every ~10% or at least every 1
        const progressThreshold = Math.max(1, Math.floor(stages.length / 10));

        // Submit a task per stage
        let s = 0;
        while (s < stages.length) {
            (function(stageIdx) {
                const runnable = new (Java.type("java.lang.Runnable"))({
                    run: function() {
                        try {
                            const stage = stages[stageIdx];
                            const targetLab = self.hexToLab(stage.hex);
                            const localCandidates = { helmet: [], chestplate: [], leggings: [], boots: [] };

                            // Iterate over the snapshot (safe, plain JS objects)
                            let si3 = 0;
                            while (si3 < collectionSnapshot.length) {
                                try {
                                    const item = collectionSnapshot[si3];
                                    const detectedType = item.type;
                                    const pieceLab = item.lab;
                                    const deltaE = Math.sqrt(
                                        Math.pow(targetLab.L - pieceLab.L, 2) +
                                        Math.pow(targetLab.a - pieceLab.a, 2) +
                                        Math.pow(targetLab.b - pieceLab.b, 2)
                                    );
                                    if (deltaE <= 5) {
                                        localCandidates[detectedType].push({
                                            stageIndex: stageIdx,
                                            stageHex: stage.hex,
                                            uuid: item.uuid,
                                            piece: { pieceName: item.name, hexcode: item.hex },
                                            deltaE: deltaE
                                        });
                                    }
                                } catch (innerE) {
                                    // Ignore per-piece errors but log once
                                }
                                si3 = si3 + 1;
                            }

                            // Store local results onto the per-index cache object (no cross-index conflicts)
                            try {
                                const idxEntry = self.fadeDyeOptimalCache[categoryName].matchesByIndex[stageIdx];
                                idxEntry.candidates = localCandidates;
                            } catch (e) {
                                // If something went wrong, silently continue
                            }
                        } finally {
                            // Update progress and countdown latch
                            const done = completed.incrementAndGet();
                            self.calculationProgress = done;
                            // if (done % progressThreshold === 0 || done === stages.length) {
                            //     try { ChatLib.chat("§a[Armor Checklist] fade-dye calc progress: " + done + "/" + stages.length); } catch (e) {}
                            // }
                            latch.countDown();
                        }
                    }
                });
                pool.submit(runnable);
            })(s);
            s = s + 1;
        }

        // Non-blocking thread to await all workers and finalize assignment
        const finalizer = new (Java.type("java.lang.Runnable"))({
            run: function() {
                try {
                    // Wait until all stage tasks complete
                    latch.await();

                    // Aggregate all per-stage candidates into the required allCandidates structure
                    const aggregated = {
                        helmet: [],
                        chestplate: [],
                        leggings: [],
                        boots: []
                    };

                    let si2 = 0;
                    while (si2 < stages.length) {
                        try {
                            const entry = self.fadeDyeOptimalCache[categoryName].matchesByIndex[si2];
                            if (entry && entry.candidates) {
                                const keys = ["helmet", "chestplate", "leggings", "boots"];
                                let kk = 0;
                                while (kk < keys.length) {
                                    const pt = keys[kk];
                                    const arr = entry.candidates[pt] || [];
                                    let a = 0;
                                    while (a < arr.length) {
                                        aggregated[pt].push(arr[a]);
                                        a = a + 1;
                                    }
                                    kk = kk + 1;
                                }
                            }
                        } catch (e) {
                            // ignore per-index aggregation errors
                        }
                        si2 = si2 + 1;
                    }

                    // Attach aggregated candidates so assignOptimalFadeDyeMatches can use them
                    self.fadeDyeOptimalCache[categoryName].allCandidates = aggregated;

                    // Assign optimal matches (this runs on the finalizer thread)
                    try {
                        self.assignOptimalFadeDyeMatches(categoryName);
                    } catch (e) {
                        // ignore assignment errors
                    }

                    // Mark completion
                    self.isCalculating = false;
                    self.calculationProgress = 0;
                    self.calculationTotal = 0;

                    // Persist caches
                    try {
                        self.cacheStorage.matchCache = self.matchCache;
                        self.cacheStorage.fadeDyeOptimalCache = self.fadeDyeOptimalCache;
                        self.cacheStorage.normalColorCache = self.normalColorCache;
                        self.cacheStorage.collectionSize = self.collectionSize;
                        self.cacheStorage.lastUpdated = Date.now();
                        self.cacheStorage.save();
                    } catch (e) {
                        // ignore save errors
                    }
                } finally {
                    try {
                        pool.shutdown();
                    } catch (e) {}
                }
            }
        });

        // Start finalizer on a new thread so this function returns immediately
        new (Java.type("java.lang.Thread"))(finalizer).start();
    }

    assignOptimalFadeDyeMatches(categoryName) {
        const cache = this.fadeDyeOptimalCache[categoryName];
        const pieceTypes = ["helmet", "chestplate", "leggings", "boots"];
        
        // Get the actual stages in order from the category
        const stages = this.categories[categoryName];
        if (!stages || stages.length === 0) {
            return;
        }
        
        // For each piece type, assign optimally
        let p = 0;
        while (p < 4) {
            const pieceType = pieceTypes[p];
            const candidates = cache.allCandidates[pieceType];
            
            // Sort ALL candidates by deltaE (best matches first)
            candidates.sort(function(a, b) {
                return a.deltaE - b.deltaE;
            });
            
            // Track which pieces have been used FOR THIS PIECE TYPE
            const usedPiecesThisType = {};
            // Track which STAGE INDICES have been assigned
            const assignedStageIndices = {};
            let assignmentCount = 0;
            
            // Go through candidates in deltaE order (greedy assignment)
            let candIdx = 0;
            while (candIdx < candidates.length) {
                const candidate = candidates[candIdx];
                const stageIdx = candidate.stageIndex;
                
                // Only assign if:
                // 1. This piece hasn't been used yet for this piece type
                // 2. This STAGE INDEX hasn't been assigned yet
                if (!usedPiecesThisType[candidate.uuid] && !assignedStageIndices[stageIdx]) {
                    // Assign this piece to this stage BY INDEX
                    cache.matchesByIndex[stageIdx][pieceType] = {
                        name: candidate.piece.pieceName,
                        hex: candidate.piece.hexcode,
                        deltaE: candidate.deltaE,
                        uuid: candidate.uuid
                    };
                    
                    // Mark piece as used FOR THIS PIECE TYPE
                    usedPiecesThisType[candidate.uuid] = true;
                    // Mark this STAGE INDEX as assigned
                    assignedStageIndices[stageIdx] = true;
                    assignmentCount = assignmentCount + 1;
                }
                
                candIdx = candIdx + 1;
            }
            
            p = p + 1;
        }
        
        // Mark all stages as calculated BY INDEX
        let s = 0;
        while (s < stages.length) {
            cache.matchesByIndex[s].calculated = true;
            s = s + 1;
        }
        
        // Clean up temporary data
        delete cache.allCandidates;
    }

    startNormalColorCalculation(categoryName) {
        // Use a lightweight staged async worker to avoid creating heavy Java thread pools
        if (this.isCalculating) return; // Already calculating
        this.isCalculating = true;
        this.calculationProgress = 0;

        const stages = this.categories[categoryName] || [];
        this.calculationTotal = stages.length;

        // Initialize normal cache structure
        if (!this.normalColorCache[categoryName]) {
            this.normalColorCache[categoryName] = {
                category: categoryName,
                matches: {}
            };
        } else {
            this.normalColorCache[categoryName].matches = this.normalColorCache[categoryName].matches || {};
        }

        // Prepopulate matches entries by HEX so UI can reference them immediately
        let si = 0;
        while (si < stages.length) {
            const stage = stages[si];
            const hexKey = "" + stage.hex;
            this.normalColorCache[categoryName].matches[hexKey] = {
                helmet: null,
                chestplate: null,
                leggings: null,
                boots: null,
                calculated: false,
                stageHex: stage.hex,
                // candidates will be filled per-stage in the staged worker
                candidates: {
                    helmet: [],
                    chestplate: [],
                    leggings: [],
                    boots: []
                }
            };
            si = si + 1;
        }

        // Use a parallel worker pool (same approach as fade dyes) to speed up normal color calculations
        const self = this;
        if (!stages || stages.length === 0) {
            this.isCalculating = false;
            this.calculationProgress = 0;
            this.calculationTotal = 0;
            return;
        }

        this.calculationTotal = stages.length;

        try {
            const JavaRuntime = Java.type("java.lang.Runtime");
            const Executors = Java.type("java.util.concurrent.Executors");
            const CountDownLatch = Java.type("java.util.concurrent.CountDownLatch");
            const AtomicInteger = Java.type("java.util.concurrent.atomic.AtomicInteger");

            // Use as many threads as possible: cap at number of CPU logical processors
            const cpus = Math.max(1, JavaRuntime.getRuntime().availableProcessors());
            const threadCount = Math.min(cpus, stages.length);
            const pool = Executors.newFixedThreadPool(threadCount);
            const latch = new CountDownLatch(stages.length);
            const completed = new AtomicInteger(0);

            // try { ChatLib.chat("§a[Armor Checklist] Starting parallel normal calc: threads=" + threadCount + ", stages=" + stages.length + ", collection=" + Object.keys(self.collection).length); } catch (e) {}

            // Create a plain snapshot of the collection to avoid concurrent access to PogObject
            const collectionKeys = Object.keys(self.collection || {});
            const collectionSnapshot = [];
            let ck = 0;
            while (ck < collectionKeys.length) {
                try {
                    const uuid = collectionKeys[ck];
                    const piece = self.collection[uuid];
                    if (piece && typeof piece === 'object' && piece.pieceName && piece.hexcode) {
                        const detectedType = self.getPieceType(piece.pieceName);
                        if (detectedType) {
                            // Precompute Lab to avoid concurrent writes to labCache from multiple threads
                            const pieceLab = self.hexToLab(piece.hexcode);
                            collectionSnapshot.push({ uuid: uuid, name: piece.pieceName, hex: piece.hexcode, type: detectedType, lab: pieceLab });
                        }
                    }
                } catch (e) {}
                ck = ck + 1;
            }

            // try { ChatLib.chat("§a[Armor Checklist] collection snapshot size=" + collectionSnapshot.length); } catch (e) {}

            // Progress logging threshold: every ~10% or at least every 1
            const progressThreshold = Math.max(1, Math.floor(stages.length / 10));

            let s = 0;
            while (s < stages.length) {
                (function(stageIdx) {
                    const runnable = new (Java.type("java.lang.Runnable"))({
                        run: function() {
                            try {
                                const stage = stages[stageIdx];
                                const targetLab = self.hexToLab(stage.hex);
                                const localCandidates = { helmet: [], chestplate: [], leggings: [], boots: [] };

                                // Iterate over the snapshot (safe, plain JS objects)
                                let si3 = 0;
                                while (si3 < collectionSnapshot.length) {
                                    try {
                                        const item = collectionSnapshot[si3];
                                        const detectedType = item.type;
                                        const pieceLab = item.lab;
                                        const deltaE = Math.sqrt(
                                            Math.pow(targetLab.L - pieceLab.L, 2) +
                                            Math.pow(targetLab.a - pieceLab.a, 2) +
                                            Math.pow(targetLab.b - pieceLab.b, 2)
                                        );
                                        if (deltaE <= 5) {
                                            localCandidates[detectedType].push({
                                                hex: item.hex,
                                                name: item.name,
                                                uuid: item.uuid,
                                                deltaE: deltaE,
                                                stageHex: stage.hex,
                                                stageIndex: stageIdx
                                            });
                                        }
                                    } catch (innerE) {
                                        try { ChatLib.chat("§c[Armor Checklist] per-piece error: " + innerE); } catch (e) {}
                                    }
                                    si3 = si3 + 1;
                                }

                                // Store into per-hex cache entry
                                try {
                                    const hexKey = "" + stage.hex;
                                    const entry = self.normalColorCache[categoryName].matches[hexKey];
                                    if (entry) {
                                        entry.candidates = localCandidates;
                                    }
                                } catch (e) {
                                    try { ChatLib.chat("§c[Armor Checklist] error storing candidates: " + e); } catch (e2) {}
                                }
                            } finally {
                                const done = completed.incrementAndGet();
                                self.calculationProgress = done;
                                // if (done % progressThreshold === 0 || done === stages.length) {
                                //     try { ChatLib.chat("§a[Armor Checklist] normal calc progress: " + done + "/" + stages.length); } catch (e) {}
                                // }
                                latch.countDown();
                            }
                        }
                    });
                    pool.submit(runnable);
                })(s);
                s = s + 1;
            }

            // Finalizer thread to wait for all tasks
            const finalizer = new (Java.type("java.lang.Runnable"))({
                run: function() {
                    try {
                        latch.await();
                        try {
                            self.assignOptimalNormalMatches(categoryName);
                        } catch (e) {
                            try { ChatLib.chat("§c[Armor Checklist] Error assigning optimal normal matches: " + e); } catch (e2) {}
                        }

                        self.isCalculating = false;
                        self.calculationProgress = 0;
                        self.calculationTotal = 0;

                        try {
                            self.cacheStorage.matchCache = self.matchCache;
                            self.cacheStorage.fadeDyeOptimalCache = self.fadeDyeOptimalCache;
                            self.cacheStorage.normalColorCache = self.normalColorCache;
                            self.cacheStorage.collectionSize = self.collectionSize;
                            self.cacheStorage.lastUpdated = Date.now();
                            self.cacheStorage.save();
                        } catch (e) {}
                    } finally {
                        try { pool.shutdown(); } catch (e) {}
                        // try { ChatLib.chat("§a[Armor Checklist] normal calc finished"); } catch (e) {}
                    }
                }
            });

            new (Java.type("java.lang.Thread"))(finalizer).start();
        } catch (e) {
            // If Java interop fails for some reason, fall back to single-threaded staged processing
            try { ChatLib.chat("§c[Armor Checklist] Parallel normal calc failed, falling back: " + e); } catch (e2) {}
            // Fallback: process sequentially (keeps previous behavior but slower)
            let si2 = 0;
            while (si2 < stages.length) {
                try {
                    const stage = stages[si2];
                    const hexKey = "" + stage.hex;
                    const targetLab = this.hexToLab(stage.hex);
                    const localCandidates = { helmet: [], chestplate: [], leggings: [], boots: [] };
                    const keys2 = Object.keys(this.collection);
                    let kk = 0;
                    while (kk < keys2.length) {
                        try {
                            const uuid = keys2[kk];
                            const piece = this.collection[uuid];
                            if (piece && typeof piece === 'object' && piece.pieceName && piece.hexcode) {
                                const detectedType = this.getPieceType(piece.pieceName);
                                if (detectedType) {
                                    const pieceLab = this.hexToLab(piece.hexcode);
                                    const deltaE = Math.sqrt(
                                        Math.pow(targetLab.L - pieceLab.L, 2) +
                                        Math.pow(targetLab.a - pieceLab.a, 2) +
                                        Math.pow(targetLab.b - pieceLab.b, 2)
                                    );
                                    if (deltaE <= 5) {
                                        localCandidates[detectedType].push({ hex: piece.hexcode, name: piece.pieceName, uuid: uuid, deltaE: deltaE, stageHex: stage.hex, stageIndex: si2 });
                                    }
                                }
                            }
                        } catch (ie) {}
                        kk = kk + 1;
                    }
                    const entry2 = this.normalColorCache[categoryName].matches[hexKey];
                    if (entry2) entry2.candidates = localCandidates;
                } catch (outerE) {}
                si2 = si2 + 1;
            }

            try {
                this.assignOptimalNormalMatches(categoryName);
            } catch (e3) {}
            this.isCalculating = false;
            this.calculationProgress = 0;
            this.calculationTotal = 0;
        }

    }

    assignOptimalNormalMatches(categoryName) {
        // For each stage hex in the normalColorCache for this category, pick the best candidate per piece type.
        const cache = this.normalColorCache[categoryName];
        if (!cache || !cache.matches) return;

        const keys = Object.keys(cache.matches);
        let ki = 0;
        while (ki < keys.length) {
            try {
            const hexKey = keys[ki];
            const entry = cache.matches[hexKey];
            if (!entry) { ki = ki + 1; continue; }

            const candidates = (entry.candidates) ? entry.candidates : { helmet: [], chestplate: [], leggings: [], boots: [] };

            // For each piece type pick the single best (smallest deltaE)
            const pieceTypes = ["helmet", "chestplate", "leggings", "boots"];
            let p = 0;
            while (p < pieceTypes.length) {
                const pt = pieceTypes[p];
                const arr = candidates[pt] || [];

                if (arr.length === 0) {
                entry[pt] = null;
                } else {
                // sort by deltaE ascending
                arr.sort(function(a, b) { return a.deltaE - b.deltaE; });
                const best = arr[0];
                entry[pt] = {
                    name: best.name,
                    hex: best.hex,
                    deltaE: best.deltaE,
                    uuid: best.uuid
                };
                }
                p = p + 1;
            }

            // Mark calculated and remove heavy candidates list to reduce memory
            entry.calculated = true;
            try { delete entry.candidates; } catch (e) {}
            } catch (e) {
            // ignore per-entry errors
            }
            ki = ki + 1;
        }
        }

    drawChecklistRow(stage, y) {
        // Target color preview box - made wider to fit hex code
        const targetRgb = this.hexToRgb(stage.hex);
        const boxWidth = 50; // Increased from 30 to fit hex code
        Renderer.drawRect(Renderer.color(targetRgb.r, targetRgb.g, targetRgb.b), 20, y, boxWidth, 20);
        
        // Draw hex code inside the color box
        const hexText = "#" + stage.hex;
        const hexWidth = Renderer.getStringWidth(hexText);
        const textX = 20 + (boxWidth - hexWidth) / 2; // Center the text in the box
        
        // Use shadow for white text on dark colors, draw black text with diagonal offset for thickness
        if (this.isColorDark(stage.hex)) {
            Renderer.drawStringWithShadow("§f" + hexText, textX, y + 6);
        } else {
            Renderer.drawString("§0" + hexText, textX, y + 6);
            Renderer.drawString("§0" + hexText, textX + 0.5, y + 6.5);
        }
        
        // Target color name - adjusted position to account for wider box
        let displayName = stage.name;
        if (displayName.length > 25) {
            displayName = displayName.substring(0, 25) + "...";
        }
        Renderer.drawStringWithShadow("§f" + displayName, 80, y + 6); // Changed from 60 to 80
        
        // Find best match for each armor type and draw
        // Helmet
        const helmetMatch = this.findBestMatch(stage.hex, "helmet");
        this.drawMatchBox(helmetMatch, 250, y, stage.hex);
        
        // Chestplate
        const chestMatch = this.findBestMatch(stage.hex, "chestplate");
        this.drawMatchBox(chestMatch, 370, y, stage.hex);
        
        // Leggings
        const legsMatch = this.findBestMatch(stage.hex, "leggings");
        this.drawMatchBox(legsMatch, 500, y, stage.hex);
        
        // Boots
        const bootsMatch = this.findBestMatch(stage.hex, "boots");
        this.drawMatchBox(bootsMatch, 630, y, stage.hex);
    }

    drawChecklistRowCached(stage, y) {
        // Create cache key that includes category for proper isolation
        const cacheKey = stage.hex;
        
        // In fade dye mode, use progressive calculation
        if (this.fadeDyeMode) {
            const currentCategory = this.pageOrder[this.currentPage];
            
            // Draw the row header
            this.drawColorBoxAndName(stage, y);
            
            // NEW: Get the stage index for this row
            const stages = this.categories[currentCategory];
            let stageIndex = -1;
            let si = 0;
            while (si < stages.length && stageIndex === -1) {
                if (stages[si] === stage) {
                    stageIndex = si;
                }
                si = si + 1;
            }
            
            // Check if cache exists and this stage is calculated BY INDEX
            const cacheExists = this.fadeDyeOptimalCache[currentCategory] && 
                            this.fadeDyeOptimalCache[currentCategory].matchesByIndex &&
                            this.fadeDyeOptimalCache[currentCategory].matchesByIndex[stageIndex];
            const hasData = cacheExists && this.fadeDyeOptimalCache[currentCategory].matchesByIndex[stageIndex].calculated;
            
            if (hasData) {
                const optimal = this.fadeDyeOptimalCache[currentCategory].matchesByIndex[stageIndex];
                this.drawMatchBox(optimal.helmet, 250, y, stage.hex);
                this.drawMatchBox(optimal.chestplate, 370, y, stage.hex);
                this.drawMatchBox(optimal.leggings, 500, y, stage.hex);
                this.drawMatchBox(optimal.boots, 630, y, stage.hex);
            } else {
                // Still calculating - show loading boxes
                this.drawLoadingBox(250, y);
                this.drawLoadingBox(370, y);
                this.drawLoadingBox(500, y);
                this.drawLoadingBox(630, y);
            }
            
            return;
        }
        
        // Normal mode: use progressive calculation like fade dyes
        const currentCategory = this.pageOrder[this.currentPage];
        const cacheExists = this.normalColorCache[currentCategory] && 
                        this.normalColorCache[currentCategory].matches[cacheKey];
        const hasData = cacheExists && this.normalColorCache[currentCategory].matches[cacheKey].calculated;

        if (!hasData) {
            // Still calculating - show loading boxes
            this.drawColorBoxAndName(stage, y);
            
            if (!this.pieceToPieceMode || this.stageHasPiece(stage, "helmet")) {
                this.drawLoadingBox(250, y);
            } else {
                Renderer.drawRect(Renderer.color(60, 60, 60, 180), 250, y, 100, 20);
                Renderer.drawStringWithShadow("§8-", 295, y + 6);
            }
            
            if (!this.pieceToPieceMode || this.stageHasPiece(stage, "chestplate")) {
                this.drawLoadingBox(370, y);
            } else {
                Renderer.drawRect(Renderer.color(60, 60, 60, 180), 370, y, 100, 20);
                Renderer.drawStringWithShadow("§8-", 415, y + 6);
            }
            
            if (!this.pieceToPieceMode || this.stageHasPiece(stage, "leggings")) {
                this.drawLoadingBox(500, y);
            } else {
                Renderer.drawRect(Renderer.color(60, 60, 60, 180), 500, y, 100, 20);
                Renderer.drawStringWithShadow("§8-", 545, y + 6);
            }
            
            if (!this.pieceToPieceMode || this.stageHasPiece(stage, "boots")) {
                this.drawLoadingBox(630, y);
            } else {
                Renderer.drawRect(Renderer.color(60, 60, 60, 180), 630, y, 100, 20);
                Renderer.drawStringWithShadow("§8-", 675, y + 6);
            }
            
            return;
        }

        const cached = this.normalColorCache[currentCategory].matches[cacheKey];
        
        this.drawColorBoxAndName(stage, y);
        
        if (!this.pieceToPieceMode || this.stageHasPiece(stage, "helmet")) {
            this.drawMatchBox(cached.helmet, 250, y, stage.hex);
        } else {
            Renderer.drawRect(Renderer.color(60, 60, 60, 180), 250, y, 100, 20);
            Renderer.drawStringWithShadow("§8-", 295, y + 6);
        }

        if (!this.pieceToPieceMode || this.stageHasPiece(stage, "chestplate")) {
            this.drawMatchBox(cached.chestplate, 370, y, stage.hex);
        } else {
            Renderer.drawRect(Renderer.color(60, 60, 60, 180), 370, y, 100, 20);
            Renderer.drawStringWithShadow("§8-", 415, y + 6);
        }

        if (!this.pieceToPieceMode || this.stageHasPiece(stage, "leggings")) {
            this.drawMatchBox(cached.leggings, 500, y, stage.hex);
        } else {
            Renderer.drawRect(Renderer.color(60, 60, 60, 180), 500, y, 100, 20);
            Renderer.drawStringWithShadow("§8-", 545, y + 6);
        }

        if (!this.pieceToPieceMode || this.stageHasPiece(stage, "boots")) {
            this.drawMatchBox(cached.boots, 630, y, stage.hex);
        } else {
            Renderer.drawRect(Renderer.color(60, 60, 60, 180), 630, y, 100, 20);
            Renderer.drawStringWithShadow("§8-", 675, y + 6);
        }
    }

    drawMatchBox(match, x, y, targetHex) {
        if (!match) {
            // No match found - RED
            Renderer.drawRect(Renderer.color(200, 0, 0, 255), x, y, 100, 20);
            Renderer.drawStringWithShadow("§c✗ Missing", x + 5, y + 6);
            return;
        }
        
        // Only green or yellow - FULLY OPAQUE (255 alpha)
        let qualityColor;
        if (match.deltaE === 0) {
            qualityColor = Renderer.color(128, 0, 128, 255);  // Solid Purple
        } else if (match.deltaE <= 2) {
            qualityColor = Renderer.color(0, 200, 0, 255);  // Solid green
        } else {
            qualityColor = Renderer.color(200, 200, 0, 255);  // Solid yellow
        }
        Renderer.drawRect(qualityColor, x, y, 100, 20);
        
        // Draw piece info: hex code + deltaE (2 decimal places)
        const deltaText = "§7Δ" + match.deltaE.toFixed(2);
        
        // Use WHITE text with shadow (same as databaseGUI)
        Renderer.drawStringWithShadow("§f" + match.hex + " " + deltaText, x + 2, y + 6);
    }

    drawLoadingBox(x, y) {
        Renderer.drawRect(Renderer.color(60, 60, 60, 200), x, y, 100, 20);
        Renderer.drawStringWithShadow("§7...", x + 42, y + 6);
    }

    findBestMatch(targetHex, pieceType) {
        let bestMatch = null;
        let bestDelta = 999;
        
        const targetLab = this.hexToLab(targetHex);
        
        // Warm up the PogObject (required for proper access)
        if (!this.collectionWarmedUp) {
            try {
                const testKeys = Object.keys(this.collection);
                if (testKeys.length > 0) {
                    const firstKey = testKeys[0];
                    const firstPiece = this.collection[firstKey];
                }
            } catch (e) {
                // Silently handle - required for PogObject to work properly
            }
            this.collectionWarmedUp = true;
        }
        
        // Get all keys from the collection
        const keys = Object.keys(this.collection);
        
        if (keys.length === 0) {
            return null;
        }
        
        let i = 0;
        while (i < keys.length) {
            const uuid = keys[i];
            const piece = this.collection[uuid];
            
            // Skip invalid pieces
            if (!piece || typeof piece !== 'object') {
                i = i + 1;
                continue;
            }
            if (!piece.pieceName || !piece.hexcode) {
                i = i + 1;
                continue;
            }
            
            const detectedType = this.getPieceType(piece.pieceName);
            
            if (detectedType === pieceType) {
                const pieceLab = this.hexToLab(piece.hexcode);
                const deltaE = Math.sqrt(
                    Math.pow(targetLab.L - pieceLab.L, 2) + 
                    Math.pow(targetLab.a - pieceLab.a, 2) + 
                    Math.pow(targetLab.b - pieceLab.b, 2)
                );
                
                if (deltaE <= 5 && deltaE < bestDelta) {
                    bestMatch = {
                        name: piece.pieceName,
                        hex: piece.hexcode,
                        deltaE: deltaE,
                        uuid: uuid
                    };
                    bestDelta = deltaE;
                }
            }
            
            i = i + 1;
        }
        
        return bestMatch;
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

    isColorDark(hex) {
        const rgb = this.hexToRgb(hex);
        const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
        return luminance < 0.5;
    }

    hexToLab(hex) {
        // Check cache first
        if (this.labCache[hex]) {
            return this.labCache[hex];
        }
        
        // Calculate if not cached
        const rgb = this.hexToRgb(hex);
        const xyz = this.rgbToXyz(rgb);
        const lab = this.xyzToLab(xyz);
        
        // Store in cache
        this.labCache[hex] = lab;
        
        return lab;
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

    handleRightClick(mouseX, mouseY) {
        const currentCategory = this.pageOrder[this.currentPage];
        const stages = this.categories[currentCategory];
        const startY = 70;
        const rowHeight = 30;
        
        // Check which row was clicked
        const maxVisible = 12;
        const visibleStages = Math.min(stages.length - this.scrollOffset, maxVisible);
        
        let clickedIndex = -1;
        
        // Check each visible row manually
        if (visibleStages > 0) {
            const y0 = startY + (0 * rowHeight);
            if (mouseY >= y0 && mouseY < y0 + rowHeight) clickedIndex = 0;
        }
        if (visibleStages > 1) {
            const y1 = startY + (1 * rowHeight);
            if (mouseY >= y1 && mouseY < y1 + rowHeight) clickedIndex = 1;
        }
        if (visibleStages > 2) {
            const y2 = startY + (2 * rowHeight);
            if (mouseY >= y2 && mouseY < y2 + rowHeight) clickedIndex = 2;
        }
        if (visibleStages > 3) {
            const y3 = startY + (3 * rowHeight);
            if (mouseY >= y3 && mouseY < y3 + rowHeight) clickedIndex = 3;
        }
        if (visibleStages > 4) {
            const y4 = startY + (4 * rowHeight);
            if (mouseY >= y4 && mouseY < y4 + rowHeight) clickedIndex = 4;
        }
        if (visibleStages > 5) {
            const y5 = startY + (5 * rowHeight);
            if (mouseY >= y5 && mouseY < y5 + rowHeight) clickedIndex = 5;
        }
        if (visibleStages > 6) {
            const y6 = startY + (6 * rowHeight);
            if (mouseY >= y6 && mouseY < y6 + rowHeight) clickedIndex = 6;
        }
        if (visibleStages > 7) {
            const y7 = startY + (7 * rowHeight);
            if (mouseY >= y7 && mouseY < y7 + rowHeight) clickedIndex = 7;
        }
        if (visibleStages > 8) {
            const y8 = startY + (8 * rowHeight);
            if (mouseY >= y8 && mouseY < y8 + rowHeight) clickedIndex = 8;
        }
        if (visibleStages > 9) {
            const y9 = startY + (9 * rowHeight);
            if (mouseY >= y9 && mouseY < y9 + rowHeight) clickedIndex = 9;
        }
        if (visibleStages > 10) {
            const y10 = startY + (10 * rowHeight);
            if (mouseY >= y10 && mouseY < y10 + rowHeight) clickedIndex = 10;
        }
        if (visibleStages > 11) {
            const y11 = startY + (11 * rowHeight);
            if (mouseY >= y11 && mouseY < y11 + rowHeight) clickedIndex = 11;
        }
        
        if (clickedIndex === -1) return;
        
        const stage = stages[this.scrollOffset + clickedIndex];
        
        // Now check which column was clicked
        let clickedPieceType = null;
        if (mouseX >= 250 && mouseX <= 350) {
            clickedPieceType = "helmet";
        } else if (mouseX >= 370 && mouseX <= 470) {
            clickedPieceType = "chestplate";
        } else if (mouseX >= 500 && mouseX <= 600) {
            clickedPieceType = "leggings";
        } else if (mouseX >= 630 && mouseX <= 730) {
            clickedPieceType = "boots";
        }
        
        if (!clickedPieceType) return;
        
        // Find the match for this piece type
        const match = this.findBestMatch(stage.hex, clickedPieceType);
        
        if (!match) {
            ChatLib.chat("§c[Armor Checklist] No piece found for this slot!");
            return;
        }
        
        this.showContextMenu(match, stage.hex, mouseX, mouseY);
    }

    showContextMenu(match, targetHex, x, y) {
        const options = [];
        
        const option1 = {};
        option1.label = "Find Piece";
        option1.action = "find";
        option1.hex = match.hex;
        options[0] = option1;
        
        const option2 = {};
        option2.label = "Find in Database";
        option2.action = "database";
        option2.hex = match.hex;
        options[1] = option2;
        
        this.contextMenu = {};
        this.contextMenu.match = match;
        this.contextMenu.targetHex = targetHex;
        this.contextMenu.x = x;
        this.contextMenu.y = y;
        this.contextMenu.width = 100;
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
        
        // Draw option 0
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
        
        // Draw option 1
        if (menu.options.length > 1) {
            const option1 = menu.options[1];
            const optionY1 = menu.y + (1 * optionHeight);
            
            const Mouse = Java.type("org.lwjgl.input.Mouse");
            const mc = Client.getMinecraft();
            const scaledRes = new (Java.type("net.minecraft.client.gui.ScaledResolution"))(mc);
            const scale = scaledRes.func_78325_e();
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
        
        // Check which option was clicked
        if (menu.options.length > 0) {
            const optionY0 = menu.y + (0 * optionHeight);
            
            if (mouseY >= optionY0 && mouseY < optionY0 + optionHeight) {
                const option = menu.options[0];
                
                if (option.action === "find") {
                    // Run search command for this hex
                    ChatLib.command("seymour search " + option.hex, true);
                    ChatLib.chat("§a[Armor Checklist] §7Searching for piece: §f#" + option.hex);
                } else if (option.action === "database") {
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
        
        if (menu.options.length > 1) {
            const optionY1 = menu.y + (1 * optionHeight);
            
            if (mouseY >= optionY1 && mouseY < optionY1 + optionHeight) {
                const option = menu.options[1];
                
                if (option.action === "find") {
                    // Run search command for this hex
                    ChatLib.command("seymour search " + option.hex, true);
                    ChatLib.chat("§a[Armor Checklist] §7Searching for piece: §f#" + option.hex);
                } else if (option.action === "database") {
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

    stageHasPiece(stage, pieceType) {
        if (!stage.pieces) return true; // If no pieces array, show all
        
        let i = 0;
        while (i < stage.pieces.length) {
            if (stage.pieces[i] === pieceType) {
                return true;
            }
            i = i + 1;
        }
        return false;
    }

    drawColorBoxAndName(stage, y) {
        const targetRgb = this.hexToRgb(stage.hex);
        const boxWidth = 50;
        Renderer.drawRect(Renderer.color(targetRgb.r, targetRgb.g, targetRgb.b), 20, y, boxWidth, 20);
        
        const hexText = "#" + stage.hex;
        const hexWidth = Renderer.getStringWidth(hexText);
        const textX = 20 + (boxWidth - hexWidth) / 2;
        
        if (this.isColorDark(stage.hex)) {
            Renderer.drawStringWithShadow("§f" + hexText, textX, y + 6);
        } else {
            Renderer.drawString("§0" + hexText, textX, y + 6);
            Renderer.drawString("§0" + hexText, textX + 0.5, y + 6.5);
        }
        
        let displayName = stage.name;
        if (displayName.length > 25) {
            displayName = displayName.substring(0, 25) + "...";
        }
        Renderer.drawStringWithShadow("§f" + displayName, 80, y + 6);
    }

    calculateCurrentPageStats() {
        const currentCategory = this.pageOrder[this.currentPage];
        const stages = this.categories[currentCategory];
        
        // Check if cache is ready
        if (this.fadeDyeMode) {
            if (!this.fadeDyeOptimalCache[currentCategory] || 
                !this.fadeDyeOptimalCache[currentCategory].matchesByIndex) {
                return { t1: 0, t2: 0, missing: 0, filled: 0, total: 0, percent: 0, calculating: true };
            }
        } else {
            if (!this.normalColorCache[currentCategory] || 
                !this.normalColorCache[currentCategory].matches) {
                return { t1: 0, t2: 0, missing: 0, filled: 0, total: 0, percent: 0, calculating: true };
            }
        }
        
        let t1Total = 0;
        let t2Total = 0;
        let missingTotal = 0;
        let totalSlots = 0;
        
        // Helper function to count one stage
        const countStage = function(stageIndex) {
            if (stageIndex >= stages.length) return;
            
            const currentStage = stages[stageIndex];
            
            let calculated = false;
            let cache = null;
            
            if (this.fadeDyeMode) {
                calculated = this.fadeDyeOptimalCache[currentCategory] &&
                            this.fadeDyeOptimalCache[currentCategory].matchesByIndex &&
                            this.fadeDyeOptimalCache[currentCategory].matchesByIndex[stageIndex] &&
                            this.fadeDyeOptimalCache[currentCategory].matchesByIndex[stageIndex].calculated;
                
                if (calculated) {
                    cache = this.fadeDyeOptimalCache[currentCategory].matchesByIndex[stageIndex];
                }
            } else {
                const hex = "" + stages[stageIndex].hex;
                calculated = this.normalColorCache[currentCategory] &&
                            this.normalColorCache[currentCategory].matches[hex] &&
                            this.normalColorCache[currentCategory].matches[hex].calculated;
                
                if (calculated) {
                    cache = this.normalColorCache[currentCategory].matches[hex];
                }
            }
            
            if (!calculated || !cache) return;
            
            // Helmet - only count if piece filter allows it
            if (!this.pieceToPieceMode || this.stageHasPiece(currentStage, "helmet")) {
                const helmetDelta = cache.helmet ? (cache.helmet.deltaE + 0) : -1;
                totalSlots = totalSlots + 1;
                if (helmetDelta === -1) { missingTotal = missingTotal + 1; }
                else if (helmetDelta <= 2) { t1Total = t1Total + 1; }
                else if (helmetDelta <= 5) { t2Total = t2Total + 1; }
            }
            
            // Chestplate - only count if piece filter allows it
            if (!this.pieceToPieceMode || this.stageHasPiece(currentStage, "chestplate")) {
                const chestDelta = cache.chestplate ? (cache.chestplate.deltaE + 0) : -1;
                totalSlots = totalSlots + 1;
                if (chestDelta === -1) { missingTotal = missingTotal + 1; }
                else if (chestDelta <= 2) { t1Total = t1Total + 1; }
                else if (chestDelta <= 5) { t2Total = t2Total + 1; }
            }
            
            // Leggings - only count if piece filter allows it
            if (!this.pieceToPieceMode || this.stageHasPiece(currentStage, "leggings")) {
                const legsDelta = cache.leggings ? (cache.leggings.deltaE + 0) : -1;
                totalSlots = totalSlots + 1;
                if (legsDelta === -1) { missingTotal = missingTotal + 1; }
                else if (legsDelta <= 2) { t1Total = t1Total + 1; }
                else if (legsDelta <= 5) { t2Total = t2Total + 1; }
            }
            
            // Boots - only count if piece filter allows it
            if (!this.pieceToPieceMode || this.stageHasPiece(currentStage, "boots")) {
                const bootsDelta = cache.boots ? (cache.boots.deltaE + 0) : -1;
                totalSlots = totalSlots + 1;
                if (bootsDelta === -1) { missingTotal = missingTotal + 1; }
                else if (bootsDelta <= 2) { t1Total = t1Total + 1; }
                else if (bootsDelta <= 5) { t2Total = t2Total + 1; }
            }
        }.bind(this);
        
    for (let i = 0; i < stages.length; i++) {
        countStage(i);
        }
        
        const filledTotal = t1Total + t2Total;
        const percentFilled = totalSlots > 0 ? ((filledTotal / totalSlots) * 100).toFixed(1) : "0.0";
        
        const statsResult = {};
        statsResult.t1 = t1Total;
        statsResult.t2 = t2Total;
        statsResult.missing = missingTotal;
        statsResult.filled = filledTotal;
        statsResult.total = totalSlots;
        statsResult.percent = percentFilled;
        statsResult.calculating = false;
        
        return statsResult;
    }

    drawStatsCounter(screenWidth, screenHeight) {
        const stats = this.calculateCurrentPageStats();
        
        const boxWidth = 180;
        const boxHeight = 40;
        const boxX = screenWidth - boxWidth - 20;
        const boxY = 35;
        
        // Background
        Renderer.drawRect(Renderer.color(40, 40, 40, 200), boxX, boxY, boxWidth, boxHeight);
        
        // Border
        const borderColor = Renderer.color(100, 100, 100, 200);
        Renderer.drawRect(borderColor, boxX, boxY, boxWidth, 2);
        Renderer.drawRect(borderColor, boxX, boxY + boxHeight - 2, boxWidth, 2);
        Renderer.drawRect(borderColor, boxX, boxY, 2, boxHeight);
        Renderer.drawRect(borderColor, boxX + boxWidth - 2, boxY, 2, boxHeight);
        
        if (stats.calculating) {
            const calcText = "§eCalculating...";
            const calcWidth = Renderer.getStringWidth(calcText);
            const calcX = boxX + (boxWidth - calcWidth) / 2;
            Renderer.drawStringWithShadow(calcText, calcX, boxY + 15);
            return;
        }
        
        // Calculate percentages with one decimal place
        const t1Percent = stats.total > 0 ? ((stats.t1 / stats.total) * 100).toFixed(1) : "0.0";
        const t2Percent = stats.total > 0 ? ((stats.t2 / stats.total) * 100).toFixed(1) : "0.0";
        
        // Determine T1 color based on percentage (convert to number for comparison)
        const t1PercentNum = parseFloat(t1Percent);
        let t1PercentColor = "§c"; // Red by default
        if (t1PercentNum >= 50) {
            t1PercentColor = "§a"; // Green
        } else if (t1PercentNum >= 35) {
            t1PercentColor = "§e"; // Yellow
        }
        
        // First line: T1 and T2 counts with percentages
        const line1 = "§7T1: §c" + stats.t1 + " §7(" + t1PercentColor + t1Percent + "%§7) | T2: §6" + stats.t2 + " §7(§f" + t2Percent + "%§7)";
        const line1Width = Renderer.getStringWidth(line1);
        const line1X = boxX + (boxWidth - line1Width) / 2;
        Renderer.drawStringWithShadow(line1, line1X, boxY + 6);
        
        // Second line: Missing and total filled percentage (white %)
        const line2 = "§7Missing: §c" + stats.missing + " §7| §e" + stats.filled + "/" + stats.total + " §7(§f" + stats.percent + "%§7)";
        const line2Width = Renderer.getStringWidth(line2);
        const line2X = boxX + (boxWidth - line2Width) / 2;
        Renderer.drawStringWithShadow(line2, line2X, boxY + 22);
    }
}
