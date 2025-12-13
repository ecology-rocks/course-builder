import { 
  collection, addDoc, getDocs, query, where, 
  doc, updateDoc, deleteDoc, writeBatch 
} from 'firebase/firestore'
import { db } from '../firebase'

const MAPS_COLLECTION = 'maps'
const FOLDERS_COLLECTION = 'folders'

export const mapService = {
  async fetchUserMaps(uid) {
    const q = query(collection(db, MAPS_COLLECTION), where("uid", "==", uid))
    const snap = await getDocs(q)
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  },

  async createMap(mapData) {
    // Ensure dates are objects, not timestamps, if creating fresh
    const payload = { ...mapData, createdAt: new Date(), updatedAt: new Date() }
    const docRef = await addDoc(collection(db, MAPS_COLLECTION), payload)
    return docRef.id
  },

  async updateMap(mapId, mapData) {
    const mapRef = doc(db, MAPS_COLLECTION, mapId)
    await updateDoc(mapRef, { ...mapData, updatedAt: new Date() })
  },

  async deleteMap(mapId) {
    await deleteDoc(doc(db, MAPS_COLLECTION, mapId))
  },

  async fetchFolders(uid) {
    const q = query(collection(db, FOLDERS_COLLECTION), where("uid", "==", uid))
    const snap = await getDocs(q)
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  },

  async createFolder(uid, name) {
    await addDoc(collection(db, FOLDERS_COLLECTION), { uid, name, createdAt: new Date() })
  },

  async deleteFolder(folderId) {
    // Batch write to clear folderIds from maps before deleting folder
    const batch = writeBatch(db)
    
    // 1. Find maps in folder
    const q = query(collection(db, MAPS_COLLECTION), where("folderId", "==", folderId))
    const maps = await getDocs(q)
    
    // 2. Remove folderId from them
    maps.forEach(d => batch.update(d.ref, { folderId: null }))
    
    // 3. Delete folder
    batch.delete(doc(db, FOLDERS_COLLECTION, folderId))
    
    await batch.commit()
  }
}