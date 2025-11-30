// CONSTANTS
export const CLASS_RULES = {
    Instinct: {
      minBales: 10, // Placeholder
      maxBales: 20,
      notes: "Tunnels: Simple straight tunnels allowed."
    },
    Novice: {
      minBales: 20, // Placeholder
      maxBales: 30,
      notes: "Required: One official Novice Tunnel (Version A/B). No high ledges."
    },
    Open: {
      minBales: 25, // Placeholder
      maxBales: 40,
      notes: "Tunnel: Min 1 turn (90°). Dark tunnel required."
    },
    Senior: {
      minBales: 35, // Based on example in rulebook
      maxBales: 55,
      notes: "Max Height: 3 bales. Tunnel: 2-3 turns. Jogs allowed."
    },
    Master: {
      minBales: 55, // Placeholder
      maxBales: 70,
      notes: "Optional: Distance Challenge. Max Height: 3 bales. Random rat numbering."
    },
    Crazy8s: {
      minBales: 40, 
      maxBales: 60,
      notes: "Tunnel: 2+ turns. Focus on speed and flow."
    },
    LineDrive: {
      minBales: 7,
      maxBales: 11,
      notes: "Specific Line Drive rules apply."
    },
    Other: {
      minBales: 0,
      maxBales: 0,
      notes: "Custom rules."
    }
  }

// GEOMETRY HELPERS
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