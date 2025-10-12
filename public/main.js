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

const palette = [
  new THREE.Color('#74f6c7'),
  new THREE.Color('#a88fff'),
  new THREE.Color('#ffc1f2'),
  new THREE.Color('#7fe7ff'),
  new THREE.Color('#ffd57b')
];

const coreMaterial = new THREE.MeshLambertMaterial({
  color: '#ffe59f',
  emissive: '#f3c56b',
  flatShading: true
});

const stemMaterial = new THREE.MeshLambertMaterial({
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
    emissive: baseColor.clone().multiplyScalar(0.2),
    flatShading: true,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide
  });
}

function createFlower() {
  const root = new THREE.Group();

  const head = new THREE.Group();

  const petalCount = 6 + Math.floor(Math.random() * 4);
  const baseColor = palette[Math.floor(Math.random() * palette.length)];
  const petalMaterial = createPetalMaterial(baseColor);

  const headScale = 0.5;
  const petalGeometry = new THREE.CircleGeometry(0.45 * headScale, 6);
  petalGeometry.scale(0.65, 1, 1);
  petalGeometry.translate(0, 0, 0.01);

  for (let i = 0; i < petalCount; i++) {
    const petal = new THREE.Mesh(petalGeometry, petalMaterial);
    const angle = (i / petalCount) * Math.PI * 2;
    const radius = 0.5 * headScale;
    petal.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    petal.lookAt(0, 0.4, 0);
    petal.rotateX(THREE.MathUtils.degToRad(12));
    head.add(petal);
  }

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), coreMaterial);
  core.position.y = 0.05;
  head.add(core);

  const stem = new THREE.Mesh(sharedStemGeometry, stemMaterial);
  root.add(stem);
  root.add(head);

  const fullHeight = 1.3 + Math.random() * 1.5;
  const minHeight = 0.35 + Math.random() * 0.25;

  head.position.y = minHeight;

  root.head = head;
  root.stem = stem;
  root.fullHeight = fullHeight;
  root.minHeight = minHeight;
  root.headBase = new THREE.Vector3(0, minHeight, 0);
  root.headTarget = root.headBase.clone();
  root.headCurrent = root.headBase.clone();

  root.pointerInfluence = 0.9 + Math.random() * 1.1;
  root.swayAmount = 0.3 + Math.random() * 0.35;
  root.bobAmount = 0.18 + Math.random() * 0.22;
  root.swingSpeed = 0.6 + Math.random() * 0.5;
  root.bobSpeed = 0.9 + Math.random() * 0.6;
  root.baseDriftSpeed = 0.18 + Math.random() * 0.12;
  root.headSpin = 0.001 + Math.random() * 0.0025;
  root.followDelay = 1.5 + Math.random() * 3.5;
  root.rampDuration = 6 + Math.random() * 6;
  root.reactionDelay = 0.6 + Math.random() * 2.4;
  root.reactionDuration = 4 + Math.random() * 4;
  root.minFollowLerp = 0.01 + Math.random() * 0.02;
  root.maxFollowLerp = 0.05 + Math.random() * 0.06;
  root.swingPhase = Math.random() * Math.PI * 2;
  root.basePhase = Math.random() * Math.PI * 2;
  root.followProgress = 0;

  const initialThickness = THREE.MathUtils.lerp(0.85, 1.05, root.followProgress);
  stem.scale.set(initialThickness, root.headCurrent.length(), initialThickness);

  return root;
}

for (let i = 0; i < flowerCount; i++) {
  const flower = createFlower();
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

    const sway = Math.sin(elapsed * flower.swingSpeed + flower.swingPhase) * flower.swayAmount;
    const swayZ =
      Math.cos(elapsed * (flower.swingSpeed * 0.75) + flower.basePhase) * flower.swayAmount * 0.7;
    const bob = Math.sin(elapsed * flower.bobSpeed + flower.swingPhase) * flower.bobAmount;

    pointerOffset.set(pointer.x * 1.4, pointer.y * 1.1, pointer.x * 1.2);
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

    flower.head.rotation.y += flower.headSpin;
    flower.head.rotation.x = Math.sin(elapsed * 0.18 + flower.basePhase) * THREE.MathUtils.degToRad(6);

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

    const rotationTargetY =
      flower.baseRotation + pointer.x * 0.3 * reactionProgress + sway * 0.1;
    flower.rotation.y = THREE.MathUtils.lerp(flower.rotation.y, rotationTargetY, 0.04);

    const rotationTargetX =
      pointer.y * 0.12 * reactionProgress +
      Math.sin(elapsed * 0.25 + flower.swingPhase) * 0.08;
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
