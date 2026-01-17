import { 
  collection, addDoc, getDocs, getDoc, query, where, 
  doc, updateDoc, deleteDoc, writeBatch, serverTimestamp 
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
// --- HELPER: CONSTRUCT DATA OBJECT ---
  function getMapData() {
    const coreData = JSON.parse(JSON.stringify(state.mapData.value))

    // [FIX] Recursive cleaner to enforce 4-decimal precision
    // This prevents floating-point drift (e.g. 10.166666... becoming 10.166665)
    // which causes items to "jump" grid lines upon reload.
    const cleanObj = (obj) => {
      Object.keys(obj).forEach(key => {
        const val = obj[key]
        if (val === null || val === undefined) {
          delete obj[key]
        } else if (typeof val === 'number') {
          // Round to 4 decimals (Supports 1/6th grid ≈ 0.1667)
          obj[key] = Math.round(val * 10000) / 10000
        } else if (typeof val === 'object' && !Array.isArray(val)) {
          cleanObj(val)
        } else if (Array.isArray(val)) {
          val.forEach(item => {
            if (typeof item === 'object') cleanObj(item)
          })
        }
      })
    }
    
    cleanObj(coreData)

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
    if (!userStore.user) {
      if (!isAutoSave) alert("Please log in to save.")
      return
    }
    
    if (!state.mapName.value || state.mapName.value === "Untitled Map") {
      if (!isAutoSave) alert("Please enter a custom name for your map.")
      return
    }

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
      if (!isAutoSave) alert("Failed to save map.")
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
    
    const source = data.data || data

    state.ringDimensions.value = source.dimensions || { width: 24, height: 24 }
    
    Object.keys(state.mapData.value).forEach(key => {
      if (source[key] !== undefined) {
         state.mapData.value[key] = source[key]
      }
    })

    // Fix 1: "Deadzones" often change names (zones vs deadZones)
    if (source.deadZones && Array.isArray(source.deadZones)) {
      state.mapData.value.zones = source.deadZones
    }
    
    // Fix 2: "Steps" (verify if old maps used singular 'step')
    if (source.step && Array.isArray(source.step)) {
      state.mapData.value.steps = source.step
    }

    // Fix 3: Ensure they are initialized as arrays if missing
    if (!state.mapData.value.zones) state.mapData.value.zones = []
    if (!state.mapData.value.steps) state.mapData.value.steps = []
    
    // [FIX] Ensure Singletons have IDs (StartBox, Gate)
    if (state.mapData.value.startBox && !state.mapData.value.startBox.id) {
      state.mapData.value.startBox.id = crypto.randomUUID()
    }
    if (state.mapData.value.gate && !state.mapData.value.gate.id) {
      state.mapData.value.gate.id = crypto.randomUUID()
    }

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

    state.previousBales.value = JSON.parse(JSON.stringify(source.bales || []))
    state.comparisonMapName.value = "Original File"
    
    if (state.validateAllBales) state.validateAllBales()
  }

  // --- LOAD FROM CLOUD DATA ---
  function loadMapFromData(id, data) {
    importMapFromData(data) 
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

      // 1. Normalize Source (Apply Migration Fixes to source before merging)
      if (source.deadZones) source.zones = source.deadZones
      if (source.step) source.steps = source.step
      
      Object.keys(state.mapData.value).forEach(key => {
        if (Array.isArray(state.mapData.value[key]) && Array.isArray(source[key])) {
           source[key].forEach(item => {
             const newId = crypto.randomUUID()
             const newItem = { ...item, id: newId }
             state.mapData.value[key].push(newItem)
             newItems.push(newId)
           })
        }
      })
      
      state.selection.value = newItems
      if (state.validateAllBales) state.validateAllBales()
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

async function createFolder(name, parentId = null) {
    if (!userStore.user) return

    try {
      // Call the updated service
      await mapService.createFolder(userStore.user.uid, name, parentId)
      await loadUserFolders()
    } catch (error) {
      console.error("Error creating folder:", error)
      notifications.show("Failed to create folder", "error")
    }
  }

  // [NEW] Rename
  async function renameFolder(id, newName) {
    try {
      await mapService.updateFolder(id, { name: newName })
      await loadUserFolders() // Refresh list
    } catch (e) {
      console.error(e)
      notifications.show("Failed to rename folder", "error")
    }
  }

  // [NEW] Move Folder (Nesting)
  async function moveFolder(id, targetParentId) {
    // Prevent dropping a folder into itself
    if (id === targetParentId) return 

    try {
      await mapService.updateFolder(id, { parentId: targetParentId })
      await loadUserFolders()
    } catch (e) {
      console.error(e)
      notifications.show("Failed to move folder", "error")
    }
  }

  async function loadUserFolders() { 
    if (!userStore.user) return
    const q = query(collection(db, "folders"), where("uid", "==", userStore.user.uid))
    state.folders.value = (await getDocs(q)).docs.map(doc => ({ id: doc.id, ...doc.data() })) 
  }

  // --- DEBUGGING VERSION OF DELETE FOLDER ---
  async function deleteFolder(fid) { 
    if (!confirm("Delete folder? Maps inside will be moved to 'Unorganized'.")) return
    
    try {
      // 1. Debugging: Check the folder document first
      const folderRef = doc(db, "folders", fid)
      const folderSnap = await getDoc(folderRef)
      
      if (!folderSnap.exists()) {
        console.error("Folder does not exist in DB")
        return
      }

      const folderData = folderSnap.data()
      console.log("--- DEBUGGING DELETE ---")
      console.log("My User ID:", userStore.user.uid)
      console.log("Folder Owner ID:", folderData.uid)
      
      if (folderData.uid !== userStore.user.uid) {
        alert(`PERMISSION DENIED: This folder belongs to ${folderData.uid || 'NOBODY'}, but you are ${userStore.user.uid}.`)
        return
      }

      // 2. Proceed with Batch Operation
      const batch = writeBatch(db)
      const mapQuery = query(
  collection(db, "maps"), 
  where("folderId", "==", fid), 
  where("uid", "==", userStore.user.uid)
)
      const mapDocs = await getDocs(mapQuery)
      
      mapDocs.docs.forEach(d => {
        const mapData = d.data()
        // Only move maps we actually own
        if (mapData.uid === userStore.user.uid) {
           batch.update(d.ref, { folderId: null })
        }
      })
      
const childFolderQuery = query(
        collection(db, "folders"),
        where("parentId", "==", fid),
        where("uid", "==", userStore.user.uid)
      )
      const childFolderDocs = await getDocs(childFolderQuery)
      
      childFolderDocs.docs.forEach(d => {
        batch.update(d.ref, { parentId: null })
      })

      batch.delete(folderRef)
      
      await batch.commit()
      await loadUserFolders()
      await loadUserMaps() 
      notifications.show("Folder deleted.", "success")

    } catch(e) {
      console.error("Firebase Error:", e)
      notifications.show("Error deleting folder: " + e.message, "error")
    }
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
    deleteFolder,
    renameFolder,
    moveFolder,
  }
}