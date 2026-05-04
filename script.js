import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- DOM 요소 ---
const canvasContainer = document.getElementById('canvas-container');
const currentShipNameSpan = document.getElementById('current-ship-name');
const viewButtons = document.querySelectorAll('.view-btn');
const colorRedBtn = document.getElementById('color-red');
const colorBlueBtn = document.getElementById('color-blue');
const colorSilverBtn = document.getElementById('color-silver');
const resetViewBtn = document.getElementById('reset-view');
const cartBtn = document.getElementById('cart-btn');

// --- 3D 초기화 ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070f);
scene.fog = new THREE.FogExp2(0x05070f, 0.005);

const camera = new THREE.PerspectiveCamera(45, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 1000);
camera.position.set(3, 2, 5);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
renderer.shadowMap.enabled = true;
renderer.setPixelRatio(window.devicePixelRatio);
canvasContainer.appendChild(renderer.domElement);

// 컨트롤
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.autoRotate = false;
controls.enableZoom = true;
controls.zoomSpeed = 1.2;
controls.rotateSpeed = 1.0;

// 조명
const ambientLight = new THREE.AmbientLight(0x404060);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 1);
mainLight.position.set(2, 5, 3);
mainLight.castShadow = true;
scene.add(mainLight);

const fillLight = new THREE.PointLight(0x88aaff, 0.4);
fillLight.position.set(1, 2, 2);
scene.add(fillLight);

const backLight = new THREE.DirectionalLight(0xffaa88, 0.3);
backLight.position.set(-1, 1, -2);
scene.add(backLight);

// 바닥 그리드
const gridHelper = new THREE.GridHelper(6, 20, 0x88aaff, 0x335588);
gridHelper.position.y = -0.7;
gridHelper.material.transparent = true;
gridHelper.material.opacity = 0.3;
scene.add(gridHelper);

// 별 배경 (간단 입자)
const starGeometry = new THREE.BufferGeometry();
const starCount = 800;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
    starPositions[i*3] = (Math.random() - 0.5) * 200;
    starPositions[i*3+1] = (Math.random() - 0.5) * 100;
    starPositions[i*3+2] = (Math.random() - 0.5) * 80 - 30;
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.07, transparent: true, opacity: 0.7 });
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// --- 모델 로더 및 상태 ---
const loader = new GLTFLoader();
let currentModel = null;

// 모델 경로 (Fab에서 받은 파일명으로 수정)
const models = {
    starlinger: 'models/spaceship1.glb',
    phantomX1: 'models/spaceship2.glb',
    nebulah: 'models/spaceship3.glb',
    chronos: 'models/spaceship4.glb'
};

// 모델 로드 함수
function loadModel(modelKey, shipName) {
    if (currentModel) {
        scene.remove(currentModel);
        currentModel = null;
    }
    
    const path = models[modelKey];
    if (!path) return;
    
    currentShipNameSpan.textContent = shipName;
    
    loader.load(path, (gltf) => {
        currentModel = gltf.scene;
        currentModel.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = false;
            }
        });
        currentModel.position.y = -0.5;
        currentModel.scale.set(0.8, 0.8, 0.8);
        scene.add(currentModel);
    }, undefined, (error) => {
        console.error('모델 로드 실패:', error);
        currentShipNameSpan.textContent = '로드 실패 - 콘솔 확인';
    });
}

// --- 이벤트: 상품 카드의 "3D로 보기" 버튼 ---
viewButtons.forEach((btn, idx) => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.closest('.card');
        const modelKey = card.getAttribute('data-model');
        const shipName = card.querySelector('h3').innerText;
        loadModel(modelKey, shipName);
        
        // 하이라이트 효과 (선택)
        document.querySelectorAll('.card').forEach(c => c.style.borderColor = 'rgba(100,150,200,0.3)');
        card.style.borderColor = '#4c9aff';
    });
});

// 색상 변경 (간단 머티리얼 교체 - 모델 재질이 여러 개라면 더 복잡할 수 있음)
function changeColor(hexColor) {
    if (!currentModel) return;
    currentModel.traverse(child => {
        if (child.isMesh && child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(mat => mat.color.setHex(hexColor));
            } else {
                child.material.color.setHex(hexColor);
            }
        }
    });
}
colorRedBtn.addEventListener('click', () => changeColor(0xcc3333));
colorBlueBtn.addEventListener('click', () => changeColor(0x3366cc));
colorSilverBtn.addEventListener('click', () => changeColor(0xccccdd));

// 뷰 초기화
resetViewBtn.addEventListener('click', () => {
    camera.position.set(3, 2, 5);
    controls.target.set(0, 0, 0);
    controls.update();
});

// 장바구니 데모
cartBtn.addEventListener('click', () => {
    alert('🛒 데모: "' + currentShipNameSpan.textContent + '" 가 장바구니에 추가되었습니다. (실제 결제 없음)');
});

// --- 애니메이션 루프 (별 회전 + 살짝 부유) ---
let time = 0;
function animate() {
    requestAnimationFrame(animate);
    time += 0.005;
    
    if (currentModel) {
        currentModel.position.y = -0.5 + Math.sin(time * 1.2) * 0.03;
    }
    stars.rotation.y += 0.0003;
    stars.rotation.x += 0.0002;
    
    controls.update();
    renderer.render(scene, camera);
}
animate();

// --- 리사이즈 대응 ---
window.addEventListener('resize', onWindowResize);
function onWindowResize() {
    const width = canvasContainer.clientWidth;
    const height = canvasContainer.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

// 초기화 메시지
console.log('Starship Market 준비 완료 | 상품 카드에서 3D 보기를 클릭하세요.');