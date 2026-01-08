import { 
  collection, addDoc, getDocs, query, where, 
  doc, updateDoc, deleteDoc, writeBatch 
} from 'firebase/firestore'
import { db } from '../../firebase'
import { mapService } from '../../services/mapService'
import { libraryService } from '../../services/libraryService'

/**
 * Persistence Logic
 * Handles Cloud Save/Load, Local JSON Import/Export, and Library interactions.
 * Refactored to use unified mapData state.
 */
export function useMapPersistence(state, userStore, notifications) {

  // --- HELPER: CONSTRUCT DATA OBJECT ---
  function getMapData() {
    // 1. Gather all dynamic objects (bales, hides, etc.) from the unified store
    // This automatically grabs everything defined in DEFAULT_MAP_DATA
    const coreData = JSON.parse(JSON.stringify(state.mapData.value))

    // 2. Attach Metadata & Settings (that live outside mapData)
    return {
      ...coreData,
      dimensions: state.ringDimensions.value,
      wallTypes: state.wallTypes ? state.wallTypes.value : {},
      gridStartCorner: state.gridStartCorner ? state.gridStartCorner.value : 'top-left',
      trialLocation: state.trialLocation.value || '',
      trialDay: state.trialDay.value || '',
      trialNumber: state.trialNumber.value || '',
      baleConfig: state.baleConfig.value,
      previousClassCount: state.previousClassCount.value,
    }
  }

  // --- SAVE TO CLOUD ---
  async function saveToCloud(isAutoSave = false, thumbnail = null) {
    // 1. Validation
    if (!userStore.user) {
      if (!isAutoSave) alert("Please log in to save.")
      return
    }
    
    if (!state.mapName.value || state.mapName.value === "Untitled Map") {
      if (!isAutoSave) alert("Please enter a custom name for your map.")
      return
    }

    // 2. Build Payload
    const mapData = {
      uid: userStore.user.uid,
      name: state.mapName.value.trim(),
      folderId: state.currentFolderId.value,
      isShared: state.isShared.value,
      level: state.classLevel.value, 
      sport: state.sport.value,
      thumbnail: thumbnail,
      updatedAt: new Date(),
      data: getMapData() // Use the helper
    }

    // 3. Send to Service
    try {
      if (state.currentMapId.value) {
        await mapService.updateMap(state.currentMapId.value, mapData)
        if (!isAutoSave) notifications.show("Map updated!")
      } else {
        if (!isAutoSave) {
          const newId = await mapService.createMap(mapData)
          state.currentMapId.value = newId
          notifications.show("Map saved!", 'success')
        }
      }
    } catch (e) {
      console.error(e)
      if (!isAutoSave) alert("Failed to save map.", 'error')
    }
  }

  // --- SAVE SELECTION TO LIBRARY ---
  async function saveSelectionToLibrary(name, thumbnail) {
    if (state.selection.value.length === 0) {
      alert("Nothing selected! Select items to save first.")
      return
    }
    if (!userStore.user) {
      alert("You must be logged in.")
      return
    }

    // Dynamic Filter: Iterates all array-type objects in mapData
    // automatically finding selected items regardless of type.
    const exportData = {}
    Object.keys(state.mapData.value).forEach(key => {
      const collection = state.mapData.value[key]
      if (Array.isArray(collection)) {
        const selectedItems = collection.filter(item => state.selection.value.includes(item.id))
        if (selectedItems.length > 0) {
          exportData[key] = selectedItems
        }
      }
    })

    try {
      await libraryService.addToLibrary(userStore.user, {
        name: name,
        sport: state.sport.value,
        type: 'mixed', 
        data: exportData,
        thumbnail: thumbnail
      })
      notifications.show(`Saved "${name}" to Library!`, 'success')
    } catch (e) {
      console.error(e)
      alert(e.message) 
    }
  }

  // --- EXPORT TO JSON (FILE) ---
  function exportMapToJSON() {
    const data = { 
      version: 1, 
      name: state.mapName.value, 
      level: state.classLevel.value, 
      sport: state.sport.value, 
      isShared: state.isShared.value, 
      ...getMapData()
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${state.mapName.value.replace(/\s+/g, '_')}.json`
    link.click()
  }

  // --- IMPORT FROM JSON (FILE) ---
  function importMapFromJSON(jsonString) { 
    try { 
      importMapFromData(JSON.parse(jsonString)) 
    } catch (e) { 
      notifications.show("Failed to parse map file.", 'error')
      console.error(e) 
    } 
  }

  // --- IMPORT DATA (CORE) ---
  function importMapFromData(data) {
    state.reset() 
    
    state.mapName.value = data.name || "Imported Map"
    state.classLevel.value = data.level || 'Novice'
    state.sport.value = data.sport || 'barnhunt'
    
    // Handle "nested" data (from DB saves) vs "flat" data (from JSON exports)
    const source = data.data || data

    state.ringDimensions.value = source.dimensions || { width: 24, height: 24 }
    
    // Dynamic Load of Map Objects
    // This loop ensures we only try to load keys that actually exist in our schema
    Object.keys(state.mapData.value).forEach(key => {
      if (source[key] !== undefined) {
         state.mapData.value[key] = source[key]
      }
    })

    // Load Metadata
    if (state.wallTypes && source.wallTypes) state.wallTypes.value = source.wallTypes
    if (state.gridStartCorner) state.gridStartCorner.value = source.gridStartCorner || 'top-left'
    if (state.trialLocation) state.trialLocation.value = source.trialLocation || ''
    if (state.trialDay) state.trialDay.value = source.trialDay || ''
    if (state.trialNumber) state.trialNumber.value = source.trialNumber || ''
    if (state.previousClassCount) state.previousClassCount.value = source.previousClassCount || 0
    
    if (state.baleConfig) { 
       const def = { length: 3, width: 1.5, height: 1 }
       state.baleConfig.value = source.baleConfig || def
    }

    // Comparison Logic
    state.previousBales.value = JSON.parse(JSON.stringify(source.bales || []))
    state.comparisonMapName.value = "Original File"
    
    if (state.validateAllBales) state.validateAllBales()
  }

  // --- LOAD FROM CLOUD DATA ---
  function loadMapFromData(id, data) {
    // Re-use import logic for the heavy lifting
    importMapFromData(data) 
    
    // Overwrite Cloud-specific fields
    state.currentMapId.value = id
    state.isShared.value = data.isShared || false
    state.currentFolderId.value = data.folderId || null
    state.comparisonMapName.value = "Original Save"
  }

  // --- MERGE (Combine files) ---
  function mergeMapFromJSON(jsonString) {
    state.snapshot()
    try {
      const data = JSON.parse(jsonString)
      const newItems = []
      const source = data.data || data
      
      // Dynamic Merge
      Object.keys(state.mapData.value).forEach(key => {
        // Only merge arrays (collections). Ignore singletons like startBox.
        if (Array.isArray(state.mapData.value[key]) && Array.isArray(source[key])) {
           source[key].forEach(item => {
             const newId = crypto.randomUUID()
             const newItem = { ...item, id: newId }
             state.mapData.value[key].push(newItem)
             newItems.push(newId)
           })
        }
      })
      
      // Select the new items
      state.selection.value = newItems
      
      if (state.validateAllBales) state.validateAllBales()
      
      notifications.show("Library item loaded successfully!", 'success')
      
    } catch (e) {
      console.error(e)
      notifications.show("Failed to merge file. Invalid JSON.", 'error')
    }
  }

  // --- CLOUD LIST MANAGEMENT (Unchanged) ---
  async function loadUserMaps() {
     if (!userStore.user) return
     const q = query(collection(db, "maps"), where("uid", "==", userStore.user.uid))
     const snapshot = await getDocs(q)
     state.savedMaps.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
     return state.savedMaps.value
  }

  async function deleteMap(id) { 
    try { 
      await deleteDoc(doc(db, "maps", id))
      if (state.currentMapId.value === id) state.currentMapId.value = null 
      await loadUserMaps()
      notifications.show("Map deleted.", 'success')
    } catch (e) { 
      console.error("Delete failed", e)
      notifications.show("Failed to delete map.", 'error') 
    } 
  }

  async function renameMap(id, newName) { 
    try { 
      await updateDoc(doc(db, "maps", id), { name: newName })
      if (state.currentMapId.value === id) state.mapName.value = newName 
      await loadUserMaps()
    } catch (e) { 
      console.error(e) 
    } 
  }

  async function moveMap(mapId, fid) { 
    await updateDoc(doc(db, "maps", mapId), { folderId: fid })
    if (state.currentMapId.value === mapId) state.currentFolderId.value = fid 
    await loadUserMaps()
  }

  // --- FOLDER MANAGEMENT (Unchanged) ---
  async function createFolder(name) { 
    if (!userStore.user) return
    await addDoc(collection(db, "folders"), { uid: userStore.user.uid, name, createdAt: new Date() })
    await loadUserFolders() 
  }

  async function loadUserFolders() { 
    if (!userStore.user) return
    const q = query(collection(db, "folders"), where("uid", "==", userStore.user.uid))
    state.folders.value = (await getDocs(q)).docs.map(doc => ({ id: doc.id, ...doc.data() })) 
  }

  async function deleteFolder(fid) { 
    if (!confirm("Delete folder? Maps inside will be moved to 'Unorganized'.")) return
    
    const batch = writeBatch(db)
    const mapQuery = query(collection(db, "maps"), where("folderId", "==", fid))
    const mapDocs = await getDocs(mapQuery)
    
    mapDocs.docs.forEach(d => {
      batch.update(d.ref, { folderId: null })
    })
    
    batch.delete(doc(db, "folders", fid))
    
    await batch.commit()
    await loadUserFolders()
    await loadUserMaps() 
  }

  return {
    saveToCloud,
    saveSelectionToLibrary,
    exportMapToJSON,
    importMapFromJSON,
    importMapFromData,
    loadMapFromData,
    mergeMapFromJSON,
    loadUserMaps,
    deleteMap,
    renameMap,
    moveMap,
    createFolder,
    loadUserFolders,
    deleteFolder
  }
}