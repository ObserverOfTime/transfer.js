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
  const options = {
    headers: {
      'User-Agent': userAgent,
      'Max-Days': 1
    },
    throwHttpErrors: true
  };

  /** @test {Transfer#upload} */
  it('succesful upload', () => {
    const transfer = new Transfer(file, options);
    return expect(transfer.upload()).to.eventually
      .match(new RegExp(regex + path.basename(file)));
  });

  /** @test {Transfer#upload} */
  it('successful upload: custom name', () => {
    const fn = 'test.md';
    const transfer = new Transfer(file, options);
    return expect(transfer.upload(fn)).to.eventually
      .match(new RegExp(regex + fn));
  });

  /** @test {Transfer#upload} */
  it('succesful upload: progress', (done) => {
    let progressTotal, progressCount = 0;
    const transfer = new Transfer(file, options);
    return transfer.upload().progress((prog) => {
      progressCount = prog.current;
      progressTotal = prog.total;
    }).then((url) => {
      downloadURL = url; // Save URL to download later
      progressCount.should.equal(progressTotal);
    }).should.notify(done);
  });

  /** @test {Transfer#download} */
  it('successful download', () => {
    const transfer = new Transfer(downloadURL, options);
    return transfer.download(file).should.be.fulfilled;
  });

  /** @test {Transfer#upload} */
  it('failed upload: no file provided', () => {
    const transfer = new Transfer('', options);
    return transfer.upload().should.be
      .rejectedWith(TransferError, 'Missing file input');
  });

  /** @test {Transfer#upload} */
  it('failed upload: non-existent file', () => {
    const transfer = new Transfer('non-existent', options);
    const filePath = path.resolve('non-existent');
    return transfer.upload().should.be
      .rejectedWith(TransferError, 'File not found: ' + filePath);
  });
});

