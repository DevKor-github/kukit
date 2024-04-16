import { build, emptyDir } from "@deno/dnt";

await emptyDir("./npm");

await build({
  entryPoints: ["./mod.ts"],
  outDir: "./npm",
  shims: {
    // see JS docs for overview and more options
    deno: true,
    undici: true,
  },
  package: {
    // package.json properties
    name: "kukit",
    version: Deno.args[0],
    description:
      "Simple API library for accessing KUPID (Korea University Portal to Information Depository)",
    license: "MIT",
    repository: {
      type: "git",
      url: "git+https://github.com/devkor-github/kukit.git",
    },
    bugs: {
      url: "https://github.com/devkor-github/kukit/issues",
    },
  },
  postBuild() {
    // steps to run after building and before running the tests
    Deno.copyFileSync("LICENSE", "npm/LICENSE");
    Deno.copyFileSync("README.md", "npm/README.md");
  },
});
