// uiRenderer.js
// This file ONLY handles displaying things on screen

// Helper function (private - not exported)
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with id "${id}" not found`);
    }
    return element;
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
            row.style.borderBottom = '1px solid var(--border-light)';
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

function toggleProficienciesPanel() {
    const panelBody = getElement('prof-panel-body');
    const chevron = getElement('prof-panel-chevron');

    if (!panelBody || !chevron) return;

    const isVisible = panelBody.style.display !== 'none';

    if (isVisible) {
        panelBody.style.display = 'none';
        chevron.textContent = '▶';
    } else {
        panelBody.style.display = 'block';
        chevron.textContent = '▼';
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
        { key: 'effect', label: 'Worn Effect' }  // added effect
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
            .map(([stat, value]) => `<span class="gear-stat">${stat.toUpperCase()}: ${value}</span>`)
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
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <span class="gear-name">${item.name}</span>
                ${relicTag}
            </div>
            <div class="gear-slot-level">
                <span class="gear-slot">${item.slot}</span>
                <span class="gear-level">Lvl ${item.lvl}</span>
            </div>
            <div class="gear-stats">
                ${statsHtml || '<span class="note">No stats</span>'}
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

    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = '<h2>⚔️ Current Gear</h2>';
    panel.appendChild(header);

    const body = document.createElement('div');
    body.className = 'panel-body';

    const hasGear = Object.values(gear).some(item => item !== null);

    if (!hasGear) {
        body.innerHTML = '<p class="note" style="padding:1rem; text-align:center;">No gear equipped. Click "Equip" on items in the database below.</p>';
        panel.appendChild(body);
        return;
    }

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

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
    grid.style.gap = '10px';
    grid.style.padding = '10px';

    slots.forEach(slot => {
        const item = gear[slot.key];
        const slotDiv = document.createElement('div');
        slotDiv.className = 'gear-slot';
        slotDiv.style.background = 'var(--panel-bg-light)';
        slotDiv.style.border = '1px solid var(--border)';
        slotDiv.style.borderRadius = '4px';
        slotDiv.style.padding = '8px';

        if (item) {
            const statsHtml = item.stats ? Object.entries(item.stats)
                .map(([stat, val]) => `<span style="font-size:0.7rem; color:var(--text-dim); display:block;">${stat.toUpperCase()}: ${val}</span>`)
                .join('') : '';

            slotDiv.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:bold; color:var(--text-bright); font-size:0.8rem;">${slot.label}</span>
                    <button class="unequip-btn" data-slot="${slot.key}" style="background:none; border:none; color:var(--red); cursor:pointer; font-size:1rem;">✕</button>
                </div>
                <div style="font-size:0.75rem; color:var(--text-bright); margin:4px 0;">${item.name}</div>
                ${statsHtml}
            `;
        } else {
            slotDiv.innerHTML = `
                <div style="font-weight:bold; color:var(--text-dim); font-size:0.8rem;">${slot.label}</div>
                <div style="font-size:0.7rem; color:var(--text-dim); font-style:italic;">Empty</div>
            `;
        }

        grid.appendChild(slotDiv);
    });

    body.appendChild(grid);
    panel.appendChild(body);
}

function renderLoadoutBuilder(loadout, candidates, tier, statWeights) {
    console.log("renderLoadoutBuilder called with", loadout, candidates);
    const panel = document.getElementById('loadout-builder-panel');
    if (!panel) return;

    panel.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = '<h2>Loadout Builder</h2>';
    panel.appendChild(header);

    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'score-bar';
    scoreDiv.id = 'loadout-total-score';
    panel.appendChild(scoreDiv);

    const grid = document.createElement('div');
    grid.className = 'result-grid';
    panel.appendChild(grid);

    const slots = Object.keys(candidates);

    function updateTotalScore() {
        const currentLoadout = {};
        const relicNames = new Set();
        let duplicateRelic = false;

        slots.forEach(slot => {
            const select = document.getElementById(`slot-select-${slot}`);
            if (select) {
                const selectedName = select.value;
                const item = candidates[slot]?.find(i => i.name === selectedName) || null;
                currentLoadout[slot] = item;
                if (item && item.relic) {
                    if (relicNames.has(item.name)) {
                        duplicateRelic = true;
                    }
                    relicNames.add(item.name);
                }
            } else {
                currentLoadout[slot] = loadout[slot];
                if (loadout[slot] && loadout[slot].relic) {
                    if (relicNames.has(loadout[slot].name)) {
                        duplicateRelic = true;
                    }
                    relicNames.add(loadout[slot].name);
                }
            }
        });

        const total = window.computeLoadoutScore(currentLoadout, tier, statWeights);
        let scoreHtml = `<span class="score-label">Total Score</span><span class="score-value">${Math.round(total)}</span>`;
        if (duplicateRelic) {
            scoreHtml += '<span style="color:var(--red-light); margin-left:1rem;">⚠ Duplicate relic</span>';
        }
        scoreDiv.innerHTML = scoreHtml;
    }

    slots.forEach(slot => {
        const slotDiv = document.createElement('div');
        slotDiv.className = 'result-slot';
        slotDiv.setAttribute('data-slot', slot);

        const slotHeader = document.createElement('div');
        slotHeader.className = 'result-slot-header';
        slotHeader.innerHTML = `<span class="result-slot-name">${slot}</span>`;
        slotDiv.appendChild(slotHeader);

        const candidatesList = candidates[slot];
        if (!candidatesList || candidatesList.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'result-empty';
            emptyDiv.textContent = 'No items';
            slotDiv.appendChild(emptyDiv);
            grid.appendChild(slotDiv);
            return;
        }

        const select = document.createElement('select');
        select.id = `slot-select-${slot}`;
        select.style.width = '100%';
        select.style.marginBottom = '0.5rem';

        candidatesList.forEach(item => {
            const option = document.createElement('option');
            option.value = item.name;
            option.textContent = `${item.name} (lvl ${item.lvl})`;
            if (loadout[slot] && loadout[slot].name === item.name) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        select.addEventListener('change', updateTotalScore);
        slotDiv.appendChild(select);

        const currentItem = loadout[slot];
        if (currentItem) {
            const statsDiv = document.createElement('div');
            statsDiv.className = 'result-item-stats';
            statsDiv.textContent = formatItemStats(currentItem, tier);
            slotDiv.appendChild(statsDiv);
        }

        grid.appendChild(slotDiv);
    });

    updateTotalScore();
}

function formatItemStats(item, tier) {
    let stats = item.stats || {};
    if (tier === 'blessed' && item.blessed) stats = item.blessed;
    else if (tier === 'godly' && item.godly) stats = item.godly;

    return Object.entries(stats)
        .map(([k, v]) => `${k}:${v}`)
        .join(' ');
}

// Global assignments for HTML onclick handlers
window.toggleGearDb = toggleGearDatabase;
window.resetWeights = window.resetWeights || function () { console.log("resetWeights called"); };
window.setTier = window.setTier || function (tier) { console.log("setTier called:", tier); };
window.toggleProfPanel = toggleProficienciesPanel;
window.toggleAscPanel = toggleAscensionsPanel;
window.optimizeAndScroll = window.optimizeAndScroll || function () {
    console.log("optimizeAndScroll called - to be implemented");
    showMessage("Optimizer coming soon!", true);
};
window.renderGearList = renderGearList;
window.showMessage = showMessage;

// ==================== EXPORTS ====================
export {
    showMessage,
    renderClassBar,
    renderClassDescription,
    renderStatWeightEditors,
    renderProficiencies,
    renderAscensions,
    toggleAscensionsPanel,
    renderLoadoutBuilder,
    renderCurrentGear,
    renderGearList
};