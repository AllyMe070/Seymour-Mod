/// <reference types="../CTAutocomplete" />
/// <reference lib="es2015" />

import PogObject from "PogData";
import { TARGET_COLORS, FADE_DYES } from "../colorDatabase.js";

export class ArmorChecklistGUI {
    constructor(collection) {
    this.collection = collection;
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
    
    // Cache for optimization (LAB conversions - don't need to persist)
    this.labCache = {};
    this.currentCachedCategory = null;
    
    this.categories = this.buildCategoriesFromDatabase();
        
        this.normalPageOrder = [
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
    
    // === PURE COLORS ===
    categories["Pure Colors"].push({hex: "00FF00", name: "Pure Green", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Pure Colors"].push({hex: "FFFF00", name: "Pure Yellow", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Pure Colors"].push({hex: "FF0000", name: "Pure Red", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Pure Colors"].push({hex: "0000FF", name: "Pure Blue", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Pure Colors"].push({hex: "FFFFFF", name: "Pure White", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Pure Colors"].push({hex: "000000", name: "Pure Black", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Pure Colors"].push({hex: "00FFFF", name: "Pure Cyan", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Pure Colors"].push({hex: "FF00FF", name: "Pure Pink/Og Fairy Dyed (FF00FF)", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    
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
    categories["Fairy"].push({hex: "660066", name: "Fairy - 660066", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Fairy"].push({hex: "660033", name: "Fairy - 660033", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Fairy"].push({hex: "99004C", name: "Fairy - 99004C", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Fairy"].push({hex: "CC0066", name: "Fairy - CC0066", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Fairy"].push({hex: "FF007F", name: "Fairy - FF007F", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Fairy"].push({hex: "FF3399", name: "Fairy - FF3399", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Fairy"].push({hex: "FF66B2", name: "Fairy - FF66B2", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Fairy"].push({hex: "FF99CC", name: "Fairy - FF99CC", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Fairy"].push({hex: "FFCCE5", name: "Fairy - FFCCE5", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Fairy"].push({hex: "990099", name: "Fairy - 990099", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Fairy"].push({hex: "CC00CC", name: "Fairy - CC00CC", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Fairy"].push({hex: "FF33FF", name: "Fairy - FF33FF", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Fairy"].push({hex: "FF66FF", name: "Fairy - FF66FF", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Fairy"].push({hex: "FF99FF", name: "Fairy - FF99FF", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Fairy"].push({hex: "FFCCFF", name: "Fairy - FFCCFF", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Fairy"].push({hex: "E5CCFF", name: "Fairy - E5CCFF", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Fairy"].push({hex: "CC99FF", name: "Fairy - CC99FF", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Fairy"].push({hex: "B266FF", name: "Fairy - B266FF", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Fairy"].push({hex: "9933FF", name: "Fairy - 9933FF", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Fairy"].push({hex: "7F00FF", name: "Fairy - 7F00FF", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Fairy"].push({hex: "6600CC", name: "Fairy - 6600CC", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Fairy"].push({hex: "4C0099", name: "Fairy - 4C0099", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Fairy"].push({hex: "330066", name: "Fairy - 330066", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    
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
    categories["Dragon Armor"].push({hex: "F2DF11", name: "Superior Dragon Chestplate+Leggings", pieces: ["chestplate", "leggings"]});
    categories["Dragon Armor"].push({hex: "F25D18", name: "Superior Dragon Boots", pieces: ["boots"]});
    categories["Dragon Armor"].push({hex: "47D147", name: "Holy Dragon 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Dragon Armor"].push({hex: "F0E6AA", name: "Old Dragon 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Dragon Armor"].push({hex: "99978B", name: "Protector Dragon 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Dragon Armor"].push({hex: "B212E3", name: "Unstable Dragon 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Dragon Armor"].push({hex: "29F0E9", name: "Wise Dragon 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Dragon Armor"].push({hex: "DDE4F0", name: "Young Dragon 3p", pieces: ["chestplate", "leggings", "boots"]});
    
    // === DUNGEON ARMOR ===
    categories["Dungeon Armor"].push({hex: "9E7003", name: "Rotten Helm+Boots", pieces: ["helmet", "boots"]});
    categories["Dungeon Armor"].push({hex: "017D31", name: "Rotten Chestplate+Leggings / Backwater 3p", pieces: ["chestplate", "leggings"]});
    categories["Dungeon Armor"].push({hex: "ADFF2F", name: "Bouncy Armour", pieces: ["chestplate", "leggings", "boots"]});
    categories["Dungeon Armor"].push({hex: "828282", name: "Heavy Chestplate+Leggings", pieces: ["chestplate", "leggings"]});
    categories["Dungeon Armor"].push({hex: "E1EB34", name: "Skeleton Grunt", pieces: ["chestplate", "leggings", "boots"]});
    categories["Dungeon Armor"].push({hex: "FF6B0B", name: "Skeleton Master", pieces: ["chestplate", "leggings", "boots"]});
    categories["Dungeon Armor"].push({hex: "FFBC0B", name: "Skeleton Soldier", pieces: ["chestplate", "leggings", "boots"]});
    categories["Dungeon Armor"].push({hex: "268105", name: "Skeleton Lord Armor 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Dungeon Armor"].push({hex: "D51230", name: "Zombie Commander", pieces: ["chestplate", "leggings", "boots"]});
    categories["Dungeon Armor"].push({hex: "D07F00", name: "Zombie Soldier", pieces: ["chestplate", "leggings", "boots"]});
    categories["Dungeon Armor"].push({hex: "9B01C1", name: "Zombie Lord Armour 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Dungeon Armor"].push({hex: "E6E6E6", name: "Super Heavy Helm+Boots", pieces: ["helmet", "boots"]});
    categories["Dungeon Armor"].push({hex: "5A6464", name: "Super Heavy Chestplate+Leggings", pieces: ["chestplate", "leggings"]});
    categories["Dungeon Armor"].push({hex: "BFBCB2", name: "Adaptive Armour (Outside Dungeon) 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Dungeon Armor"].push({hex: "000000", name: "Shadow Assassin & Wither Armor", pieces: ["chestplate", "leggings", "boots"]});
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
    categories["Rift Armor"].push({hex: "35B73B", name: "Wyld Leggings (Rift)", pieces: ["leggings"]});
    categories["Rift Armor"].push({hex: "154918", name: "Wyld Boots (Rift)", pieces: ["boots"]});
    categories["Rift Armor"].push({hex: "FF4600", name: "Orange Chestplate (Rift)", pieces: ["chestplate"]});
    categories["Rift Armor"].push({hex: "FFF200", name: "Chicken Leggings (Rift)", pieces: ["leggings"]});
    categories["Rift Armor"].push({hex: "48FF00", name: "Femurgrowth Leggings (Rift)", pieces: ["leggings"]});
    categories["Rift Armor"].push({hex: "380024", name: "Exceedingly Comfy Sneakers (Rift)", pieces: ["boots"]});
    categories["Rift Armor"].push({hex: "0C0C96", name: "Burned Pants (Rift)", pieces: ["leggings"]});
    categories["Rift Armor"].push({hex: "FFD700", name: "Farm Armour/Elanor's Set (Rift)", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    
    // === OTHER ARMOR (Part 1 of 3) ===
    categories["Other Armor"].push({hex: "7C3756", name: "Challenger's Leggings+Boots", pieces: ["leggings", "boots"]});
    categories["Other Armor"].push({hex: "2A5B48", name: "Mythos Leggings+Boots", pieces: ["leggings", "boots"]});
    categories["Other Armor"].push({hex: "8D3592", name: "Melody Shoes", pieces: ["boots"]});
    categories["Other Armor"].push({hex: "586158", name: "Fallen Star 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "F6DE51", name: "Charlie's Trousers", pieces: ["leggings"]});
    categories["Other Armor"].push({hex: "E0FCF7", name: "Speedster Set/Mercenary Boots", pieces: ["boots"]});
    categories["Other Armor"].push({hex: "450101", name: "Crypt Witherlord", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "993399", name: "Great Spook", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "CBD2DB", name: "Rabbit Armour", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "C83200", name: "Yog Armour", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "EDAA36", name: "Pumpkin Armour", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "FF9300", name: "Armour of Magma", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "006633", name: "Canopy Chestplate", pieces: ["chestplate"]});
    categories["Other Armor"].push({hex: "006600", name: "Canopy Leggings", pieces: ["leggings"]});
    categories["Other Armor"].push({hex: "331900", name: "Canopy Boots", pieces: ["boots"]});
    categories["Other Armor"].push({hex: "ED6612", name: "Flaming Chestplate", pieces: ["chestplate"]});
    categories["Other Armor"].push({hex: "CE2C2C", name: "Moogma Leggings", pieces: ["leggings"]});
    categories["Other Armor"].push({hex: "276114", name: "Slug Boots", pieces: ["boots"]});
    categories["Other Armor"].push({hex: "117391", name: "Guardian Chestplate", pieces: ["chestplate"]});
    categories["Other Armor"].push({hex: "7AE82C", name: "Creeper Pants (Leggings)", pieces: ["leggings"]});
    categories["Other Armor"].push({hex: "FFA33B", name: "Berserker Chestplate", pieces: ["chestplate"]});
    categories["Other Armor"].push({hex: "FFB727", name: "Berserker Leggings", pieces: ["leggings"]});
    categories["Other Armor"].push({hex: "FFD427", name: "Berserker Boots", pieces: ["boots"]});
    categories["Other Armor"].push({hex: "383838", name: "Cheap Tux Chestplate+Boots", pieces: ["chestplate", "boots"]});
    categories["Other Armor"].push({hex: "C7C7C7", name: "Cheap Tux Leggings", pieces: ["leggings"]});
    categories["Other Armor"].push({hex: "DEBC15", name: "Rising Sun Leggings", pieces: ["leggings"]});
    categories["Other Armor"].push({hex: "9F8609", name: "Rising Sun Boots", pieces: ["boots"]});
    categories["Other Armor"].push({hex: "FEFDFC", name: "Elegant Tux Leggings", pieces: ["leggings"]});
    categories["Other Armor"].push({hex: "332A2A", name: "Fancy Tux Chestplate+Boots", pieces: ["chestplate", "boots"]});
    
    // === OTHER ARMOR (Part 2 of 3) ===
    categories["Other Armor"].push({hex: "D4D4D4", name: "Fancy Tux Leggings", pieces: ["leggings"]});
    categories["Other Armor"].push({hex: "0A0011", name: "Final Destination Chestplate+Boots", pieces: ["chestplate", "boots"]});
    categories["Other Armor"].push({hex: "FF75FF", name: "Final Destination Leggings", pieces: ["leggings"]});
    categories["Other Armor"].push({hex: "FC2F3C", name: "Nutcracker Chestplate", pieces: ["chestplate"]});
    categories["Other Armor"].push({hex: "FFF9EB", name: "Nutcracker Leggings", pieces: ["leggings"]});
    categories["Other Armor"].push({hex: "46343A", name: "Nutcracker Boots", pieces: ["boots"]});
    categories["Other Armor"].push({hex: "2841F1", name: "Aurora Chestplate", pieces: ["chestplate"]});
    categories["Other Armor"].push({hex: "3F56FB", name: "Aurora Leggings", pieces: ["leggings"]});
    categories["Other Armor"].push({hex: "6184FC", name: "Aurora Boots", pieces: ["boots"]});
    categories["Other Armor"].push({hex: "FF6F0C", name: "Crimson Chestplate", pieces: ["chestplate"]});
    categories["Other Armor"].push({hex: "E66105", name: "Crimson Leggings", pieces: ["leggings"]});
    categories["Other Armor"].push({hex: "E65300", name: "Crimson Boots", pieces: ["boots"]});
    categories["Other Armor"].push({hex: "F04729", name: "Fervor Chestplate", pieces: ["chestplate"]});
    categories["Other Armor"].push({hex: "17BF89", name: "Fervor Leggings", pieces: ["leggings"]});
    categories["Other Armor"].push({hex: "07A674", name: "Fervor Boots", pieces: ["boots"]});
    categories["Other Armor"].push({hex: "FFCB0D", name: "Hollow Chestplate", pieces: ["chestplate"]});
    categories["Other Armor"].push({hex: "FFF6A3", name: "Hollow Leggings", pieces: ["leggings"]});
    categories["Other Armor"].push({hex: "E3FFFA", name: "Hollow Boots", pieces: ["boots"]});
    categories["Other Armor"].push({hex: "3E05AF", name: "Terror Chestplate", pieces: ["chestplate"]});
    categories["Other Armor"].push({hex: "5D23D1", name: "Terror Leggings", pieces: ["leggings"]});
    categories["Other Armor"].push({hex: "7C44EC", name: "Terror Boots", pieces: ["boots"]});
    categories["Other Armor"].push({hex: "D9D9D9", name: "Stone/Metal/Steel Chestplate", pieces: ["chestplate"]});
    categories["Other Armor"].push({hex: "04CFD3", name: "Stereo Pants (Leggings)", pieces: ["leggings"]});
    categories["Other Armor"].push({hex: "CC5500", name: "Farmers Boots", pieces: ["boots"]});
    categories["Other Armor"].push({hex: "4F2886", name: "Gunthers Sneakers (Boots)", pieces: ["boots"]});
    categories["Other Armor"].push({hex: "1A004C", name: "Snake-in-a-boot (Boots)", pieces: ["boots"]});
    categories["Other Armor"].push({hex: "BFBFBF", name: "Spirit Boots", pieces: ["boots"]});
    
    // === OTHER ARMOR (Part 3 of 3) ===
    categories["Other Armor"].push({hex: "545454", name: "Squire Boots", pieces: ["boots"]});
    categories["Other Armor"].push({hex: "D48EF2", name: "Celeste Helm", pieces: ["helmet"]});
    categories["Other Armor"].push({hex: "FF8EDE", name: "Celeste Chestplate", pieces: ["chestplate"]});
    categories["Other Armor"].push({hex: "FF8ECA", name: "Celeste Leggings", pieces: ["leggings"]});
    categories["Other Armor"].push({hex: "FF8EB6", name: "Celeste Boots", pieces: ["boots"]});
    categories["Other Armor"].push({hex: "D400FF", name: "Starlight Chestplate+Boots", pieces: ["chestplate", "boots"]});
    categories["Other Armor"].push({hex: "7A2900", name: "Cropie Chestplate", pieces: ["chestplate"]});
    categories["Other Armor"].push({hex: "94451F", name: "Cropie Leggings", pieces: ["leggings"]});
    categories["Other Armor"].push({hex: "BB6535", name: "Cropie Boots", pieces: ["boots"]});
    categories["Other Armor"].push({hex: "03430E", name: "Squash Chestplate", pieces: ["chestplate"]});
    categories["Other Armor"].push({hex: "0C4A16", name: "Squash Leggings", pieces: ["leggings"]});
    categories["Other Armor"].push({hex: "13561E", name: "Squash Boots", pieces: ["boots"]});
    categories["Other Armor"].push({hex: "58890C", name: "Fermento Chestplate", pieces: ["chestplate"]});
    categories["Other Armor"].push({hex: "6A9C1B", name: "Fermento Leggings", pieces: ["leggings"]});
    categories["Other Armor"].push({hex: "83B03B", name: "Fermento Boots", pieces: ["boots"]});
    categories["Other Armor"].push({hex: "808080", name: "Ghostly Boots", pieces: ["boots"]});
    categories["Other Armor"].push({hex: "3333FF", name: "Ugly Boots", pieces: ["boots"]});
    categories["Other Armor"].push({hex: "C13C0F", name: "Salmon Helm+Boots", pieces: ["helmet", "boots"]});
    categories["Other Armor"].push({hex: "A82B76", name: "Salmon Chestplate+Leggings", pieces: ["chestplate", "leggings"]});
    categories["Other Armor"].push({hex: "FF0A0A", name: "Minos Hunter Chestplate+Leggings", pieces: ["chestplate", "leggings"]});
    categories["Other Armor"].push({hex: "304B4E", name: "Minos Hunter Boots", pieces: ["boots"]});
    categories["Other Armor"].push({hex: "0E1736", name: "Primordial Armor 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "7A4120", name: "Kelly Quest Armor 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "1C9759", name: "Fig Armor 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "0E666D", name: "Abyssal Armor 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "0B004F", name: "Angler 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "4DCC4D", name: "Leaflet 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "FFAC00", name: "Biohazard 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "7A7964", name: "Miners/Prospecting", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "FFD700", name: "Farm Armour/Elanor's Set (Rift)", pieces: ["helmet", "chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "37B042", name: "Goblin 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "00BE00", name: "Growth Armour", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "B3B3B3", name: "Heat Armour", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "DF2E06", name: "Rampart 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "07031B", name: "Shimmering Light 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "8B0000", name: "Arachne Armour 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "F7DA33", name: "Blaze Armour 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "03FCF8", name: "Glacite 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "CCE5FF", name: "Mineral Armour 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "FFDC51", name: "Sponge 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "606060", name: "Spooky Armour 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "24DDE5", name: "Thunder 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "A0DAEF", name: "Frozen Blaze 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "5B0DAE", name: "Glossy Mineral Armour 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "6F0F08", name: "Magma Lord 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "1B1B1B", name: "Reaper Armour 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "002CA6", name: "Shark Scale Armour 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "1D1105", name: "Werewolf 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "35530A", name: "Kuudra Follower 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "899E20", name: "Melon Armour 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "10616E", name: "Sea Walker 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "990D00", name: "Sea Emperor/Loch Emperor 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "3588FF", name: "Vanguard 3p", pieces: ["chestplate", "leggings", "boots"]});
    categories["Other Armor"].push({hex: "101555", name: "Water Hydra 3p", pieces: ["chestplate", "leggings", "boots"]});
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
        
        const self = this;
        this.gui = new Gui();
        
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
    const maxScroll = Math.max(0, stages.length - 12);
    
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
        // 1 row for normal colors (9 total)
        const buttonY = screenHeight - 35;
        const totalButtonWidth = (buttonWidth * 9) + (10 * 8);
        const startX = (screenWidth - totalButtonWidth) / 2;
        
        const buttonNames = ["Pure", "Exo Pure", "Dyes", "Fairy", "Crystal", "Dragon", "Dungeon", "Rift", "Other"];
        
        let x = startX;
        this.drawSingleButton(x, buttonY, buttonWidth, buttonHeight, buttonNames[0], 0 === this.currentPage);
        x = x + 100;
        this.drawSingleButton(x, buttonY, buttonWidth, buttonHeight, buttonNames[1], 1 === this.currentPage);
        x = x + 100;
        this.drawSingleButton(x, buttonY, buttonWidth, buttonHeight, buttonNames[2], 2 === this.currentPage);
        x = x + 100;
        this.drawSingleButton(x, buttonY, buttonWidth, buttonHeight, buttonNames[3], 3 === this.currentPage);
        x = x + 100;
        this.drawSingleButton(x, buttonY, buttonWidth, buttonHeight, buttonNames[4], 4 === this.currentPage);
        x = x + 100;
        this.drawSingleButton(x, buttonY, buttonWidth, buttonHeight, buttonNames[5], 5 === this.currentPage);
        x = x + 100;
        this.drawSingleButton(x, buttonY, buttonWidth, buttonHeight, buttonNames[6], 6 === this.currentPage);
        x = x + 100;
        this.drawSingleButton(x, buttonY, buttonWidth, buttonHeight, buttonNames[7], 7 === this.currentPage);
        x = x + 100;
        this.drawSingleButton(x, buttonY, buttonWidth, buttonHeight, buttonNames[8], 8 === this.currentPage);
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
    // 1 row for normal colors
    const buttonY = height - 35;
    const totalButtonWidth = (buttonWidth * 9) + (10 * 8);
    const startX = (width - totalButtonWidth) / 2;
    
    let x = startX;
    if (actualMouseX >= x && actualMouseX <= x + buttonWidth && actualMouseY >= buttonY && actualMouseY <= buttonY + buttonHeight) { this.currentPage = 0; this.scrollOffset = 0; return; }
    x = x + 100;
    if (actualMouseX >= x && actualMouseX <= x + buttonWidth && actualMouseY >= buttonY && actualMouseY <= buttonY + buttonHeight) { this.currentPage = 1; this.scrollOffset = 0; return; }
    x = x + 100;
    if (actualMouseX >= x && actualMouseX <= x + buttonWidth && actualMouseY >= buttonY && actualMouseY <= buttonY + buttonHeight) { this.currentPage = 2; this.scrollOffset = 0; return; }
    x = x + 100;
    if (actualMouseX >= x && actualMouseX <= x + buttonWidth && actualMouseY >= buttonY && actualMouseY <= buttonY + buttonHeight) { this.currentPage = 3; this.scrollOffset = 0; return; }
    x = x + 100;
    if (actualMouseX >= x && actualMouseX <= x + buttonWidth && actualMouseY >= buttonY && actualMouseY <= buttonY + buttonHeight) { this.currentPage = 4; this.scrollOffset = 0; return; }
    x = x + 100;
    if (actualMouseX >= x && actualMouseX <= x + buttonWidth && actualMouseY >= buttonY && actualMouseY <= buttonY + buttonHeight) { this.currentPage = 5; this.scrollOffset = 0; return; }
    x = x + 100;
    if (actualMouseX >= x && actualMouseX <= x + buttonWidth && actualMouseY >= buttonY && actualMouseY <= buttonY + buttonHeight) { this.currentPage = 6; this.scrollOffset = 0; return; }
    x = x + 100;
    if (actualMouseX >= x && actualMouseX <= x + buttonWidth && actualMouseY >= buttonY && actualMouseY <= buttonY + buttonHeight) { this.currentPage = 7; this.scrollOffset = 0; return; }
    x = x + 100;
    if (actualMouseX >= x && actualMouseX <= x + buttonWidth && actualMouseY >= buttonY && actualMouseY <= buttonY + buttonHeight) { this.currentPage = 8; this.scrollOffset = 0; return; }
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
    
    // Calculate how many we can show - always show 12
    const maxVisible = 12;
    const visibleStages = Math.min(stages.length - this.scrollOffset, maxVisible);
    
    // Draw each target color - UNROLLED for 12 items
    if (visibleStages > 0) {
        const stage = stages[this.scrollOffset + 0];
        const y = startY + (0 * rowHeight);
        this.drawChecklistRowCached(stage, y);
    }
    if (visibleStages > 1) {
        const stage = stages[this.scrollOffset + 1];
        const y = startY + (1 * rowHeight);
        this.drawChecklistRowCached(stage, y);
    }
    if (visibleStages > 2) {
        const stage = stages[this.scrollOffset + 2];
        const y = startY + (2 * rowHeight);
        this.drawChecklistRowCached(stage, y);
    }
    if (visibleStages > 3) {
        const stage = stages[this.scrollOffset + 3];
        const y = startY + (3 * rowHeight);
        this.drawChecklistRowCached(stage, y);
    }
    if (visibleStages > 4) {
        const stage = stages[this.scrollOffset + 4];
        const y = startY + (4 * rowHeight);
        this.drawChecklistRowCached(stage, y);
    }
    if (visibleStages > 5) {
        const stage = stages[this.scrollOffset + 5];
        const y = startY + (5 * rowHeight);
        this.drawChecklistRowCached(stage, y);
    }
    if (visibleStages > 6) {
        const stage = stages[this.scrollOffset + 6];
        const y = startY + (6 * rowHeight);
        this.drawChecklistRowCached(stage, y);
    }
    if (visibleStages > 7) {
        const stage = stages[this.scrollOffset + 7];
        const y = startY + (7 * rowHeight);
        this.drawChecklistRowCached(stage, y);
    }
    if (visibleStages > 8) {
        const stage = stages[this.scrollOffset + 8];
        const y = startY + (8 * rowHeight);
        this.drawChecklistRowCached(stage, y);
    }
    if (visibleStages > 9) {
        const stage = stages[this.scrollOffset + 9];
        const y = startY + (9 * rowHeight);
        this.drawChecklistRowCached(stage, y);
    }
    if (visibleStages > 10) {
        const stage = stages[this.scrollOffset + 10];
        const y = startY + (10 * rowHeight);
        this.drawChecklistRowCached(stage, y);
    }
    if (visibleStages > 11) {
        const stage = stages[this.scrollOffset + 11];
        const y = startY + (11 * rowHeight);
        this.drawChecklistRowCached(stage, y);
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
        matches: {},
        stagesProcessed: 0
    };
    
    // Initialize empty matches for all stages
    let s = 0;
    while (s < stages.length) {
        const stage = stages[s];
        this.fadeDyeOptimalCache[categoryName].matches[stage.hex] = {
            helmet: null,
            chestplate: null,
            leggings: null,
            boots: null,
            calculated: false
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
    const stages = this.categories[categoryName];
    
    // Phase 1: Collect all candidates for all stages
    if (stageIndex === 0) {
        this.fadeDyeOptimalCache[categoryName].allCandidates = {
            helmet: [],
            chestplate: [],
            leggings: [],
            boots: []
        };
    }
    
    if (stageIndex >= stages.length) {
        // Phase 2: Assign optimal matches (each piece used only once)
        this.assignOptimalFadeDyeMatches(categoryName);
        
        // All done!
        this.isCalculating = false;
        this.calculationProgress = 0;
        this.calculationTotal = 0;
        
        // Save to disk
this.cacheStorage.matchCache = this.matchCache;
this.cacheStorage.fadeDyeOptimalCache = this.fadeDyeOptimalCache;
this.cacheStorage.normalColorCache = this.normalColorCache;
this.cacheStorage.collectionSize = this.collectionSize;
this.cacheStorage.lastUpdated = Date.now();
this.cacheStorage.save();
        
        return;
    }
    
    const stage = stages[stageIndex];
    const targetLab = this.hexToLab(stage.hex);
    const pieceTypes = ["helmet", "chestplate", "leggings", "boots"];
    
    // Find ALL possible matches for each piece type for THIS stage
    let p = 0;
    while (p < 4) {
        const pieceType = pieceTypes[p];
        
        const keys = Object.keys(this.collection);
        let k = 0;
        while (k < keys.length) {
            const uuid = keys[k];
            const piece = this.collection[uuid];
            
            if (piece && typeof piece === 'object' && piece.pieceName && piece.hexcode) {
                const detectedType = this.getPieceType(piece.pieceName);
                
                if (detectedType === pieceType) {
                    const pieceLab = this.hexToLab(piece.hexcode);
                    const deltaE = Math.sqrt(
                        Math.pow(targetLab.L - pieceLab.L, 2) + 
                        Math.pow(targetLab.a - pieceLab.a, 2) + 
                        Math.pow(targetLab.b - pieceLab.b, 2)
                    );
                    
                    if (deltaE <= 5) {
                        this.fadeDyeOptimalCache[categoryName].allCandidates[pieceType].push({
                            stageHex: stage.hex,
                            uuid: uuid,
                            piece: piece,
                            deltaE: deltaE
                        });
                    }
                }
            }
            
            k = k + 1;
        }
        
        p = p + 1;
    }
    
    // Mark this stage as having candidates collected (but not assigned yet)
    this.calculationProgress = stageIndex + 1;
    
    // Continue with next stage
    const self = this;
    setTimeout(function() {
        self.calculateNextFadeDyeStage(categoryName, stageIndex + 1);
    }, 5);
}

assignOptimalFadeDyeMatches(categoryName) {
    const cache = this.fadeDyeOptimalCache[categoryName];
    const pieceTypes = ["helmet", "chestplate", "leggings", "boots"];
    
    // For each piece type, assign optimally (each piece used only once)
    let p = 0;
    while (p < 4) {
        const pieceType = pieceTypes[p];
        const candidates = cache.allCandidates[pieceType];
        
        // Sort by deltaE (best matches first)
        candidates.sort(function(a, b) {
            return a.deltaE - b.deltaE;
        });
        
        const usedPieces = {};
        const assignedStages = {};
        
        // Assign greedily: best match first
        let c = 0;
        while (c < candidates.length) {
            const candidate = candidates[c];
            
            // Only assign if piece hasn't been used AND stage hasn't been assigned
            if (!usedPieces[candidate.uuid] && !assignedStages[candidate.stageHex]) {
                cache.matches[candidate.stageHex][pieceType] = {
                    name: candidate.piece.pieceName,
                    hex: candidate.piece.hexcode,
                    deltaE: candidate.deltaE,
                    uuid: candidate.uuid
                };
                
                usedPieces[candidate.uuid] = true;
                assignedStages[candidate.stageHex] = true;
            }
            
            c = c + 1;
        }
        
        p = p + 1;
    }
    
    // Mark all stages as calculated
    const stageHexes = Object.keys(cache.matches);
    let s = 0;
    while (s < stageHexes.length) {
        cache.matches[stageHexes[s]].calculated = true;
        s = s + 1;
    }
    
    // Clean up temporary data
    delete cache.allCandidates;
}

startNormalColorCalculation(categoryName) {
    if (this.isCalculating) return; // Already calculating
    
    this.isCalculating = true;
    this.calculationProgress = 0;
    
    const stages = this.categories[categoryName];
    this.calculationTotal = stages.length;
    
    // Initialize cache immediately so rows can be drawn
    this.normalColorCache[categoryName] = {
        category: categoryName,
        matches: {}
    };
    
    // Initialize empty matches for all stages
    let s = 0;
    while (s < stages.length) {
        const stage = stages[s];
        this.normalColorCache[categoryName].matches[stage.hex] = {
            helmet: null,
            chestplate: null,
            leggings: null,
            boots: null,
            calculated: false
        };
        s = s + 1;
    }
    
    // Start async calculation stage by stage
    const self = this;
    setTimeout(function() {
        self.calculateNextNormalColorStage(categoryName, 0);
    }, 10);
}

calculateNextNormalColorStage(categoryName, stageIndex) {
    const stages = this.categories[categoryName];
    
    // Phase 1: Collect all candidates for all stages
    if (stageIndex === 0) {
        this.normalColorCache[categoryName].allCandidates = {
            helmet: [],
            chestplate: [],
            leggings: [],
            boots: []
        };
    }
    
    if (stageIndex >= stages.length) {
        // Phase 2: Assign optimal matches (each piece used only once per category)
        this.assignOptimalNormalColorMatches(categoryName);
        
        // All done!
        this.isCalculating = false;
        this.calculationProgress = 0;
        this.calculationTotal = 0;
        
        // Save to disk
        this.cacheStorage.normalColorCache = this.normalColorCache;
        this.cacheStorage.lastUpdated = Date.now();
        this.cacheStorage.save();
        
        ChatLib.chat("§a[Armor Checklist] §7Calculation complete!");
        return;
    }
    
    const stage = stages[stageIndex];
    const targetLab = this.hexToLab(stage.hex);
    const pieceTypes = ["helmet", "chestplate", "leggings", "boots"];
    
    // Find ALL possible matches for each piece type for THIS stage
    let p = 0;
    while (p < 4) {
        const pieceType = pieceTypes[p];
        
        const keys = Object.keys(this.collection);
        let k = 0;
        while (k < keys.length) {
            const uuid = keys[k];
            const piece = this.collection[uuid];
            
            if (piece && typeof piece === 'object' && piece.pieceName && piece.hexcode) {
                const detectedType = this.getPieceType(piece.pieceName);
                
                if (detectedType === pieceType) {
                    const pieceLab = this.hexToLab(piece.hexcode);
                    const deltaE = Math.sqrt(
                        Math.pow(targetLab.L - pieceLab.L, 2) + 
                        Math.pow(targetLab.a - pieceLab.a, 2) + 
                        Math.pow(targetLab.b - pieceLab.b, 2)
                    );
                    
                    if (deltaE <= 5) {
                        this.normalColorCache[categoryName].allCandidates[pieceType].push({
                            stageHex: stage.hex,
                            uuid: uuid,
                            piece: piece,
                            deltaE: deltaE
                        });
                    }
                }
            }
            
            k = k + 1;
        }
        
        p = p + 1;
    }
    
    // Mark this stage as having candidates collected (but not assigned yet)
    this.calculationProgress = stageIndex + 1;
    
    // Continue with next stage
    const self = this;
    setTimeout(function() {
        self.calculateNextNormalColorStage(categoryName, stageIndex + 1);
    }, 5);
}

assignOptimalNormalColorMatches(categoryName) {
    const cache = this.normalColorCache[categoryName];
    const pieceTypes = ["helmet", "chestplate", "leggings", "boots"];
    
    // For each piece type, assign optimally (each piece used only once per category)
    let p = 0;
    while (p < 4) {
        const pieceType = pieceTypes[p];
        const candidates = cache.allCandidates[pieceType];
        
        // Sort by deltaE (best matches first)
        candidates.sort(function(a, b) {
            return a.deltaE - b.deltaE;
        });
        
        const usedPieces = {};
        const assignedStages = {};
        
        // Assign greedily: best match first
        let c = 0;
        while (c < candidates.length) {
            const candidate = candidates[c];
            
            // Only assign if piece hasn't been used AND stage hasn't been assigned
            if (!usedPieces[candidate.uuid] && !assignedStages[candidate.stageHex]) {
                cache.matches[candidate.stageHex][pieceType] = {
                    name: candidate.piece.pieceName,
                    hex: candidate.piece.hexcode,
                    deltaE: candidate.deltaE,
                    uuid: candidate.uuid
                };
                
                usedPieces[candidate.uuid] = true;
                assignedStages[candidate.stageHex] = true;
            }
            
            c = c + 1;
        }
        
        p = p + 1;
    }
    
    // Mark all stages as calculated
    const stageHexes = Object.keys(cache.matches);
    let s = 0;
    while (s < stageHexes.length) {
        cache.matches[stageHexes[s]].calculated = true;
        s = s + 1;
    }
    
    // Clean up temporary data
    delete cache.allCandidates;
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
        
        // Check if cache exists and this stage is calculated
        const cacheExists = this.fadeDyeOptimalCache[currentCategory] && 
                           this.fadeDyeOptimalCache[currentCategory].matches[cacheKey];
        const hasData = cacheExists && (
            this.fadeDyeOptimalCache[currentCategory].matches[cacheKey].helmet !== undefined ||
            this.fadeDyeOptimalCache[currentCategory].matches[cacheKey].calculated === true
        );
        
        if (hasData) {
            const optimal = this.fadeDyeOptimalCache[currentCategory].matches[cacheKey];
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
    if (match.deltaE <= 2) {
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
}