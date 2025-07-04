require "kemal"

# Serve the OpenAPI spec as JSON
get "/swagger.json" do |env|
  env.response.content_type = "application/json"
  File.read("./swagger.json")
end

# Serve the Swagger UI HTML at /api
get "/api" do |env|
  env.response.content_type = "text/html"
  <<-HTML
  <!DOCTYPE html>
  <html>
    <head>
      <title>ToCry API Docs</title>
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
      <script>
        window.onload = function() {
          SwaggerUIBundle({
            url: '/swagger.json',
            dom_id: '#swagger-ui'
          });
        };
      </script>
    </body>
  </html>
  HTML
end

get "/api/" do |env|
  env.redirect "/api"
end