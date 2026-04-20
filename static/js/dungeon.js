const player = {
  name: "Player",
  currentHp: 30,
  maxHp: 30,
  attack: 5
};

const enemy = {
  name: "Angry Cat",
  currentHp: 20,
  maxHp: 20,
  attack: 3
};

const playerHpFill = document.getElementById("player-hp-fill");
const playerHpText = document.getElementById("player-hp-text");
const enemyHpFill = document.getElementById("enemy-hp-fill");
const enemyHpText = document.getElementById("enemy-hp-text");

const damageButton = document.getElementById("btn-damage");
const healButton = document.getElementById("btn-heal");

function getHpColor(hpPercent) {
  if (hpPercent > 60) {
    return "limegreen";
  }

  if (hpPercent > 30) {
    return "gold";
  }

  return "crimson";
}

function updateHpUI(unit, hpFillElement, hpTextElement) {
  const hpPercent = (unit.currentHp / unit.maxHp) * 100;

  hpFillElement.style.width = `${hpPercent}%`;
  hpFillElement.style.backgroundColor = getHpColor(hpPercent);
  hpTextElement.textContent = `${unit.currentHp} / ${unit.maxHp}`;
}

function applyDamage(unit, amount) {
  unit.currentHp = Math.max(0, unit.currentHp - amount);
}

function healUnit(unit, amount) {
  unit.currentHp = Math.min(unit.maxHp, unit.currentHp + amount);
}

function playerAttackEnemy() {
  applyDamage(enemy, player.attack);
  updateHpUI(enemy, enemyHpFill, enemyHpText);
}

function enemyAttackPlayer() {
  applyDamage(player, enemy.attack);
  updateHpUI(player, playerHpFill, playerHpText);
}

damageButton.addEventListener("click", () => {
  if (enemy.currentHp <= 0 || player.currentHp <= 0) {
    return;
  }

  playerAttackEnemy();

  if (enemy.currentHp > 0) {
    enemyAttackPlayer();
  }
});

healButton.addEventListener("click", () => {
  if (player.currentHp <= 0) {
    return;
  }

  healUnit(player, 5);
  updateHpUI(player, playerHpFill, playerHpText);

  if (enemy.currentHp > 0) {
    enemyAttackPlayer();
  }
});

updateHpUI(player, playerHpFill, playerHpText);
updateHpUI(enemy, enemyHpFill, enemyHpText);