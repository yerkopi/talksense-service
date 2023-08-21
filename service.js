const Utils = require("./utils")
const VoiceCommands = require("./voiceCommands")

const fs = require("fs")
const mic = require("mic")
const { Readable } = require("stream")
const { Configuration, OpenAIApi } = require("openai")
const VAD = require("node-vad")
const dotenv = require("dotenv")

dotenv.config()

class VoiceAssistant {
    constructor() {
        this.audioFileName = "prompt.wav"
        this.maxTranscriptionLength = 199

        this.config = new Configuration({
            apiKey: process.env.OPENAI_API_KEY,
        })

        this.openai = new OpenAIApi(this.config)
        this.vad = new VAD(VAD.Mode.VERY_AGGRESSIVE)

        this.knownCommands = [
            {
                name: "ışıkları kapat",
                cb: (response = "Tamam, ışıkları kapatıyorum.") => {
                    Utils.performTTS(response, process.env.SPEECH_LANG, process.env.AUDIO_DEVICE)
                    console.log(response)
                },
            },
            {
                name: "bülbül gibi öt",
                cb: async () => {
                    const prompt = `Create me a poem. Should not be longer than ${this.maxTranscriptionLength} characters. And language should be ${process.env.SPEECH_LANG}.`
                    const completion = await this.openai.createChatCompletion({
                        model: "gpt-3.5-turbo",
                        messages: [{ role: "user", content: prompt }],
                    })

                    const response = completion.data.choices[0].message.content

                    if (response.length <= this.maxTranscriptionLength) {
                        console.log(response)
                        Utils.performTTS(response, process.env.SPEECH_LANG, process.env.AUDIO_DEVICE)
                    } else {
                        console.log("Response too long for TTS.")
                    }
                },
            },
        ]

        this.voiceCommands = new VoiceCommands(this.knownCommands)
    }

    async flushFile() {
        console.log("Flushing file...")
        fs.unlinkSync(this.audioFileName)
        fs.copyFileSync("./dummy.wav", "./prompt.wav")
    }

    async recordAudio() {
        return new Promise((resolve, reject) => {
            const micInstance = mic({
                rate: process.env.MIC_RATE,
                channels: process.env.MIC_CHANNELS,
                fileType: "wav",
                device: process.env.MIC_DEVICE
            })
    
            const micInputStream = micInstance.getAudioStream()
            const output = fs.createWriteStream(filename)
            const writable = new Readable().wrap(micInputStream)
    
            console.log("Listening...")
    
            writable.pipe(output)
    
            micInstance.start()
    
            micInputStream.on("data", async (data) => {
    
                let fileSize = fs.statSync(filename).size
                if (fileSize > 1000000)
                    await flushFile()
    
                await vad.processAudio(data, 16000).then(async (res) => {
                    switch (res) {
                        case VAD.Event.ERROR:
                            console.log("ERROR")
                            break
                        case VAD.Event.NOISE:
                            console.log("NOISE")
                            break
                        case VAD.Event.SILENCE:
                            console.log("SILENCE")
                            break
                        case VAD.Event.VOICE:
                            console.log("VOICE detected")
                            setTimeout(async () => {
                                micInstance.stop()
                                resolve()
                            }, 2000)
                            break
                    }
                }).catch(console.error)
            })
    
            micInputStream.on("error", (err) => {
                reject(err)
            })
        })
    }

    async transcribeAudio() {
        const transcript = await openai.createTranscription(
            fs.createReadStream(filename),
            "whisper-1"
        )
      
        return transcript.data.text
    }

    async mainLoop() {
        while (true) {
            await this.flushFile()

            await this.recordAudio()

            let transcription = await this.transcribeAudio()
            transcription = transcription.replace(/[.,\/#!$%\^&\*:{}=\-_`~()]/g, "")
            transcription = transcription.replace(/[^a-zşçğüöı ]/g, "")
            transcription = transcription.toLowerCase()

            console.log(`Transcription: ${transcription}`)

            const commandFound = this.voiceCommands.handle(transcription)

            if (!commandFound) {
                Utils.performTTS("Özür dilerim, çok fazla gürültü var. Lütfen tekrar söyler misiniz?", process.env.SPEECH_LANG, process.env.AUDIO_DEVICE)
                console.log(response)
            }

            await Utils.delay(5000)
        }
    }

    async start() {
        try {
            await this.mainLoop()
        } catch (err) {
            console.error(err)
        }
    }
}

const voiceAssistant = new VoiceAssistant()
voiceAssistant.start()