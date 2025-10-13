module ToCry
  enum ColorScheme
    Amber
    Blue
    Cyan
    Fuchsia
    Grey
    Green
    Indigo
    Jade
    Lime
    Orange
    Pink
    Pumpkin
    Purple
    Red
    Sand
    Slate
    Violet
    Yellow
    Zinc

    # Validate and normalize a color scheme string
    # Returns the normalized lowercase scheme name if valid, or "blue" if invalid/nil
    def self.validate(scheme : String?) : String
      return "blue" if scheme.nil? || scheme.empty?

      normalized = scheme.downcase

      # Check if the normalized value matches any enum value
      if ColorScheme.parse?(normalized.capitalize)
        normalized
      else
        ToCry::Log.warn { "Invalid color scheme '#{scheme}' - defaulting to blue" }
        "blue"
      end
    end
  end
end
