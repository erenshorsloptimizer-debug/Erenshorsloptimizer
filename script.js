// --- TOOLTIP LOGIC ---
(function () {
    const tt = document.getElementById('gear-tooltip');
    let _ttTimer;
    window.showGearTooltip = function (el, html) {
        clearTimeout(_ttTimer);
        tt.innerHTML = html;
        tt.style.display = 'block';
        _positionTooltip(el);
    };
    window.hideGearTooltip = function () {
        _ttTimer = setTimeout(() => { tt.style.display = 'none'; }, 80);
    };
    function _positionTooltip(el) {
        const r = el.getBoundingClientRect();
        const tw = tt.offsetWidth, th = tt.offsetHeight;
        let left = r.right + 8;
        let top = r.top;
        if (left + tw > window.innerWidth - 8) left = r.left - tw - 8;
        if (top + th > window.innerHeight - 8) top = window.innerHeight - th - 8;
        if (top < 8) top = 8;
        tt.style.left = left + 'px';
        tt.style.top = top + 'px';
    }
    document.addEventListener('scroll', () => { tt.style.display = 'none'; }, true);
})();

// --- APP STATE ---
let activeClass = 'Arcanist';
let currentTier = 'base';
let gearLvlMin = 1;
let gearLvlMax = 35;
let charLvl = 35;
let weaponPref = 'any';

// --- CORE FUNCTIONS ---
function getItemEffects(item) {
    // This looks at the ITEM_EFFECTS data from your other file
    return ITEM_EFFECTS[item.name] || null;
}

function calculateScore(item, weights) {
    let s = 0;
    const stats = item[currentTier] || item.stats;
    for (let k in weights) {
        if (stats[k]) s += stats[k] * weights[k];
    }
    return s;
}

// ... (Paste all other functions like switchClass, optimizeAndScroll, etc. here) ...

// Initialize the app
window.onload = () => {
    init(); // Or whatever your startup function is named
};