const whisper = require('whisper-node')
const mic = require('mic')

console.log("Running service.js...")

const micInstance = mic({
    rate: '16000',
    channels: '1',
    hw: '0,0',
    device: 'hw:USBZH11SENC,0',
    debug: true
})

const micInputStream = micInstance.getAudioStream()

micInputStream.on('data', async function(data) {
    const transcript = await whisper(data)
    console.log(transcript)
})

micInputStream.on('error', function(err) {
    console.error(err)
})

micInputStream.on('start', function() {
    console.log('Mikrofon dinlemeye başladı')
})

micInstance.start()

process.on('SIGINT', function() {
    micInstance.stop()
})
