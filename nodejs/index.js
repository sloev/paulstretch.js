import fs from 'fs';
import { Writable } from 'stream';

import PaulStretch from '../index.js';

import wav  from 'node-wav';
import cliProgress from 'cli-progress';

// create a new progress bar instance and use shades_classic theme
const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);



const paul = new PaulStretch(2, 4)
let buffer = fs.readFileSync('2.wav');
let result = wav.decode(buffer);
console.log(result.sampleRate);
console.log(result.channelData); // array of Float32Arrays
const outData = [[],[]]
bar1.start(result.channelData[0].length, 0);

for (let i=0; i<result.channelData[0].length; i++){
    const block = [new Float32Array([result.channelData[0][i]]), new Float32Array([result.channelData[1][i]])]
    paul.write(block)
    paul.process()
    const blockSize = 4096
    let outBlock = [new Float32Array(blockSize),new Float32Array(blockSize)]
    const recBlock = paul.read(outBlock)
    if(!!recBlock){
        outData[0].push(...recBlock[0])
        outData[1].push(...recBlock[1])
    }
    bar1.update(i);

}
bar1.stop()

console.log(outData)

const outBuf = wav.encode(outData, { sampleRate: result.sampleRate, float: true, bitDepth: 32 });
fs.writeFileSync('out.wav', outBuf);


