// Reuse the shared socket from connect.js; fall back to a new connection if unavailable.
let dungeonSocket = window.socket || null;
if (!dungeonSocket) {
  try {
    dungeonSocket = io();
  } catch (e) {
    console.warn("socket.io unavailable — running in offline mode", e);
  }
}
let monsterPool = [];

function dungeonSocketRequest(eventName, data) {
  data = data || {};
  if (!dungeonSocket) {
    return Promise.resolve({ success: false, error: "No socket" });
  }
  return new Promise(function(resolve) {
    dungeonSocket.emit(eventName, data, function(response) {
      resolve(response || { success: false, error: "No response" });
    });
  });
}

window.addPlayerGold = async function(amount) {
    var result = await dungeonSocketRequest("add_gold", { amount: amount });
    if (result.success) {
        var goldEl = document.getElementById("player-gold");
        if (goldEl) goldEl.textContent = result.gold;
    }
};

window.spendPlayerGold = async function(cost) {
    var result = await dungeonSocketRequest("spend_gold", { cost: cost });
    if (result.success) {
        updateGoldDisplay();
    }
};

window.getPlayerGold = async function() {
    var result = await dungeonSocketRequest("get_user_stats");
    return result.success ? result.gold : 0;
};

async function saveProgressToServer() {
    await dungeonSocketRequest("save_progress", {
        xp: player.experience,
        level: player.level,
    });
}

async function loadMonsterPool() {
  var result = await dungeonSocketRequest("get_monsters");

  if (result.success) {
    monsterPool = result.monsters;
  } else {
    console.warn("Could not load monsters from DB, using fallback.");
    monsterPool = [
      {
        name: "Angry Cat",
        entrymsg: "An Angry Cat appears!",
        imgpath: "/static/images/ecatsprite.png",
        max_hp: 20,
        damage: 4,
        reward: 10,
      }
    ];
  }
}

const player = {
  name: "Player",
  currentHp: 0,
  maxHp: 0,
  level: 1,
  experience: 0,
  enemyCount: 0,

  attack: 0,

  defense: 0,


  currentStamina: 0,

  status: {
    stunned: 0,
    slowed: 0,
    staggered: 0,
    dot: 0,
    dotDamage: 0,
    charging: 0,
  },

  ownedSkills: ["stagger"],
  cooldowns: {},

  defenceMultActive: 0,


  get maxStamina() {
    return 3 + Math.floor(this.level / 2);
  },

  get hasStamina() {
    return true;
  },

  get critChance() {
    return Math.min(60, Math.floor(this.level / 5) * 5);
  }
};

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
  shield_break: {
    id: "shield_break", name: "Shield Break",
    type: "shield_break", staminaCost: 3, damageMult: 1.5, defReduction: 0.7,
    levelReq: 8, isCore: false,
  },
  stagger: {
    id: "stagger", name: "Stagger",
    type: "stagger", staminaCost: 1, damageMult: 0.5,
    levelReq: 1, isCore: false,
  },
};

const CORE_ACTION_ORDER = ["attack", "defend", "heal", "flee"];


const VARIANTS = {
  normal: { suffix: "",          hpMult: 1,    atkMult: 1,    defMult: 1   },
  tough:  { suffix: " (Tough)",  hpMult: 1.5,  atkMult: 0.8,  defMult: 1.5 },
  quick:  { suffix: " (Quick)",  hpMult: 0.7,  atkMult: 1.4,  defMult: 0.5 },
};

function pickVariant() {
  const pool = ["normal", "normal", "tough", "quick"];
  const key = pool[Math.floor(Math.random() * pool.length)];
  return VARIANTS[key];
}

function createEnemy(enemyNumber) {
  const isBoss = enemyNumber % 10 === 0;

  var templateIndex = Math.floor(Math.random() * monsterPool.length);
  var template = monsterPool[templateIndex] || { name: "Cat", entrymsg: "A cat appears!", imgpath: "/static/images/ecatsprite.png", max_hp: 20, damage: 4, reward: 10 };

  var hp = template.max_hp
  var attack = template.damage
  var defence = 0
  var goldDrop = template.reward
  var xpDrop = Math.floor(template.max_hp/2)

  var entrymsg = template.entrymsg;
  var imgpath = template.imgpath;

  

  var variant = pickVariant();
  hp = Math.max(1, Math.floor(hp * variant.hpMult));
  attack = Math.max(1, Math.floor(attack * variant.atkMult));
  defence = Math.floor(defence * variant.defMult);
  

  var displayName = template.name + variant.suffix;

  return {
    name: displayName,
    entrymsg: entrymsg,
    description: template.description,
    imgpath: imgpath,
    currentHp: hp,
    maxHp: hp,
    attack: attack,
    defence: defence,
    goldDrop: goldDrop,
    xpDrop: xpDrop,
    enemyNumber: enemyNumber,
    isBoss: isBoss,
    specialType: template.special_type || null,
    defReduced: false,
    defReduceTurns: 0,
    status: {
      stunned: 0,
      slowed: 0,
      staggered: 0,
      dot: 0,
      dotDamage: 0,
      charging: 0,
      chargePayload: 0,
    },
  };
}

let enemy = null;
let battleLocked = false;
let dungeonGoldEarned = 0;
let usedStaminaThisTurn = false;
let selectedActionIndex = 0;
let comboCount = 0;

const playerHpFill = document.getElementById("player-hp-fill");
const playerHpText = document.getElementById("player-hp-text");
const enemyHpFill = document.getElementById("enemy-hp-fill");
const enemyHpText = document.getElementById("enemy-hp-text");


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
  if (attackEl) attackEl.textContent = player.attack;
  if (defenceEl) defenceEl.textContent = player.defense;
  if (enemyCountEl) enemyCountEl.textContent = player.enemyCount;

  var critEl = document.getElementById("player-crit");
  if (critEl) critEl.textContent = player.critChance + "%";

  if (staminaRow) {
    staminaRow.style.display = "";
    if (staminaEl) {
      staminaEl.textContent = `${player.currentStamina} / ${player.maxStamina}`;
    }
  }
}

function updateEnemyUI() {
  const enemyNameEl = document.getElementById("enemy-name");
  if (enemyNameEl) enemyNameEl.textContent = enemy.name;
  updateHpUI(enemy, enemyHpFill, enemyHpText);
}

function renderStatusDisplay(unit, elementId) {
  var el = document.getElementById(elementId);
  if (!el) return;
  var parts = [];
  if (unit.status.stunned > 0)    parts.push("Stunned (" + unit.status.stunned + ")");
  if (unit.status.slowed > 0)     parts.push("Slowed (" + unit.status.slowed + ")");
  if (unit.status.staggered > 0)  parts.push("Staggered (" + unit.status.staggered + ")");
  if (unit.status.charging > 0)   parts.push("Charging... (" + unit.status.charging + ")");
  if (unit.status.dot > 0)        parts.push("Burning (" + unit.status.dot + "t, " + unit.status.dotDamage + "dmg)");
  el.textContent = parts.join(" | ");
}

function tickStatus(unit) {
  if (unit.status.dot > 0) {
    applyDamage(unit, unit.status.dotDamage);
    logAction(unit.name + " takes " + unit.status.dotDamage + " burn damage!");
    unit.status.dot -= 1;
    if (unit.status.dot === 0) {
      unit.status.dotDamage = 0;
      logAction(unit.name + "'s burn fades.");
    }
  }
  if (unit.status.staggered > 0) unit.status.staggered -= 1;
}

function updateBattleUI() {
  updatePlayerStatsUI();
  updateEnemyUI();
  renderStatusDisplay(player, "player-status-display");
  if (enemy) renderStatusDisplay(enemy, "enemy-status-display");
}

function applyDamage(unit, amount) {
  unit.currentHp = Math.max(0, unit.currentHp - amount);
}

function healUnit(unit, amount) {
  unit.currentHp = Math.min(unit.maxHp, unit.currentHp + amount);
  healPulseUnit(player,"player-sprite");
}


function logAction(message) {
  const logBox = document.getElementById("log-messages");
  const entry = document.createElement("p");
  entry.classList.add("battle-log-entry");
  entry.textContent = message;
  logBox.appendChild(entry);
  while (logBox.children.length > 50) { logBox.firstChild.remove(); }
  logBox.scrollTop = logBox.scrollHeight;
}


function levelUp() {
  player.level += 1;
  player.currentStamina = player.maxStamina;
  player.xp = 0;
  logAction(`Level Up! You are now level ${player.level}.`);
  logAction("Stamina fully restored.");

  
  saveProgressToServer();
}

function gainExperience(xpAmount) {
  console.log(xpAmount);
  player.experience += xpAmount;

  while (player.experience >= getXpThresholdForLevel(player.level)) {
    const overflow = player.experience - getXpThresholdForLevel(player.level);
    levelUp();
    player.experience = overflow;
  }

  updatePlayerStatsUI();
  updateHpUI(player, playerHpFill, playerHpText);
  
}


function rollCrit(damage) {
  if (Math.random() * 100 < player.critChance) {
    logAction("Critical hit!");
    return damage * 2;
  }
  return damage;
}
function shakeUnit(unit,imageid) {
  const img = document.getElementById(imageid);
  img.classList.add('shaking');
  // Remove class after animation finishes
  setTimeout(() => img.classList.remove('shaking'), 500); 

}
function healPulseUnit(unit,imageid) {
  const img = document.getElementById(imageid);
  img.classList.add('healpulse');
  // Remove class after animation finishes
  setTimeout(() => img.classList.remove('healpulse'), 1000); 

}
function playerAttack(damageMult, actionName) {
  let raw = player.attack
  raw = rollCrit(raw);
  const effectiveDefence = enemy.defReduced ? Math.floor(enemy.defence * 0.3) : enemy.defence;
  const comboBonus = comboCount >= 2 ? comboCount : 0;
  const damage = Math.max(1, Math.floor(raw - effectiveDefence) + comboBonus);
  applyDamage(enemy, damage);
  updateHpUI(enemy, enemyHpFill, enemyHpText);
  logAction(`${actionName} hits for ${damage} damage!`);
  shakeUnit(player,"player-sprite")
}

function enemyAttackPlayer() {
  if (enemy.currentHp <= 0) return;

  tickStatus(enemy);
  updateHpUI(enemy, enemyHpFill, enemyHpText);
  renderStatusDisplay(enemy, "enemy-status-display");

  if (enemy.status.stunned > 0) {
    enemy.status.stunned--;
    logAction(enemy.name + " is stunned and cannot act!");
    player.defenceMultActive = 0;
    return;
  }


  let defence = player.defense;
  if (player.defenceMultActive) {
    defence = Math.floor(defence * player.defenceMultActive);
  }
  const damage = Math.max(1, enemy.attack - defence);
  applyDamage(player, damage);
  comboCount = 0;
  updateHpUI(player, playerHpFill, playerHpText);
  logAction(`${enemy.name} attacks for ${damage} damage!`);

  if (enemy.defReduced) {
    enemy.defReduceTurns--;
    if (enemy.defReduceTurns <= 0) {
      enemy.defReduced = false;
      logAction("Enemy defence restored.");
    }
  }

  if (enemy.isBoss && Math.random() < 0.05) {
    player.status.stunned = 1;
    logAction(enemy.name + " stuns you! You'll lose your next turn.");
    renderStatusDisplay(player, "player-status-display");
  }

  player.defenceMultActive = 0;
  shakeUnit(enemy,"enemy-sprite")
}

function regenStamina() {
  if (usedStaminaThisTurn) {
    usedStaminaThisTurn = false;
    return;
  }
  player.currentStamina = Math.min(player.maxStamina, player.currentStamina + 1);
}

function spawnNewEnemy() {
  enemy = createEnemy(player.enemyCount + 1);
  console.log(enemy);

  if (enemy.entrymsg) {
    logAction(enemy.entrymsg);
  }

  var spriteEl = document.getElementById("enemy-sprite");
  if (spriteEl && enemy.imgpath) {
    spriteEl.src = enemy.imgpath;
  }

  updateEnemyUI();
}


function handlePlayerDeath() {
  const goldLost = Math.floor(dungeonGoldEarned * 0.3);
  if (window.spendPlayerGold) window.spendPlayerGold(goldLost);
  logAction(`You were defeated! Lost ${goldLost} gold.`);
  dungeonGoldEarned = 0;
  player.enemyCount = 0;
  battleLocked = true;
  setActionButtonsDisabled(true);
}

function handleEnemyDefeat() {
  const goldReward = enemy.goldDrop;
  const xpReward = enemy.xpDrop;
  if (window.addPlayerGold) window.addPlayerGold(goldReward);
  dungeonGoldEarned += goldReward;
  gainExperience(xpReward);
  logAction(`Enemy defeated! Gained ${goldReward} gold, ${xpReward} XP.`);
  player.enemyCount += 1;
  

  player.defenceMultActive = 0;

  battleLocked = true;
  document.getElementById("enemy-unit").style.visibility = 'hidden';
  
  
  setTimeout(() => {
    spawnNewEnemy();
    document.getElementById("enemy-unit").style.visibility = 'visible';
    battleLocked = false;
  }, 1000);
}

function handleFlee() {
  if (player.currentHp <= 0) {
    player.currentHp = player.maxHp;
    battleLocked = false;
    setActionButtonsDisabled(false);
    updateHpUI(player, playerHpFill, playerHpText);
    spawnNewEnemy();
    logAction("You return to the dungeon...");
    return;
  }

  logAction("You fled the dungeon!");
  dungeonGoldEarned = 0;
  player.enemyCount = 0;
  

  battleLocked = true;
  setTimeout(() => {
    player.currentHp = player.maxHp;
    spawnNewEnemy();
    updateHpUI(player, playerHpFill, playerHpText);
    battleLocked = false;
  }, 1000);
}


function tickCooldowns() {
  for (const id in player.cooldowns) {
    player.cooldowns[id]--;
    if (player.cooldowns[id] <= 0) delete player.cooldowns[id];
  }
  rebuildActionButtons();
}


function executeAction(actionId) {
  const action = ACTIONS[actionId];
  if (!action) return;

  if (action.type === "flee") {
    if (battleLocked && player.currentHp > 0) return;
    handleFlee();
    updatePlayerStatsUI();
    return;
  }

  if (battleLocked || player.currentHp <= 0) return;

  tickStatus(player);
  updateHpUI(player, playerHpFill, playerHpText);
  renderStatusDisplay(player, "player-status-display");

  if (player.currentHp <= 0) {
    handlePlayerDeath();
    updatePlayerStatsUI();
    return;
  }

  if (player.status.stunned > 0) {
    player.status.stunned--;
    logAction("You are stunned and cannot act!");
    battleLocked = true;
    setTimeout(() => {
      enemyAttackPlayer();
      if (player.currentHp <= 0) handlePlayerDeath();
      updateBattleUI();
      battleLocked = false;
    }, 1000);
    return;
  }

  if (!action.isCore && player.cooldowns[actionId] > 0) {
    logAction(`${action.name} is on cooldown (${player.cooldowns[actionId]} turns)!`);
    return;
  }

  if (action.staminaCost > 0) {
    if (player.currentStamina < action.staminaCost) {
      logAction("Not enough stamina!");
      return;
    }
    player.currentStamina -= action.staminaCost;
    usedStaminaThisTurn = true;
  }

  runActionEffect(action);

  if (!action.isCore) {
    player.cooldowns[action.id] = 2;
    rebuildActionButtons();
  }

  if (enemy.currentHp <= 0) {
    if (action.type === "attack" || action.type === "shield_break") {
      comboCount++;
      if (comboCount >= 2) logAction(`x${comboCount} Combo!`);
    }
    handleEnemyDefeat();
    updatePlayerStatsUI();
    return;
  }

  battleLocked = true;
  setTimeout(() => {
    if (player.currentHp > 0) enemyAttackPlayer();
    if (player.currentHp <= 0) {
      handlePlayerDeath();
    } else {
      regenStamina();
      tickCooldowns();
    }
    updatePlayerStatsUI();
    battleLocked = false;
  }, 1000);

  updatePlayerStatsUI();
}

function runActionEffect(action) {
  if (action.type === "attack") {
    var effectiveMult = action.damageMult;
    if (player.status.slowed > 0) {
      player.status.slowed--;
      effectiveMult *= 0.5;
      logAction("You are slowed! Attack weakened.");
    }
    playerAttack(effectiveMult, action.name);

  } else if (action.type === "buff") {
    player.defenceMultActive = action.defenceMult;
    if (action.healFlat > 0) {
      healUnit(player, action.healFlat);
      updateHpUI(player, playerfHpFill, playerHpText);
      logAction(`${action.name}! Defence x${action.defenceMult}, healed ${action.healFlat} HP.`);
    } else {
      logAction(`${action.name}! Defence x${action.defenceMult} this turn.`);
    }

  } else if (action.type === "heal") {
    healUnit(player, Math.floor(player.maxHp*0.2));
    updateHpUI(player, playerHpFill, playerHpText);
    logAction(`You heal for ${player.maxHp*0.2} HP!`);

  } else if (action.type === "shield_break") {
    const damage = Math.max(1, Math.floor(player.attack * action.damageMult));
    applyDamage(enemy, damage);
    updateHpUI(enemy, enemyHpFill, enemyHpText);
    enemy.defReduced = true;
    enemy.defReduceTurns = 4;
    logAction(`Shield Break! Enemy defence reduced by 70% for 4 turns!`);
    logAction(`${action.name} hits for ${damage} damage!`);

  } else if (action.type === "stagger") {
    if (enemy.status.charging > 0) {
      enemy.status.charging = 0;
      enemy.status.chargePayload = 0;
      enemy.status.stunned = 1;
      logAction("Stagger interrupts the charge! Enemy is stunned!");
      renderStatusDisplay(enemy, "enemy-status-display");
      return;
    }
    var effectiveMult = action.damageMult;
    if (player.status.slowed > 0) {
      player.status.slowed--;
      effectiveMult *= 0.5;
      logAction("You are slowed! Attack weakened.");
    }
    playerAttack(effectiveMult, action.name);
    enemy.status.staggered = 1;
    logAction("Enemy is staggered!");
    renderStatusDisplay(enemy, "enemy-status-display");
  }
}


function getAvailableActions() {
  const list = [];
  CORE_ACTION_ORDER.forEach(id => {
    if (ACTIONS[id]) list.push(ACTIONS[id]);
  });
  player.ownedSkills.forEach(id => {
    if (ACTIONS[id]) list.push(ACTIONS[id]);
  });
  return list;
}

function getButtonClass(action) {
  if (action.type === "attack")       return "btn-outline-danger";
  if (action.type === "shield_break") return "btn-outline-danger";
  if (action.type === "stagger")      return "btn-outline-info";
  if (action.type === "heal")         return "btn-outline-success";
  if (action.type === "buff")         return "btn-outline-warning";
  return "btn-outline-secondary";
}

function rebuildActionButtons() {
  const container = document.getElementById("player-actions");
  container.innerHTML = "";

  const actions = getAvailableActions();

  actions.forEach((action, index) => {
    const btn = document.createElement("button");
    btn.classList.add("btn", "action-btn", "flex-fill", getButtonClass(action));
    btn.dataset.actionId = action.id;
    btn.dataset.index = String(index);
    btn.type = "button";

    let label = action.name;
    if (action.staminaCost > 0) label += ` (${action.staminaCost})`;
    if (player.cooldowns[action.id] > 0) label += ` [CD:${player.cooldowns[action.id]}]`;
    btn.textContent = label;

    btn.addEventListener("click", () => executeAction(action.id));
    container.appendChild(btn);
  });

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
    if (btn.dataset.actionId === "flee") {
      btn.disabled = false;
    } else {
      btn.disabled = disabled;
    }
  });
}


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
});


async function loadPlayerStats() {
  stat = await dungeonSocketRequest("get_user_stats")
  console.log(stat)
  player.level = stat.level;
  player.experience = stat.xp;
  player.enemyCount = 0;
  player.attack = stat.damage;
  player.defense = stat.defense;
  //calculation for this is (level * 15) + 20 (20 is base health as u start at 0)
  player.maxHp = (stat.level * 15) + 20;
  player.currentHp = player.maxHp;
}


async function initializePlayerStats() {
  await loadPlayerStats();
}

async function updateGoldDisplay() {
  var gold = await window.getPlayerGold();
  var goldEl = document.getElementById("player-gold");
  if (goldEl) {
    goldEl.textContent = gold;
  }
}

window.addEventListener("playerGoldUpdated", () => updateGoldDisplay());

async function startGame(){
  await initializePlayerStats();
  updateHpUI(player, playerHpFill, playerHpText);
  spawnNewEnemy();
  rebuildActionButtons();
  updateBattleUI();
  logAction("Battle started!");
}

if (dungeonSocket) {
  if (dungeonSocket.connected) {
    // Socket already connected (reusing window.socket from connect.js)
    loadMonsterPool();
    updateGoldDisplay();
    console.log("what")
  } else {
    dungeonSocket.on("connect", function () {
      loadMonsterPool();
      updateGoldDisplay();
    });
  }
}

window.addEventListener("beforeunload", function(e) {
  saveProgressToServer();
  if (dungeonGoldEarned > 0) {
    e.preventDefault();
    e.returnValue = '';
  }
});

document.querySelectorAll(".nav-link").forEach(function(link) {
  link.addEventListener("click", function(e) {
    if (dungeonGoldEarned > 0) {
      var confirmed = confirm("Are you sure you want to quit the dungeon instead of fleeing? Quitting this way will lose all gold gained this hunt! (Your XP and level are safe.)");
      if (!confirmed) {
        e.preventDefault();
      }
    }
  });
});
document.addEventListener("DOMContentLoaded", () => {
    startGame();
});
