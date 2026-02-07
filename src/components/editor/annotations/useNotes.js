import { ref } from 'vue';

export function useNotes(state, snapshot) {
  // Menu State
  const activeNoteMenu = ref(null); 

  function openNoteMenu(id, x, y) {
    activeNoteMenu.value = { id, x, y };
  }

  function closeNoteMenu() {
    activeNoteMenu.value = null;
  }

  function addNote(x, y) {
    state.notes.value.push({
      id: crypto.randomUUID(),
      x, 
      y, 
      width: 4, 
      height: 2, 
      rotation: 0,
      // All editable properties now live in 'custom'
      custom: {
        textValue: "New Note",
        fillColor: 'transparent',
        strokeColor: '#333333',
        textColor: '#000000',
        fontSize: 14,
        borderStyle: 'solid'
      }
    })
  }

  function updateNote(id, attrs) {
    const n = state.notes.value.find(i => i.id === id)
    if (n) {
      Object.assign(n, attrs)
      if (snapshot) snapshot()
    }
  }

  function removeNote(id) {
    state.notes.value = state.notes.value.filter(n => n.id !== id)
    if (activeNoteMenu.value?.id === id) {
      activeNoteMenu.value = null;
    }
  }

  return { 
    addNote, 
    updateNote, 
    removeNote, 
    // Exports for Context Menu
    activeNoteMenu,
    openNoteMenu,
    closeNoteMenu
  }
}