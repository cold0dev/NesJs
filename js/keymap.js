function KeymapHandler(nesProvider) {
  this.nesProvider = nesProvider;
  this.actions = ["UP", "DOWN", "LEFT", "RIGHT", "A", "B", "SELECT", "START"];

  this.defaultMapping = {
    UP: "arrowup",
    DOWN: "arrowdown",
    LEFT: "arrowleft",
    RIGHT: "arrowright",
    A: "z",
    B: "a",
    SELECT: "shift",
    START: "enter"
  };

  this.mapping = this.loadMapping();
  this.isMapping = false;
  this.mappingActionIndex = -1;
  this.singleOnly = false;
  this.boundKeydownListener = null;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => this.initUI());
  } else {
    this.initUI();
  }

  this.initInputListeners();
}

KeymapHandler.prototype.loadMapping = function() {
  let saved = localStorage.getItem("nesjs_keyboard_mapping");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to parse keyboard mapping", e);
    }
  }
  return Object.assign({}, this.defaultMapping);
};

KeymapHandler.prototype.saveMapping = function() {
  localStorage.setItem("nesjs_keyboard_mapping", JSON.stringify(this.mapping));
};

KeymapHandler.prototype.resetMapping = function() {
  this.mapping = Object.assign({}, this.defaultMapping);
  this.saveMapping();
  this.renderMappingList();
};

KeymapHandler.prototype.initInputListeners = function() {
  window.addEventListener("keydown", (e) => {
    if (this.isMapping) return;
    let key = e.key.toLowerCase();

    // Avoid hijacking inputs inside text fields
    if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA" || document.activeElement.tagName === "SELECT")) {
      return;
    }

    let nes = typeof this.nesProvider === "function" ? this.nesProvider() : this.nesProvider;
    if (!nes || !nes.setButtonPressed || !nes.INPUT) return;

    for (let action in this.mapping) {
      if (this.mapping[action] === key) {
        let nesButton = nes.INPUT[action];
        if (nesButton !== undefined) {
          nes.setButtonPressed(1, nesButton);
          e.preventDefault();
        }
      }
    }
  });

  window.addEventListener("keyup", (e) => {
    if (this.isMapping) return;
    let key = e.key.toLowerCase();

    if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA" || document.activeElement.tagName === "SELECT")) {
      return;
    }

    let nes = typeof this.nesProvider === "function" ? this.nesProvider() : this.nesProvider;
    if (!nes || !nes.setButtonReleased || !nes.INPUT) return;

    for (let action in this.mapping) {
      if (this.mapping[action] === key) {
        let nesButton = nes.INPUT[action];
        if (nesButton !== undefined) {
          nes.setButtonReleased(1, nesButton);
          e.preventDefault();
        }
      }
    }
  });
};

KeymapHandler.prototype.initUI = function() {
  let btn = document.getElementById("mapkeyboard");
  if (btn) {
    btn.onclick = () => this.openModal();
  }

  if (!document.getElementById("keymap-modal-overlay")) {
    let overlay = document.createElement("div");
    overlay.id = "keymap-modal-overlay";
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
      <div id="keymap-modal-content" style="
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
        <h3 style="margin-top:0; margin-bottom:12px; text-align:center; color:#00f3ff; font-size:18px;">Keyboard Controls Mapping</h3>
        <div id="keymap-status" style="font-size: 13px; color: #ccc; margin-bottom: 15px; text-align:center; background: #2a2a2a; padding: 8px; border-radius: 4px; border: 1px solid #3a3a3a;">
          Customize keyboard bindings for NES controls.
        </div>
        <div id="keymap-mapping-wizard" style="display:none; background:#003333; border: 1px solid #00f3ff; color: #e0f7fa; padding:12px; border-radius:4px; margin-bottom:15px; text-align:center;">
          <strong id="key-wizard-prompt" style="font-size:15px;">Press key for UP</strong>
          <div style="font-size:11px; color:#80deea; margin-top:4px;">(Press any key on keyboard)</div>
        </div>
        <table id="keymap-table" style="width:100%; border-collapse:collapse; margin-bottom:18px; font-size:13px;">
          <thead>
            <tr style="border-bottom:1px solid #444; color:#888; text-align:left;">
              <th style="padding:6px 4px;">NES Button</th>
              <th style="padding:6px 4px;">Assigned Key</th>
              <th style="padding:6px 4px; text-align:right;">Action</th>
            </tr>
          </thead>
          <tbody id="keymap-table-body"></tbody>
        </table>
        <div style="display:flex; justify-content:space-between; gap:8px;">
          <button id="key-auto-map" style="background:#00bcd4; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; font-weight:bold;">Auto-Map All</button>
          <button id="key-reset" style="background:#e53935; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">Reset Defaults</button>
          <button id="key-close" style="background:#555; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById("key-close").onclick = () => this.closeModal();
    document.getElementById("key-reset").onclick = () => this.resetMapping();
    document.getElementById("key-auto-map").onclick = () => this.startWizard(0);
  }
};

KeymapHandler.prototype.openModal = function() {
  let overlay = document.getElementById("keymap-modal-overlay");
  if (overlay) {
    overlay.style.display = "flex";
    this.renderMappingList();
  }
};

KeymapHandler.prototype.closeModal = function() {
  let overlay = document.getElementById("keymap-modal-overlay");
  if (overlay) {
    overlay.style.display = "none";
  }
  this.stopWizard();
};

KeymapHandler.prototype.renderMappingList = function() {
  let tbody = document.getElementById("keymap-table-body");
  if (!tbody) return;

  let html = "";
  for (let i = 0; i < this.actions.length; i++) {
    let action = this.actions[i];
    let keyName = (this.mapping[action] || "None").toUpperCase();
    html += `
      <tr style="border-bottom:1px solid #333;">
        <td style="padding:6px 4px; font-weight:bold; color:#fff;">${action}</td>
        <td style="padding:6px 4px; color:#80deea;">${keyName}</td>
        <td style="padding:6px 4px; text-align:right;">
          <button data-action="${action}" class="key-rebind-btn" style="background:#333; color:#fff; border:1px solid #555; padding:3px 8px; border-radius:3px; cursor:pointer; font-size:12px;">Rebind</button>
        </td>
      </tr>
    `;
  }
  tbody.innerHTML = html;

  let rebindBtns = tbody.querySelectorAll(".key-rebind-btn");
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

KeymapHandler.prototype.startWizard = function(actionIndex, singleOnly) {
  this.isMapping = true;
  this.mappingActionIndex = actionIndex;
  this.singleOnly = !!singleOnly;

  let wizardDiv = document.getElementById("keymap-mapping-wizard");
  if (wizardDiv) wizardDiv.style.display = "block";

  this.updateWizardPrompt();
  this.listenForKey();
};

KeymapHandler.prototype.updateWizardPrompt = function() {
  let prompt = document.getElementById("key-wizard-prompt");
  if (prompt) {
    let currentAction = this.actions[this.mappingActionIndex];
    prompt.innerText = `Press Keyboard Key for: [ ${currentAction} ]`;
  }
};

KeymapHandler.prototype.stopWizard = function() {
  this.isMapping = false;
  this.mappingActionIndex = -1;
  let wizardDiv = document.getElementById("keymap-mapping-wizard");
  if (wizardDiv) wizardDiv.style.display = "none";
  if (this.boundKeydownListener) {
    window.removeEventListener("keydown", this.boundKeydownListener, true);
    this.boundKeydownListener = null;
  }
};

KeymapHandler.prototype.listenForKey = function() {
  if (this.boundKeydownListener) {
    window.removeEventListener("keydown", this.boundKeydownListener, true);
  }

  this.boundKeydownListener = (e) => {
    e.preventDefault();
    e.stopPropagation();

    let key = e.key.toLowerCase();
    if (key === "escape") {
      this.stopWizard();
      return;
    }

    let action = this.actions[this.mappingActionIndex];
    this.mapping[action] = key;
    this.saveMapping();
    this.renderMappingList();

    this.advanceWizard();
  };

  window.addEventListener("keydown", this.boundKeydownListener, true);
};

KeymapHandler.prototype.advanceWizard = function() {
  if (this.singleOnly) {
    setTimeout(() => {
      this.stopWizard();
    }, 200);
  } else {
    this.mappingActionIndex++;
    if (this.mappingActionIndex >= this.actions.length) {
      setTimeout(() => {
        this.stopWizard();
      }, 200);
    } else {
      setTimeout(() => {
        this.updateWizardPrompt();
        this.listenForKey();
      }, 200);
    }
  }
};
