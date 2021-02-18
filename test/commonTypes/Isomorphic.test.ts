import { expect } from "chai";
import { Isomorphic } from "../../src/commonTypes/Isomorphic";
import { describeMember } from "../testUtil/describeMember";

describeMember(() => Isomorphic, () => {
    describeMember(() => Isomorphic.toBase64, () => {
        it("Should convert string to base64", () => {
            const source = "foo"
            const result = "Zm9v"
            expect(Isomorphic.toBase64(source)).to.equal(result)
        })
    })

    describeMember(() => Isomorphic.fromBase64, () => {
        it("Should get string from base64", () => {
            const source = "Zm9v"
            const result = "foo"
            expect(Isomorphic.fromBase64(source)).to.equal(result)
        })
    })
})