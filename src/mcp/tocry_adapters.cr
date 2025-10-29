require "../tocry"
require "mcp"

# ToCry-specific implementations of MCP interfaces

class ToCryAuthProvider < MCP::AuthProvider
  def get_user_id(env) : String
    ToCry.get_current_user_id(env)
  end

  def authenticate?(env) : Bool
    # Use ToCry's existing authentication logic
    user_id = get_user_id(env)
    !user_id.nil? && !user_id.empty?
  end
end

class ToCryLogProvider < MCP::LogProvider
  def info(&)
    ToCry::Log.info { yield }
  end

  def error(message : String, exception : Exception? = nil)
    if exception
      ToCry::Log.error(exception: exception) { message }
    else
      ToCry::Log.error { message }
    end
  end

  def debug(message : String)
    ToCry::Log.debug { message }
  end

  def warn(message : String)
    ToCry::Log.warn { message }
  end
end

class ToCryMCPConfig < MCP::MCPConfig
  def enabled? : Bool
    ToCry.mcp_enabled
  end

  def protocol_version : String
    "2024-11-05"
  end

  def server_name : String
    "ToCry MCP Server"
  end

  def server_version : String
    "0.1.0"
  end
end
