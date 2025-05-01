import type http from "node:http";
import type https from "node:https";
import { createServer, resolveSSL, showServerListeningMessage } from "insite-common/backend";
import { ClassMiddleware } from "./Middleware";
import { matches, Request } from "./Request";
import { Response } from "./Response";
import { requestSymbol, serverSymbol } from "./symbols";
import {
	isMethod,
	isRequestMethodAccepted,
	isServerServer,
	isTupleMiddleware,
	isTupleMiddlewareOrArray,
	type ErrorParams,
	type GenericMiddleware,
	type Handler,
	type Listener,
	type Method,
	type Middleware,
	type Options,
	type RegExpOrString,
	type ResponseBody
} from "./types";
import { pathToRegExp } from "./utils";


export class HTTPServer {
	constructor({
		port,
		ssl,
		listeners,
		errors,
		server
	}: Options, middlewares: (GenericMiddleware | false | null | undefined)[] = []) {
		
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
	
	/** Server icon */
	icon = "🕸️ ";
	
	/** Server name */
	name = "HTTP";
	get protocol() {
		return `http${this.isS ? "s" : ""}`;
	}
	
	/** Node.js http(s) server object */
	server;
	
	/** Does the server use SSL */
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
	
	#requestListener: Handler = async (request, response) => {
		
		([
			request.path,
			request.querystring
		] = request.url.split("?", 2));
		
		response[serverSymbol] = this;
		response[requestSymbol] = request;
		
		if (!("status" in request) && isRequestMethodAccepted(request.method, this.#listeners))
			for (const [ regExp, handler ] of this.#listeners[request.method])
				if (matches(request, regExp) && await handler(request, response) !== false)
					return;
		
		response.notFound();
		
	};
	
	#errors: Record<"default" | number, ErrorParams> = {
		401: {
			statusCode: 401,
			body: "Unauthorized"
		},
		403: {
			statusCode: 403,
			body: "Forbidden"
		},
		404: {
			statusCode: 404,
			body: "Not Found"
		},
		408: {
			statusCode: 408,
			body: "Request Timeout"
		},
		410: {
			statusCode: 410,
			body: "Gone"
		},
		500: {
			statusCode: 500,
			body: "Internal Server Error"
		},
		503: {
			statusCode: 503,
			body: "Service Unavailable"
		},
		default: {
			statusCode: 400,
			body: "Bad Request",
			handler(request, response, { statusCode, headers, body }) {
				return response.give(body, headers, statusCode);
			}
		}
	};
	
	_throw(response: Response, { statusCode, ...restParams }: Omit<ErrorParams, "body"> & { body?: ResponseBody }) {
		
		const {
			handler,
			...handlerParams
		} = {
			...this.#errors.default,
			...this.#errors[statusCode],
			...restParams
		};
		
		return handler!(response[requestSymbol], response, handlerParams);
	}
	
	/** Add request listener */
	addRequestListener(method: Method | "ALL", regExp: RegExpOrString, handler: Handler) {
		if (typeof regExp == "string")
			regExp = pathToRegExp(regExp);
		
		if (method && method !== "ALL")
			this.#listeners[method]?.push([ regExp, handler ]);
		else
			for (const specificMethod of Object.keys(this.#listeners) as Method[])
				this.addRequestListener(specificMethod, regExp, handler);
		
		return this;
	}
	
	/** Add middleware */
	addMiddleware(middleware: GenericMiddleware) {
		if (middleware instanceof ClassMiddleware) {
			for (const [ method, regExpOrStringArrayMap ] of Object.entries(middleware.listeners))
				for (const [ regExpOrString, handler ] of regExpOrStringArrayMap)
					this.addRequestListener(method as Method, regExpOrString, handler);
			middleware.bindTo?.(this);
		} else if (isTupleMiddlewareOrArray(middleware)) {
			if (isTupleMiddleware(middleware))
				middleware = [ middleware ];
			
			for (const params of middleware)
				this.addRequestListener(...params.length === 2 ? [ "GET", ...params ] as const : params);
		} else
			this.#parseMappedMiddleware(middleware);
		
		return this;
	}
	
	#parseMappedMiddleware(middleware: Middleware, method: Method | "ALL" = "GET", prefix: string = "") {
		for (const [ key, value ] of Object.entries(middleware))
			if (typeof value == "function")
				if (isMethod(key))
					this.addRequestListener(key, prefix, value);
				else
					this.addRequestListener(method, `${prefix}${key}`, value);
			else
				if (isMethod(key))
					this.#parseMappedMiddleware(value, key, prefix);
				else
					this.#parseMappedMiddleware(value, method, `${prefix}${key}`);
		
	}
	
	/** Add POST request listener */
	post(regExp: RegExpOrString, handler: Handler) {
		this.addRequestListener("POST", regExp, handler);
		
		return this;
	}
	
	/** Add GET request listener */
	get(regExp: RegExpOrString, handler: Handler) {
		this.addRequestListener("GET", regExp, handler);
		
		return this;
	}
	
	/** Add PUT request listener */
	put(regExp: RegExpOrString, handler: Handler) {
		this.addRequestListener("PUT", regExp, handler);
		
		return this;
	}
	
	/** Add PATCH request listener */
	patch(regExp: RegExpOrString, handler: Handler) {
		this.addRequestListener("PATCH", regExp, handler);
		
		return this;
	}
	
	/** Add DELETE request listener */
	delete(regExp: RegExpOrString, handler: Handler) {
		this.addRequestListener("DELETE", regExp, handler);
		
		return this;
	}
	
	
	/** Make props for Node.js http(s).createServer method */
	static makeProps({ ssl, server }: Options) {
		return {
			...resolveSSL(ssl),
			IncomingMessage: Request,
			ServerResponse: Response,
			...server
		} as http.ServerOptions | https.ServerOptions;
	}
	
}
