require "uuid"

# A simple in-memory store for users for this example.
# In a real application, you would use a proper database.
USERS = {} of String => User

class User
  property id : String
  property email : String
  property name : String
  property provider : String # e.g., "local", "github", "google"

  def initialize(@email, @name, @provider)
    @id = UUID.random.to_s
  end

  # "Saves" the user to our in-memory store
  def save
    USERS[self.email] = self
    self
  end

  # Finds a user by their email
  def self.find_by_email(email)
    USERS[email]?
  end

  # Finds a user by their ID
  def self.find_by_id(id)
    USERS.values.find { |user| user.id == id }
  end
end
