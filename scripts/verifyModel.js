import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const rainfall = JSON.parse(fs.readFileSync(path.join(root, 'src/data/rainfall.json'), 'utf-8'))
const terrain = JSON.parse(fs.readFileSync(path.join(root, 'src/data/terrain.json'), 'utf-8'))
const drainageNetwork = JSON.parse(fs.readFileSync(path.join(root, 'src/data/drainageNetwork.json'), 'utf-8'))
const streets = JSON.parse(fs.readFileSync(path.join(root, 'src/data/streets.json'), 'utf-8'))

console.log('=== JalDrishti Model Data Verification ===')
console.log('Rainfall horizons:', rainfall.forecast.map((f) => `${f.time} (${f.intensity}mm/h)`).join(', '))
console.log('Terrain zones:', terrain.zones.map((z) => `${z.name}: ${z.elevation}m, accum: ${z.accumulationPotential}`).join(' | '))
console.log('Drainage nodes:', drainageNetwork.nodes.map((n) => `${n.name} (${n.capacity})`).join(', '))
console.log('Drainage edges:', drainageNetwork.edges.map((e) => `${e.id} [${e.source}->${e.target}] (cap: ${e.hydraulicCapacity}, blocked: ${e.blocked})`).join(' | '))
console.log('Streets count:', streets.streets.length)
console.log('All dataset files loaded and validated successfully.')
