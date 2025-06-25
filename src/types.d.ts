import { Object3DNode } from '@react-three/fiber'
import { DirectionalLight, AmbientLight, PointLight } from 'three'

declare module '@react-three/fiber' {
  interface ThreeElements {
    directionalLight: Object3DNode<DirectionalLight, typeof DirectionalLight> & {
      intensity?: number
      position?: [number, number, number]
    }
    ambientLight: Object3DNode<AmbientLight, typeof AmbientLight> & {
      intensity?: number
    }
    pointLight: Object3DNode<PointLight, typeof PointLight> & {
      intensity?: number
      position?: [number, number, number]
    }
  }
}
