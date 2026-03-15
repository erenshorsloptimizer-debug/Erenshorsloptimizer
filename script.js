// script.js - The main controller/entry point

// ==================== IMPORTS ====================
import {
    showMessage,
    renderClassBar,
    renderClassDescription,
    renderProficiencyEditor,
    renderAscensions,
    toggleAscensionsPanel,
    renderLoadoutBuilder,
    renderEmptyLoadoutBuilder,
    renderCurrentGear,
    renderStatWeightEditors,
} from './uiRenderer.js';
import { getState, setClass, setProficiencies, getCurrentGear, equipItem, unequipItem } from './characterState.js';
window.equipItem = equipItem;
window.unequipItem = unequipItem;
window.getCurrentGear = getCurrentGear;
import AscendencyData from './Ascendency_Data.js';
import OptimizerEngine from './OptimizerEngine.js';
import { gearData } from './gear-data-with-effects.js';
window.gearData = gearData;
import { ITEM_IMAGES } from './itemImages.js';
window.ITEM_IMAGES = ITEM_IMAGES;
window.equipItem = equipItem;
window.unequipItem = unequipItem;
window.getCurrentGear = getCurrentGear;

let currentProficiencyAllocations = {};
// Initialize allocations based on base proficiencies (all zeros)
function initializeAllocations(baseProfs) {
    const alloc = {};
    for (let key in baseProfs) {
        alloc[key] = 0;
    }
    return alloc;
}
// ===== GEAR DATABASE FILTERING =====
window.filterAndRenderGearList = function () {
    const search = document.getElementById('filter-name')?.value.toLowerCase() || '';
    const slot = document.getElementById('filter-slot')?.value || '';
    // Filter gearData (global)
    const filtered = gearData.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(search);
        const matchesSlot = slot === '' || item.slot === slot;
        return matchesSearch && matchesSlot;
    });
    renderGearList(filtered);
};

window.clearAllFilters = function () {
    const nameInput = document.getElementById('filter-name');
    const slotSelect = document.getElementById('filter-slot');
    if (nameInput) nameInput.value = '';
    if (slotSelect) slotSelect.value = '';
    filterAndRenderGearList();
};

// Update an allocation and recalculate total proficiencies
function updateProficiencyAllocation(profKey, delta) {
    // Get current allocation for this key
    const oldAlloc = currentProficiencyAllocations[profKey] || 0;
    const newAlloc = oldAlloc + delta;
    if (newAlloc < 0) return; // Can't go below zero

    // Calculate sum of all allocations after change
    const oldSum = Object.values(currentProficiencyAllocations).reduce((a, b) => a + b, 0);
    const newSum = oldSum - oldAlloc + newAlloc;
    const levelInput = document.getElementById('char-level');
    const currentLevel = levelInput ? parseInt(levelInput.value) || 35 : 35;
    const maxPoints = calculateProficiencyPoints(currentLevel);
    if (newSum > maxPoints) return;

    // Update the allocation
    currentProficiencyAllocations[profKey] = newAlloc;

    // Get base proficiencies for current class
    const state = getState();
    const className = state.className;
    const baseProfs = CLASS_PROFICIENCIES[className] || {};

    // Compute new total proficiencies (base + allocated)
    const totalProfs = {};
    for (let key in baseProfs) {
        totalProfs[key] = baseProfs[key] + (currentProficiencyAllocations[key] || 0);
    }

    // Save to character state
    setProficiencies(totalProfs);

    // Re-render the editor with updated values
    const pointsRemaining = TOTAL_ALLOCATION_POINTS - newSum;
    renderProficiencyEditor(
        baseProfs,
        currentProficiencyAllocations,
        maxPoints - newSum,  // points remaining
        maxPoints,
        updateProficiencyAllocation
    );
}
// Calculate total proficiency points based on character level
function calculateProficiencyPoints(level) {
    // Base 10 at creation, +1 every other level starting at level 3
    // Formula: 10 + floor((level - 1) / 2)
    return 10 + Math.floor((level - 1) / 2);
}

// Called when character level changes
function updateProficiencyFromLevel() {
    const levelInput = document.getElementById('char-level');
    if (!levelInput) return;

    const level = parseInt(levelInput.value) || 1;
    const newTotalPoints = calculateProficiencyPoints(level);

    // Update the global constant? No, we'll store current total points separately.
    // But we need to use this new total in the editor. We'll pass it dynamically.

    // Get current class and base proficiencies
    const state = getState();
    const className = state.className;
    const baseProfs = CLASS_PROFICIENCIES[className] || {};

    // Reset allocations to zero (simplest approach when level changes)
    currentProficiencyAllocations = initializeAllocations(baseProfs);

    // Compute total proficiencies (base + 0)
    const totalProfs = {};
    for (let key in baseProfs) {
        totalProfs[key] = baseProfs[key];
    }
    setProficiencies(totalProfs);

    // Render the editor with the new total points
    const pointsRemaining = newTotalPoints; // all points available
    renderProficiencyEditor(
        baseProfs,
        currentProficiencyAllocations,
        pointsRemaining,
        newTotalPoints,  // pass the dynamic total
        updateProficiencyAllocation
    );

    // Optional: show a message that allocations have been reset
    showMessage(`Proficiency points reset to ${newTotalPoints} for level ${level}`, true);
}

// Make globally accessible for HTML oninput
window.onCharLevelChange = function () {
    updateProficiencyFromLevel();
};

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
        if (window.updateCurrentGearScore) window.updateCurrentGearScore();
    });

    // ===== NEW PROFICIENCY EDITOR CODE =====
    // Get base proficiencies for the class
    const baseProfs = CLASS_PROFICIENCIES[className] || {};

    // Reset allocations for the new class
    currentProficiencyAllocations = initializeAllocations(baseProfs);

    // Compute initial totals (base + 0)
    const totalProfs = {};
    for (let key in baseProfs) {
        totalProfs[key] = baseProfs[key] + (currentProficiencyAllocations[key] || 0);
    }
    setProficiencies(totalProfs);

    // Render the new editor
    // Get current level from input
    const levelInput = document.getElementById('char-level');
    const currentLevel = levelInput ? parseInt(levelInput.value) || 35 : 35;
    const totalPoints = calculateProficiencyPoints(currentLevel);

    renderProficiencyEditor(
        baseProfs,
        currentProficiencyAllocations,
        totalPoints,  // all points available
        totalPoints,
        updateProficiencyAllocation
    );
    // ===== END NEW CODE =====

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

    // === TUTORIAL PANEL TOGGLE ===
    const tutorialHeader = document.getElementById('tutorial-header');
    if (tutorialHeader) {
        tutorialHeader.addEventListener('click', function () {
            const tutorialBody = this.nextElementSibling;
            const chevron = this.querySelector('.chevron');
            if (tutorialBody.style.display === 'none') {
                tutorialBody.style.display = 'block';
                chevron.textContent = '▼ hide';
            } else {
                tutorialBody.style.display = 'none';
                chevron.textContent = '▶ show';
            }
        });
    }

    // === STAT PANEL TOGGLE ===
    const statHeader = document.getElementById('stat-panel-header');
    if (statHeader) {
        statHeader.addEventListener('click', window.toggleStatPanel);
    }

    // === OPTIMIZE PANEL TOGGLE ===
    const optimizeHeader = document.getElementById('optimize-panel-header');
    if (optimizeHeader) {
        optimizeHeader.addEventListener('click', window.toggleOptimizePanel);
    }

    // === INITIAL LAYOUT ADJUSTMENTS ===
    window.adjustPanelLayout();        // top row (Stat + Prof)
    window.adjustAscOptLayout();       // Ascensions + Optimize row

    // === PROFICIENCY PANEL INIT ===
    updateProficiencyFromLevel();

    // === RENDER CURRENT GEAR (initially empty) ===
    renderCurrentGear(getCurrentGear());
    // Render empty loadout builder initially
    renderEmptyLoadoutBuilder();
    filterAndRenderGearList();
}

// Start the app
initializeApp();