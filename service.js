const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const mic = require("mic");
const dotenv = require('dotenv');
const {
    Readable
} = require("stream");
const {
    Configuration,
    OpenAIApi
} = require("openai");
const VAD = require("node-vad");
const googleTTS = require("google-tts-api");
const {
    spawn
} = require("child_process");

dotenv.config();

const audioFileName = "prompt.wav";
const maxTranscriptionLength = 199;

console.log("Running service.js...");

const config = new Configuration({
    apiKey: process.env.OPENAI_API_KEY
});

const openai = new OpenAIApi(config);
const vad = new VAD(VAD.Mode.VERY_AGGRESSIVE);

ffmpeg.setFfmpegPath("/usr/bin/ffmpeg");

function Delay(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function flushFile() {
    console.log("Flushing file...");
    fs.unlinkSync(audioFileName);
    fs.copyFileSync("./dummy.wav", "./prompt.wav");
}

async function recordAudio(filename) {
    return new Promise((resolve, reject) => {
        const micInstance = mic({
            rate: process.env.MIC_RATE,
            channels: process.env.MIC_CHANNELS,
            fileType: "wav",
            device: process.env.MIC_DEVICE
        });

        const micInputStream = micInstance.getAudioStream();
        const output = fs.createWriteStream(filename);
        const writable = new Readable().wrap(micInputStream);

        console.log("Listening...");

        writable.pipe(output);

        micInstance.start();

        micInputStream.on("data", async (data) => {

            let fileSize = fs.statSync(filename).size;
            if (fileSize > 1000000)
                await flushFile();

            await vad.processAudio(data, 16000).then(async (res) => {
                switch (res) {
                    case VAD.Event.ERROR:
                        console.log("ERROR");
                        break;
                    case VAD.Event.NOISE:
                        console.log("NOISE");
                        break;
                    case VAD.Event.SILENCE:
                        console.log("SILENCE");
                        break;
                    case VAD.Event.VOICE:
                        console.log("VOICE detected");
                        setTimeout(async () => {
                            micInstance.stop();
                            resolve();
                        }, 2000);
                        break;
                }
            }).catch(console.error);
        });

        micInputStream.on("error", (err) => {
            reject(err);
        });
    });
}

async function transcribeAudio(filename) {
  const transcript = await openai.createTranscription(
      fs.createReadStream(filename),
      "whisper-1"
  );

  return transcript.data.text;
}

function tts(text) {
    const url = googleTTS.getAudioUrl(text, {
        lang: process.env.SPEECH_LANG,
        slow: false,
        host: 'https://translate.google.com',
    });

    spawn("mpv", [url, `--audio-device=${process.env.AUDIO_DEVICE}`, "--volume=100"], {});
}

async function main() {
    while (true) {
        await flushFile();

        await recordAudio(audioFileName);

        let transcription = await transcribeAudio(audioFileName);
        transcription = transcription.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
        transcription = transcription.replace(/[^a-zşçğüöı ]/g, "");
        transcription = transcription.toLowerCase();

        console.log(`Transcription: ${transcription}`);

        const knownCommands = [{
                name: "ışıkları kapat",
                cb: () => {
                    tts("Tamam, ışıkları kapatıyorum.");
                    console.log(response);
                }
            },
            {
                name: "bülbül gibi öt",
                cb: async () => {
                    const prompt = "Bana Türkçe bir şarkı sözü söyleyin. 199 karakteri geçmemeli.";
                    const completion = await openai.createChatCompletion({
                        model: "gpt-3.5-turbo",
                        messages: [{
                            role: "user",
                            content: prompt
                        }],
                    });

                    const response = completion.data.choices[0].message.content;

                    if (response.length <= maxTranscriptionLength) {
                        console.log(response);
                        tts(response);
                    } else {
                        console.log("Response too long for TTS.");
                    }
                }
            }
        ];

        let commandFound = false;
        for (const command of knownCommands) {
            if (transcription.includes(command.name)) {
                command.cb();
                commandFound = true;
                break;
            }
        }

        if (!commandFound) {
            tts("Özür dilerim, çok fazla gürültü var. Lütfen tekrar söyler misiniz?");
            console.log(response);
        }

        await Delay(5000);
    }
}

try {
    main()
} catch (err) {
    console.error(err);
}