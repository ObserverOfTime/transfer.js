const path = require('path');
const fs = require('fs');

const {describe, it} = require('mocha');
const {expect, use, should} = require('chai');

const {Transfer, TransferError} = require('../lib/Transfer');
const {name: pkg, version} = require('../package');

use(require('chai-as-promised'));
should();

/** @test {Transfer} */
describe('Testing Transfer', () => {
  let downloadURL;
  const file = 'tests/test.txt';
  const regex = '^https://transfer\\.sh/.+/';
  const userAgent = `${pkg}-tester/${version}`;
  const httpOpts = {
    headers: {
      'User-Agent': userAgent,
      'Max-Days': 1
    },
    throwHttpErrors: true
  };

  /** @test {Transfer#upload} */
  it('succesful upload', () => {
    const transfer = new Transfer(file, {}, httpOpts);
    return expect(transfer.upload()).to.eventually
      .match(new RegExp(regex + path.basename(file)));
  });

  /** @test {Transfer#upload} */
  it('successful upload: custom name', () => {
    const opts = {filename: 'test.md'};
    const transfer = new Transfer(file, opts, httpOpts);
    return expect(transfer.upload()).to.eventually
      .match(new RegExp(regex + opts.filename));
  });

  /** @test {Transfer#upload} */
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

  /** @test {Transfer#upload} */
  it('successful upload: encrypted', () => {
    const opts = {password: 't3st'};
    const transfer = new Transfer(file, opts, httpOpts);
    return transfer.upload().should.be.fulfilled;
  });

  /** @test {Transfer#download} */
  it('successful download', () => {
    const transfer = new Transfer(downloadURL, {}, httpOpts);
    return transfer.download(file).should.be.fulfilled;
  });

  /** @test {Transfer#decrypt} */
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

  /** @test {Transfer#upload} */
  it('failed upload: no file provided', () => {
    const transfer = new Transfer('', {}, httpOpts);
    return transfer.upload().should.be
      .rejectedWith(TransferError, 'Missing file input');
  });

  /** @test {Transfer#upload} */
  it('failed upload: non-existent file', () => {
    const transfer = new Transfer('non-existent', {}, httpOpts);
    const filePath = path.resolve('non-existent');
    return transfer.upload().should.be
      .rejectedWith(TransferError, 'File not found: ' + filePath);
  });
});

