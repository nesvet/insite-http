import { isEmpty } from "@nesvet/n";
import { handleRequestCompressed } from "../compression";


const { INSITE_TITLE } = process.env;

const envGlobals = {};
for (const key in process.env)
	if (/^INSITE_CLIENT_/.test(key))
		envGlobals[key.replace(/INSITE_CLIENT_/, "").toLowerCase()] = process.env[key];

const headers = { "Content-Type": "text/html; charset=utf-8" };


class InSiteTemplateMiddleware {
	constructor({
		requestRegExp = /.*/,
		globals = {},
		title = INSITE_TITLE ?? "inSite",
		css = [],
		rootId = "root"
	} = {}) {
		
		this.listeners = { GET: [
			[ requestRegExp, this.handler ]
		] };
		
		this.title = title;
		this.css = Array.isArray(css) ? css : [ css ];
		this.rootId = rootId;
		
		Object.assign(globals, envGlobals);
		
		this.html =
			"<!DOCTYPE html>" +
			"<html lang=\"ru\">" +
			"<head>" +
				"<meta charset=\"utf-8\" />" +
				"<meta name=\"viewport\" content=\"minimum-scale=1, initial-scale=1, width=device-width\" />" +
				`<title>${this.title}</title>` +
				`${this.css.map(fileName => `<link rel="stylesheet" href="${fileName}" />`).join("")}` +
				`${isEmpty(globals) ? "" : `<script>globalThis.__insite=${JSON.stringify(globals)};</script>`}` +
				"<script type=\"text/javascript\" src=\"/index.js\" defer></script>" +
			"</head>" +
			"<body>" +
				`<div id="${this.rootId}">` +
				"</div>" +
			"</body>" +
			"</html>";
		
	}
	
	handler = (request, response) => {
		handleRequestCompressed(request, response, headers, this.html);
		
	};
	
}

export { InSiteTemplateMiddleware as TemplateMiddleware };
