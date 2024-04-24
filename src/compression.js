import zlib from "node:zlib";


const brotliPreloadOptions = {
	params: {
		[zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
		[zlib.constants.BROTLI_PARAM_QUALITY]: 11
	}
};

export let isBrotliSupported = false;

try {
	zlib.brotliCompressSync("", brotliPreloadOptions);
	isBrotliSupported = true;
} catch {}

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


export function brotliPreloadSync(data) {
	return zlib.brotliCompressSync(data, brotliPreloadOptions);
}

export function gzipPreloadSync(data) {
	return zlib.gzipSync(data, gzipPreloadOptions);
}

export function getCompressionStreamByEncoding(contentEncoding) {
	return (
		isBrotliSupported && contentEncoding === "br" ?
			zlib.createBrotliCompress(brotliRuntimeOptions) :
			zlib.createGzip(gzipRuntimeOptions)
	);
}

export function handleRequestCompressed(request, response, headers, data) {
	const isBrotliAccepted = isBrotliSupported && /\bbr\b/.test(request.headers["accept-encoding"]);
	headers["Content-Encoding"] = isBrotliAccepted ? "br" : "gzip";
	response.writeHead(200, headers).end(
		isBrotliAccepted ?
			zlib.brotliCompressSync(data, brotliRuntimeOptions) :
			zlib.gzipSync(data, gzipRuntimeOptions)
	);
	
}
