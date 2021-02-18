
export function toString(value: any): string {
    if (typeof value == "object" && value == null) {
        return "null"
    } else if (typeof value == "undefined") {
        return "undefined"
    } else {
        return value.toString()
    }
}