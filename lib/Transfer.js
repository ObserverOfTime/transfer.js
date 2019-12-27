const fs = require('fs');
const path = require('path');

const {EOL, tmpdir} = require('os');
const {lookup: mime} = require('mime-types');

/**
 * @external got
 * @desc A human-friendly and powerful HTTP request library
 * @see {@link https://www.npmjs.com/package/got|got}
 */
const got = require('got');

/**
 * @external ProgressPromise
 * @desc Promise subclass with mechanism to report progress before resolving
 * @see {@link https://www.npmjs.com/package/progress-promise|progress-promise}
 */
const ProgressPromise = require('progress-promise');

/**
 * The root domain
 *
 * @constant
 * @type {string}
 * @default <a href="https://transfer.sh">https://transfer.sh</a>
 * @todo Make this configurable
 */
const DOMAIN = 'https://transfer.sh';

/**
 * Class representing a Transfer Error
 *
 * @extends {Error}
 * @see <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error">Error</a>
 */
class TransferError extends Error {
  get name() { return 'TransferError' }
}

/**
 * Class representing a Transfer
 *
 * @version 0.4.0
 */
class Transfer {
  /**
   * @typedef {Object} TransferOptions
   * @property {string} [filename] - A custom filename for the upload
   */

  /**
   * @param {string} fileInput - File path
   * @param {Object} [options={}] - {@link external:got|got} options
   */
  constructor(fileInput, options={}) {
    /**
     * The input file path/URL
     *
     * @type {string}
     */
    this.fileInput = fileInput;
    /**
     * The size of the file in bytes
     *
     * @type {number}
     */
    this.fileSize = 0;
    /** A {@link external:got|got} options object
     *
     * @type {Object}
     * @see <a href="https://github.com/sindresorhus/got#options">got options</a>
     */
    this.options = options;
  }

  /**
   * Adds <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type">Content-Type</a>
   * header to the request
   *
   * @protected
   * @since 0.4.0
   * @param {Object} options - An HTTP options object
   * @param {string} [file=null] - The input file
   */
  _contentType(options, file=null) {
    if(!options.headers['Content-Type']) {
      // istanbul ignore else
      if(file !== null) {
        options.headers['Content-Type'] =
          mime(path.extname(file)) || 'text/plain';
      } else {
        options.headers['Content-Type'] =
          'application/octet-stream';
      }
    }
  }

  /**
   * Upload a file to {@link DOMAIN}
   *
   * @param {string} [filename] - The name of the uploaded file
   * @returns {external:ProgressPromise.<string|TransferError>} -
   * The link if resolved, a TransferError if rejected
   */
  upload(filename) {
    const self = this;
    if(!filename) filename = path.basename(self.fileInput);
    const fileURL = `${DOMAIN}/${filename}`;
    return new ProgressPromise((resolve, reject, progress) => {
      if(!filename) return reject(new TransferError('Missing file input'));
      try {
        self.fileSize = fs.statSync(self.fileInput).size;
        fs.accessSync(self.fileInput, fs.R_OK);
      } catch(error) {
        switch(error.code) {
          case 'ENOENT':
            return reject(new TransferError(
              `File not found: '${self.fileInput}'`
            ));
          case 'EACCES':
            return reject(new TransferError(
              `Cannot read file: '${self.fileInput}'`
            ));
          // istanbul ignore next
          default:
            return reject(error);
        }
      }
      self._contentType(self.options, self.fileInput);
      self.options.body = fs.createReadStream(self.fileInput);
      got.put(fileURL, self.options)
        .on('uploadProgress', p => {
          // The uploaded size is roughly 1.016 times larger
          // than the actual size, likely due to the metadata
          const curr = parseInt(p.transferred / 1.016 + 0.5);
          progress({
            current: (curr < self.fileSize) ? curr : self.fileSize,
            total: self.fileSize,
            task: 'Upload'
          });
        }).then((res) => resolve(res.body)).catch(reject);
    });
  }

  /**
   * Download a file from {@link DOMAIN}
   *
   * @param {string} destination - Destination path
   * @returns {external:ProgressPromise.<string|TransferError>} -
   * The path if resolved, a {@link TransferError} if rejected
   * @todo Support decrypting
   */
  download(destination) {
    const self = this;
    const url = this.fileInput;
    // The `GET` method cannot be used with a body
    delete this.options.body;
    const filePath = path.resolve(destination || path.basename(url));
    return new ProgressPromise((resolve, reject, progress) => {
      if(!url) return reject(new TransferError('Missing file URL'));
      self.options.method = 'GET';
      got.stream(url, self.options)
        .on('downloadProgress', p => {
          self.fileSize = p.total;
          progress({
            current: p.transferred,
            total: p.total,
            task: 'Download'
          });
        })
        .pipe(fs.createWriteStream(filePath))
        .on('finish', () => resolve(filePath))
        .on('error', reject);
    });
  }
}

module.exports = {Transfer, TransferError};
