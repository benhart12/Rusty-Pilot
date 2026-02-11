// ============================================================
// RustyPilot Refresh — Firebase Storage Helpers
//
// Thin wrappers around the Firebase v9 Storage SDK for
// uploading and deleting media files (diagrams, checklists, etc.)
//
// All callers receive a public download URL on upload success.
// Paths should be meaningful and scoped, e.g.:
//   "modules/{moduleId}/diagrams/fuel-system.png"
//   "users/{uid}/uploads/checklist.pdf"
// ============================================================

import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
    UploadMetadata,
  } from "firebase/storage";
  
  import { storage } from "@/lib/firebase";
  
  // ------------------------------------------------------------
  // uploadFileAndGetUrl
  // ------------------------------------------------------------
  
  export interface UploadFileParams {
    /** Full Storage path, e.g. "modules/eng-001/diagrams/fuel-system.png" */
    path: string;
    /** The browser File object to upload */
    file: File;
    /**
     * MIME type override, e.g. "image/png", "application/pdf".
     * Falls back to file.type if omitted. If both are empty the
     * Storage SDK will use "application/octet-stream".
     */
    contentType?: string;
  }
  
  /**
   * Uploads a file to Firebase Storage at the given path and returns
   * its public download URL.
   *
   * @example
   *   const url = await uploadFileAndGetUrl({
   *     path: "modules/eng-001/diagrams/fuel-system.png",
   *     file: selectedFile,
   *     contentType: "image/png",
   *   });
   *   // store `url` in the ContentModule.diagramUrls array
   */
  export async function uploadFileAndGetUrl(
    params: UploadFileParams
  ): Promise<string> {
    const { path, file, contentType } = params;
  
    if (!path || path.trim() === "") {
      throw new Error("[storage] uploadFileAndGetUrl: path must not be empty.");
    }
    if (!file) {
      throw new Error("[storage] uploadFileAndGetUrl: file must not be null.");
    }
  
    const metadata: UploadMetadata = {
      contentType: contentType || file.type || undefined,
    };
  
    try {
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file, metadata);
      const downloadUrl = await getDownloadURL(storageRef);
      return downloadUrl;
    } catch (err) {
      throw new Error(
        `[storage] uploadFileAndGetUrl failed for path "${path}": ${(err as Error).message}`
      );
    }
  }
  
  // ------------------------------------------------------------
  // deleteFileByPath
  // ------------------------------------------------------------
  
  /**
   * Deletes a file from Firebase Storage at the given path.
   * Resolves silently if the deletion succeeds.
   * Throws if the file does not exist or the operation is unauthorized.
   *
   * @example
   *   await deleteFileByPath("modules/eng-001/diagrams/old-diagram.png");
   */
  export async function deleteFileByPath(path: string): Promise<void> {
    if (!path || path.trim() === "") {
      throw new Error("[storage] deleteFileByPath: path must not be empty.");
    }
  
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
    } catch (err) {
      throw new Error(
        `[storage] deleteFileByPath failed for path "${path}": ${(err as Error).message}`
      );
    }
  }