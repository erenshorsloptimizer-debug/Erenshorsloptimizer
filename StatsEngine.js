const StatsEngine = {
    TICK_RATE: 3.0,

    /**
     * Initialize a character object with class base stats and current values
     * @param {string} className - name of class from CLASSES
     * @param {number} level - character level (1-35)
     * @returns {Object} character object with all stat fields initialized
     */
    initCharacter: function (className, level = 35) {
        const cls = CLASSES ? CLASSES[className] : {};
        const scaleMods = cls.scaleMods || {};
        return {
            name: className,
            level: level,
            // Scale modifiers (from class definition)
            strScale: scaleMods.str || 10,
            dexScale: scaleMods.dex || 10,
            agiScale: scaleMods.agi || 10,
            endScale: scaleMods.end || 10,
            intScale: scaleMods.int || 10,
            wisScale: scaleMods.wis || 10,
            chaScale: scaleMods.cha || 10,
            mitScale: scaleMods.mit || 1.0,
            // Base stats (typically 0, added by gear)
            strength: 0,
            dexterity: 0,
            agility: 0,
            endurance: 0,
            intelligence: 0,
            wisdom: 0,
            charisma: 0,
            // Bonus HP/Mana from gear and effects
            itemHP: 0,
            itemMana: 0,
            // Base HP/Mana from class (constant)
            baseHP: 0,
            baseMana: 0,
            // Multipliers from ascensions
            hpMult: 1.0,
            manaMult: 1.0,
            defMult: 1.0,
            mitBonus: 0.0,
            resistMult: 1.0,
            mrMult: 1.0,
            prMult: 1.0,
            erMult: 1.0,
            vrMult: 1.0,
            dodgeMissChance: 0.0
        };
    },

    /**
     * Update character level and recalculate any level-dependent fields
     */
    setLevel: function (char, level) {
        char.level = Math.max(1, Math.min(35, level));
    },

    /**
     * Update a base stat on the character
     */
    setStat: function (char, statKey, value) {
        const validStats = ['strength', 'dexterity', 'agility', 'endurance', 'intelligence', 'wisdom', 'charisma'];
        if (validStats.includes(statKey)) {
            char[statKey] = Math.max(0, value);
        }
    },

    /**
     * Set bonus HP/Mana from gear and effects
     */
    setBonusStats: function (char, itemHP, itemMana) {
        char.itemHP = itemHP || 0;
        char.itemMana = itemMana || 0;
    },

    /**
     * Apply ascension multipliers to character
     */
    applyAscensionMods: function (char, mods) {
        if (!mods) return;
        char.hpMult = mods.hpMult || 1.0;
        char.manaMult = mods.manaMult || 1.0;
        char.defMult = mods.defMult || 1.0;
        char.mitBonus = mods.mitBonus || 0.0;
        char.resistMult = mods.resistMult || 1.0;
        char.mrMult = mods.mrMult || 1.0;
        char.prMult = mods.prMult || 1.0;
        char.erMult = mods.erMult || 1.0;
        char.vrMult = mods.vrMult || 1.0;
        char.dodgeMissChance = mods.dodgeMissChance || 0.0;
    },

    /**
     * Calculate core stats: maxHP, maxMana, and point budget
     */
    calculateCore: function (char) {
        const lvl = char.level || 1;
        const totalPoints = 10 + Math.max(0, Math.floor((lvl - 2) / 2) + 1);

        const hpBase = (char.baseHP + char.itemHP + (lvl * 5) +
            (char.endurance * (2 * char.endScale) / 100 +
                char.endurance * Math.round(lvl / 200)) * lvl);

        const manaBase = char.baseMana + char.itemMana +
            (char.intScale * lvl) +
            (char.wisScale * lvl) +
            Math.round(char.intelligence * (char.intScale / 3));

        // Apply multipliers from ascensions
        const maxHP = Math.round(hpBase * char.hpMult);
        const maxMana = Math.round(manaBase * char.manaMult);

        return {
            maxHP: maxHP,
            maxMana: maxMana,
            pointBudget: totalPoints
        };
    },

    /**
     * Calculate HP and Mana regeneration per second
     */
    calculateRegen: function (char, state = 'COMBAT') {
        const multiplier = state === 'MEDITATING' ? 50.0 : (state === 'SITTING' ? 26.0 : 1.0);
        const mTick = Math.round(multiplier * (char.wisScale / 140 * char.wisdom));
        const hTick = Math.round(multiplier * (char.level + Math.round((2 * char.endScale) / 100 * char.endurance)));

        return {
            manaPerSec: parseFloat((mTick / this.TICK_RATE).toFixed(2)),
            hpPerSec: parseFloat((hTick / this.TICK_RATE).toFixed(2))
        };
    },

    /**
     * Calculate total stats (with scaled values)
     */
    calculateStats: function (char) {
        return {
            str: char.strength,
            dex: char.dexterity,
            agi: char.agility,
            end: char.endurance,
            int: char.intelligence,
            wis: char.wisdom,
            cha: char.charisma
        };
    },

    /**
     * Calculate armor class (AC) based on AGI and level
     * AC = AGI * (AgiScaleMod / 200) * Level
     * Then apply defMult from ascensions
     */
    calculateAC: function (char) {
        const baseAC = char.agility * (char.agiScale / 200) * char.level;
        return Math.round(baseAC * char.defMult);
    },

    /**
     * Calculate resistances: MR, ER, PR, VR (all from CHA scaling + any bonuses)
     * Each resistance: Base = CHA * (ChaScaleMod / 100)
     * Then apply corresponding multiplier from gear/ascensions
     */
    calculateResistances: function (char) {
        const baseResist = char.charisma * (char.chaScale / 100);
        return {
            mr: Math.round(baseResist * char.mrMult),
            er: Math.round(baseResist * char.erMult),
            pr: Math.round(baseResist * char.prMult),
            vr: Math.round(baseResist * char.vrMult)
        };
    },

    /**
     * Get a complete breakdown of all calculated stats
     */
    calculateAll: function (char, state = 'COMBAT') {
        const core = this.calculateCore(char);
        const regen = this.calculateRegen(char, state);
        const stats = this.calculateStats(char);
        const ac = this.calculateAC(char);
        const resists = this.calculateResistances(char);

        return {
            ...core,
            ...regen,
            ...resists,
            stats: stats,
            ac: ac,
            dodgeMissChance: char.dodgeMissChance
        };
    }
};
export default StatsEngine;