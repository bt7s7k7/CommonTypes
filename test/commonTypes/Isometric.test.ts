import { expect } from "chai";
import { Isometric } from "../../src/commonTypes/Isometric";
import { describeMember } from "../testUtil/describeMember";

describeMember(() => Isometric, () => {
    describeMember(() => Isometric.toBase64, () => {
        it("Should convert string to base64", () => {
            const source = "foo"
            const result = "Zm9v"
            expect(Isometric.toBase64(source)).to.equal(result)
        })
    })

    describeMember(() => Isometric.fromBase64, () => {
        it("Should get string from base64", () => {
            const source = "Zm9v"
            const result = "foo"
            expect(Isometric.fromBase64(source)).to.equal(result)
        })
    })
})