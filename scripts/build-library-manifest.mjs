#!/usr/bin/env node
/**
 * LumaWall library manifest builder (browser preview discovery).
 *
 * Walks `public/library/builtin/**`, reads each `metadata.json`, and emits
 * `public/library/manifest.json` with origin-relative `files` URLs so the
 * frontend can discover content without the Rust scanner (dev/preview mode).
 *
 * In the packaged Tauri app, discovery goes through the Rust `scan_library`
 * command, which reads the same metadata.json files directly from disk — the
 * manifest is only a browser-mode convenience.
 *
 * Run:  node scripts/build-library-manifest.mjs
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root = join(__dirname, '..')
const libraryRoot = join(root, 'public', 'library')

function toPosix(p) {
  return p.split(sep).join('/')
}

/** Recursively find every directory that contains a metadata.json. */
function findScenes(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      const meta = join(full, 'metadata.json')
      if (existsSync(meta)) {
        out.push(full)
      } else {
        out.push(...findScenes(full))
      }
    }
  }
  return out
}

function sceneToManifest(sceneDir) {
  const metaPath = join(sceneDir, 'metadata.json')
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
  const url = (p) => `/library/${toPosix(relative(libraryRoot, p))}`
  const files = {}
  for (const [key, name] of Object.entries(meta.files ?? {})) {
    const abs = join(sceneDir, name)
    // Only reference assets that actually exist → missing files become null
    // so the UI can flag broken content instead of showing a dead 404 card.
    files[key] = existsSync(abs) ? url(abs) : null
  }
  return {
    ...meta,
    files,
  }
}

const builtinDir = join(libraryRoot, 'builtin')
const scenes = existsSync(builtinDir) ? findScenes(builtinDir).map(sceneToManifest) : []

const manifest = {
  version: 1,
  generatedAt: new Date().toISOString(),
  libraryRoot: '/library',
  scenes,
}

const outPath = join(libraryRoot, 'manifest.json')
writeFileSync(outPath, JSON.stringify(manifest, null, 2))
console.log(`Wrote ${outPath} with ${scenes.length} scenes.`)
