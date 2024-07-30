import { IncomingMessage, OutgoingHttpHeaders } from "node:http";
import zlib, { InputType } from "node:zlib";
import { InSiteServerResponse } from "./Response";


const brotliPreloadOptions = {
	params: {
		[zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
		[zlib.constants.BROTLI_PARAM_QUALITY]: 11
	}
};

const brotliRuntimeOptions = {
	params: {
		[zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
		[zlib.constants.BROTLI_PARAM_QUALITY]: 4
	}
};

const gzipPreloadOptions = {
	level: 9
};

const gzipRuntimeOptions = {
	level: 3
};


export function brotliPreloadSync(data: InputType) {
	return zlib.brotliCompressSync(data, brotliPreloadOptions);
}

export function gzipPreloadSync(data: InputType) {
	return zlib.gzipSync(data, gzipPreloadOptions);
}

export function getCompressionStreamByEncoding(contentEncoding: "br" | "gzip") {
	return contentEncoding === "br" ? zlib.createBrotliCompress(brotliRuntimeOptions) : zlib.createGzip(gzipRuntimeOptions);
}

export function handleRequestCompressed(request: IncomingMessage, response: InSiteServerResponse, headers: OutgoingHttpHeaders, data: InputType) {
	const isBrotliAccepted = /\bbr\b/.test(request.headers["accept-encoding"] as string);
	headers["Content-Encoding"] = isBrotliAccepted ? "br" : "gzip";
	response.writeHead(200, headers).end(isBrotliAccepted ? zlib.brotliCompressSync(data, brotliRuntimeOptions) : zlib.gzipSync(data, gzipRuntimeOptions));
	
}
