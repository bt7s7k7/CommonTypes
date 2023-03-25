const { build } = require("esbuild")
const { inspect } = require("util")

build({
    bundle: true,
    format: "cjs",
    entryPoints: ["./src/index.ts"],
    outfile: "dist/index.js",
    sourcemap: "external",
    external: [
        "./src/test.ts"
    ],
    logLevel: "info",
    platform: "node"
})
