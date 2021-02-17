import { expect } from "chai"
import { SafeJSON } from "../../src/commonTypes/SafeJSON"
/// <reference path="../../src/commonTypes/types.d.ts" />

describe("JSONSerialized", () => {
    it("Should keep the correct type", () => {
        interface Foo {
            label: string
        }

        const orig: Foo = { label: "foo" }

        const serFoo = SafeJSON.stringify(orig)

        const copy = SafeJSON.parse(serFoo)

        expect(orig.label).to.equal(copy.label)
    })
})