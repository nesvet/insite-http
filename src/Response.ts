import { type IncomingMessage, ServerResponse } from "node:http";
import { inSiteRequestSymbol, inSiteServerSymbol } from "./symbols";
import type { InSiteHTTPServer } from "./Server";
import type { ErrorParams } from "./types";


export class InSiteServerResponse<Request extends IncomingMessage = IncomingMessage> extends ServerResponse<Request> {
	
	[inSiteServerSymbol]!: InSiteHTTPServer;
	[inSiteRequestSymbol]!: IncomingMessage;
	
	error(statusCode: number, params?: ErrorParams) {
		return this[inSiteServerSymbol]._throw(this, statusCode, params);
	}
	
	badRequest(params?: ErrorParams) {
		return this.error(400, params);
	}
	
	unauthorized(params?: ErrorParams) {
		return this.error(401, params);
	}
	
	forbidden(params?: ErrorParams) {
		return this.error(403, params);
	}
	
	notFound(params?: ErrorParams) {
		return this.error(404, params);
	}
	
	requestTimeout(params?: ErrorParams) {
		return this.error(408, params);
	}
	
	gone(params?: ErrorParams) {
		return this.error(410, params);
	}
	
	internalServerError(params?: ErrorParams) {
		return this.error(500, params);
	}
	
	serviceUnavailable(params?: ErrorParams) {
		return this.error(503, params);
	}
	
}