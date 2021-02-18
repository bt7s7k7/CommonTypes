import { expect } from "chai";
import { Registry } from "../../src/commonTypes/Registry";
import { describeMember } from "../testUtil/describeMember";
import { mockInstance } from "../testUtil/mock";

describeMember(() => Registry, () => {
    interface Standard {
        id: string,
        height: number
    }

    interface Computed {
        firstName: string,
        secondName: string
    }

    interface Generated { }

    function createStandardRegistryType() {
        const StandardRegistry = Registry.define<Standard>()
            .addKey("id")
            .addKey("height")
            .build()

        return { StandardRegistry }
    }

    function createComputedRegistryType() {
        const ComputedRegistry = Registry.define<Computed>()
            .addComputedKey("fullName", v => `${v.firstName} ${v.secondName}`)
            .build()

        return { ComputedRegistry }
    }

    function createGeneratedRegistryType() {
        const RandomRegistry = Registry.define<Generated>()
            .addRandomID("uuid")
            .build()

        const IncrementRegistry = Registry.define<Generated>()
            .addIncrementID()
            .build()

        return { RandomRegistry, IncrementRegistry }
    }

    describeMember(() => Registry.define, () => {
        it("Should be able to crate a type", () => {
            const Type = Registry.define<void>().build()

            expect(Type).to.be.a("function")
            expect(new Type()).to.be.instanceOf(Type)
        })

        it("Should be able to create a registry with standard keys", () => {
            const { StandardRegistry } = createStandardRegistryType()
            const standardRegistry = new StandardRegistry()

            expect(standardRegistry.height).to.be.instanceOf(Registry.Key)
            expect(standardRegistry.id).to.be.instanceOf(Registry.Key)
        })

        it("Should be able to create a registry with computed keys", () => {
            const { ComputedRegistry } = createComputedRegistryType()
            const computedRegistry = new ComputedRegistry()

            expect(computedRegistry.fullName).to.be.instanceOf(Registry.Key)
        })

        it("Should be able to create a registry with random keys", () => {
            const { RandomRegistry } = createGeneratedRegistryType()
            const randomRegistry = new RandomRegistry()

            expect(randomRegistry.uuid).to.be.instanceOf(Registry.GeneratedKey)

        })

        it("Should be able to create a registry with incremented keys", () => {
            const { IncrementRegistry } = createGeneratedRegistryType()
            const incrementRegistry = new IncrementRegistry()

            expect(incrementRegistry.id).to.be.instanceOf(Registry.GeneratedKey)
        })
    })

    describe("Instance", () => {
        describeMember(() => mockInstance<Registry.Instance<any, any>>().register, () => {
            it("Should register a record", () => {
                const { StandardRegistry } = createStandardRegistryType()
                const standardRegistry = new StandardRegistry()

                standardRegistry.register({ id: "0", height: 5 })
            })

            it("Should register a record with a computed key", () => {
                const { ComputedRegistry } = createComputedRegistryType()
                const computedRegistry = new ComputedRegistry()

                computedRegistry.register({ firstName: "aa", secondName: "bb" })
            })

            it("Should throw an error on duplicate key", () => {
                const { StandardRegistry } = createStandardRegistryType()
                const standardRegistry = new StandardRegistry()

                standardRegistry.register({ id: "0", height: 5 })

                expect(() => {
                    standardRegistry.register({ id: "0", height: 5 })
                }).to.throw(`"id" = "0"`)

                expect(() => {
                    standardRegistry.register({ id: "1", height: 5 })
                }).to.throw(`"height" = "5"`)
            })

            it("Should throw an error on duplicate computed key", () => {
                const { ComputedRegistry } = createComputedRegistryType()
                const computedRegistry = new ComputedRegistry()

                computedRegistry.register({ firstName: "aa", secondName: "bb" })

                expect(() => {
                    computedRegistry.register({ firstName: "aa", secondName: "bb" })
                }).to.throw(`"fullName" = "aa bb"`)
            })

            it("Should generate incremented ids", () => {
                const { IncrementRegistry } = createGeneratedRegistryType()
                const incrementRegistry = new IncrementRegistry()

                const a = {}
                incrementRegistry.register(a)

                const b = {}
                incrementRegistry.register(b)

                expect(incrementRegistry.id.findReverse(a)).to.equal("0")
                expect(incrementRegistry.id.findReverse(b)).to.equal("1")
            })

            it("Should use id from options instead of incrementing a new one", () => {
                const { IncrementRegistry } = createGeneratedRegistryType()
                const incrementRegistry = new IncrementRegistry()

                const a = {}
                incrementRegistry.register(a, { genID: "__id" })

                expect(incrementRegistry.id.findReverse(a)).to.equal("__id")
            })

            it("Should use id from options instead of randomizing a new one", () => {
                const { RandomRegistry } = createGeneratedRegistryType()
                const randomRegistry = new RandomRegistry()

                const a = {}
                randomRegistry.register(a, { genID: "__id" })

                expect(randomRegistry.uuid.findReverse(a)).to.equal("__id")
            })

            it("Should skip used increment ids", () => {
                const { IncrementRegistry } = createGeneratedRegistryType()
                const incrementRegistry = new IncrementRegistry()

                const a = {}
                incrementRegistry.register(a, { genID: "1" })

                const b = {}
                incrementRegistry.register(b)

                const c = {}
                incrementRegistry.register(c)

                expect(incrementRegistry.id.findReverse(a)).to.equal("1")
                expect(incrementRegistry.id.findReverse(b)).to.equal("0")
                expect(incrementRegistry.id.findReverse(c)).to.equal("2")
            })

            it("Should generate random ids", () => {
                const { RandomRegistry } = createGeneratedRegistryType()
                const randomRegistry = new RandomRegistry()

                const a = {}
                randomRegistry.register(a)

                const b = {}
                randomRegistry.register(b)

                expect(randomRegistry.uuid.findReverse(a)).to.be.a("string")
                expect(randomRegistry.uuid.findReverse(b)).to.be.a("string")
            })
        })

        describeMember(() => mockInstance<Registry.Instance<any, any>>().unregister, () => {
            it("Should register a record", () => {
                const { StandardRegistry } = createStandardRegistryType()
                const standardRegistry = new StandardRegistry()

                standardRegistry.register({ id: "0", height: 5 })
                standardRegistry.unregister(standardRegistry.id.find("0"))
            })

            it("Should throw an error on duplicate id", () => {
                const { StandardRegistry } = createStandardRegistryType()
                const standardRegistry = new StandardRegistry()

                standardRegistry.register({ id: "0", height: 5 })

                expect(() => {
                    standardRegistry.register({ id: "0", height: 5 })
                }).to.throw(`"id" = "0"`)

                expect(() => {
                    standardRegistry.register({ id: "1", height: 5 })
                }).to.throw(`"height" = "5"`)
            })
        })

        describe("[key]", () => {
            function prepareRegistry() {
                const { StandardRegistry } = createStandardRegistryType()
                const standardRegistry = new StandardRegistry()

                const a: Standard = {
                    id: "0",
                    height: 58
                }

                const b: Standard = {
                    id: "1",
                    height: 128
                }

                standardRegistry
                    .register(a)
                    .register(b)

                return { standardRegistry, a, b }
            }

            describeMember(() => mockInstance<Registry.Instance<any, any>>().key.find, () => {
                it("Should find the correct record", () => {
                    const { a, b, standardRegistry } = prepareRegistry()

                    expect(standardRegistry.id.find(a.id)).to.equal(a)
                    expect(standardRegistry.height.find(a.height)).to.equal(a)
                    expect(standardRegistry.id.find(b.id)).to.equal(b)
                    expect(standardRegistry.height.find(b.height)).to.equal(b)
                })

                it("Should throw an error when not found", () => {
                    const { standardRegistry } = prepareRegistry()

                    expect(() => {
                        standardRegistry.id.find("invalid")
                    }).to.throw(`"invalid"`)
                })
            })

            describeMember(() => mockInstance<Registry.Instance<any, any>>().key.tryFind, () => {
                it("Should find the correct record", () => {
                    const { a, b, standardRegistry } = prepareRegistry()

                    expect(standardRegistry.id.tryFind(a.id)).to.equal(a)
                    expect(standardRegistry.height.tryFind(a.height)).to.equal(a)
                    expect(standardRegistry.id.tryFind(b.id)).to.equal(b)
                    expect(standardRegistry.height.tryFind(b.height)).to.equal(b)
                })

                it("Should return null when not found", () => {
                    const { standardRegistry } = prepareRegistry()

                    expect(standardRegistry.id.tryFind("invalid")).to.equal(null)
                })
            })

            describeMember(() => mockInstance<Registry.Instance<any, any>>().key.findReverse, () => {
                it("Should find the correct record", () => {
                    const { a, b, standardRegistry } = prepareRegistry()

                    expect(standardRegistry.id.findReverse(a)).to.equal(a.id)
                    expect(standardRegistry.height.findReverse(a)).to.equal(a.height)
                    expect(standardRegistry.id.findReverse(b)).to.equal(b.id)
                    expect(standardRegistry.height.findReverse(b)).to.equal(b.height)
                })

                it("Should throw an error when not found", () => {
                    const { standardRegistry } = prepareRegistry()

                    expect(() => {
                        standardRegistry.id.findReverse({ height: -1, id: "invalid" })
                    }).to.throw(`"[object Object]"`)
                })
            })

            describeMember(() => mockInstance<Registry.Instance<any, any>>().key.tryFind, () => {
                it("Should find the correct key", () => {
                    const { a, b, standardRegistry } = prepareRegistry()

                    expect(standardRegistry.id.tryFindReverse(a)).to.equal(a.id)
                    expect(standardRegistry.height.tryFindReverse(a)).to.equal(a.height)
                    expect(standardRegistry.id.tryFindReverse(b)).to.equal(b.id)
                    expect(standardRegistry.height.tryFindReverse(b)).to.equal(b.height)
                })

                it("Should return null when key not found", () => {
                    const { standardRegistry } = prepareRegistry()

                    expect(standardRegistry.id.tryFindReverse({ height: -1, id: "invalid" })).to.equal(null)
                })
            })
        })
    })
})