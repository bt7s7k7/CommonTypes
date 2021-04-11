import { expect } from "chai"
import { TypeVerifier } from "../../src/commonTypes/TypeVerifier"
import { describeMember } from "../testUtil/describeMember"

function basicVerifierFactory() {
    const verifier = TypeVerifier.create()
        .prop("name", v => v.string())
        .prop("height", v => v.number())
        .build()

    return verifier
}

function complexVerifierFactory() {
    const verifier = TypeVerifier.create()
        .prop("name", v => v.string())
        .prop("height", v => v.number().optional())
        .prop("homes", v => v.object()
            .prop("address", v => v.string())
            .array()
        )
        .prop("nicknames", v => v.string().record())
        .build()

    return verifier
}

describeMember(() => TypeVerifier, () => {
    it("Should be able to create a basic verifier", () => {
        basicVerifierFactory()
    })

    it("Should be able to create a complex verifier", () => {
        complexVerifierFactory()
    })

    it("Should throw error on invalid value", () => {
        const basic = basicVerifierFactory()
        expect(() => {
            basic.validate({
                name: 5
            })
        }).to.throw("Invalid type at .name : Expected string")

        expect(() => {
            basic.validate({
                name: "foo"
            })
        }).to.throw(`Invalid type at . : Missing property "height"`)

        const complex = complexVerifierFactory()
        expect(() => {
            complex.validate({
                name: "foo",
                height: null,
            })
        }).to.throw(`Invalid type at . : Missing property "homes"`)

        expect(() => {
            complex.validate({
                name: "foo",
                homes: [
                    {
                        address: "there"
                    },
                    {
                        address: 5
                    }
                ]
            })
        }).to.throw(`Invalid type at .homes.[1].address : Expected string`)

        expect(() => {
            complex.validate({
                name: "foo",
                homes: [],
                nicknames: {
                    "boo": "Boo",
                    "baz": 3
                }
            })
        }).to.throw("Invalid type at .nicknames.[baz] : Expected string")
    })
})