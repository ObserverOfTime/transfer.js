const util = require('util');

/**
 * Class representing a Transfer Error
 *
 * @class
 * @extends Error
 * @param {string} message - Error message
 * @param {Object} [extra] - Extra attributes
 */
function TransferError(message, extra) {
  this.name = this.constructor.name;
  this.message = message;
  this.extra = extra;
  Error.captureStackTrace(this, this.constructor);
}

util.inherits(TransferError, Error);

module.exports = TransferError;

