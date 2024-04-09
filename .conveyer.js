import path from "node:path";
import { Conveyer, ESBuild } from "@nesvet/conveyer/stages";
import { Packages } from "@nesvet/conveyer/Packages";


const { NODE_ENV } = process.env;

const distDir = "dist";


new Conveyer([
	
	new ESBuild({
		entryPoints: [ "src/index.js" ],
		outfile: path.resolve(distDir, "index.js"),
		external: new Packages().external().asNames(),
		platform: "node",
		format: "esm",
		sourcemap: true,
		target: "node20",
		define: {
			"process.env.NODE_ENV": JSON.stringify(NODE_ENV)
		}
	})
	
], {
	initialCleanup: distDir,
	bumpVersions: { ignored: [ path.resolve(distDir, "**") ] }
});
