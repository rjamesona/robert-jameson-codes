import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.classList.add('webgl');
document.body.appendChild(renderer.domElement);

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
const flowerCount = 48;

function makePalette(colors) {
  return colors.map((hex) => new THREE.Color(hex));
}

function randomIntInRange([min, max]) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloatInRange([min, max]) {
  return min + Math.random() * (max - min);
}

const defaultCoreMaterial = new THREE.MeshLambertMaterial({
  color: '#ffe59f',
  emissive: '#f3c56b',
  flatShading: true
});

const defaultStemMaterial = new THREE.MeshLambertMaterial({
  color: '#3c9d7a',
  emissive: '#1d5f49',
  flatShading: true
});

const sharedStemGeometry = new THREE.CylinderGeometry(0.04, 0.055, 1, 10);
sharedStemGeometry.translate(0, 0.5, 0);

function easeInOut(t) {
  return t * t * (3 - 2 * t);
}

function createPetalMaterial(baseColor, options = {}) {
  const highlightColor = options.highlightColor
    ? new THREE.Color(options.highlightColor)
    : new THREE.Color('#f5f7ff');
  const color = baseColor.clone().lerp(highlightColor, options.highlightLerp ?? 0.25);
  return new THREE.MeshLambertMaterial({
    color,
    emissive: baseColor.clone().multiplyScalar(options.emissiveMultiplier ?? 0.2),
    flatShading: true,
    transparent: true,
    opacity: options.opacity ?? 0.9,
    side: THREE.DoubleSide
  });
}

function createDefaultCore(headScale) {
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28 * headScale, 0), defaultCoreMaterial);
  core.position.y = 0.05 * headScale;
  return core;
}

const flowerTypes = [
  {
    name: 'daisy',
    palette: makePalette(['#fff9f0', '#fff5d9', '#ffe7f3', '#f8fff5']),
    headScale: 0.9,
    petalCountRange: [18, 26],
    materialOptions: { highlightLerp: 0.5, emissiveMultiplier: 0.12, opacity: 0.88 },
    heightRange: [1, 2.4],
    minHeightRange: [0.32, 0.55],
    buildPetals(head, baseColor, headScale) {
      const petalCount = randomIntInRange(this.petalCountRange);
      const petalMaterial = createPetalMaterial(baseColor, this.materialOptions);
      const petalGeometry = new THREE.CircleGeometry(0.45 * headScale, 10);
      petalGeometry.scale(0.38, 1.25, 1);
      petalGeometry.translate(0, 0, 0.01);

      for (let i = 0; i < petalCount; i++) {
        const petal = new THREE.Mesh(petalGeometry, petalMaterial);
        const angle = (i / petalCount) * Math.PI * 2;
        const radius = 0.52 * headScale;
        petal.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        petal.lookAt(0, 0.4 * headScale, 0);
        petal.rotateX(THREE.MathUtils.degToRad(12));
        head.add(petal);
      }
    },
    createCore(headScale) {
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.26 * headScale, 8, 6), defaultCoreMaterial);
      core.position.y = 0.06 * headScale;
      return core;
    },
    swayMultiplier: 1.1,
    bobMultiplier: 1.05,
    baseHeadRoll: () => THREE.MathUtils.degToRad((Math.random() - 0.5) * 4)
  },
  {
    name: 'tulip',
    palette: makePalette(['#ff8b94', '#ff9a76', '#ffb677', '#ff6f9c']),
    headScale: 1,
    petalCountRange: [5, 6],
    materialOptions: { highlightColor: '#ffe5f6', highlightLerp: 0.3, opacity: 1, emissiveMultiplier: 0.14 },
    heightRange: [1.6, 3.2],
    minHeightRange: [0.52, 0.82],
    stemMaterial: new THREE.MeshLambertMaterial({
      color: '#3fbf7b',
      emissive: '#23774b',
      flatShading: true
    }),
    buildPetals(head, baseColor, headScale) {
      const petalCount = randomIntInRange(this.petalCountRange);
      const petalMaterial = createPetalMaterial(baseColor, this.materialOptions);
      const petalGeometry = new THREE.PlaneGeometry(0.42 * headScale, 1.1 * headScale, 1, 1);
      petalGeometry.translate(0, 0.55 * headScale, 0);

      for (let i = 0; i < petalCount; i++) {
        const petal = new THREE.Mesh(petalGeometry, petalMaterial);
        const angle = (i / petalCount) * Math.PI * 2;
        const radius = 0.22 * headScale;
        petal.position.set(Math.cos(angle) * radius, -0.08 * headScale, Math.sin(angle) * radius);
        petal.rotation.y = angle + Math.PI;
        petal.rotation.x = THREE.MathUtils.degToRad(-22);
        petal.scale.setScalar(1 + Math.random() * 0.1);
        head.add(petal);
      }
    },
    createCore(headScale) {
      const coreMaterial = new THREE.MeshLambertMaterial({
        color: '#ffdca8',
        emissive: '#ba7932',
        flatShading: true
      });
      const core = new THREE.Mesh(new THREE.ConeGeometry(0.18 * headScale, 0.28 * headScale, 6), coreMaterial);
      core.rotation.x = Math.PI;
      core.position.y = 0.35 * headScale;
      return core;
    },
    swayMultiplier: 0.8,
    bobMultiplier: 0.7,
    pointerInfluence: 0.7,
    spinMultiplier: 0.6,
    baseHeadTilt: THREE.MathUtils.degToRad(-6),
    baseHeadRoll: () => THREE.MathUtils.degToRad((Math.random() - 0.5) * 3)
  },
  {
    name: 'lotus',
    palette: makePalette(['#f2b9de', '#f8d1ff', '#fce6b1', '#f7a8c3']),
    headScale: 1.15,
    materialOptions: { highlightColor: '#ffffff', highlightLerp: 0.35, opacity: 0.95, emissiveMultiplier: 0.18 },
    buildPetals(head, baseColor, headScale) {
      const outerMaterial = createPetalMaterial(baseColor, this.materialOptions);
      const outerGeometry = new THREE.CircleGeometry(0.48 * headScale, 8);
      outerGeometry.scale(0.65, 1.2, 1);
      outerGeometry.translate(0, 0, 0.01);
      const outerCount = randomIntInRange([10, 14]);

      for (let i = 0; i < outerCount; i++) {
        const petal = new THREE.Mesh(outerGeometry, outerMaterial);
        const angle = (i / outerCount) * Math.PI * 2;
        const radius = 0.4 * headScale;
        petal.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        petal.lookAt(0, 0.6 * headScale, 0);
        petal.rotateX(THREE.MathUtils.degToRad(25));
        head.add(petal);
      }

      const innerColor = baseColor.clone().lerp(new THREE.Color('#ffe0ff'), 0.3);
      const innerMaterial = createPetalMaterial(innerColor, {
        highlightColor: '#ffffff',
        highlightLerp: 0.5,
        opacity: 0.92,
        emissiveMultiplier: 0.15
      });
      const innerGeometry = new THREE.CircleGeometry(0.35 * headScale, 6);
      innerGeometry.scale(0.55, 1.15, 1);
      innerGeometry.translate(0, 0, 0.01);
      const innerCount = randomIntInRange([6, 8]);

      for (let i = 0; i < innerCount; i++) {
        const petal = new THREE.Mesh(innerGeometry, innerMaterial);
        const angle = (i / innerCount) * Math.PI * 2 + Math.PI / innerCount;
        const radius = 0.23 * headScale;
        petal.position.set(Math.cos(angle) * radius, 0.03 * headScale, Math.sin(angle) * radius);
        petal.lookAt(0, 0.8 * headScale, 0);
        petal.rotateX(THREE.MathUtils.degToRad(38));
        head.add(petal);
      }
    },
    createCore(headScale) {
      const coreMaterial = new THREE.MeshLambertMaterial({
        color: '#ffdcb2',
        emissive: '#c7904e',
        flatShading: true
      });
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.22 * headScale, 8, 6), coreMaterial);
      core.position.y = 0.09 * headScale;
      return core;
    },
    swayMultiplier: 1.05,
    bobMultiplier: 1.2,
    pointerInfluence: 1.1,
    heightRange: [1.1, 2.2],
    minHeightRange: [0.4, 0.7],
    baseHeadRoll: () => THREE.MathUtils.degToRad((Math.random() - 0.5) * 5)
  },
  {
    name: 'bluebell',
    palette: makePalette(['#b4b7ff', '#a0c0ff', '#d1b4ff', '#9bb6ff']),
    headScale: 0.85,
    materialOptions: { highlightColor: '#f2f7ff', highlightLerp: 0.22, opacity: 0.82, emissiveMultiplier: 0.2 },
    heightRange: [0.9, 1.8],
    minHeightRange: [0.28, 0.48],
    stemMaterial: new THREE.MeshLambertMaterial({
      color: '#4e9ab1',
      emissive: '#27616f',
      flatShading: true
    }),
    buildPetals(head, baseColor, headScale) {
      const bloomMaterial = createPetalMaterial(baseColor, this.materialOptions);
      const bloomGeometry = new THREE.ConeGeometry(0.38 * headScale, 0.85 * headScale, 6, 1, true);
      bloomGeometry.rotateX(Math.PI);
      bloomGeometry.translate(0, 0.45 * headScale, 0);
      const bloom = new THREE.Mesh(bloomGeometry, bloomMaterial);
      bloom.rotation.y = Math.random() * Math.PI * 2;
      head.add(bloom);

      const frillMaterial = createPetalMaterial(baseColor.clone().lerp(new THREE.Color('#ffffff'), 0.4), {
        highlightColor: '#ffffff',
        highlightLerp: 0.4,
        opacity: 0.75,
        emissiveMultiplier: 0.18
      });
      const frillGeometry = new THREE.CircleGeometry(0.3 * headScale, 12);
      frillGeometry.scale(1.2, 0.8, 1);
      const frill = new THREE.Mesh(frillGeometry, frillMaterial);
      frill.position.y = 0.02 * headScale;
      head.add(frill);
    },
    createCore(headScale) {
      const coreMaterial = new THREE.MeshLambertMaterial({
        color: '#ffe9f4',
        emissive: '#d17aa6',
        flatShading: true
      });
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.14 * headScale, 6, 4), coreMaterial);
      core.position.y = -0.02 * headScale;
      return core;
    },
    swayMultiplier: 1.3,
    bobMultiplier: 1.4,
    pointerInfluence: 0.9,
    baseHeadTilt: THREE.MathUtils.degToRad(24),
    baseHeadRoll: () => THREE.MathUtils.degToRad((Math.random() - 0.5) * 8)
  },
  {
    name: 'sunburst',
    palette: makePalette(['#ffd57b', '#ffe680', '#ffc55c', '#ffe1a0']),
    headScale: 1,
    petalCountRange: [22, 30],
    materialOptions: { highlightColor: '#fff4d9', highlightLerp: 0.35, opacity: 0.9, emissiveMultiplier: 0.16 },
    heightRange: [1.4, 2.6],
    minHeightRange: [0.38, 0.6],
    stemMaterial: new THREE.MeshLambertMaterial({
      color: '#4c8f3b',
      emissive: '#25481c',
      flatShading: true
    }),
    buildPetals(head, baseColor, headScale) {
      const petalMaterial = createPetalMaterial(baseColor, this.materialOptions);
      const petalGeometry = new THREE.CircleGeometry(0.5 * headScale, 8);
      petalGeometry.scale(0.22, 1.4, 1);
      petalGeometry.translate(0, 0, 0.01);
      const petalCount = randomIntInRange(this.petalCountRange);

      for (let i = 0; i < petalCount; i++) {
        const petal = new THREE.Mesh(petalGeometry, petalMaterial);
        const angle = (i / petalCount) * Math.PI * 2;
        const radius = 0.46 * headScale;
        petal.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        petal.lookAt(0, 0.25 * headScale, 0);
        petal.rotateX(THREE.MathUtils.degToRad(8));
        head.add(petal);
      }
    },
    createCore(headScale) {
      const coreMaterial = new THREE.MeshLambertMaterial({
        color: '#5c3d13',
        emissive: '#2b1707',
        flatShading: true
      });
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32 * headScale, 0), coreMaterial);
      core.position.y = 0.02 * headScale;
      return core;
    },
    swayMultiplier: 0.95,
    bobMultiplier: 0.9,
    pointerInfluence: 1.25,
    spinMultiplier: 1.5,
    baseHeadRoll: () => THREE.MathUtils.degToRad((Math.random() - 0.5) * 2)
  }
];

function createFlower(type) {
  const root = new THREE.Group();

  const head = new THREE.Group();
  const headScale = type.headScale ?? 1;
  const baseColor = type.palette[Math.floor(Math.random() * type.palette.length)].clone();

  if (typeof type.buildPetals === 'function') {
    type.buildPetals(head, baseColor, headScale);
  }

  const coreFactory = typeof type.createCore === 'function' ? type.createCore : createDefaultCore;
  const core = coreFactory(headScale, baseColor);
  head.add(core);

  if (typeof type.addDetails === 'function') {
    type.addDetails(head, baseColor, headScale);
  }

  const stemMaterial = type.stemMaterial ?? defaultStemMaterial;
  const stem = new THREE.Mesh(sharedStemGeometry, stemMaterial);
  root.add(stem);
  root.add(head);

  const fullHeight = type.heightRange
    ? randomFloatInRange(type.heightRange)
    : 1.3 + Math.random() * 1.5;
  const minHeight = type.minHeightRange
    ? randomFloatInRange(type.minHeightRange)
    : 0.35 + Math.random() * 0.25;

  head.position.y = minHeight;

  root.head = head;
  root.stem = stem;
  root.fullHeight = fullHeight;
  root.minHeight = minHeight;
  root.headBase = new THREE.Vector3(0, minHeight, 0);
  root.headTarget = root.headBase.clone();
  root.headCurrent = root.headBase.clone();

  const pointerBase = 0.9 + Math.random() * 1.1;
  root.pointerInfluence = pointerBase * (type.pointerInfluence ?? 1);

  const swayBase = 0.3 + Math.random() * 0.35;
  root.swayAmount = swayBase * (type.swayMultiplier ?? 1);

  const bobBase = 0.18 + Math.random() * 0.22;
  root.bobAmount = bobBase * (type.bobMultiplier ?? 1);

  root.swingSpeed = (0.6 + Math.random() * 0.5) * (type.swingMultiplier ?? 1);
  root.bobSpeed = (0.9 + Math.random() * 0.6) * (type.bobSpeedMultiplier ?? 1);
  root.baseDriftSpeed = (0.18 + Math.random() * 0.12) * (type.driftMultiplier ?? 1);
  root.headSpin = (0.001 + Math.random() * 0.0025) * (type.spinMultiplier ?? 1) * (type.spinDirection ?? 1);
  root.followDelay = Math.random() * 2.6;
  root.rampDuration = (1.2 + Math.random() * 1.4) * (type.rampMultiplier ?? 1);
  root.followLerp = (0.04 + Math.random() * 0.05) * (type.followLerpMultiplier ?? 1);
  root.swingPhase = Math.random() * Math.PI * 2;
  root.basePhase = Math.random() * Math.PI * 2;
  root.followProgress = 0;
  const baseTiltSource = type.baseHeadTilt;
  const baseRollSource = type.baseHeadRoll;
  head.userData.baseTiltX =
    typeof baseTiltSource === 'function' ? baseTiltSource() : baseTiltSource ?? 0;
  head.userData.baseTiltZ =
    typeof baseRollSource === 'function' ? baseRollSource() : baseRollSource ?? 0;
  root.flowerType = type.name;

  const initialThickness = THREE.MathUtils.lerp(0.85, 1.05, root.followProgress);
  stem.scale.set(initialThickness, root.headCurrent.length(), initialThickness);

  return root;
}

let previousType = null;

for (let i = 0; i < flowerCount; i++) {
  let type = flowerTypes[Math.floor(Math.random() * flowerTypes.length)];
  if (previousType && flowerTypes.length > 1) {
    let guard = 0;
    while (type === previousType && guard < 10) {
      type = flowerTypes[Math.floor(Math.random() * flowerTypes.length)];
      guard++;
    }
  }
  previousType = type;

  const flower = createFlower(type);
  const radius = 0.6 + Math.random() * 4.2;
  const angle = Math.random() * Math.PI * 2;
  const height = (Math.random() * 2 - 1) * 1.8;
  flower.position.set(
    Math.cos(angle) * radius,
    height,
    Math.sin(angle) * radius
  );
  flower.base = flower.position.clone();
  flower.rotation.y = Math.random() * Math.PI * 2;
  flower.baseRotation = flower.rotation.y;
  flower.userData.typeName = type.name;
  flowers.push(flower);
  scene.add(flower);
}

const stemUp = new THREE.Vector3(0, 1, 0);
const stemDirection = new THREE.Vector3();
const stemQuaternion = new THREE.Quaternion();

function updateStem(flower) {
  const headPosition = flower.headCurrent;
  const stem = flower.stem;

  const length = Math.max(headPosition.length(), 0.08);
  const thickness = THREE.MathUtils.lerp(0.85, 1.05, flower.followProgress);

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

const pointer = new THREE.Vector2(0, 0);
const targetRotation = new THREE.Euler();
const pointerOffset = new THREE.Vector3();

function handlePointer(event) {
  const x = event.clientX ?? (event.touches && event.touches[0]?.clientX) ?? 0;
  const y = event.clientY ?? (event.touches && event.touches[0]?.clientY) ?? 0;
  pointer.x = (x / window.innerWidth) * 2 - 1;
  pointer.y = -((y / window.innerHeight) * 2 - 1);
}

window.addEventListener('pointermove', handlePointer, { passive: true });
window.addEventListener('touchmove', handlePointer, { passive: true });

const clock = new THREE.Clock();

function animate() {
  const elapsed = clock.getElapsedTime();

  targetRotation.set(pointer.y * 0.1, pointer.x * 0.25, 0);
  scene.rotation.x = THREE.MathUtils.lerp(scene.rotation.x, targetRotation.x, 0.02);
  scene.rotation.y = THREE.MathUtils.lerp(scene.rotation.y, targetRotation.y, 0.03);

  const desiredCamera = new THREE.Vector3(pointer.x * 0.6, 2.3 + pointer.y * 0.5, 8.5);
  camera.position.lerp(desiredCamera, 0.02);
  camera.lookAt(0, 0.6, 0);

  flowers.forEach((flower) => {
    const timeSinceStart = Math.max(0, elapsed - flower.followDelay);
    const ramp = THREE.MathUtils.clamp(timeSinceStart / flower.rampDuration, 0, 1);
    const eased = easeInOut(ramp);
    flower.followProgress = eased;

    const growthHeight = THREE.MathUtils.lerp(flower.minHeight, flower.fullHeight, eased);
    flower.headBase.y = growthHeight;

    const sway = Math.sin(elapsed * flower.swingSpeed + flower.swingPhase) * flower.swayAmount;
    const swayZ =
      Math.cos(elapsed * (flower.swingSpeed * 0.75) + flower.basePhase) * flower.swayAmount * 0.7;
    const bob = Math.sin(elapsed * flower.bobSpeed + flower.swingPhase) * flower.bobAmount;

    pointerOffset.set(pointer.x * 1.4, pointer.y * 1.1, pointer.x * 1.2);
    pointerOffset.multiplyScalar(flower.pointerInfluence);

    flower.headTarget.set(
      flower.headBase.x + sway + pointerOffset.x * eased,
      flower.headBase.y + bob + pointerOffset.y * eased,
      flower.headBase.z + swayZ + pointerOffset.z * eased
    );

    flower.headCurrent.lerp(flower.headTarget, flower.followLerp);
    flower.head.position.copy(flower.headCurrent);

    flower.head.rotation.y += flower.headSpin;
    const baseTiltX = flower.head.userData.baseTiltX ?? 0;
    const baseTiltZ = flower.head.userData.baseTiltZ ?? 0;
    flower.head.rotation.x =
      baseTiltX + Math.sin(elapsed * 0.18 + flower.basePhase) * THREE.MathUtils.degToRad(6);
    flower.head.rotation.z =
      baseTiltZ + Math.cos(elapsed * 0.21 + flower.swingPhase) * THREE.MathUtils.degToRad(3.2);

    updateStem(flower);

    const baseTargetX =
      flower.base.x + Math.sin(elapsed * flower.baseDriftSpeed + flower.basePhase) * 0.18;
    const baseTargetZ =
      flower.base.z + Math.cos(elapsed * (flower.baseDriftSpeed * 0.85) + flower.basePhase) * 0.18;
    const baseTargetY =
      flower.base.y + Math.sin(elapsed * 0.45 + flower.basePhase) * 0.14;

    flower.position.x = THREE.MathUtils.lerp(flower.position.x, baseTargetX, 0.035);
    flower.position.y = THREE.MathUtils.lerp(flower.position.y, baseTargetY, 0.045);
    flower.position.z = THREE.MathUtils.lerp(flower.position.z, baseTargetZ, 0.035);

    const rotationTargetY = flower.baseRotation + pointer.x * 0.3 * eased + sway * 0.1;
    flower.rotation.y = THREE.MathUtils.lerp(flower.rotation.y, rotationTargetY, 0.04);

    const rotationTargetX = pointer.y * 0.12 * eased + Math.sin(elapsed * 0.25 + flower.swingPhase) * 0.08;
    flower.rotation.x = THREE.MathUtils.lerp(flower.rotation.x, rotationTargetX, 0.05);
  });

  fireflyMaterial.uniforms.uTime.value = elapsed;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

function handleResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', handleResize);
