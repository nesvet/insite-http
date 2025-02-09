import type http from "node:http";
import type https from "node:https";
import type { Request } from "./Request";
import type { Response } from "./Response";




export type ErrorParams = {
	headers?: http.OutgoingHttpHeader[] | http.OutgoingHttpHeaders;
	content: string;
	handler?(request: Request, response: Response, errorParams: Omit<ErrorParams, "handler"> & { statusCode: number }): Response;
};

export type Method = "DELETE" | "GET" | "PATCH" | "POST" | "PUT";

export type Handler = (request: Request, response: Response) => unknown;

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

export type RequestParams = Record<string, string> & [ undefined, ...string[] ];

export type RequestQueryParams = Record<string, string>;

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
