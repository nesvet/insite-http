import { handleRequestCompressed } from "../compression";


const headers = { "Content-Type": "text/html; charset=utf-8" };


class InSiteTemplateMiddleware {
	constructor(options = {}) {
		const {
			requestRegExp = /.*/,
			title = "inSite",
			css = [],
			rootId = "app"
		} = options;
		
		this.listeners = { GET: [
			[ requestRegExp, this.handler ]
		] };
		
		this.title = title;
		this.css = Array.isArray(css) ? css : [ css ];
		this.rootId = rootId;
		
		this.html =
			"<!DOCTYPE html>" +
			"<html lang=\"ru\">" +
			"<head>" +
				"<meta charset=\"utf-8\" />" +
				"<meta name=\"viewport\" content=\"minimum-scale=1, initial-scale=1, width=device-width\" />" +
				`<title>${this.title}</title>${
					this.css.map(fileName => `<link rel="stylesheet" href="${fileName}" />`).join("")
				}<script type="text/javascript" src="/index.js" defer></script>` +
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
