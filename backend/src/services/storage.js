'use strict';

const {
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
} = require('@azure/storage-blob');
const config = require('../config');

/**
 * Parse an Azure storage connection string into its key/value parts.
 * Works with real Azure connection strings and the Azurite dev account.
 */
function parseConnectionString(connectionString) {
  const parts = {};
  for (const segment of connectionString.split(';')) {
    if (!segment) continue;
    const idx = segment.indexOf('=');
    if (idx > 0) parts[segment.slice(0, idx)] = segment.slice(idx + 1);
  }
  return parts;
}

class StorageService {
  constructor() {
    this._serviceClient = null;
    this._credential = null;
    this._ensurePromise = null;
  }

  get serviceClient() {
    if (!this._serviceClient) {
      if (!config.azureStorageConnectionString) {
        throw new Error('AZURE_STORAGE_CONNECTION_STRING is not set');
      }
      this._serviceClient = BlobServiceClient.fromConnectionString(
        config.azureStorageConnectionString
      );
    }
    return this._serviceClient;
  }

  get credential() {
    if (!this._credential) {
      const parts = parseConnectionString(config.azureStorageConnectionString);
      if (!parts.AccountName || !parts.AccountKey) {
        throw new Error('Connection string must contain AccountName and AccountKey');
      }
      this._credential = new StorageSharedKeyCredential(parts.AccountName, parts.AccountKey);
    }
    return this._credential;
  }

  containerClient() {
    return this.serviceClient.getContainerClient(config.azureStorageContainer);
  }

  /** Create the container if it does not exist (idempotent, runs once). */
  ensureContainer() {
    if (!this._ensurePromise) {
      this._ensurePromise = this.containerClient()
        .createIfNotExists()
        .catch((err) => {
          // Allow a retry on the next upload if creation failed (e.g. storage
          // was briefly unavailable).
          this._ensurePromise = null;
          throw err;
        });
    }
    return this._ensurePromise;
  }

  /** Upload a buffer as a block blob with a content type. */
  async uploadBuffer(blobName, buffer, contentType) {
    await this.ensureContainer();
    const blob = this.containerClient().getBlockBlobClient(blobName);
    await blob.upload(buffer, buffer.length, {
      blobHTTPHeaders: { blobContentType: contentType || 'application/octet-stream' },
    });
    return blob.url;
  }

  /**
   * Build a short-lived, browser-reachable signed (SAS) URL for a blob.
   * Uses AZURE_STORAGE_PUBLIC_BASE_URL so the URL is reachable outside the
   * Docker network (e.g. localhost:10000 locally, Nginx path on the demo host).
   */
  getDownloadUrl(blobName, ttlMinutes = config.signedUrlTtlMinutes) {
    const expiresOn = new Date(Date.now() + ttlMinutes * 60 * 1000);
    const sas = generateBlobSASQueryParameters(
      {
        containerName: config.azureStorageContainer,
        blobName,
        permissions: BlobSASPermissions.parse('r'),
        expiresOn,
      },
      this.credential
    ).toString();
    const base = config.azureStoragePublicBaseUrl.replace(/\/+$/, '');
    return {
      url: `${base}/${config.azureStorageContainer}/${encodeURIComponent(blobName)}?${sas}`,
      expiresOn,
    };
  }

  async deleteBlob(blobName) {
    await this.ensureContainer();
    await this.containerClient().getBlockBlobClient(blobName).deleteIfExists();
  }

  /** Health probe for the dependency check used by /health. */
  async healthy() {
    await this.serviceClient.getProperties();
    return true;
  }
}

module.exports = new StorageService();
