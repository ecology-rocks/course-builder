<script setup>
import { useMapStore } from '@/stores/mapStore'

const props = defineProps({
  hideId: String,
  x: Number,
  y: Number
})

const emit = defineEmits(['close'])
const store = useMapStore()

const types = [
  { label: 'Rat', value: 'rat', color: '#ef5350' },
  { label: 'Litter', value: 'litter', color: '#ffee58' },
  { label: 'Empty', value: 'empty', color: '#fff' }
]

function setType(type) {
  store.updateHide(props.hideId, { type })
  emit('close')
}

function setNumber(num) {
  store.updateHide(props.hideId, { number: num })
  emit('close')
}
</script>

<template>
  <div class="hide-context-menu" :style="{ top: y + 'px', left: x + 'px' }">
    <div class="menu-header">Assign Hide Details</div>
    
    <div class="section-label">Type</div>
    <div class="type-row">
      <button v-for="t in types" :key="t.value" 
        @click="setType(t.value)"
        :style="{ borderLeft: `4px solid ${t.color}` }">
        {{ t.label }}
      </button>
    </div>

    <div class="section-label">Number</div>
    <div class="number-grid">
      <button v-for="n in 8" :key="n" @click="setNumber(n)">{{ n }}</button>
      <button class="clear-btn" @click="setNumber(null)">Clear</button>
    </div>
  </div>
</template>

<style scoped>
.hide-context-menu {
  position: fixed;
  z-index: 1000;
  background: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  padding: 12px;
  width: 160px;
}
.menu-header { font-weight: bold; margin-bottom: 8px; font-size: 12px; color: #666; }
.section-label { font-size: 10px; text-transform: uppercase; color: #999; margin: 8px 0 4px; }
.type-row button { width: 100%; text-align: left; margin-bottom: 4px; padding: 4px 8px; cursor: pointer; }
.number-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
.number-grid button { padding: 4px; cursor: pointer; }
.clear-btn { grid-column: span 4; margin-top: 4px; font-size: 11px; }
</style>