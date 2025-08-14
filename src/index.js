
import * as utils from './utils.js';
import * as blockHelpers from './block-helpers.js';
import * as arrayHelpers from './array-helpers.js';

export class PaulStretch {
  
  constructor(numberOfChannels, ratio, winSize = 4096 * 4) {
    this.numberOfChannels = numberOfChannels;
    this.ratio = ratio;
    this.winSize = winSize;
    this.halfWinSize = this.winSize / 2;

    this.samplesIn = new utils.Samples();
    this.samplesOut = new utils.Samples();

    this.setRatio(this.ratio);

    this.blockIn = blockHelpers.newBlock(this.numberOfChannels, this.winSize);
    this.blockOut = blockHelpers.newBlock(this.numberOfChannels, this.winSize);
    this.winArray = utils.createWindow(this.winSize);
    this.phaseArray = new Float32Array(this.halfWinSize + 1);
    this.rephase = utils.makeRephaser(this.winSize);
  }

  // Sets the stretch ratio. Previously processed blocks retain the old ratio.
  setRatio(val) {
    this.ratio = val;
    this.samplesIn.setDisplacePos((this.winSize * 0.5) / this.ratio);
  }

  // Returns the number of frames waiting to be processed.
  writeQueueLength() {
    return this.samplesIn.getFramesAvailable();
  }

  // Returns the number of frames already processed.
  readQueueLength() {
    return this.samplesOut.getFramesAvailable();
  }

  // Reads processed samples to `block`. Returns `block`, or `null` if insufficient processed frames.
  read(block) {
    return this.samplesOut.read(block);
  }

  // Pushes `block` to the processing queue. Beware: the block is not copied.
  write(block) {
    this.samplesIn.write(block);
  }

  // Processes samples from the queue. Returns the number of processed frames generated.
  process() {
    if (this.samplesIn.read(this.blockIn) === null) return 0;

    // Apply window to the buffer
    utils.applyWindow(this.blockIn, this.winArray);

    // Randomize phases for each channel
    for (let ch = 0; ch < this.numberOfChannels; ch++) {
      arrayHelpers.map(this.phaseArray, () => Math.random() * 2 * Math.PI);
      this.rephase(this.blockIn[ch], this.phaseArray);
    }

    // Overlap-add the output
    utils.applyWindow(this.blockIn, this.winArray);
    for (let ch = 0; ch < this.numberOfChannels; ch++) {
      arrayHelpers.add(
        this.blockIn[ch].subarray(0, this.halfWinSize),
        this.blockOut[ch].subarray(this.halfWinSize, this.winSize)
      );
    }

    // Generate the output
    this.blockOut = this.blockIn.map(chArray => arrayHelpers.duplicate(chArray));
    this.samplesOut.write(this.blockOut.map(chArray => chArray.subarray(0, this.halfWinSize)));

    return this.halfWinSize;
  }

  toString() {
    return `PaulStretch(${this.numberOfChannels}X${this.winSize})`;
  }
}

export default PaulStretch;