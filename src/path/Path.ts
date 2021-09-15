export namespace Path {
    export function join(...segments: string[]) {
        const isRoot = segments[0]?.[0] == "/"

        const actualSegments = []
        let negative = 0

        for (const segment of segments) {
            if (segment[0] == "/") actualSegments.length = 0
            const segments = segment.split("/")

            for (const segment of segments) {
                if (segment == ".") {
                    continue
                } else if (segment == "..") {
                    if (actualSegments.length == 0) negative++
                    else actualSegments.pop()
                } else if (segment == "") {
                    continue
                } else {
                    actualSegments.push(segment)
                }
            }
        }

        return (isRoot ? "/" : "") + [...Array(negative).fill(".."), ...actualSegments].join("/")
    }

    export function basename(path: string, { removeExtension = false }: { removeExtension?: boolean } = {}) {
        const nameStart = path.lastIndexOf("/") + 1
        const name = nameStart == -1 ? path : path.slice(nameStart)

        if (removeExtension) {
            const extStart = name.lastIndexOf(".")
            if (extStart != 0 && extStart != -1) {
                return name.slice(0, extStart)
            }
        }

        return name
    }

    export function extname(path: string) {
        const extStart = path.lastIndexOf(".")
        if (extStart != 0 && extStart != -1) {
            return path.slice(extStart)
        }

        return ""
    }

    export function parse(path: string) {
        const normalized = join(path)

        const nameStart = path.lastIndexOf("/")
        const basename = nameStart == -1 ? path : path.slice(nameStart + 1)
        const pathname = nameStart == -1 ? "" : path.slice(0, nameStart)

        const extStart = basename.lastIndexOf(".")
        const extname = extStart != 0 && extStart != -1 ? basename.slice(extStart) : ""
        const stem = extStart != 0 && extStart != -1 ? basename.slice(0, extStart) : ""

        return { normalized, basename, pathname, extname, stem }
    }
}