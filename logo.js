const ctx = draw()
const scale = 1.6
ctx.setSize(new Point(430 * scale, 320 * scale))
const size = 100 * scale
const height = (size ** 2 - (size / 2) ** 2) ** 0.5

const triangle = (pos, rot) => {
    const start = pos
    const a = Point.fromAngle(Math.PI / 6 + rot).mul(size).add(start)
    const b = Point.fromAngle(-Math.PI / 6 + rot).mul(size).add(start)
    return ctx.beginPath().move(start).lineTo(a).lineTo(b).closePath().fill()
}

//ctx.setStyle(Color.white).strokeRect(ctx.size)

ctx.setStyle(Color.cyan)
const UP = 0
const DOWN = Math.PI
const LEFT = Math.PI * 0.5
const RIGHT = Math.PI * 1.5
let x = 250 * size / 100
let y = 60 * size / 100

const sail = t => Color.blue.lerp(Color.cyan, 0.75).mul(0.5).lerp(Color.cyan.lerp(Color.white, 0.5), t)
triangle(new Point(x, y), RIGHT).setStyle(sail(0)).fill()
triangle(new Point(x, y + size), RIGHT).setStyle(sail(0.5)).fill()
triangle(new Point(x + height, y + size / 2), RIGHT).setStyle(sail(0.75)).fill()
triangle(new Point(x - height, y + size / 2), LEFT).setStyle(sail(0.25)).fill()

ctx.setStyle(Color.orange)
const hull = t => Color.orange.mul(0.5).lerp(Color.orange.lerp(Color.white, 0.5), t)
y -= 0.5 * size
y += size * 2 + height
x -= size / 1.1851851851851851

triangle(new Point(x - size, y), DOWN).setStyle(hull(0.1)).fill()
triangle(new Point(x, y), DOWN).setStyle(hull(0.3)).fill()
triangle(new Point(x + size, y), DOWN).setStyle(hull(0.35)).fill()
triangle(new Point(x + size * 2, y), DOWN).setStyle(hull(0.5)).fill()

triangle(new Point(x - size / 2, y - height), UP).setStyle(hull(0.15)).fill()
triangle(new Point(x + size / 2, y - height), UP).setStyle(hull(0.25)).fill()
triangle(new Point(x + size * 1.5, y - height), UP).setStyle(hull(0.4)).fill()
