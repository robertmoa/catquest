// =====================================================
// CatQuest - Dungeon battle system
// =====================================================
// Combat is driven by a data-driven ACTIONS table.
// Each button on screen reads from that table, so adding
// a new skill = add a row to ACTIONS + push its id into
// player.ownedSkills (e.g. from the shop).
// =====================================================


// --- Player state ---
const player = {
  name: "Player",
  currentHp: 30,
  maxHp: 30,
  level: 1,
  experience: 0,
  enemyCount: 0,

  // Attack stats
  baseAttack: 5,
  attackBonus: 0,    // permanent boosts (shop attack potions etc.)
  weaponBonus: 0,    // from currently equipped weapon

  // Defence stats
  baseDefence: 0,
  hatBonus: 0,       // from currently equipped hat
  // levelDefenceBonus is computed in the totalDefence getter

  // Stamina (unlocks at level 10)
  currentStamina: 0,

  // Crit chance (% — 0 by default; raised by shop potions later)
  critChance: 0,

  // Skill ids the player owns. Core actions (attack/defend/heal/flee)
  // are always available so they aren't stored here.
  ownedSkills: [],

  // Turn buff: defence multiplier active for the next enemy attack.
  // Set by Defend / Guard, consumed in enemyAttackPlayer.
  defenceMultActive: 0,

  get totalAttack() {
    return this.baseAttack + this.attackBonus + this.weaponBonus;
  },

  get totalDefence() {
    return this.baseDefence + Math.floor(this.level / 2) + this.hatBonus;
  },

  get maxStamina() {
    if (this.level < 10) return 0;
    return 5 + (this.level - 10) * 3;
  },

  get hasStamina() {
    return this.level >= 10;
  }
};


// --- Action / skill table (data-driven) ---
// Future: this lives server-side in a DB. For now it's a JS dict.
// Adding a skill = add an entry here. Wiring is automatic.
const ACTIONS = {
  attack: {
    id: "attack", name: "Scratch",
    type: "attack", staminaCost: 0, damageMult: 1,
    levelReq: 1, isCore: true,
  },
  defend: {
    id: "defend", name: "Defend",
    type: "buff", staminaCost: 0,
    defenceMult: 1.5, healFlat: 3,
    levelReq: 1, isCore: true,
  },
  heal: {
    id: "heal", name: "Heal",
    type: "heal", staminaCost: 0, healFlat: 12,
    levelReq: 1, isCore: true,
  },
  flee: {
    id: "flee", name: "Flee",
    type: "flee", staminaCost: 0,
    levelReq: 1, isCore: true,
  },
  double_scratch: {
    id: "double_scratch", name: "Double Scratch",
    type: "attack", staminaCost: 2, damageMult: 2,
    levelReq: 5, isCore: false,
  },
  guard: {
    id: "guard", name: "Guard",
    type: "buff", staminaCost: 1,
    defenceMult: 2, healFlat: 0,
    levelReq: 5, isCore: false,
  },
};

// Order in which core actions are rendered in the button bar
const CORE_ACTION_ORDER = ["attack", "defend", "heal", "flee"];


// --- Enemy variants ---
// Cheap data-driven variety. Bosses skip variants (see createEnemy).
const VARIANTS = {
  normal: { suffix: "",          hpMult: 1,    atkMult: 1,    defMult: 1   },
  tough:  { suffix: " (Tough)",  hpMult: 1.5,  atkMult: 0.8,  defMult: 1.5 },
  quick:  { suffix: " (Quick)",  hpMult: 0.7,  atkMult: 1.4,  defMult: 0.5 },
};

function pickVariant() {
  // Weighted: 50% normal, 25% tough, 25% quick
  const pool = ["normal", "normal", "tough", "quick"];
  const key = pool[Math.floor(Math.random() * pool.length)];
  return VARIANTS[key];
}

function createEnemy(enemyNumber) {
  const isBoss = enemyNumber % 10 === 0;

  let hp = 10 + enemyNumber * 2;
  let attack = 2 + Math.floor(enemyNumber / 3);
  let defence = Math.floor(enemyNumber / 8);
  let goldDrop = 5 + Math.floor(enemyNumber * 1.5);
  let xpDrop = 20 + enemyNumber * 3;
  let nameSuffix = "";

  if (isBoss) {
    hp = Math.floor(hp * 3);
    attack = Math.floor(attack * 1.5);
    defence = Math.floor(defence * 1.5);
    goldDrop *= 5;
    xpDrop *= 3;
  } else {
    const variant = pickVariant();
    hp = Math.max(1, Math.floor(hp * variant.hpMult));
    attack = Math.max(1, Math.floor(attack * variant.atkMult));
    defence = Math.floor(defence * variant.defMult);
    nameSuffix = variant.suffix;
  }

  return {
    name: isBoss
      ? `Boss - Angry Cat #${enemyNumber}`
      : `Angry Cat #${enemyNumber}${nameSuffix}`,
    currentHp: hp,
    maxHp: hp,
    attack: attack,
    defence: defence,
    goldDrop: goldDrop,
    xpDrop: xpDrop,
    enemyNumber: enemyNumber,
    isBoss: isBoss,
  };
}


// --- DOM refs & runtime state ---
let enemy = null;
let battleLocked = false;
let dungeonGoldEarned = 0;
let selectedActionIndex = 0;

const playerHpFill = document.getElementById("player-hp-fill");
const playerHpText = document.getElementById("player-hp-text");
const enemyHpFill = document.getElementById("enemy-hp-fill");
const enemyHpText = document.getElementById("enemy-hp-text");


// --- HP bar / colour helpers ---
function getHpColor(hpPercent) {
  if (hpPercent > 60) return "limegreen";
  if (hpPercent > 30) return "gold";
  return "crimson";
}

function getXpThresholdForLevel(level) {
  return 30 * level;
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
  const defenceEl = document.getElementById("player-defence");
  const enemyCountEl = document.getElementById("enemy-count");
  const staminaRow = document.getElementById("stamina-row");
  const staminaEl = document.getElementById("player-stamina");

  if (levelEl) levelEl.textContent = player.level;
  if (xpEl) xpEl.textContent = `${player.experience} / ${xpThreshold}`;
  if (xpFillEl) xpFillEl.style.width = `${xpPercent}%`;
  if (attackEl) attackEl.textContent = player.totalAttack;
  if (defenceEl) defenceEl.textContent = player.totalDefence;
  if (enemyCountEl) enemyCountEl.textContent = player.enemyCount;

  // Stamina row hidden until level 10
  if (staminaRow) {
    if (player.hasStamina) {
      staminaRow.style.display = "";
      if (staminaEl) {
        staminaEl.textContent = `${player.currentStamina} / ${player.maxStamina}`;
      }
    } else {
      staminaRow.style.display = "none";
    }
  }
}

function updateEnemyUI() {
  const enemyNameEl = document.getElementById("enemy-name");
  if (enemyNameEl) enemyNameEl.textContent = enemy.name;
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


// --- Battle log ---
function logAction(message) {
  const logBox = document.getElementById("log-messages");
  const entry = document.createElement("p");
  entry.classList.add("battle-log-entry");
  entry.textContent = message;
  logBox.appendChild(entry);
  logBox.scrollTop = logBox.scrollHeight;
}


// --- Levelling ---
function levelUp() {
  player.level += 1;
  player.maxHp += 10;
  // currentHp not auto-restored; matches original behaviour

  logAction(`Level Up! You are now level ${player.level}. Max HP increased to ${player.maxHp}.`);

  // Unlock stamina + Double Scratch the moment level 5 is reached
  if (player.level === 8 && !player.ownedSkills.includes("double_scratch")) {
    player.ownedSkills.push("double_scratch");
    player.currentStamina = player.maxStamina;
    logAction("You feel a new energy! Stamina unlocked. Learned: Double Scratch!");
    rebuildActionButtons();
  }

  savePlayerStats();
}

function gainExperience(xpAmount) {
  player.experience += xpAmount;

  while (player.experience >= getXpThresholdForLevel(player.level)) {
    const overflow = player.experience - getXpThresholdForLevel(player.level);
    levelUp();
    player.experience = overflow;
  }

  updatePlayerStatsUI();
  updateHpUI(player, playerHpFill, playerHpText); // bar % shifts after maxHp grows
  savePlayerStats();
}


// --- Combat actions ---
function rollCrit(damage) {
  if (Math.random() * 100 < player.critChance) {
    logAction("Critical hit!");
    return damage * 2;
  }
  return damage;
}

function playerAttack(damageMult, actionName) {
  let raw = player.totalAttack * damageMult;
  raw = rollCrit(raw);
  const damage = Math.max(1, Math.floor(raw - enemy.defence));
  applyDamage(enemy, damage);
  updateHpUI(enemy, enemyHpFill, enemyHpText);
  logAction(`${actionName} hits for ${damage} damage!`);
}

function enemyAttackPlayer() {
  if (enemy.currentHp > 0) {
    let defence = player.totalDefence;
    if (player.defenceMultActive) {
      defence = Math.floor(defence * player.defenceMultActive);
    }
    const damage = Math.max(1, enemy.attack - defence);
    applyDamage(player, damage);
    updateHpUI(player, playerHpFill, playerHpText);
    logAction(`${enemy.name} attacks for ${damage} damage!`);
  }
  // consume buff after the enemy turn finishes
  player.defenceMultActive = 0;
}

function regenStamina() {
  if (!player.hasStamina) return;
  player.currentStamina = Math.min(player.maxStamina, player.currentStamina + 1);
}

function spawnNewEnemy() {
  enemy = createEnemy(player.enemyCount + 1);
  updateEnemyUI();
}


// --- Player death / enemy defeat / flee ---
function handlePlayerDeath() {
  const goldLost = Math.floor(dungeonGoldEarned * 0.3);
  if (window.spendPlayerGold) window.spendPlayerGold(goldLost);
  logAction(`You were defeated! Lost ${goldLost} gold.`);
  dungeonGoldEarned = 0;
  player.enemyCount = 0;
  battleLocked = true;
  setActionButtonsDisabled(true); // only Flee stays clickable
}

function handleEnemyDefeat() {
  const goldReward = enemy.goldDrop;
  const xpReward = enemy.xpDrop;
  if (window.addPlayerGold) window.addPlayerGold(goldReward);
  dungeonGoldEarned += goldReward;
  gainExperience(xpReward);
  logAction(`Enemy defeated! Gained ${goldReward} gold, ${xpReward} XP.`);
  player.enemyCount += 1;
  savePlayerStats();

  // discard any unused defence buff so it can't carry to next fight
  player.defenceMultActive = 0;

  battleLocked = true;
  setTimeout(() => {
    spawnNewEnemy();
    battleLocked = false;
  }, 1000);
}

function handleFlee() {
  // If dead, Flee acts as "respawn"
  if (player.currentHp <= 0) {
    player.currentHp = player.maxHp;
    battleLocked = false;
    setActionButtonsDisabled(false);
    updateHpUI(player, playerHpFill, playerHpText);
    spawnNewEnemy();
    logAction("You return to the dungeon...");
    return;
  }

  // Normal flee: drop progress, refresh HP, new enemy
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
}


// --- Action dispatcher ---
// Single entry point for any button. Reads ACTIONS[id] and runs it.
function executeAction(actionId) {
  const action = ACTIONS[actionId];
  if (!action) return;

  // Flee is special: works while dead (revive), and only blocks if
  // we're mid-animation with the player still alive.
  if (action.type === "flee") {
    if (battleLocked && player.currentHp > 0) return;
    handleFlee();
    updatePlayerStatsUI();
    return;
  }

  if (battleLocked || player.currentHp <= 0) return;

  // Stamina cost check + spend
  if (action.staminaCost > 0) {
    if (!player.hasStamina) {
      logAction("You haven't unlocked stamina yet!");
      return;
    }
    if (player.currentStamina < action.staminaCost) {
      logAction("Not enough stamina!");
      return;
    }
    player.currentStamina -= action.staminaCost;
  }

  runActionEffect(action);

  // Enemy died from this action — skip enemy turn
  if (enemy.currentHp <= 0) {
    handleEnemyDefeat();
    updatePlayerStatsUI();
    return;
  }

  // Otherwise, enemy gets a turn after a short delay
  battleLocked = true;
  setTimeout(() => {
    if (player.currentHp > 0) enemyAttackPlayer();
    if (player.currentHp <= 0) {
      handlePlayerDeath();
    } else {
      regenStamina();
    }
    updatePlayerStatsUI();
    battleLocked = false;
  }, 500);

  updatePlayerStatsUI();
}

function runActionEffect(action) {
  if (action.type === "attack") {
    playerAttack(action.damageMult, action.name);

  } else if (action.type === "buff") {
    // Set defence multiplier for the next enemy attack
    player.defenceMultActive = action.defenceMult;
    if (action.healFlat > 0) {
      healUnit(player, action.healFlat);
      updateHpUI(player, playerHpFill, playerHpText);
      logAction(`${action.name}! Defence x${action.defenceMult}, healed ${action.healFlat} HP.`);
    } else {
      logAction(`${action.name}! Defence x${action.defenceMult} this turn.`);
    }

  } else if (action.type === "heal") {
    healUnit(player, action.healFlat);
    updateHpUI(player, playerHpFill, playerHpText);
    logAction(`You heal for ${action.healFlat} HP!`);
  }
}


// --- Action button rendering (dynamic) ---
function getAvailableActions() {
  const list = [];
  // Core actions in fixed order
  CORE_ACTION_ORDER.forEach(id => {
    if (ACTIONS[id]) list.push(ACTIONS[id]);
  });
  // Owned skills appended after
  player.ownedSkills.forEach(id => {
    if (ACTIONS[id]) list.push(ACTIONS[id]);
  });
  return list;
}

function getButtonClass(action) {
  if (action.type === "attack") return "btn-outline-danger";
  if (action.type === "heal")   return "btn-outline-success";
  if (action.type === "buff")   return "btn-outline-warning";
  return "btn-outline-secondary";
}

function rebuildActionButtons() {
  const container = document.getElementById("player-actions");
  container.innerHTML = "";

  const actions = getAvailableActions();

  actions.forEach((action, index) => {
    const btn = document.createElement("button");
    btn.classList.add("btn", "btn-sm", "action-btn", getButtonClass(action));
    btn.dataset.actionId = action.id;
    btn.dataset.index = String(index);
    btn.type = "button";

    // Show stamina cost in label when relevant, e.g. "Double Scratch (2)"
    let label = action.name;
    if (action.staminaCost > 0) label += ` (${action.staminaCost})`;
    btn.textContent = label;

    btn.addEventListener("click", () => executeAction(action.id));
    container.appendChild(btn);
  });

  // Keep WASD selection valid if the action list shrinks
  if (selectedActionIndex >= actions.length) selectedActionIndex = 0;
  updateActionSelection();
}

function updateActionSelection() {
  const buttons = document.querySelectorAll("#player-actions .action-btn");
  buttons.forEach((btn, i) => {
    btn.classList.toggle("selected", i === selectedActionIndex);
  });
}

function setActionButtonsDisabled(disabled) {
  const buttons = document.querySelectorAll("#player-actions .action-btn");
  buttons.forEach(btn => {
    // Flee always stays clickable (it's the death-revive button too)
    if (btn.dataset.actionId === "flee") {
      btn.disabled = false;
    } else {
      btn.disabled = disabled;
    }
  });
}


// --- Keyboard navigation: A/D moves selection, Enter / Space activates ---
document.addEventListener("keydown", (e) => {
  const buttons = document.querySelectorAll("#player-actions .action-btn");
  if (buttons.length === 0) return;

  const key = e.key.toLowerCase();

  if (key === "a") {
    selectedActionIndex = (selectedActionIndex - 1 + buttons.length) % buttons.length;
    updateActionSelection();
    e.preventDefault();
  } else if (key === "d") {
    selectedActionIndex = (selectedActionIndex + 1) % buttons.length;
    updateActionSelection();
    e.preventDefault();
  } else if (e.key === "Enter" || key === " ") {
    buttons[selectedActionIndex].click();
    e.preventDefault();
  }
  // w / s reserved for future button-grid paging
});


// --- Persistence (localStorage) ---
function loadPlayerStats() {
  player.level = Number(localStorage.getItem("catquest_player_level")) || 1;
  player.experience = Number(localStorage.getItem("catquest_player_experience")) || 0;
  player.enemyCount = Number(localStorage.getItem("catquest_player_enemy_count")) || 0;
  // Legacy key retained for backward compat with shop's increaseMaxAttack
  player.attackBonus = Number(localStorage.getItem("catquest_player_max_attack")) || 0;
  player.weaponBonus = Number(localStorage.getItem("catquest_player_weapon_bonus")) || 0;
  player.hatBonus = Number(localStorage.getItem("catquest_player_hat_bonus")) || 0;
  player.critChance = Number(localStorage.getItem("catquest_player_crit_chance")) || 0;
  player.currentStamina = Number(localStorage.getItem("catquest_player_current_stamina")) || 0;

  const ownedRaw = localStorage.getItem("catquest_player_owned_skills");
  player.ownedSkills = ownedRaw ? JSON.parse(ownedRaw) : [];

  // maxHp grows by 10 per level above 1; rebuild on load
  const savedMaxHp = Number(localStorage.getItem("catquest_player_max_hp"));
  player.maxHp = savedMaxHp || (30 + (player.level - 1) * 10);
  player.currentHp = player.maxHp; // refill HP each session
}

function savePlayerStats() {
  localStorage.setItem("catquest_player_level", String(player.level));
  localStorage.setItem("catquest_player_experience", String(player.experience));
  localStorage.setItem("catquest_player_enemy_count", String(player.enemyCount));
  localStorage.setItem("catquest_player_max_attack", String(player.attackBonus));
  localStorage.setItem("catquest_player_weapon_bonus", String(player.weaponBonus));
  localStorage.setItem("catquest_player_hat_bonus", String(player.hatBonus));
  localStorage.setItem("catquest_player_crit_chance", String(player.critChance));
  localStorage.setItem("catquest_player_current_stamina", String(player.currentStamina));
  localStorage.setItem("catquest_player_owned_skills", JSON.stringify(player.ownedSkills));
  localStorage.setItem("catquest_player_max_hp", String(player.maxHp));
}

function initializePlayerStats() {
  loadPlayerStats();
  savePlayerStats();
}


// --- Public hooks for shop integration (call these from shop.js) ---

// Permanent attack boost (e.g. from a one-shot attack potion)
function increaseMaxAttack(bonus) {
  player.attackBonus += bonus;
  savePlayerStats();
  updatePlayerStatsUI();
}
window.increaseMaxAttack = increaseMaxAttack;

// Equipped weapon: pass total weapon attack bonus (replaces previous weapon)
window.equipWeapon = function (bonus) {
  player.weaponBonus = bonus;
  savePlayerStats();
  updatePlayerStatsUI();
};

// Equipped hat: pass total hat defence bonus (replaces previous hat)
window.equipHat = function (bonus) {
  player.hatBonus = bonus;
  savePlayerStats();
  updatePlayerStatsUI();
};

// Unlock a skill bought in the shop. Skill must exist in ACTIONS.
window.unlockSkill = function (skillId) {
  if (ACTIONS[skillId] && !player.ownedSkills.includes(skillId)) {
    player.ownedSkills.push(skillId);
    savePlayerStats();
    rebuildActionButtons();
  }
};

// Crit potion: increase crit chance by `amount` percentage points
window.increaseCritChance = function (amount) {
  player.critChance += amount;
  savePlayerStats();
};


// --- Gold display sync ---
function updateGoldDisplay() {
  const goldEl = document.getElementById("player-gold");
  if (goldEl && window.getPlayerGold) {
    goldEl.textContent = window.getPlayerGold();
  }
}

window.addEventListener("playerGoldUpdated", () => updateGoldDisplay());


// --- Boot sequence ---
initializePlayerStats();
updateGoldDisplay();
updateHpUI(player, playerHpFill, playerHpText);
spawnNewEnemy();
rebuildActionButtons();
updateBattleUI();
logAction("Battle started!");
