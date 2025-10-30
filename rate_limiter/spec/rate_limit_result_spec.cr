require "spec"
require "../src/rate_limiter/rate_limit_result"

describe RateLimitResult do
  describe "#initialize" do
    it "creates a result with given values" do
      time = Time.utc
      result = RateLimitResult.new(true, 5, time, 10)

      result.allowed?.should be_true
      result.allowed.should be_true
      result.remaining.should eq(5)
      result.reset_time.should eq(time)
      result.total_requests.should eq(10)
    end
  end

  describe "#allowed?" do
    it "returns true when allowed is true" do
      result = RateLimitResult.new(true, 5, Time.utc, 10)
      result.allowed?.should be_true
    end

    it "returns false when allowed is false" do
      result = RateLimitResult.new(false, 0, Time.utc, 10)
      result.allowed?.should be_false
    end
  end

  describe "#rate_limited?" do
    it "returns false when allowed is true" do
      result = RateLimitResult.new(true, 5, Time.utc, 10)
      result.rate_limited?.should be_false
    end

    it "returns true when allowed is false" do
      result = RateLimitResult.new(false, 0, Time.utc, 10)
      result.rate_limited?.should be_true
    end
  end

  describe "#to_h" do
    it "converts to hash with correct values" do
      time = Time.utc(2023, 1, 1, 12, 0, 0)
      result = RateLimitResult.new(true, 5, time, 10)

      hash = result.to_h
      hash.should be_a(Hash(String, Bool | Int32 | Int64))
      hash["allowed"].should be_true
      hash["remaining"].should eq(5)
      hash["reset_time"].should eq(time.to_unix)
      hash["total_requests"].should eq(10)
    end

    it "handles false allowed values" do
      time = Time.utc(2023, 1, 1, 12, 0, 0)
      result = RateLimitResult.new(false, 0, time, 100)

      hash = result.to_h
      hash["allowed"].should be_false
      hash["remaining"].should eq(0)
      hash["reset_time"].should eq(time.to_unix)
      hash["total_requests"].should eq(100)
    end
  end

  describe "edge cases" do
    it "handles zero remaining requests" do
      result = RateLimitResult.new(false, 0, Time.utc, 5)
      result.remaining.should eq(0)
      result.allowed?.should be_false
      result.rate_limited?.should be_true
    end

    it "handles large request counts" do
      result = RateLimitResult.new(true, 999, Time.utc, 1000000)
      result.remaining.should eq(999)
      result.total_requests.should eq(1000000)
      result.allowed?.should be_true
    end
  end
end
