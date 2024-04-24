import path from "node:path";
import fse from "fs-extra";
import {
	brotliPreloadSync,
	getCompressionStreamByEncoding,
	gzipPreloadSync,
	isBrotliSupported
} from "../../compression";
import { defaultExtensions } from "./extensions";
import { defaultPreloaded } from "./preloaded";


const nullExtension = {
	mimeType: "application/octet-stream"
};


// @FIXME:
////////////////////////////////////////////////////////////////////////////////

import fs from "node:fs";


let __basedir = process.argv[1];

while (__basedir !== "/" && !fs.existsSync(path.join(__basedir, "package.json")))
	__basedir = path.dirname(__basedir);

////////////////////////////////////////////////////////////////////////////////


class InSiteStaticMiddleware {
	constructor(options = {}) {
		let {
			src = "",
			urlPrefix = "",
			requestRegExp,
			extensions = defaultExtensions,
			resolved,
			restricted,
			preloaded
		} = options;
		
		this.src = path.isAbsolute(src) ? src : path.resolve(__basedir, src);
		this.urlPrefix = urlPrefix;
		this.urlPrefixRegExp = new RegExp(`^${path.join("/", urlPrefix, "/")}`);
		
		if (extensions)
			for (const extension of extensions)
				if (extension)
					this.addExtension(...extension);
		
		if (resolved)
			for (const resolvee of resolved)
				if (resolvee)
					this.resolve(...resolvee);
		
		if (restricted)
			for (const fileName of restricted)
				if (fileName)
					this.restrict(fileName);
		
		if (preloaded) {
			if (preloaded === "default")
				preloaded = defaultPreloaded;
			
			for (const fileName of preloaded)
				if (fileName)
					this.preload(fileName);
		}
		
		this.listeners = { GET: [
			[ requestRegExp ?? new RegExp(`^${path.join("/", this.urlPrefix, "/")}(\\w[^\\/]*/)*[^\\/]+\\.[^\\/]`), this.handler ]
		] };
		
	}
	
	extensions = new Map();
	
	resolved = new Map();
	
	restricted = new Set();
	
	preloaded = new Map();
	
	getExtensionBy(fileName) {
		return this.extensions.get(fileName.substring(fileName.lastIndexOf(".") + 1)) ?? nullExtension;
	}
	
	addExtension(name, extension) {
		this.extensions.set(name, { ...extension, name });
		
	}
	
	resolve(url, fileName) {
		this.resolved.set(url, path.isAbsolute(fileName) ? fileName : path.join(this.src, fileName));
		
	}
	
	restrict(fileName) {
		this.restricted.add(path.join(this.src, fileName));
		
	}
	
	preload(fileName) {
		fileName = this.resolved.get(fileName) ?? path.join(this.src, fileName);
		
		try {
			const { isText } = this.getExtensionBy(fileName);
			const fileData = fse.readFileSync(fileName, isText ? "utf8" : null);
			this.preloaded.set(fileName, isText ? {
				...isBrotliSupported && { br: brotliPreloadSync(fileData) },
				gzip: gzipPreloadSync(fileData)
			} : fileData);
		} catch (error) {
			console.warn(`⚠️  inSite Server Static: Unable to preload ${fileName}`, "\n", error);
		}
		
	}
	
	handler = async (request, response) => {
		let fileName = decodeURI(request.url).replace(this.urlPrefixRegExp, "").replace(/\.\.\//g, "");
		fileName = this.resolved.get(fileName) ?? path.join(this.src, fileName);
		
		if (this.restricted.has(fileName))
			return false;
		if (!await fse.pathExists(fileName))
			return response.notFound();
		
		const { mimeType, isText } = this.getExtensionBy(fileName);
		const contentEncoding = isText ? isBrotliSupported && /\bbr\b/.test(request.headers["accept-encoding"]) ? "br" : "gzip" : null;
		
		response.writeHead(200, {
			"Content-Type": mimeType + (isText ? "; charset=utf-8" : ""),
			"Content-Encoding": contentEncoding
		});
		
		const preloaded = this.preloaded.get(fileName);
		
		if (preloaded)
			response.end(isText ? preloaded[contentEncoding] : preloaded);
		else
			return new Promise(resolve => {
				let stream = fse.createReadStream(fileName).on("error", () => resolve(false));
				if (contentEncoding)
					stream = stream.pipe(getCompressionStreamByEncoding(contentEncoding));
				stream.on("end", resolve);
				stream.pipe(response);
			});
		
		
	};
	
}

export { InSiteStaticMiddleware as StaticMiddleware };
