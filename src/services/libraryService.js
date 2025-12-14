// src/services/libraryService.js
import { db } from '../firebase'
import { collection, addDoc, getDocs, query, orderBy, where, deleteDoc, doc } from 'firebase/firestore'

const ADMIN_EMAIL = 'reallyjustsam@gmail.com'

export const libraryService = {
  // 1. GET ALL ITEMS (For everyone)
  async getLibraryItems(sport) {
    try {
      // Fetch items for the specific sport (or all if not specified)
      const q = query(
        collection(db, "library_items"), 
        where("sport", "==", sport),
        orderBy("createdAt", "desc")
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (e) {
      console.error("Error fetching library:", e)
      return []
    }
  },

  // 2. ADD ITEM (Admin Only)
  async addToLibrary(user, itemData) {
    if (!user || user.email !== ADMIN_EMAIL) {
      throw new Error("Unauthorized: Only Sam can add to the library.")
    }

    // Clean data before saving
    const payload = {
      name: itemData.name,
      sport: itemData.sport,
      type: itemData.type || 'tunnel', // 'tunnel', 'sequence', etc.
      data: itemData.data, // The JSON blob of bales/boards
      createdAt: new Date(),
      createdBy: user.email
    }

    const docRef = await addDoc(collection(db, "library_items"), payload)
    return docRef.id
  },

  // 3. DELETE ITEM (Admin Only)
  async deleteItem(user, itemId) {
    if (!user || user.email !== ADMIN_EMAIL) {
      throw new Error("Unauthorized.")
    }
    await deleteDoc(doc(db, "library_items", itemId))
  }
}