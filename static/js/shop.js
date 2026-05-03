// Cost and outcome settings for the mystery box feature.
const MYSTERY_BOX_COST = 100;
const MYSTERY_BOX_JACKPOT_GOLD = 5000;
const MYSTERY_BOX_JACKPOT_CHANCE = 0.1;
const MYSTERY_BOX_NOTHING_CHANCE = 20;
const MYSTERY_BOX_MIN_GOLD_REWARD = 50;
const MYSTERY_BOX_MAX_GOLD_REWARD = 250;
const MYSTERY_BOX_LOW_REWARD_BIAS = 2.2;

const shopSocket = io();

function socketRequest(eventName, data = {}) {
    return new Promise((resolve) => {
        shopSocket.emit(eventName, data, (response) => {
            resolve(response || { success: false, error: "No response from server" });
        });
    });
}

async function loadUsername() {
    const data = await socketRequest("get_user_info");

    const element = document.getElementById("player-username");

    if (!element) return;

    if (!data.success) {
        element.textContent = "Not logged in";
        return;
    }

    element.textContent = data.username;
}

document.addEventListener("DOMContentLoaded", loadUsername);


// Gets the player's current gold total from the database.
async function getPlayerGold() {
    const data = await socketRequest("get_user_stats");

    if (!data.success) {
        return 0;
    }

    const gold = Number(data.gold);

    if (Number.isNaN(gold) || gold < 0) {
        return 0;
    }

    return gold;
}

// Adds gold to the player's database total.
async function addPlayerGold(amount) {
    const data = await socketRequest("add_gold", { amount });

    if (!data.success) {
        return null;
    }

    updateShopGoldDisplay(data.gold);
    return data.gold;
}

// Spends gold from the player's database total.
async function spendPlayerGold(cost) {
    const data = await socketRequest("spend_gold", { cost });

    if (!data.success) {
        if (data.gold !== undefined) {
            updateShopGoldDisplay(data.gold);
        }
        return false;
    }

    updateShopGoldDisplay(data.gold);
    return true;
}

// Creates a gold reward between 50 and 250, but with extra weight toward the lower end.
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

// Re-renders the visible gold count using the database value.
async function renderShopGold() {
    updateShopGoldDisplay(await getPlayerGold());
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
async function buyShopItem(cost, itemName) {
    const confirmationPrompts = getPurchaseConfirmationPrompts(cost, itemName);

    for (const promptMessage of confirmationPrompts) {
        const confirmedPurchase = window.confirm(promptMessage);

        if (!confirmedPurchase) {
            return false;
        }
    }

    const wasPurchased = await spendPlayerGold(cost);

    if (!wasPurchased) {
        window.alert("Uh oh, looks like your broke ass can't afford this. Get back to work.");
        return false;
    }

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
async function buyMysteryBox() {
    const confirmedPurchase = window.confirm(
        "Buy a Mystery Box for " + MYSTERY_BOX_COST + " gold?"
    );

    if (!confirmedPurchase) {
        return false;
    }

    const wasPurchased = await spendPlayerGold(MYSTERY_BOX_COST);

    if (!wasPurchased) {
        window.alert("Uh oh, looks like your broke ass can't afford this. Get back to work");
        return false;
    }

    const outcome = rollMysteryBoxOutcome();

    if (outcome.type === "jackpot") {
        await addPlayerGold(outcome.goldAmount);
        window.alert("JACKPOT! The mystery box spat out " + outcome.goldAmount + " gold.");
        return true;
    }

    if (outcome.type === "gold") {
        await addPlayerGold(outcome.goldAmount);
        window.alert("The mystery box gave you " + outcome.goldAmount + " gold.");
        return true;
    }

    window.alert("The mystery box contained absolutely nothing. Unlucky.");
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

// Fetches the player's gold from the database and updates the display when the shop page loads, using the players gold from the database.
function initializeShopGoldDisplay() {
    const goldElement = document.getElementById("shop-gold-amount");

    if (!goldElement) {
        return;
    }

    renderShopGold();
}

// Dev helper button that adds 500 gold, that actually works with the database.
function initializeShopAddGoldButton() {
    const addGoldButton = document.getElementById("add-gold-button");

    if (!addGoldButton) {
        return;
    }

    addGoldButton.addEventListener("click", async () => {
        const gold = await addPlayerGold(500);

        if (gold === null) {
            window.alert("An error occurred while adding gold.");
            return;
        }

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

window.buyMysteryBox = buyMysteryBox;
window.renderShopGold = renderShopGold;
window.buyShopItem = buyShopItem;
window.initializeShopPage = initializeShopPage;

// Wait until the page is loaded before we try to find buttons and DOM elements.
document.addEventListener("DOMContentLoaded", () => {
    initializeShopPage();
});
