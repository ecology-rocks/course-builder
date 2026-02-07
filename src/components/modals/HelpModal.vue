<script setup>
defineProps(['show'])
defineEmits(['close'])
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2><span class="icon">ℹ️</span> Editor Help & Shortcuts</h2>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>

      <div class="modal-body">

        <div class="help-section">
          <h3>⌨️ Keyboard Shortcuts For Most Objects</h3>
          <table class="shortcut-table">
            <tbody>
              <tr>
                <td><kbd>Delete</kbd> / <kbd>Backspace</kbd></td>
                <td>Delete selected object(s)</td>
              </tr>
              <tr>
                <td><kbd>Ctrl</kbd> + <kbd>Z</kbd></td>
                <td>Undo last action</td>
              </tr>
              <tr>
                <td><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd><br /> or <kbd>Ctrl</kbd> + <kbd>Y</kbd>
                </td>
                <td>Redo last action</td>
              </tr>
              <tr>
                <td><kbd>Ctrl</kbd> + <kbd>A</kbd> / <kbd>C</kbd> / <kbd>V</kbd> / <kbd>X</kbd></td>
                <td>Select All / Copy / Paste / Cut selection</td>
              </tr>
              <tr>
                <td><kbd>Arrow Keys</kbd></td>
                <td>Nudge selection <strong>2 inches</strong></td>
              </tr>
              <tr>
                <td><kbd>Shift</kbd> + <kbd>Arrow Keys</kbd></td>
                <td>Nudge selection <strong>1 foot</strong></td>
              </tr>
              <tr>
                <td><kbd>R</kbd></td>
                <td>Rotate selection 15 degrees.</td>
              </tr>
              <tr>
                <td><kbd>Shift</kbd> + <kbd>R</kbd></td>
                <td>Rotate selection 45 degrees.</td>
              </tr>
              <tr>
                <td><kbd>M</kbd></td>
                <td>Start Measurement Tool</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="help-section">
          <h3>⌨️ Keyboard Shortcuts For Tool Selection</h3>
          <table class="shortcut-table">
            <tbody>
              <tr>
                <td><kbd>B</kbd></td>
                <td>Bale Placement Tool</td>
                <td><kbd>O</kbd></td>
                <td>Bale Orientation Tool</td>
                <td><kbd>L</kbd></td>
                <td>Bale Lean Tool</td>
              </tr>
              <tr>
                <td><kbd>H</kbd></td>
                <td>Hide Placement Tool</td>
                <td><kbd>U</kbd></td>
                <td>Hide Elevation Tool</td>
                <td><kbd>Y</kbd></td>
                <td>Hide Type Tool</td>
              </tr>
              <tr>
                <td><kbd>G</kbd></td>
                <td>Gate Tool</td>
                <td><kbd>D</kbd></td>
                <td>DC Mat Tool</td>
                <td><kbd>S</kbd></td>
                <td>Start Box Tool</td>
              </tr>
              <tr>
                <td><kbd>T</kbd></td>
                <td>Step Tool</td>
                <td><kbd>Q</kbd></td>
                <td>Board Line Tool</td>
                <td><kbd>W</kbd></td>
                <td>Board Box Tool</td>
              </tr>
              <tr>
                <td><kbd>Z</kbd></td>
                <td>Dead Zone Tool</td>
                <td><kbd>X</kbd></td>
                <td>Obstruction Tool</td>
                <td><kbd>N</kbd></td>
                <td>Note Tool</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="help-section">
          <h3>🛠 Generic Function Guide</h3>
          <ul class="tool-list">
            <li>
              <strong>🖱 Select Tool:</strong> Click to select. Shift+Click to select multiple. Drag on empty space to
              select all objects in an area.
            </li>
            <li>
              <strong>⚠️ Transformable and Rotateable Objects:</strong> After selecting the correct tool, click anywhere
              on the map to place a starter DC Mat, Step, Board, Dead Zone, or Obstruction. Click on the object after
              it's been placed to enter transformation mode. Click and drag any side of the box to resize. Use the point
              offset from the object to rotate it. Steps are placeable and rotateable, but not resizeable.
            </li>
            <li>
              <strong>🗑 Delete Tool:</strong> There are three ways to delete objects. You can select the object
              (highlights in blue) and then hit <kbd>Backspace</kbd> or <kbd>Delete</kbd>, you can use the Delete button
              that appears on the hover menu at the bottom, or, with the Delete Tool selected, you can click on an
              object directly.
            </li>
          </ul>
        </div>
        <div class="help-section">
          <h3>🛠 Specific Tool Guide</h3>
          <ul class="tool-list">
            <li>
              <strong>📦 Bales:</strong> Change <b>Orientation</b> (tall, pillar, or normal) by using the Orientation
              tool. Change <b>Lean</b> (arrows or blank) by
              using the Lean Tool.
            </li>
            <li>
              <strong>✏️ Full Boards and Edge Lines:</strong> For board edge lines, click and drag to place
              the two points of a line. For full boards, click once to place a starter board, and then click to select
              it and you can transform it to the correct size.
            </li>
            <li>
              <strong>🐀 Hide Tools:</strong> Right click to access context menu to alter hide type, elevation, or add hide number.
            </li>
            <li>
              <strong>🚧 Gate Tool:</strong> Click near a wall to place. Drag the gate to move it along the perimeter.
            </li>
            <li>
              <strong>📏 Measure Tool:</strong> Click to add points. Click again on the last placed point to finish the
              line. Measurements turn blue when selected, and from there, you can drag points to move where they're at,
              or delete it.
            </li>
          </ul>
        </div>

      </div>

      <div class="modal-footer">
        <button class="btn-primary" @click="$emit('close')">Got it!</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.modal-content {
  background: white;
  width: 550px;
  max-width: 90%;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 90vh;
}

.modal-header {
  padding: 15px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  gap: 10px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
}

.help-section {
  margin-bottom: 25px;
}

.help-section h3 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 1rem;
  color: #2c3e50;
  border-bottom: 2px solid #eee;
  padding-bottom: 5px;
}

.shortcut-table {
  width: 100%;
  border-collapse: collapse;
}

.shortcut-table td {
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 0.9rem;
}

.shortcut-table tr:last-child td {
  border-bottom: none;
}

kbd {
  background-color: #eee;
  border-radius: 3px;
  border: 1px solid #b4b4b4;
  box-shadow: 0 1px 1px rgba(0, 0, 0, .2), 0 2px 0 0 rgba(255, 255, 255, .7) inset;
  color: #333;
  display: inline-block;
  font-size: 0.85em;
  font-weight: 700;
  line-height: 1;
  padding: 2px 4px;
  white-space: nowrap;
}

.tool-list {
  padding-left: 20px;
  margin: 0;
}

.tool-list li {
  margin-bottom: 10px;
  font-size: 0.95rem;
  line-height: 1.4;
  padding-bottom: 10px;
}

.modal-footer {
  padding: 15px 20px;
  background: #f8f9fa;
  text-align: right;
  border-top: 1px solid #eee;
}

.btn-primary {
  background: #2196f3;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.btn-primary:hover {
  background: #1976d2;
}
</style>