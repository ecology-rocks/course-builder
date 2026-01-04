---
title: useBales API
---

# useBales

The `useBales` composable manages the core logic for placing, moving, and validating hay bales on the grid.

## Physics & Validation

### `getBaleRect(bale)`
Calculates the absolute bounding box of a bale, accounting for its current `orientation` and `rotation`.

<<< ../../src/stores/mapActions/useBales.js#getBaleRect

### `hasSupport(newBale)`
Determines if a bale has enough physical support from the layer below it.

<<< ../../src/stores/mapActions/useBales.js#hasSupport

### `isValidPlacement(newBale)`
Checks if a bale is within the safe boundaries of the ring.

<<< ../../src/stores/mapActions/useBales.js#isValidPlacement

### `validateAllBales()`
Iterates through every bale in the state and updates their `supported` property.

<<< ../../src/stores/mapActions/useBales.js#validateAllBales

---

## State Actions

### `addBale(x, y)`
Creates a new bale at the specified coordinates on the current active layer.

<<< ../../src/stores/mapActions/useBales.js#addBale

### `removeBale(id)`
Deletes a bale from the map.

<<< ../../src/stores/mapActions/useBales.js#removeBale

### `updateBalePosition(id, newX, newY)`
Moves an existing bale to a new location.

<<< ../../src/stores/mapActions/useBales.js#updateBalePosition

### `rotateBale(id)`
Rotates a bale clockwise.

<<< ../../src/stores/mapActions/useBales.js#rotateBale

### `cycleOrientation(id)`
Cycles through the three possible bale orientations.

<<< ../../src/stores/mapActions/useBales.js#cycleOrientation

### `cycleLean(id)`
Toggles the lean direction for "Flat" bales.

<<< ../../src/stores/mapActions/useBales.js#cycleLean