import type { ProjectState } from '../types/editor';

const DB_NAME = 'ClipVoiceVideoEditorDB';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_BLOBS = 'media_blobs';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS, { keyPath: 'id' });
      }
    };
  });
}

export async function saveProjectToDB(project: ProjectState): Promise<void> {
  try {
    const db = await openDB();

    // Persist media file blobs to IndexedDB media_blobs store
    for (const asset of project.mediaAssets) {
      if (asset.file) {
        await saveBlobToDB(asset.id, asset.file);
      }
    }

    const tx = db.transaction([STORE_PROJECTS], 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);
    
    // Omit history and non-serializable properties before storing
    const serializableProject = {
      ...project,
      isPlaying: false,
      history: { past: [], future: [] },
      mediaAssets: project.mediaAssets.map((m) => ({
        ...m,
        file: undefined, // avoid storing File handle direct references
      })),
    };

    store.put(serializableProject);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to save project to IndexedDB:', err);
  }
}

export async function loadProjectsFromDB(): Promise<Partial<ProjectState>[]> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_PROJECTS], 'readonly');
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.getAll();

    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to load projects from IndexedDB:', err);
    return [];
  }
}

export async function deleteProjectFromDB(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_PROJECTS], 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);
    store.delete(id);
  } catch (err) {
    console.error('Failed to delete project:', err);
  }
}

export async function saveBlobToDB(id: string, blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_BLOBS], 'readwrite');
    const store = tx.objectStore(STORE_BLOBS);
    store.put({ id, blob });
  } catch (err) {
    console.error('Failed to save blob to DB:', err);
  }
}

export async function loadBlobFromDB(id: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_BLOBS], 'readonly');
    const store = tx.objectStore(STORE_BLOBS);
    const req = store.get(id);

    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result ? req.result.blob : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export function exportProjectJSON(project: ProjectState) {
  const data = JSON.stringify(
    {
      ...project,
      isPlaying: false,
      history: { past: [], future: [] },
    },
    null,
    2
  );
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.toLowerCase().replace(/\s+/g, '-')}-project.json`;
  a.click();
  URL.revokeObjectURL(url);
}
