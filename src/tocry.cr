require "kemal"
require "file_utils" # For File.dirname, File.basename

module ToCry
  Log = ::Log.for(self)

  VERSION = {{ `shards version #{__DIR__}/../`.chomp.stringify }}
end
