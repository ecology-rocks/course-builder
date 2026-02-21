// src/stores/adminStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { mapService } from '@/services/mapService'; //
import { useUserStore } from './userStore'; //
import { db } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export const useAdminStore = defineStore('admin', () => {
  const userStore = useUserStore();
  const targetUserMaps = ref([]);
  const loading = ref(false);

  // Fetch maps belonging to the user you are troubleshooting
  // Fetch maps by UID OR Email
  async function fetchUserMaps(input) {
    loading.value = true;
    targetUserMaps.value = []; // Clear previous results
    
    try {
      let targetUid = input.trim();

      // 1. If input looks like an email, resolve it to a UID
      if (targetUid.includes('@')) {
        const q = query(collection(db, 'users'), where('email', '==', targetUid));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          throw new Error(`User not found: ${targetUid}`);
        }
        
        // The document ID is the UID
        targetUid = snapshot.docs[0].id;
      }

      // 2. Fetch maps using the resolved UID
      targetUserMaps.value = await mapService.fetchUserMaps(targetUid);

    } catch (error) {
      console.error("Error fetching maps:", error);
      throw error; // Re-throw so the UI can display the message
    } finally {
      loading.value = false;
    }
  }

  // Duplicate a map to the current admin's profile
async function copyMapToAdmin(map) {
    const adminUid = userStore.user?.uid;
    if (!adminUid) throw new Error("Admin not logged in");

    // Remove the original document ID
    const { id, ...mapData } = map;
    
    const clonedMapData = {
      ...mapData,
      uid: adminUid,
      mapName: `[DEBUG] ${mapData.name || 'Untitled Map'}`,
      isShared: false,
      folderId: null // <--- ADD THIS LINE
    };

    return await mapService.createMap(clonedMapData);
  }


  // --- NEW EXPORT FUNCTION ---
  async function fetchAllUsers() {
    loading.value = true;
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Handle Firestore Timestamps safely
        let createdDate = '';
        if (data.createdAt?.toDate) {
          createdDate = data.createdAt.toDate().toISOString().split('T')[0];
        } else if (data.createdAt) {
          createdDate = data.createdAt; // Fallback if it's already a string
        }

        return {
          uid: doc.id,
          email: data.email || 'No Email',
          judgeName: data.judgeName || '',
          tier: data.tier || 'free',
          createdAt: createdDate
        };
      });
    } catch (e) {
      console.error("Error fetching users:", e);
      throw e;
    } finally {
      loading.value = false;
    }
  }
  return { targetUserMaps, loading, fetchUserMaps, copyMapToAdmin, fetchAllUsers, };
});