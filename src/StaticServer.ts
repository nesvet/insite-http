import { InSiteStaticMiddleware, StaticMiddlewareOptions } from "./middlewares/Static";
import { InSiteHTTPServer } from "./Server";
import { Middleware, Options } from "./types";


export class InSiteStaticServer extends InSiteHTTPServer {
	constructor(options: StaticMiddlewareOptions, serverOptions: Options, middlewares: Middleware[] = []) {
		super(serverOptions, [
			new InSiteStaticMiddleware(options),
			...middlewares
		]);
		
	}
	
	handleListen() {
		
		console.info(`🛒 inSite Static HTTP${this.isHTTPS ? "S" : ""} Server is listening on`, this.port);
		
	}
	
}
