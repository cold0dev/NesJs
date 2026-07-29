
let nes = new Nes();
let audioHandler = new AudioHandler();
let gamepadHandler = new GamepadHandler(() => nes);
let paused = false;
let loaded = false;
let pausedInBg = false;
let loopId = 0;
let loadedName = "";

let c = el("output");
c.width = 256;
c.height = 240;
let ctx = c.getContext("2d");
let imgData = ctx.createImageData(256, 240);

let controlsP1 = {
  arrowright: nes.INPUT.RIGHT,
  arrowleft: nes.INPUT.LEFT,
  arrowdown: nes.INPUT.DOWN,
  arrowup: nes.INPUT.UP,
  enter: nes.INPUT.START,
  shift: nes.INPUT.SELECT,
  a: nes.INPUT.B,
  z: nes.INPUT.A
}
let controlsP2 = {
  l: nes.INPUT.RIGHT,
  j: nes.INPUT.LEFT,
  k: nes.INPUT.DOWN,
  i: nes.INPUT.UP,
  p: nes.INPUT.START,
  o: nes.INPUT.SELECT,
  t: nes.INPUT.B,
  g: nes.INPUT.A
}

zip.workerScriptsPath = "lib/";
zip.useWebWorkers = false;

el("rom").onchange = function(e) {
  audioHandler.resume();
  let freader = new FileReader();
  freader.onload = function() {
    let buf = freader.result;
    if(e.target.files[0].name.slice(-4) === ".zip") {
      // use zip.js to read the zip
      let blob = new Blob([buf]);
      zip.createReader(new zip.BlobReader(blob), function(reader) {
        reader.getEntries(function(entries) {
          if(entries.length) {
            let found = false;
            for(let i = 0; i < entries.length; i++) {
              let name = entries[i].filename;
              if(name.slice(-4) !== ".nes" && name.slice(-4) !== ".NES") {
                continue;
              }
              found = true;
              log("Loaded \"" + name + "\" from zip");
              entries[i].getData(new zip.BlobWriter(), function(blob) {
                let breader = new FileReader();
                breader.onload = function() {
                  let rbuf = breader.result;
                  let arr = new Uint8Array(rbuf);
                  loadRom(arr, name);
                  reader.close(function() {});
                }
                breader.readAsArrayBuffer(blob);
              }, function(curr, total) {});
              break;
            }
            if(!found) {
              log("No .nes file found in zip");
            }
          } else {
            log("Zip file was empty");
          }
        });
      }, function(err) {
        log("Failed to read zip: " + err);
      });
    } else {
      // load rom normally
      let parts = e.target.value.split("\\");
      let name = parts[parts.length - 1];
      let arr = new Uint8Array(buf);
      loadRom(arr, name);
    }
  }
  freader.readAsArrayBuffer(e.target.files[0]);
}

let fps = 60.09884;
let frameInterval = 1000 / fps;
let lastFrameTime = 0;

el("pause").onclick = function(e) {
  if(paused && loaded) {
    lastFrameTime = 0;
    loopId = requestAnimationFrame(update);
    audioHandler.start();
    paused = false;
    el("pause").innerText = "Pause";
  } else {
    cancelAnimationFrame(loopId);
    audioHandler.stop();
    paused = true;
    el("pause").innerText = "Unpause";
  }
}

el("reset").onclick = function(e) {
  nes.reset(false);
}

el("hardreset").onclick = function(e) {
  nes.reset(true);
}

el("runframe").onclick = function(e) {
  if(loaded) {
    runFrame();
  }
}

document.onvisibilitychange = function(e) {
  if(document.hidden) {
    pausedInBg = false;
    if(!paused && loaded) {
      el("pause").click();
      pausedInBg = true;
    }
  } else {
    if(pausedInBg && loaded) {
      lastFrameTime = 0;
      el("pause").click();
      pausedInBg = false;
    }
  }
}

window.onpagehide = function(e) {
  saveBatteryForRom();
}

function loadRom(rom, name) {
  saveBatteryForRom();
  if(nes.loadRom(rom)) {
    // load the roms battery data
    let data = localStorage.getItem(name + "_battery");
    if(data) {
      let obj = JSON.parse(data);
      nes.setBattery(obj);
      log("Loaded battery");
    }
    nes.reset(true);
    if(!loaded && !paused) {
      lastFrameTime = 0;
      loopId = requestAnimationFrame(update);
      audioHandler.start();
    }
    loaded = true;
    loadedName = name;
    let labelText = el("file-label-text");
    if(labelText) {
      labelText.innerText = "Loaded: " + name;
    }
  }
}

function saveBatteryForRom() {
  // save the loadedName's battery data
  if(loaded) {
    let data = nes.getBattery();
    if(data) {
      try {
        localStorage.setItem(loadedName + "_battery", JSON.stringify(data));
        log("Saved battery");
      } catch(e) {
        log("Failed to save battery: " + e);
      }
    }
  }
}

function update(timestamp) {
  loopId = requestAnimationFrame(update);
  gamepadHandler.poll();
  if(!lastFrameTime) {
    lastFrameTime = timestamp;
  }
  let delta = timestamp - lastFrameTime;
  if(delta >= frameInterval) {
    if(delta > frameInterval * 5) {
      lastFrameTime = timestamp;
    } else {
      lastFrameTime += frameInterval;
    }
    runFrame();
  }
}

function runFrame() {
  nes.runFrame();
  nes.getSamples(audioHandler.sampleBuffer, audioHandler.samplesPerFrame);
  audioHandler.nextBuffer();
  nes.getPixels(imgData.data);
  ctx.putImageData(imgData, 0, 0);
}

function log(text) {
  el("log").innerHTML += text + "<br>";
  el("log").scrollTop = el("log").scrollHeight;
}

function el(id) {
  return document.getElementById(id);
}

window.onkeydown = function(e) {
  if(controlsP1[e.key.toLowerCase()] !== undefined) {
    nes.setButtonPressed(1, controlsP1[e.key.toLowerCase()]);
    e.preventDefault();
  }
  if(controlsP2[e.key.toLowerCase()] !== undefined) {
    nes.setButtonPressed(2, controlsP2[e.key.toLowerCase()]);
    e.preventDefault();
  }
}

function saveState() {
  if (!loaded) {
    log("No ROM loaded to save state");
    return;
  }
  let slot = el("stateslot") ? el("stateslot").value : "1";
  let state = nes.getState();
  try {
    let key = loadedName + "_savestate_slot_" + slot;
    localStorage.setItem(key, JSON.stringify(state));
    log("Saved state to Slot " + slot);
  } catch (e) {
    log("Failed to save state: " + e);
  }
}

function loadState() {
  if (!loaded) {
    log("No ROM loaded to load state");
    return;
  }
  let slot = el("stateslot") ? el("stateslot").value : "1";
  let key = loadedName + "_savestate_slot_" + slot;
  let data = localStorage.getItem(key);
  if (!data && slot === "1") {
    data = localStorage.getItem(loadedName + "_savestate");
  }
  if (data) {
    try {
      let obj = JSON.parse(data);
      if (nes.setState(obj)) {
        log("Loaded state from Slot " + slot);
      } else {
        log("Failed to load state (version/mapper mismatch)");
      }
    } catch (e) {
      log("Error reading state: " + e);
    }
  } else {
    log("No state saved in Slot " + slot);
  }
}

if (el("savestate")) el("savestate").onclick = saveState;
if (el("loadstate")) el("loadstate").onclick = loadState;

window.onkeyup = function(e) {
  if(controlsP1[e.key.toLowerCase()] !== undefined) {
    nes.setButtonReleased(1, controlsP1[e.key.toLowerCase()]);
    e.preventDefault();
  }
  if(controlsP2[e.key.toLowerCase()] !== undefined) {
    nes.setButtonReleased(2, controlsP2[e.key.toLowerCase()]);
    e.preventDefault();
  }
  if(e.key.toLowerCase() === "m") {
    saveState();
  }
  if(e.key.toLowerCase() === "n") {
    loadState();
  }
}
