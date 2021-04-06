import { expect } from "chai"
import { inplaceSubclass } from "../../src/commonTypes/inplaceSubclass"
import { describeMember } from "../testUtil/describeMember"

function makeClasses() {
    class Base {
        public getValue() {
            return this.value
        }

        constructor(
            protected readonly value: number
        ) { }
    }

    const base = new Base(5)

    class Extended extends inplaceSubclass.base(Base) {
        public readonly superValue = this.value + this.increment

        getInc() {
            return this.value + this.increment
        }

        constructor(
            protected increment: number
        ) {
            super()
        }
    }

    class Extended2 extends inplaceSubclass.base(Base) {
        public getMessage() {
            return `Value: ${this.value}`
        }
    }

    return { Base, Extended, Extended2 }
}

describeMember(() => inplaceSubclass, () => {
    it("Should subclass an object in place", () => {
        const { Base, Extended } = makeClasses()
        const base = new Base(5)
        const extended = inplaceSubclass(base, Extended, [5])

        expect(extended).to.equal(base)
        expect(extended).to.be.instanceOf(Base)
        expect(extended).to.be.instanceOf(Extended)
        expect(base).to.be.instanceOf(Base)
        expect(base).to.be.instanceOf(Extended)
        expect(extended.getValue()).to.equal(5)
        expect(extended.getInc()).to.equal(10)
        expect(extended.superValue).to.equal(10)
    })

    it("Should error when subclassing to a not directly descendant class", () => {
        const { Base, Extended, Extended2 } = makeClasses()
        const base = new Base(5)

        inplaceSubclass(base, Extended, [5])

        expect(() => {
            inplaceSubclass(base, Extended2, [])
        }).to.throw("current: Extended, expected: Base")
    })
})