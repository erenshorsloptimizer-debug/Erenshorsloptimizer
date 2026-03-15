// OptimizerEngine.js
// Finds the best gear loadout using class stat weights and tier selection

import { gearData } from './gear-data-with-effects.js';

const OptimizerEngine = {

    /**
     * Find the best loadout based on current filters and stat weights
     * @param {Object} options - Filter options
     * @param {string} options.className - Character class
     * @param {number} options.charLevel - Character level (for future use)
     * @param {number} options.levelMin - Minimum gear level
     * @param {number} options.levelMax - Maximum gear level
     * @param {string} options.tier - 'base', 'blessed', or 'godly'
     * @param {string} options.weaponPref - 'any', '1h', '2h'
     * @param {Object} options.statWeights - Weight object for stats (e.g., { str: 8, dex: 4, ... })
     * @returns {Object} Object with bestLoadout and candidates per slot
     */
    findBestLoadout: function (options) {
        console.log("OptimizerEngine: Finding best loadout with options", options);

        const { className, levelMin, levelMax, tier, weaponPref, statWeights } = options;

        // Slot definitions (matching the UI and game slots)
        const slots = [
            'head', 'neck', 'chest', 'back', 'arms', 'hands', 'waist',
            'legs', 'feet', 'wrist', 'ring1', 'ring2', 'primary', 'secondary',
            'aura', 'charm'
        ];

        // Map our slot names to the actual 'slot' field in gearData
        const slotMap = {
            'head': 'Head',
            'neck': 'Neck',
            'chest': 'Chest',
            'back': 'Back',
            'arms': 'Arms',
            'hands': 'Hands',
            'waist': 'Waist',
            'legs': 'Legs',
            'feet': 'Feet',
            'wrist': 'Wrist',
            'ring1': 'Ring',
            'ring2': 'Ring',
            'primary': 'Primary',
            'secondary': 'Secondary',
            'aura': 'Aura',
            'charm': 'Charm'
        };

        // For each slot, gather eligible items and compute scores
        const slotCandidates = {};

        slots.forEach(slot => {
            const gearSlot = slotMap[slot];

            let slotGear = gearData.filter(item => {
                // Must match slot
                if (item.slot !== gearSlot) return false;

                // Level range
                if (item.lvl < levelMin || item.lvl > levelMax) return false;

                // Class restriction
                if (item.classes && item.classes.length > 0) {
                    if (!item.classes.includes(className) && !item.classes.includes("All")) return false;
                }

                // Weapon preference
                if (slot === 'primary' || slot === 'secondary') {
                    if (weaponPref === '2h' && item.is2h !== true) return false;
                    if (weaponPref === '1h' && item.is2h === true) return false;
                }

                // Secondary slot restrictions: must be a shield or off-hand weapon
                if (slot === 'secondary') {
                    // If it's a weapon, it must be marked as canBeSecondary or secondaryOnly
                    if (item.weapDmg && !item.canBeSecondary && !item.secondaryOnly) return false;
                }

                return true;
            });

            // Compute score for each item
            const itemsWithScores = slotGear.map(item => ({
                item: item,
                score: this.scoreItem(item, tier, statWeights)
            }));

            // Sort descending by score
            itemsWithScores.sort((a, b) => b.score - a.score);

            // Keep top 5 candidates (or all if less)
            slotCandidates[slot] = itemsWithScores.slice(0, 5).map(c => c.item);
        });

        // --- Build the best loadout (respecting relic uniqueness) ---
        const selectedRelicNames = new Set();
        const bestLoadout = {};

        slots.forEach(slot => {
            const candidates = slotCandidates[slot];
            if (!candidates || candidates.length === 0) {
                bestLoadout[slot] = null;
                return;
            }

            let selected = null;
            for (let item of candidates) {
                if (item.relic && selectedRelicNames.has(item.name)) {
                    continue;
                }
                selected = item;
                break;
            }

            // Fallback: if all items are relics with used names, pick the highest scoring anyway (duplicate relic)
            if (!selected) {
                console.warn(`Slot ${slot}: all top candidates are relics with names already used. Picking best anyway.`);
                selected = candidates[0];
            }

            bestLoadout[slot] = selected;
            if (selected.relic) {
                selectedRelicNames.add(selected.name);
            }
        });

        console.log("OptimizerEngine: Best loadout (scoring mode)", bestLoadout);
        return {
            bestLoadout: bestLoadout,
            candidates: slotCandidates
        };
    },

    /**
     * Score a single item based on its stats and class weights
     * @param {Object} item - Gear item
     * @param {string} tier - 'base', 'blessed', 'godly'
     * @param {Object} statWeights - Weight mapping (e.g., { str: 8, dex: 4 })
     * @returns {number} Total score
     */
    scoreItem: function (item, tier, statWeights) {
        // Select the correct stats based on tier
        let stats = item.stats || {};
        if (tier === 'blessed' && item.blessed) stats = item.blessed;
        else if (tier === 'godly' && item.godly) stats = item.godly;

        let totalScore = 0;
        for (let [stat, value] of Object.entries(stats)) {
            // Only add if this stat has a weight (ignore HP, mana, resists if no weight)
            if (stat in statWeights) {
                totalScore += value * statWeights[stat];
            }
        }
        // Add worn effect bonus if present
        if (item.wornEffect && statWeights.effect) {
            totalScore += statWeights.effect;
        }
        return totalScore;
    },

    /**
     * Score an entire loadout (optional, for comparison)
     */
    scoreLoadout: function (loadout, tier, statWeights) {
        let total = 0;
        for (let slot in loadout) {
            if (loadout[slot]) {
                total += this.scoreItem(loadout[slot], tier, statWeights);
            }
        }
        return total;
    }
};

export default OptimizerEngine;
