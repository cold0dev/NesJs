(function() {
  const scales = [1, 1.25, 1.5, 2, 2.5, 3, 4];
  let currentScaleIndex = 3; // Default 2x scale (512x480)

  let savedScale = localStorage.getItem("nesjs_canvas_scale");
  if (savedScale) {
    let parsed = parseFloat(savedScale);
    let idx = scales.indexOf(parsed);
    if (idx !== -1) currentScaleIndex = idx;
  }

  function applyScale() {
    let canvas = document.getElementById("output");
    if (canvas) {
      let scale = scales[currentScaleIndex];
      canvas.style.width = (256 * scale) + "px";
      canvas.style.height = (240 * scale) + "px";
      localStorage.setItem("nesjs_canvas_scale", scale);
    }
  }

  function toggleFullscreen() {
    let elem = document.querySelector(".screen-wrapper") || document.getElementById("output");
    if (!elem) return;

    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  }

  function initControls() {
    let zoomInBtn = document.getElementById("zoomin");
    if (zoomInBtn) {
      zoomInBtn.onclick = function() {
        if (currentScaleIndex < scales.length - 1) {
          currentScaleIndex++;
          applyScale();
        }
      };
    }

    let zoomOutBtn = document.getElementById("zoomout");
    if (zoomOutBtn) {
      zoomOutBtn.onclick = function() {
        if (currentScaleIndex > 0) {
          currentScaleIndex--;
          applyScale();
        }
      };
    }

    let fsBtn = document.getElementById("fullscreen");
    if (fsBtn) {
      fsBtn.onclick = toggleFullscreen;
    }

    let canvas = document.getElementById("output");
    if (canvas) {
      canvas.ondblclick = toggleFullscreen;
    }

    applyScale();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initControls);
  } else {
    initControls();
  }
})();
