# Project Documentation and Structure

### 1. Project Architecture

The application is a **Vue 3** application using **Vite**.

* **State Management:** **Pinia**. The application uses a "modularized store" pattern where the main `mapStore` holds the state refs, but logic is offloaded to composables in `src/stores/mapActions/`.
* **Database:** **Firebase Firestore**.
* **Canvas:** **Konva** (via `vue-konva`) for rendering the map editors.
* **Authentication:** **Firebase Auth**.

---

### 2. Database Schema (Firestore)

#### Collection: `users`

Stores user profiles, subscription tiers, and judge/club relationships.

* **Document ID:** `uid` (from Auth)
* **Fields:**
* `email` (string)
* `judgeName` (string): Display name for the user.
* `clubName` (string): Optional, if the user is a club.
* `tier` (string): `'free'`, `'pro'`, `'club'`, or `'solo'`.
* `allowedSports` (array): e.g., `['barnhunt']`.
* `clubLogoUrl` (string): URL to the image in Firebase Storage.
* `sponsoredEmails` (array): If tier is 'club', contains emails of judges they sponsor.
* `createdAt` (timestamp).



#### Collection: `maps`

Stores the actual course designs.

* **Document ID:** Auto-generated.
* **Fields:**
* `uid` (string): Owner ID.
* `name` (string): Map title.
* `folderId` (string | null): Reference to a folder document.
* `isShared` (boolean): Visibility toggle.
* `sport` (string): `'barnhunt'`.
* `level` (string): Competition level (e.g., 'Novice').
* `thumbnail` (string | null): Base64 or URL string of the map preview.
* `data` (map): **The Payload**. Contains:
* `dimensions` (object): `{ width, height }`.
* `bales`, `dcMats`, `boardEdges`, `hides` (arrays): Coordinate data for objects.


* `createdAt`, `updatedAt` (timestamps).



#### Collection: `folders`

Organizational units for maps.

* **Fields:**
* `uid` (string): Owner.
* `name` (string).
* `createdAt` (timestamp).



#### Collection: `library_items`

Shared snippets (e.g., specific tunnel shapes) available to users.

* **Fields:**
* `name` (string).
* `sport` (string).
* `type` (string): e.g., `'tunnel'`.
* `data` (map): Partial map data (bales/boards only).
* `thumbnail` (string).
* `createdBy` (string): Email of the creator (restricted to admin).



---

### 3. Code Structure & Key Functions

#### `src/stores/mapStore.js`

This is the central controller. It defines the reactive state but delegates logic to imported modules.

* **State:** Holds `bales`, `ringDimensions`, `activeTool`, `currentMapId`, `history` stacks.
* **`reset()`**: Wipes all arrays and resets the map to a default "Novice Barn Hunt" state.
* **`resizeRing(width, height)`**: Updates dimensions and clamps all objects (bales, obstacles) so they don't fall off the new grid size.
* **Initialization:** It bundles all state refs into a `stateRefs` object and passes them to logic modules (`useBarnHuntLogic`, etc.).

#### `src/stores/mapActions/persistence.js`

Handles Input/Output operations for map data.

* **`saveToCloud(isAutoSave)`**: Validates user login/map name, constructs the JSON payload, and calls `mapService.createMap` or `updateMap`.
* **`loadMapFromData(id, data)`**: Takes raw JSON and populates the `mapStore` state refs. Handles legacy data structure compatibility.
* **`exportMapToJSON()`**: Triggers a browser download of the map as a `.json` file.
* **`mergeMapFromJSON(jsonString)`**: Reads a local JSON file and appends its objects to the *current* map (useful for importing saved tunnel configurations).
* **`saveSelectionToLibrary()`**: Takes currently selected items and saves them to the `library_items` collection (Admin/Sam only context usually).

#### `src/services/mapService.js`

The Data Access Layer (DAL). It contains no application logic, only Firestore commands.

* **`fetchUserMaps(uid)`**: Gets all maps for a user.
* **`deleteFolder(folderId)`**: Performs a **Batch Write**. It finds all maps with this `folderId`, sets their `folderId` to null, and then deletes the folder document.

#### `src/services/libraryService.js`

Read/Write for shared assets.

* **`getLibraryItems(sport)`**: Fetches items filtered by sport.
* **`addToLibrary` / `deleteItem**`: Protected functions (hardcoded check for `reallyjustsam@gmail.com`) to manage the global library.

#### `src/stores/userStore.js`

Handles Identity and Access Management.

* **`loadUserProfile(uid)`**: Fetches the user doc. If the user is 'free', it triggers `checkSponsorship`.
* **`checkSponsorship(email)`**: Queries if any user with `tier: 'club'` has this email in their `sponsoredEmails` array. If found, temporarily elevates local permissions to 'pro'.
* **`uploadLogo(file)`**: Uploads an image to Firebase Storage at `logos/{uid}` and updates the Firestore profile with the URL.

#### `src/router/index.js`

Standard Vue Router configuration.

* **Routes:**
* `/editor`: The main `MapEditor.vue` canvas.
* `/dashboard`: User's saved maps list.
* `/view/:id`: Read-only view for shared maps.
* `/terms` & `/privacy`: Static legal pages.