import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface Avatar3DController {
  container: HTMLElement;
  setHeading: (headingDeg: number) => void;
  destroy: () => void;
}

export function createAvatar3D(
  modelUrl: string = '/models/explorer.glb',
  width: number = 76,
  height: number = 96
): Avatar3DController {
  const container = document.createElement('div');
  container.className = 'relative flex flex-col items-center justify-center select-none pointer-events-none';
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;

  // Anillos de radar en la base del personaje
  const radarEl = document.createElement('div');
  radarEl.className = 'absolute bottom-1 w-14 h-14 rounded-full bg-sky-400/25 radar-wave';
  container.appendChild(radarEl);

  // Sombra proyectada en el suelo
  const shadowEl = document.createElement('div');
  shadowEl.className = 'absolute bottom-2 w-8 h-3 rounded-full bg-slate-950/60 blur-[2px]';
  container.appendChild(shadowEl);

  // Canvas WebGL para Three.js
  const canvas = document.createElement('canvas');
  canvas.width = width * 2;
  canvas.height = height * 2;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.className = 'relative z-10';
  container.appendChild(canvas);

  // Configuracion Three.js
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
  camera.position.set(0, 1.3, 3.2);
  camera.lookAt(0, 0.85, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true
  });
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  // Iluminacion de alta definicion
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.8);
  dirLight.position.set(2, 4, 3);
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
  fillLight.position.set(-2, 1, -2);
  scene.add(fillLight);

  let mixer: THREE.AnimationMixer | null = null;
  let characterMesh: THREE.Object3D | null = null;
  let currentHeading = 0;
  let isDestroyed = false;

  // Funcion auxiliar: avatar procedimental de respaldo (explorador con sombrero y mochila)
  function createProceduralExplorer(): THREE.Group {
    const group = new THREE.Group();

    // Torso (chamarra azul/slate)
    const bodyGeo = new THREE.CylinderGeometry(0.2, 0.16, 0.5, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.8;
    group.add(body);

    // Cabeza
    const headGeo = new THREE.SphereGeometry(0.16, 12, 12);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.6 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.18;
    group.add(head);

    // Sombrero de explorador
    const hatBrimGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.03, 12);
    const hatMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7 });
    const hatBrim = new THREE.Mesh(hatBrimGeo, hatMat);
    hatBrim.position.y = 1.25;
    group.add(hatBrim);

    const hatTopGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.14, 12);
    const hatTop = new THREE.Mesh(hatTopGeo, hatMat);
    hatTop.position.y = 1.33;
    group.add(hatTop);

    // Mochila de viaje
    const packGeo = new THREE.BoxGeometry(0.24, 0.32, 0.14);
    const packMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });
    const pack = new THREE.Mesh(packGeo, packMat);
    pack.position.set(0, 0.82, -0.15);
    group.add(pack);

    // Piernas
    const legGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.45, 6);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.09, 0.35, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.09, 0.35, 0);
    group.add(rightLeg);

    return group;
  }

  // Carga del modelo GLB con fallback automatico
  const loader = new GLTFLoader();
  loader.load(
    modelUrl,
    (gltf) => {
      if (isDestroyed) return;
      const model = gltf.scene;

      // Centrar y escalar el modelo adecuadamente
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 1.6 / (maxDim || 1);
      model.scale.set(scale, scale, scale);

      // Alinear base con el suelo
      box.setFromObject(model);
      model.position.y = -box.min.y;

      characterMesh = model;
      scene.add(model);

      // Reproducir animacion de caminata
      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        const action = mixer.clipAction(gltf.animations[0]);
        action.play();
      }
    },
    undefined,
    () => {
      if (isDestroyed) return;
      // Fallback inmediato a explorador procedimental en 3D
      const fallback = createProceduralExplorer();
      characterMesh = fallback;
      scene.add(fallback);
    }
  );

  // Ciclo de animacion WebGL a 60 FPS
  const clock = new THREE.Clock();
  let animId: number;

  const animate = () => {
    if (isDestroyed) return;
    animId = requestAnimationFrame(animate);

    const delta = clock.getDelta();
    if (mixer) {
      mixer.update(delta);
    } else if (characterMesh) {
      // Balanceo sutil de espera (idle) si es procedimental
      characterMesh.position.y = Math.sin(clock.getElapsedTime() * 2.5) * 0.02;
    }

    if (characterMesh) {
      // Suavizado de rotacion hacia el rumbo actual
      const targetRad = (currentHeading * Math.PI) / 180;
      characterMesh.rotation.y = targetRad;
    }

    renderer.render(scene, camera);
  };

  animate();

  return {
    container,
    setHeading: (deg: number) => {
      currentHeading = deg;
    },
    destroy: () => {
      isDestroyed = true;
      cancelAnimationFrame(animId);
      renderer.dispose();
    }
  };
}
