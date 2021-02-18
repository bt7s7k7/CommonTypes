import { Isometric } from "./Isometric"

export namespace IDGen {
    export function random() {
        const makeSegment = () => parseInt(Math.random().toString().substr(2)).toString(16)

        const source = (makeSegment() + makeSegment() + makeSegment()).substr(0, 32)

        const bytes: number[] = []
        for (let i = 0; i < source.length / 2; i++) {
            const byte = source.substr(i * 2, 2)
            bytes.push(parseInt(byte, 16))
        }
        const binary = String.fromCharCode(...bytes)
        const base64 = Isometric.toBase64(binary)

        return base64.replace(/\//g, "_").replace(/\+/g, "-").replace(/=/g, "")
    }
}