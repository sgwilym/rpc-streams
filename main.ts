import {
  asyncOneChunkStream,
  oneChunkStream,
  Req,
  HttpClient
} from "./lib.ts";

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

const myInstance = new MyClass(5);

const client = new HttpClient(myInstance, "http://localhost:8000");

// ----- ADD

const addReq: Req<typeof myInstance.add> = {
  args: [1, 2],
  id: "id-add",
  method: "add",
};

const addStream = await client.getReadableStream(addReq);

const addReader = addStream.getReader();

console.log("%c--- add", "color: red");
while (true) {
  const { done, value } = await addReader.read();
  console.log({ value });
  if (done) {
    break;
  }
}

// ----- STOP AT

const stopAtReq: Req<typeof myInstance.stopAt> = {
  args: [],
  id: "id-stop-at",
  method: "stopAt",
};

const stopAtStream = await client.getReadableStream(stopAtReq);

const stopAtReader = stopAtStream.getReader();

console.log("%c--- stopAt", "color: red");
while (true) {
  const { done, value } = await stopAtReader.read();
  console.log({ value });
  if (done) {
    break;
  }
}

// ----- ADD SLOWLY

const addSlowlyReq: Req<typeof myInstance.addSlowly> = {
  args: [1, 2],
  id: "id-add-slowly",
  method: "addSlowly",
};

const addSlowlyStream = await client.getReadableStream(addSlowlyReq);

const addSlowlyReader = addSlowlyStream.getReader();

console.log("%c--- addSlowly", "color: red");
while (true) {
  const { done, value } = await addSlowlyReader.read();
  console.log({ value });
  if (done) {
    break;
  }
}

// ----- STREAM NUMS

const streamNumsReq: Req<typeof myInstance.streamNums> = {
  args: [],
  id: "id-stream-nums",
  method: "streamNums",
};

const streamNumsStream = await client.getReadableStream(streamNumsReq);

const streamNumsReader = streamNumsStream.getReader();

console.log("%c--- streamNums", "color: red");
while (true) {
  const { done, value } = await streamNumsReader.read();
  console.log({ value });
  if (done) {
    break;
  }
}
