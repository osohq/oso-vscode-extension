.PHONY: test lint typecheck fmtcheck fmt package wasm clean submodules update-submodules build

build: wasm
	yarn esbuild-all

submodules: .make.submodules.installed

.make.submodules.installed:
	git submodule update --checkout --init
	touch $@

update-submodules:
	git submodule update --checkout --init --remote

test: wasm
	yarn test

lint: wasm
	yarn lint

typecheck: wasm
	yarn typecheck

fmtcheck: clean
	yarn fmtcheck

fmt: clean
	yarn fmtwrite

package: wasm
	yarn package

CARGO_FLAGS ?= --dev

wasm: clean
	$(MAKE) CARGO_FLAGS=$(CARGO_FLAGS) OUT_DIR=$$(pwd)/out -C oso/polar-language-server build

node_modules: package.json
	yarn install
	@touch $@

clean: node_modules submodules
	rm -rf out
	mkdir -p out
