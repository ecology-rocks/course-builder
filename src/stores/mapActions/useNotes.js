// src/stores/mapActions/useNotes.js
export function useNotes(state) {
  function addNote(x, y) {
    state.notes.value.push({
      id: crypto.randomUUID(),
      x, 
      y, 
      width: 6, // Default width (6ft)
      height: 3, // Default height (3ft)
      text: "Double-click to edit",
      rotation: 0,
      fontSize: 14
    })
  }

  function updateNote(id, attrs) {
    const n = state.notes.value.find(i => i.id === id)
    if (n) {
      Object.assign(n, attrs)
    }
  }

  function removeNote(id) {
    state.notes.value = state.notes.value.filter(n => n.id !== id)
  }

  return { addNote, updateNote, removeNote }
}