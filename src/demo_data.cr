# Demo data for ToCry - only compiled with -Ddemo flag
require "json"
require "uuid"

module ToCry
  module DemoData
    # Sample board configurations
    SAMPLE_BOARDS = [
      {
        name: "Software Development",
        description: "Track features, bugs, and development tasks",
        color_scheme: "Blue",
        lanes: [
          {
            name: "Backlog",
            notes: [
              {
                title: "Implement user authentication",
                content: "Add OAuth2 support for Google and GitHub login. Need to implement user sessions and security best practices.",
                tags: ["feature", "backend", "security"],
                priority: "High",
                start_date: "2025-09-24",
                end_date: "2025-10-01"
              },
              {
                title: "Mobile app responsive design",
                content: "Ensure the app works perfectly on mobile devices. Focus on touch interactions and drag-and-drop functionality.",
                tags: ["mobile", "ui", "ux"],
                priority: "Medium",
                start_date: "2025-09-25"
              },
              {
                title: "Add API rate limiting",
                content: "Prevent abuse by implementing rate limiting on API endpoints. Use token bucket algorithm.",
                tags: ["api", "security", "performance"],
                priority: "Low",
                start_date: "2025-10-01"
              }
            ]
          },
          {
            name: "In Progress",
            notes: [
              {
                title: "Database optimization",
                content: "Optimize slow queries and add proper indexing. Current query takes 2.3 seconds to load boards.",
                tags: ["database", "performance"],
                priority: "High",
                start_date: "2025-09-23",
                end_date: "2025-09-26"
              },
              {
                title: "Fix memory leak in file uploads",
                content: "Memory usage increases by 50MB per upload. Need to investigate file handling cleanup.",
                tags: ["bug", "performance"],
                priority: "High",
                start_date: "2025-09-22",
                end_date: "2025-09-24"
              },
              {
                title: "Write unit tests for auth module",
                content: "Add comprehensive test coverage for authentication endpoints and user management.",
                tags: ["testing", "auth"],
                priority: "Medium",
                start_date: "2025-09-23",
                end_date: "2025-09-27"
              }
            ]
          },
          {
            name: "Testing",
            notes: [
              {
                title: "Test mobile drag-and-drop",
                content: "Verify touch events work correctly on iOS and Android devices. Test edge cases like rapid scrolling.",
                tags: ["mobile", "testing", "qa"],
                priority: "Medium",
                start_date: "2025-09-24",
                end_date: "2025-09-25"
              }
            ]
          },
          {
            name: "Done",
            notes: [
              {
                title: "Implement priority labels",
                content: "Added High/Medium/Low priority indicators with color coding and visual hierarchy.",
                tags: ["feature", "ui"],
                priority: "Medium",
                start_date: "2025-09-20",
                end_date: "2025-09-22"
              },
              {
                title: "Add date support for notes",
                content: "Implemented start and end date fields for better task management and timeline visualization.",
                tags: ["feature", "ui"],
                priority: "Low",
                start_date: "2025-09-18",
                end_date: "2025-09-20"
              }
            ]
          }
        ]
      },
      {
        name: "Personal Productivity",
        description: "Manage daily tasks and personal goals",
        color_scheme: "Green",
        lanes: [
          {
            name: "Today",
            notes: [
              {
                title: "Morning workout",
                content: "30 minutes cardio + strength training",
                tags: ["health", "routine"],
                priority: "High",
                start_date: "2025-09-23"
              },
              {
                title: "Team standup meeting",
                content: "Discuss progress and blockers with the team",
                tags: ["meeting", "work"],
                priority: "High",
                start_date: "2025-09-23",
                end_date: "2025-09-23 10:00"
              },
              {
                title: "Review pull requests",
                content: "Review 3 pending PRs from team members",
                tags: ["code", "review"],
                priority: "Medium",
                start_date: "2025-09-23"
              }
            ]
          },
          {
            name: "This Week",
            notes: [
              {
                title: "Complete project proposal",
                content: "Finish the Q4 project proposal and submit to management",
                tags: ["work", "planning"],
                priority: "High",
                start_date: "2025-09-23",
                end_date: "2025-09-27"
              },
              {
                title: "Grocery shopping",
                content: "Buy ingredients for healthy meal prep",
                tags: ["personal", "health"],
                priority: "Medium",
                start_date: "2025-09-25"
              },
              {
                title: "Call dentist for checkup",
                content: "Schedule routine dental cleaning appointment",
                tags: ["health", "personal"],
                priority: "Low",
                start_date: "2025-09-24"
              }
            ]
          },
          {
            name: "Later",
            notes: [
              {
                title: "Learn new programming language",
                content: "Study Rust or Go for systems programming",
                tags: ["learning", "career"],
                priority: "Low",
                start_date: "2025-10-01"
              },
              {
                title: "Plan vacation",
                content: "Research destinations and book flights for winter vacation",
                tags: ["personal", "travel"],
                priority: "Medium",
                start_date: "2025-10-15",
                end_date: "2025-11-30"
              }
            ]
          }
        ]
      },
      {
        name: "Team Collaboration",
        description: "Coordinate team activities and shared goals",
        color_scheme: "Purple",
        lanes: [
          {
            name: "Meeting Notes",
            notes: [
              {
                title: "Sprint Planning Meeting",
                content: "Discussed priorities for upcoming sprint. Team velocity is stable at 25 points per sprint.\n\n**Action Items:**\n- Update project roadmap\n- Refine backlog items\n- Set sprint goals",
                tags: ["meeting", "planning"],
                priority: "Medium",
                start_date: "2025-09-23"
              },
              {
                title: "Architecture Review",
                content: "Reviewed microservices proposal. Need to consider database migration strategy and service communication patterns.",
                tags: ["meeting", "architecture"],
                priority: "High",
                start_date: "2025-09-22"
              }
            ]
          },
          {
            name: "Action Items",
            notes: [
              {
                title: "Update documentation",
                content: "Document API changes and update README with new features",
                tags: ["documentation"],
                priority: "Medium",
                start_date: "2025-09-23",
                end_date: "2025-09-24"
              },
              {
                title: "Setup monitoring",
                content: "Implement application monitoring and alerting for production issues",
                tags: ["devops", "monitoring"],
                priority: "High",
                start_date: "2025-09-23",
                end_date: "2025-09-30"
              },
              {
                title: "Code review guidelines",
                content: "Create team code review checklist and best practices document",
                tags: ["process", "documentation"],
                priority: "Low",
                start_date: "2025-09-25",
                end_date: "2025-09-27"
              }
            ]
          },
          {
            name: "Ideas",
            notes: [
              {
                title: "AI-powered task suggestions",
                content: "Use ML to analyze task patterns and suggest priorities or due dates",
                tags: ["ai", "feature"],
                priority: "Low"
              },
              {
                title: "Integrations with other tools",
                content: "Connect with Slack, GitHub, Jira for better workflow integration",
                tags: ["integration", "feature"],
                priority: "Medium"
              },
              {
                title: "Mobile notifications",
                content: "Push notifications for task assignments and due dates",
                tags: ["mobile", "feature"],
                priority: "Medium"
              }
            ]
          },
          {
            name: "Blocked",
            notes: [
              {
                title: "Database migration",
                content: "Waiting for DB team approval for schema changes",
                tags: ["blocked", "database"],
                priority: "High",
                start_date: "2025-09-20"
              }
            ]
          }
        ]
      }
    ]

    # Convert sample data to actual board objects
    def self.create_sample_boards(user : String) : Array(Board)
      boards = [] of Board

      SAMPLE_BOARDS.each do |board_data|
        # Board name will be used as identifier

        # Create lanes with notes
        lanes = [] of Lane
        board_data["lanes"].each do |lane_data|
          lane_name = lane_data["name"]
          notes = [] of Note

          lane_data["notes"].each do |note_data|
            # Convert priority string to Priority enum
            priority_value = note_data["priority"]?.try(&.as(String))
            priority_enum = case priority_value
                            when "high" then Priority::High
                            when "medium" then Priority::Medium
                            when "low" then Priority::Low
                            else nil
                            end

            note = Note.new(
              title: note_data["title"],
              content: note_data["content"],
              tags: note_data["tags"]?.try(&.map(&.as(String))) || [] of String,
              start_date: note_data["start_date"]?.try(&.as(String)),
              end_date: note_data["end_date"]?.try(&.as(String)),
              priority: priority_enum
            )
            notes << note
          end

          lane = Lane.new(lane_name, notes)
          lanes << lane
        end

        board = Board.new(
          name: board_data["name"],
          lanes: lanes
        )

        boards << board
      end

      boards
    end

    # Get demo board names
    def self.board_names : Array(String)
      SAMPLE_BOARDS.map { |board| board["name"] }
    end

    # Get board color scheme
    def self.board_color_scheme(board_name : String) : String?
      SAMPLE_BOARDS.find { |board| board["name"] == board_name }
        .try(&.["color_scheme"]?)
    end
  end
end