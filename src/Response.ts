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
	
	/** End response with an error */
	error(statusCode: number, params?: ErrorParams | string) {
		return this[serverSymbol]._throw(this, statusCode, params);
	}
	
	/** End response with the 400 Bad Request */
	badRequest(params?: ErrorParams | string) {
		return this.error(400, params);
	}
	
	/** End response with the 401 Unauthorized */
	unauthorized(params?: ErrorParams | string) {
		return this.error(401, params);
	}
	
	/** End response with the 403 Forbidden */
	forbidden(params?: ErrorParams | string) {
		return this.error(403, params);
	}
	
	/** End response with the 404 Not Found */
	notFound(params?: ErrorParams | string) {
		return this.error(404, params);
	}
	
	/** End response with the 408 Request Timeout */
	requestTimeout(params?: ErrorParams | string) {
		return this.error(408, params);
	}
	
	/** End response with the 410 Gone */
	gone(params?: ErrorParams | string) {
		return this.error(410, params);
	}
	
	/** End response with the 500 Internal Server Error */
	internalServerError(params?: ErrorParams | string) {
		return this.error(500, params);
	}
	
	/** End response with the 503 Service Unavailable */
	serviceUnavailable(params?: ErrorParams | string) {
		return this.error(503, params);
	}
	
}
