import { Object3DNode } from '@react-three/fiber'
import { DirectionalLight, AmbientLight, PointLight } from 'three'

declare module '@react-three/fiber' {
  interface ThreeElements {
    directionalLight: Object3DNode<DirectionalLight, typeof DirectionalLight> & {
      intensity?: number
      position?: [number, number, number]
      color?: string
      castShadow?: boolean
      'shadow-mapSize-width'?: number
      'shadow-mapSize-height'?: number
      'shadow-camera-near'?: number
      'shadow-camera-far'?: number
      'shadow-camera-left'?: number
      'shadow-camera-right'?: number
      'shadow-camera-top'?: number
      'shadow-camera-bottom'?: number
    }
    ambientLight: Object3DNode<AmbientLight, typeof AmbientLight> & {
      intensity?: number
      color?: string
    }
    pointLight: Object3DNode<PointLight, typeof PointLight> & {
      intensity?: number
      position?: [number, number, number]
      color?: string
      distance?: number
      decay?: number
      castShadow?: boolean
      'shadow-mapSize-width'?: number
      'shadow-mapSize-height'?: number
      'shadow-camera-near'?: number
      'shadow-camera-far'?: number
    }
  }
}