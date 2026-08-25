/**
 * Google Drive API Client for ReconCorrelator
 * Handles listing, uploading, reading, and managing recon artifacts and reports.
 */

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
}

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

/**
 * List files and folders from Google Drive
 */
export async function listDriveFiles(
  accessToken: string,
  options: {
    folderId?: string;
    searchTerm?: string;
    pageSize?: number;
    mimeType?: string;
  } = {}
): Promise<{ files: GoogleDriveFile[]; nextPageToken?: string }> {
  const { folderId, searchTerm, pageSize = 30, mimeType } = options;

  let query = "trashed = false";
  if (folderId) {
    query += ` and '${folderId}' in parents`;
  }
  if (searchTerm) {
    query += ` and name contains '${searchTerm.replace(/'/g, "\\'")}'`;
  }
  if (mimeType) {
    query += ` and mimeType = '${mimeType}'`;
  }

  const params = new URLSearchParams({
    q: query,
    pageSize: pageSize.toString(),
    fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, iconLink)',
    orderBy: 'modifiedTime desc',
  });

  const response = await fetch(`${DRIVE_API_BASE}/files?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Google Drive API error (${response.status})`);
  }

  return response.json();
}

/**
 * Get or create the default 'ReconCorrelator Reports' folder in Google Drive
 */
export async function getOrCreateReconFolder(accessToken: string): Promise<string> {
  const folderName = 'ReconCorrelator Reports';

  // Search if folder exists
  const searchParams = new URLSearchParams({
    q: `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`,
    fields: 'files(id, name)',
  });

  const searchRes = await fetch(`${DRIVE_API_BASE}/files?${searchParams.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // Create folder if not found
  const createRes = await fetch(`${DRIVE_API_BASE}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Armazenamento de relatórios, scans e inteligência de reconhecimento gerados pelo ReconCorrelator.',
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Falha ao criar pasta no Google Drive');
  }

  const newFolder = await createRes.json();
  return newFolder.id;
}

/**
 * Upload a report or file to Google Drive using multipart upload
 */
export async function uploadFileToDrive(
  accessToken: string,
  fileName: string,
  content: string | Blob,
  mimeType: string = 'text/plain',
  parentFolderId?: string
): Promise<GoogleDriveFile> {
  const metadata: Record<string, unknown> = {
    name: fileName,
    mimeType: mimeType,
  };

  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const textContent = typeof content === 'string' ? content : await content.text();

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n` +
    textContent +
    closeDelimiter;

  const response = await fetch(
    `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,createdTime,size`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Falha ao enviar arquivo para o Google Drive');
  }

  return response.json();
}

/**
 * Fetch text content of a file from Google Drive
 */
export async function getDriveFileContent(accessToken: string, fileId: string): Promise<string> {
  const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Falha ao ler arquivo do Google Drive (${response.status})`);
  }

  return response.text();
}

/**
 * Delete a file or folder from Google Drive
 * (Note: Caller MUST ask for user confirmation before calling this function)
 */
export async function deleteDriveFile(accessToken: string, fileId: string): Promise<boolean> {
  const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Falha ao excluir arquivo do Google Drive');
  }

  return true;
}
