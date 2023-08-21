const googleTTS = require("google-tts-api")
const { spawn } = require("child_process")

class Utils {
    static delay(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms)
        })
    }

    static performTTS(text, lang, audioDevice) {
        const url = googleTTS.getAudioUrl(text, {
            lang,
            slow: false,
            host: "https://translate.google.com",
        })

        spawn("mpv", [url, `--audio-device=${audioDevice}`, "--volume=100"], {})
    }
}

module.exports = Utils
