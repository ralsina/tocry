require "./spec_helper"
require "../src/endpoints/helpers"

describe "ToCry::Priority enum validation" do
  it "accepts valid priority values" do
    valid_json = %({"note": {"title": "Test", "priority": "high"}, "lane_name": "Todo"})
    payload = ToCry::Endpoints::Helpers::NewNotePayload.from_json(valid_json)
    payload.note.priority.should eq ToCry::Priority::High

    valid_json = %({"note": {"title": "Test", "priority": "medium"}, "lane_name": "Todo"})
    payload = ToCry::Endpoints::Helpers::NewNotePayload.from_json(valid_json)
    payload.note.priority.should eq ToCry::Priority::Medium

    valid_json = %({"note": {"title": "Test", "priority": "low"}, "lane_name": "Todo"})
    payload = ToCry::Endpoints::Helpers::NewNotePayload.from_json(valid_json)
    payload.note.priority.should eq ToCry::Priority::Low
  end

  it "accepts null priority" do
    valid_json = %({"note": {"title": "Test", "priority": null}, "lane_name": "Todo"})
    payload = ToCry::Endpoints::Helpers::NewNotePayload.from_json(valid_json)
    payload.note.priority.should be_nil
  end

  it "accepts missing priority field" do
    valid_json = %({"note": {"title": "Test"}, "lane_name": "Todo"})
    payload = ToCry::Endpoints::Helpers::NewNotePayload.from_json(valid_json)
    payload.note.priority.should be_nil
  end

  it "rejects invalid priority values" do
    invalid_json = %({"note": {"title": "Test", "priority": "urgent"}, "lane_name": "Todo"})
    expect_raises(Exception, /Invalid priority value/) do
      ToCry::Endpoints::Helpers::NewNotePayload.from_json(invalid_json)
    end
  end

  it "rejects invalid priority values in update" do
    invalid_json = %({"note": {"title": "Test", "priority": "critical"}})
    expect_raises(Exception, /Invalid priority value/) do
      ToCry::Endpoints::Helpers::UpdateNotePayload.from_json(invalid_json)
    end
  end
end
