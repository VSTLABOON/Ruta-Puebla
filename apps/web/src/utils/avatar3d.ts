import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface Avatar3DController {
  container: HTMLElement;
  setHeading: (headingDeg: number) => void;
  destroy: () => void;
}

export function createAvatar3D(
  modelUrl: string = '/models/base.fbx',
  width: number = 48,
  height: number = 62
): Avatar3DController {
  const container = document.createElement('div');
  container.className = 'relative flex flex-col items-center justify-center select-none pointer-events-none';
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;

  // Anillos de radar con paleta Talavera (Oro / Amarillo Talavera #EDE28E)
  const radarEl = document.createElement('div');
  radarEl.className = 'absolute bottom-0 w-8 h-8 rounded-full bg-[#EDE28E]/30 radar-wave';
  container.appendChild(radarEl);

  // Sombra proyectada en el suelo (Azul Cobalto Profundo #07154E)
  const shadowEl = document.createElement('div');
  shadowEl.className = 'absolute bottom-1 w-6 h-2 rounded-full bg-[#07154E]/70 blur-[1px]';
  container.appendChild(shadowEl);

  // Canvas WebGL para Three.js
  const canvas = document.createElement('canvas');
  canvas.width = width * 2;
  canvas.height = height * 2;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.className = 'relative z-10';
  container.appendChild(canvas);

  // Configuración Three.js
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
  camera.position.set(0, 1.1, 3.2);
  camera.lookAt(0, 0.65, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true
  });
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  // Iluminación estilo cerámica Talavera (luz cálida y reflejos cobalto)
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xfff8db, 2.0); // Oro cálido
  dirLight.position.set(2, 4, 3);
  scene.add(dirLight);

  const rimLight = new THREE.DirectionalLight(0x2544a7, 0.9); // Reflejo Cobalto Talavera
  rimLight.position.set(-2, 1, -2);
  scene.add(rimLight);

  let mixer: THREE.AnimationMixer | null = null;
  let characterMesh: THREE.Object3D | null = null;
  let currentHeading = 0;
  let isDestroyed = false;

  // Avatar Gatito Talavera en 3D
  function createProceduralGatito(): THREE.Group {
    const group = new THREE.Group();

    // Materiales con identidad Talavera Poblana
    const cobaltoMat = new THREE.MeshStandardMaterial({
      color: 0x0e2c9c, // Azul Cobalto Talavera
      roughness: 0.35,
      metalness: 0.1
    });

    const cremaMat = new THREE.MeshStandardMaterial({
      color: 0xeff1f8, // Crema / Blanco Marfil Talavera
      roughness: 0.4
    });

    const oroMat = new THREE.MeshStandardMaterial({
      color: 0xede28e, // Oro / Amarillo Talavera
      roughness: 0.3
    });

    // Cuerpo del Gatito (forma suave)
    const bodyGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.48, 10);
    const body = new THREE.Mesh(bodyGeo, cobaltoMat);
    body.position.y = 0.5;
    group.add(body);

    // Pecho blanco crema
    const chestGeo = new THREE.SphereGeometry(0.14, 8, 8);
    const chest = new THREE.Mesh(chestGeo, cremaMat);
    chest.position.set(0, 0.52, 0.11);
    chest.scale.set(1, 1.4, 0.6);
    group.add(chest);

    // Cabeza del Gatito
    const headGeo = new THREE.SphereGeometry(0.2, 12, 12);
    const head = new THREE.Mesh(headGeo, cobaltoMat);
    head.position.y = 0.84;
    group.add(head);

    // Orejas de Gatito (izquierda y derecha)
    const earGeo = new THREE.ConeGeometry(0.08, 0.14, 4);

    const leftEar = new THREE.Mesh(earGeo, oroMat);
    leftEar.position.set(-0.11, 1.02, 0.02);
    leftEar.rotation.z = 0.2;
    leftEar.rotation.y = -0.2;
    group.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, oroMat);
    rightEar.position.set(0.11, 1.02, 0.02);
    rightEar.rotation.z = -0.2;
    rightEar.rotation.y = 0.2;
    group.add(rightEar);

    // Hocico crema
    const muzzleGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const muzzle = new THREE.Mesh(muzzleGeo, cremaMat);
    muzzle.position.set(0, 0.8, 0.16);
    muzzle.scale.set(1.2, 0.8, 0.8);
    group.add(muzzle);

    // Nariz dorada
    const noseGeo = new THREE.ConeGeometry(0.025, 0.03, 3);
    const nose = new THREE.Mesh(noseGeo, oroMat);
    nose.position.set(0, 0.82, 0.23);
    nose.rotation.x = Math.PI;
    group.add(nose);

    // Ojos Talavera
    const eyeGeo = new THREE.SphereGeometry(0.03, 6, 6);
    const leftEye = new THREE.Mesh(eyeGeo, oroMat);
    leftEye.position.set(-0.07, 0.87, 0.17);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, oroMat);
    rightEye.position.set(0.07, 0.87, 0.17);
    group.add(rightEye);

    // Cola curvada
    const tailCurve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(0, 0.3, -0.18),
      new THREE.Vector3(0, 0.45, -0.32),
      new THREE.Vector3(0.08, 0.65, -0.28),
      new THREE.Vector3(0.12, 0.78, -0.18)
    );
    const tailGeo = new THREE.TubeGeometry(tailCurve, 12, 0.035, 6, false);
    const tail = new THREE.Mesh(tailGeo, cobaltoMat);
    group.add(tail);

    // Patitas delanteras
    const pawGeo = new THREE.SphereGeometry(0.055, 6, 6);
    const leftPaw = new THREE.Mesh(pawGeo, cremaMat);
    leftPaw.position.set(-0.09, 0.27, 0.12);
    group.add(leftPaw);

    const rightPaw = new THREE.Mesh(pawGeo, cremaMat);
    rightPaw.position.set(0.09, 0.27, 0.12);
    group.add(rightPaw);

    return group;
  }

  // Carga del modelo 3D (FBX o GLB)
  const isFbx = modelUrl.toLowerCase().endsWith('.fbx');

  const onModelLoaded = (model: THREE.Object3D, animations?: THREE.AnimationClip[]) => {
    if (isDestroyed) return;

    // Centrar y escalar automáticamente
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 1.05 / (maxDim || 1);
    model.scale.set(scale, scale, scale);

    // Alinear con el suelo
    box.setFromObject(model);
    model.position.y = -box.min.y;

    // Ajustar materiales para brillo vidriado tipo Talavera
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => {
            if (m instanceof THREE.MeshStandardMaterial) {
              m.roughness = 0.35;
              m.metalness = 0.15;
            }
          });
        }
      }
    });

    characterMesh = model;
    scene.add(model);

    if (animations && animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(animations[0]);
      action.play();
    }
  };

  const onModelError = (err: any) => {
    console.warn('Error cargando modelo 3D, usando Gatito Talavera:', err);
    if (isDestroyed) return;
    const fallback = createProceduralGatito();
    characterMesh = fallback;
    scene.add(fallback);
  };

  if (isFbx) {
    const fbxLoader = new FBXLoader();
    fbxLoader.load(
      modelUrl,
      (fbx) => onModelLoaded(fbx, fbx.animations),
      undefined,
      onModelError
    );
  } else {
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      modelUrl,
      (gltf) => onModelLoaded(gltf.scene, gltf.animations),
      undefined,
      onModelError
    );
  }

  // Ciclo de animación WebGL a 60 FPS
  const clock = new THREE.Clock();
  let animId: number;

  const animate = () => {
    if (isDestroyed) return;
    animId = requestAnimationFrame(animate);

    const delta = clock.getDelta();
    if (mixer) {
      mixer.update(delta);
    } else if (characterMesh) {
      // Balanceo sutil idle
      characterMesh.position.y = Math.sin(clock.getElapsedTime() * 2.8) * 0.02;
    }

    if (characterMesh) {
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
