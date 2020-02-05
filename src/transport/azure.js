"use strict";

const fs = require("fs");
const path = require("path");
const {
  BlobServiceClient,
  StorageSharedKeyCredential
} = require("@azure/storage-blob");

const AbstractTransport = require("./abstract");

class AzureTransport extends AbstractTransport {
  /**
   * @param {Object} options
   * @param {string} options.account REQUIRED
   * @param {string} options.accountKey REQUIRED
   * @param {string} options.containerName REQUIRED
   * @param {string} options.blobUrl defaults to `https://${options.account}.blob.core.windows.net`
   * @param {string} options.remoteUrl http accessible url (computed automatically if not defined)
   * @param {string} options.remotePath "prefix" inside the azure container
   */
  normalizeOptions(options) {
    if (options.remotePath && !options.remotePath.endsWith("/")) {
      options.remotePath += "/";
    } else if (!options.remotePath) {
      options.remotePath = "";
    }

    if (!options.containerName) {
      throw new Error("Container name is required.");
    }

    if (!options.blobUrl) {
      options.blobUrl = `https://${options.account}.blob.core.windows.net`;
    }

    if (!options.remoteUrl) {
      options.remoteUrl = `${options.blobUrl}/${options.containerName}/${options.remotePath}`;
    }

    super.normalizeOptions(options);
  }

  init() {
    this.sharedKeyCredential = new StorageSharedKeyCredential(
      this.options.account,
      this.options.accountKey
    );

    this.blobServiceClient = new BlobServiceClient(
      this.options.blobUrl,
      this.sharedKeyCredential
    );

    this.containerClient = this.blobServiceClient.getContainerClient(
      this.options.containerName
    );

    super.init();
  }

  /**
   * Upload file to a hosting and get its url
   * @abstract
   * @param {string} filePath
   * @param {object} build
   * @return {Promise<string>} File url
   */
  async uploadFile(filePath, build) {
    const outPath = this.getOutFilePath(filePath, build);

    console.log("uploadFile - FILEPATH", filePath);
    console.log("uploadFile - OUTPATH", outPath);
    console.log("UPLOAD STARTING");

    const blockBlobClient = this.containerClient.getBlockBlobClient(outPath);
    const uploadResponse = await blockBlobClient.uploadFile(filePath);
    console.log("UPLOAD DONE");
    console.log("RESPONSE:", uploadResponse);

    return Promise.resolve(
      path.posix.join(this.options.blobUrl, this.options.containerName, outPath)
    );
  }

  /**
   * Save updates.json to a hosting
   * @return {Promise<string>} Url to updates.json
   */
  async pushUpdatesJson(data) {
    const outPath = path.join(this.options.remotePath, "updates.json");
    console.log("pushUpdatesJson - OUTPATH", outPath);

    console.log("UPLOAD STARTING");
    const blockBlobClient = this.containerClient.getBlockBlobClient(outPath);
    const updatesJson = JSON.stringify(data, null, "  ");
    const uploadResponse = await blockBlobClient.upload(
      updatesJson,
      Buffer.byteLength(updatesJson)
    );
    console.log("UPLOAD DONE");
    console.log(updatesJson);
    console.log("RESPONSE:", uploadResponse);

    return Promise.resolve();
  }

  /**
   * @return {Promise<Array<string>>}
   */
  async fetchBuildsList() {
    let builds = [];
    for await (const blob of this.containerClient.listBlobsByHierarchy("/", {
      prefix: this.options.remotePath
    })) {
      if (blob.kind !== "prefix") continue;
      // Remove prefix and ending / from name
      const name = blob.name.slice(
        this.options.remotePath.length,
        blob.name.length - 1
      );
      if (name.match(/^\w+-\w+-\w+-[\w.]+$/)) {
        builds.push(name);
      }
    }

    return Promise.resolve(builds);
  }

  /**
   * @return {Promise}
   */
  async removeBuild(build, resolveName = true) {
    const buildId = resolveName ? this.getBuildId(build) : build;
    const outPath = path.posix.join(this.options.remotePath, buildId);
    console.log("removeBuild - OUTPATH", outPath);

    for await (const blob of this.containerClient.listBlobsFlat({
      prefix: outPath
    })) {
      const blockBlobClient = this.containerClient.getBlockBlobClient(
        blob.name
      );
      const response = await blockBlobClient.delete({
        deleteSnapshots: "include"
      });
      console.log("DELETE RESPONSE:", response);
    }

    return Promise.resolve();
  }

  getOutFilePath(localFilePath, build) {
    localFilePath = path.basename(localFilePath);
    return path.posix.join(
      this.options.remotePath,
      this.getBuildId(build),
      this.normalizeFileName(localFilePath)
    );
  }
}

module.exports = AzureTransport;
