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
  const group = new THREE.Group();

  const petalCount = 6 + Math.floor(Math.random() * 4);
  const baseColor = palette[Math.floor(Math.random() * palette.length)];
  const petalMaterial = createPetalMaterial(baseColor);

  const petalGeometry = new THREE.CircleGeometry(0.45, 6);
  petalGeometry.scale(0.65, 1, 1);
  petalGeometry.translate(0, 0, 0.01);

  for (let i = 0; i < petalCount; i++) {
    const petal = new THREE.Mesh(petalGeometry, petalMaterial);
    const angle = (i / petalCount) * Math.PI * 2;
    const radius = 0.5;
    petal.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    petal.lookAt(0, 0.4, 0);
    petal.rotateX(THREE.MathUtils.degToRad(12));
    group.add(petal);
  }

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), coreMaterial);
  core.position.y = 0.05;
  group.add(core);

  const stemMaterial = new THREE.MeshLambertMaterial({
    color: '#3c9d7a',
    emissive: '#1d5f49',
    flatShading: true
  });
  const stemGeometry = new THREE.CylinderGeometry(0.04, 0.045, 1.4, 6);
  stemGeometry.translate(0, -0.7, 0);
  const stem = new THREE.Mesh(stemGeometry, stemMaterial);
  stem.position.y = -0.9;
  group.add(stem);

  return group;
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
  flower.rotation.y = Math.random() * Math.PI * 2;
  flower.baseYaw = flower.rotation.y;
  flower.spinAngle = 0;
  flower.base = flower.position.clone();
  flower.offset = Math.random() * Math.PI * 2;
  flower.speed = 0.3 + Math.random() * 0.7;
  flower.driftAmplitude = new THREE.Vector3(
    0.25 + Math.random() * 0.45,
    0.18 + Math.random() * 0.35,
    0.25 + Math.random() * 0.45
  );
  flowers.push(flower);
  scene.add(flower);
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

function handlePointer(event) {
  const x = event.clientX ?? (event.touches && event.touches[0]?.clientX) ?? 0;
  const y = event.clientY ?? (event.touches && event.touches[0]?.clientY) ?? 0;
  pointer.x = (x / window.innerWidth) * 2 - 1;
  pointer.y = -((y / window.innerHeight) * 2 - 1);
}

window.addEventListener('pointermove', handlePointer, { passive: true });
window.addEventListener('touchmove', handlePointer, { passive: true });

const clock = new THREE.Clock();
const pointerTarget = new THREE.Vector3();
const lookUp = new THREE.Vector3(0, 1, 0);
const tiltDirection = new THREE.Vector3();
const origin = new THREE.Vector3();
const tempMatrix = new THREE.Matrix4();
const desiredQuaternion = new THREE.Quaternion();
const baseQuaternion = new THREE.Quaternion();
const tempQuaternion = new THREE.Quaternion();

function animate() {
  const elapsed = clock.getElapsedTime();

  targetRotation.set(pointer.y * 0.1, pointer.x * 0.25, 0);
  scene.rotation.x = THREE.MathUtils.lerp(scene.rotation.x, targetRotation.x, 0.02);
  scene.rotation.y = THREE.MathUtils.lerp(scene.rotation.y, targetRotation.y, 0.03);

  const desiredCamera = new THREE.Vector3(pointer.x * 0.6, 2.3 + pointer.y * 0.5, 8.5);
  camera.position.lerp(desiredCamera, 0.02);
  camera.lookAt(0, 0.6, 0);

  pointerTarget.set(pointer.x * 4.5, 0.8 + pointer.y * 3.2, 0.2);

  flowers.forEach((flower) => {
    const wobble = Math.sin(elapsed * flower.speed + flower.offset) * 0.35;
    const sway = Math.cos(elapsed * 0.6 + flower.offset) * 0.25;
    const driftX = Math.sin(elapsed * (flower.speed * 0.4 + 0.25) + flower.offset * 0.7) * flower.driftAmplitude.x;
    const driftY = Math.sin(elapsed * (flower.speed * 0.5 + 0.35) + flower.offset) * flower.driftAmplitude.y;
    const driftZ = Math.cos(elapsed * (flower.speed * 0.4 + 0.25) + flower.offset * 0.9) * flower.driftAmplitude.z;

    flower.position.x = THREE.MathUtils.lerp(
      flower.position.x,
      flower.base.x + pointer.x * 1.5 + sway + driftX,
      0.015 + flower.speed * 0.01
    );
    flower.position.y = THREE.MathUtils.lerp(
      flower.position.y,
      flower.base.y + wobble * 0.4 + pointer.y * 0.8 + driftY,
      0.02 + flower.speed * 0.02
    );
    flower.position.z = THREE.MathUtils.lerp(
      flower.position.z,
      flower.base.z + pointer.x * 0.9 + Math.sin(elapsed * 0.3 + flower.offset) * 0.5 + driftZ,
      0.015 + flower.speed * 0.01
    );

    tiltDirection.copy(pointerTarget).sub(flower.position);
    const tiltLength = tiltDirection.length();
    if (tiltLength > 0.0001) {
      tiltDirection.normalize();
      baseQuaternion.setFromAxisAngle(lookUp, flower.baseYaw + flower.spinAngle);
      tempMatrix.lookAt(origin, tiltDirection, lookUp);
      desiredQuaternion.setFromRotationMatrix(tempMatrix);
      tempQuaternion.copy(baseQuaternion).slerp(desiredQuaternion, 0.35);
      flower.quaternion.slerp(tempQuaternion, 0.05 + flower.speed * 0.015);
    }

    const slowSpin = 0.0025 + flower.speed * 0.001;
    flower.spinAngle += slowSpin;
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
