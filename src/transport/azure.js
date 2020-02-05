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
   * @param {string} options.account
   * @param {string} options.accountKey
   * @param {string} options.containerName
   * @param {string} options.remoteUrl
   * @param {string} options.remotePath
   */
  normalizeOptions(options) {
    if (!options.containerName) {
      throw new Error("Container name is required.");
    }
    
    if (!options.blobUrl) {
      options.blobUrl = `https://${options.account}.blob.core.windows.net`;
    }

    if (!options.remoteUrl) {
      options.remoteUrl = `${options.blobUrl}/${options.containerName}/${options.remotePath}`;
    }

    if (!options.outPath) {
      options.outPath = "";
    }

    super.normalizeOptions(options);
  }

  init() {
    this.sharedKeyCredential = new StorageSharedKeyCredential(
      options.account,
      options.accountKey
    );

    this.blobServiceClient = new BlobServiceClient(
      options.blobUrl,
      sharedKeyCredential
    );

    this.containerClient = blobServiceClient.getContainerClient(
      options.containerName
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
  uploadFile(filePath, build) {
    const outPath = this.getOutFilePath(filePath, build);
    console.log("FILEPATH", filePath);
    console.log("OUTPATH", outPath);
    return Promise.resolve("");
    //return copyFile(filePath, outPath).then(() =>
    //  this.getFileUrl(filePath, build)
    //);
  }

  /**
   * Save updates.json to a hosting
   * @return {Promise<string>} Url to updates.json
   */
  pushUpdatesJson(data) {
    const outPath = path.join(this.options.outPath, "updates.json");
    console.log("OUTPATH", outPath);
    //mkdirp(this.options.outPath);

    //fs.writeFileSync(outPath, JSON.stringify(data, null, "  "));
    return Promise.resolve();
  }

  /**
   * @return {Promise<Array<string>>}
   */
  async fetchBuildsList() {
    let builds = [];
    for await (const blob of containerClient.listBlobsFlat()) {
      // @TODO: Only add directories
      console.log("A blob:", blob);
      builds.push(blob.name);
    }
    /*
    try {
      builds = fs.readdirSync(this.options.outPath).filter(file => {
        const stat = fs.statSync(path.join(this.options.outPath, file));
        return stat.isDirectory();
      });
    } catch (e) {
      builds = [];
    }
    */

    return Promise.resolve(builds);
  }

  /**
   * @return {Promise}
   */
  removeBuild(build, resolveName = true) {
    /*
    const buildId = resolveName ? this.getBuildId(build) : build;
    rmDir(path.join(this.options.outPath, buildId));
    */
    return Promise.resolve();
  }

  getOutFilePath(localFilePath, build) {
    localFilePath = path.basename(localFilePath);
    return path.posix.join(
      this.options.outPath,
      this.getBuildId(build),
      this.normalizeFileName(localFilePath)
    );
  }
}

module.exports = AzureTransport;
