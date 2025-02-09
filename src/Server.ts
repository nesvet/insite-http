import type http from "node:http";
import type https from "node:https";
import { createServer, resolveSSL, showServerListeningMessage } from "insite-common/backend";
import { matches, Request } from "./Request";
import {
	isMiddlewareMethodMap,
	isMiddlewareRegExpStringMap,
	isMiddlewareTuple,
	isMiddlewareTupleOrArray,
	isRequestMethodAccepted,
	isServerServer,
	type ErrorParams,
	type Handler,
	type Listener,
	type Method,
	type Middleware,
	type Options,
	type RegExpOrString
} from "./types";


export class HTTPServer {
	constructor({
		port,
		ssl,
		listeners,
		errors,
		server
	}: Options, middlewares: (Middleware | false | null | undefined)[] = []) {
		
		if (isServerServer(server)) {
			this.server = server;
			
			new Promise<void>(resolve => void (
				server.listening ?
					resolve() :
					server.on("listening", resolve)
			)).then(() => showServerListeningMessage(this));
			
		} else {
			this.server = createServer(HTTPServer.makeProps({ ssl, server }));
			
			this.server.listen(
				typeof port == "string" ?
					Number.parseInt(port) :
					port ?? (this.isS ? 443 : 80),
				() => showServerListeningMessage(this)
			);
		}
		
		if (listeners)
			for (const [ method, methodListeners ] of Object.entries(listeners) as [ Method | "ALL", Listener[] ][])
				for (const [ regExp, handler ] of methodListeners)
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
				if (middleware)
					this.addMiddleware(middleware);
		
		this.server.on("request", this.#requestListener);
		
	}
	
	icon = "🕸️ ";
	name = "HTTP";
	get protocol() {
		return `http${this.isS ? "s" : ""}`;
	}
	
	server;
	
	get isS() {
		return "setSecureContext" in this.server;
	}
	
	#listeners: Record<Method, Listener[]> = {
		POST: [],
		GET: [],
		PUT: [],
		PATCH: [],
		DELETE: []
	};
	
	#requestListener = async (request: Request, response: Response) => {
		response[serverSymbol] = this;
		response[requestSymbol] = request;
		
		if (!("status" in request) && isRequestMethodAccepted(request.method, this.#listeners))
			for (const [ regExp, handler ] of this.#listeners[request.method])
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
	
	_throw(response: Response, statusCode: number, params?: ErrorParams | string) {
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
		
		return handler ? handler(response[requestSymbol], response, {
			...restParams,
			statusCode
		}) : response;
	}
	
	addRequestListener(method: Method | "ALL", regExp: RegExpOrString, handler: Handler) {
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
	
	
	static makeProps({ ssl, server }: Options): http.ServerOptions | https.ServerOptions {
		return {
			...resolveSSL(ssl),
			IncomingMessage: Request,
			...server
		};
	}
	
}
