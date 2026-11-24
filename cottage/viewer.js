import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const page = {
    canvas: document.querySelector('#model'),
    photo: document.querySelector('#still'),
    status: document.querySelector('#status'),
    label: document.querySelector('#scene-label'),
    help: document.querySelector('#help'),
    movement: document.querySelector('#movement'),
    modelButton: document.querySelector('#show-model'),
    stillButton: document.querySelector('#show-still'),
    views: [...document.querySelectorAll('[data-view]')],
};
const views = {
    living: { label: 'Гостиная', photo: 'living.webp', eye: [5.18, 1.42, -17.12], aim: [2.62, .94, -14.53], horizontal: 72 },
    dining: { label: 'Столовая', photo: 'dining.webp', eye: [5.45, 1.41, -13.38], aim: [2.39, 1.02, -11.78], horizontal: 72 },
    exterior: { label: 'Фасад и участок', eye: [-10.9, 7.4, 25.7], aim: [6.4, .54, -4.2], horizontal: 59 },
    plan: { label: 'Планировка', eye: [6.55, 27.5, -10.65], aim: [6.55, 0, -10.83], horizontal: 59 },
};
let mode = 'living';
let media = 'model';
let loadState = 'loading';
let engine;

function refresh() {
    const view = views[mode];
    const ready = loadState === 'ready';
    const modelVisible = ready && media === 'model';
    page.canvas.hidden = !modelVisible;
    page.photo.hidden = modelVisible || !view.photo;
    if (view.photo && page.photo.getAttribute('src') !== './' + view.photo) {
        page.photo.src = './' + view.photo;
        page.photo.alt = `${view.label} коттеджа в Unreal Engine 5`;
    }
    page.label.textContent = view.label;
    page.movement.hidden = !modelVisible || !view.photo;
    page.modelButton.disabled = loadState === 'error';
    page.stillButton.disabled = !view.photo;
    page.modelButton.setAttribute('aria-pressed', String(media === 'model'));
    page.stillButton.setAttribute('aria-pressed', String(media === 'still'));
    for (const button of page.views) {
        button.disabled = loadState === 'error' && !views[button.dataset.view].photo;
        button.setAttribute('aria-pressed', String(button.dataset.view === mode));
    }
    page.status.hidden = ready || (media === 'still' && loadState !== 'error');
    if (!ready) {
        page.status.textContent = loadState === 'error'
            ? '3D не загрузилось. Доступны кадры гостиной и столовой.'
            : 'Загружается 3D-модель…';
    }
    page.help.textContent = media === 'still'
        ? 'Кадр из Unreal Engine 5.'
        : view.photo
            ? 'Потяни изображение для обзора. Перемещение — WASD или кнопки на кадре.'
            : 'Потяни модель для вращения. Колесо мыши или жест двумя пальцами меняют масштаб.';
    document.body.dataset.view = mode;
    document.body.dataset.media = media;
    document.body.dataset.state = loadState;
    if (modelVisible) engine.resize();
}

function setView(name) {
    mode = name;
    if (!views[mode].photo) media = 'model';
    refresh();
    engine?.aim();
}

page.views.forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
page.modelButton.addEventListener('click', () => { media = 'model'; refresh(); });
page.stillButton.addEventListener('click', () => { media = 'still'; refresh(); });
refresh();

async function build() {
    const { canvas } = page;
    const touch = matchMedia('(pointer: coarse)').matches;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, touch ? 1.25 : 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd8e1de);
    scene.fog = new THREE.Fog(0xd8e1de, 34, 105);
    const env = new RoomEnvironment();
    const generator = new THREE.PMREMGenerator(renderer);
    scene.environment = generator.fromScene(env, .08).texture;
    scene.environmentIntensity = .47;
    generator.dispose();
    env.dispose();
    scene.add(new THREE.HemisphereLight(0xfffaf1, 0x98856f, .93));
    const sun = new THREE.DirectionalLight(0xffe2b9, 2.30);
    sun.position.set(-14, 17, -5);
    sun.target.position.set(5, 0, -10);
    sun.castShadow = true;
    Object.assign(sun.shadow.camera, { left: -22, right: 22, bottom: -22, top: 22, near: 1, far: 67 });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.mapSize.setScalar(touch ? 1024 : 2048);
    sun.shadow.normalBias = .018;
    sun.shadow.bias = -.00015;
    scene.add(sun, sun.target);
    for (const [position, power, color] of [
        [[2.74, 1.92, -14.42], 6, 0xffe9cb],
        [[2.55, 1.77, -11.83], 4, 0xffebd1],
        [[2.77, 1.91, -9.4], 7, 0xffdeb9],
    ]) {
        const lamp = new THREE.PointLight(color, power, 7, 2);
        lamp.position.fromArray(position);
        scene.add(lamp);
    }
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(180, 180),
        new THREE.MeshStandardMaterial({ color: 0x6d7355, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(4, -.81, -10);
    floor.receiveShadow = true;
    scene.add(floor);

    const decoder = new DRACOLoader();
    decoder.setDecoderPath(new URL('./vendor/draco/', import.meta.url).href);
    decoder.setWorkerLimit(2);
    const loader = new GLTFLoader().setDRACOLoader(decoder);
    const model = (await loader.loadAsync('./house.glb')).scene;
    scene.add(model);
    const roof = model.getObjectByName('Roof');
    const solids = [];
    model.traverse(mesh => {
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const material = mesh.material;
        if (material.name.toLowerCase().includes('остекление')) {
            material.transmission = 0;
            material.roughness = .12;
            material.metalness = .10;
            material.transparent = true;
            material.opacity = .21;
            material.depthWrite = false;
            material.color.set(0x9eb3b4);
            mesh.castShadow = false;
        } else {
            solids.push(mesh);
        }
    });
    const camera = new THREE.PerspectiveCamera(50, 1, .055, 170);
    camera.rotation.order = 'YXZ';
    const orbit = new OrbitControls(camera, canvas);
    orbit.minDistance = 3;
    orbit.maxDistance = 90;
    orbit.maxPolarAngle = Math.PI * .51;
    orbit.enableDamping = false;
    let frame = 0;
    function draw() {
        if (frame || canvas.hidden) return;
        frame = requestAnimationFrame(() => {
            frame = 0;
            renderer.render(scene, camera);
        });
    }
    orbit.addEventListener('change', draw);
    const responsive = new ResizeObserver(() => { if (!canvas.hidden) resize(); });
    responsive.observe(canvas.parentElement);

    function resize() {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        const hfov = THREE.MathUtils.degToRad(views[mode].horizontal);
        camera.fov = Math.min(92, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hfov / 2) / camera.aspect)));
        camera.updateProjectionMatrix();
        draw();
    }
    function aim() {
        const view = views[mode];
        camera.position.fromArray(view.eye);
        const target = new THREE.Vector3(...view.aim);
        orbit.target.copy(target);
        orbit.enabled = !view.photo;
        if (orbit.enabled) {
            if (canvas.clientWidth / canvas.clientHeight < 1.25) {
                camera.position.sub(target).multiplyScalar(mode === 'plan' ? 1.13 : 1.22).add(target);
            }
            orbit.update();
        } else {
            camera.lookAt(target);
        }
        if (roof) roof.visible = mode !== 'plan';
        renderer.shadowMap.needsUpdate = true;
        resize();
    }

    const collision = new THREE.Raycaster();
    function move(forward, right) {
        if (!views[mode].photo || media !== 'model' || loadState !== 'ready') return;
        const direction = camera.getWorldDirection(new THREE.Vector3());
        direction.y = 0;
        direction.normalize();
        const delta = direction.clone().multiplyScalar(forward)
            .addScaledVector(new THREE.Vector3(-direction.z, 0, direction.x), right).normalize();
        const step = .18;
        const next = camera.position.clone().addScaledVector(delta, step);
        if (next.x < .34 || next.x > 5.78 || next.z < -17.35 || next.z > -8.30) return;
        collision.near = .013;
        collision.far = step + .13;
        for (const y of [.54, 1.09]) {
            collision.set(new THREE.Vector3(camera.position.x, y, camera.position.z), delta);
            if (collision.intersectObjects(solids, false).length) return;
        }
        camera.position.copy(next);
        draw();
    }
    const steps = {
        KeyW: [1, 0], ArrowUp: [1, 0], KeyS: [-1, 0], ArrowDown: [-1, 0],
        KeyA: [0, -1], ArrowLeft: [0, -1], KeyD: [0, 1], ArrowRight: [0, 1],
    };
    document.addEventListener('keydown', event => {
        if (!steps[event.code] || event.altKey || event.ctrlKey || !views[mode].photo || canvas.hidden) return;
        if (event.code.startsWith('Arrow') && document.activeElement !== canvas) return;
        event.preventDefault();
        move(...steps[event.code]);
    });
    document.querySelectorAll('[data-move]').forEach(button => {
        button.addEventListener('click', () => move(...button.dataset.move.split(',').map(Number)));
    });
    let pointer;
    canvas.addEventListener('pointerdown', event => {
        if (!views[mode].photo) return;
        canvas.focus({ preventScroll: true });
        pointer = [event.pointerId, event.clientX, event.clientY];
        canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
        if (!pointer || pointer[0] !== event.pointerId) return;
        camera.rotation.y -= (event.clientX - pointer[1]) * .0039;
        camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x - (event.clientY - pointer[2]) * .0038, -1.22, 1.22);
        pointer = [event.pointerId, event.clientX, event.clientY];
        draw();
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        canvas.addEventListener(name, event => { if (event.pointerId === pointer?.[0]) pointer = null; });
    }
    canvas.addEventListener('webglcontextlost', event => {
        event.preventDefault();
        fallback();
    });
    // The main model is interactive as soon as the house has loaded.
    loader.loadAsync('./grounds.glb').then(({ scene: grounds }) => {
        grounds.traverse(mesh => {
            if (!mesh.isMesh) return;
            mesh.receiveShadow = true;
            mesh.castShadow = !/meadow|ground|hill/i.test(mesh.name);
        });
        scene.add(grounds);
        renderer.shadowMap.needsUpdate = true;
        draw();
        document.body.dataset.grounds = 'ready';
    }).catch(error => {
        document.body.dataset.grounds = 'error';
        console.error('Could not load the grounds:', error);
    }).finally(() => decoder.dispose());
    return { resize, aim };
}

function fallback() {
    loadState = 'error';
    if (!views[mode].photo) mode = 'living';
    media = 'still';
    refresh();
}

build().then(result => {
    engine = result;
    loadState = 'ready';
    refresh();
    engine.aim();
}).catch(error => {
    console.error('Could not initialise the cottage viewer:', error);
    fallback();
});
