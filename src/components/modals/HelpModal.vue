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
          <h3>⌨️ General Keyboard Shortcuts</h3>
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
                <td>Select All / Copy / Paste / Cut</td>
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
                <td>Rotate selection <strong>15°</strong> </td>
              </tr>
              <tr>
                <td><kbd>Shift</kbd> + <kbd>R</kbd></td>
                <td>Rotate selection <strong>45°</strong></td>
              </tr>
              <tr>
                <td><kbd>M</kbd></td>
                <td>Start Measurement Tool</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="help-section">
          <h3>🖱️ Context Menus & Selection Bar</h3>
          <ul class="tool-list">
            <li>
              <strong>Bottom Selection Bar:</strong> When you select an object, a floating bar appears at the bottom of the screen. If the bottom bar is in your way, just scroll the map editor view so you can see it. 
            </li>
            <li>
              <strong>Right-Click Menu:</strong> Right-click most objects to open a Context Menu. This provides access to advanced options like <strong>Customize Style</strong> (colors, borders) and specific object properties.
            </li>
          </ul>
        </div>

        <div class="help-section">
          <h3>🛠 Object Specifics</h3>
          <ul class="tool-list">
            <li>
              <strong>📦 Bales:</strong>
              <ul class="sub-list">
                 <li><strong>Orientation:</strong> Use the bottom bar to toggle Flat, Tall, or Pillar.</li>
                 <li><strong>Lean:</strong> Use the arrow buttons in the bottom bar to lean bales Left or Right.</li>
                 <li><strong>Anchors:</strong> You can "Anchor" a bale to lock it for grid building. <em>Requirement: Must be Layer 1, Flat, and aligned with the grid (0°/90°).</em></li>
              </ul>
            </li>
            <li>
              <strong>🐀 Hides:</strong>
              <ul class="sub-list">
                <li><strong>Type:</strong> Toggle between Rat (Red), Litter (Yellow), and Empty (White).</li>
                <li><strong>Elevation:</strong> Toggle "Regular" vs "Under". <strong>"Under"</strong> hides appear with a <span style="border-bottom: 2px dashed #666;">dashed border</span>.</li>
                <li><strong>Numbering:</strong> You can assign a specific hide number directly from the selection bar.</li>
              </ul>
            </li>
            <li>
              <strong>✏️ Boards & Tunnels:</strong>
              <ul class="sub-list">
                <li><strong>Edge Lines:</strong> Click and drag to place the two endpoints of a line.</li>
                <li><strong>Tunnel Boards:</strong> Click once to place a tunnel board. Click it again to select and resize it. Use the Context Menu to customize styles.</li>
              </ul>
            </li>
            <li>
              <strong>📏 Steps, Mats & Zones:</strong>
              These objects can be rotated and resized. Use the Right-Click menu to change their colors or styles.
            </li>
          </ul>
        </div>

        <div class="help-section">
          <h3>⌨️ Tool Quick-Keys</h3>
          <table class="shortcut-table">
            <tbody>
              <tr>
                <td><kbd>B</kbd></td>
                <td>Bale Tool</td>
                <td><kbd>O</kbd></td>
                <td>Orientation Tool</td>
                <td><kbd>L</kbd></td>
                <td>Bale Lean Tool</td>
              </tr>
              <tr>
                <td><kbd>H</kbd></td>
                <td>Hide Tool</td>
                <td><kbd>Y</kbd></td>
                <td>Hide Type Tool</td>
                <td><kbd>U</kbd></td>
                <td>Hide Elevation Tool</td>
              </tr>
              <tr>
                <td><kbd>G</kbd></td>
                <td>Gate Tool</td>
                <td><kbd>D</kbd></td>
                <td>DC Mat Tool</td>
                <td><kbd>S</kbd></td>
                <td>Start Box</td>
              </tr>
              <tr>
                <td><kbd>T</kbd></td>
                <td>Step Tool</td>
                <td><kbd>Q</kbd></td>
                <td>Board Line</td>
                <td><kbd>W</kbd></td>
                <td>Tunnel Box</td>
              </tr>
              <tr>
                <td><kbd>Z</kbd></td>
                <td>Dead Zone</td>
                <td><kbd>X</kbd></td>
                <td>Obstruction</td>
                <td><kbd>N</kbd></td>
                <td>Note Tool</td>
              </tr>
            </tbody>
          </table>
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
  width: 600px;
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
}

.sub-list {
  margin-top: 5px;
  padding-left: 20px;
  list-style-type: circle;
}

.sub-list li {
  margin-bottom: 5px;
  font-size: 0.9rem;
  color: #555;
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