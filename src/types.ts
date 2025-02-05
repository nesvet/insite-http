import type http from "node:http";
import type https from "node:https";
import type { InSiteServerMiddleware } from "./Middleware";
import type { InSiteServerResponse } from "./Response";


export type ErrorParams = {
	headers?: http.OutgoingHttpHeader[] | http.OutgoingHttpHeaders;
	content: string;
	handler?(request: http.IncomingMessage, response: InSiteServerResponse, errorParams: Omit<ErrorParams, "handler"> & { statusCode: number }): InSiteServerResponse;
};

export type Method = "DELETE" | "GET" | "PATCH" | "POST" | "PUT";

export type Handler = (request: http.IncomingMessage, response: InSiteServerResponse) => unknown;

export type Listener = [ RegExp, Handler ];

export type Options = {
	ssl?: {
		cert: Buffer | string;
		key: Buffer | string;
	};
	port?: number | string;
	https?: boolean;
	listeners?: Partial<Record<"ALL" | Method, Listener[]>>;
	errors?: Record<"default" | number, ErrorParams>;
	server?: http.Server | http.ServerOptions | https.Server | https.ServerOptions;
};

export type RegExpOrString = RegExp | string;

type MiddlewareTuple = readonly [ Method, RegExpOrString, Handler ] | readonly [ RegExpOrString, Handler ];

type MiddlewareRegExpStringMap = Record<string, Handler>;

type MiddlewareMethodMap = Record<Method, Record<string, Handler>>;

export type Middleware =
	InSiteServerMiddleware |
	MiddlewareMethodMap |
	MiddlewareRegExpStringMap |
	MiddlewareTuple |
	MiddlewareTuple[];

export function isMiddlewareMethodMap(middleware: Middleware): middleware is MiddlewareMethodMap {
	return typeof Object.values(middleware)[0] == "object";
}

export function isMiddlewareRegExpStringMap(middleware: Middleware): middleware is MiddlewareRegExpStringMap {
	return typeof Object.values(middleware)[0] == "function";
}

export function isMiddlewareTupleOrArray(middleware: Middleware): middleware is MiddlewareTuple | MiddlewareTuple[] {
	return Array.isArray(middleware);
}

export function isMiddlewareTuple(middleware: MiddlewareTuple | MiddlewareTuple[]): middleware is MiddlewareTuple {
	return !Array.isArray(middleware);
}

export function isRequestMethodAccepted(requestMethod: string | undefined, listeners: Record<string, unknown>): requestMethod is Method {
	return Boolean(requestMethod && listeners[requestMethod]);
}

export function isServerServer(serverOrOptions: Options["server"]): serverOrOptions is http.Server | https.Server {
	return !!serverOrOptions && "emit" in serverOrOptions;
}
