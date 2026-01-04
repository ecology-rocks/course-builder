import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMapStore = defineStore('map', () => {
  // 1. Define the state your components expect
  const ringDimensions = ref({ width: 20, height: 20 })
  const bales = ref([])
  const sport = ref('barnhunt')
  const scale = ref(20)

  // 2. Add dummy actions so components don't crash if they try to save
  function save() { console.log('Mock Save') }
  function reset() { console.log('Mock Reset') }

  return {
    ringDimensions,
    bales,
    sport,
    scale,
    save,
    reset
  }
})