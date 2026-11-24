import * as THREE from "three"

export const palette = {
  ink: 0x090b18,
  blue: 0x2457ff,
  cyan: 0x21d4e6,
  pink: 0xff3d9a,
  red: 0xe94141,
  orange: 0xff8a30,
  yellow: 0xffd84a,
  cream: 0xf0dbb5,
  white: 0xf1f3ea,
  steel: 0x6d7c8d,
  darkSteel: 0x283447,
  wood: 0x8b4c2d,
  skin: 0xd99968,
  darkSkin: 0x7b4935,
}

export function material(color: THREE.ColorRepresentation, options: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.05, flatShading: true, ...options })
}

function mesh(geometry: THREE.BufferGeometry, mat: THREE.Material, position: [number, number, number] = [0, 0, 0]) {
  const object = new THREE.Mesh(geometry, mat)
  object.position.set(...position)
  object.castShadow = true
  object.receiveShadow = true
  return object
}

function box(size: [number, number, number], mat: THREE.Material, position: [number, number, number] = [0, 0, 0]) {
  return mesh(new THREE.BoxGeometry(...size), mat, position)
}

function cylinder(radiusTop: number, radiusBottom: number, height: number, segments: number, mat: THREE.Material, position: [number, number, number] = [0, 0, 0]) {
  return mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), mat, position)
}

export type WorkerRig = {
  root: THREE.Group
  body: THREE.Group
  head: THREE.Group
  leftArm: THREE.Group
  rightArm: THREE.Group
  leftLeg: THREE.Group
  rightLeg: THREE.Group
}

export function createWorker(options: { shirt?: number; pants?: number; skin?: number; cap?: number; skirt?: boolean } = {}): WorkerRig {
  const root = new THREE.Group()
  const body = new THREE.Group()
  root.add(body)
  const skin = material(options.skin ?? palette.skin)
  const shirt = material(options.shirt ?? palette.blue)
  const pants = material(options.pants ?? palette.darkSteel)
  const boots = material(palette.ink)
  const torso = cylinder(0.42, 0.58, 1.18, 6, shirt, [0, 2.18, 0])
  torso.rotation.y = Math.PI / 6
  body.add(torso)
  body.add(box([0.86, 0.15, 0.52], material(palette.ink), [0, 1.56, 0]))
  body.add(box([0.15, 0.13, 0.08], material(palette.yellow), [0, 1.57, 0.31]))

  const head = new THREE.Group()
  head.position.set(0, 3.13, 0)
  body.add(head)
  const face = mesh(new THREE.DodecahedronGeometry(0.43, 0), skin)
  face.scale.set(0.88, 1.1, 0.9)
  head.add(face)
  head.add(mesh(new THREE.ConeGeometry(0.1, 0.3, 4), skin, [0, -0.02, 0.43]))
  head.children[head.children.length - 1].rotation.x = Math.PI / 2
  const eyeMaterial = material(palette.ink)
  head.add(box([0.075, 0.07, 0.035], eyeMaterial, [-0.15, 0.12, 0.38]))
  head.add(box([0.075, 0.07, 0.035], eyeMaterial, [0.15, 0.12, 0.38]))
  const capMaterial = material(options.cap ?? palette.red)
  head.add(cylinder(0.45, 0.45, 0.18, 8, capMaterial, [0, 0.39, 0]))
  head.add(box([0.55, 0.07, 0.36], capMaterial, [0, 0.33, 0.3]))

  const makeArm = (side: number) => {
    const arm = new THREE.Group()
    arm.position.set(side * 0.57, 2.64, 0)
    body.add(arm)
    arm.add(cylinder(0.15, 0.13, 0.82, 6, shirt, [0, -0.37, 0]))
    arm.add(cylinder(0.12, 0.1, 0.72, 6, skin, [0, -1.08, 0]))
    arm.add(mesh(new THREE.DodecahedronGeometry(0.16, 0), skin, [0, -1.48, 0]))
    return arm
  }

  const makeLeg = (side: number) => {
    const leg = new THREE.Group()
    leg.position.set(side * 0.25, 1.5, 0)
    body.add(leg)
    leg.add(cylinder(0.19, 0.16, 1.12, 6, pants, [0, -0.5, 0]))
    leg.add(box([0.36, 0.25, 0.62], boots, [0, -1.15, 0.12]))
    return leg
  }

  const leftArm = makeArm(-1)
  const rightArm = makeArm(1)
  const leftLeg = makeLeg(-1)
  const rightLeg = makeLeg(1)
  if (options.skirt) {
    body.add(cylinder(0.48, 0.7, 0.68, 6, pants, [0, 1.42, 0]))
  }
  root.scale.setScalar(0.82)
  return { root, body, head, leftArm, rightArm, leftLeg, rightLeg }
}

export function createTelevision(color = palette.cream, wide = false) {
  const root = new THREE.Group()
  const shell = material(color)
  const width = wide ? 2.25 : 1.75
  root.add(box([width, 1.42, 1.05], shell, [0, 0.85, 0]))
  root.add(box([width * 0.72, 1.02, 0.08], material(palette.darkSteel), [-width * 0.08, 0.88, 0.565]))
  const screenMaterial = material(0x153a59, { emissive: 0x156b8d, emissiveIntensity: 1.25, roughness: 0.3 })
  const screen = box([width * 0.63, 0.84, 0.035], screenMaterial, [-width * 0.08, 0.89, 0.62])
  root.add(screen)
  root.add(cylinder(0.1, 0.1, 0.08, 8, material(palette.ink), [width * 0.39, 1.1, 0.59]))
  root.children[root.children.length - 1].rotation.x = Math.PI / 2
  root.add(cylinder(0.08, 0.08, 0.08, 8, material(palette.ink), [width * 0.39, 0.75, 0.59]))
  root.children[root.children.length - 1].rotation.x = Math.PI / 2
  const antenna = cylinder(0.025, 0.025, 1.05, 5, material(palette.steel), [-0.25, 1.92, 0])
  antenna.rotation.z = -0.35
  root.add(antenna)
  const antennaTwo = antenna.clone()
  antennaTwo.position.x = 0.25
  antennaTwo.rotation.z = 0.35
  root.add(antennaTwo)
  root.add(box([0.18, 0.2, 0.7], material(palette.ink), [-0.55, 0.1, 0]))
  root.add(box([0.18, 0.2, 0.7], material(palette.ink), [0.55, 0.1, 0]))
  root.userData.screenMaterial = screenMaterial
  return root
}

export function createRefrigerator(color = palette.cream) {
  const root = new THREE.Group()
  root.add(box([1.55, 3.3, 1.35], material(color), [0, 1.65, 0]))
  root.add(box([1.4, 0.055, 0.06], material(palette.darkSteel), [0, 2.25, 0.705]))
  root.add(box([0.08, 0.78, 0.1], material(palette.steel), [0.51, 2.67, 0.75]))
  root.add(box([0.08, 1.05, 0.1], material(palette.steel), [0.51, 1.52, 0.75]))
  root.add(box([1.25, 0.13, 0.12], material(palette.darkSteel), [0, 0.12, 0.66]))
  return root
}

export function createMicrowave() {
  const root = new THREE.Group()
  root.add(box([2.05, 1.25, 1.15], material(palette.cream), [0, 0.65, 0]))
  root.add(box([1.25, 0.91, 0.06], material(palette.darkSteel), [-0.25, 0.68, 0.605]))
  root.add(box([1.05, 0.68, 0.035], material(0x302416, { emissive: 0xff7b24, emissiveIntensity: 0.25 }), [-0.25, 0.68, 0.65]))
  for (let index = 0; index < 4; index += 1) {
    root.add(box([0.17, 0.1, 0.06], material(index === 0 ? palette.red : palette.steel), [0.72, 0.98 - index * 0.21, 0.64]))
  }
  return root
}

export function createGuitar(color = palette.red) {
  const root = new THREE.Group()
  const guitarMaterial = material(color, { metalness: 0.2, roughness: 0.4 })
  const lower = cylinder(0.46, 0.46, 0.18, 8, guitarMaterial, [0, 0, 0])
  lower.rotation.x = Math.PI / 2
  lower.scale.set(0.86, 1, 1.18)
  root.add(lower)
  const upper = cylinder(0.34, 0.34, 0.18, 8, guitarMaterial, [0, 0.52, 0])
  upper.rotation.x = Math.PI / 2
  root.add(upper)
  root.add(box([0.18, 1.65, 0.13], material(palette.wood), [0, 1.45, 0]))
  root.add(box([0.28, 0.42, 0.15], material(palette.wood), [0, 2.45, 0]))
  root.add(box([0.38, 0.12, 0.08], material(palette.cream), [0, -0.06, 0.13]))
  const stringMaterial = new THREE.LineBasicMaterial({ color: palette.cream })
  for (let index = -1; index <= 1; index += 1) {
    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(index * 0.035, -0.18, 0.16), new THREE.Vector3(index * 0.035, 2.55, 0.1)])
    root.add(new THREE.Line(geometry, stringMaterial))
  }
  root.rotation.z = -0.32
  root.scale.setScalar(0.72)
  return root
}

export function createDrumKit() {
  const root = new THREE.Group()
  const shell = material(palette.red, { metalness: 0.35, roughness: 0.35 })
  const skin = material(palette.cream)
  const bass = cylinder(0.68, 0.68, 0.72, 12, shell, [0, 0.72, 0])
  bass.rotation.x = Math.PI / 2
  root.add(bass)
  const front = cylinder(0.61, 0.61, 0.03, 12, material(palette.ink), [0, 0.72, 0.38])
  front.rotation.x = Math.PI / 2
  root.add(front)
  for (const side of [-1, 1]) {
    const tom = cylinder(0.4, 0.4, 0.48, 10, shell, [side * 0.55, 1.45, 0])
    root.add(tom)
    root.add(cylinder(0.41, 0.41, 0.035, 10, skin, [side * 0.55, 1.7, 0]))
    const stand = cylinder(0.035, 0.035, 1.65, 6, material(palette.steel), [side * 1.25, 0.9, -0.15])
    root.add(stand)
    root.add(cylinder(0.58, 0.58, 0.055, 12, material(palette.yellow, { metalness: 0.65 }), [side * 1.25, 1.76, -0.15]))
  }
  return root
}

export function createMicrophone() {
  const root = new THREE.Group()
  root.add(cylinder(0.34, 0.34, 0.06, 10, material(palette.ink), [0, 0.03, 0]))
  root.add(cylinder(0.025, 0.025, 2.25, 6, material(palette.steel), [0, 1.14, 0]))
  const boom = cylinder(0.025, 0.025, 0.82, 6, material(palette.steel), [0.3, 2.25, 0])
  boom.rotation.z = Math.PI / 2.7
  root.add(boom)
  const mic = cylinder(0.07, 0.09, 0.34, 8, material(palette.ink), [0.63, 2.48, 0])
  mic.rotation.z = Math.PI / 2.7
  root.add(mic)
  return root
}

export function createTextPanel(text: string, options: { color?: string; background?: string; width?: number; height?: number; fontSize?: number } = {}) {
  const canvas = document.createElement("canvas")
  canvas.width = 1536
  canvas.height = 384
  const context = canvas.getContext("2d")!
  context.fillStyle = options.background ?? "#090b18"
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.strokeStyle = options.color ?? "#f1f3ea"
  context.lineWidth = 12
  context.strokeRect(18, 18, canvas.width - 36, canvas.height - 36)
  context.fillStyle = options.color ?? "#f1f3ea"
  context.font = `900 ${options.fontSize ?? 170}px Arial, sans-serif`
  context.textAlign = "center"
  context.textBaseline = "middle"
  context.fillText(text, canvas.width / 2, canvas.height / 2 + 8, canvas.width - 100)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  const panel = mesh(new THREE.PlaneGeometry(options.width ?? 9, options.height ?? 2.25), new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide }))
  panel.castShadow = false
  return panel
}

export function createGrid(size: number, divisions: number, color: number) {
  const grid = new THREE.GridHelper(size, divisions, color, color)
  const gridMaterial = grid.material as THREE.Material
  gridMaterial.transparent = true
  gridMaterial.opacity = 0.38
  return grid
}
