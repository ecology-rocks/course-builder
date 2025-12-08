// src/utils/validation.js

// BARN HUNT RULES
export const BH_RULES = {
  Instinct: { minBales: 10, maxBales: 20, notes: "Simple straight tunnels allowed." },
  Novice: { minBales: 20, maxBales: 30, notes: "Required: One official Novice Tunnel." },
  Open: { minBales: 25, maxBales: 40, notes: "Tunnel: Min 1 turn (90°). Dark tunnel required." },
  Senior: { minBales: 35, maxBales: 55, notes: "Max Height: 3 bales. Tunnel: 2-3 turns." },
  Master: { minBales: 55, maxBales: 70, notes: "Distance Challenge. Max Height: 3 bales." },
  Crazy8s: { minBales: 40, maxBales: 60, notes: "Tunnel: 2+ turns. Speed focus." },
  LineDrive: { minBales: 7, maxBales: 11, notes: "Line Drive specific rules." },
  Other: { minBales: 0, maxBales: 0, notes: "Custom rules." }
}

// AGILITY RULES (Placeholders for now)
export const AGILITY_RULES = {
  Novice: { minObstacles: 14, maxObstacles: 16, notes: "No Weaves. 1-2 Contacts." },
  Open: { minObstacles: 16, maxObstacles: 18, notes: "Weaves: 6-12 poles." },
  Excellent: { minObstacles: 18, maxObstacles: 20, notes: "Complex handling challenges." },
  Master: { minObstacles: 18, maxObstacles: 20, notes: "Maximum difficulty." },
  Other: { minObstacles: 0, maxObstacles: 0, notes: "Custom rules." }
}

// GEOMETRY HELPERS (Barn Hunt Specific)
export function checkSupport(newBale, allBales, ringWidth, ringHeight) {
  // 1. Boundary Check
  const safeMargin = newBale.rotation % 90 !== 0 ? 3.5 : 3
  if (newBale.x < 0 || newBale.x + safeMargin > ringWidth ||
      newBale.y < 0 || newBale.y + safeMargin > ringHeight) {
    return false
  }

  // 2. Ground Check
  if (newBale.layer === 1) return true

  // 3. Support Check (Gravity)
  const lowerLayer = allBales.filter(b => b.layer === newBale.layer - 1)
  const newW = newBale.rotation % 180 === 0 ? 3 : 1.5
  const newH = newBale.rotation % 180 === 0 ? 1.5 : 3

  return lowerLayer.some(baseBale => {
    const baseW = baseBale.rotation % 180 === 0 ? 3 : 1.5
    const baseH = baseBale.rotation % 180 === 0 ? 1.5 : 3

    const x_overlap = Math.max(0, Math.min(newBale.x + newW, baseBale.x + baseW) - Math.max(newBale.x, baseBale.x))
    const y_overlap = Math.max(0, Math.min(newBale.y + newH, baseBale.y + baseH) - Math.max(newBale.y, baseBale.y))
    
    return (x_overlap * y_overlap) >= 1 // Need 1 sq ft of support
  })
}