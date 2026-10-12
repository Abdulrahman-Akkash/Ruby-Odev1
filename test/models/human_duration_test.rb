require "test_helper"

class HumanDurationTest < ActiveSupport::TestCase
  test "kısa Türkçe süre" do
    assert_equal "1 dk'dan az", HumanDuration.short(30)
    assert_equal "45 dk", HumanDuration.short(45.minutes)
    assert_equal "2 sa 05 dk", HumanDuration.short(2.hours + 5.minutes)
    assert_equal "8 sa", HumanDuration.short(8.hours)
    assert_equal "1 gün 3 sa", HumanDuration.short(27.hours)
    assert_equal "15 dk", HumanDuration.short(-15.minutes)
  end
end
