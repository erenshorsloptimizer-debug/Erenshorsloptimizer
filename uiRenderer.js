// uiRenderer.js
// This file ONLY handles displaying things on screen

import { BLESSED_SPARKLE, GODLY_SPARKLE } from './itemImages.js';

// ==================== GLOBAL FUNCTION DECLARATIONS ====================
window.toggleGearDb = null;
window.resetWeights = null;
window.setTier = null;
window.setSlotTier = null;
window.toggleAscPanel = null;
window.optimizeAndScroll = null;
window.renderGearList = null;
window.showMessage = null;
window.adjustPanelLayout = null;
window.adjustAscOptLayout = null;
window.renderEmptyLoadoutBuilder = null;
window.showWornEffectTooltip = null;
window.hideTooltip = null;
window.showWornEffectDetails = null;
window.openSlotModal = null;
window.closeModal = null;
window.clearCurrentGear = null;
window.clearLoadoutBuilder = null;

// ==================== PER-SLOT TIER TRACKING ====================
const slotTiers = {};

function getSlotTier(slot) {
    return slotTiers[slot] || 'base';
}

function setSlotTier(slot, tier) {
    slotTiers[slot] = tier;
}

// ==================== HELPER FUNCTIONS (private) ====================

function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with id "${id}" not found`);
    }
    return element;
}

function getCurrentTier() {
    if (document.getElementById('tier-blessed')?.classList.contains('active')) {
        return 'blessed';
    } else if (document.getElementById('tier-double')?.classList.contains('active')) {
        return 'godly';
    }
    return 'base';
}

function getTierSparkle(tier) {
    if (tier === 'blessed') return BLESSED_SPARKLE;
    if (tier === 'godly') return GODLY_SPARKLE;
    return null;
}

function getItemImageSrc(item) {
    if (!item) return '';
    const name = item.name;
    const src = (window.ITEM_IMAGES && window.ITEM_IMAGES[name]) ? window.ITEM_IMAGES[name] : '';
    return src;
}

function formatItemStats(item, tier) {
    if (!item) return [];

    let stats = item.stats || {};
    if (tier === 'blessed' && item.blessed) {
        stats = item.blessed;
    } else if (tier === 'godly' && item.godly) {
        stats = item.godly;
    }

    return Object.entries(stats)
        .map(([stat, value]) => ({ stat, value }));
}

function formatWornEffect(item) {
    if (!item) return null;

    if (item.slot === 'Aura') {
        if (item.auraEffect) {
            if (typeof item.auraEffect === 'object') {
                return {
                    name: item.auraEffect.name || 'Aura Effect',
                    description: item.auraEffect.description || ''
                };
            }
            return {
                name: item.auraEffect,
                description: 'Aura effect - click for details'
            };
        }

        if (item.description && item.description.includes('Aura')) {
            return {
                name: 'Aura',
                description: item.description
            };
        }
    }

    if (item.wornEffect) {
        if (typeof item.wornEffect === 'object') {
            return {
                name: item.wornEffect.name || 'Unknown Effect',
                description: item.wornEffect.description || ''
            };
        }
        return {
            name: item.wornEffect,
            description: 'Click for more details'
        };
    }

    if (item.onWear) {
        if (typeof item.onWear === 'object') {
            return {
                name: item.onWear.name || 'On Wear Effect',
                description: item.onWear.description || ''
            };
        }
        return {
            name: item.onWear,
            description: 'Click for more details'
        };
    }

    return null;
}

// ==================== MODAL VARIABLES ====================
let currentModalSlot = null;
let currentModalItemList = null;
let currentModalCallback = null;
let currentModalContext = null;

// ==================== EXPORTED FUNCTIONS ====================

function showMessage(message, isWarning = false) {
    const msgElement = document.createElement('div');
    msgElement.style.position = 'fixed';
    msgElement.style.top = '20px';
    msgElement.style.right = '20px';
    msgElement.style.padding = '1rem';
    msgElement.style.background = isWarning ? '#fff3cd' : '#f8d7da';
    msgElement.style.color = isWarning ? '#856404' : '#721c24';
    msgElement.style.border = `1px solid ${isWarning ? '#ffeeba' : '#f5c6cb'}`;
    msgElement.style.borderRadius = '4px';
    msgElement.style.zIndex = '9999';
    msgElement.style.maxWidth = '300px';
    msgElement.textContent = message;

    document.body.appendChild(msgElement);

    setTimeout(() => {
        msgElement.remove();
    }, 5000);
}

function renderClassBar(classes, activeClass) {
    console.log("renderClassBar called with:", classes, activeClass);

    const bar = getElement('class-bar');
    if (!bar) {
        showMessage("Couldn't find class-bar element", false);
        return;
    }

    bar.innerHTML = '';

    if (!classes || classes.length === 0) {
        bar.innerHTML = '<p class="note">No classes available</p>';
        return;
    }

    classes.forEach(className => {
        const button = document.createElement('button');
        button.className = `class-btn ${activeClass === className ? 'active' : ''}`;
        button.setAttribute('data-class', className);
        button.textContent = className;

        button.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('classSelected', {
                detail: { className: className }
            }));
        });

        bar.appendChild(button);
    });
}

function renderClassDescription(description) {
    const descElement = getElement('class-desc');
    if (descElement) {
        descElement.textContent = description || 'Select a class to begin';
    }
}

window.toggleProfPanel = function () {
    const panelBody = document.getElementById('prof-panel-body');
    const chevron = document.getElementById('prof-panel-chevron');
    if (!panelBody || !chevron) return;

    const isVisible = panelBody.style.display !== 'none';
    panelBody.style.display = isVisible ? 'none' : 'block';
    chevron.textContent = isVisible ? '▶' : '▼';
    chevron.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(0deg)';

    adjustPanelLayout();
};

window.toggleStatPanel = function () {
    const panelBody = document.getElementById('stat-panel-body');
    const chevron = document.getElementById('stat-panel-chevron');
    if (!panelBody || !chevron) return;

    const isVisible = panelBody.style.display !== 'none';
    panelBody.style.display = isVisible ? 'none' : 'block';
    chevron.textContent = isVisible ? '▶' : '▼';

    adjustPanelLayout();
};

function adjustPanelLayout() {
    const row = document.querySelector('.row');
    if (!row) return;

    const statBody = document.getElementById('stat-panel-body');
    const profBody = document.getElementById('prof-panel-body');
    const statOpen = statBody ? statBody.style.display !== 'none' : true;
    const profOpen = profBody ? profBody.style.display !== 'none' : true;

    if (statOpen && profOpen) {
        row.style.gridTemplateColumns = '1fr 1fr';
    } else if (statOpen && !profOpen) {
        row.style.gridTemplateColumns = '1fr auto';
    } else if (!statOpen && profOpen) {
        row.style.gridTemplateColumns = 'auto 1fr';
    } else {
        row.style.gridTemplateColumns = 'auto auto';
    }
}

// Updated renderAscensions function for uiRenderer.js
function renderAscensions(ascensions, selectedAscensions = [], ascensionState = { general: {}, class: {}, totalSpent: 0, generalSpent: 0 }, onRankChange = null) {
    console.log("renderAscensions called with:", ascensions?.length || 0, "ascensions");

    const container = getElement('asc-panel-inner');
    if (!container) {
        showMessage("Couldn't find asc-panel-inner element", false);
        return;
    }

    container.innerHTML = '';

    if (!ascensions || ascensions.length === 0) {
        container.innerHTML = '<p class="note" style="padding:2rem; text-align:center;">No ascensions available for this class</p>';
        return;
    }

    const GENERAL_ASCENSION_POINTS_REQUIRED = 8;

    // Separate general and class ascensions
    const generalAscensions = ascensions.filter(asc => asc.usedBy === 0);
    const classAscensions = ascensions.filter(asc => asc.usedBy !== 0);

    const canUseClassAscensions = ascensionState.generalSpent >= GENERAL_ASCENSION_POINTS_REQUIRED;

    // Points header with progress bar
    const pointsHeader = document.createElement('div');
    pointsHeader.className = 'asc-points-header';

    const progressPercentage = Math.min(100, (ascensionState.generalSpent / GENERAL_ASCENSION_POINTS_REQUIRED) * 100);

    pointsHeader.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <span style="font-family: 'Cinzel', serif; color: var(--text-dim);">Ascension Points</span>
            <span style="font-family: 'Cinzel', serif; font-size: 1.2rem; color: var(--gold);">${ascensionState.totalSpent}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
            <div style="flex: 1;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                    <span style="font-size: 0.75rem; color: var(--text-dim);">General Progress</span>
                    <span style="font-size: 0.75rem; color: ${ascensionState.generalSpent >= GENERAL_ASCENSION_POINTS_REQUIRED ? 'var(--green-light)' : 'var(--gold)'};">
                        ${ascensionState.generalSpent}/${GENERAL_ASCENSION_POINTS_REQUIRED}
                    </span>
                </div>
                <div style="height: 4px; background: var(--surface); border-radius: 2px; overflow: hidden;">
                    <div style="height: 100%; width: ${progressPercentage}%; background: linear-gradient(90deg, var(--gold), var(--gold-light)); transition: width 0.3s ease;"></div>
                </div>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-dim);">
                ${canUseClassAscensions ?
            '<span style="color: var(--green-light);">✓ Class ascensions unlocked</span>' :
            `<span style="color: var(--text-dim);">Need ${GENERAL_ASCENSION_POINTS_REQUIRED - ascensionState.generalSpent} more in general</span>`}
            </div>
        </div>
    `;
    container.appendChild(pointsHeader);

    // Render General Ascensions section
    if (generalAscensions.length > 0) {
        const generalHeader = document.createElement('div');
        generalHeader.className = 'asc-section-header';
        generalHeader.innerHTML = `
            <span>✦ GENERAL ASCENSIONS</span>
            <div class="line"></div>
        `;
        container.appendChild(generalHeader);

        generalAscensions.forEach(asc => {
            renderAscensionCard(asc, true);
        });
    }

    // Render Class Ascensions section
    if (classAscensions.length > 0) {
        const classHeader = document.createElement('div');
        classHeader.className = `asc-section-header ${!canUseClassAscensions ? 'locked' : ''}`;
        classHeader.innerHTML = `
            <span>⚔️ CLASS ASCENSIONS</span>
            <div class="line"></div>
            ${!canUseClassAscensions ? '<span style="font-size: 0.7rem; color: var(--text-dim);">(Locked)</span>' : ''}
        `;
        container.appendChild(classHeader);

        classAscensions.forEach(asc => {
            renderAscensionCard(asc, false);
        });
    }

    function renderAscensionCard(asc, isGeneral) {
        const card = document.createElement('div');
        card.className = 'asc-card';
        card.setAttribute('data-asc-id', asc.id);

        // Add class attribute for styling
        const classMap = { 1: 'Windblade', 2: 'Arcanist', 3: 'Paladin', 4: 'Reaver', 5: 'Druid', 6: 'Stormcaller' };
        if (asc.usedBy && classMap[asc.usedBy]) {
            card.setAttribute('data-class', classMap[asc.usedBy]);
        }

        const currentRank = isGeneral ?
            (ascensionState.general[asc.id] || 0) :
            (ascensionState.class[asc.id] || 0);

        const maxRank = asc.maxRank || 3;
        const isLocked = !isGeneral && !canUseClassAscensions;

        if (isLocked) {
            card.classList.add('locked');
        }

        // Format stats bonus
        const statsBonus = asc.stats ? Object.entries(asc.stats)
            .filter(([_, val]) => val > 0)
            .map(([stat, val]) => {
                const statNames = {
                    hp: 'HP', def: 'DEF', mana: 'MANA', intelScaling: 'INT',
                    advResists: 'RES', killshot: 'KILL', cooldownReduc: 'CDR'
                };
                return `${statNames[stat] || stat.toUpperCase()}+${val}%`;
            })
            .join(' · ') : '';

        // Generate rank dots
        const rankDots = Array.from({ length: maxRank }, (_, i) =>
            `<span class="rank-dot ${i < currentRank ? 'filled' : 'empty'}" data-rank="${i + 1}"></span>`
        ).join('');

        // Determine if controls should be enabled
        const canDecrease = currentRank > 0 && !isLocked;
        const canIncrease = currentRank < maxRank && (isGeneral || canUseClassAscensions) && !isLocked;

        card.innerHTML = `
            <div class="asc-header">
                <span class="asc-name">${asc.name || 'Unknown Ascension'}</span>
                <span class="asc-max-rank">Rank ${maxRank}</span>
            </div>
            <div class="asc-description">${asc.description || 'No description available'}</div>
            ${statsBonus ? `<div class="asc-stats-bonus">✨ ${statsBonus}</div>` : ''}
            <div class="asc-rank-container">
                <div class="asc-rank-dots">${rankDots}</div>
                <div class="rank-controls">
                    <button class="rank-btn" data-action="decrease" data-id="${asc.id}" data-general="${isGeneral}" ${!canDecrease ? 'disabled' : ''}>−</button>
                    <button class="rank-btn" data-action="increase" data-id="${asc.id}" data-general="${isGeneral}" ${!canIncrease ? 'disabled' : ''}>+</button>
                </div>
            </div>
            <div class="asc-footer">
                <span class="asc-points-cost">Cost: ${asc.pointCost || 1} pt/rank</span>
                <span class="asc-points-remaining">${maxRank - currentRank} ranks left</span>
            </div>
        `;

        // Add rank button handlers if not locked
        if (onRankChange && !isLocked) {
            const decreaseBtn = card.querySelector('[data-action="decrease"]');
            const increaseBtn = card.querySelector('[data-action="increase"]');

            decreaseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                onRankChange(asc.id, -1, isGeneral);
            });

            increaseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                onRankChange(asc.id, 1, isGeneral);
            });
        }

        // Click on card to toggle first rank (if not locked)
        if (!isLocked) {
            card.addEventListener('click', (e) => {
                if (e.target.classList.contains('rank-btn')) return;

                if (onRankChange) {
                    const newRank = currentRank === 0 ? 1 : 0;
                    const rankDiff = newRank - currentRank;
                    if ((isGeneral || canUseClassAscensions) && rankDiff !== 0) {
                        onRankChange(asc.id, rankDiff, isGeneral);
                    }
                }
            });
        }

        container.appendChild(card);
    }
}

function renderStatWeightEditors(weights, onChange) {
    console.log("renderStatWeightEditors called with", weights);
    const panel = document.getElementById('stat-tier-panel');
    if (!panel) {
        console.warn("stat-tier-panel not found");
        return;
    }

    panel.innerHTML = '';

    const allStats = [
        { key: 'str', label: 'Strength' },
        { key: 'dex', label: 'Dexterity' },
        { key: 'agi', label: 'Agility' },
        { key: 'end', label: 'Endurance' },
        { key: 'int', label: 'Intelligence' },
        { key: 'wis', label: 'Wisdom' },
        { key: 'cha', label: 'Charisma' },
        { key: 'hp', label: 'HP' },
        { key: 'mana', label: 'Mana' },
        { key: 'armor', label: 'Armor' },
        { key: 'mr', label: 'Magic Resist' },
        { key: 'er', label: 'Elemental Resist' },
        { key: 'pr', label: 'Poison Resist' },
        { key: 'vr', label: 'Void Resist' },
        { key: 'res', label: 'All Resists' },
        { key: 'effect', label: 'Worn Effect' }
    ];

    allStats.forEach(stat => {
        const row = document.createElement('div');
        row.className = 'stat-weight-row';

        const label = document.createElement('span');
        label.className = 'stat-weight-label';
        label.textContent = stat.label;

        const input = document.createElement('input');
        input.type = 'number';
        input.min = 0;
        input.max = 100;
        input.step = 1;
        input.value = weights[stat.key] || 0;
        input.style.width = '60px';
        input.style.textAlign = 'center';
        input.style.background = 'var(--surface2)';
        input.style.border = '1px solid var(--border)';
        input.style.color = 'var(--text-bright)';

        input.addEventListener('input', (e) => {
            const newValue = parseInt(e.target.value) || 0;
            weights[stat.key] = newValue;
            if (onChange) onChange({ ...weights });
        });

        row.appendChild(label);
        row.appendChild(input);
        panel.appendChild(row);
    });

    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn btn-ghost';
    resetBtn.textContent = 'Reset to Class Defaults';
    resetBtn.style.marginTop = '1rem';
    resetBtn.style.width = '100%';
    resetBtn.addEventListener('click', () => {
        if (window.resetStatWeights) window.resetStatWeights();
    });

    panel.appendChild(resetBtn);
}

export function renderProficiencyEditor(baseProfs, allocations, pointsRemaining, totalPoints, onAllocate) {
    const container = document.getElementById('prof-table');
    if (!container) {
        console.warn("prof-table not found");
        return;
    }

    container.innerHTML = '';

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';

    table.innerHTML = `
        <thead>
            <tr style="border-bottom:1px solid var(--border);">
                <th style="text-align:left; padding:8px 4px;">Proficiency</th>
                <th style="text-align:center; padding:8px 4px;">Base</th>
                <th style="text-align:center; padding:8px 4px;">Allocated</th>
                <th style="text-align:center; padding:8px 4px;">Total</th>
                <th style="text-align:center; padding:8px 4px;"></th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;

    const tbody = table.querySelector('tbody');

    const profNames = {
        physicality: 'Physicality',
        hardiness: 'Hardiness',
        finesse: 'Finesse',
        defense: 'Defense',
        arcanism: 'Arcanism',
        restoration: 'Restoration',
        mind: 'Mind'
    };

    Object.entries(baseProfs).forEach(([key, baseValue]) => {
        const allocated = allocations[key] || 0;
        const total = baseValue + allocated;

        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid var(--border-light)';

        const nameCell = document.createElement('td');
        nameCell.style.padding = '8px 4px';
        nameCell.style.color = 'var(--text-bright)';
        nameCell.textContent = profNames[key] || key;
        row.appendChild(nameCell);

        const baseCell = document.createElement('td');
        baseCell.style.padding = '8px 4px';
        baseCell.style.textAlign = 'center';
        baseCell.style.fontWeight = 'bold';
        baseCell.textContent = baseValue;
        row.appendChild(baseCell);

        const allocCell = document.createElement('td');
        allocCell.style.padding = '8px 4px';
        allocCell.style.textAlign = 'center';

        const allocDiv = document.createElement('div');
        allocDiv.style.display = 'flex';
        allocDiv.style.alignItems = 'center';
        allocDiv.style.justifyContent = 'center';
        allocDiv.style.gap = '4px';

        const minusBtn = document.createElement('button');
        minusBtn.textContent = '−';
        minusBtn.style.width = '24px';
        minusBtn.style.height = '24px';
        minusBtn.style.background = 'var(--surface2)';
        minusBtn.style.border = '1px solid var(--border)';
        minusBtn.style.color = 'var(--text-dim)';
        minusBtn.style.cursor = 'pointer';
        minusBtn.style.borderRadius = '3px';
        minusBtn.style.fontWeight = 'bold';
        minusBtn.disabled = allocated === 0;
        minusBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onAllocate(key, -1);
        });
        allocDiv.appendChild(minusBtn);

        const allocSpan = document.createElement('span');
        allocSpan.style.minWidth = '30px';
        allocSpan.style.textAlign = 'center';
        allocSpan.style.fontWeight = 'bold';
        allocSpan.textContent = allocated;
        allocDiv.appendChild(allocSpan);

        const plusBtn = document.createElement('button');
        plusBtn.textContent = '+';
        plusBtn.style.width = '24px';
        plusBtn.style.height = '24px';
        plusBtn.style.background = 'var(--surface2)';
        plusBtn.style.border = '1px solid var(--border)';
        plusBtn.style.color = 'var(--text-dim)';
        plusBtn.style.cursor = 'pointer';
        plusBtn.style.borderRadius = '3px';
        plusBtn.style.fontWeight = 'bold';
        plusBtn.disabled = pointsRemaining === 0;
        plusBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onAllocate(key, 1);
        });
        allocDiv.appendChild(plusBtn);

        allocCell.appendChild(allocDiv);
        row.appendChild(allocCell);

        const totalCell = document.createElement('td');
        totalCell.style.padding = '8px 4px';
        totalCell.style.textAlign = 'center';
        totalCell.style.fontWeight = 'bold';
        totalCell.style.color = 'var(--gold)';
        totalCell.textContent = total;
        row.appendChild(totalCell);

        const emptyCell = document.createElement('td');
        emptyCell.style.padding = '8px 4px';
        row.appendChild(emptyCell);

        tbody.appendChild(row);
    });

    const remainingRow = document.createElement('tr');
    const remainingCell = document.createElement('td');
    remainingCell.colSpan = 5;
    remainingCell.style.padding = '12px 4px 4px';
    remainingCell.style.textAlign = 'right';
    remainingCell.style.fontWeight = 'bold';
    remainingCell.style.color = pointsRemaining === 0 ? 'var(--red-light)' : 'var(--text-dim)';
    remainingCell.innerHTML = `Points Remaining: <span style="font-size:1.1rem; color:var(--gold-light);">${pointsRemaining}</span> / ${totalPoints}`;
    remainingRow.appendChild(remainingCell);
    tbody.appendChild(remainingRow);

    container.appendChild(table);
}

function toggleAscensionsPanel() {
    console.log("toggleAscensionsPanel called");

    const panelBody = getElement('asc-panel-body');
    const chevron = getElement('asc-panel-chevron');

    if (!panelBody || !chevron) {
        console.warn("Couldn't find ascension panel elements");
        return;
    }

    const isVisible = panelBody.style.display !== 'none';

    if (isVisible) {
        panelBody.style.display = 'none';
        chevron.style.transform = 'rotate(-90deg)';
        chevron.style.display = 'inline-block';
    } else {
        panelBody.style.display = 'block';
        chevron.style.transform = 'rotate(0deg)';
    }
}

function renderGearList(items) {
    console.log(`renderGearList called with ${items?.length || 0} items`);

    const gearList = document.getElementById('gear-list');
    const gearCount = document.getElementById('gear-count');

    if (!gearList) {
        console.error("gear-list element not found!");
        return;
    }

    if (gearCount) {
        gearCount.textContent = `(${items?.length || 0} items)`;
    }

    gearList.innerHTML = '';

    if (!items || items.length === 0) {
        gearList.innerHTML = '<p class="note" style="padding:2rem; text-align:center;">No items match your filters</p>';
        return;
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'gear-card';

        const statsHtml = Object.entries(item.stats)
            .map(([stat, value]) => `<li>${stat.toUpperCase()}: ${value}</li>`)
            .join('');

        const relicTag = item.relic ? '<span class="relic-tag">✨ Relic</span>' : '';

        const wornEffect = formatWornEffect(item);
        const wornEffectHtml = wornEffect ? `
            <div class="worn-effect" style="margin-top:4px; font-size:0.75rem;">
                <span class="worn-effect-name" 
                      style="color:var(--blue-light); cursor:help; text-decoration:underline dotted;"
                      onmouseenter="showWornEffectTooltip('${wornEffect.name.replace(/'/g, "\\'")}', '${wornEffect.description.replace(/'/g, "\\'")}')"
                      onmouseleave="hideTooltip()"
                      onclick="showWornEffectDetails('${wornEffect.name.replace(/'/g, "\\'")}')">
                    ✨ ${wornEffect.name}
                </span>
            </div>
        ` : '';

        const auraIndicator = item.slot === 'Aura' && !wornEffect ?
            '<div style="color:var(--gold); font-size:0.7rem; margin-top:2px;">Aura (effect details coming soon)</div>' : '';

        card.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <div style="position:relative; width:48px; height:48px;">
                        <img src="${getItemImageSrc(item)}" alt="${item.name}" class="gear-item-img" style="width:48px; height:48px; object-fit:contain; image-rendering:pixelated;">
                    </div>
                    <div style="flex:1; min-width:0;">
                        <div style="display:flex; justify-content:space-between; align-items:start;">
                            <span class="gear-name" style="font-weight:bold;">${item.name}</span>
                            ${relicTag}
                        </div>
                        <div class="gear-slot-level">
                            <span class="gear-slot">${item.slot}</span>
                            <span class="gear-level">Lvl ${item.lvl}</span>
                        </div>
                        ${wornEffectHtml}
                        ${auraIndicator}
                    </div>
                </div>
                <div class="gear-stats">
                    <ul class="gear-stats-list" style="margin:0; padding-left:20px;">${statsHtml || '<li>No stats</li>'}</ul>
                </div>
            </div>
            <button class="equip-btn" 
                    data-slot="${item.slot.toLowerCase()}" 
                    data-item-name="${item.name}"
                    data-item='${JSON.stringify(item).replace(/'/g, "&apos;")}'>
                ⚔️ Equip
            </button>
        `;

        // Add click handler for the equip button
        const equipBtn = card.querySelector('.equip-btn');
        if (equipBtn) {
            equipBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const slot = e.target.dataset.slot;
                const item = JSON.parse(e.target.dataset.item);

                if (window.equipItem) {
                    window.equipItem(slot, item);

                    // Use the current global tier for new items
                    const globalTier = getCurrentTier();
                    if (window.setSlotTier) {
                        window.setSlotTier(slot, globalTier);
                    }

                    renderCurrentGear(window.getCurrentGear());
                    showMessage(`Equipped ${item.name} as ${globalTier} tier`, true);
                }
            });
        }

        gearList.appendChild(card);
    });

    console.log(`Created ${items.length} gear cards with equip buttons`);
}

function toggleGearDatabase() {
    console.log("toggleGearDatabase called");

    const dbBody = document.getElementById('gear-db-body');
    const chevron = document.getElementById('gear-db-chevron');

    if (!dbBody || !chevron) return;

    const isVisible = dbBody.style.display !== 'none';

    if (isVisible) {
        dbBody.style.display = 'none';
        chevron.textContent = '▶';
        chevron.style.transform = 'rotate(0deg)';
    } else {
        dbBody.style.display = 'block';
        chevron.textContent = '▼';
        chevron.style.transform = 'rotate(90deg)';
    }
}

function renderCurrentGear(gear) {
    console.log("renderCurrentGear called with:", gear);

    const panel = document.getElementById('current-gear-panel');
    if (!panel) {
        showMessage("Couldn't find current-gear-panel", false);
        return;
    }

    panel.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = `
        <h2>⚔️ Current Gear</h2>
        <button class="clear-btn" onclick="window.clearCurrentGear()" style="background:none; border:1px solid var(--red); color:var(--red-light); padding:2px 8px; font-size:0.7rem; cursor:pointer; border-radius:3px;">✗ Clear All</button>
    `;
    panel.appendChild(header);

    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'score-bar';
    scoreDiv.id = 'current-gear-score';
    panel.appendChild(scoreDiv);

    const grid = document.createElement('div');
    grid.className = 'result-grid';
    panel.appendChild(grid);

    const slots = [
        { key: 'head', label: 'Head' },
        { key: 'neck', label: 'Neck' },
        { key: 'chest', label: 'Chest' },
        { key: 'back', label: 'Back' },
        { key: 'arms', label: 'Arms' },
        { key: 'hands', label: 'Hands' },
        { key: 'waist', label: 'Waist' },
        { key: 'legs', label: 'Legs' },
        { key: 'feet', label: 'Feet' },
        { key: 'wrist', label: 'Wrist' },
        { key: 'ring1', label: 'Ring 1' },
        { key: 'ring2', label: 'Ring 2' },
        { key: 'primary', label: 'Primary' },
        { key: 'secondary', label: 'Secondary' },
        { key: 'aura', label: 'Aura' },
        { key: 'charm', label: 'Charm' }
    ];

    function updateTotalScore() {
        const statWeights = window.currentStatWeights || {};
        let total = 0;

        slots.forEach(slot => {
            const item = gear[slot.key];
            if (item) {
                const slotTier = getSlotTier(slot.key);
                total += window.computeLoadoutScore({ [slot.key]: item }, slotTier, statWeights);
            }
        });

        scoreDiv.innerHTML = `<span class="score-label">Current Gear Score</span><span class="score-value">${Math.round(total || 0)}</span>`;
    }

    slots.forEach(slot => {
        const item = gear[slot.key];
        const slotDiv = document.createElement('div');
        slotDiv.className = 'result-slot';
        slotDiv.setAttribute('data-slot', slot.key);
        slotDiv.style.cursor = 'pointer';

        const slotTier = getSlotTier(slot.key);

        const slotHeader = document.createElement('div');
        slotHeader.className = 'result-slot-header';
        slotHeader.innerHTML = `
            <span class="result-slot-name">${slot.label}</span>
            <div style="display:flex; gap:4px;">
                <select class="tier-select" data-slot="${slot.key}" style="background:var(--surface2); border:1px solid var(--border); color:var(--text); font-size:0.65rem; padding:2px; border-radius:3px;">
                    <option value="base" ${slotTier === 'base' ? 'selected' : ''}>Base</option>
                    <option value="blessed" ${slotTier === 'blessed' ? 'selected' : ''}>✦ Blessed</option>
                    <option value="godly" ${slotTier === 'godly' ? 'selected' : ''}>✦✦ Godly</option>
                </select>
                <span class="edit-icon" style="font-size:0.8rem; opacity:0.7; cursor:pointer;">✎</span>
            </div>
        `;
        slotDiv.appendChild(slotHeader);

        if (item) {
            const imageHtml = getItemImageSrc(item) ? `<img src="${getItemImageSrc(item)}" alt="${item.name}" style="width:48px; height:48px; object-fit:contain; image-rendering:pixelated;">` : '';

            let sparkleHtml = '';
            if (slotTier === 'blessed' && item.blessed && Object.keys(item.blessed).length > 0) {
                sparkleHtml = `<img src="${BLESSED_SPARKLE}" style="position:absolute; top:0; left:0; width:48px; height:48px; z-index:2; object-fit:contain;" title="Blessed">`;
            } else if (slotTier === 'godly' && item.godly && Object.keys(item.godly).length > 0) {
                sparkleHtml = `<img src="${GODLY_SPARKLE}" style="position:absolute; top:0; left:0; width:48px; height:48px; z-index:2; object-fit:contain;" title="Godly">`;
            }

            const wornEffect = formatWornEffect(item);
            const wornEffectHtml = wornEffect ? `
                <div class="worn-effect" style="margin-top:4px; font-size:0.7rem;">
                    <span class="worn-effect-name" 
                          style="color:var(--blue-light); cursor:help; text-decoration:underline dotted;"
                          onmouseenter="showWornEffectTooltip('${wornEffect.name.replace(/'/g, "\\'")}', '${wornEffect.description.replace(/'/g, "\\'")}')"
                          onmouseleave="hideTooltip()"
                          onclick="showWornEffectDetails('${wornEffect.name.replace(/'/g, "\\'")}')">
                        ✨ ${wornEffect.name}
                    </span>
                </div>
            ` : '';

            const auraFallback = (slot.key === 'aura' && !wornEffect) ?
                '<div style="color:var(--gold); font-size:0.7rem; margin-top:2px;">Active Aura</div>' : '';

            const itemContainer = document.createElement('div');
            itemContainer.style.display = 'flex';
            itemContainer.style.alignItems = 'flex-start';
            itemContainer.style.gap = '8px';
            itemContainer.style.marginTop = '4px';

            const imageContainer = document.createElement('div');
            imageContainer.style.position = 'relative';
            imageContainer.style.width = '48px';
            imageContainer.style.height = '48px';
            imageContainer.style.flexShrink = '0';
            imageContainer.innerHTML = imageHtml + sparkleHtml;

            const detailsContainer = document.createElement('div');
            detailsContainer.style.flex = '1';
            detailsContainer.style.minWidth = '0';
            detailsContainer.innerHTML = `
                <div class="result-item-name" style="font-weight:bold; margin-bottom:2px;">${item.name}</div>
                ${wornEffectHtml}
                ${auraFallback}
            `;

            itemContainer.appendChild(imageContainer);
            itemContainer.appendChild(detailsContainer);
            slotDiv.appendChild(itemContainer);

            const stats = formatItemStats(item, slotTier);
            if (stats.length > 0) {
                const statsList = document.createElement('ul');
                statsList.className = 'result-item-stats';
                statsList.style.margin = '8px 0 0 0';
                statsList.style.paddingLeft = '20px';
                statsList.style.fontSize = '0.75rem';

                stats.forEach(({ stat, value }) => {
                    const li = document.createElement('li');
                    li.textContent = `${stat.toUpperCase()}: ${value}`;
                    statsList.appendChild(li);
                });

                slotDiv.appendChild(statsList);
            }
        } else {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'result-empty';
            emptyDiv.style.padding = '8px';
            emptyDiv.style.textAlign = 'center';
            emptyDiv.textContent = 'Empty';
            slotDiv.appendChild(emptyDiv);
        }

        // Tier select change handler
        const tierSelect = slotDiv.querySelector('.tier-select');
        if (tierSelect) {
            tierSelect.addEventListener('change', (e) => {
                e.stopPropagation();
                const newTier = e.target.value;
                setSlotTier(slot.key, newTier);
                renderCurrentGear(gear);
            });
        }

        slotDiv.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-icon') || e.target.classList.contains('tier-select')) {
                return;
            }
            window.openSlotModal(slot.key, null, function (slotKey, selectedItem) {
                window.equipItem(slotKey, selectedItem);
                const globalTier = getCurrentTier();
                setSlotTier(slotKey, globalTier);
                renderCurrentGear(window.getCurrentGear());
            }, 'currentGear');
        });

        const editIcon = slotDiv.querySelector('.edit-icon');
        if (editIcon) {
            editIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                window.openSlotModal(slot.key, null, function (slotKey, selectedItem) {
                    window.equipItem(slotKey, selectedItem);
                    const globalTier = getCurrentTier();
                    setSlotTier(slotKey, globalTier);
                    renderCurrentGear(window.getCurrentGear());
                }, 'currentGear');
            });
        }

        grid.appendChild(slotDiv);
    });

    panel.appendChild(grid);
    updateTotalScore();
    window.updateCurrentGearScore = updateTotalScore;
}

function renderLoadoutBuilder(loadout, candidates, tier, statWeights) {
    console.log("renderLoadoutBuilder called with", loadout, candidates);
    const panel = document.getElementById('loadout-builder-panel');
    if (!panel) return;

    panel.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = `
        <h2>Loadout Builder</h2>
        <button class="clear-btn" onclick="window.clearLoadoutBuilder()" style="background:none; border:1px solid var(--red); color:var(--red-light); padding:2px 8px; font-size:0.7rem; cursor:pointer; border-radius:3px;">✗ Clear All</button>
    `;
    panel.appendChild(header);

    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'score-bar';
    scoreDiv.id = 'loadout-total-score';
    panel.appendChild(scoreDiv);

    const grid = document.createElement('div');
    grid.className = 'result-grid';
    panel.appendChild(grid);

    const allSlots = [
        'head', 'neck', 'chest', 'back', 'arms', 'hands', 'waist',
        'legs', 'feet', 'wrist', 'ring1', 'ring2', 'primary', 'secondary',
        'aura', 'charm'
    ];

    const slots = candidates && Object.keys(candidates).length > 0 ? Object.keys(candidates) : allSlots;

    function updateTotalScore() {
        const currentLoadout = {};
        const relicNames = new Set();
        let duplicateRelic = false;
        let hasValidItems = false;
        let total = 0;

        slots.forEach(slot => {
            const slotDiv = document.querySelector(`#loadout-builder-panel .result-slot[data-slot="${slot}"]`);
            if (slotDiv && slotDiv.dataset.itemName) {
                const itemName = slotDiv.dataset.itemName;
                let item = null;

                if (candidates && candidates[slot] && Array.isArray(candidates[slot])) {
                    item = candidates[slot].find(i => i && i.name === itemName);
                }

                if (!item && loadout && loadout[slot] && loadout[slot].name === itemName) {
                    item = loadout[slot];
                }

                if (!item) {
                    item = window.gearData?.find(g => g && g.name === itemName);
                }

                if (item) {
                    currentLoadout[slot] = item;
                    hasValidItems = true;
                    if (item.relic) {
                        if (relicNames.has(item.name)) duplicateRelic = true;
                        relicNames.add(item.name);
                    }

                    const slotTier = getSlotTier(slot);
                    total += window.computeLoadoutScore({ [slot]: item }, slotTier, statWeights);
                }
            }
        });

        let scoreHtml = `<span class="score-label">Total Score</span><span class="score-value">${Math.round(total || 0)}</span>`;
        if (duplicateRelic) {
            scoreHtml += '<span style="color:var(--red-light); margin-left:1rem;">⚠ Duplicate relic</span>';
        }
        scoreDiv.innerHTML = scoreHtml;
    }

    function updateLoadoutSlot(slotKey, newItem) {
        loadout[slotKey] = newItem;

        if (!candidates[slotKey]) {
            candidates[slotKey] = [];
        }
        if (newItem && !candidates[slotKey].find(i => i && i.name === newItem.name)) {
            candidates[slotKey].push(newItem);
        }

        renderLoadoutBuilder(loadout, candidates, tier, statWeights);
    }

    slots.forEach(slot => {
        const item = loadout[slot];
        const slotDiv = document.createElement('div');
        slotDiv.className = 'result-slot';
        slotDiv.setAttribute('data-slot', slot);
        if (item) slotDiv.dataset.itemName = item.name;
        slotDiv.style.cursor = 'pointer';

        const slotTier = getSlotTier(slot);

        const slotHeader = document.createElement('div');
        slotHeader.className = 'result-slot-header';
        slotHeader.innerHTML = `
            <span class="result-slot-name">${slot}</span>
            <div style="display:flex; gap:4px;">
                <select class="tier-select" data-slot="${slot}" style="background:var(--surface2); border:1px solid var(--border); color:var(--text); font-size:0.65rem; padding:2px; border-radius:3px;">
                    <option value="base" ${slotTier === 'base' ? 'selected' : ''}>Base</option>
                    <option value="blessed" ${slotTier === 'blessed' ? 'selected' : ''}>✦ Blessed</option>
                    <option value="godly" ${slotTier === 'godly' ? 'selected' : ''}>✦✦ Godly</option>
                </select>
            </div>
        `;
        slotDiv.appendChild(slotHeader);

        if (item) {
            const imageHtml = getItemImageSrc(item) ? `<img src="${getItemImageSrc(item)}" alt="${item.name}" style="width:48px; height:48px; object-fit:contain; image-rendering:pixelated;">` : '';

            let sparkleHtml = '';
            if (slotTier === 'blessed' && item.blessed && Object.keys(item.blessed).length > 0) {
                sparkleHtml = `<img src="${BLESSED_SPARKLE}" style="position:absolute; top:0; left:0; width:48px; height:48px; z-index:2; object-fit:contain;" title="Blessed">`;
            } else if (slotTier === 'godly' && item.godly && Object.keys(item.godly).length > 0) {
                sparkleHtml = `<img src="${GODLY_SPARKLE}" style="position:absolute; top:0; left:0; width:48px; height:48px; z-index:2; object-fit:contain;" title="Godly">`;
            }

            const wornEffect = formatWornEffect(item);
            const wornEffectHtml = wornEffect ? `
                <div class="worn-effect" style="margin-top:4px; font-size:0.7rem;">
                    <span class="worn-effect-name" 
                          style="color:var(--blue-light); cursor:help; text-decoration:underline dotted;"
                          onmouseenter="showWornEffectTooltip('${wornEffect.name.replace(/'/g, "\\'")}', '${wornEffect.description.replace(/'/g, "\\'")}')"
                          onmouseleave="hideTooltip()"
                          onclick="showWornEffectDetails('${wornEffect.name.replace(/'/g, "\\'")}')">
                        ✨ ${wornEffect.name}
                    </span>
                </div>
            ` : '';

            const auraFallback = (slot === 'aura' && !wornEffect) ?
                '<div style="color:var(--gold); font-size:0.7rem; margin-top:2px;">Active Aura</div>' : '';

            const itemContainer = document.createElement('div');
            itemContainer.style.display = 'flex';
            itemContainer.style.alignItems = 'flex-start';
            itemContainer.style.gap = '8px';
            itemContainer.style.marginTop = '4px';

            const imageContainer = document.createElement('div');
            imageContainer.style.position = 'relative';
            imageContainer.style.width = '48px';
            imageContainer.style.height = '48px';
            imageContainer.style.flexShrink = '0';
            imageContainer.innerHTML = imageHtml + sparkleHtml;

            const detailsContainer = document.createElement('div');
            detailsContainer.style.flex = '1';
            detailsContainer.style.minWidth = '0';
            detailsContainer.innerHTML = `
                <div class="result-item-name" style="font-weight:bold; margin-bottom:2px;">${item.name}</div>
                ${wornEffectHtml}
                ${auraFallback}
            `;

            itemContainer.appendChild(imageContainer);
            itemContainer.appendChild(detailsContainer);
            slotDiv.appendChild(itemContainer);

            const stats = formatItemStats(item, slotTier);
            if (stats.length > 0) {
                const statsList = document.createElement('ul');
                statsList.className = 'result-item-stats';
                statsList.style.margin = '8px 0 0 0';
                statsList.style.paddingLeft = '20px';
                statsList.style.fontSize = '0.75rem';

                stats.forEach(({ stat, value }) => {
                    const li = document.createElement('li');
                    li.textContent = `${stat.toUpperCase()}: ${value}`;
                    statsList.appendChild(li);
                });

                slotDiv.appendChild(statsList);
            }
        } else {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'result-empty';
            emptyDiv.style.padding = '8px';
            emptyDiv.style.textAlign = 'center';
            emptyDiv.textContent = 'Empty';
            slotDiv.appendChild(emptyDiv);
        }

        // Tier select change handler
        const tierSelect = slotDiv.querySelector('.tier-select');
        if (tierSelect) {
            tierSelect.addEventListener('change', (e) => {
                e.stopPropagation();
                const newTier = e.target.value;
                setSlotTier(slot, newTier);
                renderLoadoutBuilder(loadout, candidates, tier, statWeights);
            });
        }

        slotDiv.addEventListener('click', (e) => {
            if (e.target.classList.contains('tier-select')) {
                return;
            }
            window.openSlotModal(slot, candidates[slot] || [], function (slotKey, selectedItem) {
                const globalTier = getCurrentTier();
                setSlotTier(slotKey, globalTier);
                updateLoadoutSlot(slotKey, selectedItem);
            }, 'loadoutBuilder');
        });

        grid.appendChild(slotDiv);
    });

    panel.appendChild(grid);
    updateTotalScore();
}

function renderEmptyLoadoutBuilder() {
    const panel = document.getElementById('loadout-builder-panel');
    if (!panel) return;

    panel.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = `
        <h2>Loadout Builder</h2>
        <button class="clear-btn" onclick="window.clearLoadoutBuilder()" style="background:none; border:1px solid var(--red); color:var(--red-light); padding:2px 8px; font-size:0.7rem; cursor:pointer; border-radius:3px;">✗ Clear All</button>
    `;
    panel.appendChild(header);

    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'score-bar';
    scoreDiv.id = 'loadout-total-score';
    scoreDiv.innerHTML = '<span class="score-label">Total Score</span><span class="score-value">0</span>';
    panel.appendChild(scoreDiv);

    const grid = document.createElement('div');
    grid.className = 'result-grid';
    panel.appendChild(grid);

    const slots = [
        'head', 'neck', 'chest', 'back', 'arms', 'hands', 'waist',
        'legs', 'feet', 'wrist', 'ring1', 'ring2', 'primary', 'secondary',
        'aura', 'charm'
    ];

    slots.forEach(slot => {
        const slotDiv = document.createElement('div');
        slotDiv.className = 'result-slot';
        slotDiv.setAttribute('data-slot', slot);
        slotDiv.style.cursor = 'pointer';

        const slotTier = getSlotTier(slot);

        const slotHeader = document.createElement('div');
        slotHeader.className = 'result-slot-header';
        slotHeader.innerHTML = `
            <span class="result-slot-name">${slot}</span>
            <div style="display:flex; gap:4px;">
                <select class="tier-select" data-slot="${slot}" style="background:var(--surface2); border:1px solid var(--border); color:var(--text); font-size:0.65rem; padding:2px; border-radius:3px;">
                    <option value="base" ${slotTier === 'base' ? 'selected' : ''}>Base</option>
                    <option value="blessed" ${slotTier === 'blessed' ? 'selected' : ''}>✦ Blessed</option>
                    <option value="godly" ${slotTier === 'godly' ? 'selected' : ''}>✦✦ Godly</option>
                </select>
            </div>
        `;
        slotDiv.appendChild(slotHeader);

        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'result-empty';
        emptyDiv.style.padding = '8px';
        emptyDiv.style.textAlign = 'center';
        emptyDiv.textContent = 'Empty';
        slotDiv.appendChild(emptyDiv);

        // Tier select change handler
        const tierSelect = slotDiv.querySelector('.tier-select');
        if (tierSelect) {
            tierSelect.addEventListener('change', (e) => {
                e.stopPropagation();
                const newTier = e.target.value;
                setSlotTier(slot, newTier);
                // Just update the tier for empty slot - no need to re-render
            });
        }

        slotDiv.addEventListener('click', (e) => {
            if (e.target.classList.contains('tier-select')) {
                return;
            }
            window.openSlotModal(slot, null, function (slotKey, selectedItem) {
                if (!window.lastOptimizerResult) {
                    window.lastOptimizerResult = {
                        bestLoadout: {},
                        candidates: {}
                    };
                }
                window.lastOptimizerResult.bestLoadout[slotKey] = selectedItem;
                const globalTier = getCurrentTier();
                setSlotTier(slotKey, globalTier);
                renderLoadoutBuilder(
                    window.lastOptimizerResult.bestLoadout,
                    window.lastOptimizerResult.candidates,
                    getCurrentTier(),
                    window.currentStatWeights || {}
                );
            }, 'loadoutBuilder');
        });

        grid.appendChild(slotDiv);
    });

    panel.appendChild(grid);
}

// ==================== MODAL FUNCTIONS ====================

function setupModalCloseHandlers() {
    const modal = document.getElementById('slot-modal');
    const closeBtn = document.getElementById('slot-modal-close');
    const backdrop = document.querySelector('.slot-modal-backdrop');

    if (closeBtn) {
        closeBtn.replaceWith(closeBtn.cloneNode(true));
        const newCloseBtn = document.getElementById('slot-modal-close');
        newCloseBtn.onclick = function () {
            modal.style.display = 'none';
            currentModalCallback = null;
            currentModalContext = null;
        };
    }

    if (backdrop) {
        backdrop.onclick = function (e) {
            if (e.target === backdrop) {
                modal.style.display = 'none';
                currentModalCallback = null;
                currentModalContext = null;
            }
        };
    }
}

window.openSlotModal = function (slotKey, itemList = null, onSelectCallback = null, context = 'currentGear') {
    currentModalSlot = slotKey;
    currentModalItemList = itemList;
    currentModalCallback = onSelectCallback;
    currentModalContext = context;

    const modal = document.getElementById('slot-modal');
    if (!modal) {
        console.error("Modal element not found");
        return;
    }

    const title = document.getElementById('slot-modal-title');
    if (title) title.textContent = `Select ${slotKey}`;

    populateSlotModal(slotKey);
    setupModalCloseHandlers();
    modal.style.display = 'flex';
};

function populateSlotModal(slotKey) {
    const resultsDiv = document.getElementById('slot-modal-results');
    const searchInput = document.getElementById('slot-modal-search');

    let items = currentModalItemList || window.gearData || [];

    if (!currentModalItemList) {
        const slotMap = {
            head: 'Head', neck: 'Neck', chest: 'Chest', back: 'Back',
            arms: 'Arms', hands: 'Hands', waist: 'Waist', legs: 'Legs',
            feet: 'Feet', wrist: 'Wrist', ring1: 'Ring', ring2: 'Ring',
            primary: 'Primary', secondary: 'Secondary', aura: 'Aura', charm: 'Charm'
        };
        const gearSlot = slotMap[slotKey];
        items = items.filter(item => item && item.slot === gearSlot);
    }

    renderModalItems(items, searchInput ? searchInput.value : '');

    if (searchInput) {
        searchInput.oninput = function () {
            const searchTerm = this.value.toLowerCase();
            const filteredSearch = items.filter(item =>
                item && item.name && item.name.toLowerCase().includes(searchTerm)
            );
            renderModalItems(filteredSearch, searchTerm);
        };
    }
}

function renderModalItems(items, searchTerm = '') {
    const resultsDiv = document.getElementById('slot-modal-results');
    if (!resultsDiv) return;
    resultsDiv.innerHTML = '';

    if (!items || items.length === 0) {
        resultsDiv.innerHTML = '<div class="slot-modal-empty">No items found</div>';
        return;
    }

    items.forEach(item => {
        if (!item) return;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'smi';

        const statsStr = Object.entries(item.stats || {})
            .map(([k, v]) => `${k.toUpperCase()}+${v}`)
            .join(' ');

        itemDiv.innerHTML = `
            <span class="smi-name">${item.name || 'Unknown'}</span>
            <span class="smi-level">Lvl ${item.lvl || '?'}</span>
            <span class="smi-stats">${statsStr}</span>
        `;

        itemDiv.addEventListener('click', () => {
            if (currentModalCallback) {
                currentModalCallback(currentModalSlot, item);
            } else if (currentModalContext === 'currentGear' && window.equipItem) {
                window.equipItem(currentModalSlot, item);
                const globalTier = getCurrentTier();
                if (window.setSlotTier) {
                    window.setSlotTier(currentModalSlot, globalTier);
                }
                renderCurrentGear(window.getCurrentGear());
            }

            const modal = document.getElementById('slot-modal');
            if (modal) modal.style.display = 'none';

            currentModalCallback = null;
            currentModalContext = null;
        });

        resultsDiv.appendChild(itemDiv);
    });
}

// ==================== TOOLTIP FUNCTIONS ====================

window.showWornEffectTooltip = function (name, description) {
    const tooltip = document.getElementById('gear-tooltip');
    if (!tooltip) return;

    tooltip.innerHTML = `
        <div class="tt-name">${name}</div>
        <div class="tt-worn-note">${description}</div>
    `;

    tooltip.style.display = 'block';

    document.addEventListener('mousemove', function positionTooltip(e) {
        tooltip.style.left = (e.pageX + 15) + 'px';
        tooltip.style.top = (e.pageY - 30) + 'px';
    }, { once: true });
};

window.hideTooltip = function () {
    const tooltip = document.getElementById('gear-tooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
    }
};

window.showWornEffectDetails = function (effectName) {
    showMessage(`Detailed information for ${effectName} - coming soon!`, true);
};

window.toggleOptimizePanel = function () {
    const panelBody = document.getElementById('optimize-panel-body');
    const chevron = document.getElementById('optimize-panel-chevron');
    if (!panelBody || !chevron) return;

    const isVisible = panelBody.style.display !== 'none';
    panelBody.style.display = isVisible ? 'none' : 'block';
    chevron.textContent = isVisible ? '▶' : '▼';

    adjustAscOptLayout();
};

function adjustAscOptLayout() {
    const row = document.getElementById('asc-opt-row');
    if (!row) return;

    const ascBody = document.getElementById('asc-panel-body');
    const optBody = document.getElementById('optimize-panel-body');
    const ascOpen = ascBody ? ascBody.style.display !== 'none' : true;
    const optOpen = optBody ? optBody.style.display !== 'none' : true;

    if (ascOpen && optOpen) {
        row.style.gridTemplateColumns = '1fr 1fr';
    } else if (ascOpen && !optOpen) {
        row.style.gridTemplateColumns = '1fr auto';
    } else if (!ascOpen && optOpen) {
        row.style.gridTemplateColumns = 'auto 1fr';
    } else {
        row.style.gridTemplateColumns = 'auto auto';
    }
}

window.adjustAscOptLayout = adjustAscOptLayout;

// ==================== CLEAR FUNCTIONS ====================

window.clearCurrentGear = function () {
    if (confirm('Clear all current gear?')) {
        const slots = [
            'head', 'neck', 'chest', 'back', 'arms', 'hands', 'waist',
            'legs', 'feet', 'wrist', 'ring1', 'ring2', 'primary', 'secondary',
            'aura', 'charm'
        ];
        slots.forEach(slot => {
            window.unequipItem(slot);
            setSlotTier(slot, 'base');
        });
        renderCurrentGear(window.getCurrentGear());
        showMessage('Current gear cleared', true);
    }
};

window.clearLoadoutBuilder = function () {
    if (confirm('Clear loadout builder?')) {
        window.lastOptimizerResult = null;
        const slots = [
            'head', 'neck', 'chest', 'back', 'arms', 'hands', 'waist',
            'legs', 'feet', 'wrist', 'ring1', 'ring2', 'primary', 'secondary',
            'aura', 'charm'
        ];
        slots.forEach(slot => setSlotTier(slot, 'base'));
        renderEmptyLoadoutBuilder();
        showMessage('Loadout builder cleared', true);
    }
};

// ==================== GLOBAL ASSIGNMENTS ====================
window.toggleGearDb = toggleGearDatabase;
window.resetWeights = window.resetWeights || function () { console.log("resetWeights called"); };
window.setSlotTier = setSlotTier;
window.toggleAscPanel = toggleAscensionsPanel;
window.optimizeAndScroll = window.optimizeAndScroll || function () {
    console.log("optimizeAndScroll called");
    showMessage("Optimizer coming soon!", true);
};
window.renderGearList = renderGearList;
window.showMessage = showMessage;
window.adjustPanelLayout = adjustPanelLayout;
window.renderEmptyLoadoutBuilder = renderEmptyLoadoutBuilder;
window.showWornEffectTooltip = window.showWornEffectTooltip;
window.hideTooltip = window.hideTooltip;
window.showWornEffectDetails = window.showWornEffectDetails;
window.openSlotModal = window.openSlotModal;
window.closeModal = function () {
    const modal = document.getElementById('slot-modal');
    if (modal) {
        modal.style.display = 'none';
        currentModalCallback = null;
        currentModalContext = null;
    }
};
window.clearCurrentGear = window.clearCurrentGear;
window.clearLoadoutBuilder = window.clearLoadoutBuilder;

window.setTier = function (tier) {
    console.log("setTier called:", tier);

    document.querySelectorAll('.tier-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`tier-${tier}`)?.classList.add('active');

    showMessage(`New items will be placed as ${tier} tier. Use slot dropdowns to change existing items.`, true);
};

// ==================== EXPORTS ====================
export {
    showMessage,
    renderClassBar,
    renderClassDescription,
    renderStatWeightEditors,
    renderAscensions,
    toggleAscensionsPanel,
    renderLoadoutBuilder,
    renderEmptyLoadoutBuilder,
    renderCurrentGear,
    renderGearList
};