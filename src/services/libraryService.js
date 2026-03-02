import { db } from '@/firebase'
import { collection, addDoc, getDocs, query, orderBy, where, deleteDoc, doc, getDoc } from 'firebase/firestore'

const ADMIN_EMAIL = 'reallyjustsam@gmail.com'

export const libraryService = {
  async getLibraryItems(sport, userEmail) {
    try {
      // 1. Fetch public items
      const publicQuery = query(
        collection(db, "library_items"), 
        where("sport", "==", sport),
        where("isPublic", "==", true)
      )
      const publicSnap = await getDocs(publicQuery)
      const publicItems = publicSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      // 2. Fetch user's private items
      let privateItems = []
      if (userEmail) {
        const privateQuery = query(
          collection(db, "library_items"), 
          where("sport", "==", sport),
          where("createdBy", "==", userEmail),
          where("isPublic", "==", false)
        )
        const privateSnap = await getDocs(privateQuery)
        privateItems = privateSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      }

      // Merge and sort descending by creation date
      const allItems = [...publicItems, ...privateItems]
      return allItems.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0
        return timeB - timeA
      })
    } catch (e) {
      console.error("Error fetching library:", e)
      return []
    }
  },

  async addToLibrary(user, itemData) {
    if (!user) throw new Error("Must be logged in to save to library.")

    const payload = {
      name: itemData.name,
      sport: itemData.sport,
      thumbnail: itemData.thumbnail || null,
      type: itemData.type || 'tunnel',
      data: itemData.data,
      createdAt: new Date(),
      createdBy: user.email,
      isPublic: itemData.isPublic || false
    }

    const docRef = await addDoc(collection(db, "library_items"), payload)
    return docRef.id
  },

  async deleteItem(user, itemId) {
    if (!user) throw new Error("Must be logged in.")

    if (user.email !== ADMIN_EMAIL) {
      const itemRef = doc(db, "library_items", itemId)
      const itemSnap = await getDoc(itemRef)
      if (itemSnap.exists() && itemSnap.data().createdBy !== user.email) {
        throw new Error("Unauthorized: You can only delete your own items.")
      }
    }
    await deleteDoc(doc(db, "library_items", itemId))
  }
}