import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const timeScrubber = document.getElementById('timeScrubber');
const autoPlay = document.getElementById('autoPlay');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510); 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 50, 100);

const textureLoader = new THREE.TextureLoader();

const sunLight = new THREE.PointLight(0xffffff, 3, 1000);
scene.add(sunLight);

const ambientLight = new THREE.AmbientLight(0x222222);
scene.add(ambientLight);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; 

const sunGeometry = new THREE.SphereGeometry(1.5, 32, 32); 
const sunTexture = textureLoader.load('textures/sun.jpg');
const sunMaterial = new THREE.MeshBasicMaterial({ map: sunTexture });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

const starsGeometry = new THREE.BufferGeometry();
const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
const starVertices = [];

for (let i = 0; i < 10000; i++) {
    const x = THREE.MathUtils.randFloatSpread(800);
    const y = THREE.MathUtils.randFloatSpread(800);
    const z = THREE.MathUtils.randFloatSpread(800);
    starVertices.push(x, y, z);
}

starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
const starField = new THREE.Points(starsGeometry, starsMaterial);
scene.add(starField);

const planetColors = {
    'mercury': 0xaaaaaa,
    'venus': 0xffd700,
    'earth': 0x0077ff,
    'mars': 0xff4500,
    'jupiter': 0xffa500,
    'saturn': 0xe8dbb6,
    'neptune': 0x4b70dd 
};

const planets = {};
let totalDays = 0;
let currentDay = 0;

fetch('data.json')
 .then(response => response.json())
 .then(data => {
        for (const planetName in data) {
            const planetPositions = data[planetName];
            const points = []; 
            if (totalDays === 0) totalDays = planetPositions.length;

            planetPositions.forEach(pos => {
                points.push(new THREE.Vector3(pos.x * 5, pos.z * 5, -pos.y * 5));
            });

            const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
            const lineMaterial = new THREE.LineBasicMaterial({ 
                color: planetColors[planetName] || 0xffffff,
                transparent: true,
                opacity: 0.2 
            });
            scene.add(new THREE.Line(lineGeometry, lineMaterial));

            const sphereGeometry = new THREE.SphereGeometry(0.4, 32, 32);
            const planetTexture = textureLoader.load(`textures/${planetName}.jpg`);
            const sphereMaterial = new THREE.MeshStandardMaterial({ 
                map: planetTexture,
                roughness: 0.8,
                metalness: 0.1
            });
            const planetMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
            scene.add(planetMesh);
            if (planetName === 'saturn') {
               const ringGeometry = new THREE.RingGeometry(0.6, 1.4, 64);
               const ringTexture = textureLoader.load('textures/saturn_ring.png');
               const ringMaterial = new THREE.MeshStandardMaterial({ 
                   map: ringTexture,
                   side: THREE.DoubleSide, 
                   transparent: true, 
                   opacity: 0.8 
               });
               const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
               ringMesh.rotation.x = Math.PI / 2 + 0.4; 
               planetMesh.add(ringMesh); 
               }

            planets[planetName] = {
                mesh: planetMesh,
                path: points
            };
        }
    })
 .catch(error => console.error("Error loading orbit data:", error));

let frameCounter = 0;
function animate() {
    requestAnimationFrame(animate);
    controls.update(); 

    if (totalDays > 0) {
            // Handle Auto-Play vs Manual Scrubbing
            if (autoPlay.checked) {
                frameCounter++;
                if (frameCounter % 3 === 0) { 
                    currentDay = (currentDay + 1) % totalDays; 
                    timeScrubber.value = currentDay; // Keep UI synced
                }
            } else {
                // Read directly from the manual slider
                currentDay = parseInt(timeScrubber.value);
            }
    
            // Only update the meshes and date if we are actually on a valid frame update
            if (autoPlay.checked === false || frameCounter % 3 === 0) {
                const startDate = new Date('2026-01-01T00:00:00Z');
                startDate.setUTCDate(startDate.getUTCDate() + currentDay);
                document.getElementById('dateDisplay').innerText = `Date: ${startDate.toDateString()}`;
    
                for (const name in planets) {
                    const planetData = planets[name];
                    const pos = planetData.path[currentDay]; 
                    
                    if (pos) {
                        planetData.mesh.position.copy(pos);
                    }
                }
            }
        }

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
