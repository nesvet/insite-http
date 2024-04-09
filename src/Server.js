import http from "node:http";
import https from "node:https";
import fse from "fs-extra";
import { InSiteServerResponse } from "./Response";
import { inSiteRequestSymbol, inSiteServerSymbol } from "./symbols";


class InSiteServer {
	constructor({
		port,
		ssl,
		https: isHTTPS = !!ssl,
		listeners,
		errors,
		server = {},
		onListen
	}, middlewares = []) {
		
		this.isHTTPS = isHTTPS;
		
		if (this.isHTTPS && !ssl && process.env.INSITE_HTTPS_SSL_CERT && process.env.INSITE_HTTPS_SSL_KEY)
			ssl = {
				cert: process.env.INSITE_HTTPS_SSL_CERT,
				key: process.env.INSITE_HTTPS_SSL_KEY
			};
		
		if (ssl) {
			if (!/^-{3,}BEGIN/.test(ssl.cert))
				try {
					ssl.cert = fse.readFileSync(ssl.cert, "utf8");
				} catch {}
			if (!/^-{3,}BEGIN/.test(ssl.key))
				try {
					ssl.key = fse.readFileSync(ssl.key, "utf8");
				} catch {}
		} else if (this.isHTTPS)
			console.warn("⚠️ HTTPS server requires ssl.cert & ssl.key options");
		
		this.port = port ?? (this.isHTTPS ? 443 : 80);
		
		if (listeners)
			for (const method in listeners)
				for (const [ regExp, handler ] of listeners[method])
					this.addRequestListener(method, regExp, handler);
		
		if (errors)
			for (const statusCodeString in errors)
				if (this.#errors[statusCodeString])
					Object.assign(this.#errors[statusCodeString], errors[statusCodeString]);
				else
					this.#errors[statusCodeString] = errors[statusCodeString];
		
		if (middlewares)
			for (const middleware of middlewares)
				if (middleware)
					this.addMiddleware(middleware);
		
		this.server = (this.isHTTPS ? https : http)
			.createServer({
				...server,
				...ssl,
				ServerResponse: InSiteServerResponse
			}, this.#requestListener)
			.listen(port, () => onListen ? onListen() : this.#handleListen());
		
	}
	
	#listeners = {
		POST: [],
		GET: [],
		PUT: [],
		PATCH: [],
		DELETE: []
	};
	
	#handleListen() {
		
		console.info(`🌐 inSite HTTP${this.isHTTPS ? "S" : ""} Server is listening on`, this.port);
		
	}
	
	#requestListener = async (request, response) => {
		response[inSiteServerSymbol] = this;
		response[inSiteRequestSymbol] = request;
		
		if (!request.status)
			for (const [ regExp, handler ] of this.#listeners[request.method])
				if (regExp.test(request.url) && await handler(request, response) !== false)
					return;
		
		response.notFound();
		
	};
	
	#errors = {
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
	
	_throw(response, statusCode, params) {
		
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
		
		return handler(response[inSiteRequestSymbol], response, {
			...restParams,
			statusCode
		});
	}
	
	addRequestListener(method, regExp, handler) {
		if (typeof regExp == "string")
			regExp = new RegExp(regExp);
		
		if (method && method !== "ALL")
			this.#listeners[method]?.push([ regExp, handler ]);
		else
			for (const method in this.#listeners)
				this.addRequestListener(method, regExp, handler);
		
		return this;
	}
	
	addMiddleware(middleware) {
		if (Array.isArray(middleware)) {
			if (!Array.isArray(middleware[0]))
				middleware = [ middleware ];
			
			for (const params of middleware) {
				const method =
					params.length == 2 ?
						"GET" :
						typeof params[0] == "string" ?
							params.shift() :
							"GET";
				const [ regExp, handler ] = params;
				
				this.addRequestListener(method, regExp, handler);
			}
		} else if (Object.isPlain(middleware))
			for (const key in middleware) {
				const value = middleware[key];
				if (Object.isPlain(value))
					for (const regExpString in value)
						this.addRequestListener(key, regExpString, value[regExpString]);
				else
					this.addRequestListener("GET", key, value);
			}
		else if (middleware.listeners)
			for (const method in middleware.listeners)
				for (const [ regExp, handler ] of middleware.listeners[method])
					this.addRequestListener(method, regExp, handler);
		
		middleware.bindTo?.(this);
		
		return this;
	}
	
	post(regExp, handler) {
		this.addRequestListener("POST", regExp, handler);
		
		return this;
	}
	
	get(regExp, handler) {
		this.addRequestListener("GET", regExp, handler);
		
		return this;
	}
	
	put(regExp, handler) {
		this.addRequestListener("PUT", regExp, handler);
		
		return this;
	}
	
	patch(regExp, handler) {
		this.addRequestListener("PATCH", regExp, handler);
		
		return this;
	}
	
	delete(regExp, handler) {
		this.addRequestListener("DELETE", regExp, handler);
		
		return this;
	}
	
}

export { InSiteServer as Server };
