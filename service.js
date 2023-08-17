const Whisper = require('whisper-nodejs')
const mic = require('mic')

console.log("Running service.js...")

const whisper = new Whisper('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')
const micInstance = mic({
    rate: '16000',
    channels: '1',
    debug: true
})

const micInputStream = micInstance.getAudioStream()

// Mikrofonu dinlemeye başla
micInputStream.on('data', function(data) {
    whisper.transcribeBuffer(data, 'whisper-1')
        .then(text => {
            console.log(text)
        })
        .catch(error => {
            console.error(error)
        })
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
