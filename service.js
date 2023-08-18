const fs = require("fs")
const ffmpeg = require("fluent-ffmpeg")
const mic = require("mic")
const dotenv = require('dotenv')
const { Readable } = require("stream")
const { Configuration, OpenAIApi } = require("openai")
const VAD = require("node-vad")

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
const vad = new VAD(VAD.Mode.VERY_AGGRESSIVE)

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

    micInputStream.on("data", (data) => {
      vad.processAudio(data, 16000).then(res => {
        switch (res) {
          case VAD.Event.ERROR:
            console.log("ERROR")
            break;
          case VAD.Event.NOISE:
            console.log("NOISE")
            break;
          case VAD.Event.SILENCE:
            return
          case VAD.Event.VOICE:
            console.log("VOICE")
            setTimeout(() => {
              micInstance.stop()
              resolve()
            }, 1000)
            break;
        }
      }).catch(console.error)
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
      
      const knownCommands = ["ışıkları kapat"]

      for (const command of knownCommands) {
        const completion = await openai.createChatCompletion({
          model: "gpt-3.5-turbo",
          messages: [{role: "user", content: `is this ${transcription} command meant to ${command} ? if so, answer just "yes". if not, answer "no". Dont answer anything else.`}]
        });
        
        if (completion.data.choices[0].message.content === "yes") {
          console.log("Command recognized!")
          break
        }
        else
          console.log(`${transcription} is not a known command.`)
      }
    } catch (err) {
      console.error(err)
    }
  }
}

main()