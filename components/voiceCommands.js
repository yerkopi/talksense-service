/**
 * @typedef {Object} Command
 * @property {string} name
 * @property {Function} cb
 * @example const command = { name: "turn off the lights", cb: () => console.log("Lights turned off.") }
 * @exports Command
 */

class VoiceCommands {
    constructor(knownCommands) {
        this.knownCommands = knownCommands
    }

    handle(transcription) {
        for (const command of this.knownCommands) {
            if (transcription.includes(command.name)) {
                command.cb()
                return true
            }
        }
        return false
    }
}

module.exports = VoiceCommands
