import { expect } from "chai";
import { IDGen } from "../../src/commonTypes/IDGen";
import { describeMember } from "../testUtil/describeMember";

describeMember(() => IDGen, () => {
    describeMember(() => IDGen.random, () => {
        it("Should generate random id with no invalid characters", () => {
            for (let i = 0; i < 100; i++) {
                const id = IDGen.random()

                expect(id).to.not.match(/(=|\+|\/)/g)
                expect(id.length).to.be.greaterThan(10)
            }

        })
    })
})