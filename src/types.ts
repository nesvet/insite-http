import type {
	ServerOptions as HTTPServerOptions,
	IncomingMessage,
	OutgoingHttpHeader,
	OutgoingHttpHeaders
} from "node:http";
import type { ServerOptions as HTTPSServerOptions } from "node:https";
import { InSiteServerMiddleware } from "./Middleware";
import type { InSiteServerResponse } from "./Response";


export type ErrorParams = {
	headers?: OutgoingHttpHeader[] | OutgoingHttpHeaders;
	content: string;
	handler?(request: IncomingMessage, response: InSiteServerResponse, errorParams: { statusCode: number } & Omit<ErrorParams, "handler">): InSiteServerResponse;
};

export type Method = "DELETE" | "GET" | "PATCH" | "POST" | "PUT";

export type Handler = (request: IncomingMessage, response: InSiteServerResponse) => unknown;

export type Options = {
	port?: number;
	ssl?: {
		cert: string;
		key: string;
	};
	https?: boolean;
	listeners?: Record<"ALL" | Method, [ RegExp, Handler ][]>;
	errors?: Record<"default" | number, ErrorParams>;
	server?: HTTPServerOptions | HTTPSServerOptions;
	onListen?: () => void;
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
