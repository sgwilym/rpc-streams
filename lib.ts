import { EventSource } from 'https://deno.land/x/eventsource@v0.0.2/mod.ts'

export interface Req<T extends (...args: any) => any> {
  id: string;
  method: string;
  args: Parameters<T>;
}

export interface Res<T> {
  id: string;
  result: T | Error;
}

export function oneChunkStream<Fn extends (...args: any[]) => any>(
  fn: Fn,
): (...args: Parameters<Fn>) => ReadableStream<ReturnType<Fn>> {
  return (...args: Parameters<Fn>) => {
    return new ReadableStream({
      start(controller) {
        const result = fn(...args);

        controller.enqueue(result);
        controller.close();
      },
    });
  };
}

export function asyncOneChunkStream<
  Fn extends (...args: any[]) => Promise<any>,
>(
  fn: Fn,
): (...args: Parameters<Fn>) => ReadableStream<ReturnType<Fn>> {
  return (...args: Parameters<Fn>) => {
    return new ReadableStream({
      start(controller) {
        fn(...args).then((result) => {
          controller.enqueue(result);
        }).finally(() => {
          controller.close();
        });
      },
    });
  };
}

export interface Client {
  // Returns a readable stream (e.g. from HTTP or websockets or BroadcastChannel)
  // which also knows how what to do when cancelled
  getReadableStream<T extends (...args: any) => any>(
    req: Req<T>,
  ): Promise<ReadableStream<Res<ReturnType<T>>>>;
}

export interface Server<InType, ResType extends (...args: any[]) => any> {
  // Returns a writable stream with sink
  getReadableStream(
    input: InType,
  ): ReadableStream<
    Res<ReturnType<ResType>>
  >;
}

// -----

export class HttpClient<Fns> implements Client {
  _fns: Fns;
  _endpoint: string;

  constructor(fns: Fns, endpoint: string) {
    this._fns = fns;
    this._endpoint = endpoint;
  }

  async getReadableStream(req: Req<(...args: any) => any>) {
    
    
   
    const eventSource = new EventSource(`${this._endpoint}/${req.id}`)
  
    await fetch(`${this._endpoint}/req`, {
      method: 'POST',
      body: JSON.stringify(req),
    })
    
    const transformStream = new TransformStream();
    
    eventSource.onopen = () => {
      console.log('opened!')
    }
    
    eventSource.onmessage = (message) => {
      console.log(message)
      const writer = transformStream.writable.getWriter();
      writer.write(message)
    }
    
    eventSource.onerror = (e) => {
      console.error('Error with Eventsource!')
    }

    

    return transformStream.readable.pipeThrough(
      jsonParseStream(),
    );
  }
}

function jsonParseStream<T>() {
  return new TransformStream<string, T>(
    {
      transform: (chunk, controller) => {
        console.log(chunk)
        
        controller.enqueue(JSON.parse(chunk));
      },
    },
  );
}

export class ServerBase<Fns, InType, OutType extends (...args: any[]) => any>
  implements Server<Req<(...args: any) => any>, OutType> {
  _fns: Fns;

  constructor(fns: Fns) {
    this._fns = fns;
  }

  getReadableStream(req: Req<(...args: any) => any>): ReadableStream {
    const fnToCall = (this._fns as any)[req.method].bind(this._fns);

    const resultStream = fnToCall(...req.args) as ReadableStream;

    return resultStream.pipeThrough(
      new TransformStream({
        transform(result, controller) {
          controller.enqueue({
            id: req.id,
            result,
          });
        },
      }),
    );
  }
}

export class HttpServer<Fns> extends ServerBase<Fns, Request, (...args: any[]) => any> {
  _streams: Map<string, ReadableStream> = new Map();
  
  constructor(fns: Fns) {
    super(fns);
  }
  
  addRequest(req: Req<(...args: any) => any>) {
    const stream = super.getReadableStream(req);
    
    this._streams.set(req.id, stream);
  }

async getReadableStream(id: string) {
    const stream = this._streams.get(id);
    
    
    if (!stream) {

      
      
      
      const transformStream = new TransformStream()
      
      setTimeout(() => {
        const stream = this._streams.get(id);
        
        stream?.pipeTo(transformStream.writable)
      }, 1000)
      
      return transformStream.readable
    }
    
    console.log('Got it!')

    return stream.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          const req = JSON.parse(chunk);
          const res = controller.enqueue(`data: ${JSON.stringify(chunk)}`);
        },
      }),
    );
    

  }
}

export class LocalClient<Fns> implements Client {
  _fns: Fns;

  constructor(fns: Fns) {
    this._fns = fns;
  }

  getReadableStream(req: Req<(...args: any) => any>) {
    const server = new ServerBase(this._fns);

    return Promise.resolve(server.getReadableStream(req));
  }
}
