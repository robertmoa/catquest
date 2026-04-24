const PLAYER_GOLD_STORAGE_KEY = "catquest_player_gold";

function getPlayerGold() {
    const storedGold = Number(localStorage.getItem(PLAYER_GOLD_STORAGE_KEY));

    if (Number.isNaN(storedGold)) {
        localStorage.setItem(PLAYER_GOLD_STORAGE_KEY, "0");
        return 0;
    }

    return storedGold;
}

function setPlayerGold(amount) {
    const safeAmount = Math.max(0, Number(amount) || 0);
    localStorage.setItem(PLAYER_GOLD_STORAGE_KEY, String(safeAmount));
    window.dispatchEvent(new CustomEvent("playerGoldUpdated", {
        detail: { gold: safeAmount }
    }));
    return safeAmount;
}

function addPlayerGold(amount) {
    return setPlayerGold(getPlayerGold() + (Number(amount) || 0));
}

function spendPlayerGold(amount) {
    const cost = Math.max(0, Number(amount) || 0);
    const currentGold = getPlayerGold();

    if (currentGold < cost) {
        return false;
    }

    setPlayerGold(currentGold - cost);
    return true;
}

function updateShopGoldDisplay(goldAmount) {
    const goldAmountElement = document.getElementById("shop-gold-amount");

    if (goldAmountElement) {
        goldAmountElement.textContent = goldAmount;
    }
}

function renderShopGold() {
    updateShopGoldDisplay(getPlayerGold());
}

function buyShopItem(cost, itemName) {
    const confirmationPrompts = itemName === "Sword of Uncertainty"
        ? [
            "Are you sure you want to purchase this sword",
            "Youre 100% certain?",
            "But are you really sure? Like deadset you know you want this",
            "This is your fourth confirmation. You must really want this, right?",
            "Last chance! Theres no going back now"
        ]
        : ["Are you sure you want to buy " + itemName + " for " + cost + " gold?"];

    for (const promptMessage of confirmationPrompts) {
        const confirmedPurchase = window.confirm(promptMessage);

        if (!confirmedPurchase) {
            return false;
        }
    }

    const wasPurchased = spendPlayerGold(cost);

    if (!wasPurchased) {
        window.alert("Uh oh, looks like your broke ass can't afford this. Get back to work fool");
        return false;
    }

    renderShopGold();
    window.alert("Purchased " + itemName + " for " + cost + " gold.");
    return true;
}

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

function initializeShopGoldDisplay() {
    if (!document.getElementById("shop-gold-amount")) {
        return;
    }

    renderShopGold();
    window.addEventListener("playerGoldUpdated", (event) => {
        updateShopGoldDisplay(event.detail.gold);
    });
}

function initializeShopAddGoldButton() {
    const addGoldButton = document.getElementById("add-gold-button");

    if (!addGoldButton) {
        return;
    }

    addGoldButton.addEventListener("click", () => {
        addPlayerGold(500);
        renderShopGold();
    });
}

function initializeShopPage() {
    initializeShopGoldDisplay();
    initializeShopButtons();
    initializeShopAddGoldButton();
}

window.getPlayerGold = getPlayerGold;
window.setPlayerGold = setPlayerGold;
window.addPlayerGold = addPlayerGold;
window.spendPlayerGold = spendPlayerGold;
window.renderShopGold = renderShopGold;
window.buyShopItem = buyShopItem;
window.initializeShopPage = initializeShopPage;

document.addEventListener("DOMContentLoaded", () => {
    initializeShopPage();
});
