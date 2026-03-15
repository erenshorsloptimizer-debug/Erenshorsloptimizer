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
import AscendencyData from './Ascendency_Data.js';
import OptimizerEngine from './OptimizerEngine.js';
import { gearData } from './gear-data-with-effects.js';
import { ITEM_IMAGES } from './itemImages.js';

// ==================== GLOBAL WINDOW ASSIGNMENTS ====================
window.equipItem = equipItem;
window.unequipItem = unequipItem;
window.getCurrentGear = getCurrentGear;
window.gearData = gearData;
window.ITEM_IMAGES = ITEM_IMAGES;
window.filterAndRenderGearList = filterAndRenderGearList;

// ==================== CONSTANTS ====================
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

const GENERAL_ASCENSION_POINTS_REQUIRED = 8; // Must spend 8 points in general before class ascensions

// ==================== STATE VARIABLES ====================
let currentProficiencyAllocations = {};
let currentStatWeights = {};
let lastOptimizerResult = null;
let ascensionState = {
    general: {},
    class: {},
    totalSpent: 0,
    generalSpent: 0
};

// ==================== INITIALIZATION ====================
console.log("🚀 Sloptimizer initializing with modules...");
console.log(`✅ Loaded ${gearData.length} gear items`);

function initializeAllocations(baseProfs) {
    const alloc = {};
    for (let key in baseProfs) {
        alloc[key] = 0;
    }
    return alloc;
}

// ==================== PROFICIENCY FUNCTIONS ====================
function calculateProficiencyPoints(level) {
    // Base 10 at creation, +1 every other level starting at level 3
    // Formula: 10 + floor((level - 1) / 2)
    return 10 + Math.floor((level - 1) / 2);
}

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
    renderProficiencyEditor(
        baseProfs,
        currentProficiencyAllocations,
        maxPoints - newSum,  // points remaining
        maxPoints,
        updateProficiencyAllocation
    );
}

function updateProficiencyFromLevel() {
    const levelInput = document.getElementById('char-level');
    if (!levelInput) return;

    const level = parseInt(levelInput.value) || 1;
    const newTotalPoints = calculateProficiencyPoints(level);

    const state = getState();
    const className = state.className;
    const baseProfs = CLASS_PROFICIENCIES[className] || {};

    currentProficiencyAllocations = initializeAllocations(baseProfs);

    const totalProfs = {};
    for (let key in baseProfs) {
        totalProfs[key] = baseProfs[key];
    }
    setProficiencies(totalProfs);

    const pointsRemaining = newTotalPoints;
    renderProficiencyEditor(
        baseProfs,
        currentProficiencyAllocations,
        pointsRemaining,
        newTotalPoints,
        updateProficiencyAllocation
    );

    showMessage(`Proficiency points reset to ${newTotalPoints} for level ${level}`, true);
}

// ==================== ASCENSION FUNCTIONS ====================
function handleAscensionChange(ascensionId, delta, isGeneral) {
    const ascension = AscendencyData.find(a => a.id === ascensionId);
    if (!ascension) return;

    const currentRank = isGeneral ?
        (ascensionState.general[ascensionId] || 0) :
        (ascensionState.class[ascensionId] || 0);

    const newRank = currentRank + delta;
    if (newRank < 0 || newRank > (ascension.maxRank || 3)) return;

    // Check if we're trying to add a class point before meeting general requirement
    if (!isGeneral && delta > 0 && ascensionState.generalSpent < GENERAL_ASCENSION_POINTS_REQUIRED) {
        showMessage(`Spend ${GENERAL_ASCENSION_POINTS_REQUIRED} points in General Ascensions first!`, true);
        return;
    }

    // Update state
    if (isGeneral) {
        ascensionState.general[ascensionId] = newRank;
        ascensionState.generalSpent += delta;
    } else {
        ascensionState.class[ascensionId] = newRank;
    }
    ascensionState.totalSpent += delta;

    // Re-render ascensions
    const state = getState();
    const className = state.className;
    const ascensions = getAscensionsForClass(className);
    renderAscensions(ascensions, [], ascensionState, handleAscensionChange);

    showMessage(`${delta > 0 ? 'Increased' : 'Decreased'} ${ascension.name}`, true);
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

// ==================== CLASS FUNCTIONS ====================
function handleClassSelection(className) {
    console.log(`Class selected: ${className}`);

    setClass(className);
    const currentState = getState();

    renderClassBar(ERENSHOR_CLASSES, className);
    renderClassDescription(CLASS_DESCRIPTIONS[className] || 'No description available');

    // Reset ascension state when changing classes
    ascensionState = {
        general: {},
        class: {},
        totalSpent: 0,
        generalSpent: 0
    };

    // Initialize current stat weights from class defaults
    const defaultWeights = CLASS_STAT_WEIGHTS[className] || {};
    currentStatWeights = { ...defaultWeights };

    // Render editable stat weight panel
    renderStatWeightEditors(currentStatWeights, (newWeights) => {
        currentStatWeights = newWeights;
        console.log('Stat weights updated:', currentStatWeights);
        if (window.updateCurrentGearScore) window.updateCurrentGearScore();
    });

    // Proficiency editor
    const baseProfs = CLASS_PROFICIENCIES[className] || {};
    currentProficiencyAllocations = initializeAllocations(baseProfs);

    const totalProfs = {};
    for (let key in baseProfs) {
        totalProfs[key] = baseProfs[key] + (currentProficiencyAllocations[key] || 0);
    }
    setProficiencies(totalProfs);

    const levelInput = document.getElementById('char-level');
    const currentLevel = levelInput ? parseInt(levelInput.value) || 35 : 35;
    const totalPoints = calculateProficiencyPoints(currentLevel);

    renderProficiencyEditor(
        baseProfs,
        currentProficiencyAllocations,
        totalPoints,
        totalPoints,
        updateProficiencyAllocation
    );

    // Ascensions - now with state and change handler
    const ascensions = getAscensionsForClass(className);
    renderAscensions(ascensions, [], ascensionState, handleAscensionChange);

    // Update class filter dropdown
    const classFilter = document.getElementById('filter-class');
    if (classFilter) {
        classFilter.value = className;
    }

    // Refresh gear list
    filterAndRenderGearList();

    showMessage(`Switched to ${className}`, true);
}

// ==================== GEAR FILTERING ====================
function filterAndRenderGearList() {
    const search = document.getElementById('filter-name')?.value.toLowerCase() || '';
    const slot = document.getElementById('filter-slot')?.value || '';
    const selectedClass = document.getElementById('filter-class')?.value || '';
    const currentState = getState();
    const currentClass = currentState.className;

    // Use selected class from dropdown if provided, otherwise use current class
    const classFilter = selectedClass || currentClass;

    const filtered = gearData.filter(item => {
        // Search filter
        const matchesSearch = item.name.toLowerCase().includes(search);

        // Slot filter
        const matchesSlot = slot === '' || item.slot === slot;

        // Class filter - check if item is usable by the selected class
        let matchesClass = true;
        if (classFilter) {
            // If item has class restrictions
            if (item.classes && item.classes.length > 0) {
                matchesClass = item.classes.includes(classFilter) || item.classes.includes("All");
            }
            // If no class restrictions, item is usable by everyone
        }

        return matchesSearch && matchesSlot && matchesClass;
    });

    renderGearList(filtered);
}

function clearAllFilters() {
    const nameInput = document.getElementById('filter-name');
    const slotSelect = document.getElementById('filter-slot');
    const classSelect = document.getElementById('filter-class');

    if (nameInput) nameInput.value = '';
    if (slotSelect) slotSelect.value = '';
    if (classSelect) classSelect.value = '';

    filterAndRenderGearList();
}

// ==================== OPTIMIZER FUNCTIONS ====================
function findBestLoadout() {
    console.log("Finding best loadout via OptimizerEngine...");

    const state = getState();
    const className = state.className;
    const charLevel = state.level;

    const levelMin = parseInt(document.getElementById('filter-level-min').value) || 1;
    const levelMax = parseInt(document.getElementById('filter-level').value) || 100;

    // Get the current global tier setting
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

    // Set all slots in the new loadout to use the global tier
    if (result && result.bestLoadout) {
        Object.keys(result.bestLoadout).forEach(slot => {
            if (result.bestLoadout[slot] && window.setSlotTier) {
                window.setSlotTier(slot, tier);
            }
        });
    }

    renderLoadoutBuilder(result.bestLoadout, result.candidates, tier, statWeights);

    showMessage(`Loadout found with ${tier} tier items!`, true);

    return result.bestLoadout;
}

// ==================== SCORE FUNCTIONS ====================
window.computeLoadoutScore = function (loadout, tier, statWeights) {
    let total = 0;
    if (!loadout || !statWeights) return 0;

    for (let slot in loadout) {
        if (loadout[slot]) {
            try {
                total += OptimizerEngine.scoreItem(loadout[slot], tier, statWeights);
            } catch (e) {
                console.warn(`Error scoring item in slot ${slot}:`, e);
            }
        }
    }
    return total;
};

// ==================== UI EVENT HANDLERS ====================
window.onCharLevelChange = function () {
    const input = document.getElementById('char-level');
    let level = parseInt(input.value) || 1;
    level = Math.max(1, Math.min(35, level));
    input.value = level;

    updateProficiencyFromLevel();
};

window.onGearLevelChange = function () {
    const minInput = document.getElementById('filter-level-min');
    const maxInput = document.getElementById('filter-level');

    let minVal = parseInt(minInput.value) || 1;
    let maxVal = parseInt(maxInput.value) || 100;

    // Ensure values are within bounds (1-100 for gear)
    minVal = Math.max(1, Math.min(100, minVal));
    maxVal = Math.max(minVal, Math.min(100, maxVal));

    // Update inputs with clamped values
    minInput.value = minVal;
    maxInput.value = maxVal;

    console.log(`Gear level range updated: ${minVal} - ${maxVal}`);

    if (window.filterAndRenderGearList) {
        window.filterAndRenderGearList();
    }
};

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

window.optimizeAndScroll = function () {
    findBestLoadout();
    const resultsEl = document.getElementById('results');
    if (resultsEl) {
        resultsEl.scrollIntoView({ behavior: 'smooth' });
    }
};

window.setTier = function (tier) {
    console.log("setTier called:", tier);

    document.querySelectorAll('.tier-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`tier-${tier}`)?.classList.add('active');

    showMessage(`New items will be placed as ${tier} tier. Use slot dropdowns to change existing items.`, true);

    // Refresh gear list to show correct tier stats in preview
    filterAndRenderGearList();
};

window.clearAllFilters = clearAllFilters;
window.filterAndRenderGearList = filterAndRenderGearList;

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    document.addEventListener('classSelected', (event) => {
        const className = event.detail.className;
        handleClassSelection(className);
    });

    // Tutorial panel toggle
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

    // Stat panel toggle
    const statHeader = document.getElementById('stat-panel-header');
    if (statHeader) {
        statHeader.addEventListener('click', window.toggleStatPanel);
    }

    // Optimize panel toggle
    const optimizeHeader = document.getElementById('optimize-panel-header');
    if (optimizeHeader) {
        optimizeHeader.addEventListener('click', window.toggleOptimizePanel);
    }
}

// ==================== INITIALIZATION ====================
function initializeApp() {
    console.log("Initializing app...");

    setupEventListeners();
    handleClassSelection('Paladin');

    // Initial layout adjustments
    window.adjustPanelLayout();
    window.adjustAscOptLayout();

    // Proficiency panel init
    updateProficiencyFromLevel();

    // Render initial UI
    renderCurrentGear(getCurrentGear());
    renderEmptyLoadoutBuilder();
    filterAndRenderGearList();
}

// Start the app
initializeApp();

// ==================== DEBUG ====================
console.log("🔍 DEBUG: Checking initialization...");
console.log("- DOM ready?", document.readyState);
console.log("- Class bar element:", document.getElementById('class-bar'));
console.log("- ERENSHOR_CLASSES:", ERENSHOR_CLASSES);
console.log("- renderClassBar type:", typeof renderClassBar);