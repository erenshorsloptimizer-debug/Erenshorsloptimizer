// script.js - The main controller/entry point

// ==================== IMPORTS ====================
import {
    showMessage,
    renderClassBar,
    renderClassDescription,
    renderProficiencies,
    renderAscensions,
    toggleAscensionsPanel,
    renderLoadoutBuilder,
    renderCurrentGear,          // <-- added
    renderStatWeightEditors      // <-- added
} from './uiRenderer.js';
import { getState, setClass } from './characterState.js';
import AscendencyData from './Ascendency_Data.js';
import OptimizerEngine from './OptimizerEngine.js';
import { gearData } from './gear-data-with-effects.js';

// ==================== DATA ====================
const ERENSHOR_CLASSES = [
    "Windblade", "Paladin", "Reaver", "Druid", "Stormcaller", "Arcanist"
];

const CLASS_DESCRIPTIONS = {
    Windblade: 'Dual-wield melee DPS. Primary stats: DEX (2:1 over STR), AGI. Aura: Presence of Vitheo grants DEX/AGI and Attack Speed.',
    Paladin: 'Tanky melee with heals. Primary stats: STR and END for survivability, with some INT/WIS for healing. Aura: Presence of Soluna grants STR/END.',
    Reaver: 'Dark melee DPS. Primary stats: STR for damage, END for sustain. Aura: Rising Shadows grants party-wide proc effects.',
    Druid: 'Nature caster/healer. Primary stats: INT and WIS for spells, AGI for some builds. Aura: Presence of Fernalla grants Lifesteal.',
    Stormcaller: 'Elemental caster DPS. Primary stats: INT for spell power, AGI from aura. Aura: Presence of Storms grants AGI and Magic Resist.',
    Arcanist: 'Pure magic DPS/utility. Primary stats: INT for damage, WIS and CHA for mana sustain. Aura: Presence of Brax grants INT/WIS/CHA.'
};

const CLASS_STAT_WEIGHTS = {
    Windblade: { dex: 10, str: 7, res: 1, agi: 4, end: 1, int: 0, wis: 0, cha: 0, haste: 8, armor: 0 },
    Paladin: { str: 8, end: 8, dex: 4, agi: 2, int: 3, wis: 3, cha: 1, res: 2, haste: 0, armor: 8 },
    Reaver: { str: 10, end: 6, dex: 4, agi: 3, int: 1, wis: 0, cha: 0, res: 1, haste: 8, armor: 8 },
    Druid: { int: 10, wis: 8, agi: 4, end: 3, str: 2, dex: 1, cha: 2, res: 8, haste: 0, armor: 0 },
    Stormcaller: { int: 10, agi: 6, wis: 5, dex: 2, end: 2, str: 1, cha: 2, res: 4, haste: 8, armor: 0 },
    Arcanist: { int: 10, wis: 7, cha: 5, end: 2, agi: 1, str: 0, dex: 0, res: 8, haste: 0, armor: 0 }
};

const CLASS_PROFICIENCIES = {
    Windblade: { physicality: 10, hardiness: 8, finesse: 12, defense: 6, arcanism: 8, restoration: 6, mind: 5 },
    Paladin: { physicality: 10, hardiness: 10, finesse: 12, defense: 6, arcanism: 6, restoration: 10, mind: 6 },
    Reaver: { physicality: 14, hardiness: 8, finesse: 12, defense: 4, arcanism: 8, restoration: 6, mind: 5 },
    Druid: { physicality: 5, hardiness: 10, finesse: 5, defense: 10, arcanism: 7, restoration: 10, mind: 5 },
    Stormcaller: { physicality: 6, hardiness: 6, finesse: 12, defense: 6, arcanism: 10, restoration: 6, mind: 6 },
    Arcanist: { physicality: 3, hardiness: 10, finesse: 3, defense: 3, arcanism: 14, restoration: 9, mind: 10 }
};

// Current user-defined stat weights (will be initialized from class defaults)
let currentStatWeights = {};
let lastOptimizerResult = null;
window.computeLoadoutScore = function (loadout, tier, statWeights) {
    let total = 0;
    for (let slot in loadout) {
        if (loadout[slot]) {
            total += OptimizerEngine.scoreItem(loadout[slot], tier, statWeights);
        }
    }
    return total;
};

// ==================== INITIALIZATION ====================
console.log("🚀 Sloptimizer initializing with modules...");
console.log(`✅ Loaded ${gearData.length} gear items`);

function setupEventListeners() {
    document.addEventListener('classSelected', (event) => {
        const className = event.detail.className;
        handleClassSelection(className);
    });
}

// Handle class selection
function handleClassSelection(className) {
    console.log(`Class selected: ${className}`);

    setClass(className);
    const currentState = getState();

    renderClassBar(ERENSHOR_CLASSES, className);
    renderClassDescription(CLASS_DESCRIPTIONS[className] || 'No description available');

    // Initialize current stat weights from class defaults
    const defaultWeights = CLASS_STAT_WEIGHTS[className] || {};
    currentStatWeights = { ...defaultWeights };

    // Render editable stat weight panel
    renderStatWeightEditors(currentStatWeights, (newWeights) => {
        currentStatWeights = newWeights;
        console.log('Stat weights updated:', currentStatWeights);
    });

    renderProficiencies(CLASS_PROFICIENCIES[className] || {});
    const ascensions = getAscensionsForClass(className);
    renderAscensions(ascensions);

    showMessage(`Switched to ${className}`, true);
}

// Reset stat weights to class defaults
window.resetStatWeights = function () {
    const state = getState();
    const className = state.className;
    const defaultWeights = CLASS_STAT_WEIGHTS[className] || {};
    currentStatWeights = { ...defaultWeights };
    renderStatWeightEditors(currentStatWeights, (newWeights) => {
        currentStatWeights = newWeights;
    });
    showMessage('Stat weights reset to class defaults', true);
};

// Find best loadout (calls OptimizerEngine)
function findBestLoadout() {
    console.log("Finding best loadout via OptimizerEngine...");

    const state = getState();
    const className = state.className;
    const charLevel = state.level;

    const levelMin = parseInt(document.getElementById('filter-level-min').value) || 1;
    const levelMax = parseInt(document.getElementById('filter-level').value) || 35;

    let tier = 'base';
    if (document.getElementById('tier-blessed').classList.contains('active')) {
        tier = 'blessed';
    } else if (document.getElementById('tier-double').classList.contains('active')) {
        tier = 'godly';
    }

    let weaponPref = 'any';
    if (document.getElementById('wpref-1h')?.classList.contains('active')) {
        weaponPref = '1h';
    } else if (document.getElementById('wpref-2h')?.classList.contains('active')) {
        weaponPref = '2h';
    }

    const statWeights = currentStatWeights;

    console.log(`Optimizing for ${className}, level ${charLevel}, gear level ${levelMin}-${levelMax}, tier: ${tier}, weapon pref: ${weaponPref}`);
    console.log('Using stat weights:', statWeights);

    const result = OptimizerEngine.findBestLoadout({
        className,
        charLevel,
        levelMin,
        levelMax,
        tier,
        weaponPref,
        statWeights
    });

    lastOptimizerResult = result;

    // ✅ Correct: pass four arguments
    renderLoadoutBuilder(result.bestLoadout, result.candidates, tier, statWeights);

    showMessage('Loadout found!', true);

    return result.bestLoadout;
}

// Make optimizeAndScroll globally available
window.optimizeAndScroll = function () {
    findBestLoadout();
    const resultsEl = document.getElementById('results');
    if (resultsEl) {
        resultsEl.scrollIntoView({ behavior: 'smooth' });
    }
};

function debugAscensions() {
    console.log("=== ASCENSION DEBUG ===");
    console.log("AscendencyData length:", AscendencyData?.length);
    console.log("First item:", AscendencyData?.[0]);

    const byClass = {};
    AscendencyData.forEach(asc => {
        const classId = asc.usedBy;
        if (!byClass[classId]) {
            byClass[classId] = [];
        }
        byClass[classId].push(asc.name);
    });

    console.log("Grouped by class ID:", byClass);
}

function getAscensionsForClass(className) {
    const classIdMap = {
        "Windblade": 1,
        "Arcanist": 2,
        "Paladin": 3,
        "Reaver": 4,
        "Druid": 5,
        "Stormcaller": 6
    };

    const classId = classIdMap[className];
    if (!classId) {
        console.log(`No class ID mapping for ${className}`);
        return [];
    }

    const classAscensions = AscendencyData.filter(asc => asc.usedBy === classId);
    const generalAscensions = AscendencyData.filter(asc => asc.usedBy === 0);
    const allAscensions = [...classAscensions, ...generalAscensions];

    console.log(`Found ${classAscensions.length} class-specific + ${generalAscensions.length} general ascensions for ${className}`);
    console.log(`Total: ${allAscensions.length} ascensions`);

    return allAscensions;
}

console.log("🔍 DEBUG: Checking initialization...");
console.log("- DOM ready?", document.readyState);
console.log("- Class bar element:", document.getElementById('class-bar'));
console.log("- ERENSHOR_CLASSES:", ERENSHOR_CLASSES);
console.log("- renderClassBar type:", typeof renderClassBar);

// ==================== START THE APP ====================
function initializeApp() {
    console.log("Initializing app...");

    setupEventListeners();
    handleClassSelection('Paladin');
}

initializeApp();