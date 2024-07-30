import { InSiteHTTPServer } from "./Server";
import { Handler, Method, RegExpOrString } from "./types";


export class InSiteServerMiddleware {
	listeners!: Partial<Record<Method, [ RegExpOrString, Handler ][]>>;
	bindTo?(server: InSiteHTTPServer): void;
}
