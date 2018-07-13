const path = require('path');
const fs = require('fs');
const mocha = require('mocha');
const describe = mocha.describe;
const it = mocha.it;
const chai = require('chai');
const expect = chai.expect;
const Transfer = require('../index');
const TransferError = require('../lib/TransferError');

chai.use(require('chai-as-promised'));
chai.should();

describe('Testing Transfer', () => {
  let downloadURL;
  const file = 'tests/test.txt';
  const regex = '^https://transfer\\.sh/.+/';
  const userAgent = 'transfer.js-tester/' +
    require('../package').version;
  const httpOpts = {
    headers: {
      'User-Agent': userAgent,
      'Max-Days': 1
    },
    throwHttpErrors: true
  };

  it('succesful upload', () => {
    const transfer = new Transfer(file, {}, httpOpts);
    return expect(transfer.upload()).to.eventually
      .match(new RegExp(regex + path.basename(file)));
  });

  it('successful upload: custom name', () => {
    const opts = {filename: 'test.md'};
    const transfer = new Transfer(file, opts, httpOpts);
    return expect(transfer.upload()).to.eventually
      .match(new RegExp(regex + opts.filename));
  });

  it('succesful upload: progress', (done) => {
    let progressTotal, progressCount = 0;
    const transfer = new Transfer(file, {}, httpOpts);
    return transfer.upload().progress((prog) => {
      progressCount = prog.current;
      progressTotal = prog.total;
    }).then((url) => {
      downloadURL = url; // Save URL to download later
      progressCount.should.equal(progressTotal);
    }).should.notify(done);
  });

  it('successful upload: encrypted', () => {
    const opts = {password: 't3st'};
    const transfer = new Transfer(file, opts, httpOpts);
    return transfer.upload().should.be.fulfilled;
  });

  it('successful download', () => {
    const transfer = new Transfer(downloadURL, {}, httpOpts);
    return transfer.download(file).should.be.fulfilled;
  });

  it('successful decryption', (done) => {
    const opts = {password: 't3st'};
    const enc = 'tests/test.enc';
    const transfer = new Transfer(enc, opts, httpOpts);
    return transfer.decrypt(file).should.be.fulfilled
      .then(() => {
        fs.readFileSync(file).asciiSlice()
          .should.equal('Decrypted\n');
      }).should.notify(done);
  });

  it('failed upload: no file provided', () => {
    const transfer = new Transfer('', {}, httpOpts);
    return transfer.upload().should.be
      .rejectedWith(TransferError, 'Missing file input');
  });

  it('failed upload: non-existent file', () => {
    const transfer = new Transfer('non-existent', {}, httpOpts);
    const filePath = path.resolve('non-existent');
    return transfer.upload().should.be
      .rejectedWith(TransferError, 'File not found: ' + filePath);
  });
});

