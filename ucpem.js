/// <reference path="./.vscode/config.d.ts" />
const { project, github } = require("ucpem")
// @ts-check

const src = project.prefix("src")

src.res("commonTypes")

project.prefix("test").use(github("bt7s7k7/TestUtil").res("testUtil"))