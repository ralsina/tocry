# Manual OpenAPI spec generation based on actual endpoint behavior
# This bypasses the Swagger library limitations and creates a proper OpenAPI 3.0 spec

require "json"
require "./note"
require "./lane"
require "./board"

module ToCry::OpenAPIManual
  extend self

  def generate_spec
    {
      openapi: "3.0.3",
      info:    {
        title:       "ToCry API",
        version:     "0.17.0",
        description: "A Kanban-style TODO application built in Crystal",
      },
      servers: [] of String,
      tags:    [
        {name: "Boards", description: "Board management"},
        {name: "Notes", description: "Note management"},
        {name: "Uploads", description: "File upload management"},
        {name: "Authentication", description: "Authentication information"},
      ],
      paths: {
        "/api/v1/boards" => {
          get: {
            operationId: "getBoardsList",
            tags:        ["Boards"],
            summary:     "Get all boards",
            description: "Get all accessible boards for the current user",
            responses:   {
              "200" => {
                description: "Returns array of board names",
                content:     {
                  "application/json" => {
                    schema: {
                      type:    "array",
                      items:   {type: "string"},
                      example: ["default", "Work", "Personal"],
                    },
                  },
                },
              },
            },
          },
          post: {
            operationId: "createBoard",
            tags:        ["Boards"],
            summary:     "Create a board",
            description: "Create a new board",
            requestBody: {
              description: "New board creation request",
              required:    true,
              content:     {
                "application/json" => {
                  schema: {
                    "$ref" => "#/components/schemas/BoardCreateRequest",
                  },
                },
              },
            },
            responses: {
              "201" => {
                description: "Board created successfully",
                content:     {
                  "application/json" => {
                    schema: {
                      "$ref" => "#/components/schemas/SuccessResponse",
                    },
                  },
                },
              },
              "400" => error_response("Invalid board name or data"),
            },
          },
        },
        "/api/v1/boards/{board_name}" => {
          get: {
            operationId: "getBoardDetails",
            tags:        ["Boards"],
            summary:     "Get board details",
            description: "Get complete board details including lanes and notes",
            parameters:  [path_param("board_name", "Board name")],
            responses:   {
              "200" => {
                description: "Returns complete board state",
                content:     {
                  "application/json" => {
                    schema: {
                      "$ref" => "#/components/schemas/Board",
                    },
                  },
                },
              },
              "404" => error_response("Board not found"),
            },
          },
          put: {
            operationId: "updateBoard",
            tags:        ["Boards"],
            summary:     "Update board",
            description: "Update board properties (rename, change visibility, reorganize lanes)",
            parameters:  [path_param("board_name", "Board name")],
            requestBody: {
              description: "Board update request",
              required:    true,
              content:     {
                "application/json" => {
                  schema: {
                    "$ref" => "#/components/schemas/BoardUpdateRequest",
                  },
                },
              },
            },
            responses: {
              "200" => success_response("Board updated successfully"),
              "404" => error_response("Board not found"),
              "400" => error_response("Invalid update data"),
            },
          },
          delete: {
            operationId: "deleteBoard",
            tags:        ["Boards"],
            summary:     "Delete board",
            description: "Delete a board and all its data (idempotent - succeeds even if board already deleted)",
            parameters:  [path_param("board_name", "Board name")],
            responses:   {
              "200" => success_response("Board deleted successfully"),
            },
          },
        },
        "/api/v1/boards/{board_name}/share" => {
          post: {
            operationId: "shareBoard",
            tags:        ["Boards"],
            summary:     "Share board",
            description: "Share a board with another user",
            parameters:  [path_param("board_name", "Board name")],
            requestBody: {
              description: "Board sharing request",
              required:    true,
              content:     {
                "application/json" => {
                  schema: {
                    "$ref" => "#/components/schemas/BoardShareRequest",
                  },
                },
              },
            },
            responses: {
              "200" => success_response("Board shared successfully"),
              "404" => error_response("Board not found"),
              "400" => error_response("Invalid email address"),
            },
          },
        },
        "/api/v1/boards/{board_name}/note" => {
          post: {
            operationId: "createNote",
            tags:        ["Notes"],
            summary:     "Create note",
            description: "Create a new note in a specific lane",
            parameters:  [path_param("board_name", "Board name")],
            requestBody: {
              description: "New note creation request",
              required:    true,
              content:     {
                "application/json" => {
                  schema: {
                    "$ref" => "#/components/schemas/NoteCreateRequest",
                  },
                },
              },
            },
            responses: {
              "201" => {
                description: "Note created successfully",
                content:     {
                  "application/json" => {
                    schema: {
                      "$ref" => "#/components/schemas/NoteCreateResponse",
                    },
                  },
                },
              },
              "404" => error_response("Board or lane not found"),
              "400" => error_response("Invalid note data"),
            },
          },
        },
        "/api/v1/boards/{board_name}/note/{note_id}" => {
          put: {
            operationId: "updateNote",
            tags:        ["Notes"],
            summary:     "Update note",
            description: "Update an existing note",
            parameters:  [
              path_param("board_name", "Board name"),
              path_param("note_id", "Note ID"),
            ],
            requestBody: {
              description: "Note update request",
              required:    true,
              content:     {
                "application/json" => {
                  schema: {
                    "$ref" => "#/components/schemas/NoteUpdateRequest",
                  },
                },
              },
            },
            responses: {
              "200" => {
                description: "Note updated successfully",
                content:     {
                  "application/json" => {
                    schema: {
                      "$ref" => "#/components/schemas/NoteUpdateResponse",
                    },
                  },
                },
              },
              "404" => error_response("Note not found"),
              "400" => error_response("Invalid note data"),
            },
          },
          delete: {
            operationId: "deleteNote",
            tags:        ["Notes"],
            summary:     "Delete note",
            description: "Delete a note (idempotent - succeeds even if note already deleted)",
            parameters:  [
              path_param("board_name", "Board name"),
              path_param("note_id", "Note ID"),
            ],
            responses: {
              "200" => success_response("Note deleted successfully"),
            },
          },
        },
        "/api/v1/boards/{board_name}/note/{note_id}/attach" => {
          post: {
            operationId: "attachFileToNote",
            tags:        ["Notes"],
            summary:     "Attach file to note",
            description: "Attach a file to a note (multipart/form-data)",
            parameters:  [
              path_param("board_name", "Board name"),
              path_param("note_id", "Note ID"),
            ],
            requestBody: {
              description: "File to attach to note",
              required:    true,
              content:     {
                "multipart/form-data" => {
                  schema: {
                    "$ref" => "#/components/schemas/FileUploadRequest",
                  },
                },
              },
            },
            responses: {
              "200" => {
                description: "File attached successfully",
                content:     {
                  "application/json" => {
                    schema: {
                      "$ref" => "#/components/schemas/AttachmentResponse",
                    },
                  },
                },
              },
              "404" => error_response("Note not found"),
              "400" => error_response("File too large or invalid"),
            },
          },
        },
        "/api/v1/boards/{board_name}/note/{note_id}/{attachment}" => {
          get: {
            operationId: "downloadNoteAttachment",
            tags:        ["Notes"],
            summary:     "Download attachment",
            description: "Download an attachment from a note",
            parameters:  [
              path_param("board_name", "Board name"),
              path_param("note_id", "Note ID"),
              path_param("attachment", "Attachment filename"),
            ],
            responses: {
              "200" => {
                description: "File content (binary)",
                content:     {
                  "application/octet-stream" => {
                    schema: {
                      type:   "string",
                      format: "binary",
                    },
                  },
                },
              },
              "404" => error_response("Note or attachment not found"),
            },
          },
          delete: {
            operationId: "deleteNoteAttachment",
            tags:        ["Notes"],
            summary:     "Delete attachment",
            description: "Remove an attachment from a note (idempotent - succeeds even if attachment already deleted)",
            parameters:  [
              path_param("board_name", "Board name"),
              path_param("note_id", "Note ID"),
              path_param("attachment", "Attachment filename"),
            ],
            responses: {
              "200" => {
                description: "Attachment deleted successfully",
                content:     {
                  "application/json" => {
                    schema: {
                      "$ref" => "#/components/schemas/SuccessResponse",
                    },
                  },
                },
              },
            },
          },
        },
        "/api/v1/attachments/{note_id}/{filename}" => {
          get: {
            operationId: "getPublicAttachment",
            tags:        ["Notes"],
            summary:     "Get public attachment",
            description: "Access note attachment (public endpoint for public notes)",
            parameters:  [
              path_param("note_id", "Note ID"),
              path_param("filename", "Attachment filename"),
            ],
            responses: {
              "200" => {
                description: "File content (binary)",
                content:     {
                  "application/octet-stream" => {
                    schema: {
                      type:   "string",
                      format: "binary",
                    },
                  },
                },
              },
              "404" => error_response("Attachment not found"),
            },
          },
        },
        "/api/v1/upload/image" => {
          post: {
            operationId: "uploadImage",
            tags:        ["Uploads"],
            summary:     "Upload image",
            description: "Upload an image file (multipart/form-data)",
            requestBody: {
              description: "Image file to upload",
              required:    true,
              content:     {
                "multipart/form-data" => {
                  schema: {
                    "$ref" => "#/components/schemas/FileUploadRequest",
                  },
                },
              },
            },
            responses: {
              "201" => {
                description: "Image uploaded successfully",
                content:     {
                  "application/json" => {
                    schema: {
                      "$ref" => "#/components/schemas/ImageUploadResponse",
                    },
                  },
                },
              },
              "400" => error_response("No file uploaded or invalid file type"),
              "413" => error_response("Payload Too Large"),
            },
          },
        },
        "/b/{board_name}/public" => {
          get: {
            operationId: "getPublicBoard",
            tags:        ["Boards"],
            summary:     "Get public board view",
            description: "Get a read-only public view of a board (no authentication required)",
            parameters:  [path_param("board_name", "Board name")],
            responses:   {
              "200" => {
                description: "Public board HTML page",
                content:     {
                  "text/html" => {
                    schema: {
                      type:        "string",
                      description: "Rendered HTML page for public board view",
                    },
                  },
                },
              },
              "404" => {
                description: "Board not found or not public",
                content:     {
                  "text/html" => {
                    schema: {
                      type:        "string",
                      description: "Not found HTML page",
                    },
                  },
                },
              },
            },
          },
        },
        "/api/v1/auth_mode" => {
          get: {
            operationId: "getAuthMode",
            tags:        ["Authentication"],
            summary:     "Get authentication mode",
            description: "Get current authentication mode",
            responses:   {
              "200" => {
                description: "Authentication mode",
                content:     {
                  "application/json" => {
                    schema: {
                      "$ref" => "#/components/schemas/AuthModeResponse",
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          # Entity schemas
          Note:     ToCry::Note.schema,
          NoteData: ToCry::Note.data_schema,
          Lane:     ToCry::Lane.schema,
          Board:    ToCry::Board.schema,

          # Request schemas
          BoardCreateRequest: {
            type:       "object",
            required:   ["name"],
            properties: {
              name:         {type: "string", description: "Board name", example: "My Project"},
              color_scheme: {
                type:        "string",
                description: "Color scheme name (optional)",
                example:     "Default",
                enum:        ["Amber", "Blue", "Cyan", "Default", "Fuchsia", "Grey", "Green", "Indigo", "Jade", "Lime", "Orange", "Pink", "Pumpkin", "Purple", "Red", "Sand", "Slate", "Violet", "Yellow", "Zinc"],
              },
            },
          },
          BoardUpdateRequest: {
            type:       "object",
            properties: {
              new_name:           {type: "string", description: "New board name", example: "Updated Project"},
              first_visible_lane: {type: "integer", description: "Index of first visible lane", example: 0},
              show_hidden_lanes:  {type: "boolean", description: "Show hidden lanes flag", example: false},
              color_scheme:       {
                type:        "string",
                description: "Color scheme name",
                example:     "Blue",
                enum:        ["Amber", "Blue", "Cyan", "Default", "Fuchsia", "Grey", "Green", "Indigo", "Jade", "Lime", "Orange", "Pink", "Pumpkin", "Purple", "Red", "Sand", "Slate", "Violet", "Yellow", "Zinc"],
              },
              public: {type: "boolean", description: "Whether the board is publicly accessible", example: false},
              lanes:  {
                type:        "array",
                description: "Complete lane definitions for board reorganization",
                items:       {
                  type:       "object",
                  properties: {
                    name: {type: "string", description: "Lane name", example: "To Do"},
                  },
                },
              },
            },
          },
          BoardShareRequest: {
            type:       "object",
            required:   ["to_user_email"],
            properties: {
              to_user_email: {type: "string", description: "Email address to share board with", example: "user@example.com"},
            },
          },
          NoteCreateRequest: {
            type:       "object",
            required:   ["lane_name", "note"],
            properties: {
              lane_name: {type: "string", description: "Target lane name", example: "To Do"},
              note:      {
                "$ref" => "#/components/schemas/NoteData",
              },
            },
          },
          NoteUpdateRequest: {
            type:       "object",
            required:   ["note"],
            properties: {
              note: {
                "$ref" => "#/components/schemas/NoteData",
              },
              lane_name: {type: "string", description: "Target lane name (optional, for moving notes)", example: "In Progress"},
              position:  {type: "integer", description: "Note position in lane (optional)", example: 0},
            },
          },
          FileUploadRequest: {
            type:       "object",
            required:   ["file"],
            properties: {
              file: {type: "string", format: "binary", description: "File to upload"},
            },
          },

          # Response schemas
          SuccessResponse: {
            type:       "object",
            properties: {
              success: {type: "string", description: "Success message", example: "Operation completed successfully"},
              message: {type: "string", description: "Additional message"},
            },
          },
          NoteCreateResponse: {
            type:       "object",
            properties: {
              success: {type: "string", description: "Success message"},
              note:    {
                "$ref" => "#/components/schemas/Note",
              },
            },
          },
          NoteUpdateResponse: {
            type:       "object",
            properties: {
              success: {type: "string", description: "Success message"},
              note:    {
                "$ref" => "#/components/schemas/Note",
              },
            },
          },
          AttachmentResponse: {
            type:       "object",
            properties: {
              success:           {type: "boolean", description: "Success status", example: true},
              filename:          {type: "string", description: "Stored filename", example: "abc123.pdf"},
              original_filename: {type: "string", description: "Original filename", example: "document.pdf"},
              file_size:         {type: "integer", description: "File size in bytes", example: 1024000},
              note_id:           {type: "string", description: "Note ID"},
              board_name:        {type: "string", description: "Board name"},
              url:               {type: "string", description: "URL to access attachment", example: "/api/v1/boards/MyBoard/note/123/abc123.pdf"},
            },
          },
          ImageUploadResponse: {
            type:       "object",
            properties: {
              url:               {type: "string", description: "Public URL of the uploaded image", example: "/uploads/abc123.jpg"},
              upload_id:         {type: "string", description: "Unique upload identifier", example: "abc123"},
              original_filename: {type: "string", description: "Original filename", example: "photo.jpg"},
              file_size:         {type: "integer", description: "File size in bytes", example: 512000},
            },
          },
          AuthModeResponse: {
            type:       "object",
            properties: {
              auth_mode: {type: "string", description: "Authentication mode: google, basic, or noauth", example: "basic"},
            },
          },
        },
      },
    }
  end

  # Helper methods for common schema patterns
  private def path_param(name : String, description : String)
    {
      name:        name,
      in:          "path",
      description: description,
      required:    true,
      schema:      {type: "string"},
    }
  end

  private def success_response(description : String)
    {
      description: description,
      content:     {
        "application/json" => {
          schema: {
            type:       "object",
            properties: {
              success: {type: "string", description: "Success message"},
            },
          },
        },
      },
    }
  end

  private def error_response(description : String)
    {
      description: description,
      content:     {
        "application/json" => {
          schema: {
            type:       "object",
            properties: {
              error: {type: "string", description: "Error message"},
            },
          },
        },
      },
    }
  end
end

# Main execution
if ARGV.size != 1
  puts "Usage: #{PROGRAM_NAME} <output_file>"
  exit 1
end

output_file = ARGV[0]
spec = ToCry::OpenAPIManual.generate_spec
File.write(output_file, spec.to_pretty_json)
puts "Generated OpenAPI spec to #{output_file}"
