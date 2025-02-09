import type http from "node:http";
import type https from "node:https";
import type { ClassMiddleware } from "./Middleware";
import type { Request } from "./Request";
import type { Response } from "./Response";


const METHODS = [ "DELETE", "GET", "PATCH", "POST", "PUT" ] as const;


export type ErrorParams = {
	headers?: http.OutgoingHttpHeader[] | http.OutgoingHttpHeaders;
	content: string;
	handler?(request: Request, response: Response, errorParams: Omit<ErrorParams, "handler"> & { statusCode: number }): Response;
};

export type Method = typeof METHODS[number];

export function isMethod(string: string): string is Method | "ALL" {
	return METHODS.includes(string as Method) || string === "ALL";
}

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

export type Middleware = {
	[K: string]: Handler | Middleware;
} | {
	[K: {} & string]: Handler | Middleware;
} | {
	[K in Method | "ALL"]?: Middleware;
};

export type TupleMiddleware = readonly [ Method, RegExpOrString, Handler ] | readonly [ RegExpOrString, Handler ];

export type GenericMiddleware =
	ClassMiddleware |
	Middleware |
	TupleMiddleware |
	TupleMiddleware[];

export function isTupleMiddlewareOrArray(middleware: GenericMiddleware): middleware is TupleMiddleware | TupleMiddleware[] {
	return Array.isArray(middleware);
}

export function isTupleMiddleware(middleware: TupleMiddleware | TupleMiddleware[]): middleware is TupleMiddleware {
	return !Array.isArray(middleware);
}

export function isRequestMethodAccepted(requestMethod: string | undefined, listeners: Record<string, unknown>): requestMethod is Method {
	return Boolean(requestMethod && listeners[requestMethod]);
}

export function isServerServer(serverOrOptions: Options["server"]): serverOrOptions is http.Server | https.Server {
	return !!serverOrOptions && "emit" in serverOrOptions;
}
