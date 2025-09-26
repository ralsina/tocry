require "./spec_helper"
require "file_utils"
require "../src/tocry"   # For ToCry.data_directory and ToCry.board_manager
require "../src/user.cr" # For ToCry::User class

describe ToCry::BoardManager do
  data_dir = "test_board_manager_data"

  before_each do
    FileUtils.rm_rf(data_dir) # Clean up from previous test run
    ToCry.data_directory = data_dir
    Sepia::Storage::INSTANCE.path = data_dir
  end

  after_each do
    FileUtils.rm_rf(data_dir)
  end

  Spec.after_suite do
    # Clean up the data directory after all tests
    FileUtils.rm_rf(data_dir)
  end

  it "creates the board base directory" do
    ToCry.board_manager = ToCry::Initialization.setup_data_environment(data_dir, true, false)
    board_manager = ToCry.board_manager
    Log.info { "Test data_dir: #{data_dir}" }
    Log.info { "BoardManager initialized with Sepia-based storage" }
  end

  it "creates a board and it is accessible by the creating user" do
    ToCry.board_manager = ToCry::Initialization.setup_data_environment(data_dir, true, false)
    board_manager = ToCry.board_manager
    # Explicitly create root user directory and its symlink to boards
    # This ensures the symlink is always valid at the start of each test
    ToCry.create_root_user_directory(File.join(ToCry.users_base_directory, "root"))

    user_email = "test_user@example.com"
    board_name = "My New Board"

    ToCry::User.new(user_email, "Test User", "test").save

    created_board = board_manager.create(board_name, user_email)

    created_board.name.should eq(board_name)
    created_board.sepia_id.should_not be_nil

    # Verify it's in the list for the creating user
    board_manager.list(user_email).includes?(created_board.sepia_id).should be_true

    # Verify it can be retrieved by name
    retrieved_board = board_manager.get(board_name, user_email)
    retrieved_board.should_not be_nil
    retrieved_board.as(ToCry::Board).name.should eq(board_name)
    retrieved_board.as(ToCry::Board).sepia_id.should eq(created_board.sepia_id)
  end

  it "does not list boards for a user if the user directory does not exist" do
    board_manager = ToCry::Initialization.setup_data_environment(data_dir, true, false)
    user_email = "non_existent_user@example.com"
    board_manager.list(user_email).should be_empty
  end

  it "allows sharing a board between users" do
    board_manager = ToCry::Initialization.setup_data_environment(data_dir, true, false)
    user1_email = "user1@example.com"
    user2_email = "user2@example.com"
    board_name = "Shared Board"

    ToCry::User.new(user1_email, "User One", "test").save
    ToCry::User.new(user2_email, "User Two", "test").save

    # User 1 creates a board
    board = board_manager.create(board_name, user1_email)

    # User 1 should see the board
    board_manager.list(user1_email).includes?(board.sepia_id).should be_true
    # User 2 should NOT see the board initially
    board_manager.list(user2_email).includes?(board.sepia_id).should be_false

    # Share the board from user1 to user2
    board_manager.share_board(board_name, user1_email, user2_email)

    # User 2 should now see the board
    board_manager.list(user2_email).includes?(board.sepia_id).should be_true

    # Verify user2 has shared reference to the board
    uuid = board.sepia_id
    ToCry::BoardReference.has_reference?(user2_email, uuid).should be_true

    # Verify the access type is "shared"
    reference = ToCry::BoardReference.find_by_user(user2_email).find { |ref| ref.board_uuid == uuid }
    reference.should_not be_nil
    reference.not_nil!.shared?.should be_true
  end

  it "does not share if the board is not accessible to the from_user" do
    board_manager = ToCry::Initialization.setup_data_environment(data_dir, true, false)
    user1_email = "user1@example.com"
    user2_email = "user2@example.com"
    user3_email = "user3@example.com"
    board_name = "Private Board"

    ToCry::User.new(user1_email, "User One", "test").save
    ToCry::User.new(user2_email, "User Two", "test").save
    ToCry::User.new(user3_email, "User Three", "test").save

    # User 1 creates a board
    board = board_manager.create(board_name, user1_email)

    # Attempt to share from user3 (who doesn't own the board) to user2
    expect_raises(Exception, /Board '#{board_name}' not found for user '#{user3_email}'./) do
      board_manager.share_board(board_name, user3_email, user2_email)
    end

    # User 2 should still not see the board
    board_manager.list(user2_email).includes?(board.sepia_id).should be_false
  end

  it "does nothing if the board is already shared with the to_user" do
    board_manager = ToCry::Initialization.setup_data_environment(data_dir, true, false)
    user1_email = "user1@example.com"
    user2_email = "user2@example.com"
    board_name = "Already Shared Board"

    ToCry::User.new(user1_email, "User One", "test").save
    ToCry::User.new(user2_email, "User Two", "test").save

    # User 1 creates a board
    board = board_manager.create(board_name, user1_email)

    # Share the board once
    board_manager.share_board(board_name, user1_email, user2_email)
    board_manager.list(user2_email).includes?(board.sepia_id).should be_true

    # Attempt to share again, it should not raise an error or change anything
    board_manager.share_board(board_name, user1_email, user2_email)
    board_manager.list(user2_email).includes?(board.sepia_id).should be_true # Still there
  end

  it "allows deleting a board for a non-root user (removes symlink only)" do
    board_manager = ToCry::Initialization.setup_data_environment(data_dir, true, false)
    user1_email = "user1@example.com"
    user2_email = "user2@example.com"
    board_name = "Board to Delete"

    ToCry::User.new(user1_email, "User One", "test").save
    ToCry::User.new(user2_email, "User Two", "test").save

    # User 1 creates a board
    board = board_manager.create(board_name, user1_email)
    board_uuid = board.sepia_id

    # Share with user2
    board_manager.share_board(board_name, user1_email, user2_email)

    # Both users should see the board initially
    board_manager.list(user1_email).includes?(board_uuid).should be_true
    board_manager.list(user2_email).includes?(board_uuid).should be_true

    # User 2 deletes the board (should only remove symlink)
    board_manager.delete(board_name, user2_email)

    # User 2 should no longer see the board
    board_manager.list(user2_email).includes?(board_uuid).should be_false
    # User 1 should still see the board (owner access not removed)
    board_manager.list(user1_email).includes?(board_uuid).should be_true

    # Verify board still exists in the system (since user1 is still the owner)
    ToCry::BoardIndex.exists?(board_uuid).should be_true
  end

  it "allows deleting a board for the root user (removes canonical board)" do
    board_manager = ToCry::Initialization.setup_data_environment(data_dir, true, false)
    ToCry.create_root_user_directory(File.join(ToCry.users_base_directory, "root")) # Ensure root user directory exists
    root_user = "root"
    board_name = "Root Board to Delete"

    # Root creates a board
    board = board_manager.create(board_name, root_user)
    board_uuid = board.sepia_id

    # Root should see the board initially
    board_manager.list(root_user).includes?(board_uuid).should be_true

    # Root deletes the board (should remove canonical board)
    board_manager.delete(board_name, root_user)

    # Root should no longer see the board
    board_manager.list(root_user).includes?(board_uuid).should be_false

    # Verify board no longer exists in the system (removed from BoardIndex)
    ToCry::BoardIndex.exists?(board_uuid).should be_false
    ToCry::BoardReference.has_reference?(root_user, board_uuid).should be_false
  end

  it "allows renaming a board for a non-root user (renames user's personal reference)" do
    board_manager = ToCry::Initialization.setup_data_environment(data_dir, true, false)
    user1_email = "user1@example.com"
    user2_email = "user2@example.com"
    old_board_name = "Old Board Name"
    new_board_name = "New Board Name"

    ToCry::User.new(user1_email, "User One", "test").save
    ToCry::User.new(user2_email, "User Two", "test").save

    # User 1 creates a board
    board = board_manager.create(old_board_name, user1_email)
    board_uuid = board.sepia_id

    # Share with user2
    board_manager.share_board(old_board_name, user1_email, user2_email)

    # Both users should see the old board name initially
    board_manager.list(user1_email).includes?(board_uuid).should be_true
    board_manager.get(old_board_name, user1_email).as(ToCry::Board).name.should eq(old_board_name)
    board_manager.list(user2_email).includes?(board_uuid).should be_true
    board_manager.get(old_board_name, user2_email).as(ToCry::Board).name.should eq(old_board_name)

    # User 2 renames their personal reference to the board
    board_manager.rename(old_board_name, new_board_name, user2_email)

    # User 2 should see the new name (their personal reference was updated)
    board_manager.list(user2_email).includes?(board_uuid).should be_true
    board_manager.get(new_board_name, user2_email).should_not be_nil # Can find by new name
    board_manager.get(old_board_name, user2_email).should be_nil     # Cannot find by old name

    # User 1 should still see the board with the old name (their reference unchanged)
    board_manager.list(user1_email).includes?(board_uuid).should be_true
    board_manager.get(old_board_name, user1_email).should_not be_nil # Can find by old name
    board_manager.get(new_board_name, user1_email).should be_nil     # Cannot find by new name

    # Verify board references are independent - each user has their own name
    user1_ref = ToCry::BoardReference.find_by_user(user1_email).find { |ref| ref.board_uuid == board_uuid }
    user2_ref = ToCry::BoardReference.find_by_user(user2_email).find { |ref| ref.board_uuid == board_uuid }
    user1_ref.should_not be_nil
    user2_ref.should_not be_nil
    user1_ref.not_nil!.board_name.should eq(old_board_name)  # Still has original name
    user2_ref.not_nil!.board_name.should eq(new_board_name)  # Has renamed name
  end

  it "allows renaming a board for the root user (renames canonical board)" do
    board_manager = ToCry::Initialization.setup_data_environment(data_dir, true, false)
    ToCry.create_root_user_directory(File.join(ToCry.users_base_directory, "root")) # Ensure root user directory exists
    root_user = "root"
    old_board_name = "Root Old Board"
    new_board_name = "Root New Board"

    # Root creates a board
    board = board_manager.create(old_board_name, root_user)
    board_uuid = board.sepia_id

    # Root should see the old board name initially
    board_manager.list(root_user).includes?(board_uuid).should be_true
    board_manager.get(old_board_name, root_user).as(ToCry::Board).name.should eq(old_board_name)

    # Root renames the board
    board_manager.rename(old_board_name, new_board_name, root_user)

    # Root should now see the board with the new name
    board_manager.list(root_user).includes?(board_uuid).should be_true
    board_manager.get(new_board_name, root_user).should_not be_nil # Can find by new name
    board_manager.get(old_board_name, root_user).should be_nil     # Cannot find by old name

    # Verify board has the new name in the BoardIndex
    board_index = ToCry::BoardIndex.find_by_uuid(board_uuid)
    board_index.should_not be_nil
    board_index.not_nil!.board_name.should eq(new_board_name)
  end

  it "raises an error if renaming to an existing board name for the same user" do
    board_manager = ToCry::Initialization.setup_data_environment(data_dir, true, false)
    user_email = "test_user@example.com"
    board_name1 = "Board One"
    board_name2 = "Board Two"

    ToCry::User.new(user_email, "Test User", "test").save

    board_manager.create(board_name1, user_email)
    board_manager.create(board_name2, user_email)

    expect_raises(Exception, /Board with name '#{board_name2}' already exists./) do
      board_manager.rename(board_name1, board_name2, user_email)
    end
  end
end
