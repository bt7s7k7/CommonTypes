import { start as replStart } from "repl"
import { inspect, InspectOptions } from "util"
import * as Graph from "../comTypes/Graph"
import * as LinkedList from "../comTypes/LinkedList"
import * as MultiMap from "../comTypes/MultiMap"
import * as SortedArray from "../comTypes/SortedArray"
import * as comTypes from "../comTypes/util"

const repl = replStart()
Object.assign(repl.context, comTypes)
Object.assign(repl.context, Graph)
Object.assign(repl.context, LinkedList)
Object.assign(repl.context, MultiMap)
Object.assign(repl.context, SortedArray)

function defineCustomInspect<T extends abstract new (...args: any) => any>(ctor: T, callback: (this: InstanceType<T>, depth: number, options: InspectOptions, _inspect: typeof inspect) => any) {
    ctor.prototype[inspect.custom] = callback
}

defineCustomInspect(SortedArray.SortedArray, function (depth, options) {
    return "SortedArray " + inspect([...this], options)
})