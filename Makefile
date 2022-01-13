.PHONY: main server

main:
	deno run --allow-net --no-check --location http://localhost main.ts
	
server:
	deno run --allow-net --no-check server.ts