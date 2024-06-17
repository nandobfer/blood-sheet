import { Sheet } from "./src/class/Sheet"

const run = async () => {
    const sheet = new Sheet()
    await sheet.run()
}

run()