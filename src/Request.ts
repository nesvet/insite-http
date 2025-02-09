import { IncomingMessage } from "node:http";
import querystring from "node:querystring";
import { matchSymbol } from "./symbols";
import { extractQueryParams, extractUrlParams } from "./utils";
import type { RequestParams, RequestQueryParams } from "./types";


/* eslint-disable @typescript-eslint/no-explicit-any */


export function matches(request: Request, regExp: RegExp) {
	const match = regExp.exec(request.path);
	
	if (match) {
		request[matchSymbol] = match;
		
		return true;
	}
	
	return false;
}


export class RequestBody {
	constructor(request: Request<any>) {
		this.#request = request;
		
	}
	
	#request;
	
	/** Request body as a ReadableStream */
	stream() {
		return this.#request;
	}
	
	#text?: string;
	
	/** Request body as a string */
	text() {
		return new Promise<string>((resolve, reject) => {
			
			if (this.#text)
				resolve(this.#text);
			else {
				let text = "";
				
				this.#request.on("data", chunk => { text += chunk; });
				this.#request.on("end", () => { resolve(this.#text = text); });
				
				this.#request.on("error", reject);
			}
			
		});
	}
	
	/** Request body as an Uint8Array */
	async bytes() {
		return new TextEncoder().encode(await this.text());
	}
	
	/** Request body as an ArrayBuffer */
	async arrayBuffer() {
		return (await this.bytes()).buffer;
	}
	
	/** Request body as a parsed JSON object */
	async json() {
		return JSON.parse(await this.text());
	}
	
	/** Request body as a parsed URL-encoded object */
	async urlEncoded() {
		return querystring.parse(await this.text());
	}
	
	// TODO:
	/** Request body as a parsed MessagePack object */
	// messagePack() {
	// }
	
}


declare module "node:http" {
	interface IncomingMessage { // eslint-disable-line no-shadow
		_addHeaderLine(field: string, value: string, first: boolean): void;
	}
}

export class Request<P = RequestParams> extends IncomingMessage {
	
	declare url: string;
	
	/** Pathname part of the URL string */
	path!: string;
	
	/** Query string part of the URL string */
	querystring!: string;
	
	_addHeaderLine(field: string, value: string, first: boolean): void {
		super._addHeaderLine(field, value, first);
		
		if (!this.path)
			([ this.path, this.querystring ] = this.url.split("?", 2));
		
	}
	
	[matchSymbol]?: RegExpExecArray;
	
	#params?: P;
	
	/** Params parsed from the URL string */
	get params() {
		return (this.#params ??= extractUrlParams(this) as P);
	}
	
	#query?: RequestQueryParams;
	
	/** Params parsed from the query string part of the URL string */
	get query() {
		return (this.#query ??= extractQueryParams(this));
	}
	
	#body?: RequestBody;
	
	/** Object with async methods to get the request body */
	get body() {
		return (this.#body ??= new RequestBody(this));
	}
	
}
