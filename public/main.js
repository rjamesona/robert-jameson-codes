import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

function updateRendererPixelRatio() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

updateRendererPixelRatio();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.classList.add('webgl');
document.body.appendChild(renderer.domElement);

const overlay = document.querySelector('.overlay');
if (overlay) {
  const INACTIVITY_DELAY_MS = 2000;
  let overlayShowTimeoutId = null;

  const scheduleOverlayShow = () => {
    window.clearTimeout(overlayShowTimeoutId);
    overlayShowTimeoutId = window.setTimeout(() => {
      overlay.classList.remove('overlay--hidden');
      overlayShowTimeoutId = null;
    }, INACTIVITY_DELAY_MS);
  };

  const handlePointerMove = () => {
    overlay.classList.add('overlay--hidden');
    scheduleOverlayShow();
  };

  window.addEventListener('pointermove', handlePointerMove);
}

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x091225, 0.055);

const camera = new THREE.PerspectiveCamera(
  42,
  window.innerWidth / window.innerHeight,
  0.1,
  80
);
camera.position.set(0, 2.3, 8.5);
scene.add(camera);

const ambient = new THREE.AmbientLight(0xbad4ff, 0.55);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0x8fb8ff, 0.9);
keyLight.position.set(4, 9, 6);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x9f79ff, 0.6);
rimLight.position.set(-6, 5, -4);
scene.add(rimLight);

const flowers = [];
let flowerCount = 48;
const FLOWER_HEIGHT_MULTIPLIER = 0.6;
const FLOWER_HEAD_SCALE = 0.7;
const STEM_THICKNESS_RANGE = { min: 0.45, max: 0.65 };
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const FLOWER_AREA_PER_PLANT = 45000;
const MIN_FLOWER_COUNT = 24;
const MAX_FLOWER_COUNT = 120;

function calculateFlowerCount() {
  const viewportArea = Math.max(window.innerWidth * window.innerHeight, 1);
  const estimatedCount = Math.round(viewportArea / FLOWER_AREA_PER_PLANT);
  return THREE.MathUtils.clamp(estimatedCount, MIN_FLOWER_COUNT, MAX_FLOWER_COUNT);
}

function makePalette(colors) {
  return colors.map((hex) => new THREE.Color(hex));
}

function randomIntInRange([min, max]) {
  const safeMin = Math.floor(toFiniteNumber(min, 0));
  const safeMax = Math.floor(toFiniteNumber(max, safeMin));
  const range = Math.max(safeMax - safeMin, 0);
  return Math.floor(Math.random() * (range + 1)) + safeMin;
}

function randomFloatInRange([min, max]) {
  const safeMin = toFiniteNumber(min, 0);
  const safeMax = toFiniteNumber(max, safeMin);
  const span = Math.max(safeMax - safeMin, 0);
  return safeMin + Math.random() * span;
}

const pastelGoldenRatio = 0.61803398875;

function toFiniteNumber(value, fallback = 0) {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return numeric;
  }

  const fallbackNumeric = Number(fallback);
  return Number.isFinite(fallbackNumeric) ? fallbackNumeric : 0;
}

function getPastelColor(index) {
  const hue = (index * pastelGoldenRatio) % 1;
  const color = new THREE.Color();
  color.setHSL(hue, 0.45, 0.82);
  return color;
}

const defaultStemMaterial = new THREE.MeshLambertMaterial({
  color: '#3c9d7a',
  emissive: '#1d5f49',
  flatShading: true
});

const sharedStemGeometry = new THREE.CylinderGeometry(0.03, 0.04, 1, 10);
sharedStemGeometry.translate(0, 0.5, 0);

function easeInOut(t) {
  return t * t * (3 - 2 * t);
}

function slowStartRamp(t) {
  const eased = easeInOut(t);
  return eased * eased;
}

function shortestAngleBetween(a, b) {
  const fullTurn = Math.PI * 2;
  return ((b - a + Math.PI) % fullTurn + fullTurn) % fullTurn - Math.PI;
}

function lerpAngle(a, b, t) {
  return a + shortestAngleBetween(a, b) * THREE.MathUtils.clamp(t, 0, 1);
}

function createPetalMaterial(baseColor, options = {}) {
  const color = baseColor.clone().lerp(new THREE.Color('#f5f7ff'), 0.25);
  const { emissiveMultiplier = 0.2, opacity = 0.9 } = options;
  return new THREE.MeshLambertMaterial({
    color,
    emissive: baseColor.clone().multiplyScalar(emissiveMultiplier),
    flatShading: true,
    transparent: true,
    opacity,
    side: THREE.DoubleSide
  });
}

function createCurvedPetalGeometry({
  length,
  width,
  segments = 8,
  taper = 0.28,
  curl = 0.22,
  tipCurl = 0.35,
  arch = 0.18
}) {
  const segmentCount = Math.floor(toFiniteNumber(segments, 8));
  const safeSegments = Math.max(Number.isFinite(segmentCount) ? segmentCount : 8, 1);

  const rawLength = Math.abs(toFiniteNumber(length, 1));
  const safeLength = Math.max(Number.isFinite(rawLength) ? rawLength : 1, 0.001);
  const halfLength = safeLength / 2;

  const rawWidth = Math.abs(toFiniteNumber(width, 1));
  const safeWidth = Math.max(Number.isFinite(rawWidth) ? rawWidth : 1, 0.001);

  const safeTaper = toFiniteNumber(taper, 0.28);
  const safeCurl = toFiniteNumber(curl, 0.22);
  const safeTipCurl = toFiniteNumber(tipCurl, 0.35);
  const safeArch = toFiniteNumber(arch, 0.18);

  const geometry = new THREE.PlaneGeometry(safeWidth, safeLength, 1, safeSegments);
  const position = geometry.attributes.position;
  const temp = new THREE.Vector3();

  for (let i = 0; i < position.count; i++) {
    temp.fromBufferAttribute(position, i);
    const localY = toFiniteNumber(temp.y + halfLength, halfLength);
    const progress = THREE.MathUtils.clamp(toFiniteNumber(localY / safeLength, 0), 0, 1);
    const taperedX = toFiniteNumber(temp.x * THREE.MathUtils.lerp(1, safeTaper, progress), 0);
    const forwardCurl = toFiniteNumber(
      Math.sin(progress * Math.PI * 0.85) * safeCurl * safeLength,
      0
    );
    const tipLift = toFiniteNumber(Math.pow(progress, 2.1) * safeTipCurl * safeLength, 0);
    const verticalArch = toFiniteNumber(Math.sin(progress * Math.PI) * safeArch * safeLength, 0);
    const curvedZ = toFiniteNumber(forwardCurl + tipLift + verticalArch, 0);

    position.setXYZ(i, taperedX, localY, curvedZ);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  return geometry;
}

function buildRingPetals(head, material, options = {}) {
  const {
    count,
    length,
    width,
    radius = 0,
    tilt = THREE.MathUtils.degToRad(48),
    offsetY = 0,
    twist = 0,
    randomness = 0.08,
    taper = 0.24,
    curl = 0.2,
    tipCurl = 0.32,
    arch = 0.16
  } = options;

  const safeCount = Math.max(Math.floor(toFiniteNumber(count, 0)), 0);
  if (safeCount === 0) {
    return;
  }

  const safeLength = Math.max(Math.abs(toFiniteNumber(length, 1)), 0.001);
  const safeWidth = Math.max(Math.abs(toFiniteNumber(width, 1)), 0.001);
  const safeRadius = toFiniteNumber(radius, 0);
  const safeTilt = toFiniteNumber(tilt, THREE.MathUtils.degToRad(48));
  const safeOffsetY = toFiniteNumber(offsetY, 0);
  const safeTwist = toFiniteNumber(twist, 0);
  const safeRandomness = Math.max(0, toFiniteNumber(randomness, 0.08));
  const safeTaper = toFiniteNumber(taper, 0.24);
  const safeCurl = toFiniteNumber(curl, 0.2);
  const safeTipCurl = toFiniteNumber(tipCurl, 0.32);
  const safeArch = toFiniteNumber(arch, 0.16);

  const group = new THREE.Group();
  const petals = [];
  const baseOpacity = THREE.MathUtils.clamp(toFiniteNumber(material.opacity, 1), 0, 1);
  group.userData = {
    petals,
    baseScale: 1,
    closedScale: 0.22,
    baseOpacity,
    material
  };
  group.scale.setScalar(group.userData.closedScale);
  group.userData.material.opacity = 0;

  for (let i = 0; i < safeCount; i++) {
    const petalGeometry = createCurvedPetalGeometry({
      length: safeLength,
      width: safeWidth,
      taper: safeTaper * THREE.MathUtils.lerp(0.9, 1.1, Math.random()),
      curl: safeCurl * THREE.MathUtils.lerp(0.85, 1.2, Math.random()),
      tipCurl: safeTipCurl * THREE.MathUtils.lerp(0.85, 1.25, Math.random()),
      arch: safeArch * THREE.MathUtils.lerp(0.85, 1.25, Math.random()),
      segments: 10
    });

    const petal = new THREE.Mesh(petalGeometry, material);
    const angle = (i / safeCount) * Math.PI * 2;
    const randomTilt = (Math.random() - 0.5) * safeRandomness;
    const randomTwist = (Math.random() - 0.5) * safeRandomness * 0.8;
    const baseBend = THREE.MathUtils.degToRad(THREE.MathUtils.randFloatSpread(4));
    petal.position.set(
      Math.cos(angle) * safeRadius,
      safeOffsetY,
      Math.sin(angle) * safeRadius
    );
    petal.rotation.set(safeTilt + randomTilt, angle + safeTwist, baseBend + randomTwist);
    petal.userData.baseRotationX = petal.rotation.x;
    petal.userData.closedRotationX = petal.userData.baseRotationX + THREE.MathUtils.degToRad(48);
    petal.userData.baseScale = 1;
    petal.rotation.x = petal.userData.closedRotationX;
    petal.scale.setScalar(petal.userData.baseScale * 0.86);
    petal.castShadow = false;
    petal.receiveShadow = false;
    petals.push(petal);
    group.add(petal);
  }

  head.add(group);
  if (!Array.isArray(head.userData?.petalRings)) {
    head.userData = { ...(head.userData ?? {}), petalRings: [] };
  }
  head.userData.petalRings.push(group);
}

function updatePetalBloom(flower, progress) {
  const safeProgress = THREE.MathUtils.clamp(toFiniteNumber(progress, 0), 0, 1);
  const easedProgress = slowStartRamp(safeProgress);
  const petalRings = flower.head?.userData?.petalRings;
  if (!Array.isArray(petalRings) || petalRings.length === 0) {
    return;
  }

  petalRings.forEach((ring, index) => {
    const ringUserData = ring.userData ?? {};
    const ringDelay = THREE.MathUtils.clamp(index * 0.12, 0, 0.6);
    const adjustedProgress = THREE.MathUtils.clamp(easedProgress - ringDelay, 0, 1);
    const ringProgress = THREE.MathUtils.clamp(slowStartRamp(adjustedProgress), 0, 1);
    const closedScale = toFiniteNumber(ringUserData.closedScale, 0.22);
    const baseScale = toFiniteNumber(ringUserData.baseScale, 1);
    const scale = THREE.MathUtils.lerp(closedScale, baseScale, ringProgress);
    ring.scale.setScalar(scale);

    if (ringUserData.material) {
      const targetOpacity = THREE.MathUtils.lerp(0, ringUserData.baseOpacity ?? 1, ringProgress);
      ringUserData.material.opacity = targetOpacity;
    }

    const petals = ringUserData.petals ?? [];
    petals.forEach((petal) => {
      const baseRotation = toFiniteNumber(petal.userData?.baseRotationX, petal.rotation.x);
      const closedRotation = toFiniteNumber(petal.userData?.closedRotationX, baseRotation);
      const petalProgress = slowStartRamp(ringProgress);
      petal.rotation.x = lerpAngle(closedRotation, baseRotation, petalProgress);
      const baseScale = toFiniteNumber(petal.userData?.baseScale, 1);
      const petalScale = THREE.MathUtils.lerp(baseScale * 0.86, baseScale, petalProgress);
      petal.scale.setScalar(petalScale);
    });
  });
}

const flowerTypes = [
  {
    name: 'Sunburst Sunflower',
    palette: makePalette(['#f9c80e', '#f7a400', '#fdd85d', '#ffcd38']),
    headScale: 1.2,
    heightRange: [1.6, 2.6],
    minHeightRange: [0.44, 0.7],
    baseHeadTilt: () => THREE.MathUtils.degToRad(THREE.MathUtils.randFloatSpread(3)),
    baseHeadRoll: () => THREE.MathUtils.degToRad(THREE.MathUtils.randFloatSpread(2)),
    stemMaterial: new THREE.MeshLambertMaterial({
      color: '#3f8f3c',
      emissive: '#1d4a1c',
      flatShading: true
    }),
    buildPetals(head, baseColor, headScale = 1) {
      const outerColor = baseColor.clone().lerp(new THREE.Color('#fff3a3'), 0.25);
      const outerMaterial = new THREE.MeshLambertMaterial({
        color: outerColor,
        emissive: outerColor.clone().multiplyScalar(0.28),
        flatShading: true,
        side: THREE.DoubleSide
      });
      buildRingPetals(head, outerMaterial, {
        count: 28,
        length: 1.15 * headScale,
        width: 0.34 * headScale,
        radius: 0.16 * headScale,
        tilt: THREE.MathUtils.degToRad(58),
        offsetY: 0.05 * headScale,
        randomness: 0.06,
        taper: 0.32,
        curl: 0.16,
        tipCurl: 0.24,
        arch: 0.14
      });

      const innerColor = baseColor.clone().lerp(new THREE.Color('#ffe27b'), 0.4);
      const innerMaterial = new THREE.MeshLambertMaterial({
        color: innerColor,
        emissive: innerColor.clone().multiplyScalar(0.26),
        flatShading: true,
        side: THREE.DoubleSide
      });
      buildRingPetals(head, innerMaterial, {
        count: 18,
        length: 0.82 * headScale,
        width: 0.26 * headScale,
        radius: 0.1 * headScale,
        tilt: THREE.MathUtils.degToRad(52),
        offsetY: 0.12 * headScale,
        randomness: 0.05,
        taper: 0.3,
        curl: 0.18,
        tipCurl: 0.22,
        arch: 0.12
      });
    },
    createCore(head, baseColor, headScale = 1) {
      const diskGeometry = new THREE.SphereGeometry(0.26 * headScale, 24, 18);
      const diskMaterial = new THREE.MeshLambertMaterial({
        color: '#4a2c0a',
        emissive: '#1f1406',
        flatShading: true
      });
      const disk = new THREE.Mesh(diskGeometry, diskMaterial);
      disk.scale.set(1, 0.4, 1);
      disk.position.y = 0.09 * headScale;
      head.add(disk);

      const seedCount = 140;
      const seedPositions = new Float32Array(seedCount * 3);
      const seedRadius = 0.22 * headScale;
      for (let i = 0; i < seedCount; i++) {
        const angle = i * GOLDEN_ANGLE;
        const radialProgress = Math.sqrt((i + 0.5) / seedCount);
        const radius = radialProgress * seedRadius;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = 0.1 * headScale + Math.sin(radialProgress * Math.PI) * 0.015 * headScale;
        seedPositions.set([x, y, z], i * 3);
      }
      const seedGeometry = new THREE.BufferGeometry();
      seedGeometry.setAttribute('position', new THREE.BufferAttribute(seedPositions, 3));
      const seedMaterial = new THREE.PointsMaterial({
        color: '#6b3d0e',
        size: 0.02 * headScale,
        sizeAttenuation: true
      });
      const seeds = new THREE.Points(seedGeometry, seedMaterial);
      head.add(seeds);

      const ringGeometry = new THREE.TorusGeometry(0.24 * headScale, 0.015 * headScale, 12, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: baseColor.clone().lerp(new THREE.Color('#f6c02c'), 0.6),
        transparent: true,
        opacity: 0.4
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.06 * headScale;
      head.add(ring);

      return disk;
    }
  }
];

let previousType = null;

function pickFlowerType() {
  const hasVariety = flowerTypes.length > 1;
  const candidates = previousType && hasVariety
    ? flowerTypes.filter((candidate) => candidate !== previousType)
    : flowerTypes;
  const type = candidates[Math.floor(Math.random() * candidates.length)];
  previousType = type;
  return type;
}

function createCoreMaterial(index) {
  const color = getPastelColor(index);
  return new THREE.MeshLambertMaterial({
    color,
    emissive: color.clone().multiplyScalar(0.35),
    flatShading: true
  });
}

function createFlower(index) {
  const type = pickFlowerType();
  const root = new THREE.Group();

  const head = new THREE.Group();
  head.userData = { petalRings: [] };
  const baseHeadScale = toFiniteNumber(type.headScale, 1);
  const headScale = baseHeadScale * FLOWER_HEAD_SCALE;
  const baseColor = type.palette[Math.floor(Math.random() * type.palette.length)].clone();

  if (typeof type.buildPetals === 'function') {
    type.buildPetals(head, baseColor, headScale);
  }

  if (typeof type.createCore === 'function') {
    type.createCore(head, baseColor, headScale, index);
  } else {
    const coreMaterial = createCoreMaterial(index);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28 * headScale, 0), coreMaterial);
    core.position.y = 0.05;
    head.add(core);
  }

  if (typeof type.addDetails === 'function') {
    type.addDetails(head, baseColor, headScale);
  }

  const stemMaterial = type.stemMaterial ?? defaultStemMaterial;
  const stem = new THREE.Mesh(sharedStemGeometry, stemMaterial);
  root.add(stem);
  root.add(head);

  const fullHeight = (type.heightRange
    ? randomFloatInRange(type.heightRange)
    : 1.3 + Math.random() * 1.5) * FLOWER_HEIGHT_MULTIPLIER;
  const minHeight = (type.minHeightRange
    ? randomFloatInRange(type.minHeightRange)
    : 0.35 + Math.random() * 0.25) * FLOWER_HEIGHT_MULTIPLIER;

  head.position.y = minHeight;

  root.head = head;
  root.stem = stem;
  root.fullHeight = fullHeight;
  root.minHeight = minHeight;
  root.headBase = new THREE.Vector3(0, minHeight, 0);
  root.headTarget = root.headBase.clone();
  root.headCurrent = root.headBase.clone();

  root.pointerInfluence = 0.45 + Math.random() * 0.6;
  root.swayAmount = 0.12 + Math.random() * 0.1;
  root.bobAmount = 0.05 + Math.random() * 0.06;
  root.swingSpeed = 0.08 + Math.random() * 0.05;
  root.bobSpeed = 0.12 + Math.random() * 0.07;
  root.baseDriftSpeed = 0.025 + Math.random() * 0.015;
  root.headSpin = 0.0001 + Math.random() * 0.00025;
  root.followDelay = 1.5 + Math.random() * 3.5;
  root.rampDuration = 6 + Math.random() * 6;
  root.reactionDelay = 0.6 + Math.random() * 2.4;
  root.reactionDuration = 4 + Math.random() * 4;
  root.minFollowLerp = 0.01 + Math.random() * 0.02;
  root.maxFollowLerp = 0.05 + Math.random() * 0.06;
  root.swingPhase = Math.random() * Math.PI * 2;
  root.basePhase = Math.random() * Math.PI * 2;
  root.followProgress = 0;
  root.minStemThickness = STEM_THICKNESS_RANGE.min;
  root.maxStemThickness = STEM_THICKNESS_RANGE.max;
  const baseTiltSource = type.baseHeadTilt;
  const baseRollSource = type.baseHeadRoll;
  head.userData.baseTiltX =
    typeof baseTiltSource === 'function' ? baseTiltSource() : baseTiltSource ?? 0;
  head.userData.baseTiltZ =
    typeof baseRollSource === 'function' ? baseRollSource() : baseRollSource ?? 0;
  root.flowerType = type.name;

  head.rotation.x = head.userData.baseTiltX;
  head.rotation.z = head.userData.baseTiltZ;

  root.headBaseQuat = new THREE.Quaternion().copy(head.quaternion);
  root.headBaseDirection = new THREE.Vector3(0, 1, 0)
    .applyQuaternion(root.headBaseQuat)
    .normalize();
  root.headSpinAngle = Math.random() * Math.PI * 2;
  root.headTargetQuat = new THREE.Quaternion().copy(head.quaternion);
  root.headCurrentQuat = new THREE.Quaternion().copy(head.quaternion);

  root.bloomProgress = 0;
  root.bloomDuration = 10;

  const initialThickness = THREE.MathUtils.lerp(
    root.minStemThickness,
    root.maxStemThickness,
    root.followProgress
  );
  stem.scale.set(initialThickness, root.headCurrent.length(), initialThickness);

  return root;
}

function placeFlowerInField(flower, index, total) {
  const safeTotal = Math.max(total, 1);
  const progress = (index + 0.5) / safeTotal;
  const radius = THREE.MathUtils.lerp(2.4, 6.4, Math.sqrt(progress));
  const angle = index * GOLDEN_ANGLE;
  const jitterX = (Math.random() - 0.5) * 0.6;
  const jitterZ = (Math.random() - 0.5) * 0.6;
  const height = THREE.MathUtils.lerp(-0.5, 0.5, Math.random());

  flower.position.set(
    Math.cos(angle) * radius + jitterX,
    height,
    Math.sin(angle) * radius + jitterZ
  );

  flower.base = flower.position.clone();
  flower.rotation.y = Math.random() * Math.PI * 2;
  flower.baseRotation = flower.rotation.y;
  flower.userData.typeName = flower.flowerType;

  flowers.push(flower);
  scene.add(flower);
}

function rebuildFlowers(targetCount = calculateFlowerCount()) {
  const safeTarget = Math.max(Math.floor(targetCount), 0);

  if (safeTarget === flowerCount && flowers.length === safeTarget) {
    return;
  }

  flowers.forEach((flower) => {
    scene.remove(flower);
  });
  flowers.length = 0;

  flowerCount = safeTarget;
  previousType = null;

  for (let i = 0; i < flowerCount; i++) {
    const flower = createFlower(i);
    placeFlowerInField(flower, i, flowerCount);
  }
}

rebuildFlowers();

const stemUp = new THREE.Vector3(0, 1, 0);
const stemDirection = new THREE.Vector3();
const stemQuaternion = new THREE.Quaternion();

function updateStem(flower) {
  const headPosition = flower.headCurrent;
  const stem = flower.stem;

  const length = Math.max(headPosition.length(), 0.08);
  const thickness = THREE.MathUtils.lerp(
    flower.minStemThickness,
    flower.maxStemThickness,
    flower.followProgress
  );

  stemDirection.copy(headPosition);

  if (stemDirection.lengthSq() < 1e-6) {
    stem.quaternion.identity();
  } else {
    stemDirection.normalize();
    stemQuaternion.setFromUnitVectors(stemUp, stemDirection);
    stem.quaternion.copy(stemQuaternion);
  }

  stem.scale.set(thickness, length, thickness);
  stem.position.set(0, 0, 0);
}

// Fireflies
const fireflyGeometry = new THREE.BufferGeometry();
const fireflyCount = 150;
const positions = new Float32Array(fireflyCount * 3);
const scales = new Float32Array(fireflyCount);

for (let i = 0; i < fireflyCount; i++) {
  const radius = 0.8 + Math.random() * 6;
  const angle = Math.random() * Math.PI * 2;
  positions[i * 3] = Math.cos(angle) * radius;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 5;
  positions[i * 3 + 2] = Math.sin(angle) * radius;
  scales[i] = Math.random() * 1.5 + 0.5;
}

fireflyGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
fireflyGeometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

const fireflyMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  uniforms: {
    uTime: { value: 0 }
  },
  vertexShader: `
    attribute float aScale;
    uniform float uTime;
    varying float vScale;
    void main() {
      vec3 pos = position;
      float hover = sin(uTime * 0.6 + position.x * 0.3 + position.y * 0.7);
      pos.y += hover * 0.25;
      vScale = aScale;
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = (vScale * 18.0) / -mvPosition.z;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying float vScale;
    void main() {
      float dist = length(gl_PointCoord - vec2(0.5));
      float alpha = smoothstep(0.5, 0.0, dist);
      vec3 color = mix(vec3(0.32, 0.54, 1.0), vec3(0.98, 0.78, 1.0), vScale / 2.5);
      gl_FragColor = vec4(color, alpha * 0.9);
    }
  `
});

const fireflies = new THREE.Points(fireflyGeometry, fireflyMaterial);
scene.add(fireflies);

// Cursor-following firefly
const guideFireflyGeometry = new THREE.BufferGeometry();
guideFireflyGeometry.setAttribute(
  'position',
  new THREE.Float32BufferAttribute([0, 0, 0], 3)
);

const guideFireflyMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  uniforms: {
    uTime: { value: 0 }
  },
  vertexShader: `
    uniform float uTime;
    varying float vBlink;
    void main() {
      vBlink = sin(uTime * 2.0) * 0.5 + 0.5;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      float size = mix(18.0, 26.0, vBlink);
      gl_PointSize = size / -mvPosition.z;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying float vBlink;
    void main() {
      float dist = length(gl_PointCoord - vec2(0.5));
      float alpha = smoothstep(0.45, 0.0, dist);
      vec3 warmGlow = vec3(1.0, 0.93, 0.66);
      vec3 coolGlow = vec3(0.66, 0.86, 1.0);
      vec3 color = mix(warmGlow, coolGlow, vBlink);
      gl_FragColor = vec4(color, alpha);
    }
  `
});

const guideFirefly = new THREE.Points(guideFireflyGeometry, guideFireflyMaterial);
guideFirefly.frustumCulled = false;
scene.add(guideFirefly);

const pointer = new THREE.Vector2(0, 0);
const pointerSmoothed = new THREE.Vector2(0, 0);
const POINTER_RESPONSE = 0.1;
const targetRotation = new THREE.Euler();
const pointerOffset = new THREE.Vector3();
const pointerWorldTarget = new THREE.Vector3();
const pointerWorldCurrent = new THREE.Vector3();
const pointerDirection = new THREE.Vector3();
const pointerLocalTarget = new THREE.Vector3();
const headLookDirection = new THREE.Vector3();
const headSpinAxis = new THREE.Vector3();
const headDeltaQuaternion = new THREE.Quaternion();
const headLookQuaternion = new THREE.Quaternion();
const headSpinQuaternion = new THREE.Quaternion();
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const guideFireflyPosition = new THREE.Vector3(0, 0.9, 0);
const guideFireflyTarget = new THREE.Vector3();
const BLOOM_DELAY_SECONDS = 1.2;
const BLOOM_DURATION_SECONDS = 10;
const BLOOM_POINTER_ACTIVATION_DISTANCE = 8;
const BLOOM_POINTER_ACTIVATION_DISTANCE_SQ =
  BLOOM_POINTER_ACTIVATION_DISTANCE * BLOOM_POINTER_ACTIVATION_DISTANCE;
let bloomTriggerTimestamp = null;
let bloomStartElapsed = null;
let bloomActivationOrigin = null;

function handlePointer(event) {
  const clientX = event.clientX ?? event.touches?.[0]?.clientX ?? 0;
  const clientY = event.clientY ?? event.touches?.[0]?.clientY ?? 0;

  pointer.x = (clientX / window.innerWidth) * 2 - 1;
  pointer.y = -((clientY / window.innerHeight) * 2 - 1);

  if (bloomTriggerTimestamp === null) {
    if (bloomActivationOrigin === null) {
      bloomActivationOrigin = { x: clientX, y: clientY };
    } else {
      const dx = clientX - bloomActivationOrigin.x;
      const dy = clientY - bloomActivationOrigin.y;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq >= BLOOM_POINTER_ACTIVATION_DISTANCE_SQ) {
        bloomTriggerTimestamp = performance.now();
      }
    }
  }
}

window.addEventListener('pointermove', handlePointer, { passive: true });
window.addEventListener('touchmove', handlePointer, { passive: true });

const clock = new THREE.Clock();
let previousElapsed = 0;
const desiredCameraPosition = new THREE.Vector3();

function animate() {
  const elapsed = clock.getElapsedTime();
  const delta = Math.min(elapsed - previousElapsed, 0.1);
  previousElapsed = elapsed;

  if (bloomTriggerTimestamp !== null && bloomStartElapsed === null) {
    const now = performance.now();
    if (now - bloomTriggerTimestamp >= BLOOM_DELAY_SECONDS * 1000) {
      bloomStartElapsed = elapsed;
    }
  }

  let bloomProgress = 0;
  if (bloomStartElapsed !== null) {
    const bloomElapsed = Math.max(0, elapsed - bloomStartElapsed);
    bloomProgress = THREE.MathUtils.clamp(
      bloomElapsed / BLOOM_DURATION_SECONDS,
      0,
      1
    );
  }
  const bloomElapsedSeconds = bloomProgress * BLOOM_DURATION_SECONDS;

  pointerSmoothed.lerp(pointer, POINTER_RESPONSE);

  raycaster.setFromCamera(pointerSmoothed, camera);
  if (!raycaster.ray.intersectPlane(groundPlane, pointerWorldTarget)) {
    pointerWorldTarget.set(0, 0, 0);
  }
  pointerWorldCurrent.lerp(pointerWorldTarget, 0.08);

  targetRotation.set(pointerSmoothed.y * 0.1, pointerSmoothed.x * 0.25, 0);
  scene.rotation.x = THREE.MathUtils.lerp(scene.rotation.x, targetRotation.x, 0.02);
  scene.rotation.y = THREE.MathUtils.lerp(scene.rotation.y, targetRotation.y, 0.03);

  desiredCameraPosition.set(pointer.x * 0.6, 2.3 + pointer.y * 0.5, 8.5);
  camera.position.lerp(desiredCameraPosition, 0.02);
  camera.lookAt(0, 0.6, 0);

  flowers.forEach((flower) => {
    const bloomDuration = Math.max(
      toFiniteNumber(flower.bloomDuration, BLOOM_DURATION_SECONDS),
      0.0001
    );
    const flowerBloomProgress = THREE.MathUtils.clamp(
      bloomElapsedSeconds / bloomDuration,
      0,
      1
    );
    flower.bloomProgress = flowerBloomProgress;
    updatePetalBloom(flower, flowerBloomProgress);
    const timeSinceStart = Math.max(0, elapsed - flower.followDelay);
    const ramp = THREE.MathUtils.clamp(timeSinceStart / flower.rampDuration, 0, 1);
    const eased = slowStartRamp(ramp);
    flower.followProgress = eased;

    const reactionElapsed = Math.max(0, elapsed - flower.followDelay - flower.reactionDelay);
    const reactionRamp = THREE.MathUtils.clamp(
      reactionElapsed / flower.reactionDuration,
      0,
      1
    );
    const reactionProgress = slowStartRamp(reactionRamp);

    const growthHeight = THREE.MathUtils.lerp(flower.minHeight, flower.fullHeight, eased);
    flower.headBase.y = growthHeight;

    const windPrimary = Math.sin(elapsed * flower.swingSpeed + flower.swingPhase);
    const windSecondary = Math.sin(elapsed * 0.06 + flower.basePhase * 0.4);
    const sway = (windPrimary * 0.7 + windSecondary * 0.3) * flower.swayAmount;
    const swayZ =
      (Math.cos(elapsed * (flower.swingSpeed * 0.6) + flower.basePhase) * 0.6 +
        Math.sin(elapsed * 0.04 + flower.swingPhase * 0.5) * 0.4) *
      flower.swayAmount * 0.85;
    const bob = Math.sin(elapsed * flower.bobSpeed + flower.swingPhase) * flower.bobAmount;

    pointerOffset.set(
      pointerSmoothed.x * 0.45,
      pointerSmoothed.y * 0.35,
      pointerSmoothed.x * 0.4
    );
    pointerOffset.multiplyScalar(flower.pointerInfluence * reactionProgress);

    flower.headTarget.set(
      flower.headBase.x + sway + pointerOffset.x,
      flower.headBase.y + bob + pointerOffset.y,
      flower.headBase.z + swayZ + pointerOffset.z
    );

    const followLerp = THREE.MathUtils.lerp(
      flower.minFollowLerp,
      flower.maxFollowLerp,
      reactionProgress
    );
    flower.headCurrent.lerp(flower.headTarget, followLerp);
    flower.head.position.copy(flower.headCurrent);

    flower.headSpinAngle += flower.headSpin * delta * 60;

    pointerDirection.copy(pointerWorldCurrent).sub(flower.position);
    const planarDistanceSq =
      pointerDirection.x * pointerDirection.x + pointerDirection.z * pointerDirection.z;
    let pointerFacing = flower.baseRotation;
    if (planarDistanceSq > 1e-6) {
      pointerFacing = Math.atan2(pointerDirection.x, pointerDirection.z);
    }

    pointerLocalTarget.copy(pointerWorldCurrent);
    flower.worldToLocal(pointerLocalTarget);
    headLookDirection.copy(pointerLocalTarget).sub(flower.head.position);

    if (headLookDirection.lengthSq() > 1e-6) {
      headLookDirection.normalize();
      headDeltaQuaternion
        .setFromUnitVectors(flower.headBaseDirection, headLookDirection);
      headLookQuaternion.copy(headDeltaQuaternion).multiply(flower.headBaseQuat);
      headSpinAxis.copy(headLookDirection);
    } else {
      headLookQuaternion.copy(flower.headBaseQuat);
      headSpinAxis.copy(flower.headBaseDirection);
    }

    headSpinAxis.normalize();
    headSpinQuaternion.setFromAxisAngle(headSpinAxis, flower.headSpinAngle);
    headLookQuaternion.multiply(headSpinQuaternion);

    const rotationLerp = THREE.MathUtils.lerp(0.015, 0.05, reactionProgress);
    flower.headTargetQuat.copy(flower.headBaseQuat).slerp(headLookQuaternion, reactionProgress);
    flower.headCurrentQuat.slerp(flower.headTargetQuat, rotationLerp);
    flower.head.quaternion.copy(flower.headCurrentQuat);

    updateStem(flower);

    const rotationBlend = reactionProgress * 0.85;
    const axisTarget = lerpAngle(flower.baseRotation, pointerFacing, rotationBlend);
    const rotationTargetY = axisTarget + sway * 0.12;
    const rotationFollow = THREE.MathUtils.lerp(0.035, 0.07, reactionProgress);
    flower.rotation.y = lerpAngle(flower.rotation.y, rotationTargetY, rotationFollow);

    const baseTargetX =
      flower.base.x + Math.sin(elapsed * flower.baseDriftSpeed + flower.basePhase) * 0.06;
    const baseTargetZ =
      flower.base.z + Math.cos(elapsed * (flower.baseDriftSpeed * 0.8) + flower.basePhase) * 0.06;
    const baseTargetY =
      flower.base.y + Math.sin(elapsed * 0.12 + flower.basePhase * 0.5) * 0.04;

    flower.position.x = THREE.MathUtils.lerp(flower.position.x, baseTargetX, 0.02);
    flower.position.y = THREE.MathUtils.lerp(flower.position.y, baseTargetY, 0.025);
    flower.position.z = THREE.MathUtils.lerp(flower.position.z, baseTargetZ, 0.02);

    const rotationTargetX =
      pointerSmoothed.y * 0.06 * reactionProgress +
      Math.sin(elapsed * 0.12 + flower.swingPhase) * 0.04;
    flower.rotation.x = THREE.MathUtils.lerp(flower.rotation.x, rotationTargetX, 0.03);
  });

  fireflyMaterial.uniforms.uTime.value = elapsed;
  guideFireflyMaterial.uniforms.uTime.value = elapsed;

  guideFireflyTarget.copy(pointerWorldTarget);
  guideFireflyTarget.y += 0.85;
  const slowFrames = Math.max(delta * 60, 1);
  const followAmount = 1 - Math.pow(1 - 0.015, slowFrames);
  guideFireflyPosition.lerp(guideFireflyTarget, followAmount);
  const hover = Math.sin(elapsed * 2.2) * 0.05 + Math.sin(elapsed * 1.1) * 0.025;
  guideFirefly.position.set(
    guideFireflyPosition.x,
    guideFireflyPosition.y + hover,
    guideFireflyPosition.z
  );

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

function handleResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  updateRendererPixelRatio();
  renderer.setSize(window.innerWidth, window.innerHeight);
  rebuildFlowers();
}

window.addEventListener('resize', handleResize);
