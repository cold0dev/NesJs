function GamepadHandler(nesProvider) {
  this.nesProvider = nesProvider;
  this.actions = ["UP", "DOWN", "LEFT", "RIGHT", "A", "B", "SELECT", "START"];

  // Default Standard Gamepad mapping
  this.defaultMapping = {
    UP: [
      { type: "button", index: 12 },
      { type: "axis", index: 1, dir: -1 },
      { type: "axis", index: 7, dir: -1 }
    ],
    DOWN: [
      { type: "button", index: 13 },
      { type: "axis", index: 1, dir: 1 },
      { type: "axis", index: 7, dir: 1 }
    ],
    LEFT: [
      { type: "button", index: 14 },
      { type: "axis", index: 0, dir: -1 },
      { type: "axis", index: 6, dir: -1 }
    ],
    RIGHT: [
      { type: "button", index: 15 },
      { type: "axis", index: 0, dir: 1 },
      { type: "axis", index: 6, dir: 1 }
    ],
    A: [
      { type: "button", index: 0 },
      { type: "button", index: 1 }
    ],
    B: [
      { type: "button", index: 1 },
      { type: "button", index: 2 }
    ],
    SELECT: [
      { type: "button", index: 8 },
      { type: "button", index: 4 }
    ],
    START: [
      { type: "button", index: 9 },
      { type: "button", index: 9 }
    ]
  };

  this.mapping = this.loadMapping();
  this.previousState = {};
  this.isMapping = false;
  this.mappingActionIndex = -1;
  this.mappingTimer = null;
  this.statusInterval = null;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => this.initUI());
  } else {
    this.initUI();
  }
}

GamepadHandler.prototype.loadMapping = function() {
  let saved = localStorage.getItem("nesjs_gamepad_mapping");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to parse saved gamepad mapping", e);
    }
  }
  return JSON.parse(JSON.stringify(this.defaultMapping));
};

GamepadHandler.prototype.saveMapping = function() {
  localStorage.setItem("nesjs_gamepad_mapping", JSON.stringify(this.mapping));
};

GamepadHandler.prototype.resetMapping = function() {
  this.mapping = JSON.parse(JSON.stringify(this.defaultMapping));
  this.saveMapping();
  this.renderMappingList();
};

GamepadHandler.prototype.getGamepad = function() {
  let gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (let i = 0; i < gamepads.length; i++) {
    if (gamepads[i] && gamepads[i].connected) {
      return gamepads[i];
    }
  }
  return null;
};

GamepadHandler.prototype.poll = function() {
  if (this.isMapping) return;

  let nes = typeof this.nesProvider === "function" ? this.nesProvider() : this.nesProvider;
  if (!nes || !nes.setButtonPressed || !nes.INPUT) return;

  let gp = this.getGamepad();
  if (!gp) return;

  for (let i = 0; i < this.actions.length; i++) {
    let action = this.actions[i];
    let nesButton = nes.INPUT[action];
    if (nesButton === undefined) continue;

    let isPressed = this.checkActionPressed(gp, action);
    let wasPressed = !!this.previousState[action];

    if (isPressed && !wasPressed) {
      nes.setButtonPressed(1, nesButton);
    } else if (!isPressed && wasPressed) {
      nes.setButtonReleased(1, nesButton);
    }

    this.previousState[action] = isPressed;
  }
};

GamepadHandler.prototype.checkActionPressed = function(gp, action) {
  let bindings = this.mapping[action];
  if (!bindings) return false;

  for (let i = 0; i < bindings.length; i++) {
    let b = bindings[i];
    if (b.type === "button") {
      if (gp.buttons[b.index] && gp.buttons[b.index].pressed) {
        return true;
      }
    } else if (b.type === "axis") {
      let val = gp.axes[b.index];
      if (val !== undefined) {
        if (b.dir === -1 && val < -0.5) return true;
        if (b.dir === 1 && val > 0.5) return true;
      }
    }
  }
  return false;
};

GamepadHandler.prototype.initUI = function() {
  let btn = document.getElementById("mapcontroller");
  if (btn) {
    btn.onclick = () => this.openModal();
  }

  if (!document.getElementById("gamepad-modal-overlay")) {
    let overlay = document.createElement("div");
    overlay.id = "gamepad-modal-overlay";
    overlay.style.cssText = `
      display: none;
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.75);
      z-index: 10000;
      justify-content: center;
      align-items: center;
      font-family: Arial, sans-serif;
    `;

    overlay.innerHTML = `
      <div id="gamepad-modal-content" style="
        background: #1e1e1e;
        color: #f0f0f0;
        padding: 20px 24px;
        border-radius: 8px;
        width: 400px;
        max-width: 90%;
        box-shadow: 0 8px 30px rgba(0,0,0,0.7);
        text-align: left;
        box-sizing: border-box;
      ">
        <h3 style="margin-top:0; margin-bottom:12px; text-align:center; color:#4CAF50; font-size:18px;">USB Controller Mapping</h3>
        <div id="gamepad-status" style="font-size: 13px; color: #ccc; margin-bottom: 15px; text-align:center; background: #2a2a2a; padding: 8px; border-radius: 4px; border: 1px solid #3a3a3a;">
          Checking controller...
        </div>
        <div id="gamepad-mapping-wizard" style="display:none; background:#332600; border: 1px solid #ff9800; color: #ffe082; padding:12px; border-radius:4px; margin-bottom:15px; text-align:center;">
          <strong id="wizard-prompt" style="font-size:15px;">Press button for UP</strong>
          <div style="font-size:11px; color:#ffb74d; margin-top:4px;">(Press any button or direction on USB Controller)</div>
        </div>
        <table id="gamepad-table" style="width:100%; border-collapse:collapse; margin-bottom:18px; font-size:13px;">
          <thead>
            <tr style="border-bottom:1px solid #444; color:#888; text-align:left;">
              <th style="padding:6px 4px;">NES Button</th>
              <th style="padding:6px 4px;">Assigned Input</th>
              <th style="padding:6px 4px; text-align:right;">Action</th>
            </tr>
          </thead>
          <tbody id="gamepad-table-body"></tbody>
        </table>
        <div style="display:flex; justify-content:space-between; gap:8px;">
          <button id="gp-auto-map" style="background:#2196F3; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; font-weight:bold;">Auto-Map All</button>
          <button id="gp-reset" style="background:#e53935; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">Reset Defaults</button>
          <button id="gp-close" style="background:#555; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById("gp-close").onclick = () => this.closeModal();
    document.getElementById("gp-reset").onclick = () => this.resetMapping();
    document.getElementById("gp-auto-map").onclick = () => this.startWizard(0);
  }
};

GamepadHandler.prototype.openModal = function() {
  let overlay = document.getElementById("gamepad-modal-overlay");
  if (overlay) {
    overlay.style.display = "flex";
    this.renderStatus();
    this.renderMappingList();
    this.startStatusCheck();
  }
};

GamepadHandler.prototype.closeModal = function() {
  let overlay = document.getElementById("gamepad-modal-overlay");
  if (overlay) {
    overlay.style.display = "none";
  }
  this.stopWizard();
  if (this.statusInterval) {
    clearInterval(this.statusInterval);
    this.statusInterval = null;
  }
};

GamepadHandler.prototype.startStatusCheck = function() {
  if (this.statusInterval) clearInterval(this.statusInterval);
  this.statusInterval = setInterval(() => {
    this.renderStatus();
  }, 1000);
};

GamepadHandler.prototype.renderStatus = function() {
  let statusDiv = document.getElementById("gamepad-status");
  if (!statusDiv) return;
  let gp = this.getGamepad();
  if (gp) {
    statusDiv.innerHTML = `<span style="color:#4CAF50;">🟢 Connected:</span> ${gp.id.substring(0, 32)}`;
  } else {
    statusDiv.innerHTML = `<span style="color:#ff9800;">⚠️ No controller detected.</span> Connect controller &amp; press any button.`;
  }
};

GamepadHandler.prototype.renderMappingList = function() {
  let tbody = document.getElementById("gamepad-table-body");
  if (!tbody) return;

  let html = "";
  for (let i = 0; i < this.actions.length; i++) {
    let action = this.actions[i];
    let desc = this.formatBindingDesc(this.mapping[action]);
    html += `
      <tr style="border-bottom:1px solid #333;">
        <td style="padding:6px 4px; font-weight:bold; color:#fff;">${action}</td>
        <td style="padding:6px 4px; color:#4fc3f7;">${desc}</td>
        <td style="padding:6px 4px; text-align:right;">
          <button data-action="${action}" class="gp-rebind-btn" style="background:#333; color:#fff; border:1px solid #555; padding:3px 8px; border-radius:3px; cursor:pointer; font-size:12px;">Rebind</button>
        </td>
      </tr>
    `;
  }
  tbody.innerHTML = html;

  let rebindBtns = tbody.querySelectorAll(".gp-rebind-btn");
  rebindBtns.forEach(btn => {
    btn.onclick = (e) => {
      let act = e.target.getAttribute("data-action");
      let idx = this.actions.indexOf(act);
      if (idx !== -1) {
        this.startWizard(idx, true);
      }
    };
  });
};

GamepadHandler.prototype.formatBindingDesc = function(bindings) {
  if (!bindings || bindings.length === 0) return "Unbound";
  return bindings.map(b => {
    if (b.type === "button") return `Button ${b.index}`;
    if (b.type === "axis") return `Axis ${b.index} (${b.dir > 0 ? '+' : '-'})`;
    return "";
  }).join(", ");
};

GamepadHandler.prototype.startWizard = function(actionIndex, singleOnly) {
  this.isMapping = true;
  this.mappingActionIndex = actionIndex;
  this.singleOnly = !!singleOnly;

  let wizardDiv = document.getElementById("gamepad-mapping-wizard");
  if (wizardDiv) wizardDiv.style.display = "block";

  this.updateWizardPrompt();
  this.pollInputForMapping();
};

GamepadHandler.prototype.updateWizardPrompt = function() {
  let prompt = document.getElementById("wizard-prompt");
  if (prompt) {
    let currentAction = this.actions[this.mappingActionIndex];
    prompt.innerText = `Press USB Controller Input for: [ ${currentAction} ]`;
  }
};

GamepadHandler.prototype.stopWizard = function() {
  this.isMapping = false;
  this.mappingActionIndex = -1;
  let wizardDiv = document.getElementById("gamepad-mapping-wizard");
  if (wizardDiv) wizardDiv.style.display = "none";
  if (this.mappingTimer) {
    cancelAnimationFrame(this.mappingTimer);
    this.mappingTimer = null;
  }
};

GamepadHandler.prototype.pollInputForMapping = function() {
  if (!this.isMapping) return;

  let gp = this.getGamepad();
  if (gp) {
    for (let i = 0; i < gp.buttons.length; i++) {
      if (gp.buttons[i] && gp.buttons[i].pressed) {
        let action = this.actions[this.mappingActionIndex];
        this.mapping[action] = [{ type: "button", index: i }];
        this.saveMapping();
        this.renderMappingList();
        this.advanceWizard();
        return;
      }
    }
    for (let j = 0; j < gp.axes.length; j++) {
      let val = gp.axes[j];
      if (Math.abs(val) > 0.6) {
        let dir = val > 0 ? 1 : -1;
        let action = this.actions[this.mappingActionIndex];
        this.mapping[action] = [{ type: "axis", index: j, dir: dir }];
        this.saveMapping();
        this.renderMappingList();
        this.advanceWizard();
        return;
      }
    }
  }

  this.mappingTimer = requestAnimationFrame(() => this.pollInputForMapping());
};

GamepadHandler.prototype.advanceWizard = function() {
  if (this.singleOnly) {
    setTimeout(() => {
      this.stopWizard();
    }, 300);
  } else {
    this.mappingActionIndex++;
    if (this.mappingActionIndex >= this.actions.length) {
      setTimeout(() => {
        this.stopWizard();
      }, 300);
    } else {
      setTimeout(() => {
        this.updateWizardPrompt();
        this.pollInputForMapping();
      }, 300);
    }
  }
};
