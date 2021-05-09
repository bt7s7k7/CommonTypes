import { IDGen } from "../commonTypes/IDGen"
import { range } from "../commonTypes/maths"

console.log("Random IDs: ")
for (const _ of range(10)) {
    console.log("  " + IDGen.random())
}