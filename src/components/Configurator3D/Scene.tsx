import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useConfiguratorStore } from '../../store/configuratorStore'
import { configType } from '../../data/configuratorSchema'
import { ProductModel } from './models'
import { Dimensions } from './Dimensions'
import { updateCorten } from './cortenMaterial'

const MM = 1 / 1000

/**
 * Studio-omgeving zonder externe assets: RoomEnvironment geeft de metallic
 * reflecties die vers staal nodig heeft om geloofwaardig te ogen.
 */
function Studio() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    return () => {
      scene.environment = null
      env.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])
  return null
}

export function Scene() {
  const typeId = useConfiguratorStore((s) => s.typeId)
  const dims = useConfiguratorStore((s) => s.dims)
  const thickness = useConfiguratorStore((s) => s.thickness)
  const options = useConfiguratorStore((s) => s.options)
  const rust = useConfiguratorStore((s) => s.rust)
  const showDims = useConfiguratorStore((s) => s.showDims)
  const autoRotate = useConfiguratorStore((s) => s.autoRotate)
  const cameraView = useConfiguratorStore((s) => s.cameraView)

  const controls = useRef<OrbitControlsImpl>(null)
  const camera = useThree((s) => s.camera)

  useEffect(() => updateCorten(rust), [rust])

  // Camerastandpunt bij typewissel of preset-knop; maatwijzigingen laten de
  // camera met rust zodat de gebruiker zijn eigen standpunt houdt.
  useEffect(() => {
    const L = (dims.l ?? 1000) * MM
    const B = (dims.b ?? 300) * MM
    const H = (dims.h ?? 600) * MM
    const R = Math.max(L, B, H)
    const target = new THREE.Vector3(0, H / 2, 0)
    let pos: THREE.Vector3
    switch (cameraView.name) {
      case 'voor':
        pos = new THREE.Vector3(0, H * 0.55, R * 1.9 + 0.6)
        break
      case 'detail': {
        // dicht op de bovenhoek: rand, plaatdikte en textuurkorrel beoordelen
        const cx = L * 0.5
        const cz = Math.max(B * 0.5, 0.02)
        target.set(cx * 0.9, H * 0.98, cz * 0.9)
        pos = new THREE.Vector3(cx + 0.28, H + 0.22, cz + 0.34)
        break
      }
      default:
        pos = new THREE.Vector3(R * 1.15 + 0.4, H * 0.8 + R * 0.35, R * 1.3 + 0.5)
    }
    camera.position.copy(pos)
    controls.current?.target.copy(target)
    controls.current?.update()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeId, cameraView, camera])

  const dimKeys = configType(typeId).dimensions.map((d) => d.key)

  return (
    <>
      <Studio />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[3, 5, 2.5]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-4, 2.5, -2]} intensity={0.35} />

      <ProductModel state={{ typeId, dims, thickness, options }} rust={rust} />
      {showDims && <Dimensions dims={dims} keys={dimKeys} />}

      <ContactShadows position={[0, 0, 0]} opacity={0.45} scale={10} blur={2.2} far={2.5} />

      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={0.15}
        maxDistance={9}
        maxPolarAngle={Math.PI / 2 - 0.03}
        autoRotate={autoRotate}
        autoRotateSpeed={1.1}
      />
    </>
  )
}
