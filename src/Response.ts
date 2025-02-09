import { OutgoingHttpHeader, OutgoingHttpHeaders, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { requestSymbol, serverSymbol } from "./symbols";
import type { Request } from "./Request";
import type { HTTPServer } from "./Server";
import type { ErrorParams } from "./types";


export class Response extends ServerResponse<Request> {
	
	[serverSymbol]!: HTTPServer;
	[requestSymbol]!: Request;
	
	/** End response with a plain text */
	text(body: string) {
		return this.writeHead(200, {
			"Content-Type": "text/plain; charset=utf-8",
			"Content-Length": Buffer.byteLength(body)
		}).end(body);
	}
	
	/** End response with a JSON string */
	json(value: Parameters<JSON["stringify"]>[0]) {
		const body = JSON.stringify(value);
		
		return this.writeHead(200, {
			"Content-Type": "application/json; charset=utf-8",
			"Content-Length": Buffer.byteLength(body)
		}).end(body);
	}
	
	/** End response with an URL-encoded string */
	urlEncoded(params: ConstructorParameters<typeof URLSearchParams>[0]) {
		const body = new URLSearchParams(params).toString();
		
		return this.writeHead(200, {
			"Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
			"Content-Length": Buffer.byteLength(body)
		}).end(body);
	}
	
	/** End response with a stream */
	stream(stream: Readable, headers?: OutgoingHttpHeader[] | OutgoingHttpHeaders) {
		this.writeHead(200, headers);
		
		return stream.pipe(this);
	}
	
	// TODO:
	// messagePack() {
	// }
	error(statusCode: number, params?: ErrorParams | string) {
		return this[serverSymbol]._throw(this, statusCode, params);
	}
	
	badRequest(params?: ErrorParams | string) {
		return this.error(400, params);
	}
	
	unauthorized(params?: ErrorParams | string) {
		return this.error(401, params);
	}
	
	forbidden(params?: ErrorParams | string) {
		return this.error(403, params);
	}
	
	notFound(params?: ErrorParams | string) {
		return this.error(404, params);
	}
	
	requestTimeout(params?: ErrorParams | string) {
		return this.error(408, params);
	}
	
	gone(params?: ErrorParams | string) {
		return this.error(410, params);
	}
	
	internalServerError(params?: ErrorParams | string) {
		return this.error(500, params);
	}
	
	serviceUnavailable(params?: ErrorParams | string) {
		return this.error(503, params);
	}
	
}
