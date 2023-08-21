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
