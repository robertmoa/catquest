
function socketRequest(eventName, data = {}) {
    return new Promise((resolve) => {
        socket.emit(eventName, data, (response) => {
            resolve(response || { success: false, error: "No response from server" });
        });
    });
}

async function loadInventory() {
    const items = await socketRequest("get_user_items");
    return items;
}
async function loadStats() {
    const stats = await socketRequest("get_user_stats");
    return stats;
}
async function loadLeaderboard() {
    const top_users = await socketRequest("get_leaderboard");
    return top_users
}

async function initializeInventory() {
    const items = await loadInventory();
    console.log(items);
    const inventoryCardTemplate = document.getElementById("inventory-card-template");
    const inventory = document.getElementById("inventory-grid");
    items.forEach(item => {
        const card = inventoryCardTemplate.content.cloneNode(true);
        card.querySelector('.card-image-top').src = item.imgpath;
        card.querySelector('.card-title').textContent = item.name;
        const stat = card.querySelector(".statline");
        if(item.itype == "sword"){
            stat.textContent = `Damage: ${item.attack}`;
        }
        else
        {
            stat.textContent = `Defense: ${item.defense}`;
        }
        inventory.appendChild(card);
    })
}
async function initializeStats() {
    const stats = await loadStats()
    document.getElementById("gold-stat").textContent = `Gold: ${stats.gold}`
    document.getElementById("lvl-stat").textContent = `Level ${stats.level}`
}
async function initializeLeaderboard() {
    const top_users = await loadLeaderboard();
    console.log(top_users)
    const leaderboard = document.getElementById("leaderboard-div")
    top_users.forEach(user => {
        const userpara = document.createElement("p");
        userpara.textContent = `${user.number}. ${user.username}: ${user.gold} gold`;
        leaderboard.appendChild(userpara)
        leaderboard.insertAdjacentHTML('beforeend', '<hr>');


    })
}

async function initializeDashboard() {
    initializeStats();
    initializeInventory();
    initializeLeaderboard();
}
document.addEventListener("DOMContentLoaded", () => {
    initializeDashboard();
});

