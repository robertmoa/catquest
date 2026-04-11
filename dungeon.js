const player = {
  currentHp: 30,
  maxHp: 30
};

const hpFill = document.getElementById("player-hp-fill");
const hpText = document.getElementById("player-hp-text");
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

function updatePlayerHpUI() {
  const hpPercent = (player.currentHp / player.maxHp) * 100;

  hpFill.style.width = `${hpPercent}%`;
  hpFill.style.backgroundColor = getHpColor(hpPercent);
  hpText.textContent = `${player.currentHp} / ${player.maxHp}`;
}

function takeDamage(amount) {
  player.currentHp = Math.max(0, player.currentHp - amount);
  updatePlayerHpUI();
}

function heal(amount) {
  player.currentHp = Math.min(player.maxHp, player.currentHp + amount);
  updatePlayerHpUI();
}

damageButton.addEventListener("click", () => {
  takeDamage(5);
});

healButton.addEventListener("click", () => {
  heal(5);
});

updatePlayerHpUI();
