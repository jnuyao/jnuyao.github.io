import type { ArtMissionId } from "./art-studio-data";

const DATABASE_NAME = "story-garden-art-v1";
const STORE_NAME = "artwork-photos";
const DATABASE_VERSION = 1;

function photoKey(bookSlug: string, missionId: ArtMissionId): string {
  return `${bookSlug}:${missionId}`;
}

function openArtDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the local art gallery."));
  });
}

export async function loadArtPhoto(bookSlug: string, missionId: ArtMissionId): Promise<Blob | null> {
  const database = await openArtDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(photoKey(bookSlug, missionId));
      request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null);
      request.onerror = () => reject(request.error ?? new Error("Could not load the local artwork."));
    });
  } finally {
    database.close();
  }
}

export async function saveArtPhoto(
  bookSlug: string,
  missionId: ArtMissionId,
  photo: Blob,
): Promise<void> {
  const database = await openArtDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(photo, photoKey(bookSlug, missionId));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not save the local artwork."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Saving the local artwork was cancelled."));
    });
  } finally {
    database.close();
  }
}

export async function removeArtPhoto(bookSlug: string, missionId: ArtMissionId): Promise<void> {
  const database = await openArtDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(photoKey(bookSlug, missionId));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not remove the local artwork."));
    });
  } finally {
    database.close();
  }
}

export async function clearArtPhotos(): Promise<void> {
  const database = await openArtDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not clear the local art gallery."));
    });
  } finally {
    database.close();
  }
}
