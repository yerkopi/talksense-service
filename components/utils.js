/**
 * @class Utils
 * @description Utility functions
 * @exports Utils
 * @static {Function} delay - Delays the execution of the program for a given amount of time
 * @static {Function} performTTS - Performs text-to-speech using Google Translate
 * @example Utils.delay(1000) // Delays the execution of the program for 1 second
 * @example Utils.performTTS("Hello world", "en", "alsa_output.pci-0000_00_1f.3.analog-stereo") // Performs text-to-speech using Google Translate
 * @exports Utils
 */

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
