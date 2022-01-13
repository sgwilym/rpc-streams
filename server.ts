import { serve } from "https://deno.land/std@0.121.0/http/server.ts";
import { HttpServer, oneChunkStream, asyncOneChunkStream } from './lib.ts'

export class MyClass {
	_stopAt: number;

	constructor(stopAt: number) {
		this._stopAt = stopAt;
	}

	add = oneChunkStream((num1: number, num2: number) => {
		return num1 + num2;
	});

	stopAt = oneChunkStream(() => {
		return this._stopAt;
	});

	addSlowly = asyncOneChunkStream((num1: number, num2: number) => {
		return new Promise((resolve) =>
			setTimeout(() => {
				resolve(num1 + num2);
			}, 1000)
		);
	});

	streamNums() {
		const { _stopAt: stopAt } = this;

		return new ReadableStream({
			start(controller) {
				for (let i = 0; i <= stopAt; i++) {
					controller.enqueue(i);
				}
				controller.close();
			},
		});
	}
}

const httpServer = new HttpServer(new MyClass(5));

async function handler(request: Request): Promise<Response> {	
	const url = new URL(request.url);
	
	console.log(url.pathname)
	
	if (url.pathname === 'req') {
		httpServer.addRequest(await request.json())
		
		return new Response();
	}
	
	const readable = await httpServer.getReadableStream(url.pathname)
	
	return new Response(readable, {
		headers: {
			"Content-Type": "text/event-stream",
		},
	});
}

console.log("Listening on http://localhost:8000");
await serve(handler);