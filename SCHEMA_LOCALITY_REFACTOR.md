# Schema Locality Refactoring

## Overview
Refactored OpenAPI schema definitions to be class methods on their respective model classes for better code locality and maintainability.

## Changes Made

### 1. Added Schema Methods to Model Classes

#### `src/note.cr`
- Added `Note.schema` - Returns OpenAPI schema for Note objects
- Added `Note.data_schema` - Returns OpenAPI schema for Note data (used in POST/PUT requests)

#### `src/lane.cr`
- Added `Lane.schema` - Returns OpenAPI schema for Lane objects

#### `src/board.cr`
- Added `Board.schema` - Returns OpenAPI schema for Board objects

### 2. Updated OpenAPI Generator

#### `src/openapi_manual.cr`
- Added requires for model files: `./note`, `./lane`, `./board`
- Replaced method calls:
  - `note_schema` → `ToCry::Note.schema`
  - `note_data_schema` → `ToCry::Note.data_schema`
  - `lane_schema` → `ToCry::Lane.schema`
  - `board_schema` → `ToCry::Board.schema`
- Removed old private schema methods (~90 lines)

## Benefits

1. **Better Locality**: Schema definitions now live next to the model code they describe
2. **Single Source of Truth**: Model structure and OpenAPI schema are in the same file
3. **Easier Maintenance**: When model properties change, schema is right there to update
4. **Cleaner Code**: Removed ~90 lines of duplicate schema definitions from openapi_manual.cr
5. **Better Discoverability**: Developers can see the OpenAPI schema when working on models

## Verification

- ✅ OpenAPI spec generation: Working
- ✅ Spec validation: Passing (only 1 false-positive warning about unused Board model)
- ✅ Main application compilation: Success
- ✅ All schema references: Updated correctly

## Line Count
- Lines removed from `openapi_manual.cr`: ~90 lines (old schema methods)
- Lines added to model files: ~120 lines (schema methods with better documentation)
- Net change: ~30 lines added, but much better organized
