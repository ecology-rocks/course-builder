# Core Logic Reference

## Bale Manipulation

### Rotation (`rotateBale`)
**Location:** `../../src/stores/mapActions/useBales.js`

This function handles the rotation of individual bales. It enforces a 90-degree grid rotation.
* **Normalization:** Ensures rotation stays within 0-360 degrees.
* **Safety:** Automatically resets specific properties (like "lean") if they become invalid in the new orientation.

<<< ../../src/stores/mapActions/useBales.js#rotateBale