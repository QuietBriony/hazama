/* Tools-only depth comparison. Three.js is pinned and loaded only by this page. */
const app = document.getElementById("experience");
const canvas = document.getElementById("world-canvas");
const status = document.getElementById("render-status");
const viewControls = document.getElementById("view-controls");
const viewReset = document.getElementById("view-reset");
const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js";

function showFallback(error) {
  console.warn("[Hazama depth study] WebGL unavailable:", error);
  app.dataset.threeReady = "failed";
  canvas.tabIndex = -1;
  canvas.setAttribute("aria-hidden", "true");
  viewControls.hidden = true;
  status.hidden = false;
}

async function withLoadDeadline(task) {
  let timer;
  try {
    return await Promise.race([
      task,
      new Promise((_, reject) => {
        timer = window.setTimeout(() => reject(new Error("Scene loading timed out")), 10000);
      })
    ]);
  } finally {
    window.clearTimeout(timer);
  }
}

async function start() {
  const THREE = await withLoadDeadline(import(THREE_URL));
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x081116, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x09151b, .007);
  const camera = new THREE.PerspectiveCamera(54, 1, .1, 80);
  camera.position.set(0, 0, 6.2);

  let texture;
  try {
    texture = await withLoadDeadline(new THREE.TextureLoader().loadAsync("assets/hazama-station-night-01.png"));
  } catch (error) {
    renderer.dispose();
    throw error;
  }
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: texture, fog: false, toneMapped: false })
  );
  backdrop.position.set(0, 3.45, -12);
  scene.add(backdrop);

  scene.add(new THREE.AmbientLight(0x9fbac2, 1.1));
  const warmLight = new THREE.PointLight(0xe2af79, 13, 15, 2);
  warmLight.position.set(2.3, 3.2, -8.5);
  scene.add(warmLight);

  const steel = new THREE.MeshStandardMaterial({ color: 0x21333a, metalness: .58, roughness: .58 });
  const steelEdge = new THREE.MeshBasicMaterial({ color: 0x829b9d, transparent: true, opacity: .32 });
  const darkPost = new THREE.MeshStandardMaterial({ color: 0x15262c, metalness: .32, roughness: .73, transparent: true, opacity: .65 });
  const trackSteel = new THREE.MeshStandardMaterial({ color: 0x63777a, metalness: .7, roughness: .35 });
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  function beam(material, x, y, z, width, height, depth) {
    const mesh = new THREE.Mesh(unitBox, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, depth);
    scene.add(mesh);
    return mesh;
  }

  // These few real-depth pieces align with the painting without rebuilding the station.
  beam(darkPost, -1.45, .15, -6.6, .17, 9.5, .24);
  beam(darkPost, 0, 5.7, -6.6, 18, .16, .36);
  beam(trackSteel, 0, -3.27, -5.5, 18, .045, .16);
  beam(trackSteel, 0, -3.7, -6.4, 18, .035, .12);

  const windowZ = 2.65;
  const frame = {
    left: beam(steel, 0, 0, windowZ, 1, 1, .18),
    right: beam(steel, 0, 0, windowZ, 1, 1, .18),
    top: beam(steel, 0, 0, windowZ, 1, 1, .18),
    bottom: beam(steel, 0, 0, windowZ, 1, 1, .18),
    mullion: beam(steel, 0, 0, windowZ + .02, 1, 1, .2),
    shine: beam(steelEdge, 0, 0, windowZ + .12, 1, 1, .01)
  };
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color: 0x9dbbc1, transparent: true, opacity: .055, depthWrite: false, side: THREE.DoubleSide })
  );
  glass.position.z = windowZ + .025;
  scene.add(glass);

  const silhouetteCanvas = document.createElement("canvas");
  silhouetteCanvas.width = 64;
  silhouetteCanvas.height = 160;
  const silhouette = silhouetteCanvas.getContext("2d");
  silhouette.fillStyle = "#fff";
  silhouette.beginPath();
  silhouette.ellipse(32, 24, 11, 14, 0, 0, Math.PI * 2);
  silhouette.fill();
  silhouette.beginPath();
  silhouette.moveTo(24, 39);
  silhouette.quadraticCurveTo(17, 46, 18, 73);
  silhouette.lineTo(11, 111);
  silhouette.lineTo(17, 115);
  silhouette.lineTo(23, 90);
  silhouette.lineTo(18, 157);
  silhouette.lineTo(46, 157);
  silhouette.lineTo(41, 90);
  silhouette.lineTo(47, 115);
  silhouette.lineTo(53, 111);
  silhouette.lineTo(46, 73);
  silhouette.quadraticCurveTo(47, 46, 40, 39);
  silhouette.closePath();
  silhouette.fill();
  const silhouetteTexture = new THREE.CanvasTexture(silhouetteCanvas);
  const farMaterial = new THREE.SpriteMaterial({ map: silhouetteTexture, color: 0x090e11, transparent: true, opacity: 0, depthWrite: false });
  const farFigure = new THREE.Sprite(farMaterial);
  farFigure.position.z = -11.98;
  scene.add(farFigure);
  const reflectionCanvas = document.createElement("canvas");
  reflectionCanvas.width = 64;
  reflectionCanvas.height = 160;
  const reflection = reflectionCanvas.getContext("2d");
  reflection.filter = "blur(3px)";
  reflection.drawImage(silhouetteCanvas, 0, 0);
  const reflectionTexture = new THREE.CanvasTexture(reflectionCanvas);
  const nearMaterial = new THREE.SpriteMaterial({ map: reflectionTexture, color: 0xb5d2d0, transparent: true, opacity: 0, depthWrite: false });
  const nearFigure = new THREE.Sprite(nearMaterial);
  nearFigure.position.set(-.43, .53, windowZ + .18);
  nearFigure.scale.set(.23, .57, 1);
  scene.add(nearFigure);

  const seamGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(.54, -3.15, -4),
    new THREE.Vector3(1.07, 4.4, -9)
  ]);
  const seamMaterial = new THREE.LineBasicMaterial({ color: 0xd3966c, transparent: true, opacity: 0, depthWrite: false });
  const seam = new THREE.Line(seamGeometry, seamMaterial);
  scene.add(seam);

  const hazeCanvas = document.createElement("canvas");
  hazeCanvas.width = 128;
  hazeCanvas.height = 128;
  const hazeContext = hazeCanvas.getContext("2d");
  const hazeGradient = hazeContext.createRadialGradient(64, 64, 0, 64, 64, 64);
  hazeGradient.addColorStop(0, "rgba(199,229,229,.68)");
  hazeGradient.addColorStop(.46, "rgba(168,209,211,.34)");
  hazeGradient.addColorStop(1, "rgba(168,209,211,0)");
  hazeContext.fillStyle = hazeGradient;
  hazeContext.fillRect(0, 0, 128, 128);
  const hazeTexture = new THREE.CanvasTexture(hazeCanvas);
  const hazeMaterial = new THREE.MeshBasicMaterial({ map: hazeTexture, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const haze = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.5), hazeMaterial);
  haze.position.set(.45, .65, windowZ + .15);
  scene.add(haze);

  const rainCount = 135;
  const rainPositions = new Float32Array(rainCount * 6);
  const rainSpeeds = new Float32Array(rainCount);
  let seed = 83165;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  for (let i = 0; i < rainCount; i += 1) {
    const p = i * 6;
    rainPositions[p] = random() * 11 - 5.5;
    rainPositions[p + 1] = random() * 11 - 5.5;
    rainPositions[p + 2] = random() * 11 - 8.5;
    rainPositions[p + 3] = rainPositions[p] + .07;
    rainPositions[p + 4] = rainPositions[p + 1] - (.18 + random() * .4);
    rainPositions[p + 5] = rainPositions[p + 2];
    rainSpeeds[i] = 2.4 + random() * 3.2;
  }
  const rainGeometry = new THREE.BufferGeometry();
  rainGeometry.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
  const rain = new THREE.LineSegments(
    rainGeometry,
    new THREE.LineBasicMaterial({ color: 0xa9cdd0, transparent: true, opacity: .24, depthWrite: false })
  );
  scene.add(rain);

  let panTarget = 0;
  let panCurrent = 0;
  let cameraX = 0;
  let cameraZ = 6.2;
  let lookX = 0;
  let target = { x: 0, z: 6.2, look: 0, far: 0, near: 0, seam: 0, haze: 0 };
  let frameId = 0;
  let looping = false;
  let lastFrame = 0;
  let pointerStart = null;
  let activeScene = "";
  let revealRemaining = 0;
  let reflectionAnchorX = 0;
  let reflectionOffset = 0;

  canvas.addEventListener("webglcontextlost", () => {
    finishPointer();
    looping = false;
    window.cancelAnimationFrame(frameId);
    showFallback(new Error("WebGL context lost"));
  });

  function fitBackdrop(width, height) {
    const aspect = width / height;
    const imageAspect = texture.image.width / texture.image.height;
    const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (6.2 - backdrop.position.z);
    backdrop.scale.set(visibleHeight * aspect * 1.12, visibleHeight * 1.12, 1);
    let cropX = 1;
    let cropY = 1;
    if (aspect < imageAspect) cropX = aspect / imageAspect;
    else cropY = imageAspect / aspect;
    texture.repeat.set(cropX, cropY);
    texture.offset.set(
      THREE.MathUtils.clamp(.63 - cropX / 2, 0, 1 - cropX),
      THREE.MathUtils.clamp(.54 - cropY / 2, 0, 1 - cropY)
    );
    texture.needsUpdate = true;

    // Anchor the figure to the painted waiting-room window, including cover-crop.
    // u/v use the original image; v grows upward in the texture coordinate system.
    const figureU = .662;
    const figureV = .545;
    farFigure.position.x = backdrop.position.x + ((figureU - texture.offset.x) / cropX - .5) * backdrop.scale.x;
    farFigure.position.y = backdrop.position.y + ((figureV - texture.offset.y) / cropY - .5) * backdrop.scale.y;
    const figureHeight = .064 / cropY * backdrop.scale.y;
    farFigure.scale.set(figureHeight * .4, figureHeight, 1);
  }

  function fitWindow(width, height) {
    const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (6.2 - windowZ);
    const visibleWidth = visibleHeight * width / height;
    const left = -.455 * visibleWidth;
    const right = .455 * visibleWidth;
    const top = .86 * visibleHeight / 2;
    const bottom = -.47 * visibleHeight / 2;
    const thickness = Math.max(.025, visibleHeight * .007);
    for (const [name, x] of [["left", left], ["right", right]]) {
      frame[name].position.set(x, (top + bottom) / 2, windowZ);
      frame[name].scale.set(thickness, top - bottom, .18);
    }
    for (const [name, y] of [["top", top], ["bottom", bottom]]) {
      frame[name].position.set(0, y, windowZ);
      frame[name].scale.set(right - left + thickness, thickness, .18);
    }
    frame.mullion.position.set(0, (top + bottom) / 2, windowZ + .015);
    frame.mullion.scale.set(thickness * 1.14, top - bottom, .2);
    frame.shine.position.set(thickness * .7, (top + bottom) / 2, windowZ + .12);
    frame.shine.scale.set(thickness * .16, top - bottom, .01);
    glass.position.y = (top + bottom) / 2;
    glass.scale.set(right - left, top - bottom, 1);
    reflectionAnchorX = -.25 * visibleWidth;
    nearFigure.position.set(reflectionAnchorX + reflectionOffset, .19 * visibleHeight, windowZ + .18);
    nearFigure.scale.set(.064 * visibleHeight, .16 * visibleHeight, 1);
    haze.position.set(.18 * visibleWidth, .18 * visibleHeight, windowZ + .15);
    haze.scale.set(.8, .8, 1);
  }

  function resize() {
    if (app.dataset.threeReady === "failed") return;
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    fitBackdrop(width, height);
    fitWindow(width, height);
    renderOnce();
  }

  function syncScene() {
    if (app.dataset.threeReady === "failed") return;
    const sceneId = app.dataset.scene;
    const scenes = {
      arrival: { x: 0, z: 6.2, look: 0, far: 0, near: 0, seam: 0, haze: 0 },
      observed: { x: .12, z: 5.65, look: .07, far: .9, near: 0, seam: .86, haze: 0 },
      averted: { x: -.17, z: 6.55, look: -.3, far: 0, near: 0, seam: .14, haze: .47 },
      "return-observed": { x: 0, z: 6.2, look: 0, far: 0, near: .52, seam: .8, haze: 0 },
      "return-averted": { x: 0, z: 6.2, look: 0, far: .93, near: 0, seam: .12, haze: 0 }
    };
    target = scenes[sceneId] || scenes.arrival;
    if (activeScene !== sceneId) {
      activeScene = sceneId;
      finishPointer();
      setPan(0);
      reflectionOffset = 0;
      farMaterial.opacity = 0;
      nearMaterial.opacity = 0;
      revealRemaining = target.far || target.near ? .55 : 0;
    }
    if (app.dataset.motion === "off") update(0, true);
    syncLoop();
  }

  function update(delta, immediate = false) {
    const weight = immediate ? 1 : 1 - Math.exp(-delta * 3.4);
    const panWeight = immediate ? 1 : 1 - Math.exp(-delta * 14);
    panCurrent += (panTarget - panCurrent) * panWeight;
    cameraX += (target.x - cameraX) * weight;
    cameraZ += (target.z - cameraZ) * weight;
    lookX += (target.look - lookX) * weight;
    camera.position.set(cameraX + panCurrent, 0, cameraZ);
    camera.lookAt(lookX + panCurrent * .17, 0, -8);
    revealRemaining = immediate ? 0 : Math.max(0, revealRemaining - delta);
    reflectionOffset += (panCurrent * .12 - reflectionOffset) * (immediate ? 1 : 1 - Math.exp(-delta * 1.8));
    nearFigure.position.x = reflectionAnchorX + reflectionOffset;
    for (const [material, value] of [
      [farMaterial, revealRemaining > 0 ? 0 : target.far],
      [nearMaterial, revealRemaining > 0 ? 0 : target.near],
      [seamMaterial, target.seam], [hazeMaterial, target.haze]
    ]) material.opacity += (value - material.opacity) * weight;
    if (!immediate && delta > 0) {
      for (let i = 0; i < rainCount; i += 1) {
        const p = i * 6;
        const fall = rainSpeeds[i] * delta;
        rainPositions[p + 1] -= fall;
        rainPositions[p + 4] -= fall;
        if (rainPositions[p + 4] < -5.8) {
          const length = rainPositions[p + 1] - rainPositions[p + 4];
          rainPositions[p + 1] = 5.8;
          rainPositions[p + 4] = 5.8 - length;
        }
      }
      rainGeometry.attributes.position.needsUpdate = true;
    }
  }

  function renderOnce() { renderer.render(scene, camera); }

  function frameStep(now) {
    if (!looping) return;
    frameId = window.requestAnimationFrame(frameStep);
    if (now - lastFrame < 32) return;
    const delta = Math.min(.055, (now - (lastFrame || now)) / 1000);
    lastFrame = now;
    update(delta);
    renderOnce();
  }

  function syncLoop() {
    if (app.dataset.threeReady === "failed") return;
    const shouldLoop = app.dataset.motion === "on" && !document.hidden;
    if (shouldLoop && !looping) {
      looping = true;
      lastFrame = 0;
      frameId = window.requestAnimationFrame(frameStep);
    } else if (!shouldLoop && looping) {
      looping = false;
      window.cancelAnimationFrame(frameId);
      if (!document.hidden) { update(0, true); renderOnce(); }
    } else if (!shouldLoop) {
      if (!document.hidden) { update(0, true); renderOnce(); }
    }
  }

  function setPan(value) {
    panTarget = THREE.MathUtils.clamp(value, -.72, .72);
    canvas.dataset.pan = panTarget.toFixed(2);
    if (app.dataset.motion === "off" && app.dataset.threeReady !== "failed") {
      update(0, true);
      renderOnce();
    }
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0 || app.dataset.threeReady !== "yes") return;
    pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY, pan: panTarget, horizontal: false };
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!pointerStart || pointerStart.id !== event.pointerId) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    if (!pointerStart.horizontal) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      if (Math.abs(dy) > Math.abs(dx)) { finishPointer(); return; }
      pointerStart.horizontal = true;
      canvas.setPointerCapture(event.pointerId);
    }
    setPan(pointerStart.pan + dx / canvas.clientWidth * 1.75);
  });
  function finishPointer() {
    const id = pointerStart?.id;
    pointerStart = null;
    if (id !== undefined && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  }
  canvas.addEventListener("pointerup", finishPointer);
  canvas.addEventListener("pointercancel", finishPointer);
  canvas.addEventListener("lostpointercapture", finishPointer);
  canvas.addEventListener("pointerleave", () => {
    if (pointerStart && !pointerStart.horizontal) finishPointer();
  });
  canvas.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home"].includes(event.key) || app.dataset.threeReady !== "yes") return;
    event.preventDefault();
    setPan(event.key === "Home" ? 0 : panTarget + (event.key === "ArrowRight" ? .19 : -.19));
  });
  viewReset.addEventListener("click", () => setPan(0));

  const observer = new MutationObserver(syncScene);
  observer.observe(app, { attributes: true, attributeFilter: ["data-scene", "data-motion"] });
  document.addEventListener("visibilitychange", () => { finishPointer(); syncLoop(); });
  window.addEventListener("resize", resize);
  window.addEventListener("pagehide", (event) => {
    finishPointer();
    looping = false;
    window.cancelAnimationFrame(frameId);
    if (!event.persisted) {
      observer.disconnect();
      renderer.dispose();
    }
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) syncLoop();
  });

  resize();
  syncScene();
  app.dataset.threeReady = "yes";
  canvas.tabIndex = 0;
  canvas.removeAttribute("aria-hidden");
  viewControls.hidden = false;
}

start().catch(showFallback);
