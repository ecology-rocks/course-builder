// src/stores/mapActions/useNotes.js
import { ref } from 'vue';

export function useNotes(state, snapshot) {
const editingNoteId = ref(null);

  function addNote(x, y) {
    state.notes.value.push({
      id: crypto.randomUUID(),
      x, 
      y, 
      width: 4, // Default width (6ft)
      height: 2, // Default height (3ft)
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

  function openNoteEditor(id) {
    editingNoteId.value = id;
  }

  function closeNoteEditor() {
    editingNoteId.value = null;
  }

  return { addNote, updateNote, removeNote, editingNoteId, openNoteEditor, closeNoteEditor }
}