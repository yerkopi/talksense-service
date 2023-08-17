const fs = require("fs")
const ffmpeg = require("fluent-ffmpeg")
const mic = require("mic")
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
    apiKey: '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'
})
const openai = new OpenAIApi(config)

ffmpeg.setFfmpegPath("/usr/bin/ffmpeg")

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

    process.on("SIGINT", () => {
      micInstance.stop()
      console.log("Finished recording")
      resolve()
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
  const audioFilename = "recorded_audio.wav"
  await recordAudio(audioFilename)
  const transcription = await transcribeAudio(audioFilename)
  console.log("Transcription:", transcription)
}

main()