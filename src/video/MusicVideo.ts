import * as THREE from "three"
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js"
import { RenderPass } from "three/addons/postprocessing/RenderPass.js"
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js"
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js"
import { OutputPass } from "three/addons/postprocessing/OutputPass.js"
import envelope from "./envelope.json"
import {
  createDrumKit,
  createGrid,
  createGuitar,
  createMicrophone,
  createMicrowave,
  createRefrigerator,
  createTelevision,
  createTextPanel,
  createWorker,
  material,
  palette,
} from "./models"

type SceneKind = "title" | "warehouse" | "stage" | "kitchen" | "televisions"

type Chapter = {
  start: number
  end: number
  kind: SceneKind
  title: string
}

export const chapters: Chapter[] = [
  { start: 0, end: 9, kind: "title", title: "Money for Nothing" },
  { start: 9, end: 25, kind: "warehouse", title: "The appliance movers" },
  { start: 25, end: 41, kind: "warehouse", title: "Heavy lifting" },
  { start: 41, end: 58, kind: "stage", title: "Neon television" },
  { start: 58, end: 73, kind: "warehouse", title: "Custom kitchen deliveries" },
  { start: 73, end: 89, kind: "stage", title: "Guitar heroes" },
  { start: 89, end: 105, kind: "kitchen", title: "Modern conveniences" },
  { start: 105, end: 121, kind: "televisions", title: "On every screen" },
  { start: 121, end: 139, kind: "warehouse", title: "Another day at work" },
  { start: 139, end: 157, kind: "stage", title: "Money for nothing" },
  { start: 157, end: 174, kind: "kitchen", title: "The dream kitchen" },
  { start: 174, end: 190, kind: "televisions", title: "Channel surfing" },
  { start: 190, end: 207, kind: "warehouse", title: "Keep it moving" },
  { start: 207, end: 225, kind: "stage", title: "Turn it up" },
  { start: 225, end: 241, kind: "warehouse", title: "Last delivery" },
  { start: 241, end: 256, kind: "televisions", title: "Wall of sound" },
  { start: 256, end: 270, kind: "stage", title: "Final transmission" },
  { start: 270, end: 279.1, kind: "title", title: "Money for Nothing" },
]

const crtShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    energy: { value: 0 },
    resolution: { value: new THREE.Vector2(1280, 720) },
    reducedMotion: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float energy;
    uniform vec2 resolution;
    uniform float reducedMotion;
    varying vec2 vUv;

    float random(vec2 point) {
      return fract(sin(dot(point, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 centered = vUv - 0.5;
      vec2 uv = vUv + centered * dot(centered, centered) * 0.075;
      float split = (0.00055 + energy * 0.0007) * (1.0 - reducedMotion);
      float red = texture2D(tDiffuse, uv + vec2(split, 0.0)).r;
      float green = texture2D(tDiffuse, uv).g;
      float blue = texture2D(tDiffuse, uv - vec2(split, 0.0)).b;
      vec3 color = vec3(red, green, blue);
      float scanline = sin(uv.y * resolution.y * 1.55) * 0.026;
      float grain = (random(uv + fract(time) * 0.01) - 0.5) * 0.035;
      float vignette = smoothstep(0.82, 0.22, length(centered));
      color *= 0.92 + vignette * 0.12 - scanline;
      color += grain;
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) color = vec3(0.0);
      gl_FragColor = vec4(color, 1.0);
    }
  `,
}

function addBox(parent: THREE.Object3D, size: [number, number, number], color: number, position: [number, number, number]) {
  const object = new THREE.Mesh(new THREE.BoxGeometry(...size), material(color))
  object.position.set(...position)
  object.castShadow = true
  object.receiveShadow = true
  parent.add(object)
  return object
}

export class MusicVideo {
  readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(48, 16 / 9, 0.1, 120)
  private readonly composer: EffectComposer
  private readonly bloom: UnrealBloomPass
  private readonly crt: ShaderPass
  private readonly groups = new Map<SceneKind, THREE.Group>()
  private readonly updaters: Array<(time: number, local: number, energy: number, pulse: number) => void> = []
  private readonly observer: ResizeObserver
  private readonly stageLights: THREE.PointLight[] = []
  private readonly cameraTarget = new THREE.Vector3()
  private reducedMotion = false
  private lastKind: SceneKind | null = null
  private readonly container: HTMLElement

  constructor(container: HTMLElement) {
    this.container = container
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.15
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.domElement.setAttribute("aria-label", "Animated low-poly music video")
    this.renderer.domElement.setAttribute("role", "img")
    container.appendChild(this.renderer.domElement)

    this.scene.background = new THREE.Color(palette.ink)
    this.scene.fog = new THREE.FogExp2(palette.ink, 0.025)
    this.scene.add(new THREE.HemisphereLight(0x8ba6ff, 0x27182c, 1.6))
    const keyLight = new THREE.DirectionalLight(0xffe4c2, 3.2)
    keyLight.position.set(4, 10, 7)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(1024, 1024)
    keyLight.shadow.camera.left = -14
    keyLight.shadow.camera.right = 14
    keyLight.shadow.camera.top = 14
    keyLight.shadow.camera.bottom = -14
    this.scene.add(keyLight)

    this.groups.set("title", this.createTitle())
    this.groups.set("warehouse", this.createWarehouse())
    this.groups.set("stage", this.createStage())
    this.groups.set("kitchen", this.createKitchen())
    this.groups.set("televisions", this.createTelevisionWall())
    for (const group of this.groups.values()) {
      group.visible = false
      this.scene.add(group)
    }

    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1280, 720), 0.48, 0.5, 0.74)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())
    this.crt = new ShaderPass(crtShader)
    this.composer.addPass(this.crt)
    this.observer = new ResizeObserver(() => this.resize())
    this.observer.observe(container)
    this.resize()
  }

  setReducedMotion(reduced: boolean) {
    this.reducedMotion = reduced
    this.crt.uniforms.reducedMotion.value = reduced ? 1 : 0
  }

  render(time: number) {
    const safeTime = THREE.MathUtils.clamp(Number.isFinite(time) ? time : 0, 0, 278.99)
    const chapter = chapters.find((item) => safeTime >= item.start && safeTime < item.end) ?? chapters[0]
    const local = safeTime - chapter.start
    for (const [kind, group] of this.groups) group.visible = kind === chapter.kind
    if (this.lastKind !== chapter.kind) {
      const colors: Record<SceneKind, number> = {
        title: 0x070817,
        warehouse: 0x172238,
        stage: 0x080515,
        kitchen: 0x25233a,
        televisions: 0x050916,
      }
      this.scene.background = new THREE.Color(colors[chapter.kind])
      this.scene.fog = new THREE.FogExp2(colors[chapter.kind], chapter.kind === "warehouse" ? 0.022 : 0.035)
      this.lastKind = chapter.kind
    }

    const exactFrame = safeTime * envelope.fps
    const frame = Math.min(Math.floor(exactFrame), envelope.rms.length - 1)
    const nextFrame = Math.min(frame + 1, envelope.rms.length - 1)
    const energy = THREE.MathUtils.lerp(envelope.rms[frame], envelope.rms[nextFrame], exactFrame % 1)
    const beatPhase = (safeTime * 134 / 60) % 1
    const pulse = Math.exp(-beatPhase * 8) * (0.35 + energy * 0.65)
    for (const update of this.updaters) update(safeTime, local, energy, pulse)
    this.updateCamera(chapter.kind, local, safeTime, pulse)
    this.stageLights.forEach((light, index) => {
      light.intensity = chapter.kind === "stage" ? 6 + energy * 18 + pulse * 14 : 0
      light.color.setHSL((index * 0.19 + safeTime * 0.015) % 1, 0.85, 0.58)
    })
    this.bloom.strength = this.reducedMotion ? 0.28 : 0.38 + energy * 0.32
    this.crt.uniforms.time.value = safeTime
    this.crt.uniforms.energy.value = energy
    this.composer.render()
  }

  dispose() {
    this.observer.disconnect()
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineSegments) {
        object.geometry.dispose()
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        for (const mat of materials) {
          if ("map" in mat && mat.map instanceof THREE.Texture) mat.map.dispose()
          mat.dispose()
        }
      }
    })
    for (const pass of this.composer.passes) pass.dispose()
    this.composer.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  private resize() {
    const width = Math.max(this.container.clientWidth, 1)
    const height = Math.max(this.container.clientHeight, 1)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
    this.composer.setSize(width, height)
    this.crt.uniforms.resolution.value.set(width * this.renderer.getPixelRatio(), height * this.renderer.getPixelRatio())
  }

  private createTitle() {
    const group = new THREE.Group()
    group.add(createGrid(60, 40, palette.blue))
    const television = createTelevision(palette.darkSteel, true)
    television.scale.setScalar(3.8)
    television.position.set(0, 0.4, -1.4)
    group.add(television)
    const title = createTextPanel("MONEY FOR NOTHING", { color: "#ffd84a", background: "#11142a", width: 10.5, height: 2.25, fontSize: 148 })
    title.position.set(0, 4.1, 1.25)
    group.add(title)
    const artist = createTextPanel("DIRE STRAITS", { color: "#21d4e6", background: "#11142a", width: 6.8, height: 1.35, fontSize: 168 })
    artist.position.set(0, 1.85, 1.28)
    group.add(artist)
    for (let index = 0; index < 22; index += 1) {
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.045 + (index % 3) * 0.025), new THREE.MeshBasicMaterial({ color: index % 2 ? palette.cyan : palette.pink }))
      star.position.set(((index * 37) % 23) - 11, 1 + ((index * 17) % 9), -4 - (index % 5))
      group.add(star)
    }
    this.updaters.push((time, _local, energy) => {
      television.rotation.y = this.reducedMotion ? 0 : Math.sin(time * 0.3) * 0.07
      title.position.y = 4.1 + (this.reducedMotion ? 0 : Math.sin(time * 0.8) * 0.08)
      const screen = television.userData.screenMaterial as THREE.MeshStandardMaterial
      screen.emissive.setHSL(0.56 + energy * 0.1, 0.8, 0.35)
      screen.emissiveIntensity = 1.4 + energy * 2
    })
    return group
  }

  private createWarehouse() {
    const group = new THREE.Group()
    addBox(group, [28, 0.25, 20], 0x38465a, [0, -0.15, 0])
    addBox(group, [28, 9, 0.4], 0x263348, [0, 4.5, -6])
    addBox(group, [0.35, 9, 20], 0x1b293e, [-13.8, 4.5, 0])
    for (let index = -5; index <= 5; index += 1) {
      addBox(group, [0.08, 0.025, 19], 0x52647b, [index * 2.3, 0.01, 0])
    }
    const sign = createTextPanel("HOME APPLIANCES", { color: "#f0dbb5", background: "#263348", width: 7.5, height: 1.4, fontSize: 140 })
    sign.position.set(0, 6.3, -5.72)
    group.add(sign)
    for (const side of [-1, 1]) {
      for (let level = 0; level < 3; level += 1) {
        addBox(group, [4.4, 0.16, 2.4], palette.wood, [side * 9.8, 0.65 + level * 1.8, -3.8])
      }
      for (const x of [-1.9, 1.9]) addBox(group, [0.15, 5.4, 2.4], palette.darkSteel, [side * 9.8 + x, 2.7, -3.8])
    }
    const fridgePositions: Array<[number, number, number, number]> = [[-6.8, 0, -4.4, 0.2], [6.9, 0, -4.2, -0.25], [9.4, 0, 1.5, -0.8]]
    fridgePositions.forEach(([x, y, z, rotation], index) => {
      const fridge = createRefrigerator(index === 1 ? palette.cyan : palette.cream)
      fridge.position.set(x, y, z)
      fridge.rotation.y = rotation
      group.add(fridge)
    })
    for (let index = 0; index < 5; index += 1) {
      const television = createTelevision(index % 2 ? palette.cream : palette.steel)
      television.position.set(-9.7 + (index % 2) * 2.1, Math.floor(index / 2) * 1.65 + 0.7, -3.5)
      television.scale.setScalar(0.85)
      group.add(television)
    }
    for (let index = 0; index < 7; index += 1) {
      const carton = addBox(group, [1.2 + (index % 2) * 0.4, 1.1, 1.1], index % 2 ? 0x9a673c : 0xb07b48, [-11 + (index % 3) * 1.3, 0.55 + Math.floor(index / 3) * 1.05, 3.7])
      carton.rotation.y = index * 0.16
    }
    for (let index = -2; index <= 2; index += 1) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.09, 0.32), new THREE.MeshBasicMaterial({ color: 0xbde9ff }))
      lamp.position.set(index * 5, 7.4, -0.5)
      group.add(lamp)
    }

    const crew = new THREE.Group()
    const left = createWorker({ shirt: palette.blue, cap: palette.red })
    const right = createWorker({ shirt: palette.orange, cap: palette.yellow, skin: palette.darkSkin })
    left.root.position.x = -1.45
    right.root.position.x = 1.45
    right.root.rotation.y = Math.PI
    crew.add(left.root, right.root)
    const carriedTelevision = createTelevision(palette.cream, true)
    carriedTelevision.position.set(0, 1.25, 0.35)
    carriedTelevision.scale.setScalar(0.85)
    crew.add(carriedTelevision)
    crew.position.set(0, 0, 0.8)
    group.add(crew)
    for (const rig of [left, right]) {
      rig.leftArm.rotation.x = -1.32
      rig.rightArm.rotation.x = -1.32
    }

    const walker = createWorker({ shirt: palette.red, pants: palette.blue, cap: palette.cream })
    walker.root.position.set(5.5, 0, 3.2)
    walker.root.rotation.y = -Math.PI / 2
    group.add(walker.root)
    const microwave = createMicrowave()
    microwave.scale.setScalar(0.65)
    microwave.position.set(0, 1.55, 0.85)
    walker.body.add(microwave)
    walker.leftArm.rotation.x = -1.45
    walker.rightArm.rotation.x = -1.45

    this.updaters.push((time, local, energy) => {
      const walk = time * 5.1
      crew.position.x = ((local * 0.58 + 7) % 18) - 9
      crew.position.y = Math.abs(Math.sin(walk)) * 0.035
      carriedTelevision.rotation.z = Math.sin(walk * 0.5) * 0.025
      for (const [index, rig] of [left, right].entries()) {
        rig.leftLeg.rotation.x = Math.sin(walk + index * Math.PI) * 0.42
        rig.rightLeg.rotation.x = -Math.sin(walk + index * Math.PI) * 0.42
        rig.head.rotation.y = Math.sin(time * 0.8 + index) * 0.15
      }
      walker.root.position.x = 8 - ((local * 0.42 + 2) % 16)
      walker.root.position.y = Math.abs(Math.sin(walk + 1)) * 0.04
      walker.leftLeg.rotation.x = Math.sin(walk + 1) * 0.45
      walker.rightLeg.rotation.x = -Math.sin(walk + 1) * 0.45
      walker.head.rotation.y = -0.2 + Math.sin(time * 0.5) * 0.2
      const screen = carriedTelevision.userData.screenMaterial as THREE.MeshStandardMaterial
      screen.emissiveIntensity = 0.8 + energy * 1.8
    })
    return group
  }

  private createStage() {
    const group = new THREE.Group()
    addBox(group, [18, 0.65, 10], 0x181529, [0, 0.15, -1])
    group.add(createGrid(50, 50, palette.pink))
    const rearGrid = createGrid(30, 30, palette.blue)
    rearGrid.rotation.x = Math.PI / 2
    rearGrid.position.set(0, 8, -6)
    group.add(rearGrid)
    for (const side of [-1, 1]) {
      addBox(group, [0.22, 8, 0.22], palette.steel, [side * 7.2, 4, -3.8])
      for (let index = 0; index < 4; index += 1) {
        const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 0.55, 8), material(index % 2 ? palette.pink : palette.cyan, { emissive: index % 2 ? palette.pink : palette.cyan, emissiveIntensity: 2 }))
        lamp.position.set(side * 7.2, 2.5 + index * 1.55, -3.6)
        lamp.rotation.x = Math.PI / 2.8
        group.add(lamp)
      }
      const light = new THREE.PointLight(side < 0 ? palette.pink : palette.cyan, 25, 20, 1.5)
      light.position.set(side * 4.5, 5.5, 2)
      group.add(light)
      this.stageLights.push(light)
      const beam = new THREE.Mesh(new THREE.ConeGeometry(3.2, 10, 16, 1, true), new THREE.MeshBasicMaterial({ color: side < 0 ? palette.pink : palette.cyan, transparent: true, opacity: 0.055, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }))
      beam.position.set(side * 4.5, 4.7, -1)
      beam.rotation.z = side * 0.35
      group.add(beam)
    }
    addBox(group, [15, 0.22, 0.22], palette.steel, [0, 7.8, -3.8])
    const backdrop = createTextPanel("MONEY  FOR  NOTHING", { color: "#ff3d9a", background: "#080515", width: 10.5, height: 1.65, fontSize: 130 })
    backdrop.position.set(0, 5.6, -5.75)
    group.add(backdrop)

    const singer = createWorker({ shirt: palette.red, pants: palette.ink, cap: palette.ink })
    singer.root.position.set(0, 0.48, 1.3)
    singer.root.scale.multiplyScalar(1.05)
    group.add(singer.root)
    const singerGuitar = createGuitar(palette.yellow)
    singerGuitar.position.set(0.25, 1.4, 0.52)
    singer.body.add(singerGuitar)
    const microphone = createMicrophone()
    microphone.position.set(-0.6, 0.48, 2)
    group.add(microphone)

    const guitarist = createWorker({ shirt: palette.blue, pants: palette.darkSteel, cap: palette.cream, skin: palette.darkSkin })
    guitarist.root.position.set(-3.5, 0.48, 0)
    guitarist.root.rotation.y = 0.2
    group.add(guitarist.root)
    const guitar = createGuitar(palette.red)
    guitar.position.set(0.3, 1.35, 0.5)
    guitarist.body.add(guitar)

    const bassist = createWorker({ shirt: palette.orange, pants: palette.blue, cap: palette.red })
    bassist.root.position.set(3.5, 0.48, 0)
    bassist.root.rotation.y = -0.2
    group.add(bassist.root)
    const bass = createGuitar(palette.cyan)
    bass.position.set(0.25, 1.35, 0.5)
    bass.scale.multiplyScalar(1.12)
    bassist.body.add(bass)

    const drummer = createWorker({ shirt: palette.cream, pants: palette.red, cap: palette.blue })
    drummer.root.position.set(0, 1.1, -3.6)
    drummer.root.scale.multiplyScalar(0.78)
    group.add(drummer.root)
    const drums = createDrumKit()
    drums.position.set(0, 0.48, -2.3)
    group.add(drums)
    addBox(group, [3.5, 0.55, 2.6], 0x242039, [0, 0.55, -3.2])

    this.updaters.push((time, _local, energy, pulse) => {
      const beat = time * 134 / 60 * Math.PI * 2
      const performers = [singer, guitarist, bassist]
      performers.forEach((rig, index) => {
        rig.body.rotation.z = Math.sin(beat * 0.25 + index) * 0.055
        rig.body.position.y = Math.abs(Math.sin(beat * 0.5 + index)) * 0.055
        rig.leftArm.rotation.x = -0.85 + Math.sin(beat + index) * 0.16
        rig.rightArm.rotation.x = -1.15 + Math.sin(beat * 2 + index) * 0.32
        rig.head.rotation.y = Math.sin(time * 0.65 + index) * 0.2
      })
      drummer.leftArm.rotation.x = -1.1 + Math.max(0, Math.sin(beat)) * 0.85
      drummer.rightArm.rotation.x = -1.1 + Math.max(0, Math.sin(beat + Math.PI)) * 0.85
      drummer.leftArm.rotation.z = -0.35
      drummer.rightArm.rotation.z = 0.35
      backdrop.scale.setScalar(1 + pulse * 0.008)
      const backdropMaterial = backdrop.material as THREE.MeshBasicMaterial
      backdropMaterial.opacity = 0.8 + energy * 0.2
    })
    return group
  }

  private createKitchen() {
    const group = new THREE.Group()
    for (let x = 0; x < 12; x += 1) {
      for (let z = 0; z < 12; z += 1) {
        addBox(group, [1, 0.08, 1], (x + z) % 2 ? palette.cream : palette.darkSteel, [x - 5.5, -0.05, z - 5.5])
      }
    }
    addBox(group, [12, 7, 0.3], 0x635779, [0, 3.5, -5.8])
    addBox(group, [0.3, 7, 12], 0x403d5c, [-5.8, 3.5, 0])
    for (let index = 0; index < 5; index += 1) {
      addBox(group, [1.75, 1.7, 1.1], index % 2 ? 0x71a5a0 : 0x83bbb0, [-4 + index * 1.8, 0.85, -4.9])
      addBox(group, [1.75, 0.14, 1.4], palette.cream, [-4 + index * 1.8, 1.76, -4.8])
      addBox(group, [0.35, 0.07, 0.08], palette.steel, [-4 + index * 1.8, 1.1, -4.3])
    }
    const refrigerator = createRefrigerator(palette.cream)
    refrigerator.position.set(-4.4, 0, -2.6)
    refrigerator.rotation.y = 0.25
    group.add(refrigerator)
    const microwave = createMicrowave()
    microwave.position.set(1.3, 1.85, -4.65)
    group.add(microwave)
    const television = createTelevision(palette.orange)
    television.scale.setScalar(0.85)
    television.position.set(4, 1.85, -4.6)
    group.add(television)
    const table = addBox(group, [4.3, 0.22, 2.6], palette.wood, [0.4, 1.5, 0.3])
    table.rotation.y = -0.08
    for (const x of [-1.45, 1.45]) for (const z of [-0.85, 0.85]) addBox(group, [0.18, 1.5, 0.18], palette.darkSteel, [0.4 + x, 0.75, 0.3 + z])
    const worker = createWorker({ shirt: palette.pink, pants: palette.blue, cap: palette.yellow, skirt: true })
    worker.root.position.set(-2.1, 0, 1.5)
    worker.root.rotation.y = 0.45
    group.add(worker.root)
    const secondWorker = createWorker({ shirt: palette.blue, cap: palette.red, skin: palette.darkSkin })
    secondWorker.root.position.set(3.2, 0, 1.6)
    secondWorker.root.rotation.y = -0.55
    group.add(secondWorker.root)
    const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.1, 12), material(palette.cream))
    clock.rotation.x = Math.PI / 2
    clock.position.set(0, 4.7, -5.55)
    group.add(clock)
    const hand = addBox(group, [0.055, 0.55, 0.04], palette.ink, [0, 4.85, -5.46])
    this.updaters.push((time, _local, energy) => {
      worker.body.rotation.z = Math.sin(time * 2.2) * 0.055
      worker.leftArm.rotation.z = -0.45 + Math.sin(time * 2.2) * 0.35
      worker.rightArm.rotation.x = -0.7 + Math.sin(time * 1.1) * 0.3
      secondWorker.head.rotation.y = Math.sin(time * 0.9) * 0.35
      secondWorker.rightArm.rotation.x = -1.1 + Math.sin(time * 2.2 + 1) * 0.25
      hand.rotation.z = -time * 0.08
      const screen = television.userData.screenMaterial as THREE.MeshStandardMaterial
      screen.emissive.setHSL((time * 0.04) % 1, 0.8, 0.45)
      screen.emissiveIntensity = 1 + energy * 2.5
    })
    return group
  }

  private createTelevisionWall() {
    const group = new THREE.Group()
    addBox(group, [22, 11, 0.5], 0x10172a, [0, 4.5, -1])
    group.add(createGrid(50, 40, palette.cyan))
    const screens: THREE.MeshStandardMaterial[] = []
    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 6; column += 1) {
        const television = createTelevision((row + column) % 3 === 0 ? palette.orange : (row + column) % 2 ? palette.cream : palette.steel)
        television.scale.setScalar(1.12)
        television.position.set((column - 2.5) * 2.35, row * 1.82 + 0.15, 0)
        television.rotation.y = (column - 2.5) * -0.025
        group.add(television)
        screens.push(television.userData.screenMaterial as THREE.MeshStandardMaterial)
      }
    }
    const left = createWorker({ shirt: palette.blue, cap: palette.red })
    const right = createWorker({ shirt: palette.orange, cap: palette.yellow, skin: palette.darkSkin })
    left.root.position.set(-2.1, 0, 4)
    right.root.position.set(2.1, 0, 4)
    left.root.rotation.y = Math.PI
    right.root.rotation.y = Math.PI
    group.add(left.root, right.root)
    const caption = createTextPanel("I WANT MY MUSIC TELEVISION", { color: "#21d4e6", background: "#050916", width: 11, height: 1.35, fontSize: 126 })
    caption.position.set(0, 8.35, 0.5)
    group.add(caption)
    this.updaters.push((time, _local, energy, pulse) => {
      screens.forEach((screen, index) => {
        const hue = (index * 0.073 + Math.floor(time * 0.5) * 0.11) % 1
        screen.color.setHSL(hue, 0.62, 0.18 + energy * 0.12)
        screen.emissive.setHSL(hue, 0.85, 0.42)
        screen.emissiveIntensity = 0.65 + energy * 2.3 + ((index + Math.floor(time * 2)) % 5 === 0 ? pulse : 0)
      })
      left.head.rotation.y = Math.sin(time * 0.7) * 0.25
      right.head.rotation.y = -Math.sin(time * 0.8) * 0.25
      left.rightArm.rotation.x = -0.4 + Math.sin(time * 1.4) * 0.3
      right.leftArm.rotation.x = -0.4 + Math.sin(time * 1.4 + 1) * 0.3
      caption.position.y = 8.35 + pulse * 0.04
    })
    return group
  }

  private updateCamera(kind: SceneKind, local: number, time: number, pulse: number) {
    const shotLength = kind === "title" ? 10 : 5
    const shot = Math.floor(local / shotLength) % 4
    const shotProgress = (local % shotLength) / shotLength
    const ease = shotProgress * shotProgress * (3 - 2 * shotProgress)
    const poses: Record<SceneKind, Array<{ from: [number, number, number]; to: [number, number, number]; target: [number, number, number]; fov: number }>> = {
      title: [
        { from: [0, 3.2, 15], to: [0, 3.5, 12.5], target: [0, 3, 0], fov: 48 },
        { from: [-5, 3.5, 13], to: [5, 3.5, 13], target: [0, 3, 0], fov: 46 },
        { from: [0, 5.5, 12], to: [0, 3.3, 13], target: [0, 3, 0], fov: 48 },
        { from: [4, 3.2, 14], to: [0, 3.4, 12], target: [0, 3, 0], fov: 46 },
      ],
      warehouse: [
        { from: [9, 5.3, 12], to: [5, 4.4, 10], target: [0, 2.2, 0], fov: 50 },
        { from: [-5, 2.6, 6.5], to: [-2.5, 2.8, 5.5], target: [0, 2, 0.5], fov: 46 },
        { from: [3.5, 3.3, 5.5], to: [1.5, 3, 4.5], target: [0, 2.1, 0.7], fov: 43 },
        { from: [-10, 4.2, 3], to: [-7, 3.8, 5], target: [0, 2.1, 0], fov: 52 },
      ],
      stage: [
        { from: [0, 4.4, 13.5], to: [0, 3.5, 11], target: [0, 2.2, -0.5], fov: 49 },
        { from: [-5.5, 2.4, 5], to: [-3.5, 2.7, 4], target: [-1.4, 2.1, 0.2], fov: 44 },
        { from: [5, 2.8, 4.5], to: [3, 2.6, 4], target: [1.2, 2.1, 0.3], fov: 43 },
        { from: [0, 7.5, 6.5], to: [0, 5.5, 7.5], target: [0, 1.5, -1.2], fov: 52 },
      ],
      kitchen: [
        { from: [8, 5.5, 10], to: [5, 4.5, 8], target: [0, 1.9, -1], fov: 51 },
        { from: [-4, 2.7, 5], to: [-2.5, 2.5, 4], target: [-1.2, 1.9, 0.8], fov: 45 },
        { from: [4.5, 3.2, 4], to: [2.5, 2.8, 4.5], target: [1.5, 2, -2], fov: 46 },
        { from: [0, 5.5, 7], to: [0, 3.2, 6], target: [0, 1.8, -1], fov: 50 },
      ],
      televisions: [
        { from: [0, 4.2, 15], to: [0, 4, 12], target: [0, 4, 0], fov: 50 },
        { from: [-4, 3.4, 7], to: [-2, 3.5, 5.5], target: [-1, 3.4, 0], fov: 44 },
        { from: [4, 5.3, 7], to: [2, 4.5, 5.5], target: [1, 4, 0], fov: 45 },
        { from: [0, 2.2, 9], to: [0, 5, 12], target: [0, 4, 0], fov: 52 },
      ],
    }
    const pose = poses[kind][shot]
    this.camera.position.set(
      THREE.MathUtils.lerp(pose.from[0], pose.to[0], ease),
      THREE.MathUtils.lerp(pose.from[1], pose.to[1], ease),
      THREE.MathUtils.lerp(pose.from[2], pose.to[2], ease),
    )
    this.cameraTarget.set(...pose.target)
    if (!this.reducedMotion && kind === "stage") {
      this.camera.position.x += Math.sin(time * 31) * pulse * 0.018
      this.camera.position.y += Math.cos(time * 27) * pulse * 0.014
    }
    this.camera.fov = pose.fov
    this.camera.updateProjectionMatrix()
    this.camera.lookAt(this.cameraTarget)
  }
}
