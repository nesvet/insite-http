export type Extension = [ string, { mimeType: string; isText?: boolean } ];
export type Resolvee = [ string, string ];
export type Options = {
	src?: string;
	urlPrefix?: string;
	path?: RegExp;
	extensions?: Extension[];
	resolved?: Resolvee[];
	restricted?: string[];
	preloaded?: string[] | "default" | null;
};
