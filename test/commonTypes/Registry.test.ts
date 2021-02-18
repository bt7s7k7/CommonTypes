import { expect } from "chai";
import { Registry } from "../../src/commonTypes/Registry";
import { describeMember } from "../testUtil/describeMember";
import { mockInstance } from "../testUtil/mock";

describeMember(() => Registry, () => {
    interface Foo {
        id: string,
        height: number
    }

    function createFooRegistryType() {
        const FooRegistry = Registry.define<Foo>()
            .addKey("id")
            .addKey("height")
            .build()

        return FooRegistry
    }

    describeMember(() => Registry.define, () => {
        it("Should be able to crate a type", () => {
            new (createFooRegistryType())()
        })
    })

    describe("Instance", () => {
        it("Should be instance of type", () => {
            const type = createFooRegistryType()
            const instance = new type()

            expect(instance).instanceOf(type)
        })

        describeMember(() => mockInstance<Registry.Instance<any, any>>().register, () => {
            it("Should register a record", () => {
                const FooRegistry = createFooRegistryType()
                const fooRegistry = new FooRegistry()

                fooRegistry.register({ id: "0", height: 5 })
            })

            it("Should throw an error on duplicate id", () => {
                const FooRegistry = createFooRegistryType()
                const fooRegistry = new FooRegistry()

                fooRegistry.register({ id: "0", height: 5 })

                expect(() => {
                    fooRegistry.register({ id: "0", height: 5 })
                }).to.throw(`"id" = "0"`)

                expect(() => {
                    fooRegistry.register({ id: "1", height: 5 })
                }).to.throw(`"height" = "5"`)
            })
        })

        describeMember(() => mockInstance<Registry.Instance<any, any>>().unregister, () => {
            it("Should register a record", () => {
                const FooRegistry = createFooRegistryType()
                const fooRegistry = new FooRegistry()

                fooRegistry.register({ id: "0", height: 5 })
                fooRegistry.unregister(fooRegistry.id.find("0"))
            })

            it("Should throw an error on duplicate id", () => {
                const FooRegistry = createFooRegistryType()
                const fooRegistry = new FooRegistry()

                fooRegistry.register({ id: "0", height: 5 })

                expect(() => {
                    fooRegistry.register({ id: "0", height: 5 })
                }).to.throw(`"id" = "0"`)

                expect(() => {
                    fooRegistry.register({ id: "1", height: 5 })
                }).to.throw(`"height" = "5"`)
            })
        })

        describe("[key]", () => {
            function prepareRegistry() {
                const FooRegistry = createFooRegistryType()
                const fooRegistry = new FooRegistry()

                const a: Foo = {
                    id: "0",
                    height: 58
                }

                const b: Foo = {
                    id: "1",
                    height: 128
                }

                fooRegistry
                    .register(a)
                    .register(b)

                return { fooRegistry, a, b }
            }

            describeMember(() => mockInstance<Registry.Instance<any, any>>().key.find, () => {
                it("Should find the correct record", () => {
                    const { a, b, fooRegistry } = prepareRegistry()

                    expect(fooRegistry.id.find(a.id)).to.equal(a)
                    expect(fooRegistry.height.find(a.height)).to.equal(a)
                    expect(fooRegistry.id.find(b.id)).to.equal(b)
                    expect(fooRegistry.height.find(b.height)).to.equal(b)
                })

                it("Should throw an error when not found", () => {
                    const { fooRegistry } = prepareRegistry()

                    expect(() => {
                        fooRegistry.id.find("invalid")
                    }).to.throw(`"invalid"`)
                })
            })

            describeMember(() => mockInstance<Registry.Instance<any, any>>().key.tryFind, () => {
                it("Should find the correct record", () => {
                    const { a, b, fooRegistry } = prepareRegistry()

                    expect(fooRegistry.id.tryFind(a.id)).to.equal(a)
                    expect(fooRegistry.height.tryFind(a.height)).to.equal(a)
                    expect(fooRegistry.id.tryFind(b.id)).to.equal(b)
                    expect(fooRegistry.height.tryFind(b.height)).to.equal(b)
                })

                it("Should return null when not found", () => {
                    const { fooRegistry } = prepareRegistry()

                    expect(fooRegistry.id.tryFind("invalid")).to.equal(null)
                })
            })

            describeMember(() => mockInstance<Registry.Instance<any, any>>().key.findReverse, () => {
                it("Should find the correct record", () => {
                    const { a, b, fooRegistry } = prepareRegistry()

                    expect(fooRegistry.id.findReverse(a)).to.equal(a.id)
                    expect(fooRegistry.height.findReverse(a)).to.equal(a.height)
                    expect(fooRegistry.id.findReverse(b)).to.equal(b.id)
                    expect(fooRegistry.height.findReverse(b)).to.equal(b.height)
                })

                it("Should throw an error when not found", () => {
                    const { fooRegistry } = prepareRegistry()

                    expect(() => {
                        fooRegistry.id.findReverse({ height: -1, id: "invalid" })
                    }).to.throw(`"[object Object]"`)
                })
            })

            describeMember(() => mockInstance<Registry.Instance<any, any>>().key.tryFind, () => {
                it("Should find the correct key", () => {
                    const { a, b, fooRegistry } = prepareRegistry()

                    expect(fooRegistry.id.tryFindReverse(a)).to.equal(a.id)
                    expect(fooRegistry.height.tryFindReverse(a)).to.equal(a.height)
                    expect(fooRegistry.id.tryFindReverse(b)).to.equal(b.id)
                    expect(fooRegistry.height.tryFindReverse(b)).to.equal(b.height)
                })

                it("Should return null when key not found", () => {
                    const { fooRegistry } = prepareRegistry()

                    expect(fooRegistry.id.tryFindReverse({ height: -1, id: "invalid" })).to.equal(null)
                })
            })
        })
    })
})