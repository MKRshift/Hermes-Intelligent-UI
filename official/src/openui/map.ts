import { createMapView, MapMarker } from '../../../vendor/thesys-lib/components/map/map'

declare const __MAPLIBRE_WORKER__: string
let workerUrl: string | undefined

const MapView = createMapView({
  streetRouting: false,
  inlineExpand: true,
  async load() {
    const lib = await import('maplibre-gl')
    workerUrl ??= URL.createObjectURL(new Blob([__MAPLIBRE_WORKER__], { type: 'text/javascript' }))
    lib.setWorkerUrl(workerUrl)
    return lib
  }
})

export { MapView, MapMarker }

export function disposeMapWorker() {
  if (workerUrl) URL.revokeObjectURL(workerUrl)
  workerUrl = undefined
}
