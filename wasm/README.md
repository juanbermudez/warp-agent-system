# Tree-sitter WASM Grammar Files

This directory should contain the WebAssembly grammar files needed by the Tree-sitter parser for code analysis.

## Required Files

The following WASM files should be placed in this directory:

- `tree-sitter-tsx.wasm` - For TypeScript/TSX parsing (also used for JavaScript)
- `tree-sitter-javascript.wasm` - For JavaScript parsing
- `tree-sitter-python.wasm` - For Python parsing

## Obtaining the Files

You can obtain these files from the official Tree-sitter repositories or build them yourself.

Pre-built versions can be found at:
- https://github.com/tree-sitter/tree-sitter/tree/master/lib/binding_web
- https://github.com/tree-sitter/tree-sitter-javascript
- https://github.com/tree-sitter/tree-sitter-python
- https://github.com/tree-sitter/tree-sitter-typescript

## Configuration

The path to this directory is controlled by the `TREE_SITTER_WASM_PATH` environment variable, which defaults to `./wasm`.
