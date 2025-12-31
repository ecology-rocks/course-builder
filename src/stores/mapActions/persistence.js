import { 
  collection, addDoc, getDocs, query, where, 
  doc, updateDoc, deleteDoc, writeBatch 
} from 'firebase/firestore'
import { db } from '../../firebase'
import { mapService } from '../../services/mapService'
import { libraryService } from '../../services/libraryService'

/**
 * Extracts persistence logic (Save/Load/Import/Export) from the main store.
 * * @param {Object} state - An object containing all the Refs from the main store (bales, boardEdges, etc.)
 * @param {Object} userStore - The user store instance
 * @param {Object} notifications - A helper to show notifications ({ show: (msg, type) => ... })
 */
export function useMapPersistence(state, userStore, notifications) {

  // --- HELPER: CONSTRUCT DATA OBJECT ---
  // Gathers the current state of the map into a clean object for saving/exporting.
  function getMapData() {
    return {
      dimensions: state.ringDimensions.value,
      bales: state.bales.value,
      agilityObstacles: state.agilityObstacles.value,
      scentWorkObjects: state.scentWorkObjects.value,
      dcMats: state.dcMats.value,
      masterBlinds: state.masterBlinds.value,
      boardEdges: state.boardEdges.value,
      previousClassCount: state.previousClassCount.value,
      isShared: state.isShared.value,
      hides: state.hides.value,
      startBox: state.startBox.value,
      wallTypes: state.wallTypes ? state.wallTypes.value : {},
      gridStartCorner: state.gridStartCorner.value,
      trialLocation: state.trialLocation.value || '',
      trialDay: state.trialDay.value || '',
      trialNumber: state.trialNumber.value || '',
      baleConfig: state.baleConfig.value,
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
      data: getMapData()
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
    // 1. Validation
    if (state.selection.value.length === 0) {
      alert("Nothing selected! Select items to save first.")
      return
    }
    if (!userStore.user) {
      alert("You must be logged in.")
      return
    }

    // 2. Extract Data (Filter only selected items)
    const exportData = {
      bales: state.bales.value.filter(b => state.selection.value.includes(b.id)),
      boardEdges: state.boardEdges.value.filter(b => state.selection.value.includes(b.id)),
      dcMats: state.dcMats.value.filter(m => state.selection.value.includes(m.id)),
    }

    // 3. Send to Service
    try {
      await libraryService.addToLibrary(userStore.user, {
        name: name,
        sport: state.sport.value,
        type: 'tunnel',
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
      dcMats: state.dcMats.value, 
      dimensions: state.ringDimensions.value, 
      bales: state.bales.value, 
      agilityObstacles: state.agilityObstacles.value, 
      scentWorkObjects: state.scentWorkObjects.value, 
      hides: state.hides.value, 
      isShared: state.isShared.value, 
      masterBlinds: state.masterBlinds.value, 
      boardEdges: state.boardEdges.value, 
      previousClassCount: state.previousClassCount.value 
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
    state.reset() // Must ensure 'reset' is passed in the state object
    
    state.mapName.value = data.name || "Imported Map"
    state.classLevel.value = data.level || 'Novice'
    state.sport.value = data.sport || 'barnhunt'
    state.ringDimensions.value = data.data?.dimensions || data.dimensions || { width: 24, height: 24 }
    if (state.gridStartCorner) {
       state.gridStartCorner.value = data.data?.gridStartCorner || data.gridStartCorner || 'top-left'
    }
    state.bales.value = data.data?.bales || data.bales || []
    state.agilityObstacles.value = data.data?.agilityObstacles || data.agilityObstacles || []
    state.scentWorkObjects.value = data.data?.scentWorkObjects || data.scentWorkObjects || []
    state.dcMats.value = data.data?.dcMats || data.dcMats || []
    state.boardEdges.value = data.data?.boardEdges || data.boardEdges || []
    state.hides.value = data.data?.hides || data.hides || []
    state.startBox.value = data.data?.startBox || null
    if (state.trialLocation) state.trialLocation.value = data.data?.trialLocation || data.trialLocation || ''
    if (state.trialDay) state.trialDay.value = data.data?.trialDay || data.trialDay || ''
    if (state.trialNumber) state.trialNumber.value = data.data?.trialNumber || data.trialNumber || ''
    if (state.baleConfig) { 
       const def = { length: 3, width: 1.5, height: 1 }
       state.baleConfig.value = data.data?.baleConfig || data.baleConfig || def
    }
    if (state.validateAllBales) state.validateAllBales()
  }

  // --- LOAD FROM CLOUD DATA ---
  function loadMapFromData(id, data) {
    state.reset()
    state.currentMapId.value = id
    state.mapName.value = data.name
    state.classLevel.value = data.level || 'Novice'
    state.sport.value = data.sport || 'barnhunt'
    state.isShared.value = data.isShared || false
    state.currentFolderId.value = data.folderId || null
    
    // --- FIX: DEFINE mapData AT THE VERY TOP ---
    const mapData = data.data || data 
    // -------------------------------------------

    // Now it is safe to access mapData for everything below
    state.ringDimensions.value = mapData.dimensions || { width: 24, height: 24 }
    state.bales.value = mapData.bales || []
    state.agilityObstacles.value = mapData.agilityObstacles || []
    state.scentWorkObjects.value = mapData.scentWorkObjects || []
    state.dcMats.value = mapData.dcMats || []
    state.boardEdges.value = mapData.boardEdges || []
    state.hides.value = mapData.hides || []
    state.masterBlinds.value = data.masterBlinds || []
    state.startBox.value = mapData.startBox || null
    state.previousClassCount.value = mapData.previousClassCount || 0
    
    if (state.wallTypes && mapData.wallTypes) state.wallTypes.value = mapData.wallTypes
    if (state.gridStartCorner) state.gridStartCorner.value = mapData.gridStartCorner || 'top-left'
    
    // Trial Info
    if (state.trialLocation) state.trialLocation.value = mapData.trialLocation || ''
    if (state.trialDay) state.trialDay.value = mapData.trialDay || ''
    if (state.trialNumber) state.trialNumber.value = mapData.trialNumber || ''

    // Bale Config
    if (state.baleConfig) {
       const def = { length: 3, width: 1.5, height: 1 }
       state.baleConfig.value = mapData.baleConfig || def
    }
    
    // Run Validation
    if (state.validateAllBales) state.validateAllBales()
  }

  // --- MERGE (Combine files) ---
  function mergeMapFromJSON(jsonString) {
    state.snapshot()
    try {
      const data = JSON.parse(jsonString)
      const newItems = []
      
      // 1. Merge Bales
      if (data.bales) {
        data.bales.forEach(b => {
          const newId = crypto.randomUUID()
          const newBale = { ...b, id: newId }
          state.bales.value.push(newBale)
          newItems.push(newId)
        })
      }

      // 2. Merge Boards
      if (data.boardEdges) {
        data.boardEdges.forEach(b => {
          const newId = crypto.randomUUID()
          const newBoard = { ...b, id: newId }
          state.boardEdges.value.push(newBoard)
          newItems.push(newId)
        })
      }

      // 3. Merge DC Mats
      if (data.dcMats) {
        data.dcMats.forEach(m => {
          const newId = crypto.randomUUID()
          const newMat = { ...m, id: newId }
          state.dcMats.value.push(newMat)
          newItems.push(newId)
        })
      }
      
      // 4. Select the new items
      state.selection.value = newItems
      
      state.validateAllBales()
      
      // Force reactivity
      state.bales.value = [...state.bales.value]
      state.boardEdges.value = [...state.boardEdges.value]
      
      notifications.show("Library item loaded successfully!", 'success')
      
    } catch (e) {
      console.error(e)
      notifications.show("Failed to merge file. Invalid JSON.", 'error')
    }
  }

  // --- CLOUD LIST MANAGEMENT ---
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
      // If we deleted the currently open map, clear the ID so we don't try to update it later
      if (state.currentMapId.value === id) state.currentMapId.value = null 
      // Refresh list
      
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

  // --- FOLDER MANAGEMENT ---
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
    
    // 1. Move maps out of folder
    const batch = writeBatch(db)
    const mapQuery = query(collection(db, "maps"), where("folderId", "==", fid))
    const mapDocs = await getDocs(mapQuery)
    
    mapDocs.docs.forEach(d => {
      batch.update(d.ref, { folderId: null })
    })
    
    // 2. Delete folder
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