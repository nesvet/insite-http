import { HTTPServer } from "./Server";
import { Handler, Method, RegExpOrString } from "./types";


export class ClassMiddleware {
	listeners!: Partial<Record<Method, [ RegExpOrString, Handler ][]>>;
	bindTo?(server: HTTPServer): void;
}
