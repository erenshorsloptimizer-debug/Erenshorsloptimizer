import { gearData } from './gear-data-with-effects.js';
import { ABILITIES } from './AbilityData.js';

const DamageCalcEngine = {

    /**
     * Get all abilities available to a character at a given level
     * @param {number} charLevel - Character level
     * @returns {Array} Filtered ability list
     */
    getAbilitiesByLevel: function (charLevel) {
        if (!ABILITIES || ABILITIES.length === 0) return [];
        return ABILITIES.filter(ability => ability.lvl <= charLevel);
    },

    /**
     * Calculate single hit damage from an ability
     * @param {Object} ability - The object from AbilityData.js
     * @param {Object} charStats - Calculated stats from StatsEngine.js
     * @param {Object} weapon - Weapon object with weapDmg, weapDly, etc.
     * @returns {Object} Damage breakdown
     */
    calculateAbilityDamage: function (ability, charStats, weapon) {
        if (!ability || !charStats || !weapon) return { averageDamage: 0, critDamage: 0, baseDamage: 0 };

        let baseDmg = 0;
        let damageType = 'physical';

        if (ability.type === 'skill') {
            // Physical ability: scales with weapon damage and ability power
            const weapDmg = weapon.weapDmg || 0;
            const multiplier = (ability.percentDmg || 0) / 100;
            const strBonus = Math.max(0, (charStats.strength - 10) / 2);  // STR scales physical

            baseDmg = (weapDmg * multiplier) + strBonus + (ability.power || 0);
            damageType = 'physical';
        } else if (ability.type === 'spell') {
            // Magical ability: scales with INT and WIS
            const intBonus = Math.max(0, (charStats.intelligence - 10) / 1.5);  // INT scales magic
            const wisBonus = Math.max(0, (charStats.wisdom - 10) / 2);  // WIS adds some damage

            baseDmg = (ability.power || 0) + intBonus + (wisBonus * 0.5);
            damageType = 'magical';
        }

        // Apply critical damage (crit chance from stats)
        const critChance = charStats.critChance || 0;
        const critMultiplier = 2.0;  // 100% damage increase on crit
        const avgCritDmg = baseDmg * (1 + (critChance / 100) * (critMultiplier - 1));

        return {
            baseDamage: Math.round(baseDmg),
            averageDamage: Math.round(avgCritDmg),
            critDamage: Math.round(baseDmg * critMultiplier),
            critChance: critChance,
            damageType: damageType,
            manaCost: ability.manaCost || 0,
            cooldown: ability.cooldown || 0
        };
    },

    /**
     * Calculate DPS for an ability (damage per second)
     * @param {Object} ability - Ability from AbilityData
     * @param {Object} charStats - Character stats from StatsEngine
     * @param {Object} weapon - Weapon object
     * @returns {Object} DPS breakdown
     */
    calculateAbilityDPS: function (ability, charStats, weapon) {
        const dmgData = this.calculateAbilityDamage(ability, charStats, weapon);
        if (!dmgData.averageDamage) return { dps: 0, dmgPerHit: 0, hitsPerSecond: 0, cooldownDPS: 0 };

        const weapDly = weapon.weapDly || 1.5;  // weapon delay in seconds
        const hitsPerSecond = 1 / weapDly;
        const autoAttackDPS = dmgData.averageDamage * hitsPerSecond;

        // If ability has cooldown, calculate cooldown-based DPS
        let cooldownDPS = 0;
        if (ability.cooldown > 0) {
            const cooldownSeconds = ability.cooldown / 1000;  // Convert to seconds if needed
            cooldownDPS = dmgData.averageDamage / cooldownSeconds;
        }

        return {
            dps: Math.max(autoAttackDPS, cooldownDPS),  // Use higher of auto-attack or cooldown DPS
            autoAttackDPS: Math.round(autoAttackDPS),
            cooldownDPS: Math.round(cooldownDPS),
            dmgPerHit: dmgData.averageDamage,
            hitsPerSecond: hitsPerSecond.toFixed(2),
            ability: ability.name,
            weapon: weapon.name
        };
    },

    /**
     * Calculate total DPS for a rotation of abilities
     * @param {Array} abilityNames - Array of ability names to use in rotation
     * @param {Object} charStats - Character stats
     * @param {Object} weapon - Weapon object
     * @returns {Object} Total DPS estimate
     */
    calculateRotationDPS: function (abilityNames, charStats, weapon) {
        if (!abilityNames || abilityNames.length === 0) {
            // Default to auto-attack only
            const weapDly = weapon.weapDly || 1.5;
            const baseDPS = weapon.weapDmg * (1 / weapDly) * (1 + (charStats.strength - 10) / 50);
            return {
                dps: Math.round(baseDPS),
                abilityDPS: 0,
                autoAttackDPS: Math.round(baseDPS),
                rotationType: 'auto-attack'
            };
        }

        let totalDamage = 0;
        let totalTime = 0;
        let abilityDPS = 0;

        // Calculate DPS contribution from each ability
        Array.isArray(abilityNames) && abilityNames.forEach(abilityName => {
            const ability = ABILITIES?.find(a => a.name === abilityName);
            if (ability) {
                const dmg = this.calculateAbilityDamage(ability, charStats, weapon);
                if (ability.cooldown > 0) {
                    // For cooldown abilities, add to total DPS
                    const cooldownSeconds = ability.cooldown / 1000;
                    abilityDPS += dmg.averageDamage / cooldownSeconds;
                }
            }
        });

        // Add auto-attack DPS
        const weapDly = weapon.weapDly || 1.5;
        const baseDPS = weapon.weapDmg * (1 / weapDly);
        const autoAttackDPS = baseDPS * (1 + (charStats.strength - 10) / 50);

        return {
            dps: Math.round(abilityDPS + autoAttackDPS),
            abilityDPS: Math.round(abilityDPS),
            autoAttackDPS: Math.round(autoAttackDPS),
            rotationType: abilityNames.length > 0 ? 'rotation' : 'auto-attack'
        };
    },

    /**
     * Get weapon damage from gear
     * @param {string} weaponName - Name of weapon from gear
     * @returns {Object} Weapon with damage stats
     */
    getWeaponStats: function (weaponName) {
        // Use gearData instead of WIKI_GEAR
        if (!gearData || !weaponName) {
            return { name: 'None', weapDmg: 0, weapDly: 1.5 };
        }
        const weapon = gearData.find(item => item.name === weaponName && (item.slot === 'Primary' || item.slot === 'Secondary'));
        if (weapon) {
            return {
                name: weapon.name,
                weapDmg: weapon.weapDmg || 0,
                weapDly: weapon.weapDly || 1.5,
                is2h: weapon.is2h || false,
                isBow: weapon.isBow || false,
                isWand: weapon.isWand || false
            };
        }
        return { name: 'None', weapDmg: 0, weapDly: 1.5 };
    },

    /**
     * Compare DPS of two loadouts with optional ability
     * @param {Object} charStats1 - Stats from first loadout
     * @param {Object} loadout1Weapons - {primary, secondary} weapon objects
     * @param {Object} charStats2 - Stats from second loadout
     * @param {Object} loadout2Weapons - {primary, secondary} weapon objects
     * @param {string} abilityName - Ability to compare (optional)
     * @returns {Object} DPS comparison
     */
    compareDPS: function (charStats1, loadout1Weapons, charStats2, loadout2Weapons, abilityName) {
        const primaryWeapon1 = loadout1Weapons?.primary || { weapDmg: 0, weapDly: 1.5, name: 'None' };
        const primaryWeapon2 = loadout2Weapons?.primary || { weapDmg: 0, weapDly: 1.5, name: 'None' };

        let dps1, dps2;

        if (abilityName) {
            const ability = ABILITIES?.find(a => a.name === abilityName);
            if (ability) {
                dps1 = this.calculateAbilityDPS(ability, charStats1, primaryWeapon1);
                dps2 = this.calculateAbilityDPS(ability, charStats2, primaryWeapon2);
            }
        } else {
            dps1 = this.calculateRotationDPS([], charStats1, primaryWeapon1);
            dps2 = this.calculateRotationDPS([], charStats2, primaryWeapon2);
        }

        const delta = dps2.dps - dps1.dps;
        const deltaPercent = dps1.dps > 0 ? (delta / dps1.dps) * 100 : 0;

        return {
            loadout1DPS: dps1,
            loadout2DPS: dps2,
            delta: Math.round(delta),
            deltaPercent: deltaPercent.toFixed(1),
            improvement: delta > 0 ? 'upgrade' : delta < 0 ? 'downgrade' : 'equal'
        };
    }
};

// Export the engine as default so other files can import it
export default DamageCalcEngine;