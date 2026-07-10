import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";

const gold = new THREE.Color("#ffe6a3");
const amber = new THREE.Color("#c89548");
const cyan = new THREE.Color("#86dce5");
const black = new THREE.Color("#020208");

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function makePointTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(48, 48, 0, 48, 48, 48);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.28, "rgba(255,236,180,0.82)");
  gradient.addColorStop(0.72, "rgba(120,215,226,0.2)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 96, 96);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function bezier(a, b, c, d, t) {
  const mt = 1 - t;
  return new THREE.Vector3(
    mt ** 3 * a.x + 3 * mt ** 2 * t * b.x + 3 * mt * t ** 2 * c.x + t ** 3 * d.x,
    mt ** 3 * a.y + 3 * mt ** 2 * t * b.y + 3 * mt * t ** 2 * c.y + t ** 3 * d.y,
    mt ** 3 * a.z + 3 * mt ** 2 * t * b.z + 3 * mt * t ** 2 * c.z + t ** 3 * d.z
  );
}

function pushCurve(points, width, density, birth, target, colorMode) {
  const steps = Math.round(density);
  for (let i = 0; i < steps; i += 1) {
    const t = i / Math.max(1, steps - 1);
    const center = bezier(...points, t);
    const thickness = width * (1 - t * 0.74);
    const count = Math.max(3, Math.round(thickness * 3.5));
    for (let j = 0; j < count; j += 1) {
      const spread = Math.max(0.01, thickness);
      const tone = colorMode === "cyan" || (colorMode === "mixed" && Math.random() > 0.58) ? cyan : gold;
      target.push({
        x: center.x + rand(-spread, spread),
        y: center.y + rand(-spread, spread),
        z: center.z + rand(-spread * 0.5, spread * 0.5),
        birth: clamp(birth + t * 0.18 + rand(-0.025, 0.03), 0, 1),
        size: rand(0.018, 0.052) * clamp(width * 1.4, 0.7, 1.9),
        color: tone,
        phase: rand(0, Math.PI * 2)
      });
    }
  }
}

function branch(start, angle, length, depth, width, birth, target) {
  if (depth <= 0 || length < 0.28) return;
  const end = new THREE.Vector3(
    start.x + Math.cos(angle) * length,
    start.y + Math.sin(angle) * length,
    start.z + rand(-0.12, 0.12)
  );
  const points = [
    start,
    new THREE.Vector3(start.x + Math.cos(angle - 0.45) * length * 0.35, start.y + Math.sin(angle - 0.45) * length * 0.35, start.z),
    new THREE.Vector3((start.x + end.x) / 2 + rand(-length * 0.2, length * 0.2), (start.y + end.y) / 2 + rand(-0.08, 0.08), rand(-0.16, 0.16)),
    end
  ];
  pushCurve(points, width, length * 62, birth, target, depth > 4 ? "gold" : "mixed");

  const next = length * rand(0.58, 0.72);
  branch(end, angle - rand(0.2, 0.52), next, depth - 1, width * 0.68, birth + 0.055, target);
  branch(end, angle + rand(0.2, 0.58), next * rand(0.86, 1.12), depth - 1, width * 0.64, birth + 0.065, target);
  if (depth > 4) branch(end, angle + rand(-0.22, 0.22), next * 0.66, depth - 2, width * 0.48, birth + 0.08, target);
}

function buildTreeData(recordsLength) {
  const particles = [];
  const fruits = [];
  const memoryFruits = [];
  const nodes = [];

  const base = new THREE.Vector3(1.85, -1.82, 0);
  const trunkTop = new THREE.Vector3(1.75, 0.7, 0);
  const trunkWidth = 0.38;

  pushCurve([
    base,
    new THREE.Vector3(1.62, -0.88, 0.02),
    new THREE.Vector3(1.95, -0.12, -0.04),
    trunkTop
  ], trunkWidth, 190, 0.015, particles, "gold");

  pushCurve([
    new THREE.Vector3(1.66, -1.84, 0.08),
    new THREE.Vector3(1.42, -0.94, -0.02),
    new THREE.Vector3(1.7, -0.12, 0.04),
    new THREE.Vector3(1.5, 0.82, 0)
  ], trunkWidth * 0.72, 170, 0.025, particles, "gold");

  pushCurve([
    new THREE.Vector3(1.96, -1.84, -0.08),
    new THREE.Vector3(2.18, -0.92, 0.04),
    new THREE.Vector3(1.93, -0.06, -0.04),
    new THREE.Vector3(2.08, 0.8, 0)
  ], trunkWidth * 0.68, 165, 0.025, particles, "gold");

  pushCurve([
    new THREE.Vector3(1.68, -1.82, 0),
    new THREE.Vector3(1.25, -0.82, 0.08),
    new THREE.Vector3(1.1, -0.12, -0.06),
    new THREE.Vector3(0.55, 0.5, 0)
  ], trunkWidth * 0.82, 105, 0.08, particles, "gold");

  pushCurve([
    new THREE.Vector3(1.98, -1.82, 0),
    new THREE.Vector3(2.36, -0.8, -0.05),
    new THREE.Vector3(2.34, -0.04, 0.08),
    new THREE.Vector3(2.92, 0.48, 0)
  ], trunkWidth * 0.78, 100, 0.08, particles, "gold");

  [
    [new THREE.Vector3(1.82, -1.76, 0), new THREE.Vector3(1.18, -1.8, 0), new THREE.Vector3(0.35, -1.68, 0), new THREE.Vector3(-0.28, -1.42, 0)],
    [new THREE.Vector3(1.82, -1.76, 0), new THREE.Vector3(2.35, -1.84, 0), new THREE.Vector3(3.02, -1.72, 0), new THREE.Vector3(3.72, -1.48, 0)],
    [new THREE.Vector3(1.78, -1.78, 0), new THREE.Vector3(1.45, -1.92, 0), new THREE.Vector3(0.96, -1.96, 0), new THREE.Vector3(0.48, -1.9, 0)]
  ].forEach((curve, index) => pushCurve(curve, 0.12 - index * 0.018, 92, 0.01, particles, index === 1 ? "mixed" : "gold"));

  [
    [new THREE.Vector3(1.74, -0.86, 0), 3.02, 1.65, 6, 0.085, 0.18],
    [new THREE.Vector3(1.78, -0.78, 0), 0.02, 1.75, 6, 0.085, 0.2],
    [new THREE.Vector3(1.7, -0.42, 0), 3.28, 2.12, 6, 0.075, 0.27],
    [new THREE.Vector3(1.78, -0.36, 0), 0.16, 2.08, 6, 0.075, 0.3],
    [new THREE.Vector3(1.72, 0.02, 0), 2.86, 1.85, 6, 0.065, 0.38],
    [new THREE.Vector3(1.76, 0.08, 0), 0.38, 1.8, 6, 0.065, 0.4],
    [new THREE.Vector3(1.74, 0.42, 0), 2.5, 1.36, 5, 0.055, 0.48],
    [new THREE.Vector3(1.78, 0.48, 0), 0.72, 1.38, 5, 0.055, 0.5]
  ].forEach(([start, angle, length, depth, width, birth]) => branch(start, angle, length, depth, width, birth, particles));

  for (let i = 0; i < 1900; i += 1) {
    const side = Math.random() > 0.45 ? 1 : -1;
    const radius = Math.sqrt(Math.random());
    const x = 1.72 + side * rand(0.12, 2.0) * radius + rand(-0.22, 0.22);
    const y = 0.48 + Math.sin(rand(0, Math.PI)) * rand(0.12, 1.18) - radius * 0.18;
    const z = rand(-0.26, 0.26);
    const upperBias = clamp((y + 0.3) / 1.7, 0, 1);
    particles.push({
      x,
      y,
      z,
      birth: clamp(0.34 + upperBias * 0.35 + rand(-0.08, 0.08), 0.16, 0.95),
      size: rand(0.016, 0.058),
      color: Math.random() > 0.5 ? cyan : gold,
      phase: rand(0, Math.PI * 2)
    });
  }

  const fruitPositions = [
    [0.78, -0.28], [1.36, -0.08], [2.12, -0.08], [0.38, 0.22],
    [1.72, 0.28], [2.72, 0.32], [0.92, 0.76], [2.34, 0.86]
  ];

  for (let i = 0; i < recordsLength; i += 1) {
    const preset = fruitPositions[i];
    const layer = Math.floor(i / fruitPositions.length);
    const angle = ((i * 2.399) % (Math.PI * 1.68)) + Math.PI * 0.04;
    const radius = 0.58 + ((i * 0.37) % 1) * 1.65;
    const p = preset || [
      1.72 + Math.cos(angle) * radius,
      0.28 + Math.sin(angle) * (0.74 + layer * 0.04)
    ];
    fruits.push({
      position: new THREE.Vector3(p[0], p[1], rand(-0.04, 0.12)),
      birth: clamp((i + 1) / recordsLength, 0.12, 1)
    });
  }

  for (let i = 0; i < 180; i += 1) {
    const angle = rand(Math.PI * 0.08, Math.PI * 0.92);
    const radius = Math.sqrt(rand(0, 1));
    const x = 1.72 + Math.cos(angle) * 2.35 * radius;
    const y = 0.1 + Math.sin(angle) * 1.15 * radius + rand(-0.24, 0.18);
    memoryFruits.push({
      position: new THREE.Vector3(x, y, rand(-0.1, 0.16)),
      stage: Math.floor(rand(0, recordsLength)),
      size: rand(0.018, 0.038)
    });
  }

  for (let i = 0; i < recordsLength; i += 1) {
    const angle = (i / recordsLength) * Math.PI * 2;
    nodes.push(new THREE.Vector3(1.72 + Math.cos(angle) * 1.2, 0.06 + Math.sin(angle) * 0.82, 0.28));
  }

  return { particles, fruits, memoryFruits, nodes };
}

export function ParticleTree({ records, settledCount, readingIndex, selectedIndex, onFruitSelect }) {
  const mountRef = useRef(null);
  const stateRef = useRef({
    settledCount,
    readingIndex,
    selectedIndex,
    progress: { value: 0.075 },
    growthPulse: { value: 0 },
    fruitMeshes: [],
    memoryMeshes: [],
    nodeMeshes: [],
    connections: [],
    finalGroup: null,
    camera: null,
    renderer: null
  });

  useEffect(() => {
    stateRef.current.settledCount = settledCount;
    stateRef.current.readingIndex = readingIndex;
    stateRef.current.selectedIndex = selectedIndex;
    const growthProgress = Math.pow(settledCount / records.length, 0.72);
    gsap.to(stateRef.current.progress, {
      value: clamp(0.075 + growthProgress * 0.925 + (readingIndex !== null ? 0.035 : 0), 0.075, 1),
      duration: readingIndex !== null ? 0.8 : 1.65,
      ease: "power4.out"
    });

    if (settledCount > 0 && readingIndex === null) {
      gsap.fromTo(stateRef.current.growthPulse, { value: 1 }, { value: 0, duration: 1.8, ease: "power3.out" });
    }

    stateRef.current.fruitMeshes.forEach((mesh, index) => {
      const isAvailable = index === settledCount && readingIndex === null && settledCount < records.length;
      const isReading = index === readingIndex;
      const isSettled = index < settledCount;
      const isSelected = index === selectedIndex;
      mesh.visible = isAvailable || isReading || isSettled;
      const age = Math.max(0, settledCount - index);
      const targetScale = isReading ? 1.95 : isAvailable ? 1.08 : isSettled ? clamp(0.46 - age * 0.024, 0.22, 0.46) : 0.01;
      const lift = isSettled ? clamp(age * 0.085, 0.08, 0.52) : isReading ? 0.22 : 0;
      const towardCenter = isSettled ? clamp(age * 0.018, 0, 0.16) : 0;
      const targetX = lerp(mesh.userData.base.x, 1.72, towardCenter);
      const targetZ = isReading ? 0.72 : mesh.userData.base.z;
      gsap.to(mesh.position, { x: targetX, y: mesh.userData.base.y + lift, z: targetZ, duration: isReading ? 0.72 : 1.1, ease: "power3.out" });
      gsap.to(mesh.scale, { x: targetScale, y: targetScale, z: targetScale, duration: isReading ? 0.62 : 0.95, ease: isReading ? "back.out(2.2)" : "power3.out" });
      gsap.to(mesh.material, { opacity: isReading ? 0.46 : isAvailable ? 0.38 : isSelected ? 0.34 : 0.22, duration: 0.45 });
      if (mesh.userData.ring) {
        gsap.to(mesh.userData.ring.scale, { x: isReading ? 1.8 : 0.3, y: isReading ? 1.8 : 0.3, z: isReading ? 1.8 : 0.3, duration: 0.9, ease: "power2.out" });
        gsap.to(mesh.userData.ring.material, { opacity: isReading ? 0.72 : 0, duration: 0.55 });
      }
    });

    stateRef.current.memoryMeshes.forEach((mesh) => {
      mesh.visible = mesh.userData.stage < settledCount;
      const target = mesh.visible ? clamp(1.08 - (settledCount - mesh.userData.stage) * 0.05, 0.52, 1.08) : 0.01;
      gsap.to(mesh.scale, { x: target, y: target, z: target, duration: 0.8, ease: "power2.out" });
    });

    const final = settledCount === records.length && readingIndex === null;
    if (stateRef.current.finalGroup) {
      stateRef.current.finalGroup.visible = final;
      gsap.to(stateRef.current.finalGroup.children.map((child) => child.material), {
        opacity: final ? 0.34 : 0,
        duration: 1.2,
        stagger: 0.025,
        ease: "power2.out"
      });
    }
  }, [settledCount, readingIndex, selectedIndex, records.length]);

  useEffect(() => {
    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = black;
    scene.fog = new THREE.FogExp2("#020208", 0.045);

    const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(1.1, 0.1, 6.2);
    stateRef.current.camera = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    stateRef.current.renderer = renderer;

    const texture = makePointTexture();
    const data = buildTreeData(records.length);
    const count = data.particles.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const births = new Float32Array(count);
    const phases = new Float32Array(count);

    data.particles.forEach((point, index) => {
      positions[index * 3] = point.x;
      positions[index * 3 + 1] = point.y;
      positions[index * 3 + 2] = point.z;
      colors[index * 3] = point.color.r;
      colors[index * 3 + 1] = point.color.g;
      colors[index * 3 + 2] = point.color.b;
      sizes[index] = point.size;
      births[index] = point.birth;
      phases[index] = point.phase;
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("aBirth", new THREE.BufferAttribute(births, 1));
    geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      uniforms: {
        uTime: { value: 0 },
        uProgress: stateRef.current.progress,
        uGrowthPulse: stateRef.current.growthPulse,
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) }
      },
      vertexShader: `
        attribute float aSize;
        attribute float aBirth;
        attribute float aPhase;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;
        uniform float uProgress;
        uniform float uGrowthPulse;
        uniform float uPixelRatio;

        void main() {
          float appear = smoothstep(aBirth, aBirth + 0.09, uProgress);
          float future = (1.0 - appear) * (0.38 + sin(aPhase + uTime * 0.45) * 0.045);
          float normalizedY = clamp((position.y + 1.9) / 3.7, 0.0, 1.0);
          float surge = exp(-abs(normalizedY - uProgress) * 15.0) * uGrowthPulse;
          vec3 p = position;
          p.x += sin(uTime * 0.7 + aPhase + position.y * 2.0) * 0.018;
          p.y += cos(uTime * 0.6 + aPhase) * 0.012;
          p.x += sin(aPhase * 2.0 + uTime * 4.0) * surge * 0.035;
          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = aSize * 300.0 * uPixelRatio * (0.78 + appear * 0.42 + surge * 1.4) / -mvPosition.z;
          gl_Position = projectionMatrix * mvPosition;
          vColor = color;
          vAlpha = future + appear * (0.76 + sin(aPhase + uTime * 1.2) * 0.14) + surge * 0.85;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          float dist = distance(gl_PointCoord, vec2(0.5));
          float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;
          gl_FragColor = vec4(vColor, alpha);
        }
      `
    });
    material.uniforms.pointTexture = { value: texture };

    const points = new THREE.Points(geometry, material);
    points.position.x = 0.55;
    scene.add(points);

    const fruitGroup = new THREE.Group();
    fruitGroup.position.x = 0.55;
    scene.add(fruitGroup);

    const fruitMaterial = new THREE.MeshBasicMaterial({
      color: "#ffe6a3",
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: texture
    });
    const fruitGeometry = new THREE.SphereGeometry(0.018, 20, 20);
    const haloGeometry = new THREE.SphereGeometry(0.12, 24, 24);
    const ringGeometry = new THREE.TorusGeometry(0.17, 0.006, 8, 64);

    data.fruits.forEach((fruit, index) => {
      const halo = new THREE.Mesh(haloGeometry, fruitMaterial.clone());
      halo.position.copy(fruit.position);
      const isInitiallyAvailable = index === settledCount && readingIndex === null;
      const isInitiallyReading = index === readingIndex;
      const isInitiallySettled = index < settledCount;
      halo.visible = isInitiallyAvailable || isInitiallyReading || isInitiallySettled;
      halo.scale.setScalar(isInitiallyReading ? 1.95 : isInitiallyAvailable ? 1.08 : isInitiallySettled ? 0.42 : 0.01);
      halo.material.opacity = isInitiallyReading ? 0.46 : isInitiallyAvailable ? 0.38 : isInitiallySettled ? 0.22 : 0;
      halo.userData = { index, base: fruit.position.clone(), type: "fruit" };
      fruitGroup.add(halo);
      stateRef.current.fruitMeshes.push(halo);

      const core = new THREE.Mesh(fruitGeometry, new THREE.MeshBasicMaterial({ color: "#fff4c7" }));
      core.position.set(0, 0, 0);
      halo.add(core);

      const ring = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({
        color: "#ffe6a3",
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      }));
      ring.rotation.x = Math.PI * 0.34;
      ring.scale.setScalar(0.3);
      halo.add(ring);
      halo.userData.ring = ring;
    });

    const memoryMaterial = new THREE.MeshBasicMaterial({
      color: "#ffe6a3",
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const memoryGeometry = new THREE.SphereGeometry(0.026, 12, 12);
    data.memoryFruits.forEach((fruit) => {
      const mesh = new THREE.Mesh(memoryGeometry, memoryMaterial.clone());
      mesh.position.copy(fruit.position);
      mesh.scale.setScalar(0.01);
      mesh.visible = false;
      mesh.userData = { stage: fruit.stage, base: fruit.position.clone(), phase: rand(0, Math.PI * 2) };
      fruitGroup.add(mesh);
      stateRef.current.memoryMeshes.push(mesh);
    });

    const finalGroup = new THREE.Group();
    finalGroup.position.x = 0.55;
    finalGroup.visible = false;
    scene.add(finalGroup);
    stateRef.current.finalGroup = finalGroup;

    const lineMaterial = new THREE.LineBasicMaterial({
      color: "#ffe6a3",
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });
    for (let i = 0; i < data.nodes.length; i += 1) {
      for (let j = i + 1; j < data.nodes.length; j += 1) {
        if ((i + j) % 3 !== 0 && Math.abs(i - j) > 2) continue;
        const lineGeo = new THREE.BufferGeometry().setFromPoints([data.nodes[i], data.nodes[j]]);
        finalGroup.add(new THREE.Line(lineGeo, lineMaterial.clone()));
      }
    }

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function onPointerDown(event) {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(stateRef.current.fruitMeshes, false);
      if (hits[0]) onFruitSelect(hits[0].object.userData.index);
    }

    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
    }

    window.addEventListener("resize", onResize);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);

    const clock = new THREE.Clock();
    let frameId = 0;
    function animate() {
      const time = clock.getElapsedTime();
      material.uniforms.uTime.value = time;
      points.rotation.z = Math.sin(time * 0.12) * 0.008;
      fruitGroup.children.forEach((mesh) => {
        const base = mesh.userData.base;
        if (!base) return;
        const phase = mesh.userData.phase || mesh.userData.index || 0;
        if (mesh.userData.type === "fruit") {
          mesh.rotation.z = Math.sin(time * 0.9 + phase) * 0.035;
          const breathing = mesh.userData.index === stateRef.current.settledCount && stateRef.current.readingIndex === null
            ? 1 + Math.sin(time * 2.6) * 0.055
            : 1;
          mesh.children[0].scale.setScalar(breathing);
          if (mesh.userData.ring) mesh.userData.ring.rotation.z = time * 0.35;
          return;
        }
        mesh.position.set(base.x + Math.sin(time * 0.9 + phase) * 0.012, base.y + Math.cos(time * 1.1 + phase) * 0.018, base.z);
      });
      const reading = stateRef.current.readingIndex !== null;
      camera.position.x = lerp(camera.position.x, window.innerWidth < 860 ? 1.72 : reading ? 1.28 : 1.1, 0.045);
      camera.position.y = lerp(camera.position.y, reading ? 0.18 : 0.1, 0.045);
      camera.position.z = lerp(camera.position.z, reading ? 5.55 : 6.2, 0.04);
      camera.lookAt(1.82, reading ? 0.08 : -0.08, 0);
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      mount.removeChild(renderer.domElement);
      geometry.dispose();
      fruitGeometry.dispose();
      haloGeometry.dispose();
      ringGeometry.dispose();
      memoryGeometry.dispose();
      material.dispose();
      renderer.dispose();
      texture.dispose();
      stateRef.current.fruitMeshes = [];
      stateRef.current.memoryMeshes = [];
    };
  }, [records.length, onFruitSelect]);

  return <div ref={mountRef} className="tree-stage" aria-hidden="true" />;
}
