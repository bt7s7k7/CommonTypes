import { expect } from "chai";
import { Behaviour } from "../../src/commonTypes/Behaviour";
import { describeMember } from "../testUtil/describeMember";

describeMember(() => Behaviour, () => {
    describeMember(() => Behaviour.create, () => {
        function createBehaviourA() {
            const A = Behaviour.create<{ label: string }>().impl("A", (base, data) => class A extends base {
                public label = this[data].label
            })

            return { A }
        }

        function createBehaviourB({ A }: ReturnType<typeof createBehaviourA>) {
            const B = Behaviour.create<{ height: number }>()
                .extend(A)
                .impl("B", (base, data) => class B extends base {
                    public height = this[data].height
                    public sign = this.label + " " + this.height
                })

            return { B }
        }

        function createBehaviourC({ A }: ReturnType<typeof createBehaviourA>) {
            const C = Behaviour.create<{ width: number }>()
                .extend(A)
                .impl("C", (base, data) => class C extends base {
                    public width = this[data].width
                    public info = this.label + " " + this.width
                })

            return { C }
        }

        it("Should create a behaviour", () => {
            const { A } = createBehaviourA()
            const { B } = createBehaviourB({ A })

            const a = new A({ label: "Label" })

            expect(a.label).to.equal("Label")
            expect(A.within(a)).to.be.true
            expect(B.within(a)).to.be.false
        })

        it("Should properly inherit values from base behaviours", () => {
            const bA = createBehaviourA()
            const { B } = createBehaviourB(bA)

            const b = new B({ label: "Label", height: 58 })

            expect(b.height).to.equal(58)
            expect(b.sign).to.equal("Label 58")
            expect(b.label).to.equal("Label")
            expect(bA.A.within(b)).to.be.true
        })

        it("Should correctly execute shared dependencies", () => {
            const bA = createBehaviourA()
            const { B } = createBehaviourB(bA)
            const { C } = createBehaviourC(bA)

            const D = Behaviour.create()
                .extend(B)
                .extend(C)
                .impl("D", (base, data) => class D extends base {
                    public superInfo = this.sign + " " + this.info
                })

            const d = new D({ label: "Label", height: 17, width: 25 })

            expect(d.height).to.equal(17)
            expect(d.sign).to.equal("Label 17")
            expect(d.label).to.equal("Label")
            expect(d.info).to.equal("Label 25")
            expect(d.superInfo).to.equal("Label 17 Label 25")
            expect(bA.A.within(d)).to.be.true
            expect(B.within(d)).to.be.true
            expect(C.within(d)).to.be.true
            expect(D.within(d)).to.be.true
        })
    })
})