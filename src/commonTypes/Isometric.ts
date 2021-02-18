export namespace Isometric {
    export function toBase64(source: string): string {
        // @ts-ignore
        return "btoa" in globalThis ? globalThis.btoa(source) : "Buffer" in globalThis ? Buffer.from(source, "binary").toString("base64") : (() => { throw new Error("No function found to get base64") })()
    }

    export function fromBase64(source: string): string {
        // @ts-ignore
        return "atob" in globalThis ? globalThis.atob(source) : "Buffer" in globalThis ? Buffer.from(source, "base64").toString("binary") : (() => { throw new Error("No function found to parse base64") })()
    }
}