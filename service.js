const fs = require("fs")
const ffmpeg = require("fluent-ffmpeg")
const mic = require("mic")
const dotenv = require('dotenv')
const { Readable } = require("stream")
const { Configuration, OpenAIApi } = require("openai")

console.log("Running service.js...")

const micInstance = mic({
    rate: '16000',
    channels: '1',
    hw: '0,0',
    device: 'hw:USBZH11SENC,0',
    debug: true
})

const micInputStream = micInstance.getAudioStream()

const config = new Configuration({
    apiKey: dotenv.config().parsed.OPENAI_API_KEY
})
const openai = new OpenAIApi(config)

ffmpeg.setFfmpegPath("/usr/bin/ffmpeg")

function calculateRMS(data) {
  let sum = 0
  
  for (let i = 0; i < data.length; i++)
    sum += data[i] * data[i]

  const mean = sum / data.length
  const rms = Math.sqrt(mean)

  return rms
}

function recordAudio(filename) {
  return new Promise((resolve, reject) => {
    const micInstance = mic({
      rate: "16000",
      channels: "1",
      fileType: "wav",
      device: 'hw:USBZH11SENC,0'
    })

    const micInputStream = micInstance.getAudioStream()
    const output = fs.createWriteStream(filename)
    const writable = new Readable().wrap(micInputStream)

    console.log("Recording... Press Ctrl+C to stop.")

    writable.pipe(output)

    micInstance.start()

    micInputStream.on("data", (data) => {
      const rms = calculateRMS(data)
      if (rms < silenceThreshold) {
        setTimeout(() => {
          micInstance.stop()
          resolve()
        }, 2000)
      }
    })

    micInputStream.on("error", (err) => {
      reject(err)
    })
  })
}

async function transcribeAudio(filename) {
  const transcript = await openai.createTranscription(
    fs.createReadStream(filename),
    "whisper-1"
  )
  return transcript.data.text
}

async function main() {
    while (true) {
      try {
        const audioFilename = "recorded_audio.wav"
        await recordAudio(audioFilename)
        const transcription = await transcribeAudio(audioFilename)
        
        if (transcription.search("ışıkları kapat") != -1) 
            console.log("closing lights")
        else
            console.log("unknown command")
      } catch {

      }
    }
}

main()