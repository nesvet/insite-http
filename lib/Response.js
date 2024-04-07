import { ServerResponse } from "node:http";
import { inSiteServerSymbol } from "./symbols";


export class InSiteServerResponse extends ServerResponse {
	
	error(statusCode, params) {
		return this[inSiteServerSymbol]._throw(this, statusCode, params);
	}
	
	badRequest(params) {
		return this.error(400, params);
	}
	
	unauthorized(params) {
		return this.error(401, params);
	}
	
	forbidden(params) {
		return this.error(403, params);
	}
	
	notFound(params) {
		return this.error(404, params);
	}
	
	requestTimeout(params) {
		return this.error(408, params);
	}
	
	gone(params) {
		return this.error(410, params);
	}
	
	internalServerError(params) {
		return this.error(500, params);
	}
	
	serviceUnavailable(params) {
		return this.error(503, params);
	}
	
}
