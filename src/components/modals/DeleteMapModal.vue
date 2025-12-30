<script setup>
defineEmits(['close', 'confirm'])
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <h3>Delete Map?</h3>
      <p>Are you sure you want to delete this map? This action cannot be undone.</p>
      <div class="modal-actions">
        <button @click="$emit('close')" class="btn-cancel">Cancel</button>
        <button @click="$emit('confirm')" class="btn-confirm-delete">Yes, Delete</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: white; padding: 25px; border-radius: 8px; width: 400px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.modal h3 { margin-top: 0; color: #d32f2f; }
.modal-actions { display: flex; gap: 10px; justify-content: center; margin-top: 20px; }
.btn-cancel { padding: 8px 16px; background: #eee; border: none; border-radius: 4px; cursor: pointer; }
.btn-confirm-delete { padding: 8px 16px; background: #d32f2f; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
.btn-confirm-delete:hover { background: #b71c1c; }
</style>