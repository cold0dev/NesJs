function TouchpadHandler(nesProvider) {
  this.nesProvider = nesProvider;
  this.enabled = false;
  this.activeButtons = new Set();

  // Load saved preference or auto-enable on touch devices
  let saved = localStorage.getItem("nesjs_touch_enabled");
  if (saved !== null) {
    this.enabled = (saved === "true");
  } else {
    this.enabled = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => this.init());
  } else {
    this.init();
  }
}

TouchpadHandler.prototype.init = function() {
  let btn = document.getElementById("touchcontrols");
  if (btn) {
    btn.onclick = () => this.toggle();
  }

  this.createTouchOverlay();
  if (this.enabled) {
    this.show();
  }
};

TouchpadHandler.prototype.toggle = function() {
  this.enabled = !this.enabled;
  localStorage.setItem("nesjs_touch_enabled", this.enabled);
  if (this.enabled) {
    this.show();
  } else {
    this.hide();
  }
};

TouchpadHandler.prototype.show = function() {
  let overlay = document.getElementById("nes-touch-overlay");
  if (overlay) {
    overlay.style.display = "block";
  }
};

TouchpadHandler.prototype.hide = function() {
  let overlay = document.getElementById("nes-touch-overlay");
  if (overlay) {
    overlay.style.display = "none";
  }
  this.clearAllButtons();
};

TouchpadHandler.prototype.clearAllButtons = function() {
  let nes = typeof this.nesProvider === "function" ? this.nesProvider() : this.nesProvider;
  if (!nes || !nes.setButtonReleased || !nes.INPUT) return;

  this.activeButtons.forEach(action => {
    let nesBtn = nes.INPUT[action];
    if (nesBtn !== undefined) {
      nes.setButtonReleased(1, nesBtn);
    }
  });
  this.activeButtons.clear();
};

TouchpadHandler.prototype.createTouchOverlay = function() {
  if (document.getElementById("nes-touch-overlay")) return;

  let overlay = document.createElement("div");
  overlay.id = "nes-touch-overlay";
  overlay.style.cssText = `
    display: none;
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    pointer-events: none;
    z-index: 9999;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
  `;

  overlay.innerHTML = `
    <!-- D-Pad Container (Bottom Left) -->
    <div id="touch-dpad" style="
      position: absolute;
      bottom: 25px; left: 25px;
      width: 160px; height: 160px;
      pointer-events: auto;
      touch-action: none;
    ">
      <div data-action="UP" class="touch-btn dpad-up" style="
        position: absolute; top: 0; left: 53px; width: 54px; height: 54px;
        background: rgba(255,255,255,0.15); border: 2px solid rgba(0,243,255,0.4);
        border-radius: 8px 8px 0 0; display:flex; justify-center:center; align-items:center; color:#00f3ff; font-weight:bold; font-size:20px;
      ">▲</div>
      <div data-action="DOWN" class="touch-btn dpad-down" style="
        position: absolute; bottom: 0; left: 53px; width: 54px; height: 54px;
        background: rgba(255,255,255,0.15); border: 2px solid rgba(0,243,255,0.4);
        border-radius: 0 0 8px 8px; display:flex; justify-center:center; align-items:center; color:#00f3ff; font-weight:bold; font-size:20px;
      ">▼</div>
      <div data-action="LEFT" class="touch-btn dpad-left" style="
        position: absolute; top: 53px; left: 0; width: 54px; height: 54px;
        background: rgba(255,255,255,0.15); border: 2px solid rgba(0,243,255,0.4);
        border-radius: 8px 0 0 8px; display:flex; justify-center:center; align-items:center; color:#00f3ff; font-weight:bold; font-size:20px;
      ">◀</div>
      <div data-action="RIGHT" class="touch-btn dpad-right" style="
        position: absolute; top: 53px; right: 0; width: 54px; height: 54px;
        background: rgba(255,255,255,0.15); border: 2px solid rgba(0,243,255,0.4);
        border-radius: 0 8px 8px 0; display:flex; justify-center:center; align-items:center; color:#00f3ff; font-weight:bold; font-size:20px;
      ">▶</div>
      <div style="
        position: absolute; top: 53px; left: 53px; width: 54px; height: 54px;
        background: rgba(20,20,35,0.8); border: 1px solid rgba(0,243,255,0.2);
      "></div>
    </div>

    <!-- Action Buttons Container (Bottom Right) -->
    <div id="touch-actions" style="
      position: absolute;
      bottom: 30px; right: 30px;
      width: 170px; height: 150px;
      pointer-events: auto;
      touch-action: none;
    ">
      <!-- B Button -->
      <div data-action="B" class="touch-btn action-b" style="
        position: absolute; bottom: 10px; left: 10px; width: 68px; height: 68px;
        background: rgba(255,0,85,0.25); border: 2px solid #ff0055;
        border-radius: 50%; display:flex; justify-content:center; align-items:center;
        color:#fff; font-weight:bold; font-size:22px; box-shadow: 0 0 15px rgba(255,0,85,0.4);
      ">B</div>
      <!-- A Button -->
      <div data-action="A" class="touch-btn action-a" style="
        position: absolute; top: 10px; right: 10px; width: 68px; height: 68px;
        background: rgba(0,243,255,0.25); border: 2px solid #00f3ff;
        border-radius: 50%; display:flex; justify-content:center; align-items:center;
        color:#fff; font-weight:bold; font-size:22px; box-shadow: 0 0 15px rgba(0,243,255,0.4);
      ">A</div>
    </div>

    <!-- Select / Start Container (Bottom Center) -->
    <div id="touch-center" style="
      position: absolute;
      bottom: 20px; left: 50%;
      transform: translateX(-50%);
      display: flex; gap: 20px;
      pointer-events: auto;
      touch-action: none;
    ">
      <div data-action="SELECT" class="touch-btn center-select" style="
        padding: 8px 16px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3);
        border-radius: 14px; color:#aaa; font-size:12px; font-weight:bold; text-transform:uppercase;
      ">Select</div>
      <div data-action="START" class="touch-btn center-start" style="
        padding: 8px 16px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3);
        border-radius: 14px; color:#aaa; font-size:12px; font-weight:bold; text-transform:uppercase;
      ">Start</div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Setup Multi-Touch Tracking
  const updateTouches = (e) => {
    e.preventDefault();
    let nes = typeof this.nesProvider === "function" ? this.nesProvider() : this.nesProvider;
    if (!nes || !nes.setButtonPressed || !nes.setButtonReleased || !nes.INPUT) return;

    let newActive = new Set();

    for (let i = 0; i < e.touches.length; i++) {
      let touch = e.touches[i];
      let elem = document.elementFromPoint(touch.clientX, touch.clientY);
      if (elem) {
        let btn = elem.closest(".touch-btn");
        if (btn) {
          let action = btn.getAttribute("data-action");
          if (action) {
            newActive.add(action);
          }
        }
      }
    }

    // Process pressed buttons
    newActive.forEach(action => {
      if (!this.activeButtons.has(action)) {
        let nesBtn = nes.INPUT[action];
        if (nesBtn !== undefined) {
          nes.setButtonPressed(1, nesBtn);
          if (navigator.vibrate) navigator.vibrate(10);
        }
      }
    });

    // Process released buttons
    this.activeButtons.forEach(action => {
      if (!newActive.has(action)) {
        let nesBtn = nes.INPUT[action];
        if (nesBtn !== undefined) {
          nes.setButtonReleased(1, nesBtn);
        }
      }
    });

    this.activeButtons = newActive;
  };

  overlay.addEventListener("touchstart", updateTouches, { passive: false });
  overlay.addEventListener("touchmove", updateTouches, { passive: false });
  overlay.addEventListener("touchend", updateTouches, { passive: false });
  overlay.addEventListener("touchcancel", updateTouches, { passive: false });
};
