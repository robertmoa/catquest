const player = {
  name: "Player",
  currentHp: 30,
  maxHp: 30,
  attack: 5,
  level: 1,
  experience: 0,
  maxAttack: 0,
  enemyCount: 0,
  get baseAttack() {
    return 5;
  },
  get totalAttack() {
    return this.baseAttack + this.maxAttack;
  }
};

function createEnemy(enemyNumber) {
  const isBoss = enemyNumber % 10 === 0;

  let hp = 10 + enemyNumber * 2;
  let attack = 2 + Math.floor(enemyNumber / 3);
  let goldDrop = 5 + Math.floor(enemyNumber * 1.5);
  let xpDrop = 10 + enemyNumber * 2;

  if (isBoss) {
    hp *= 3;
    attack *= 1.5;
    goldDrop *= 5;
    xpDrop *= 3;
  }

  return {
    name: isBoss ? `Boss - Angry Cat #${enemyNumber}` : `Angry Cat #${enemyNumber}`,
    currentHp: hp,
    maxHp: hp,
    attack: attack,
    goldDrop: goldDrop,
    xpDrop: xpDrop,
    enemyNumber: enemyNumber,
    isBoss: isBoss
  };
}

let enemy = null;
let battleLocked = false;
let dungeonGoldEarned = 0;

const playerHpFill = document.getElementById("player-hp-fill");
const playerHpText = document.getElementById("player-hp-text");
const enemyHpFill = document.getElementById("enemy-hp-fill");
const enemyHpText = document.getElementById("enemy-hp-text");

const damageButton = document.getElementById("btn-damage");
const healButton = document.getElementById("btn-heal");
const fleeButton = document.getElementById("btn-run");

function getHpColor(hpPercent) {
  if (hpPercent > 60) {
    return "limegreen";
  }

  if (hpPercent > 30) {
    return "gold";
  }

  return "crimson";
}

function getXpThresholdForLevel(level) {
  return 50 * level;
}

function updateHpUI(unit, hpFillElement, hpTextElement) {
  const hpPercent = (unit.currentHp / unit.maxHp) * 100;

  hpFillElement.style.width = `${hpPercent}%`;
  hpFillElement.style.backgroundColor = getHpColor(hpPercent);
  hpTextElement.textContent = `${unit.currentHp} / ${unit.maxHp}`;
}

function updatePlayerStatsUI() {
  const xpThreshold = getXpThresholdForLevel(player.level);
  const xpPercent = (player.experience / xpThreshold) * 100;

  const levelEl = document.getElementById("player-level");
  const xpEl = document.getElementById("player-xp");
  const xpFillEl = document.getElementById("player-xp-fill");
  const attackEl = document.getElementById("player-attack");
  const enemyCountEl = document.getElementById("enemy-count");

  if (levelEl) levelEl.textContent = player.level;
  if (xpEl) xpEl.textContent = `${player.experience} / ${xpThreshold}`;
  if (xpFillEl) xpFillEl.style.width = `${xpPercent}%`;
  if (attackEl) attackEl.textContent = player.totalAttack;
  if (enemyCountEl) enemyCountEl.textContent = player.enemyCount;
}

function updateEnemyUI() {
  const enemyNameEl = document.getElementById("enemy-name");
  if (enemyNameEl) {
    enemyNameEl.textContent = enemy.name;
  }
  updateHpUI(enemy, enemyHpFill, enemyHpText);
}

function updateBattleUI() {
  updatePlayerStatsUI();
  updateEnemyUI();
}

function applyDamage(unit, amount) {
  unit.currentHp = Math.max(0, unit.currentHp - amount);
}

function healUnit(unit, amount) {
  unit.currentHp = Math.min(unit.maxHp, unit.currentHp + amount);
}

function levelUp() {
  player.level += 1;
  player.maxHp += 10;
  savePlayerStats();

  const logBox = document.getElementById("log-messages");
  if (logBox) {
    const entry = document.createElement("p");
    entry.classList.add("battle-log-entry");
    entry.textContent = `Level Up! You are now level ${player.level}. Max HP increased to ${player.maxHp}.`;
    logBox.appendChild(entry);
    logBox.scrollTop = logBox.scrollHeight;
  }
}

function gainExperience(xpAmount) {
  player.experience += xpAmount;

  while (player.experience >= getXpThresholdForLevel(player.level)) {
    const overflow = player.experience - getXpThresholdForLevel(player.level);
    levelUp();
    player.experience = overflow;
  }

  updatePlayerStatsUI();
  savePlayerStats();
}

function logAction(message) {
  const logBox = document.getElementById("log-messages");
  const entry = document.createElement("p");
  entry.classList.add("battle-log-entry");
  entry.textContent = message;
  logBox.appendChild(entry);
  logBox.scrollTop = logBox.scrollHeight;
}

function spawnNewEnemy() {
  enemy = createEnemy(player.enemyCount + 1);
  updateEnemyUI();
}

function playerAttackEnemy() {
  const damage = player.totalAttack;
  applyDamage(enemy, damage);
  updateHpUI(enemy, enemyHpFill, enemyHpText);
  logAction(`You scratch for ${damage} damage!`);
}

function enemyAttackPlayer() {
  if (enemy.currentHp > 0) {
    applyDamage(player, enemy.attack);
    updateHpUI(player, playerHpFill, playerHpText);
    logAction(`${enemy.name} attacks for ${enemy.attack} damage!`);
  }
}

function handlePlayerDeath() {
  const goldLost = Math.floor(dungeonGoldEarned * 0.3);
  if (window.spendPlayerGold) {
    window.spendPlayerGold(goldLost);
  }

  logAction(`You were defeated! Lost ${goldLost} gold.`);
  dungeonGoldEarned = 0;
  player.enemyCount = 0;
  battleLocked = true;
  damageButton.disabled = true;
  healButton.disabled = true;
}

function handleEnemyDefeat() {
  const goldReward = enemy.goldDrop;
  const xpReward = enemy.xpDrop;

  if (window.addPlayerGold) {
    window.addPlayerGold(goldReward);
  }
  dungeonGoldEarned += goldReward;

  gainExperience(xpReward);
  logAction(`Enemy defeated! Gained ${goldReward} gold, ${xpReward} XP.`);

  player.enemyCount += 1;
  savePlayerStats();

  battleLocked = true;
  setTimeout(() => {
    spawnNewEnemy();
    battleLocked = false;
  }, 1000);
}

function handlePlayerTurn(action) {
  if (battleLocked || player.currentHp <= 0) {
    return;
  }

  action();

  if (enemy.currentHp <= 0) {
    handleEnemyDefeat();
    return;
  }

  battleLocked = true;
  setTimeout(() => {
    if (player.currentHp > 0) {
      enemyAttackPlayer();
    }

    if (player.currentHp <= 0) {
      handlePlayerDeath();
    }

    battleLocked = false;
  }, 500);
}

damageButton.addEventListener("click", () => {
  handlePlayerTurn(() => {
    playerAttackEnemy();
  });
});

healButton.addEventListener("click", () => {
  handlePlayerTurn(() => {
    healUnit(player, 8);
    updateHpUI(player, playerHpFill, playerHpText);
    logAction("You heal for 8 HP!");
  });
});

fleeButton.addEventListener("click", () => {
  if (battleLocked) {
    return;
  }

  if (player.currentHp <= 0) {
    player.currentHp = player.maxHp;
    damageButton.disabled = false;
    healButton.disabled = false;
    updateHpUI(player, playerHpFill, playerHpText);
    spawnNewEnemy();
    logAction("You return to the dungeon...");
    return;
  }

  logAction("You fled the dungeon!");
  dungeonGoldEarned = 0;
  player.enemyCount = 0;
  savePlayerStats();

  battleLocked = true;
  setTimeout(() => {
    player.currentHp = player.maxHp;
    spawnNewEnemy();
    updateHpUI(player, playerHpFill, playerHpText);
    battleLocked = false;
  }, 1000);
});

function loadPlayerStats() {
  player.level = Number(localStorage.getItem("catquest_player_level")) || 1;
  player.experience = Number(localStorage.getItem("catquest_player_experience")) || 0;
  player.enemyCount = Number(localStorage.getItem("catquest_player_enemy_count")) || 0;
  player.maxAttack = Number(localStorage.getItem("catquest_player_max_attack")) || 0;
}

function savePlayerStats() {
  localStorage.setItem("catquest_player_level", String(player.level));
  localStorage.setItem("catquest_player_experience", String(player.experience));
  localStorage.setItem("catquest_player_enemy_count", String(player.enemyCount));
  localStorage.setItem("catquest_player_max_attack", String(player.maxAttack));
}

function initializePlayerStats() {
  const migrationKey = "catquest_player_migrated";

  if (!localStorage.getItem(migrationKey)) {
    loadPlayerStats();
    localStorage.setItem(migrationKey, "true");
  } else {
    loadPlayerStats();
  }

  savePlayerStats();
}

function increaseMaxAttack(bonus) {
  player.maxAttack += bonus;
  savePlayerStats();
  updatePlayerStatsUI();
}

window.increaseMaxAttack = increaseMaxAttack;

function updateGoldDisplay() {
  const goldEl = document.getElementById("player-gold");
  if (goldEl && window.getPlayerGold) {
    goldEl.textContent = window.getPlayerGold();
  }
}

window.addEventListener("playerGoldUpdated", (event) => {
  updateGoldDisplay();
});

initializePlayerStats();
updateGoldDisplay();
updateHpUI(player, playerHpFill, playerHpText);
spawnNewEnemy();
updateBattleUI();
logAction("Battle started!");