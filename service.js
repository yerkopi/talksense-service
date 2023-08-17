const { AbortController } = require('abort-controller')
const mic = require('mic')
const openai = require('openai')

console.log("Running service.js...")

const micInstance = mic({
    rate: '16000',
    channels: '1',
    hw: '0,0',
    device: 'hw:USBZH11SENC,0',
    debug: true
})

const micInputStream = micInstance.getAudioStream()

const openaiApiKey = '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'; 

micInputStream.on('data', function(data) {
    openai.apiKey = openaiApiKey;
    
    openai.Completion.create({
        engine: 'davinci',
        prompt: 'Convert the following audio to text: ' + data.toString('base64'),
        max_tokens: 100
    })
    .then(response => {
        const text = response.choices[0].text.trim();
        console.log('Transcription:', text)
    })
    .catch(error => {
        console.error('Error:', error)
    })
})

micInputStream.on('error', function(err) {
    console.error('Mic Error:', err)
})

micInstance.start()

process.on('SIGINT', function() {
    micInstance.stop()
})
