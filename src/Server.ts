import fs from "node:fs";
import http, { type IncomingMessage } from "node:http";
import https from "node:https";
import { InSiteServerMiddleware } from "./Middleware";
import { InSiteServerResponse } from "./Response";
import { inSiteRequestSymbol, inSiteServerSymbol } from "./symbols";
import {
	ErrorParams,
	Handler,
	isMiddlewareMethodMap,
	isMiddlewareRegExpStringMap,
	isMiddlewareTuple,
	isMiddlewareTupleOrArray,
	Method,
	Middleware,
	Options,
	RegExpOrString
} from "./types";


const {
	INSITE_HTTP_SSL_CERT,
	INSITE_HTTP_SSL_KEY
} = process.env;


export class InSiteHTTPServer {
	constructor({
		port,
		ssl,
		https: isHTTPS = !!ssl,
		listeners,
		errors,
		server = {},
		onListen
	}: Options, middlewares: Middleware[] = []) {
		
		this.isHTTPS = isHTTPS;
		
		if (this.isHTTPS && !ssl && INSITE_HTTP_SSL_CERT && INSITE_HTTP_SSL_KEY)
			ssl = {
				cert: INSITE_HTTP_SSL_CERT,
				key: INSITE_HTTP_SSL_KEY
			};
		
		if (ssl) {
			if (!/^-{3,}BEGIN/.test(ssl.cert))
				try {
					ssl.cert = fs.readFileSync(ssl.cert, "utf8");
				} catch {}
			if (!/^-{3,}BEGIN/.test(ssl.key))
				try {
					ssl.key = fs.readFileSync(ssl.key, "utf8");
				} catch {}
		} else if (this.isHTTPS)
			console.warn("⚠️ HTTPS server requires ssl.cert & ssl.key options");
		
		this.port = port ?? (this.isHTTPS ? 443 : 80);
		
		if (listeners)
			for (const method of Object.keys(listeners) as ("ALL" | Method)[])
				for (const [ regExp, handler ] of listeners[method])
					this.addRequestListener(method, regExp, handler);
		
		if (errors)
			for (const statusCodeString of Object.keys(errors)) {
				const statusCode = Number.parseInt(statusCodeString);
				if (statusCode)
					if (this.#errors[statusCode])
						Object.assign(this.#errors[statusCode], errors[statusCode]);
					else
						this.#errors[statusCode] = errors[statusCode];
			}
		
		if (middlewares)
			for (const middleware of middlewares)
				this.addMiddleware(middleware);
		
		this.server =
			this.isHTTPS ?
				https.createServer({
					...server,
					...ssl,
					ServerResponse: InSiteServerResponse
				}, this.#requestListener) :
				http.createServer({
					...server,
					ServerResponse: InSiteServerResponse
				}, this.#requestListener);
		
		this.server.listen(port, () => onListen ? onListen() : this.#handleListen());
		
	}
	
	isHTTPS = false;
	port: number;
	server: http.Server | https.Server;
	
	#listeners: Record<Method, [ RegExp, Handler ][]> = {
		POST: [],
		GET: [],
		PUT: [],
		PATCH: [],
		DELETE: []
	};
	
	#handleListen() {
		
		console.info(`🌐 inSite HTTP${this.isHTTPS ? "S" : ""} Server is listening on`, this.port);
		
	}
	
	#requestListener = async (request: IncomingMessage, response: InSiteServerResponse) => {
		response[inSiteServerSymbol] = this;
		response[inSiteRequestSymbol] = request;
		
		if (!("status" in request))
			for (const [ regExp, handler ] of this.#listeners[request.method as Method])
				if (regExp.test(request.url!) && await handler(request, response) !== false)
					return;
		
		response.notFound();
		
	};
	
	#errors: Record<"default" | number, ErrorParams> = {
		400: {
			content: "Bad Request"
		},
		401: {
			content: "Unauthorized"
		},
		403: {
			content: "Forbidden"
		},
		404: {
			content: "Not Found"
		},
		408: {
			content: "Request Timeout"
		},
		410: {
			content: "Gone"
		},
		500: {
			content: "Internal Server Error"
		},
		503: {
			content: "Service Unavailable"
		},
		default: {
			headers: { "Content-Type": "text/plain; charset=utf-8" },
			content: "",
			handler(request, response, { statusCode, headers, content }) {
				return response.writeHead(statusCode, headers).end(content);
			}
		}
	};
	
	_throw(response: InSiteServerResponse, statusCode: number, params?: ErrorParams | string) {
		if (typeof params == "string")
			params = { content: params };
		
		const {
			handler,
			...restParams
		} = {
			...this.#errors.default,
			...this.#errors[statusCode],
			...params
		};
		
		return handler ? handler(response[inSiteRequestSymbol], response, {
			...restParams,
			statusCode
		}) : response;
	}
	
	addRequestListener(method: "ALL" | Method, regExp: RegExpOrString, handler: Handler) {
		if (typeof regExp == "string")
			regExp = new RegExp(regExp);
		
		if (method && method !== "ALL")
			this.#listeners[method]?.push([ regExp, handler ]);
		else
			for (const specificMethod of Object.keys(this.#listeners) as Method[])
				this.addRequestListener(specificMethod, regExp, handler);
		
		return this;
	}
	
	addMiddleware(middleware: Middleware) {
		if (middleware instanceof InSiteServerMiddleware) {
			for (const [ method, regExpOrStringArrayMap ] of Object.entries(middleware.listeners))
				for (const [ regExpOrString, handler ] of regExpOrStringArrayMap)
					this.addRequestListener(method as Method, regExpOrString, handler);
			middleware.bindTo?.(this);
		} else if (isMiddlewareTupleOrArray(middleware)) {
			if (isMiddlewareTuple(middleware))
				middleware = [ middleware ];
			for (const params of middleware)
				this.addRequestListener(...params.length === 2 ? [ "GET", ...params ] as const : params);
		} else if (isMiddlewareRegExpStringMap(middleware))
			for (const [ key, value ] of Object.entries(middleware))
				this.addRequestListener("GET", key, value);
		else if (isMiddlewareMethodMap(middleware))
			for (const [ method, regExpStringMap ] of Object.entries(middleware))
				for (const [ regExpString, handler ] of Object.entries(regExpStringMap))
					this.addRequestListener(method as Method, regExpString, handler);
		
		return this;
	}
	
	post(regExp: RegExpOrString, handler: Handler) {
		this.addRequestListener("POST", regExp, handler);
		
		return this;
	}
	
	get(regExp: RegExpOrString, handler: Handler) {
		this.addRequestListener("GET", regExp, handler);
		
		return this;
	}
	
	put(regExp: RegExpOrString, handler: Handler) {
		this.addRequestListener("PUT", regExp, handler);
		
		return this;
	}
	
	patch(regExp: RegExpOrString, handler: Handler) {
		this.addRequestListener("PATCH", regExp, handler);
		
		return this;
	}
	
	delete(regExp: RegExpOrString, handler: Handler) {
		this.addRequestListener("DELETE", regExp, handler);
		
		return this;
	}
	
}
