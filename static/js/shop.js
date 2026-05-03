// localStorage key for the player's gold so the shop can remember it between refreshes.
const PLAYER_GOLD_STORAGE_KEY = "catquest_player_gold";

// Cost and outcome settings for the mystery box feature.
const MYSTERY_BOX_COST = 100;
const MYSTERY_BOX_JACKPOT_GOLD = 5000;
const MYSTERY_BOX_JACKPOT_CHANCE = 0.1;
const MYSTERY_BOX_NOTHING_CHANCE = 20;
const MYSTERY_BOX_MIN_GOLD_REWARD = 1;
const MYSTERY_BOX_MAX_GOLD_REWARD = 250;
const MYSTERY_BOX_LOW_REWARD_BIAS = 2.2;

// Reads the player's gold from localStorage.
// If the saved value is missing or invalid, we repair it by resetting to 0.
function getPlayerGold() {
    const storedGold = Number(localStorage.getItem(PLAYER_GOLD_STORAGE_KEY));

    if (Number.isNaN(storedGold)) {
        localStorage.setItem(PLAYER_GOLD_STORAGE_KEY, "0");
        return 0;
    }

    return storedGold;
}

// Writes a safe, non-negative gold value back to localStorage.
// We also broadcast a small event so anything showing gold on the page can update itself.
function setPlayerGold(amount) {
    const safeAmount = Math.max(0, Number(amount) || 0);
    localStorage.setItem(PLAYER_GOLD_STORAGE_KEY, String(safeAmount));
    window.dispatchEvent(new CustomEvent("playerGoldUpdated", {
        detail: { gold: safeAmount }
    }));
    return safeAmount;
}

// Adds gold on top of the current total.
function addPlayerGold(amount) {
    return setPlayerGold(getPlayerGold() + (Number(amount) || 0));
}

// Tries to subtract gold for a purchase.
// Returns false if the player cannot afford the cost.
function spendPlayerGold(amount) {
    const cost = Math.max(0, Number(amount) || 0);
    const currentGold = getPlayerGold();

    if (currentGold < cost) {
        return false;
    }

    setPlayerGold(currentGold - cost);
    return true;
}

// Creates a gold reward between 1 and 250, but with extra weight toward the lower end.
// `Math.random()` is naturally even, so we raise it to a power above 1.
// That pulls more results closer to 0, which means smaller gold rewards happen more often.
function rollWeightedMysteryBoxGoldReward() {
    const weightedRoll = Math.pow(Math.random(), MYSTERY_BOX_LOW_REWARD_BIAS);
    const rewardRange = MYSTERY_BOX_MAX_GOLD_REWARD - MYSTERY_BOX_MIN_GOLD_REWARD + 1;
    return Math.floor(weightedRoll * rewardRange) + MYSTERY_BOX_MIN_GOLD_REWARD;
}

// Keeps the gold number in the sidebar in sync with the latest stored total.
function updateShopGoldDisplay(goldAmount) {
    const goldAmountElement = document.getElementById("shop-gold-amount");

    if (goldAmountElement) {
        goldAmountElement.textContent = goldAmount;
    }
}

// Re-renders the visible gold count using the current saved value.
function renderShopGold() {
    updateShopGoldDisplay(getPlayerGold());
}

// Builds the confirmation prompt list for a normal shop purchase.
// Most items use one prompt, while a couple have custom jokes and the uncertainty sword
// intentionally makes the player click through several confirmations.
function getPurchaseConfirmationPrompts(cost, itemName) {
    const customPromptsByItem = {
        "An Above Average Sized Dagger": [
            "I assure you, I am actually above average size AND I am really funny\n\nBuy An Above Average Sized Dagger for " + cost + " gold?"
        ],
        "Wooden Sword": [
            "Trust me, it's really strong wood\n\nBuy Wooden Sword for " + cost + " gold?"
        ]
    };

    if (itemName === "Sword of Uncertainty") {
        return [
            "Are you sure you want to purchase this sword",
            "Youre 100% certain?",
            "But are you really sure? Like deadset you know you want this",
            "This is your fourth confirmation. You must really want this, right?",
            "Last chance! Theres no going back now"
        ];
    }

    return customPromptsByItem[itemName] || [
        "Are you sure you want to buy " + itemName + " for " + cost + " gold?"
    ];
}

// Handles buying one of the normal shop items.
function buyShopItem(cost, itemName) {
    const confirmationPrompts = getPurchaseConfirmationPrompts(cost, itemName);

    for (const promptMessage of confirmationPrompts) {
        const confirmedPurchase = window.confirm(promptMessage);

        if (!confirmedPurchase) {
            return false;
        }
    }

    const wasPurchased = spendPlayerGold(cost);

    if (!wasPurchased) {
        window.alert("Uh oh, looks like your broke ass can't afford this. Get back to work.");
        return false;
    }

    renderShopGold();
    window.alert("Purchased " + itemName + " for " + cost + " gold.");
    return true;
}

// Rolls the mystery box result using the requested gold-only probability split:
// 0.1% jackpot, 20% nothing, and the remaining chance becomes a weighted gold reward.
function rollMysteryBoxOutcome() {
    const roll = Math.random() * 100;
    const nothingThreshold = MYSTERY_BOX_JACKPOT_CHANCE + MYSTERY_BOX_NOTHING_CHANCE;

    if (roll < MYSTERY_BOX_JACKPOT_CHANCE) {
        return {
            type: "jackpot",
            goldAmount: MYSTERY_BOX_JACKPOT_GOLD
        };
    }

    if (roll < nothingThreshold) {
        return {
            type: "nothing"
        };
    }

    return {
        type: "gold",
        goldAmount: rollWeightedMysteryBoxGoldReward()
    };
}

// Handles the full mystery box flow:
// 1. Ask the player to confirm.
// 2. Charge 100 gold.
// 3. Roll the random outcome.
// 4. Apply and announce the reward.
function buyMysteryBox() {
    const confirmedPurchase = window.confirm(
        "Buy a Mystery Box for " + MYSTERY_BOX_COST + " gold?"
    );

    if (!confirmedPurchase) {
        return false;
    }

    const wasPurchased = spendPlayerGold(MYSTERY_BOX_COST);

    if (!wasPurchased) {
        window.alert("Uh oh, looks like your broke ass can't afford this. Get back to work fool");
        return false;
    }

    renderShopGold();

    const outcome = rollMysteryBoxOutcome();

    if (outcome.type === "jackpot") {
        addPlayerGold(outcome.goldAmount);
        renderShopGold();
        window.alert("JACKPOT! The mystery box spat out " + outcome.goldAmount + " gold.");
        return true;
    }

    if (outcome.type === "gold") {
        addPlayerGold(outcome.goldAmount);
        renderShopGold();
        window.alert("The mystery box gave you " + outcome.goldAmount + " gold.");
        return true;
    }

    window.alert("The mystery box contained absolutely nothing. Brutal.");
    return true;
}

// Attaches click handlers to all normal shop item buttons.
function initializeShopButtons() {
    const buyButtons = document.querySelectorAll(".buy-weapon-button");

    buyButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const cost = Number(button.dataset.cost);
            const itemName = button.dataset.itemName || "item";
            buyShopItem(cost, itemName);
        });
    });
}

// Switches between the sword and hat grids while keeping the same shop layout.
function initializeShopTabs() {
    const shopTitle = document.getElementById("shop-title");
    const shopSubtitle = document.getElementById("shop-subtitle");
    const swordGrid = document.getElementById("sword-shop-grid");
    const hatGrid = document.getElementById("hat-shop-grid");
    const tabButtons = document.querySelectorAll(".shop-tab-button");

    if (!shopTitle || !shopSubtitle || !swordGrid || !hatGrid || tabButtons.length === 0) {
        return;
    }

    const shopCopy = {
        swords: {
            title: "Sword Shop",
            subtitle: "Choose a sword and head back into battle."
        },
        hats: {
            title: "Hat Shop",
            subtitle: "Choose a hat and head back into battle with style."
        }
    };

    tabButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const targetShop = button.dataset.shopTarget;
            const showingHats = targetShop === "hats";

            swordGrid.classList.toggle("d-none", showingHats);
            hatGrid.classList.toggle("d-none", !showingHats);

            shopTitle.textContent = shopCopy[targetShop].title;
            shopSubtitle.textContent = shopCopy[targetShop].subtitle;

            tabButtons.forEach((tabButton) => {
                const isActive = tabButton === button;
                tabButton.classList.toggle("active", isActive);
                tabButton.classList.toggle("btn-primary", isActive);
                tabButton.classList.toggle("btn-outline-primary", !isActive);
            });
        });
    });
}

// Attaches click handlers to each inspect button so the placeholder weapon info can
// expand and collapse without leaving the shop page.
function initializeInspectWeaponButtons() {
    const inspectButtons = document.querySelectorAll(".inspect-weapon-button");

    inspectButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const detailsElement = button.nextElementSibling;

            if (!detailsElement || !detailsElement.classList.contains("inspect-weapon-details")) {
                return;
            }

            const isNowHidden = detailsElement.classList.toggle("d-none");
            button.setAttribute("aria-expanded", String(!isNowHidden));
        });
    });
}

// Attaches the click handler for the mystery box button.
function initializeMysteryBoxButton() {
    const mysteryBoxButton = document.getElementById("buy-mystery-box-button");

    if (!mysteryBoxButton) {
        return;
    }

    mysteryBoxButton.addEventListener("click", () => {
        buyMysteryBox();
    });
}

// Starts the sidebar gold display and listens for future gold updates.
function initializeShopGoldDisplay() {
    const goldElement = document.getElementById("shop-gold-amount");

    if (!goldElement) {
        return;
    }

    // fetch gold from database on page load
    fetch("/get_user_stats")
        .then(response => response.json())
        .then(data => {
            updateShopGoldDisplay(data.gold);
        });
}

// Dev helper button that adds 500 gold for quick testing.
function initializeShopAddGoldButton() {
    const addGoldButton = document.getElementById("add-gold-button");



    addGoldButton.addEventListener("click", async () => {
        const response = await fetch("/shop/add-gold", {
            method: "POST"
        });

        if (!response.ok) {
            window.alert("Could not add gold. Make sure you are logged in.");
            return;
        }

        const result = await response.json();
        updateShopGoldDisplay(result.gold);
    });
}

// Main page setup for the shop.
function initializeShopPage() {
    initializeShopGoldDisplay();
    initializeShopTabs();
    initializeShopButtons();
    initializeInspectWeaponButtons();
    initializeMysteryBoxButton();
    initializeShopAddGoldButton();
}

// Expose a few helpers on window so they can be tested from the browser console.
window.getPlayerGold = getPlayerGold;
window.setPlayerGold = setPlayerGold;
window.addPlayerGold = addPlayerGold;
window.spendPlayerGold = spendPlayerGold;
window.buyMysteryBox = buyMysteryBox;
window.renderShopGold = renderShopGold;
window.buyShopItem = buyShopItem;
window.initializeShopPage = initializeShopPage;

// Wait until the page is loaded before we try to find buttons and DOM elements.
document.addEventListener("DOMContentLoaded", () => {
    initializeShopPage();
});
