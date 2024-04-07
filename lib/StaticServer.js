import { StaticMiddleware } from "./middlewares/Static";
import { InSiteServer } from "./Server";


export class InSiteStaticServer extends InSiteServer {
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
