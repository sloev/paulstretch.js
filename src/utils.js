import  fft from 'ndfft';
import * as arrayHelpers from './array-helpers.js';


export const createWindow = (winSize) => {
  var winArray = new Float32Array(winSize)
    , counter = -1, step = 2/(winSize - 1)
  for (let i = 0; i < winSize; i++) {
    winArray[i] = Math.pow(1 - Math.pow(counter, 2), 1.25)
    counter += step
  }
  return winArray
}

export const applyWindow = (block, winArray) =>{
  var frameCount = block[0].length
    , channelCount = block.length
    , ch, i
  
  for (let i = 0; i < frameCount; i++) {
    for (let ch = 0; ch < channelCount; ch++)
      block[ch][i] = block[ch][i] * winArray[i]
  }
}

// Returns a function for setting the phases of an array, array length `winSize`.
// The returned function is `rephase(array, phases)`. 
export const makeRephaser = (winSize)=> {
  var symSpectrumSlice = [1, winSize / 2]
    , uniqSpectrumSlice = [0, winSize / 2 + 1]
    , re = [].slice.call(new Float32Array(winSize), 0) // Don't know why the FFT not working with typed arrays
    , im = [].slice.call(new Float32Array(winSize), 0)
    , amplitudes = new Float32Array(uniqSpectrumSlice[1])
    

  return function(array, phases) {
    // Prepare im and re for FFT
    arrayHelpers.map(im, function() { return 0 })
    arrayHelpers.copy(array, re)

    // get the amplitudes of the frequency components and discard the phases
    fft(1, re, im)
    arrayHelpers.copy(re.slice.apply(re, uniqSpectrumSlice), amplitudes) // get only the unique part of the spectrum
    arrayHelpers.map(amplitudes, Math.abs) // input signal is real, so abs value of `re` is the amplitude

    // Apply the new phases
    for (let i = 0, length = amplitudes.length; i < length; i++) {
      re[i] = amplitudes[i] * Math.cos(phases[i])
      im[i] = amplitudes[i] * Math.sin(phases[i])
    }

    // Rebuild `re` and `im` by adding the symetric part
    for (let i = symSpectrumSlice[0], length = symSpectrumSlice[1]; i < length; i++) {
      re[length + i] = re[length - i]
      im[length + i] = im[length - i] * -1
    }

    // do the inverse FFT
    fft(-1, re, im)
    arrayHelpers.copy(re, array)
    return array
  }
}

// Buffer of blocks allowing to read blocks of a fixed block size and to get overlapped
// blocks in output.
// `samples.write(block)` will queue `block`
// `samples.read(blockOut)` will read the queued blocks to `blockOut`
export const Samples = class {
  constructor(displacePos){
    this.displacePos = displacePos;
    this.blocksIn = []
    this.readPos = 0
    this.framesAvailable = 0;

  }
  setDisplacePos (val) { 
    this.displacePos = val 
  }
  
  getReadPos() { return this.readPos }
  getFramesAvailable() { return this.framesAvailable }

  // If there's more data than `blockSize` return a block, otherwise return null.
  read (blockOut) {
    var numberOfChannels = blockOut.length
      , blockSize = blockOut[0].length
      , i, block
      , writePos  // position of writing in output block
      , readStart // position to start reading from the next block
      , toRead    // amount of frames to read from the next block
    
    if (this.framesAvailable >= blockSize) {

      readStart = Math.floor(this.readPos)
      writePos = 0
      i = 0

      // Write inBlocks to the outBlock
      while(writePos < blockSize) {
        block = this.blocksIn[i++]
        toRead = Math.min(block[0].length - readStart, blockSize - writePos)

        for (let ch = 0; ch < numberOfChannels; ch++)
          blockOut[ch].set(block[ch].subarray(readStart, readStart + toRead), writePos)
        writePos += toRead
        readStart = 0
      }

      // Update positions
      this.readPos += (this.displacePos || blockSize)
      this.framesAvailable -= (this.displacePos || blockSize)

      // Discard used input blocks
      block = this.blocksIn[0]
      while (block[0].length < this.readPos) {
        this.blocksIn.shift()
        this.readPos -= block[0].length
        block = this.blocksIn[0]
      }

      return blockOut
    } else return null
  }

  // Writes `block` to the queue
  write (block) {
    this.blocksIn.push(block)
    this.framesAvailable += block[0].length
  }

}