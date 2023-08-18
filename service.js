const fs = require("fs")
const ffmpeg = require("fluent-ffmpeg")
const mic = require("mic")
const dotenv = require('dotenv')
const { Readable } = require("stream")
const { Configuration, OpenAIApi } = require("openai")
const VAD = require("node-vad")
const googleTTS = require("google-tts-api")
const spawn = require("child_process").spawn

const audioFileName = "prompt.wav"

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
      rate: dotenv.config().parsed.MIC_RATE,
      channels: dotenv.config().parsed.MIC_CHANNELS,
      fileType: "wav",
      device: dotenv.config().parsed.MIC_DEVICE
    })

    const micInputStream = micInstance.getAudioStream()
    const output = fs.createWriteStream(filename)
    const writable = new Readable().wrap(micInputStream)

    console.log("Listening...")

    writable.pipe(output)

    micInstance.start()

    let listening = false

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
            if (listening) {
              setTimeout(() => {
                if (listening) {
                  micInstance.stop()
                  listening = !listening
                  resolve()
                }
              }, 1000)
            }
            return
          case VAD.Event.VOICE:
            if (!listening)
              listening = !listening
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
      await recordAudio(audioFileName)
      transcription = await transcribeAudio(audioFileName)
      transcription = transcription.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
      transcription = transcription.replace(/[^a-zşçğüöı ]/g, "")
      transcription = transcription.toLowerCase()

      console.log(`Transcription: ${transcription}`)

      const knownCommands = [{
        "name": "ışıkları kapat",
        "cb": (transcription) => {
          const response = "Işıklar kapatılıyor."
          const url = googleTTS.getAudioUrl(response, {
            lang: 'tr',
            slow: false,
            host: 'https://translate.google.com',
          })

          spawn("mpv", [url, "--audio-device=alsa/front:CARD=USBZH11SENC,DEV=0", "--volume=100"], {})
          console.log(response)
        }
      },
      {
        "name": "bülbül gibi öt",
        "cb": async (transcription) => {

          const completion = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [{role: "user", content: "Say me a Turkish song lyrics. Shouldnt be over 199 characters."}],
          }).then((res) => {

            const response = res.data.choices[0].message.content
            console.log(response)
            
            const url = googleTTS.getAudioUrl(response, {
              lang: 'tr',
              slow: false,
              host: 'https://translate.google.com',
            })
  
            spawn("mpv", [url, "--audio-device=alsa/front:CARD=USBZH11SENC,DEV=0", "--volume=100"], {})
          }).catch(console.error)
        }
      }
    ]

      let commandFound = false
      for (const command of knownCommands) {
        if (transcription.includes(command.name)) {
          command.cb(transcription)
          commandFound = true
          break
        }
      }

      const response = "Özür dilerim, çok fazla gürültü var. Lütfen tekrar söyler misiniz?"
      if (!commandFound) {
        const url = googleTTS.getAudioUrl(response, {
          lang: 'tr',
          slow: false,
          host: 'https://translate.google.com',
        })

        spawn("mpv", [url, "--audio-device=alsa/front:CARD=USBZH11SENC,DEV=0", "--volume=100"], {})
        console.log(response)
      }

    } catch (err) {
      console.error(err)
    }
  }
}

main()
