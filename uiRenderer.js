// uiRenderer.js
// This file ONLY handles displaying things on screen

import { BLESSED_SPARKLE, GODLY_SPARKLE } from './itemImages.js';

// Helper function (private - not exported)
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with id "${id}" not found`);
    }
    return element;
}

// Helper to get sparkle based on tier (for loadout builder)
function getTierSparkle(tier) {
    if (tier === 'blessed') return BLESSED_SPARKLE;
    if (tier === 'godly') return GODLY_SPARKLE;
    return null;
}

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

// Helper to get item image src (base64) or empty string if not found
function getItemImageSrc(item) {
    if (!item) return '';
    const name = item.name;
    const src = (window.ITEM_IMAGES && window.ITEM_IMAGES[name]) ? window.ITEM_IMAGES[name] : '';
    // Optional debug logs (commented out to reduce noise)
    // if (!src && window.ITEM_IMAGES) {
    //     console.log(`❌ No image for: "${name}"`);
    //     if (!window._loggedKeys) {
    //         window._loggedKeys = true;
    //         console.log('Sample ITEM_IMAGES keys:', Object.keys(window.ITEM_IMAGES).slice(0, 5));
    //     }
    // } else if (src) {
    //     console.log(`✅ Image found for: "${name}"`);
    // }
    return src;
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

function renderProficiencies(proficiencies) {
    console.log("renderProficiencies called with:", proficiencies);

    const table = getElement('prof-table');
    if (!table) {
        showMessage("Couldn't find prof-table element", false);
        return;
    }

    table.innerHTML = '';

    if (!proficiencies || Object.keys(proficiencies).length === 0) {
        table.innerHTML = '<p class="note">No proficiency data available</p>';
        return;
    }

    const tableElem = document.createElement('table');
    tableElem.style.width = '100%';
    tableElem.style.borderCollapse = 'collapse';

    tableElem.innerHTML = `
        <thead>
            <tr style="border-bottom:1px solid var(--border);">
                <th style="text-align:left; padding:8px 4px;">Proficiency</th>
                <th style="text-align:center; padding:8px 4px;">Base</th>
                <th style="text-align:center; padding:8px 4px;">Effect</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;

    const tbody = tableElem.querySelector('tbody');

    const profNames = {
        physicality: 'Physicality',
        hardiness: 'Hardiness',
        finesse: 'Finesse',
        defense: 'Defense',
        arcanism: 'Arcanism',
        restoration: 'Restoration',
        mind: 'Mind'
    };

    const boosts = {
        physicality: 'STR-based damage',
        hardiness: 'END (HP & mitigation)',
        finesse: 'DEX/AGI (crit/avoid)',
        defense: 'Armor & block',
        arcanism: 'INT (spell power)',
        restoration: 'Healing & mana',
        mind: 'WIS/CHA (utility)'
    };

    Object.entries(proficiencies).forEach(([prof, value]) => {
        if (value > 0) {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid var(--border)';
            row.innerHTML = `
                <td style="padding:8px 4px; color:var(--text-bright)">${profNames[prof] || prof}</td>
                <td style="padding:8px 4px; text-align:center; font-weight:bold;">${value}</td>
                <td style="padding:8px 4px; color:var(--text-dim); font-size:0.8rem;">${boosts[prof] || 'Various effects'}</td>
            `;
            tbody.appendChild(row);
        }
    });

    table.appendChild(tableElem);
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

function renderAscensions(ascensions, selectedAscensions = []) {
    console.log("renderAscensions called with:", ascensions?.length || 0, "ascensions");

    const container = getElement('asc-panel-inner');
    if (!container) {
        showMessage("Couldn't find asc-panel-inner element", false);
        return;
    }

    container.innerHTML = '';

    if (!ascensions || ascensions.length === 0) {
        container.innerHTML = '<p class="note">No ascensions available for this class</p>';
        return;
    }

    ascensions.forEach(asc => {
        const card = document.createElement('div');
        card.className = 'asc-card';
        card.setAttribute('data-asc-id', asc.id);

        const statsBonus = asc.stats ? Object.entries(asc.stats)
            .filter(([_, val]) => val > 0)
            .map(([stat, val]) => `${stat}: +${val}%`)
            .join(', ') : '';

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span style="font-weight:bold; color:var(--text-bright)">${asc.name || 'Unknown'}</span>
                <span style="color:var(--text-dim); font-size:0.75rem;">Rank ${asc.maxRank || 1}</span>
            </div>
            <p style="font-size:0.8rem; margin:4px 0; color:var(--text-dim);">${asc.description || ''}</p>
            ${statsBonus ? `<p style="font-size:0.7rem; margin:4px 0; color:#8bc34a;">${statsBonus}</p>` : ''}
            <div style="display:flex; gap:4px; margin-top:8px;">
                ${Array.from({ length: asc.maxRank || 1 }, (_, i) => `
                    <span class="rank-dot ${i === 0 ? 'filled' : ''}" 
                          style="width:12px; height:12px; border-radius:50%; background:${i === 0 ? 'var(--text-bright)' : 'var(--border)'}; display:inline-block;"></span>
                `).join('')}
            </div>
        `;

        container.appendChild(card);
    });
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

    container.innerHTML = ''; // Clear old content

    // Create a table
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';

    // Table header
    table.innerHTML = `
        <thead>
            <tr style="border-bottom:1px solid var(--border);">
                <th style="text-align:left; padding:8px 4px;">Proficiency</th>
                <th style="text-align:center; padding:8px 4px;">Base</th>
                <th style="text-align:center; padding:8px 4px;">Allocated</th>
                <th style="text-align:center; padding:8px 4px;">Total</th>
                <th style="text-align:center; padding:8px 4px;"></th> <!-- for buttons -->
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;

    const tbody = table.querySelector('tbody');

    // Map proficiency keys to display names
    const profNames = {
        physicality: 'Physicality',
        hardiness: 'Hardiness',
        finesse: 'Finesse',
        defense: 'Defense',
        arcanism: 'Arcanism',
        restoration: 'Restoration',
        mind: 'Mind'
    };

    // Create a row for each proficiency
    Object.entries(baseProfs).forEach(([key, baseValue]) => {
        const allocated = allocations[key] || 0;
        const total = baseValue + allocated;

        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid var(--border-light)';

        // Proficiency name
        const nameCell = document.createElement('td');
        nameCell.style.padding = '8px 4px';
        nameCell.style.color = 'var(--text-bright)';
        nameCell.textContent = profNames[key] || key;
        row.appendChild(nameCell);

        // Base value
        const baseCell = document.createElement('td');
        baseCell.style.padding = '8px 4px';
        baseCell.style.textAlign = 'center';
        baseCell.style.fontWeight = 'bold';
        baseCell.textContent = baseValue;
        row.appendChild(baseCell);

        // Allocated value (with buttons)
        const allocCell = document.createElement('td');
        allocCell.style.padding = '8px 4px';
        allocCell.style.textAlign = 'center';

        // Container for allocated number and buttons
        const allocDiv = document.createElement('div');
        allocDiv.style.display = 'flex';
        allocDiv.style.alignItems = 'center';
        allocDiv.style.justifyContent = 'center';
        allocDiv.style.gap = '4px';

        // Minus button
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

        // Allocated number
        const allocSpan = document.createElement('span');
        allocSpan.style.minWidth = '30px';
        allocSpan.style.textAlign = 'center';
        allocSpan.style.fontWeight = 'bold';
        allocSpan.textContent = allocated;
        allocDiv.appendChild(allocSpan);

        // Plus button
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

        // Total value
        const totalCell = document.createElement('td');
        totalCell.style.padding = '8px 4px';
        totalCell.style.textAlign = 'center';
        totalCell.style.fontWeight = 'bold';
        totalCell.style.color = 'var(--gold)';
        totalCell.textContent = total;
        row.appendChild(totalCell);

        // Empty cell for alignment (keeps table consistent)
        const emptyCell = document.createElement('td');
        emptyCell.style.padding = '8px 4px';
        row.appendChild(emptyCell);

        tbody.appendChild(row);
    });

    // Add a row for points remaining
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

        // Determine sparkle for blessed/godly
        const sparkleHtml = item.blessed ? `<img src="${BLESSED_SPARKLE}" style="width:24px; height:24px; margin-left:4px; vertical-align:middle;" title="Blessed">` :
            (item.godly ? `<img src="${GODLY_SPARKLE}" style="width:24px; height:24px; margin-left:4px; vertical-align:middle;" title="Godly">` : '');

        // Stats as bulleted list
        const statsHtml = Object.entries(item.stats)
            .map(([stat, value]) => `<li>${stat.toUpperCase()}: ${value}</li>`)
            .join('');

        const relicTag = item.relic ? '<span class="relic-tag">✨ Relic</span>' : '';

        const qualityHtml = `
            <div class="gear-qualities">
                ${item.blessed ? '<span class="quality-blessed">✦ Blessed</span>' : ''}
                ${item.godly ? '<span class="quality-godly">✦✦ Godly</span>' : ''}
            </div>
        `;

        const slotKey = item.slot.toLowerCase();

        card.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; gap:4px; margin-bottom:8px;">
                <img src="${getItemImageSrc(item)}" alt="${item.name}" class="gear-item-img" style="width:48px; height:48px; object-fit:contain; image-rendering:pixelated;">
                <div style="width:100%;">
                    <div style="display:flex; justify-content:space-between; align-items:start;">
                        <span class="gear-name">${item.name} ${sparkleHtml}</span>
                        ${relicTag}
                    </div>
                    <div class="gear-slot-level">
                        <span class="gear-slot">${item.slot}</span>
                        <span class="gear-level">Lvl ${item.lvl}</span>
                    </div>
                </div>
            </div>
            <div class="gear-stats">
                <ul class="gear-stats-list">${statsHtml || '<li>No stats</li>'}</ul>
            </div>
            ${qualityHtml}
            <button class="equip-btn" 
                    data-slot="${slotKey}" 
                    data-item-name="${item.name}"
                    data-item='${JSON.stringify(item).replace(/'/g, "&apos;")}'>
                ⚔️ Equip
            </button>
        `;

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

    // Header
    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = '<h2>⚔️ Current Gear</h2>';
    panel.appendChild(header);

    // Score bar
    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'score-bar';
    scoreDiv.id = 'current-gear-score';
    panel.appendChild(scoreDiv);

    // Grid container
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
        const tier = document.querySelector('.tier-btn.active')?.id?.replace('tier-', '') || 'base';
        const statWeights = window.currentStatWeights || {};
        const total = window.computeLoadoutScore(gear, tier, statWeights);
        scoreDiv.innerHTML = `<span class="score-label">Current Gear Score</span><span class="score-value">${Math.round(total)}</span>`;
    }

    slots.forEach(slot => {
        const item = gear[slot.key];
        const slotDiv = document.createElement('div');
        slotDiv.className = 'result-slot';
        slotDiv.setAttribute('data-slot', slot.key);
        slotDiv.style.cursor = 'pointer';

        // Slot header
        const slotHeader = document.createElement('div');
        slotHeader.className = 'result-slot-header';
        slotHeader.innerHTML = `
            <span class="result-slot-name">${slot.label}</span>
            <span class="edit-icon" style="font-size:0.8rem; opacity:0.7;">✎</span>
        `;
        slotDiv.appendChild(slotHeader);

        if (item) {
            // Image HTML
            const imageHtml = getItemImageSrc(item) ? `<img src="${getItemImageSrc(item)}" alt="${item.name}" style="width:32px; height:32px; object-fit:contain; image-rendering:pixelated; margin-right:8px;">` : '';

            // --- FIXED SPARKLE LOGIC ---
            // Only show sparkle if blessed/godly object has actual stats
            const hasBlessed = item.blessed && typeof item.blessed === 'object' && Object.keys(item.blessed).length > 0;
            const hasGodly = item.godly && typeof item.godly === 'object' && Object.keys(item.godly).length > 0;
            const sparkleHtml = hasBlessed ? `<img src="${BLESSED_SPARKLE}" style="width:16px; height:16px; margin-left:4px; vertical-align:middle;" title="Blessed">` :
                (hasGodly ? `<img src="${GODLY_SPARKLE}" style="width:16px; height:16px; margin-left:4px; vertical-align:middle;" title="Godly">` : '');
            // -------------------------

            // Name with sparkle
            const nameDiv = document.createElement('div');
            nameDiv.className = 'result-item-name';
            nameDiv.innerHTML = `${imageHtml} ${item.name} ${sparkleHtml}`;
            slotDiv.appendChild(nameDiv);

            // Stats (base)
            const statsDiv = document.createElement('div');
            statsDiv.className = 'result-item-stats';
            statsDiv.textContent = formatItemStats(item, 'base');
            slotDiv.appendChild(statsDiv);
        } else {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'result-empty';
            emptyDiv.textContent = 'Empty';
            slotDiv.appendChild(emptyDiv);
        }

        slotDiv.addEventListener('click', (e) => {
            window.openSlotModal(slot.key);
        });

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

    // Header
    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = '<h2>Loadout Builder</h2>';
    panel.appendChild(header);

    // Score bar
    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'score-bar';
    scoreDiv.id = 'loadout-total-score';
    panel.appendChild(scoreDiv);

    // Grid container
    const grid = document.createElement('div');
    grid.className = 'result-grid';
    panel.appendChild(grid);

    const slots = Object.keys(candidates);

    // Function to update total score (called after changes)
    function updateTotalScore() {
        const currentLoadout = {};
        const relicNames = new Set();
        let duplicateRelic = false;

        slots.forEach(slot => {
            const slotDiv = document.querySelector(`.result-slot[data-slot="${slot}"]`);
            if (slotDiv) {
                const itemName = slotDiv.dataset.itemName;
                const item = candidates[slot]?.find(i => i.name === itemName) || null;
                currentLoadout[slot] = item;
                if (item && item.relic) {
                    if (relicNames.has(item.name)) duplicateRelic = true;
                    relicNames.add(item.name);
                }
            } else {
                currentLoadout[slot] = loadout[slot];
            }
        });

        const total = window.computeLoadoutScore(currentLoadout, tier, statWeights);
        let scoreHtml = `<span class="score-label">Total Score</span><span class="score-value">${Math.round(total)}</span>`;
        if (duplicateRelic) {
            scoreHtml += '<span style="color:var(--red-light); margin-left:1rem;">⚠ Duplicate relic</span>';
        }
        scoreDiv.innerHTML = scoreHtml;
    }

    // Create slot elements
    slots.forEach(slot => {
        const item = loadout[slot]; // selected item
        const slotDiv = document.createElement('div');
        slotDiv.className = 'result-slot';
        slotDiv.setAttribute('data-slot', slot);
        if (item) slotDiv.dataset.itemName = item.name; // store for score update
        slotDiv.style.cursor = 'pointer';

        // Slot header with slot name
        const slotHeader = document.createElement('div');
        slotHeader.className = 'result-slot-header';
        slotHeader.innerHTML = `<span class="result-slot-name">${slot}</span>`;
        slotDiv.appendChild(slotHeader);

        if (item) {
            // Image HTML
            const imageHtml = getItemImageSrc(item) ? `<img src="${getItemImageSrc(item)}" alt="${item.name}" style="width:32px; height:32px; object-fit:contain; image-rendering:pixelated; margin-right:8px;">` : '';

            // Sparkle for current tier (if item has blessed/godly versions)
            const sparkleUrl = getTierSparkle(tier);
            const sparkleHtml = sparkleUrl && (tier === 'blessed' && item.blessed || tier === 'godly' && item.godly)
                ? `<img src="${sparkleUrl}" style="width:16px; height:16px; margin-left:4px; vertical-align:middle;" title="${tier}">`
                : '';

            // Item name
            const nameDiv = document.createElement('div');
            nameDiv.className = 'result-item-name';
            nameDiv.innerHTML = `${imageHtml} ${item.name} ${sparkleHtml}`;
            slotDiv.appendChild(nameDiv);

            // Stats
            const statsDiv = document.createElement('div');
            statsDiv.className = 'result-item-stats';
            statsDiv.textContent = formatItemStats(item, tier);
            slotDiv.appendChild(statsDiv);
        } else {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'result-empty';
            emptyDiv.textContent = 'Empty';
            slotDiv.appendChild(emptyDiv);
        }

        // Click handler to open modal with candidate items
        slotDiv.addEventListener('click', (e) => {
            // Pass the candidate list for this slot
            window.openSlotModal(slot, candidates[slot] || []);
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
    header.innerHTML = '<h2>Loadout Builder</h2>';
    panel.appendChild(header);

    const messageDiv = document.createElement('div');
    messageDiv.className = 'panel-body';
    messageDiv.style.textAlign = 'center';
    messageDiv.style.padding = '2rem';
    messageDiv.style.color = 'var(--text-dim)';
    messageDiv.style.fontStyle = 'italic';
    messageDiv.innerHTML = 'Click "Find Best Loadout" to generate a suggested gear set.';
    panel.appendChild(messageDiv);
}

// ==================== MODAL FUNCTIONS ====================
let currentModalSlot = null;
let currentModalItemList = null; // new

window.openSlotModal = function (slotKey, itemList = null) {
    currentModalSlot = slotKey;
    currentModalItemList = itemList; // store for populate
    const modal = document.getElementById('slot-modal');
    if (!modal) {
        console.error("Modal element not found");
        return;
    }
    const title = document.getElementById('slot-modal-title');
    if (title) title.textContent = `Select ${slotKey}`;

    populateSlotModal(slotKey);
    modal.style.display = 'flex';
};

function populateSlotModal(slotKey) {
    const resultsDiv = document.getElementById('slot-modal-results');
    const searchInput = document.getElementById('slot-modal-search');

    // Use provided item list if available, otherwise fallback to all gear
    let items = currentModalItemList || window.gearData || [];

    // Filter by slot if using all gear (fallback)
    if (!currentModalItemList) {
        const slotMap = {
            head: 'Head', neck: 'Neck', chest: 'Chest', back: 'Back',
            arms: 'Arms', hands: 'Hands', waist: 'Waist', legs: 'Legs',
            feet: 'Feet', wrist: 'Wrist', ring1: 'Ring', ring2: 'Ring',
            primary: 'Primary', secondary: 'Secondary', aura: 'Aura', charm: 'Charm'
        };
        const gearSlot = slotMap[slotKey];
        items = items.filter(item => item.slot === gearSlot);
    }

    // Render items
    renderModalItems(items, searchInput ? searchInput.value : '');

    // Set up search
    if (searchInput) {
        searchInput.oninput = function () {
            const searchTerm = this.value.toLowerCase();
            const filteredSearch = items.filter(item =>
                item.name.toLowerCase().includes(searchTerm)
            );
            renderModalItems(filteredSearch, searchTerm);
        };
    }
}

function renderModalItems(items, searchTerm = '') {
    const resultsDiv = document.getElementById('slot-modal-results');
    if (!resultsDiv) return;
    resultsDiv.innerHTML = '';

    if (items.length === 0) {
        resultsDiv.innerHTML = '<div class="slot-modal-empty">No items found</div>';
        return;
    }

    items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'smi';

        const statsStr = Object.entries(item.stats || {})
            .map(([k, v]) => `${k.toUpperCase()}+${v}`)
            .join(' ');

        itemDiv.innerHTML = `
            <span class="smi-name">${item.name}</span>
            <span class="smi-level">Lvl ${item.lvl}</span>
            <span class="smi-stats">${statsStr}</span>
        `;

        itemDiv.addEventListener('click', () => {
            if (window.equipItem) {
                // This is for Current Gear; for Loadout Builder we need a different handler.
                // We'll check the context: if modal opened from Loadout Builder, we need to update loadout.
                // For simplicity, we'll let the caller pass a callback.
                // We'll implement a callback mechanism.
                if (window.onModalItemSelect) {
                    window.onModalItemSelect(currentModalSlot, item);
                } else {
                    // Default behavior for Current Gear
                    window.equipItem(currentModalSlot, item);
                    renderCurrentGear(window.getCurrentGear());
                }
                const modal = document.getElementById('slot-modal');
                if (modal) modal.style.display = 'none';
            }
        });

        resultsDiv.appendChild(itemDiv);
    });
}
function formatItemStats(item, tier) {
    let stats = item.stats || {};
    if (tier === 'blessed' && item.blessed) stats = item.blessed;
    else if (tier === 'godly' && item.godly) stats = item.godly;

    return Object.entries(stats)
        .map(([k, v]) => `${k}:${v}`)
        .join(' ');
}

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

// Global assignments for HTML onclick handlers
window.toggleGearDb = toggleGearDatabase;
window.resetWeights = window.resetWeights || function () { console.log("resetWeights called"); };
window.setTier = window.setTier || function (tier) { console.log("setTier called:", tier); };
window.toggleAscPanel = function () {
    const panelBody = document.getElementById('asc-panel-body');
    const chevron = document.getElementById('asc-panel-chevron');
    if (!panelBody || !chevron) return;

    const isVisible = panelBody.style.display !== 'none';
    panelBody.style.display = isVisible ? 'none' : 'block';
    chevron.style.transform = isVisible ? 'rotate(-90deg)' : 'rotate(0deg)';

    adjustAscOptLayout();
};
window.optimizeAndScroll = window.optimizeAndScroll || function () {
    console.log("optimizeAndScroll called - to be implemented");
    showMessage("Optimizer coming soon!", true);
};
window.renderGearList = renderGearList;
window.showMessage = showMessage;
window.adjustPanelLayout = adjustPanelLayout;
window.renderEmptyLoadoutBuilder = renderEmptyLoadoutBuilder;

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