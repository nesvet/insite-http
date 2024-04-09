import { StaticMiddleware } from "./middlewares/Static";
import { Server } from "./Server";


class InSiteStaticServer extends Server {
	constructor(options, serverOptions) {
		super({
			...serverOptions,
			middlewares: [
				new StaticMiddleware(options),
				...serverOptions.middlewares || []
			]
		});
		
	}
	
	handleListen() {
		
		console.info(`🛒 inSite Static HTTP${this.isHTTPS ? "S" : ""} Server is listening on`, this.port);
		
	}
	
}

export { InSiteStaticServer as StaticServer };
