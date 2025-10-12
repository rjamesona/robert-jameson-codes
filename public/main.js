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

const pastelGoldenRatio = 0.61803398875;

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

const sharedStemGeometry = new THREE.CylinderGeometry(0.04, 0.055, 1, 10);
sharedStemGeometry.translate(0, 0.5, 0);

function easeInOut(t) {
  return t * t * (3 - 2 * t);
}

function slowStartRamp(t) {
  const eased = easeInOut(t);
  return eased * eased;
}

function createPetalMaterial(baseColor) {
  const color = baseColor.clone().lerp(new THREE.Color('#f5f7ff'), 0.25);
  return new THREE.MeshLambertMaterial({
    color,
    emissive: baseColor.clone().multiplyScalar(options.emissiveMultiplier ?? 0.2),
    flatShading: true,
    transparent: true,
    opacity: options.opacity ?? 0.9,
    side: THREE.DoubleSide
  });
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
  const root = new THREE.Group();

  const head = new THREE.Group();
  const headScale = type.headScale ?? 1;
  const baseColor = type.palette[Math.floor(Math.random() * type.palette.length)].clone();

  if (typeof type.buildPetals === 'function') {
    type.buildPetals(head, baseColor, headScale);
  }

  const coreMaterial = createCoreMaterial(index);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), coreMaterial);
  core.position.y = 0.05;
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
  const flower = createFlower(i);
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
let previousElapsed = 0;

function animate() {
  const elapsed = clock.getElapsedTime();
  const delta = elapsed - previousElapsed;
  previousElapsed = elapsed;

  targetRotation.set(pointer.y * 0.1, pointer.x * 0.25, 0);
  scene.rotation.x = THREE.MathUtils.lerp(scene.rotation.x, targetRotation.x, 0.02);
  scene.rotation.y = THREE.MathUtils.lerp(scene.rotation.y, targetRotation.y, 0.03);

  const desiredCamera = new THREE.Vector3(pointer.x * 0.6, 2.3 + pointer.y * 0.5, 8.5);
  camera.position.lerp(desiredCamera, 0.02);
  camera.lookAt(0, 0.6, 0);

  flowers.forEach((flower) => {
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

    pointerOffset.set(pointer.x * 0.45, pointer.y * 0.35, pointer.x * 0.4);
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

    flower.head.rotation.y += flower.headSpin * delta * 60;
    flower.head.rotation.x =
      Math.sin(elapsed * 0.08 + flower.basePhase * 0.6) * THREE.MathUtils.degToRad(2.5);

    updateStem(flower);

    const baseTargetX =
      flower.base.x + Math.sin(elapsed * flower.baseDriftSpeed + flower.basePhase) * 0.06;
    const baseTargetZ =
      flower.base.z + Math.cos(elapsed * (flower.baseDriftSpeed * 0.8) + flower.basePhase) * 0.06;
    const baseTargetY =
      flower.base.y + Math.sin(elapsed * 0.12 + flower.basePhase * 0.5) * 0.04;

    flower.position.x = THREE.MathUtils.lerp(flower.position.x, baseTargetX, 0.02);
    flower.position.y = THREE.MathUtils.lerp(flower.position.y, baseTargetY, 0.025);
    flower.position.z = THREE.MathUtils.lerp(flower.position.z, baseTargetZ, 0.02);

    const rotationTargetY =
      flower.baseRotation + pointer.x * 0.12 * reactionProgress + sway * 0.12;
    flower.rotation.y = THREE.MathUtils.lerp(flower.rotation.y, rotationTargetY, 0.025);

    const rotationTargetX =
      pointer.y * 0.06 * reactionProgress +
      Math.sin(elapsed * 0.12 + flower.swingPhase) * 0.04;
    flower.rotation.x = THREE.MathUtils.lerp(flower.rotation.x, rotationTargetX, 0.03);
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
