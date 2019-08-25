import './main.css'
import { Scene, PerspectiveCamera, WebGLRenderer, AmbientLight, Mesh, PlaneBufferGeometry, MeshBasicMaterial, DirectionalLight, Math as ThreeMath, DoubleSide, SpotLight, Object3D } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

const scene = new Scene()
const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(10, 5, 0)

const renderer = new WebGLRenderer({
  antialias: true,
  alpha: true
})
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

window.onresize = _ => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
}

const controls = new OrbitControls(camera, renderer.domElement)

const ambientLight = new AmbientLight(-1, 2)
scene.add(ambientLight)

const loader = new GLTFLoader()
let saucer: Object3D
loader.load(
  require('../assets/flying_saucer.glb'),
  gltf => {
    saucer = gltf.scene.children[0]
    saucer.scale.setScalar(0.02)
    scene.add(saucer)

    requestAnimationFrame(animate)
    console.log('Loaded flying saucer')
  },
  undefined,
  err => console.error('Failed to load flying saucer model', err)
)

function animate(time: number) {
  requestAnimationFrame(animate)
  saucer.rotation.y = time / 5000
  saucer.position.setY(2 + Math.cos(time / 1000))
  controls.update()
  renderer.render(scene, camera)
}
